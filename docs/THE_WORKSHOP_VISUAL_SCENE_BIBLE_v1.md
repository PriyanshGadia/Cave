# THE WORKSHOP — VISUAL SCENE BIBLE + CONTINUITY SYSTEM v2.0

## Purpose

This document is the single persistent source of truth for generating, validating, and implementing the cinematic sequence and the interactive Workshop environment.

It supersedes and consolidates:

- `scene_bible.md` (the original generation pipeline)
- `forward_to_new_idea.md` (the architectural corrections and honest scoping)
- The previous `THE_WORKSHOP_VISUAL_SCENE_BIBLE_v1.md`

It is intentionally **not** a collection of isolated image prompts.

The system is built around six truths:

1. Every scene has immutable spatial anchors.
2. Every transition is authored as a physical traversal event, not a crossfade.
3. Every visual-generation prompt inherits a locked global style and continuity block.
4. Every interactive element exists as real runtime geometry, even when its surface appearance originated from generated reference art.
5. Adding, removing, or reordering a scene must not silently redesign neighboring scenes.
6. The visitor experience is discrete panoramic nodes with bounded look-around at each node, connected by authored transitions — not continuous free-roam through infinite camera positions.

The implementation target is a first-person, camera-only experience. The visitor is never visible to the camera. No hands, body, face, reflection, shadow silhouette, or avatar may appear unless a future scene explicitly introduces a consented, intentional first-person representation.

The cinematic goal is **inventor-in-a-secret-workshop energy**: extremely engineered, tactile, sophisticated, industrial, quiet, and believable. It may evoke the emotional territory of premium superhero technology cinema, but it must not copy copyrighted interface layouts, logos, named AI personalities, arc-reactor iconography, red/gold hero-suit styling, or recognizable franchise assets.

This is the same paradigm used by Myst, Riven, the original Resident Evil, Google Street View, and Matterport: pre-rendered, high-fidelity visual states at fixed viewpoints, with bounded pan/tilt look-around at each node, and authored transitions carrying the visitor between them. It is not a lesser version of real-time 3D — it is a different, legitimate discipline that moves visual complexity into still-image generation (where the tools excel) while keeping interaction, physics, camera motion, and spatial audio in the live engine (where Three.js excels).

---

# 0. LOCKED GLOBAL VISUAL BIBLE

## 0.1 MASTER_STYLE_BIBLE

Paste this block unchanged into every image-generation request.

```text
MASTER_STYLE_BIBLE:

Hyper-realistic cinematic 3D render, Unreal Engine 5 hybrid photoreal aesthetic,
premium large-format cinema cinematography, hard-surface sci-fi industrial design
language throughout. The environment must feel physically fabricated, mechanically
assembled, maintained, repaired, and used rather than designed as decorative concept art.

Materials are restricted to:
dark gunmetal grey steel,
brushed titanium,
matte black composite casing,
weathered iron plating,
dark natural cave stone.

All surfaces carry physically believable micro-detail:
fine scratches,
directional machining marks,
small impact dents,
edge wear,
subtle oxidation,
embedded dust,
oil-darkened recesses,
grime accumulation in seams,
worn contact zones,
fastener compression marks,
slight material roughness variation.

COLOR SYSTEM IS LOCKED:
Only two luminous/accent color families may appear anywhere:
1. warm amber/gold around 2900K representing the physical, practical, human world;
2. cool electric cyan around 7000K representing digital, holographic, computational, or active-system elements.

No red, green, purple, pink, orange neon, saturated yellow, or unrelated colored LEDs.
Any previously-described green status indication must be replaced by a physically dimmed
amber indication or omitted.

Lighting is cinematic and physically motivated:
chiaroscuro contrast,
deep but readable shadows,
realistic inverse-square light falloff,
HDR highlight rolloff,
subtle atmospheric volumetric haze,
localized reflections on metal,
contact shadowing in mechanical recesses,
specular response that follows material roughness,
no flat studio lighting,
no global glow wash.

Camera:
strict first-person perspective,
viewer eye height approximately 1.65m unless the scene-specific camera bible states otherwise,
35mm-equivalent lens unless a specified close-up requires 50mm,
natural perspective,
very subtle lens breathing during focus changes,
no fisheye,
no drone camera,
no third-person framing,
no visible camera rig.

Composition:
vertical 9:16 master frame,
cinematic headroom,
strong depth layering,
foreground / near / mid / far separation,
environmental storytelling through wear and placement,
slight natural vignette,
subtle film grain,
controlled depth of field only when optically motivated.

People:
no human figures,
no visible face,
no body,
no hands,
no arms,
no silhouette,
no human reflection,
no humanoid mannequin,
no person-shaped placeholder.

Text:
do not generate fake UI typography, fake code, fake labels, fake numbers, logos,
or pseudo-legible writing on screens or panels.
Only a single specified flat-screen element may contain deliberately generated placeholder
screen content, and real UI text must be rendered by the runtime application instead.

Geometry:
all major objects have believable real-world dimensions,
mechanical thickness,
assembly logic,
service access,
fasteners,
hinges,
mounting brackets,
cable routing,
clearance,
and believable center-of-mass placement.

The scene must look like it can physically exist in a real underground engineering facility.
Nothing may look like a game prop floating in space.

Originality:
do not reproduce any existing film HUD,
do not reproduce Marvel/MCU interface graphics,
do not use arc-reactor shapes,
do not use red-and-gold Iron Man armor colors,
do not use recognizable Stark logos,
do not name an AI after an existing franchise AI,
do not reproduce a recognizable film set.
Create an original engineering language with its own proportions, symbols, and mechanical grammar.

Output:
photoreal,
physically based,
cinematic,
extremely high micro-detail,
production design quality,
consistent geometry,
consistent material response,
consistent lens language,
consistent lighting logic,
strict first-person composition.
```

## 0.2 PROVEN SEED_ANCHOR

This anchor was extracted from the first accepted S00 keyframe and has been validated across five consecutive generations with zero visual drift. Append it to every prompt after the MASTER_STYLE_BIBLE.

```text
SEED_ANCHOR:
The rock surface is dark orange-umber sedimentary stone with deep carved fracture lines
and rough hand-chiseled texture, catching warm amber light on its left face and cool
slate-cyan shadow on its right. The metal is dark charcoal gunmetal with a horizontally
brushed finish, stepped octagonal perimeter rails lined with hex bolt hardware, four
turbine intake vents with recessed fan blade grilles, and faint stenciled markings on
each leaf. The lighting is a high-contrast chiaroscuro split: rich golden-amber (#FFA030)
raking across the left third of the frame, with deep shadow on the right relieved only by
a thin cool slate-cyan (#1E4868) rim.
```

## 0.3 NON-NEGOTIABLE CONTINUITY RULE

