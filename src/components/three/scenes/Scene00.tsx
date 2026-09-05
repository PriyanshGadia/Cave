import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

import { SkeletonLayer } from '../../../lib/three/skeleton/SkeletonLayer';
import { SkeletonNode } from '../../../lib/three/skeleton/types';
import { useSceneStore } from '../../../store/sceneStore';
import { DoorHero } from '../../scene/DoorHero';
import { AtmosphericParticles } from '../AtmosphericParticles';
import {
  createCaveTunnelGeometry,
  loadRockMaterial,
} from '../../../lib/three/proceduralRockCavern';

// =============================================================================
// SC00 CAMERA STAGING & POSITIONS (per Scene Bible & AGENTS.md)
// =============================================================================

export const SC00_START_POS = new THREE.Vector3(0, 1.40, 4.40);
export const SC00_ARRIVED_POS = new THREE.Vector3(0, 1.36, 1.45);
export const SC00_LOOK_TARGET = new THREE.Vector3(0, 1.36, 0.0);

// =============================================================================
// SKELETON COLLISION NODES (Invisible Raycast Proxies)
// =============================================================================

const SC00_SKELETON: SkeletonNode[] = [
  {
    id: 'door-00',
    sceneId: 'SC00_APPROACH',
    shape: 'box',
    position: [0, 1.36, 0.0],
    size: [1.6, 1.65, 0.25],
    purpose: 'interact',
    label: 'Master Blast Door',
  },
  {
    id: 'tunnel-wall-L',
    sceneId: 'SC00_APPROACH',
    shape: 'plane',
    position: [-2.4, 1.5, 2.0],
    size: [0.1, 3.5, 0],
    purpose: 'nav-blocker',
    label: 'Left Cave Rock',
  },
  {
    id: 'tunnel-wall-R',
    sceneId: 'SC00_APPROACH',
    shape: 'plane',
    position: [2.4, 1.5, 2.0],
    size: [0.1, 3.5, 0],
    purpose: 'nav-blocker',
    label: 'Right Cave Rock',
  },
];

// =============================================================================
// LIGHTING RIG (Chiaroscuro Dual-Spectrum Rake)
// =============================================================================

const SC00LightingRig: React.FC = () => {
  const amberTarget = useRef(new THREE.Object3D());
  const slateTarget = useRef(new THREE.Object3D());
  const centerTarget = useRef(new THREE.Object3D());
  const floorTarget = useRef(new THREE.Object3D());

  const leftSpotRef = useRef<THREE.SpotLight>(null);
  const rightSpotRef = useRef<THREE.SpotLight>(null);
  const floorSpotRef = useRef<THREE.SpotLight>(null);

  useEffect(() => {
    amberTarget.current.position.set(-0.65, 1.25, 0.0);
    amberTarget.current.updateMatrixWorld(true);
    slateTarget.current.position.set(0.65, 1.25, 0.0);
    slateTarget.current.updateMatrixWorld(true);
    centerTarget.current.position.set(0.0, 1.35, 0.0);
    centerTarget.current.updateMatrixWorld(true);
    floorTarget.current.position.set(0.0, -0.05, 1.0);
    floorTarget.current.updateMatrixWorld(true);

    if (leftSpotRef.current) leftSpotRef.current.target = amberTarget.current;
    if (rightSpotRef.current) rightSpotRef.current.target = slateTarget.current;
    if (floorSpotRef.current) floorSpotRef.current.target = floorTarget.current;
  }, []);

  useFrame(() => {
    amberTarget.current.position.set(-0.65, 1.25, 0.0);
    amberTarget.current.updateMatrixWorld(true);
    slateTarget.current.position.set(0.65, 1.25, 0.0);
    slateTarget.current.updateMatrixWorld(true);
    centerTarget.current.position.set(0.0, 1.35, 0.0);
    centerTarget.current.updateMatrixWorld(true);
    floorTarget.current.position.set(0.0, -0.05, 1.0);
    floorTarget.current.updateMatrixWorld(true);
  });

  return (
    <>
      <primitive object={amberTarget.current} />
      <primitive object={slateTarget.current} />
      <primitive object={centerTarget.current} />
      <primitive object={floorTarget.current} />

      {/* 1. Left Warm Subterranean Key Light */}
      <spotLight
        ref={leftSpotRef}
        position={[-1.6, 2.2, 3.2]}
        target={centerTarget.current}
        color="#D4A875"
        intensity={18.0}
        angle={0.50}
        penumbra={0.60}
        decay={1.4}
        distance={12.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0008}
      />
      <directionalLight
        position={[-1.8, 2.5, 3.0]}
        target={centerTarget.current}
        color="#C89660"
        intensity={6.5}
      />

      {/* 2. Right Slate-Cyan Industrial Fill */}
      <spotLight
        ref={rightSpotRef}
        position={[1.6, 2.0, 3.2]}
        target={centerTarget.current}
        color="#457090"
        intensity={14.0}
        angle={0.55}
        penumbra={0.65}
        decay={1.4}
        distance={12.0}
      />
      <directionalLight
        position={[2.0, 2.2, 3.0]}
        target={centerTarget.current}
        color="#325068"
        intensity={5.0}
      />

      {/* 3. Frontal Gunmetal Cavity Rim */}
      <directionalLight
        position={[0.0, 1.8, 4.2]}
        target={centerTarget.current}
        color="#50453D"
        intensity={4.0}
      />

      {/* 4. Floor Grazing Spot */}
      <spotLight
        ref={floorSpotRef}
        position={[0.0, 0.40, 2.80]}
        target={floorTarget.current}
        color="#4A3420"
        intensity={6.0}
        angle={0.85}
        penumbra={0.90}
        decay={1.6}
        distance={7.0}
      />

      {/* 5. Ambient Bases */}
      <ambientLight color="#181410" intensity={0.80} />
      <hemisphereLight
        color="#282018"
        groundColor="#080706"
        intensity={0.50}
      />
    </>
  );
};

