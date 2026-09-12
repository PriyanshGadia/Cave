#!/usr/bin/env python3
"""
scripts/extract-4view-silhouettes.py
Extracts, segments, calibrates, and aligns the 4 authoritative silhouettes:
1. FRONT (from media_1789124726831.jpg)
2. BACK (from media_1789124726831.jpg)
3. LEFT PROFILE (from media_1789110789376.jpg, fig 2)
4. RIGHT PROFILE (from media_1789110789376.jpg, fig 6)

Normalizes all 4 silhouettes onto an identical 512x1024 grid:
- Crown at y = 64
- Soles at y = 960 (Height = 896 px)
- Centered on x = 256
Draws horizontal anatomical datum guides across all 4 views.
"""

import os
import cv2
import numpy as np

ART_DIR = r"C:\Users\gadia\.gemini\antigravity-ide\brain\694bd3af-9386-4a86-8cb6-98cd73f0a84a"
USER_UP = os.path.join(ART_DIR, ".user_uploaded")
SCRATCH = os.path.join(ART_DIR, "scratch")
os.makedirs(SCRATCH, exist_ok=True)

TARGET_W = 512
TARGET_H = 1024
CROWN_Y = 64
SOLE_Y = 960
NORM_H = SOLE_Y - CROWN_Y  # 896 px

def extract_front_back():
    path = os.path.join(USER_UP, "media_1789124726831.jpg")
    im = cv2.imread(path)
    if im is None:
        raise FileNotFoundError(f"Cannot open {path}")
    h, w = im.shape[:2]
    mid = w // 2

    crops = {"FRONT": im[:, :mid], "BACK": im[:, mid:]}
    masks = {}

    for name, sub in crops.items():
        gray = cv2.cvtColor(sub, cv2.COLOR_BGR2GRAY)
        bg_thresh = (gray > 240).astype(np.uint8) * 255
        h_s, w_s = bg_thresh.shape
        flood_mask = np.zeros((h_s + 2, w_s + 2), np.uint8)
        filled = bg_thresh.copy()
        cv2.floodFill(filled, flood_mask, (0, 0), 128)
        cv2.floodFill(filled, flood_mask, (w_s - 1, 0), 128)
        cv2.floodFill(filled, flood_mask, (0, h_s - 1), 128)
        cv2.floodFill(filled, flood_mask, (w_s - 1, h_s - 1), 128)

        raw_mask = (filled != 128).astype(np.uint8) * 255

        # Close and fill all internal cavities
        kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        closed = cv2.morphologyEx(raw_mask, cv2.MORPH_CLOSE, kernel_close)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        filled_mask = np.zeros_like(closed)
        cv2.drawContours(filled_mask, contours, -1, 255, -1)

        # Invert to check if any inner unreached cavities remain
        inv = (filled_mask == 0).astype(np.uint8) * 255
        f_inv = inv.copy()
        flood_inv = np.zeros((h_s + 2, w_s + 2), np.uint8)
        cv2.floodFill(f_inv, flood_inv, (0, 0), 128)
        solid_mask = (f_inv != 128).astype(np.uint8) * 255

        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(solid_mask)
        if num_labels > 1:
            largest_idx = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
            solid_mask = (labels == largest_idx).astype(np.uint8) * 255

        masks[name] = solid_mask

    return masks["FRONT"], masks["BACK"]