Every subsequent scene prompt must begin with the exact `MASTER_STYLE_BIBLE` text, then the `SEED_ANCHOR`, and then append:

- `CONTINUITY_CONTEXT` — what scene came before, what must be preserved
- `SCENE_DELTA` — the only intentional changes
- `CAMERA_STATE` — position, lens, framing, look direction
- `LIGHT_STATE` — which lights are active, shadow direction
- `SCENE_PALETTE` — the dominant color grading for this specific scene
- `INTERACTION_STATE` — what the viewer can perceive or interact with
- `TRANSITION_IN` — physical event immediately before this frame
- `TRANSITION_OUT` — physical event immediately after this frame
- `NEGATIVE_LOCK` — what must never appear

Do not rewrite the style bible from memory. Do not paraphrase it. Do not "improve" it per scene. Any improvement becomes a versioned change to the global bible and must be applied to all scenes simultaneously.

---

# 1. THE MASTER CONTINUITY SYSTEM

## 1.1 Why isolated image prompting fails

Independent generation encourages visual drift: door proportions change, cave rock morphology changes, panel moves by several centimeters, light direction reverses, materials become cleaner or dirtier, lens changes, table moves, ceiling height changes, props appear or disappear, cyan becomes blue/purple, amber becomes orange, room dimensions subtly mutate.

The fix is not simply "more detailed prompts." The fix is a **scene continuity contract** built on three mechanisms:

1. **The SEED_ANCHOR** — a paragraph of concrete physical descriptors extracted from the first accepted frame, appended to every prompt
2. **Reference image chaining** — every scene is generated in image-edit mode from the previous scene's accepted plate, never from blank text
3. **Immutable environment anchors** — a named coordinate map that overrides any visual disagreement

## 1.2 Immutable Environment Anchors

These anchors are never re-imagined between scenes. If a generated reference image visually disagrees with the anchor map, the generated image loses. The geometry map wins.

```text
ANCHOR_A_DOOR_CENTER           [0.0, 1.65, 0.0]
ANCHOR_B_DOOR_LEFT_EDGE        [-1.55, 1.65, 0.0]
ANCHOR_C_DOOR_RIGHT_EDGE       [1.55, 1.65, 0.0]
ANCHOR_D_PANEL_CENTER          [0.0, 1.45, 0.12]
ANCHOR_E_PANEL_TOP             [0.0, 1.80, 0.12]
ANCHOR_F_PANEL_BOTTOM          [0.0, 1.10, 0.12]
ANCHOR_G_CAVE_CEILING_LOW      [0.0, 4.5, -3.0]
ANCHOR_H_CAVE_LEFT_SHOULDER    [-2.8, 2.0, 0.0]
ANCHOR_I_CAVE_RIGHT_SHOULDER   [2.8, 2.0, 0.0]
ANCHOR_J_TABLE_CENTER          [0.0, 0.95, -5.5]
ANCHOR_K_TABLE_TOP             [0.0, 1.05, -5.5]
ANCHOR_L_WORKBENCH_OUTER       [0.0, 1.02, -5.5] (radius ~2.6m)
ANCHOR_M_LEFT_WORKBENCH        [-3.5, 1.0, -5.0]
ANCHOR_N_RIGHT_WALL            [3.0, 1.5, -5.5]
ANCHOR_O_MAIN_CABLE_DROP       [0.0, 3.8, -4.0]
ANCHOR_P_ENTRY_CENTERLINE      [0.0, 0.0, 0.0] → [0.0, 0.0, -8.0]
ANCHOR_R_ENTITY_ORIGIN         [0.0, 1.8, -5.5]
ANCHOR_S_CAMERA_EYE            [0.0, 1.65, *]
```

## 1.3 Canonical World Scale

Use meters.

```text
Viewer eye height:              1.65m
Door clear height:              ~3.3m
Door structural width:          ~3.0–3.4m
Door depth (visible shell):     ~0.30–0.45m
Panel eye-center:               ~1.45m
Main chamber ceiling:           ~4.2–5.2m
Workbench outer diameter:       ~4.8–5.8m
Holo-table diameter:            ~1.4–1.8m
Workbench top height:           ~1.0–1.05m
Primary walking clearance:      min 0.9m, preferred 1.1–1.3m
```

Once the implementation is authored, the actual measured geometry becomes locked and supersedes these design targets.

## 1.4 Canonical Material Identities

Never rename the visual materials between scenes.

```text
MAT_GUNMETAL_PRIMARY        — dark charcoal brushed steel (#1A1714)
MAT_TITANIUM_EDGE           — lighter titanium edge components
MAT_MATTE_BLACK_COMPOSITE   — matte black structural recesses
MAT_WEATHERED_IRON          — weathered iron service plates
MAT_CAVE_STONE              — dark orange-umber sedimentary rock (#2B1A0F)
MAT_CYAN_EMISSIVE           — electric cyan for digital/holographic elements
MAT_AMBER_PRACTICAL         — warm amber for physical/practical light sources
MAT_DARK_GLASS              — optical assemblies, scanner apertures
MAT_SCREEN_BLACK            — blank display surfaces for runtime content
```

Banned: `MAT_RED_NEON`, `MAT_GREEN_STATUS`, `MAT_PURPLE_HOLOGRAM`, `MAT_GOLD_METALLIC_TRIM`, `MAT_WHITE_SCI_FI_PLASTIC`. No material outside this table may appear unless the master bible is deliberately versioned and the change is global.

## 1.5 Canonical Light Identities

```text
LIGHT_WORLD_KEY:
    warm amber, ~2900K, physically motivated
    from practical industrial fixtures, directional cave bounce
    represents physical space

LIGHT_DIGITAL_ACCENT:
    cool electric cyan, ~7000K, localized
    represents active computation, holography, diagnostics

WORLD_DARK:
    near-black environmental baseline

No third luminous color.
```

The apparent color of reflected cave rock is allowed to shift naturally under the two lights. Do not interpret naturally warm rock response as permission to add additional light colors.

## 1.6 Camera Language

```text
FPP = TRUE
VISIBLE_BODY = FALSE
VISIBLE_HANDS = FALSE
THIRD_PERSON = FALSE
FREE_FLIGHT = FALSE
```

Three independent input channels, per `AGENTS.md` Rule 3:

```text
SCROLL / TRAVERSAL:   controls position along an authored rail only
POINTER / GYRO LOOK:  controls clamped view direction only (bounded pan/tilt at each node)
CLICK / TAP:          triggers raycast interactions only
```

One channel never does another's job. The camera is controlled only by the central CameraDirector. Use frame-rate-independent exponential-decay damping (`dampScalar` / `dampVec3` / `dampQuat`) — never a fixed-factor `lerp(current, target, 0.05)`.

## 1.7 Camera Continuity

