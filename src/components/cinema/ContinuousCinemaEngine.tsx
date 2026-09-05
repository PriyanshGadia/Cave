import React, { useRef, useState, useEffect, useCallback } from 'react';
import { soundFx } from '../../utils/audio';

export interface SceneNode {
  id: string;
  name: string;
  ambientLoopSrc: string;
  fallbackImage: string;
  forwardTravelSrc?: string;
  nextSceneId?: string;
}

export const SCENE_GRAPH: Record<string, SceneNode> = {
  SC00_APPROACH: {
    id: 'SC00_APPROACH',
    name: 'CAVERN APPROACH // SUB_LEVEL_06',
    ambientLoopSrc: '/video/sc00_approach_ambient_loop.mp4',
    fallbackImage: '/assets/cave_blast_door_exterior.jpg',
    forwardTravelSrc: '/video/t00_walk_to_panel.mp4',
    nextSceneId: 'SC01_PANEL',
  },
  SC01_PANEL: {
    id: 'SC01_PANEL',
    name: 'BIOMETRIC SECURITY MATRIX // LEVEL 4',
    ambientLoopSrc: '/video/sc01_panel_ambient_loop.mp4',
    fallbackImage: '/assets/cave_blast_door_exterior.jpg',
    forwardTravelSrc: '/video/t01_door_breach.mp4',
    nextSceneId: 'SC06_WORKSHOP',
  },
  SC06_WORKSHOP: {
    id: 'SC06_WORKSHOP',
    name: 'THE WORKSHOP // CENTRAL HOLO-TABLE',
    ambientLoopSrc: '/video/sc06_workshop_ambient_loop.mp4',
    fallbackImage: '/textures/scene-06-workbench-bg.jpg',
  },
};

