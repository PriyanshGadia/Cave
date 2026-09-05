import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import { DoorHero } from '../../scene/DoorHero';
import { BiometricPanelTerminal } from '../../scene/BiometricPanelTerminal';
import { createCaveTunnelGeometry, loadRockMaterial } from '../../../lib/three/proceduralRockCavern';

/**
 * src/components/three/scenes/Scene01Panel.tsx
 * 
 * SC01: Biometric Verification & Security Terminal Interface.
 * Camera staged at [0, 1.36, 1.20] looking directly at the blast door scanner.
 */

interface Scene01PanelProps {
  onAuth: () => void;
}

export const Scene01Panel: React.FC<Scene01PanelProps> = ({ onAuth }) => {
  const [caveGeom] = useState(() => createCaveTunnelGeometry());
  const [rockMat] = useState(() => loadRockMaterial());

  return (
    <group>
      {/* Cavern Wall Tunnel Geometry */}
      <mesh
        geometry={caveGeom}
        material={rockMat}
        position={[0, 0, 0]}
        frustumCulled={false}
      />

      {/* Real 3D Blast Door */}
      <group position={[0, 1.36, 0.0]}>
        <DoorHero />
      </group>

      {/* Floating Interactive 2D Biometric Panel Overlay positioned at the scanner console */}
      <Html
        position={[0, 1.36, 0.25]}
        center
        scale={0.0026}
        transform
      >
        <div style={{ width: '380px', pointerEvents: 'auto', userSelect: 'none' }}>
          <BiometricPanelTerminal
            onRegisterClick={() => {}}
            onVerificationSuccess={() => {
              setTimeout(() => {
                onAuth();
              }, 1200);
            }}
            onResetClick={() => {}}
            onProceedThroughDoor={() => {
              onAuth();
            }}
          />
        </div>
      </Html>

      {/* Scanner Console Lighting */}
      <pointLight position={[0, 1.45, 0.6]} color="#00E5FF" intensity={3.5} distance={3} />
      <spotLight
        position={[0, 2.2, 1.8]}
        target-position={[0, 1.36, 0.0]}
        color="#385875"
        intensity={6.0}
        angle={0.6}
        penumbra={0.7}
      />
      <ambientLight color="#0E0C0A" intensity={0.5} />
    </group>
  );
};