Every scene defines:

```text
START_POSITION, START_LOOK_DIRECTION, START_FOV
END_POSITION, END_LOOK_DIRECTION, END_FOV
LOOK_CLAMP_YAW, LOOK_CLAMP_PITCH
PATH_ID, MOTION_PROFILE
```

The final state of Scene N must equal the starting state of Scene N+1 within tolerance:

```text
position:  <= 0.005m
rotation:  <= 0.25°
FOV:       <= 0.1°
```

---

# 2. THE CORRECT GENERATION STRATEGY

## 2.1 Do NOT generate one million AI images

One million independently generated frames will not create consistency. It will create temporal shimmer, texture crawling, geometry mutation, random prop changes, lighting instability, and impossible motion blur. Camera position in continuous space is infinite — a million frames covers zero percent of it, the same way a million points don't fill a line.

The correct system:

```text
AI IMAGE GENERATION → MASTER KEYFRAMES → REFERENCE/LOOKDEV FRAMES
                                               ↓
                               RUNTIME 3D GEOMETRY (depth-mesh + procedural shell)
                                               ↓
                               REAL CAMERA MOTION (live, not baked)
                                               ↓
                               REAL LIGHTING (live, not baked)
                                               ↓
                               REAL INTERACTION (raycasting, audio, haptics)
```

The image model creates the **appearance target**. The runtime scene creates the **physical truth**. Do not reverse these roles.

## 2.2 Recommended generation density

Per major scene:

```text
1 primary master keyframe
1–2 alternate framing references
1 transition-in reference (when camera moves significantly)
1 transition-out reference (when camera moves significantly)
1 close interaction reference (when a hero object needs detail lock)
```

For cinematic scenes with important motion (door opening, lights activating): 6–12 key images may be useful. Do not generate hundreds merely because the model can.

## 2.3 Reference Image Chaining

The proven method, validated across this project's five accepted keyframes:

1. Generate Scene 00 first. Accept one canonical image. Save as the permanent visual anchor.
2. For every later scene, feed the **previous scene's accepted plate** back into the image tool as a reference image (edit-mode, not fresh text-to-image).
3. Append the `SEED_ANCHOR` paragraph (Section 0.2) to every prompt.
4. Never regenerate an already-accepted scene without archiving the old version first.
5. If an image contradicts the anchor map (Section 1.2), the image loses.

If the generator exposes seed control, lock it. If seed control is unavailable, lock: the previous accepted image, the exact prompt, the exact camera specification, the exact object manifest, the exact lighting manifest, the exact material manifest, and the exact negative constraints.

---

# 3. THE INVISIBLE SKELETON — PHYSICAL INTERACTION SUBSTRATE

Every visual mesh (the pretty, depth-mapped or shader-driven surface) has a **separate, invisible proxy** underneath it that never renders but is what the raycaster, hover-highlighter, and any physical constraint actually hits. This is standard game-dev practice (render mesh ≠ collision mesh) and it is what makes the scene "interactable" rather than "decorative."

```typescript
// src/lib/three/skeleton/types.ts
export type ProxyShape = "box" | "sphere" | "capsule" | "plane";

export interface SkeletonNode {
  id: string;           // must match the visual Interactable's config.id
  shape: ProxyShape;
  position: [number, number, number];
  size: [number, number, number]; // half-extents / radius+height as applicable
  purpose: "interact" | "hover-zone" | "nav-blocker" | "snap-point";
}
```

```typescript
// src/lib/three/skeleton/SkeletonLayer.tsx
/** Renders NOTHING visually by default. Debug-only wireframe boxes appear
    when ?debug=skeleton is in the URL (Rule 12 pattern). */
export function SkeletonLayer({ nodes }: { nodes: SkeletonNode[] }) {
  const debug = useSceneStore((s) => s.debugSkeletonVisible);
  return (
    <>
      {nodes.map((n) => (
        <mesh key={n.id} position={n.position} visible={debug} name={`skeleton-${n.id}`}>
          {n.shape === "box" && <boxGeometry args={n.size} />}
          {n.shape === "sphere" && <sphereGeometry args={[n.size[0], 12, 12]} />}
          <meshBasicMaterial wireframe color="#4ce0ff" transparent opacity={0.4} />
        </mesh>
      ))}
    </>
  );
}
```

| Purpose       | Example                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `interact`    | Door, panel buttons, sticky notes, holo-table sectors — the actual click/hover hitbox                     |
| `hover-zone`  | Larger capsule around each sector so the camera knows which sector is nearest during scroll-orbit         |
| `nav-blocker` | Invisible planes coincident with cave walls — guards the look-clamp math from aiming through solid rock   |
| `snap-point`  | Fixed anchor positions on the workbench — when an item is "placed," it snaps to the nearest snap-point    |

The skeleton is authored once per scene, by hand, as simple numbers. It is never generated from an image or AI tool. It is cheap, exact, and the thing that makes physical interaction actually possible.

---

# 4. SENSORY FEEDBACK LAYER (honestly scoped)

The visitor should feel physically present. Here is what a browser can actually deliver, ranked by real support — build in this order:

| Channel                              | Technology                                                                  | Honest assessment                                                                |
| ------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Visual** (primary, universal)      | Screen-space bloom flash, chromatic-aberration pulse, subtle damped camera-shake, focus rack | Works everywhere, zero permission prompts, 80% of "felt" interaction lives here  |
| **Auditory** (strong, universal)     | Web Audio API with `PannerNode` for spatial audio — clicks from the left wall audibly come from the left | Works everywhere, no permission for playback after first user click               |
| **Haptic** (bonus only, mobile-only) | `navigator.vibrate(pattern)` — desktop browsers and iOS Safari do not support this at all | Wire as a no-op-safe enhancement, never a required feedback path                 |

```typescript
// src/lib/feedback/haptic.ts
/** Silently does nothing on unsupported devices. Never gate any
    interaction's completeness on this succeeding. */
export function tryHapticPulse(pattern: number | number[] = 15) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
```

### Haptic vocabulary (when supported)

```text
HAPTIC_LIGHT:       hover/proximity — barely perceptible (10ms)
HAPTIC_CLICK:       button depression — short pulse (15ms)
HAPTIC_MECHANICAL:  lock release — medium low-freq pulse (40ms)
HAPTIC_HEAVY:       door movement — longer low-freq pulse (120ms)
HAPTIC_CONTACT:     object placement — short double pulse (15ms, 5ms gap, 15ms)
HAPTIC_CONFIRM:     verified action — ascending double pulse
HAPTIC_ERROR:       not a buzzstorm — one short damped pulse
```

Never vibrate continuously merely because an interaction is active.

### Audio continuity

Every scene has three layers:

