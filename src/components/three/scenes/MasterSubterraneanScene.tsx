import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// 1. Microscopic GPU Dust Points (No Ping-Pong Balls)
function FineAtmosphericDust({ count = 80 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3.0;
      pos[i * 3 + 1] = Math.random() * 2.5;
      pos[i * 3 + 2] = Math.random() * 4.0;

      vel[i * 3] = (Math.random() - 0.5) * 0.001;
      vel[i * 3 + 1] = -0.0008 - Math.random() * 0.001;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.001;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      array[i * 3 + 1] += velocities[i * 3 + 1];
      if (array[i * 3 + 1] < 0) array[i * 3 + 1] = 2.5;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.018}
        color="#FFE4B5"
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// 2. Procedural Screen & Metal Textures
function useDoorTextures() {
  return useMemo(() => {
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 512;
    sCanvas.height = 512;
    const sCtx = sCanvas.getContext('2d')!;
    sCtx.fillStyle = '#021018';
    sCtx.fillRect(0, 0, 512, 512);

    sCtx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
    sCtx.lineWidth = 2;
    for (let i = 32; i < 512; i += 32) {
      sCtx.beginPath();
      sCtx.moveTo(i, 0);
      sCtx.lineTo(i, 512);
      sCtx.stroke();
      sCtx.beginPath();
      sCtx.moveTo(0, i);
      sCtx.lineTo(512, i);
      sCtx.stroke();
    }
    sCtx.strokeStyle = '#00E5FF';
    sCtx.lineWidth = 4;
    sCtx.strokeRect(20, 20, 472, 472);
    sCtx.beginPath();
    sCtx.arc(256, 210, 100, 0, Math.PI * 2);
    sCtx.stroke();
    sCtx.beginPath();
    sCtx.arc(256, 210, 50, 0, Math.PI * 2);
    sCtx.stroke();
    sCtx.beginPath();
    sCtx.moveTo(256, 90);
    sCtx.lineTo(256, 330);
    sCtx.stroke();
    sCtx.beginPath();
    sCtx.moveTo(136, 210);
    sCtx.lineTo(376, 210);
    sCtx.stroke();

    sCtx.fillStyle = '#00E5FF';
    sCtx.font = 'bold 22px monospace';
    sCtx.fillText('SYS_LOCK: SEC-06', 40, 420);
    sCtx.fillText('OVERRIDE // READY', 40, 460);

    const screenMap = new THREE.CanvasTexture(sCanvas);
    return { screenMap };
  }, []);
}

// 3. Camera Controller
function CameraRig({ isApproaching }: { isApproaching: boolean }) {
  const progress = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const camera = state.camera;

    if (isApproaching) {
      progress.current = Math.min(progress.current + delta * 0.35, 1.0);
    }

    const p = THREE.MathUtils.damp(progress.current, isApproaching ? 1.0 : 0.0, 3.0, delta);
    const swayX = Math.sin(t * 0.5) * 0.015;
    const swayY = Math.cos(t * 0.4) * 0.01;
    const walkBob = isApproaching ? Math.sin(p * Math.PI * 6.0) * 0.03 : 0;

    camera.position.x = swayX;
    camera.position.y = 1.45 + swayY + walkBob;
    camera.position.z = THREE.MathUtils.lerp(4.4, 1.35, p);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(36, 32, p);
      camera.updateProjectionMatrix();
    }
    camera.lookAt(0, 1.40, 0);
  });

  return null;
}

