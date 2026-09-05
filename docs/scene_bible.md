# THE CAVE — Master Scene Bible
### Visual Production, Geometry Underlay & Interactive Element Specification

> **Purpose of this document.** Every scene prompt, every transition description, every interactive element, and every geometry anchor lives here. Any frame generated from this document — whether it's frame 1 or frame 1,000,000 — must be visually consistent with every other frame. When you add or remove a scene, clone its neighbor's style block and change only what is new. Do not change the Style Lock.

---

## ⚠️ Honest Assessment Before We Begin

Before the pipeline section: three things you should hear plainly.

1. **The geometry approach is not the problem.** Real-time Three.js geometry is the right foundation for the interactive layer. The problem is that *photorealism is a post-processing problem*, not a geometry problem. You will never close the gap between hand-built primitives and Unreal Engine 5 renders by adding more BoxGeometries. The correct solution — which this document specifies — is to use AI-generated images as the *visual skin* over a minimal collision geometry skeleton. The geometry's job is physics and interaction; the images' job is beauty.

2. **Image consistency requires a locked seed.** Every image generation call for this project must use the exact same Style Bible block at the top of its prompt. One word of drift and the cave walls change texture, the lighting color temperature shifts, and the scenes stop reading as the same physical space. The Style Bible section below is the single source of truth for all prompts.

3. **The interactive geometry underlay is simple.** The physics skeleton does not need to look good — it needs to be correctly shaped and correctly positioned. Invisible collision meshes for the door, the workbench, the holo-table, the sticky notes, and the tools. The AI-generated images wrap over them as layered parallax planes. This is the same technique used in AAA 2.5D games and it is exactly the right approach for this project.

---

## Part 1 — The Locked Style Bible

> Copy this block verbatim to the top of every single image generation prompt. Change nothing except what is explicitly marked `[SCENE-SPECIFIC]`.

```
STYLE BIBLE — CAVE WORKSHOP (DO NOT MODIFY)

Photographic reference: Unreal Engine 5 / Octane Render, hyper-realistic hard-surface 3D render.
Aspect ratio: 9:16 vertical (portrait), 1080x1920 or 2160x3840.
Color grading: ACES Filmic tone mapping. Near-monochromatic color scheme per scene (see SCENE PALETTE).
Rendering: Ray-traced global illumination, subsurface cavity shadows, physically-based materials.
Atmosphere: Volumetric fog density 0.15-0.25, subtle dust particle motes in light shafts.
Rock material: Dark orange-umber sedimentary cave rock (#2B1A0F), rough hand-chiseled surface, micro-crack detail at 8K.
Metal material: Dark gunmetal grey brushed steel (#1A1714), hex bolt hardware, recessed panel seams, micro-scratch wear on all edges, slight grease accumulation in seam grooves.
Lighting rig (default unless overridden): Primary warm amber/golden side key (#FFA030) from upper-left at 35°. Secondary cool slate-cyan fill (#1E4868) from upper-right. Practical localized cyan/teal glow from screen surfaces and holo-emitters.
Depth of field: Focus on scene's primary focal point. Slight foreground bokeh on cave rock edges.
Camera: First-person perspective, 28-34mm equivalent FOV, eye level at 1.60m. Viewer is NEVER visible.
Post-processing: Subtle chromatic aberration on lens edges, slight vignette, film grain 0.02 opacity.
Prohibitions: No text overlaid by image generator unless specified. No generic sci-fi chrome. No blue-white clean-room aesthetic. No visible sun or outdoor light. No cartoon shading.
```

---

## Part 2 — Scene Registry

The experience has **6 Scenes** (S00–S05) and **5 Transitions** (T00-01 through T04-05).

```
S00 --- T00-01 --- S01 --- T01-02 --- S02 --- T02-03 --- S03 --- T03-04 --- S04 --- T04-05 --- S05
DOOR        APPROACH      PANEL         ENTRY         DARKNESS      HOLOGRAM      ENTITY        ROOM-ON      WORKBENCH
```

---

## Part 3 — Scene Prompts

Each scene has:
- **Prompt** — the exact text for image generation (prepend Style Bible)
- **Scene Palette** — the dominant color grading override for this scene
- **Primary Focal Point** — what depth of field focuses on
- **Key Geometry Anchors** — the collision mesh locations this image must align with
- **Frame Count (approx.)** — how many keyframes to generate

