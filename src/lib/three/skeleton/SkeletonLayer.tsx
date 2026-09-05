import React from 'react';
import * as THREE from 'three';
import { useSceneStore } from '../../../store/sceneStore';
import { SkeletonNode } from './types';
import { Interactable } from '../../../components/scene/Interactable';

/**
 * src/lib/three/skeleton/SkeletonLayer.tsx
 * 
 * Renders NOTHING visually by default (Rule 12 — no debug UI in production view).
 * Debug wireframe boxes appear ONLY when ?debug=skeleton is in the URL.
 * 
 * Each skeleton node is wrapped in <Interactable> for raycasting.
 * The skeleton is authored by hand as simple numbers — never generated from AI.
 */

interface SkeletonLayerProps {
  nodes: SkeletonNode[];
  onNodeActivate?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string, hovered: boolean) => void;
}

function SkeletonNodeMesh({ node, debug }: { node: SkeletonNode; debug: boolean }) {
  const geometry = React.useMemo(() => {
    switch (node.shape) {
      case 'box':
        return new THREE.BoxGeometry(
          node.size[0] * 2,
          node.size[1] * 2,
          node.size[2] * 2
        );
      case 'sphere':
        return new THREE.SphereGeometry(node.size[0], 12, 12);
      case 'plane':
        return new THREE.PlaneGeometry(node.size[0], node.size[1]);
      case 'capsule':
        return new THREE.CapsuleGeometry(node.size[0], node.size[1], 4, 8);
      default:
        return new THREE.BoxGeometry(
          node.size[0] * 2,
          node.size[1] * 2,
          node.size[2] * 2
        );
    }
  }, [node.shape, node.size]);

  return (
    <mesh
      position={[0, 0, 0]}
      visible={true}
      name={`skeleton-${node.id}`}
      geometry={geometry}
    >
      <meshBasicMaterial
        wireframe={debug}
        color="#4ce0ff"
        transparent
        opacity={debug ? 0.4 : 0.0}
        depthTest={false}
      />
    </mesh>
  );
}

export const SkeletonLayer: React.FC<SkeletonLayerProps> = ({
  nodes,
  onNodeActivate,
  onNodeHover,
}) => {
  const debug = useSceneStore((s) => s.debugSkeletonVisible);

  return (
    <>
      {nodes.map((node) => (
        <Interactable
          key={node.id}
          id={node.id}
          accessTier={node.accessTier ?? 'public'}
          position={node.position}
          onActivate={() => onNodeActivate?.(node.id)}
          onHoverChange={(h) => onNodeHover?.(node.id, h)}
        >
          <SkeletonNodeMesh node={node} debug={debug} />
        </Interactable>
      ))}
    </>
  );
};
