import { useMemo } from "react";
import * as THREE from "three";
import { generateMasterBlastDoorTextures } from "../../lib/three/generateMasterBlastDoorTextures";

interface BlastDoorProps {
  isHovered?: boolean;
  onActivate?: () => void;
  openProgress?: number; // 0.0 = fully closed, 1.0 = fully parted into rock walls
}

export function MasterBlastDoor({
  openProgress = 0.0,
}: BlastDoorProps = {}) {
  const pbr = useMemo(() => generateMasterBlastDoorTextures(), []);

  const leftMaps = useMemo(() => {
    const clone = (tex: THREE.Texture) => {
      const t = tex.clone();
      t.repeat.set(0.5, 1.0);
      t.offset.set(0.0, 0.0);
      t.needsUpdate = true;
      return t;
    };
    return {
      albedo: clone(pbr.albedoMap),
      normal: clone(pbr.normalMap),
      roughness: clone(pbr.roughnessMap),
      ao: clone(pbr.aoMap),
    };
  }, [pbr]);

  const rightMaps = useMemo(() => {
    const clone = (tex: THREE.Texture) => {
      const t = tex.clone();
      t.repeat.set(0.5, 1.0);
      t.offset.set(0.5, 0.0);
      t.needsUpdate = true;
      return t;
    };
    return {
      albedo: clone(pbr.albedoMap),
      normal: clone(pbr.normalMap),
      roughness: clone(pbr.roughnessMap),
      ao: clone(pbr.aoMap),
    };
  }, [pbr]);

  const materials = useMemo(
    () => ({
      doorPlateLeft: new THREE.MeshStandardMaterial({
        color: "#181512",
        map: leftMaps.albedo,
        normalMap: leftMaps.normal,
        normalScale: new THREE.Vector2(1.6, 1.6),
        roughnessMap: leftMaps.roughness,
        aoMap: leftMaps.ao,
        aoMapIntensity: 1.4,
        metalness: 0.88,
        roughness: 0.44,
        envMapIntensity: 0.8,
        side: THREE.DoubleSide,
      }),
      doorPlateRight: new THREE.MeshStandardMaterial({
        color: "#181512",
        map: rightMaps.albedo,
        normalMap: rightMaps.normal,
        normalScale: new THREE.Vector2(1.6, 1.6),
        roughnessMap: rightMaps.roughness,
        aoMap: rightMaps.ao,
        aoMapIntensity: 1.4,
        metalness: 0.88,
        roughness: 0.44,
        envMapIntensity: 0.8,
        side: THREE.DoubleSide,
      }),
      outerFrame: new THREE.MeshStandardMaterial({
        color: "#12100E",
        metalness: 0.88,
        roughness: 0.44,
        envMapIntensity: 0.8,
        side: THREE.DoubleSide,
      }),
      darkCavity: new THREE.MeshStandardMaterial({
        color: "#050403",
        metalness: 0.95,
        roughness: 0.20,
        side: THREE.DoubleSide,
      }),
      steelHardware: new THREE.MeshStandardMaterial({
        color: "#22201D",
        metalness: 0.92,
        roughness: 0.35,
        envMapIntensity: 1.0,
        side: THREE.DoubleSide,
      }),
      scannerLens: new THREE.MeshPhysicalMaterial({
        color: "#002B36",
        metalness: 0.90,
        roughness: 0.05,
        clearcoat: 1.0,
        emissive: "#00E5FF",
        emissiveIntensity: 0.6,
        side: THREE.DoubleSide,
      }),
    }),
    [leftMaps, rightMaps]
  );

  // Mechanical Door Slide Offset (X: ±0.33m -> ±1.20m into rock walls)
  const leftSlideX = -0.87 * openProgress;
  const rightSlideX = 0.87 * openProgress;

  return (
    <group position={[0, 0, 0]}>
      {/* 1. OUTER STEPPED BULKHEAD CHASSIS (Stationary Outer Frame in Rock Wall) */}
      <mesh
        position={[0, 0, 0]}
        material={materials.outerFrame}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.56, 2.46, 0.08]} />
      </mesh>
      <mesh
        position={[0, 0, 0.025]}
        material={materials.outerFrame}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.44, 2.34, 0.06]} />
      </mesh>

      {/* 45° Chamfered Outer Corner Plates */}
      {[
        [-0.64, 1.08, Math.PI / 4],
        [0.64, 1.08, -Math.PI / 4],
        [-0.64, -1.08, -Math.PI / 4],
        [0.64, -1.08, Math.PI / 4],
      ].map(([x, y, rot], i) => (
        <mesh
          key={`chamfer-${i}`}
          position={[x, y, 0.045]}
          rotation={[0, 0, rot]}
          material={materials.outerFrame}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.34, 0.07, 0.06]} />
        </mesh>
      ))}

      {/* ========================================================================= */}
      {/* 2. LEFT MECHANICAL DOOR LEAF ASSEMBLY (Retracts Left)                     */}
      {/* ========================================================================= */}
      <group position={[leftSlideX, 0, 0]}>
        {/* Left Slab */}
        <mesh
          position={[-0.33, 0, 0.05]}
          material={materials.doorPlateLeft}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.64, 2.18, 0.04]} />
        </mesh>

        {/* Left Turbines (Top & Bottom) */}
        {[
          [-0.34, 0.68],
          [-0.34, -0.68],
        ].map(([x, y], idx) => (
          <group key={`turbine-L-${idx}`} position={[x, y, 0.076]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.steelHardware} castShadow>
              <torusGeometry args={[0.13, 0.018, 16, 32]} />
            </mesh>
            <mesh position={[0, 0, -0.018]} rotation={[Math.PI / 2, 0, 0]} material={materials.darkCavity}>
              <cylinderGeometry args={[0.125, 0.125, 0.03, 32]} />
            </mesh>
            {Array.from({ length: 8 }).map((_, sIdx) => (
              <mesh
                key={`blade-L-${sIdx}`}
                rotation={[0, 0, (sIdx * Math.PI) / 4]}
                position={[0, 0, -0.004]}
                material={materials.steelHardware}
                castShadow
              >
                <boxGeometry args={[0.22, 0.016, 0.012]} />
              </mesh>
            ))}
            <mesh position={[0, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]} material={materials.steelHardware} castShadow>
              <coneGeometry args={[0.035, 0.028, 24]} />
            </mesh>
            <mesh position={[0, 0, 0.002]} rotation={[Math.PI / 2, 0, 0]} material={materials.steelHardware}>
              <torusGeometry args={[0.065, 0.004, 12, 24]} />
            </mesh>
          </group>
        ))}

        {/* Central Biometric Console (Slides with Left Leaf or Fades when Unlocked) */}
        <group position={[0, 0.06, 0.11]} scale={[Math.max(0.001, 1 - openProgress * 0.95), 1, 1]}>
          <mesh material={materials.outerFrame} castShadow receiveShadow>
            <boxGeometry args={[0.22, 0.76, 0.13]} />
          </mesh>
          <mesh position={[0, 0.44, 0]} material={materials.steelHardware} castShadow>
            <cylinderGeometry args={[0.016, 0.016, 0.16, 16]} />
          </mesh>
          <mesh position={[0, -0.44, 0]} material={materials.steelHardware} castShadow>
            <cylinderGeometry args={[0.016, 0.016, 0.16, 16]} />
          </mesh>
          <mesh position={[0, 0.18, 0.06]} material={materials.darkCavity}>
            <boxGeometry args={[0.15, 0.16, 0.02]} />
          </mesh>
          <mesh position={[0, 0.18, 0.071]}>
            <planeGeometry args={[0.13, 0.14]} />
            <meshBasicMaterial map={pbr.screenTexture} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.16, 0.062]} rotation={[Math.PI / 2, 0, 0]} material={materials.scannerLens}>
            <cylinderGeometry args={[0.045, 0.045, 0.025, 32]} />
          </mesh>
          <mesh position={[0, -0.16, 0.076]}>
            <ringGeometry args={[0.032, 0.045, 32]} />
            <meshBasicMaterial color="#00E5FF" />
          </mesh>
          <pointLight
            color="#00E5FF"
            intensity={1.8 * (1 - openProgress)}
            distance={0.7}
            decay={1.0}
            position={[0, 0, 0.14]}
          />
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 3. RIGHT MECHANICAL DOOR LEAF ASSEMBLY (Retracts Right)                    */}
      {/* ========================================================================= */}
      <group position={[rightSlideX, 0, 0]}>
        {/* Right Slab */}
        <mesh
          position={[0.33, 0, 0.05]}
          material={materials.doorPlateRight}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.64, 2.18, 0.04]} />
        </mesh>

        {/* Right Turbines (Top & Bottom) */}
        {[
          [0.34, 0.68],
          [0.34, -0.68],
        ].map(([x, y], idx) => (
          <group key={`turbine-R-${idx}`} position={[x, y, 0.076]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.steelHardware} castShadow>
              <torusGeometry args={[0.13, 0.018, 16, 32]} />
            </mesh>
            <mesh position={[0, 0, -0.018]} rotation={[Math.PI / 2, 0, 0]} material={materials.darkCavity}>
              <cylinderGeometry args={[0.125, 0.125, 0.03, 32]} />
            </mesh>
            {Array.from({ length: 8 }).map((_, sIdx) => (
              <mesh
                key={`blade-R-${sIdx}`}
                rotation={[0, 0, (sIdx * Math.PI) / 4]}
                position={[0, 0, -0.004]}
                material={materials.steelHardware}
                castShadow
              >
                <boxGeometry args={[0.22, 0.016, 0.012]} />
              </mesh>
            ))}
            <mesh position={[0, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]} material={materials.steelHardware} castShadow>
              <coneGeometry args={[0.035, 0.028, 24]} />
            </mesh>
            <mesh position={[0, 0, 0.002]} rotation={[Math.PI / 2, 0, 0]} material={materials.steelHardware}>
              <torusGeometry args={[0.065, 0.004, 12, 24]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export const BlastDoorGeometry = MasterBlastDoor;
