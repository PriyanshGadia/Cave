import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a2a); // dark gray

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, 10);
camera.position.set(0, 0, 0.1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Neutral Clay Lighting
scene.add(new THREE.AmbientLight(0xffffff, 1.2));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
keyLight.position.set(5, 5, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
fillLight.position.set(-5, 0, 5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
rimLight.position.set(0, -5, -5);
scene.add(rimLight);

let currentModel = null;
let isWireframe = false;

const loader = new GLTFLoader();

function calculateStats(model) {
  let meshes = 0;
  let vertices = 0;
  let triangles = 0;
  let materials = new Set();
  
  model.traverse((child) => {
    if (child.isMesh) {
      meshes++;
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
        mats.forEach(m => materials.add(m.uuid));
      }
    }
  });
  
  return { meshes, vertices, triangles, materials: materials.size };
}

function frameCamera(direction) {
  if (!currentModel) return;
  const box = new THREE.Box3().setFromObject(currentModel);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  
  controls.target.copy(center);
  const dist = maxDim * 1.8;
  
  switch(direction) {
    case 'front': camera.position.set(center.x, center.y, center.z + dist); break;
    case 'rear': camera.position.set(center.x, center.y, center.z - dist); break;
    case 'side': camera.position.set(center.x + dist, center.y, center.z); break;
    case 'top': camera.position.set(center.x, center.y + dist, center.z); break;
    case 'bottom': camera.position.set(center.x, center.y - dist, center.z); break;
    case '3q': camera.position.set(center.x + dist*0.7, center.y + dist*0.5, center.z + dist*0.7); break;
    case 'macro_ankle': 
      camera.position.set(center.x + size.x*0.5, center.y + size.y*0.3, center.z + size.z*0.5); 
      controls.target.set(center.x, center.y + size.y*0.4, center.z);
      break;
    case 'macro_thruster': 
      camera.position.set(center.x + size.x*0.5, center.y - size.y*0.4, center.z - size.z*0.5); 
      controls.target.set(center.x, center.y - size.y*0.4, center.z);
      break;
    case 'macro_sole':
      camera.position.set(center.x, center.y - dist*0.6, center.z);
      controls.target.set(center.x, center.y - size.y*0.5, center.z);
      break;
  }
  camera.updateProjectionMatrix();
}

function loadMk1Component(name) {
  if (currentModel) {
    scene.remove(currentModel);
  }
  
  // Notice we use the work directory and pass_03 for boots
  const path = name === 'boots' 
    ? `/assets/armor/vault-mk1/work/boots/pass_03/boots_mk1_pass03.glb`
    : `/assets/armor/vault-mk1/work/${name}/${name}_mk1.glb`;
    
  loader.load(path, (gltf) => {
    currentModel = gltf.scene;
    
    // Force all materials in Three.js to clay (to ensure no weird imported colors)
    currentModel.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0x808080, // Neutral gray
          roughness: 0.6,
          metalness: 0.0
        });
      }
    });

    scene.add(currentModel);
    
    // Update materials for wireframe if needed
    if (isWireframe) {
      currentModel.traverse(child => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => m.wireframe = true);
        }
      });
    }
    
    const box = new THREE.Box3().setFromObject(currentModel);
    const size = box.getSize(new THREE.Vector3());
    const stats = calculateStats(currentModel);
    
    document.getElementById('stats-content').innerHTML = `
      <strong>VAULT MK-I: ${name.toUpperCase()}</strong><br><br>
      Meshes: ${stats.meshes}<br>
      Vertices: ${stats.vertices}<br>
      Triangles: ${stats.triangles}<br>
      Materials: ${stats.materials}<br>
      <br>
      Width: ${size.x.toFixed(3)}<br>
      Height: ${size.y.toFixed(3)}<br>
      Depth: ${size.z.toFixed(3)}
    `;
    
    frameCamera('3q');
  });
}

document.getElementById('btn-boots').addEventListener('click', () => loadMk1Component('boots'));
// Add a button dynamically for the donor if we want, or just load it via console.
window.loadDonor = () => {
    loader.load(`/assets/armor/vault-mk1/source/boots.glb`, (gltf) => {
        if (currentModel) scene.remove(currentModel);
        currentModel = gltf.scene;
        scene.add(currentModel);
        frameCamera('3q');
    });
};

['front', 'rear', 'side', 'top', 'bottom', '3q'].forEach(dir => {
  document.getElementById(`btn-${dir}`).addEventListener('click', () => frameCamera(dir));
});

// We can expose these to global window so our screenshot script can trigger them
window.frameCamera = frameCamera;

const btnWire = document.getElementById('btn-wireframe');
btnWire.addEventListener('click', () => {
  isWireframe = !isWireframe;
  btnWire.textContent = `TOGGLE WIREFRAME (${isWireframe ? 'ON' : 'OFF'})`;
  if (currentModel) {
    currentModel.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => m.wireframe = isWireframe);
      }
    });
  }
});

// Start with boots
loadMk1Component('boots');

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
