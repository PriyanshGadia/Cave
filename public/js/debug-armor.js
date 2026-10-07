import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function startArmorDebug() {
  console.log("STARTING STRICT ARMOR DEBUG MODE");
  
  // 2. DESTROY CINEMATIC STATE
  const introLayer = document.getElementById('intro-layer');
  if (introLayer) introLayer.style.display = 'none';
  const debugInfo = document.getElementById('debug-info');
  if (debugInfo) debugInfo.style.display = 'none';
  const repulsorBtn = document.getElementById('repulsor-btn');
  if (repulsorBtn) repulsorBtn.style.display = 'none';
  
  // 3. FORCE VISIBLE CANVAS
  const canvas = document.querySelector('#webgl-canvas');
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.display = "block";
  canvas.style.zIndex = "1";
  
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x303030, 1);
  
  console.log('CANVAS:');
  console.log(`clientWidth = ${canvas.clientWidth}`);
  console.log(`clientHeight = ${canvas.clientHeight}`);
  console.log(`width = ${canvas.width}`);
  console.log(`height = ${canvas.height}`);
  
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);
  
  const TEST_LIGHT = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
  scene.add(TEST_LIGHT);
  
  // 9. USE ORTHOGRAPHIC CAMERA FOR THE FIRST ARMOR TEST
  const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.01, 100);
  camera.position.set(0, 1.2, 8);
  camera.lookAt(0, 1.2, 0);
  
  // 4. RENDER THE DEBUG OBJECTS FIRST
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), new THREE.MeshBasicMaterial({color: 0xff0000}));
  scene.add(marker);
  
  const axes = new THREE.AxesHelper(2.0);
  scene.add(axes);
  
  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.40, 0.40), new THREE.MeshBasicMaterial({color: 0x00ff00}));
  scene.add(cube);
  
  renderer.render(scene, camera);
  
  // 5. LOAD THE SIX GLBS
  const ARMOR_ROOT = new THREE.Group();
  ARMOR_ROOT.name = "ARMOR_ROOT";
  scene.add(ARMOR_ROOT);
  
  const partsToLoad = ['helmet', 'torso', 'arms', 'gauntlets', 'legs', 'boots'];
  const armorParts = {};
  let loadedCount = 0;
  let totalMeshesLoaded = 0;
  
  const loader = new GLTFLoader();
  
  partsToLoad.forEach(partName => {
    loader.load(
      `/assets/armor/vault-mk1/final/${partName}.glb`,
      (gltf) => {
        const p = gltf.scene;
        armorParts[partName] = p;
        
        // Remove all original transforms immediately after load
        p.position.set(0,0,0);
        p.rotation.set(0,0,0);
        p.scale.setScalar(1);
        
        p.traverse(c => {
          if (c.isMesh) {
            totalMeshesLoaded++;
            // 8. REPLACE ALL ARMOR MATERIALS
            c.material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
          }
        });
        
        ARMOR_ROOT.add(p);
        loadedCount++;
        
        if (loadedCount === 6) {
          onAllLoaded();
        }
      },
      undefined,
      (err) => console.error("Error loading", partName, err)
    );
  });
  
  function onAllLoaded() {
    ARMOR_ROOT.updateMatrixWorld(true);
    
    const box = new THREE.Box3().setFromObject(ARMOR_ROOT);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    
    console.log('CENTER', center.x, center.y, center.z);
    console.log('SIZE', size.x, size.y, size.z);
    console.log('MIN', box.min.x, box.min.y, box.min.z);
    console.log('MAX', box.max.x, box.max.y, box.max.z);
    
    // 6. DO NOT TRUST EXISTING NORMALIZATION YET
    const targetHeight = 3.0;
    const scale = 3.0 / size.y;
    ARMOR_ROOT.scale.setScalar(scale);
    ARMOR_ROOT.updateMatrixWorld(true);
    
    // 7. CENTER USING ACTUAL WORLD BOUNDS
    const scaledBounds = new THREE.Box3().setFromObject(ARMOR_ROOT);
    const scaledCenter = new THREE.Vector3();
    scaledBounds.getCenter(scaledCenter);
    
    ARMOR_ROOT.position.sub(scaledCenter);
    ARMOR_ROOT.updateMatrixWorld(true);
    
    const finalBounds = new THREE.Box3().setFromObject(ARMOR_ROOT);
    const finalCenter = new THREE.Vector3();
    const finalSize = new THREE.Vector3();
    finalBounds.getCenter(finalCenter);
    finalBounds.getSize(finalSize);
    
    console.log('PRINT FINAL:');
    console.log('CENTER', finalCenter.x, finalCenter.y, finalCenter.z);
    console.log('SIZE', finalSize.x, finalSize.y, finalSize.z);
    
    // 10. FORCE AN ARMOR RENDER
    renderer.render(scene, camera);
    
    // 11. WAIT FOR TWO REAL FRAMES
    requestAnimationFrame(() => {
      renderer.render(scene, camera);
      requestAnimationFrame(() => {
        renderer.render(scene, camera);
        setTimeout(() => {
          // 13. REQUIRED CONSOLE TELEMETRY
          console.log('[ARMOR DEBUG READY]');
          console.log(`canvas:\nwidth=${canvas.width}\nheight=${canvas.height}`);
          console.log('renderer:\nexists=true');
          console.log(`scene:\nchildren=${scene.children.length}`);
          console.log('armorRoot:\nexists=true');
          console.log(`meshes:\n${totalMeshesLoaded}`);
          console.log(`bounds:\ncenter=${finalCenter.x},${finalCenter.y},${finalCenter.z}\nsize=${finalSize.x},${finalSize.y},${finalSize.z}`);
          console.log(`camera:\nposition=${camera.position.x},${camera.position.y},${camera.position.z}\nnear=${camera.near}\nfar=${camera.far}`);
          console.log('markers:\nred=true\ngreen=true\naxes=true');
          
          window.__ARMOR_DEBUG_READY = true;
        }, 250);
      });
    });
  }
}
