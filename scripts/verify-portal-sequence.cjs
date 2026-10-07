// scripts/verify-portal-sequence.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\475c253f-9db4-4c62-97b4-6d98a1bf3915';

function save(name, buf) {
  const f = path.join(OUT_DIR, name);
  fs.writeFileSync(f, buf);
  console.log(`  -> Saved: ${name} -> ${f}`);
}

async function run() {
  console.log('=== [LS1 EXACT 4-PHASE CHRONOLOGICAL PORTAL SEQUENCE AUDIT] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--enable-webgl',
      '--enable-features=Vulkan',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  const consoleErrors = [];
  const consoleWarnings = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error' && !text.includes('favicon')) {
      consoleErrors.push(text);
      console.log(`  [BROWSER ${type}]: ${text}`);
    } else if (text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warning') || text.toLowerCase().includes('shader')) {
      consoleWarnings.push(text);
      console.log(`  [BROWSER ${type}]: ${text}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.log('  [UNCAUGHT EXCEPTION]:', err.message);
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 35000 });
  await page.waitForFunction(() => typeof window.__lab !== 'undefined', { timeout: 25000 });
  await page.waitForTimeout(2000);

  // 1. VERIFY STARTUP PASSIVE STANDBY AT BOOT=SKIP
  console.log('\n--- AUDIT 1: Verify Startup Passive Standby ---');
  const initialStandbyState = await page.evaluate(() => {
    const lab = window.__lab;
    const figureGroup = lab.ls1FigureGroup;
    const crystals = lab.ls1Crystals || [];
    const portalMesh = lab.ls1PortalMesh;
    const stationState = lab.ls1StationState;

    return {
      stationState,
      figureVisible: figureGroup ? figureGroup.visible : false,
      crystalsCount: crystals.length,
      crystalsVisibleCount: crystals.filter(c => c.visible).length,
      portalVisible: portalMesh ? portalMesh.visible : false
    };
  });
  console.log('Initial LS1 Startup State:', initialStandbyState);
  if (initialStandbyState.figureVisible) {
    throw new Error('LS1 Hologram figure is visible at startup before pressing button!');
  }
  if (initialStandbyState.crystalsVisibleCount > 0) {
    throw new Error('LS1 Crystals are visible at startup before pressing button!');
  }
  if (initialStandbyState.portalVisible) {
    throw new Error('LS1 Portal is visible at startup before pressing button!');
  }
  console.log('✓ PASS: LS1 is in complete passive standby at startup.');

  // Focus sector LS1
  console.log('\n2. Focusing Sector LS1...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(1000);

  // Capture passive workbench waiting for button press
  save('phase0_startup_standby.png', await page.screenshot());

  // Wake LS1 (press activator button and complete cosmic birth so crystals are available)
  console.log('\n3. Waking LS1 and advancing to active state with crystals...');
  await page.evaluate(() => {
    window.__lab.wakeLS1();
    // Fast-forward birth sequence to active state
    window.__lab.setBirthTimer(13.0);
  });
  await page.waitForTimeout(500);

  // Position camera for optimal close inspection of the portal aperture & smoke
  console.log('4. Framing camera on Portal anchor...');
  await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    // Closer view directly framing the portal aperture to inspect cloud texture, rim accent, and tearing
    window.__lab.FOCUS.from.copy(window.__lab.camera.position);
    window.__lab.FOCUS.toPos.copy(g.localToWorld(new THREE.Vector3(0.68, 1.05, 1.25)));
    window.__lab.FOCUS.toLook.copy(g.localToWorld(new THREE.Vector3(0.68, 1.02, 0.80)));
    window.__lab.FOCUS.t = 1.0;
  });
  await page.waitForTimeout(600);

  // ── PHASE 1: Inception & Reality Tear (0.0s – 0.6s) ──
  // A. Singularity Point (0.0s – 0.2s): needle-thin flash of intense cyan-white light + lensing
  console.log('\n--- PHASE 1A: Singularity Needle Flash & Lensing (t = 0.12s) ---');
  await page.evaluate(() => {
    // Activate blue stone (GITHUB crystal)
    window.__lab.api2.ls1.activatePortal('GITHUB');
    const p = window.__lab.ls1ActivePortal;
    if (p) {
      p.seqTime = 0.12;
    }
  });
  await page.waitForTimeout(60);
  save('phase1a_singularity_needle.png', await page.screenshot());

  // B. Vertical Cleave (0.2s – 0.6s): splits along Y-axis into 2.5:1 ragged oval tear with sizzling perimeter
  console.log('--- PHASE 1B: Vertical Cleave into 2.5:1 Ragged Tear (t = 0.45s) ---');
  await page.evaluate(() => {
    const p = window.__lab.ls1ActivePortal;
    if (p) {
      p.seqTime = 0.45;
    }
  });
  await page.waitForTimeout(60);
  save('phase1b_vertical_cleave.png', await page.screenshot());

  // ── PHASE 2: Eruption of Inky Matter & Arc Discharge (0.6s – 1.8s) ──
  // Dense ink-like nebular smoke bursting forward along +Z; internal arc network; NO orbs of light
  console.log('--- PHASE 2: Eruption of Inky Matter & Arc Discharge (t = 1.20s) ---');
  await page.evaluate(() => {
    const p = window.__lab.ls1ActivePortal;
    if (p) {
      p.seqTime = 1.20;
    }
  });
  await page.waitForTimeout(80);
  save('phase2_inky_matter_burst.png', await page.screenshot());

  // ── PHASE 3: Equilibrium & Inward Gravitational Siphon (1.8s – 3.2s) ──
  // Forward motion stalls; toroidal suction back into void; inky tendrils dissolve across rim; void center deep space window
  console.log('--- PHASE 3: Toroidal Inward Siphon & Void Window (t = 2.40s) ---');
  await page.evaluate(() => {
    const p = window.__lab.ls1ActivePortal;
    if (p) {
      p.seqTime = 2.40;
    }
  });
  await page.waitForTimeout(80);
  save('phase3_toroidal_siphon_void.png', await page.screenshot());

  // ── PHASE 4: Snap Implosion & Dissipation (3.2s – 4.0s) ──
  // Horizontal collapse into blinding vertical line of light; smoke diffuses to faint mist
  console.log('--- PHASE 4: Snap Implosion & Mist Dissipation (t = 3.50s) ---');
  await page.evaluate(() => {
    const p = window.__lab.ls1ActivePortal;
    if (p) {
      p.seqTime = 3.50;
    }
  });
  await page.waitForTimeout(80);
  save('phase4_snap_implosion.png', await page.screenshot());

  // ── PHASE 4 Complete: Full closure at t >= 4.0s ──
  console.log('--- PHASE 4 Post-Closure: Complete Clean Reset (t = 4.10s) ---');
  await page.evaluate(() => {
    const p = window.__lab.ls1ActivePortal;
    if (p) {
      p.seqTime = 4.10;
    }
  });
  await page.waitForTimeout(100);
  const closedState = await page.evaluate(() => {
    return {
      portalVisible: window.__lab.ls1PortalMesh ? window.__lab.ls1PortalMesh.visible : false,
      activePortal: !!window.__lab.ls1ActivePortal
    };
  });
  console.log('State at t = 4.10s:', closedState);
  save('phase4_complete_closure.png', await page.screenshot());

  // ── DYNAMIC COLOR INHERITANCE VERIFICATION (Amber Stone) ──
  console.log('\n--- AUDIT 2: Dynamic Stone Color Inheritance (AMBER stone) ---');
  await page.evaluate(() => {
    // Activate amber crystal (e.g. RSS/NEWS or NOTES)
    const crystals = window.__lab.ls1Crystals;
    const amberNode = crystals.find(c => c.userData.dest.id === 'NOTES' || c.userData.dest.id === 'CALENDAR' || c.userData.dest.color === 0xffaa22) || crystals[1];
    window.__lab.activatePortal(amberNode);
    const p = window.__lab.ls1ActivePortal;
    if (p) {
      p.seqTime = 1.25; // Phase 2 burst with amber lightning & accent
    }
  });
  await page.waitForTimeout(100);
  save('portal_color_amber.png', await page.screenshot());

  // Steady-state FPS measurement
  console.log('\n5. Measuring steady-state FPS over 120 frames at DPR 1...');
  const fpsData = await page.evaluate(() => {
    return new Promise(resolve => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        if (frames < 120) {
          requestAnimationFrame(tick);
        } else {
          const elapsed = performance.now() - start;
          resolve({
            fps: Math.round((frames / (elapsed / 1000)) * 10) / 10,
            elapsedMs: Math.round(elapsed),
            frames
          });
        }
      }
      requestAnimationFrame(tick);
    });
  });

  console.log(`  -> Measured FPS: ${fpsData.fps} over ${fpsData.frames} frames (${fpsData.elapsedMs}ms)`);

  console.log('\n--- VERIFICATION AUDIT SUMMARY ---');
  console.log('Console Errors:', consoleErrors.length);
  if (consoleErrors.length > 0) console.log(consoleErrors);
  console.log('WebGL Warnings:', consoleWarnings.length);
  if (consoleWarnings.length > 0) console.log(consoleWarnings);
  console.log(`FPS: ${fpsData.fps} (Gate Requirement: >= 30 FPS)`);
  console.log('----------------------------------\n');

  await browser.close();
  console.log('=== [4-PHASE CHRONOLOGICAL PORTAL VERIFICATION FINISHED] ===');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
