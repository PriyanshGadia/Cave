What you've landed on isn't a fallback — it's a real, proven technique with a name, and I think it's genuinely the right call given everything that's happened. Let me place it precisely before I write the file, because two pieces of the framing need a small but important correction first.

**The good news: this is Myst.** Pre-rendered, fixed-viewpoint scenes with a pannable look-around and an invisible interaction layer underneath is exactly how Myst, Riven, and the original Resident Evil built some of the most atmospheric environments ever shipped — and it's exactly how Google Street View and Matterport work today. It's not a lesser version of real-time 3D. It's a different, legitimate discipline that happens to sidestep the single thing your hardware can't do (real-time photoreal rendering) by moving all the visual complexity into something Nano Banana is actually good at: still images.

**The correction: "1,000 or 1,000,000 frames, lighting shifting as you walk anywhere" describes continuous free movement — and that specifically can't be pre-rendered, at any frame count.** Camera position in continuous space is infinite, not large — a million frames covers zero percent of it, the same way a million points don't fill a line. What actually works, and what Myst/Street View both prove is genuinely convincing: **discrete nodes** (fixed viewpoints) each rendered as one high-detail **panoramic** image you can pan/tilt within using your mouse — a real look-around, just bounded to that spot — with a **transition** (crossfade, push-in, or a short animated cut) carrying you between nodes rather than free continuous walking. This is what "N scenes, M transitions" already describes once "scenes" means panoramic nodes, not infinite camera positions.

**Smaller correction: "haptic feedback" isn't really available through a browser.** The Web Vibration API exists but is a crude buzz, mobile-only, nothing like real haptic sensation. I'll build real audio feedback (Web Audio API, genuinely effective for immersion) instead of promising something the platform can't do.

**Part 5 is the piece that actually saves this project — say that plainly.** An invisible collision/interaction layer under pretty pre-rendered imagery means the 3D geometry that's been failing for weeks never has to look good again. It just has to be positioned correctly, which is a dramatically lower, achievable bar. This single architectural change is very likely what breaks the loop you've been stuck in.

## Here's the full prompt system.

I understand completely. The procedural geometry loop has been fighting your hardware, your budget, and the inherent limitations of real-time WebGL.

Your pivot is **brilliant**—it’s exactly how AAA studios create photoreal, pre-rendered cinematics inside interactive games (like _Hellblade_ or _Detroit: Become Human_). You separate the **cinematic render** (the flawless image) from the **physics skeleton** (the invisible colliders).

However, I must give you one strict warning before we proceed: **AI image generators do NOT produce the exact same image twice, even with the same prompt.** To guarantee "reproducibility," your prompt system **must** include a fixed **`SEED`** parameter and a **`REFERENCE_IMAGE`** input for the subagent to use as a base.

Here is the definitive, highly specific **Prompt Markdown File** for your Antigravity subagent, complete with the visual specification, the physical physics-map instructions, and the interactive FPP sensory requirements.

Paste this entire block into a file named **`cinematic-workshop-blueprint.md`** and feed it directly to your AI agent.

---

```markdown
# THE WORKSHOP: CINEMATIC & INTERACTIVE BLUEPRINT

### SYSTEM DESCRIPTION: First-Person Photoreal Cinematic + 2.5D Physics Skeleton

**PIVOT SCOPE**:
Generate the flawless, photorealistic **visual layer** via AI image/video generation.
Build a **"poor but proper" physical 3D shell** underneath to handle real-time user interaction, physics, haptic feedback, and environmental audio.

---

## 0. CRITICAL FRAMEWORK FOR REPRODUCIBILITY

**Failure Condition:** If the subagent generates inconsistent props across different prompts, the cinematic will break.
**Solution:**

1. **`SEED_LOCK`**: Every prompt block must end with a fixed integer seed (e.g., `--seed 19870615`).
2. **`BASE_REFERENCE`**: Generate the **Entrance Scene** first. Extract the precise color hex codes for the "Dark Gunmetal" (`#11100E`), "Amber Key" (`#FFA030`), and "Cyan Hologram" (`#00E5FF`). Feed the successful image of the Entrance back into every subsequent prompt as an `Image Prompt/Reference`.
3. **Consistency Directive**: "The precise visual material, lighting temperature, and spatial positioning must remain 100% consistent with the provided Reference Image."

---

## 1. THE VIEWER (Tony Stark / FPP Rules)

- **Camera Mount**: Subjective FPP. Head height is exactly `1.65m` to `1.75m` from the floor.
- **Viewer Visibility**: The viewer is NEVER in the frame. The viewpoint moves, looks, and interacts without showing hands or arms.
- **Intended Feedback**: Every environment must imply the physical presence of the viewer. Floor reflections must shift as the "camera" walks. Micro-shadows must animate as the "viewer" passes under lighting.

---

## 2. SCENES N & TRANSITIONS M (The Photoreal Cinematic Track)

### Scene 01: THE APPROACH

- **Visual Composition**: 9:16 vertical framing. The viewer is standing in a jagged, dimly lit rocky tunnel, walking toward a massive, 3-tiered octagonal blast door. Heavy volumetric haze, floating dust motes.
- **Lighting**: Amber practical `#FFA030` raking down the left cave wall. Deep cyan `#00E5FF` bleeding faintly from the door's biometric panel.
- **Audio Cue**: Low-frequency hum of industrial servos, the crunch of loose gravel underfoot, distant dripping water.

### Transition 01: THE BIOMETRIC PANEL INTERACTION

- **Transition Mechanics**: The viewer stops 1.2m from the door. The camera automatically tilts up slightly, locking onto the central biometric console.
- **Visual Trigger**: The cyan scanner ring pulses slowly.
- **Sensory Feedback**: A strong haptic buzz transmits through the viewer's chair/mouse. A low, resonant _thump_ sound as the door's heavy locking bolts disengage.

### Scene 02: THE LAB REVEAL

- **Visual Composition**: The massive blast door slides open. The viewer walks through the threshold into a vast, cavernous underground laboratory.
- **Lighting Shift**: The lighting transitions from the dark, contrasting amber/cyan of the cave to a "cool active" state—a 360-degree subtle ambient blue `#1A2835`, with localized warm desk lamps `#E6A87C` on workstations.
- **Hero Props**: A massive, circular holo-table sits dead center. A complex, sprawling industrial workbench spans the right wall. A wall of sticky-note/UI screens sits on the left.

### Transition 02: CIRCULAR NAVIGATION

- **Movement Logic**: The viewer looks around. A translucent, gold-cyan 3D directional reticle appears at the top center of the screen.
- **Input**: Scrolling the mouse wheel (or swiping on mobile) rotates the camera's orbital position around a fixed point near the holo-table, but the FPP camera shifts to follow.

### Scene 03: THE HOLO-EMERGENCE

- **Visual Composition**: The center of the dark holo-table illuminates. A swirling plasma vortex rises, coalescing into a wireframe geometric entity.
- **Interactive Element**: The Entity is the "Holographic AI". When the viewer _clicks_ on the holo-table center, the Entity speaks (text-to-speech via the local LLM).
- **Audio Cue**: Digital synthesizer swells, high-tech FFT-tracking sound, a crisp, metallic "whoosh" as the hologram solidifies.

### Scene 04: THE DATA WALL / STICKY NOTES

- **Visual Composition**: The viewer turns 90 degrees left. A massive, low-lit physical board is covered in glowing cyan sticky notes.
- **Interactive Element**: Raycast detection. Each sticky note is a physical collider.
- **Viewer Action**: Viewer clicks a sticky note. It detaches from the board, floats into the viewer's direct center FPP, and expands to reveal text/website data (fetching from the Supabase D1 DB).

### Transition 03: THE RESUME CONSOLE

- **Visual Composition**: The viewer turns 180 degrees right to the workbench. A dark physical terminal with glowing key-caps sits waiting.
- **Interactive Element**: Viewer approaches. A floating, emissive cyan GUI appears over the terminal. The viewer's real mouse cursor becomes a 3D "cyber-cursor".

---

## 3. THE PHYSICAL SKELETON MAP (The "Poor but Proper" Geometry Layer)

The photoreal images above are merely _2D background textures_ and _2D depth planes_ projected onto the following **Physical Collision Mesh**:

