import React, { useEffect, useRef, useState } from 'react';
import { soundFx } from '../../utils/audio';

interface Node00ApproachProps {
  onWalkForward: () => void;
}

export const Node00Approach: React.FC<Node00ApproachProps> = ({ onWalkForward }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [isHoveringDoor, setIsHoveringDoor] = useState(false);

  // Mouse / Gyro Bounded Parallax (±15° Window with 115% Overscan)
  useEffect(() => {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetX = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      targetY = (e.clientY / innerHeight - 0.5) * 2;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        soundFx.playClickBeep();
        onWalkForward();
      }
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
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
  }, [onWalkForward]);

  const handleDoorClick = () => {
    soundFx.playClickBeep();
    onWalkForward();
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#040608',
        cursor: isHoveringDoor ? 'pointer' : 'default',
      }}
    >
      {/* 1. Base Master Plate with 115% Overscan and Smooth Parallax Transform */}
      <div
        style={{
          position: 'absolute',
          top: '-7.5%',
          left: '-7.5%',
          width: '115%',
          height: '115%',
          backgroundImage: 'url(/assets/cave_blast_door_exterior.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `translate3d(${mouseOffset.x * -24}px, ${mouseOffset.y * -18}px, 0) scale(1.02)`,
          transition: 'transform 0.08s ease-out',
          willChange: 'transform',
        }}
      />

      {/* 2. Multi-Plane Depth Overlay: Atmospheric Volumetric Fog & Glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 50%, rgba(0, 243, 255, 0.06) 0%, transparent 60%), radial-gradient(circle at 18% 60%, rgba(255, 130, 24, 0.12) 0%, transparent 50%)',
          pointerEvents: 'none',
          transform: `translate3d(${mouseOffset.x * -12}px, ${mouseOffset.y * -9}px, 0)`,
        }}
      />

      {/* 3. Invisible 3D Click Collider over Central Blast Door */}
      <div
        onClick={handleDoorClick}
        onMouseEnter={() => {
          setIsHoveringDoor(true);
          soundFx.playHoverBlip();
        }}
        onMouseLeave={() => setIsHoveringDoor(false)}
        style={{
          position: 'absolute',
          top: '22%',
          left: '32%',
          width: '36%',
          height: '56%',
          borderRadius: '50%',
          cursor: 'pointer',
          zIndex: 10,
        }}
        title="Click to Approach Blast Door"
      />

      {/* 4. Subtle In-World Interaction Prompt */}
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-telemetry, monospace)',
          fontSize: '0.8rem',
          letterSpacing: '0.18em',
          color: isHoveringDoor ? '#00f3ff' : '#94a3b8',
          background: 'rgba(6, 10, 16, 0.85)',
          padding: '10px 20px',
          borderRadius: '4px',
          border: `1px solid ${isHoveringDoor ? 'rgba(0, 243, 255, 0.6)' : 'rgba(148, 163, 184, 0.2)'}`,
          backdropFilter: 'blur(12px)',
          transition: 'all 0.3s ease',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: isHoveringDoor ? '0 0 20px rgba(0, 243, 255, 0.2)' : 'none',
        }}
      >
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isHoveringDoor ? '#00f3ff' : '#94a3b8' }} />
        {isHoveringDoor ? 'CLICK TO APPROACH BLAST DOOR' : 'PRESS [W] OR CLICK DOOR TO ADVANCE'}
      </div>

      {/* 5. Cinematic Vignette Frame */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 140px rgba(0, 0, 0, 0.85)',
          background: 'radial-gradient(circle at center, transparent 65%, rgba(2, 4, 8, 0.75) 100%)',
        }}
      />
    </div>
  );
};
