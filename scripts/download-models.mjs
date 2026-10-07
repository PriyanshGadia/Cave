/**
 * scripts/download-models.mjs
 *
 * Downloads and stages verified model binaries for VAULT-01:
 * 1. face_landmarker.task (~3.75 MB, Google MediaPipe Face Landmarker)
 * 2. face_embedding_128.onnx (~38.6 MB, OpenCV Zoo SFace 128-D Face Recognition)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const MODELS = [
  {
    name: 'face_landmarker.task',
    url: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    expectedMinBytes: 3_000_000,
  },
  {
    name: 'face_embedding_128.onnx',
    url: 'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx',
    expectedMinBytes: 30_000_000,
  }
];

async function downloadFile(url, destPath, minBytes) {
  console.log(`Downloading ${url} -> ${destPath}...`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length < minBytes) {
    throw new Error(`Downloaded file size (${buffer.length} bytes) is less than expected (${minBytes} bytes).`);
  }
  fs.writeFileSync(destPath, buffer);
  console.log(`✓ Saved ${destPath} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
  return buffer.length;
}

async function main() {
  const publicModelsDir = path.join(rootDir, 'public', 'models');
  const distModelsDir = path.join(rootDir, 'dist', 'models');

  fs.mkdirSync(publicModelsDir, { recursive: true });
  fs.mkdirSync(distModelsDir, { recursive: true });

  for (const model of MODELS) {
    const pubPath = path.join(publicModelsDir, model.name);
    const distPath = path.join(distModelsDir, model.name);

    if (fs.existsSync(pubPath) && fs.statSync(pubPath).size >= model.expectedMinBytes) {
      console.log(`✓ ${model.name} already exists in public/models (${(fs.statSync(pubPath).size / (1024*1024)).toFixed(2)} MB). Copying to dist/models...`);
      fs.copyFileSync(pubPath, distPath);
    } else {
      await downloadFile(model.url, pubPath, model.expectedMinBytes);
      fs.copyFileSync(pubPath, distPath);
      console.log(`✓ Copied to ${distPath}`);
    }
  }

  console.log('\n✓ All model binaries successfully staged.');
}

main().catch(err => {
  console.error('Download failed:', err);
  process.exit(1);
});
