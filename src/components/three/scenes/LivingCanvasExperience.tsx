import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AtmosphericParticles } from '../AtmosphericParticles';
import { DoorHero } from '../../scene/DoorHero';
import { createCaveTunnelGeometry, loadRockMaterial } from '../../../lib/three/proceduralRockCavern';
import { dampScalar } from '../../../lib/three/damp';

/**
 * src/components/three/scenes/LivingCanvasExperience.tsx
 * 
 * Living Canvas Engine:
 * - Layer 4: Organic Steadicam Kinetics & Walking Bob
 * - Layer 3: GPU Atmospheric Dust & Steam Simulation
 * - Layer 2: Live Chiaroscuro Lighting with Voltage Modulation
 * - Layer 1: Real 3D Subterranean Cavern & Gunmetal Blast Door Geometry
 */

// 1. Continuous Camera Director with Organic Breathing & Walking Bob
function LivingCameraController({
  isWalking,
  onArrived,
}: {
  isWalking: boolean;
  onArrived: () => void;
}) {
  const walkProgress = useRef(0);
  const targetProgress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const smoothedLook = useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    const camera = state.camera;

    if (isWalking) {
      targetProgress.current = Math.min(targetProgress.current + dt * 0.36, 1.0);
      if (targetProgress.current >= 1.0) {
        onArrived();
      }
    }

    walkProgress.current = dampScalar(walkProgress.current, targetProgress.current, 3.5, dt);
    const p = walkProgress.current;

    // A. Organic Steadicam Breathing Sway (Continuous Operator Kinetics)
    const swayX = Math.sin(t * 0.45) * 0.018 + Math.sin(t * 0.9) * 0.008;
    const swayY = Math.cos(t * 0.35) * 0.014;

    // B. Organic Walking Head-Bob (Active During Dolly Traversal)
    const walkBob = isWalking ? Math.sin(p * Math.PI * 8.0) * 0.035 : 0;

    // C. Forward Traversal Position Interpolation (Z: 4.4m -> 1.2m)
    camera.position.x = swayX;
    camera.position.y = 1.40 + swayY + walkBob;
    camera.position.z = THREE.MathUtils.lerp(4.4, 1.2, p);

    // D. Dynamic Optical Focal Rack (FOV: 36deg -> 32deg)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(36, 32, p);
      camera.updateProjectionMatrix();
    }

    // E. Clamped Look Tracking
    smoothedLook.current.x = dampScalar(smoothedLook.current.x, pointer.current.x, 4.0, dt);
    smoothedLook.current.y = dampScalar(smoothedLook.current.y, pointer.current.y, 4.0, dt);

    const lookTarget = new THREE.Vector3(
      smoothedLook.current.x * 0.35,
      1.36 - smoothedLook.current.y * 0.25,
      0.0
    );

    camera.lookAt(lookTarget);
  });

  return null;
}

// 2. Voltage-Modulated Chiaroscuro Lighting Rig
function VoltageBreathingLights() {
  const leftLightRef = useRef<THREE.DirectionalLight>(null);
  const cyanLightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Subtle voltage fluctuation (2900K Amber floodlight)
    if (leftLightRef.current) {
      const voltageFlicker = Math.sin(t * 2.3) * 0.4 + Math.sin(t * 7.1) * 0.15;
      leftLightRef.current.intensity = 7.5 + voltageFlicker;
    }
    // Breathing optical glow on biometric terminal
    if (cyanLightRef.current) {
      cyanLightRef.current.intensity = 2.2 + Math.sin(t * 3.0) * 0.5;
    }
  });

  return (
    <>
      <ambientLight color="#120E0A" intensity={0.4} />

      {/* Left Amber Practical Light with subtle voltage breathing */}
      <directionalLight
        ref={leftLightRef}
        position={[-3.0, 2.5, 2.5]}
        color="#FFA030"
        intensity={7.5}
      />

      {/* Right Slate-Cyan Subterranean Fill */}
      <directionalLight
        position={[3.0, 1.8, 2.0]}
        color="#1E4868"
        intensity={4.0}
      />

      {/* Center Biometric Console Cyan Light */}
      <pointLight
        ref={cyanLightRef}
        position={[0, 1.36, 0.3]}
        color="#00E5FF"
        intensity={2.2}
        distance={2.2}
        decay={1.5}
      />
    </>
  );
}

