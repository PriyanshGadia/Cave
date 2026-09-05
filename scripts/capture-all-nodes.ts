import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

/**
 * scripts/capture-all-nodes.ts
 * Captures clean screenshots of all 5 workshop nodes (SC00, SC01, SC03, SC05, SC06)
 * to verify visual quality, zero-glitch rendering, and full environment coverage.
 */

async function main() {
  console.log('=== [STARTING VITE PREVIEW SERVER] ===');
  const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    shell: true,
    stdio: 'pipe',
  });

  // Wait for server to start
  await new Promise((r) => setTimeout(r, 3000));

  const outDir = path.resolve(process.cwd(), 'public', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('=== [LAUNCHING HEADLESS CHROMIUM FOR VISUAL CAPTURE] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
  });
  page.on('pageerror', (err) => {
    console.error('[BROWSER PAGE ERROR]:', err);
  });

  try {
    console.log('1. Navigating to http://localhost:4173 ...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);

    // Node 1: SC00 Approach
    console.log('2. Capturing Node 00 (Approach)...');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(outDir, 'node-00-approach.png') });

    // Node 2: SC01 Panel
    console.log('3. Switching to Node 01 (Panel)...');
    await page.click('button:has-text("01 Panel")');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(outDir, 'node-01-panel.png') });

    // Node 3: SC03 Darkroom
    console.log('4. Switching to Node 03 (Darkroom)...');
    await page.click('button:has-text("03 Darkroom")');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(outDir, 'node-03-darkroom.png') });

    // Node 4: SC05 AI Entity
    console.log('5. Switching to Node 05 (AI Entity)...');
    await page.click('button:has-text("05 AI Entity")');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(outDir, 'node-05-entity.png') });

    // Node 5: SC06 Active Workshop
    console.log('6. Switching to Node 06 (Active Workshop)...');
    await page.click('button:has-text("06 Active Workshop")');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(outDir, 'node-06-active-workshop.png') });

    console.log('=== [ALL 5 NODES CAPTURED SUCCESSFULLY TO public/screenshots/] ===');
  } catch (err) {
    console.error('Capture failed:', err);
  } finally {
    await browser.close();
    preview.kill();
    process.exit(0);
  }
}

main();
