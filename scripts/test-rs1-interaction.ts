import { chromium } from 'playwright';

async function main() {
  console.log('=== [RS1 DRAG, READ-MODE & PERSISTENCE VERIFICATION] ===');
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
    if (type === 'error' || text.toLowerCase().includes('webgl warning') || text.toLowerCase().includes('error')) {
      if (!text.includes('favicon') && !text.includes('404')) {
        consoleErrors.push(`[${type}] ${text}`);
      }
    }
  });

  const patches: { url: string; body: any }[] = [];
  await page.route('**/api/projects', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'gh:PriyanshGadia/Cave',
          source: 'github',
          title: 'Cave',
          tagline: 'VAULT-01 real-time procedural WebGL engine. Zero raster images, 60 FPS PBR renderer.',
          stats: { stars: 0, forks: 0, lang: 'TypeScript', lastCommitAt: new Date().toISOString() },
        },
        {
          id: 'gh:PriyanshGadia/Argus',
          source: 'github',
          title: 'Argus',
          tagline: 'Autonomous telemetry & visual anomaly surveillance engine.',
          stats: { stars: 0, forks: 0, lang: 'Python' },
        },
        {
          id: 'gh:PriyanshGadia/physionet2026-unchartered-iitian',
          source: 'github',
          title: 'PhysioNet 2026',
          tagline: 'Physiological multi-lead ECG time-series classification & cardiac outcome prediction.',
          stats: { stars: 0, forks: 0, lang: 'Python' },
        },
        {
          id: 'gh:PriyanshGadia/CryptoGraph_Analytics',
          source: 'github',
          title: 'CryptoGraph',
          tagline: 'On-chain network topology analysis and transaction graph clustering.',
          stats: { stars: 0, forks: 0, lang: 'Python' },
        },
        {
          id: 'gh:PriyanshGadia/Respiratory-Support-Optimization',
          source: 'github',
          title: 'Ventilator AI',
          tagline: 'Closed-loop ventilator control & adaptive respiratory support optimization.',
          stats: { stars: 0, forks: 0, lang: 'Python' },
        },
        {
          id: 'gh:PriyanshGadia/Intelligent-Document-Processing-And-Insight-Engine',
          source: 'github',
          title: 'Insight Engine',
          tagline: 'Multimodal document extraction, layout parsing & semantic vector synthesis.',
          stats: { stars: 0, forks: 0, lang: 'Python' },
        },
        {
          id: 'gh:PriyanshGadia/Google-Forms-Bulk-Responder',
          source: 'github',
          title: 'Form Dispatcher',
          tagline: 'Form schema reverse engineering & high-throughput concurrency load tester.',
          stats: { stars: 0, forks: 0, lang: 'Python' },
        }
      ]),
    });
  });

  await page.route('**/api/state/rs1/**', async route => {
    if (route.request().method() === 'PATCH') {
      const body = JSON.parse(route.request().postData() || '{}');
      patches.push({ url: route.request().url(), body });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    }
  });

  try {
    console.log('1. Loading http://localhost:8000/index.html?lab&boot=skip ...');
    await page.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => (window as any).__lab?.state?.ready, { timeout: 15000 });
    await page.waitForTimeout(600);

    // Focus RS1
    console.log('2. Focusing RS1 blueprint deck ...');
    await page.evaluate(() => {
      (window as any).__lab.focusSector('RS1');
    });
    await page.waitForFunction(() => (window as any).__lab?.state?.focusE >= 0.99, { timeout: 10000 });
    await page.waitForTimeout(400);

    const isFocused = await page.evaluate(() => (window as any).__lab.stats().focus === 'RS1');
    console.log(`   -> RS1 focused: ${isFocused}`);
    if (!isFocused) throw new Error('Failed to focus RS1');

    // Check sheet meshes
    const sheetCount = await page.evaluate(() => {
      const g = (window as any).__lab.sectorGroups['RS1'];
      let count = 0;
      g.traverse((o: any) => {
        if (o.isMesh && o.userData?.projectId && o.userData.projectId !== '__placeholder__') count++;
      });
      return count;
    });
    console.log(`   -> Active blueprint sheets loaded: ${sheetCount}`);
    if (sheetCount < 2) throw new Error(`Expected at least 2 blueprint sheets, got ${sheetCount}`);

    // Pre-read desk aperture
    const preReadAperture = await page.evaluate(() => {
      return (window as any).__lab?.bokeh?.uniforms?.aperture?.value ?? null;
    });
    console.log(`   -> Pre-read desk aperture: ${preReadAperture}`);

    // Get projected screen coordinates of the first sheet
    const sheetPos = await page.evaluate(() => {
      const g = (window as any).__lab.sectorGroups['RS1'];
      let target: any = null;
      g.traverse((o: any) => {
        if (o.isMesh && o.userData?.projectId?.toLowerCase() === 'gh:priyanshgadia/cave') target = o;
      });
      if (!target) return null;
      target.updateWorldMatrix(true, true);
      const pos = new (window as any).THREE.Vector3();
      target.getWorldPosition(pos);
      const cam = (window as any).__lab.camera;
      pos.project(cam);
      return {
        x: Math.round((pos.x * 0.5 + 0.5) * window.innerWidth),
        y: Math.round((-pos.y * 0.5 + 0.5) * window.innerHeight),
      };
    });
    console.log(`   -> Target sheet projected screen coordinates: (${sheetPos?.x}, ${sheetPos?.y})`);
    if (!sheetPos) throw new Error('Could not find target sheet mesh');

    // --- TEST 1: Tap-to-read & focus distance check ---
    console.log('\n3. Testing tap-to-read on first sheet ...');
    await page.mouse.move(sheetPos.x, sheetPos.y);
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(300);

    const readState = await page.evaluate(() => {
      const bokeh = (window as any).__lab?.bokeh;
      return {
        focusVal: bokeh?.uniforms?.focus?.value,
        apertureVal: bokeh?.uniforms?.aperture?.value,
      };
    });
    console.log(`   -> Bokeh focus value: ${readState.focusVal} (expected ~0.85 READ_DIST)`);
    console.log(`   -> Bokeh aperture value: ${readState.apertureVal}`);

    const READ_DIST_TOLERANCE = Math.abs((readState.focusVal || 0) - 0.85) < 0.05;
    console.log(`   -> Focus at READ_DIST assertion: ${READ_DIST_TOLERANCE ? 'PASS' : 'FAIL'}`);

    // --- TEST 2: Mid-tween aperture sample during Escape return ---
    console.log('\n4. Testing two-stage Escape & mid-tween aperture retention ...');
    // First Escape: exits read mode
    await page.keyboard.press('Escape');
    // Sample mid-tween after 100ms
    await page.waitForTimeout(100);

    const midTweenState = await page.evaluate(() => {
      const bokeh = (window as any).__lab?.bokeh;
      const focusSector = (window as any).__lab.stats().focus;
      return {
        focusVal: bokeh?.uniforms?.focus?.value,
        apertureVal: bokeh?.uniforms?.aperture?.value,
        focusSector,
      };
    });
    console.log(`   -> Mid-tween focus sector: ${midTweenState.focusSector} (expected RS1 still focused)`);
    console.log(`   -> Mid-tween focus val: ${midTweenState.focusVal} (expected still at READ_DIST 0.85)`);
    console.log(`   -> Mid-tween aperture val: ${midTweenState.apertureVal} (elevated read-mode aperture retained)`);

    const midTweenRetained = Math.abs((midTweenState.focusVal || 0) - 0.85) < 0.05;
    console.log(`   -> Mid-tween readingOrReturning retention: ${midTweenRetained ? 'PASS' : 'FAIL'}`);

    // Wait for settle (1100ms)
    await page.waitForTimeout(1100);
    const postSettleState = await page.evaluate(() => {
      const bokeh = (window as any).__lab?.bokeh;
      return {
        apertureVal: bokeh?.uniforms?.aperture?.value,
      };
    });
    console.log(`   -> Post-settle aperture val: ${postSettleState.apertureVal} (returned to normal desk blur)`);
    const apertureReturned = postSettleState.apertureVal < 0.001;
    console.log(`   -> Post-settle aperture restored: ${apertureReturned ? 'PASS' : 'FAIL'}`);

    // Second Escape: exits sector back to orbit walk
    console.log('\n5. Second Escape (unfocus sector) ...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);

    const finalFocus = await page.evaluate(() => (window as any).__lab.stats().focus);
    console.log(`   -> Focus after second Escape: ${finalFocus} (expected null/unfocused)`);
    const unfocusedPass = finalFocus === null;
    console.log(`   -> Two-stage Escape assertion: ${unfocusedPass ? 'PASS' : 'FAIL'}`);

    // --- TEST 3: Drag & One-PATCH-per-drag assertion ---
    console.log('\n6. Testing drag coalescing (1 PATCH per drag gesture) ...');
    await page.evaluate(() => {
      (window as any).__lab.focusSector('RS1');
    });
    await page.waitForFunction(() => (window as any).__lab?.state?.focusE >= 0.99, { timeout: 10000 });
    await page.waitForTimeout(400);

    patches.length = 0; // reset recorded patches

    // Recalculate sheet position after re-focusing
    const dragSheetPos = await page.evaluate(() => {
      const g = (window as any).__lab.sectorGroups['RS1'];
      let target: any = null;
      g.traverse((o: any) => {
        if (o.isMesh && o.userData?.projectId?.toLowerCase() === 'gh:priyanshgadia/cave') target = o;
      });
      if (!target) return null;
      target.updateWorldMatrix(true, true);
      const pos = new (window as any).THREE.Vector3();
      target.getWorldPosition(pos);
      const cam = (window as any).__lab.camera;
      pos.project(cam);
      return {
        x: Math.round((pos.x * 0.5 + 0.5) * window.innerWidth),
        y: Math.round((-pos.y * 0.5 + 0.5) * window.innerHeight),
      };
    });
    console.log(`   -> Drag target sheet coordinates: (${dragSheetPos?.x}, ${dragSheetPos?.y})`);
    if (!dragSheetPos) throw new Error('Could not find target sheet for drag');

    await page.mouse.move(dragSheetPos.x, dragSheetPos.y);
    await page.mouse.down();
    await page.waitForTimeout(50);

    const isDraggingAfterDown = await page.evaluate(() => Boolean((window as any).__lab?.dragging));
    console.log(`   -> Drag state after mouse down: ${isDraggingAfterDown}`);

    // Drag smoothly across 20 steps
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(dragSheetPos.x + i * 8, dragSheetPos.y + i * 4);
      await page.waitForTimeout(20);
    }

    const isMoved = await page.evaluate(() => (window as any).__lab?.dragging?.moved);
    console.log(`   -> Drag marked moved: ${isMoved}`);

    // Release mouse
    await page.mouse.up();
    await page.waitForTimeout(700); // allow flushPatchNow to land

    console.log(`   -> Total PATCH calls recorded during/after drag: ${patches.length}`);
    if (patches.length > 0) {
      console.log(`   -> Final patch payload:`, JSON.stringify(patches[patches.length - 1].body));
    }
    const dragPatchPass = patches.length === 1;
    console.log(`   -> 1 PATCH per drag gesture assertion: ${dragPatchPass ? 'PASS' : `FAIL (${patches.length} patches sent)`}`);

    // Check console errors
    console.log(`\n7. WebGL warnings / console errors count: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('   Console warnings/errors:', consoleErrors);
    }

    const allPassed = isFocused && sheetCount >= 2 && READ_DIST_TOLERANCE && midTweenRetained && apertureReturned && unfocusedPass && dragPatchPass && consoleErrors.length === 0;
    console.log(`\n=== RESULT: ${allPassed ? 'ALL TESTS PASSED' : 'TESTS FAILED'} ===`);

    if (!allPassed) {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
