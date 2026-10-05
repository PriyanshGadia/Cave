import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

gsap.registerPlugin(ScrollTrigger);

// ==========================================
// 1. SETUP SCENE, CAMERA, RENDERER
// ==========================================
const canvas = document.querySelector('#webgl-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const scene = new THREE.Scene();
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
scene.background = new THREE.Color(0x000000); // Pitch black initially
scene.fog = new THREE.FogExp2(0x000000, 0.015);

// Camera starts looking at the door
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 30); // 30m away from center

// ==========================================
// 2. LIGHTING
// ==========================================
const ambientLight = new THREE.AmbientLight(0x050505);
scene.add(ambientLight);

const practicalLight = new THREE.PointLight(0x8a0000, 0, 10); // Red
practicalLight.position.set(0, 2, 0);
scene.add(practicalLight);

const cyanAccent = new THREE.SpotLight(0x00f3ff, 0, 20, 0.5, 1, 1);
cyanAccent.position.set(0, 5, 5);
cyanAccent.target.position.set(0, 0, 0);
scene.add(cyanAccent);
scene.add(cyanAccent.target);

// Camera Light (Follows the flight)
const cameraLight = new THREE.DirectionalLight(0xffffff, 0); // starts at 0, faded in during power up
cameraLight.position.set(2, 2, 5);
camera.add(cameraLight);
camera.add(cameraLight.target);
cameraLight.target.position.set(0, 0, -10);
scene.add(camera); // Add camera to scene so its children are rendered

// ==========================================
// 3. ASSET GROUPS
// ==========================================
// We create groups for all objects so we can animate them even if the models fail to load.
const doorGroup = new THREE.Group();
const roomGroup = new THREE.Group();
const landingPadGroup = new THREE.Group();

// Armor Components
const armorParts = {
  helmet: null,
  torso: null,
  arms: null,
  gauntlets: null,
  legs: null,
  boots: null,
};

// Full Assembled Suit
const assembledSuitGroup = new THREE.Group();
let suitMixer = null;
let suitAnimations = {};

// Add them to the scene
scene.add(doorGroup);
scene.add(roomGroup);
scene.add(landingPadGroup);
scene.add(assembledSuitGroup);

// Position overrides for initial room state
doorGroup.position.set(0, 0, 20); // Door is close to camera
roomGroup.position.set(0, -1, 0);
landingPadGroup.position.set(0, -5, -100);
assembledSuitGroup.position.set(0, -5, -100);
assembledSuitGroup.visible = false;

// ==========================================
// 4. MODEL LOADING (WITH GRACEFUL FAIL)
// ==========================================
const loader = new GLTFLoader();

function loadModel(path, group, scale = 1, onLoaded = null) {
  loader.load(
    path,
    (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(scale);
      group.add(model);
      if (onLoaded) onLoaded(gltf);
    },
    undefined,
    (error) => {
      console.warn(`Asset missing or failed to load: ${path}. Proceeding without it per AGENTS.md rule 5.`);
    }
  );
}

// We will load cavern explicitly inside iron_man_rig callback to ensure order

import { initializeArmorEffects, updateArmorEffects } from './public/js/armor-effects.js';

const M_GUNMETAL = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide });
const M_BLOODRED = new THREE.MeshStandardMaterial({ color: 0x4a0000, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide });
const M_GRAPHITE = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.8, roughness: 0.6, side: THREE.DoubleSide });
const M_BLUE = new THREE.MeshStandardMaterial({ color: 0x0a33a0, metalness: 0.1, roughness: 0.2, emissive: 0x0a33a0, emissiveIntensity: 1.0, side: THREE.DoubleSide });
const M_SILVER = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 1.0, roughness: 0.2, side: THREE.DoubleSide });

function applyArmorMaterial(mesh) {
    const n = mesh.name.toLowerCase();
    if (n.includes('red') || n.includes('blood')) mesh.material = M_BLOODRED;
    else if (n.includes('dark') || n.includes('graphite') || n.includes('black')) mesh.material = M_GRAPHITE;
    else if (n.includes('blue') || n.includes('glow') || n.includes('light')) mesh.material = M_BLUE;
    else if (n.includes('silver') || n.includes('metal') || n.includes('joint')) mesh.material = M_SILVER;
    else mesh.material = M_GUNMETAL; // default
}

let allThrusterEffects = [];

const workbenchOffsets = {
  helmet: { x: 0, y: 1.8, z: 25 },
  torso: { x: 0, y: 1.0, z: 25 },
  arms: { x: -1.0, y: 1.0, z: 25 },
  gauntlets: { x: -1.0, y: 0.5, z: 25 },
  legs: { x: 1.0, y: 1.0, z: 25 },
  boots: { x: 1.0, y: 0.5, z: 25 }
};

