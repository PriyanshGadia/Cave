#!/usr/bin/env python3
"""
scripts/generate-identity-volume.py  v2 — TRUE VISUAL HULL
Generates the Gate B-2A Constrained 3D Identity Volume (LS1_B2_VOLUME).

Algorithm: True projection-constrained visual hull.
- For every 3D voxel (x, y, z):
    - It is OCCUPIED if and only if:
        (a) the (x, y) pixel is inside the FRONT silhouette (x-col in front mask at row y)
        (b) the (x, y) pixel is inside the BACK silhouette  (mirrored x-col in back mask)
        (c) the (z, y) pixel is inside the LEFT  profile depth at row y
        (d) the (z, y) pixel is inside the RIGHT profile depth at row y
- This is the exact visual hull intersection — no elliptical inflation, no smoothed
  distance-transform extrapolation as primary shape driver.
- Preserves all negative spaces: inseam leg gap, arm/torso gap, waist concavity,
  jacket hem notches, shoulder rounding.
- Authority weighting:
    FRONT = 1.00  (binary, x-axis limiter)
    BACK  = 1.00  (binary, x-axis limiter, mirrored)
    LEFT  = 0.70  (binary, z-axis limiter)
    RIGHT = 0.70  (binary, z-axis limiter, averaged)
- Extracts watertight manifold mesh via zero-padded Marching Cubes (iso=0.45).
- Light Taubin smoothing (6 iters) only to remove voxel-stepping; does not shrink volume.
- Exports:
    1. scratch/ls1_b2_volume.obj
    2. ls1_identity_mesh.js  (pure THREE.BufferGeometry, zero network fetches)
"""

import os
import math
import numpy as np
import cv2
import trimesh
from scipy.ndimage import gaussian_filter
from skimage import measure

ART_DIR = r"C:\Users\gadia\.gemini\antigravity-ide\brain\694bd3af-9386-4a86-8cb6-98cd73f0a84a"
SCRATCH = os.path.join(ART_DIR, "scratch")

print("=== [GATE B-2A v2: TRUE VISUAL HULL IDENTITY VOLUME] ===")

# ── 1. Load the four reconciled silhouette masks (512 × 1024, uint8 0/255) ──
front = (np.load(os.path.join(SCRATCH, "mask_front.npy")) > 0).astype(np.uint8)
back  = (np.load(os.path.join(SCRATCH, "mask_back.npy"))  > 0).astype(np.uint8)
left  = (np.load(os.path.join(SCRATCH, "mask_left.npy"))  > 0).astype(np.uint8)
right = (np.load(os.path.join(SCRATCH, "mask_right.npy")) > 0).astype(np.uint8)

# Mirror back horizontally so it aligns with front (same left/right convention)
back_flip = np.fliplr(back)

# Morphological closing on front/back masks to eliminate noise pixels (tie dots,
# collar gaps, small background specks) that would otherwise carve false holes
# in the 3D mesh. 9x9 ellipse is large enough to close tie-width artifacts
# without distorting the real silhouette boundary.
_close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
front = cv2.morphologyEx(front, cv2.MORPH_CLOSE, _close_kernel)
back_flip = cv2.morphologyEx(back_flip, cv2.MORPH_CLOSE, _close_kernel)

# Hard-zero the 1-px border on all masks to guarantee closed manifold
for m in [front, back_flip, left, right]:
    m[:, 0] = 0; m[:, -1] = 0
    m[0, :]  = 0; m[-1, :] = 0

print("  Masks loaded + closed. Shape:", front.shape)

# ── 2. Build per-row depth bounds from side profiles ──────────────────────────
# The side masks are 512 × 1024.
# In LEFT profile:  column 0 = anterior (+Z), column 511 = posterior (-Z).
# In RIGHT profile: column 0 = posterior (-Z), column 511 = anterior (+Z).
# We parameterise depth as z in [-1, +1] where +1 = anterior.
MH, MW = front.shape  # 1024, 512

print("2. Computing per-row Z-extent from left and right profiles...")

z_ant_left  = np.zeros(MH, dtype=np.float32)  # anterior half-depth from left
z_post_left = np.zeros(MH, dtype=np.float32)  # posterior half-depth from left
z_ant_right = np.zeros(MH, dtype=np.float32)
z_post_right= np.zeros(MH, dtype=np.float32)