def extract_left_right():
    path = os.path.join(USER_UP, "media_1789110789376.jpg")
    im = cv2.imread(path)
    if im is None:
        raise FileNotFoundError(f"Cannot open {path}")

    # LEFT PROFILE (Fig 2): rows 44 to 400, cols 250 to 380
    shoe_poly_l = np.array([
        [63, 0], [45, 20], [35, 35], [31, 48], [31, 58],
        [105, 58], [106, 50], [105, 35], [103, 15], [101, 0]
    ], np.int32)

    # RIGHT PROFILE (Fig 6): rows 44 to 400, cols 750 to 885
    shoe_poly_r = np.array([
        [20, 0], [16, 25], [14, 40], [16, 54], [20, 58],
        [105, 58], [107, 54], [103, 44], [90, 32], [74, 15], [64, 0]
    ], np.int32)

    configs = [
        ("LEFT", 44, 400, 250, 380, shoe_poly_l),
        ("RIGHT", 44, 400, 750, 885, shoe_poly_r),
    ]

    masks = {}
    for name, r_top, r_bot, c_left, c_right, shoe_poly in configs:
        crop = im[r_top:r_bot+1, c_left:c_right+1].copy()
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        h_crop, w_crop = crop.shape[:2]
        body_split_y = h_crop - 61  # Row 340 is body_split_y

        # Upper body mask
        upper_gray = gray[:body_split_y, :]
        _, upper_thresh = cv2.threshold(upper_gray, 28, 255, cv2.THRESH_BINARY)
        upper_clean = cv2.morphologyEx(upper_thresh, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
        upper_closed = cv2.morphologyEx(upper_clean, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))

        # Shoe mask using geometric boundary polygon
        foot_gray = gray[body_split_y:h_crop, :]
        poly_mask = np.zeros((h_crop - body_split_y, w_crop), dtype=np.uint8)
        cv2.fillPoly(poly_mask, [shoe_poly], 255)

        _, foot_thresh = cv2.threshold(foot_gray, 26, 255, cv2.THRESH_BINARY)
        foot_clean = cv2.bitwise_and(foot_thresh, poly_mask)
        foot_closed = cv2.morphologyEx(foot_clean, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))

        # Combine upper body + shoe
        full_mask = np.zeros((h_crop, w_crop), dtype=np.uint8)
        full_mask[:body_split_y, :] = upper_closed
        full_mask[body_split_y:h_crop, :] = foot_closed

        # Bridge seam between body and shoes with gentle vertical closing
        full_mask = cv2.morphologyEx(full_mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 9)))

        # Fill all internal holes
        contours, _ = cv2.findContours(full_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        solid_mask = np.zeros_like(full_mask)
        cv2.drawContours(solid_mask, contours, -1, 255, -1)

        # Keep largest component
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(solid_mask)
        if num_labels > 1:
            largest_idx = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
            solid_mask = (labels == largest_idx).astype(np.uint8) * 255

        masks[name] = solid_mask

    return masks["LEFT"], masks["RIGHT"]

def normalize_silhouette(mask, name):
    """
    Normalizes a binary mask to TARGET_W x TARGET_H:
    - Crown apex at CROWN_Y (64)
    - Sole at SOLE_Y (960)
    - Centered horizontally along torso spine at x = 256
    """
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]

    if len(rows) == 0 or len(cols) == 0:
        raise ValueError(f"Mask {name} is empty")

    y_min, y_max = rows[0], rows[-1]
    x_min, x_max = cols[0], cols[-1]

    h_orig = y_max - y_min + 1
    w_orig = x_max - x_min + 1

    tight = mask[y_min:y_max+1, x_min:x_max+1]

    scale = NORM_H / float(h_orig)
    new_w = max(1, int(round(w_orig * scale)))
    new_h = NORM_H

    resized = cv2.resize(tight, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    _, resized_bin = cv2.threshold(resized, 127, 255, cv2.THRESH_BINARY)

    canvas = np.zeros((TARGET_H, TARGET_W), dtype=np.uint8)

    # Torso spine alignment:
    torso_slice = resized_bin[int(0.25*new_h):int(0.65*new_h), :]
    torso_cols = np.where(torso_slice.any(axis=0))[0]
    if len(torso_cols) > 0:
        torso_cx = 0.5 * (torso_cols[0] + torso_cols[-1])
    else:
        torso_cx = new_w / 2.0

    x_offset = int(round(TARGET_W / 2.0 - torso_cx))
    x_offset = max(0, min(TARGET_W - new_w, x_offset))

    canvas[CROWN_Y:CROWN_Y+new_h, x_offset:x_offset+new_w] = resized_bin
    return canvas

def build_comparison_sheet(canvases):
    """
    Builds a 4-column side-by-side alignment sheet with anatomical horizontal datum guides.
    """
    sheet_w = TARGET_W * 4
    sheet_h = TARGET_H + 80
    sheet = np.full((sheet_h, sheet_w, 3), 248, dtype=np.uint8)

    # Header
    cv2.rectangle(sheet, (0, 0), (sheet_w, 70), (20, 24, 32), -1)
    cv2.putText(sheet, "GATE B-2: 4-VIEW AUTHORITATIVE IDENTITY SILHOUETTES & DATUM ALIGNMENT",
                (30, 42), cv2.FONT_HERSHEY_DUPLEX, 0.9, (240, 245, 255), 2, cv2.LINE_AA)
    cv2.putText(sheet, "Visual Hull Occupancy Grid Calibration | Crown-to-Sole Normalization = 896px | True Anatomical Profiles",
                (30, 62), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 185, 210), 1, cv2.LINE_AA)

    names = ["FRONT VIEW", "BACK VIEW", "LEFT PROFILE", "RIGHT PROFILE"]

    for i, (name, mask) in enumerate(zip(names, canvases)):
        x_base = i * TARGET_W
        y_base = 80

        cv2.rectangle(sheet, (x_base, y_base), (x_base + TARGET_W, y_base + TARGET_H), (255, 255, 255), -1)
        cv2.rectangle(sheet, (x_base, y_base), (x_base + TARGET_W, y_base + TARGET_H), (220, 225, 230), 1)

        cv2.rectangle(sheet, (x_base + 10, y_base + 10), (x_base + TARGET_W - 10, y_base + 45), (32, 38, 50), -1)
        cv2.putText(sheet, name, (x_base + 20, y_base + 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.65, (75, 240, 255), 1, cv2.LINE_AA)

        # Center spine guide
        cv2.line(sheet, (x_base + 256, y_base + 50), (x_base + 256, y_base + TARGET_H - 10),
                 (225, 230, 238), 1, cv2.LINE_AA)

        # Solid matte dark charcoal silhouette
        fg_idx = np.where(mask > 0)
        sheet[y_base + fg_idx[0], x_base + fg_idx[1]] = (26, 28, 36)

    # Datum guide lines
    datum_lines = [
        ("CROWN / HAIR APEX", CROWN_Y, (0, 180, 0)),
        ("GLASSES / EYE LINE", CROWN_Y + 70, (255, 120, 0)),
        ("CHIN / JAW", CROWN_Y + 140, (180, 0, 180)),
        ("SHOULDERS", CROWN_Y + 195, (0, 120, 255)),
        ("MID-CHEST", CROWN_Y + 285, (0, 160, 220)),
        ("BELT / WAIST", CROWN_Y + 410, (200, 140, 0)),
        ("HIPS / JACKET HEM", CROWN_Y + 475, (160, 80, 200)),
        ("INSEAM", CROWN_Y + 520, (120, 120, 120)),
        ("KNEES", CROWN_Y + 665, (0, 150, 100)),
        ("ANKLES", CROWN_Y + 835, (180, 100, 60)),
        ("SOLES / GROUND CONTACT", SOLE_Y, (0, 0, 220)),
    ]

    y_base = 80
    for label, y_offset, col in datum_lines:
        y_pos = y_base + y_offset
        cv2.line(sheet, (10, y_pos), (sheet_w - 10, y_pos), col, 1, cv2.LINE_AA)
        cv2.putText(sheet, label, (15, y_pos - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.38, col, 1, cv2.LINE_AA)
        cv2.putText(sheet, label, (sheet_w - 190, y_pos - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.38, col, 1, cv2.LINE_AA)

    out_path = os.path.join(ART_DIR, "ls1_4view_silhouettes.png")
    cv2.imwrite(out_path, sheet)
    pub_path = os.path.join(os.getcwd(), "public", "screenshots", "ls1_4view_silhouettes.png")
    try:
        cv2.imwrite(pub_path, sheet)
    except Exception:
        pass
    print(f"Saved 4-view silhouette alignment sheet to: {out_path}")

def main():
    print("=== [GATE B-2: 4-VIEW SILHOUETTE EXTRACTION & ALIGNMENT] ===")
    print("1. Extracting Front and Back masks from media_1789124726831.jpg...")
    front_raw, back_raw = extract_front_back()

    print("2. Extracting Left Profile and Right Profile masks from media_1789110789376.jpg...")
    left_raw, right_raw = extract_left_right()

    print("3. Normalizing all 4 silhouettes onto unified 512x1024 datum grid...")
    front_norm = normalize_silhouette(front_raw, "FRONT")
    back_norm = normalize_silhouette(back_raw, "BACK")
    left_norm = normalize_silhouette(left_raw, "LEFT")
    right_norm = normalize_silhouette(right_raw, "RIGHT")

    np.save(os.path.join(SCRATCH, "front_silhouette.npy"), front_norm)
    np.save(os.path.join(SCRATCH, "back_silhouette.npy"), back_norm)
    np.save(os.path.join(SCRATCH, "left_silhouette.npy"), left_norm)
    np.save(os.path.join(SCRATCH, "right_silhouette.npy"), right_norm)
    print("   -> Saved silhouette numpy arrays to scratch/")

    print("4. Generating side-by-side datum comparison sheet...")
    build_comparison_sheet([front_norm, back_norm, left_norm, right_norm])
    print("=== DONE ===")

if __name__ == "__main__":
    main()