const partsToLoad = ['helmet', 'torso', 'arms', 'gauntlets', 'legs', 'boots'];
let loadedCount = 0;
let totalMeshesLoaded = 0;
let debugLogs = {};

const ARMOR_ROOT = new THREE.Group();
ARMOR_ROOT.name = "ARMOR_ROOT";
scene.add(ARMOR_ROOT);

partsToLoad.forEach(partName => {
  loader.load(
    `/assets/armor/vault-mk1/final/${partName}.glb`,
    (gltf) => {
      const model = gltf.scene;
      
      let meshCount = 0;
      model.traverse(c => { 
        if (c.isMesh) {
          meshCount++;
          applyArmorMaterial(c);
        }
      });
      totalMeshesLoaded += meshCount;
      
      // Ensure local transforms are identity
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      model.scale.setScalar(1);
      
      armorParts[partName] = model;
      ARMOR_ROOT.add(model);
      
      const effects = initializeArmorEffects(model, 1.0);
      allThrusterEffects.push(...effects);

      loadedCount++;
      if (loadedCount === partsToLoad.length) {
        onAllArmorLoaded();
      }
    },
    undefined,
    (error) => {
      console.error(`Failed to load ${partName}.glb`, error);
      loadedCount++;
      if (loadedCount === partsToLoad.length) {
        onAllArmorLoaded();
      }
    }
  );
});

function onAllArmorLoaded() {
  // Normalize and center ARMOR_ROOT just like debug script
  ARMOR_ROOT.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(ARMOR_ROOT);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  
  if (!isNaN(size.x) && size.x !== 0 && isFinite(size.x)) {
    const scale = 3.0 / size.y;
    ARMOR_ROOT.scale.setScalar(scale);
    ARMOR_ROOT.updateMatrixWorld(true);
    
    const scaledBounds = new THREE.Box3().setFromObject(ARMOR_ROOT);
    const scaledCenter = new THREE.Vector3();
    scaledBounds.getCenter(scaledCenter);
    ARMOR_ROOT.position.sub(scaledCenter);
    ARMOR_ROOT.updateMatrixWorld(true);
  }

  // Set initial separated positions in local space (workbench)
  Object.keys(workbenchOffsets).forEach(partName => {
    if (armorParts[partName]) {
      const off = workbenchOffsets[partName];
      armorParts[partName].position.set(off.x, off.y - 1.0, off.z);
    }
  });

  // Load Cavern Environment
  loader.load(
    '/models/cavern-environment.glb',
    (cavernGltf) => {
      const cavern = cavernGltf.scene;
      cavern.position.set(0, -10, -100);
      cavern.traverse(c => {
        if (c.isMesh && c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach(m => {
            m.transparent = true;
            m.opacity = 0;
            m.side = THREE.DoubleSide;
          });
        }
      });
      
      const cavernLight = new THREE.PointLight(0xffffff, 50, 50);
      cavernLight.position.set(0, 10, -95);
      scene.add(cavernLight);
      
      const cavernAccent = new THREE.SpotLight(0x00f3ff, 100, 40, 0.5, 1, 1);
      cavernAccent.position.set(5, 5, -95);
      cavernAccent.target.position.set(0, -10, -100);
      scene.add(cavernAccent);
      scene.add(cavernAccent.target);

      cavern.scale.setScalar(30);
      cavern.position.y = -20;
      scene.add(cavern);
      window.cavernEnvironment = cavern;
    }
  );

  startIntro();
}

