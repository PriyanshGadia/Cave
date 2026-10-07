# VAULT-01 About Landing Page: Masterpiece Implementation Plan

## Objective

Rebuild `about.html`, `about.css`, and `about.js` as a cinematic, single-scroll portfolio installation using the existing VAULT-01 armor assets while keeping the actual Vault implementation untouched.

The target is not a conventional portfolio page. It is a controlled sequence of authored shots: void, identity, industrial emergence, workshop, armor activation, component study, formation flight, assembly, landing, observation, then a physical floor discovery that reveals the underground route into the Vault.

The uploaded implementation brief establishes the single-scene, single-camera, deterministic direction and the no-clue floor discovery. fileciteturn230file0

## Non-negotiable boundaries

- Do not modify `index.html`, `lab.js`, `realism.js`, `cave3.js`, or `transition.js`.
- Do not regenerate or alter the six armor GLBs.
- Do not alter `public/js/armor-effects.js`.
- The About experience owns only its HTML, CSS, cinematic runtime, and test harness.
- No HTML "ENTER THE VAULT" CTA.
- No instructional arrow, tooltip, modal, or explicit floor prompt.
- The floor itself is the interaction surface.
- The underground route is revealed through physical geometry and lighting.
- The final handoff navigates to the existing Vault route only after the user actually enters the revealed pit.

## Scene architecture

1. One WebGL renderer.
2. One Three.js scene.
3. One perspective camera.
4. One authored cinematic timeline.
5. One deterministic progress API:
   `window.setCinematicProgress(p)`.
6. Six armor groups loaded once.
7. Procedural environment geometry for the door, workshop, workbench, pad, floor, iris, pit, tunnel and atmospheric detail.
8. DOM is limited to identity typography, restrained technical copy, HUD, cinematic grading layers, and scroll space.

## Coordinate discipline

The previous implementation made the armor microscopic by using an incorrect root scale and by trying to repair framing dynamically. The final armor assets share a normalized coordinate frame, so the new runtime uses an explicit authored suit scale.

- Suit scale: 24.5.
- Showcase scale: 58.
- Workbench positions are authored.
- Formation positions are authored.
- Final landing positions are authored.
- Camera positions and look targets are authored.
- No Box3-driven camera fitting.
- No per-frame normalization.
- No random choreography.

## Visual language

### Palette

- Gunmetal black: structural mass.
- Dark graphite: substructure.
- Blood red: power, status, danger, discovery.
- Restrained cyan: instrumentation and optics.
- Steel grey: fasteners and exposed mechanisms.
- Black glass: vents, screens and recesses.

### Surface language

The environment uses procedural shader and canvas-driven surface systems:

- directional brushed metal
- carbon weave
- circuit traces
- emissive blood-red pulse
- cyan scanlines
- atmospheric fog
- floor hex pattern
- aperture edge shading
- travelling energy pulses

The visual rule is physical first. Plates, seams, bolts, pistons, service panels, vents, beams, cables and rings are real geometry rather than decorative overlays.

## Cinematic acts

### 00. Void

Pure black. The renderer is already alive, but the visitor has no visual information.

### 01. Identity

A large P and G appear far apart. They remain present while the complete name resolves between them. The identity layer is elegant, minimal and architectural.

### 02. Emergence

The black begins to reveal depth. Dust, distant red practicals and structural steel establish the underground environment.

### 03. Door reveal

Two enormous gunmetal slabs emerge from darkness. Each leaf contains hardware, rails, fasteners, service panels, vents and hydraulic detail.

### 04. Door opening

The leaves separate from the centre seam. The camera travels through the opening rather than cutting to another scene.

### 05. Workshop

The visitor discovers a large industrial room with exposed structure, practical red lighting, overhead members, floor grid, dust and a distant workbench.

### 06. Armor activation

Six existing armor assemblies wake in sequence. They lift from their workbench positions and become the centre of the visual story.

### 07. Component showcase

The sequence is:

1. Boots, mobility.
2. Legs, structure.
3. Torso, core.
4. Arms, control.
5. Gauntlets, output.
6. Helmet, perception.

