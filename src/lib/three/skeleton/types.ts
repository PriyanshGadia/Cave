/**
 * src/lib/three/skeleton/types.ts
 * Type definitions for the invisible collision proxy system.
 * 
 * The skeleton is a set of simple, invisible 3D volumes that the raycaster
 * and hover-highlighter target. They never render visually (unless ?debug=skeleton).
 * The visual mesh and the collision mesh are always separate — standard game-dev practice.
 */

export type ProxyShape = 'box' | 'sphere' | 'capsule' | 'plane';

export type ProxyPurpose =
  | 'interact'     // Door, panel buttons, sticky notes — the actual click/hover hitbox
  | 'hover-zone'   // Larger region around sectors for scroll-orbit proximity
  | 'nav-blocker'  // Invisible planes at cave walls — guards camera look-clamp
  | 'snap-point';  // Fixed anchor positions on workbench for object placement

export interface SkeletonNode {
  /** Must match the visual Interactable's config.id */
  id: string;
  /** Which scene this node belongs to */
  sceneId: string;
  /** The shape of the collision proxy */
  shape: ProxyShape;
  /** World-space position [x, y, z] */
  position: [number, number, number];
  /** 
   * Dimensions — interpretation depends on shape:
   * box: [halfWidth, halfHeight, halfDepth]
   * sphere: [radius, 0, 0]
   * capsule: [radius, height, 0]
   * plane: [width, height, 0]
   */
  size: [number, number, number];
  /** What this proxy is used for */
  purpose: ProxyPurpose;
  /** Access tier required to interact (default: 'public') */
  accessTier?: 'public' | 'limited' | 'verified';
  /** Optional label for debug display */
  label?: string;
}

/**
 * Scene-level skeleton definition.
 * Every scene defines its skeleton nodes in a flat array.
 */
export interface SceneSkeleton {
  sceneId: string;
  nodes: SkeletonNode[];
}
