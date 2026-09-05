/**
 * src/lib/three/proceduralRockCavern.ts
 * 
 * Film-Grade Subterranean Rock Cavern Generator
 * - Broad stratified basalt crags with sweeping geological strata
 * - Wet crevice specular response and dark obsidian subterranean tones
 * - Enclosing 360° parametric tunnel enclosing 100% of the viewport
 */

import * as THREE from "three";
import { createNoise3D } from "simplex-noise";

/**
 * Loads rock textures with stratified Triplanar PBR, broad geological scale,
 * and dark subterranean chiaroscuro grading.
 */
export function loadRockMaterial(): THREE.MeshStandardMaterial {
  const texLoader = new THREE.TextureLoader();

  const diffuseMap = texLoader.load("/textures/rock-sedimentary-albedo.webp");
  const normalMap = texLoader.load("/textures/rock-sedimentary-normal.webp");
  const roughnessMap = texLoader.load("/textures/rock-sedimentary-roughness.webp");

  diffuseMap.wrapS = THREE.RepeatWrapping;
  diffuseMap.wrapT = THREE.RepeatWrapping;
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0C0907"),
    roughness: 0.85,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  // World-Space Triplanar PBR with Broad Geological Stratification
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.tDiffuse = { value: diffuseMap };
    shader.uniforms.tNormal = { value: normalMap };
    shader.uniforms.tRoughness = { value: roughnessMap };
    shader.uniforms.uTriScale = { value: 0.35 }; // Broad macro rock strata (not micro noise)

    shader.vertexShader = `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      ${shader.vertexShader}
    `.replace(
      `#include <worldpos_vertex>`,
      `
      #include <worldpos_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      `
    );

    shader.fragmentShader = `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      uniform sampler2D tDiffuse;
      uniform sampler2D tNormal;
      uniform sampler2D tRoughness;
      uniform float uTriScale;
      ${shader.fragmentShader}
    `.replace(
      `#include <map_fragment>`,
      `
      // World-Space Triplanar Mapping
      vec3 blending = abs(vWorldNormal);
      blending = normalize(max(blending, 0.00001));
      blending = pow(blending, vec3(6.0));
      blending /= (blending.x + blending.y + blending.z);

      vec4 xaxis = texture2D(tDiffuse, vWorldPos.zy * uTriScale);
      vec4 yaxis = texture2D(tDiffuse, vWorldPos.xz * uTriScale);
      vec4 zaxis = texture2D(tDiffuse, vWorldPos.xy * uTriScale);
      vec4 triSample = xaxis * blending.x + yaxis * blending.y + zaxis * blending.z;

      // Geological Color Palette: Deep Basalt (#0A0705), Wet Shale (#140E0A), Amber Silt (#2C1B10)
      vec3 deepBasalt = vec3(0.045, 0.032, 0.024);
      vec3 wetShale = vec3(0.082, 0.060, 0.046);
      vec3 amberSilt = vec3(0.145, 0.095, 0.065);

      float heightGrad = clamp((vWorldPos.y - 0.2) / 3.0, 0.0, 1.0);
      float strataNoise = sin(vWorldPos.y * 6.0 + vWorldPos.x * 1.5) * 0.5 + 0.5;

      vec3 rockColor = mix(deepBasalt, wetShale, triSample.r * 1.2);
      rockColor = mix(rockColor, amberSilt, strataNoise * 0.35 * (1.0 - heightGrad * 0.4));

      // Floor darkening towards dark subterranean bedrock
      if (vWorldPos.y < 0.6) {
        rockColor *= mix(0.45, 0.85, clamp((vWorldPos.y - 0.1) / 0.5, 0.0, 1.0));
      }

      diffuseColor = vec4(rockColor, 1.0);
      `
    ).replace(
      `#include <normal_fragment_maps>`,
      `
      // Subtle geological normal relief (0.85x perturbation instead of 4.0x)
      vec3 tNormX = texture2D(tNormal, vWorldPos.zy * uTriScale).xyz * 2.0 - 1.0;
      vec3 tNormY = texture2D(tNormal, vWorldPos.xz * uTriScale).xyz * 2.0 - 1.0;
      vec3 tNormZ = texture2D(tNormal, vWorldPos.xy * uTriScale).xyz * 2.0 - 1.0;

      vec3 wNormX = vec3(0.0, tNormX.y, tNormX.x);
      vec3 wNormY = vec3(tNormY.x, 0.0, tNormY.y);
      vec3 wNormZ = vec3(tNormZ.x, tNormZ.y, 0.0);

      vec3 blendedWorldNormal = normalize(
        vWorldNormal + (wNormX * blending.x + wNormY * blending.y + wNormZ * blending.z) * 0.85
      );

      normal = normalize((viewMatrix * vec4(blendedWorldNormal, 0.0)).xyz);
      `
    ).replace(
      `#include <roughnessmap_fragment>`,
      `
      vec4 rX = texture2D(tRoughness, vWorldPos.zy * uTriScale);
      vec4 rY = texture2D(tRoughness, vWorldPos.xz * uTriScale);
      vec4 rZ = texture2D(tRoughness, vWorldPos.xy * uTriScale);
      float triRoughness = rX.r * blending.x + rY.r * blending.y + rZ.r * blending.z;
      float roughnessFactor = clamp(triRoughness * 1.1, 0.65, 0.92);
      `
    );
  };

  return mat;
}

