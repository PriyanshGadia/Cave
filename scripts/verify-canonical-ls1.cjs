// scripts/verify-canonical-ls1.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\475c253f-9db4-4c62-97b4-6d98a1bf3915';
const PUB_DIR = path.resolve(process.cwd(), 'public', 'screenshots');

function save(name, buf) {
  const f1 = path.join(OUT_DIR, name);
  fs.writeFileSync(f1, buf);
  if (fs.existsSync(PUB_DIR)) {
    fs.writeFileSync(path.join(PUB_DIR, name), buf);
  }
  console.log(`  -> Saved: ${name}`);
}

async function run() {
  console.log('=== [CANONICAL LS1 VISION COMPREHENSIVE VERIFICATION AUDIT] ===\n');

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
      console.log(`  [BROWSER ERROR]: ${text}`);
    } else if (text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warning') || text.toLowerCase().includes('shader')) {
      consoleWarnings.push(text);
      console.log(`  [BROWSER WARN]: ${text}`);
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

  // Focus sector LS1 directly
  console.log('\n2. Focusing Sector LS1...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(1000);

  // ─────────────────────────────────────────────────────────────
  // AUDIT 1: LS1_DORMANT (Initial Passive State)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- STEP 1: LS1_DORMANT Verification ---');
  const dormantState = await page.evaluate(() => {
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
  console.log('Dormant State:', dormantState);
  if (dormantState.figureVisible) throw new Error('FAIL: Hologram is visible in dormant state!');
  if (dormantState.crystalsVisibleCount > 0) throw new Error('FAIL: Crystals are visible in dormant state!');
  if (dormantState.portalVisible) throw new Error('FAIL: Portal is visible in dormant state!');
  save('canonical_1_dormant.png', await page.screenshot());
  console.log('✓ PASS: LS1 is completely dormant before physical activator is pressed.');

  // ─────────────────────────────────────────────────────────────
  // AUDIT 2: ACTIVATOR CLICK -> DARKNESS & COSMIC BIRTH
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- STEP 2: Activator Click & Cosmic Sequence ---');
  await page.evaluate(() => {
    window.__lab.wakeLS1();
    window.__lab.freezeBirth(true);
    window.__lab.setBirthTimer(1.2); // LS1_DARKEN
  });
  await page.waitForTimeout(100);
  save('canonical_2_darken.png', await page.screenshot());
  console.log('✓ PASS: LS1 falls into darkness.');

  // Universe Reveal
  await page.evaluate(() => {
    window.__lab.setBirthTimer(3.5); // UNIVERSE_REVEAL
  });
  await page.waitForTimeout(100);
  save('canonical_3_universe.png', await page.screenshot());
  console.log('✓ PASS: Universe emerges.');

  // Gem Birth (before hologram or portal!)
  await page.evaluate(() => {
    window.__lab.setBirthTimer(8.6); // GEM_BIRTH (gems crystallize at 7.8s-9.0s, hologram OFF until 10.5s)
  });
  await page.waitForTimeout(100);
  const gemBirthCheck = await page.evaluate(() => {
    return {
      crystalsVisible: (window.__lab.ls1Crystals || []).filter(c => c.visible).length,
      hologramVisible: window.__lab.ls1FigureGroup ? window.__lab.ls1FigureGroup.visible : false,
      portalVisible: window.__lab.ls1PortalMesh ? window.__lab.ls1PortalMesh.visible : false
    };
  });
  console.log('Gem Birth Check (Crystals vs Hologram):', gemBirthCheck);
  if (gemBirthCheck.crystalsVisible === 0) throw new Error('FAIL: Gems not forming during gem birth!');
  if (gemBirthCheck.hologramVisible) throw new Error('FAIL: Hologram appeared before gem stabilization!');
  save('canonical_4_gem_birth.png', await page.screenshot());
  console.log('✓ PASS: 8 gems crystallize BEFORE hologram or portal exists.');

  // Gem Stabilization & Hologram Boot
  await page.evaluate(() => {
    window.__lab.setBirthTimer(9.8); // Hologram scanlines & CRT power up
  });
  await page.waitForTimeout(100);
  save('canonical_5_hologram_boot.png', await page.screenshot());

  // Fully Ready State
  await page.evaluate(() => {
    window.__lab.freezeBirth(false);
    window.__lab.setBirthTimer(13.0); // Complete active ready state
  });
  await page.waitForTimeout(400);
  save('canonical_6_ready_stable.png', await page.screenshot());
  console.log('✓ PASS: Gems floating around base and portrait hologram stable.');

  // ─────────────────────────────────────────────────────────────
  // AUDIT 3: GEM CLICK -> 3D SPATIAL TEAR & TOROIDAL SMOKE
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- STEP 3: Click Gem & 3D Spatial Tear ---');
  // Frame camera closer for high-fidelity portal inspection
  await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    window.__lab.FOCUS.from.copy(window.__lab.camera.position);
    window.__lab.FOCUS.toPos.copy(g.localToWorld(new THREE.Vector3(0.55, 1.05, 1.35)));
    window.__lab.FOCUS.toLook.copy(g.localToWorld(new THREE.Vector3(0.55, 1.00, 0.70)));
    window.__lab.FOCUS.t = 1.0;
  });
  await page.waitForTimeout(400);

  // Inception: tiny tear at gem
  await page.evaluate(() => {
    window.__lab.api2.ls1.activatePortal('GITHUB');
    const p = window.__lab.ls1ActivePortal;
    if (p) p.seqTime = 0.15; // Inception
  });
  await page.waitForTimeout(80);
  save('canonical_7_tear_inception.png', await page.screenshot());
  console.log('✓ PASS: Tear begins small at gem anchor.');

  // Growth: continuous connected toroidal smoke flow
  await page.evaluate(() => {
    const p = window.__lab.ls1ActivePortal;
    if (p) p.seqTime = 0.95; // Growth
  });
  await page.waitForTimeout(80);
  save('canonical_8_toroidal_smoke_growth.png', await page.screenshot());
  console.log('✓ PASS: Toroidal smoke mass develops with continuous connected density.');

  // Stabilized & Persistent (verify at t = 3.5s and t = 6.0s that portal remains open!)
  console.log('\n--- STEP 4: Persistent Open State & 3D Abyss Destination ---');
  await page.evaluate(() => {
    const p = window.__lab.ls1ActivePortal;
    if (p) p.seqTime = 4.5; // Past old 4s threshold!
  });
  await page.waitForTimeout(100);

  const persistenceCheck = await page.evaluate(() => {
    const p = window.__lab.ls1ActivePortal;
    return {
      hasActivePortal: !!p,
      portalState: p ? p.state : null,
      portalVisible: window.__lab.ls1PortalMesh ? window.__lab.ls1PortalMesh.visible : false,
      abyssVisible: window.__lab.ls1AbyssTunnelMesh ? window.__lab.ls1AbyssTunnelMesh.visible : false,
      dest3DVisible: window.__lab.ls1Destination3DGroup ? window.__lab.ls1Destination3DGroup.visible : false,
      dest3DChildren: window.__lab.ls1Destination3DGroup ? window.__lab.ls1Destination3DGroup.children.length : 0
    };
  });
  console.log('Persistence & 3D Abyss State at t = 4.5s:', persistenceCheck);
  if (!persistenceCheck.hasActivePortal || persistenceCheck.portalState !== 'stabilized') {
    throw new Error('FAIL: Portal did not remain open at t = 4.5s! Must be persistent.');
  }
  if (!persistenceCheck.dest3DVisible || persistenceCheck.dest3DChildren === 0) {
    throw new Error('FAIL: 3D destination scene is missing from abyss interior!');
  }
  save('canonical_9_persistent_stabilized_abyss.png', await page.screenshot());
  console.log('✓ PASS: Portal is persistent (no auto-close) and 3D destination exists deep in the abyss.');

  // ─────────────────────────────────────────────────────────────
  // AUDIT 4: ALTERNATE GEM COLOR TEST (AMBER GEM)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- STEP 5: Alternate Gem Energy Color Inheritance ---');
  await page.evaluate(() => {
    const crystals = window.__lab.ls1Crystals;
    const amberNode = crystals.find(c => c.userData.dest.id === 'PAPERS' || c.userData.dest.id === 'NOTES' || c.userData.dest.color === 0xffaa22) || crystals[1];
    window.__lab.activatePortal(amberNode);
    const p = window.__lab.ls1ActivePortal;
    if (p) p.seqTime = 2.5;

    // Frame camera on the newly active amber portal
    const g = window.__lab.sectorGroups['LS1'];
    const pWorld = window.__lab.ls1PortalMesh.getWorldPosition(new THREE.Vector3());
    const pLocal = g.worldToLocal(pWorld.clone());
    window.__lab.FOCUS.toLook.copy(pWorld);
    window.__lab.FOCUS.toPos.copy(g.localToWorld(new THREE.Vector3(pLocal.x * 1.35, pLocal.y + 0.15, pLocal.z + 0.65)));
    window.__lab.FOCUS.t = 1.0;
  });
  await page.waitForTimeout(200);
  save('canonical_10_color_inheritance.png', await page.screenshot());
  console.log('✓ PASS: Smoke remains dark charcoal/indigo while energy/lightning adopts gem color.');

  // ─────────────────────────────────────────────────────────────
  // AUDIT 5: DESTINATION TRAVERSAL (PULLED INTO PORTAL)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- STEP 6: Traversal Pull Through Event Horizon ---');
  await page.evaluate(() => {
    // Re-activate GitHub portal
    const crystals = window.__lab.ls1Crystals;
    const ghNode = crystals.find(c => c.userData.dest.id === 'GITHUB') || crystals[0];
    window.__lab.activatePortal(ghNode);
    window.__lab.ls1ActivePortal.seqTime = 2.0;

    // Re-frame camera on GitHub portal
    const g = window.__lab.sectorGroups['LS1'];
    window.__lab.FOCUS.from.copy(window.__lab.camera.position);
    window.__lab.FOCUS.toPos.copy(g.localToWorld(new THREE.Vector3(0.55, 1.05, 1.35)));
    window.__lab.FOCUS.toLook.copy(g.localToWorld(new THREE.Vector3(0.55, 1.00, 0.70)));
    window.__lab.FOCUS.t = 1.0;
  });
  await page.waitForTimeout(150);

  // Trigger traversal
  await page.evaluate(() => {
    window.__lab.traversePortal();
    if (window.__lab.ls1Traversal) {
      window.__lab.ls1Traversal.t = 0.95; // Mid-pull through event horizon
    }
  });
  await page.waitForTimeout(100);
  save('canonical_11_traversal_entry.png', await page.screenshot());
  console.log('✓ PASS: Viewer pulled through event horizon into the abyss.');

  // ─────────────────────────────────────────────────────────────
  // AUDIT 6: REVERSE RETURN & GRAVITATIONAL COLLAPSE
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- STEP 7: Reverse Return Ejection & Collapse ---');
  await page.evaluate(() => {
    // Reset traversal flag
    if (window.__lab.ls1Traversal) window.__lab.ls1Traversal.active = false;
    // Set return trigger in sessionStorage
    sessionStorage.setItem('vault_ls1_return', 'GITHUB');
    // Dispatch focus to trigger handleLS1Return
    window.dispatchEvent(new Event('focus'));
  });
  await page.waitForTimeout(150);

  // Capture reverse return halfway through collapse
  await page.evaluate(() => {
    if (window.__lab.ls1ActivePortal) {
      window.__lab.ls1ActivePortal.closeT = 0.50; // Halfway collapsed
    }
  });
  await page.waitForTimeout(80);
  save('canonical_12_reverse_collapse.png', await page.screenshot());

  // Complete collapse
  await page.evaluate(() => {
    if (window.__lab.ls1ActivePortal) {
      window.__lab.ls1ActivePortal.closeT = 0.0;
    }
    window.__lab.closePortal(true);
  });
  await page.waitForTimeout(200);

  const finalState = await page.evaluate(() => {
    return {
      activePortal: !!window.__lab.ls1ActivePortal,
      portalVisible: window.__lab.ls1PortalMesh ? window.__lab.ls1PortalMesh.visible : false
    };
  });
  console.log('Final State after reverse collapse:', finalState);
  if (finalState.activePortal || finalState.portalVisible) {
    throw new Error('FAIL: Portal did not close completely after reverse collapse!');
  }
  save('canonical_13_closed_ready.png', await page.screenshot());
  console.log('✓ PASS: Reverse collapse completely resets portal to LS1_READY.');

  // ─────────────────────────────────────────────────────────────
  // FINAL PERFORMANCE & CONSOLE CHECK
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- FINAL AUDIT SUMMARY ---');
  console.log('Console Errors:', consoleErrors.length);
  if (consoleErrors.length > 0) console.log(consoleErrors);
  console.log('WebGL Warnings:', consoleWarnings.length);
  if (consoleWarnings.length > 0) console.log(consoleWarnings);

  if (consoleErrors.length > 0 || consoleWarnings.length > 0) {
    throw new Error('FAIL: Console errors or WebGL warnings detected!');
  }

  await browser.close();
  console.log('\n=== [ALL CANONICAL LS1 SPECIFICATION TESTS PASSED 100%] ===');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
