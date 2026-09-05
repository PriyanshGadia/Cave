import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * src/components/three/AtmosphericParticles.tsx
 * 
 * Layer 3: GPU Instanced Atmospheric Dust & Steam Simulation
 * - 140+ instanced dust motes drifting through cavern light shafts
 * - Natural turbulent micro-drift, scale pulsation, and floor reset loop
 * - Additive blending with warm amber glow
 */

interface AtmosphericParticlesProps {
  count?: number;
  area?: [number, number, number];
  color?: string;
  opacity?: number;
}

export const AtmosphericParticles: React.FC<AtmosphericParticlesProps> = ({
  count = 140,
  area = [4.0, 3.2, 5.5],
  color = '#FFE0A0',
  opacity = 0.38,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * area[0],
        Math.random() * area[1] + 0.1,
        (Math.random() - 0.5) * area[2] + 2.0
      ),
      speed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.002,
        -0.0008 - Math.random() * 0.0018,
        (Math.random() - 0.5) * 0.002
      ),
      scale: 0.012 + Math.random() * 0.024,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [count, area]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    particles.forEach((p, i) => {
      // Natural turbulent Brownian drift
      p.pos.x += p.speed.x + Math.sin(t * 0.45 + p.phase) * 0.0009;
      p.pos.y += p.speed.y;
      p.pos.z += p.speed.z + Math.cos(t * 0.45 + p.phase) * 0.0009;

      // Reset when sinking below cavern floor
      if (p.pos.y < 0.1) {
        p.pos.y = area[1];
        p.pos.x = (Math.random() - 0.5) * area[0];
        p.pos.z = (Math.random() - 0.5) * area[2] + 2.0;
      }

      dummy.position.copy(p.pos);
      dummy.scale.setScalar(p.scale * (1.0 + Math.sin(t * 1.8 + p.phase) * 0.25));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
};
