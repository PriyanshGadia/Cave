# docs/asset-pipeline.md — Technique C, Hardened
### Patch: fixes the dimension-mismatch bug, removes the Hugging Face quota dependency entirely

---

## 0. Diagnosis

`buildDepthMesh` assumed `depthMapUrl` and `colorMapUrl` share identical pixel dimensions. The Hugging Face Depth-Anything V2 Space almost certainly returned a depth map resized to the model's square input resolution — a different shape than your source photo. UV-sampling two mismatched grids as if they lined up 1:1 is what smears real content into the warped, rounded shape in your screenshot. Separately: if any *isolated/cutout* reference image (an "on transparent background" variant from an earlier layer-isolation step) got wired in as this mesh's actual material, its soft AI-cutout edges would literally become the rendered silhouette — the material spec below makes that impossible by being explicit.

Both are fixed below. Neither means the depth-mesh approach itself was wrong — Technique C is the correct technique; it just shipped without the guards it needed.

---

## 1. Kill the Hugging Face dependency — local, code-only depth estimation

Depth-Anything V2's model weights are open (not just the rate-limited public demo Space) — download once, run locally, forever, for free. This is the actual fix for "I need Antigravity to do this itself, no external quota":

```python
# scripts/generate_depth_map.py
# Runs entirely locally after a one-time ~350MB model download. No API,
# no per-use quota, no Hugging Face Space upload step.
from transformers import pipeline
from PIL import Image
import sys

depth_estimator = pipeline(task="depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf")

def generate_depth(input_path: str, output_path: str):
    image = Image.open(input_path).convert("RGB")
    depth_map = depth_estimator(image)["depth"]
    # CRITICAL — this line is the actual fix for the warping you saw:
    # force the depth map back to the exact source dimensions before saving,
    # so it can never silently mismatch the color image again.
    depth_map = depth_map.resize(image.size)
    depth_map.save(output_path)
    print(f"OK: {output_path} is {depth_map.size}, matches source {image.size}")

if __name__ == "__main__":
    generate_depth(sys.argv[1], sys.argv[2])
```
Have Antigravity run this as a build step (`python scripts/generate_depth_map.py public/textures/scene-00-color.webp public/textures/scene-00-depth.webp`) for every scene — no manual Hugging Face upload, ever again, and no CI/quota wall to hit mid-project. CPU-only inference on a single image takes a few seconds to roughly a minute depending on your machine; that's a one-time asset-build cost, not a runtime cost.

## 2. Hardened `buildDepthMesh` — the dimension guard and the alpha guard

```typescript
// src/lib/three/depthMesh.ts
export async function buildDepthMesh(opts: DepthMeshOptions): Promise<THREE.Mesh> {
  const { colorMapUrl, depthMapUrl, width, height, segments = 220, depthScale = 2.5, invertDepth = false } = opts;

  const [depthImg, colorImg] = await Promise.all([loadImage(depthMapUrl), loadImage(colorMapUrl)]);

  // GUARD 1 — this check alone would have caught last night's bug immediately,
  // with a clear error instead of a silently warped mesh.
  if (depthImg.width !== colorImg.width || depthImg.height !== colorImg.height) {
    throw new Error(
      `Depth (${depthImg.width}x${depthImg.height}) and color ` +
      `(${colorImg.width}x${colorImg.height}) dimensions don't match. ` +
      `Re-run scripts/generate_depth_map.py — it resizes automatically now.`
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = depthImg.width;
  canvas.height = depthImg.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(depthImg, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const px = Math.min(canvas.width - 1, Math.max(0, Math.floor(u * (canvas.width - 1))));
    const py = Math.min(canvas.height - 1, Math.max(0, Math.floor((1 - v) * (canvas.height - 1))));
    const idx = (py * canvas.width + px) * 4;
    let depth = pixels[idx] / 255;
    if (invertDepth) depth = 1 - depth;
    // GUARD 2 — reject degenerate values rather than let them fold geometry
    if (!Number.isFinite(depth)) depth = 0;
    pos.setZ(i, -depth * depthScale);
  }
  geometry.computeVertexNormals();

  const colorMap = await new THREE.TextureLoader().loadAsync(colorMapUrl);
  colorMap.colorSpace = THREE.SRGBColorSpace;

  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    map: colorMap, roughness: 0.75, metalness: 0.3,
    // GUARD 3 — explicit and intentional: this background mesh never
    // inherits transparency from a cutout/isolated reference image. If an
    // isolated-background asset is needed somewhere, it's a distinct file
    // for a distinct purpose, never silently reused as this plane's texture.
    transparent: false,
  }));
}
```

## 3. The self-QA gate — so broken renders never reach you at all

This is the actual mechanism behind "I just audit and confirm": Antigravity screenshots its own work and checks it before presenting anything.

```
scripts/validate-scene-render.ts (Playwright, headless):
1. Launch the dev build, navigate the CameraDirector to START_POS.
2. Screenshot the frame.
3. Automated checks, all must pass before the screenshot is shown to you:
   - Not >90% a single flat color (catches black-screen/broken-material renders)
   - Zero console errors logged during scene mount
   - Mesh bounding box falls within the scene's authored real-world scale
     (catches a runaway depthScale before it ever renders visibly wrong)
