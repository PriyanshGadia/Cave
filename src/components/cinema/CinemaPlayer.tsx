import React, { useState } from 'react';
import { Node00Approach } from './Node00Approach';
import { Node01BiometricPanel } from './Node01BiometricPanel';
import { soundFx } from '../../utils/audio';

type CinemaState =
  | 'node_00_approach'
  | 'trans_00_to_01'
  | 'node_01_panel'
  | 'trans_01_door_open'
  | 'node_02_workshop';

export const CinemaPlayer: React.FC = () => {
  const [currentState, setCurrentState] = useState<CinemaState>('node_00_approach');
  const [transitionProgress, setTransitionProgress] = useState(0);

  // Transition T00: Walk up to the Blast Door
  const handleWalkToDoor = () => {
    soundFx.playScannerSweep();
    setCurrentState('trans_00_to_01');
    setTransitionProgress(0);

    // Smooth First-Person Dolly Push
    const startTime = performance.now();
    const duration = 1800; // 1.8s smooth cinematic dolly

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth easeInOutQuad
      const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      setTransitionProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCurrentState('node_01_panel');
      }
    };

    requestAnimationFrame(step);
  };

  // Transition T01: Door Breach / Mechanical Unlocking
  const handleDoorUnlock = () => {
    soundFx.playDoorRumble();
    setCurrentState('trans_01_door_open');

    // Mechanical unsealing sequence (2.2s)
    setTimeout(() => {
      soundFx.playAccessGranted();
      setCurrentState('node_02_workshop');
    }, 2200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#020406',
      }}
    >
      {/* 1. NODE 00: CAVERN APPROACH */}
      {currentState === 'node_00_approach' && (
        <Node00Approach onWalkForward={handleWalkToDoor} />
      )}

      {/* 2. TRANSITION T00: FIRST-PERSON WALK-UP DOLLY */}
      {currentState === 'trans_00_to_01' && (
        <div
          style={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            background: '#040608',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '120%',
              height: '120%',
              backgroundImage: 'url(/assets/cave_blast_door_exterior.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `scale(${1.0 + transitionProgress * 0.75}) translate3d(0, ${transitionProgress * -20}px, 0)`,
              filter: `brightness(${1.0 - transitionProgress * 0.1}) contrast(${1.0 + transitionProgress * 0.15})`,
              willChange: 'transform',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'radial-gradient(circle at center, transparent 40%, rgba(2, 4, 8, 0.9) 100%)',
            }}
          />
        </div>
      )}

      {/* 3. NODE 01: BIOMETRIC SECURITY MATRIX PANEL */}
      {currentState === 'node_01_panel' && (
        <Node01BiometricPanel
          onDoorUnlock={handleDoorUnlock}
          onStepBack={() => setCurrentState('node_00_approach')}
        />
      )}

      {/* 4. TRANSITION T01: MECHANICAL DOOR BREACH */}
      {currentState === 'trans_01_door_open' && (
        <div
          style={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Background Darkness & Distant Cyan Core */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, rgba(0, 243, 255, 0.15) 0%, #020406 70%)',
            }}
          />

          {/* Parting Blast Door Slabs Animation */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '50vw',
              height: '100vh',
              backgroundImage: 'url(/assets/cave_blast_door_exterior.jpg)',
              backgroundSize: '200vw 100vh',
              backgroundPosition: 'left center',
              animation: 'doorSlideLeft 2s cubic-bezier(0.77, 0, 0.175, 1) forwards',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '50vw',
              height: '100vh',
              backgroundImage: 'url(/assets/cave_blast_door_exterior.jpg)',
              backgroundSize: '200vw 100vh',
              backgroundPosition: 'right center',
              animation: 'doorSlideRight 2s cubic-bezier(0.77, 0, 0.175, 1) forwards',
            }}
          />

          <div
            style={{
              position: 'absolute',
              fontFamily: 'var(--font-telemetry, monospace)',
              fontSize: '1rem',
              letterSpacing: '0.2em',
              color: '#00f3ff',
              textShadow: '0 0 16px #00f3ff',
              zIndex: 20,
            }}
          >
            DISENGAGING HYDRAULIC LOCKS...
          </div>
        </div>
      )}

      {/* 5. NODE 02: ACTIVE WORKSHOP & HOLO-TABLE REVEAL */}
      {currentState === 'node_02_workshop' && (
        <div
          style={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            background: '#040810',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 50% 60%, rgba(0, 243, 255, 0.18) 0%, rgba(2, 6, 12, 0.95) 75%)',
            }}
          />

          <div
            style={{
              position: 'relative',
              textAlign: 'center',
              zIndex: 10,
              padding: '32px',
              background: 'rgba(6, 12, 20, 0.85)',
              borderRadius: '12px',
              border: '1px solid rgba(0, 243, 255, 0.35)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 0 40px rgba(0, 243, 255, 0.15)',
              maxWidth: '600px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-telemetry, monospace)',
                fontSize: '0.8rem',
                letterSpacing: '0.25em',
                color: '#ff9e2c',
                marginBottom: '12px',
              }}
            >
              SECURITY ACCESS // LEVEL 4 GRANTED
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-header, sans-serif)',
                fontSize: '2rem',
                letterSpacing: '0.12em',
                color: '#fff',
                margin: '0 0 16px 0',
                textShadow: '0 0 20px rgba(0, 243, 255, 0.5)',
              }}
            >
              THE WORKSHOP
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-telemetry, monospace)',
                fontSize: '0.85rem',
                color: '#94a3b8',
                lineHeight: 1.6,
                margin: '0 0 24px 0',
              }}
            >
              Cavern laboratory initialized. Central holo-table standing by for Act II 9-sector circular navigation.
            </p>

            <button
              onClick={() => setCurrentState('node_00_approach')}
              style={{
                padding: '12px 24px',
                fontFamily: 'var(--font-telemetry, monospace)',
                fontSize: '0.8rem',
                letterSpacing: '0.15em',
                fontWeight: 'bold',
                color: '#000',
                background: '#00f3ff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(0, 243, 255, 0.4)',
              }}
            >
              RETURN TO CAVERN ENTRANCE
            </button>
          </div>
        </div>
      )}

      {/* Global CSS Keyframes for Door Slabs */}
      <style>{`
        @keyframes doorSlideLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        @keyframes doorSlideRight {
          0% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};
