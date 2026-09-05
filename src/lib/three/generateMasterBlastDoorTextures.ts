import * as THREE from "three";

export interface DoorPBRMaps {
  albedoMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
  screenTexture: THREE.CanvasTexture;
}

export function generateMasterBlastDoorTextures(): DoorPBRMaps {
  const W = 2048;
  const H = 2048;

  // Fallback for SSR / headless environments
  if (typeof document === "undefined") {
    const dummy = new THREE.CanvasTexture(new Image());
    return {
      albedoMap: dummy,
      normalMap: dummy,
      roughnessMap: dummy,
      aoMap: dummy,
      screenTexture: dummy,
    };
  }

  const hCanvas = document.createElement("canvas");
  hCanvas.width = W;
  hCanvas.height = H;
  const hCtx = hCanvas.getContext("2d")!;

  const aCanvas = document.createElement("canvas");
  aCanvas.width = W;
  aCanvas.height = H;
  const aCtx = aCanvas.getContext("2d")!;

  const rCanvas = document.createElement("canvas");
  rCanvas.width = W;
  rCanvas.height = H;
  const rCtx = rCanvas.getContext("2d")!;

  // 1. Base Dark Gunmetal Setup
  hCtx.fillStyle = "#808080";
  hCtx.fillRect(0, 0, W, H);

  aCtx.fillStyle = "#181512"; // Dark weathered charcoal steel
  aCtx.fillRect(0, 0, W, H);

  rCtx.fillStyle = "#686868"; // ~0.41 Base roughness
  rCtx.fillRect(0, 0, W, H);

  // 2. Outer Stepped Bulkhead Frame Seams
  hCtx.strokeStyle = "#303030";
  hCtx.lineWidth = 20;
  hCtx.strokeRect(60, 60, W - 120, H - 120);
  hCtx.strokeStyle = "#1E1E1E";
  hCtx.lineWidth = 12;
  hCtx.strokeRect(130, 130, W - 260, H - 260);

  // 3. Stamped "06" Decals
  hCtx.font = "900 140px monospace";
  hCtx.fillStyle = "#202020";
  hCtx.fillText("06", W * 0.22, H * 0.36);
  hCtx.fillText("06", W * 0.68, H * 0.36);

  aCtx.font = "900 140px monospace";
  aCtx.fillStyle = "#0C0A08";
  aCtx.fillText("06", W * 0.22, H * 0.36);
  aCtx.fillText("06", W * 0.68, H * 0.36);

  // 4. Horizontal Radiator Louvers
  [H * 0.64, H * 0.67, H * 0.70].forEach((ly) => {
    hCtx.fillStyle = "#181818";
    hCtx.fillRect(W * 0.16, ly, W * 0.24, 22);
    hCtx.fillRect(W * 0.60, ly, W * 0.24, 22);

    aCtx.fillStyle = "#080605";
    aCtx.fillRect(W * 0.16, ly, W * 0.24, 22);
    aCtx.fillRect(W * 0.60, ly, W * 0.24, 22);

    rCtx.fillStyle = "#A0A0A0";
    rCtx.fillRect(W * 0.16, ly, W * 0.24, 22);
    rCtx.fillRect(W * 0.60, ly, W * 0.24, 22);
  });

  // 5. Perimeter Hex Bolt Arrays
  [140, W - 140].forEach((bx) => {
    for (let by = 180; by < H - 180; by += 135) {
      hCtx.fillStyle = "#FFFFFF";
      hCtx.beginPath();
      hCtx.arc(bx, by, 16, 0, Math.PI * 2);
      hCtx.fill();
      hCtx.strokeStyle = "#202020";
      hCtx.lineWidth = 4;
      hCtx.stroke();

      aCtx.fillStyle = "#322A22";
      aCtx.beginPath();
      aCtx.arc(bx, by, 16, 0, Math.PI * 2);
      aCtx.fill();

      rCtx.fillStyle = "#222222"; // Highly polished metallic bolt heads
      rCtx.beginPath();
      rCtx.arc(bx, by, 16, 0, Math.PI * 2);
      rCtx.fill();
    }
  });

  // 6. Brushed Steel Grain & Scuff Passes
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const len = 30 + Math.random() * 220;
    const alpha = 0.025 + Math.random() * 0.06;

    aCtx.fillStyle =
      Math.random() > 0.45
        ? `rgba(220, 210, 200, ${alpha})`
        : `rgba(10, 8, 6, ${alpha * 1.6})`;
    aCtx.fillRect(x, y, len, 1);

    rCtx.fillStyle =
      Math.random() > 0.5
        ? `rgba(255, 255, 255, ${alpha * 3})`
        : `rgba(30, 30, 30, ${alpha * 3})`;
    rCtx.fillRect(x, y, len, 1);
  }

  // 7. Derive Sobel Normal & AO Maps
  const hData = hCtx.getImageData(0, 0, W, H).data;
  const nCanvas = document.createElement("canvas");
  nCanvas.width = W;
  nCanvas.height = H;
  const nCtx = nCanvas.getContext("2d")!;
  const nImg = nCtx.createImageData(W, H);
  const nData = nImg.data;

  const aoCanvas = document.createElement("canvas");
  aoCanvas.width = W;
  aoCanvas.height = H;
  const aoCtx = aoCanvas.getContext("2d")!;
  const aoImg = aoCtx.createImageData(W, H);
  const aoData = aoImg.data;

  const strength = 3.8;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const xL = (y * W + Math.max(0, x - 1)) * 4;
      const xR = (y * W + Math.min(W - 1, x + 1)) * 4;
      const yU = (Math.max(0, y - 1) * W + x) * 4;
      const yD = (Math.min(H - 1, y + 1) * W + x) * 4;

      const dX = (hData[xR] - hData[xL]) / 255.0;
      const dY = (hData[yD] - hData[yU]) / 255.0;

      let nx = -dX * strength;
      let ny = -dY * strength;
      let nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      nData[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      nData[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      nData[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      nData[idx + 3] = 255;

      const hVal = hData[idx] / 255.0;
      const ao = Math.floor(Math.min(255, Math.pow(hVal, 0.7) * 255));
      aoData[idx] = ao;
      aoData[idx + 1] = ao;
      aoData[idx + 2] = ao;
      aoData[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);
  aoCtx.putImageData(aoImg, 0, 0);

  // 8. Glowing Telemetry Screen
  const sCanvas = document.createElement("canvas");
  sCanvas.width = 512;
  sCanvas.height = 512;
  const sCtx = sCanvas.getContext("2d")!;
  sCtx.fillStyle = "#021018";
  sCtx.fillRect(0, 0, 512, 512);

  sCtx.strokeStyle = "rgba(0, 229, 255, 0.2)";
  sCtx.lineWidth = 2;
  for (let i = 32; i < 512; i += 32) {
    sCtx.beginPath();
    sCtx.moveTo(i, 0);
    sCtx.lineTo(i, 512);
    sCtx.stroke();
    sCtx.beginPath();
    sCtx.moveTo(0, i);
    sCtx.lineTo(512, i);
    sCtx.stroke();
  }
  sCtx.strokeStyle = "#00E5FF";
  sCtx.lineWidth = 4;
  sCtx.strokeRect(20, 20, 472, 472);
  sCtx.beginPath();
  sCtx.arc(256, 210, 110, 0, Math.PI * 2);
  sCtx.stroke();
  sCtx.beginPath();
  sCtx.arc(256, 210, 60, 0, Math.PI * 2);
  sCtx.stroke();
  sCtx.beginPath();
  sCtx.moveTo(256, 80);
  sCtx.lineTo(256, 340);
  sCtx.stroke();
  sCtx.beginPath();
  sCtx.moveTo(126, 210);
  sCtx.lineTo(386, 210);
  sCtx.stroke();

  sCtx.beginPath();
  sCtx.lineWidth = 3;
  for (let x = 32; x < 480; x += 6) {
    const y = 370 + Math.sin(x * 0.08) * 16;
    if (x === 32) sCtx.moveTo(x, y);
    else sCtx.lineTo(x, y);
  }
  sCtx.stroke();
  sCtx.fillStyle = "#00E5FF";
  sCtx.font = "bold 24px monospace";
  sCtx.fillText("SYS_LOCK: SEC-06", 40, 430);
  sCtx.fillText("OVERRIDE // READY", 40, 470);

  const wrapTex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    return t;
  };

  return {
    albedoMap: wrapTex(aCanvas),
    normalMap: wrapTex(nCanvas),
    roughnessMap: wrapTex(rCanvas),
    aoMap: wrapTex(aoCanvas),
    screenTexture: wrapTex(sCanvas),
  };
}
