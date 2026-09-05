# Scene 1 — The Door: Real-Time 3D Fix Spec
### For pasting into Antigravity, replacing the static-image output

---

## 0. What went wrong, precisely

Your screenshot is a single generated raster image, not a scene. Three tells confirm it, all fixable by switching medium, not by re-prompting for "better cinematics":
1. **The panel text is illegible pseudo-glyphs** — image models paint shapes that resemble text, they don't compose real typography. Fix: real DOM/canvas text (Section 3).
2. **The floating cyan squares read as flat sprites**, not particles with depth or parallax — because in a raster image, nothing actually has depth. Fix: a real GPU-instanced particle system that moves with the camera (Section 4).
3. **Nothing can move** — no camera, no geometry, no raycaster target. Fix: an actual Three.js scene graph (Section 2).

The honest fidelity ceiling: real-time WebGL in a browser will not literally match offline-rendered film VFX or a $1000-GPU game engine at max settings. It can, with the specific techniques below, get close enough that most visitors won't consciously clock the difference — which is the actual bar igloo.inc and Active Theory clear, not literal ray-traced photorealism.

---

## 1. Fix the asset first, before any scene code

Do not let Antigravity generate the door model. Source or build it yourself first, hand the finished file over, and only then ask for scene code — this removes the ambiguity that made it default to image generation last time.

