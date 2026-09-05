import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createProceduralRockTexture } from '../../utils/proceduralTextures';

export const CaveTunnelEnvironment: React.FC = () => {
  const torchLightRef = useRef<THREE.PointLight>(null!);
  const flameMeshRef = useRef<THREE.Mesh>(null!);

  // 1. Procedural Rock PBR Material
  const rockMaterial = useMemo(() => {
    const textures = createProceduralRockTexture(1024, 1024);
    return new THREE.MeshStandardMaterial({
      map: textures.map,
      bumpMap: textures.bumpMap,
      bumpScale: 0.18,
      roughness: 0.96,
      metalness: 0.04,
      color: 0x221c16,
    });
  }, []);

  // 2. High-Density Deformed Rocky Floor Geometry
  const floorGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(14, 26, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Natural uneven rocky terrain noise
      const n = (Math.sin(x * 1.2) * Math.cos(z * 0.9) + Math.sin(x * 3.2 + z * 2.4) * 0.3) * 0.16;
      pos.setY(i, n);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 3. Arched Cavern Tunnel Walls and Ceiling Geometry
  const tunnelGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(4.6, 5.2, 24, 36, 48, true);
    geo.rotateZ(Math.PI / 2);
    geo.rotateY(Math.PI / 2);
    geo.translate(0, 2.4, 9);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      // Rough rock facet perturbations
      const n = (Math.sin(px * 1.4) * Math.sin(py * 1.6) + Math.cos(pz * 0.9)) * 0.4;
      pos.setXYZ(i, px + n * 0.35, py + n * 0.28, pz + n * 0.22);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 4. Scattered 3D Rock Boulders & Stalactites
  const boulders = useMemo(() => {
    const items = [];
    const geo = new THREE.DodecahedronGeometry(0.48, 1);
    for (let i = 0; i < 18; i++) {
      const x = (Math.random() - 0.5) * 6.8;
      const z = Math.random() * 16 + 1.2;
      items.push({
        x,
        y: 0.15,
        z,
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number],
        scale: [0.6 + Math.random() * 0.8, 0.4 + Math.random() * 0.5, 0.7 + Math.random() * 0.9] as [number, number, number],
      });
    }
    return { geo, items };
  }, []);

  // 5. Dynamic Torch Fire Flicker
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (torchLightRef.current) {
      // Natural organic flame flicker (multi-sine modulation)
      const flicker = Math.sin(time * 16) * 0.25 + Math.cos(time * 28) * 0.18 + Math.sin(time * 6.5) * 0.35;
      torchLightRef.current.intensity = 2.4 + flicker * 0.6;
      torchLightRef.current.position.x = -2.55 + Math.sin(time * 20) * 0.02;
      torchLightRef.current.position.y = 2.22 + Math.cos(time * 24) * 0.02;
    }
    if (flameMeshRef.current) {
      const s = 1.0 + Math.sin(time * 18) * 0.15;
      flameMeshRef.current.scale.set(s, s * 1.2, s);
    }
  });

  return (
    <group>
      {/* Cavern Ground Floor */}
      <mesh geometry={floorGeo} material={rockMaterial} receiveShadow />

      {/* Cavern Arched Tunnel Walls & Ceiling */}
      <mesh geometry={tunnelGeo} material={rockMaterial} receiveShadow>
        <primitive object={rockMaterial} attach="material" side={THREE.BackSide} />
      </mesh>

      {/* Scattered Rock Boulders */}
      {boulders.items.map((b, idx) => (
        <mesh
          key={idx}
          geometry={boulders.geo}
          material={rockMaterial}
          position={[b.x, b.y, b.z]}
          rotation={b.rot}
          scale={b.scale}
          castShadow
          receiveShadow
        />
      ))}

      {/* =========================================================================
          SINGULAR PRIMITIVE TORCH (Mounted on Left Rock Wall at Z = 5.2)
          ========================================================================= */}
      <group position={[-2.7, 2.1, 5.2]}>
        {/* Wooden / Forged Iron Wall Sconce Bracket */}
        <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.55, 8]} />
          <meshStandardMaterial color="#1a130e" roughness={0.9} />
        </mesh>

        {/* Torch Burning Head Core */}
        <mesh ref={flameMeshRef} position={[0.2, 0.24, 0]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshBasicMaterial color="#ff9922" />
        </mesh>

        {/* Dynamic Warm Amber PointLight (Chiaroscuro Key Light) */}
        <pointLight
          ref={torchLightRef}
          position={[0.2, 0.26, 0]}
          color="#ff7b18"
          intensity={2.6}
          distance={16}
          decay={2.0}
          castShadow
          shadow-bias={-0.002}
          shadow-mapSize={[1024, 1024]}
        />
      </group>
    </group>
  );
};
