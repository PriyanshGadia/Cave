# Zero-Budget, Zero-GPU Asset Pipeline
### For: i3 CPU, 3GB RAM, no GPU, $0 — genuinely open-source or genuinely-free-quota only, nothing else

---

## 0. What's changing and why

Two of my earlier recommendations don't survive contact with your actual hardware and need correcting now, not later:
- **Meshy** — you've confirmed the free tier doesn't cover real text-to-3D use. Dropped entirely.
- **Running Depth-Anything V2 locally via `transformers`+`torch`** — I recommended this to kill the Hugging Face quota problem, but I recommended it without knowing your RAM. `torch` alone is a heavy install, and CPU inference on an i3 with 3GB total RAM (shared with your OS, Antigravity, a browser, and the dev server) is a real risk of thrashing or failing outright, not just "slow." Also dropped — moved to free cloud compute below, where it should have been from the start.

New standard for anything I suggest from here: either genuinely open-source and runs on your machine within its real limits, or genuinely-free cloud compute (Colab, Kaggle) where the heavy lifting happens on Google's/Kaggle's hardware, not yours, and there's a real usage quota rather than a credit-purchase funnel.

---

## 1. The door asset — two real options, zero local compute either way

### Option A (recommended): Google Colab + TripoSR
TripoSR is genuinely open-source (Stability AI + Tripo AI, MIT-style license, no account/credits system of its own) and specifically built to be fast and Colab-friendly — public tutorials and ready-made notebooks exist for exactly this "single image → 3D mesh" workflow. This runs entirely on Colab's free GPU tier; your machine only needs a browser tab.

1. Generate the door's reference image with Nano Banana (already free via your Google account, cloud-side, no local cost) using the prompt already in `docs/asset-pipeline.md`.
2. Open a free Colab notebook (colab.research.google.com — no paid tier needed for this).
3. Set Runtime → Change runtime type → Hardware accelerator → GPU (the free T4 tier).
4. Clone TripoSR's official GitHub repo and follow its own README for the exact run command (`git clone https://github.com/VAST-AI-Research/TripoSR`, then its documented inference script) — I'd rather point you at their maintained instructions than hand you a command I can't verify still matches their current CLI.
5. Upload your reference image to the Colab session, run inference, download the resulting mesh.
6. Convert/clean up in Blender if needed (basic import + export, not heavy modeling — light enough to do locally even on your specs), export as `.glb`, place at `public/models/door-hero.glb`.

### Option B: Onshape (parametric CAD, zero local compute, different kind of "free")
Onshape's free plan is a genuinely different model from Meshy's — it's not credits that run out, it's unlimited use in exchange for your documents being public. All computation happens on their servers; your machine just renders a lightweight web UI, so it's realistic even on 3GB RAM. Worth it specifically because your door is mechanical/hard-surface (bolts, panel rings, seams) — exactly what parametric CAD is good at, arguably better suited to this than an AI mesh generator. Model it there, export STL, import into Blender once just to export as `.glb` with materials assigned. Verify their current free-tier terms yourself before committing time — I'm giving you the general shape of the offer, not a guarantee it hasn't changed.

---

## 2. Depth-map generation — moved to Colab, not your machine

Same fix, same reasoning. Run this in a Colab cell instead of a local terminal:
```python
# Colab cell — free GPU, zero install burden on your machine
!pip install transformers torch pillow -q
from transformers import pipeline
from PIL import Image

depth_estimator = pipeline(task="depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf")
image = Image.open("scene-00-color.webp").convert("RGB")  # upload this to the Colab session first
depth_map = depth_estimator(image)["depth"].resize(image.size)  # resize guard from before still applies
depth_map.save("scene-00-depth.webp")
```
Download the output, place it at the path your existing `buildDepthMesh` guards already expect. Everything else about the hardened pipeline (the dimension-match guard, the aspect-ratio fix) is unchanged — only *where* the depth map gets computed moves.

---

## 3. Local dev environment — respecting 3GB RAM honestly

Antigravity, a dev server, and a browser tab already compete hard for 3GB. Worth reconsidering one thing I gave you earlier in that light:

**Playwright's headless Chromium** (`validate-scene-render.ts`) is a real additional RAM cost — a second browser instance on top of the one you're already using to preview the site. If you're seeing slowdowns, swapping, or Antigravity itself getting sluggish during validation runs, the fix isn't a code bug, it's dropping automated screenshot validation in favor of manually screenshotting the browser tab you already have open previewing the dev server. Same information, no second browser process:
```
Instead of: npx tsx scripts/validate-scene-render.ts (spins up headless Chromium)
Do: open localhost:5173 in your existing browser tab, navigate to START_POS/
    ARRIVED_POS manually, screenshot with your OS's normal screenshot tool.
```
It's less automated — that's a real, honest tradeoff against your hardware, not a downgrade I'd suggest if you had headroom to spare. Close Antigravity's other panels/extensions and any unused browser tabs while developing; on 3GB, every background tab is real, felt cost.

---

## Antigravity instruction block

```
Two pipeline changes, no scene-logic changes:

STEP 1 — Remove any reference to Meshy from the codebase/docs. The door
asset now comes from either TripoSR-via-Colab or Onshape (manual, off-
repo steps — Antigravity has nothing to automate here, the asset just
needs to land at public/models/door-hero.glb same as before).

STEP 2 — Remove the local transformers/torch depth-generation script.
Depth maps are now generated in Colab and dropped into the existing
public/textures/ paths manually — the buildDepthMesh guards (dimension
match, aspect ratio) don't change at all, only the generation location
does.

STEP 3 — If local dev has been sluggish during validate-scene-render.ts
runs, comment out the Playwright-based validator and confirm manually
via the existing dev-server browser tab instead, per Section 3. Don't
silently keep running a validator that's destabilizing the dev
environment on this hardware.
```
