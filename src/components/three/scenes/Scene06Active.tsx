import React, { useRef, useMemo, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { getFrustumSize } from '../../../lib/three/RectilinearPlane';
import { Interactable } from '../../scene/Interactable';
import { AtmosphericParticles } from '../AtmosphericParticles';

/**
 * src/components/three/scenes/Scene06Active.tsx
 * 
 * 3-Tier Multi-Plane Rectilinear Workshop Scene.
 * Pure rectilinear perspective (no equirectangular distortion).
 * 
 * - Layer 1: Far Background Shell (Z = -10.0m) with 16:9 aspect preservation in 9:16 portrait
 * - Layer 2: Midground Interactive Workbench (Z = -5.5m) with Depth-Displaced Geometry
 * - Layer 3: Live Volumetric Hologram (Z = -5.2m, Y = 0.35m) Anchored to Workbench with Additive Blending
 */

interface Scene06ActiveProps {
  opacity?: number;
  onHoloActivate?: () => void;
}

export const Scene06Active: React.FC<Scene06ActiveProps> = ({
  opacity = 1.0,
  onHoloActivate,
}) => {
  const { camera } = useThree();
  const holoRef = useRef<THREE.Mesh>(null);
  const workbenchRef = useRef<THREE.Group>(null);

  // Preload textures
  const [bgTexture, depthTexture, holoTexture] = useTexture([
    '/textures/scene-06-workbench-bg.jpg',
    '/textures/scene-06-workbench-depth.png',
    '/textures/scene-06-live-holo.jpg',
  ]);

  bgTexture.colorSpace = THREE.SRGBColorSpace;
  bgTexture.minFilter = THREE.LinearMipmapLinearFilter;
  bgTexture.magFilter = THREE.LinearFilter;
  bgTexture.wrapS = bgTexture.wrapT = THREE.ClampToEdgeWrapping;

  holoTexture.colorSpace = THREE.SRGBColorSpace;
  holoTexture.wrapS = holoTexture.wrapT = THREE.ClampToEdgeWrapping;

  // 1. Layer 1: Sized to overfill 9:16 vertical view while preserving 16:9 texture aspect ratio
  const pCam = camera as THREE.PerspectiveCamera;
  const frustumAt10 = useMemo(() => {
    return getFrustumSize(pCam, 10.0);
  }, [pCam]);

  const bgHeight = frustumAt10.height * 1.35;
  const bgWidth = bgHeight * (16 / 9);

  const bgMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: bgTexture,
      roughness: 0.85,
      metalness: 0.10,
      transparent: true,
      opacity: opacity,
      side: THREE.FrontSide,
    });
  }, [bgTexture, opacity]);

  useEffect(() => {
    bgMaterial.opacity = opacity;
  }, [bgMaterial, opacity]);

  // 2. Layer 2: Depth-Displaced Interactive Workbench Mesh (Z = -5.5m)
  const frustumAt55 = useMemo(() => {
    return getFrustumSize(pCam, 5.5);
  }, [pCam]);

  const wbHeight = frustumAt55.height * 1.25;
  const wbWidth = wbHeight * (16 / 9);

  const workbenchGeometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(wbWidth, wbHeight, 128, 128);
    return geom;
  }, [wbWidth, wbHeight]);

  // Depth displacement shader for the midground table
  const workbenchMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: bgTexture },
        tDepth: { value: depthTexture },
        uDepthScale: { value: 1.4 },
        uOpacity: { value: opacity },
      },
      vertexShader: `
        uniform sampler2D tDepth;
        uniform float uDepthScale;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          vUv = uv;
          float d = texture2D(tDepth, uv).r;
          vec3 displacedPos = position + vec3(0.0, 0.0, d * uDepthScale);
          vWorldPos = (modelMatrix * vec4(displacedPos, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tColor;
        uniform float uOpacity;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tColor, vUv);
          gl_FragColor = vec4(color.rgb, color.a * uOpacity);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
    });
  }, [bgTexture, depthTexture, opacity]);

  useEffect(() => {
    workbenchMaterial.uniforms.uOpacity.value = opacity;
  }, [workbenchMaterial, opacity]);

  // 3. Layer 3: Live Additive Hologram Floating Idle Animation
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (holoRef.current) {
      holoRef.current.position.y = 0.42 + Math.sin(t * 1.8) * 0.025;
      holoRef.current.rotation.y = Math.sin(t * 0.6) * 0.05;
    }
  });

  return (
    <group>
      {/* ========================================================================= */}
      {/* LAYER 1: Far Background Shell (Z = -10.0m, Frustum-Matched with Bleed)     */}
      {/* ========================================================================= */}
      <mesh position={[0, 1.40, -10.0]}>
        <planeGeometry args={[bgWidth, bgHeight]} />
        <primitive object={bgMaterial} attach="material" />
      </mesh>

      {/* ========================================================================= */}
      {/* LAYER 2: Midground Interactive Workbench (Z = -5.5m, Depth Displaced)     */}
      {/* ========================================================================= */}
      <group ref={workbenchRef} position={[0, 0.20, -5.5]}>
        <mesh geometry={workbenchGeometry} material={workbenchMaterial} />
      </group>

      {/* ========================================================================= */}
      {/* LAYER 3: Live Volumetric Hologram (Z = -5.2m, Anchored to Table Surface)  */}
      {/* ========================================================================= */}
      <Interactable
        id="holo-core-target"
        position={[0, 0.35, -5.2]}
        onActivate={() => onHoloActivate?.()}
      >
        {/* Cyan Emitter Cone Base on Table Surface */}
        <mesh position={[0, -0.20, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.45, 0.12, 32]} />
          <meshStandardMaterial color="#0A0806" metalness={0.92} roughness={0.30} />
        </mesh>

        {/* Floating Additive Hologram Map */}
        <mesh ref={holoRef} position={[0, 0.42, 0]}>
          <planeGeometry args={[1.5, 0.95]} />
          <meshBasicMaterial
            map={holoTexture}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            opacity={opacity * 0.95}
          />
        </mesh>

        {/* Emissive Table Uplight */}
        <pointLight
          color="#00E5FF"
          intensity={2.8 * opacity}
          distance={2.5}
          decay={1.5}
          position={[0, 0.1, 0]}
        />
      </Interactable>

      {/* ========================================================================= */}
      {/* LIGHTING RIG: Dual-Spectrum Chiaroscuro Lighting                          */}
      {/* ========================================================================= */}
      <ambientLight color="#14100c" intensity={0.8} />

      {/* Overhead Amber Caged Industrial Pendant */}
      <pointLight
        position={[-1.8, 3.2, -5.5]}
        color="#FFA030"
        intensity={6.5 * opacity}
        distance={14}
      />

      {/* Right Bulkhead Fill Light */}
      <pointLight
        position={[3.5, 2.8, -7.5]}
        color="#2E4A62"
        intensity={4.0 * opacity}
        distance={12}
      />

      {/* Layer 3: GPU Instanced Atmospheric Dust Simulation */}
      <AtmosphericParticles count={110} area={[6.0, 3.5, 7.0]} opacity={opacity * 0.35} />
    </group>
  );
};
