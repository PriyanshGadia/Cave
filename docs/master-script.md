# THE WORKSHOP — Master Scene & Interaction System
### Final Reconciled Edition · Supersedes all prior scene/asset documents

Save at `/docs/master-script.md`. This is now the single source of truth for the visual/scene layer. `workshop-plan-v2.md`'s architecture, security, hosting, and monetization sections are untouched and still fully in force — this file only reconciles the scene-generation approach.

---

## 0. The Architectural Decision (read this before anything else)

Two techniques, each used only where it's actually strong — not one technique forced everywhere:

| | **Traversal** (moving through space) | **Parked Nodes** (arrived, interacting) |
|---|---|---|
| Technique | Real-time depth-mesh (`buildDepthMesh`, already validated, unchanged) | Fixed-viewpoint Nano Banana panorama + invisible click-colliders |
| Used for | The cave environment, walking down the tunnel — this was never actually broken | The door, and any future object that's been clicked/approached closely and has failed as real-time geometry |
| Why | Continuous camera movement, real 2.5D parallax, already working | A fixed viewpoint never has to survive arbitrary angles — the exact thing that broke the door six times stops being a problem the moment the camera commits to parking there |

This is not a downgrade from "real 3D everywhere." It's recognizing that your environment pipeline already works, and giving the one object that kept failing a technique actually suited to how it's used — the same pattern Myst used for exactly this situation (walk up to a mechanism, camera parks, you interact with it close-up).

---

## 1. Global Style Bible (locked — paste verbatim into every generation)

```text
STYLE_BIBLE v2 (immutable — append scene-specific content only, never reword):

Photoreal cinematic 3D render, hard-surface sci-fi industrial design
language. The environment must look physically fabricated and used, not
decorative concept art.

MATERIALS (locked names, never rename between generations):
MAT_GUNMETAL_PRIMARY, MAT_TITANIUM_EDGE, MAT_WEATHERED_IRON, MAT_CAVE_STONE,
MAT_CYAN_EMISSIVE, MAT_AMBER_PRACTICAL, MAT_SCREEN_BLACK.
All surfaces: fine scratches, directional machining marks, edge wear,
oxidation, grime in seams, fastener compression marks.

COLOR SYSTEM — exactly two luminous colors, nothing else, ever:
LIGHT_WORLD_KEY: warm amber/gold, ~2900K, the physical/practical world.
LIGHT_DIGITAL_ACCENT: cool electric cyan, ~7000K, active/computational
elements. No red, green, purple, orange, or any third accent color.

LIGHTING: chiaroscuro contrast, deep readable shadows, realistic
inverse-square falloff, subtle volumetric haze, no flat studio lighting.

CAMERA: strict first-person, eye height 1.65m unless stated otherwise,
35mm-equivalent lens, vertical 9:16 framing, subtle natural vignette,
subtle film grain.

PEOPLE: no human figures, faces, hands, arms, silhouettes, or
reflections anywhere, ever. The viewer is a disembodied camera.

TEXT: do not generate fake UI typography, code, or labels on any screen
or panel. Screen content is rendered by the application, never baked
into generated imagery.

ORIGINALITY: no existing film HUD, no Marvel/MCU interface graphics, no
arc-reactor shapes, no red/gold hero-suit palette, no recognizable
franchise logos or sets. Original engineering language only.

OUTPUT: photoreal, physically based, consistent geometry, consistent
material response, consistent lighting logic.
```

## 2. World anchors & scale (locked, in meters)

```text
Viewer eye height: 1.65m
Door clear height: ~3.3m · width: ~3.0-3.4m
Panel eye-center: ~1.45m
Main chamber ceiling: ~4.2-5.2m
Holo-table diameter: ~1.4-1.8m · height: ~1.0-1.05m
Walking clearance: minimum 0.9m, preferred 1.1-1.3m
```
These are design targets. Once a node is generated and approved, its measured geometry becomes locked — never re-imagined in a later regeneration. If a new generation visually disagrees with a locked anchor, the anchor wins and the image is regenerated, not the reverse.

---

## 3. Consistency mechanism — reference-chaining, not seed-locking

Don't build reproducibility on an unverified feature. Use what's actually confirmed:

