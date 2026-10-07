/**
 * scripts/stage-vendor-runtimes.mjs
 *
 * Stages local WebAssembly and runtime binaries for:
 * 1. Google MediaPipe Tasks Vision (@mediapipe/tasks-vision)
 * 2. ONNX Runtime Web (onnxruntime-web)
 *
 * Directs them to public/vendor/ and dist/vendor/ so runtime inference
 * has zero external CDN dependencies and zero raster image violations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function stage() {
  console.log('Staging MediaPipe Tasks Vision...');
  const mpSrc = path.join(rootDir, 'node_modules', '@mediapipe', 'tasks-vision');
  const mpTargets = [
    path.join(rootDir, 'public', 'vendor', 'mediapipe'),
    path.join(rootDir, 'dist', 'vendor', 'mediapipe'),
  ];

  for (const target of mpTargets) {
    fs.mkdirSync(target, { recursive: true });
    // Copy vision_bundle.mjs
    fs.copyFileSync(
      path.join(mpSrc, 'vision_bundle.mjs'),
      path.join(target, 'vision_bundle.mjs')
    );
    // Copy wasm folder
    copyDir(path.join(mpSrc, 'wasm'), path.join(target, 'wasm'));
    console.log(`✓ Staged MediaPipe to ${target}`);
  }

  console.log('Staging ONNX Runtime Web...');
  const ortSrc = path.join(rootDir, 'node_modules', 'onnxruntime-web', 'dist');
  const ortTargets = [
    path.join(rootDir, 'public', 'vendor', 'ort'),
    path.join(rootDir, 'dist', 'vendor', 'ort'),
  ];

  for (const target of ortTargets) {
    fs.mkdirSync(target, { recursive: true });
    copyDir(ortSrc, target);
    console.log(`✓ Staged ONNX Runtime Web to ${target}`);
  }

  console.log('\n✓ Vendor runtimes successfully staged in public and dist.');
}

stage();
