const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/gadia/.gemini/antigravity-ide/brain/083cf90c-eec5-4055-8991-b6f7b0b443d4/.tempmediaStorage';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function run() {
  console.log('=== VERIFYING LS3 "GOD\'S EYE VIEW" PROCEDURAL OVERHAUL ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  const consoleLogs = [];
  const webglWarnings = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.toLowerCase().includes('webgl') && (msg.type() === 'warning' || msg.type() === 'error' || text.toLowerCase().includes('warning'))) {
      webglWarnings.push(text);
    }
  });

  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 20000 });

  // Wait 3 seconds for power-on transition to settle
  await page.waitForTimeout(3500);

  // 1. Focus sector LS3
  console.log('1. Focusing sector LS3...');
  await page.evaluate(() => {
    window.__lab.skipToFinal('LS3');
  });
  await page.waitForTimeout(1000);

  // Capture Full Globe & Plaque in view (Testing framing and Surface mode)
  const cap1 = path.join(ARTIFACT_DIR, `ls3_godseye_surface_${Date.now()}.png`);
  await page.screenshot({ path: cap1 });
  console.log('Saved Surface Mode screenshot:', cap1);

  // 2. Test Key '2' for ORBITAL mode
  console.log('2. Switching to ORBITAL mode...');
  await page.keyboard.press('2');
  await page.waitForTimeout(1000);
  const cap2 = path.join(ARTIFACT_DIR, `ls3_godseye_orbital_${Date.now()}.png`);
  await page.screenshot({ path: cap2 });
  console.log('Saved Orbital Mode screenshot:', cap2);

  // 3. Test Key '3' for AIRSPACE mode
  console.log('3. Switching to AIRSPACE mode...');
  await page.keyboard.press('3');
  await page.waitForTimeout(1000);
  const cap3 = path.join(ARTIFACT_DIR, `ls3_godseye_airspace_${Date.now()}.png`);
  await page.screenshot({ path: cap3 });
  console.log('Saved Airspace Mode screenshot:', cap3);

  // 4. Test North Pole tilt (confirm zero polar pinching)
  console.log('4. Tilting to inspect North Pole (zero polar pinching audit)...');
  await page.evaluate(() => {
    const globe = window.__lab.globeGroup;
    globe.rotation.x = 1.15; // Tilt downwards to expose North Pole
    globe.rotation.y = 0;
  });
  await page.waitForTimeout(800);
  const cap4 = path.join(ARTIFACT_DIR, `ls3_godseye_north_pole_${Date.now()}.png`);
  await page.screenshot({ path: cap4 });
  console.log('Saved North Pole screenshot:', cap4);

  // 5. Test South Pole tilt
  console.log('5. Tilting to inspect South Pole (zero polar pinching audit)...');
  await page.evaluate(() => {
    const globe = window.__lab.globeGroup;
    globe.rotation.x = -1.15; // Tilt upwards to expose South Pole
  });
  await page.waitForTimeout(800);
  const cap5 = path.join(ARTIFACT_DIR, `ls3_godseye_south_pole_${Date.now()}.png`);
  await page.screenshot({ path: cap5 });
  console.log('Saved South Pole screenshot:', cap5);

  // 6. Check stats & rule compliance
  const stats = await page.evaluate(() => {
    const s = window.__lab.stats();
    return {
      triangles: s.triangles,
      textures: s.textures,
      focus: s.focus,
      mode: window.__lab.globe ? window.__lab.globe.mode : 'N/A'
    };
  });

  console.log('Engine Stats:', stats);
  console.log('WebGL Warnings Count:', webglWarnings.length);
  if (webglWarnings.length > 0) {
    console.log('Warnings:', webglWarnings);
  }

  await browser.close();
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
