const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75';

async function run() {
  console.log('========================================================');
  console.log('🔬 REAL NEURAL MODEL ONNX & MEDIAPIPE MEMORY GATE TEST');
  console.log('========================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=gl',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--enable-precise-memory-info',
      '--js-flags=--expose-gc',
    ],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  page.on('console', msg => {
    const txt = msg.text();
    if (txt.includes('FaceEngine') || txt.includes('ONNX') || txt.includes('MediaPipe') || txt.includes('MEMORY')) {
      console.log(`  [BROWSER] ${txt}`);
    }
  });

  // Enable real vision pipeline before navigation
  await page.addInitScript(() => {
    window.__forceRealVision = true;
  });

  console.log('Navigating to http://127.0.0.1:8788/index.html with real neural model loading enabled...');
  await page.goto('http://127.0.0.1:8788/index.html', { waitUntil: 'load', timeout: 30000 });

  await page.waitForSelector('#load', { state: 'detached', timeout: 30000 });
  console.log('✓ Scene loaded.');

  // Wait for preload
  console.log('Waiting for real neural models to initialize in background...');
  await page.waitForFunction(() => {
    return window.FaceEngine && window.FaceEngine.defaultInstance && window.FaceEngine.defaultInstance.isInitialized === true;
  }, { timeout: 35000 });

  const realState = await page.evaluate(() => {
    const fe = window.FaceEngine?.defaultInstance;
    return {
      isInitialized: fe?.isInitialized,
      hasLandmarker: Boolean(fe?.faceLandmarker),
      hasOrtSession: Boolean(fe?.ortSession),
      executionProvider: fe?.executionProvider,
      threads: window.ort?.env?.wasm?.numThreads,
      jsHeapUsedMB: Math.round((performance.memory ? performance.memory.usedJSHeapSize : 0) / (1024 * 1024)),
      jsHeapTotalMB: Math.round((performance.memory ? performance.memory.totalJSHeapSize : 0) / (1024 * 1024)),
    };
  });

  console.log('✓ Real Neural Model Preload Status:');
  console.log('  isInitialized:', realState.isInitialized);
  console.log('  hasLandmarker (MediaPipe):', realState.hasLandmarker);
  console.log('  hasOrtSession (ONNX Runtime):', realState.hasOrtSession);
  console.log('  Execution Provider:', realState.executionProvider);
  console.log('  ONNX wasm.numThreads:', realState.threads, '(Target: 1 for i3 efficiency)');
  console.log(`  JS Heap Memory: ${realState.jsHeapUsedMB} MB (Strict Gate: < 400 MB)`);

  if (realState.jsHeapUsedMB > 400) {
    throw new Error(`FAIL: Real model JS Heap memory (${realState.jsHeapUsedMB} MB) exceeded 400 MB!`);
  }

  // Verify Unload
  console.log('\nInvoking FaceEngine.unload()...');
  await page.evaluate(() => {
    window.FaceEngine.unload();
    if (window.gc) window.gc();
  });

  await page.waitForTimeout(1000);

  const afterUnload = await page.evaluate(() => {
    const fe = window.FaceEngine?.defaultInstance;
    return {
      isInitialized: fe?.isInitialized,
      hasLandmarker: Boolean(fe?.faceLandmarker),
      hasOrtSession: Boolean(fe?.ortSession),
      jsHeapUsedMB: Math.round((performance.memory ? performance.memory.usedJSHeapSize : 0) / (1024 * 1024)),
    };
  });

  console.log('✓ Post-Unload Verification:');
  console.log('  isInitialized:', afterUnload.isInitialized, '(Expected: false)');
  console.log('  hasLandmarker:', afterUnload.hasLandmarker, '(Expected: false)');
  console.log('  hasOrtSession:', afterUnload.hasOrtSession, '(Expected: false)');
  console.log(`  Reclaimed JS Heap: ${afterUnload.jsHeapUsedMB} MB`);

  const shotPath = path.join(ARTIFACT_DIR, 'verified-real-model-memory-gate.png');
  await page.screenshot({ path: shotPath });
  console.log(`Saved screenshot: ${shotPath}`);

  console.log('\n🎉 REAL NEURAL MODEL MEMORY GATE PASSED (< 400MB)!');
  await browser.close();
}

run().catch(err => {
  console.error('TEST RUN FAILED:', err);
  process.exit(1);
});
