// scripts/verify-ls1-closure.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ART = 'C:/Users/gadia/.gemini/antigravity-ide/brain/694bd3af-9386-4a86-8cb6-98cd73f0a84a';
const PUB = path.join(process.cwd(), 'public/screenshots');

function save(name, buf) {
  const artPath = path.join(ART, name);
  const pubPath = path.join(PUB, name);
  fs.writeFileSync(artPath, buf);
  try { fs.writeFileSync(pubPath, buf); } catch {}
  console.log('  -> Saved artifact:', name);
  return artPath;
}

async function run() {
  console.log('=== [LS1 FINAL CLOSURE PASS VERIFICATION] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const consoleLogs = [];
  const consoleWarnings = [];
  const consoleErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push(`[${type}] ${text}`);
    if (type === 'error') {
      consoleErrors.push(text);
    }
    if (type === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      consoleWarnings.push(text);
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });

  await page.evaluate(() => {
    if (window.__lab && typeof window.__lab.skipToFinal === 'function') {
      window.__lab.skipToFinal();
    }
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(1000);

  // 1. INACTIVE LS1 STATE
  console.log('\n--- PHASE 1: INACTIVE LS1 STARTUP ---');
  await page.evaluate(() => {
    // Focus LS1 without waking yet (inspect sleeping pedestal)
    const g = window.__lab.sectorGroups['LS1'];
    const THREE = window.THREE;
    const cam = window.__lab.camera;
    // Frame containment base
    const p = g.localToWorld(new THREE.Vector3(0, 0.45, 1.35));
    const t = g.localToWorld(new THREE.Vector3(0, 0.15, 0.35));
    cam.position.copy(p);
    cam.lookAt(t);
  });
  await page.waitForTimeout(600);
  save('audit_ls1_01_startup_inactive.png', await page.screenshot());

  // Close-up of Activator Control
  console.log('Capturing base activator control close-up...');
  await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    const THREE = window.THREE;
    const cam = window.__lab.camera;
    const p = g.localToWorld(new THREE.Vector3(0, 0.28, 0.95));
    const t = g.localToWorld(new THREE.Vector3(0, 0.082, 0.60));
    cam.position.copy(p);
    cam.lookAt(t);
  });
  await page.waitForTimeout(400);
  save('audit_ls1_02_activator.png', await page.screenshot());

  // 2. HOLOGRAM BOOT SEQUENCE
  console.log('\n--- PHASE 2: WAKING STATION & HOLOGRAM BOOT ---');
  await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    const THREE = window.THREE;
    const cam = window.__lab.camera;
    const p = g.localToWorld(new THREE.Vector3(0.36, 1.08, 1.88));
    const t = g.localToWorld(new THREE.Vector3(0, 0.95, 0.0));
    cam.position.copy(p);
    cam.lookAt(t);
    window.__lab.wakeLS1();
  });
  await page.waitForTimeout(500); // Midway through hologram boot (~0.5s)
  save('audit_ls1_03_hologram_boot.png', await page.screenshot());

  // 3. CRYSTAL BIRTH (STELLAR ACCRETION DUST)
  console.log('\n--- PHASE 3: STELLAR ACCRETION CRYSTAL BIRTH ---');
  await page.waitForTimeout(1000); // At ~1.5s (in crystal birth phase)
  save('audit_ls1_04_crystal_birth.png', await page.screenshot());

  // Wait for crystal birth completion (~1.8s + buffer)
  console.log('Waiting for constellation stabilization...');
  await page.waitForFunction(() => window.__lab.ls1StationState === 'active', { timeout: 8000 });
  await page.waitForTimeout(800);
  save('audit_ls1_05_constellation_active.png', await page.screenshot());

  // 4. INSPECT 8 DESTINATION CRYSTALS
  console.log('\n--- PHASE 4: 8-DESTINATION CONSTELLATION AUDIT ---');
  const crystalInfo = await page.evaluate(() => {
    const crystals = window.__lab.ls1Crystals || [];
    return crystals.map((c, i) => {
      const d = c.userData.dest;
      const mesh = c.userData.crystalMesh;
      const geo = mesh.geometry;
      // Get radius parameter from icosahedron
      const radius = geo.parameters?.radius || 0.026;
      return {
        index: i,
        id: d.id,
        url: d.url,
        colorHex: d.hex,
        pos: d.pos,
        radius,
        hasLabels: !!c.userData.labelMesh,
        visible: c.visible
      };
    });
  });
  console.log('Crystals:', JSON.stringify(crystalInfo, null, 2));

  // Verify multi-destination constellation shot
  save('audit_ls1_14_multidestination_constellation.png', await page.screenshot());

  // 5. GITHUB DESTINATION PORTAL SEQUENCE
  console.log('\n--- PHASE 5: GITHUB PORTAL & WORLD PREVIEW ---');
  // Idle GitHub crystal
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
  });
  await page.waitForTimeout(400);
  save('audit_ls1_06_github_idle.png', await page.screenshot());

  // Open GitHub portal
  console.log('Opening GITHUB portal...');
  await page.evaluate(() => {
    const githubNode = window.__lab.ls1Crystals.find(c => c.userData.dest.id === 'GITHUB');
    window.__lab.activatePortal(githubNode);
  });
  await page.waitForTimeout(350); // Opening rupture
  save('audit_ls1_07_portal_opening.png', await page.screenshot());

  await page.waitForTimeout(1100); // Fully stabilized portal
  save('audit_ls1_08_portal_stable.png', await page.screenshot());

  // Close-up into throat showing deep preview world
  console.log('Capturing portal throat close-up with deep preview world...');
  await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    const THREE = window.THREE;
    const cam = window.__lab.camera;
    // Frame portal directly
    const p = g.localToWorld(new THREE.Vector3(0.68, 1.02, 1.25));
    const t = g.localToWorld(new THREE.Vector3(0.68, 1.02, 0.80));
    cam.position.copy(p);
    cam.lookAt(t);
  });
  await page.waitForTimeout(500);
  save('audit_ls1_09_portal_world_preview.png', await page.screenshot());

  // 6. SUCTION TRAVERSAL
  console.log('\n--- PHASE 6: SUCTION TRAVERSAL ANIMATION ---');
  // Reset camera to normal LS1 focus and ensure portal is active
  await page.evaluate(() => {
    const cfg = window.__lab.FOCUS_CFG['LS1'];
    const g = window.__lab.sectorGroups['LS1'];
    const [p, t] = cfg.dolly(g);
    window.__lab.camera.position.copy(p);
    window.__lab.camera.lookAt(t);

    const ghNode = window.__lab.ls1Crystals.find(c => c.userData.dest.id === 'GITHUB');
    window.__lab.activatePortal(ghNode);

    // Intercept window.open so it doesn't open new window during test
    window.__lastOpenedUrl = null;
    window.open = (url) => { window.__lastOpenedUrl = url; };
    window.__lab.traversePortal();
  });
  console.log('Triggering traversePortal()...');
  await page.waitForTimeout(800); // Midway into suction (accelerated smoke & narrowing FOV)
  save('audit_ls1_10_suction_traversal.png', await page.screenshot());

  await page.waitForTimeout(1000); // Crossing the throat
  save('audit_ls1_11_suction_crossing.png', await page.screenshot());

  // Wait for 2.0s traversal completion
  await page.waitForTimeout(800);

  const traversalResult = await page.evaluate(() => ({
    openedUrl: window.__lastOpenedUrl,
    storedReturnKey: sessionStorage.getItem('vault_ls1_return')
  }));
  console.log('Traversal Result:', traversalResult);

  // 7. RETURN & REVERSE COLLAPSE
  console.log('\n--- PHASE 7: RETURN & REVERSE COLLAPSE ---');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
  });
  await page.waitForTimeout(600); // Reverse collapse in progress
  save('audit_ls1_12_return_reverse_collapse.png', await page.screenshot());

  await page.waitForTimeout(1600); // Restored idle
  save('audit_ls1_13_restored_idle.png', await page.screenshot());

  // 8. SPOTIFY PORTAL TEST
  console.log('\n--- PHASE 8: SPOTIFY PORTAL ACTIVATION ---');
  await page.evaluate(() => {
    const spotifyNode = window.__lab.ls1Crystals.find(c => c.userData.dest.id === 'SPOTIFY');
    window.__lab.activatePortal(spotifyNode);
  });
  await page.waitForTimeout(1200);
  save('audit_ls1_15_spotify_portal.png', await page.screenshot());

  // Close portal
  await page.evaluate(() => {
    window.__lab.closePortal(true);
  });
  await page.waitForTimeout(400);

  // 9. PERFORMANCE BENCHMARK (120 frames at DPR 1)
  console.log('\n--- PHASE 9: CONTROLLED PERFORMANCE AUDIT (DPR 1) ---');
  const perfResults = await page.evaluate(async () => {
    const fpsSamples = [];
    let lastTime = performance.now();
    for (let f = 0; f < 120; f++) {
      await new Promise(r => requestAnimationFrame(r));
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;
      if (dt > 0) fpsSamples.push(1000 / dt);
    }
    const avgFps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
    const minFps = Math.min(...fpsSamples);
    return {
      dpr: window.devicePixelRatio,
      avgFps: +avgFps.toFixed(1),
      minFps: +minFps.toFixed(1),
      sampleCount: fpsSamples.length
    };
  });
  console.log('Performance Audit:', JSON.stringify(perfResults, null, 2));

  // Summary of checks
  console.log('\n=== [TECHNICAL COMPLIANCE AUDIT] ===');
  console.log(`Console Warnings count: ${consoleWarnings.length}`);
  console.log(`Console Errors count: ${consoleErrors.length}`);
  if (consoleWarnings.length > 0) console.log('Warnings:', consoleWarnings);
  if (consoleErrors.length > 0) console.log('Errors:', consoleErrors);

  await browser.close();
  console.log('\n=== [LS1 FINAL CLOSURE PASS COMPLETE] ===');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
