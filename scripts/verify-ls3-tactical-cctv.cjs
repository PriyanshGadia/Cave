const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/gadia/.gemini/antigravity-ide/brain/083cf90c-eec5-4055-8991-b6f7b0b443d4/.tempmediaStorage';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function run() {
  console.log('=== VERIFYING LS3 TACTICAL RECONNAISSANCE & CCTV CRT MONITOR ===');
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
  await page.waitForTimeout(3500);

  // 1. Focus sector LS3
  console.log('1. Focusing sector LS3...');
  await page.evaluate(() => {
    window.__lab.skipToFinal('LS3');
  });
  await page.waitForTimeout(1000);

  // Surface mode capture
  const cap1 = path.join(ARTIFACT_DIR, `ls3_tactical_surface_${Date.now()}.png`);
  await page.screenshot({ path: cap1 });
  console.log('Saved Surface Mode screenshot:', cap1);

  // 2. Switch to STREETS mode via key '4'
  console.log('2. Switching to STREETS (CCTV Recon) mode via key 4...');
  await page.keyboard.press('4');
  await page.waitForTimeout(1000);
  const cap2 = path.join(ARTIFACT_DIR, `ls3_tactical_streets_${Date.now()}.png`);
  await page.screenshot({ path: cap2 });
  console.log('Saved Streets Mode screenshot:', cap2);

  // 3. Select preset and open CCTV feed CAM-01
  console.log('3. Opening tactical CCTV feed CAM-01 (Cesar Chavez St)...');
  await page.evaluate(() => {
    if (typeof window.__lab?.openCCTVFeed === 'function') {
      window.__lab.openCCTVFeed('CAM-01');
    }
  });
  await page.waitForTimeout(1200);

  const cap3 = path.join(ARTIFACT_DIR, `ls3_tactical_cctv_monitor_${Date.now()}.png`);
  await page.screenshot({ path: cap3 });
  console.log('Saved CCTV Monitor screenshot:', cap3);

  // 4. Test Escape key to close monitor
  console.log('4. Pressing Escape to close CCTV monitor...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // 5. Test Zoom keys '+' and '-'
  console.log('5. Testing Zoom keys + and -...');
  await page.keyboard.press('+');
  await page.keyboard.press('+');
  await page.waitForTimeout(600);
  const cap4 = path.join(ARTIFACT_DIR, `ls3_tactical_zoomed_${Date.now()}.png`);
  await page.screenshot({ path: cap4 });
  console.log('Saved Zoomed screenshot:', cap4);

  // Check stats and WebGL warnings
  const stats = await page.evaluate(() => {
    const s = window.__lab.stats();
    return {
      triangles: s.triangles,
      textures: s.textures,
      focus: s.focus,
      mode: window.__lab.globe ? window.__lab.globe.mode : 'N/A',
      selectedCamera: window.__lab.globe ? window.__lab.globe.selectedCamera : null
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
