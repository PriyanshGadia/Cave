// scripts/verify-black-smoke-portal.cjs
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
  console.log('=== [LS1 GATE C: BLACK SMOKE + ELECTRIC BLUE + RECIRCULATING THROAT VERIFICATION] ===\n');

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

  const snap = async (name) => {
    const buf = await page.screenshot({ timeout: 45000, animations: 'disabled' });
    save(name, buf);
  };

  // STATE 0: IDLE (Portal does not exist, crystal floating normally)
  console.log('4. Capturing STATE 0: IDLE...');
  await snap('portal_state_0_idle.png');

  // STATE 1: RUPTURE (Tiny puncture ~5-10 cm, almost no blue, tiny black smoke leak)
  console.log('5. Setting STATE 1: RUPTURE (t = 0.035, state = frozen)...');
  await page.evaluate(() => {
    window.__lab.api2.ls1.activatePortal('GITHUB');
    window.__lab.api2.ls1.setPortalState(0.035, 'frozen');
  });
  await page.waitForTimeout(100);
  await snap('portal_state_1_rupture.png');

  // STATE 2: FIRST EXHALE (Smoke pushing outward, small electric blue flashes, expanding puncture)
  console.log('6. Setting STATE 2: FIRST EXHALE (t = 0.20, state = frozen)...');
  await page.evaluate(() => {
    window.__lab.api2.ls1.setPortalState(0.20, 'frozen');
  });
  await page.waitForTimeout(100);
  await snap('portal_state_2_exhale.png');

  // STATE 3: RAPID EXPANSION (Rapid nonlinear growth, thicker turbulent structures billowing)
  console.log('7. Setting STATE 3: RAPID EXPANSION (t = 0.52, state = frozen)...');
  await page.evaluate(() => {
    window.__lab.api2.ls1.setPortalState(0.52, 'frozen');
  });
  await page.waitForTimeout(100);
  await snap('portal_state_3_expansion.png');

  // STATE 4: STABLE RECIRCULATION (Dark throat + thick black smoke + electric-blue filaments + escape/curl/return recirculation)
  console.log('8. Setting STATE 4: STABLE RECIRCULATION (t = 1.0, state = frozen)...');
  await page.evaluate(() => {
    window.__lab.api2.ls1.setPortalState(1.0, 'frozen');
  });
  await page.waitForTimeout(150);
  await snap('portal_state_4_stable.png');

  // STATE 5: COLLAPSE (Reverse physical collapse mid-suction into the throat)
  console.log('9. Setting STATE 5: COLLAPSE (t = 0.45, state = closing)...');
  await page.evaluate(() => {
    window.__lab.api2.ls1.setPortalState(0.45, 'closing');
  });
  await page.waitForTimeout(60);
  await snap('portal_state_5_collapse.png');

  // Performance FPS Measurement (Live stable animation over 120 frames)
  console.log('10. Measuring live animation FPS over 120 frames in stable recirculation state...');
  await page.evaluate(() => {
    window.__lab.api2.ls1.setPortalState(1.0, 'open');
  });

  const fps = await page.evaluate(async () => {
    return new Promise(resolve => {
      let frameCount = 0;
      const start = performance.now();
      function tick() {
        frameCount++;
        if (frameCount >= 120) {
          const elapsed = performance.now() - start;
          resolve((frameCount / elapsed) * 1000);
        } else {
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(tick);
    });
  });

  console.log(`\n=== VERIFICATION RESULTS ===`);
  console.log(`  Live Stable Portal FPS: ${fps.toFixed(1)} fps (Threshold: >= 30 fps)`);
  console.log(`  Console Errors: ${consoleErrors.length}`);
  console.log(`  Console WebGL Warnings: ${consoleWarnings.length}`);

  if (consoleErrors.length > 0) {
    console.log('  Errors detail:', consoleErrors);
  }
  if (consoleWarnings.length > 0) {
    console.log('  Warnings detail:', consoleWarnings);
  }

  await browser.close();
  console.log('\n=== DONE ===');
}

run().catch(err => {
  console.error('[FATAL]:', err);
  process.exit(1);
});
