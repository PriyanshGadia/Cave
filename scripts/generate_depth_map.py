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
