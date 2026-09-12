// scripts/verify-gate-b1.cjs
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
  console.log('  -> Saved:', artPath);
  return artPath;
}

async function run() {
  console.log('=== [GATE B-1 IDENTITY MESH VERIFICATION SUITE] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  const consoleLogs = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      if (!text.includes('favicon') && !text.includes('downloadable font')) consoleWarnings.push(text);
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
  await page.evaluate(async () => {
    try { await document.fonts?.ready; } catch {}
  });

  await page.evaluate(() => {
    if (window.__lab?.skipToFinal) window.__lab.skipToFinal();
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';

    // Hook update function to allow exact camera control
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);
    window.__targetCameraPos = null;
    window.__targetCameraLook = null;

    const origUpdate = window.__lab.update;
    window.__lab.update = function(dt) {
      origUpdate.call(this, dt);
      if (window.__targetCameraPos && window.__targetCameraLook) {
        window.__lab.camera.position.copy(window.__targetCameraPos);
        window.__lab.camera.lookAt(window.__targetCameraLook);
      }
    };
  });
  await page.waitForTimeout(1000);

  // Helper to place camera relative to Sector LS1 local frame
  async function setCameraLocal(eyeLocal, lookLocal) {
    await page.evaluate(({ eye, look }) => {
      const THREE = window.THREE;
      const g = window.__lab.sectorGroups['LS1'];
      g.updateWorldMatrix(true, true);
      const eyeWorld = g.localToWorld(new THREE.Vector3(eye[0], eye[1], eye[2]));
      const lookWorld = g.localToWorld(new THREE.Vector3(look[0], look[1], look[2]));
      window.__targetCameraPos = eyeWorld;
      window.__targetCameraLook = lookWorld;
    }, { eye: eyeLocal, look: lookLocal });
    await page.waitForTimeout(600);
  }

  // 1. FRONT VIEW (Eye level, direct front, tight full-body framing)
  console.log('2. Capturing Gate B-1 View 1: Front View (ls1_b1_front.png)...');
  await setCameraLocal([0.0, 0.90, 1.80], [0.0, 0.88, 0.0]);
  save('ls1_b1_front.png', await page.screenshot());

  // 2. RIGHT 3/4 VIEW (Standard oblique 3/4)
  console.log('3. Capturing Gate B-1 View 2: Right 3/4 View (ls1_b1_right_three_quarter.png)...');
  await setCameraLocal([1.35, 0.98, 1.45], [0.0, 0.88, 0.0]);
  save('ls1_b1_right_three_quarter.png', await page.screenshot());

  // 3. LEFT PROFILE VIEW (90-deg left profile)
  console.log('4. Capturing Gate B-1 View 3: Left Profile View (ls1_b1_left_profile.png)...');
  await setCameraLocal([-1.85, 0.90, 0.0], [0.0, 0.88, 0.0]);
  save('ls1_b1_left_profile.png', await page.screenshot());

  // 4. FULL-BODY SILHOUETTE VIEW (High-contrast silhouette render against illuminated backdrop)
  console.log('5. Capturing Gate B-1 View 4: Full-Body Silhouette (ls1_b1_silhouette.png)...');
  await page.evaluate(() => {
    const THREE = window.THREE;
    const g = window.__lab.sectorGroups['LS1'];
    // Create large illuminated white backdrop quad behind figure
    const silGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const silMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    window.__b1Backdrop = new THREE.Mesh(silGeo, silMat);
    window.__b1Backdrop.position.set(0, 0.95, -1.2);
    g.add(window.__b1Backdrop);

    // Swap figure materials to solid matte black silhouette
    window.__savedMats = [];
    g.traverse(o => {
      if (o.isMesh && o !== window.__b1Backdrop) {
        window.__savedMats.push({ obj: o, mat: o.material });
        o.material = new THREE.MeshBasicMaterial({ color: 0x05080c });
      }
    });
  });
  await setCameraLocal([0.0, 0.88, 1.80], [0.0, 0.88, 0.0]);
  save('ls1_b1_silhouette.png', await page.screenshot());

  // Restore original materials and remove backdrop
  await page.evaluate(() => {
    if (window.__b1Backdrop) {
      window.__b1Backdrop.parent?.remove(window.__b1Backdrop);
    }
    if (window.__savedMats) {
      window.__savedMats.forEach(item => {
        item.obj.material = item.mat;
      });
    }
  });
  await page.waitForTimeout(400);

  // 5. Engine HUD Readout & Telemetry
  console.log('6. Capturing HUD telemetry (ls1_b1_hud.png)...');
  await setCameraLocal([1.20, 1.05, 1.80], [0.0, 0.90, 0.0]);
  await page.evaluate(() => {
    const dbg = document.getElementById('dbg');
    if (dbg) {
      dbg.style.display = 'block';
      dbg.style.fontSize = '12px';
      dbg.style.lineHeight = '1.45';
      dbg.style.background = 'rgba(4, 16, 28, 0.88)';
      dbg.style.border = '1px solid #00f0ff';
      dbg.style.padding = '8px 12px';
      dbg.style.borderRadius = '4px';
      dbg.style.zIndex = '999999';
    }
  });
  await page.waitForTimeout(500);
  const hudText = await page.locator('#dbg').innerText();
  save('ls1_b1_hud.png', await page.screenshot());

  // 6. Direct Three.js stats and resource scan
  const renderStats = await page.evaluate(() => window.__lab.stats());
  const resourceScan = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const rasterRegex = /\.(png|jpg|jpeg|webp|gif|svg|hdr|glb|gltf)($|\?)/i;
    const matches = resources.filter(r => rasterRegex.test(r.name)).map(r => r.name);
    return {
      totalResources: resources.length,
      rasterAssetCount: matches.length,
      rasterMatches: matches
    };
  });

  // 7. FPS 120-frame benchmark
  const fpsMeasurement = await page.evaluate(async () => {
    return new Promise(resolve => {
      let count = 0, start = performance.now(), last = start, deltas = [];
      function sample(now) {
        deltas.push(now - last);
        last = now;
        count++;
        if (count < 120) requestAnimationFrame(sample);
        else {
          const total = now - start;
          const sorted = [...deltas.slice(1)].sort((a, b) => a - b);
          resolve({
            sampleCount: count,
            totalDurationMs: +total.toFixed(2),
            avgFps: +(count / (total / 1000)).toFixed(2),
            minFrameTimeMs: +sorted[0].toFixed(2),
            p50FrameTimeMs: +sorted[Math.floor(sorted.length * 0.5)].toFixed(2),
            p95FrameTimeMs: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
            maxFrameTimeMs: +sorted[sorted.length - 1].toFixed(2)
          });
        }
      }
      requestAnimationFrame(sample);
    });
  });

  console.log('\n=== [GATE B-1 TELEMETRY SUMMARY] ===');
  console.log('120-frame FPS:', JSON.stringify(fpsMeasurement, null, 2));
  console.log('Renderer Info:', JSON.stringify(renderStats, null, 2));
  console.log('HUD Readout:\n' + hudText);
  console.log('WebGL Warnings Count:', consoleWarnings.length);
  if (consoleWarnings.length > 0) console.log('Warnings:', consoleWarnings);
  console.log('Raster Assets Count:', resourceScan.rasterAssetCount);
  console.log('====================================\n');

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