export const ContinuousCinemaEngine: React.FC = () => {
  const [activeNode, setActiveNode] = useState<SceneNode>(SCENE_GRAPH.SC00_APPROACH);
  const [isTraversing, setIsTraversing] = useState(false);
  const [traversalProgress, setTraversalProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [breathingOffset, setBreathingOffset] = useState({ x: 0, y: 0 });

  // Biometric Terminal State for SC01
  const [terminalStatus, setTerminalStatus] = useState<string>('STANDBY // 128-D READY');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // Dual Video Buffers for 16ms Zero-Hitch Crossfading
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const [primaryBuffer, setPrimaryBuffer] = useState<'A' | 'B'>('A');

  const hudCanvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Perpetual Camera Breathing (Multi-octave noise micro-sway at 0.25Hz)
  useEffect(() => {
    let animId: number;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = (time - startTime) * 0.001;
      // Multi-octave natural human breathing micro-sway
      const swayX = Math.sin(elapsed * 1.5) * 0.6 + Math.sin(elapsed * 3.2) * 0.2;
      const swayY = Math.cos(elapsed * 1.2) * 0.5 + Math.cos(elapsed * 2.8) * 0.25;
      setBreathingOffset({ x: swayX, y: swayY });
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 2. Mouse Parallax Handler
  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    setMousePos({ x, y });
  };

  // 3. Seamless Continuous Forward Traversal
  const triggerForwardTraversal = useCallback(() => {
    if (isTraversing || !activeNode.forwardTravelSrc || !activeNode.nextSceneId) return;

    soundFx.playScannerSweep();
    setIsTraversing(true);
    const nextNode = SCENE_GRAPH[activeNode.nextSceneId];
    const incomingVideo = primaryBuffer === 'A' ? videoRefB.current : videoRefA.current;

    if (incomingVideo && incomingVideo.canPlayType('video/mp4')) {
      incomingVideo.src = activeNode.forwardTravelSrc;
      incomingVideo.currentTime = 0;
      incomingVideo.play().catch(() => {
        // Fallback if video file is pending
      });

      setPrimaryBuffer((prev) => (prev === 'A' ? 'B' : 'A'));

      incomingVideo.onended = () => {
        incomingVideo.src = nextNode.ambientLoopSrc;
        incomingVideo.loop = true;
        incomingVideo.play().catch(() => {});
        setActiveNode(nextNode);
        setIsTraversing(false);
      };
    } else {
      // High-Fidelity First-Person Traversal Interpolation (Fallback)
      const duration = 1800;
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        setTraversalProgress(eased);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setActiveNode(nextNode);
          setIsTraversing(false);
          setTraversalProgress(0);
        }
      };

      requestAnimationFrame(step);
    }
  }, [activeNode, isTraversing, primaryBuffer]);

  // Keyboard navigation ('W' to advance, 'S' to step back)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && !isTraversing && activeNode.id === 'SC00_APPROACH') {
        triggerForwardTraversal();
      } else if ((e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') && !isTraversing && activeNode.id === 'SC01_PANEL') {
        soundFx.playClickBeep();
        setActiveNode(SCENE_GRAPH.SC00_APPROACH);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNode, isTraversing, triggerForwardTraversal]);

  // 4. Biometric Terminal Laser Scanning & Unlocking
  const handleVerify = () => {
    if (isScanning) return;
    soundFx.playScannerSweep();
    setIsScanning(true);
    setTerminalStatus('SCANNING 128-D VECTOR MATRIX...');

    setTimeout(() => {
      soundFx.playAccessGranted();
      soundFx.playDoorRumble();
      setIsScanning(false);
      setTerminalStatus('CLEARANCE VERIFIED // UNLOCKED');
      setTimeout(() => {
        triggerForwardTraversal();
      }, 1200);
    }, 1800);
  };

  const handleRegister = () => {
    if (isScanning) return;
    soundFx.playClickBeep();
    setIsScanning(true);
    setTerminalStatus('ENROLLING OPERATIVE (128-D)...');

    setTimeout(() => {
      soundFx.playAccessGranted();
      setIsScanning(false);
      setTerminalStatus('ENROLLMENT COMPLETED // TIER 2');
    }, 1400);
  };

  const handleReset = () => {
    soundFx.playClickBeep();
    setIsScanning(false);
    setTerminalStatus('STANDBY // 128-D READY');
  };

  // 5. Dynamic Live HUD Point Cloud Canvas (60 FPS Overlay)
  useEffect(() => {
    if (activeNode.id !== 'SC01_PANEL') return;
    const canvas = hudCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const time = Date.now() * 0.001;
      ctx.fillStyle = '#04080e';
      ctx.fillRect(0, 0, 512, 380);

      // Telemetry Grid
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 512; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 380);
        ctx.stroke();
      }
      for (let y = 0; y < 380; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      // 3D Point-Cloud Facial Wireframe (56 Nodes)
      const cx = 256;
      const cy = 180;
      ctx.fillStyle = isScanning ? '#00f3ff' : '#00b4d8';
      const count = 56;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + time * 1.1;
        const r = 68 + Math.sin(i * 0.75 + time * 2.8) * 12;
        const px = cx + Math.cos(a) * r * 0.85;
        const py = cy + Math.sin(a) * r;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Scanner Laser Sweep
      if (isScanning) {
        const scanY = (Math.sin(time * 5.5) * 0.5 + 0.5) * 260 + 50;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(30, scanY);
        ctx.lineTo(482, scanY);
        ctx.stroke();
      }

      // Real-Time Typography
      ctx.fillStyle = '#00f3ff';
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillText('BIOMETRIC SYSTEM ALPHA // LEVEL 4', 24, 38);

      ctx.fillStyle = isScanning ? '#ff9e2c' : '#94a3b8';
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillText(`STATUS: ${terminalStatus}`, 24, 68);

      ctx.fillStyle = '#64748b';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('ENCRYPTION: AES-GCM-256', 24, 345);

      ctx.textAlign = 'right';
      ctx.fillText('NODES: 128-D', 488, 345);
      ctx.textAlign = 'left';

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeNode.id, isScanning, terminalStatus]);

  // Combined Parallax Calculation (Mouse + Perpetual Breathing)
  const totalParallaxX = mousePos.x * -14 + breathingOffset.x * 4;
  const totalParallaxY = mousePos.y * -10 + breathingOffset.y * 3;

  return (
    <div
      className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center cursor-default"
      onMouseMove={handleMouseMove}
      style={{
        background: '#020406',
      }}
    >
      {/* 9:16 / 16:9 Adaptable Frustum with Live Viewport Parallax & Perpetual Breathing */}
      <div
        className="relative w-full h-full overflow-hidden shadow-2xl transition-transform duration-100 ease-out"
        style={{
          transform: `scale(${1.08 + traversalProgress * 0.4}) translate3d(${totalParallaxX}px, ${totalParallaxY}px, 0)`,
          willChange: 'transform',
        }}
      >
        {/* =========================================================================
            1. DUAL-BUFFER LIVE 60 FPS VIDEO STREAMING ENGINE
            ========================================================================= */}
        {/* Buffer A */}
        <video
          ref={videoRefA}
          src={activeNode.ambientLoopSrc}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            primaryBuffer === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
          onError={(e) => {
            // Graceful fallback to high-res master plate when video is pending
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Buffer B */}
        <video
          ref={videoRefB}
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            primaryBuffer === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* High-Res Master Plate Fallback Image (Underneath Video Stream) */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center z-0"
          style={{
            backgroundImage: `url(${activeNode.fallbackImage})`,
            filter: isTraversing
              ? 'brightness(0.9) contrast(1.15)'
              : activeNode.id === 'SC01_PANEL'
              ? 'brightness(0.85) contrast(1.2)'
              : 'brightness(1.0) contrast(1.1)',
            transform:
              activeNode.id === 'SC01_PANEL'
                ? 'scale(1.55)'
                : `scale(${1.0 + traversalProgress * 0.5})`,
            transition: 'transform 0.4s ease-out',
          }}
        />

        {/* Multi-Plane Ambient Atmospheric Layer (Moving Dust & Steam Lighting) */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              'radial-gradient(circle at 18% 58%, rgba(255, 125, 24, 0.12) 0%, transparent 55%), radial-gradient(circle at 50% 50%, rgba(0, 243, 255, 0.08) 0%, transparent 60%)',
            transform: `translate3d(${totalParallaxX * 0.4}px, ${totalParallaxY * 0.4}px, 0)`,
          }}
        />

        {/* =========================================================================
            2. LIVE INTERACTIVE HUD & CLICK TARGETS (Rendered Over Continuous Video)
            ========================================================================= */}
        <div className="absolute inset-0 z-20 pointer-events-auto flex flex-col justify-between p-6">
          {/* Header Telemetry Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: 'var(--font-telemetry, monospace)',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              color: '#00f3ff',
              background: 'rgba(4, 8, 14, 0.75)',
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid rgba(0, 243, 255, 0.25)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span>{activeNode.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#00f3ff',
                  boxShadow: '0 0 8px #00f3ff',
                  display: 'inline-block',
                }}
              />
              LIVE 60FPS STREAM
            </span>
          </div>

          {/* NODE 00: APPROACH TRIGGER BUTTON */}
          {activeNode.id === 'SC00_APPROACH' && !isTraversing && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <button
                onClick={triggerForwardTraversal}
                style={{
                  padding: '14px 28px',
                  fontFamily: 'var(--font-telemetry, monospace)',
                  fontSize: '0.85rem',
                  letterSpacing: '0.18em',
                  fontWeight: 'bold',
                  color: '#00f3ff',
                  background: 'rgba(6, 12, 20, 0.85)',
                  border: '1px solid #00f3ff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 0 24px rgba(0, 243, 255, 0.25)',
                  transition: 'all 0.2s ease',
                }}
              >
                [ APPROACH BLAST DOOR ]
              </button>
              <span
                style={{
                  fontFamily: 'var(--font-telemetry, monospace)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.12em',
                  color: '#94a3b8',
                }}
              >
                PRESS [W] OR CLICK TO ADVANCE
              </span>
            </div>
          )}

          {/* NODE 01: MACRO BIOMETRIC SECURITY MATRIX PANEL OVERLAY */}
          {activeNode.id === 'SC01_PANEL' && !isTraversing && (
            <div
              style={{
                alignSelf: 'center',
                width: '560px',
                maxWidth: '92vw',
                background: 'rgba(6, 12, 20, 0.92)',
                borderRadius: '12px',
                border: '2px solid rgba(0, 243, 255, 0.35)',
                boxShadow: '0 0 50px rgba(0, 0, 0, 0.9), inset 0 0 30px rgba(0, 243, 255, 0.08)',
                backdropFilter: 'blur(16px)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                zIndex: 30,
              }}
            >
              {/* Cyan LED Status Strip */}
              <div
                style={{
                  width: '100%',
                  height: '3px',
                  background: isScanning
                    ? 'linear-gradient(90deg, #ff9e2c, #00f3ff, #ff9e2c)'
                    : 'linear-gradient(90deg, #00f3ff, #0077b6, #00f3ff)',
                  boxShadow: '0 0 10px #00f3ff',
                  borderRadius: '2px',
                }}
              />

              {/* Real-Time Live HUD Canvas */}
              <canvas
                ref={hudCanvasRef}
                width={512}
                height={380}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '6px',
                  border: '1px solid rgba(0, 243, 255, 0.25)',
                  boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.8)',
                }}
              />

              {/* Optical Iris Lens Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 14px',
                  background: 'rgba(4, 8, 14, 0.8)',
                  borderRadius: '20px',
                  border: '1px solid rgba(0, 243, 255, 0.2)',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isScanning ? '#ff9e2c' : '#00f3ff',
                    boxShadow: `0 0 8px ${isScanning ? '#ff9e2c' : '#00f3ff'}`,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-telemetry, monospace)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.12em',
                    color: '#94a3b8',
                  }}
                >
                  OPTICAL IRIS SCANNER // READY
                </span>
              </div>

              {/* Tactile Control Buttons */}
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button
                  onClick={handleRegister}
                  onMouseEnter={() => {
                    setHoveredButton('REG');
                    soundFx.playHoverBlip();
                  }}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontFamily: 'var(--font-telemetry, monospace)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.12em',
                    fontWeight: 'bold',
                    color: hoveredButton === 'REG' ? '#000' : '#00f3ff',
                    background: hoveredButton === 'REG' ? '#00f3ff' : 'rgba(10, 20, 32, 0.8)',
                    border: '1px solid rgba(0, 243, 255, 0.4)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  REGISTER
                </button>

                <button
                  onClick={handleVerify}
                  onMouseEnter={() => {
                    setHoveredButton('VER');
                    soundFx.playHoverBlip();
                  }}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={{
                    flex: 1.5,
                    padding: '10px',
                    fontFamily: 'var(--font-telemetry, monospace)',
                    fontSize: '0.8rem',
                    letterSpacing: '0.15em',
                    fontWeight: 'bold',
                    color: hoveredButton === 'VER' ? '#000' : '#00f3ff',
                    background: hoveredButton === 'VER' ? '#00f3ff' : 'rgba(0, 243, 255, 0.15)',
                    border: '1px solid #00f3ff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 0 14px rgba(0, 243, 255, 0.25)',
                  }}
                >
                  {isScanning ? 'AUTHENTICATING...' : 'VERIFY & UNLOCK'}
                </button>

                <button
                  onClick={handleReset}
                  onMouseEnter={() => {
                    setHoveredButton('RST');
                    soundFx.playHoverBlip();
                  }}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontFamily: 'var(--font-telemetry, monospace)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.12em',
                    fontWeight: 'bold',
                    color: hoveredButton === 'RST' ? '#000' : '#ff9e2c',
                    background: hoveredButton === 'RST' ? '#ff9e2c' : 'rgba(32, 20, 10, 0.8)',
                    border: '1px solid rgba(255, 158, 44, 0.4)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  RESET
                </button>
              </div>

              {/* Step Back Footer */}
              <button
                onClick={() => {
                  soundFx.playClickBeep();
                  setActiveNode(SCENE_GRAPH.SC00_APPROACH);
                }}
                style={{
                  alignSelf: 'flex-start',
                  fontFamily: 'var(--font-telemetry, monospace)',
                  fontSize: '0.72rem',
                  letterSpacing: '0.12em',
                  color: '#64748b',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 0',
                }}
              >
                ← STEP BACK [S]
              </button>
            </div>
          )}

          {/* NODE 06: WORKSHOP REVEAL */}
          {activeNode.id === 'SC06_WORKSHOP' && (
            <div
              style={{
                alignSelf: 'center',
                textAlign: 'center',
                padding: '28px',
                background: 'rgba(6, 12, 20, 0.85)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 243, 255, 0.35)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 0 40px rgba(0, 243, 255, 0.15)',
                maxWidth: '560px',
                zIndex: 30,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-telemetry, monospace)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.2em',
                  color: '#ff9e2c',
                  marginBottom: '10px',
                }}
              >
                SECURITY CLEARANCE // GRANTED
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-header, sans-serif)',
                  fontSize: '1.8rem',
                  letterSpacing: '0.12em',
                  color: '#fff',
                  margin: '0 0 14px 0',
                  textShadow: '0 0 20px rgba(0, 243, 255, 0.5)',
                }}
              >
                THE WORKSHOP
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-telemetry, monospace)',
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  lineHeight: 1.6,
                  margin: '0 0 20px 0',
                }}
              >
                Cavern laboratory initialized. Central holo-table standing by for Act II 9-sector circular navigation.
              </p>
              <button
                onClick={() => {
                  soundFx.playClickBeep();
                  setActiveNode(SCENE_GRAPH.SC00_APPROACH);
                }}
                style={{
                  padding: '10px 22px',
                  fontFamily: 'var(--font-telemetry, monospace)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.14em',
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
          )}
        </div>

        {/* 3. Cinematic Film Vignette Frame */}
        <div
          className="absolute inset-0 pointer-events-none z-40"
          style={{
            boxShadow: 'inset 0 0 140px rgba(0, 0, 0, 0.88)',
            background: 'radial-gradient(circle at center, transparent 65%, rgba(2, 4, 8, 0.75) 100%)',
          }}
        />
      </div>
    </div>
  );
};