```text
AMBIENCE:  cave / ventilation / machine resonance
FOLEY:     clicks / friction / mechanisms / paper / tool contact
SYSTEM:    subtle computational tonal layer for active digital events
```

Use spatial audio where supported. Audio should preserve continuity while visual scenes change. The listener should perceive one physical building.

---

# 5. MASTER SEQUENCE

## Cinematic spine

```text
SC00  APPROACH       viewer sees the blast door from mid-tunnel
T00   DOOR_CONTACT   click-triggered dolly toward door
SC01  PANEL          biometric panel close-up, real auth
T01   SCAN           auth sequence, door mechanism
SC02  THRESHOLD      door unlocking, mechanical event
T02   BREACH         camera crosses threshold into darkness
SC03  DARKROOM       near-total darkness, dormant workshop silhouette
T03   WAKE           system boot sequence begins
SC04  MAPPING        cyan wireframe grid scans the room
T04   MATERIALIZE    grid reabsorbs, entity coalesces
SC05  ENTITY         AI geometric hologram — signature moment
T05   HANDOFF        entity settles, amber practicals activate
SC06  ACTIVE         full workshop reveal, overhead lamps, all stations visible
T06   MODE_SWITCH    scroll wakes up, orbit navigation begins
SC07+ SECTORS        9-sector orbit navigation (live, not pre-rendered)
```

The cinematic sequence (SC00–SC06) ends at exactly the world-space position from which the live orbit system begins. No gap, no teleport.

Camera-mode legend:
- **RAIL** = fixed dolly path, position from trigger/scroll, look free within clamp
- **STATIC** = camera does not move, look free within clamp
- **ORBIT** = 360° scroll-driven rotation around the holo-table (SC07+ only)

| Scene | Camera mode            | Look clamp (yaw / pitch) | Scroll state |
| ----- | ---------------------- | ------------------------ | ------------ |
| SC00  | STATIC                 | ±45° / ±25°              | inert        |
| SC01  | STATIC                 | ±20° / ±12°              | inert        |
| SC02  | STATIC                 | ±30° / ±20°              | inert        |
| SC03  | RAIL (auto, short)     | ±20° / ±12°              | inert        |
| SC04  | STATIC                 | ±15° / ±10°              | inert        |
| SC05  | STATIC                 | ±8° / ±6°                | inert        |
| SC06  | RAIL (auto, short)     | ±35° / ±20°              | inert        |
| SC07+ | ORBIT                  | ±15° / ±10° (additive)   | **active**   |

---

# 6. SCENE MANIFESTS

## SC00 — APPROACH

**Purpose:** Establish scale, secrecy, physical credibility, and curiosity. The viewer should feel: *I have arrived somewhere I was not supposed to find.* Do not reveal the laboratory. Do not reveal the holo-table. Do not reveal the AI. The scene is about the door and the cave around it.

**Image prompt:**

```text
[MASTER_STYLE_BIBLE]
[SEED_ANCHOR]

CONTINUITY_CONTEXT:
First scene. There is no previous visual frame.
Establish the canonical Workshop cave entrance.
The blast door must become the permanent reference object for every later scene.

SCENE_DELTA:
A massive dark industrial blast door embedded deep inside a rugged underground cavern.
The door is approximately 3.0–3.4 meters wide and ~3.3 meters tall. Wider and more
monumental than a normal security door, but physically believable. Broad, heavy,
mechanically segmented silhouette with subtle chamfered corners.

The cave tightly frames the door: rough natural stone shoulders left and right, an
irregular stone ceiling overhanging the door, compressed gravel and dust below the
framing, deep unlit recesses beyond the visible rock.

Door construction: layered gunmetal armor plates, brushed titanium edges, matte-black
recesses, weathered iron service plates, industrial seam lines, recessed fasteners,
circular ventilation housings with spoke grilles, thick side rails, compression
hardware, subtle conduits disappearing into rock.

At the vertical centerline: a compact, rugged biometric access housing. At this
distance it is deliberately unresolved — reads as an intelligent machine, not a
smartphone glued to a door.

CAMERA_STATE:
First-person, eye height 1.65m, centered on door, stationary. 35mm lens. No visible
floor beyond lowest frame edge. Cave ceiling occupies substantial upper frame space.

LIGHT_STATE:
Warm amber practical from upper-left, creating long reflections across the left half.
Right side falls into deep shadow. Restrained cyan glow from the access panel — just
enough to establish digital identity without revealing the interface.

SCENE_PALETTE:
Dominant warm amber with deep shadows. Cyan as accent only (panel glow).

NEGATIVE_LOCK:
No face, hands, body, floor-level composition, interior laboratory, large holograms,
bright UI, green indicators, fake typography, floating elements, clean showroom surfaces,
sterile sci-fi, magical fantasy architecture.
```

**Skeleton nodes:** `door-00` (box, `interact`, covers full door face) · `tunnel-walls-L/R` (planes, `nav-blocker`)

**Runtime behavior:** Hover only. The door does not open yet. Subtle emissive breathing in the access panel. Pointer movement creates a tiny weighted head-turn. No HUD. No instruction text.

**Accepted keyframe:** `public/frames/S00/keyframe_0.jpg`

---

## T00 — APPROACH → PANEL (click-triggered dolly)

GSAP tween, `power2.inOut`, ~3.2s, camera pushes forward toward the panel. Feels like footsteps: accelerate, hold, decelerate — never linear. Look-clamp stays live throughout (visitor can still glance around mid-walk). No dissolve, no teleport — one continuous camera move. On completion: hand off to SC01.

Audio: low cave ambience, faint ventilation resonance, tiny mechanical hum from the panel. One very light haptic pulse when the door becomes interactive.

---

## SC01 — PANEL

**Purpose:** Transform mystery into interaction. The panel is a real mechanical object.

**Image prompt:**

```text
[MASTER_STYLE_BIBLE]
[SEED_ANCHOR]

CONTINUITY_CONTEXT:
Direct continuation of SC00_APPROACH. Preserve the exact door architecture, cave material,
panel mounting location, amber light direction, cyan accent source, camera height, and all
visible wear patterns. The panel must feel like the same object approached physically, not
a replacement design.

SCENE_DELTA:
Camera is now much closer to the center access panel. The blast door fills the background.
The panel occupies the central vertical region of the image.

The biometric panel is rugged and minimally futuristic: thick machined metal housing, subtle
chamfered corners, real fasteners, one recessed horizontal cyan indicator strip, one dark
glass screen (left deliberately blank for runtime content), one compact circular optical
scanner beneath the screen, three tactile physical buttons below, a narrow service rail on
one side, a compact conduit entering from behind the housing.

The scanner is not a magical glowing portal. It is a small physical optical assembly: glass
aperture, metal retaining ring, micro-grooves, subtle reflection, soft cyan edge emission.

CAMERA_STATE:
First-person, eye level, 50mm close-up, centered with enough perspective to reveal housing
depth. Viewer is within arm's reach.

LIGHT_STATE:
Same amber from upper-left. Cyan now illuminates nearby metal edges and panel cavity.

SCENE_PALETTE:
Warm amber dominant. Cyan stronger than SC00 but still localized to panel.

NEGATIVE_LOCK:
No redesigned door. No oversized glowing rings. No fake text on screen. No decorative
sci-fi ornament.
```

