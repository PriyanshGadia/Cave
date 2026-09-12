// scripts/verify-ls1-increment1.cjs
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
  console.log('=== [LS1 INCREMENT 1 VERIFICATION SUITE] ===\n');

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

  // 1. Cold Boot Performance Sampling (60 frames)
  console.log('2. Sampling Phase A: Cold-Boot FPS (initial 60 frames)...');
  const coldFps = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let count = 0, start = performance.now(), last = start, deltas = [];
      function sample(now) {
        deltas.push(now - last);
        last = now;
        count++;
        if (count < 60) requestAnimationFrame(sample);
        else {
          const total = now - start;
          resolve({
            sampleCount: count,
            totalDurationMs: +total.toFixed(2),
            avgFps: +(count / (total / 1000)).toFixed(2),
            minFrameTimeMs: +Math.min(...deltas.slice(1)).toFixed(2),
            maxFrameTimeMs: +Math.max(...deltas.slice(1)).toFixed(2)
          });
        }
      }
      requestAnimationFrame(sample);
    });
  });

  console.log('3. Waiting for scene settling and ready state...');
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
  await page.evaluate(() => {
    if (window.__lab && typeof window.__lab.skipToFinal === 'function') {
      window.__lab.skipToFinal();
    }
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(3500);

  // 2. Unfocused World-Context Capture showing both LS2 and LS1
  console.log('4. Positioning camera for unfocused World-Context View (LS2 + LS1 spatial continuity)...');
  await page.evaluate(() => {
    window.__lab.unfocusSector();
    window.__lab.state.theta = 5.23; // theta facing the arc between LS2 and LS1
    window.__lab.state.lastInput = performance.now();
  });
  await page.waitForTimeout(600);
  console.log('5. Capturing World-Context View (post_ls1_inc1_world_context.png)...');
  save('post_ls1_inc1_world_context.png', await page.screenshot());

  // 3. Focused View at FOCUS_CFG.LS1 — Full Occlusion Verification
  console.log('6. Focusing on Sector LS1 at FOCUS_CFG.LS1...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
  });
  await page.waitForTimeout(800);

  // 4. Steady-State FPS Sampling (120 frames at focus)
  console.log('7. Sampling Phase B: Steady-State FPS at focus (120 frames)...');
  const steadyFps = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let count = 0, start = performance.now(), last = start, deltas = [];
      function sample(now) {
        deltas.push(now - last);
        last = now;
        count++;
        if (count < 120) requestAnimationFrame(sample);
        else {
          const total = now - start;
          resolve({
            sampleCount: count,
            totalDurationMs: +total.toFixed(2),
            avgFps: +(count / (total / 1000)).toFixed(2),
            minFrameTimeMs: +Math.min(...deltas.slice(1)).toFixed(2),
            maxFrameTimeMs: +Math.max(...deltas.slice(1)).toFixed(2)
          });
        }
      }
      requestAnimationFrame(sample);
    });
  });

  console.log('8. Capturing Focused View (post_ls1_inc1_focused_occlusion.png)...');
  save('post_ls1_inc1_focused_occlusion.png', await page.screenshot());

  // 5. Close/Macro View of the Physical Chassis Assembly (Backing, Bezel, Screen, Struts, Bracket, Bolts)
  console.log('9. Positioning camera for oblique Macro Hardware Inspection...');
  const macroReport = await page.evaluate(() => {
    const THREE = window.THREE;
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);
    const cam = window.__lab.camera;

    // Oblique angle: local (0.42, 0.48, 0.85) looking at (0.0, 0.32, 0.0)
    // Distance = 0.957m -> reveals 3D layers: backing plate (z=-0.035), bezel (z=-0.015), screen (z=+0.002), struts (x=+-0.55), base bracket, hex bolts
    const localPos = new THREE.Vector3(0.42, 0.48, 0.85);
    const localLook = new THREE.Vector3(0.0, 0.32, 0.0);
    const worldPos = g.localToWorld(localPos.clone());
    const worldLook = g.localToWorld(localLook.clone());

    cam.position.copy(worldPos);
    cam.lookAt(worldLook);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();

    window.__lab.update = function(dt) {
      cam.position.copy(worldPos);
      cam.lookAt(worldLook);
    };

    return {
      localPos: localPos.toArray().map(v => +v.toFixed(3)),
      worldPos: worldPos.toArray().map(v => +v.toFixed(3)),
      localLook: localLook.toArray().map(v => +v.toFixed(3)),
      worldLook: worldLook.toArray().map(v => +v.toFixed(3)),
      distance: +worldPos.distanceTo(worldLook).toFixed(3)
    };
  });
  console.log('Macro Transform:', JSON.stringify(macroReport, null, 2));
  await page.waitForTimeout(600);

  console.log('10. Capturing Macro Hardware Assembly View (post_ls1_inc1_macro_assembly.png)...');
  save('post_ls1_inc1_macro_assembly.png', await page.screenshot());

  // 6. Test tab click to verify CanvasTexture.needsUpdate drives both map and emissiveMap
  console.log('11. Testing tab interaction to verify procedural canvas texture update...');
  const tabInteraction = await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    const profMesh = g.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry' && c.material?.isMeshStandardMaterial);
    if (!profMesh) return { error: 'profMesh not found' };

    // Simulate clicking tab 1 ([SYSTEMS]) at normalized UV
    // In lab.js: py >= 142 && py <= 165, px for tab 1 is 14 + 1*76 = 90
    // UV: uv.x = 90 / 320 = 0.281, 1 - uv.y = 150 / 440 -> uv.y = 1 - 0.341 = 0.659
    const uv = { x: 0.281, y: 0.659 };
    window.__lab.handlers.LS1.onHit(profMesh, uv);

    return {
      success: true,
      materialType: profMesh.material.type,
      hasMap: !!profMesh.material.map,
      hasEmissiveMap: !!profMesh.material.emissiveMap,
      emissiveIntensity: profMesh.material.emissiveIntensity,
      mapMatchesEmissiveMap: profMesh.material.map === profMesh.material.emissiveMap
    };
  });
  console.log('Tab Interaction / Texture Pipeline Result:', JSON.stringify(tabInteraction, null, 2));

  // 7. Resource Timing Scan
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

  console.log('\n--- VERIFICATION AUDIT SUMMARY ---');
  console.log('Cold Boot FPS:', JSON.stringify(coldFps, null, 2));
  console.log('Steady State FPS:', JSON.stringify(steadyFps, null, 2));
  console.log('Console Warnings Count:', consoleWarnings.length);
  if (consoleWarnings.length > 0) console.log('Warnings:', consoleWarnings);
  console.log('Raster Asset Scan:', JSON.stringify(resourceScan, null, 2));
  console.log('----------------------------------\n');

  await browser.close();
  console.log('=== [LS1 INCREMENT 1 VERIFICATION COMPLETE] ===\n');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
