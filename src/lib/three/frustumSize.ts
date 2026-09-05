import * as THREE from 'three';

/**
 * src/lib/three/frustumSize.ts
 * Computes exact visible frustum width and height at a given depth from camera.
 * Enforces Rule 19: Peripheral backdrop geometry is sized from camera frustum math,
 * never a hardcoded radius/dimension chosen by eye.
 */
export function getVisibleSizeAtDepth(
  camera: THREE.PerspectiveCamera,
  depthFromCamera: number
): { width: number; height: number } {
  const vFov = (camera.fov * Math.PI) / 180;
  const height = 2 * Math.tan(vFov / 2) * Math.abs(depthFromCamera);
  const width = height * camera.aspect;
  return { width, height };
}
