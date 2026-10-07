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

// Materials
const M_GUNMETAL = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide });
const M_BLOODRED = new THREE.MeshStandardMaterial({ color: 0x4a0000, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide });
const M_GRAPHITE = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.8, roughness: 0.6, side: THREE.DoubleSide });
const M_BLUE = new THREE.MeshStandardMaterial({ color: 0x0a33a0, metalness: 0.1, roughness: 0.2, emissive: 0x0a33a0, emissiveIntensity: 1.0, side: THREE.DoubleSide });
const M_SILVER = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 1.0, roughness: 0.2, side: THREE.DoubleSide });

// Build the explicitly required static objects per step 1

// 1. DOOR (Gigantic gunmetal steel door)
const leftDoorGeo = new THREE.BoxGeometry(20, 40, 2);
const rightDoorGeo = new THREE.BoxGeometry(20, 40, 2);
const leftDoor = new THREE.Mesh(leftDoorGeo, M_GUNMETAL);
const rightDoor = new THREE.Mesh(rightDoorGeo, M_GUNMETAL);
leftDoor.position.set(-10, 0, 0); // closed seam at 0
rightDoor.position.set(10, 0, 0); // closed seam at 0
leftDoor.name = "leftDoor";
rightDoor.name = "rightDoor";
doorGroup.add(leftDoor);
doorGroup.add(rightDoor);
doorGroup.position.set(0, 0, 15); // Place door in front of the camera

// 2. WORKSHOP (Dark futuristic room + workbench)
const roomGeo = new THREE.BoxGeometry(60, 40, 80);
const roomMat = M_GRAPHITE.clone();
roomMat.side = THREE.BackSide; 
const room = new THREE.Mesh(roomGeo, roomMat);
room.position.set(0, 0, -25); // Behind the door
roomGroup.add(room);

const workbenchGeo = new THREE.BoxGeometry(10, 2, 6);
const workbench = new THREE.Mesh(workbenchGeo, M_GUNMETAL);
workbench.position.set(0, -5, -40); // distant workbench
roomGroup.add(workbench);

// 3. LANDING PAD & VAULT
const padGeo = new THREE.CylinderGeometry(15, 15, 1, 32);
const pad = new THREE.Mesh(padGeo, M_GRAPHITE);
pad.position.set(0, -6, 0);
landingPadGroup.add(pad);

const buttonGeo = new THREE.CylinderGeometry(1, 1, 0.2, 16);
const button = new THREE.Mesh(buttonGeo, M_BLOODRED);
button.position.set(10, -5.4, 0);
landingPadGroup.add(button);

const vaultTunnelGeo = new THREE.CylinderGeometry(20, 20, 100, 32, 1, true);
const vaultTunnel = new THREE.Mesh(vaultTunnelGeo, M_GUNMETAL);
vaultTunnel.rotation.x = Math.PI / 2;
vaultTunnel.position.set(0, 0, -50);
landingPadGroup.add(vaultTunnel);

landingPadGroup.position.set(0, 0, -150); // Far back in the scene

// ==========================================
// 4. MODEL LOADING (WITH GRACEFUL FAIL)
// ==========================================
const loader = new GLTFLoader();