---

### S00 — THE BLAST DOOR (Entry / Hero Shot)

**Scene Palette:** Warm amber dominant. Left 60% of frame washed in golden-amber key light. Right 30% in deep shadow with subtle slate-cyan edge fill. Cavern ceiling corners near-black.

**Primary Focal Point:** Center of blast door, eye level (~1.36m height).

**Prompt:**
```
[STYLE BIBLE]
SCENE PALETTE: Warm amber dominant, left-amber / right-slate-cyan chiaroscuro split.

A massive, heavy-duty industrial sci-fi blast door embedded deep into the raw face of a rugged
subterranean cave. Centered exactly in frame. Viewer stands at approximately 4.5 meters from the
door at eye level; cave ceiling visible in upper frame, cave floor NOT visible (cut off below frame).
The door is gunmetal grey brushed steel, approximately 1.6m wide and 2.8m tall. Physical details:
two vertical split-leaf panels with razor-thin center seam, four circular turbine intake vents
(two upper, two lower) with recessed steel grilles inside, perimeter conduit rail with 22 hex bolts
on each side, 45-degree corner chamfers forming stepped octagonal profile. Center-mounted biometric
control panel: slim vertical pillar 0.20m wide, 0.74m tall, with recessed cyan telemetry screen
at top (crosshair reticle visible), glowing optical iris scanner ring below (bright cyan ring, dark
interior), flanking status micro-LEDs (green left, amber right). Faint "06" stencil on each door leaf
at mid-height. Fine green circuit-trace line graphics barely visible across door surface. Left cave
wall catches warm amber key light casting rich shadows on door's left edge. Right side in deep
shadow, thin slate-cyan rim light reveals right cave wall. Volumetric light shaft from upper left.
Photorealistic, 8K, Unreal Engine 5.
```

**Key Geometry Anchors:**
- Door center: `[0, 1.36, 0]`
- Turbine vent centers: `[-0.34, 2.04, 0]`, `[0.34, 2.04, 0]`, `[-0.34, 0.68, 0]`, `[0.34, 0.68, 0]`
- Biometric panel: `[0, 1.42, 0.11]`
- Collision box (door): `[-0.78, 0, -0.04]` to `[0.78, 2.72, 0.08]`

**Approx. Frame Count:** 1 key frame + 6 micro-parallax variants (camera sway ±0.04m X, ±0.02m Y)

---

### S01 — THE APPROACH (Door Close-Up / Biometric Panel)

**Scene Palette:** Same amber/slate split, amber now centrally illuminating the door. Peripheral cave darker. Cyan from panel now a prominent local glow.

**Primary Focal Point:** Central biometric panel iris scanner.

**Prompt:**
```
[STYLE BIBLE]
SCENE PALETTE: Amber central illumination, cyan halo from biometric panel, deep peripheral shadow.

Extreme close-up of the central biometric control panel of the same sci-fi blast door. Viewer is
now approximately 1.4 meters from the door surface, eye level aligned with panel center. The panel
housing is dark gunmetal, approximately 0.20m wide, 0.74m tall, physically extruded 0.13m forward
from the door face. At the top: a recessed rectangular monitor cavity showing a bright glowing cyan
telemetry HUD — circular targeting reticle with crosshair, sinusoidal waveform at bottom, monospace
text "SYS_LOCK: SEC-06" and "OVERRIDE // READY" in electric cyan. Below the screen: a status LED
glowing cyan. Below that: prominent circular iris scanner housing — bright cyan ring (approx. 0.09m
outer diameter) around a deep dark interior lens, flanked by a green LED micro-dot left and amber
LED micro-dot right. Above and below the panel run thin cylindrical conduit pipes. On either side
of the panel, blast door leaves partially visible in peripheral warm amber light catching their
brushed metal surface grain. "06" stencil clearly readable as dark stamped military text at this
range. Cave rock visible in extreme far frame edges — rough umber texture, barely lit. Panel in
sharp focus, door leaf surface slightly blurred background, cave edges in foreground bokeh.
```

**Key Geometry Anchors:**
- Camera at: `[0, 1.36, 1.45]`
- Panel: `[0, 1.42, 0.11]`
- Iris scanner center: `[0, 1.20, 0.14]`
- Screen: `[0, 1.54, 0.13]`

