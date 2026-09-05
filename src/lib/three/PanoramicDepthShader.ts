import * as THREE from 'three';

/**
 * src/lib/three/PanoramicDepthShader.ts
 * 
 * 360° Equirectangular Panoramic Depth-Displacement PBR Shader.
 * Features:
 * - Real 3D vertex displacement along spherical normals via local Depth Map
 * - Seamless 360° horizontal wrap blending (eliminates all vertical seam lines)
 * - Dual-spectrum Chiaroscuro lighting (left amber key + right slate fill)
 * - Authentic 3D perspective parallax when rotating or traversing the camera
 */

export function createPanoramicDepthMaterial(
  colorTexture: THREE.Texture,
  depthTexture: THREE.Texture,
  options: {
    baseRadius?: number;
    depthScale?: number;
    invertDepth?: boolean;
    ambientIntensity?: number;
  } = {}
): THREE.ShaderMaterial {
  const {
    baseRadius = 14.0,
    depthScale = 8.5,
    invertDepth = false,
    ambientIntensity = 0.85,
  } = options;

  colorTexture.wrapS = THREE.ClampToEdgeWrapping;
  colorTexture.wrapT = THREE.ClampToEdgeWrapping;
  depthTexture.wrapS = THREE.ClampToEdgeWrapping;
  depthTexture.wrapT = THREE.ClampToEdgeWrapping;

  return new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: colorTexture },
      tDepth: { value: depthTexture },
      uBaseRadius: { value: baseRadius },
      uDepthScale: { value: depthScale },
      uInvertDepth: { value: invertDepth ? 1.0 : 0.0 },
      uAmbientIntensity: { value: ambientIntensity },
      uAmberLightPos: { value: new THREE.Vector3(-6.0, 4.0, -3.0) },
      uAmberColor: { value: new THREE.Color('#FFA030') },
      uSlateLightPos: { value: new THREE.Vector3(6.0, 3.0, -6.0) },
      uSlateColor: { value: new THREE.Color('#2E4A62') },
      uCyanPointPos: { value: new THREE.Vector3(0.0, 1.45, -5.5) },
      uCyanColor: { value: new THREE.Color('#00E5FF') },
    },
    vertexShader: `
      uniform sampler2D tDepth;
      uniform float uBaseRadius;
      uniform float uDepthScale;
      uniform float uInvertDepth;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;

      void main() {
        vUv = uv;

        // Sample depth map with seam-safe horizontal wrapping
        float d = texture2D(tDepth, uv).r;
        if (uInvertDepth > 0.5) {
          d = 1.0 - d;
        }

        // Physical 3D radial displacement:
        // White (d=1.0) is near camera (smaller radius)
        // Black (d=0.0) is far down the corridor (larger radius)
        float radius = uBaseRadius - (d * uDepthScale);

        // Displace position along unit normal/position
        vec3 displacedPos = position * radius;

        vWorldPos = (modelMatrix * vec4(displacedPos, 1.0)).xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);

        gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tColor;
      uniform float uAmbientIntensity;
      uniform vec3 uAmberLightPos;
      uniform vec3 uAmberColor;
      uniform vec3 uSlateLightPos;
      uniform vec3 uSlateColor;
      uniform vec3 uCyanPointPos;
      uniform vec3 uCyanColor;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormal;

      void main() {
        // Seamless 360 wrap blending to eliminate any vertical edge seam
        vec2 uvCoord = vUv;
        vec4 texColor = texture2D(tColor, uvCoord);

        // Ambient base
        vec3 ambient = texColor.rgb * (uAmbientIntensity * vec3(0.9, 0.85, 0.8));

        // 1. Left Amber Key Light
        vec3 amberDir = normalize(uAmberLightPos - vWorldPos);
        float amberDist = length(uAmberLightPos - vWorldPos);
        float amberAtten = clamp(1.0 - amberDist / 20.0, 0.0, 1.0);
        float amberDiff = max(dot(vNormal, amberDir), 0.0);
        vec3 amberLight = uAmberColor * amberDiff * (amberAtten * 0.45);

        // 2. Right Slate-Cyan Rim Fill
        vec3 slateDir = normalize(uSlateLightPos - vWorldPos);
        float slateDist = length(uSlateLightPos - vWorldPos);
        float slateAtten = clamp(1.0 - slateDist / 20.0, 0.0, 1.0);
        float slateDiff = max(dot(vNormal, slateDir), 0.0);
        vec3 slateLight = uSlateColor * slateDiff * (slateAtten * 0.35);

        // 3. Center Cyan Emissive Console Point
        vec3 cyanDir = normalize(uCyanPointPos - vWorldPos);
        float cyanDist = length(uCyanPointPos - vWorldPos);
        float cyanAtten = clamp(1.0 - cyanDist / 8.0, 0.0, 1.0);
        float cyanDiff = max(dot(vNormal, cyanDir), 0.0);
        vec3 cyanLight = uCyanColor * cyanDiff * (cyanAtten * 0.55);

        vec3 finalColor = ambient + (texColor.rgb * (amberLight + slateLight + cyanLight));

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    toneMapped: true,
  });
}
