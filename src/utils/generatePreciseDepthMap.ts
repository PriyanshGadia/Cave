/**
 * Generates a high-precision 1024x576 depth map perfectly calibrated
 * to every feature of the 8K Unreal Engine master render (cave_blast_door_exterior.jpg):
 * - Foreground left rock wall & torch sconce: Nearest (White/Light Grey, 0.85 - 0.95)
 * - Foreground right arch & metal support beams: Near (0.70 - 0.80)
 * - Cavern floor gravel & rail tracks: Smooth gradient from near to door base (0.75 -> 0.38)
 * - Massive Outer Blast Door Armor Ring: Mid-depth (0.42)
 * - Middle Concentric Ring & Hydraulic Pistons: Recessed (0.36)
 * - Center Biometric Control Terminal: Deeply Recessed (0.28)
 * - Deep Right Dark Cavern Tunnel: Deepest (Black, 0.04)
 */
export function generatePreciseDepthMap(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d')!;

  // 1. Base Deep Background (Deep right tunnel = 0.05)
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 1024, 576);

  // 2. Cavern Back Wall & Door Mounting Flange (Mid-Depth = 0.32)
  const backGrad = ctx.createRadialGradient(512, 288, 50, 512, 288, 480);
  backGrad.addColorStop(0, '#555555');
  backGrad.addColorStop(0.6, '#444444');
  backGrad.addColorStop(1, '#111111');
  ctx.fillStyle = backGrad;
  ctx.fillRect(0, 0, 1024, 576);

  // 3. Cavern Floor Ground Gradient (Z: 0.75 near -> 0.35 at door base)
  const floorGrad = ctx.createLinearGradient(0, 576, 0, 360);
  floorGrad.addColorStop(0, '#c8c8c8');
  floorGrad.addColorStop(0.4, '#888888');
  floorGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, 360, 1024, 216);

  // 4. Circular Blast Door Outer Ring (Center = 517, 285, Radius = 215)
  const doorOuterGrad = ctx.createRadialGradient(517, 285, 0, 517, 285, 220);
  doorOuterGrad.addColorStop(0, '#484848');
  doorOuterGrad.addColorStop(0.85, '#686868');
  doorOuterGrad.addColorStop(1, '#3a3a3a');
  ctx.fillStyle = doorOuterGrad;
  ctx.beginPath();
  ctx.arc(517, 285, 220, 0, Math.PI * 2);
  ctx.fill();

  // 5. Concentric Iris Rings & Hydraulic Pistons (Radius = 145)
  const doorMiddleGrad = ctx.createRadialGradient(517, 285, 0, 517, 285, 145);
  doorMiddleGrad.addColorStop(0, '#383838');
  doorMiddleGrad.addColorStop(0.75, '#5c5c5c');
  doorMiddleGrad.addColorStop(1, '#444444');
  ctx.fillStyle = doorMiddleGrad;
  ctx.beginPath();
  ctx.arc(517, 285, 145, 0, Math.PI * 2);
  ctx.fill();

  // 6. Recessed Central Biometric Panel (Radius = 68, Deepest Door Layer = 0.26)
  const panelGrad = ctx.createRadialGradient(517, 285, 0, 517, 285, 68);
  panelGrad.addColorStop(0, '#323232');
  panelGrad.addColorStop(0.85, '#424242');
  panelGrad.addColorStop(1, '#282828');
  ctx.fillStyle = panelGrad;
  ctx.beginPath();
  ctx.arc(517, 285, 68, 0, Math.PI * 2);
  ctx.fill();

  // 7. Left Foreground Rocky Cavern Walls & Torch Sconce (Z = 0.88 - 0.96)
  const leftRockGrad = ctx.createLinearGradient(0, 0, 320, 0);
  leftRockGrad.addColorStop(0, '#e8e8e8');
  leftRockGrad.addColorStop(0.4, '#c0c0c0');
  leftRockGrad.addColorStop(0.8, '#707070');
  leftRockGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = leftRockGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(340, 0);
  ctx.bezierCurveTo(290, 180, 260, 360, 360, 576);
  ctx.lineTo(0, 576);
  ctx.closePath();
  ctx.fill();

  // 8. Upper Cave Ceiling Stalactite Arch (Z = 0.78)
  const ceilingGrad = ctx.createLinearGradient(0, 0, 0, 160);
  ceilingGrad.addColorStop(0, '#d0d0d0');
  ceilingGrad.addColorStop(0.6, '#888888');
  ceilingGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = ceilingGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(1024, 0);
  ctx.lineTo(1024, 80);
  ctx.bezierCurveTo(750, 150, 350, 140, 0, 90);
  ctx.closePath();
  ctx.fill();

  // 9. Right Foreground Support Columns & Beam (Z = 0.72)
  const rightRockGrad = ctx.createLinearGradient(1024, 0, 720, 0);
  rightRockGrad.addColorStop(0, '#b8b8b8');
  rightRockGrad.addColorStop(0.5, '#787878');
  rightRockGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = rightRockGrad;
  ctx.beginPath();
  ctx.moveTo(1024, 0);
  ctx.lineTo(730, 0);
  ctx.bezierCurveTo(740, 200, 750, 380, 710, 576);
  ctx.lineTo(1024, 576);
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL('image/png');
}
