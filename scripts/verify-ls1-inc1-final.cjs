// scripts/verify-ls1-inc1-final.cjs
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
  console.log('=== [LS1 INCREMENT 1 COMPREHENSIVE VERIFICATION & AUDIT] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=gl',
      '--enable-webgl',
      '--ignore-gpu-blocklist'
    ]
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  const consoleLogs = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      if (!text.includes('favicon')) consoleWarnings.push(text);
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });

  // Phase A: Initial Cold-Boot FPS sampling
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

  console.log('3. Waiting for laboratory asset initialization & settling...');
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
  await page.evaluate(() => {
    if (window.__lab?.skipToFinal) window.__lab.skipToFinal();
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(3500);

  // Phase B1: World-Context Steady-State FPS (120 frames)
  console.log('4. Positioning camera at unfocused World-Context pose (theta = 5.23 rad)...');
  await page.evaluate(() => {
    window.__lab.unfocusSector();
    window.__lab.state.theta = 5.23;
    window.__lab.state.lastInput = performance.now();
  });
  await page.waitForTimeout(1000);

  console.log('5. Sampling Phase B1: World-Context Steady-State FPS (120 frames)...');
  const worldFps = await page.evaluate(async () => {
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

  console.log('6. Capturing World-Context View (ls1_inc1_world_context.png)...');
  save('ls1_inc1_world_context.png', await page.screenshot());

  // Phase B2: Focused Steady-State FPS (120 frames)
  console.log('7. Focusing Sector LS1 at FOCUS_CFG.LS1 and allowing camera to settle...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
  });
  await page.waitForTimeout(3500);

  console.log('8. Sampling Phase B2: Focused Steady-State FPS (120 frames post-settle)...');
  const focusedFps = await page.evaluate(async () => {
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

  console.log('9. Capturing Focused View without HUD (ls1_inc1_focused_clean.png)...');
  save('ls1_inc1_focused_clean.png', await page.screenshot());

  // Capture HUD Shot: Enable engine debug HUD cleanly on focused pose
  console.log('10. Capturing Focused View with Engine Debug HUD (ls1_inc1_rule4_hud.png)...');
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
  await page.waitForTimeout(600);
  save('ls1_inc1_rule4_hud.png', await page.screenshot());

  // Capture Macro Assembly View: Position camera obliquely to clearly resolve all 7 hardware layers
  console.log('11. Positioning camera for oblique Macro Hardware Inspection of all 7 chassis layers...');
  await page.evaluate(() => {
    const dbg = document.getElementById('dbg');
    if (dbg) dbg.style.display = 'none';

    const THREE = window.THREE;
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);
    const cam = window.__lab.camera;

    // Oblique angle: local (0.42, 0.48, 0.85) looking at (0.0, 0.32, 0.0)
    // Distance = 0.957m -> reveals 3D layers:
    // Layer 1: Backing plate (z=-0.035, thickness 0.03 -> face at -0.020)
    // Layer 2: 4-piece Bezel frame (z=-0.015, thickness 0.02 -> front face at -0.005)
    // Layer 3: Recessed screen plane (z=-0.008, 3mm recessed from bezel outer face)
    // Layer 4: Mounting bracket base box(1.22, 0.06, 0.28)
    // Layer 5: Vertical support struts cyl(0.018, 0.018, 1.62) at x=+-0.55
    // Layer 6: Lower contact apron box(1.08, 0.04, 0.06) at z=+0.015
    // Layer 7: Hex bolts cyl(0.008, 0.008, 0.008) at bezel corners and base bracket
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
  });
  await page.waitForTimeout(800);
  console.log('12. Capturing Macro Hardware Assembly Inspection (ls1_inc1_macro_chassis.png)...');
  save('ls1_inc1_macro_chassis.png', await page.screenshot());

  // Resource Scan: Confirm 0 raster files loaded
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

  console.log('\n================ FINAL AUDIT REPORT ================');
  console.log('Phase A Cold Boot FPS:', JSON.stringify(coldFps, null, 2));
  console.log('Phase B1 World Context FPS:', JSON.stringify(worldFps, null, 2));
  console.log('Phase B2 Focused Pose FPS:', JSON.stringify(focusedFps, null, 2));
  console.log('Console WebGL Warnings Count:', consoleWarnings.length);
  console.log('Raster Asset Scan Count:', resourceScan.rasterAssetCount);
  console.log('====================================================\n');

  await browser.close();
  console.log('=== [LS1 INCREMENT 1 VERIFICATION COMPLETED SUCCESSFULLY] ===');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
