// src/components/scene/DoorHero.tsx
//
// THIS IS THE ONLY FILE ALLOWED TO DEFINE THE INTERACTIVE DOOR (Rule 18).
// It renders real 3D modeled geometry via MasterBlastDoor composite hierarchy.
import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { MasterBlastDoor } from "./BlastDoorGeometry";

interface DoorHeroProps {
  onActivate?: () => void;
  onClick?: () => void;
  onHoverChange?: (hovered: boolean) => void;
  position?: [number, number, number];
  openProgress?: number;
}

export const DoorHero: React.FC<DoorHeroProps> = ({
  onActivate,
  onClick,
  onHoverChange,
  position = [0, 0, 0],
  openProgress = 0.0,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    onHoverChange?.(hovered);
  }, [hovered, onHoverChange]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick?.();
    onActivate?.();
  };

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <MasterBlastDoor openProgress={openProgress} />
    </group>
  );
};
