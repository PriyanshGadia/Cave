const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('--- STARTING RULE 8 CINEMATIC CHECK ---');
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleWarnings = [];
  page.on('console', msg => {
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  const shotDir = 'C:/Users/gadia/.gemini/antigravity-ide/brain/5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75';

  await page.goto('http://localhost:8788/?quarantine=0', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Dismiss consent if open
  try {
    const agreeBtn = await page.$('#btn-privacy-agree');
    if (agreeBtn) await agreeBtn.click();
  } catch {}

  // Walk forward to walk=1
  await page.evaluate(() => {
    if (window.VAULT && window.VAULT.walk) {
      window.VAULT.walk.target = 1;
      window.VAULT.walk.t = 1;
    }
  });
  await page.waitForTimeout(1500);

  console.log('Dispatching vault:granted event...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('vault:granted'));
  });

  // Screenshot at +2.8s
  await page.waitForTimeout(2800);
  await page.screenshot({ path: path.join(shotDir, 'cinematic_01_2_8s.png') });
  console.log('Saved +2.8s screenshot');

  // Screenshot at +5.0s (2800 + 2200 = 5000ms)
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(shotDir, 'cinematic_02_5_0s.png') });
  console.log('Saved +5.0s screenshot');

  // Screenshot at +9.0s (5000 + 4000 = 9000ms)
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(shotDir, 'cinematic_03_9_0s.png') });
  console.log('Saved +9.0s screenshot');

  // Screenshot at +12.5s (9000 + 3500 = 12500ms)
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(shotDir, 'cinematic_04_12_5s.png') });
  console.log('Saved +12.5s screenshot');

  // Check luminance at 12.5s
  const lum = await page.evaluate(() => {
    const canvas = document.querySelector('canvas#c');
    if (!canvas) return 0;
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return 0;
    const pixels = new Uint8Array(4 * 100 * 100);
    gl.readPixels(canvas.width / 2 - 50, canvas.height / 2 - 50, 100, 100, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let sum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      sum += (0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]) / 255;
    }
    return sum / (100 * 100);
  });
  console.log('Luminance at 12.5s:', (lum * 100).toFixed(2) + '%');

  const webglWarnings = consoleWarnings.filter(w => /webgl|shader|gl_/i.test(w));
  console.log('WebGL Warnings count:', webglWarnings.length);

  await browser.close();
  console.log('--- CINEMATIC CHECK COMPLETED ---');
})();
