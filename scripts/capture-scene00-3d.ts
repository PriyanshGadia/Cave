import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

/**
 * scripts/capture-scene00-3d.ts
 * Captures live 3D Scene00 at START_POS (wide cavern) and ARRIVED_POS (approached door)
 */

async function main() {
  console.log('=== [STARTING VITE PREVIEW SERVER] ===');
  const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    shell: true,
    stdio: 'pipe',
  });

  await new Promise((r) => setTimeout(r, 3000));

  const outDir = path.resolve(process.cwd(), 'public', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('=== [LAUNCHING CHROMIUM FOR 3D CAPTURE] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  page.on('console', (msg) => console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text()));
  page.on('pageerror', (err) => console.error('[BROWSER PAGE ERROR]:', err));

  try {
    console.log('1. Navigating to http://localhost:4173 ...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);

    // Frame 1: Wide Cavern START_POS
    console.log('2. Capturing Wide 3D Cavern (START_POS)...');
    await page.screenshot({ path: path.join(outDir, 'scene00-3d-start.png') });

    // Frame 2: Click to dolly down the tunnel to ARRIVED_POS
    console.log('3. Clicking door to walk down the 3D tunnel...');
    await page.mouse.click(640, 360);
    await page.waitForTimeout(4000);

    console.log('4. Capturing Approached 3D Door (ARRIVED_POS)...');
    await page.screenshot({ path: path.join(outDir, 'scene00-3d-arrived.png') });

    console.log('=== [3D SCENE CAPTURED SUCCESSFULLY] ===');
  } catch (err) {
    console.error('Capture failed:', err);
  } finally {
    await browser.close();
    preview.kill();
    process.exit(0);
  }
}

main();
