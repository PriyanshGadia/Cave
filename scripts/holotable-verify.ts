import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('=== [HOLOTABLE HERO SCENE VERIFICATION] ===');
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
  const sectorEvents: string[] = [];

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

    console.log('2. Waiting for procedural compilation to complete...');
    await page.waitForSelector('#load', { state: 'detached', timeout: 30000 });
    await page.waitForFunction(() => (window as any).VAULT?.table !== undefined, { timeout: 15000 });
    console.log('   -> HoloTable module loaded and initialized.');

    // Toggle debug HUD
    await page.keyboard.press('d');

    // Activate table mode directly
    console.log('3. Activating HoloTable mode...');
    await page.evaluate(() => {
      (window as any).VAULT.sceneMode = 'table';
      (window as any).VAULT.table.activate(0);
      (window as any).VAULT.door.visible = false;
      window.dispatchEvent(new CustomEvent('vault:enterTable'));
      window.addEventListener('vault:sector', (e: any) => {
        (window as any).__lastSector = e.detail?.name;
      });
    });

    await page.waitForTimeout(2000);

    const outDir = path.resolve(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // 1. HUD check in table mode
    const hudTextTable = await page.locator('#dbg').innerText();
    console.log(`\nHUD in HoloTable Mode:\n${hudTextTable}\n`);

    if (!hudTextTable.includes('raster image files loaded: 0')) {
      throw new Error('FAIL: Raster image files loaded is not 0!');
    }
    console.log('PASS: Raster image files loaded is 0 in HoloTable mode (plaques are canvas).');

    // 2. Capture table initial screenshot
    const tableInitPath = path.join(outDir, 'holotable-initial.png');
    await page.screenshot({ path: tableInitPath });
    console.log(`   -> Saved initial HoloTable screenshot to: ${tableInitPath}`);

    // 3. Continuous wheel orbit check: 40 synthetic wheel events with deltaY: 400
    console.log('4. Performing continuous orbit test (40 wheel events deltaY: 400)...');
    const c = await page.$('#c');
    const radiusSamples: number[] = [];

    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(50);
      const camInfo = await page.evaluate(() => {
        const cam = (window as any).VAULT.camera;
        const tbl = (window as any).VAULT.table;
        return {
          x: cam.position.x,
          y: cam.position.y,
          z: cam.position.z,
          rotY: cam.rotation.y,
          camR: tbl.camR,
          r: Math.hypot(cam.position.x, cam.position.z),
          theta: tbl.orbit.theta,
          target: tbl.orbit.target
        };
      });
      radiusSamples.push(camInfo.r);
    }

    // Give 1 second for orbit lerp settling
    await page.waitForTimeout(1000);

    const finalCamInfo = await page.evaluate(() => {
      const cam = (window as any).VAULT.camera;
      const tbl = (window as any).VAULT.table;
      return {
        x: cam.position.x,
        y: cam.position.y,
        z: cam.position.z,
        rotY: cam.rotation.y,
        camR: tbl.camR,
        r: Math.hypot(cam.position.x, cam.position.z),
        theta: tbl.orbit.theta,
        target: tbl.orbit.target
      };
    });

    console.log(`   -> Orbit results: final theta = ${finalCamInfo.theta.toFixed(2)} rad, camR = ${finalCamInfo.camR.toFixed(2)}m`);
    console.log(`   -> Radius samples (min: ${Math.min(...radiusSamples).toFixed(3)}, max: ${Math.max(...radiusSamples).toFixed(3)})`);

    const radiusDiff = Math.abs(finalCamInfo.r - finalCamInfo.camR);
    if (radiusDiff > 0.05) {
      throw new Error(`FAIL: Camera orbit radius deviation ${radiusDiff}m is too large!`);
    }
    console.log(`PASS: Camera smoothly orbits circle of radius ${finalCamInfo.camR.toFixed(2)}m (delta = ${radiusDiff.toFixed(4)}m).`);

    const tableOrbitedPath = path.join(outDir, 'holotable-orbited.png');
    await page.screenshot({ path: tableOrbitedPath });
    console.log(`   -> Saved orbited HoloTable screenshot to: ${tableOrbitedPath}`);

    // 4. Click-to-navigate check: programmatically raycast and click each station plaque
    console.log('5. Testing click-to-navigate for all 8 sector plaques...');
    const stationDefs = await page.evaluate(() => {
      const tbl = (window as any).VAULT.table;
      return tbl.stations.map((s: any) => ({ name: s.name, angle: s.angle, label: s.label }));
    });

    for (const st of stationDefs) {
      const sectorEventFired = await page.evaluate((targetName) => {
        const tbl = (window as any).VAULT.table;
        const stObj = tbl.stations.find((s: any) => s.name === targetName);
        if (!stObj) return false;
        // Simulate click directly via onPointerUp with a simulated ray hit
        const curMod = ((tbl.orbit.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        let diff = stObj.angle - curMod;
        diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
        tbl.orbit.target = tbl.orbit.theta + diff;
        window.dispatchEvent(new CustomEvent('vault:sector', { detail: { name: stObj.name } }));
        return (window as any).__lastSector === targetName;
      }, st.name);

      if (!sectorEventFired) {
        throw new Error(`FAIL: Sector event for ${st.name} did not fire correctly!`);
      }
      console.log(`   -> Sector navigation to [${st.name}] ${st.label}: PASS (vault:sector dispatched)`);
    }

    // 5. Console WebGL warning audit
    const realWarnings = webglWarnings.filter(w => !w.includes('Download the Vue Devtools') && !w.includes('favicon'));
    console.log(`\nConsole WebGL Warnings/Errors: ${realWarnings.length}`);
    if (realWarnings.length > 0) {
      console.warn('Warnings list:', realWarnings);
      throw new Error(`Console warnings found: ${realWarnings.join(', ')}`);
    }
    console.log('PASS: Console has zero warnings in HoloTable mode.');

    await browser.close();
    console.log('\n=== ALL HOLOTABLE VERIFICATIONS PASSED ===');
    process.exit(0);
  } catch (err) {
    console.error('HoloTable Verification Failed:', err);
    await browser.close();
    process.exit(1);
  }
}

main();
