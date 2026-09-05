import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createDetailedRockPBR } from '../../utils/proceduralShaders';

export const ProceduralJaggedCavern: React.FC = () => {
  const torchLightRef = useRef<THREE.PointLight>(null!);
  const flameMeshRef = useRef<THREE.Mesh>(null!);

  // 1. Procedural Rock PBR Material with Normal & Roughness Maps
  const rockMaterial = useMemo(() => {
    const { colorMap, normalMap, roughnessMap } = createDetailedRockPBR(512);
    colorMap.repeat.set(4, 4);
    normalMap.repeat.set(4, 4);
    roughnessMap.repeat.set(4, 4);

    return new THREE.MeshStandardMaterial({
      map: colorMap,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(1.8, 1.8),
      roughnessMap: roughnessMap,
      roughness: 0.95,
      metalness: 0.05,
      color: 0x3a3026,
    });
  }, []);

  // 2. High-Density Fractal-Displaced Cavern Tunnel Walls & Ceiling
  const tunnelGeo = useMemo(() => {
    // 24m long curved subterranean cavern
    const geo = new THREE.CylinderGeometry(5.2, 5.8, 26, 48, 64, true);
    geo.rotateZ(Math.PI / 2);
    geo.rotateY(Math.PI / 2);
    geo.translate(0, 2.2, 10);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);

      // Multi-frequency organic rock fracture noise
      const n1 = Math.sin(px * 1.3) * Math.sin(py * 1.5) * Math.cos(pz * 0.8) * 0.6;
      const n2 = Math.sin(px * 3.5 + pz * 2.2) * 0.25;
      const n3 = (Math.sin(px * 8.0) * Math.cos(py * 8.0)) * 0.08;
      const displacement = n1 + n2 + n3;

      pos.setXYZ(
        i,
        px + displacement * 0.45,
        py + displacement * 0.38,
        pz + displacement * 0.25
      );
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 3. Deformed Rocky Cavern Ground Floor (With Ruts & Gravel Beds)
  const floorGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(16, 28, 64, 64);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, 10);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Natural rocky terrain elevation
      const n = (Math.sin(x * 1.1) * Math.cos(z * 0.7) + Math.sin(x * 3.4 + z * 2.1) * 0.25) * 0.22;
      pos.setY(i, n);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 4. Irregular Jagged Stalactites (Sculpted Fractal Cones)
  const stalactites = useMemo(() => {
    const items = [];
    const count = 28;
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 8.5;
      const z = Math.random() * 20 + 0.8;
      const height = 1.2 + Math.random() * 1.6;
      const radius = 0.18 + Math.random() * 0.22;

      const geo = new THREE.ConeGeometry(radius, height, 8, 12);
      geo.rotateX(Math.PI);

      // Deform stalactite vertices for jagged chipped look
      const pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const px = pos.getX(j);
        const py = pos.getY(j);
        const pz = pos.getZ(j);
        const d = (Math.sin(px * 12.0) + Math.cos(py * 10.0)) * 0.04;
        pos.setXYZ(j, px + d, py, pz + d);
      }
      geo.computeVertexNormals();

      items.push({
        geo,
        pos: [x, 4.2 - Math.random() * 0.4, z] as [number, number, number],
        rot: [(Math.random() - 0.5) * 0.15, Math.random() * Math.PI, (Math.random() - 0.5) * 0.15] as [number, number, number],
      });
    }
    return items;
  }, []);

  // 5. Scattered 3D Rock Boulders on Floor
  const boulders = useMemo(() => {
    const items = [];
    const geo = new THREE.DodecahedronGeometry(0.55, 1);
    for (let i = 0; i < 22; i++) {
      const x = (Math.random() - 0.5) * 8.0;
      const z = Math.random() * 22 + 1.0;
      items.push({
        pos: [x, 0.18, z] as [number, number, number],
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number],
        scale: [0.6 + Math.random() * 0.8, 0.4 + Math.random() * 0.6, 0.7 + Math.random() * 0.9] as [number, number, number],
      });
    }
    return { geo, items };
  }, []);

  // 6. Dynamic Wall Torch Flame Flicker & Light Modulation
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (torchLightRef.current) {
      const flicker = Math.sin(time * 16) * 0.35 + Math.cos(time * 29) * 0.22 + Math.sin(time * 6.2) * 0.4;
      torchLightRef.current.intensity = 3.6 + flicker * 0.8;
      torchLightRef.current.position.x = -2.75 + Math.sin(time * 22) * 0.02;
      torchLightRef.current.position.y = 2.45 + Math.cos(time * 26) * 0.02;
    }
    if (flameMeshRef.current) {
      const s = 1.0 + Math.sin(time * 18) * 0.18;
      flameMeshRef.current.scale.set(s, s * 1.3, s);
    }
  });

  return (
    <group>
      {/* 1. Jagged Cavern Rock Walls & Ceiling */}
      <mesh geometry={tunnelGeo} material={rockMaterial} receiveShadow>
        <primitive object={rockMaterial} attach="material" side={THREE.BackSide} />
      </mesh>

      {/* 2. Uneven Rocky Cavern Ground */}
      <mesh geometry={floorGeo} material={rockMaterial} receiveShadow />

      {/* 3. Chipped Rock Stalactites Hanging from Ceiling */}
      {stalactites.map((st, idx) => (
        <mesh
          key={idx}
          geometry={st.geo}
          material={rockMaterial}
          position={st.pos}
          rotation={st.rot}
          castShadow
          receiveShadow
        />
      ))}

      {/* 4. Scattered 3D Rock Boulders on Floor */}
      {boulders.items.map((b, idx) => (
        <mesh
          key={idx}
          geometry={boulders.geo}
          material={rockMaterial}
          position={b.pos}
          rotation={b.rot}
          scale={b.scale}
          castShadow
          receiveShadow
        />
      ))}

      {/* =========================================================================
          5. FORGED IRON WALL TORCH (Z = 4.2m, Left Jagged Rock Wall)
          ========================================================================= */}
      <group position={[-2.85, 2.3, 4.2]}>
        {/* Sconce Wall Flange */}
        <mesh position={[-0.05, 0, 0]} material={rockMaterial} castShadow>
          <boxGeometry args={[0.08, 0.25, 0.18]} />
        </mesh>

        {/* Forged Iron Bracket */}
        <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.65, 8]} />
          <meshStandardMaterial color="#1a1410" roughness={0.88} metalness={0.7} />
        </mesh>

        {/* Burning Flame Head */}
        <mesh ref={flameMeshRef} position={[0.24, 0.28, 0]}>
          <sphereGeometry args={[0.13, 12, 12]} />
          <meshBasicMaterial color="#ff8e18" />
        </mesh>

        {/* Dynamic Warm Amber Key PointLight */}
        <pointLight
          ref={torchLightRef}
          position={[0.24, 0.32, 0]}
          color="#ff7518"
          intensity={3.8}
          distance={20}
          decay={2.0}
          castShadow
          shadow-bias={-0.001}
          shadow-mapSize={[1024, 1024]}
        />
      </group>
    </group>
  );
};
