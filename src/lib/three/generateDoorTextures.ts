import * as THREE from "three";

/**
 * Generates Master PBR maps for the industrial blast door:
 * - Albedo Map: Aged dark gunmetal with edge wear scuffs & seam carbon grime
 * - Roughness Map: 0.30-0.45 with horizontal machining streaks and micro-wear
 * - Normal Map: Tangent space normal map with fine horizontal brushed steel grain
 * - AO Map: Baked cavity occlusion
 */
export function generateMasterDoorMaps(): {
  albedoMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
} {
  if (typeof document === "undefined") {
    const dummy = new THREE.CanvasTexture(new Image());
    return { albedoMap: dummy, roughnessMap: dummy, normalMap: dummy, aoMap: dummy };
  }

  const size = 1024;
  const canvasA = document.createElement("canvas"); canvasA.width = canvasA.height = size;
  const ctxA = canvasA.getContext("2d")!;
  const canvasR = document.createElement("canvas"); canvasR.width = canvasR.height = size;
  const ctxR = canvasR.getContext("2d")!;
  const canvasN = document.createElement("canvas"); canvasN.width = canvasN.height = size;
  const ctxN = canvasN.getContext("2d")!;
  const canvasAO = document.createElement("canvas"); canvasAO.width = canvasAO.height = size;
  const ctxAO = canvasAO.getContext("2d")!;

  // 1. Base Albedo: Dark aged gunmetal (#1B1815)
  ctxA.fillStyle = "#1B1815";
  ctxA.fillRect(0, 0, size, size);

  // 2. Base Roughness: ~0.35 (rgb 90, 90, 90)
  ctxR.fillStyle = "#5A5A5A";
  ctxR.fillRect(0, 0, size, size);

  // 3. Normal Base (Flat Tangent Space: rgb 128, 128, 255)
  ctxN.fillStyle = "rgb(128, 128, 255)";
  ctxN.fillRect(0, 0, size, size);

  // 4. AO Base
  ctxAO.fillStyle = "#FFFFFF";
  ctxAO.fillRect(0, 0, size, size);

  // Machining Grain & Directional Brushed Scratches (5000 passes)
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 40 + Math.random() * 220;
    const alpha = 0.03 + Math.random() * 0.07;

    // Fine specular scratches
    ctxA.fillStyle =
      Math.random() > 0.45
        ? `rgba(210, 200, 190, ${alpha})`
        : `rgba(10, 8, 6, ${alpha * 1.6})`;
    ctxA.fillRect(x, y, len, 1);

    // Roughness Modulation
    ctxR.fillStyle =
      Math.random() > 0.5
        ? `rgba(255, 255, 255, ${alpha * 2.5})`
        : `rgba(30, 30, 30, ${alpha * 2.5})`;
    ctxR.fillRect(x, y, len, 1);

    // Tangent normal horizontal micro-grooves
    const nx = 128 + (Math.random() - 0.5) * 50;
    const ny = 128 + (Math.random() - 0.5) * 20;
    ctxN.fillStyle = `rgb(${Math.round(nx)}, ${Math.round(ny)}, 255)`;
    ctxN.fillRect(x, y, len, 1);
  }

  // Edge Wear & Scuff Pass (Simulated Curvature)
  for (let i = 0; i < 300; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const r = 2 + Math.random() * 6;
    ctxA.fillStyle = "rgba(180, 170, 160, 0.20)";
    ctxA.beginPath();
    ctxA.arc(cx, cy, r, 0, Math.PI * 2);
    ctxA.fill();

    ctxR.fillStyle = "rgba(40, 40, 40, 0.40)"; // Polished bare steel
    ctxR.beginPath();
    ctxR.arc(cx, cy, r, 0, Math.PI * 2);
    ctxR.fill();
  }

  const createTex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
    t.needsUpdate = true;
    return t;
  };

  return {
    albedoMap: createTex(canvasA),
    roughnessMap: createTex(canvasR),
    normalMap: createTex(canvasN),
    aoMap: createTex(canvasAO),
  };
}

/**
 * Procedural Telemetry Screen Canvas Texture
 */
export function createConsoleScreenTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture(new Image());
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background
  ctx.fillStyle = "#021018";
  ctx.fillRect(0, 0, 512, 512);

  // Grid
  ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
  ctx.lineWidth = 2;
  for (let i = 32; i < 512; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }

  // Outer Border & Corner Brackets
  ctx.strokeStyle = "#00E5FF";
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, 480, 480);

  // Corner Chamfers
  ctx.fillStyle = "#021018";
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillRect(480, 0, 32, 32);
  ctx.fillRect(0, 480, 32, 32);
  ctx.fillRect(480, 480, 32, 32);

  ctx.strokeStyle = "#00E5FF";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 32); ctx.lineTo(32, 0);
  ctx.moveTo(480, 0); ctx.lineTo(512, 32);
  ctx.moveTo(0, 480); ctx.lineTo(32, 512);
  ctx.moveTo(480, 512); ctx.lineTo(512, 480);
  ctx.stroke();

  // Concentric Radar / Biometric Reticle
  ctx.strokeStyle = "#00E5FF";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(256, 210, 110, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(256, 210, 70, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(256, 210, 30, 0, Math.PI * 2); ctx.stroke();

  // Center Reticle Crosshairs & Angle Ticks
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(256, 80); ctx.lineTo(256, 340); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(126, 210); ctx.lineTo(386, 210); ctx.stroke();

  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const x1 = 256 + Math.cos(a) * 110;
    const y1 = 210 + Math.sin(a) * 110;
    const x2 = 256 + Math.cos(a) * 122;
    const y2 = 210 + Math.sin(a) * 122;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  // Telemetry Waveforms & Text Blocks
  ctx.fillStyle = "#00E5FF";
  ctx.font = "bold 24px monospace";
  ctx.fillText("SYS_STAT: LOCKED", 36, 395);
  ctx.font = "bold 20px monospace";
  ctx.fillText("ID: SEC-06 // ACTIVE", 36, 430);
  ctx.fillText("BIO_HASH: [MATCH REQUIRED]", 36, 465);

  // Sine Waveform
  ctx.beginPath();
  ctx.strokeStyle = "#00E5FF";
  ctx.lineWidth = 3;
  for (let x = 36; x < 476; x += 4) {
    const y = 350 + Math.sin(x * 0.08) * 12;
    if (x === 36) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const generateIndustrialPBRTextures = generateMasterDoorMaps;
