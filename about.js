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
  // 2. NORMALIZE/CENTER
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

  // 3. EXPLICIT VISIBILITY
  ARMOR_ROOT.visible = true;
  Object.values(armorParts).forEach(p => {
    if (p) {
      p.visible = true;
      p.traverse(c => {
        if (c.isMesh) c.visible = true;
      });
    }
  });

  // Setup ARMOR_ROOT final position
  ARMOR_ROOT.position.set(0, -10, -100);
  ARMOR_ROOT.updateMatrixWorld(true);

  // Set initial separated positions in local space (workbench)
  // LocalPos = (WorldPos - RootPos) / Scale
  const scale = ARMOR_ROOT.scale.x;
  Object.keys(workbenchOffsets).forEach(partName => {
    if (armorParts[partName]) {
      const off = workbenchOffsets[partName];
      // original world pos: x: off.x, y: off.y - 1.0, z: off.z
      armorParts[partName].position.set(
        (off.x) / scale,
        (off.y - 1.0 + 10) / scale,
        (off.z + 100) / scale
      );
    }
  });

  // 6. TELEMETRY
  const finalBounds = new THREE.Box3().setFromObject(ARMOR_ROOT);
  console.log('[ARMOR PROD]');
  console.log(`loaded=true`);
  console.log(`components=${Object.values(armorParts).filter(p=>p).length}`);
  console.log(`meshes=${totalMeshesLoaded}`);
  console.log(`rootVisible=${ARMOR_ROOT.visible}`);
  console.log(`rootScale=${ARMOR_ROOT.scale.x}`);
  console.log(`rootBounds=min(${finalBounds.min.x.toFixed(2)},${finalBounds.min.y.toFixed(2)},${finalBounds.min.z.toFixed(2)}) max(${finalBounds.max.x.toFixed(2)},${finalBounds.max.y.toFixed(2)},${finalBounds.max.z.toFixed(2)})`);
  console.log(`stage=normalized`);

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
      
      // 7. MARK READY
      window.__ARMOR_READY = true;
      requestAnimationFrame(() => requestAnimationFrame(() => initCinematic()));
    }
  );
}