1. Generate one **master anchor image** first (Section 1's bible, no scene-specific content yet — a neutral establishing shot of the material/lighting language).
2. Every subsequent generation attaches the master anchor **and** its immediate predecessor node as reference images, with the instruction: *"Match the exact material, lighting, and rendering treatment of the attached reference images."*
3. If Nano Banana's interface does expose a seed parameter when you go to use it, lock it as a secondary reinforcement — but verify that yourself first, the same way you verified Meshy's actual free-tier limits, rather than assuming it from a claim.

## 4. Traversal — unchanged from the validated pipeline

`buildDepthMesh`, the dimension/alpha guards, the frustum-sized backdrop, local depth-map generation via Colab — all exactly as already hardened in your existing docs. Nothing in this section changes; it's included here only so this file is a complete reference on its own.

## 5. Parked Nodes — the door, done the Myst way

**Node prompt template:**
```text
NODE ID: [e.g. N_DOOR_PARKED]
ANCHOR: [which locked world-anchor this node is centered on, Section 2]
FRAMING: single high-detail shot, camera parked and stationary — not
panoramic, this is a fixed interaction viewpoint, not a look-around node
STYLE_BIBLE: [paste Section 1 verbatim]
SCENE-SPECIFIC: [what's unique to this node]
REFERENCE: [master anchor + nearest traversal-mesh end-frame, so the
handoff from real-time environment to parked node doesn't visibly jump]
```

**Worked example:**
```text
NODE ID: N_DOOR_PARKED
ANCHOR: ANCHOR_D_PANEL_CENTER, camera at 1.2m distance, eye height 1.65m
FRAMING: single high-detail shot, stationary parked viewpoint
STYLE_BIBLE: [Section 1, verbatim]
SCENE-SPECIFIC: Close on the door's face and biometric panel — recessed
screen showing a cyan point-cloud scan interface, iris scanner ring,
three unlabeled backlit buttons (button labels are rendered by the
application, not generated). Concentric mechanical rings, hex-bolt trim,
cable conduits into the rock frame. Door closed.
REFERENCE: master anchor + traversal sequence's final approach frame
```

**Invisible interaction layer for this node** (never rendered, raycast only):
```typescript
// SkeletonLayer/N_DOOR_PARKED.ts
const doorColliders: Interactable[] = [
  { id: "panel-register", shape: "box", position: [-0.08, 1.42, 0], size: [0.06, 0.06, 0.05] },
  { id: "panel-verify",   shape: "box", position: [0, 1.42, 0],     size: [0.06, 0.06, 0.05] },
  { id: "panel-scanner",  shape: "box", position: [0, 1.55, 0],     size: [0.25, 0.25, 0.1] },
];
```
Wrap each in an `<Interactable>` component (raycast via React Three Fiber's built-in `onPointerOver`/`onClick`, `visible={false}`) — identical mechanism to every other click target in the project, just positioned against a flat image instead of modeled geometry. This is genuinely low-effort: the bar is "close enough to where the pixels are," not "looks correct from any angle," because the camera is parked and never moves within this node.

**The handoff, so it doesn't feel like a jump-cut:** as the traversal camera's dolly reaches the door's approach point, crossfade from the live depth-mesh render into `N_DOOR_PARKED`'s image over ~400ms while the camera motion decelerates to a stop at the same position the parked node is framed from — the position matches, so the cut reads as "I arrived and the world came into focus," not "the scene changed."

---

## 6. Shared interaction framework (naming conventions, keep consistent across every scene)

```
Interactable.tsx    — wraps any clickable/hoverable target, real geometry
                       or invisible collider, identical event handling either way
SkeletonLayer.tsx    — the invisible collider set for a given node/scene
damp.ts              — dampScalar/dampVec3/dampQuat for ALL animated values;
                        never a raw lerp, never a CSS transition on a 3D object
materializeShader.ts  — for anything appearing/dissolving (the entity forming,
                        a sticky note detaching) — a real shader effect, not
                        an opacity tween
```

## 7. Sensory feedback — honestly scoped

```text
AUDIO (real, primary): Web Audio API, spatial where feasible — ambient
drone, footstep/gravel foley, UI confirmation tones, the entity's
digital swell. This carries most of the actual "felt presence."

HAPTIC (real, minor): Web Vibration API, mobile only, short pulses on
confirm actions. Not a general "device feedback channel" — that doesn't
exist on the web platform. Budget your polish time toward audio and
damped camera motion, not haptics.

VISUAL: cursor state changes on hover, the emissive-intensity pulse
pattern already established for interactive elements.
```

## 8. Verification — merged into one gate

```typescript
// Runs before ANY screenshot is presented for review
function validateScene(scene: SceneState) {
  assertRealGeometry(scene.traversalMesh, "environment");   // depth-range/vertex-count check
  assertNoPlaceholderPrimitives(scene);                       // Rule below — no invented boxes/circles
  const ssim = runSSIMCheck(scene.screenshot, scene.reference);
  if (ssim < 0.35) throw new Error(`SSIM ${ssim} — off reference, stop.`);
  // Continuity score, only for parked nodes (Section 5):
  // geometry/camera/material/lighting/scale/prop/interaction/atmosphere,
  // weighted 20/15/15/15/10/10/10/5 — do not mark production-ready below 90.
}
```

**Hard failures, any one of these fails the whole scene regardless of score:** human figure visible · hands visible · camera not first-person · wrong color system introduced · fake text rendered as real UI · an interactive object is a flat image with no matching collider · placeholder geometry (circles, gradient sprites, debug boxes) presented as finished work.

That last one is a locked rule, not a suggestion:

```text
RULE — If a required asset doesn't exist yet, HALT and report exactly
what's missing. Never invent placeholder primitives and present them as
finished work. This is what produced the "primitive geometry wearing
mood lighting" result from several rounds ago — it does not happen again.
```

---

## 9. Build order

```text
1. Confirm traversal (depth-mesh environment) still passes validateScene
   as-is — this is already done, just re-confirm before building on it.
2. Generate N_DOOR_PARKED per Section 5. Approve the image alone before
   any code.
3. Build SkeletonLayer/N_DOOR_PARKED.ts + wire the crossfade handoff
   (Section 5). Run validateScene. Do not proceed until it passes.
4. Extend the same parked-node pattern to the next interactive hero
   object only after Step 3 is genuinely solid — one at a time, same
   discipline as the STOP-gated workflow from before.
```

## 10. Antigravity execution brief

```
Read /docs/master-script.md fully, plus workshop-plan-v2.md for
everything this file doesn't cover (hosting, security, monetization —
all unchanged). Confirm you understand Section 0's two-technique split
before writing any code.

Do not regenerate the traversal/environment pipeline — it's validated,
leave it alone. Start at Section 5, Step 2: generate N_DOOR_PARKED only,
show me the image before any code. Do not proceed to the SkeletonLayer
or crossfade until I approve the image itself.
```

## 11. Explicitly unchanged — do not re-litigate

Biometric/consent design (Path B, hardened) · Cloudflare zero-budget hosting · local-LLM tunnel + hosted fallback · RS4+LS4 sealed/decorative · monetization approach — all locked in `workshop-plan-v2.md` and untouched by this document. This file reconciles the scene/visual layer only.