**Path A (fastest):** Generate a base mesh with Meshy AI or Tripo's free tier using this tightened prompt (reusing the template format from your master spec's Section 9, filled in specifically for this reshoot):
```
STYLE: Hard-surface sci-fi blast door, gunmetal/brushed-titanium/weathered-iron,
subtle cyan-accent circuitry, no text baked into geometry or textures (text is
added separately, Section 3), clean topology suitable for real-time PBR, NOT a
red/gold Iron Man palette, NOT arc-reactor iconography.
FORM: circular iris-style blast door, concentric mechanical rings, recessed
center panel
DETAIL: hex-bolt trim, layered ring segments with visible seams, cable
conduits running into the door frame from the rock
EMISSIVE: none baked in — emissive cyan strips added as a separate material
slot so they can be lit/animated independently
SCALE: roughly 2.5m diameter
POLY BUDGET: under 40k triangles (it's the hero object of the whole scene —
budget the rest of the tunnel props to leave headroom for this one)
```
**Path B (higher quality, more control):** Kitbash it in Blender from free CC0 sci-fi greeble kits (search Poly Haven and Sketchfab's CC0 filter) — genuinely faster than cleaning up a generated mesh once you've done it once, and gives you real control over the topology.

Either way: **import the raw model into a bare Three.js scene with just one light and look at it alone before doing anything else.** Confirm the silhouette, proportions, and topology are right in isolation — this is the review checkpoint that catches a bad asset cheaply instead of after it's wired into camera/lighting/interaction code.

---

## 2. The camera rig — scroll, look, and interaction as three decoupled systems

This is the piece that was structurally missing. Three independent inputs, each driving one thing only — don't let them tangle into one function, that's how these end up feeling broken/floaty.

```tsx
// CameraRig.tsx
import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Author these points to match your actual tunnel geometry once the
// model is in the scene — walk through it yourself in the Three.js
// editor or a debug orbit-camera first and note real-world coordinates.
const pathPoints = [
  new THREE.Vector3(0, 1.6, 12),   // scroll 0% — far down the tunnel
  new THREE.Vector3(0, 1.6, 6),
  new THREE.Vector3(0, 1.6, 2),
  new THREE.Vector3(0, 1.5, -0.5), // scroll 100% — at the door
];
const walkCurve = new THREE.CatmullRomCurve3(pathPoints);
const MAX_LOOK = 1.2; // world-units of parallax — tune by eye, this is what keeps it feeling "guided," not "free-fly"

export default function CameraRig({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const { camera } = useThree();
  const pointer = useRef({ x: 0, y: 0 });
  const smoothed = useRef({ x: 0, y: 0 });

  // SYSTEM 1 — mouse/touch drives ONLY the look offset, nothing else
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useFrame(() => {
    // SYSTEM 2 — scroll drives ONLY position along the path
    const t = THREE.MathUtils.clamp(scrollProgress.current, 0, 1);
    const pos = walkCurve.getPointAt(t);
    camera.position.lerp(pos, 0.08); // small lerp factor = weighted, physical-feeling movement, never a snap

    // look offset lerps toward the raw pointer position — this lag is
    // what separates "cinematic" from "twitchy webcam feed"
    smoothed.current.x = THREE.MathUtils.lerp(smoothed.current.x, pointer.current.x, 0.04);
    smoothed.current.y = THREE.MathUtils.lerp(smoothed.current.y, pointer.current.y, 0.04);

    const lookAhead = walkCurve.getPointAt(Math.min(t + 0.01, 1));
    const target = lookAhead.clone();
    target.x += smoothed.current.x * MAX_LOOK;
    target.y -= smoothed.current.y * MAX_LOOK * 0.6; // less vertical range than horizontal — matches how a person actually looks around
    camera.lookAt(target);
  });

  return null;
}
```

**Mobile:** replace the `pointermove` listener with `deviceorientation` (gyroscope-driven look, genuinely more immersive on phones than a touch-drag equivalent) with a `touchmove`-drag fallback for devices/browsers that deny motion-sensor permission. Scroll progress on mobile should come from vertical swipe, exactly as already spec'd in your master document.

## 3. Interaction — real raycasting, real text

React Three Fiber's `onClick`/`onPointerOver` on a mesh already does raycasting for you — no manual `THREE.Raycaster` setup needed:
```tsx
// DoorPanel.tsx
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function DoorPanel({ onActivate }: { onActivate: () => void }) {
  const mesh = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    const mat = mesh.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, hovered ? 2.4 : 1.6, 0.1);
  });

  return (
    <mesh
      ref={mesh}
      geometry={/* the panel sub-mesh from your imported GLB */}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onActivate(); }}
    />
  );
}
```
**The panel's on-screen text — this is what fixes the illegible-glyph problem directly:** never bake text into the model's texture. Either (a) render it as a real DOM `<div>` positioned via `camera.project()`-derived screen coordinates, layered above the canvas, styled with your actual design-token fonts, or (b) draw it onto a `THREE.CanvasTexture` using the browser's native `<canvas>` 2D text API with a real font — both give you crisp, legible, animatable text instead of an image model's guess at what text looks like.

---

## 4. Lighting and post-processing — how igloo.inc/Active Theory-tier "cinematic" is actually achieved in real time

None of this is one setting — it's a stack, and any single piece missing is usually why a real-time scene reads as "game" instead of "film."

```tsx
// Scene.tsx — renderer + lighting setup
<Canvas
  gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, antialias: true }}
  camera={{ fov: 32 }} // longer/narrower than the 50-75° default — this alone reads as "film lens" not "VR headset"
  dpr={[1, 1.8]} // caps cost on high-DPI screens, invisible perf killer otherwise
>
  <Environment files="/hdri/cave-industrial.hdr" background={false} /> {/* free HDRIs: polyhaven.com — this is what gives metal surfaces real, believable reflections instead of flat shading */}
  <directionalLight position={[-4, 3, 2]} intensity={2.2} color="#ff8a3d" castShadow /> {/* the warm cave-glow key light */}
  <pointLight position={[0, 1, -1]} intensity={3} color="#28e0ff" /> {/* the door's cyan accent */}
  <fog attach="fog" args={["#050506", 4, 18]} /> {/* depth cue that's nearly free, sells scale */}

  <SignatureDoor />
  <DustParticles /> {/* GPU-instanced, camera-relative — replaces the flat floating squares */}
  <CameraRig scrollProgress={scrollProgress} />

  <EffectComposer>
    <Bloom intensity={0.6} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
    <DepthOfField focusDistance={0.02} focalLength={0.05} bokehScale={3} /> {/* soft-focuses the far tunnel — real lenses do this, flat renders don't */}
    <ChromaticAberration offset={[0.0008, 0.0008]} />
    <Vignette offset={0.3} darkness={0.9} />
    <Noise opacity={0.025} /> {/* subtle film grain — this specific effect is disproportionately responsible for killing the "flat CGI" look */}
  </EffectComposer>
</Canvas>
```
`@react-three/postprocessing` ships all of the above as drop-in components. The **ACES tonemapping + film grain + narrow FOV** combination is doing more work toward "cinematic" than any texture or lighting choice — it's worth getting those three right before touching anything else.

**Dust particles**, replacing the flat squares:
```tsx
// GPU-instanced points, drift + camera-relative depth — reads as real atmosphere, not pasted sprites
<Points positions={particlePositions} stride={3}>
  <PointMaterial size={0.02} color="#7fd8ff" transparent opacity={0.35} depthWrite={false} sizeAttenuation />
</Points>
```

---

## 5. The corrected Antigravity prompt

The previous prompt left room for a shortcut. This one doesn't — it names the medium explicitly and forbids the fallback that produced the static image:

```
Rebuild Scene 1 ("the door") as a real-time, camera-navigable Three.js /
React Three Fiber scene. Do NOT generate a static background image for
the environment under any circumstance — the door model is the GLB file
at /assets/models/door.glb (already provided, do not regenerate it).

Requirements, all mandatory:
1. Load door.glb into a Three.js scene graph. Verify it renders correctly
   alone, with a single test light, before adding anything else.
2. Implement CameraRig exactly as specified in /docs/scene1-realtime-3d-fix.md
    Section 2 — scroll drives position along the CatmullRomCurve3 walk
    path, pointer/deviceorientation drives a CLAMPED look offset only.
    These are two separate systems — do not merge them into one function.
3. Panel text is rendered as a DOM overlay or CanvasTexture with real
    typography — never baked into a generated image or texture.
4. Interaction uses React Three Fiber's built-in onClick/onPointerOver
    raycasting on the actual mesh — no separate 2D hitbox over an image.
5. Lighting/post-processing stack exactly as Section 4: ACESFilmicToneMapping,
    Environment HDRI, Bloom, DepthOfField, ChromaticAberration, Vignette, Noise.
6. Show me a working preview after step 1 alone before proceeding to
    steps 2-5 — I want to review the asset in isolation first.

If at any point the door's visual design needs to change, the fix is a
new GLB asset (regenerated via Meshy/Blender per Section 1), never a
generated background image.
```

Put this whole document at `/docs/scene1-realtime-3d-fix.md` in the repo alongside `/docs/workshop-plan-v2.md` before running that prompt — same persistent-source-of-truth pattern as before, and it's what stops the agent from reaching for the same shortcut twice.

---

## 6. Reality check before you move to Scene 2

Get this one scene — one door, lit, walkable, clickable — feeling right in isolation first. It's a smaller, fully-buildable proof that the whole approach works, and it's the asset you'll judge every other scene against for consistency. Don't let Antigravity move on to the holo-table until this one is genuinely solid; a half-right Scene 1 compounds into six half-right scenes, which is a much harder thing to fix later than one scene now.