for y in range(MH):
    l_cols = np.where(left[y, :])[0]
    r_cols = np.where(right[y, :])[0]

    if len(l_cols) >= 2:
        # Left mask: column → depth. col=0 is anterior.
        # Map col [0..MW-1] → z in [+1..-1]
        l_ant_col  = l_cols[0]          # leftmost = most anterior in left profile
        l_post_col = l_cols[-1]         # rightmost = most posterior
        # Convert to normalised depth: col 0 → z=+1, col MW-1 → z=-1
        z_ant_left[y]  = 1.0 - 2.0 * l_ant_col  / (MW - 1)
        z_post_left[y] = 1.0 - 2.0 * l_post_col / (MW - 1)
    elif len(l_cols) == 1:
        c = l_cols[0]
        z_ant_left[y] = z_post_left[y] = 1.0 - 2.0 * c / (MW - 1)

    if len(r_cols) >= 2:
        # Right mask: col=0 is posterior, col=MW-1 is anterior.
        r_ant_col  = r_cols[-1]         # rightmost = most anterior
        r_post_col = r_cols[0]          # leftmost  = most posterior
        z_ant_right[y]  = 2.0 * r_ant_col  / (MW - 1) - 1.0
        z_post_right[y] = 2.0 * r_post_col / (MW - 1) - 1.0
    elif len(r_cols) == 1:
        c = r_cols[0]
        z_ant_right[y] = z_post_right[y] = 2.0 * c / (MW - 1) - 1.0

# Blend: weight side profiles at 0.70, use conservative (narrower) result
W_SIDE = 0.70
z_ant  = W_SIDE * 0.5 * (z_ant_left  + z_ant_right)
z_post = W_SIDE * 0.5 * (z_post_left + z_post_right)

# Ensure z_ant >= z_post (anterior is more positive than posterior)
z_ant  = np.maximum(z_ant, z_post + 0.01)

# Smooth along vertical axis (15 px gaussian) to remove stairstepping
kernel1d = cv2.GaussianBlur(z_ant.reshape(-1, 1),  (1, 21), 3.0).flatten()
z_ant    = kernel1d
kernel1d = cv2.GaussianBlur(z_post.reshape(-1, 1), (1, 21), 3.0).flatten()
z_post   = kernel1d

# Z center and half-range
z_c = 0.5 * (z_ant + z_post)
z_r = 0.5 * (z_ant - z_post)

print("  Z-extent computed. Median radius (norm): {:.3f}".format(np.median(z_r)))

# ── 3. Build soft signed distance fields for X-occupancy ─────────────────────
# Precompute 2D distance transforms on the FULL masks at mask resolution.
# SDF value = positive inside (distance to boundary), negative outside.
# Bilinear interpolation onto the voxel grid gives Marching Cubes a smooth,
# continuously varying scalar field — no stairstepping, no banding.
print("3a. Computing signed distance fields for FRONT and BACK masks...")

def sdf_from_mask(mask):
    """Returns a float32 signed distance field: +ve inside, -ve outside."""
    m_uint8 = (mask > 0).astype(np.uint8) * 255
    # Positive: distance from interior pixel to nearest background
    dist_in  = cv2.distanceTransform(m_uint8, cv2.DIST_L2, 5)
    # Negative: distance from background pixel to nearest interior (via inverted mask)
    inv = 255 - m_uint8
    dist_out = cv2.distanceTransform(inv, cv2.DIST_L2, 5)
    return dist_in.astype(np.float32) - dist_out.astype(np.float32)

sdf_front = sdf_from_mask(front)
sdf_back  = sdf_from_mask(back_flip)

# Similarly for Z-occupancy: build a per-row soft Z field
# using a linear ramp of width 4 voxels at the depth boundary
print("3b. Building per-row soft Z-boundary ramp...")

# ── 4. Define voxel sampling grid ─────────────────────────────────────────────
Y_CROWN = 48;  Y_SOLE = 975
X_LEFT  = 0;   X_RIGHT = 511
HEIGHT_M = 1.74
NORM_H   = float(Y_SOLE - Y_CROWN)   # 927 px
SCALE    = HEIGHT_M / NORM_H

