import React, { useEffect, useRef } from 'react';

interface BiometricScreenCanvasProps {
  isScanning: boolean;
  statusText: string;
  subText: string;
  isSuccess: boolean;
  isGated: boolean;
}

export const BiometricScreenCanvas: React.FC<BiometricScreenCanvasProps> = ({
  isScanning,
  statusText,
  subText,
  isSuccess,
  isGated,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let angle = 0;
    let scanY = 0;
    let scanDirection = 1;

    // Generate 3D facial point-cloud model coordinates
    const facePoints: { x: number; y: number; z: number }[] = [];
    const numLayers = 16;
    for (let l = 0; l < numLayers; l++) {
      const v = (l / (numLayers - 1)) * 2 - 1; // -1 to 1 (top to bottom of face)
      const r = Math.sqrt(Math.max(0, 1 - v * v * 0.75)) * 0.8;
      const pointsInLayer = Math.floor(12 + (1 - Math.abs(v)) * 14);
      for (let p = 0; p < pointsInLayer; p++) {
        const u = (p / pointsInLayer) * Math.PI - Math.PI / 2; // -PI/2 to PI/2 (front face)
        // Add facial feature contours (nose ridge, cheekbones, jaw curve)
        let noseFactor = 1.0;
        if (Math.abs(u) < 0.35 && v > -0.2 && v < 0.3) {
          noseFactor = 1.25; // Nose bridge
        }
        if (Math.abs(u) > 0.45 && v > -0.3 && v < 0.1) {
          noseFactor = 1.12; // Cheekbones
        }
        facePoints.push({
          x: Math.sin(u) * r * noseFactor * 55,
          y: v * 70,
          z: Math.cos(u) * r * noseFactor * 55,
        });
      }
    }

    const render = () => {
      ctx.fillStyle = '#060a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2 - 10;

      // Draw subtle background grid & telemetry crosshairs
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 16;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw target reticle brackets
      ctx.strokeStyle = isSuccess
        ? 'rgba(0, 255, 102, 0.7)'
        : isGated
        ? 'rgba(255, 158, 44, 0.7)'
        : 'rgba(0, 243, 255, 0.5)';
      ctx.lineWidth = 1.5;

      const retSize = 65;
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(cx - retSize, cy - retSize + 15);
      ctx.lineTo(cx - retSize, cy - retSize);
      ctx.lineTo(cx - retSize + 15, cy - retSize);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(cx + retSize - 15, cy - retSize);
      ctx.lineTo(cx + retSize, cy - retSize);
      ctx.lineTo(cx + retSize, cy - retSize + 15);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(cx - retSize, cy + retSize - 15);
      ctx.lineTo(cx - retSize, cy + retSize);
      ctx.lineTo(cx - retSize + 15, cy + retSize);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(cx + retSize - 15, cy + retSize);
      ctx.lineTo(cx + retSize, cy + retSize);
      ctx.lineTo(cx + retSize, cy + retSize - 15);
      ctx.stroke();

      // Rotate and project 3D facial point cloud
      angle += isScanning ? 0.03 : 0.01;
      const cosA = Math.cos(angle * 0.4);
      const sinA = Math.sin(angle * 0.4);

      const projected: { px: number; py: number; pz: number; origY: number }[] = [];

      for (const pt of facePoints) {
        // Rotate around Y axis
        const rx = pt.x * cosA - pt.z * sinA;
        const rz = pt.x * sinA + pt.z * cosA;
        const ry = pt.y;

        // Perspective projection
        const scale = 200 / (200 + rz);
        const px = cx + rx * scale;
        const py = cy + ry * scale;

        projected.push({ px, py, pz: rz, origY: pt.y });
      }

      // Draw wireframe connection lines between adjacent nodes
      ctx.strokeStyle = isSuccess
        ? 'rgba(0, 255, 102, 0.22)'
        : isGated
        ? 'rgba(255, 158, 44, 0.22)'
        : 'rgba(0, 243, 255, 0.18)';
      ctx.lineWidth = 0.75;

      for (let i = 0; i < projected.length - 1; i++) {
        if (Math.abs(projected[i].origY - projected[i + 1].origY) < 12) {
          ctx.beginPath();
          ctx.moveTo(projected[i].px, projected[i].py);
          ctx.lineTo(projected[i + 1].px, projected[i + 1].py);
          ctx.stroke();
        }
      }

      // Draw point-cloud vertices with depth-based brightness
      for (const p of projected) {
        const depthAlpha = Math.max(0.2, (p.pz + 50) / 100);
        ctx.fillStyle = isSuccess
          ? `rgba(0, 255, 102, ${depthAlpha})`
          : isGated
          ? `rgba(255, 158, 44, ${depthAlpha})`
          : `rgba(0, 243, 255, ${depthAlpha})`;

        ctx.fillRect(p.px - 1, p.py - 1, 2, 2);
      }

      // Scanning Laser Sweep Line
      if (isScanning) {
        scanY += scanDirection * 2.5;
        if (scanY > cy + retSize) {
          scanY = cy + retSize;
          scanDirection = -1;
        } else if (scanY < cy - retSize) {
          scanY = cy - retSize;
          scanDirection = 1;
        }

        const grad = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
        grad.addColorStop(0, 'rgba(0, 243, 255, 0)');
        grad.addColorStop(0.5, 'rgba(0, 243, 255, 0.85)');
        grad.addColorStop(1, 'rgba(0, 243, 255, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(cx - retSize - 10, scanY - 6, (retSize + 10) * 2, 12);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - retSize - 5, scanY);
        ctx.lineTo(cx + retSize + 5, scanY);
        ctx.stroke();
      }

      // Live Telemetry Text Overlays
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = isSuccess
        ? '#00ff66'
        : isGated
        ? '#ff9e2c'
        : '#00f3ff';

      ctx.fillText(`SYS // ${statusText.toUpperCase()}`, 12, 20);

      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.fillText(`TELEMETRY: ${subText}`, 12, 34);

      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(0, 243, 255, 0.6)';
      ctx.fillText(`NODES: 128-D`, canvas.width - 12, 20);
      ctx.fillText(`FPS: 60`, canvas.width - 12, 34);

      // Bottom Status Pill
      ctx.textAlign = 'center';
      ctx.fillStyle = isSuccess
        ? 'rgba(0, 255, 102, 0.9)'
        : isGated
        ? 'rgba(255, 158, 44, 0.9)'
        : 'rgba(0, 243, 255, 0.8)';
      ctx.font = '11px "Space Grotesk", sans-serif';
      ctx.fillText(
        isSuccess
          ? '● CLEARANCE GRANTED // BLAST DOOR UNLOCKED'
          : isGated
          ? '▲ BIPA RESTRICTED // MAGIC LINK READY'
          : isScanning
          ? '◐ EXTRACTING MATHEMATICAL EMBEDDING...'
          : '◆ READY // SELECT ACTION BELOW',
        canvas.width / 2,
        canvas.height - 12
      );

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animFrameId);
  }, [isScanning, statusText, subText, isSuccess, isGated]);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={240}
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        borderRadius: '2px',
        border: '1px solid rgba(0, 243, 255, 0.3)',
        boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.9)',
      }}
    />
  );
};
