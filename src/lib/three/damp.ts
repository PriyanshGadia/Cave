import * as THREE from 'three';

/**
 * src/lib/three/damp.ts
 * The ONLY motion primitive for all animated values in the 3D scene.
 * Uses THREE.MathUtils.damp for frame-rate-independent exponential decay.
 * Never use a raw lerp(current, target, 0.05) — that is frame-rate dependent.
 */

/** Damp a scalar toward a target. Returns the new value. */
export function dampScalar(
  current: number,
  target: number,
  lambda: number,
  dt: number
): number {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

/** Damp a Vec3 toward a target in-place. Returns the same vector. */
export function dampVec3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  dt: number
): THREE.Vector3 {
  current.x = THREE.MathUtils.damp(current.x, target.x, lambda, dt);
  current.y = THREE.MathUtils.damp(current.y, target.y, lambda, dt);
  current.z = THREE.MathUtils.damp(current.z, target.z, lambda, dt);
  return current;
}

/** Damp a Quaternion toward a target using slerp with exponential decay. */
export function dampQuat(
  current: THREE.Quaternion,
  target: THREE.Quaternion,
  lambda: number,
  dt: number
): THREE.Quaternion {
  // Compute the decay factor (same formula MathUtils.damp uses internally)
  const t = 1 - Math.exp(-lambda * dt);
  current.slerp(target, t);
  return current;
}

/** Damp a single Euler axis value (convenience for yaw/pitch clamped look). */
export function dampAngle(
  current: number,
  target: number,
  lambda: number,
  dt: number
): number {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}