import { initializeArmorEffects, updateArmorEffects } from './public/js/armor-effects.js';



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
  // 2. EXPLICIT SCALE (Do not rely on bounding-box camera math)
  ARMOR_ROOT.scale.setScalar(3.57); // Explicit scale known from previous runs
  ARMOR_ROOT.position.set(0, -6, -40); // Base position centered in the workshop
  ARMOR_ROOT.updateMatrixWorld(true);

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

  // Set initial separated positions in local space (workbench)
  // LocalPos = (WorldPos - RootPos) / Scale
  const scale = ARMOR_ROOT.scale.x;
  Object.keys(workbenchOffsets).forEach(partName => {
    if (armorParts[partName]) {
      const off = workbenchOffsets[partName];
      armorParts[partName].position.set(
        (off.x) / scale,
        (off.y) / scale,
        (off.z) / scale
      );
    }
  });

  // 6. TELEMETRY
  console.log('[ARMOR PROD]');
  console.log(`loaded=true`);
  console.log(`components=${Object.values(armorParts).filter(p=>p).length}`);
  console.log(`meshes=${totalMeshesLoaded}`);
  console.log(`rootVisible=${ARMOR_ROOT.visible}`);
  console.log(`rootScale=${ARMOR_ROOT.scale.x}`);
  console.log(`stage=static`);

  // 7. MARK READY
  window.__ARMOR_READY = true;
  requestAnimationFrame(() => requestAnimationFrame(() => initCinematic()));
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
  // SHOT A: Intro Identity (0 -> 8)
  // ==========================================
  masterTimeline.to('.intro-name-container', { gap: '1rem', duration: 5, ease: 'power2.inOut' }, 2);
  masterTimeline.to('.name-hidden', { opacity: 1, width: 'auto', duration: 5, ease: 'power2.out' }, 2);
  masterTimeline.to('#intro-layer', { autoAlpha: 0, duration: 2, ease: 'power2.inOut' }, 6); // Fades out before 8

  // ==========================================
  // SHOT B: Door Reveal (8 -> 18)
  // ==========================================
  const leftDoor = scene.getObjectByName('leftDoor');
  const rightDoor = scene.getObjectByName('rightDoor');
  if (leftDoor && rightDoor) {
    masterTimeline.to(leftDoor.position, { x: -30, duration: 8, ease: 'power2.inOut' }, 10);
    masterTimeline.to(rightDoor.position, { x: 30, duration: 8, ease: 'power2.inOut' }, 10);
  }
  
  // ==========================================
  // SHOT C: Workshop Reveal (18 -> 28)
  // ==========================================
  masterTimeline.to(camera.position, { x: 0, y: 5, z: -20, duration: 10, ease: 'power1.inOut' }, 18);
  masterTimeline.to(ambientLight, { intensity: 1.5, duration: 4 }, 18);
  masterTimeline.to(practicalLight, { intensity: 50, duration: 3 }, 18);

  // ==========================================
  // SHOT D: Armor Power-Up (28 -> 36)
  // ==========================================
  masterTimeline.to(cyanAccent, { intensity: 100, duration: 3 }, 28);
  masterTimeline.to(cameraLight, { intensity: 5.0, duration: 3 }, 28);

  // ==========================================
  // SHOT E: Launch Preparation (36 -> 42)
  // ==========================================
  const validParts = Object.values(armorParts).filter(p => p !== null);
  if (validParts.length > 0) {
    masterTimeline.to(validParts.map(p => p.position), { 
      y: `+=${2.0}`, duration: 6, ease: 'power2.inOut' 
    }, 36);
  }

  // ==========================================
  // SHOT F - K: Flight sequence (42 -> 84)
  // ==========================================
  // Camera pans to follow flight
  masterTimeline.to(camera.position, { x: 0, y: 5, z: -70, ease: 'none', duration: 40 }, 42);

  const components = [
    armorParts.boots,
    armorParts.legs,
    armorParts.torso,
    armorParts.arms,
    armorParts.gauntlets,
    armorParts.helmet
  ].filter(p => p !== null);

  components.forEach((comp, index) => {
    // 42, 50, 57, 64, 71, 78
    const launchStart = index === 0 ? 42 : 50 + ((index - 1) * 7); 
    
    // Launch towards camera/assembly area
    masterTimeline.to(comp.position, { 
      x: -5 + (Math.random() * 2), // occupy left
      y: 5 + (Math.random() * 2),
      z: -80, 
      ease: 'power1.in', 
      duration: 15
    }, launchStart);

    masterTimeline.to(comp.rotation, {
      y: Math.PI * 2, x: 0.5,
      ease: 'none',
      duration: 15
    }, launchStart);

    // Assembly path (84 -> 89 is ALL COMPONENTS flying together, so we just let them settle)
    masterTimeline.to(comp.position, {
      x: 0, y: 15, z: -100, 
      ease: 'power2.inOut', 
      duration: 5
    }, 84);
    
    masterTimeline.to(comp.rotation, {
      y: 0, x: 0,
      ease: 'power2.inOut',
      duration: 5
    }, 84);
  });

  // ==========================================
  // SHOT L: Descent (89 -> 94)
  // ==========================================
  // Complete suit descends toward circular landing pad (pad is at z=-150)
  masterTimeline.to(camera.position, { x: 0, y: -2, z: -110, ease: 'power2.inOut', duration: 5 }, 89);
  
  if (validParts.length > 0) {
    masterTimeline.to(validParts.map(p => p.position), { 
      x: 0, y: -5, z: -150, duration: 5, ease: 'power2.in' 
    }, 89);
  }

  // ==========================================
  // SHOT M: Assembly (94 -> 96.5)
  // ==========================================
  masterTimeline.call(() => {
    if (suitAnimations['Landing']) {
      suitAnimations['Landing'].reset().play();
    }
  }, null, 94);

  // ==========================================
  // SHOT N: Landing Pad (96.5 -> 98.5)
  // ==========================================
  // Camera reveals full pad and button
  masterTimeline.to(camera.position, { x: 0, y: 0, z: -130, ease: 'power1.inOut', duration: 2 }, 96.5);
  masterTimeline.call(() => {
    let finalLight = scene.getObjectByName('finalLight');
    if (!finalLight) {
       finalLight = new THREE.PointLight(0xffffff, 100, 300);
       finalLight.name = 'finalLight';
       finalLight.position.set(0, 0, -140);
       scene.add(finalLight);
       
       const cavernAmbient = new THREE.AmbientLight(0xffffff, 2.0);
       scene.add(cavernAmbient);
    }
    
    const btn = document.getElementById('repulsor-btn');
    if (btn) {
      btn.classList.remove('hidden');
      gsap.fromTo(btn, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.5 });
    }
  }, null, 96.5);

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
  
  // They appear during flight phase
  chapters.forEach((sel, i) => {
     const block = document.querySelector(sel);
     if (block) {
        masterTimeline.fromTo(block, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 4 }, 42 + (i * 7));
        masterTimeline.to(block, { autoAlpha: 0, y: -50, duration: 3 }, 42 + (i * 7) + 5);
     }
  });

  const finalBlock = document.querySelector('#chapter-final .copy-block');
  if (finalBlock) {
     masterTimeline.fromTo(finalBlock, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 4 }, 96.5);
  }

  // ==========================================
  // SHOT O: VAULT ENTRY (98.5 -> 100)
  // ==========================================
  masterTimeline.call(() => {
    if (suitAnimations['StepBack']) suitAnimations['StepBack'].reset().play();
    isRepulsorActive = true;
    repulsorTimer = 2.0;
  }, null, 98.5);

  masterTimeline.to(camera.position, { z: -120, duration: 0.5, ease: 'power2.inOut' }, 99);
  
  masterTimeline.call(() => {
    if (suitAnimations['AimAndShoot']) suitAnimations['AimAndShoot'].reset().play();
  }, null, 99.5);
  
  masterTimeline.to(cyanAccent, { intensity: 50, duration: 0.1 }, 99.6);
  masterTimeline.to(cyanAccent, { intensity: 10, duration: 0.4 }, 99.7);
  
  // Open the aperture
  masterTimeline.to(landingPadGroup.position, { y: -20, duration: 0.5, ease: 'power2.in' }, 99.5); // Pad drops away revealing tunnel
  
  // Show final CTA
  masterTimeline.call(() => {
    const cta = document.getElementById('vault-cta');
    if (cta) {
      cta.classList.remove('hidden');
      gsap.fromTo(cta, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
    }
  }, null, 100);
}

// ==========================================
// 7. REPULSOR INTERACTION (NOW TIMELINE DRIVEN)
// ==========================================
let isRepulsorActive = false;
let repulsorTimer = 0;

// Repulsor is now purely driven by the master timeline.
// We keep the variables for the render loop to process effects.

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
