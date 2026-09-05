import React, { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { soundFx } from '../../utils/audio';

interface HandcraftedBlastDoorProps {
  onActivate?: () => void;
  isUnlocked?: boolean;
}

export const HandcraftedBlastDoor: React.FC<HandcraftedBlastDoorProps> = ({
  onActivate,
  isUnlocked = false,
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const outerGearRef = useRef<THREE.Group>(null!);
  const innerIrisRef = useRef<THREE.Group>(null!);
  const pistonGroupRef = useRef<THREE.Group>(null!);

  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<string>('STANDBY // 128-D READY');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // 1. PBR Metal Materials
  const materials = useMemo(() => {
    // Heavy Gunmetal Steel (Dark, High Metallic, Brushed Micro-Roughness)
    const gunmetal = new THREE.MeshStandardMaterial({
      color: 0x1a222e,
      metalness: 0.88,
      roughness: 0.32,
      envMapIntensity: 1.8,
    });

    // Brushed Titanium (Lighter Specular Highlights, Crisp Bevels)
    const brushedTitanium = new THREE.MeshStandardMaterial({
      color: 0x2e3b4e,
      metalness: 0.94,
      roughness: 0.22,
      envMapIntensity: 2.2,
    });

    // Mirror Polished Chrome (Piston Rods)
    const polishedChrome = new THREE.MeshStandardMaterial({
      color: 0xe0e8f0,
      metalness: 0.98,
      roughness: 0.08,
      envMapIntensity: 2.5,
    });

    // Weathered Cast Iron (Frame & Base Housing)
    const weatheredIron = new THREE.MeshStandardMaterial({
      color: 0x0e131b,
      metalness: 0.75,
      roughness: 0.62,
      envMapIntensity: 1.2,
    });

    // Copper / Brass Hydraulic Conduits
    const copperPipe = new THREE.MeshStandardMaterial({
      color: 0x8a5432,
      metalness: 0.85,
      roughness: 0.35,
      envMapIntensity: 1.6,
    });

    // Emissive Cyan Laser Strip
    const emissiveCyan = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: new THREE.Color(0x00f3ff),
      emissiveIntensity: 2.4,
      roughness: 0.1,
    });

    // Emissive Amber Status Strip
    const emissiveAmber = new THREE.MeshStandardMaterial({
      color: 0xff9e2c,
      emissive: new THREE.Color(0xff9e2c),
      emissiveIntensity: 2.0,
      roughness: 0.1,
    });

    // Hex Bolt Steel
    const hexBolt = new THREE.MeshStandardMaterial({
      color: 0x48586e,
      metalness: 0.95,
      roughness: 0.15,
      envMapIntensity: 2.0,
    });

    return {
      gunmetal,
      brushedTitanium,
      polishedChrome,
      weatheredIron,
      copperPipe,
      emissiveCyan,
      emissiveAmber,
      hexBolt,
    };
  }, []);

  // 2. Dynamic 2D Canvas for High-Res Real-Time Terminal Screen
  const { screenTexture, updateScreen } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);

    const update = (status: string, scanning: boolean, time: number) => {
      ctx.fillStyle = '#060a0f';
      ctx.fillRect(0, 0, 512, 360);

      // Sci-Fi Telemetry Grid
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 512; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 360);
        ctx.stroke();
      }
      for (let y = 0; y < 360; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      // Rotating 3D Facial Point-Cloud Wireframe
      const cx = 256;
      const cy = 165;
      ctx.fillStyle = '#00f3ff';
      const points = 56;
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2 + time * 0.8;
        const r = 62 + Math.sin(i * 0.6 + time * 2) * 10;
        const px = cx + Math.cos(angle) * r * 0.8;
        const py = cy + Math.sin(angle) * r;
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      }

      // Scanning line
      if (scanning) {
        const scanY = (Math.sin(time * 4) * 0.5 + 0.5) * 240 + 40;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, scanY);
        ctx.lineTo(472, scanY);
        ctx.stroke();
      }

      // Crisp Real Typography (JetBrains Mono)
      ctx.fillStyle = '#00f3ff';
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillText('BIOMETRIC ALPHA // LEVEL 4', 24, 38);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillText(`STATUS: ${status}`, 24, 66);
      ctx.fillText('ENCRYPTION: AES-GCM-256', 24, 320);

      ctx.textAlign = 'right';
      ctx.fillText('NODES: 128-D', 488, 320);

      texture.needsUpdate = true;
    };

    return { screenTexture: texture, updateScreen: update };
  }, []);

  // 3. Frame Update: Mechanical Kinematics
  useFrame((_, delta) => {
    const time = Date.now() * 0.001;

    // Update the terminal screen canvas texture
    updateScreen(terminalStatus, isScanning, time);

    // Mechanical Gear and Iris Rotation upon Unlocking
    if (isUnlocked) {
      if (outerGearRef.current) outerGearRef.current.rotation.z += delta * 0.6;
      if (innerIrisRef.current) innerIrisRef.current.rotation.z -= delta * 0.9;
      if (pistonGroupRef.current) {
        pistonGroupRef.current.children.forEach((piston, idx) => {
          // Retract hydraulic pistons radially
          piston.position.x = THREE.MathUtils.lerp(piston.position.x, Math.cos((idx / 8) * Math.PI * 2) * 1.35, delta * 2);
          piston.position.y = THREE.MathUtils.lerp(piston.position.y, Math.sin((idx / 8) * Math.PI * 2) * 1.35, delta * 2);
        });
      }
    }
  });

  // 4. Precalculated Radial Coordinates for Handcrafted Sub-Components
  const hexBolts24 = useMemo(() => {
    const items = [];
    const radius = 1.38;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      items.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius, rot: a });
    }
    return items;
  }, []);

  const gearTeeth32 = useMemo(() => {
    const items = [];
    const radius = 1.48;
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      items.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius, rot: a });
    }
    return items;
  }, []);

  const hydraulicPistons8 = useMemo(() => {
    const items = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      items.push({ x: Math.cos(a) * 1.15, y: Math.sin(a) * 1.15, rot: a });
    }
    return items;
  }, []);

  // Handcrafted Interactive Button Handlers
  const handleRegisterClick = (e: any) => {
    e.stopPropagation();
    soundFx.playClickBeep();
    setTerminalStatus('ENROLLING OPERATIVE (128-D)...');
    setIsScanning(true);
    setTimeout(() => {
      soundFx.playAccessGranted();
      setIsScanning(false);
      setTerminalStatus('ENROLLMENT RECORDED // TIER 2');
      if (onActivate) onActivate();
    }, 1400);
  };

  const handleVerifyClick = (e: any) => {
    e.stopPropagation();
    soundFx.playScannerSweep();
    setTerminalStatus('SCANNING VECTOR MATRIX...');
    setIsScanning(true);
    setTimeout(() => {
      soundFx.playAccessGranted();
      soundFx.playDoorRumble();
      setIsScanning(false);
      setTerminalStatus('CLEARANCE VERIFIED // UNLOCKING');
      if (onActivate) onActivate();
    }, 1600);
  };

  return (
    <group ref={groupRef} position={[0, 1.5, 0]}>
      {/* =========================================================================
          1. HEAVY OUTER FLANGE & ROCK-ANCHOR REINFORCEMENTS (3.4m x 3.4m)
          ========================================================================= */}
      <mesh material={materials.weatheredIron} position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 3.4, 0.28]} />
      </mesh>

      {/* Hydraulic Conduit Lines (Left & Right Flanges) */}
      {[-1.52, -1.42, 1.42, 1.52].map((x, idx) => (
        <group key={idx} position={[x, 0, 0.16]}>
          <mesh material={idx % 2 === 0 ? materials.brushedTitanium : materials.copperPipe} castShadow>
            <cylinderGeometry args={[0.038, 0.038, 3.3, 16]} />
          </mesh>
          {/* Clamp Brackets */}
          {[-1.2, -0.4, 0.4, 1.2].map((y, bIdx) => (
            <mesh key={bIdx} position={[0, y, 0.03]} material={materials.hexBolt} castShadow>
              <boxGeometry args={[0.1, 0.05, 0.05]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* =========================================================================
          2. OUTER CONCENTRIC GEAR-TOOTHED ARMOR RING (2.8m Diameter)
          ========================================================================= */}
      <group ref={outerGearRef} position={[0, 0, 0.14]}>
        <mesh material={materials.gunmetal} castShadow receiveShadow>
          <torusGeometry args={[1.36, 0.14, 20, 64]} />
        </mesh>

        {/* 32 Machined Gear Teeth around Perimeter */}
        {gearTeeth32.map((g, idx) => (
          <mesh
            key={idx}
            position={[g.x, g.y, 0]}
            rotation={[0, 0, g.rot]}
            material={materials.brushedTitanium}
            castShadow
          >
            <boxGeometry args={[0.08, 0.06, 0.12]} />
          </mesh>
        ))}

        {/* 24 Perimeter Hex Bolts */}
        {hexBolts24.map((b, idx) => (
          <mesh
            key={idx}
            position={[b.x, b.y, 0.09]}
            rotation={[0, 0, b.rot]}
            material={materials.hexBolt}
            castShadow
          >
            <cylinderGeometry args={[0.024, 0.024, 0.04, 6]} />
          </mesh>
        ))}
      </group>

      {/* =========================================================================
          3. MIDDLE HYDRAULIC LOCKING ASSEMBLY (2.0m Diameter)
          ========================================================================= */}
      <group position={[0, 0, 0.18]}>
        <mesh material={materials.brushedTitanium} castShadow receiveShadow>
          <cylinderGeometry args={[1.2, 1.24, 0.12, 36]} />
        </mesh>

        {/* 8 Radial Hydraulic Pistons & Deadbolt Wedges */}
        <group ref={pistonGroupRef}>
          {hydraulicPistons8.map((p, idx) => (
            <group key={idx} position={[p.x, p.y, 0.08]} rotation={[0, 0, p.rot]}>
              {/* Outer Cylinder Sleeve */}
              <mesh material={materials.gunmetal} castShadow>
                <boxGeometry args={[0.26, 0.12, 0.14]} />
              </mesh>
              {/* Inner Chrome Mirror Piston Shaft */}
              <mesh position={[0.08, 0, 0]} material={materials.polishedChrome}>
                <cylinderGeometry args={[0.03, 0.03, 0.22, 16]} />
              </mesh>
              {/* Hardened Locking Wedge Pin */}
              <mesh position={[0.16, 0, 0]} material={materials.brushedTitanium} castShadow>
                <boxGeometry args={[0.1, 0.08, 0.12]} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Circular Emissive Cyan Laser Channel */}
        <mesh position={[0, 0, 0.065]}>
          <ringGeometry args={[1.02, 1.05, 48]} />
          <primitive object={materials.emissiveCyan} attach="material" />
        </mesh>
      </group>

      {/* =========================================================================
          4. MULTI-LAYER MECHANICAL IRIS DIAPHRAGM (1.3m Diameter)
          ========================================================================= */}
      <group ref={innerIrisRef} position={[0, 0, 0.25]}>
        <mesh material={materials.gunmetal} castShadow receiveShadow>
          <cylinderGeometry args={[0.82, 0.85, 0.08, 32]} />
        </mesh>

        {/* 6 Interlocking Triangular Titanium Iris Blades with Layered Offsets */}
        {[0, 60, 120, 180, 240, 300].map((deg, idx) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <group key={idx} position={[Math.cos(rad) * 0.44, Math.sin(rad) * 0.44, 0.045 + idx * 0.005]} rotation={[0, 0, rad]}>
              <mesh material={materials.brushedTitanium} castShadow>
                <boxGeometry args={[0.42, 0.2, 0.03]} />
              </mesh>
              {/* Emissive Edge Tracing on Blade */}
              <mesh position={[0.18, 0, 0.016]}>
                <boxGeometry args={[0.015, 0.18, 0.008]} />
                <primitive object={materials.emissiveCyan} attach="material" />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* =========================================================================
          5. RECESSED BIOMETRIC SECURITY MATRIX (0.65m Diameter)
          ========================================================================= */}
      <group position={[0, 0, 0.32]}>
        {/* Heavy Flanged Housing Ring */}
        <mesh material={materials.weatheredIron} castShadow>
          <cylinderGeometry args={[0.38, 0.4, 0.1, 32]} />
        </mesh>

        {/* Top Horizontal Cyan LED Light Bar */}
        <mesh position={[0, 0.26, 0.055]}>
          <boxGeometry args={[0.46, 0.02, 0.02]} />
          <primitive object={materials.emissiveCyan} attach="material" />
        </mesh>

        {/* Real-Time 3D Digital Screen (Driven by Canvas Texture) */}
        <mesh position={[0, 0.08, 0.052]}>
          <planeGeometry args={[0.48, 0.32]} />
          <meshBasicMaterial map={screenTexture} />
        </mesh>

        {/* Mechanical Iris Camera Housing */}
        <mesh position={[0, -0.16, 0.056]} material={materials.brushedTitanium} castShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.04, 24]} />
        </mesh>

        {/* Glowing Cyan Camera Lens Pupil */}
        <mesh position={[0, -0.16, 0.078]}>
          <circleGeometry args={[0.08, 24]} />
          <meshBasicMaterial color="#00f3ff" />
        </mesh>

        {/* 3D Physical Interactive Control Buttons (Raycast-Targetable in World) */}
        <group position={[0, -0.28, 0.06]}>
          {/* 1. REGISTER Button */}
          <mesh
            position={[-0.14, 0, 0]}
            material={hoveredBtn === 'REG' ? materials.emissiveCyan : materials.brushedTitanium}
            onPointerOver={e => {
              e.stopPropagation();
              setHoveredBtn('REG');
              soundFx.playHoverBlip();
            }}
            onPointerOut={() => setHoveredBtn(null)}
            onClick={handleRegisterClick}
            castShadow
          >
            <boxGeometry args={[0.12, 0.05, 0.03]} />
          </mesh>

          {/* 2. VERIFY Button */}
          <mesh
            position={[0, 0, 0]}
            material={hoveredBtn === 'VER' ? materials.emissiveCyan : materials.brushedTitanium}
            onPointerOver={e => {
              e.stopPropagation();
              setHoveredBtn('VER');
              soundFx.playHoverBlip();
            }}
            onPointerOut={() => setHoveredBtn(null)}
            onClick={handleVerifyClick}
            castShadow
          >
            <boxGeometry args={[0.12, 0.05, 0.03]} />
          </mesh>

          {/* 3. RESET Button */}
          <mesh
            position={[0.14, 0, 0]}
            material={hoveredBtn === 'RST' ? materials.emissiveAmber : materials.brushedTitanium}
            onPointerOver={e => {
              e.stopPropagation();
              setHoveredBtn('RST');
              soundFx.playHoverBlip();
            }}
            onPointerOut={() => setHoveredBtn(null)}
            onClick={e => {
              e.stopPropagation();
              soundFx.playClickBeep();
              setTerminalStatus('STANDBY // 128-D READY');
              setIsScanning(false);
            }}
            castShadow
          >
            <boxGeometry args={[0.12, 0.05, 0.03]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
