import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DoorHero } from '../../scene/DoorHero';
import { createCaveTunnelGeometry, loadRockMaterial } from '../../../lib/three/proceduralRockCavern';
import { AtmosphericParticles } from '../AtmosphericParticles';

/**
 * src/components/three/scenes/Scene02Threshold.tsx
 * 
 * SC02: Breach & Mechanical Door Retraction Passage.
 * - Left/Right heavy gunmetal door slabs retract horizontally into rock walls (X: ±0.33m -> ±1.20m)
 * - High-pressure steam plumes vent from lower & perimeter mechanical door seams
 * - Amber hazard strobe & pneumatic audio cues
 */

interface Scene02ThresholdProps {
  progress?: number; // 0 to 1 during transition
}

// Perimeter Seam Steam Venting Particle System
function PneumaticSteamVents({ progress = 0.5 }: { progress: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 75;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const steamParticles = useMemo(() => {
    return Array.from({ length: count }, () => {
      const side = Math.random() > 0.5 ? 1 : -1;
      return {
        originX: side * 0.75,
        originY: Math.random() * 2.0 + 0.2,
        originZ: 0.05,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(
          side * (0.01 + Math.random() * 0.02),
          0.005 + Math.random() * 0.015,
          0.008 + Math.random() * 0.02
        ),
        scale: 0.04 + Math.random() * 0.08,
        life: Math.random(),
      };
    });
  }, []);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.1);

    steamParticles.forEach((p, i) => {
      p.life += dt * 1.2;
      if (p.life > 1.0) {
        p.life = 0;
        const side = Math.random() > 0.5 ? 1 : -1;
        p.pos.set(
          side * (0.45 + progress * 0.4),
          Math.random() * 2.2 + 0.1,
          0.05
        );
      } else {
        p.pos.addScaledVector(p.vel, dt * 60);
      }

      dummy.position.copy(p.pos);
      const currentScale = p.scale * (1.0 + p.life * 2.5) * (1.0 - p.life * 0.5);
      dummy.scale.setScalar(currentScale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color="#E8F4F8"
        transparent
        opacity={0.28 * Math.min(1.0, progress * 2.0)}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export const Scene02Threshold: React.FC<Scene02ThresholdProps> = ({ progress = 0.5 }) => {
  const [caveGeom] = React.useState(() => createCaveTunnelGeometry());
  const [rockMat] = React.useState(() => loadRockMaterial());
  const strobeRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // 4Hz Amber Emergency Hazard Strobe
    if (strobeRef.current) {
      const strobe = Math.sin(t * 25.0) > 0.2 ? 10.0 : 1.5;
      strobeRef.current.intensity = strobe;
    }
  });

  return (
    <group>
      {/* Cavern Wall Tunnel Geometry */}
      <mesh
        geometry={caveGeom}
        material={rockMat}
        position={[0, 0, 0]}
        frustumCulled={false}
      />

      {/* Parting Mechanical Blast Door Assembly with real horizontal slab retraction */}
      <group position={[0, 1.36, 0.0]}>
        <DoorHero openProgress={progress} />
      </group>

      {/* High-Pressure Pneumatic Steam Plumes */}
      <PneumaticSteamVents progress={progress} />

      {/* Ambient Cavern Dust Motes */}
      <AtmosphericParticles count={100} />

      {/* Warning Hazard Strobe above the Portal */}
      <pointLight
        ref={strobeRef}
        position={[0, 2.8, 0.2]}
        color="#FFA030"
        intensity={8.0}
        distance={9}
      />
      <ambientLight color="#120E0A" intensity={0.45} />
    </group>
  );
};
