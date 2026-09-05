# PROJECT RULES — read before any task

1. index.html is the spec. Extend it. Never replace its approach or add a build step.
2. No .png/.jpg/.webp/.glb may be loaded. All surfaces come from makeSurface() / canvas. All geometry is BufferGeometry.
3. Every task = one object or one material, named from the reference photo. Never "make it more cinematic".
4. Before reporting done: run Playwright, screenshot at walk=0 and walk=1, confirm HUD shows fps ≥ 30 (DPR 1) and "raster image files loaded: 0". Attach both screenshots.
5. If a step needs something you cannot produce with code, HALT and report. Never substitute an image.
6. realism.js is the second spec file. Extend applyRealism(); never fold it back into index.html.
7. Any shader change must compile with zero WebGL warnings in the console (screenshot the console with the two Playwright captures).
8. Cinematic check: with Playwright at walk=1, run
   window.dispatchEvent(new CustomEvent('vault:granted'))
   and screenshot at +2.8 s, +5.0 s, +9.0 s, +12.5 s. Confirm: door offset visible at 5 s,
   lit vestibule floor at 9 s, frame luminance < 2 % at 12.5 s, console has zero warnings.
9. cave3.js and transition.js are spec files 3 and 4. Never merge them into index.html.