// ==========================================
// 5. MASTER CINEMATIC TIMELINE
// ==========================================
function initCinematic() {
  const urlParams = new URLSearchParams(window.location.search);
  const isTest = urlParams.get('cinematicTest') === '1';

  // In Test mode, we completely disable Lenis by not starting it, 
  // so progress is 100% deterministic and controlled by the harness
  window.isCinematicTest = isTest;
  
  if (!isTest) {
     // Allow native scroll
     document.body.style.overflowY = 'auto';
  } else {
     // Force hide overflow to prevent accidental real scroll in test
     document.body.style.overflowY = 'hidden';
  }

  // Master timeline encompassing everything
  // We use a paused timeline, and either scrub it with ScrollTrigger or manually via setCinematicProgress
  const masterTimeline = gsap.timeline({
    paused: isTest,
    scrollTrigger: isTest ? null : {
      trigger: '#scroll-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1
    },
    onUpdate: () => {
      console.log(`[ABOUT CINEMATIC] progress=${masterTimeline.progress().toFixed(3)}`);
    }
  });

  window.masterCinematicTimeline = masterTimeline;
  window.setCinematicProgress = (p) => {
    masterTimeline.progress(p);
  };

  // Setup Initial State
  gsap.set('.name-hidden', { opacity: 0, width: 0 });
  gsap.set('.intro-name-container', { gap: '8rem' });
  gsap.set(doorGroup.position, { z: 20 });
  gsap.set(doorGroup.scale, { x: 1, y: 1, z: 1 });
  
  const scale = ARMOR_ROOT.scale.x;
  
  // Set initial component positions (workbench)
  Object.keys(workbenchOffsets).forEach(partName => {
    if (armorParts[partName]) {
      const off = workbenchOffsets[partName];
      armorParts[partName].position.set(
        (off.x) / scale,
        (off.y - 1.0 + 10) / scale,
        (off.z + 100) / scale
      );
      armorParts[partName].rotation.set(0, 0, 0);
    }
  });

  // Since we are mapping this exactly to percentages, we give the master timeline a total duration of 100
  // so that `.to(..., { duration: X }, Y)` exactly matches scroll percentage points!
  
  // ==========================================
  // SHOT A: Intro Identity (0 -> 10)
  // ==========================================
  // P and G are already visible at gap: 8rem
  masterTimeline.to('.intro-name-container', { gap: '1rem', duration: 4, ease: 'power2.inOut' }, 2);
  masterTimeline.to('.name-hidden', { opacity: 1, width: 'auto', duration: 4, ease: 'power2.out' }, 2);
  masterTimeline.to('#intro-layer', { autoAlpha: 0, duration: 2, ease: 'power2.inOut' }, 8);

  // ==========================================
  // SHOT B & C: Door opening / workshop reveal (10 -> 20)
  // ==========================================
  masterTimeline.to(doorGroup.position, { x: -10, duration: 6, ease: 'power3.inOut' }, 10);
  masterTimeline.to(ambientLight, { intensity: 1.5, duration: 4 }, 10);
  masterTimeline.to(practicalLight, { intensity: 50, duration: 3 }, 12);
  masterTimeline.to(cyanAccent, { intensity: 100, duration: 3 }, 14);
  masterTimeline.to(cameraLight, { intensity: 5.0, duration: 3 }, 13);

  // ==========================================
  // SHOT D: Armor Activation (20 -> 25)
  // ==========================================
  const validParts = Object.values(armorParts).filter(p => p !== null);
  if (validParts.length > 0) {
    masterTimeline.to(validParts.map(p => p.position), { 
      y: `+=${1.5 / scale}`, duration: 3, stagger: 0.5, ease: 'power2.inOut' 
    }, 20);
  }

  // ==========================================
  // SHOT E - K: Flight (Camera deliberate tracking) (25 -> 85)
  // ==========================================
  // Camera moves out of workshop and starts following
  // At 25, exit the workshop
  masterTimeline.to(camera.position, { x: 0, y: 5, z: 0, ease: 'power1.inOut', duration: 10 }, 25);
  // At 35, fly down path
  masterTimeline.to(camera.position, { x: 0, y: 0, z: -50, ease: 'none', duration: 30 }, 35);
  // At 65, final landing approach
  masterTimeline.to(camera.position, { x: 0, y: -5, z: -85, ease: 'power2.out', duration: 20 }, 65);
  
  // Camera tilt
  masterTimeline.to(camera.rotation, { x: 0.05, y: 0, z: 0, ease: 'power1.inOut', duration: 10 }, 25);

  const components = [
    armorParts.boots,
    armorParts.legs,
    armorParts.torso,
    armorParts.arms,
    armorParts.gauntlets,
    armorParts.helmet
  ].filter(p => p !== null);

  components.forEach((comp, index) => {
    const launchStart = 25 + (index * 4); // Launch at 25, 29, 33, 37, 41, 45
    
    // Launch off workbench and start flying down tunnel
    masterTimeline.to(comp.position, { 
      x: (-2 + (Math.random() * 4 - 2)) / scale,
      y: ((Math.random() * 4 - 2) + 5) / scale,
      z: (-40 + 100) / scale, 
      ease: 'power1.in', 
      duration: 15
    }, launchStart);

    masterTimeline.to(comp.rotation, {
      y: Math.PI * 2, x: 0.5,
      ease: 'none',
      duration: 15
    }, launchStart);

    // Boost ahead to assembly area (75 -> 85)
    // Assembly starts at 75
    masterTimeline.to(comp.position, {
      x: 0, y: 15 / scale, z: 0, 
      ease: 'power2.inOut', 
      duration: 8
    }, 70 + (index * 1));
    
    masterTimeline.to(comp.rotation, {
      y: 0, x: 0,
      ease: 'power2.inOut',
      duration: 8
    }, 70 + (index * 1));
  });

  // ==========================================
  // SHOT L - N: Descent & Landing (85 -> 95)
  // ==========================================
  if (validParts.length > 0) {
    masterTimeline.to(validParts.map(p => p.position), { 
      y: 0, duration: 5, stagger: 0.5, ease: 'power2.in' 
    }, 85);
  }

  // ==========================================
  // 95 -> 100: Final stand, UI reveal
  // ==========================================
  masterTimeline.call(() => {
    console.log('[ARMOR PROD] stage=assembled');
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
    
    const btn = document.getElementById('repulsor-btn');
    if (btn) {
      btn.classList.remove('hidden');
      gsap.fromTo(btn, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.5 });
    }
  }, null, 95);

  // ==========================================
  // TEXT BLOCKS (Deterministic mapping)
  // ==========================================
  const chapters = [
    '#chapter-01 .copy-block',
    '#chapter-02 .copy-block',
    '#chapter-03 .copy-block',
    '#chapter-04 .copy-block',
    '#chapter-05 .copy-block',
    '#chapter-06 .copy-block',
  ];
  
  // They appear during flight phase: 35, 42, 49, 56, 63, 70
  chapters.forEach((sel, i) => {
     const block = document.querySelector(sel);
     if (block) {
        masterTimeline.fromTo(block, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 4 }, 35 + (i * 7));
        masterTimeline.to(block, { autoAlpha: 0, y: -50, duration: 3 }, 35 + (i * 7) + 5);
     }
  });

  const finalBlock = document.querySelector('#chapter-final .copy-block');
  if (finalBlock) {
     masterTimeline.fromTo(finalBlock, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 4 }, 95);
  }
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
  if (!window.isCinematicTest) {
      lenis.raf(time);
  }
  
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
