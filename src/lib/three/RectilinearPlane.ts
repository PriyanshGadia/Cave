import * as THREE from 'three';

/**
 * src/lib/three/RectilinearPlane.ts
 * 
 * Frustum math utility to calculate exact rectilinear plane dimensions at any Z-depth.
 * Guaranteed to perfectly span the perspective camera frustum with zero distortion.
 */

export function getFrustumSize(camera: THREE.PerspectiveCamera, distance: number) {
  const vFov = (camera.fov * Math.PI) / 180;
  const height = 2 * Math.tan(vFov / 2) * distance;
  const width = height * camera.aspect;
  return { width, height };
}
