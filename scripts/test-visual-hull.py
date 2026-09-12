#!/usr/bin/env python3
"""
scripts/generate-identity-volume.py
Generates the Gate B-2A Constrained 3D Identity Volume (LS1_B2_VOLUME).
- Front/Back weights: 1.00 (authoritative width & height)
- Left/Right profile weights: 0.70 (soft, smoothed depth constraints)
- Full vertical slice stack with torso and bifurcated legs
- Super-elliptical anatomical cross-sections
- Exports pure JS BufferGeometry module: ls1_identity_mesh.js
"""

import os
import math
import numpy as np
import cv2

ART_DIR = r"C:\Users\gadia\.gemini\antigravity-ide\brain\694bd3af-9386-4a86-8cb6-98cd73f0a84a"
SCRATCH = os.path.join(ART_DIR, "scratch")

# Load 4-view datum silhouettes (1024 x 512 uint8)
front = np.load(os.path.join(SCRATCH, "front_silhouette.npy"))
back = np.load(os.path.join(SCRATCH, "back_silhouette.npy"))
left = np.load(os.path.join(SCRATCH, "left_silhouette.npy"))
right = np.load(os.path.join(SCRATCH, "right_silhouette.npy"))

TARGET_W = 512
TARGET_H = 1024
CROWN_Y = 64
SOLE_Y = 960
NORM_H = SOLE_Y - CROWN_Y  # 896 px
HEIGHT_M = 1.74  # Authentic human height in meters
SCALE = HEIGHT_M / float(NORM_H)

print(f"Loading silhouettes. Scale = {SCALE:.6f} m/pixel, Target Height = {HEIGHT_M:.2f} m")

# Precompute smoothed depth profile D(y) and center Zc(y)
D_profile = np.zeros(TARGET_H, dtype=np.float32)
Zc_profile = np.zeros(TARGET_H, dtype=np.float32)

for y in range(TARGET_H):
    l_cols = np.where(left[y, :] > 0)[0]
    r_cols = np.where(right[y, :] > 0)[0]
    
    depths = []
    z_centers = []
    if len(l_cols):
        depths.append(l_cols[-1] - l_cols[0] + 1)
        z_centers.append(0.5 * (l_cols[0] + l_cols[-1]))
    if len(r_cols):
        depths.append(r_cols[-1] - r_cols[0] + 1)
        # Right profile is facing right (mirrored depth relative to left)
        z_centers.append(0.5 * (r_cols[0] + r_cols[-1]))
        
    if len(depths):
        D_profile[y] = np.mean(depths)
        Zc_profile[y] = np.mean(z_centers)
    else:
        D_profile[y] = 0.0
        Zc_profile[y] = 256.0

# Gaussian smooth depth profile along y to enforce soft constraint (sigma = 10 px)
ksize = 41
sigma = 10.0
D_profile_smooth = cv2.GaussianBlur(D_profile.reshape(-1, 1), (1, ksize), sigma).flatten()
Zc_profile_smooth = cv2.GaussianBlur(Zc_profile.reshape(-1, 1), (1, ksize), sigma).flatten()

# Ensure crown and soles taper cleanly
D_profile_smooth[CROWN_Y-5:CROWN_Y+15] *= np.linspace(0.1, 1.0, 20)
D_profile_smooth[SOLE_Y-10:SOLE_Y+5] *= np.linspace(1.0, 0.2, 15)

print("Computed smoothed depth profiles.")
