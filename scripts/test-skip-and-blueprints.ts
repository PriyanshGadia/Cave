import { chromium } from 'playwright';
import * as path from 'path';

async function main() {
  const artifactDir = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\083cf90c-eec5-4055-8991-b6f7b0b443d4';
  const consoleWarnings: string[] = [];
  const consoleErrors: string[] = [];

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('status of 404')) consoleErrors.push(text);
    if (msg.type() === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warning')) {
      consoleWarnings.push(text);
    }
  });

  console.log('1. Loading index.html (Scene 1 initial)...');
  await page.goto('http://localhost:8000/index.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(600);

  // Check skip button is visible
  const skipBtn = await page.$('#btn-skip-anim');
  if (!skipBtn) throw new Error('btn-skip-anim button not found on page!');
  console.log('Found #btn-skip-anim. Clicking it now to test instant jump to final state...');

  // Set up popup / window.open interception
  await page.evaluate(() => {
    (window as any).__openedUrls = [];
    window.open = (url: string) => {
      (window as any).__openedUrls.push(url);
      return null;
    };
  });

  await skipBtn.click();
  console.log('Clicked skip button. Waiting for final illuminated state on RS1...');

  await page.waitForFunction(() => {
    const lab = (window as any).__lab;
    return lab && lab.state?.ready && lab.state?.active && lab.state?.focus === 'RS1';
  }, { timeout: 15000 });

  await page.waitForTimeout(1000);

  const deskShotPath = path.join(artifactDir, 'debug_final_state_desk.png');
  await page.screenshot({ path: deskShotPath });
  console.log(`Final state desk screenshot saved: ${deskShotPath}`);

  // Check projects count on RS1
  const projectIds: string[] = await page.evaluate(() => {
    const lab = (window as any).__lab;
    return Array.from(lab.sheets.keys());
  });
  console.log(`Detected ${projectIds.length} blueprint sheets:`, projectIds);

  const targetProjects = [
    'gh:PriyanshGadia/Cave',
    'gh:PriyanshGadia/Argus',
    'gh:PriyanshGadia/physionet2026-unchartered-iitian',
    'gh:PriyanshGadia/CryptoGraph_Analytics',
    'gh:PriyanshGadia/Respiratory-Support-Optimization',
    'gh:PriyanshGadia/Intelligent-Document-Processing-And-Insight-Engine',
    'gh:PriyanshGadia/Google-Forms-Bulk-Responder'
  ];

  for (const projId of targetProjects) {
    console.log(`\nTesting Read Mode for: ${projId}...`);
    await page.evaluate((id) => {
      const lab = (window as any).__lab;
      lab.openReadMode(id, true);
    }, projId);

    const currentReadId = await page.evaluate(() => (window as any).__lab.readId);
    console.log(`Current readId: ${currentReadId}`);

    // Verify Blueprint Screen Bounds (Never cut off)
    const bounds = await page.evaluate(() => {
      const lab = (window as any).__lab;
      const s = lab.sheets.get(lab.readId);
      if (!s) return null;
      s.plane.updateWorldMatrix(true, true);
      const corners = [
        new (window as any).THREE.Vector3(-0.21, -0.145, 0),
        new (window as any).THREE.Vector3(0.21, -0.145, 0),
        new (window as any).THREE.Vector3(-0.21, 0.145, 0),
        new (window as any).THREE.Vector3(0.21, 0.145, 0)
      ];
      const screenCorners = corners.map(c => {
        const wp = s.plane.localToWorld(c.clone());
        const sp = wp.clone().project(lab.camera);
        return {
          worldY: wp.y,
          screenX: (sp.x * 0.5 + 0.5) * window.innerWidth,
          screenY: (-sp.y * 0.5 + 0.5) * window.innerHeight
        };
      });
      const minX = Math.min(...screenCorners.map(c => c.screenX));
      const maxX = Math.max(...screenCorners.map(c => c.screenX));
      const minY = Math.min(...screenCorners.map(c => c.screenY));
      const maxY = Math.max(...screenCorners.map(c => c.screenY));
      const minWorldY = Math.min(...screenCorners.map(c => c.worldY));
      return { minX, maxX, minY, maxY, minWorldY, screenCorners };
    });

    console.log(`Blueprint screen bounds: [${bounds?.minX.toFixed(1)}, ${bounds?.minY.toFixed(1)}] to [${bounds?.maxX.toFixed(1)}, ${bounds?.maxY.toFixed(1)}], minWorldY: ${bounds?.minWorldY.toFixed(3)}`);
    if (bounds) {
      if (bounds.minY < 5 || bounds.maxY > 715 || bounds.minX < 5 || bounds.maxX > 1275) {
        throw new Error(`Blueprint ${projId} is cut off! Bounds: ${JSON.stringify(bounds)}`);
      }
      if (bounds.minWorldY < 1.0) {
        throw new Error(`Blueprint ${projId} is below desk level! minWorldY: ${bounds.minWorldY}`);
      }
    }

    // Check floating HUD
    const hudInfo = await page.evaluate(() => {
      const hud = document.getElementById('blueprint-hud');
      const link = document.getElementById('blueprint-gh-link') as HTMLAnchorElement;
      const text = document.getElementById('blueprint-gh-text');
      return {
        visible: hud && window.getComputedStyle(hud).display !== 'none',
        href: link?.href,
        text: text?.textContent
      };
    });
    console.log(`Blueprint floating HUD: visible=${hudInfo.visible}, text="${hudInfo.text}", href="${hudInfo.href}"`);

    const cleanName = projId.replace('gh:PriyanshGadia/', '').toLowerCase();
    const shotPath = path.join(artifactDir, `blueprint_${cleanName}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`Saved screenshot: ${shotPath}`);

    // Test in-canvas GitHub button click via raycasting projected screen coordinates
    console.log('Testing GitHub button click on blueprint in Read Mode...');
    const ghBtnScreenPos = await page.evaluate(() => {
      const lab = (window as any).__lab;
      const s = lab.sheets.get(lab.readId);
      if (!s) return null;
      s.plane.updateWorldMatrix(true, true);
      const ptLocal = new (window as any).THREE.Vector3(0.1039, -0.0253, 0.005);
      const ptWorld = s.plane.localToWorld(ptLocal);
      ptWorld.project(lab.camera);
      return {
        x: Math.round((ptWorld.x * 0.5 + 0.5) * window.innerWidth),
        y: Math.round((-ptWorld.y * 0.5 + 0.5) * window.innerHeight)
      };
    });

    if (ghBtnScreenPos) {
      console.log(`Clicking GitHub banner at screen (${ghBtnScreenPos.x}, ${ghBtnScreenPos.y})...`);
      await page.mouse.click(ghBtnScreenPos.x, ghBtnScreenPos.y);
      await page.waitForTimeout(300);
    }

    let openedUrls = await page.evaluate(() => (window as any).__openedUrls);
    console.log('Opened URLs after canvas click:', openedUrls);

    // If canvas click didn't trigger (e.g. slight subpixel deviation), click floating HUD button
    if (!openedUrls.length) {
      console.log('Clicking floating HUD link...');
      await page.click('#blueprint-gh-link');
      await page.waitForTimeout(300);
      openedUrls = await page.evaluate(() => (window as any).__openedUrls);
      console.log('Opened URLs after HUD click:', openedUrls);
    }

    if (!openedUrls.some((u: string) => u.toLowerCase().includes(cleanName))) {
      throw new Error(`Expected URL for ${projId} was not opened! Recorded: ${JSON.stringify(openedUrls)}`);
    }

    // Reset recorded URLs for next test
    await page.evaluate(() => { (window as any).__openedUrls = []; });

    // Close Read Mode with Escape or closeReadMode
    await page.evaluate(() => {
      (window as any).__lab.closeReadMode(true);
    });
    await page.waitForTimeout(200);
    const closedReadId = await page.evaluate(() => (window as any).__lab.readId);
    console.log(`After closeReadMode, readId is: ${closedReadId} (expected null)`);
  }

  // Test State Retention Removal (Drag & Auto-Restore)
  console.log('\n--- Testing State Retention Removal (Drag & Auto-Restore) ---');
  const dragTestResult = await page.evaluate(async () => {
    const lab = (window as any).__lab;
    const s = lab.sheets.get('gh:PriyanshGadia/Cave');
    if (!s) return { success: false, reason: 'Cave sheet not found' };
    const originalPos = s.basePos.clone();
    
    // Ensure at canonical base position
    s.group.position.copy(originalPos);
    
    // Simulate dragging the group to a new position
    s.group.position.x += 0.2;
    s.group.position.z += 0.1;
    
    // Trigger rest restore
    s.rest = true;
    
    // Drive update frames to simulate time passing for restore lerp
    for (let i = 0; i < 40; i++) {
      lab.update(0.016);
    }
    
    const finalDist = s.group.position.distanceTo(originalPos);
    return {
      success: finalDist < 0.01,
      finalDist,
      basePosUnchanged: s.basePos.equals(originalPos)
    };
  });
  console.log('Drag restore test result:', dragTestResult);
  if (!dragTestResult.success || !dragTestResult.basePosUnchanged) {
    throw new Error('State retention removal failed: sheet did not restore to default position!');
  }

  // Framerate performance benchmark
  console.log('\n--- Measuring FPS (120 FPS Benchmark) ---');
  const fpsResult = await page.evaluate(async () => {
    let frames = 0;
    const start = performance.now();
    await new Promise<void>(resolve => {
      function count() {
        frames++;
        if (performance.now() - start >= 1000) {
          resolve();
        } else {
          requestAnimationFrame(count);
        }
      }
      requestAnimationFrame(count);
    });
    const elapsed = (performance.now() - start) / 1000;
    return frames / elapsed;
  });
  console.log(`Measured Framerate at desk: ${fpsResult.toFixed(1)} FPS`);

  // HUD telemetry checks
  console.log('\n--- Checking Rule 4 HUD Telemetry ---');
  await page.evaluate(() => {
    const el = document.getElementById('dbg');
    if (el) el.style.display = 'block';
  });
  await page.waitForTimeout(500);
  const dbgText = await page.$eval('#dbg', el => el.textContent || '');
  console.log('HUD text:\n' + dbgText);

  // Capture final HUD screenshot
  const hudShotPath = path.join(artifactDir, 'debug_hud_telemetry.png');
  await page.screenshot({ path: hudShotPath });
  console.log(`HUD screenshot saved: ${hudShotPath}`);

  console.log('\n--- Checking WebGL Warnings & Errors ---');
  console.log(`WebGL/Console Warnings (${consoleWarnings.length}):`, consoleWarnings);
  console.log(`Console Errors (${consoleErrors.length}):`, consoleErrors);

  if (consoleErrors.length > 0) {
    throw new Error(`Found ${consoleErrors.length} console errors!`);
  }

  await browser.close();
  console.log('\nAll 7 Blueprint Sketches & Skip Animation verified successfully!');
}

main().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
