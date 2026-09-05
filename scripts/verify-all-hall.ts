import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('====================================================');
  console.log('=== [THE HALL: COMPREHENSIVE VERIFICATION SUITE] ===');
  console.log('====================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const outDir = path.resolve(process.cwd(), 'public', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Check all boot checkpoints in portrait 9:16 (576x1024)
  console.log('\n--- 1. Testing Boot Checkpoints (9:16, 576x1024) ---');
  const page916 = await browser.newPage({
    viewport: { width: 576, height: 1024 },
    deviceScaleFactor: 1,
  });

  const consoleErrors: string[] = [];
  page916.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      if (!text.includes('favicon') && !text.includes('Devtools')) {
        consoleErrors.push(`[${type}] ${text}`);
      }
    }
  });
  page916.on('pageerror', err => {
    consoleErrors.push(`[PAGE ERROR] ${err.message}`);
  });

  const checkpoints = [
    { boot: '0.6', name: 'plate-1-boot-0.6s' },
    { boot: '3', name: 'plate-boot-3.0s' },
    { boot: '5.8', name: 'plate-boot-5.8s' },
    { boot: '8.5', name: 'plate-boot-8.5s' },
    { boot: '13.8', name: 'plate-boot-13.8s' },
    { boot: '15.8', name: 'plate-2-3-boot-15.8s' },
    { boot: '25', name: 'plate-4-boot-25.0s' },
  ];

  const checkpointStats: Record<string, any> = {};

  for (const cp of checkpoints) {
    const url = `http://localhost:8000/index.html?lab&boot=${cp.boot}`;
    console.log(`Checking ${url}...`);
    await page916.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page916.waitForFunction(() => (window as any).__lab?.state?.active, { timeout: 15000 });
    await page916.waitForTimeout(500);

    const stats = await page916.evaluate(() => (window as any).__lab.stats());
    checkpointStats[cp.boot] = stats;
    console.log(`   -> t=${stats.t}s, calls=${stats.calls}, tris=${stats.triangles}, cam=${JSON.stringify(stats.camera.p)}`);
    const shotPath = path.join(outDir, `${cp.name}.png`);
    await page916.screenshot({ path: shotPath });
  }

  // 2. Test boot=skip (Ready state, Gate open, S0, input interactions)
  console.log('\n--- 2. Testing ?lab&boot=skip & Interactions ---');
  await page916.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page916.waitForFunction(() => (window as any).__lab?.state?.ready, { timeout: 15000 });
  await page916.waitForTimeout(500);

  const skipStats = await page916.evaluate(() => (window as any).__lab.stats());
  console.log(`   -> Boot skip stats: ready=${skipStats.ready}, sector=${skipStats.sector}, theta=${skipStats.theta}, calls=${skipStats.calls}, tris=${skipStats.triangles}, cam=${JSON.stringify(skipStats.camera.p)}`);
  await page916.screenshot({ path: path.join(outDir, 'lab-boot-skip-9-16.png') });

  if (skipStats.sector !== 'S0') {
    throw new Error(`Expected sector S0 at boot=skip, got ${skipStats.sector}`);
  }

  // Test click interaction directly at boot=skip
  console.log('Testing click interaction on rim monitor / sector...');
  const clickTarget = await page916.evaluate(() => {
    const lab = (window as any).__lab;
    const cam = lab.camera;
    // Find screen position of sector RS1 or S0
    let best = null;
    lab.scene.traverse((o: any) => {
      if (o.userData?.sector && !best) {
        const v = new cam.position.constructor();
        o.getWorldPosition(v);
        const p = v.clone().project(cam);
        const x = Math.round((p.x * 0.5 + 0.5) * window.innerWidth);
        const y = Math.round((-p.y * 0.5 + 0.5) * window.innerHeight);
        if (x > 20 && x < window.innerWidth - 20 && y > 20 && y < window.innerHeight - 20) {
          best = { id: o.userData.sector, x, y };
        }
      }
    });
    return best;
  });

  console.log('Click target detected:', clickTarget);
  if (clickTarget) {
    let interactedId = null;
    await page916.exposeFunction('onInteract', (detail: any) => {
      interactedId = detail.id;
    });
    await page916.evaluate(() => {
      window.addEventListener('lab:interact', (e: any) => (window as any).onInteract(e.detail));
    });

    await page916.mouse.click((clickTarget as any).x, (clickTarget as any).y);
    await page916.waitForTimeout(800);
    console.log(`   -> Dispatched click at (${(clickTarget as any).x}, ${(clickTarget as any).y}), interact result: ${interactedId}`);
  }

  // Wheel traversal forward x3
  console.log('Testing wheel traversal (forward x3)...');
  let sectorEvents: any[] = [];
  await page916.exposeFunction('onSectorFwd', (detail: any) => {
    sectorEvents.push(detail);
  });
  await page916.evaluate(() => {
    window.addEventListener('lab:sector', (e: any) => (window as any).onSectorFwd(e.detail));
  });

  for (let i = 0; i < 3; i++) {
    await page916.mouse.wheel(0, 500);
    await page916.waitForTimeout(100);
  }
  console.log('Waiting 2.2s for magnet snap...');
  await page916.waitForTimeout(2200);

  const fwdStats = await page916.evaluate(() => (window as any).__lab.stats());
  console.log(`   -> Forward stats: sector=${fwdStats.sector}, theta=${fwdStats.theta}, sectorEventsCount=${sectorEvents.length}`);
  await page916.screenshot({ path: path.join(outDir, 'lab-wheel-fwd-snap.png') });

  // Wheel traversal back x6 (unbounded crossing S0 -> LS1)
  console.log('Testing wheel traversal reverse x6 (crossing S0 -> LS1)...');
  let revSectorEvents: any[] = [];
  await page916.exposeFunction('onSectorRev', (detail: any) => {
    revSectorEvents.push(detail);
  });
  await page916.evaluate(() => {
    window.addEventListener('lab:sector', (e: any) => (window as any).onSectorRev(e.detail));
  });

  for (let i = 0; i < 6; i++) {
    await page916.mouse.wheel(0, -600);
    await page916.waitForTimeout(100);
  }
  console.log('Waiting 2.2s for magnet snap...');
  await page916.waitForTimeout(2200);

  const revStats = await page916.evaluate(() => (window as any).__lab.stats());
  console.log(`   -> Reverse stats: sector=${revStats.sector}, theta=${revStats.theta}, revSectorEventsCount=${revSectorEvents.length}`);
  await page916.screenshot({ path: path.join(outDir, 'lab-wheel-rev-snap.png') });

  // 3. Performance measurement at DPR 1: 9:16 and 16:9
  console.log('\n--- 3. Performance Profiling (DPR 1) ---');
  const perf916 = await page916.evaluate(async () => {
    let frames = 0;
    const t0 = performance.now();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => requestAnimationFrame(r));
      frames++;
    }
    const elapsed = (performance.now() - t0) / 1000;
    return { fps: +(frames / elapsed).toFixed(1) };
  });
  console.log(`   [9:16 (576x1024)] FPS: ${perf916.fps}, Draw Calls: ${skipStats.calls}, Triangles: ${skipStats.triangles}`);

  // Test 16:9 (1280x720) by dynamic viewport resize
  console.log('Resizing viewport to 16:9 (1280x720)...');
  await page916.setViewportSize({ width: 1280, height: 720 });
  await page916.waitForTimeout(600);

  const skipStats169 = await page916.evaluate(() => (window as any).__lab.stats());
  const perf169 = await page916.evaluate(async () => {
    let frames = 0;
    const t0 = performance.now();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => requestAnimationFrame(r));
      frames++;
    }
    const elapsed = (performance.now() - t0) / 1000;
    return { fps: +(frames / elapsed).toFixed(1) };
  });
  console.log(`   [16:9 (1280x720)] FPS: ${perf169.fps}, Draw Calls: ${skipStats169.calls}, Triangles: ${skipStats169.triangles}`);
  await page916.screenshot({ path: path.join(outDir, 'lab-boot-skip-16-9.png') });

  // 4. Console audit
  console.log('\n--- 4. Console & WebGL Error Audit ---');
  console.log(`Total warnings/errors recorded: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Warnings detected:', consoleErrors);
    throw new Error(`Console warnings found: ${consoleErrors.join('; ')}`);
  }
  console.log('PASS: 0 WebGL warnings or errors detected.');

  await browser.close();
  console.log('\n====================================================');
  console.log('=== [ALL CHECKS PASSED SUCCESSFULLY] ===');
  console.log('====================================================');
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
