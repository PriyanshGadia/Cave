import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createProceduralRockTexture } from '../../utils/proceduralTextures';

export const ParallaxCaveCards: React.FC = () => {
  // Generate procedural organic rock texture with bump mapping
  const rockTextures = useMemo(() => {
    return createProceduralRockTexture(1024, 1024);
  }, []);

  const rockMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x5a4330, // Warm orange-brown rock tone
      map: rockTextures.map,
      bumpMap: rockTextures.bumpMap,
      bumpScale: 0.22,
      roughness: 0.88,
      metalness: 0.08,
    });
  }, [rockTextures]);

  // 1. Left Jagged Cavern Wall Card (Catches direct amber key light, Z = +0.6m)
  const leftRockGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(4.2, 7.2, 32, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Heavy jagged rock displacement
      const noise =
        Math.sin(y * 2.5) * 0.45 +
        Math.cos(x * 2.8 + y * 1.4) * 0.32 +
        Math.sin(x * 7.0 + y * 5.0) * 0.12;
      pos.setZ(i, noise + (x < 0 ? Math.abs(x) * 0.5 : 0));
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 2. Right Jagged Cavern Wall Card (Mid-distance Parallax, Z = +0.9m)
  const rightRockGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(4.2, 7.2, 32, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const noise =
        Math.cos(y * 2.2) * 0.38 +
        Math.sin(x * 2.6 + y * 1.6) * 0.28 +
        Math.cos(x * 6.5 + y * 4.5) * 0.12;
      pos.setZ(i, noise + (x > 0 ? Math.abs(x) * 0.55 : 0));
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 3. Cave Ceiling Arch Card (Angled, Z = +1.2m, Framing Upper Third of 9:16)
  const ceilingArchGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(8.2, 3.8, 40, 20);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Downward cavern stalactite / craggy ridge noise
      const noise =
        Math.sin(x * 3.0) * 0.35 +
        Math.cos(y * 3.8 + x * 1.8) * 0.24 +
        Math.sin(x * 8.0 + y * 6.0) * 0.08;
      pos.setZ(i, noise - (1.9 - y) * 0.45);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group name="parallax-cave-cards">
      {/* Left Wall Card (Raked with amber key light) */}
      <mesh
        geometry={leftRockGeo}
        material={rockMaterial}
        position={[-2.6, 1.5, 0.6]}
        rotation={[0, 0.32, 0]}
        castShadow
        receiveShadow
      />

      {/* Right Wall Card (Submerged in deep chiaroscuro shadows) */}
      <mesh
        geometry={rightRockGeo}
        material={rockMaterial}
        position={[2.6, 1.5, 0.9]}
        rotation={[0, -0.35, 0]}
        castShadow
        receiveShadow
      />

      {/* Cave Ceiling Arch Card (Angled over top of frame) */}
      <mesh
        geometry={ceilingArchGeo}
        material={rockMaterial}
        position={[0, 3.4, 1.2]}
        rotation={[0.48, 0, 0]}
        castShadow
        receiveShadow
      />
    </group>
  );
};
