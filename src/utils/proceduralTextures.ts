import * as THREE from 'three';

/**
 * Procedural PBR Texture Generator for High-Fidelity 3D Materials
 * Creates zero-asset, high-res normal, roughness, and diffuse maps on the fly
 */

export function createProceduralRockTexture(width = 1024, height = 1024): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  // 1. Color Map
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  ctx.fillStyle = '#100e0c';
  ctx.fillRect(0, 0, width, height);

  // Generate fractal rock layers
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Multi-octave noise approximation
      const n1 = Math.sin(x * 0.02) * Math.cos(y * 0.02);
      const n2 = Math.sin(x * 0.08 + n1 * 2) * Math.cos(y * 0.08);
      const n3 = Math.sin(x * 0.2) * Math.sin(y * 0.2);
      const noise = (n1 * 0.5 + n2 * 0.35 + n3 * 0.15 + 1) * 0.5;

      const r = Math.floor(18 + noise * 28);
      const g = Math.floor(14 + noise * 22);
      const b = Math.floor(10 + noise * 16);

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // 2. Bump Map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, width, height);
  const bData = bCtx.getImageData(0, 0, width, height);

  for (let i = 0; i < data.length; i += 4) {
    const val = (data[i] + data[i + 1] + data[i + 2]) / 3;
    bData.data[i] = val;
    bData.data[i + 1] = val;
    bData.data[i + 2] = val;
    bData.data[i + 3] = 255;
  }
  bCtx.putImageData(bData, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(bumpCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap, roughnessMap };
}

export function createProceduralMetalDoorTexture(width = 1024, height = 1024): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Gunmetal base
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#1c2430');
  grad.addColorStop(0.5, '#121820');
  grad.addColorStop(1, '#0b0f14');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Industrial plate paneling lines
  ctx.strokeStyle = '#05070a';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, width - 80, height - 80);
  ctx.strokeRect(120, 120, width - 240, height - 240);

  // Diagonal reinforcement braces
  ctx.beginPath();
  ctx.moveTo(40, 40);
  ctx.lineTo(width - 40, height - 40);
  ctx.moveTo(width - 40, 40);
  ctx.lineTo(40, height - 40);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = 12;
  ctx.stroke();

  // Fine brushed metal streaks
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  for (let i = 0; i < 600; i++) {
    const y = Math.random() * height;
    ctx.fillRect(0, y, width, 1);
  }

  // Hex bolts along edges
  ctx.fillStyle = '#2c394b';
  ctx.strokeStyle = '#06080b';
  ctx.lineWidth = 1.5;
  const boltSpacing = 60;
  for (let x = 60; x < width - 60; x += boltSpacing) {
    drawHexBolt(ctx, x, 60, 6);
    drawHexBolt(ctx, x, height - 60, 6);
  }
  for (let y = 60; y < height - 60; y += boltSpacing) {
    drawHexBolt(ctx, 60, y, 6);
    drawHexBolt(ctx, width - 60, y, 6);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  const metalnessMap = new THREE.CanvasTexture(canvas);

  return { map, bumpMap, metalnessMap };
}

function drawHexBolt(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const hx = x + Math.cos(angle) * radius;
    const hy = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
