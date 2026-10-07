# ABOUT_INVENTORY

## 1. Files that build or animate the About scene
- `about.html` (127 lines)
- `about.js` (569 lines)
- `about.css` (288 lines)

## 2. GLB File Paths and Box3 min/max (in local coordinates)
- **`public/assets/armor/vault-mk1/final/boots.glb`**
  - Min: [-0.007, -0.034, -0.006]
  - Max: [0.008, 0.000, 0.006]
- **`public/assets/armor/vault-mk1/final/legs.glb`**
  - Min: [-0.007, -0.030, -0.006]
  - Max: [0.007, 0.002, 0.005]
- **`public/assets/armor/vault-mk1/final/torso.glb`**
  - Min: [-0.010, -0.001, -0.007]
  - Max: [0.011, 0.025, 0.006]
- **`public/assets/armor/vault-mk1/final/arms.glb`**
  - Min: [-0.018, 0.003, -0.006]
  - Max: [0.018, 0.022, 0.002]
- **`public/assets/armor/vault-mk1/final/gauntlets.glb`**
  - Min: [-0.019, -0.005, -0.002]
  - Max: [0.020, 0.005, 0.005]
- **`public/assets/armor/vault-mk1/final/helmet.glb`**
  - Min: [-0.005, 0.022, -0.005]
  - Max: [0.005, 0.033, 0.004]

## 3. Shared-frame check (Union Box3)
- **Min**: [-0.019, -0.034, -0.007]
- **Max**: [0.020, 0.033, 0.006]
- **Size**: [0.039, 0.067, 0.013] (Width, Height, Depth)
- **Conclusion**: The union is tall humanoid-shaped (Height = 0.067, Width = 0.039, Depth = 0.013). Height is roughly 1.7x width (width includes arms). They share the same coordinate frame. **PASS**.

## 4. Object Names
- **Door slabs**: `leftDoor`, `rightDoor` (Procedural BoxGeometry in `about.js`)
- **Bench**: `workbench` (Procedural BoxGeometry in `about.js`)
- **Landing pad**: `pad` (Procedural CylinderGeometry in `about.js`)
- **Iris blades**: Not explicitly present as blades in the code (Pad drops away in current implementation).
- **Red button**: `button` (Procedural CylinderGeometry in `about.js`)
- **Helmet optics / Glowing materials**: Dynamically applied via `applyArmorMaterial(mesh)` in `about.js` based on mesh names containing `blue`, `glow`, or `light`. They are assigned `M_BLUE` (emissive material).

## 5. Armor Effects (Boot thrusters, etc.)
- Handled via `public/js/armor-effects.js`. 
- Imported and instantiated in `about.js` via `initializeArmorEffects(model, 1.0)`. The effects are pushed to `allThrusterEffects` and updated in the render loop.

## 6. Delete List (Old Orchestration)
- `about.js` was previously heavily refactored in a prior session to replace the complex dynamic camera tracking and multi-timeline system with a single `masterTimeline` inside `initCinematic()`.
- **Items to remove in Step 7**: 
  - Any remaining DOM button listeners like `#repulsor-btn` `addEventListener('click')` (if it was added back or exists in `about.html`).
  - Scroll physics systems not tethered to GSAP's native `ScrollTrigger.create({ ... scrub: true })` (if they exist).
  - (Note: The orchestration was unified in the prior pass, so most old orchestration is already deleted. Any remaining loose imperative animations like `window.cavernEnvironment.traverse(...)` opacity fades in `initCinematic` callbacks could be moved directly into GSAP `.to()` calls on materials).