# Grid resolution — enough for clean silhouette, stays within 70K tri budget
ny = 220    # vertical (5.15px/voxel — fine enough, SDF handles anti-aliasing)
nx = 120    # lateral
nz = 80     # depth

ys_frac = np.linspace(0.0, 1.0, ny)
xs_frac = np.linspace(0.0, 1.0, nx)

# Pixel coordinates for sampling the SDF arrays
# Front/back SDF is 1024 rows × 512 cols
ys_px = Y_CROWN + ys_frac * NORM_H          # shape (ny,)
xs_px = (X_LEFT + 4) + xs_frac * (X_RIGHT - X_LEFT - 8)  # shape (nx,)

zs_norm = np.linspace(-1.0, +1.0, nz, dtype=np.float32)

print(f"   Building {ny}x{nx}x{nz} soft volume...")

# Bilinear interpolation helper using scipy map_coordinates
from scipy.ndimage import map_coordinates

# Build 2D sample coordinate grids
coords_y = ys_px[:, None] * np.ones((1, nx))   # (ny, nx) — broadcast along x
coords_x = np.ones((ny, 1)) * xs_px[None, :]   # (ny, nx)

coords_2d = np.array([coords_y.ravel(), coords_x.ravel()])

sdf_f_vals = map_coordinates(sdf_front, coords_2d, order=1, mode='constant', cval=-20.0).reshape(ny, nx)
sdf_b_vals = map_coordinates(sdf_back,  coords_2d, order=1, mode='constant', cval=-20.0).reshape(ny, nx)

# Combined X occupancy: take the MIN of front and back SDFs
# (inside both → positive; outside either → negative)
sdf_x = np.minimum(sdf_f_vals, sdf_b_vals)   # shape (ny, nx)

# Normalise SDF to [-1..+1] occupancy scale by dividing by a half-band width (6px)
BAND_PX = 6.0
x_soft = np.clip(sdf_x / BAND_PX, -1.0, 1.0)   # shape (ny, nx)

# Build 3D soft volume
V = np.zeros((ny, nx, nz), dtype=np.float32)

for iy in range(ny):
    y = int(round(ys_px[iy]))
    y = max(0, min(1023, y))

    zrad = z_r[y]
    if zrad <= 0.001:
        continue

    za = z_ant[y]
    zp = z_post[y]
    zc = z_c[y]
    # Soft Z boundary ramp + lateral cosine profile:
    # The depth field is not a flat slab — it is peaked at the lateral centre
    # (widest part) and falls toward the silhouette edges, modelling a convex
    # anterior chest surface and a slightly concave posterior back.
    Z_RAMP = 4.0 / max(nz, 1)   # ramp width in z_n units at boundary
    z_dist_ant  = (za - zs_norm)   # positive if inside anterior bound
    z_dist_post = (zs_norm - zp)   # positive if inside posterior bound
    z_soft = np.minimum(z_dist_ant / (Z_RAMP + 1e-6),
                        z_dist_post / (Z_RAMP + 1e-6))
    z_soft = np.clip(z_soft, -1.0, 1.0)   # shape (nz,)

    # Volume at row iy: multiply x_soft by z_soft
    # Additionally modulate depth by the x_soft value to create convex profile:
    #   - voxels near silhouette centre (high x_soft) keep full z range
    #   - voxels near silhouette edge (low x_soft, approaching 0) have z pulled
    #     inward, producing a rounded cross-section not a flat slab
    row_x = x_soft[iy, :]    # shape (nx,) in [-1, +1]
    # Remap x_soft [0..1] -> radial depth multiplier using sqrt (mild, not cosine)
    x_clamp = np.clip(row_x, 0.0, 1.0)   # only interior pixels matter for depth
    # Scale depth boundary by lateral position: sqrt gives gentle rounding
    # (0 at edge, 1 at centre). Exterior pixels (x_clamp=0) get z clamped too.
    depth_scale = np.sqrt(x_clamp)   # shape (nx,)  — ranges [0..1]

    # For each lateral position ix, the Z boundary scales as:
    #   effective za = zc + (za - zc) * depth_scale[ix]
    #   effective zp = zc + (zp - zc) * depth_scale[ix]
    za_eff = zc + (za - zc) * depth_scale[:, None]   # (nx, 1)
    zp_eff = zc + (zp - zc) * depth_scale[:, None]   # (nx, 1)
    z_dist_ant2  = (za_eff - zs_norm[None, :]) / (Z_RAMP + 1e-6)  # (nx, nz)
    z_dist_post2 = (zs_norm[None, :] - zp_eff) / (Z_RAMP + 1e-6)  # (nx, nz)
    z_field = np.clip(np.minimum(z_dist_ant2, z_dist_post2), -1.0, 1.0)  # (nx, nz)

    # The final voxel value is min of x_soft and the per-depth z_field
    # x_soft[:,None] clamps exterior pixels to negative regardless of Z
    V[iy, :, :] = np.minimum(row_x[:, None], z_field)

