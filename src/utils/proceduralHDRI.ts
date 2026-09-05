import * as THREE from 'three';

/**
 * Generates a high-fidelity procedural Environment CubeMap for PBR metallic reflections.
 * Simulates subterranean cavern lighting with warm amber key firelight on the left
 * and cool cyan electronic bounce on the center/right.
 */
export function createProceduralCavernEnvMap(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080c);

  // Warm Amber Fire Light Sphere (Upper Left)
  const warmLightGeo = new THREE.SphereGeometry(4, 16, 16);
  const warmLightMat = new THREE.MeshBasicMaterial({ color: 0xff8c30 });
  const warmMesh = new THREE.Mesh(warmLightGeo, warmLightMat);
  warmMesh.position.set(-15, 12, 10);
  scene.add(warmMesh);

  // Cool Cyan Electronic Core Light Sphere (Center/Right)
  const coolLightGeo = new THREE.SphereGeometry(3, 16, 16);
  const coolLightMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
  const coolMesh = new THREE.Mesh(coolLightGeo, coolLightMat);
  coolMesh.position.set(0, 0, -8);
  scene.add(coolMesh);

  // Deep Navy Cavern Ambient Dome
  const ambientGeo = new THREE.SphereGeometry(30, 16, 16);
  const ambientMat = new THREE.MeshBasicMaterial({
    color: 0x0a111a,
    side: THREE.BackSide,
  });
  const ambientMesh = new THREE.Mesh(ambientGeo, ambientMat);
  scene.add(ambientMesh);

  const cubeCamera = new THREE.CubeCamera(0.1, 100, new THREE.WebGLCubeRenderTarget(512, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  }));

  cubeCamera.update(renderer, scene);
  return cubeCamera.renderTarget;
}
