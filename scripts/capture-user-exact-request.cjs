// scripts/capture-user-exact-request.cjs
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
  console.log('=== [CAPTURING EXACT USER REQUEST DELIVERABLES] ===\n');

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
      if (!text.includes('favicon')) consoleWarnings.push(text);
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });

  await page.evaluate(() => {
    if (window.__lab?.skipToFinal) window.__lab.skipToFinal();
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(3000);

  // 1. Unfocused Screenshot in World Context
  console.log('2. Positioning camera for unfocused World Context view (theta = 5.23 rad)...');
  await page.evaluate(() => {
    window.__lab.unfocusSector();
    window.__lab.state.theta = 5.23;
    window.__lab.state.lastInput = performance.now();
  });
  await page.waitForTimeout(1000);
  console.log('3. Capturing LS1 unfocused in world context...');
  save('ls1_unfocused_world_context.png', await page.screenshot());

  // 2. Focused Screenshot at Reported Dolly Position (FOCUS_CFG.LS1)
  console.log('4. Focusing Sector LS1 at reported dolly position (FOCUS_CFG.LS1)...');
  const dollyInfo = await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);
    const cam = window.__lab.camera;
    return {
      camPos: cam.position.toArray().map(v => +v.toFixed(3)),
      dpr: window.devicePixelRatio,
      focus: window.__lab.state.focus
    };
  });
  await page.waitForTimeout(3500); // allow full stabilization
  console.log('5. Capturing LS1 focused at reported dolly position...');
  save('ls1_focused_dolly.png', await page.screenshot());

  // 3. Steady-State FPS Sampling (120 frames at focus)
  console.log('6. Sampling 120-frame rAF FPS at focus...');
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

  // 4. Capture Focused View with Engine Debug HUD
  console.log('7. Capturing Focused View with Debug HUD overlay...');
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
  const hudText = await page.locator('#dbg').innerText();
  save('ls1_focused_hud.png', await page.screenshot());

  // 5. Resource timing scan for raster images
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

  console.log('\n=== [LITERAL RUNTIME METRICS] ===');
  console.log('DPR:', dollyInfo.dpr);
  console.log('Camera Position at Focus:', dollyInfo.camPos);
  console.log('FPS Measurement (120 frames steady-state):', JSON.stringify(fpsMeasurement, null, 2));
  console.log('Engine HUD Readout:\n' + hudText);
  console.log('Console WebGL Warnings Count:', consoleWarnings.length);
  if (consoleWarnings.length > 0) console.log('Console Warnings:', consoleWarnings);
  console.log('Raster Assets Loaded Count:', resourceScan.rasterAssetCount);
  console.log('================================\n');

  await browser.close();
  console.log('=== [COMPLETED] ===');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
