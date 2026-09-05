import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { createPanoramicDepthMaterial } from '../../lib/three/PanoramicDepthShader';

/**
 * src/components/three/PanoramicNode.tsx
 * 
 * 100% Seamless Cavern Environment with Bounded Look Exploration.
 * - Real 3D physical vertex displacement from Depth-Anything V2 maps
 * - ClampToEdgeWrapping on all environment textures (zero seam tear)
 * - Seamless dual-layer composition: 3D Cavern Hull + High-Res Biometric Terminal Face
 * - High-contrast chiaroscuro lighting (left amber lamp + right slate corridor)
 */

// Preload 360 textures and depth maps
useTexture.preload([
  '/textures/scene-00-360-equirectangular.jpg',
  '/textures/scene-00-360-depth.png',
  '/frames/S01/keyframe_0.jpg',
  '/frames/S03/keyframe_0.jpg',
  '/frames/S04/keyframe_0.jpg',
  '/frames/S05/keyframe_0.jpg',
]);

interface PanoramicNodeProps {
  /** Path to the keyframe or 360 equirectangular texture */
  keyframeUrl: string;
  /** Radius of the enclosing 360 sphere */
  radius?: number;
  /** Center offset of the node relative to camera origin */
  position?: [number, number, number];
}

export const PanoramicNode: React.FC<PanoramicNodeProps> = ({
  keyframeUrl,
  radius = 16.0,
  position = [0, 1.65, 0],
}) => {
  const isSC00 = keyframeUrl.includes('S00') || keyframeUrl.includes('360');
  const isPanelCloseUp = keyframeUrl.includes('S01');

  // Background 360 shell always uses full subterranean cavern panorama
  const envColorPath = (isSC00 || isPanelCloseUp)
    ? '/textures/scene-00-360-equirectangular.jpg'
    : keyframeUrl;

  const envDepthPath = '/textures/scene-00-360-depth.png';

  const [envColorTexture, envDepthTexture] = useTexture([envColorPath, envDepthPath]);

  envColorTexture.colorSpace = THREE.SRGBColorSpace;
  envColorTexture.wrapS = THREE.ClampToEdgeWrapping;
  envColorTexture.wrapT = THREE.ClampToEdgeWrapping;
  envColorTexture.minFilter = THREE.LinearMipmapLinearFilter;
  envColorTexture.magFilter = THREE.LinearFilter;

  envDepthTexture.wrapS = THREE.ClampToEdgeWrapping;
  envDepthTexture.wrapT = THREE.ClampToEdgeWrapping;

  // 1. High-Density 360° Inverted Sphere for Vertex Displacement (128x96 subdivisions)
  const sphereGeometry = useMemo(() => {
    const geom = new THREE.SphereGeometry(1.0, 128, 96);
    geom.scale(-1, 1, 1);
    geom.rotateY(-Math.PI / 2);
    return geom;
  }, []);

  // 2. Real 3D Depth-Displaced PBR Shader Material with ClampToEdgeWrapping
  const depthMaterial = useMemo(() => {
    return createPanoramicDepthMaterial(envColorTexture, envDepthTexture, {
      baseRadius: radius,
      depthScale: 7.2,
      invertDepth: false,
      ambientIntensity: 0.90,
    });
  }, [envColorTexture, envDepthTexture, radius]);

  // 3. High-res Curved Foreground Panel for close-up inspection nodes (SC01)
  const panelTexture = useTexture(keyframeUrl);
  panelTexture.colorSpace = THREE.SRGBColorSpace;
  panelTexture.wrapS = THREE.ClampToEdgeWrapping;
  panelTexture.wrapT = THREE.ClampToEdgeWrapping;

  const panelGeometry = useMemo(() => {
    if (!isPanelCloseUp) return null;
    const geom = new THREE.PlaneGeometry(3.6, 6.4, 24, 1);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const angle = x / 4.0;
      const curvedX = 4.0 * Math.sin(angle);
      const curvedZ = -4.0 * (1 - Math.cos(angle));
      pos.setX(i, curvedX);
      pos.setZ(i, curvedZ);
    }
    geom.computeVertexNormals();
    return geom;
  }, [isPanelCloseUp]);

  return (
    <group position={position}>
      {/* 1. Real 3D Depth-Displaced 360° Cavern Hull (Zero seam tear, ClampToEdgeWrapping) */}
      <mesh
        geometry={sphereGeometry}
        material={depthMaterial}
        position={[0, 0, 0]}
      />

      {/* 2. High-Res Biometric Terminal Plate for SC01 (Anchored at Z = 0.0) */}
      {isPanelCloseUp && panelGeometry && (
        <mesh geometry={panelGeometry} position={[0, -0.2, 0.0]}>
          <meshBasicMaterial
            map={panelTexture}
            side={THREE.DoubleSide}
            toneMapped={true}
          />
        </mesh>
      )}

      {/* 3. Dual-Spectrum Chiaroscuro Environmental Scene Lights */}
      <ambientLight color="#1a140f" intensity={0.9} />

      {/* Left Amber Practical Light from Cavern Cage Lamp */}
      <pointLight
        position={[-6.0, 4.0, -4.0]}
        color="#FFA030"
        intensity={6.0}
        distance={18}
      />

      {/* Right Slate-Cyan Subterranean Corridor Glow */}
      <pointLight
        position={[6.0, 3.0, -6.0]}
        color="#2E4A62"
        intensity={4.5}
        distance={16}
      />

      {/* Center Biometric Terminal Cyan Accent */}
      <pointLight
        position={[0, 1.45, 0.5]}
        color="#00E5FF"
        intensity={2.8}
        distance={6}
      />
    </group>
  );
};