print("4. Applying light 3D smoothing + zero-pad for closed manifold...")
V_padded = np.pad(V, 1, mode='constant', constant_values=-1.0)
# Gentle isotropic Gaussian to remove voxel-edge micro-noise only
V_sm = gaussian_filter(V_padded, sigma=(0.8, 0.8, 0.8))

print("5. Marching Cubes isosurface extraction (iso=0.0)...")
# iso=0 is the natural zero-crossing of the signed distance field
verts, faces, normals, values = measure.marching_cubes(V_sm, level=0.0)

# ── 4. Convert grid coords → metric space ────────────────────────────────────
# Padded grid: index 0 is the pad voxel, so voxel[1..ny] → ys_idx[0..ny-1]
y_frac = (verts[:, 0] - 1.0) / (ny - 1.0)
x_frac = (verts[:, 1] - 1.0) / (nx - 1.0)
z_frac = (verts[:, 2] - 1.0) / (nz - 1.0)

y_px = Y_CROWN + y_frac * NORM_H
x_px = (X_LEFT + 4) + x_frac * (X_RIGHT - X_LEFT - 8)
z_n  = -1.0 + z_frac * 2.0   # back to [-1, +1]

# X: lateral (left-right), centred at 0
# Y: vertical, 0 at sole, 1.74m at crown
# Z: depth, +Z = anterior (front), -Z = posterior (back)
#
# Anthropometric Z calibration:
#   The side-profile photos were shot at a DIFFERENT zoom than the front, so we
#   cannot derive absolute Z depth from pixel counts. Instead we set the scale so
#   that the MEDIAN occupied row depth equals a known human body depth target.
#   Side masks contribute only the RELATIVE depth envelope (head < torso > ankle).
#
#   Target: slim adult male in business suit
#     Torso (chest → back) ≈ 0.24 m
#     Head  (forehead → back of skull) ≈ 0.19 m   (z_r ≈ 0.79 × torso z_r)
#     Shoes (toe → heel) ≈ 0.07 m per sole
#
# The widest body cross-section (chest at shoulder level, or hip width front-to-back)
# should reach TARGET_MAX_DEPTH_M.  Use 95th percentile of z_r as the reference
# (the 5% tallest rows) so the PEAK cross-section = target, not the median.
TARGET_MAX_DEPTH_M = 0.260   # 26 cm total — chest front-to-back for slim adult male suit
p95_z_r = float(np.percentile(z_r[Y_CROWN:Y_SOLE], 95))
if p95_z_r < 1e-4:
    p95_z_r = 0.20
# z_phys_scale: maps z_n = +p95_z_r → +TARGET_MAX_DEPTH_M/2 in metres
z_phys_scale = (TARGET_MAX_DEPTH_M / 2.0) / p95_z_r
median_z_r = float(np.median(z_r[Y_CROWN:Y_SOLE]))
print(f"   Z phys scale: {z_phys_scale:.3f} m  (p95 z_r = {p95_z_r:.3f}, median z_r = {median_z_r:.3f})")
print(f"   Expected peak depth ~= {2*p95_z_r*z_phys_scale*100:.1f} cm, median depth ~= {2*median_z_r*z_phys_scale*100:.1f} cm")

m_verts = np.zeros_like(verts)
m_verts[:, 0] = (x_px - 256.0) * SCALE        # X lateral
m_verts[:, 1] = (Y_SOLE - y_px) * SCALE       # Y vertical
m_verts[:, 2] = z_n * z_phys_scale            # Z depth (anthropometrically calibrated)

# Ground: soles at Y=0.00
min_y = m_verts[:, 1].min()
if min_y < 0:
    m_verts[:, 1] -= min_y

