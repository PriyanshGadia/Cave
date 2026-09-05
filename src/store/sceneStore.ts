import { create } from 'zustand';
import { VisitorTier } from '../types';

/**
 * src/store/sceneStore.ts
 * Central state for the entire 3D experience.
 * Zustand — no Provider needed, just import and use.
 */

export type SceneId =
  | 'SC00_APPROACH'
  | 'SC01_PANEL'
  | 'SC02_THRESHOLD'
  | 'SC03_DARKROOM'
  | 'SC04_MAPPING'
  | 'SC05_ENTITY'
  | 'SC06_ACTIVE'
  | 'SC07_ORBIT';

export type ScenePhase = 'cinematic' | 'orbit';

export type DoorState = 'closed' | 'approaching' | 'unlocking' | 'open';

interface SceneStore {
  // --- Scene navigation ---
  currentScene: SceneId;
  scenePhase: ScenePhase;
  scrollProgress: number; // 0–1 within current scene's rail
  setScene: (scene: SceneId) => void;
  setScenePhase: (phase: ScenePhase) => void;
  setScrollProgress: (progress: number) => void;

  // --- Door ---
  doorState: DoorState;
  setDoorState: (state: DoorState) => void;

  // --- Visitor ---
  visitorTier: VisitorTier;
  setVisitorTier: (tier: VisitorTier) => void;

  // --- Debug ---
  debugSkeletonVisible: boolean;
  setDebugSkeletonVisible: (visible: boolean) => void;

  // --- Transition lock ---
  isTransitioning: boolean;
  setIsTransitioning: (transitioning: boolean) => void;
}

const getInitialScene = (): SceneId => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('scene');
    if (s === 'SC01_PANEL' || s === '01' || s === 'SC01') return 'SC01_PANEL';
    if (s === 'SC02_THRESHOLD' || s === '02' || s === 'SC02') return 'SC02_THRESHOLD';
    if (s === 'SC03_DARKROOM' || s === '03' || s === 'SC03') return 'SC03_DARKROOM';
    if (s === 'SC04_MAPPING' || s === '04' || s === 'SC04') return 'SC04_MAPPING';
    if (s === 'SC06_ACTIVE' || s === '06' || s === 'SC06') return 'SC06_ACTIVE';
  }
  return 'SC00_APPROACH';
};

export const useSceneStore = create<SceneStore>((set) => ({
  // Scene navigation
  currentScene: getInitialScene(),
  scenePhase: 'cinematic',
  scrollProgress: 0,
  setScene: (scene) => set({ currentScene: scene }),
  setScenePhase: (phase) => set({ scenePhase: phase }),
  setScrollProgress: (progress) => set({ scrollProgress: progress }),

  // Door
  doorState: 'closed',
  setDoorState: (state) => set({ doorState: state }),

  // Visitor
  visitorTier: 0,
  setVisitorTier: (tier) => set({ visitorTier: tier }),

  // Debug — initialized from URL params in App.tsx
  debugSkeletonVisible: false,
  setDebugSkeletonVisible: (visible) => set({ debugSkeletonVisible: visible }),

  // Transition lock — prevents double-triggering during animated transitions
  isTransitioning: false,
  setIsTransitioning: (transitioning) => set({ isTransitioning: transitioning }),
}));