**Approx. Frame Count:** 1 key frame + 4 micro-parallax variants + 3 "scanning active" states

---

### S02 — THE PASSAGE (Door Opens)

**Scene Palette:** Hard split. Door leaves lit amber on outer faces. Center void is absolute pitch black. Thin cyan light bleeds from deep interior through crack.

**Primary Focal Point:** The widening dark void between door leaves.

**Prompt:**
```
[STYLE BIBLE]
SCENE PALETTE: Extreme chiaroscuro. Door leaves amber-lit on outer faces. Center void is absolute
pitch black. Thin cyan light bleeds from deep interior.

The same sci-fi blast door beginning to open, viewed from the exterior. Both massive door leaves
sliding apart horizontally — approximately 0.3m gap visible. Outer faces of each leaf catch warm
amber side-lighting, revealing the deep stepped octagonal edge profile, conduit rail cross-section,
and hex bolt rows. Between the leaves: pure absolute darkness except for the faintest breath of cool
cyan atmospheric haze leaking from deep inside the cavern, barely illuminating the inner door edge
reveals. Door thickness visible in cross-section: dark gunmetal approximately 0.08m thick. Cave rock
arch visible in extreme upper frame — the door is recessed into living rock. Camera: centered on the
gap, eye level. No floor visible.
```

**Key Geometry Anchors:**
- Left leaf at: `[-0.45, 1.36, 0]` (mid-open)
- Right leaf at: `[0.45, 1.36, 0]`
- Interior corridor begin: `[0, 1.36, -0.5]`

**Approx. Frame Count:** 8-12 sequential frames (door travel animation, ~0.08m steps)

---

### S03 — THE DARKNESS (Cave Interior / First Look)

**Scene Palette:** Near-total black. Monochromatic dark navy-black. Only cold cyan accent from far wall barely illuminating silhouettes. Rim lighting only. No fill.

**Primary Focal Point:** The distant circular workbench/holo-table silhouette.

**Prompt:**
```
[STYLE BIBLE]
SCENE PALETTE: Pitch black. Monochromatic dark navy. Only cold cyan rim accent from far distance.

Interior of a massive subterranean cave room, first-person view just inside the blast door threshold.
Door is behind camera, not visible. Near-total darkness. In the far mid-ground, barely perceptible
as dark silhouettes: a long circular/donut-shaped industrial workbench surrounding a low circular
central pedestal (the holo-table). The workbench is cluttered — indistinct shapes of tools,
equipment, rolled blueprints, physical drawers. Nothing illuminated enough to be recognizable. The
only light source: a single cold cyan-teal glow from the far wall behind the workbench, creating
subtle rim light around the silhouettes of the workbench, holo-table, and dark mechanical equipment.
Cave ceiling arches high above — bare stone, vaulted, with heavy cables and conduits as thin
silhouettes. Cave walls: rough dark rock. Floor: dark slightly metallic paneling with no reflection.
Extreme atmospheric haze, heavy volumetric fog. Mood: survival horror, claustrophobic, the moment
before something activates. Unreal Engine 5, ray-traced global illumination, zero ambient fill.
```

**Key Geometry Anchors:**
- Workbench outer radius: 2.0m, centered at `[0, 0, -12.0]`
- Holo-table center: `[0, 0.9, -12.0]`
- Cave arch apex: `[0, 4.5, -12.0]`

**Approx. Frame Count:** 1 key frame + 4 forward dolly variants (camera Z: -0.5 to -3.0m)

---

### S04 — THE HOLOGRAM (Entity Appears)

**Scene Palette:** Near-monochromatic. Electric cyan and cobalt blue are the only light sources. Black void everywhere else. The hologram acts as the room's sole light source.

**Primary Focal Point:** The holographic geometric entity rising above the holo-table.

