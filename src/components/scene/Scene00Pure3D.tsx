import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { buildDepthMesh } from '../../lib/three/depthMesh';
import {
  createCaveTunnelGeometry,
  loadRockMaterial,
} from '../../lib/three/proceduralRockCavern';

/**
 * src/components/scene/Scene00Pure3D.tsx
 * 
 * Complete 100% Enclosing 3D Subterranean Cavern & Photoreal Hero Blast Door.
 * - 100% Viewport coverage with contiguous 3D rock cavern walls and ceiling arch
 * - Real 3D depth-displaced hero blast door portal (Technique C)
 * - Dual-spectrum Chiaroscuro lighting (Amber grazing key + Slate-cyan fill)
 * - Smooth 3D spatial traversal with authentic perspective parallax (60-120 FPS)
 */

const START_POS = new THREE.Vector3(0, 1.40, 5.60);
const ARRIVED_POS = new THREE.Vector3(0, 1.36, 1.65);
const LOOK_AT_TARGET = new THREE.Vector3(0, 1.36, 0.0);

interface Scene00Pure3DProps {
  onArrived?: () => void;
  onPointerStateChange?: (state: 'default' | 'door-hover') => void;
}

export const Scene00Pure3D: React.FC<Scene00Pure3DProps> = ({
  onArrived,
  onPointerStateChange,
}) => {
  const { camera, gl } = useThree();
  const [doorMesh, setDoorMesh] = useState<THREE.Mesh | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [isDollying, setIsDollying] = useState(false);

  const scrollProgress = useRef(0);
  const mouseLookRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // 1. Build the Photoreal 3D Hero Blast Door Portal (Technique C)
  useEffect(() => {
    let isMounted = true;

    buildDepthMesh({
      colorMapUrl: '/textures/scene-00-color.webp',
      depthMapUrl: '/textures/scene-00-depth.webp',
      width: 5.76,
      height: 10.24,
      segments: 220,
      depthScale: 2.2,
      invertDepth: false,
    })
      .then((mesh) => {
        if (isMounted) {
          mesh.position.set(0, 1.36, 0.0);
          setDoorMesh(mesh);
        }
      })
      .catch((err) => console.error('Error building door depth mesh:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Continuous 3D Cavern Tunnel Geometry & Rock PBR Material
  const { tunnelGeom, rockMaterial, rearDomeGeom } = useMemo(() => {
    const cGeom = createCaveTunnelGeometry();
    const mat = loadRockMaterial();

    const domeGeom = new THREE.SphereGeometry(16, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
    domeGeom.scale(-1, 1, 1);
    domeGeom.translate(0, 1.36, 4.0);

    return { tunnelGeom: cGeom, rockMaterial: mat, rearDomeGeom: domeGeom };
  }, []);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.35;

    if ('fov' in camera) {
      (camera as THREE.PerspectiveCamera).fov = 44;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }

    camera.position.copy(START_POS);
    camera.lookAt(LOOK_AT_TARGET);

    // Wheel Scroll to walk forward/backward down the tunnel
    const onWheel = (e: WheelEvent) => {
      if (isDollying) return;
      scrollProgress.current = THREE.MathUtils.clamp(
        scrollProgress.current + e.deltaY * 0.0008,
        0,
        1
      );
      if (scrollProgress.current >= 0.95 && !hasArrived) {
        setHasArrived(true);
        onArrived?.();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [camera, gl, hasArrived, isDollying, onArrived]);

  const handleDoorClick = () => {
    if (isDollying || hasArrived) return;
    setIsDollying(true);

    gsap.to(camera.position, {
      x: ARRIVED_POS.x,
      y: ARRIVED_POS.y,
      z: ARRIVED_POS.z,
      duration: 2.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(LOOK_AT_TARGET);
      },
      onComplete: () => {
        setIsDollying(false);
        setHasArrived(true);
        scrollProgress.current = 1.0;
        onArrived?.();
      },
    });
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);

    // 1. Scroll-Driven 3D Translation along tunnel
    if (!isDollying) {
      const targetPos = new THREE.Vector3().lerpVectors(
        START_POS,
        ARRIVED_POS,
        scrollProgress.current
      );
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.x, 6.0, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.y, 6.0, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.z, 6.0, dt);
    }

    // 2. Clamped Pointer Look Parallax (True 3D depth perception)
    const pointer = state.pointer;
    mouseLookRef.current.targetX = pointer.x * THREE.MathUtils.degToRad(8);
    mouseLookRef.current.targetY = pointer.y * THREE.MathUtils.degToRad(5);

    mouseLookRef.current.x = THREE.MathUtils.damp(
      mouseLookRef.current.x,
      mouseLookRef.current.targetX,
      6.0,
      dt
    );
    mouseLookRef.current.y = THREE.MathUtils.damp(
      mouseLookRef.current.y,
      mouseLookRef.current.targetY,
      6.0,
      dt
    );

    const lookTarget = LOOK_AT_TARGET.clone().add(
      new THREE.Vector3(
        mouseLookRef.current.x * 1.4,
        mouseLookRef.current.y * 0.9,
        0
      )
    );
    camera.lookAt(lookTarget);
  });

  return (
    <group>
      {/* 1. Mandatory IBL Environment for Metallic Reflections */}
      <Environment preset="city" environmentIntensity={0.55} />

      {/* 2. Photoreal 3D Hero Blast Door Portal (Technique C Depth-Displaced) */}
      {doorMesh && (
        <primitive
          object={doorMesh}
          onClick={handleDoorClick}
          onPointerOver={() => onPointerStateChange?.('door-hover')}
          onPointerOut={() => onPointerStateChange?.('default')}
        />
      )}

      {/* 3. Enclosing 3D Cavern Tunnel Hull */}
      <mesh
        geometry={tunnelGeom}
        material={rockMaterial}
        frustumCulled={false}
        position={[0, 0, 0]}
      />

      {/* 4. Enclosing Subterranean Cavern Vault */}
      <mesh
        geometry={rearDomeGeom}
        material={rockMaterial}
        frustumCulled={false}
      />

      {/* 5. Dual-Spectrum Chiaroscuro Atmospheric Scene Lighting */}
      <ambientLight color="#18120E" intensity={0.95} />

      {/* Left Amber Grazing Key Light (Sharp Specular Edge Rake across Rock & Armor) */}
      <spotLight
        position={[-4.8, 3.2, 4.2]}
        target-position={[-0.8, 1.36, 0.0]}
        color="#FFA030"
        intensity={18.0}
        angle={0.65}
        penumbra={0.7}
        distance={20.0}
      />

      {/* Right Slate-Cyan Subterranean Fill */}
      <spotLight
        position={[4.8, 2.8, 4.2]}
        target-position={[0.8, 1.36, 0.0]}
        color="#2E4A62"
        intensity={12.0}
        angle={0.7}
        penumbra={0.8}
        distance={20.0}
      />

      {/* Center Console Cyan Emissive Accent Point */}
      <pointLight
        position={[0, 1.36, 0.4]}
        color="#00E5FF"
        intensity={2.8}
        distance={3.5}
      />
    </group>
  );
};