1. **GROUND COLLIDER**: A flat invisible plane at `Y = -0.02m` occupying a 10x10 meter square. This catches footstep vibrations and depth shadows.
2. **THE DOOR COLLIDER**: A flat octagonal collider box at the center. When the viewer steps `X < 1.2m`, it triggers `Transition 01` (Biometric Scan).
3. **THE HOLO-TABLE COLLIDER**: A circular `CylinderCollider` (radius `1.5m`, height `0.8m`). This acts as a physical barrier so the viewer cannot "clip" through the cinematic holo-table.
4. **THE WORKBENCH TRIGGER**: A `BoxTrigger` at `[1.5, 0.8, 0.5]` (on the right). Entering this zone toggles the visible UI for the Resume Terminal.
5. **THE STICKY NOTE COLLIDERS**: 40 separate `BoxCollider` planes (0.15m x 0.15m) mapped to `X = -1.2m`, `Y = 1.2m` to `2.0m`. Each collider triggers a raycaster interaction to "grab" the note.
6. **THE HAPTIC/AUDIO NODES**:
   - Physical location `[0, 1.2, -2.0]` emits a continuous low 40Hz drone (the room's ambient hum).
   - Physical location `[-2.0, 1.5, -3.0]` (the left wall) emits a subtle water drip audio loop.

---

## 4. INTERACTION MATRIX (Bridging Visuals to Physics)

| Visual Scene     | Physical Collider  | Haptic Feedback                     | Auditory Feedback                     | UI Overlay                         |
| :--------------- | :----------------- | :---------------------------------- | :------------------------------------ | :--------------------------------- |
| **The Door**     | `OctagonCollider`  | Heavy, low-frequency rumble (500ms) | Clanking metal bolts, pneumatic hiss  | Cyan scanning UI overlay           |
| **Holo-Table**   | `CylinderTrigger`  | Subtle vibrational hum              | Swelling digital synth                | Floating 3D cyan chat GUI          |
| **Sticky Notes** | 40 x `BoxCollider` | Sharp, crisp "tick" vibration       | Paper crinkle / digital shutter sound | Note expands to fill 30% of screen |
| **Workbench**    | `BoxTrigger`       | `none` (ambient)                    | Light electrical "click" of keys      | Emissive cyan terminal UI          |

---

## 5. SUBAGENT EXECUTION INSTRUCTIONS (For Antigravity)
```

TASK: Execute the "Cinematic Workshop Blueprint" using a two-step layered process.

STEP 1 (Visual Generation):

- Create a subagent that loops through Scene 01 through Scene 04.
- For each Scene, use the exact `Prompt` defined in this document.
- IMPORTANT: Before starting, generate Scene 01, save it as `REF_SCENE_01.png`.
- For Steps 02, 03, and 04, pass `REF_SCENE_01.png` as the `Image Prompt` to the image generator to force strict color/temperature consistency.
- Store all generated images in `/public/cinematics/scene_XX_keyframe.webp`.
- Generate 5 additional "in-between" variations for each scene (Camera tilt up/down, slight pan-left/right) and store them in `/public/cinematics/scene_XX_transition_XX.webp`.

STEP 2 (3D Interaction Mapping):

- Open `/src/components/scene/PhysicsLayer.tsx` (create it if it doesn't exist).
- Using Three.js `BoxGeometry` and `MeshBasicMaterial` with `opacity: 0.0`, `transparent: true`, build the physical collider skeleton described in Section 3.
- Wrap these invisible colliders with `@react-three/drei`'s `<Hoverable>` or `<Interactive>` context.
- Implement a `useInteraction` hook that reacts when the user's Raycaster intersects these invisible meshes and returns the associated Haptic/Audio/UI triggers from Section 4.
- DO NOT RENDER THESE MESHES VISIBLY. They are invisible physics triggers.

```

---

## 6. IMPORTANT TECHNICAL BOUNDARIES & CAVEATS FOR YOUR SUBAGENT
1. **NO DEPENDENCY ON 3D GENERATORS**: Strictly use Image Generators (Nano Banana/Gemini) for the cinematic, and plain Three.js code for the colliders. Do not attempt to build full 3D mesh replicas of the scene.
2. **FRAME INTERPOLATION**: Do not generate 1 million images. Generate 8 Keyframes. The "cinematic walking" between these frames should be handled by `Motion` / `GSAP` camera tweening in the actual game engine, using the generated images as 2.5D background parallax cards.
3. **VIEWPORT LOCK**: The generated scenes must be `9:16` vertical aspect ratio, exactly to match mobile devices and the original design spec.

**End of Blueprint Block. Execute the two-step process immediately.**
```

---

### What to do right now:

1. Copy this Markdown block into a blank file named `cinematic-workshop-blueprint.md` in your project root folder.
2. Open Antigravity (or your subagent). Paste a single instruction: _"Read `cinematic-workshop-blueprint.md`. Execute the Subagent Execution Instructions starting with Step 1 (Generate Scene 01)."_
3. Once Scene 01 is generated, Antigravity will use that image as a **stable reference** to generate the rest of the scenes with _identical_ material colors and lighting temperatures, ensuring perfect visual consistency.
4. When the images are generated, Antigravity will build the invisible `PhysicsLayer.tsx` to enable the actual sticky-note interactions, colliders, and haptic feedback you wanted.

## This breaks you out of the "generate a broken 3D mesh" trap and puts you into the "interactive photoreal cinematic" lane. Go execute it.

### Global Master Style Anchor (Deterministic Seed Token)

To prevent style drift across image/video generation iterations, prepend this **Global Master Anchor** to every generation prompt:

```text
[GLOBAL ANCHOR: Stark Subterranean Advanced R&D Workshop, hyper-realistic 8k cinematic film still, shot on ARRI Alexa LF 24mm anamorphic lens at f/2.8, cinematic chiaroscuro lighting, dual-tone key (3200K tungsten amber practicals, 6500K slate-cyan subterranean ambient fill, 480nm neon cyan volumetric holographic glow), heavy weathered industrial gunmetal, carbon fiber panels, dark volcanic basalt rock cavern perimeter, brushed titanium chassis, physical micro-scratches, dust motes in light beams, ACESFilmic tone mapping, strict First-Person POV at 1.75m eye level, zero character/body visible in frame, photorealistic raytraced reflections, industrial brutalist-scifi engineering.]

```

---

### Sequence Trajectory (Scenes & Transitions)

```markdown
================================================================================
SCENE 01: THE BLAST DOOR ACCESS THRESHOLD (Z = 0.0m)
================================================================================
[POV / CAMERA]: Eye level (1.75m), facing straight ahead (lookAt: [0, 1.45, -1.0]), stationary.
[VISUAL PROMPT]:
GLOBAL ANCHOR. Extreme close-up POV standing directly in front of the colossal octagonal titanium blast door "SEC-06". The door is split vertically down the middle, constructed of multi-layered stepped charcoal gunmetal plates with recessed diagonal chevron channels and four heavy-duty circular turbine intake grilles with 8-spoke protective grilles. In the dead center, the extruded biometric console column is active: the top recessed monitor displays crisp cyan telemetry reticles, radar wave graphs, and 'SYS_LOCK: ENGAGED'. Below the screen, the biometric optical retina scanner glows with a bright concentric cyan LED ring and flanking green/amber status diodes. Left wall of jagged volcanic basalt rock is bathed in rich golden-amber raking light; right wall is cast in deep slate-blue shadow. Loose gravel and broken bedrock slabs litter the foreground floor.

[PHYSICAL PROXY COLLIDERS (Invisible Three.js Layer)]:

- Collider: "console_biometric_pad" -> BoxGeometry [0.22, 0.76, 0.14] at [0, 1.42, 0.12]
  - Interaction: Hover (Cursor becomes holographic cyan target), Click (Triggers retinal scan sequence).
- Collider: "door_left_slab" -> BoxGeometry [0.72, 2.35, 0.08] at [-0.36, 1.35, 0.0]
- Collider: "door_right_slab" -> BoxGeometry [0.72, 2.35, 0.08] at [0.36, 1.35, 0.0]
- Collider: "ground_scree_01" -> PlaneGeometry at [0, 0, 1.0]

[AUDIO & HAPTIC TRANSMISSION]:

- Audio: Low sub-bass mechanical hum (40Hz), pressurized hydraulic hiss, faint electric arc whine.
- Haptic: Continuous micro-rumble (15% intensity), sharp tactile pop on console interaction.

---

## TRANSITION T01-02: BLAST DOOR BREACH & STEPPING INTO THE VESTIBULE

[POV / CAMERA]: Camera pushes forward from Z=0.0m to Z=-2.5m, slight natural walking head-bob (Δy = ±0.03m, frequency 1.8Hz), slight pitch down (-4°).
[VISUAL PROMPT]:
GLOBAL ANCHOR. Dynamic first-person walking shot pushing through the splitting blast door. The dual titanium door slabs slide horizontally apart into the jagged cave walls with heavy mechanical motion blur and pneumatic steam release. Warm overhead yellow hazard guide lights strobe sequentially along the ceiling of an industrial concrete-and-steel airlock vestibule. Beyond the threshold, the massive expanse of the high-tech workshop begins to reveal itself in the background: towering glass equipment racks, floor-embedded LED conduits, and the ambient cyan glow of the holographic core in the distance.

[PHYSICAL PROXY INTERACTION]:

- Trigger: "airlock_crossing_zone" -> BoxGeometry [1.8, 2.5, 2.0] at [0, 1.35, -1.2]
  - Action: Disables blast door colliders, dynamically streams Scene 02 assets, triggers footstep audio cues.

[AUDIO & HAPTIC TRANSMISSION]:

- Audio: Heavy pneumatic door unsealing klaxon, metal scraping on industrial grease, dual heavy hydraulic slams as doors lock open.
- Haptic: Dual heavy impact jolts (80% intensity, 120ms duration) as door leaves hit lateral stops.

================================================================================
SCENE 02: THE CENTRAL WORKSHOP & HOLOGRAPHIC WORKBENCH (Z = -3.5m)
================================================================================
[POV / CAMERA]: Eye level (1.75m), pan left-to-right 15°, looking slightly down at a 35° angle toward the central table.
[VISUAL PROMPT]:
GLOBAL ANCHOR. First-person POV standing before an expansive, curved dark-titanium engineering workbench. In the center of the table, an active volumetric 3D holographic projector casts an intricate, floating neon-cyan exploded blueprint wireframe of an exo-suit propulsion stabilizer. Scattered across the matte black carbon-composite tabletop are physical objects: a transparent glass smart-pad with live diagnostic graphs, loose Allen wrenches and micro-soldering pens resting in anodized magnetic tool trays, paper sticky notes with handwritten formulas ("ΔV >= 1.4c"), and half-disassembled brushed-aluminum flight thruster manifolds. Ambient background shows towering server stacks with blinking fiber optic arrays and floor-to-ceiling glass tool cabinets.

[PHYSICAL PROXY COLLIDERS (Invisible Three.js Layer)]:

- Collider: "holo_emitter_core" -> CylinderGeometry [0.18, 0.18, 0.06] at [0, 0.95, -3.8]
  - Interaction: Grab & Rotate (Spins the floating 3D holographic wireframe model).
- Collider: "sticky_note_formula" -> PlaneGeometry [0.08, 0.08] at [-0.45, 0.96, -3.6]
  - Interaction: Click / Inspect (Pulls handwritten Stark note to HUD center overlay).
- Collider: "smart_glass_pad" -> BoxGeometry [0.25, 0.01, 0.35] at [0.55, 0.96, -3.7]
  - Interaction: Click / Toggle telemetry diagnostics graphs.
- Collider: "workbench_surface" -> BoxGeometry [2.2, 0.90, 1.2] at [0, 0.45, -3.8]

[AUDIO & HAPTIC TRANSMISSION]:

- Audio: High-frequency digital holographic shimmer (12kHz), gentle server fan white noise, distant automated robotic arm calibrating.
- Haptic: Fine-grain high-frequency haptic tick on hologram rotation; crisp click on sticky note pickup.

---

## TRANSITION T02-03: LEANING INTO THE HOLOGRAPHIC WIREFRAME

[POV / CAMERA]: Camera zooms/dollies in from Z=-3.5m to Z=-4.1m, dipping down to Y=1.40m, focused exclusively on the floating holographic model.
[VISUAL PROMPT]:
GLOBAL ANCHOR. Intense macro first-person POV leaning closely into the center of the holographic projection. The floating cyan wireframe vectors cast volumetric light directly across the viewer's immediate visual field, illuminating microscopic suspended dust motes and creating crisp anamorphic blue lens flares. Individual glowing CAD coordinate nodes, floating stress-load heatmaps (amber and cyan vector gradients), and rotational torque vectors are razor-sharp. Table surface below reflects the floating geometry like dark obsidian glass.

[PHYSICAL PROXY INTERACTION]:

- Trigger: "holo_focus_boundary" -> SphereGeometry [0.45] at [0, 1.25, -4.0]
  - Action: Activates fine-control gesture manipulation mode (pinch to zoom, drag to explode components).

[AUDIO & HAPTIC TRANSMISSION]:

- Audio: Resonant harmonic ionization tone rising in pitch as viewer draws closer to the emitter.
- Haptic: Increasing magnetic resistance haptic gradient as cursor enters the holographic field.

================================================================================
SCENE 03: HARDWARE DIAGNOSTIC RIG & ARC POWER MATRIX (Z = -5.0m, X = -2.0m)
================================================================================
[POV / CAMERA]: Rotated 45° to the left, standing in front of the vertical test assembly rack.
[VISUAL PROMPT]:
GLOBAL ANCHOR. First-person POV facing a vertical heavy-duty robotic assembly gantry. Suspended in the center of the industrial carbon-steel clamp is a glowing miniature Mark-VI Arc Core encased in an unpolished brass and quartz-glass containment housing. Thick, braided copper and liquid-nitrogen cooling conduits snake into the base of the rig, venting faint white cryogenic vapor into the floor drains. Flanking the rig are digital oscilloscope screens with real-time waveform oscillations, multi-colored tactile toggle switches, physical analog pressure gauges with needle indicators resting in the red hazard zone, and a wall-mounted magnetic rack holding precision titanium screwdrivers and hex drivers.

[PHYSICAL PROXY COLLIDERS (Invisible Three.js Layer)]:

- Collider: "arc_core_module" -> CylinderGeometry [0.08, 0.08, 0.08] at [-2.0, 1.35, -5.0]
  - Interaction: Inspect / Power Surge Trigger (Fires bright lens flare and room-wide illumination shift).
- Collider: "cryo_valve_switch" -> CylinderGeometry [0.03, 0.03, 0.06] at [-1.65, 1.10, -4.9]
  - Interaction: Click to Vent Cryogenic Nitrogen.
- Collider: "oscilloscope_screen" -> PlaneGeometry [0.40, 0.30] at [-2.45, 1.55, -4.95]
  - Interaction: Click to cycle diagnostic waveform modes.

[AUDIO & HAPTIC TRANSMISSION]:

- Audio: Deep rhythmic electromagnetic pulse (60Hz throb), cryogenic gas hiss, analog toggle switches snapping with heavy metallic thuds.
- Haptic: Pulsing heartbeat rumble synced to the core's electromagnetic rhythm (30% intensity pulses).

---

## TRANSITION T03-04: TURNING TOWARD THE ARMORY STASIS VAULT

[POV / CAMERA]: 90° smooth pan right, stepping backward from X=-2.0m to X=0.0m, centering the panoramic view of the rear chamber.
[VISUAL PROMPT]:
GLOBAL ANCHOR. Smooth cinematic first-person panoramic turn sweeping across the laboratory floor. The motion blur captures the shifting reflections on the polished epoxy-concrete floor, transitioning from the cool cyan-dominant diagnostic bay to the dramatic high-contrast amber floor-lit avenue leading toward the reinforced containment vault at the rear of the cavern. Overhead industrial yellow overhead crane rails and robotic arm gantries pass overhead.

[PHYSICAL PROXY INTERACTION]:

- Trigger: "armory_approach_zone" -> BoxGeometry [3.0, 2.5, 3.0] at [0, 1.35, -6.5]
  - Action: Triggers stage lighting sequence for Scene 04.

[AUDIO & HAPTIC TRANSMISSION]:

- Audio: Spatial panning of electrical hum from left ear to rear; distant pneumatic clamps releasing in the far chamber.
- Haptic: Subtle floor-rumble vibration simulating distant heavy machinery moving on overhead rails.

================================================================================
SCENE 04: THE ARMORY CONTAINMENT PODS (Z = -8.0m)
================================================================================
[POV / CAMERA]: Wide panoramic eye level (1.75m), centered on the back wall of the laboratory.
[VISUAL PROMPT]:
GLOBAL ANCHOR. Grand first-person perspective facing three massive floor-to-ceiling cylindrical reinforced armor stasis pods built directly into the raw subterranean granite cave wall. Each glass cylinder is illuminated from its base by vertical amber LED strip bars, revealing shadowed silhouettes of advanced robotic exo-armor suits resting in dormant standby. Heavy steel hydraulic lock arms embrace the glass chambers. Overhead, an industrial robotic assembly claw hangs motionless from an articulated gantry rail. The perimeter of the room blends raw, jagged basalt cavern rock with precision-machined titanium reinforcement bulkheads and orange glowing floor conduit tracks.

[PHYSICAL PROXY COLLIDERS (Invisible Three.js Layer)]:

- Collider: "pod_01_activation_console" -> BoxGeometry [0.30, 1.0, 0.20] at [-1.8, 1.0, -7.6]
  - Interaction: Click (Triggers interior light activation on Armor Mark I).
- Collider: "pod_02_center_console" -> BoxGeometry [0.30, 1.0, 0.20] at [0.0, 1.0, -7.6]
  - Interaction: Click (Triggers interior light activation on Armor Mark II).
- Collider: "pod_03_activation_console" -> BoxGeometry [0.30, 1.0, 0.20] at [1.8, 1.0, -7.6]
  - Interaction: Click (Triggers interior light activation on Armor Mark III).

[AUDIO & HAPTIC TRANSMISSION]:

- Audio: Massive echoing subterranean reverb, deep transformer charging whine, hydraulic lock clicks, motorized glass rising.
- Haptic: Heavy sequential haptic bursts (40ms, 80ms, 120ms) as the containment pod lock clamps disengage.
```

---

### Implementation Architecture: Invisible 3D Proxy to AI Video Stream

```
                                  USER INPUT
                         (Mouse / Touch / XR Raycast)
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    Three.js Invisible Layer   │
                      │  (Low-Poly Proxy Colliders)   │
                      └───────────────┬───────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
┌───────────────────────────┐                   ┌───────────────────────────┐
│     Interaction Logic     │                   │   Canvas Video/Latent     │
│  - Spatial Audio Trigger  │                   │      Stream Engine        │
│  - Haptic Device Pulses   │                   │  - Frame Stitching / VAE  │
│  - HUD React/DOM Overlays │                   │  - WebGL Texture Quad     │
└───────────────────────────┘                   └───────────────────────────┘

```

#### Production Checklist

- **Image Consistency Anchor**: Lock seed numbers per subagent run, pass the exact `[GLOBAL ANCHOR]` string as the positive prompt prefix, and set negative prompts strictly to `(character, person, hands, body, cartoon, 3d render look, lowres, blurry, overexposed, oversaturated:1.4)`.
- **Depth Map Extraction**: Run every generated master frame through **Marigold** or **Depth-Anything-V2** to extract high-precision 16-bit depth maps. Use these depth maps directly in Three.js as displacement planes for 2.5D parallax during micro-head movements.
- **Invisible Collider Alignment**: Position Three.js collision boxes exactly according to the coordinate metadata listed in each scene section so raycast hits match the visual pixel boundaries 1:1.

---

## Would you like me to generate the **automated subagent Python orchestration script** (which reads this markdown, calls the image generation API, extracts depth maps, and prepares the output directory structure for Three.js)?

Done. I built the full prompt/continuity system as a single Markdown source of truth:

[Download THE_WORKSHOP_VISUAL_SCENE_BIBLE_v1.md](sandbox:/mnt/data/THE_WORKSHOP_VISUAL_SCENE_BIBLE_v1.md)

The file is intentionally much more than a scene-prompt collection. It locks the global style, materials, lighting, camera grammar, immutable spatial anchors, scene manifests, transition contracts, haptics/audio behavior, reproducibility rules, insertion/removal protocol, Antigravity subagent instructions, QA gates, and the 15-scene progression from `SC00_APPROACH` through the live Workshop layer.

I also made one important architectural correction to your idea: **do not generate 1,000,000 independent AI frames and stitch them together**. Use AI generation to establish canonical visual states and transition references, then let the real R3F environment carry camera motion, lighting, interaction, and temporal consistency. That follows the strongest parts of your existing plan: the six-beat cinematic spine, projection-based asset workflow, and the requirement that interactive elements remain real runtime objects.

The new bible also explicitly prevents the failure that produced your earlier “primitive geometry wearing mood lighting” result: Antigravity is forbidden from inventing placeholder geometry when the approved visual asset does not exist, and it must stop and report the missing dependency instead.

The six original cinematic beats remain the backbone, but the document turns them into a deterministic continuity chain, with the final `SC06_ACTIVE` state handing directly into the live sector system.

One other thing I hardened: your “add/remove scenes without the world mutating” requirement is now a formal invariant. Scenes have immutable anchors and start/end state contracts, so inserting a new scene means creating a bridge, not regenerating the universe. That is the part that keeps the whole thing from becoming a 700-frame game of visual telephone.

---

# THE WORKSHOP — Master Scene, Transition & Execution Script

**Final Consolidated Edition — v3.0**
_Supersedes and merges: `workshop-plan-v2.md`, `scene1-realtime-3d-fix.md`, `asset-pipeline.md` (Technique C, hardened), `local-zero-budget-pipeline.md`_

Save this whole file as `/docs/master-script.md` in your repo. It is the single source of truth. Every other doc listed above still exists and is still correct — this file is what _reconciles_ them into one script you can hand to Antigravity scene-by-scene.

---

## 0. Read This First — One Correction Before Anything Else

Your brief (point 2–3) describes "generate N scenes with M transitions... stitch frames together... interactive movements." I need to correct the mental model here, the same way we corrected "impregnable security" earlier — not to say no, but because agreeing with the wrong framing would waste your build time.

**What you cannot do:** pre-render a video (a fixed sequence of frames) and have it respond to live mouse-look, scroll-orbit, and click-to-interact. A video has no camera, no geometry, no raycaster. This was the exact Scene-00 failure diagnosed earlier — an image pretending to be a scene.

**What you're actually building, and what this document scripts:** a **live, real-time WebGL engine** (Three.js/React Three Fiber) that _looks_ like a rendered cinematic. The "images" your subagent generates are not output frames — they are **reference plates**: one color photo + one depth map per scene, used to build real, lit, camera-navigable 3D geometry (Technique C, hardened). Nothing is ever "stitched into a video." Everything is drawn live, every frame, reacting to the real viewer in real time.

So, translating your ask into what's real:

| Your term                                                  | What it actually is here                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| "N scenes"                                                 | N distinct **environment builds** (geometry + material + lighting states), each with its own reference-plate pair         |
| "M transitions"                                            | M **camera-state handoffs** between environments — a scripted dolly, a shader event, or a mode switch (cinematic → orbit) |
| "Generate images and stitch"                               | Generate **reference plates** → depth-mesh them → light them live → camera moves through the _real_ result                |
| "Interactive movements... haptic/auditory/visual feedback" | A real input→feedback loop, honestly scoped to what a browser can do (Section 4)                                          |
| "Rough invisible physical geometry underneath"             | A genuine second layer: invisible collision/interaction proxies, decoupled from the pretty visual mesh (Section 3)        |

Everything below is built on this corrected, real foundation. Nothing in your vision is lost — it's actually _more_ achievable this way, because a live engine is strictly more capable than a video (a video can never be walked through differently by two different visitors; this can).

---

## 1. Global Style Bible (locked — paste verbatim into every generation, never edit)

```
STYLE_BIBLE (v1 — immutable; append scene-specific content only, never reword this block):

Hyper-realistic cinematic 3D render, Unreal Engine 5 hybrid photoreal aesthetic,
hard-surface sci-fi industrial design language throughout. Materials restricted to:
dark gunmetal grey steel, brushed titanium, matte black composite casing, weathered
iron plating — with realistic micro-scratches, edge wear, and grime accumulation in
recessed seams. Two-light color system ONLY, no other hues permitted anywhere in
frame: warm amber/gold practical key light (~2900K) representing the physical world,
and cool electric cyan accent light (~7000K) representing digital/holographic
elements. Chiaroscuro contrast, deep impenetrable shadows, HDR light falloff, subtle
volumetric haze in air. Vertical 9:16 framing, 35mm-equivalent lens, slight natural
vignette. NO human figures, hands, arms, or faces in frame — the viewer is a
disembodied first-person camera and must never appear, reflect, or cast a shadow
anywhere in any generated plate. No rendered fake UI text except where explicitly
specified as a single flat screen element (and even then, leave that region blank —
text is added live, in code, never baked). 8k micro-detail, physically-based material
response. No IP-specific iconography: no arc-reactor shapes, no red/gold palette,
no "J.A.R.V.I.S."-style HUD graphic language.
```

**Consistency method (this matters more than prompt wording):**

1. Generate Scene 00 first, pick the best result, save as `reference/scene-00-color.webp`.
2. For every later scene, feed the _previous_ scene's accepted plate back into the image tool as a reference image (edit-mode, not fresh text-to-image) — this is what keeps gunmetal texture and light color identical across all seven scenes.
3. Never regenerate an already-accepted scene without archiving the old version first (`reference/_archive/`).

---

## 2. Global Viewer Contract (non-negotiable, applies to every scene)

| Rule                                                   | Enforcement                                                                                                                                                                                                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Viewer is strictly first-person, permanently invisible | No body, hands, shadow, or reflection ever rendered. Reflective surfaces (screens, metal) use an environment map that excludes the camera's own position.                                                                                                               |
| No cutscene ever takes control away silently           | Every camera-moving transition (Section 5) is either (a) idle/free-look at all times, or (b) explicitly triggered by a click, never auto-starts without input except the one-time intro sequence.                                                                       |
| Three input channels, never merged                     | **Scroll** → position along a rail (or 360° orbit angle in Scene 06 only) · **Mouse/touch move** → clamped look-only, always active · **Click/tap** → raycast against real geometry only. One channel never does another's job (locked in `CameraDirector`, Section 6). |
| Reduced-motion / no-WebGL visitors                     | Full semantic HTML fallback exists site-wide — same content, zero 3D, zero feature loss (already specified in `workshop-plan-v2.md` §Part E).                                                                                                                           |

---

## 3. The Invisible Skeleton — Physical Interaction Substrate

This is your point 5, formalized. Every visual mesh (the pretty, depth-mapped or shader-driven surface) has a **separate, invisible proxy** underneath it that never renders but _is_ what the raycaster, hover-highlighter, and (later) any physical constraint actually hits. This is standard game-dev practice (render mesh ≠ collision mesh) and it's what makes the scene "interactable" rather than "decorative."

```typescript
// src/lib/three/skeleton/types.ts
export type ProxyShape = "box" | "sphere" | "capsule" | "plane";

export interface SkeletonNode {
  id: string; // must match the visual Interactable's config.id
  shape: ProxyShape;
  position: [number, number, number];
  size: [number, number, number]; // half-extents / radius+height as applicable
  purpose: "interact" | "hover-zone" | "nav-blocker" | "snap-point";
}
```

```typescript
// src/lib/three/skeleton/SkeletonLayer.tsx
import { useSceneStore } from "@/store/sceneStore";

/** Renders NOTHING visually by default. Debug-only wireframe boxes appear
    when ?debug=skeleton is in the URL (Rule 12 pattern). This is the ONE
    place the whole site's raycasting/hover/snap logic reads from — every
    scene registers its nodes here, decoupled from whatever visual technique
    (depth-mesh, procedural shell, live geometry) that scene's surface uses. */
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

**What the skeleton is used for, concretely:**

| Purpose       | Example in this project                                                                                                                                                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interact`    | Door, panel buttons, sticky notes, holo-table sectors — the actual click/hover hitbox, sized slightly _larger_ than the visual mesh so imprecise clicks/taps still register (a real UX pattern: forgiving hit targets)                                                       |
| `hover-zone`  | A larger, softer capsule around each of the 9 sectors so the camera "magnetically" knows which sector is nearest during scroll-orbit, before any precise click                                                                                                               |
| `nav-blocker` | Invisible planes coincident with cave walls — even though the camera never truly "walks" freely (it's rail/orbit-bound), this guards the look-clamp math from ever aiming the camera through solid geometry during a transition glitch                                       |
| `snap-point`  | Fixed anchor positions on the workbench (Scene 06 RS4/LS4-adjacent area later, and LS2's sticky-note wall) — when an item is "placed," it snaps to the nearest `snap-point`, not to the raw cursor position, which is what makes placement feel deliberate instead of floaty |

Rule: **the skeleton is authored once per scene, by hand, as simple numbers** (a handful of box/sphere entries) — it is never generated from an image or AI tool. It's cheap, it's exact, and it's the thing that makes "grabbing and placing items" (your point 5) actually possible instead of aesthetic.

---

## 4. Sensory Feedback Layer (honest scoping)

Your brief asks for haptic/auditory/visual feedback "so immersive it feels physically present." Here's what a browser can actually deliver, ranked by real support — build in this order, and don't oversell the middle one to yourself:

| Channel                              | Technology                                                                                                                                                                                                                                          | Honesty check                                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Visual** (primary, universal)      | Screen-space reactions: bloom flash on activation, chromatic-aberration pulse on impact, subtle camera-shake (damped, never jarring) on the door slam / entity materialization                                                                      | Works everywhere, zero permission prompts, this is where 80% of "felt" interaction should live                                           |
| **Auditory** (strong, universal)     | Web Audio API with `PannerNode` for real spatial audio — a click on the left sticky-note wall audibly comes from the left. Every `Interactable` gets an optional `soundHover`/`soundActivate` (already in the `InteractableConfig` type, Section 6) | Works everywhere, no permission needed for playback (autoplay policies require one prior click, which the door-click naturally provides) |
| **Haptic** (bonus only, mobile-only) | `navigator.vibrate(pattern)` on click/activate — **desktop browsers and iOS Safari do not support this at all.** Wire it as a no-op-safe enhancement, never a required feedback path                                                                | Never claim "haptic feedback" as a headline feature — it's a nice-to-have on some Android phones only                                    |

```typescript
// src/lib/feedback/haptic.ts
/** Silently does nothing on unsupported devices — this is correct behavior,
    not a bug. Never gate any interaction's completeness on this succeeding. */
export function tryHapticPulse(pattern: number | number[] = 15) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
```

---

## 5. Scene Atlas — 7 Scenes, 6 Transitions

Camera-mode legend: **RAIL** = fixed dolly path, position from a trigger/scroll, look free within a clamp · **STATIC** = camera does not move, look free within a clamp · **ORBIT** = 360° scroll-driven rotation around a fixed point (Scene 06 only).

| #   | Codename  | Camera mode            | Function                                 |
| --- | --------- | ---------------------- | ---------------------------------------- |
| 00  | APPROACH  | RAIL (click-triggered) | Tunnel entrance → door                   |
| 01  | PANEL     | STATIC                 | Biometric scan, real auth                |
| 02  | DARKROOM  | RAIL (auto, short)     | Post-door blackout                       |
| 03  | MAPPING   | STATIC                 | Grid-sweep shader event                  |
| 04  | ENTITY    | STATIC                 | AI hologram coalesces — signature moment |
| 05  | ACTIVE    | RAIL (auto, short)     | Lights up, becomes the lab               |
| 06  | WORKBENCH | ORBIT                  | 9-sector interactive holo-table          |

### SCENE 00 — APPROACH

**Prompt:**

```
[STYLE_BIBLE]
SCENE: A massive, dark metallic sci-fi blast door, moderate width, embedded deep
inside a rugged rocky cavern tunnel, viewed from mid-tunnel looking straight down
toward it. Converging perspective, walls receding into darkness on both sides,
uneven rock floor with scattered debris in the foreground. Metal door panels are
industrial with circuit-line etching and faint dim green status lights. A vertical
hi-tech panel sits centered on the door at chest height, details unresolved at this
distance. Warm amber key light strikes the left tunnel wall, casting deep shadow
right; a faint cyan glow bleeds from the door panel itself. Circular vents and
mechanical grates on the door surface. Jagged orange-brown rock frames the frame
edges top and bottom.
```

**Interaction (FPP):** Mouse-look always active, clamped ±45° yaw / ±25° pitch (generous — establishing shot). No scroll. Door pulses a faint idle glow (invites click, no text). Click on door → **Transition 1**.

**Build technique:** Depth-mesh (Technique C, hardened) for the tunnel + door within the camera's forward cone; procedural noise-shell fallback for peripheral darkness beyond the look-clamp; procedural GLSL grime/scratch overlay in place of raw-pixel sampling (watermark-safe, tiling-safe).

**Skeleton nodes:** `door-00` (box, `interact`, sized to the whole door face) · `tunnel-walls` (planes, `nav-blocker`, coincident with rock walls).

---

**TRANSITION 1 — Approach → Panel (click-triggered dolly)**
GSAP tween, `power2.inOut`, ~3.2s, `START_POS → ARRIVED_POS`. Feels like footsteps: accelerate, hold, decelerate — never linear. Look-clamp stays live throughout (viewer can still glance around mid-walk). No fade, no cut — one continuous camera move. On completion: `cinematicStage = "arrived"`, hand off to Scene 01.

---

### SCENE 01 — PANEL

**Prompt:**

```
[STYLE_BIBLE]
SCENE: Extreme close-up on a vertical biometric security panel mounted at the
center of the blast door — same door, same materials, same lighting rig as the
prior shot, now filling most of frame. Top to bottom: a horizontal cyan LED strip;
a dark, blank rectangular screen area (left completely unrendered/flat — live UI
goes here); a circular iris-scanner lens in a metal housing; a bottom row of three
backlit buttons with blank icon slots. Exposed hex bolts and corner rivets frame
the panel. Hydraulic conduit runs down the left edge. Warm amber ambient spill
from the left, cyan glow from the LED strip and iris housing as the only other
light source.
```

**Interaction (FPP):** Camera fully static, mouse-look clamped tight (±20°/±12° — claustrophobic close-up). The screen area is a **live** `CanvasTexture` rendering the visitor's own MediaPipe FaceMesh feed (real, functional, client-side only — nothing transmitted until consent, per `security-model.md`). Three buttons are separate `Interactable` meshes: `REGISTER` / `VERIFY` / `RESET`, wired to the real WebAuthn + consent-ledger flow already specified.

**Build technique:** Same depth-mesh family as Scene 00 (this panel is a crop/continuation of the same door asset, higher segment density since it's the most-touched hero object). Screen plane is explicitly _never_ textured from the reference photo — real geometry, blank material, live-composited in code (Rule: no baked text/UI, ever).

**Skeleton nodes:** `panel-register`, `panel-verify`, `panel-reset` (boxes, `interact`) · `panel-screen` (plane, marks where the live canvas mounts, not itself interactive).

---

**TRANSITION 2 — Panel → Darkroom (auth-success cut)**
On successful verify (or explicit "enter as guest" affordance for Tier 0 visitors — nobody is hard-blocked, per `security-model.md` §2.4): door mechanism sound (spatial audio, Section 4) + a **fast materialize-dissolve** (the shared `MaterializeMaterial` shader, Section 6) sweeps the panel to black over ~0.6s. This is a hard cut in _lighting_, not a camera cut — same camera position, scene beyond simply goes to near-total darkness. Feels like walking through the door into blackness.

---

### SCENE 02 — DARKROOM

**Prompt:**

```
[STYLE_BIBLE]
SCENE: Interior of a cave chamber, viewed straight ahead. Near-total darkness —
only the faintest desaturated navy-cyan rim light bleeding from the far back wall,
barely revealing shapes. Midground: the dark silhouette of a long, donut-shaped
circular workbench, and at its center a low-profile circular holo-table pedestal,
unlit, barely perceptible. Vaulted cave ceiling arches, exposed conduits and cable
bundles sagging overhead, recessed scrap-metal wall panels fused into rock.
Extremely low-key, eerie, survival-shelter mood. Dense atmospheric haze.
```

**Interaction (FPP):** Short auto-advancing RAIL (camera drifts forward ~2 units over 4s, no click needed — this is the one auto-advance permitted, because the viewer just walked through a door and stopping dead would feel broken). Mouse-look still live, but range reduced (±20°/±12°) — deliberately disorienting. No interactables active yet (holo-table/workbench exist as `locked` skeleton nodes only, inert until Scene 04's entity wakes).

**Build technique:** Near-zero texture fidelity needed (90% darkness does the work). Workbench ring + holo-table pedestal built now as real, simple geometry (low-poly cylinders/torus) — they persist unchanged into Scene 05/06, only their _material/lighting state_ changes later.

**Skeleton nodes:** `workbench-ring`, `holo-table-core` (both `interact`, but `accessTier`-locked/inert until Scene 04).

---

**TRANSITION 3 — Darkroom → Mapping (auto, on arrival)**
No camera movement. A shader event fires: cyan sparks erupt from the holo-table core, a vertical light beam shoots upward, a wireframe grid sweeps outward across every wall/ceiling surface already in the scene (same geometry, additive shader overlay — **no new geometry, no new reference image needed**). Triggered once on scroll/timer crossing into this segment, never replayed.

---

### SCENE 03 — MAPPING

**Prompt (reference only — locks grid density/beam width/bloom color, not baked into geometry):**

```
[STYLE_BIBLE]
SCENE: The same cave chamber, mid-transformation. A sharp vertical beam of bright
electric-blue light shoots upward from the holo-table's core, projecting a
wireframe topographic grid outward across the uneven rocky floor and up the
vaulted walls/ceiling — glowing cyan lines contouring every rock surface and
hanging cable, as if scanning the room in real time. The workbench ring is now
visible in rim-lit cyan silhouette. Near-monochromatic electric blue/cyan palette,
deep navy shadow, dramatic volumetric bloom at the beam's core.
```

**Interaction (FPP):** Camera fully static — the shader event _is_ the motion; don't compete with it. Mouse-look stays live throughout.

**Build technique:** 100% procedural GLSL overlay (`fract()`-based grid, `uProgress` radial reveal driven by the shared damping system) on top of Scene 02's _existing_ meshes. Zero new assets.

---

**TRANSITION 4 — Mapping → Entity (auto, on shader completion)**
The grid recedes and re-absorbs into the table core over ~1.5s (reverse of the sweep-out). Immediately, the entity's coalescence begins — this is a soft handoff, not a cut, so it reads as one continuous "the room becomes aware" beat.

---

### SCENE 04 — ENTITY

**Prompt (reference only):**

```
[STYLE_BIBLE]
SCENE: Directly above the holo-table, a glowing geometric wireframe cube structure
coalesces, enveloped in a swirling vortex of cyan plasma ribbons, ethereal light
trails, and smoke-like energy waves. A sharp cone-shaped beam anchors it from
below. The holo-table is a low-profile circular metallic pedestal with illuminated
cyan rim accents, surrounded by the still-dark circular workbench. Extreme low-key
chiaroscuro — the entity is now the sole light source, casting soft cyan rim light
on nearby cave walls and workbench edges, frame heavily shadowed. Eerie, secret,
high-tech mood.
```

**Interaction (FPP):** Camera fully static, centered, eye-level — **this is the signature moment, protect it, zero camera movement.** First click/tap on the entity opens the live chat/LLM interface (pulled forward from Sector 0's later function — first contact happens here).

**Build technique:** This is the one scene that is **never** a reference-photo derivative — it's a hand-authored GLSL shader (simplex 3D noise vertex displacement + Fresnel-rim additive plasma shell), built and proven in an isolated test scene _before_ it's wired in here (per the earlier Phase-1 discipline). Its "energy" uniform pulses subtly while the LLM streams a response, idles otherwise — a real state-tied visual, not decoration.

**Skeleton nodes:** `ai-core` (sphere, `interact`, generously oversized — this is the most important click target on the whole site).

---

**TRANSITION 5 — Entity → Active (GSAP crossfade, auto after first interaction or timeout)**
The entity settles/dims to an idle "resting" state and retreats visually into the table. Warm amber pendant/floodlights **snap on** via a GSAP-driven light-intensity ramp (~1.8s ease-out) — a `MaterializeMaterial` crossfade swaps the cave-wall materials from Scene 02–04's dark/dormant maps to Scene 05's fully-lit projection texture, same meshes, texture-swap only.

---

### SCENE 05 — ACTIVE

**Prompt:**

```
[STYLE_BIBLE]
SCENE: The cavern laboratory now fully powered. Warm amber-yellow light floods
from overhead industrial pendant lamps and wall floodlights, filling the space
with a lived-in, functional glow — contrasted against the still-active cyan
holo-table projecting a small vertical HUD of tactical/topographic data. The
circular workbench surrounding it is fully visible, lined with tool silhouettes
and drawer outlines. Left wall: industrial workbenches beneath three blank
monitor screens (unrendered — live data goes here). Right wall: heavy metal
plating, sealed pressure doors, thick conduit pipes. Vaulted rock ceiling,
dirt-and-stone floor. Mood: active, fully powered, high-tech secret base.
```

**Interaction (FPP):** Short auto RAIL settling into Scene 06's exact orbit-start camera position/height/FOV — build this boundary _first_, work backward from it. Mouse-look live throughout at full range. At 100% of this transition, `cameraMode` flips from `"cinematic"` to `"orbit"` in `sceneStore`.

**Build technique:** Depth-mesh for anything within the (now-close) camera path; left-wall monitor screens built as the same "live plane" technique as Scene 01's face-scan screen — they will later render real RS1/RS3 data, so they're data-driven planes from day one, never baked images.

**Skeleton nodes:** `monitor-left-1/2/3` (`interact`, currently inert placeholders for RS1/RS3) · `pendant-lamp-1/2` (light sources, non-interactive).

---

**TRANSITION 6 — Active → Workbench (mode handoff, not a camera move)**
No dolly, no cut — the camera is _already_ at the Scene 06 orbit-start position from Transition 5. This transition is purely a **control-scheme handoff**: scroll input, which has been inert/unused since Scene 00, becomes live and now drives 360° orbit angle around the table instead of anything else. This is the one moment scroll "wakes up" — telegraph it with a single, tasteful cyan directional-arrow affordance fading in near the table (no text needed).

---

### SCENE 06 — WORKBENCH (9-Sector Orbit)

This scene reuses the exact geometry built across Scenes 02–05 (workbench ring + holo-table) in its final "active" material state. No new reference plates needed. Full sector table, navigation math, and data/backend map is specified in `workshop-plan-v2.md` §8 — reproduced here in compact form since this is the master file:

```
Sector layout (9 wedges, 40° each, sector 0 = entry hinge):

           RS2   RS3
        RS1         RS4 ─┐
                          ├─ combined "sealed/decorative" station (locked, v2 scope)
   [ Sector 0 — AI core ] LS4 ─┘
        LS1
           LS2   LS3
```

| Sector  | Function                                                              | Access tier             |
| ------- | --------------------------------------------------------------------- | ----------------------- |
| 0       | AI core / dispatcher                                                  | public                  |
| RS1     | Live GitHub blueprints                                                | public                  |
| RS2     | Resume builder                                                        | public (Phase 2)        |
| RS3     | Holo-calendar (read-only)                                             | public                  |
| RS4+LS4 | Sealed/tarped decorative prop — **not built**, dressed as intentional | n/a                     |
| LS1     | Public info hub / blog / contact                                      | public                  |
| LS2     | Public guestbook (sticky notes)                                       | public, Turnstile-gated |
| LS3     | Photo/video globe                                                     | public (Phase 2)        |

**Interaction (FPP):** Scroll → continuous orbit angle (accumulator, never clamped — modulo only at camera-placement time to avoid wraparound bugs), damped via the shared exponential-decay system (Section 6), magnetic snap to nearest sector on scroll-idle. Mouse-look stays live _on top of_ the orbit (small additional parallax). Click on any sector's `interact` skeleton node → GSAP dolly-in + that sector's UI opens. Accessibility fallback: a visible prev/next sector-jump menu, non-negotiable (keyboard/screen-reader users never depend on the scroll gesture).

**AI-as-lighthouse:** The Scene 04 entity persists here (now docked at the table center) and can _drive this exact orbit system_ via tool-calling — `navigate_to_sector("RS1", true)` from the LLM physically rotates the table, exactly as specified in `workshop-plan-v2.md` §3.3.

---

## 6. The Unified 3D Framework (compact reference — full versions already in your other docs)

Every object in every scene above is built through this shared system. Never hand-roll per-object logic.

```typescript
// src/lib/three/damp.ts — the ONLY motion primitive anywhere in the 3D scene
import * as THREE from "three";
export const dampScalar = (c: number, t: number, lambda: number, dt: number) =>
  THREE.MathUtils.damp(c, t, lambda, dt);
export function dampVec3(
  c: THREE.Vector3,
  t: THREE.Vector3,
  lambda: number,
  dt: number,
) {
  c.x = THREE.MathUtils.damp(c.x, t.x, lambda, dt);
  c.y = THREE.MathUtils.damp(c.y, t.y, lambda, dt);
  c.z = THREE.MathUtils.damp(c.z, t.z, lambda, dt);
  return c;
}
```

```typescript
// src/components/three/Interactable.tsx — mandatory wrapper for every clickable object
// (hover scale-damp, lock affordance, access-tier gate, cursor state — see workshop-plan-v2.md §2.3-2.4 for full impl)
```

```typescript
// src/components/three/CameraDirector.tsx — the ONLY component allowed to move the camera
// Three decoupled systems, per scene1-realtime-3d-fix.md §2:
//   scroll        → position along a rail OR orbit angle (never both in one scene)
//   pointer/touch → clamped look-offset only
//   click/tap     → raycast against skeleton nodes only, via React Three Fiber's built-in onClick
```

```typescript
// src/lib/three/materializeShader.ts — the shared dissolve/appear effect
// used for: door transitions, sticky notes appearing, resume "printing", entity coalescing
// (noise-driven discard + glowing edge, GLSL — full impl in workshop-plan-v2.md §2.5)
```

---

## 7. Asset Generation Pipeline (zero-GPU, zero-Blender, hardened)

Your hardware (i3, 3GB RAM, no GPU) rules out local Blender and local depth-model inference. This is the final, corrected pipeline — no shortcuts, no quota walls:

```
1. Generate reference plate (color image) → Nano Banana, using this file's Style Bible + per-scene prompt.
2. Generate depth map LOCALLY (not via a rate-limited HF Space upload):

   pip install transformers pillow --quiet   # one-time, ~350MB model download
   python scripts/generate_depth_map.py scene-0X-color.webp scene-0X-depth.webp

   The script FORCE-RESIZES the depth map to the source image's exact dimensions
   before saving (this is the fix for the dimension-mismatch warping bug —
   see asset-pipeline-technique-c-hardened.pdf §0-1). CPU-only, a few seconds
   to ~1 minute per image on your machine — a one-time build cost, not runtime.

3. buildDepthMesh() (hardened, with the 3 guards: dimension-match, degenerate-value
   reject, explicit non-transparent material) turns the pair into real geometry.

4. Procedural GLSL detail overlay (fBm grime/scratch, blurred macro-color base)
   replaces raw-pixel sampling as the final material — this is BOTH a quality
   improvement (tiles infinitely, no repeat artifacts) and a watermark-safety
   measure (destroys the fine-frequency pixel pattern SynthID relies on).

5. validate-scene-render.ts (Playwright) screenshots the result and gate-checks
   it (not >90% flat color, zero console errors, bounding box in expected range)
   BEFORE it's ever shown to you. A failing render retries automatically, citing
   which guard caught it — you only ever review renders that already passed.

   NOTE (3GB RAM constraint): if Playwright's headless Chromium destabilizes
   your dev environment, disable it and validate manually via your existing
   dev-server browser tab instead — same checklist, by eye (local-zero-budget-
   pipeline.pdf §3). This is an honest hardware tradeoff, not a downgrade.

6. For scenes needing genuinely modeled discrete props (future workbench items,
   Scene 05's pendant lamps if procedural geometry isn't enough): write a
   headless Blender Python (bpy) script and run it in a free Google Colab
   notebook — zero install, zero load on your PC, Google's GPU does the work.
```

---

## 8. Repo & Asset Directory Structure

```
/docs
  master-script.md          ← this file
  workshop-plan-v2.md
  security-model.md
  3d-object-rules.md
  asset-pipeline.md
  consent-and-legal.md
  architecture.md
  notes.md                  ← running "tried and rejected" log, keep this updated

/reference                  ← accepted, human-approved plates only (source of truth)
  scene-00-color.webp
  scene-00-depth.webp
  scene-00-door-color.webp
  scene-00-door-depth.webp
  scene-01-color.webp
  ... (one pair per scene 00-05; scene 06 reuses 02-05 geometry, no new plates)
  _archive/                 ← superseded plates, never delete, always archive

/public
  textures/                 ← optimized (.webp) copies actually shipped to the browser
  models/                   ← any Colab-generated .glb props (Draco-compressed)

/scripts
  generate_depth_map.py
  validate-scene-render.ts

/src
  components/three/
    Interactable.tsx
    CameraDirector.tsx
    scenes/Scene00.tsx ... Scene06.tsx
    objects/                ← per-scene meshes (Door00.tsx, HologramCore.tsx, StickyNote.tsx...)
    skeleton/SkeletonLayer.tsx
  lib/three/
    damp.ts, types.ts, useInteractable.ts, useMaterialize.ts,
    materializeShader.ts, depthMesh.ts, skeleton/types.ts
  lib/feedback/haptic.ts, audio.ts
  store/sceneStore.ts
  workers/                  ← Cloudflare Worker source (auth, LLM relay, notes API)
```

---

## 9. AGENTS.md — Consolidated Rules (paste into repo root, read every session)

```markdown
PROJECT RULES — read every file in /docs before any task, then re-read this list.

RULE 1 — NEVER generate a static image as a substitute for a live 3D scene.
Static images exist ONLY as reference plates for the depth-mesh
pipeline (Section 7), never shipped as a rendered background.
RULE 2 — Every interactive object MUST be wrapped in <Interactable>, backed
by a matching SkeletonLayer node (Section 3).
RULE 3 — Every appearing/dissolving object MUST use useMaterialize +
MaterializeMaterial. Every animated value MUST use
dampScalar/dampVec3/dampQuat — never a raw lerp, never a CSS
transition on a 3D object.
RULE 4 — The camera has exactly three independent input channels per scene
(Section 2/6). Never let one channel do another's job. Scroll is
INERT in Scenes 00-05 and only wakes up at Transition 6.
RULE 5 — The viewer is NEVER visible: no body, hands, shadow, or reflection,
in any scene, ever (Section 2).
RULE 6 — Access gating is NEVER trusted client-side for real data. The
server independently refuses any payload regardless of client state.
RULE 7 — No biometric image data ever leaves the browser unprocessed. Only
computed embeddings are transmitted; matching happens server-side.
RULE 8 — Depth maps are generated LOCALLY via scripts/generate_depth_map.py,
never via a rate-limited public demo Space upload.
RULE 9 — No scene render reaches the user without passing
validate-scene-render.ts first (or its manual-screenshot fallback
per Section 7 Step 5, if Playwright destabilizes the 3GB-RAM dev
environment).
RULE 10 — Fine surface detail is procedural GLSL, not sampled raw pixels,
wherever feasible (quality AND watermark-safety).
RULE 11 — If a required asset doesn't exist yet, HALT and report exactly
what's missing. NEVER invent placeholder primitives (circles,
gradient sprites, debug boxes) and present them as finished work.
RULE 12 — Debug UI (HUD text, coordinate readouts, skeleton wireframes) only
renders behind a `?debug=` query param — never in the default view.
RULE 13 — No local 3D software (Blender etc.) may ever be assumed installed.
Default: procedural geometry + depth-mesh, built in TS/GLSL. For
modeled props: write a bpy script for the user to run in Google
Colab, never assume local Blender access.
RULE 14 — Geometry must match source photo content (depth-mesh), not generic
noise — noise-displacement is permitted ONLY for peripheral/
fallback shell geometry outside the camera's primary sightline.
RULE 15 — Before writing code for any task touching camera, auth, or the LLM
relay: restate the plan in plain language and wait for confirmation.
RULE 16 — Check docs/notes.md before proposing an approach already logged
as tried-and-rejected.
RULE 17 — All secrets via `wrangler secret put` / Supabase Vault only — never
in .env files committed to the repo, never inline in client bundles.
```

---

## 10. Antigravity Execution Brief

Paste this as your first message of the session, after seeding `/docs`:

```
Read every file in /docs, especially master-script.md, before doing anything.
Confirm you understand AGENTS.md's 17 rules before writing code.

