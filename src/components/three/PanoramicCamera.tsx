import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { dampScalar, dampVec3 } from '../../lib/three/damp';

/**
 * src/components/three/PanoramicCamera.tsx
 * 
 * First-person camera controller with strict bounded exploration.
 * - Strict yaw clamp (±35°) and pitch clamp (±20°) to eliminate edge texture smearing
 * - Smooth pointer parallax when hovering without dragging
 * - Zero jump artifacts on UI clicks or pointer entering canvas
 * - Frame-rate-independent inertia & damping via damp.ts
 */

interface PanoramicCameraProps {
  /** Target world position of the camera at this node */
  targetPosition?: [number, number, number];
  /** Initial yaw angle in radians (default: 0, facing forward along -Z) */
  initialYaw?: number;
  /** Initial pitch angle in radians (default: 0, horizon level) */
  initialPitch?: number;
  /** FOV in degrees (default: 68) */
  fov?: number;
  /** Sensitivity for drag rotation (default: 0.0025) */
  dragSensitivity?: number;
  /** Sensitivity for subtle hover parallax (default: 0.08 radians) */
  hoverParallaxSpan?: number;
  /** Max yaw clamp in degrees (default: 35°) */
  maxYawDeg?: number;
  /** Max pitch clamp in degrees (default: 20°) */
  maxPitchDeg?: number;
}

export const PanoramicCamera: React.FC<PanoramicCameraProps> = ({
  targetPosition = [0, 1.65, 4.4],
  initialYaw = 0,
  initialPitch = 0,
  fov = 68,
  dragSensitivity = 0.0025,
  hoverParallaxSpan = 0.08,
  maxYawDeg = 35,
  maxPitchDeg = 20,
}) => {
  const { camera, gl } = useThree();

  const isDragging = useRef(false);
  const prevPointer = useRef({ x: 0, y: 0 });

  // Base drag yaw & pitch
  const dragYaw = useRef(initialYaw);
  const dragPitch = useRef(initialPitch);

  // Subtle pointer hover offset (-1 to 1)
  const hoverOffset = useRef({ x: 0, y: 0 });

  // Smoothed output angles
  const currentYaw = useRef(initialYaw);
  const currentPitch = useRef(initialPitch);

  const targetPos = useRef(new THREE.Vector3(...targetPosition));

  // Radians limits
  const maxYaw = (maxYawDeg * Math.PI) / 180;
  const maxPitch = (maxPitchDeg * Math.PI) / 180;

  useEffect(() => {
    targetPos.current.set(...targetPosition);
  }, [targetPosition]);

  useEffect(() => {
    if ('fov' in camera) {
      (camera as THREE.PerspectiveCamera).fov = fov;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  }, [camera, fov]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (e.target !== canvas) return;
      isDragging.current = true;
      prevPointer.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      // 1. Hover parallax (normalized -1 to 1)
      hoverOffset.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      hoverOffset.current.y = (e.clientY / window.innerHeight - 0.5) * 2;

      // 2. Drag rotation strictly clamped within ±35° yaw / ±20° pitch
      if (isDragging.current) {
        const deltaX = e.clientX - prevPointer.current.x;
        const deltaY = e.clientY - prevPointer.current.y;
        prevPointer.current = { x: e.clientX, y: e.clientY };

        dragYaw.current = THREE.MathUtils.clamp(
          dragYaw.current - deltaX * dragSensitivity,
          -maxYaw,
          maxYaw
        );

        dragPitch.current = THREE.MathUtils.clamp(
          dragPitch.current - deltaY * dragSensitivity,
          -maxPitch,
          maxPitch
        );
      }
    };

    const onWheel = (e: WheelEvent) => {
      if ('fov' in camera) {
        const pCam = camera as THREE.PerspectiveCamera;
        pCam.fov = THREE.MathUtils.clamp(pCam.fov + e.deltaY * 0.03, 34, 75);
        pCam.updateProjectionMatrix();
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [gl, dragSensitivity, camera, maxYaw, maxPitch]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // 1. Smooth Camera Position Translation (Dolly / Transition)
    dampVec3(camera.position, targetPos.current, 4.0, dt);

    // 2. Combine Drag Yaw/Pitch with subtle Hover Parallax, strictly clamped
    const targetTotalYaw = THREE.MathUtils.clamp(
      dragYaw.current - hoverOffset.current.x * hoverParallaxSpan,
      -maxYaw,
      maxYaw
    );
    const targetTotalPitch = THREE.MathUtils.clamp(
      dragPitch.current - hoverOffset.current.y * hoverParallaxSpan * 0.5,
      -maxPitch,
      maxPitch
    );

    currentYaw.current = dampScalar(currentYaw.current, targetTotalYaw, 7.0, dt);
    currentPitch.current = dampScalar(currentPitch.current, targetTotalPitch, 7.0, dt);

    // 3. Compute 3D forward vector from spherical angles
    const forward = new THREE.Vector3(
      Math.sin(currentYaw.current) * Math.cos(currentPitch.current),
      Math.sin(currentPitch.current),
      -Math.cos(currentYaw.current) * Math.cos(currentPitch.current)
    );

    const lookTarget = camera.position.clone().add(forward);
    camera.lookAt(lookTarget);
  });

  return null;
};
