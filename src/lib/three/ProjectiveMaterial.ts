import * as THREE from 'three';

export interface ProjectiveMaterialOptions {
  texture: THREE.Texture;
  projectorPosition?: THREE.Vector3;
  projectorTarget?: THREE.Vector3;
  projectorFov?: number;
  projectorAspect?: number;
  roughness?: number;
  metalness?: number;
  side?: THREE.Side;
}

/**
 * Real-time Projective Texture Mapping Material
 * Extends THREE.MeshStandardMaterial via onBeforeCompile so it receives real-time scene lighting and fog.
 * Projects reference photo from a projector camera in 3D world space onto any geometry.
 */
export function createProjectiveMaterial(
  options: ProjectiveMaterialOptions
): THREE.MeshStandardMaterial {
  const {
    texture,
    projectorPosition = new THREE.Vector3(0, 1.6, 7.0),
    projectorTarget = new THREE.Vector3(0, 1.4, 0.0),
    projectorFov = 50,
    projectorAspect = 9 / 16,
    roughness = 0.5,
    metalness = 0.25,
    side = THREE.BackSide,
  } = options;

  // 1. Static Projector Camera
  const projectorCamera = new THREE.PerspectiveCamera(
    projectorFov,
    projectorAspect,
    0.1,
    50
  );
  projectorCamera.position.copy(projectorPosition);
  projectorCamera.lookAt(projectorTarget);
  projectorCamera.updateMatrixWorld(true);
  projectorCamera.updateProjectionMatrix();

  // 2. Bias Matrix: maps [-1, 1] clip space to [0, 1] UV space
  const biasMatrix = new THREE.Matrix4().set(
    0.5, 0.0, 0.0, 0.5,
    0.0, 0.5, 0.0, 0.5,
    0.0, 0.0, 0.5, 0.5,
    0.0, 0.0, 0.0, 1.0
  );

  // Compute projective texture matrix: textureMatrix = biasMatrix * projMatrix * worldInverse
  const textureMatrix = new THREE.Matrix4();
  textureMatrix.multiplyMatrices(biasMatrix, projectorCamera.projectionMatrix);
  textureMatrix.multiply(projectorCamera.matrixWorldInverse);

  // 3. Create MeshStandardMaterial and inject custom GLSL
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness,
    metalness,
    side,
  });

  const uniforms = {
    uProjectedTexture: { value: texture },
    uTextureMatrix: { value: textureMatrix },
    uFallbackColor: { value: new THREE.Color(0x0a0806) },
  };

  material.onBeforeCompile = (shader) => {
    // Attach uniforms
    shader.uniforms.uProjectedTexture = uniforms.uProjectedTexture;
    shader.uniforms.uTextureMatrix = uniforms.uTextureMatrix;
    shader.uniforms.uFallbackColor = uniforms.uFallbackColor;

    // --- Inject Vertex Shader ---
    shader.vertexShader = `
      uniform mat4 uTextureMatrix;
      varying vec4 vProjCoord;
      ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      // Project world position to projector UV space
      vProjCoord = uTextureMatrix * modelMatrix * vec4(position, 1.0);
      `
    );

    // --- Inject Fragment Shader ---
    shader.fragmentShader = `
      uniform sampler2D uProjectedTexture;
      uniform vec3 uFallbackColor;
      varying vec4 vProjCoord;
      ${shader.fragmentShader}
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      vec3 projCoord = vProjCoord.xyz / vProjCoord.w;
      bool isInside = (projCoord.x >= 0.0 && projCoord.x <= 1.0) &&
                      (projCoord.y >= 0.0 && projCoord.y <= 1.0) &&
                      (vProjCoord.w > 0.0);
      
      vec4 projectedTexColor = isInside 
        ? texture2D(uProjectedTexture, projCoord.xy)
        : vec4(uFallbackColor, 1.0);

      // Base texture balanced for 50% lighting intensity
      diffuseColor = projectedTexColor;
      `
    );
  };

  return material;
}