Each component gets an authored focus position on the left side of the viewport while restrained technical copy occupies the right.

### 08. Formation flight

All six pieces leave the workshop and form a stable travelling configuration. Camera movement is authored rather than derived from bounding boxes.

### 09. Convergence

The six assemblies converge toward their final spatial relationships. The camera widens so the complete mechanical relationship remains readable.

### 10. Landing

The assembly descends toward a circular pad. Landing is staged as a physical sequence rather than a single transform.

### 11. Observation

The suit remains present. The scene quiets down. The visitor sees the pad, floor and surrounding structure.

The only clue is environmental: a restrained deep-red pulse beneath the floor.

There is no explanatory text.

### 12. Discovery

The user interacts with the physical floor.

The six-blade iris opens.

Deep red light rises from below.

The hollow pit becomes visible.

Tunnel rings and distant structural lights establish that the opening is not a dead end.

The camera leans into the opening and descends.

A final fade transfers into the existing Vault.

## Interactive floor contract

The floor is a real Three.js interaction target.

Hover:
- radial response in the floor shader
- subtle red response around the pointer
- cursor becomes slightly more precise

Activation:
- physical red button compresses
- pad illumination rises
- floor pulse strengthens
- iris blades begin opening
- pit becomes visible
- tunnel becomes active
- camera changes to a downward observation shot

Entry:
- the revealed pit itself becomes the continuation target
- a second interaction initiates the descent
- no text label is needed

## Deterministic testing

The test page uses:

`about.html?cinematicTest=1`

In test mode:

- native scrolling is disabled
- ScrollTrigger is not allowed to control progress
- `window.setCinematicProgress(p)` directly drives the master timeline
- identical progress values must result in identical authored transforms

Required checkpoints:

0, 5, 10, 16, 22, 30, 38, 43, 49, 55, 61, 67, 72, 78, 83, 88, 91, 94, 97, 98.5, 100 percent.

## Acceptance gates

### Geometry gate

At least one frame must clearly show:

- the door
- the workshop
- the workbench
- all six armor assemblies
- the complete suit
- the landing pad
- the aperture
- the underground pit

### Composition gate

During every component showcase:

- the featured component must be unmistakable
- the subject must occupy a large portion of the left visual field
- the copy must remain readable on the right
- the background must establish scale
- no component may become a microscopic speck

### Motion gate

- no random camera paths
- no random armor choreography
- no sudden teleports
- no automatic bounding-box framing
- no competing timelines
- no hidden second renderer
- no alternate scene used as a visual substitute

### Interaction gate

- no HTML repulsor button
- no explicit "Enter the Vault" instruction
- floor activation is physical
- aperture opening is physical
- pit is physically present
- Vault navigation occurs only after the revealed route is entered

### Runtime gate

- DPR 1 for acceptance
- no WebGL console errors
- no page errors
- no unintended raster-image requests
- armor loading must complete before the deterministic harness begins
- resize must preserve camera composition
- the render loop must avoid per-frame object creation

## Verification harness

`screenshot-cinematic.cjs` captures the full authored checkpoint sequence and records:

- browser console errors
- browser warnings
- About diagnostics
- scene validation
- armor table
- camera audit
- raster-image resource requests

The final implementation must be judged from pixels, not from console statements alone.

## Definition of done

The About page is complete when:

1. The identity sequence feels intentional.
2. The door has physical mass.
3. The workshop has believable depth and infrastructure.
4. The armor is consistently visible.
5. Every component gets a real cinematic study.
6. Formation flight reads as one coherent mechanical system.
7. Assembly and landing are readable.
8. The final room has breathing space.
9. The floor discovery feels earned without explanation.
10. The iris opens as real machinery.
11. The pit visibly leads downward.
12. The existing Vault is reached without modifying its implementation.
13. `about.js` is at least 5000 lines and contains real runtime systems rather than a single giant animation blob.
14. The screenshot harness passes without browser errors or unintended raster requests.

## Commit scope

The implementation branch changes only:

- `about.html`
- `about.css`
- `about.js`
- `screenshot-cinematic.cjs`
- `docs/ABOUT_MASTERPIECE_PLAN.md`

Vault source files remain frozen.