**Skeleton nodes:** `panel-screen` (plane, live canvas mount) · `panel-register`, `panel-verify`, `panel-reset` (boxes, `interact`)

**Runtime:** Interactive buttons. Screen is a live `CanvasTexture` rendering the visitor's own MediaPipe FaceMesh feed (client-side only, nothing transmitted until consent). Three buttons wired to real WebAuthn + consent-ledger flow.

**Accepted keyframe:** `public/frames/S01/keyframe_0.jpg`

---

## T01 — SCAN (auth-success event)

On successful verify (or explicit "enter as guest" affordance — nobody is hard-blocked): door mechanism sound via spatial audio + a fast materialize-dissolve (shared `MaterializeMaterial` shader) sweeps the scene toward darkness over ~0.6s. Same camera position, scene beyond simply goes to near-total darkness. Feels like walking through the door into blackness.

---

## SC02 — THRESHOLD

**Purpose:** Make the door opening feel like a physical engineering event. This is not a scene of the room — it is the threshold.

**Image prompt:**

```text
[MASTER_STYLE_BIBLE]
[SEED_ANCHOR]

CONTINUITY_CONTEXT:
Direct continuation of SC01_PANEL. Same cave entrance, same blast door. Preserve panel,
door thickness, cave rock, amber direction, cyan source.

SCENE_DELTA:
The blast door is mechanically unlocking. Multiple heavy internal locks partially
disengaged. Central seam now visible as a narrow black separation. Small sections of
armored shell retracted. Room beyond is nearly black — a very faint cyan trace visible
deep inside, but no laboratory details revealed.

Mechanical realism is critical: locking pins retract, heavy pressure surfaces separate,
metal surfaces show contact marks, dust falls from seams, immense weight implied.

CAMERA_STATE:
First-person, standing immediately outside the threshold, head height, looking straight
into the opening.

LIGHT_STATE:
Warm amber still belongs to cave entrance. Interior is almost lightless.

SCENE_PALETTE:
Amber receding, deep black dominant, single faint cyan trace in the distance.
```

**Door opening sequence:** lock disengagement → pressure equalization sound → structural vibration → panel seams unlock → door segments move → cave dust drops → black interior appears → camera crosses threshold → ambient cave sound changes → exterior amber light falls behind.

Audio: low mechanical rumble, metal-on-metal friction, short pressure release, subtle low-frequency floor vibration. One deep haptic pulse when the final lock releases.

---

## T02 — BREACH / ENTRY

Camera moves through the threshold continuously. Not a teleport. The door frame acts as a natural occluder for asset streaming behind.

---

## SC03 — DARKROOM

**Purpose:** Reset visual attention. The viewer has entered darkness. The workshop geometry exists physically but is intentionally almost unreadable.

**Image prompt:**

```text
[MASTER_STYLE_BIBLE]
[SEED_ANCHOR]

CONTINUITY_CONTEXT:
The viewer has just crossed the door threshold. The door is behind the camera.
The same cave geology continues inside. Workshop geometry exists but is unreadable.

SCENE_DELTA:
A large underground chamber in near-total darkness. Vaulted cave ceiling, high and
irregular. Heavy cable bundles descend from overhead. Recessed industrial panels fused
into rock. The circular workbench is only a dark silhouette. Central holo-table pedestal
barely readable. One extremely weak cyan source deep in the room. No amber practical light
active yet.

The environment must feel like a dormant machine waiting for power.

CAMERA_STATE:
First-person, slowly drifting deeper (auto-advance ~2 units over 4s — the one permitted
auto-advance, because stopping dead after walking through a door feels broken). Look
clamped tight: ±20°/±12°.

LIGHT_STATE:
Near-total darkness. Single faint cyan source far back wall.

SCENE_PALETTE:
Near-monochromatic: deep graphite, navy-cyan rim light only. Mostly black.
```

**Skeleton nodes:** `workbench-ring`, `holo-table-core` (both `interact`, but locked/inert until SC05)

**Runtime:** No active interactables. Workbench and holo-table present as real geometry in dormant state.

**Accepted keyframe:** `public/frames/S03/keyframe_0.jpg`

---

## T03 — SYSTEM WAKE

Camera crosses the wake threshold. The room begins reacting: a faint mechanical click in the distance, then another, then a chain of tiny power acknowledgements. The holo-table detects presence.

Visual: small cyan indicator → slightly stronger cyan core → low-frequency particle drift → subtle floor projection → central beam initiation. The first spark should be tiny. Do not turn every wall into a nightclub.

---

## SC04 — MAPPING

**Purpose:** Reveal the architecture of the room through computation. The digital grid makes the room feel larger than initial perception suggested.

**Image prompt (reference only — the grid is a shader, not a baked image):**

```text
[MASTER_STYLE_BIBLE]
[SEED_ANCHOR]

CONTINUITY_CONTEXT:
Direct continuation of SC03_DARKROOM. Preserve every physical object and its location.
Do not add new furniture.

SCENE_DELTA:
The central holo-table has activated. A concentrated cyan beam rises vertically from the
table core. A precise luminous wireframe mapping field expands over the environment,
conforming to real cave geometry: rock contours, ceiling arches, workbench surfaces,
cable runs, mechanical panels.

The mapping appears computational rather than decorative — a machine surveying and
registering the room in real time. Workbench ring now visible in cyan rim light. Cave
remains mostly dark. Central beam bright but sharply contained. Selective bloom. No broad
cyan fog everywhere.

CAMERA_STATE:
First-person, near-static. The event is more important than camera movement. Eye level,
centered on holo-table origin.

SCENE_PALETTE:
Near-monochromatic electric cyan and cobalt blue on deep black.
```

**Build technique:** 100% procedural GLSL overlay (`fract()`-based grid, `uProgress` radial reveal driven by shared damping system) on top of SC03's existing meshes. Zero new reference plates needed.

---

## T04 — GRID REABSORPTION / MATERIALIZE

Grid reaches far wall → pauses → entire room appears registered → grid lines reverse direction → energy contracts toward table → central core intensifies → volumetric haze becomes visible → geometric shell appears. This is the bridge between "the room is alive" and "something intelligent is inside it."

---

## SC05 — ENTITY

**Purpose:** Signature moment. Protect this scene from visual overcrowding. The entity is the hero.