// 4. Main Scene Component
export function MasterSubterraneanScene() {
  const [isApproaching, setIsApproaching] = React.useState(false);
  const { screenMap } = useDoorTextures();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        position: 'fixed',
        inset: 0,
      }}
    >
      {/* 9:16 Vertical Cinema Frustum */}
      <div
        style={{
          height: '100vh',
          width: 'calc(100vh * 9 / 16)',
          maxWidth: '100vw',
          maxHeight: '100vh',
          aspectRatio: '9 / 16',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#080605',
          boxShadow: '0 0 60px rgba(0, 0, 0, 0.95)',
        }}
      >
        <Canvas
          style={{ width: '100%', height: '100%', display: 'block' }}
          gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.85 }}
          camera={{ position: [0, 1.45, 4.4], fov: 36 }}
        >
          <CameraRig isApproaching={isApproaching} />
          <FineAtmosphericDust count={90} />

          {/* ========================================================= */}
          {/* INTERNAL LIGHTING RIG (Inside the room volume)            */}
          {/* ========================================================= */}
          <ambientLight color="#2A2018" intensity={0.75} />

          {/* Left Amber Practical Key Light */}
          <directionalLight
            position={[-1.8, 2.2, 2.8]}
            target-position={[0, 1.35, 0]}
            color="#FFA030"
            intensity={9.5}
          />

          {/* Right Slate-Cyan Shadow Fill */}
          <directionalLight
            position={[1.8, 1.8, 2.8]}
            target-position={[0, 1.35, 0]}
            color="#285070"
            intensity={6.0}
          />

          {/* Front Center Fill */}
          <directionalLight
            position={[0, 1.4, 3.5]}
            target-position={[0, 1.35, 0]}
            color="#4A3A2C"
            intensity={2.5}
          />

          {/* Console Cyan Light */}
          <pointLight position={[0, 1.40, 0.25]} color="#00E5FF" intensity={2.2} distance={1.2} decay={1.0} />

          {/* ========================================================= */}
          {/* FLANKING ROCK WINGS (No light-blocking enclosed tube)      */}
          {/* ========================================================= */}
          <mesh position={[-1.65, 1.40, 0.8]} rotation={[0, Math.PI / 6, 0]}>
            <boxGeometry args={[1.2, 3.2, 2.4]} />
            <meshStandardMaterial color="#2B1A0F" roughness={0.88} metalness={0.10} />
          </mesh>
          <mesh position={[1.65, 1.40, 0.8]} rotation={[0, -Math.PI / 6, 0]}>
            <boxGeometry args={[1.2, 3.2, 2.4]} />
            <meshStandardMaterial color="#1E1610" roughness={0.92} metalness={0.08} />
          </mesh>
          {/* Floor Scree Bed */}
          <mesh position={[0, -0.15, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.0, 5.0]} />
            <meshStandardMaterial color="#140E0A" roughness={0.95} metalness={0.05} />
          </mesh>

          {/* ========================================================= */}
          {/* PHYSICAL 3D BLAST DOOR ASSEMBLY                           */}
          {/* ========================================================= */}
          <group
            position={[0, 1.35, 0]}
            onClick={(e) => {
              e.stopPropagation();
              setIsApproaching(true);
            }}
          >
            {/* Outer Octagonal Bevel Frame */}
            <mesh position={[0, 0, -0.02]}>
              <boxGeometry args={[1.64, 2.46, 0.08]} />
              <meshStandardMaterial color="#1A1612" metalness={0.90} roughness={0.35} />
            </mesh>

            {/* Left & Right Door Slabs */}
            <mesh position={[-0.37, 0, 0.02]}>
              <boxGeometry args={[0.72, 2.26, 0.05]} />
              <meshStandardMaterial color="#26201A" metalness={0.86} roughness={0.38} />
            </mesh>
            <mesh position={[0.37, 0, 0.02]}>
              <boxGeometry args={[0.72, 2.26, 0.05]} />
              <meshStandardMaterial color="#26201A" metalness={0.86} roughness={0.38} />
            </mesh>

            {/* Vertical Center Seam Well */}
            <mesh position={[0, 0, 0.015]}>
              <boxGeometry args={[0.025, 2.28, 0.06]} />
              <meshStandardMaterial color="#060504" metalness={0.95} roughness={0.20} />
            </mesh>

            {/* 4x Turbine Intake Wells */}
            {[
              [-0.37, 0.68],
              [0.37, 0.68],
              [-0.37, -0.68],
              [0.37, -0.68],
            ].map(([x, y], idx) => (
              <group key={`turbine-${idx}`} position={[x, y, 0.05]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.13, 0.13, 0.02, 32]} />
                  <meshStandardMaterial color="#16120E" metalness={0.90} roughness={0.30} />
                </mesh>
                <mesh position={[0, 0, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.11, 0.11, 0.02, 32]} />
                  <meshStandardMaterial color="#050403" metalness={0.95} roughness={0.20} />
                </mesh>
                {/* 8-Spoke Steel Grille */}
                {Array.from({ length: 4 }).map((_, sIdx) => (
                  <mesh key={`spoke-${sIdx}`} rotation={[0, 0, (sIdx * Math.PI) / 4]} position={[0, 0, 0.005]}>
                    <boxGeometry args={[0.20, 0.012, 0.008]} />
                    <meshStandardMaterial color="#3C3226" metalness={0.92} roughness={0.25} />
                  </mesh>
                ))}
              </group>
            ))}

            {/* Lateral Bolt Tracks (22x Fasteners) */}
            {[-0.68, 0.68].map((xRail, rIdx) => (
              <group key={`rail-${rIdx}`} position={[xRail, 0, 0.04]}>
                <mesh>
                  <boxGeometry args={[0.035, 2.22, 0.025]} />
                  <meshStandardMaterial color="#1A1612" metalness={0.90} roughness={0.35} />
                </mesh>
                {Array.from({ length: 11 }).map((_, bIdx) => (
                  <mesh key={`bolt-${bIdx}`} position={[0, -0.95 + bIdx * 0.19, 0.015]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.011, 0.011, 0.012, 6]} />
                    <meshStandardMaterial color="#4A3E30" metalness={0.95} roughness={0.22} />
                  </mesh>
                ))}
              </group>
            ))}

            {/* Central Biometric Housing */}
            <group position={[0, 0.06, 0.09]}>
              <mesh>
                <boxGeometry args={[0.20, 0.74, 0.12]} />
                <meshStandardMaterial color="#181410" metalness={0.92} roughness={0.28} />
              </mesh>
              {/* Telemetry Display Screen */}
              <mesh position={[0, 0.18, 0.061]}>
                <planeGeometry args={[0.13, 0.14]} />
                <meshBasicMaterial map={screenMap} />
              </mesh>
              {/* Cyan Iris Sensor Ring */}
              <mesh position={[0, -0.16, 0.062]}>
                <ringGeometry args={[0.032, 0.046, 32]} />
                <meshBasicMaterial color="#00E5FF" />
              </mesh>
              {/* Status LEDs */}
              <mesh position={[-0.065, -0.16, 0.062]}>
                <circleGeometry args={[0.005, 16]} />
                <meshBasicMaterial color="#00FF66" />
              </mesh>
              <mesh position={[0.065, -0.16, 0.062]}>
                <circleGeometry args={[0.005, 16]} />
                <meshBasicMaterial color="#FFAA00" />
              </mesh>
            </group>
          </group>

          {/* Post-Processing */}
          <EffectComposer>
            <Bloom intensity={0.4} luminanceThreshold={0.35} mipmapBlur />
            <ChromaticAberration offset={new THREE.Vector2(0.0006, 0.0006)} />
            <Vignette offset={0.30} darkness={0.65} />
          </EffectComposer>
        </Canvas>

        {/* Interaction Trigger */}
        {!isApproaching && (
          <div
            onClick={() => setIsApproaching(true)}
            style={{
              position: 'absolute',
              bottom: '48px',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              zIndex: 20,
              cursor: 'pointer',
            }}
          >
            <button
              style={{
                padding: '14px 28px',
                border: '1px solid rgba(0, 229, 255, 0.4)',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: '#67e8f9',
                fontFamily: 'monospace',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                borderRadius: '4px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 0 25px rgba(0, 229, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              [ APPROACH BLAST DOOR ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