// ==========================================
// 5. INTRO SEQUENCE (NO SCROLL)
// ==========================================
function startIntro() {
  const tlIntro = gsap.timeline({
    onComplete: () => {
      // Enable scroll interactions after intro
      document.body.style.overflowY = 'auto';
      initScrollAnimations();
    }
  });

  // Setup Initial State
  gsap.set('.intro-name', { opacity: 0, y: 20 });
  gsap.set(doorGroup.position, { z: 20 });
  gsap.set(doorGroup.scale, { x: 1, y: 1, z: 1 });

  tlIntro
    // 1. Fade in P G
    .fromTo('.intro-letters', { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.inOut' })
    // 2. Form Name
    .to('.intro-name', { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, '+=0.5')
    // 3. Fade out the HTML layer to reveal WebGL Door behind it
    .to('#intro-layer', { opacity: 0, duration: 1, ease: 'power2.inOut' }, '+=0.5')
    .call(() => {
      document.getElementById('intro-layer').style.display = 'none';
    })
    // 4. Slide door open (simulated by splitting/scaling or moving parts if model has it)
    // If no model, we just move the group out of the way
    .to(doorGroup.position, { x: -10, duration: 1.5, ease: 'power3.inOut' }) 
    // 5. Room Power up
    .to(ambientLight, { intensity: 1.5, duration: 1 }, '-=1')
    .to(practicalLight, { intensity: 50, duration: 0.5 }, '-=0.5')
    .to(cyanAccent, { intensity: 100, duration: 0.5 }, '+=0.2')
    .to(cameraLight, { intensity: 5.0, duration: 0.5 }, '-=0.5');

  // 6. Armor parts hover up, ready to be attached
  const validParts = Object.values(armorParts).filter(p => p !== null);
  if (validParts.length > 0) {
    tlIntro.to(validParts.map(p => p.position), { y: '+=1.5', duration: 2, stagger: 0.2, ease: 'power2.inOut' }, '-=0.5');
  }
}

// ==========================================
// 6. SCROLL ANIMATIONS
// ==========================================
function initScrollAnimations() {
  // We map the flight path. Camera flies ENE (x: +, z: -)
  const flightTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '#scroll-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1
    }
  });

  // Fade in copy blocks when they enter
  gsap.utils.toArray('.copy-block').forEach((block) => {
    gsap.fromTo(block, 
      { opacity: 0, y: 50 },
      { 
        opacity: 1, 
        y: 0, 
        scrollTrigger: {
          trigger: block,
          start: 'top 70%',
          end: 'top 30%',
          scrub: true
        }
      }
    );
  });

  // CAMERA FLIGHT PATH
  // 1. Exit the room
  flightTimeline.to(camera.position, {
    x: 0,
    y: 10,
    z: -30,
    ease: 'power1.inOut',
    duration: 0.2
  }, 0);
  
  // 2. Fly down path
  flightTimeline.to(camera.position, {
    x: 0,
    y: 0,
    z: -75,
    ease: 'none',
    duration: 0.6
  }, 0.2);

  // 3. Final landing approach
  flightTimeline.to(camera.position, {
    x: 0,
    y: -8,
    z: -90,
    ease: 'power2.out',
    duration: 0.2
  }, 0.8);

  flightTimeline.to(camera.rotation, {
    x: 0.1, y: 0, z: 0,
    ease: 'power1.inOut',
    duration: 1
  }, 0);

  // SEQUENCE THE COMPONENTS
  // They start at workbench positions. They fly along with the camera, appearing one by one.
  const components = [
    armorParts.boots,
    armorParts.legs,
    armorParts.torso,
    armorParts.arms,
    armorParts.gauntlets,
    armorParts.helmet
  ].filter(p => p !== null);

  components.forEach((comp, index) => {
    const startTime = 0.1 + (index * 0.08);
    
    // Part flies from workbench to left side of camera view
    // Since ARMOR_ROOT is now centered at (0,0,0) and scaled, we need to move the components in their local space
    // to match the flight timeline. But ARMOR_ROOT is fixed at origin right now.
    // Wait, the original code animated comp.position while camera moved, but since comp was in scene root, its world pos moved.
    // Now comp is in ARMOR_ROOT which is scaled. We need to move ARMOR_ROOT into the vault (-10, -100) and assemble there.
    // Or we move ARMOR_ROOT right from the start? No, workbench is near the camera start.
    
    // Let's animate ARMOR_ROOT's position along with the camera, or place it at the landing pad?
    // Actually, ARMOR_ROOT can just sit at the vault entrance (-10, -100).
    // And the individual pieces start far away (at the workbench) and fly INTO the vault.
  });

  // Setup ARMOR_ROOT final position
  ARMOR_ROOT.position.set(0, -10, -100);
  
  // Since ARMOR_ROOT is far away, we must compensate the workbench offsets so they appear near camera originally
  // Wait, the original code had them fly FROM workbench (near origin) TO vault (-100).
  // If ARMOR_ROOT is at -100, we must offset the start position by +100!
  // Let's adjust the GSAP timeline.
  components.forEach((comp, index) => {
    const startTime = 0.1 + (index * 0.08);
    const initialOff = workbenchOffsets[Object.keys(armorParts).find(key => armorParts[key] === comp)];
    
    // Set them far out so they appear at workbench globally. (ARMOR_ROOT scale applies, so we must divide by scale)
    // Actually it's easier to just animate them locally to (0,0,0).
    // The previous code had them fly to (0, -10, -100) locally because they were in scene root.
    // Since they are now in ARMOR_ROOT which is AT (0, -10, -100), their target is (0,0,0).
    
    // So we animate from: current local offset + some world offset?
    // No, just let GSAP animate them from a local position that corresponds to the workbench, to (0,0,0).
    // Local workbench Z was 25. Let's make them fly from z = 100/scale, to z=0.
    const scale = ARMOR_ROOT.scale.x;
    
    gsap.set(comp.position, {
        x: (initialOff.x) / scale,
        y: (initialOff.y - 1.0 + 10) / scale,
        z: (initialOff.z + 100) / scale
    });
    
    flightTimeline.to(comp.position, { 
      x: -4 / scale,
      y: (Math.random() * 4 - 2) / scale,
      z: 35 / scale, 
      ease: 'power1.inOut', 
      duration: 0.4 
    }, startTime);

    flightTimeline.to(comp.rotation, {
      y: Math.PI * 2, x: 0.5,
      ease: 'none',
      duration: 0.4
    }, startTime);

    // Boost ahead to assembly area all together
    flightTimeline.to(comp.position, {
      x: 0, y: 0, z: 0, 
      ease: 'power2.in', 
      duration: 0.2
    }, 0.7);
    
    flightTimeline.to(comp.rotation, {
      y: 0, x: 0,
      ease: 'power2.in',
      duration: 0.2
    }, 0.7);
  });

  // FORMATION & LANDING
  flightTimeline.call(() => {
    // Fade in cavern
    if (window.cavernEnvironment) {
       window.cavernEnvironment.traverse(c => {
         if (c.isMesh && c.material) {
           const mats = Array.isArray(c.material) ? c.material : [c.material];
           mats.forEach(m => gsap.to(m, { opacity: 1, duration: 1 }));
         }
       });
    }
    
    if (suitAnimations['Landing']) {
      suitAnimations['Landing'].reset().play();
    }
    
    // Show UI Button
    const btn = document.getElementById('repulsor-btn');
    if (btn) {
      btn.classList.remove('hidden');
      gsap.fromTo(btn, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.5 });
    }
    
    // Add strong light to illuminate the suit
    let finalLight = scene.getObjectByName('finalLight');
    if (!finalLight) {
       finalLight = new THREE.PointLight(0xffffff, 100, 300);
       finalLight.name = 'finalLight';
       finalLight.position.set(0, -5, -95);
       scene.add(finalLight);
       
       const cavernAmbient = new THREE.AmbientLight(0xffffff, 2.0);
       scene.add(cavernAmbient);
    }
    
  }, null, 0.95);
}