**Image prompt:**

```text
[MASTER_STYLE_BIBLE]
[SEED_ANCHOR]

CONTINUITY_CONTEXT:
Direct continuation of SC04_MAPPING. Same workbench and holo-table, unchanged locations.
Cave and materials unchanged.

SCENE_DELTA:
The mapping grid has withdrawn into the holo-table. Directly above the table: a new
computational entity. Not a humanoid. An original abstract intelligence construct:
precise geometric wireframe core (cube/icosahedral hybrid, asymmetrical enough to feel
custom-built), layered translucent volumetric shells, slowly circulating cyan energy
ribbons, fine procedural filaments, subtle particle shedding, controlled plasma motion.

The entity is the sole dominant cyan light source. Nearby cave edges, cables, and
workbench surfaces receive restrained cyan rim light. Room around it almost entirely dark.

CAMERA_STATE:
First-person, static, eye level, centered. 35–50mm. Minimal movement. This is the
signature moment — zero camera movement protects it.

SCENE_PALETTE:
Monochromatic electric cyan. Entity is sole light source. Deep black void everywhere else.

NEGATIVE_LOCK:
No large interface panels. No text. No cartoon particles. No magic spell effect. No
humanoid shape. No robot face. No familiar movie hologram.
```

**Build technique:** This scene is **never** a reference-photo derivative. It is a hand-authored GLSL shader: simplex 3D noise vertex displacement + Fresnel-rim additive plasma shell. Built and proven in isolation before wiring into the cave.

**Entity energy linked to agent state:**

```text
idle:               slow breathing pulse
thinking:           slightly faster energy movement
streaming response: controlled amplitude modulation
tool execution:     brief directional pulse toward the affected object
error:              brief energy reduction and mechanical reset cue (no red)
```

**Skeleton nodes:** `ai-core` (sphere, `interact`, generously oversized — most important click target on the site). First click/tap opens the live chat/LLM interface.

**Accepted keyframe:** `public/frames/S04/keyframe_0.jpg`

---

## T05 — ENTITY HANDOFF

Entity stabilizes → final spoken/text response if applicable → entity compresses vertically → energy threads descend → table absorbs the core → amber practical lights activate one by one → side workbenches reveal themselves → monitors wake → overhead fixtures settle → ambient room audio opens up. No wipe. No black cut. No loading screen.

Implementation: GSAP-driven light-intensity ramp (~1.8s ease-out). A `MaterializeMaterial` crossfade swaps cave-wall materials from dormant maps to fully-lit projection texture. Same meshes, texture-swap only.

---

## SC06 — ACTIVE WORKSHOP

**Purpose:** First full reveal of the Workshop.

**Image prompt:**

```text
[MASTER_STYLE_BIBLE]
[SEED_ANCHOR]

CONTINUITY_CONTEXT:
Direct continuation of SC05_ENTITY. Holo-table and workbench geometry unchanged. Entity
has returned into the table. Room has reached stable operating state.

SCENE_DELTA:
The full underground laboratory is visible.

Central circular workbench surrounds the holo-table. Physically credible: drawers,
machined panels, tool holders, small trays, charging docks, service bins, instrument
mounts, cable channels, small containers, industrial clamps.

Left wall: long technical workstation with three integrated monitor stations. Monitors
mostly dark/runtime-ready. Server rack with status LEDs (amber, not green).

Right wall: heavy metal plating, sealed pressure structures, thick conduit runs, service
panels, mechanical access door with spin-lock wheel.

Overhead: industrial pendant lamps with wire cage guards. Warm amber light reveals the
physical workshop. Thick power conduits along the arch — black rubber jacketing, heavy
metal clamps.

Holo-table active with restrained cyan light, much calmer than entity scene. Cave rock
visible around and above the engineered structure. The lab has been built inside the
mountain, not replacing the mountain.

CAMERA_STATE:
First-person, eye height 1.65m, centered at Workshop entry, looking toward holo-table.
Final position EXACTLY equals the starting camera state of the live sector-navigation scene.

SCENE_PALETTE:
Mixed warm and cool. Amber-yellow overhead fill dominant. Cyan holo-table accent. Rich
deep shadow corners remain.
```

**Handoff contract at final frame:**

```text
camera position   = SECTOR_0_ENTRY_TARGET
camera rotation   = SECTOR_0_ENTRY_ROTATION
FOV               = SECTOR_0_ENTRY_FOV
holo-table        = ACTIVE
workbench         = ACTIVE
ambient amber     = STABLE
cyan accent       = STABLE
cinematic mode    = FALSE
orbit mode        = TRUE
```

**Accepted keyframe:** `public/frames/S05/keyframe_0.jpg`

---

## T06 — MODE SWITCH (Active → Workbench)

No dolly, no cut — the camera is already at the SC07 orbit-start position from T05. This transition is purely a control-scheme handoff: scroll input, inert since SC00, becomes live and drives 360° orbit angle. Telegraph with a single, tasteful cyan directional-arrow affordance fading in near the table (no text).

---

## SC07+ — WORKBENCH (9-Sector Orbit)

This scene reuses the exact geometry built across SC03–SC06 in its final "active" material state. No new reference plates needed.

```text
Sector layout (9 wedges, 40° each, sector 0 = entry hinge):

           RS2   RS3
        RS1         RS4 ─┐
                          ├─ sealed/decorative (locked, future scope)
   [ Sector 0 — AI core ] LS4 ─┘
        LS1
           LS2   LS3
```

| Sector  | Function                     | Access tier             |
| ------- | ---------------------------- | ----------------------- |
| 0       | AI core / dispatcher         | public                  |
| RS1     | Live GitHub blueprints       | public                  |
| RS2     | Resume builder               | public (Phase 2)        |
| RS3     | Holo-calendar (read-only)    | public                  |
| RS4+LS4 | Sealed/tarped decorative     | n/a (future scope)      |
| LS1     | Public info hub / blog       | public                  |
| LS2     | Sticky-note guestbook        | public, Turnstile-gated |
| LS3     | Photo/video globe            | public (Phase 2)        |

**Interaction:** Scroll → continuous orbit angle (accumulator, never clamped — modulo at camera-placement time), damped via shared exponential-decay, magnetic snap to nearest sector on scroll-idle. Mouse-look stays live on top of orbit (small additional parallax). Click on sector's `interact` skeleton node → GSAP dolly-in + sector UI opens.

**Accessibility fallback:** Visible prev/next sector-jump menu, non-negotiable (keyboard/screen-reader users never depend on the scroll gesture).

**AI-as-lighthouse:** The SC05 entity persists here (docked at table center) and can drive the orbit system via tool-calling — `navigate_to_sector("RS1", true)` physically rotates the table.

