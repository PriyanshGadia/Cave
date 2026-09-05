import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Lenis from 'lenis';
import { BlastDoorGeometry } from './BlastDoorGeometry';
import { ParallaxCaveCards } from './ParallaxCaveCards';
import { Interactable } from './Interactable';
import { soundFx } from '../../utils/audio';

// =============================================================================
// CAMERA RIG: DECOUPLED 3-CHANNEL INPUT SYSTEM (0% – 15% PATH)
// =============================================================================
const approachPathPoints = [
  new THREE.Vector3(0, 1.65, 7.2), // Scroll 0% — Wide Cavern Medium Shot
  new THREE.Vector3(0, 1.62, 5.8), // Scroll 7.5% — Approaching Door
  new THREE.Vector3(0, 1.58, 4.6), // Scroll 15% — Settled in Front of Door
];
const approachWalkCurve = new THREE.CatmullRomCurve3(approachPathPoints);
const MAX_LOOK_X = 1.1; // Max world-units horizontal parallax
const MAX_LOOK_Y = 0.65; // Max world-units vertical parallax

interface ApproachCameraRigProps {
  scrollProgress: React.MutableRefObject<number>;
}

const ApproachCameraRig: React.FC<ApproachCameraRigProps> = ({ scrollProgress }) => {
  const { camera } = useThree();
  const pointer = useRef({ x: 0, y: 0 });
  const smoothedLook = useRef({ x: 0, y: 0 });

  // CHANNEL 2 — Pointer / Touch drives ONLY clamped look offset
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  useFrame((_, delta) => {
    // CHANNEL 1 — Scroll drives ONLY position along Catmull-Rom curve (0–15% bounded)
    const t = THREE.MathUtils.clamp(scrollProgress.current, 0, 1);
    const targetPos = approachWalkCurve.getPointAt(t);

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.x, 5.0, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.y, 5.0, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.z, 5.0, delta);

    // Look inertia lag
    smoothedLook.current.x = THREE.MathUtils.damp(
      smoothedLook.current.x,
      pointer.current.x,
      4.0,
      delta
    );
    smoothedLook.current.y = THREE.MathUtils.damp(
      smoothedLook.current.y,
      pointer.current.y,
      4.0,
      delta
    );

    const lookAhead = approachWalkCurve.getPointAt(Math.min(t + 0.01, 1.0));
    const lookTarget = lookAhead.clone();
    lookTarget.x += smoothedLook.current.x * MAX_LOOK_X;
    lookTarget.y -= smoothedLook.current.y * MAX_LOOK_Y;
    camera.lookAt(lookTarget);
  });

  return null;
};

// =============================================================================
// OPTICAL CIRCULAR PARTICLES (Zero Square Sprites - Pure Gaussian Alpha)
// =============================================================================
const AtmosphericEmbers: React.FC = () => {
  const count = 160;
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8.0;
      pos[i * 3 + 1] = Math.random() * 4.5;
      pos[i * 3 + 2] = Math.random() * 8.0 + 0.5;

      const isAmber = pos[i * 3] < 0.2;
      if (isAmber) {
        // Warm Amber Key Hue (~2900K)
        col[i * 3] = 1.0;
        col[i * 3 + 1] = 0.58;
        col[i * 3 + 2] = 0.14;
      } else {
        // Cool Cyan Accent Hue (~7000K)
        col[i * 3] = 0.0;
        col[i * 3 + 1] = 0.95;
        col[i * 3 + 2] = 1.0;
      }
    }
    return { positions: pos, colors: col };
  }, []);

  const particleMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (18.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.04, dist) * 0.75;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  const pointsRef = useRef<THREE.Points>(null!);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      let y = posAttr.getY(i) - delta * 0.08;
      if (y < 0.1) y = 4.5;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} material={particleMat}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
    </points>
  );
};

// =============================================================================
// MAIN SCENE 00 COMPONENT
// =============================================================================
interface Scene00ApproachProps {
  onProceedToScene01?: () => void;
}

