import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

import { Scene00, SC00_LOOK_TARGET } from './Scene00';
import { Scene01Panel } from './Scene01Panel';
import { Scene02Threshold } from './Scene02Threshold';
import { Scene03Darkroom } from './Scene03Darkroom';
import { Scene04Mapping } from './Scene04Mapping';
import { Scene06Active } from './Scene06Active';
import { CameraDirector, CameraRailConfig, CameraLookClamp } from '../CameraDirector';
import { useSceneStore } from '../../../store/sceneStore';
import { soundFx } from '../../../utils/audio';

/**
 * src/components/three/scenes/WorkshopExperience.tsx
 * 
 * Master Sequential Narrative Experience Engine:
 * SC00_APPROACH -> SC01_PANEL -> SC02_THRESHOLD -> SC03_DARKROOM -> SC04_MAPPING -> SC06_ACTIVE
 */

// Global texture preload on initial boot
useTexture.preload([
  '/textures/scene-06-workbench-bg.jpg',
  '/textures/scene-06-workbench-depth.png',
  '/textures/scene-06-live-holo.jpg',
  '/textures/rock-sedimentary-albedo.webp',
  '/textures/rock-sedimentary-normal.webp',
  '/textures/rock-sedimentary-roughness.webp',
]);

const WORKSHOP_LOOK_CLAMP: CameraLookClamp = {
  maxYawDeg: 35,
  maxPitchDeg: 20,
};