// =============================================================================
// MAIN SCENE 00 COMPONENT
// =============================================================================

interface Scene00Props {
  onArrived?: () => void;
  onPointerStateChange?: (state: 'default' | 'door-hover' | 'scanning') => void;
}

export const Scene00: React.FC<Scene00Props> = ({
  onArrived,
  onPointerStateChange,
}) => {
  const { camera, gl } = useThree();
  const [hasArrived, setHasArrived] = useState(false);
  const [isDollying, setIsDollying] = useState(false);

  const setDoorState = useSceneStore((s) => s.setDoorState);
  const setIsTransitioning = useSceneStore((s) => s.setIsTransitioning);

  // 1. Procedural Vertical-Fault Rock Cavern Geometry
  const { caveGeom, rockMaterial } = useMemo(() => {
    const cGeom = createCaveTunnelGeometry();
    const mat = loadRockMaterial();
    return { caveGeom: cGeom, rockMaterial: mat };
  }, []);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.80;

    if ('fov' in camera) {
      (camera as THREE.PerspectiveCamera).fov = 34;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
    camera.position.copy(SC00_START_POS);
    camera.lookAt(SC00_LOOK_TARGET);
  }, [camera, gl]);

  // Click on Door triggers T00 Dolly Transition to the Door Face
  const handleDoorActivate = useCallback(() => {
    if (isDollying || hasArrived) return;
    setIsDollying(true);
    setIsTransitioning(true);
    setDoorState('approaching');

    gsap.to(camera.position, {
      x: SC00_ARRIVED_POS.x,
      y: SC00_ARRIVED_POS.y,
      z: SC00_ARRIVED_POS.z,
      duration: 3.0,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(SC00_LOOK_TARGET);
      },
      onComplete: () => {
        setIsDollying(false);
        setHasArrived(true);
        setIsTransitioning(false);
        onArrived?.();
      },
    });
  }, [isDollying, hasArrived, camera, setIsTransitioning, setDoorState, onArrived]);

  const handleHoverChange = useCallback((hovered: boolean) => {
    onPointerStateChange?.(hovered ? 'door-hover' : 'default');
  }, [onPointerStateChange]);

  return (
    <group>
      {/* 1. Mandatory IBL Environment Map for Metallic PBR Gleam */}
      <Environment preset="city" environmentIntensity={0.55} />

      {/* 2. Real 3D Tectonic Vertical Fault Rock Cavern Tunnel Hull */}
      <mesh
        geometry={caveGeom}
        material={rockMaterial}
        frustumCulled={false}
        receiveShadow
      />

      {/* 3. Real 3D Hero Blast Door Assembly */}
      <group position={[0, 1.36, 0.0]}>
        <mesh
          position={[0, 0, 0.1]}
          onClick={handleDoorActivate}
          onPointerOver={() => handleHoverChange(true)}
          onPointerOut={() => handleHoverChange(false)}
        >
          <planeGeometry args={[2.5, 3.0]} />
          <meshBasicMaterial transparent opacity={0.0} />
        </mesh>
        <DoorHero
          onClick={handleDoorActivate}
          onHoverChange={handleHoverChange}
        />
      </group>

      {/* 4. Dual-Spectrum Chiaroscuro Lighting Rig */}
      <SC00LightingRig />

      {/* 5. Layer 3: GPU Instanced Atmospheric Dust Motes */}
      <AtmosphericParticles count={140} />

      {/* 6. Invisible Raycast Interaction Layer (Rule 12) */}
      <SkeletonLayer
        nodes={SC00_SKELETON}
        onNodeActivate={(id) => {
          if (id === 'door-00') handleDoorActivate();
        }}
        onNodeHover={(id, hovered) => {
          if (id === 'door-00') handleHoverChange(hovered);
        }}
      />
    </group>
  );
};
