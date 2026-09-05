import * as THREE from 'three';

/**
 * src/lib/three/materializeShader.ts
 * Shared dissolve/appear GLSL material for transitions.
 * 
 * Used for: door transitions, entity coalescing, sticky note appearing,
 * resume "printing", any object appearing or dissolving.
 * 
 * uProgress: 0.0 = fully invisible (discarded), 1.0 = fully materialized
 * uEdgeColor: the glowing edge color during transition (default cyan)
 * uEdgeWidth: how wide the glow band is around the dissolve front
 */

const materializeVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const materializeFragmentShader = /* glsl */ `
  uniform float uProgress;
  uniform vec3 uEdgeColor;
  uniform float uEdgeWidth;
  uniform vec3 uBaseColor;
  uniform float uNoiseScale;
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  // Simple 3D hash noise for dissolve pattern
  float hash(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep

    float n000 = hash(i);
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);

    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);

    return mix(nxy0, nxy1, f.z);
  }

  void main() {
    // Generate a noise value based on world position for organic dissolve
    float n = noise3D(vWorldPosition * uNoiseScale + vec3(0.0, 0.0, uTime * 0.1));

    // The dissolve threshold — pixels with noise below this are discarded
    float threshold = 1.0 - uProgress;

    if (n < threshold) {
      discard;
    }

    // Glow at the dissolve edge
    float edgeDist = n - threshold;
    float edgeGlow = 1.0 - smoothstep(0.0, uEdgeWidth, edgeDist);

    vec3 color = mix(uBaseColor, uEdgeColor, edgeGlow * edgeGlow);
    float alpha = 1.0;

    // Add emissive bloom to the edge
    float emissive = edgeGlow * 2.0;

    gl_FragColor = vec4(color + uEdgeColor * emissive * edgeGlow, alpha);
  }
`;

export interface MaterializeOptions {
  edgeColor?: THREE.Color;
  edgeWidth?: number;
  baseColor?: THREE.Color;
  noiseScale?: number;
}

/**
 * Creates a MaterializeMaterial with controllable progress.
 * Set material.uniforms.uProgress.value between 0–1 to animate.
 */
export function createMaterializeMaterial(
  options: MaterializeOptions = {}
): THREE.ShaderMaterial {
  const {
    edgeColor = new THREE.Color(0x4ce0ff),  // cyan
    edgeWidth = 0.08,
    baseColor = new THREE.Color(0x1a1714),  // gunmetal
    noiseScale = 3.5,
  } = options;

  return new THREE.ShaderMaterial({
    vertexShader: materializeVertexShader,
    fragmentShader: materializeFragmentShader,
    uniforms: {
      uProgress: { value: 0.0 },
      uEdgeColor: { value: edgeColor },
      uEdgeWidth: { value: edgeWidth },
      uBaseColor: { value: baseColor },
      uNoiseScale: { value: noiseScale },
      uTime: { value: 0.0 },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
}

/**
 * Helper hook-compatible updater: call in useFrame to advance uTime.
 */
export function updateMaterializeTime(
  material: THREE.ShaderMaterial,
  elapsedTime: number
): void {
  if (material.uniforms.uTime) {
    material.uniforms.uTime.value = elapsedTime;
  }
}
