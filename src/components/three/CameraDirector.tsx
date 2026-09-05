import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { dampVec3, dampScalar } from '../../lib/three/damp';
import { useSceneStore } from '../../store/sceneStore';

/**
 * src/components/three/CameraDirector.tsx
 * 
 * The ONLY component that may move the camera.
 * Three decoupled systems (AGENTS.md Rule 3):
 *   1. RAIL/DOLLY — position along an authored path with organic breathing sway
 *   2. LOOK       — clamped yaw/pitch offset from pointer input
 *   3. RAYCAST    — handled by Interactable children, not by this component
 * 
 * Uses damp.ts for all interpolation — never a raw lerp.
 */

export interface CameraRailConfig {
  /** Authored path for camera dolly. If null, camera is stationary (STATIC mode). */
  path: THREE.CatmullRomCurve3 | null;
  /** The point the camera looks toward (base, before look offset) */
  lookTarget: THREE.Vector3;
  /** Camera field of view */
  fov: number;
}

export interface CameraLookClamp {
  /** Max yaw in degrees (e.g. 35 means ±35° horizontal) */
  maxYawDeg: number;
  /** Max pitch in degrees (e.g. 20 means ±20° vertical) */
  maxPitchDeg: number;
}

interface CameraDirectorProps {
  /** Rail configuration for this scene */
  rail: CameraRailConfig;
  /** Look clamp bounds for this scene */
  lookClamp?: CameraLookClamp;
  /** Damping factor for position interpolation (higher = snappier) */
  positionDamping?: number;
  /** Damping factor for look interpolation */
  lookDamping?: number;
  /** Whether camera motion is driven by scrollProgress (true) or by GSAP (false) */
  scrollDriven?: boolean;
  /** Optional override position for GSAP-driven transitions */
  overridePosition?: THREE.Vector3 | null;
  /** Enable organic steadicam breathing sway (Layer 4) */
  enableBreathing?: boolean;
}

export const CameraDirector: React.FC<CameraDirectorProps> = ({
  rail,
  lookClamp = { maxYawDeg: 35, maxPitchDeg: 20 },
  positionDamping = 5.0,
  lookDamping = 4.0,
  scrollDriven = false,
  overridePosition = null,
  enableBreathing = true,
}) => {
  const { camera } = useThree();
  const pointer = useRef({ x: 0, y: 0 });
  const smoothedLook = useRef({ x: 0, y: 0 });
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const basePos = useRef(new THREE.Vector3());

  const scrollProgress = useSceneStore((s) => s.scrollProgress);

  // Compute max look offset in world units from degrees
  const maxLookX = Math.tan((lookClamp.maxYawDeg * Math.PI) / 180) * 2.0;
  const maxLookY = Math.tan((lookClamp.maxPitchDeg * Math.PI) / 180) * 1.5;

  // CHANNEL 2 — Pointer/Touch drives ONLY clamped look offset
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      // Normalize to -1..1
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  useFrame((state, delta) => {
    // Clamp delta to prevent huge jumps on tab-back
    const dt = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;

    // --- CHANNEL 1: Position ---
    if (overridePosition) {
      // GSAP-driven transition — position is externally controlled
      basePos.current.copy(overridePosition);
    } else if (rail.path && scrollDriven) {
      // Scroll-driven rail
      const scrollT = THREE.MathUtils.clamp(scrollProgress, 0, 1);
      rail.path.getPointAt(scrollT, basePos.current);
    } else if (rail.path) {
      // Non-scroll rail — position at start of path
      rail.path.getPointAt(0, basePos.current);
    } else {
      // Default to current camera position as base if no rail
      basePos.current.copy(camera.position);
    }

    targetPos.current.copy(basePos.current);

    // Layer 4: Organic Steadicam Breathing Sway (Continuous Head-Sway)
    if (enableBreathing) {
      const breathingX = Math.sin(t * 0.45) * 0.016 + Math.sin(t * 0.9) * 0.008;
      const breathingY = Math.cos(t * 0.35) * 0.012;
      targetPos.current.x += breathingX;
      targetPos.current.y += breathingY;
    }

    dampVec3(camera.position, targetPos.current, positionDamping, dt);

    // --- CHANNEL 2: Look ---
    smoothedLook.current.x = dampScalar(
      smoothedLook.current.x,
      pointer.current.x,
      lookDamping,
      dt
    );
    smoothedLook.current.y = dampScalar(
      smoothedLook.current.y,
      pointer.current.y,
      lookDamping,
      dt
    );

    // Apply clamped look offset to the base look target
    targetLook.current.set(
      rail.lookTarget.x + smoothedLook.current.x * maxLookX,
      rail.lookTarget.y - smoothedLook.current.y * maxLookY,
      rail.lookTarget.z
    );

    camera.lookAt(targetLook.current);

    // Update FOV if changed
    if ((camera as THREE.PerspectiveCamera).fov !== rail.fov) {
      (camera as THREE.PerspectiveCamera).fov = dampScalar(
        (camera as THREE.PerspectiveCamera).fov,
        rail.fov,
        3.0,
        dt
      );
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  });

  return null; // CameraDirector renders nothing — it only controls the camera
};
