import * as THREE from "three";

export interface DepthMeshOptions {
  colorMapUrl: string;
  depthMapUrl: string;
  width: number;
  height: number;
  segments?: number;
  depthScale?: number;
  invertDepth?: boolean;
}

/**
 * Builds real geometry whose bumps match the actual photo — Technique C, Hardened.
 * Hardened with Guards 1-3 to prevent dimension mismatches, degenerate geometry, and transparency inheritance.
 * Includes aspect ratio guard to prevent geometry stretching.
 */
export async function buildDepthMesh(opts: DepthMeshOptions): Promise<THREE.Mesh> {
  const { colorMapUrl, depthMapUrl, width, height, segments = 220, depthScale = 2.5, invertDepth = false } = opts;

  const [depthImg, colorImg] = await Promise.all([loadImage(depthMapUrl), loadImage(colorMapUrl)]);

  // GUARD 1 — this check alone catches dimension mismatch bugs immediately,
  // with a clear error instead of a silently warped mesh.
  if (depthImg.width !== colorImg.width || depthImg.height !== colorImg.height) {
    throw new Error(
      `Depth (${depthImg.width}x${depthImg.height}) and color ` +
      `(${colorImg.width}x${colorImg.height}) dimensions don't match. ` +
      `Re-run scripts/generate_depth_map.py — it resizes automatically now.`
    );
  }

  // ASPECT RATIO GUARD — warn immediately if width/height drifts from source aspect ratio
  const imageAspect = colorImg.width / colorImg.height;
  const meshAspect = width / height;
  if (Math.abs(imageAspect - meshAspect) / imageAspect > 0.02) {
    console.warn(
      `buildDepthMesh: mesh aspect ${meshAspect.toFixed(3)} doesn't ` +
      `match source image aspect ${imageAspect.toFixed(3)} — geometry will be stretched.`
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
    map: colorMap,
    roughness: 0.75,
    metalness: 0.3,
    // GUARD 3 — explicit and intentional: this background mesh never
    // inherits transparency from a cutout/isolated reference image. If an
    // isolated-background asset is needed somewhere, it's a distinct file
    // for a distinct purpose, never silently reused as this plane's texture.
    transparent: false,
  }));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
