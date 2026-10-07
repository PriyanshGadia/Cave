# About Cinematic — Antigravity Implementation Plan

Put this file, the `about-cinematic/` folder, and `VAULT-01_About_Page_Fresh_Agent_Handoff.md` in the repo's `/docs`. The handoff says what the page must show. This plan says how to build it without drifting.

---

## 0. What is already proven, and what is not

**Proven (run in headless Chromium, 13 checkpoints):**
- `about-cinematic.js` is one scene, one camera, and one paused GSAP master timeline. `setCinematicProgress(p)` is a pure function of `p`.
- On the stand-in fixture, every checkpoint from the handoff passes at **1280×720 and 390×844**. See `about-cinematic/evidence/*-contact-sheet.png`.
- Scrubbing forward and backward reproduces **byte-identical frames** (`determinism.mjs`).
- The harness proves that each focused component contributes pixels by hiding it and diffing the frame. A part that is present but invisible fails.

**Not proven, and no one can claim it until the steps below pass on your real scene:**
- Your six real GLB assemblies, door, bench, pad and materials. I could not see the repo (it is private or unindexed), so the fixture uses stand-in boxes labelled TEST ONLY.
- That your six GLBs share one assembled coordinate frame. **Step 0 verifies this. If they do not, STOP.**
- Frame rate on your hardware. The test GPU here is software (SwiftShader), so only visibility and determinism transfer.
- Whether it looks good. The harness proves visible, left-half, large, lit and deterministic. Taste is Step 6, your approval.

**Direction note:** the earlier brief said "no Iron Man armor". The handoff builds an armor-flight page. This plan follows the handoff. Tell me if the earlier brief still governs.

---

## 1. Rules

1. One scene, one camera, one master timeline. Do not add a second timeline, a second camera, or an `init*` function that builds objects later.
2. Every object exists after `createCinematic()` returns. Nothing is created inside a scroll or timeline callback.
3. The camera is never solved per frame. Camera poses are authored data (`SHOTS`) and are tweened.
4. Parts are placed by authored screen targets (`SCREEN`). Do not add auto-framing or "make it fit" logic.
5. **The pixel harness is the only acceptance test.** Never accept your own "should be visible" report. If `verify-about.mjs` exits 1, the work is not done.
6. Do not edit GLBs or scale parts individually. The one scale is `SUIT_HEIGHT = 3.0`, applied once to the whole assembly.
7. If an asset, name or path does not exist, **HALT and report exactly what is missing.** Do not invent placeholder geometry.
8. Do not touch the VAULT-01 3D experience, sector logic, auth or backend.
9. Do not ship `test/fixture.html`. It is a harness fixture only.
10. One step at a time. After each step, paste the harness output and the contact sheet. Do not start the next step until that evidence is posted.

---

## 2. Steps (each is gated)

### Step 0 — Inspect and report (read-only, no code)
Produce `docs/ABOUT_INVENTORY.md` containing:
- Every file that currently builds or animates the About scene, with line counts.
- The six GLB file paths. For each, log its Box3 min/max **in its own file coordinates**.
- **The shared-frame check:** compute the union Box3 of all six. If the union is not roughly suit-shaped (a tall humanoid, about 3× taller than wide), STOP and report. The contract needs the six to be pieces of one assembled suit in one frame.
- Names of the door slabs, bench, landing pad, iris blades, red button and any helmet optics meshes or materials.
- Where armor effects (boot thrusters and so on) are created today.
- A delete list: old orchestration that will be removed in Step 7.

**Gate:** inventory posted and reviewed by you. No code until then.

### Step 1 — Baseline the harness
```
npm i
npx serve  (or: node serve.mjs)
npm run verify          # desktop fixture
npm run verify:mobile   # phone fixture
npm run determinism
```
If Chromium is not found, set `CHROME=/path/to/chrome`. Align `three` to the repo's version.
**Gate:** all three print PASS. This confirms the environment, not your scene.

### Step 2 — Write the adapter (the only new scene-specific file)
`about-adapter.js` loads your GLBs and builds the `parts` and `world` objects. It calls `createCinematic` and exposes the harness hooks.
```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { createCinematic, PART_ORDER } from './about-cinematic.js';

const GLB = { BOOTS: '', LEGS: '', TORSO: '', ARMS: '', GAUNTLETS: '', HELMET: '' }; // fill from Step 0, never guess

export async function bootAbout({ canvas, scene, camera, renderer, world /* from Step 0 names */ }) {
  const loader = new GLTFLoader();
  const parts = {};
  await Promise.all(PART_ORDER.map(async (n) => {
    if (!GLB[n]) throw new Error('HALT: missing GLB path for ' + n);
    parts[n] = (await loader.loadAsync(GLB[n])).scene;   // UNMODIFIED
  }));
  const cine = createCinematic({ THREE, gsap, scene, camera, parts, world,
    onShowcase: (n) => document.dispatchEvent(new CustomEvent('about:showcase', { detail: n })),
    onFlight: (n, a) => window.__armorEffects?.setFlight?.(n, a),      // hook your existing effects here
    onVaultReady: (v) => document.dispatchEvent(new CustomEvent('about:vault', { detail: v })) });
  window.setCinematicProgress = (p) => { cine.setCinematicProgress(p); renderer.render(scene, camera); };
  window.__about = { projectBBox: (n) => cine.projectBBox(n, innerWidth, innerHeight),
                     setSubjectVisible: (n, v) => { cine.setSubjectVisible(n, v); renderer.render(scene, camera); } };
  window.__aboutReady = true;
  return cine;
}
```
Renderer needs `preserveDrawingBuffer: true` in test mode only (query param `?test=1`). Keep scrub and render pixel ratio ≤ 1.5.
**Gate:** `window.__aboutReady === true` on the real About page with zero console errors.

