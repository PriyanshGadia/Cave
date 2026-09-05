import * as THREE from "three";

/**
 * Generates procedural multi-layered PBR texture stack for the industrial blast door:
 * - Albedo: Dark weathered gunmetal (#1C1916) with edge scratches and cavity grime
 * - Roughness: ~0.38 base with horizontal machining streaks and micro-scuffs
 * - Normal: Tangent space normal map with fine horizontal brushed metal grain
 * - Ambient Occlusion: Baked cavity occlusion
 */
export function generateIndustrialPBRTextures(): {
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
  const canvasA = document.createElement("canvas");
  canvasA.width = canvasA.height = size;
  const ctxA = canvasA.getContext("2d")!;

  const canvasR = document.createElement("canvas");
  canvasR.width = canvasR.height = size;
  const ctxR = canvasR.getContext("2d")!;

  const canvasN = document.createElement("canvas");
  canvasN.width = canvasN.height = size;
  const ctxN = canvasN.getContext("2d")!;

  const canvasAO = document.createElement("canvas");
  canvasAO.width = canvasAO.height = size;
  const ctxAO = canvasAO.getContext("2d")!;

  // 1. Albedo Base: Dark Aged Charcoal Gunmetal (#1C1916)
  ctxA.fillStyle = "#1C1916";
  ctxA.fillRect(0, 0, size, size);

  // 2. Roughness Base: ~0.38 base roughness (rgb 97, 97, 97)
  ctxR.fillStyle = "#616161";
  ctxR.fillRect(0, 0, size, size);

  // 3. Normal Map Base: Tangent Space (rgb 128, 128, 255)
  ctxN.fillStyle = "rgb(128, 128, 255)";
  ctxN.fillRect(0, 0, size, size);

  // 4. AO Base: White
  ctxAO.fillStyle = "#FFFFFF";
  ctxAO.fillRect(0, 0, size, size);

  // Machining Scratches & Horizontal Brushed Grain
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 35 + Math.random() * 240;
    const alpha = 0.035 + Math.random() * 0.07;

    // Albedo hairline scratch
    ctxA.fillStyle =
      Math.random() > 0.4
        ? `rgba(210, 200, 190, ${alpha})`
        : `rgba(10, 8, 6, ${alpha * 1.6})`;
    ctxA.fillRect(x, y, len, 1 + Math.random() * 1.5);

    // Roughness variation
    ctxR.fillStyle =
      Math.random() > 0.5
        ? `rgba(255, 255, 255, ${alpha * 2.2})`
        : `rgba(0, 0, 0, ${alpha * 2.2})`;
    ctxR.fillRect(x, y, len, 1);

    // Normal horizontal grain perturbation
    const nx = 128 + (Math.random() - 0.5) * 45;
    const ny = 128 + (Math.random() - 0.5) * 20;
    ctxN.fillStyle = `rgb(${Math.round(nx)}, ${Math.round(ny)}, 255)`;
    ctxN.fillRect(x, y, len, 1);
  }

  // Micro-Scratches & Machining Scuffs
  ctxA.strokeStyle = "rgba(220, 210, 200, 0.12)";
  ctxA.lineWidth = 1.5;
  for (let i = 0; i < 180; i++) {
    const x1 = Math.random() * size;
    const y1 = Math.random() * size;
    ctxA.beginPath();
    ctxA.moveTo(x1, y1);
    ctxA.lineTo(
      x1 + (Math.random() - 0.5) * 80,
      y1 + (Math.random() - 0.5) * 35
    );
    ctxA.stroke();
  }

  // Edge Chipping & Micro-Noise
  for (let i = 0; i < 200; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const r = 1.5 + Math.random() * 6;
    ctxA.fillStyle = "rgba(180, 170, 160, 0.18)";
    ctxA.beginPath();
    ctxA.arc(cx, cy, r, 0, Math.PI * 2);
    ctxA.fill();

    ctxR.fillStyle = "rgba(40, 40, 40, 0.4)";
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
 * Renders an active sci-fi cybernetic HUD with concentric reticles, radar grid, and status text.
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

  // Subtle Scanline Grid
  ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
  ctx.lineWidth = 2;
  for (let i = 32; i < 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Outer Border & Corner Tech Brackets
  ctx.strokeStyle = "#00E5FF";
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, 480, 480);

  // Corner Chamfer Cuts
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