export const Scene00Approach: React.FC<Scene00ApproachProps> = ({
  onProceedToScene01,
}) => {
  const scrollProgress = useRef<number>(0);
  const [doorHovered, setDoorHovered] = useState<boolean>(false);
  const [scrollDisplay, setScrollDisplay] = useState<number>(0);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    const handleScroll = () => {
      // Map scroll progress over the 0% - 15% range
      const maxScroll = window.innerHeight * 1.5;
      const current = Math.min(1.0, Math.max(0.0, window.scrollY / maxScroll));
      scrollProgress.current = current;
      setScrollDisplay(Math.round(current * 100));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
      lenis.destroy();
    };
  }, []);

  const handleDoorActivate = () => {
    soundFx.playScannerSweep();
    if (onProceedToScene01) {
      onProceedToScene01();
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '250vh', // Virtual scroll height to allow smooth 0–15% progression
        background: '#020406',
      }}
    >
      {/* Fixed 3D Viewport */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <Canvas
          gl={{
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.35,
            antialias: true,
            powerPreference: 'high-performance',
          }}
          camera={{
            fov: 36, // 35mm cinema prime equivalent lens
            near: 0.1,
            far: 40,
            position: [0, 1.65, 7.2],
          }}
          dpr={[1, 1.8]}
        >
          {/* Chiaroscuro Atmospheric Fog */}
          <fogExp2 attach="fog" args={['#020406', 0.07]} />

          {/* =================================================================
              STRICT TWO-LIGHT COLOR SYSTEM ONLY (No Other Hues)
              ================================================================= */}
          {/* 1. Primary Warm Amber Key Light (~2900K, #ff9526): Upper Left Rake */}
          <directionalLight
            position={[-3.6, 2.6, 4.2]}
            intensity={4.2}
            color="#ff9526"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-near={0.5}
            shadow-camera-far={20}
            shadow-bias={-0.0001}
          />

          {/* Secondary Soft Amber Cavern Bounce */}
          <directionalLight
            position={[-1.8, 3.8, 2.5]}
            intensity={1.6}
            color="#ff8014"
          />

          {/* Subtle Warm Base Ambient */}
          <ambientLight color="#ff6800" intensity={0.2} />

          {/* 2. Cool Electric Cyan Accent Light (~7000K, #00f3ff): Biometric Terminal */}
          <pointLight
            position={[0, 1.5, 0.45]}
            intensity={2.2}
            distance={3.5}
            decay={2}
            color="#00f3ff"
          />

          {/* Near / Interactive Blast Door */}
          <Interactable
            id="door-approach"
            accessTier="public"
            onHoverChange={setDoorHovered}
            onActivate={handleDoorActivate}
          >
            <BlastDoorGeometry
              isHovered={doorHovered}
              onActivate={handleDoorActivate}
            />
          </Interactable>

          {/* Parallax Mid/Far Cave Rock Walls & Ceiling */}
          <ParallaxCaveCards />

          {/* Optical Atmospheric Micro-Embers */}
          <AtmosphericEmbers />

          {/* Decoupled Camera Controller */}
          <ApproachCameraRig scrollProgress={scrollProgress} />
        </Canvas>

        {/* Cinematic Film Vignette Overlay */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 180px rgba(0, 0, 0, 0.85)',
            background:
              'radial-gradient(circle at center, transparent 62%, rgba(2, 4, 6, 0.78) 100%)',
          }}
        />

        {/* Minimal High-Tech Telemetry Overlay (Real Typography) */}
        <div
          style={{
            position: 'fixed',
            top: '28px',
            left: '32px',
            pointerEvents: 'none',
            color: '#ff9526',
            fontFamily: 'monospace',
            fontSize: '12px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            textShadow: '0 0 12px rgba(255, 149, 38, 0.4)',
          }}
        >
          <div>SEC-00 // CAVE APPROACH</div>
          <div style={{ color: '#64748b', marginTop: '4px', fontSize: '10px' }}>
            OPTICS: 35MM PRIME · 9:16 FRAME · PATH: {scrollDisplay}% / 15%
          </div>
        </div>

        {/* Proximity & Affordance Prompt */}
        <div
          style={{
            position: 'fixed',
            bottom: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            color: doorHovered ? '#00f3ff' : '#94a3b8',
            fontFamily: 'monospace',
            fontSize: '11px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'color 0.3s ease',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: doorHovered ? '#00f3ff' : '#ff9526',
              boxShadow: doorHovered
                ? '0 0 10px #00f3ff'
                : '0 0 8px #ff9526',
            }}
          />
          {doorHovered
            ? 'INTERACT // ENGAGE BIOMETRIC RECOGNITION'
            : 'SCROLL TO ADVANCE TOWARDS BLAST DOOR'}
        </div>
      </div>
    </div>
  );
};