export const WorkshopExperience: React.FC = () => {
  const { camera, gl } = useThree();
  const currentScene = useSceneStore((s) => s.currentScene);
  const setScene = useSceneStore((s) => s.setScene);
  const setIsTransitioning = useSceneStore((s) => s.setIsTransitioning);

  const [isDollying, setIsDollying] = useState(false);
  const [thresholdProgress, setThresholdProgress] = useState(0);

  // Camera look target configuration
  const cameraConfig = useRef<CameraRailConfig>({
    path: null,
    lookTarget: currentScene === 'SC06_ACTIVE' ? new THREE.Vector3(0, 1.40, -5.0) : SC00_LOOK_TARGET,
    fov: 36,
  });

  // 1. Dolly from Approach (4.4m) to Panel (1.2m) with Walking Bob & Focal Rack
  const handleDoorClick = useCallback(() => {
    if (isDollying) return;
    setIsDollying(true);
    setIsTransitioning(true);

    const anim = { p: 0 };
    const pCam = camera as THREE.PerspectiveCamera;

    gsap.to(anim, {
      p: 1.0,
      duration: 2.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        const progress = anim.p;
        // Forward Z motion
        camera.position.z = THREE.MathUtils.lerp(4.4, 1.20, progress);
        // Organic walking head-bob (±0.035m)
        camera.position.y = 1.36 + Math.sin(progress * Math.PI * 6.0) * 0.035;
        camera.position.x = Math.sin(progress * Math.PI * 3.0) * 0.015;

        // Dynamic optical focal rack (36° -> 30°)
        if ('fov' in pCam) {
          pCam.fov = THREE.MathUtils.lerp(36, 30, progress);
          pCam.updateProjectionMatrix();
        }

        camera.lookAt(SC00_LOOK_TARGET);
      },
      onComplete: () => {
        setIsDollying(false);
        setIsTransitioning(false);
        setScene('SC01_PANEL');
      },
    });
  }, [isDollying, camera, setIsTransitioning, setScene]);

  // 2. Sequence through Door Unlock -> Mechanical Retraction -> Darkness -> Mapping -> Active Workshop
  const handleAuthSuccess = useCallback(() => {
    if (isDollying) return;
    setIsDollying(true);
    setIsTransitioning(true);

    // Play 40Hz sub-bass lock clank, pneumatic steam vent hiss, and hydraulic rumble
    soundFx.playMechanicalClank();
    setTimeout(() => soundFx.playSteamVent(), 150);
    setTimeout(() => soundFx.playDoorRumble(), 300);

    const tl = gsap.timeline();

    // SC02: Breach & Threshold (Door slabs slide horizontally apart into rock walls)
    tl.call(() => {
      setScene('SC02_THRESHOLD');
    });

    tl.to(
      {},
      {
        duration: 2.2,
        ease: 'power2.inOut',
        onUpdate: function () {
          setThresholdProgress(this.progress());
        },
      },
      0
    );

    // Advance camera through opened portal into threshold
    tl.to(
      camera.position,
      {
        x: 0,
        y: 1.40,
        z: -1.5,
        duration: 2.2,
        ease: 'power2.inOut',
        onUpdate: () => {
          camera.lookAt(0, 1.40, -5.0);
        },
      },
      0
    );

    // SC03: Subterranean Darkroom (Standby darkness with pulsing emergency beacon)
    tl.call(() => {
      setScene('SC03_DARKROOM');
    });
    tl.to({}, { duration: 1.2 });

    // SC04: Environmental Laser Mapping Sweep
    tl.call(() => {
      setScene('SC04_MAPPING');
    });
    tl.to({}, { duration: 1.5 });

    // SC06: Active Workshop with Live Additive Hologram
    tl.call(() => {
      setIsDollying(false);
      setIsTransitioning(false);
      setScene('SC06_ACTIVE');
    });
  }, [isDollying, camera, setIsTransitioning, setScene]);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.60;

    if (
      currentScene === 'SC06_ACTIVE' ||
      currentScene === 'SC03_DARKROOM' ||
      currentScene === 'SC04_MAPPING'
    ) {
      camera.position.set(0, 1.40, 0.0);
      camera.lookAt(0, 1.40, -5.0);
      cameraConfig.current.lookTarget.set(0, 1.40, -5.0);
      if ('fov' in camera) {
        (camera as THREE.PerspectiveCamera).fov = 36;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    } else if (currentScene === 'SC01_PANEL') {
      camera.position.set(0, 1.36, 1.20);
      camera.lookAt(SC00_LOOK_TARGET);
      cameraConfig.current.lookTarget.copy(SC00_LOOK_TARGET);
      if ('fov' in camera) {
        (camera as THREE.PerspectiveCamera).fov = 30;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    } else if (currentScene === 'SC00_APPROACH') {
      camera.position.set(0, 1.40, 4.4);
      camera.lookAt(SC00_LOOK_TARGET);
      cameraConfig.current.lookTarget.copy(SC00_LOOK_TARGET);
      if ('fov' in camera) {
        (camera as THREE.PerspectiveCamera).fov = 36;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    }
  }, [currentScene, camera, gl]);

  return (
    <group>
      {/* 1. SC00: Subterranean Approach with Steadicam Sway & Atmospheric Dust */}
      {currentScene === 'SC00_APPROACH' && (
        <Scene00 onArrived={handleDoorClick} />
      )}

      {/* 2. SC01: Biometric Panel Security Console */}
      {currentScene === 'SC01_PANEL' && (
        <Scene01Panel onAuth={handleAuthSuccess} />
      )}

      {/* 3. SC02: Portal Breach, Mechanical Door Retraction & Steam Vents */}
      {currentScene === 'SC02_THRESHOLD' && (
        <Scene02Threshold progress={thresholdProgress} />
      )}

      {/* 4. SC03: Standby Darkroom Chamber */}
      {currentScene === 'SC03_DARKROOM' && (
        <Scene03Darkroom />
      )}

      {/* 5. SC04: Environmental Laser Mapping */}
      {currentScene === 'SC04_MAPPING' && (
        <Scene04Mapping />
      )}

      {/* 6. SC06: Active Multi-Plane Workshop */}
      {currentScene === 'SC06_ACTIVE' && (
        <Scene06Active opacity={1.0} onHoloActivate={() => console.log('Hologram core active')} />
      )}

      {/* Clamped Pointer Look Camera Director with Steadicam Breathing Sway */}
      {!isDollying && (
        <CameraDirector
          rail={cameraConfig.current}
          lookClamp={WORKSHOP_LOOK_CLAMP}
          positionDamping={5.0}
          lookDamping={5.0}
          enableBreathing={true}
        />
      )}
    </group>
  );
};
