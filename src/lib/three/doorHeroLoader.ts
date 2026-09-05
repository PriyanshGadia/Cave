// src/lib/three/doorHeroLoader.ts
//
// THIS IS THE LOADER FOR THE INTERACTIVE HERO DOOR.
// It loads real modeled GLB geometry. It must NEVER call buildDepthMesh —
// that function is for environment/background only.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export async function loadDoorHeroMesh(
  modelUrl: string = '/models/door-hero.glb'
): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  loader.setDRACOLoader(dracoLoader);

  return new Promise((resolve, reject) => {
    loader.load(
      modelUrl,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        resolve(root);
      },
      undefined,
      (error) => {
        reject(error);
      }
    );
  });
}