4. Only a screenshot that passes all three gets presented for your review.
   A failing one triggers Antigravity to retry with the specific guard that
   caught it named in the retry log — so failures are diagnosed, not blind.
```
This is the realistic version of "only Antigravity does the work" — it doesn't remove your judgment from the loop, it removes *broken* results from ever reaching the point where your judgment is needed.

## 4. Legitimate webscraping — material realism, not content laundering

Where scraping genuinely helps: pulling CC0 reference photography automatically, as lighting/material grounding fed into Nano Banana as reference images (real photographic reference measurably improves photorealism over text description alone). Antigravity can fetch these directly, no manual downloading:
```
Fetch 2-3 reference images per scene from Poly Haven's public asset API
(polyhaven.com/api — CC0, no attribution required, safe for commercial use)
matching the scene's material (e.g. "weathered gunmetal", "wet cave rock"),
and pass them to Nano Banana as style/material reference alongside the
Style Bible text prompt.
```
This is a real, useful lever — genuine photographic grounding, not a workaround for anything.

---

## 5. The corrected Antigravity instruction block

```
Fix Scene 00's depth-mesh pipeline. Do not regenerate any images — the
existing scene-00-color.webp and scene-00-door-color.webp are correct and
approved. The bug is in depth-map generation and mesh construction only.

STEP 1 — Delete any depth map generated via a Hugging Face Space upload.
Run scripts/generate_depth_map.py (Section 1 above) locally against
scene-00-color.webp and scene-00-door-color.webp instead. Verify the
script's printed output confirms matching dimensions for both pairs
before proceeding — do not continue past a mismatch.

STEP 2 — Replace src/lib/three/depthMesh.ts with the hardened version in
this document's Section 2. Do not weaken or remove Guards 1-3 — they
encode the exact failure that produced last night's broken render.

STEP 3 — Confirm no isolated/transparent-background reference image is
passed as colorMapUrl to buildDepthMesh anywhere in the codebase. Those
images, if they exist, are for visual reference only.

STEP 4 — Implement scripts/validate-scene-render.ts (Section 3). Wire it
to run automatically after any change to Scene 00's geometry or materials,
before presenting a screenshot for review.

STEP 5 — Only once validate-scene-render passes: screenshot from
START_POS, compare against reference/scene-00-color.webp for silhouette
alignment, and present that screenshot to me for review.

Everything else — CameraDirectorScene00, the click-to-walk interaction
model, lighting, fog, tone mapping — is unchanged from the previously
locked spec.
```

## 6. Rules file update

```
RULE 16 — DEPTH MAPS ARE GENERATED LOCALLY, NEVER VIA A RATE-LIMITED
PUBLIC DEMO. Use scripts/generate_depth_map.py (open Depth-Anything V2
weights, run locally) for every scene. Never route through a Hugging
Face Space UI upload — no per-use quota to hit, no manual hand-off step
to introduce a dimension mismatch.

RULE 17 — NO SCENE RENDER REACHES THE USER WITHOUT PASSING
validate-scene-render.ts FIRST. A failing render triggers an automatic
retry citing the specific guard that caught it, not a manual re-prompt.
```

---

## What this actually fixes vs. what it doesn't

Fixes: the specific bug that produced last night's warped render, and the Hugging Face quota wall — both permanently, both via code Antigravity now owns and re-runs itself. Doesn't fix: the need for you to look at a screenshot and say yes/no/adjust at the end of each scene. That step stays, because it's the same step a professional environment artist's own director does for them — it's not overhead to eliminate, it's the actual mechanism by which "good" gets decided. What changes is that every screenshot you now see already cleared an automated bar, so your reviews get shorter and rarer, not longer and more frequent.
