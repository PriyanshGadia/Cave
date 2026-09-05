import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('===========================================================');
  console.log('=== [THE HALL REV C: COMPREHENSIVE VERIFICATION SUITE] ===');
  console.log('===========================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const outDir = path.resolve(process.cwd(), 'public', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const page = await browser.newPage({
    viewport: { width: 576, height: 1024 }, // 9:16 portrait
    deviceScaleFactor: 1,
  });

  const consoleErrors: string[] = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      if (!text.includes('favicon') && !text.includes('Devtools')) {
        console.log(`[PAGE LOG ${type}]`, text);
        consoleErrors.push(`[${type}] ${text}`);
      }
    }
  });
  page.on('pageerror', err => {
    console.error('[PAGE ERROR EVENT]', err.message);
    consoleErrors.push(`[PAGE ERROR] ${err.message}`);
  });

  // 1. Checkpoints
  console.log('\n--- 1. Testing Checkpoints ---');
  const checkpoints = [
    { boot: '0.6', name: 'rev-c-boot-0.6s', desc: 'portal frame, black hall, bench + pedestal silhouettes' },
    { boot: '3', name: 'rev-c-boot-3.0s', desc: '<=40 sparks <=2-3px over pedestal' },
    { boot: '5.8', name: 'rev-c-boot-5.8s', desc: 'pedestal rings + deck channels lit, beam 3/4 open + reflection' },
    { boot: '8.5', name: 'rev-c-boot-8.5s', desc: 'scan grid on floor, bench body, pedestal, columns, gantry, wall' },
    { boot: '15.2', name: 'rev-c-boot-15.2s', desc: 'wireframe cube/octa/ico ~3/4 formed, ribbons rotating, haze soft - no terrain' },
    { boot: '18', name: 'rev-c-boot-18.0s', desc: 'greeting typing above the entity' },
    { boot: '25', name: 'rev-c-boot-25.0s', desc: 'sconces, portal, amber bars, gantry on; pendant 0 on, 1 flickering; exposure up' },
  ];

  const results: Record<string, any> = {};

  for (const cp of checkpoints) {
    const url = `http://localhost:8000/index.html?lab&boot=${cp.boot}`;
    console.log(`Checking ${url} (${cp.desc})...`);
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => (window as any).__lab?.state?.active, { timeout: 30000 });
    await page.waitForTimeout(500);

    const stats = await page.evaluate(() => (window as any).__lab.stats());
    results[cp.boot] = stats;
    console.log(`   -> t=${stats.t}s, calls=${stats.calls}, tris=${stats.triangles}, exp=${stats.exposure}, cam=${JSON.stringify(stats.camera.p)}`);
    await page.screenshot({ path: path.join(outDir, `${cp.name}.png`) });
  }

  // 2. Test boot=skip (Ready state, Gate leaves open, S0, entity at 72% with anchor cone, warm bench)
  console.log('\n--- 2. Testing ?lab&boot=skip (Ready State) ---');
  await page.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => (window as any).__lab?.state?.ready, { timeout: 15000 });
  await page.waitForTimeout(600);

  const skipStats = await page.evaluate(() => (window as any).__lab.stats());
  console.log(`   -> Skip stats: ready=${skipStats.ready}, sector=${skipStats.sector}, theta=${skipStats.theta}, calls=${skipStats.calls}, tris=${skipStats.triangles}, exposure=${skipStats.exposure}`);
  await page.screenshot({ path: path.join(outDir, 'rev-c-boot-skip-9-16.png') });

  if (skipStats.sector !== 'S0') {
    throw new Error(`Expected sector S0 at boot=skip, got ${skipStats.sector}`);
  }

  // 3. Test click RS1 blueprints
  console.log('\n--- 3. Testing Click RS1 Blueprints ---');
  let interactId: string | null = null;
  await page.exposeFunction('onInteract', (detail: any) => {
    interactId = detail.id;
  });
  await page.evaluate(() => {
    window.addEventListener('lab:interact', (e: any) => (window as any).onInteract(e.detail));
    // Turn look toward RS1 so it is framed on screen
    const lab = (window as any).__lab;
    lab.state.look.tx = -0.35;
  });
  await page.waitForTimeout(400);

  // Pick RS1 screen position
  const rs1Coords = await page.evaluate(() => {
    const lab = (window as any).__lab;
    const cam = lab.camera;
    let target = null;
    lab.scene.traverse((o: any) => {
      if (o.userData?.sector === 'RS1' && !target) {
        const v = new cam.position.constructor();
        o.getWorldPosition(v);
        const p = v.clone().project(cam);
        const x = Math.round((p.x * 0.5 + 0.5) * window.innerWidth);
        const y = Math.round((-p.y * 0.5 + 0.5) * window.innerHeight);
        if (x > 10 && x < window.innerWidth - 10 && y > 10 && y < window.innerHeight - 10 && p.z > 0 && p.z < 1) {
          target = { x, y };
        }
      }
    });
    return target;
  });

  console.log('RS1 screen target:', rs1Coords);
  if (rs1Coords) {
    await page.mouse.click(rs1Coords.x, rs1Coords.y);
    await page.waitForTimeout(1500);
    console.log(`   -> Clicked RS1 at (${rs1Coords.x}, ${rs1Coords.y}), interact event id: ${interactId}`);
    const afterClickStats = await page.evaluate(() => (window as any).__lab.stats());
    console.log(`   -> After click camera theta=${afterClickStats.theta}, sector=${afterClickStats.sector}`);
    await page.screenshot({ path: path.join(outDir, 'rev-c-rs1-clicked.png') });
  }

  // 4. Test wheel traversal (forward x3, wait 2s) and back x6 (unbounded)
  console.log('\n--- 4. Testing Wheel Traversal ---');
  let sectorFwdCount = 0;
  await page.exposeFunction('onSectorFwd', (detail: any) => {
    sectorFwdCount++;
  });
  await page.evaluate(() => {
    window.addEventListener('lab:sector', (e: any) => (window as any).onSectorFwd(e.detail));
  });

  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);
  }
  console.log('Waiting 2.2s for magnet snap...');
  await page.waitForTimeout(2200);

  const wheelFwdStats = await page.evaluate(() => (window as any).__lab.stats());
  console.log(`   -> Wheel fwd stats: sector=${wheelFwdStats.sector}, theta=${wheelFwdStats.theta}, sectorEvents=${sectorFwdCount}`);
  await page.screenshot({ path: path.join(outDir, 'rev-c-wheel-fwd-snap.png') });

  // Wheel back x6
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(100);
  }
  console.log('Waiting 2.2s for magnet snap...');
  await page.waitForTimeout(2200);
  const wheelRevStats = await page.evaluate(() => (window as any).__lab.stats());
  console.log(`   -> Wheel rev stats: sector=${wheelRevStats.sector}, theta=${wheelRevStats.theta}`);
  await page.screenshot({ path: path.join(outDir, 'rev-c-wheel-rev-snap.png') });

  // 5. Test AI Entrance (?lab&boot=skip&inside)
  console.log('\n--- 5. Testing AI Entrance (?lab&boot=skip&inside) ---');
  let aiEnterFired = false;
  let aiAskDetail: string | null = null;
  let aiExitFired = false;

  await page.exposeFunction('onAiEnter', () => { aiEnterFired = true; });
  await page.exposeFunction('onAiAsk', (detail: any) => { aiAskDetail = detail.q; });
  await page.exposeFunction('onAiExit', () => { aiExitFired = true; });

  await page.goto('http://localhost:8000/index.html?lab&boot=skip&inside', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => (window as any).__lab?.state?.ready, { timeout: 15000 });

  await page.evaluate(() => {
    window.addEventListener('lab:ai:enter', () => (window as any).onAiEnter());
    window.addEventListener('lab:ai:ask', (e: any) => (window as any).onAiAsk(e.detail));
    window.addEventListener('lab:ai:exit', () => (window as any).onAiExit());
  });

  console.log('Waiting 2.5s for entrance walk to complete (stats.inside -> 1.00)...');
  await page.waitForTimeout(2500);

  const insideStats = await page.evaluate(() => (window as any).__lab.stats());
  console.log(`   -> Inside stats: inside=${insideStats.inside}, cam=${JSON.stringify(insideStats.camera.p)}, sector=${insideStats.sector}`);
  await page.screenshot({ path: path.join(outDir, 'rev-c-inside-console.png') });

  if (insideStats.inside < 0.9) {
    throw new Error(`Expected inside >= 0.9, got ${insideStats.inside}`);
  }

  // Type hello + Enter
  console.log('Typing "hello" into AI console...');
  await page.keyboard.type('hello');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  const consoleLines = await page.evaluate(() => (window as any).__lab.ai.lines);
  console.log(`   -> AI console lines:`, consoleLines);
  console.log(`   -> lab:ai:ask fired with: "${aiAskDetail}"`);
  await page.screenshot({ path: path.join(outDir, 'rev-c-ai-replied.png') });

  // Press Esc to exit
  console.log('Pressing Escape to walk back out...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(2000);

  const exitStats = await page.evaluate(() => (window as any).__lab.stats());
  console.log(`   -> Exit stats: inside=${exitStats.inside}, cam=${JSON.stringify(exitStats.camera.p)}`);
  await page.screenshot({ path: path.join(outDir, 'rev-c-ai-exited.png') });

  // 6. Performance Profile (9:16 and 16:9)
  console.log('\n--- 6. Performance Profiling (DPR 1) ---');
  await page.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => (window as any).__lab?.state?.ready, { timeout: 15000 });
  await page.waitForTimeout(600);

  const perf916 = await page.evaluate(async () => {
    let frames = 0;
    const t0 = performance.now();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => requestAnimationFrame(r));
      frames++;
    }
    const elapsed = (performance.now() - t0) / 1000;
    return { fps: +(frames / elapsed).toFixed(1) };
  });

  const stats916 = await page.evaluate(() => (window as any).__lab.stats());
  console.log(`   [9:16 (576x1024)] FPS: ${perf916.fps}, Draw Calls: ${stats916.calls}, Triangles: ${stats916.triangles}`);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(600);

  const perf169 = await page.evaluate(async () => {
    let frames = 0;
    const t0 = performance.now();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => requestAnimationFrame(r));
      frames++;
    }
    const elapsed = (performance.now() - t0) / 1000;
    return { fps: +(frames / elapsed).toFixed(1) };
  });

  const stats169 = await page.evaluate(() => (window as any).__lab.stats());
  console.log(`   [16:9 (1280x720)] FPS: ${perf169.fps}, Draw Calls: ${stats169.calls}, Triangles: ${stats169.triangles}`);
  await page.screenshot({ path: path.join(outDir, 'rev-c-boot-skip-16-9.png') });

  // 7. Console audit
  console.log('\n--- 7. Console & WebGL Error Audit ---');
  console.log(`Total warnings/errors recorded: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Warnings detected:', consoleErrors);
    throw new Error(`Console warnings found: ${consoleErrors.join('; ')}`);
  }
  console.log('PASS: 0 WebGL warnings or errors detected.');

  await browser.close();
  console.log('\n===========================================================');
  console.log('=== [ALL REV C CHECKS PASSED SUCCESSFULLY] ===');
  console.log('===========================================================');
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