// 3. Main Living Canvas Experience
export const LivingCanvasExperience: React.FC = () => {
  const [isWalking, setIsWalking] = useState(false);
  const [arrived, setArrived] = useState(false);

  const caveGeom = useMemo(() => createCaveTunnelGeometry(), []);
  const rockMat = useMemo(() => loadRockMaterial(), []);

  return (
    <div className="relative w-screen h-screen bg-black flex items-center justify-center overflow-hidden cursor-crosshair">
      {/* 9:16 Vertical Large-Format Cinema Frustum */}
      <div className="relative h-full aspect-[9/16] overflow-hidden shadow-2xl bg-[#050403]">
        <Canvas
          gl={{
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.65,
            antialias: true,
          }}
          camera={{ position: [0, 1.40, 4.4], fov: 36 }}
        >
          {/* Layer 4: Organic Steadicam Kinetics */}
          <LivingCameraController isWalking={isWalking} onArrived={() => setArrived(true)} />

          {/* Layer 3: GPU Instanced Atmospheric Dust Motes */}
          <AtmosphericParticles count={140} />

          {/* Layer 2: Live Chiaroscuro Lighting */}
          <VoltageBreathingLights />

          {/* Layer 1: Real 3D Subterranean Tunnel & Gunmetal Blast Door */}
          <group>
            <mesh
              geometry={caveGeom}
              material={rockMat}
              position={[0, 0, 0]}
              frustumCulled={false}
            />
            <group position={[0, 1.36, 0.0]}>
              <DoorHero />
            </group>
          </group>

          {/* Cinematic Post-Processing Stack */}
          <EffectComposer>
            <Bloom intensity={0.4} luminanceThreshold={0.35} mipmapBlur />
            <ChromaticAberration offset={new THREE.Vector2(0.0006, 0.0006)} />
            <Vignette offset={0.35} darkness={0.85} />
            <Noise opacity={0.025} />
          </EffectComposer>
        </Canvas>

        {/* Live Interaction Overlay */}
        {!isWalking && !arrived && (
          <div
            onClick={() => setIsWalking(true)}
            className="absolute inset-x-10 bottom-16 z-20 cursor-pointer flex justify-center"
          >
            <button className="px-6 py-3 border border-cyan-500/40 bg-black/75 hover:bg-cyan-950/70 text-cyan-300 font-mono text-xs uppercase tracking-widest backdrop-blur-md transition-all hover:scale-105 shadow-[0_0_25px_rgba(0,229,255,0.2)]">
              [ APPROACH BLAST DOOR ]
            </button>
          </div>
        )}

        {arrived && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-8 bg-black/40 backdrop-blur-[2px]">
            <div className="p-6 rounded border border-cyan-500/50 bg-black/85 text-center text-cyan-400 font-mono text-xs shadow-[0_0_35px_rgba(0,229,255,0.25)]">
              <div className="tracking-widest mb-4 font-bold">BIOMETRIC INTERFACE // ACTIVE</div>
              <p className="text-[10px] text-gray-400 mb-5 font-mono">
                RETINAL & FACIAL TOPOLOGY MATCH REQUIRED
              </p>
              <button
                onClick={() => alert('Biometrics Verified — Blast Door Unlocking...')}
                className="w-full py-2.5 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-400 text-cyan-200 tracking-widest font-mono uppercase transition-all"
              >
                [ INITIATE RETINA SCAN ]
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