// ==========================================
// 7. REPULSOR INTERACTION
// ==========================================
let isRepulsorActive = false;
let repulsorTimer = 0;

document.getElementById('repulsor-btn').addEventListener('click', () => {
  // Hide button
  document.getElementById('repulsor-btn').classList.add('hidden');

  const btnTl = gsap.timeline();
  
  // Play StepBack and AimAndShoot animations if they exist
  if (suitAnimations['StepBack']) {
    suitAnimations['StepBack'].reset().play();
  }
  
  isRepulsorActive = true;
  repulsorTimer = 2.0; // throttle boost duration

  btnTl.to(camera.position, { z: -85, duration: 2, ease: 'power2.inOut' }) // Zoom in slightly
       .call(() => {
         if (suitAnimations['AimAndShoot']) {
           suitAnimations['AimAndShoot'].reset().play();
         }
       })
       // Flash of cyan light from repulsor
       .to(cyanAccent, { intensity: 50, duration: 0.1 })
       .to(cyanAccent, { intensity: 10, duration: 0.5 })
       // Show final CTA
       .call(() => {
         const cta = document.getElementById('vault-cta');
         cta.classList.remove('hidden');
         gsap.fromTo(cta, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 });
       });
});

// Removed debug show armor

// ==========================================
// 8. RENDER LOOP
// ==========================================
const clock = new THREE.Clock();
const lenis = new Lenis();
let suitThrottle = 0.0;

function animate(time) {
  lenis.raf(time);
  
  const delta = clock.getDelta();
  if (suitMixer) suitMixer.update(delta);
  
  const elapsedTime = clock.getElapsedTime();

  // If repulsor is fired, spike the throttle, otherwise idle at 0.1
  if (isRepulsorActive) {
      suitThrottle += (1.0 - suitThrottle) * delta * 10;
      repulsorTimer -= delta;
      if (repulsorTimer <= 0) {
          isRepulsorActive = false;
      }
  } else {
      suitThrottle += (0.1 - suitThrottle) * delta * 2;
  }

  // Update Effects
  if (allThrusterEffects && allThrusterEffects.length > 0) {
      updateArmorEffects(allThrusterEffects, Math.min(delta, 0.05), suitThrottle, elapsedTime);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Handle Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
