import React, { useEffect, useRef, useState } from 'react';
import { soundFx } from '../../utils/audio';

interface Node01BiometricPanelProps {
  onDoorUnlock: () => void;
  onStepBack?: () => void;
}

export const Node01BiometricPanel: React.FC<Node01BiometricPanelProps> = ({
  onDoorUnlock,
  onStepBack,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<string>('STANDBY // 128-D READY');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // 1. Mouse Parallax (Subtle Micro-Parallax for Macro View)
  useEffect(() => {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetX = (e.clientX / innerWidth - 0.5) * 2;
      targetY = (e.clientY / innerHeight - 0.5) * 2;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') && onStepBack) {
        soundFx.playClickBeep();
        onStepBack();
      }
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;
      setMouseOffset({ x: currentX, y: currentY });
      animId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onStepBack]);

  // 2. Real-Time Dynamic 2D Canvas for High-Resolution HUD Display
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const time = Date.now() * 0.001;

      // Dark Terminal Base
      ctx.fillStyle = '#04080e';
      ctx.fillRect(0, 0, 640, 480);

      // Sci-Fi Telemetry Grid
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 640; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 480);
        ctx.stroke();
      }
      for (let y = 0; y < 480; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(640, y);
        ctx.stroke();
      }

      // Rotating 3D Wireframe Facial Point-Cloud Mesh (56 Spherical Nodes)
      const cx = 320;
      const cy = 230;
      ctx.fillStyle = isScanning ? '#00f3ff' : '#00b4d8';
      const points = 56;
      for (let i = 0; i < points; i++) {
        const a = (i / points) * Math.PI * 2 + time * 1.1;
        const r = 78 + Math.sin(i * 0.75 + time * 2.8) * 14;
        const px = cx + Math.cos(a) * r * 0.85;
        const py = cy + Math.sin(a) * r;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Connecting Vector Constellation Lines
      ctx.strokeStyle = isScanning ? 'rgba(0, 243, 255, 0.35)' : 'rgba(0, 180, 216, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < points; i += 4) {
        const a1 = (i / points) * Math.PI * 2 + time * 1.1;
        const r1 = 78 + Math.sin(i * 0.75 + time * 2.8) * 14;
        const px1 = cx + Math.cos(a1) * r1 * 0.85;
        const py1 = cy + Math.sin(a1) * r1;

        const nextIdx = (i + 8) % points;
        const a2 = (nextIdx / points) * Math.PI * 2 + time * 1.1;
        const r2 = 78 + Math.sin(nextIdx * 0.75 + time * 2.8) * 14;
        const px2 = cx + Math.cos(a2) * r2 * 0.85;
        const py2 = cy + Math.sin(a2) * r2;

        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
      }
      ctx.stroke();

      // Scanning Laser Line
      if (isScanning) {
        const scanY = (Math.sin(time * 5.5) * 0.5 + 0.5) * 320 + 70;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(40, scanY);
        ctx.lineTo(600, scanY);
        ctx.stroke();

        // Scan Glow Area
        ctx.fillStyle = 'rgba(0, 243, 255, 0.08)';
        ctx.fillRect(40, scanY - 20, 560, 40);
      }

      // Real-Time Typography Header
      ctx.fillStyle = '#00f3ff';
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.fillText('BIOMETRIC SYSTEM ALPHA // LEVEL 4', 36, 44);

      ctx.fillStyle = isScanning ? '#ff9e2c' : '#94a3b8';
      ctx.font = '15px "JetBrains Mono", monospace';
      ctx.fillText(`STATUS: ${terminalStatus}`, 36, 76);

      // Real-Time Telemetry Footer
      ctx.fillStyle = '#64748b';
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.fillText('ENCRYPTION: AES-GCM-256', 36, 440);

      ctx.textAlign = 'right';
      ctx.fillText('NODES: 128-D // SHA-256', 604, 440);
      ctx.textAlign = 'left';

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [terminalStatus, isScanning]);

  // Button Click Handlers
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
        onDoorUnlock();
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

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#040608',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 1. Macro Plate Background (115% with smooth micro-parallax) */}
      <div
        style={{
          position: 'absolute',
          top: '-7.5%',
          left: '-7.5%',
          width: '115%',
          height: '115%',
          backgroundImage: 'url(/assets/cave_blast_door_exterior.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: '50% 48%',
          filter: 'brightness(0.9) contrast(1.15)',
          transform: `translate3d(${mouseOffset.x * -12}px, ${mouseOffset.y * -8}px, 0) scale(1.65)`,
          willChange: 'transform',
        }}
      />

      {/* 2. Central Hard-Surface Terminal Housing Overlay */}
      <div
        style={{
          position: 'relative',
          width: '580px',
          maxWidth: '92vw',
          background: 'rgba(8, 14, 22, 0.92)',
          borderRadius: '12px',
          border: '2px solid rgba(0, 243, 255, 0.35)',
          boxShadow: '0 0 60px rgba(0, 0, 0, 0.9), inset 0 0 30px rgba(0, 243, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          transform: `translate3d(${mouseOffset.x * 6}px, ${mouseOffset.y * 4}px, 0)`,
          transition: 'transform 0.08s ease-out',
          zIndex: 10,
        }}
      >
        {/* Top Horizontal Cyan LED Status Bar */}
        <div
          style={{
            width: '100%',
            height: '4px',
            background: isScanning
              ? 'linear-gradient(90deg, #ff9e2c, #00f3ff, #ff9e2c)'
              : 'linear-gradient(90deg, #00f3ff, #0077b6, #00f3ff)',
            borderRadius: '2px',
            boxShadow: '0 0 12px #00f3ff',
            animation: 'pulse 2s infinite',
          }}
        />

        {/* Real-Time Dynamic Screen Canvas */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: '6px',
            border: '1px solid rgba(0, 243, 255, 0.25)',
            boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.8)',
          }}
        />

        {/* Circular Iris Optical Camera Housing */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 16px',
            background: 'rgba(4, 8, 14, 0.8)',
            borderRadius: '20px',
            border: '1px solid rgba(0, 243, 255, 0.2)',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: isScanning ? '#ff9e2c' : '#00f3ff',
              boxShadow: `0 0 10px ${isScanning ? '#ff9e2c' : '#00f3ff'}`,
              transition: 'background 0.3s ease',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-telemetry, monospace)',
              fontSize: '0.75rem',
              letterSpacing: '0.14em',
              color: '#94a3b8',
            }}
          >
            OPTICAL IRIS SCANNER // ACTIVE
          </span>
        </div>

        {/* Interactive Physical Control Buttons */}
        <div style={{ display: 'flex', gap: '14px', width: '100%' }}>
          <button
            onClick={handleRegister}
            onMouseEnter={() => {
              setHoveredButton('REG');
              soundFx.playHoverBlip();
            }}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              flex: 1,
              padding: '12px',
              fontFamily: 'var(--font-telemetry, monospace)',
              fontSize: '0.8rem',
              letterSpacing: '0.14em',
              fontWeight: 'bold',
              color: hoveredButton === 'REG' ? '#000' : '#00f3ff',
              background: hoveredButton === 'REG' ? '#00f3ff' : 'rgba(10, 20, 32, 0.8)',
              border: '1px solid rgba(0, 243, 255, 0.4)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: hoveredButton === 'REG' ? '0 0 16px rgba(0, 243, 255, 0.4)' : 'none',
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
              padding: '12px',
              fontFamily: 'var(--font-telemetry, monospace)',
              fontSize: '0.85rem',
              letterSpacing: '0.16em',
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
              padding: '12px',
              fontFamily: 'var(--font-telemetry, monospace)',
              fontSize: '0.8rem',
              letterSpacing: '0.14em',
              fontWeight: 'bold',
              color: hoveredButton === 'RST' ? '#000' : '#ff9e2c',
              background: hoveredButton === 'RST' ? '#ff9e2c' : 'rgba(32, 20, 10, 0.8)',
              border: '1px solid rgba(255, 158, 44, 0.4)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: hoveredButton === 'RST' ? '0 0 16px rgba(255, 158, 44, 0.4)' : 'none',
            }}
          >
            RESET
          </button>
        </div>
      </div>

      {/* 3. Step Back Button */}
      {onStepBack && (
        <button
          onClick={onStepBack}
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '32px',
            fontFamily: 'var(--font-telemetry, monospace)',
            fontSize: '0.75rem',
            letterSpacing: '0.14em',
            color: '#94a3b8',
            background: 'rgba(6, 10, 16, 0.85)',
            padding: '8px 16px',
            borderRadius: '4px',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
            zIndex: 20,
          }}
        >
          ← STEP BACK [S]
        </button>
      )}

      {/* 4. Cinematic Vignette Frame */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 140px rgba(0, 0, 0, 0.88)',
          background: 'radial-gradient(circle at center, transparent 60%, rgba(2, 4, 8, 0.8) 100%)',
        }}
      />
    </div>
  );
};
