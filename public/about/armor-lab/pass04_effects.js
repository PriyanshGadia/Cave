import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222); // Not purely black for debugging

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.0001, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Debug Helpers
const axesHelper = new THREE.AxesHelper( 0.1 );
scene.add( axesHelper );
const gridHelper = new THREE.GridHelper( 0.2, 20 );
scene.add( gridHelper );

const groundGeo = new THREE.PlaneGeometry(0.2, 0.2);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
// Will set ground position after bounding box is found
scene.add(ground);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
keyLight.position.set(0.1, 0.1, 0.1);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x4a90e2, 0.5);
rimLight.position.set(-0.1, 0, -0.1);
scene.add(rimLight);

let currentModel = null;
const loader = new GLTFLoader();

let thrusterLocators = [];
let thrusterEffects = [];
let originalMaterials = new Map();
let effectState = '01_DORMANT';
let effectTime = 0;
let stateTime = 0;

window.modelStats = {};

// Pass 04D Colors
const C_OUTER = new THREE.Color(0x061A8A);
const C_INNER = new THREE.Color(0x1267D8);
const C_HOT = new THREE.Color(0x8CC8FF);
const C_CORE = new THREE.Color(0xEAF7FF);
const LIGHT_COLOR = new THREE.Color(0x0a33a0); 

function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(234, 247, 255, 1)');
    grad.addColorStop(0.3, 'rgba(140, 200, 255, 0.8)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
}
const particleTex = createParticleTexture();

