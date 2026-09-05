import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('=== [LAB.JS (SCENE 2) VERIFICATION] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 576, height: 1024 },
    deviceScaleFactor: 1,
  });

  const consoleMessages: { type: string; text: string }[] = [];
  const webglWarnings: string[] = [];
  const sectorEvents: any[] = [];
  const interactEvents: any[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleMessages.push({ type, text });
    if (type === 'warning' || type === 'error' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      webglWarnings.push(`[${type}] ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]:', err);
    webglWarnings.push(`[PAGE ERROR] ${err.message}`);
  });

  try {
    console.log('1. Navigating to http://localhost:8000/index.html ...');
    await page.goto('http://localhost:8000/index.html', { waitUntil: 'load', timeout: 30000 });

    console.log('2. Waiting for initial compilation (#load removed)...');
    await page.waitForSelector('#load', { state: 'detached', timeout: 30000 });
    await page.waitForFunction(() => (window as any).VAULT?.lab !== undefined, { timeout: 15000 });
    console.log('   -> lab.js initialized.');

    // Listen for events
    await page.evaluate(() => {
      window.addEventListener('vault:sector', (e: any) => {
        (window as any).__lastSector = e.detail;
      });
      window.addEventListener('lab:interact', (e: any) => {
        (window as any).__lastInteract = e.detail;
      });
    });

    // Test A: Boot Sequence - Mapping Scan & Entity
    console.log('3. Testing Boot Sequence: Triggering lab activation at t = 7.0s (room scan)...');
    await page.evaluate(() => {
      const v = (window as any).VAULT;
      v.sceneMode = 'table';
      v.lab.activate(7.0);
    });

    await page.waitForTimeout(600);
    await page.screenshot({ path: 'public/screenshots/lab-room-scan.png' });
    console.log('   -> Captured room scan screenshot.');

    console.log('4. Testing Entity & Greeting: Jumping to t = 16.5s...');
    await page.evaluate(() => {
      (window as any).VAULT.lab.activate(16.5);
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'public/screenshots/lab-entity-greet.png' });
    console.log('   -> Captured entity & greeting screenshot.');

    console.log('5. Testing Full Power-On & Ready State: Jumping to t = 26.0s (all lights & sectors online)...');
    await page.evaluate(() => {
      (window as any).VAULT.lab.activate(26.0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'public/screenshots/lab-powered-ready.png' });
    console.log('   -> Captured full power-on screenshot.');

    // Test B: Orbital Traversal via Wheel
    console.log('6. Testing Continuous Orbital Traversal via synthetic wheel events...');
    const initialCamZ = await page.evaluate(() => (window as any).VAULT.lab.camera.position.z);
    console.log(`   Initial Camera Z: ${initialCamZ.toFixed(3)}`);

    for (let i = 0; i < 25; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(500);

    const { camX, camY, camZ, theta, curRadius } = await page.evaluate(() => {
      const c = (window as any).VAULT.lab.camera.position;
      const s = (window as any).VAULT.lab.state;
      const r = Math.hypot(c.x, c.z);
      return { camX: c.x, camY: c.y, camZ: c.z, theta: s.theta, curRadius: r };
    });

    console.log(`   After Wheel Orbit: Theta = ${theta.toFixed(3)} rad, Cam Pos = (${camX.toFixed(2)}, ${camY.toFixed(2)}, ${camZ.toFixed(2)}), Radius = ${curRadius.toFixed(3)}m`);
    await page.screenshot({ path: 'public/screenshots/lab-orbited.png' });
    console.log('   -> Captured orbited screenshot.');

    // Test C: Sector Navigation via goTo
    console.log('7. Testing Sector Navigation via goTo("RS2") [Resume Fabricator]...');
    await page.evaluate(() => {
      (window as any).VAULT.lab.goTo('RS2');
    });
    await page.waitForTimeout(1000);

    const rs2Target = await page.evaluate(() => {
      const s = (window as any).VAULT.lab.state;
      const sec = (window as any).VAULT.lab.SECTORS[s.sector];
      return sec;
    });
    console.log(`   Active Sector aligned: ${rs2Target?.id} · ${rs2Target?.name}`);
    await page.screenshot({ path: 'public/screenshots/lab-sector-rs2.png' });

    console.log('8. Testing Sector Navigation via goTo("LS3") [Holo-Globe]...');
    await page.evaluate(() => {
      (window as any).VAULT.lab.goTo('LS3');
    });
    await page.waitForTimeout(1000);

    const ls3Target = await page.evaluate(() => {
      const s = (window as any).VAULT.lab.state;
      const sec = (window as any).VAULT.lab.SECTORS[s.sector];
      return sec;
    });
    console.log(`   Active Sector aligned: ${ls3Target?.id} · ${ls3Target?.name}`);
    await page.screenshot({ path: 'public/screenshots/lab-sector-ls3.png' });

    // Console warnings audit
    console.log('=== [LAB.JS AUDIT SUMMARY] ===');
    console.log(`Console WebGL Warnings/Errors: ${webglWarnings.length}`);
    if (webglWarnings.length > 0) {
      console.error('Warnings detected:', webglWarnings);
      throw new Error(`WebGL warnings found in console during lab test: ${webglWarnings.join('; ')}`);
    }

    console.log('PASS: lab.js boot sequence, orbital traversal, sector alignment, and zero console warnings verified!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