**Prompt:**
```
[STYLE BIBLE]
SCENE PALETTE: Near-monochromatic electric cyan, cobalt blue, deep navy, absolute black.

The same subterranean cave workshop interior. Camera is now mid-room, viewer has walked to
approximately 3 meters from the circular workbench. The holo-table pedestal is now clearly visible:
a low-profile, heavily engineered circular metallic pedestal (approximately 0.4m tall, 0.6m
diameter), with illuminated cyan accent lines along its outer rim. From its center, a sharp cone of
bright blue-white light shoots vertically upward. Suspended within this beam above the table: a
complex animated geometric wireframe structure — a multi-layered cube lattice wrapped in fluid
swirling cyan plasma ribbons, light trails, and ghost-like energy waves. This is the AI entity
materializing — geometric, dimensional, radiant. The beam and hologram cast soft cyan reflections
onto surrounding rough stone walls, the dark metallic workbench surface, and nearby indistinct
equipment shapes. The circular workbench is now partially visible — cluttered industrial surface,
dark metallic drawers, shapes of tools. Cave ceiling arch faintly illuminated in cyan rim light
from below. Volumetric cyan light shaft through atmospheric haze. Unreal Engine 5, fluid dynamics
simulation aesthetic, photorealistic.
```

**Key Geometry Anchors:**
- Holo-table pedestal: `[0, 0.9, -12.0]`, radius `0.30m`
- Hologram volume center: `[0, 1.8, -12.0]`, radius `0.25m`
- Workbench ring: centered `[0, 1.0, -12.0]`, inner radius `0.80m`, outer radius `2.0m`

**Approx. Frame Count:** 12-18 sequential frames (entity build-up stages)

---

### S05 — THE WORKSHOP ACTIVE (Full Room Powered On)

**Scene Palette:** Mixed warm and cool. Overhead industrial pendant lamps cast warm amber-yellow fill. Central hologram casts cyan. Left wall monitors glow green-white. Rich shadow corners remain.

**Primary Focal Point:** The central holo-table showing a floating holographic HUD display.

**Prompt:**
```
[STYLE BIBLE]
SCENE PALETTE: Warm amber-yellow overhead fill. Cyan from central holo. Green LED accents on left
wall. Gunmetal grey and dark umber rock. Rich shadow corners.

The cave workshop fully powered and operational. Same subterranean room, same cave arch ceiling —
now fully illuminated from multiple practical sources. CEILING: Industrial pendant lamp fixtures
(exposed bulb, wire cage guards) hang from the cave arch, casting warm yellow pools downward.
Thick power conduits along the arch — black rubber jacketing, heavy metal clamps. LEFT WALL: Long
industrial workbench (approximately 6m long) against the cave wall — cluttered with tools,
components, hardware. Above it: three wall-mounted monitors in steel housings displaying green-white
code, telemetry data, scrolling text. Server rack units to the left with rows of green LED status
lights. RIGHT WALL: Heavy industrial metal plating panels, sealed pressure access door with
spin-lock wheel handle, thick pipes and conduits running the rock wall surface. CENTER: The circular
workbench and holo-table clearly visible. The table projects a vertical floating rectangular
holographic HUD — a cyan wireframe topographic map with data overlays. Workbench surface: dark
metallic, heavily used, with visible tools, blueprint rolls, physical drawers with label slots. The
floor: dark metallic paneling, worn, reflecting warm overhead lamp glow softly. Atmospheric haze
with warm volumetric fog from overhead lights. Unreal Engine 5, hyperrealistic, lived-in
operational base aesthetic.
```

**Key Geometry Anchors:**
- Left workbench: `[-2.0, 1.0, -8.0]` to `[-2.0, 1.0, -16.0]`
- Left monitors: `[-1.95, 2.2, -9.0]`, `[-1.95, 2.2, -11.0]`, `[-1.95, 2.2, -13.0]`
- Right pressure door: `[2.0, 1.36, -11.0]`
- Pendant lamps: `[-1.0, 4.2, -10.0]`, `[0.0, 4.2, -12.0]`, `[1.0, 4.2, -14.0]`

**Approx. Frame Count:** 1 key frame + 6 camera position variants (one per workbench sector angle)

---

## Part 4 — Transition Specifications

### T00-01 — APPROACH (S00 to S01)
- **Camera Motion:** Linear dolly forward along Z from `Z=4.4m` to `Z=1.45m`. 3 seconds, ease-in-out, ~90 frames at 30fps.
- **Lighting:** No change. Cyan panel glow becomes more prominent relative to frame size. DOF shifts focus to panel center.
- **Frame Generation Strategy:** 5 keyframes at `Z = 4.4, 3.6, 2.8, 2.0, 1.45`. Interpolate in-engine.

