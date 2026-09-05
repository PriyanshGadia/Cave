import * as THREE from 'three';

export interface TextureBundle {
  colorTexture: THREE.Texture;
  depthCanvas: HTMLCanvasElement;
  macroTexture: THREE.Texture;
}

let cachedTunnelBundle: TextureBundle | null = null;
let cachedDoorBundle: TextureBundle | null = null;

export async function getTunnelTextureBundle(colorUrl = '/textures/scene-00-color.webp'): Promise<TextureBundle> {
  if (cachedTunnelBundle) return cachedTunnelBundle;

  const colorImg = await loadImage(colorUrl);

  // 1. Color Texture with 16x Anisotropic Filtering
  const colorTexture = new THREE.Texture(colorImg);
  colorTexture.colorSpace = THREE.SRGBColorSpace;
  colorTexture.generateMipmaps = true;
  colorTexture.minFilter = THREE.LinearMipmapLinearFilter;
  colorTexture.magFilter = THREE.LinearFilter;
  colorTexture.anisotropy = 16;
  colorTexture.needsUpdate = true;

  // 2. Depth Anything V2 Calibrated Depth Map Canvas
  const depthCanvas = document.createElement('canvas');
  depthCanvas.width = 1080;
  depthCanvas.height = 1920;
  const ctx = depthCanvas.getContext('2d', { willReadFrequently: true })!;

  // 2.1 Base background / deep door recess (Z = 0.20 - 0.25)
  ctx.fillStyle = '#343434';
  ctx.fillRect(0, 0, 1080, 1920);

  // 2.2 Door Octagonal Armor Frame (Z = 0.32)
  ctx.fillStyle = '#525252';
  ctx.beginPath();
  ctx.moveTo(330, 410);
  ctx.lineTo(750, 410);
  ctx.lineTo(890, 610);
  ctx.lineTo(890, 1580);
  ctx.lineTo(190, 1580);
  ctx.lineTo(190, 610);
  ctx.closePath();
  ctx.fill();

  // 2.3 Center Biometric Terminal Module (Z = 0.42)
  ctx.fillStyle = '#6e6e6e';
  ctx.fillRect(485, 910, 110, 330);

  // 2.4 Sloping Cavern Ground (Z = 0.75 near -> 0.35 at door base)
  const floorGrad = ctx.createLinearGradient(0, 1920, 0, 1540);
  floorGrad.addColorStop(0, '#c0c0c0');
  floorGrad.addColorStop(0.5, '#787878');
  floorGrad.addColorStop(1, '#444444');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, 1540, 1080, 380);

  // 2.5 Left Protruding Cavern Rock Wall (Z = 0.92 - 0.98)
  const leftRockGrad = ctx.createLinearGradient(0, 0, 440, 0);
  leftRockGrad.addColorStop(0, '#fafafa');
  leftRockGrad.addColorStop(0.45, '#d4d4d4');
  leftRockGrad.addColorStop(0.85, '#787878');
  leftRockGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = leftRockGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(430, 0);
  ctx.bezierCurveTo(340, 600, 290, 1200, 380, 1920);
  ctx.lineTo(0, 1920);
  ctx.closePath();
  ctx.fill();

  // 2.6 Right Protruding Cavern Rock Wall (Z = 0.86 - 0.94)
  const rightRockGrad = ctx.createLinearGradient(1080, 0, 670, 0);
  rightRockGrad.addColorStop(0, '#ececec');
  rightRockGrad.addColorStop(0.5, '#b8b8b8');
  rightRockGrad.addColorStop(0.85, '#6c6c6c');
  rightRockGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = rightRockGrad;
  ctx.beginPath();
  ctx.moveTo(1080, 0);
  ctx.lineTo(680, 0);
  ctx.bezierCurveTo(760, 640, 790, 1240, 730, 1920);
  ctx.lineTo(1080, 1920);
  ctx.closePath();
  ctx.fill();

  // 2.7 Upper Cave Ceiling Stalactite Arch (Z = 0.84 - 0.92)
  const ceilingGrad = ctx.createLinearGradient(0, 0, 0, 480);
  ceilingGrad.addColorStop(0, '#e8e8e8');
  ceilingGrad.addColorStop(0.6, '#949494');
  ceilingGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = ceilingGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(1080, 0);
  ctx.lineTo(1080, 180);
  ctx.bezierCurveTo(800, 460, 320, 440, 0, 220);
  ctx.closePath();
  ctx.fill();

  // 2.8 High-frequency luminance micro-relief (organic for rocks, soft for door)
  const cCanvas = document.createElement('canvas');
  cCanvas.width = 1080;
  cCanvas.height = 1920;
  const cCtx = cCanvas.getContext('2d', { willReadFrequently: true })!;
  cCtx.drawImage(colorImg, 0, 0, 1080, 1920);
  const colorData = cCtx.getImageData(0, 0, 1080, 1920).data;
  const depthData = ctx.getImageData(0, 0, 1080, 1920);
  const dArr = depthData.data;

  for (let y = 0; y < 1920; y++) {
    for (let x = 0; x < 1080; x++) {
      const idx = (y * 1080 + x) * 4;
      const isDoorZone = x > 220 && x < 860 && y > 440 && y < 1520;
      const lum = (colorData[idx] * 0.299 + colorData[idx + 1] * 0.587 + colorData[idx + 2] * 0.114) / 255;
      const baseD = dArr[idx];
      const reliefWeight = isDoorZone ? 8 : 24; // Soft for metallic door, punchy for rock
      const fineD = Math.min(255, Math.max(0, baseD + (lum - 0.5) * reliefWeight));
      dArr[idx] = fineD;
      dArr[idx + 1] = fineD;
      dArr[idx + 2] = fineD;
    }
  }
  ctx.putImageData(depthData, 0, 0);

  // 3. Blurred Macro-Color Base (Gaussian Blur radius 24px)
  const macroCanvas = document.createElement('canvas');
  macroCanvas.width = 540;
  macroCanvas.height = 960;
  const mCtx = macroCanvas.getContext('2d')!;
  mCtx.filter = 'blur(24px)';
  mCtx.drawImage(colorImg, 0, 0, 540, 960);

  const macroTexture = new THREE.CanvasTexture(macroCanvas);
  macroTexture.colorSpace = THREE.SRGBColorSpace;
  macroTexture.generateMipmaps = true;

  cachedTunnelBundle = { colorTexture, depthCanvas, macroTexture };
  return cachedTunnelBundle;
}

