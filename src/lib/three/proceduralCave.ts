import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

/**
 * STEP 1: Creates procedural cave tunnel geometry
 * 100% generated in TypeScript - no external 3D models.
 * Cylinder open-ended along -Z with low-frequency 3D simplex noise displacement.
 */
export function createCaveTunnelGeometry(): THREE.BufferGeometry {
  // 1. Build open-ended cylinder
  // radiusTop ~ 2.0 (far end), radiusBottom ~ 3.0 (near entrance), height ~ 14
  const radiusTop = 2.2;
  const radiusBottom = 3.2;
  const height = 14;
  const radialSegments = 32;
  const heightSegments = 24;

  const geometry = new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    radialSegments,
    heightSegments,
    true
  );

  // 2. Rotate so its axis runs along -Z (the direction the camera looks/walks)
  // Cylinder default is along Y axis, rotate around X by PI/2
  geometry.rotateX(Math.PI / 2);

  // Translate so the tunnel encompasses Z = 7 down to Z = -7, centered around y = 1.4
  geometry.translate(0, 1.4, 0);

  // 3. Apply 3D simplex noise displacement along vertex radial normals
  const noise3D = createNoise3D();
  const posAttr = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i++) {
    vertex.fromBufferAttribute(posAttr, i);

    // Radial vector in XY plane from cylinder center (0, 1.4)
    normal.set(vertex.x, vertex.y - 1.4, 0).normalize();

    // Low-frequency noise for natural rough rock features (not high-frequency static)
    const n = noise3D(vertex.x * 0.35, vertex.y * 0.35, vertex.z * 0.2);
    const displacement = n * 0.42;

    // Displace outward/inward along radial normal
    vertex.addScaledVector(normal, displacement);

    // Save modified position
    posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  // 4. Recompute vertex normals for correct PBR light response
  geometry.computeVertexNormals();

  return geometry;
}