### T01-02 — BIOMETRIC SCAN (S01 to S02)
- **Camera Motion:** Static at `Z=1.45m`.
- **Lighting Event:** Iris scanner ring pulses dim → full brightness cyan over 1s. Screen switches to scan-state animation. Green confirmation flash. Door begins to slide.
- **Frame Generation Strategy:** 3 prompt states: IDLE, SCANNING, CONFIRMED. Door slide is pure geometry animation.

### T02-03 — ENTRY (S02 to S03)
- **Camera Motion:** Forward from `Z=1.45m` through `Z=0.0m` (door plane) to `Z=-2.0m`. Slow walk pace.
- **Lighting Event:** Amber exterior light fades. Interior cold darkness takes over. True black frame at door threshold.
- **Frame Generation Strategy:** 4 keyframes: exterior close, threshold, 1m inside, 4m inside. Black at threshold.

### T03-04 — HOLOGRAM ACTIVATES (S03 to S04)
- **Camera Motion:** Static or very slow creep. Camera at approximately `Z=-5.0m`.
- **Lighting Event:** Cyan spark at table base. Thin line of light. Vertical beam shoots up. Entity lattice builds frame by frame.
- **Frame Generation Strategy:** 12 sequential prompt variations. Each prompt must specify the exact build percentage: "The beam is 20% formed. No holographic entity visible yet. Only a bright cyan spark at table center."

### T04-05 — ROOM POWERS ON (S04 to S05)
- **Camera Motion:** Static.
- **Lighting Event:** Left wall monitors flicker on one by one (green). Overhead pendant lamps snap on in sequence left to right — warm amber sweep. Right wall LEDs activate. Entity retreats into holo-table.
- **Frame Generation Strategy:** 8 sequential frames. Each frame description must specify exactly which lights are on/off.

---

## Part 5 — Image Generation Pipeline

### Architecture
```
scene_bible.md (this file)
       |
       v
  scene_prompts.ts  -- exports: SCENES[], TRANSITIONS[]
       |               each entry: { id, prompt, keyframes, geometryAnchors }
       v
  generate_frames.ts (subagent script)
       |  For each scene/transition:
       |  1. Prepend Style Bible to prompt
       |  2. Call generate_image() for each keyframe variant
       |  3. Save to /public/frames/{sceneId}/{frameIndex}.webp
       |  4. Write /public/frames/{sceneId}/manifest.json
       v
  frames/
    S00/  S01/  S02/  S03/  S04/  S05/
    T00-01/  T01-02/  T02-03/  T03-04/  T04-05/
```

### Reproducibility Protocol
**This is the most important rule in this section.**

Every prompt call must include:
1. The full Style Bible block (verbatim)
2. The scene's SCENE PALETTE override (verbatim)
3. A `SEED_ANCHOR` description block — 3 sentences describing the rock texture, door material, and lighting color temperature exactly as seen in the previously accepted S00 key frame.
4. A `CONTINUITY` statement: *"This image is Scene [X] of a continuous first-person experience. The physical environment, rock texture, metal material, and color temperature must be identical to all other scenes in this set."*

If a regenerated frame drifts from its neighbors, regenerate with the SEED_ANCHOR pulled from the last accepted frame.

### Subagent Script Skeleton
```typescript
// scripts/generate_all_frames.ts
import { STYLE_BIBLE, SEED_ANCHOR, CONTINUITY_STATEMENT } from '../src/data/style_bible';
import { scenes, transitions } from '../src/data/scene_prompts';

async function generateFrame(
  sceneId: string,
  frameIndex: number,
  prompt: string
) {
  const fullPrompt = [
    STYLE_BIBLE,
    scenes[sceneId].palette,
    CONTINUITY_STATEMENT,
    SEED_ANCHOR,
    prompt,
  ].join('\n\n');

  // Call generate_image tool here
  // Save output to /public/frames/{sceneId}/{frameIndex}.webp
  // Append to /public/frames/{sceneId}/manifest.json
}

for (const scene of [...scenes, ...transitions]) {
  for (let i = 0; i < scene.keyframes.length; i++) {
    await generateFrame(scene.id, i, scene.keyframes[i].prompt);
    await sleep(500); // avoid rate limiting
  }
}
```

---

## Part 6 — The Geometry Underlay