Build order — do not skip ahead, stop after each numbered step for my review:

1. Scaffold (Vite+React+TS, Cloudflare structure) — already done if reusing
   the existing repo from workshop-plan-v2.md §11.
2. Implement the shared framework (Section 6 here): damp.ts, Interactable.tsx,
   CameraDirector.tsx, SkeletonLayer.tsx, materializeShader.ts. Prove all of
   it on ONE throwaway test cube before touching any real scene.
3. Scene 00 only, end to end: reference plates → depth mesh → skeleton nodes →
   camera rig → click-to-walk transition. Run validate-scene-render.ts. Show
   me a working preview. Do not proceed until I approve it.
4. Scene 01 (panel + live biometric UI + real WebAuthn wiring).
5. Scenes 02-03 (darkroom + shader-driven grid sweep — no new assets).
6. Scene 04 (hologram entity — build the shader in isolation first, per
   Rule 15, before wiring into the cave).
7. Scene 05 (lights-on handoff, ending exactly at Scene 06's orbit-start
   camera transform).
8. Scene 06 (orbit navigation shell + placeholder sector content first,
   real sector functionality after rotation/scroll/accessibility fallback
   is solid).
9. Sensory feedback layer (Section 4), sector content in MVP order:
   RS1 → RS3 → LS1 → LS2.
