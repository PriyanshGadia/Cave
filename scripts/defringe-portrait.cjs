const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function defringe() {
  const inputPath = path.join(__dirname, '..', 'public', 'priyansh.webp');
  const outputPath = path.join(__dirname, '..', 'public', 'priyansh-clean.webp');

  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels; // 4 (RGBA)

  // Copy buffer
  const out = Buffer.from(data);

  // Defringe algorithm:
  // For pixels with alpha between 1 and 250:
  // If the RGB is light (e.g. R,G,B > 180) and surrounded by opaque hair/cloth,
  // or simply if alpha is low, we push the color of edge pixels towards the nearest opaque pixel's color,
  // preventing the white halo.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];

      if (a > 0 && a < 250) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;

        // Find nearest solid pixel (alpha > 240) in a 3x3 window
        let bestDist = 999;
        let bestR = r, bestG = g, bestB = b;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const ni = (ny * width + nx) * 4;
              if (data[ni + 3] > 240) {
                const dist = Math.hypot(dx, dy);
                if (dist < bestDist) {
                  bestDist = dist;
                  bestR = data[ni];
                  bestG = data[ni + 1];
                  bestB = data[ni + 2];
                }
              }
            }
          }
        }

        // If the edge pixel was contaminated by white background (brightness > 160)
        // and the interior pixel is darker, blend color toward interior pixel
        const interiorBrightness = (bestR + bestG + bestB) / 3;
        if (brightness > interiorBrightness + 30) {
          out[i] = bestR;
          out[i + 1] = bestG;
          out[i + 2] = bestB;
        }

        // Slight alpha trim on very faint edge pixels (< 40)
        if (a < 35 && brightness > 200) {
          out[i + 3] = 0;
        }
      }
    }
  }

  await sharp(out, { raw: { width, height, channels } })
    .webp({ quality: 95, lossless: true })
    .toFile(outputPath);

  console.log('Defringed image written to:', outputPath);
}

defringe().catch(console.error);
