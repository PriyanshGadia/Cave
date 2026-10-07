import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

gsap.registerPlugin(ScrollTrigger);

// 1. Scene Setup
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a); 

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 5); // Just outside the door

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const cyanLight = new THREE.PointLight(0x00ffff, 2.0, 10);
cyanLight.position.set(0, 1.5, 2);
scene.add(cyanLight);

const loader = new GLTFLoader();
const components = ['boots', 'legs', 'torso', 'arms', 'gauntlets', 'helmet'];
const loadedMeshes = {};

const vaultGunmetal = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 });

Promise.all(components.map(comp => {
  return new Promise((resolve) => {
    loader.load(`/assets/armor/vault-mk1/source/${comp}.glb`, (gltf) => {
      const model = gltf.scene;
      
      // We can apply a base material to see geometry clearly since textures were stripped
      model.traverse((child) => {
        if (child.isMesh) {
            // retain vertex colors or material slots, but ensure they are visible
            if (!child.material || child.material.name === "") {
                child.material = vaultGunmetal;
            } else {
                // enhance existing stripped materials slightly
                child.material.metalness = 0.8;
                child.material.roughness = 0.4;
            }
        }
      });
      
      // Initially place them at 0,0,-15 but spread out!
      model.scale.set(1, 1, 1);
      scene.add(model);
      loadedMeshes[comp] = model;
      resolve();
    });
  });
})).then(() => {
    document.getElementById('loading').style.display = 'none';
    initCinematic();
});

function initCinematic() {
  // Disassembled start positions
  gsap.set(loadedMeshes['helmet'].position, { y: 2, z: -15 });
  gsap.set(loadedMeshes['torso'].position, { y: 0, z: -15 });
  gsap.set(loadedMeshes['arms'].position, { x: -2, y: 1, z: -15 });
  gsap.set(loadedMeshes['gauntlets'].position, { x: 2, y: 1, z: -15 });
  gsap.set(loadedMeshes['legs'].position, { x: -1.5, y: -1, z: -15 });
  gsap.set(loadedMeshes['boots'].position, { x: 1.5, y: -2, z: -15 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: 1 
    }
  });

  // Start with camera zooming in slightly
  tl.to(camera.position, { z: -10, duration: 0.2 }, 0);
  
  // Assemble
  // 1) BOOTS
  tl.to(loadedMeshes['boots'].position, { x: 0, y: 0, z: -15, duration: 0.1 }, 0.2);
  // 2) LEGS
  tl.to(loadedMeshes['legs'].position, { x: 0, y: 0, z: -15, duration: 0.1 }, 0.3);
  // 3) TORSO
  tl.to(loadedMeshes['torso'].position, { x: 0, y: 0, z: -15, duration: 0.1 }, 0.4);
  // 4) ARMS
  tl.to(loadedMeshes['arms'].position, { x: 0, y: 0, z: -15, duration: 0.1 }, 0.5);
  // 5) GAUNTLETS
  tl.to(loadedMeshes['gauntlets'].position, { x: 0, y: 0, z: -15, duration: 0.1 }, 0.6);
  // 6) HELMET
  tl.to(loadedMeshes['helmet'].position, { x: 0, y: 0, z: -15, duration: 0.1 }, 0.7);

  // Final zoom
  tl.to(camera.position, { z: -13, y: 1, duration: 0.2 }, 0.8);
  tl.to("#enter-vault", { opacity: 1, pointerEvents: "auto", duration: 0.1 }, 0.9);
}

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render Loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
