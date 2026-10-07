import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Setup Scene, Camera, Renderer
const viewport = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333); // Neutral dark gray studio background

const camera = new THREE.PerspectiveCamera(45, viewport.clientWidth / viewport.clientHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Lighting Setup (Neutral Diagnostic)
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
keyLight.position.set(5, 5, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
fillLight.position.set(-5, 3, 5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
rimLight.position.set(0, 5, -5);
scene.add(rimLight);

let currentModel = null;
let originalMaterials = new Map(); // Store original materials for reverting
const loader = new GLTFLoader();

// Vault Test Materials
const vaultMaterials = {
  gunmetal: new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 }),
  bloodRed: new THREE.MeshStandardMaterial({ color: 0x880000, metalness: 0.8, roughness: 0.3 }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2 })
};

async function loadModel(url) {
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.remove('hidden');

  if (currentModel) {
    scene.remove(currentModel);
    // basic cleanup
    currentModel.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
      }
    });
    originalMaterials.clear();
  }

  try {
    const gltf = await loader.loadAsync(url);
    currentModel = gltf.scene;

    // Update matrix world before computing Bounding Box
    currentModel.updateMatrixWorld(true);

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(currentModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Move model so its center is at the origin
    currentModel.position.sub(center);
    currentModel.updateMatrixWorld(true);

    scene.add(currentModel);

    // Recompute box after centering
    const centeredBox = new THREE.Box3().setFromObject(currentModel);
    const radius = centeredBox.getSize(new THREE.Vector3()).length() * 0.5;

    // Frame the camera
    camera.position.set(0, 0, radius * 2.5);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    camera.near = radius * 0.01;
    camera.far = radius * 100;
    camera.updateProjectionMatrix();

    // Stats & Inventory
    let stats = {
      objects: 0,
      meshes: 0,
      skinnedMeshes: 0,
      bones: 0,
      materials: new Set(),
      textures: new Set(),
      triangles: 0
    };

    currentModel.traverse((child) => {
      stats.objects++;
      if (child.isMesh) {
        if (child.isSkinnedMesh) stats.skinnedMeshes++;
        else stats.meshes++;
        
        stats.triangles += child.geometry.index ? child.geometry.index.count / 3 : child.geometry.attributes.position.count / 3;
        
        const matArray = Array.isArray(child.material) ? child.material : [child.material];
        matArray.forEach(mat => {
          stats.materials.add(mat.uuid);
          // Save original material for toggles
          if (!originalMaterials.has(child.uuid)) {
            originalMaterials.set(child.uuid, child.material);
          }
        });
      }
      if (child.isBone) stats.bones++;
    });

    document.getElementById('stats-container').innerHTML = `
      <strong>Model:</strong> ${url.split('/').pop()}<br>
      <strong>Objects:</strong> ${stats.objects}<br>
      <strong>Meshes:</strong> ${stats.meshes} (Skinned: ${stats.skinnedMeshes})<br>
      <strong>Bones:</strong> ${stats.bones}<br>
      <strong>Materials:</strong> ${stats.materials.size}<br>
      <strong>Triangles:</strong> ${Math.floor(stats.triangles).toLocaleString()}<br>
      <strong>Dimensions:</strong> [${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}]<br>
      <strong>Radius:</strong> ${radius.toFixed(2)}
    `;

    buildHierarchyTree(currentModel);

  } catch (err) {
    console.error("Failed to load model", err);
    document.getElementById('stats-container').innerHTML = `<span style="color:red">Failed to load: ${err.message}</span>`;
  }

  overlay.classList.add('hidden');
}

// Tree building
function buildHierarchyTree(root) {
  const container = document.getElementById('hierarchy-tree');
  container.innerHTML = '';
  
  function createNode(object, depth) {
    const div = document.createElement('div');
    div.className = 'tree-node';
    div.style.paddingLeft = `${depth * 15}px`;
    const type = object.isSkinnedMesh ? '[Skinned]' : object.isMesh ? '[Mesh]' : object.isBone ? '[Bone]' : '[Group]';
    div.textContent = `${type} ${object.name || 'Unnamed'}`;
    
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('selected'));
      div.classList.add('selected');
      highlightObject(object);
    });

    container.appendChild(div);
    object.children.forEach(child => createNode(child, depth + 1));
  }
  
  createNode(root, 0);
}

// Selection Highlighter
let boxHelper = null;
function highlightObject(object) {
  if (boxHelper) {
    scene.remove(boxHelper);
    boxHelper.dispose();
  }
  if (object.isMesh || object.isGroup) {
    boxHelper = new THREE.BoxHelper(object, 0xffff00);
    scene.add(boxHelper);
  }
}

// UI Bindings
document.getElementById('donor-select').addEventListener('change', (e) => {
  loadModel(e.target.value);
});

// Camera Views
function setCameraView(x, y, z) {
  if (!currentModel) return;
  const box = new THREE.Box3().setFromObject(currentModel);
  const radius = box.getSize(new THREE.Vector3()).length() * 0.5;
  const dist = radius * 2.5;
  
  // Normalize direction vector and multiply by dist
  const v = new THREE.Vector3(x, y, z).normalize().multiplyScalar(dist);
  camera.position.copy(v);
  camera.lookAt(0, 0, 0);
  controls.target.set(0,0,0);
}

document.getElementById('cam-front').addEventListener('click', () => setCameraView(0, 0, 1));
document.getElementById('cam-back').addEventListener('click', () => setCameraView(0, 0, -1));
document.getElementById('cam-left').addEventListener('click', () => setCameraView(-1, 0, 0));
document.getElementById('cam-right').addEventListener('click', () => setCameraView(1, 0, 0));
document.getElementById('cam-34-front').addEventListener('click', () => setCameraView(1, 0.5, 1));
document.getElementById('cam-34-rear').addEventListener('click', () => setCameraView(-1, 0.5, -1));
document.getElementById('cam-top').addEventListener('click', () => setCameraView(0, 1, 0));
document.getElementById('cam-bottom').addEventListener('click', () => setCameraView(0, -1, 0));
document.getElementById('cam-fit').addEventListener('click', () => setCameraView(0, 0, 1)); // fit reset

// Materials
document.getElementById('mat-original').addEventListener('click', () => {
  if(!currentModel) return;
  currentModel.traverse((child) => {
    if (child.isMesh && originalMaterials.has(child.uuid)) {
      child.material = originalMaterials.get(child.uuid);
      child.material.wireframe = false;
    }
  });
});

document.getElementById('mat-vault').addEventListener('click', () => {
  if(!currentModel) return;
  currentModel.traverse((child) => {
    if (child.isMesh) {
      // Basic heuristic for vault colors
      if (child.name.toLowerCase().includes('glow') || child.name.toLowerCase().includes('eye')) {
        child.material = vaultMaterials.cyan;
      } else if (Math.random() > 0.8) {
        child.material = vaultMaterials.bloodRed;
      } else {
        child.material = vaultMaterials.gunmetal;
      }
      child.material.wireframe = false;
    }
  });
});

document.getElementById('mat-wireframe').addEventListener('click', () => {
  if(!currentModel) return;
  currentModel.traverse((child) => {
    if (child.isMesh) {
      child.material = originalMaterials.get(child.uuid).clone();
      child.material.wireframe = true;
    }
  });
});

// Animation Loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  if (boxHelper) boxHelper.update();
  renderer.render(scene, camera);
}

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = viewport.clientWidth / viewport.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
});

// Init
animate();
loadModel(document.getElementById('donor-select').value);
