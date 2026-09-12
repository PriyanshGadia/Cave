// scripts/capture-ls1-real-macro.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ART = 'C:/Users/gadia/.gemini/antigravity-ide/brain/694bd3af-9386-4a86-8cb6-98cd73f0a84a';
const PUB = path.join(process.cwd(), 'public/screenshots');

function save(name, buf) {
  const artPath = path.join(ART, name);
  const pubPath = path.join(PUB, name);
  fs.writeFileSync(artPath, buf);
  try { fs.writeFileSync(pubPath, buf); } catch {}
  console.log('  -> Saved artifact:', artPath);
  return artPath;
}

async function run() {
  console.log('=== [LS1 REAL MACRO & INSTRUMENTATION CAPTURE] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const consoleLogs = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      consoleWarnings.push(text);
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });

  await page.evaluate(() => {
    if (window.__lab && typeof window.__lab.skipToFinal === 'function') {
      window.__lab.skipToFinal();
    }
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(2000);

  // Literal live FPS sampling across 60 animation frames
  console.log('2. Sampling live FPS across 60 rendered frames in browser runtime...');
  const fpsMeasurement = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frameCount = 0;
      let startTime = performance.now();
      const frameDeltas = [];
      let lastTime = startTime;

      function sampleFrame(now) {
        const delta = now - lastTime;
        lastTime = now;
        frameDeltas.push(delta);
        frameCount++;

        if (frameCount < 60) {
          requestAnimationFrame(sampleFrame);
        } else {
          const totalDuration = now - startTime;
          const avgFps = (frameCount / (totalDuration / 1000));
          const minDelta = Math.min(...frameDeltas.slice(1));
          const maxDelta = Math.max(...frameDeltas.slice(1));
          resolve({
            sampleCount: frameCount,
            totalDurationMs: +totalDuration.toFixed(2),
            avgFps: +avgFps.toFixed(2),
            minFrameTimeMs: +minDelta.toFixed(2),
            maxFrameTimeMs: +maxDelta.toFixed(2)
          });
        }
      }
      requestAnimationFrame(sampleFrame);
    });
  });

  // Literal network resource scan across all performance entries
  console.log('3. Scanning all loaded network resources for forbidden raster image files (.png/.jpg/.webp/.glb)...');
  const resourceScan = await page.evaluate(() => {
    const allResources = window.performance.getEntriesByType('resource').map(r => ({
      name: r.name,
      initiatorType: r.initiatorType,
      transferSize: r.transferSize
    }));
    const rasterMatches = allResources.filter(r => /\.(png|jpg|jpeg|webp|gif|svg|hdr|glb|gltf)($|\?)/i.test(r.name));
    return {
      totalResourceCount: allResources.length,
      rasterAssetCount: rasterMatches.length,
      rasterMatches,
      dpr: window.devicePixelRatio
    };
  });

  console.log('\n--- LITERAL INSTRUMENTATION LOG OUTPUT ---');
  console.log('FPS Sampling Results:', JSON.stringify(fpsMeasurement, null, 2));
  console.log('Resource Scan Results:', JSON.stringify(resourceScan, null, 2));
  console.log('Console Warning Count:', consoleWarnings.length);
  console.log('-------------------------------------------\n');

  // Shot 1: Genuine Macro Shot configured via custom off-axis dolly vector
  console.log('4. Configuring off-axis macro camera dolly on Sector LS1 mounting base and titanium posts...');
  await page.evaluate(() => {
    const THREE = window.THREE;
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);

    // Register distinct macro dolly vector in FOCUS_CFG
    window.__lab.sectorGroups['LS1_MACRO'] = g;
    // Set custom macro camera pose: 45° offset looking down-left directly at base rail and post anchors
    const localPos = new THREE.Vector3(0.52, 0.32, 0.42);
    const localLook = new THREE.Vector3(0.0, 0.14, 0.0);
    const pos = g.localToWorld(localPos);
    const look = g.localToWorld(localLook);

    window.__lab.camera.position.copy(pos);
    window.__lab.camera.lookAt(look);

    // Lock FOCUS interpolation to this exact macro position
    const focusState = window.__lab.state;
    // We can hook the render loop or set focus active with zero delta
    const origUpdate = window.__lab.update;
    window.__lab.update = function(dt) {
      origUpdate.call(this, dt);
      window.__lab.camera.position.copy(pos);
      window.__lab.camera.lookAt(look);
    };
  });
  await page.waitForTimeout(600);
  console.log('5. Capturing Genuine Macro Assembly View (audit_ls1_real_macro_assembly.png)...');
  save('audit_ls1_real_macro_assembly.png', await page.screenshot());

  await browser.close();
  console.log('\n=== [LS1 REAL MACRO CAPTURE COMPLETE] ===\n');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
