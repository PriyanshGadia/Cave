import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x888888); // Light neutral gray

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 0, 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- Lighting ---
// Ambient
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
// Key Light
const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(5, 5, 5);
scene.add(keyLight);
// Fill Light
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-5, 0, 5);
scene.add(fillLight);
// Rim Light
const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
rimLight.position.set(0, 5, -5);
scene.add(rimLight);

// --- State ---
const components = ['helmet', 'arms', 'torso', 'gauntlets', 'legs', 'boots'];
const loadedModels = {};
let currentMode = null;
let isWireframe = false;

const loader = new GLTFLoader();

// Load all components
Promise.all(components.map(comp => {
  return new Promise(resolve => {
    loader.load(`/assets/armor/vault-mk1/source/${comp}.glb`, (gltf) => {
      const model = gltf.scene;
      
      // Store original positions from Blender (they are pre-transformed to (0,0,0) with correct offsets)
      model.userData.originalPosition = model.position.clone();
      
      // Compute bounding box for centering
      const box = new THREE.Box3().setFromObject(model);
      model.userData.box = box;
      model.userData.center = box.getCenter(new THREE.Vector3());
      
      // Compute statistics
      let meshes = 0;
      let skinned = 0;
      let vertices = 0;
      let triangles = 0;
      let materials = new Set();
      let textures = new Set();
      
      model.traverse((child) => {
        if (child.isMesh) {
          meshes++;
          if (child.isSkinnedMesh) skinned++;
          
          if (child.geometry) {
            vertices += child.geometry.attributes.position.count;
            if (child.geometry.index) {
              triangles += child.geometry.index.count / 3;
            } else {
              triangles += child.geometry.attributes.position.count / 3;
            }
          }
          
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(m => {
              materials.add(m.name || m.uuid);
              if (m.map) textures.add(m.map.uuid);
              if (m.normalMap) textures.add(m.normalMap.uuid);
              if (m.roughnessMap) textures.add(m.roughnessMap.uuid);
              if (m.metalnessMap) textures.add(m.metalnessMap.uuid);
            });
          }
        }
      });
      
      model.userData.stats = {
        meshes, skinned, vertices, triangles,
        materials: materials.size, textures: textures.size,
        width: box.max.x - box.min.x,
        height: box.max.y - box.min.y,
        depth: box.max.z - box.min.z
      };
      
      model.visible = false;
      scene.add(model);
      loadedModels[comp] = model;
      resolve();
    });
  });
})).then(() => {
  document.getElementById('btn-helmet').click();
});

function updateMaterials() {
  components.forEach(comp => {
    if (!loadedModels[comp]) return;
    loadedModels[comp].traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {
          m.wireframe = isWireframe;
        });
      }
    });
  });
}

function frameObject(box) {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  
  // padding
  cameraZ *= 1.5;
  
  camera.position.set(center.x, center.y, center.z + cameraZ);
  controls.target.copy(center);
  camera.updateProjectionMatrix();
}

function showComponent(compName) {
  currentMode = compName;
  updateButtons();
  
  components.forEach(c => loadedModels[c].visible = false);
  
  const model = loadedModels[compName];
  model.visible = true;
  model.position.set(0, 0, 0); // Reset position (assembled state)
  
  // Center and frame
  const box = new THREE.Box3().setFromObject(model);
  frameObject(box);
  
  const s = model.userData.stats;
  document.getElementById('stats-content').innerHTML = `
    <strong>COMPONENT: ${compName.toUpperCase()}</strong><br><br>
    Meshes: ${s.meshes}<br>
    Skinned meshes: ${s.skinned}<br>
    Vertices: ${s.vertices}<br>
    Triangles: ${s.triangles}<br>
    Materials: ${s.materials}<br>
    Textures: ${s.textures}<br>
    <br>
    <strong>Bounding Box:</strong><br>
    Width: ${s.width.toFixed(3)}<br>
    Height: ${s.height.toFixed(3)}<br>
    Depth: ${s.depth.toFixed(3)}
  `;
}

function showFullAssembly() {
  currentMode = 'assembly';
  updateButtons();
  
  components.forEach(c => {
    const model = loadedModels[c];
    model.visible = true;
    model.position.set(0, 0, 0); // Origin assembled
  });
  
  // Frame entire assembly
  const box = new THREE.Box3();
  components.forEach(c => box.expandByObject(loadedModels[c]));
  frameObject(box);
  
  document.getElementById('stats-content').innerHTML = `<strong>FULL ASSEMBLY</strong>`;
}

function showExploded() {
  currentMode = 'exploded';
  updateButtons();
  
  components.forEach(c => {
    const model = loadedModels[c];
    model.visible = true;
  });
  
  loadedModels['helmet'].position.set(0, 0.015, 0);
  loadedModels['arms'].position.set(0, 0, 0.015); 
  loadedModels['torso'].position.set(0, 0, 0);
  loadedModels['gauntlets'].position.set(0, -0.01, 0.02);
  loadedModels['legs'].position.set(0, -0.015, 0);
  loadedModels['boots'].position.set(0, -0.03, 0);
  
  const box = new THREE.Box3();
  components.forEach(c => box.expandByObject(loadedModels[c]));
  frameObject(box);
  
  document.getElementById('stats-content').innerHTML = `<strong>EXPLODED VIEW</strong>`;
}

function updateButtons() {
  document.querySelectorAll('#ui button').forEach(b => b.classList.remove('active'));
  if (components.includes(currentMode)) document.getElementById(`btn-${currentMode}`).classList.add('active');
  if (currentMode === 'assembly') document.getElementById('btn-assembly').classList.add('active');
  if (currentMode === 'exploded') document.getElementById('btn-exploded').classList.add('active');
}

// UI Bindings
components.forEach(comp => {
  document.getElementById(`btn-${comp}`).addEventListener('click', () => showComponent(comp));
});
document.getElementById('btn-assembly').addEventListener('click', showFullAssembly);
document.getElementById('btn-exploded').addEventListener('click', showExploded);

const btnWire = document.getElementById('btn-wireframe');
btnWire.addEventListener('click', () => {
  isWireframe = !isWireframe;
  btnWire.textContent = `TOGGLE WIREFRAME (${isWireframe ? 'ON' : 'OFF'})`;
  updateMaterials();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
