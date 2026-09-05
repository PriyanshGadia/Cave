import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { getFrustumSize } from '../../../lib/three/RectilinearPlane';

/**
 * src/components/three/scenes/Scene04Mapping.tsx
 * 
 * SC04: Environmental Laser Mapping & Room Geometry Sweep.
 * Volumetric laser scan line sweeps the room to initialize the telemetry grid.
 */

export const Scene04Mapping: React.FC = () => {
  const { camera } = useThree();
  const scanLineRef = useRef<THREE.Mesh>(null);
  const scanLightRef = useRef<THREE.PointLight>(null);

  const bgTexture = useTexture('/textures/scene-06-workbench-bg.jpg');

  bgTexture.colorSpace = THREE.SRGBColorSpace;
  bgTexture.wrapS = bgTexture.wrapT = THREE.ClampToEdgeWrapping;

  const pCam = camera as THREE.PerspectiveCamera;
  const frustumAt10 = getFrustumSize(pCam, 10.0);
  const frustumAt55 = getFrustumSize(pCam, 5.5);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Scan line moves vertically up and down through the room
    const scanY = 1.40 + Math.sin(t * 2.2) * 1.8;
    if (scanLineRef.current) {
      scanLineRef.current.position.y = scanY;
    }
    if (scanLightRef.current) {
      scanLightRef.current.position.y = scanY;
    }
  });

  return (
    <group>
      {/* Background Shell Plate */}
      <mesh position={[0, 1.40, -10.0]}>
        <planeGeometry args={[frustumAt10.width * 1.55, frustumAt10.height * 1.55]} />
        <meshStandardMaterial
          map={bgTexture}
          roughness={0.90}
          metalness={0.10}
          color="#162024"
        />
      </mesh>

      {/* Midground Workbench with Low-Lit Geometry */}
      <mesh position={[0, 0.40, -5.5]}>
        <planeGeometry args={[frustumAt55.width * 1.15, frustumAt55.height * 1.15]} />
        <meshStandardMaterial
          map={bgTexture}
          roughness={0.80}
          metalness={0.20}
          color="#1A2830"
        />
      </mesh>

      {/* Sweeping Cyan Volumetric Laser Scan Plane */}
      <mesh ref={scanLineRef} position={[0, 1.40, -5.3]}>
        <planeGeometry args={[frustumAt55.width * 1.4, 0.08]} />
        <meshBasicMaterial
          color="#00E5FF"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dynamic Laser Line Follower Light */}
      <pointLight
        ref={scanLightRef}
        position={[0, 1.40, -5.0]}
        color="#00E5FF"
        intensity={6.0}
        distance={8.0}
      />

      {/* Ambient Blue Mapping Glow */}
      <ambientLight color="#051016" intensity={0.5} />
    </group>
  );
};
