#!/usr/bin/env python3
"""
scripts/generate_depth_map_colab.py
====================================
Depth map generation for THE WORKSHOP using Depth-Anything V2.

HOW TO USE:
-----------
1. Open Google Colab: https://colab.research.google.com
2. Upload this script OR paste it into a cell
3. Upload your keyframe image (e.g., keyframe_0.jpg) to Colab
4. Run the script — it will:
   a. Install Depth-Anything V2
   b. Generate a depth map
   c. Force-resize to match the source image dimensions (Guard 1)
   d. Save as depth_0.png
5. Download depth_0.png and place it in public/frames/S00/

IMPORTANT: The output depth map MUST match the source image dimensions exactly,
or buildDepthMesh.ts Guard 1 will throw an error.
"""

# === Cell 1: Install dependencies ===
# !pip install torch torchvision transformers pillow

import sys
import os

def generate_depth_map(input_path: str, output_path: str):
    """Generate depth map using Depth-Anything V2 via HuggingFace Transformers."""
    import torch
    from PIL import Image
    from transformers import AutoImageProcessor, AutoModelForDepthEstimation
    import numpy as np

    print(f"[1/5] Loading source image: {input_path}")
    source_image = Image.open(input_path).convert("RGB")
    source_w, source_h = source_image.size
    print(f"       Source dimensions: {source_w} x {source_h}")

    print("[2/5] Loading Depth-Anything-V2-Small model...")
    model_name = "depth-anything/Depth-Anything-V2-Small-hf"
    processor = AutoImageProcessor.from_pretrained(model_name)
    model = AutoModelForDepthEstimation.from_pretrained(model_name)

    # Use GPU if available (Colab T4)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    print(f"       Running on: {device}")

    print("[3/5] Running depth inference...")
    inputs = processor(images=source_image, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model(**inputs)
        predicted_depth = outputs.predicted_depth

    print("[4/5] Processing depth output...")
    # Interpolate to original size
    depth = torch.nn.functional.interpolate(
        predicted_depth.unsqueeze(1),
        size=(source_h, source_w),
        mode="bicubic",
        align_corners=False,
    ).squeeze()

    # Normalize to 0-255 range
    depth_np = depth.cpu().numpy()
    depth_min = depth_np.min()
    depth_max = depth_np.max()
    depth_normalized = ((depth_np - depth_min) / (depth_max - depth_min) * 255).astype(np.uint8)

    # Convert to PIL Image
    depth_image = Image.fromarray(depth_normalized, mode="L")

    # GUARD 1 ENFORCEMENT: Force-resize to EXACT source dimensions
    if depth_image.size != (source_w, source_h):
        print(f"       Resizing depth map from {depth_image.size} to {source_w}x{source_h}")
        depth_image = depth_image.resize((source_w, source_h), Image.BICUBIC)

    # Verify dimensions match
    assert depth_image.size == (source_w, source_h), \
        f"FATAL: Depth map {depth_image.size} != source {source_w}x{source_h}"

    print(f"[5/5] Saving depth map: {output_path}")
    depth_image.save(output_path)
    print(f"       Done! Dimensions: {depth_image.size[0]} x {depth_image.size[1]}")
    print(f"       Depth range: min={depth_min:.2f}, max={depth_max:.2f}")

    return output_path


# === MAIN ===
if __name__ == "__main__":
    # Default paths — adjust if running locally
    input_file = sys.argv[1] if len(sys.argv) > 1 else "keyframe_0.jpg"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "depth_0.png"

    if not os.path.exists(input_file):
        print(f"ERROR: Source image not found: {input_file}")
        print("Upload your keyframe image to Colab or provide the correct path.")
        sys.exit(1)

    generate_depth_map(input_file, output_file)


# === COLAB NOTEBOOK VERSION ===
# If you're pasting this into a Colab notebook, use these cells instead:
#
# Cell 1:
#   !pip install torch torchvision transformers pillow
#
# Cell 2:
#   from google.colab import files
#   uploaded = files.upload()  # Upload keyframe_0.jpg
#
# Cell 3:
#   # Copy the generate_depth_map function above and run it:
#   generate_depth_map("keyframe_0.jpg", "depth_0.png")
#
# Cell 4:
#   files.download("depth_0.png")