/**
 * Constructs an enclosing 360° parametric cylinder tunnel (180 x 180 subdivisions):
 * - Broad sweeping rock fractures with natural geological arches
 * - Stepped basalt bedrock floor
 */
export function createCaveTunnelGeometry(): THREE.BufferGeometry {
  const noise = createNoise3D(() => 0.1337);

  const radialSegments = 180;
  const heightSegments = 180;
  const length = 9.2; // Spans Z from -0.4m to +8.8m

  // Contiguous 360° parametric cylinder
  const geom = new THREE.CylinderGeometry(
    1.0,
    1.0,
    length,
    radialSegments,
    heightSegments,
    true
  );

  // Invert cylinder normals to face INWARD toward corridor
  geom.scale(-1, 1, 1);

  // Align length along Z axis spanning Z in [-0.4m, +8.8m]
  geom.rotateX(Math.PI / 2);
  geom.translate(0, 0, length / 2 - 0.4);

  const pos = geom.attributes.position;
  const v = new THREE.Vector3();

  const centerX = 0.0;
  const centerY = 1.30;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    let pz = v.z;
    const theta = Math.atan2(v.y, v.x);
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);

    // Natural arched tunnel profile:
    // Door (Z=0): rx=1.40m, ry=1.65m
    // Mid/Entry (Z=6m): rx=2.10m, ry=2.20m
    const zPos = Math.max(0.0, pz);
    const zT = Math.min(1.0, zPos / 6.5);
    const rx = THREE.MathUtils.lerp(1.40, 2.10, zT);
    const ry = THREE.MathUtils.lerp(1.65, 2.20, zT);

    const baseR = Math.sqrt(
      1.0 / (Math.pow(ux, 2) / Math.pow(rx, 2) + Math.pow(uy, 2) / Math.pow(ry, 2))
    );

    let px = centerX + ux * baseR;
    let py = centerY + uy * baseR;

    // Geological Noise: broad stratified shelves (y*0.35, x*0.6, z*0.4)
    const val = 1.0 - Math.abs(noise(px * 0.60, py * 0.35, pz * 0.40));
    const secondaryRock = noise(px * 1.2, py * 0.8, pz * 0.9) * 0.12;

    // Floor flattening for bedrock walking surface
    if (uy < -0.45) {
      const floorBlend = clamp01((-0.45 - uy) / 0.55);
      py = THREE.MathUtils.lerp(py, 0.25 + secondaryRock * 0.3, floorBlend);
    } else {
      // Natural rock displacement along normal
      const disp = (val * 0.35 + secondaryRock) * 0.8;
      px += ux * disp;
      py += uy * disp;
    }

    pos.setXYZ(i, px, py, pz);
  }

  geom.computeVertexNormals();
  return geom;
}

function clamp01(v: number) {
  return Math.max(0.0, Math.min(1.0, v));
}
