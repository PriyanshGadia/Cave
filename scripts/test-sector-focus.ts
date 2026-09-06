import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('=== [SECTOR FOCUS & BOKEH AUDIT SUITE] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  const consoleErrors: string[] = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      if (!text.includes('favicon') && !text.includes('Devtools')) {
        consoleErrors.push(`[${type}] ${text}`);
      }
    }
  });

  const outDir = path.resolve(process.cwd(), 'public', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  try {
    console.log('1. Loading http://localhost:8000/index.html?lab&boot=skip ...');
    await page.addInitScript(() => {
      (window as any).__name = (f: any, _n: any) => f;
    });
    await page.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => (window as any).__lab?.state?.ready, { timeout: 15000 });
    await page.waitForTimeout(600);

    const initialStats = await page.evaluate(() => (window as any).__lab.stats());
    console.log(`   -> Ready at sector ${initialStats.sector}, theta=${initialStats.theta}`);

    const heroSectors = ['RS1', 'RS2', 'RS3', 'LS3', 'LS2', 'LS1'];

    for (const id of heroSectors) {
      console.log(`\nTesting sector focus: ${id} ...`);
      const beforeTheta = await page.evaluate(() => (window as any).__lab.stats().theta);

      // Trigger focusSector
      const focusEventFired = await page.evaluate(`new Promise(resolve => {
        let fired = false;
        window.addEventListener('lab:focus', e => {
          if (e.detail && e.detail.id === '${id}') fired = true;
        }, { once: true });
        window.__lab.focusSector('${id}');
        setTimeout(() => resolve(fired), 300);
      })`);

      console.log(`   -> lab:focus fired: ${focusEventFired}`);

      // Wait for focus dolly to complete (0.8s)
      await page.waitForTimeout(800);

      // Verify 3D focus state
      const focusState = await page.evaluate(() => {
        const stats = (window as any).__lab.stats();
        return {
          focused: !!stats.focus,
          navLocked: (window as any).__lab.state?.navLocked,
        };
      });
      console.log(`   -> Focus state: focused=${focusState.focused}, navLocked=${focusState.navLocked}`);
      if (!focusState.focused || !focusState.navLocked) {
        throw new Error(`Focus state failed for sector ${id}`);
      }

      // If RS2, test clicking the physical mesh to toggle interactive checkbox!
      if (id === 'RS2') {
        console.log(`   -> Testing direct 3D mesh interaction on RS2 Resume Fabricator...`);
        const diag = await page.evaluate(() => {
          const api = (window as any).__lab;
          const g = api?.sectorGroups?.['RS2'];
          let targetsCount = 0;
          let hitUV = null;
          if (g) {
            const targets: any[] = [];
            g.traverse((o: any) => { if (o.isMesh && o.userData.interactive) targets.push(o); });
            targetsCount = targets.length;
            const THREE = (window as any).THREE;
            const ray = new THREE.Raycaster();
            const ndc = new THREE.Vector2(0, 0);
            ray.setFromCamera(ndc, api.camera);
            const hits = ray.intersectObjects(targets, false);
            if (hits.length > 0) {
              hitUV = hits[0].uv;
            }
            if (targets[0]) {
              const v = new THREE.Vector3();
              targets[0].getWorldPosition(v);
              const proj = v.clone().project(api.camera);
              const camPos = api.camera.position.clone();
              const bbox = new THREE.Box3().setFromObject(targets[0]);
              return {
                targetsCount,
                hitUV,
                meshWorldPos: { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) },
                projectedNDC: { x: +proj.x.toFixed(3), y: +proj.y.toFixed(3), z: +proj.z.toFixed(3) },
                camPos: { x: +camPos.x.toFixed(3), y: +camPos.y.toFixed(3), z: +camPos.z.toFixed(3) },
                bboxMin: { x: +bbox.min.x.toFixed(3), y: +bbox.min.y.toFixed(3), z: +bbox.min.z.toFixed(3) },
                bboxMax: { x: +bbox.max.x.toFixed(3), y: +bbox.max.y.toFixed(3), z: +bbox.max.z.toFixed(3) }
              };
            }
          }
          return { targetsCount, hitUV, focusActive: api?.state?.navLocked };
        });
        console.log(`   -> Pre-click diagnostic:`, JSON.stringify(diag));
        await page.mouse.click(640, 360);
        await page.waitForTimeout(200);
        const postClickFocus = await page.evaluate(() => ({
          focused: !!(window as any).__lab?.stats()?.focus,
          navLocked: (window as any).__lab?.state?.navLocked,
        }));
        console.log(`   -> Post-click state:`, JSON.stringify(postClickFocus));
      }

      // Capture focused screenshot
      const shotPath = path.join(outDir, `focus-${id}.png`);
      try {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: shotPath, timeout: 15000, animations: 'disabled' });
        console.log(`   -> Captured screenshot to: ${shotPath}`);
      } catch (err: any) {
        console.warn(`   -> Warning: Screenshot failed (${err.message}), continuing...`);
      }

      // Test wheel input while focused (ensure navigation is locked!)
      console.log(`   -> Testing wheel input during focus (navLock check)...`);
      for (let w = 0; w < 3; w++) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(50);
      }
      await page.waitForTimeout(300);

      // Verify theta did not change
      const duringTheta = await page.evaluate(() => (window as any).__lab.stats().theta);
      const thetaDiff = Math.abs(duringTheta - beforeTheta);
      console.log(`   -> Theta delta during wheel while focused: ${thetaDiff.toFixed(6)} rad (navLock verified: ${thetaDiff < 1e-4})`);
      if (thetaDiff >= 1e-4) {
        throw new Error(`Navigation was not locked while sector ${id} was focused!`);
      }

      // Trigger unfocus via Escape key
      console.log(`   -> Unfocusing via Escape key...`);
      const unfocusEventFired = await page.evaluate(`new Promise(resolve => {
        let fired = false;
        window.addEventListener('lab:unfocus', e => {
          if (e.detail && e.detail.id === '${id}') fired = true;
        }, { once: true });
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        setTimeout(() => resolve(fired), 300);
      })`);

      console.log(`   -> lab:unfocus fired: ${unfocusEventFired}`);

      // Wait for exit lerp and settle (1.0s)
      await page.waitForTimeout(1000);

      // Verify camera returned to exact pre-focus theta
      const afterTheta = await page.evaluate(() => (window as any).__lab.stats().theta);
      console.log(`   -> Pre-focus theta: ${beforeTheta.toFixed(4)}, Post-focus theta: ${afterTheta.toFixed(4)} (diff: ${Math.abs(afterTheta - beforeTheta).toFixed(6)})`);
      if (Math.abs(afterTheta - beforeTheta) > 1e-3) {
        throw new Error(`Camera did not return to pre-focus theta after unfocusing sector ${id}`);
      }
    }

    console.log('\n=== [ALL 6 HERO SECTORS TESTED AND VERIFIED] ===');
    console.log(`Total console warnings/errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      throw new Error(`Console warnings found: ${consoleErrors.join(', ')}`);
    }
    console.log('PASS: Zero console warnings.');

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    await browser.close();
    process.exit(1);
  }
}

main();
