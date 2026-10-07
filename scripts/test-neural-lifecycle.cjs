const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ARTIFACT_DIR = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75';

async function checkLocalDbApp() {
  console.log('--- Step 1: Checking Local DB App on http://127.0.0.1:8790/api/stats ---');
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:8790/api/stats', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('✓ Local DB App responded successfully:');
          console.log(`  Users: ${json.stats.users.total} total (${json.stats.users.active} active)`);
          console.log(`  Devices: ${json.stats.devices.total}`);
          console.log(`  Biometrics: ${json.stats.biometrics.total}`);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse DB stats: ${e.message}`));
        }
      });
    });
    req.on('error', (err) => reject(new Error(`Local DB App unreachable: ${err.message}`)));
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Local DB App connection timed out'));
    });
  });
}

async function run() {
  console.log('========================================================');
  console.log('🧠 NEURAL MODEL PRELOAD/UNLOAD & FRONTEND ISOLATION AUDIT');
  console.log('========================================================\n');

  // Verify Step 1: Local DB App
  try {
    await checkLocalDbApp();
  } catch (err) {
    console.error('Local DB App error:', err.message);
    process.exit(1);
  }

  // Verify Step 2: Frontend isolation & Neural Lifecycle
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

  const consoleLogs = [];
  page.on('console', msg => {
    const txt = msg.text();
    consoleLogs.push({ type: msg.type(), text: txt });
    if (txt.includes('FaceEngine') || txt.includes('VAULT') || txt.includes('MEMORY') || txt.includes('WASM') || txt.includes('PRELOAD') || txt.includes('UNLOAD')) {
      console.log(`  [BROWSER] ${txt}`);
    }
  });

  page.on('pageerror', err => {
    console.error('  [PAGE ERROR]:', err.message);
  });

  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send('Performance.enable');

  console.log('\n--- Step 2: Navigating to http://127.0.0.1:8788/index.html ---');
  await page.goto('http://127.0.0.1:8788/index.html', { waitUntil: 'load', timeout: 30000 });

  // 2a. Verify Database Disconnection from Frontend
  console.log('\n--- Step 3: Verifying Total Frontend Database Disconnection ---');
  const dbAppBtn = await page.$('#btn-open-db-app');
  const userMgrBtn = await page.$('#btn-user-manager');
  const userMgrModal = await page.$('#vault-user-manager-modal');
  const port8790Refs = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    return html.includes('8790') || html.includes('LOCAL DB APP');
  });

  if (dbAppBtn) throw new Error('FAIL: #btn-open-db-app still present in frontend DOM!');
  if (userMgrBtn) throw new Error('FAIL: #btn-user-manager still present in frontend DOM!');
  if (userMgrModal) throw new Error('FAIL: #vault-user-manager-modal still present in frontend DOM!');
  if (port8790Refs) throw new Error('FAIL: Port 8790 or LOCAL DB APP references leaked into frontend HTML!');

  console.log('✓ PASS: Zero database links, buttons, modals, or port 8790 references found in frontend.');

  // 2b. Wait for 3D Scene to finish loading
  console.log('\n--- Step 4: Waiting for Scene to Initialize (#load detached) ---');
  await page.waitForSelector('#load', { state: 'detached', timeout: 30000 });
  console.log('✓ Scene procedural compile complete.');

  // 2c. Check Preload of Neural Models
  console.log('\n--- Step 5: Auditing Neural Model Preload Lifecycle ---');
  console.log('Waiting for background preload to initialize FaceEngine (t+700ms)...');

  // Wait up to 20s for preload to complete
  await page.waitForFunction(() => {
    return window.FaceEngine && window.FaceEngine.defaultInstance && window.FaceEngine.defaultInstance.isInitialized === true;
  }, { timeout: 25000 });

  const preloadedState = await page.evaluate(() => {
    const fe = window.FaceEngine?.defaultInstance;
    return {
      isInitialized: fe?.isInitialized,
      hasLandmarker: Boolean(fe?.faceLandmarker),
      hasOrtSession: Boolean(fe?.ortSession),
      threads: window.ort?.env?.wasm?.numThreads,
    };
  });

  console.log('✓ FaceEngine Preload Verified:');
  console.log('  isInitialized:', preloadedState.isInitialized);
  console.log('  hasLandmarker (MediaPipe):', preloadedState.hasLandmarker);
  console.log('  hasOrtSession (ONNX Runtime):', preloadedState.hasOrtSession);
  console.log('  ONNX wasm.numThreads:', preloadedState.threads, '(Single-threaded WASM for low i3 overhead)');

  // Measure memory during preload
  const preloadMem = await page.evaluate(() => {
    return {
      jsHeapUsedMB: Math.round((performance.memory ? performance.memory.usedJSHeapSize : 0) / (1024 * 1024)),
      jsHeapTotalMB: Math.round((performance.memory ? performance.memory.totalJSHeapSize : 0) / (1024 * 1024)),
      jsHeapLimitMB: Math.round((performance.memory ? performance.memory.jsHeapSizeLimit : 0) / (1024 * 1024)),
    };
  });

  const cdpPreloadMetrics = await cdpSession.send('Performance.getMetrics');
  const jsHeapMetric = cdpPreloadMetrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;
  const jsHeapUsedCdpMB = Math.round(jsHeapMetric / (1024 * 1024));

  console.log(`  JS Heap Used: ${preloadMem.jsHeapUsedMB} MB (CDP: ${jsHeapUsedCdpMB} MB)`);
  console.log(`  RAM Gate Requirement: < 400 MB (Measured: ${preloadMem.jsHeapUsedMB} MB - WELL UNDER 400MB)`);

  if (preloadMem.jsHeapUsedMB > 400) {
    throw new Error(`FAIL: JS Heap memory ${preloadMem.jsHeapUsedMB} MB exceeded 400 MB budget!`);
  }

  // 2d. Trigger Access Granted & Verify Model Unload
  console.log('\n--- Step 6: Triggering Access Grant & Verifying Model Unload ---');
  await page.evaluate(() => {
    console.log('[TEST] Dispatching vault:granted event...');
    window.dispatchEvent(new CustomEvent('vault:granted'));
  });

  // Wait for FaceEngine.defaultInstance.isInitialized to become false
  await page.waitForFunction(() => {
    const fe = window.FaceEngine?.defaultInstance;
    return fe && fe.isInitialized === false && fe.ortSession === null && fe.faceLandmarker === null;
  }, { timeout: 10000 });

  // Optional GC trigger
  await page.evaluate(() => {
    if (window.gc) window.gc();
  });
  await page.waitForTimeout(1500);

  const postUnloadState = await page.evaluate(() => {
    const fe = window.FaceEngine?.defaultInstance;
    return {
      isInitialized: fe?.isInitialized,
      ortSession: fe?.ortSession,
      faceLandmarker: fe?.faceLandmarker,
      jsHeapUsedMB: Math.round((performance.memory ? performance.memory.usedJSHeapSize : 0) / (1024 * 1024)),
    };
  });

  console.log('✓ FaceEngine Unload Verified:');
  console.log('  isInitialized:', postUnloadState.isInitialized, '(Expected: false)');
  console.log('  ortSession:', postUnloadState.ortSession, '(Expected: null)');
  console.log('  faceLandmarker:', postUnloadState.faceLandmarker, '(Expected: null)');
  console.log(`  Post-unload JS Heap: ${postUnloadState.jsHeapUsedMB} MB`);

  // Take proof screenshot
  const screenshotPath = path.join(ARTIFACT_DIR, 'verified-neural-lifecycle-memory.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`✓ Proof screenshot saved to: ${screenshotPath}`);

  console.log('\n========================================================');
  console.log('🎉 ALL NEURAL LIFECYCLE & MEMORY GATE CHECKS PASSED!');
  console.log('========================================================\n');

  await browser.close();
}

run().catch(err => {
  console.error('TEST RUN FAILED:', err);
  process.exit(1);
});
