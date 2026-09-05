import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { getFrustumSize } from '../../../lib/three/RectilinearPlane';

/**
 * src/components/three/scenes/Scene03Darkroom.tsx
 * 
 * SC03: Subterranean Darkroom / Pitch-Black Chamber.
 * Room in standby state before environmental power and telemetry ignition.
 */

export const Scene03Darkroom: React.FC = () => {
  const { camera } = useThree();
  const beaconRef = useRef<THREE.PointLight>(null);

  const bgTexture = useTexture('/textures/scene-06-workbench-bg.jpg');
  bgTexture.colorSpace = THREE.SRGBColorSpace;
  bgTexture.wrapS = bgTexture.wrapT = THREE.ClampToEdgeWrapping;

  const pCam = camera as THREE.PerspectiveCamera;
  const frustumAt10 = getFrustumSize(pCam, 10.0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beaconRef.current) {
      // Subtle pulsing emergency standby beacon
      beaconRef.current.intensity = (Math.sin(t * 3.5) > 0.6 ? 2.5 : 0.2);
    }
  });

  return (
    <group>
      {/* Dim Silhouette Background Workshop Plate */}
      <mesh position={[0, 1.40, -10.0]}>
        <planeGeometry args={[frustumAt10.width * 1.55, frustumAt10.height * 1.55]} />
        <meshStandardMaterial
          map={bgTexture}
          roughness={0.95}
          metalness={0.05}
          color="#060504"
        />
      </mesh>

      {/* Emergency Cyan Standby Indicator Beacon on Workbench */}
      <pointLight
        ref={beaconRef}
        position={[0, 0.40, -5.2]}
        color="#00E5FF"
        intensity={1.2}
        distance={4.0}
      />

      {/* Deep Subterranean Darkness Baseline */}
      <ambientLight color="#040302" intensity={0.15} />
    </group>
  );
};
