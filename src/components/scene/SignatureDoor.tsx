import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SignatureDoorProps {
  onActivate?: () => void;
  isUnlocked?: boolean;
}

export const SignatureDoor: React.FC<SignatureDoorProps> = ({
  onActivate,
  isUnlocked = false,
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const outerRingRef = useRef<THREE.Group>(null!);
  const innerIrisRef = useRef<THREE.Group>(null!);
  const emissiveStripMatRef = useRef<THREE.MeshStandardMaterial>(null!);

  // Procedural PBR Materials (Separated slots per Section 1)
  const materials = useMemo(() => {
    const gunmetal = new THREE.MeshStandardMaterial({
      color: 0x18202b,
      metalness: 0.88,
      roughness: 0.32,
    });

    const brushedTitanium = new THREE.MeshStandardMaterial({
      color: 0x283444,
      metalness: 0.94,
      roughness: 0.24,
    });

    const weatheredIron = new THREE.MeshStandardMaterial({
      color: 0x0e131a,
      metalness: 0.72,
      roughness: 0.58,
    });

    const emissiveCyan = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: new THREE.Color(0x00f3ff),
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.5,
    });

    const hexBolt = new THREE.MeshStandardMaterial({
      color: 0x3d4d63,
      metalness: 0.95,
      roughness: 0.18,
    });

    return { gunmetal, brushedTitanium, weatheredIron, emissiveCyan, hexBolt };
  }, []);

  // Frame animation for mechanical ring rotation and emissive breathing
  useFrame((_, delta) => {
    if (emissiveStripMatRef.current) {
      // Subtle organic energy pulse on the cyan strips
      const pulse = Math.sin(Date.now() * 0.003) * 0.4 + 1.6;
      emissiveStripMatRef.current.emissiveIntensity = pulse;
    }

    if (isUnlocked && outerRingRef.current && innerIrisRef.current) {
      outerRingRef.current.rotation.z += delta * 0.8;
      innerIrisRef.current.rotation.z -= delta * 1.2;
    }
  });

  // Generate 16 radial Hex Bolts around Outer Ring
  const outerHexBolts = useMemo(() => {
    const items = [];
    const radius = 1.32;
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      items.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rot: angle,
      });
    }
    return items;
  }, []);

  // Generate 8 Radial Hydraulic Clamp Housings
  const hydraulicClamps = useMemo(() => {
    const items = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      items.push({
        x: Math.cos(angle) * 1.12,
        y: Math.sin(angle) * 1.12,
        rot: angle,
      });
    }
    return items;
  }, []);

  return (
    <group ref={groupRef} position={[0, 1.5, 0]}>
      {/* 1. OUTER HEAVY STRUCTURAL FRAME (Square Wall Flange, 3.2m x 3.2m) */}
      <mesh material={materials.weatheredIron} castShadow receiveShadow>
        <boxGeometry args={[3.2, 3.2, 0.25]} />
      </mesh>

      {/* Hydraulic Conduit Pipes Running along Left/Right edges */}
      {[-1.45, -1.35, 1.35, 1.45].map((x, idx) => (
        <mesh key={idx} position={[x, 0, 0.15]} material={materials.brushedTitanium} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 3.1, 16]} />
        </mesh>
      ))}

      {/* 2. OUTER CONCENTRIC ARMOR RING (2.6m Diameter) */}
      <group ref={outerRingRef} position={[0, 0, 0.14]}>
        <mesh material={materials.gunmetal} castShadow receiveShadow>
          <torusGeometry args={[1.3, 0.12, 16, 48]} />
        </mesh>

        {/* 16 Heavy Hex Bolts Trim */}
        {outerHexBolts.map((b, idx) => (
          <mesh
            key={idx}
            position={[b.x, b.y, 0.08]}
            rotation={[0, 0, b.rot]}
            material={materials.hexBolt}
            castShadow
          >
            <cylinderGeometry args={[0.025, 0.025, 0.04, 6]} />
          </mesh>
        ))}
      </group>

      {/* 3. MIDDLE MECHANICAL RING & HYDRAULIC CLAMPS (1.8m Diameter) */}
      <group position={[0, 0, 0.18]}>
        <mesh material={materials.brushedTitanium} castShadow receiveShadow>
          <cylinderGeometry args={[1.15, 1.18, 0.1, 32]} />
        </mesh>

        {/* 8 Radial Clamps */}
        {hydraulicClamps.map((c, idx) => (
          <group key={idx} position={[c.x, c.y, 0.06]} rotation={[0, 0, c.rot]}>
            <mesh material={materials.gunmetal} castShadow>
              <boxGeometry args={[0.22, 0.1, 0.12]} />
            </mesh>
            <mesh position={[0.06, 0, 0.05]} material={materials.hexBolt}>
              <cylinderGeometry args={[0.015, 0.015, 0.06, 6]} />
            </mesh>
          </group>
        ))}

        {/* Circular Cyan Emissive Seam Ring (Separate Material Slot) */}
        <mesh position={[0, 0, 0.055]}>
          <ringGeometry args={[0.96, 0.99, 48]} />
          <meshStandardMaterial
            ref={emissiveStripMatRef}
            color="#00f3ff"
            emissive="#00f3ff"
            emissiveIntensity={1.8}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* 4. INNER IRIS SEGMENT BLADES (1.1m Diameter) */}
      <group ref={innerIrisRef} position={[0, 0, 0.24]}>
        <mesh material={materials.gunmetal} castShadow receiveShadow>
          <cylinderGeometry args={[0.75, 0.78, 0.08, 24]} />
        </mesh>

        {/* 6 Interlocking Iris Triangular Segments */}
        {[0, 60, 120, 180, 240, 300].map((deg, idx) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <mesh
              key={idx}
              position={[Math.cos(rad) * 0.42, Math.sin(rad) * 0.42, 0.04]}
              rotation={[0, 0, rad]}
              material={materials.brushedTitanium}
              castShadow
            >
              <boxGeometry args={[0.38, 0.16, 0.04]} />
            </mesh>
          );
        })}
      </group>

      {/* 5. RECESSED CENTER BIOMETRIC LOCK MODULE (0.6m Diameter) */}
      <group
        position={[0, 0, 0.28]}
        onClick={e => {
          e.stopPropagation();
          if (onActivate) onActivate();
        }}
      >
        {/* Terminal Housing Ring */}
        <mesh material={materials.weatheredIron} castShadow>
          <cylinderGeometry args={[0.34, 0.36, 0.08, 32]} />
        </mesh>

        {/* Outer Cyan Ring Light */}
        <mesh position={[0, 0, 0.042]}>
          <ringGeometry args={[0.29, 0.31, 32]} />
          <meshStandardMaterial
            color="#00f3ff"
            emissive="#00f3ff"
            emissiveIntensity={2.2}
          />
        </mesh>

        {/* Dark Screen Base */}
        <mesh position={[0, 0.06, 0.044]} material={materials.weatheredIron}>
          <planeGeometry args={[0.36, 0.22]} />
        </mesh>

        {/* Circular Iris Camera Lens Housing */}
        <mesh position={[0, -0.12, 0.048]} material={materials.brushedTitanium} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.03, 24]} />
        </mesh>

        {/* Glowing Optical Lens Core */}
        <mesh position={[0, -0.12, 0.064]}>
          <circleGeometry args={[0.065, 24]} />
          <meshBasicMaterial color="#00f3ff" />
        </mesh>
      </group>
    </group>
  );
};