Sector-specific visual prompts are generated only when each sector's functionality is being built, not in advance. Each uses the SC06 accepted keyframe as its reference image with a camera-rotation delta.

---

# 7. THE UNIFIED 3D FRAMEWORK (compact reference)

Every object in every scene is built through this shared system. Never hand-roll per-object logic.

```typescript
// src/lib/three/damp.ts — the ONLY motion primitive anywhere in the 3D scene
export const dampScalar = (c: number, t: number, lambda: number, dt: number) =>
  THREE.MathUtils.damp(c, t, lambda, dt);

export function dampVec3(c: THREE.Vector3, t: THREE.Vector3, lambda: number, dt: number) {
  c.x = THREE.MathUtils.damp(c.x, t.x, lambda, dt);
  c.y = THREE.MathUtils.damp(c.y, t.y, lambda, dt);
  c.z = THREE.MathUtils.damp(c.z, t.z, lambda, dt);
  return c;
}
```

```typescript
// src/components/three/Interactable.tsx
// Mandatory wrapper for every clickable object: hover scale-damp, lock affordance,
// access-tier gate, cursor state, optional soundHover/soundActivate
```

```typescript
// src/components/three/CameraDirector.tsx
// The ONLY component allowed to move the camera.
// Three decoupled systems:
//   scroll        → position along a rail OR orbit angle (never both in one scene)
//   pointer/touch → clamped look-offset only
//   click/tap     → raycast against skeleton nodes only
```

```typescript
// src/lib/three/materializeShader.ts
// Shared dissolve/appear effect: noise-driven discard + glowing edge (GLSL)
// Used for: door transitions, sticky notes appearing, resume "printing", entity coalescing
```

---

# 8. ASSET PIPELINE (zero-GPU, zero-local-Blender)

The project's development hardware is constrained (i3, 3GB RAM, no GPU). This pipeline is designed around that reality.

```text
1. Generate reference plate (color image)
   → Image generation tool, using this file's Style Bible + per-scene prompt
   → Feed previous accepted plate as reference image (edit mode)
   → Store accepted result in /public/frames/{sceneId}/keyframe_N.jpg

2. Build runtime geometry
   → For tunnel/cave: depth-mesh from reference plate (Technique C, hardened)
   → For workshop furniture: real low-poly geometry (cylinders, torus, boxes)
   → For entity: hand-authored GLSL shader
   → For sector-specific props: procedural or Colab-generated .glb

3. Apply materials
   → Procedural GLSL detail overlay (fBm grime/scratch, blurred macro-color base)
   → This replaces raw-pixel sampling (quality improvement AND watermark-safe)
   → Use reference plate as heavily-blurred macro-color guide only

4. If depth maps are needed
   → Generate locally via scripts/generate_depth_map.py (Depth-Anything V2 weights)
   → FORCE-RESIZE depth map to source image exact dimensions before saving
   → Never route through a rate-limited public demo Space
   → CPU-only, ~1 minute per image on constrained hardware

5. For modeled props requiring actual mesh
   → Write a headless Blender Python (bpy) script
   → Run in free Google Colab notebook (zero local install)
   → Export Draco-compressed .glb
   → Never assume local Blender access

6. Validate
   → validate-scene-render.ts screenshots + gate-checks (not >90% flat color,
     zero console errors, bounding box in expected range)
   → If Playwright destabilizes the 3GB dev environment, validate manually
     via dev-server browser tab — same checklist, by eye
```

---

# 9. PHYSICAL INTERACTION CONTRACT

Every interactive object shares this contract:

```typescript
type InteractableManifest = {
  id: string;
  sceneId: string;
  category: "door" | "panel" | "screen" | "tool" | "note" | "hologram" | "station" | "prop";
  accessTier: "public" | "limited" | "verified";
  anchor: string;
  collisionShape: string;
  hoverBehavior: string;
  grabBehavior?: string;
  releaseBehavior?: string;
  focusCameraTarget?: string;
  audioProfile?: string;
  hapticProfile?: string;
  agentActions?: string[];
};
```

No scene invents a different interaction contract.

---

# 10. SCENE RULES

## Physical Causality

Every visual change must have a cause.

| ✗ Bad                                         | ✓ Good                                                      |
| --------------------------------------------- | ----------------------------------------------------------- |
| New object appears because next scene needs it | Camera moves → object becomes physically visible             |
| Room suddenly becomes brighter                 | AI activation → power routing → fixtures energize → walls reveal |
| UI panel floats in front of camera             | Real display plane on physical bracket → camera approaches → display readable |

## No Teleportation

A viewer must never notice the asset handoff. Use real occluders: door frame, pillar, workbench edge, structural rib, darkness, mechanical shutter, fog. A moving camera passing behind a real object hides asset streaming.

## Natural Traversal

The viewer should feel like a body exists even though none is rendered: head-height camera, small lateral head-look, subtle inertia, reasonable turn rate, eye-level parallax, focus changes, micro camera settling. Never: instant 90° snap, camera flying through geometry, camera penetrating walls, instant FOV changes.

## Lighting Transitions

Never hard-swap lighting unless the fictional machine intentionally does so. Use practical fixture power-up, distance-based attenuation, localized reflection changes, fog response, shadow movement, emissive ramp. The lighting arc across scenes:

```text
SC00 (door):     amber dominant, cyan low
SC03 (darkroom): cyan almost absent
SC04 (mapping):  cyan event dominant
SC05 (entity):   cyan sole source
SC06 (active):   amber practicals restored, cyan controlled
```

This is a narrative light language, not merely a color palette.

---

# 11. SCENE INSERTION / REMOVAL PROTOCOLS

## To insert a scene between SC04 and SC05:

1. Give it a new immutable SCENE_ID
2. Do NOT rewrite SC04 or SC05
3. Define exact START_STATE = SC04_END_STATE
4. Define exact END_STATE = SC05_START_STATE
5. Generate new reference using SC04 plate as image reference
6. Reuse all anchors
7. Introduce only explicitly listed new geometry
8. Write one transition-in and one transition-out
9. Update the timeline manifest
10. Re-run continuity checks

## To remove a scene:

1. Do NOT regenerate all later scenes
2. Redirect the previous scene's end state into the next scene's existing start state
3. Generate one bridging transition
4. Validate camera, lighting, prop, and audio continuity

---

# 12. REFERENCE DIRECTORY STRUCTURE