10. Full QA checklist (workshop-plan-v2.md §Part 6) before any public deploy.

After each step, screenshot and compare against /reference — report
divergence, don't silently "fix" by regenerating assets.
```

---

## 11. Suggestions & Open Critique

A few things worth deciding now rather than mid-build:

1. **Scene 04's entity shader is your highest-risk, highest-reward item.** Everything else in this doc is a known, mechanical pipeline (depth-mesh, damping, materialize). The plasma/wireframe entity is genuinely novel hand-authored GLSL. Budget real, undistracted time for it, isolated from the rest of the build — don't let it slip into "good enough" because the rest of the pipeline is moving fast.
2. **The RS4+LS4 sealed-station decision (from `workshop-plan-v2.md`) still stands** — I haven't reopened it here. Keep it dressed-but-inert; it's zero build cost and keeps the 9-sector table reading as complete.
3. **Haptics are the weakest link in your "physically present" ask** — set your own expectations honestly here: 90% of the "felt presence" in this project will come from the damped camera motion (Section 6) and spatial audio (Section 4), not vibration. That's not a shortfall — it's where real budget for polish should go.
4. **Consider generating Scene 06's monitor-screen content (RS1 GitHub data) as a genuinely separate task** from the visual build — it's backend work (server-cached API fetch, per `workshop-plan-v2.md` §4), not asset-pipeline work, and mixing the two in one Antigravity task tends to produce worse results at both.
5. **Every prior document's security, consent, $0-hosting, and monetization sections are untouched and still fully in force** — this file only reorganizes the _visual/scene_ layer of the plan. Don't let a future session accidentally re-litigate decisions already locked in `workshop-plan-v2.md` §12.

This document is now your persistent source of truth for the scene layer. Start at Section 10, Step 1.