### Step 3 — Run the harness on the real scene and fix only constants
```
node verify-about.mjs http://localhost:<port>/about.html?test=1 out-real
W=390 H=844 node verify-about.mjs http://localhost:<port>/about.html?test=1 out-real-mobile
```
Expect failures. Fix them by editing authored data in `about-cinematic.js` only:

| Harness failure | Edit this constant |
|---|---|
| `BLACK VOID` at 0.10–0.22 | Door/workshop lights, `SHOTS.B_door` / `C_workshop`, `roomLights` intensities |
| Part `too small` in a showcase | `SCREEN.maxFracH` / `maxFracW` (do not touch the part's scale) |
| Part `not in LEFT half` | `SCREEN.startNDC` / `endNDC` |
| `NOT PROVEN IN PIXELS` (black-on-black) | `RIG` intensities, the real materials' `envMapIntensity`, a rim light |
| Parts off-screen at 0.83 or 0.90 | `SHOTS.J_allflight`, `SHOTS.K_landing`, hover offsets in the 0.80–0.90 block |
| Part behind camera | `SHOTS.D_bench` position, showcase `dShow` |
| Suit not visible at 0.97 | `SHOTS.K_landing`, landing targets |

**Gate:** desktop and phone both print `ACCEPTANCE PASSED`, and `determinism.mjs` prints DETERMINISTIC.

### Step 4 — Wire scroll, text and effects
```js
ScrollTrigger.create({ trigger: '#about', start: 'top top', end: '+=900%', pin: true, scrub: 0.6,
  onUpdate: (s) => window.setCinematicProgress(s.progress) });
```
- Right-half copy for each component listens to `about:showcase` and sits where the part is not (landscape: right; portrait: below).
- Hook boot/flight effects to `onFlight(n, 0..1)`.
- The ENTER button appears on `about:vault === true`.

**Gate:** re-run the harness. Wiring must not break the passes.

### Step 5 — Resize, reduced motion, fallback
- On orientation or breakpoint change, destroy and recreate the cinematic (the `SCREEN` profile is chosen at init).
- `prefers-reduced-motion`: jump between the six showcase poses without scrub motion.
- If WebGL is unavailable, show a static list of the six components with a link to the vault.

### Step 6 — Human visual gate (you)
Antigravity posts both contact sheets. You approve or write notes. This is the only subjective step. Do not loop forever: after two rounds of notes, list the remaining differences as constants to change.

### Step 7 — Delete the old orchestration
Remove everything listed in the Step 0 delete list. Grep to confirm no second timeline or camera remains. Re-run the full harness plus determinism.

---

## 3. Definition of done
1. `verify-about.mjs` passes at 1280×720 and 390×844 on the **real** page.
2. `determinism.mjs` passes on the real page.
3. Zero console errors in the harness report.
4. Contact sheets are checked into `/docs/evidence`.
5. You approved Step 6.
6. The old orchestration is deleted and the vault is untouched.

---

## 4. Paste-in prompt for Antigravity

```
Read /docs/ABOUT_IMPLEMENTATION_PLAN.md and /docs/VAULT-01_About_Page_Fresh_Agent_Handoff.md fully before doing anything.
Do Step 0 only. Produce /docs/ABOUT_INVENTORY.md and stop.
Do not write scene code, do not create objects, do not "fix" anything yet.
If the six GLBs do not share one assembled coordinate frame, or any asset is missing, HALT and report.
After each later step, post the harness output and contact sheet and wait for my go-ahead.
Acceptance is verify-about.mjs exiting 0, not your own judgement.
```

---

## 5. Open risks
- **Shared frame (Step 0)** is the biggest unknown. If the GLBs are not one assembly, the normalisation fails and the plan needs a per-part rest-pose table.
- **Performance** on an i3 with no GPU is unmeasured. Measure fps in Step 4; cap pixel ratio and shadow-casting lights, and consider a smaller render size on weak GPUs.
- **Real materials** may be dark. The rig lights help, but real PBR materials may need an environment map.
- **Door, bench and pad hooks** are optional in the contract. Anything missing simply does not animate. Step 0 decides which exist.