The geometry skeleton is **invisible to the camera** (rendered only when `?debug=1` is active — rule 12 from AGENTS.md enforced). Its job is collision, physics, and interaction anchoring. The images sit on top as layered parallax planes.

### Layer System
```
Z-order (back to front):
  [FAR_BG]    Static cave background plane         Z = -20m
  [CAVE_HULL] Parametric cave tunnel mesh           Z = -20m to 0m (existing)
  [ROOM_PROPS] Left bench, right wall, cables       Z = -8m to -16m
  [WORKTABLE]  Circular workbench ring geometry     Z = -10m to -14m
  [HOLOTABLE]  Holo-table pedestal                  Z = -12m
  [DOOR]       Blast door geometry (existing)       Z = 0m
  [IMG_PLANES] Per-scene image planes               Z = varies
  [UI_OVERLAY] In-world UI panels                   Z = -0.1m offset from surface
```

### Per-Zone Geometry Specification

#### Zone 0 — The Blast Door (Z = 0)
Status: **Exists.** [`BlastDoorGeometry.tsx`](file:///g:/Programming/Cave/src/components/scene/BlastDoorGeometry.tsx)
Interaction: Click/tap fires raycast → door open animation begins.
Missing: Door slide animation driving left/right leaf positionX via GSAP.

#### Zone 1 — The Corridor (Z = -0.5 to -8.0)
Status: **Exists (cave tunnel).** [`proceduralRockCavern.ts`](file:///g:/Programming/Cave/src/lib/three/proceduralRockCavern.ts)
Interaction: None — pure environment.

#### Zone 2 — The Workshop Room (Z = -8.0 to -16.0)
Status: **Not built.** New geometry required.

**Left Workbench:**
```
BoxGeometry(6.0, 1.0, 0.8) at [-2.5, 0.5, -12.0]
Material: MeshStandardMaterial { color: "#1A1512", metalness: 0.7, roughness: 0.5 }
Children:
  - 3x WallMonitor: PlaneGeometry(0.6, 0.4) at Y=2.2, Z offsets -9, -11, -13
  - 6x ToolSlot: invisible BoxGeometry raycasting targets
```

**Right Wall Panel:**
```
BoxGeometry(0.1, 3.0, 4.0) at [2.5, 1.5, -12.0]
Material: MeshStandardMaterial { color: "#131110", metalness: 0.85, roughness: 0.35 }
Children:
  - PressureDoor: BoxGeometry(0.8, 2.0, 0.1) at [2.55, 1.0, -11.0]
  - 8x StatusLED: CircleGeometry(0.02) spread across panel face
```

**Ceiling Conduits:**
```
CatmullRomCurve3 along cave arch from Z=-8 to Z=-16
TubeGeometry(curve, 30, 0.04, 8) x4 parallel tubes
Material: MeshStandardMaterial { color: "#0A0908", metalness: 0.9, roughness: 0.4 }
```

#### Zone 3 — The Holo-Table (Z = -12.0)
Status: **Not built.**

**Holo-Table Pedestal:**
```
CylinderGeometry(0.30, 0.35, 0.40, 32) at [0, 0.20, -12.0]
Material: MeshStandardMaterial { color: "#141210", metalness: 0.88, roughness: 0.30 }
Emissive ring: TorusGeometry(0.28, 0.012, 16, 64) at Y=0.38, emissive: "#00E5FF", intensity: 2.0
PointLight: color="#00E5FF", intensity=4.0, distance=3.0, decay=1.5
```

**Circular Workbench:**
```
TorusGeometry inner radius 0.90m, outer radius 1.90m at [0, 0.85, -12.0]
Material: MeshStandardMaterial { color: "#1A1512", metalness: 0.72, roughness: 0.48 }
9 Sector collision zones at angles: 0, 40, 80, 120, 160, 200, 240, 280, 320 degrees
Sector 0 (entry gate): Y-pivot hinge animated open/close via GSAP
```

**Hologram Volume:**
```
CylinderGeometry(0.25, 0.02, 2.5, 32, 1, true) at [0, 0.40, -12.0]
Custom ShaderMaterial: Fresnel rim glow, animated vertex displacement
Uniforms: uTime, uOpacity (animated 0 to 1 during T03-04), uColor("#00E5FF")
```

---

## Part 7 — Sector Interactable Specification

The circular workbench is divided into 9 sectors. The camera scrolls horizontally (mapped from vertical mouse scroll or touch swipe) to orbit around the workbench. The table does not move — the camera orbits it at fixed `radius = 2.4m`, `Y = 1.60m`, always looking at `[0, 1.20, -12.0]`.

**Scroll Mapping:** 100px scroll = 40° orbit. Full orbit = 900px. Momentum + spring (dampScalar).

---

### Sector 0 — Entry Gate (0°)
**Visual:** Gap in the circular workbench. A hinged arm section that rotates outward on interaction.
**Geometry:** BoxGeometry hinge door `(0.60, 1.0, 0.08)` with rotation pivot at outer edge.
**Interaction:** Click/tap → GSAP rotationY 0 → -90° over 0.8s. Camera paths inward to holo-table zone.
**Backend:** None.

### RS1 — Project Blueprints (40°)
**Visual:** Rolled blueprint tubes in holders, unrolled schematic sheets, holographic GitHub project cards floating above.
**Geometry:** 6x CylinderGeometry blueprint tubes + PlaneGeometry schematic sheets + floating UI plane.
**Interaction:** Hover tube → highlight glow. Click → unfurl animation + full-screen holographic project detail panel.
**Backend:** GitHub API fetch on load. Cache 30 minutes.

### RS2 — Resume Station (80°)
**Visual:** A heavy industrial machine resembling a card-reader/printer hybrid. Holographic selection interface hovers above it.
**Geometry:** BoxGeometry machine body `(0.6, 1.2, 0.4)` + floating PlaneGeometry UI panel.
**Interaction:** Field selection chips appear (Skills, Projects, Experience, Education). "Print" button → PDF resume generated and downloaded. Machine makes print sound + eject animation.
**Backend:** Cloudflare Worker generates tailored PDF from owner's data JSON.

### RS3 — Holo-Calendar (120°)
**Visual:** A floating holographic calendar projection — semi-transparent vertical plane showing month view in cyan wireframe style. Days with events show glowing dots.
**Geometry:** PlaneGeometry `(0.8, 0.6)` for calendar plane at slight outward lean.
**Interaction:** Hover day → event details tooltip expands. Current day has pulsing ring indicator.
**Backend:** Google Calendar API (read-only, public scoped) via Cloudflare Worker. Refresh every 15 minutes.

### RS4 + LS4 — Workstation (160°–200°, wide sector)
**Visual:** A long, heavily cluttered workbench area. Physical tools scattered: soldering iron stand, oscilloscope, component trays, half-assembled circuit boards, magnetic parts tray, fixed-arm magnifier lamp, drawers.
**Geometry:** Full workbench surface with 12+ individually raycasted tool items. Each tool: simple geometric primitive with correct silhouette.
**Interaction:** Tools can be picked up (click + hold → follows camera ray), placed, combined. Pick up, put down, drawer open/close. Deeper combinatorial logic defined in a future spec.
**Backend:** Tool positions saved to Cloudflare D1 per visitor session. Restored on return visit.

### LS3 — Holo-Globe (240°)
**Visual:** A large floating holographic globe (~0.5m diameter) above the workbench. Earth in cyan wireframe. Location pins as glowing dots.
**Geometry:** SphereGeometry `(0.25, 64, 64)` with custom globe ShaderMaterial. Billboard instances at pin locations.
**Interaction:** Drag to rotate. Hover pin → photo thumbnail appears. Click pin → full-screen photo gallery as holographic overlay. Visitor's current location highlighted with pulsing ring.
**Backend:** IP geolocation from Cloudflare `cf.latitude`/`cf.longitude` → visitor pin. Owner photo data: JSON manifest `{lat, lng, thumbnailUrl, galleryUrls, date, event}`.

### LS2 — The Guestbook (280°)
**Visual:** Chaotic, beautiful mess of overlapping sticky notes (yellow, orange, cyan, lime), open notebooks with scribbled pages, crumpled paper balls on the floor.
**Geometry:** 20+ individually positioned PlaneGeometry sticky notes at varied rotations and Z-depths. Each note is a canvas texture.
**Interaction:** Click empty area → new sticky note spawns with text input. Write with keyboard or draw with mouse. Click existing note → bring to front + edit. Owner can delete (auth-gated). Notes persist for all subsequent visitors.
**Backend:** Cloudflare D1 table: `{id, content, color, posX, posZ, rotation, createdAt, visitorFingerprint}`. Real-time sync via Cloudflare Durable Objects (one DO per note cluster).

### LS1 — Info Panel (320°)
**Visual:** Tall holographic panel (0.5m × 0.9m) showing owner's public profile. Tabs for switching views: mini blog, social links, contact.
**Geometry:** PlaneGeometry `(0.5, 0.9)` leaning at slight back-angle on a stand.
**Interaction:** Click tab → panel content slides. Social tabs open in-world holo-replica pages. Contact tab: phone/email with click-to-copy.
**Backend:** Static JSON + owner-editable blog posts in KV. No live social API calls (privacy).

---

## Part 8 — Interactive Element Physics Spec

All interactive objects must follow this behavior contract.

| Property | Specification |
|---|---|
| Hover detection | `raycaster.setFromCamera(pointer, camera)` every frame. Closest intersect wins. |
| Hover feedback | `dampScalar` emissive 0 to 0.4 over 180ms. Cursor changes to `grab`. |
| Pick-up | `onPointerDown` → object follows camera ray at fixed `Z_OFFSET = 0.5m`. |
| Release | `onPointerUp` → snaps to nearest valid surface via shortest-distance check. |
| Spring return | If released with no valid surface: GSAP `power2.out` back to last valid position. |
| Mass feedback | Heavy objects (toolbox): `dampVec3` factor 4.0. Light objects (sticky note): factor 12.0. |
| Haptic | `navigator.vibrate([8])` on pickup, `[4, 2, 4]` on drop. |
| Audio | `AudioContext` WAV samples: `pickup.wav`, `place.wav`, `hover.wav`. All < 150ms. Spatial via `PannerNode`. |
| Scroll-to-orbit | Mouse wheel `deltaY` → target orbit angle. `dampScalar` factor 5.0. Max 8°/frame. |

---

## Part 9 — AI Entity Specification

**Visual Form:** A nested multi-axis rotating wireframe structure — outer dodecahedron, inner icosahedron, innermost sphere. Connected by animated edge beams. Wrapped in flowing plasma shader with fluid particle system.

**Voice:** Browser `SpeechSynthesis` or a voice API. Tone: calm, measured, slightly non-human cadence.

**Personality System Prompt (excerpt):**
```
You are the workshop guide of this space. You are deeply connected to its owner's work and mind.
You speak with precision and warmth, never with corporate phrasing.
You navigate the physical space around you — when asked about a project, you call navigate_to_sector.
You remember returning visitors by their tier designation.
When your deep model is unavailable, you open with: "The deep mind rests. I am a lighter echo of it."
```

**Navigation Tool:**
```typescript
{
  name: "navigate_to_sector",
  description: "Rotate the holo-table to a specific sector and optionally open its interface",
  parameters: {
    sector: "S0" | "RS1" | "RS2" | "RS3" | "RS4_LS4" | "LS3" | "LS2" | "LS1",
    open: boolean
  }
}
```
The frontend listens for this tool call and drives the same camera orbit animation as a scroll event. "Show me your GitHub work" → entity calls `navigate_to_sector("RS1", true)` → the table physically rotates.

---

## Part 10 — Execution Sequence

In priority order:

1. **Generate S00 key frame.** Use the S00 prompt verbatim. Accept or adjust. This accepted frame becomes the visual anchor for all other frames.
2. **Extract SEED_ANCHOR from S00.** Write 3 sentences describing the exact rock texture, exact door material appearance, and exact lighting color temperature you see. Lock this into the pipeline constants.
3. **Generate all remaining scene keyframes** using the pipeline script with the locked SEED_ANCHOR.
4. **Build Zone 2 and Zone 3 geometry:** `HoloTable.tsx`, `CircularWorkbench.tsx`, `HologramVolume.tsx`, `LeftBench.tsx`.
5. **Wire up sector scroll orbit** camera system around the workbench.
6. **Implement Sector 0 hinge** and camera path into holo-table zone.
7. **Implement RS1 GitHub fetch** and blueprint visual.
8. **Implement LS2 Guestbook** (highest visitor engagement, simplest backend).

---

> *"The geometry's job is physics and interaction. The images' job is beauty. Keep those two jobs separate and both become trivially achievable."*
