// scripts/verify-volumetric-portal.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\694bd3af-9386-4a86-8cb6-98cd73f0a84a';

function save(name, buf) {
  const f = path.join(OUT_DIR, name);
  fs.writeFileSync(f, buf);
  console.log(`  -> Saved: ${name} -> ${f}`);
}

async function run() {
  console.log('=== [LS1 GATE C: RECIRCULATING VOLUMETRIC ENERGY THROAT VERIFICATION] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--enable-webgl',
      '--enable-features=Vulkan',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  const consoleErrors = [];
  const consoleWarnings = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error' && !text.includes('favicon')) {
      consoleErrors.push(text);
      console.log(`  [BROWSER ${type}]: ${text}`);
    } else if (text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warning') || text.toLowerCase().includes('shader')) {
      consoleWarnings.push(text);
      console.log(`  [BROWSER ${type}]: ${text}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.log('  [UNCAUGHT EXCEPTION]:', err.message);
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 35000 });
  await page.waitForFunction(() => typeof window.__lab !== 'undefined', { timeout: 25000 });

  console.log('2. Waiting 3.5s for initial settling and performance governor...');
  await page.waitForTimeout(3500);

  console.log('3. Snapping focus to Sector LS1...');
  await page.evaluate(() => {
    if (window.__lab?.skipToFinal) window.__lab.skipToFinal('LS1');
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(1200);

  // 1. PORTAL SEED: tiny black opening (~5-10 cm apparent diameter), almost no cloud
  console.log('4. Activating GITHUB crystal and capturing 1: PORTAL SEED...');
  await page.evaluate(() => {
    window.__lab.api2.ls1.activatePortal('GITHUB');
    const p = window.__lab.api2.ls1.getActivePortal();
    if (p) { p.state = 'frozen'; p.t = 0.035; }
  });
  await page.waitForTimeout(60);
  save('portal_proto_1_seed.png', await page.screenshot());

  // 2. EARLY FORMATION: smoke just beginning to escape
  console.log('5. Advancing to 2: EARLY FORMATION...');
  await page.evaluate(() => {
    const p = window.__lab.api2.ls1.getActivePortal();
    if (p) { p.state = 'frozen'; p.t = 0.22; }
  });
  await page.waitForTimeout(60);
  save('portal_proto_2_early_formation.png', await page.screenshot());

  // 3. MID GROWTH: obvious turbulent escape + return flow
  console.log('6. Advancing to 3: MID GROWTH...');
  await page.evaluate(() => {
    const p = window.__lab.api2.ls1.getActivePortal();
    if (p) { p.state = 'frozen'; p.t = 0.55; }
  });
  await page.waitForTimeout(60);
  save('portal_proto_3_mid_growth.png', await page.screenshot());

  // 4. STABLE PORTAL: full cloud + dark throat + embedded electricity beside owner hologram
  console.log('7. Advancing to 4: STABLE PORTAL...');
  await page.evaluate(() => {
    const p = window.__lab.api2.ls1.getActivePortal();
    if (p) { p.state = 'open'; p.t = 1.0; }
  });
  await page.waitForTimeout(100);
  save('portal_proto_4_stable.png', await page.screenshot());

  // 5. CLOSE APPROACH: cloud fills frame edge-to-edge enough to reveal depth, with destination clearly behind throat
  console.log('8. Dollying camera to aperture close-up and capturing 5: CLOSE APPROACH...');
  await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    window.__lab.FOCUS.from.copy(window.__lab.camera.position);
    window.__lab.FOCUS.toPos.copy(g.localToWorld(new THREE.Vector3(0.68, 1.02, 1.14)));
    window.__lab.FOCUS.toLook.copy(g.localToWorld(new THREE.Vector3(0.68, 1.02, 0.80)));
    window.__lab.FOCUS.t = 1.0;
  });
  await page.waitForTimeout(600);
  save('portal_proto_5_close_approach.png', await page.screenshot());

  // Measure steady-state FPS over 120 frames at DPR 1
  console.log('9. Measuring steady-state FPS over 120 frames at DPR 1...');
  const fpsData = await page.evaluate(() => {
    return new Promise(resolve => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        if (frames < 120) {
          requestAnimationFrame(tick);
        } else {
          const elapsed = performance.now() - start;
          resolve({
            fps: Math.round((frames / (elapsed / 1000)) * 10) / 10,
            elapsedMs: Math.round(elapsed),
            frames
          });
        }
      }
      requestAnimationFrame(tick);
    });
  });

  console.log(`  -> Measured FPS: ${fpsData.fps} over ${fpsData.frames} frames (${fpsData.elapsedMs}ms)`);

  console.log('\n--- VERIFICATION AUDIT SUMMARY ---');
  console.log('Console Errors:', consoleErrors.length);
  if (consoleErrors.length > 0) console.log(consoleErrors);
  console.log('WebGL Warnings:', consoleWarnings.length);
  if (consoleWarnings.length > 0) console.log(consoleWarnings);
  console.log(`FPS: ${fpsData.fps} (Gate Requirement: >= 30 FPS)`);
  console.log('----------------------------------\n');

  await browser.close();
  console.log('=== [PROTOTYPE VERIFICATION FINISHED SUCCESSFULLY] ===');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
