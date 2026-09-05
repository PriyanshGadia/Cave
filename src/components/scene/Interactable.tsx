import React, { useRef, useState, useCallback } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

export interface InteractableProps {
  id: string;
  accessTier?: 'public' | 'limited' | 'verified';
  children: React.ReactNode;
  onActivate?: () => void;
  onHoverChange?: (hovered: boolean) => void;
  disabled?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}

/**
 * Reusable <Interactable> wrapper for 3D objects per project rules.
 * Handles R3F raycasting, hover state transitions, and cursor feedback without
 * interfering with camera navigation channels.
 */
export const Interactable: React.FC<InteractableProps> = ({
  id,
  accessTier = 'public',
  children,
  onActivate,
  onHoverChange,
  disabled = false,
  position,
  rotation,
  scale,
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (disabled) return;
      e.stopPropagation();
      setHovered(true);
      document.body.style.cursor = 'pointer';
      if (onHoverChange) onHoverChange(true);
    },
    [disabled, onHoverChange]
  );

  const handlePointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(false);
      document.body.style.cursor = 'default';
      if (onHoverChange) onHoverChange(false);
    },
    [onHoverChange]
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (disabled) return;
      e.stopPropagation();
      if (onActivate) {
        onActivate();
      }
    },
    [disabled, onActivate]
  );

  return (
    <group
      ref={groupRef}
      name={`interactable-${id}`}
      userData={{ id, accessTier, hovered, disabled }}
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {children}
    </group>
  );
};