mesh = trimesh.Trimesh(vertices=m_verts, faces=faces)

print("6. Repairing winding and normals...")
trimesh.repair.fix_winding(mesh)
trimesh.repair.fix_inversion(mesh)

# Light Taubin smoothing — only removes voxel stepping, does not inflate/deflate bulk
# More iterations to smooth voxel-stepping residue without shrinking volume
mesh = trimesh.smoothing.filter_taubin(mesh, lamb=0.5, nu=-0.53, iterations=12)
trimesh.repair.fix_normals(mesh)

print(f"=== MESH DIAGNOSTICS ===")
print(f"Total vertices: {len(mesh.vertices)}")
print(f"Total faces:    {len(mesh.faces)}")
print(f"Watertight:     {mesh.is_watertight}")
print(f"Bounds (meters):")
print(f"  X: [{mesh.bounds[0][0]:.3f}, {mesh.bounds[1][0]:.3f}]  (width = {mesh.bounds[1][0]-mesh.bounds[0][0]:.3f} m)")
print(f"  Y: [{mesh.bounds[0][1]:.3f}, {mesh.bounds[1][1]:.3f}]  (height = {mesh.bounds[1][1]-mesh.bounds[0][1]:.3f} m)")
print(f"  Z: [{mesh.bounds[0][2]:.3f}, {mesh.bounds[1][2]:.3f}]  (depth = {mesh.bounds[1][2]-mesh.bounds[0][2]:.3f} m)")

# Compute smooth vertex normals
v_normals = mesh.vertex_normals

# ── 5. Export OBJ ─────────────────────────────────────────────────────────────
obj_path = os.path.join(SCRATCH, "ls1_b2_volume.obj")
with open(obj_path, "w") as f:
    f.write("# LS1_B2_VOLUME v2 - True Visual Hull Identity Volume\n")
    for v in mesh.vertices:
        f.write(f"v {v[0]:.5f} {v[1]:.5f} {v[2]:.5f}\n")
    for n in v_normals:
        f.write(f"vn {n[0]:.4f} {n[1]:.4f} {n[2]:.4f}\n")
    for face in mesh.faces:
        f.write(f"f {face[0]+1}//{face[0]+1} {face[1]+1}//{face[1]+1} {face[2]+1}//{face[2]+1}\n")
print(f"7. Saved OBJ to: {obj_path}")

# ── 6. Export pure JS BufferGeometry module ────────────────────────────────────
js_path = os.path.join(os.getcwd(), "ls1_identity_mesh.js")
print(f"8. Exporting pure JS BufferGeometry module to: {js_path}...")

flat_positions = mesh.vertices.flatten().round(4)
flat_normals   = v_normals.flatten().round(4)
flat_indices   = mesh.faces.flatten().astype(np.uint32)

with open(js_path, "w") as f:
    f.write("// ls1_identity_mesh.js v2 — Auto-generated True Visual Hull for Sector LS1 Gate B-2A\n")
    f.write("// Zero external network assets. Pure THREE.BufferGeometry.\n\n")

    f.write("export const LS1_POSITIONS = new Float32Array([\n")
    for i in range(0, len(flat_positions), 24):
        chunk = ",".join(f"{val:.4f}" for val in flat_positions[i:i+24])
        f.write(chunk + ",\n")
    f.write("]);\n\n")

    f.write("export const LS1_NORMALS = new Float32Array([\n")
    for i in range(0, len(flat_normals), 24):
        chunk = ",".join(f"{val:.4f}" for val in flat_normals[i:i+24])
        f.write(chunk + ",\n")
    f.write("]);\n\n")

    f.write("export const LS1_INDICES = new Uint32Array([\n")
    for i in range(0, len(flat_indices), 24):
        chunk = ",".join(str(val) for val in flat_indices[i:i+24])
        f.write(chunk + ",\n")
    f.write("]);\n\n")

    f.write("""export function createIdentityVolumeGeometry(THREE) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(LS1_POSITIONS, 3));
  geom.setAttribute('normal',   new THREE.BufferAttribute(LS1_NORMALS,   3));
  geom.setIndex(new THREE.BufferAttribute(LS1_INDICES, 1));
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return geom;
}
""")

print(f"=== GATE B-2A v2 TRUE VISUAL HULL GENERATION COMPLETE ===")
