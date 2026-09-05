import React from 'react';
import { useSceneStore, SceneId } from '../../store/sceneStore';

/**
 * src/components/layout/WorkshopHUD.tsx
 * 
 * Minimal cinematic HUD overlay providing scene context, look-around guidance,
 * and quick scene jump controls (for testing and direct navigation).
 */

const SCENE_NAMES: { id: SceneId; label: string }[] = [
  { id: 'SC00_APPROACH', label: '00 Approach' },
  { id: 'SC01_PANEL', label: '01 Panel' },
  { id: 'SC03_DARKROOM', label: '03 Darkroom' },
  { id: 'SC05_ENTITY', label: '05 AI Entity' },
  { id: 'SC06_ACTIVE', label: '06 Active Workshop' },
];

export const WorkshopHUD: React.FC = () => {
  const currentScene = useSceneStore((s) => s.currentScene);
  const setScene = useSceneStore((s) => s.setScene);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 32px',
        boxSizing: 'border-box',
        color: '#e0d8cc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        userSelect: 'none',
      }}
    >
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left: Branding & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#00e5ff',
              boxShadow: '0 0 10px #00e5ff',
            }}
          />
          <div>
            <div style={{ fontSize: '12px', letterSpacing: '2px', color: '#00e5ff', fontWeight: 600 }}>
              THE WORKSHOP // SEC-00
            </div>
            <div style={{ fontSize: '10px', letterSpacing: '1px', color: '#8c7d70', marginTop: '2px' }}>
              FIRST-PERSON 360° RECONSTRUCTION
            </div>
          </div>
        </div>

        {/* Right: Quick Node Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            pointerEvents: 'auto',
            background: 'rgba(10, 8, 6, 0.75)',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 160, 48, 0.25)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {SCENE_NAMES.map((node) => {
            const isActive = currentScene === node.id;
            return (
              <button
                key={node.id}
                onClick={() => setScene(node.id)}
                style={{
                  background: isActive ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  border: isActive ? '1px solid #00e5ff' : '1px solid transparent',
                  color: isActive ? '#00e5ff' : '#9c8c7c',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  letterSpacing: '1px',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {node.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Center: Interaction & Look-Around Prompts */}
      <div
        style={{
          alignSelf: 'center',
          textAlign: 'center',
          background: 'rgba(12, 9, 7, 0.82)',
          padding: '10px 24px',
          borderRadius: '24px',
          border: '1px solid rgba(0, 229, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ fontSize: '13px', letterSpacing: '1px', color: '#ffffff', fontWeight: 500 }}>
          {currentScene === 'SC00_APPROACH' && '🖱️ Click & Drag to Look 360° • Click Center Portal to Approach Door'}
          {currentScene === 'SC01_PANEL' && '🔐 Biometric Terminal • Click Verify or Guest Entry to Unlock Facility'}
          {currentScene === 'SC03_DARKROOM' && '⚡ Subterranean Chamber • Click Central Table to Awaken Workshop'}
          {currentScene === 'SC05_ENTITY' && '✨ AI Intelligence Core • Click Core to Power On Workshop Systems'}
          {(currentScene === 'SC06_ACTIVE' || currentScene === 'SC07_ORBIT') &&
            '🛠️ Active Workshop • Drag 360° to Explore Engineering Sectors'}
        </div>
      </div>
    </div>
  );
};
