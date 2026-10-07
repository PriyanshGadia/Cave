import * as THREE from 'three';

// Pass 04D Colors (Deep Neon Blue)
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

/**
 * Creates and attaches exhaust plumes and core effects to locators within a model.
 * @param {THREE.Object3D} model The model containing 'THRUSTER_' objects
 * @param {number} scaleMultiplier Base scale for the effects
 * @returns {Array} List of effect controllers
 */
export function initializeArmorEffects(model, scaleMultiplier = 1.0) {
    if (!window.__particleTex) {
        window.__particleTex = createParticleTexture();
    }
    const particleTex = window.__particleTex;
    
    let thrusterEffects = [];
    
    const nozzleRadius = 0.0015 * scaleMultiplier;
    const nozzleDiameter = nozzleRadius * 2;
    
    // Use a shared geometry for plumes where possible
    const plumeGeo = new THREE.CylinderGeometry(nozzleRadius*2, nozzleRadius*2, nozzleDiameter, 16, 16, true);
    plumeGeo.translate(0, -nozzleDiameter/2, 0);
    plumeGeo.rotateX(-Math.PI / 2); 
    
    model.traverse((child) => {
        if (child.name.startsWith('THRUSTER_')) {
            const effectGroup = new THREE.Group();
            
            // 1. Point Light
            const tLight = new THREE.PointLight(LIGHT_COLOR.getHex(), 0.0, 0.015 * scaleMultiplier); 
            tLight.position.z = 0.002 * scaleMultiplier; 
            effectGroup.add(tLight);
            
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
                    x: (Math.random()-0.5)*0.0005 * scaleMultiplier,
                    y: (Math.random()-0.5)*0.0005 * scaleMultiplier,
                    z: (0.01 + Math.random()*0.02) * scaleMultiplier 
                });
            }
            sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
            const sparkMat = new THREE.PointsMaterial({
                size: 0.0005 * scaleMultiplier,
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
                pCount: pCount,
                nozzleDiameter: nozzleDiameter
            });
        }
    });
    
    return thrusterEffects;
}

/**
 * Update the thruster effects each frame.
 * @param {Array} thrusterEffects The list of effects returned by initializeArmorEffects
 * @param {number} dt Delta time in seconds
 * @param {number} throttle Throttle amount 0.0 - 1.0 (can go > 1.0 for overdrive)
 * @param {number} effectTime Continuous effect time
 */
export function updateArmorEffects(thrusterEffects, dt, throttle, effectTime) {
    if (!thrusterEffects || thrusterEffects.length === 0) return;
    
    // Derived visual values from throttle
    let targetPlumeLength = throttle * 4.0; // max 4 nozzle diameters
    let targetCoreOp = Math.min(throttle * 2.0, 1.0);
    let targetPlumeInt = Math.min(throttle * 1.5, 1.0);
    let targetSparkOp = Math.min(throttle * 1.5, 1.0);
    
    let targetLightInt = throttle * 0.15; // Kept strictly local
    
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
        eff.innerPlume.scale.z = lenScale * 0.85; 
        eff.secondaryPlume.scale.z = lenScale * 0.6; 
        
        // Width expansion based on throttle
        let widthScale = Math.max(0.2 + throttle * 0.8, 0.2);
        eff.outerPlume.scale.x = widthScale;
        eff.outerPlume.scale.y = widthScale;
        
        eff.innerPlume.scale.x = widthScale * 0.5; 
        eff.innerPlume.scale.y = widthScale * 0.5;
        
        eff.secondaryPlume.scale.x = widthScale * 1.1; 
        eff.secondaryPlume.scale.y = widthScale * 1.1;
        
        // Update particles
        const pos = eff.sparkGeo.attributes.position.array;
        for (let i=0; i<eff.pCount; i++) {
            if (targetSparkOp > 0.05) {
                pos[i*3] += eff.sparkVel[i].x * dt * 60 * throttle;
                pos[i*3+1] += eff.sparkVel[i].y * dt * 60 * throttle;
                pos[i*3+2] += eff.sparkVel[i].z * dt * 60 * throttle;
                
                // Reset if far along Z relative to plume length
                if (pos[i*3+2] > eff.nozzleDiameter * lenScale) {
                    pos[i*3] = (Math.random()-0.5)*0.0005 * eff.nozzleDiameter / 0.003;
                    pos[i*3+1] = (Math.random()-0.5)*0.0005 * eff.nozzleDiameter / 0.003;
                    pos[i*3+2] = 0;
                }
            } else {
                pos[i*3] = 0; pos[i*3+1] = 0; pos[i*3+2] = 0;
            }
        }
        eff.sparkGeo.attributes.position.needsUpdate = true;
    });
}
