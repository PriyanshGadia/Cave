import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const VolumetricAtmosphere: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null!);

  const { positions, count } = useMemo(() => {
    const particleCount = 280;
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8.0;     // X (-4 to 4)
      pos[i * 3 + 1] = Math.random() * 3.8 + 0.2;    // Y (floor to ceiling)
      pos[i * 3 + 2] = Math.random() * 14.0 + 0.5;   // Z (along cave depth)
    }
    return { positions: pos, count: particleCount };
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        let y = posAttr.getY(i) - delta * 0.08;
        if (y < 0.1) y = 3.8;
        posAttr.setY(i, y);

        // Subtle lateral air drift
        let x = posAttr.getX(i) + Math.sin(Date.now() * 0.001 + i) * 0.0012;
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#7fd8ff"
        transparent
        opacity={0.38}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
