import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const pathPoints = [
  new THREE.Vector3(0, 1.65, 11),   // scroll 0% — far down the dark cave
  new THREE.Vector3(0, 1.65, 6),    // scroll 50% — approaching the torch & blast door
  new THREE.Vector3(0, 1.6, 2.8),
  new THREE.Vector3(0, 1.55, 1.15), // scroll 100% — at the door biometric lock
];

const walkCurve = new THREE.CatmullRomCurve3(pathPoints);
const MAX_LOOK = 1.1; // world-units of look parallax

interface CameraRigProps {
  scrollProgress: React.MutableRefObject<number>;
}

export const CameraRig: React.FC<CameraRigProps> = ({ scrollProgress }) => {
  const { camera } = useThree();
  const pointer = useRef({ x: 0, y: 0 });
  const smoothed = useRef({ x: 0, y: 0 });

  // SYSTEM 1 — mouse/touch drives ONLY the look offset with natural damping
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useFrame(() => {
    // SYSTEM 2 — scroll drives ONLY position along the physical walk path
    const t = THREE.MathUtils.clamp(scrollProgress.current, 0, 1);
    const pos = walkCurve.getPointAt(t);
    camera.position.lerp(pos, 0.08); // small lerp factor = weighted, physical-feeling movement

    // look offset lerps toward the raw pointer position — cinematic inertia
    smoothed.current.x = THREE.MathUtils.lerp(smoothed.current.x, pointer.current.x, 0.04);
    smoothed.current.y = THREE.MathUtils.lerp(smoothed.current.y, pointer.current.y, 0.04);

    const lookAhead = walkCurve.getPointAt(Math.min(t + 0.01, 1));
    const target = lookAhead.clone();
    target.x += smoothed.current.x * MAX_LOOK;
    target.y -= smoothed.current.y * MAX_LOOK * 0.6; // less vertical range than horizontal
    camera.lookAt(target);
  });

  return null;
};