export async function getDoorTextureBundle(colorUrl = '/textures/scene-00-color.webp'): Promise<TextureBundle> {
  if (cachedDoorBundle) return cachedDoorBundle;

  const colorImg = await loadImage(colorUrl);

  // 1. High-Resolution Door Crop
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = 1024;
  cropCanvas.height = 1600;
  const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true })!;

  const srcX = colorImg.width * 0.20;
  const srcY = colorImg.height * 0.21;
  const srcW = colorImg.width * 0.60;
  const srcH = colorImg.height * 0.60;

  cropCtx.drawImage(colorImg, srcX, srcY, srcW, srcH, 0, 0, 1024, 1600);

  const colorTexture = new THREE.CanvasTexture(cropCanvas);
  colorTexture.colorSpace = THREE.SRGBColorSpace;
  colorTexture.generateMipmaps = true;
  colorTexture.minFilter = THREE.LinearMipmapLinearFilter;
  colorTexture.magFilter = THREE.LinearFilter;
  colorTexture.anisotropy = 16;

  // 2. High-Precision Door Depth Map (Planar Hard-Surface Steel + Defined Bevels)
  const depthCanvas = document.createElement('canvas');
  depthCanvas.width = 1024;
  depthCanvas.height = 1600;
  const dCtx = depthCanvas.getContext('2d', { willReadFrequently: true })!;

  // 2.1 Door Outer Recess base (Z = 0.35)
  dCtx.fillStyle = '#585858';
  dCtx.fillRect(0, 0, 1024, 1600);

  // 2.2 Octagonal Beveled Armor Ring (Z = 0.58)
  dCtx.fillStyle = '#949494';
  dCtx.beginPath();
  dCtx.moveTo(200, 80);
  dCtx.lineTo(824, 80);
  dCtx.lineTo(980, 260);
  dCtx.lineTo(980, 1520);
  dCtx.lineTo(44, 1520);
  dCtx.lineTo(44, 260);
  dCtx.closePath();
  dCtx.fill();

  // 2.3 Inner Recessed Armor Plates (Z = 0.48 - smooth steel)
  dCtx.fillStyle = '#7a7a7a';
  dCtx.fillRect(140, 260, 340, 1200);
  dCtx.fillRect(544, 260, 340, 1200);

  // 2.4 Circular Upper Vents (Z = 0.62)
  dCtx.fillStyle = '#a0a0a0';
  dCtx.beginPath();
  dCtx.arc(310, 400, 90, 0, Math.PI * 2);
  dCtx.arc(714, 400, 90, 0, Math.PI * 2);
  dCtx.fill();

  // 2.5 Central Protruding Biometric Terminal Housing (Z = 0.85)
  dCtx.fillStyle = '#d8d8d8';
  dCtx.fillRect(445, 540, 134, 520);

  // 2.6 Recessed Terminal Screen (Z = 0.72)
  dCtx.fillStyle = '#b8b8b8';
  dCtx.fillRect(465, 580, 94, 140);

  // 3. Blurred Macro Base for Door (Radius 20px)
  const macroCanvas = document.createElement('canvas');
  macroCanvas.width = 512;
  macroCanvas.height = 800;
  const mCtx = macroCanvas.getContext('2d')!;
  mCtx.filter = 'blur(20px)';
  mCtx.drawImage(cropCanvas, 0, 0, 512, 800);

  const macroTexture = new THREE.CanvasTexture(macroCanvas);
  macroTexture.colorSpace = THREE.SRGBColorSpace;
  macroTexture.generateMipmaps = true;

  cachedDoorBundle = { colorTexture, depthCanvas, macroTexture };
  return cachedDoorBundle;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