const plumeVertexShader = `
uniform float throttle;
uniform float time;
uniform float turbulenceAmount;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vUv = uv;
    float u = uv.y;
    float profile = 0.0;
    
    if (u < 0.15) {
        profile = mix(0.2, 0.6, u / 0.15);
    } else if (u < 0.35) {
        profile = mix(0.6, 1.0, (u - 0.15) / 0.20);
    } else if (u < 0.60) {
        profile = mix(1.0, 0.8, (u - 0.35) / 0.25);
    } else if (u < 0.80) {
        profile = mix(0.8, 0.4, (u - 0.60) / 0.20);
    } else {
        profile = mix(0.4, 0.0, (u - 0.80) / 0.20);
    }
    
    // Animated radial distortion
    float angle = uv.x * 6.28318;
    float noise = sin(angle * 3.0 + time * 10.0 - u * 15.0) * 0.5 + 0.5;
    noise += sin(angle * 7.0 - time * 15.0 + u * 25.0) * 0.25;
    
    profile *= (1.0 + noise * turbulenceAmount);
    
    vec3 pos = position;
    pos.x *= profile;
    pos.z *= profile;
    
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

const plumeFragmentShader = `
uniform float time;
uniform float intensity;
uniform float opacityMultiplier;
uniform vec3 colorPrimary;
uniform vec3 colorSecondary;
uniform float noiseSpeed;
uniform float noiseScale;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Softer edge to remove tube wall feel
    float edge = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
    
    // Continuous length fade
    float lengthFade = pow(1.0 - vUv.y, 2.0);
    
    // Fragment turbulence
    float n1 = hash(vUv * vec2(8.0, noiseScale) - vec2(time * noiseSpeed * 0.5, time * noiseSpeed));
    float n2 = hash(vUv * vec2(16.0, noiseScale * 2.0) + vec2(time * noiseSpeed * 0.3, -time * noiseSpeed * 1.2));
    float noise = (n1 + n2 * 0.5) * 0.66;
    
    vec3 finalColor = mix(colorSecondary, colorPrimary, lengthFade * (1.0 - edge) * noise);
    
    // Force fade out completely at the end cap
    float endFade = smoothstep(1.0, 0.8, vUv.y);
    
    // Base transparency calculation
    float alpha = edge * lengthFade * noise * intensity * opacityMultiplier * endFade;
    
    gl_FragColor = vec4(finalColor, alpha);
}
`;

loader.load(`/assets/armor/vault-mk1/work/boots/pass_04/boots_mk1_pass04.glb`, (gltf) => {
    console.log("LOAD SUCCESS");
    currentModel = gltf.scene;
    scene.add(currentModel);
    
    let vertCount = 0;
    let triCount = 0;
    
    const nozzleRadius = 0.0015;
    const nozzleDiameter = nozzleRadius * 2;
    
    currentModel.traverse((child) => {
        if (child.isMesh) {
            vertCount += child.geometry.attributes.position.count;
            triCount += child.geometry.index ? child.geometry.index.count / 3 : child.geometry.attributes.position.count / 3;
            originalMaterials.set(child, child.material);
        }
        if (child.name.startsWith('THRUSTER_')) {
            thrusterLocators.push(child);
            
            const effectGroup = new THREE.Group();
            
            // 1. Point Light
            const tLight = new THREE.PointLight(LIGHT_COLOR.getHex(), 0.0, 0.015); 
            tLight.position.z = 0.002; 
            effectGroup.add(tLight);
            
            // Plume Geometry (Base unscaled length is 1 nozzle diameter)
            const plumeGeo = new THREE.CylinderGeometry(nozzleRadius*2, nozzleRadius*2, nozzleDiameter, 16, 16, true);
            plumeGeo.translate(0, -nozzleDiameter/2, 0);
            plumeGeo.rotateX(-Math.PI / 2); 
            
            // 2. Outer Exhaust
            const outerMat = new THREE.ShaderMaterial({
                vertexShader: plumeVertexShader,
                fragmentShader: plumeFragmentShader,
                uniforms: {
                    time: { value: 0 },
                    intensity: { value: 0.0 },
                    opacityMultiplier: { value: 0.4 },
                    colorPrimary: { value: C_INNER },
                    colorSecondary: { value: C_OUTER },
                    noiseSpeed: { value: 4.0 },
                    noiseScale: { value: 6.0 },
                    throttle: { value: 0.0 },
                    turbulenceAmount: { value: 0.35 }
                },
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const outerPlume = new THREE.Mesh(plumeGeo, outerMat);
            effectGroup.add(outerPlume);
            
            // 3. Inner Plasma
            const innerMat = new THREE.ShaderMaterial({
                vertexShader: plumeVertexShader,
                fragmentShader: plumeFragmentShader,
                uniforms: {
                    time: { value: 0 },
                    intensity: { value: 0.0 },
                    opacityMultiplier: { value: 1.0 },
                    colorPrimary: { value: C_CORE },
                    colorSecondary: { value: C_HOT },
                    noiseSpeed: { value: 6.0 },
                    noiseScale: { value: 12.0 },
                    throttle: { value: 0.0 },
                    turbulenceAmount: { value: 0.1 }
                },
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const innerPlume = new THREE.Mesh(plumeGeo, innerMat);
            effectGroup.add(innerPlume);
            
            // 3.5 Secondary Plasma Tongues
            const secondaryMat = new THREE.ShaderMaterial({
                vertexShader: plumeVertexShader,
                fragmentShader: plumeFragmentShader,
                uniforms: {
                    time: { value: 0 },
                    intensity: { value: 0.0 },
                    opacityMultiplier: { value: 0.25 },
                    colorPrimary: { value: C_HOT },
                    colorSecondary: { value: C_OUTER },
                    noiseSpeed: { value: 8.0 },
                    noiseScale: { value: 8.0 },
                    throttle: { value: 0.0 },
                    turbulenceAmount: { value: 0.6 }
                },
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const secondaryPlume = new THREE.Mesh(plumeGeo, secondaryMat);
            effectGroup.add(secondaryPlume);
            
            // 4. Hot Core
            const coreGeo = new THREE.SphereGeometry(nozzleRadius * 0.8, 16, 16);
            const coreMat = new THREE.MeshBasicMaterial({
                color: C_CORE,
                transparent: true,
                opacity: 0.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const core = new THREE.Mesh(coreGeo, coreMat);
            // Sink it inside the nozzle slightly
            core.position.z = -nozzleRadius * 0.2;
            effectGroup.add(core);
            
            // 5. Particles
            const pCount = 30;
            const sparkGeo = new THREE.BufferGeometry();
            const sparkPos = new Float32Array(pCount * 3);
            const sparkVel = [];
            for (let i=0; i<pCount; i++) {
                sparkPos[i*3] = 0; sparkPos[i*3+1] = 0; sparkPos[i*3+2] = 0;
                sparkVel.push({
                    x: (Math.random()-0.5)*0.0005,
                    y: (Math.random()-0.5)*0.0005,
                    z: 0.01 + Math.random()*0.02 
                });
            }
            sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
            const sparkMat = new THREE.PointsMaterial({
                size: 0.0005,
                map: particleTex,
                transparent: true,
                opacity: 0.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                color: C_HOT
            });
            const sparks = new THREE.Points(sparkGeo, sparkMat);
            effectGroup.add(sparks);
            
            child.add(effectGroup);
            thrusterEffects.push({
                light: tLight,
                outerPlume: outerPlume,
                innerPlume: innerPlume,
                secondaryPlume: secondaryPlume,
                core: core,
                sparks: sparks,
                sparkVel: sparkVel,
                sparkGeo: sparkGeo,
                pCount: pCount
            });
        }
    });
    
    currentModel.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(currentModel);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    window.modelStats = { vertCount, triCount, size, center, maxDim, nozzleDiameter };
    
    if (window.ground) window.ground.position.y = box.min.y;
    
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.3;
    
    camera.position.set(center.x + cameraZ*0.6, center.y + cameraZ*0.3, center.z + cameraZ*0.8);
    camera.near = maxDim * 0.01;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();
    
    controls.target.copy(center);
    controls.update();
    
    // Scene lighting (dark, moody)
    scene.background = new THREE.Color(0x020202);
    scene.fog = new THREE.Fog(0x020202, 0.1, 5);
    if (window.ground) {
        window.ground.material = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9, metalness: 0.1 });
    }
    ambientLight.intensity = 0.1;
    keyLight.intensity = 0.6;
    rimLight.intensity = 0.2;
    
    window.isLoaded = true;
});

const clock = new THREE.Clock();
let logTimer = 0;

function animateEffects() {
    requestAnimationFrame(animateEffects);
    if (!currentModel) return;
    
    const dt = Math.min(clock.getDelta(), 0.05);
    effectTime += dt;
    stateTime += dt;
    
    let throttle = 0.0;
    let targetLightInt = 0.0;
    let enableLight = true;
    
    if (effectState === '01_DORMANT') {
        throttle = 0.0;
    } else if (effectState === '02_IGNITION') {
        // Sequence: dark -> spark -> small core -> pop
        if (stateTime < 0.1) throttle = 0.0;
        else if (stateTime < 0.2) throttle = 0.1;
        else if (stateTime < 0.3) throttle = 0.3;
        else throttle = 0.5;
    } else if (effectState === '03_FULL_THRUST_NO_LIGHT') {
        throttle = 1.0 + Math.sin(effectTime * 20) * 0.05;
        enableLight = false;
    } else if (effectState === '04_FULL_THRUST_WITH_LIGHT' || effectState === '07_MACRO_FULL_THRUST' || effectState === '08_DEBUG_THRUST') {
        throttle = 1.0 + Math.sin(effectTime * 20) * 0.05;
    } else if (effectState === '05_THROTTLE_DOWN') {
        throttle = 0.4;
    } else if (effectState === '06_SHUTDOWN') {
        if (stateTime < 0.2) throttle = 0.2;
        else if (stateTime < 0.5) throttle = 0.05;
        else throttle = 0.0;
    }
    
    // Derived visual values from throttle
    let targetPlumeLength = throttle * 4.0; // max 4 nozzle diameters
    let targetCoreOp = Math.min(throttle * 2.0, 1.0);
    let targetPlumeInt = Math.min(throttle * 1.5, 1.0);
    let targetSparkOp = Math.min(throttle * 1.5, 1.0);
    
    if (enableLight) {
        targetLightInt = throttle * 0.15; // Kept strictly local
    } else {
        targetLightInt = 0.0;
    }
    
    let currentPlumeLen = 0;
    
    thrusterEffects.forEach(eff => {
        // Interpolate
        eff.core.material.opacity += (targetCoreOp - eff.core.material.opacity) * dt * 15;
        eff.light.intensity += (targetLightInt - eff.light.intensity) * dt * 15;
        eff.sparks.material.opacity += (targetSparkOp - eff.sparks.material.opacity) * dt * 15;
        
        let cIntOuter = eff.outerPlume.material.uniforms.intensity.value;
        cIntOuter += (targetPlumeInt - cIntOuter) * dt * 15;
        eff.outerPlume.material.uniforms.intensity.value = cIntOuter;
        eff.outerPlume.material.uniforms.throttle.value = throttle;
        eff.outerPlume.material.uniforms.time.value = effectTime;
        
        eff.innerPlume.material.uniforms.intensity.value = cIntOuter;
        eff.innerPlume.material.uniforms.throttle.value = throttle;
        eff.innerPlume.material.uniforms.time.value = effectTime;
        
        eff.secondaryPlume.material.uniforms.intensity.value = cIntOuter;
        eff.secondaryPlume.material.uniforms.throttle.value = throttle;
        eff.secondaryPlume.material.uniforms.time.value = effectTime;
        
        // Scale Length and Width based on throttle
        let cScaleZ = eff.outerPlume.scale.z;
        cScaleZ += (targetPlumeLength - cScaleZ) * dt * 20;
        
        let lenScale = Math.max(cScaleZ, 0.01);
        eff.outerPlume.scale.z = lenScale;
        eff.innerPlume.scale.z = lenScale * 0.85; // Inner plume slightly shorter
        eff.secondaryPlume.scale.z = lenScale * 0.6; // Secondary tongues much shorter
        
        // Width expansion based on throttle
        let widthScale = Math.max(0.2 + throttle * 0.8, 0.2);
        eff.outerPlume.scale.x = widthScale;
        eff.outerPlume.scale.y = widthScale;
        
        eff.innerPlume.scale.x = widthScale * 0.5; // Inner is narrower
        eff.innerPlume.scale.y = widthScale * 0.5;
        
        eff.secondaryPlume.scale.x = widthScale * 1.1; // Tongues slightly wider
        eff.secondaryPlume.scale.y = widthScale * 1.1;
        
        currentPlumeLen = cScaleZ;
        
        // Update particles
        const pos = eff.sparkGeo.attributes.position.array;
        for (let i=0; i<eff.pCount; i++) {
            if (targetSparkOp > 0.05) {
                pos[i*3] += eff.sparkVel[i].x * dt * 60 * throttle;
                pos[i*3+1] += eff.sparkVel[i].y * dt * 60 * throttle;
                pos[i*3+2] += eff.sparkVel[i].z * dt * 60 * throttle;
                
                // Reset if far along Z relative to plume length
                if (pos[i*3+2] > window.modelStats.nozzleDiameter * lenScale) {
                    pos[i*3] = (Math.random()-0.5)*0.0005;
                    pos[i*3+1] = (Math.random()-0.5)*0.0005;
                    pos[i*3+2] = 0;
                }
            } else {
                pos[i*3] = 0; pos[i*3+1] = 0; pos[i*3+2] = 0;
            }
        }
        eff.sparkGeo.attributes.position.needsUpdate = true;
    });

    logTimer += dt;
    if (logTimer > 0.5) {
        console.log(`TELEMETRY | STATE: ${effectState} | THROTTLE: ${throttle.toFixed(2)} | LENGTH: ${currentPlumeLen.toFixed(2)}D | LIGHT: ${thrusterEffects[0]?.light.intensity.toFixed(2)}`);
        logTimer = 0;
    }
}
animateEffects();

window.setDiagnosticMode = function(mode) {
    if (!currentModel) return;
    
    effectState = mode;
    stateTime = 0;
    
    const isProd = mode !== '08_DEBUG_THRUST';
    axesHelper.visible = !isProd;
    gridHelper.visible = !isProd;
    
    // Debug thrust overrides
    if (mode === '08_DEBUG_THRUST') {
        scene.background = new THREE.Color(0x888888);
        scene.fog = new THREE.Fog(0x888888, 0.1, 5);
        if (window.ground) window.ground.material.color.setHex(0x555555);
        ambientLight.intensity = 1.0;
        
        currentModel.traverse((child) => {
            if (child.isMesh && child.material && !child.name.startsWith('THRUSTER_')) {
                child.material = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1.0, metalness: 0.0 });
            }
        });
    } else {
        scene.background = new THREE.Color(0x020202);
        scene.fog = new THREE.Fog(0x020202, 0.1, 5);
        if (window.ground) window.ground.material.color.setHex(0x050505);
        ambientLight.intensity = 0.1;
        
        currentModel.traverse((child) => {
            if (child.isMesh && originalMaterials.has(child) && !child.name.startsWith('THRUSTER_')) {
                child.material = originalMaterials.get(child);
            }
        });
    }
    
    if (mode === '07_MACRO_FULL_THRUST') {
        if (thrusterLocators.length > 0) {
            const loc = thrusterLocators.find(l => l.name.includes('_R')) || thrusterLocators[0];
            const target = new THREE.Vector3();
            loc.getWorldPosition(target);
            
            // Frame: nozzle, core, ~60% plume, some armor
            const nd = window.modelStats.nozzleDiameter;
            camera.position.set(target.x + nd * 6.0, target.y + nd * 1.5, target.z - nd * 1.0);
            
            // Look slightly down the plume
            target.z += nd * 1.5;
            controls.target.copy(target);
            controls.update();
        }
    } else {
        const center = window.modelStats.center;
        const maxDim = window.modelStats.maxDim;
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.3;
        
        camera.position.set(center.x + cameraZ*0.6, center.y + cameraZ*0.3, center.z + cameraZ*0.8);
        controls.target.copy(center);
        controls.update();
    }
};

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
