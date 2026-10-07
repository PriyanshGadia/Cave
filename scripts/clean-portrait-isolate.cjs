const sharp = require('sharp');
const path = require('path');

async function cleanIsolate() {
  const inputPath = path.join(__dirname, '..', 'public', 'priyansh.webp');
  const outputPath = path.join(__dirname, '..', 'public', 'priyansh-clean.webp');

  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // 1. Identify solid core pixels (alpha > 120)
  // Find the largest connected component (Priyansh's body)
  const visited = new Uint8Array(w * h);
  const labels = new Int32Array(w * h);
  let currentLabel = 0;
  const componentSizes = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const alpha = data[idx * 4 + 3];

      if (alpha > 80 && !visited[idx]) {
        currentLabel++;
        let size = 0;
        const queue = [idx];
        visited[idx] = 1;
        labels[idx] = currentLabel;

        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          size++;
          const cy = Math.floor(curr / w);
          const cx = curr % w;

          // 4-connected neighbors
          const neighbors = [
            [cx - 1, cy],
            [cx + 1, cy],
            [cx, cy - 1],
            [cx, cy + 1]
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nidx = ny * w + nx;
              if (!visited[nidx] && data[nidx * 4 + 3] > 80) {
                visited[nidx] = 1;
                labels[nidx] = currentLabel;
                queue.push(nidx);
              }
            }
          }
        }
        componentSizes[currentLabel] = size;
      }
    }
  }

  // Find the label of the largest component (the body)
  let maxLabel = 1;
  let maxSize = 0;
  for (let l = 1; l <= currentLabel; l++) {
    if (componentSizes[l] > maxSize) {
      maxSize = componentSizes[l];
      maxLabel = l;
    }
  }

  console.log(`Found ${currentLabel} components. Main body label ${maxLabel} has ${maxSize} pixels.`);

  // 2. Clear out any pixels that are not part of the main body (removes all stray noise speckles!)
  const out = Buffer.from(data);

  // Dilate the main body mask by 3 pixels to retain soft edge anti-aliasing
  const bodyMask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (labels[i] === maxLabel) {
      bodyMask[i] = 1;
    }
  }

  const dilatedMask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let isNearBody = false;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            if (bodyMask[ny * w + nx]) {
              isNearBody = true;
              break;
            }
          }
        }
        if (isNearBody) break;
      }
      dilatedMask[y * w + x] = isNearBody ? 1 : 0;
    }
  }

  // Zero out all pixels outside the dilated body mask
  let strayCleared = 0;
  for (let i = 0; i < w * h; i++) {
    if (!dilatedMask[i]) {
      if (out[i * 4 + 3] > 0) strayCleared++;
      out[i * 4 + 3] = 0;
      out[i * 4] = 0;
      out[i * 4 + 1] = 0;
      out[i * 4 + 2] = 0;
    }
  }
  console.log(`Cleared ${strayCleared} stray noise pixels from background.`);

  // 3. Defringe hair and outer edges:
  // For pixels with 0 < alpha < 240, if they are contaminated with white (brightness > 140),
  // clamp color towards nearest solid interior pixel
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      const a = out[idx + 3];

      if (a > 0 && a < 240) {
        const r = out[idx];
        const g = out[idx + 1];
        const b = out[idx + 2];
        const brightness = (r + g + b) / 3;

        // Sample solid interior pixels
        let solidR = 0, solidG = 0, solidB = 0, solidCount = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              const nidx = (ny * w + nx) * 4;
              if (out[nidx + 3] > 245) {
                solidR += out[nidx];
                solidG += out[nidx + 1];
                solidB += out[nidx + 2];
                solidCount++;
              }
            }
          }
        }

        if (solidCount > 0) {
          const avgR = solidR / solidCount;
          const avgG = solidG / solidCount;
          const avgB = solidB / solidCount;
          const solidBrightness = (avgR + avgG + avgB) / 3;

          // If edge pixel is brighter than interior (white background bleed)
          if (brightness > solidBrightness + 25) {
            out[idx] = Math.round(avgR);
            out[idx + 1] = Math.round(avgG);
            out[idx + 2] = Math.round(avgB);
          }
        }

        // Feather ultra-faint edge pixels to zero
        if (a < 30) {
          out[idx + 3] = 0;
        }
      }
    }
  }

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 95, lossless: true })
    .toFile(outputPath);

  console.log('Saved pristine clean portrait to:', outputPath);
}

cleanIsolate().catch(console.error);