```text
/public/frames/
  S00/keyframe_0.jpg       ← accepted master
  S00/keyframe_1.jpg       ← alternate (if needed)
  S01/keyframe_0.jpg
  S03/keyframe_0.jpg
  S04/keyframe_0.jpg
  S05/keyframe_0.jpg
  _archive/                ← superseded plates, never deleted

/reference/                ← optional high-res originals
  style/
    MASTER_STYLE_BIBLE_v2.txt
    SEED_ANCHOR_v1.txt
  scenes/
    SC00_APPROACH/manifest.json
    SC01_PANEL/manifest.json
    ...

/src/
  components/three/
    Interactable.tsx
    CameraDirector.tsx
    scenes/Scene00.tsx ... Scene06.tsx
    objects/               ← per-scene meshes
    skeleton/SkeletonLayer.tsx
  lib/three/
    damp.ts, types.ts, materializeShader.ts, depthMesh.ts
    skeleton/types.ts
  lib/feedback/
    haptic.ts, audio.ts
  store/sceneStore.ts
```

---

# 13. SCENE MANIFEST FORMAT

Every scene gets a machine-readable manifest:

```json
{
  "sceneId": "SC00_APPROACH",
  "version": "1.0.0",
  "styleBible": "2.0.0",
  "camera": {
    "eyeHeight": 1.65,
    "lensMm": 35,
    "lookClampYawDeg": 45,
    "lookClampPitchDeg": 25,
    "scrollState": "inert"
  },
  "lights": {
    "worldKey": "LIGHT_WORLD_KEY",
    "digitalAccent": "LIGHT_DIGITAL_ACCENT"
  },
  "anchors": ["ANCHOR_A_DOOR_CENTER", "ANCHOR_D_PANEL_CENTER", "ANCHOR_P_ENTRY_CENTERLINE"],
  "interactables": [{ "id": "door-approach", "accessTier": "public" }],
  "reference": { "master": "public/frames/S00/keyframe_0.jpg" },
  "skeleton": [
    { "id": "door-00", "shape": "box", "position": [0, 1.65, 0], "size": [3.2, 3.3, 0.4], "purpose": "interact" }
  ]
}
```

---

# 14. CONTINUITY QA SCORE

Every scene gets a score out of 100:

```text
Geometry continuity        20
Camera continuity          15
Material continuity        15
Lighting continuity        15
Scale continuity           10
Prop continuity            10
Interaction continuity     10
Atmospheric continuity      5
```

Do not mark a scene "production ready" below 95.

Hard failures (override score to 0):

```text
human visible
hands visible
camera not FPP
wrong major geometry
wrong color system
fake text used as actual UI
teleport detected
interactive object is a flat image
camera clips through geometry
```

---

# 15. PERFORMANCE CONTRACT

```text
Target:   60fps preferred
Fallback: stable 30fps preferable to unstable 45–55fps
```

On constrained hardware, reduce: particle count, shadow resolution, volumetric samples, DPR, active sector count. Never reduce: physical scale, camera continuity, interaction correctness, material identity, scene anchors.

Preload: active scene + previous scene + next scene. Dispose aggressively when safe.

---

# 16. IMPLEMENTATION ORDER

## Phase A — Visual Lock

```text
1. Lock MASTER_STYLE_BIBLE                              ✓ done
2. Lock camera language                                 ✓ done
3. Generate SC00                                        ✓ done — keyframe accepted
4. Generate SC01 from SC00                              ✓ done — keyframe accepted
5. Generate SC03 from SC01                              ✓ done — keyframe accepted
6. Generate SC05 (entity) from SC03                     ✓ done — keyframe accepted
7. Generate SC06 (active) from SC03                     ✓ done — keyframe accepted
8. Generate SC02 door-opening animation (6–12 frames)   ○ next
9. Generate SC05 entity build-up (6–12 frames)          ○ queued
10. Generate SC06 room power-on (6–8 frames)            ○ queued
```

## Phase B — Physical Substrate

```text
11. Create rough scene geometry (tunnel, workbench, holo-table)
12. Define anchors from accepted keyframes
13. Create collision volumes (SkeletonLayer)
14. Define camera paths (CameraDirector rails)
15. Connect transitions (GSAP tweens + MaterializeMaterial)
```

## Phase C — Visual Realization

```text
16. Apply depth-mesh or projection textures to geometry
17. Add procedural GLSL detail overlays
18. Add live lights
19. Replace display placeholders with runtime canvas planes
20. Add real interactables with shared Interactable wrapper
```

## Phase D — Interaction

```text
21. Door (SC00 click → T00 dolly)
22. Biometric panel (SC01 WebAuthn + face scan)
23. Entity shader (SC05, built in isolation first)
24. Orbit navigation (SC07+, scroll → 360° rotation)
25. Sector stations (RS1 → RS3 → LS1 → LS2, in MVP order)
26. Sticky notes (LS2, raycast + grab + place)
```

## Phase E — Polish

```text
27. Spatial audio (Web Audio API + PannerNode)
28. Haptics (mobile-only bonus, no-op on desktop)
29. Focus transitions (depth-of-field rack)
30. Material response refinement
31. Performance optimization
32. Accessibility fallback (semantic HTML, keyboard nav, prev/next sector menu)
33. Full QA checklist
```

---

# 17. ACCEPTED KEYFRAME MANIFEST

These frames have been generated and accepted. They are the visual ground truth.

| Scene | File                                    | Status   |
| ----- | --------------------------------------- | -------- |
| SC00  | `public/frames/S00/keyframe_0.jpg`      | ACCEPTED |
| SC01  | `public/frames/S01/keyframe_0.jpg`      | ACCEPTED |
| SC03  | `public/frames/S03/keyframe_0.jpg`      | ACCEPTED |
| SC05  | `public/frames/S04/keyframe_0.jpg`      | ACCEPTED |
| SC06  | `public/frames/S05/keyframe_0.jpg`      | ACCEPTED |

SC02 (door opening) and SC04 (mapping) are shader/transition events — they do not require standalone keyframes but will use frame sequences generated from SC01 and SC03 respectively.

---

# 18. DEFINITION OF DONE

A scene is not done because its screenshot is beautiful.

A scene is done when:

```text
the reference image is approved
AND the geometry exists
AND the skeleton nodes are defined
AND the camera path is continuous with adjacent scenes
AND the materials match the master palette
AND the lighting is physically motivated
AND the interactables are real meshes (not flat images)
AND the transition is causal (not a teleport)
AND the scene survives look-around without breaking
AND the next scene matches its ending state
AND weak-device performance is acceptable
AND the accessibility fallback remains functional
```

---

# 19. FINAL CREATIVE DIRECTIVE

The Workshop should not feel like:

```text
a portfolio website with 3D
```

It should feel like:

```text
a real private engineering environment
that happens to contain a portfolio.
```

The visitor should progressively infer:

```text
door → machine → facility → intelligence → workshop → work → person
```

The environment should never explain itself too early.

The strongest visual language is:

```text
physical object first
digital behavior second
text third
```

The final experience should leave the visitor thinking:

> "I was physically there for a minute."

not:

> "Someone made a very elaborate WebGL landing page."

That distinction is the entire project.
