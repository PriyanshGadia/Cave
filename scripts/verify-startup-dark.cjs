const { chromium } = require('playwright');

async function main() {
  console.log('Starting Startup Deactivation and Focus Camera Verification...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  const webglWarnings = [];
  page.on('console', msg => {
    const text = msg.text();
    if (/warn|error|webgl/i.test(text) && !/favicon|vite/i.test(text)) {
      webglWarnings.push(text);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Verify Dark Boot Sequence at boot=5.0s
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 1. Testing startup state at t = 5.0s (darkness) ---');
  await page.goto('http://localhost:3000/index.html?lab&boot=5', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__lab && !!window.__lab.state, { timeout: 15000 });
  await page.waitForTimeout(1000);

  const state5s = await page.evaluate(() => {
    const lab = window.__lab;
    const t = lab.state.t;

    let ls1Visible = false;
    let ls1Light = 0;
    let ls1ActivatorEmissive = 0;
    let ls1RingOpacity = 0;
    if (lab.sectorGroups && lab.sectorGroups['LS1']) {
      const g = lab.sectorGroups['LS1'];
      ls1Visible = g.visible;
      g.traverse(o => {
        if (o.isPointLight) ls1Light = o.intensity;
        if (o.userData?.isActivator && o.material) ls1ActivatorEmissive = o.material.emissiveIntensity;
        if (o.material?.opacity !== undefined && o.geometry?.type === 'RingGeometry') ls1RingOpacity = o.material.opacity;
      });
    }

    const globeVisible = lab.globeGroup ? lab.globeGroup.visible : false;

    let maxSheetEmissive = 0;
    let sheetVisible = false;
    if (lab.sheets) {
      lab.sheets.forEach(s => {
        if (s.plane?.material?.emissiveIntensity > maxSheetEmissive) {
          maxSheetEmissive = s.plane.material.emissiveIntensity;
        }
      });
    }
    if (lab.sectorGroups && lab.sectorGroups['RS1']) {
      lab.sectorGroups['RS1'].traverse(o => {
        if (o.userData?.isBlueprint || o.children?.some(c => c.userData?.sheet)) {
          sheetVisible = o.visible;
        }
      });
    }

    return {
      t: +t.toFixed(2),
      ls1Visible,
      ls1Light,
      ls1ActivatorEmissive,
      ls1RingOpacity,
      globeVisible,
      maxSheetEmissive,
      sheetVisible
    };
  });

  console.log('State at t = 5.0s:', state5s);
  await page.screenshot({ path: 'public/screenshots/startup-dark-5s.png' });

  // ─────────────────────────────────────────────────────────────
  // 2. Verify Dark Boot Sequence at boot=15.0s (midway through dark startup)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing startup state at t = 15.0s (mid dark boot) ---');
  await page.goto('http://localhost:3000/index.html?lab&boot=15', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__lab && !!window.__lab.state, { timeout: 15000 });
  await page.waitForTimeout(1000);

  const state15s = await page.evaluate(() => {
    const lab = window.__lab;
    const t = lab.state.t;

    let ls1Visible = false;
    let ls1Light = 0;
    let ls1ActivatorEmissive = 0;
    if (lab.sectorGroups && lab.sectorGroups['LS1']) {
      const g = lab.sectorGroups['LS1'];
      ls1Visible = g.visible;
      g.traverse(o => {
        if (o.isPointLight) ls1Light = o.intensity;
        if (o.userData?.isActivator && o.material) ls1ActivatorEmissive = o.material.emissiveIntensity;
      });
    }

    const globeVisible = lab.globeGroup ? lab.globeGroup.visible : false;

    let maxSheetEmissive = 0;
    if (lab.sheets) {
      lab.sheets.forEach(s => {
        if (s.plane?.material?.emissiveIntensity > maxSheetEmissive) {
          maxSheetEmissive = s.plane.material.emissiveIntensity;
        }
      });
    }

    return {
      t: +t.toFixed(2),
      ls1Visible,
      ls1Light,
      ls1ActivatorEmissive,
      globeVisible,
      maxSheetEmissive
    };
  });

  console.log('State at t = 15.0s:', state15s);
  await page.screenshot({ path: 'public/screenshots/startup-dark-15s.png' });

  // Assertions for darkness
  if (state5s.ls1Visible || state5s.ls1Light > 0 || state5s.ls1ActivatorEmissive > 0) {
    throw new Error('LS1 is not completely deactivated at t=5s!');
  }
  if (state5s.globeVisible) {
    throw new Error('LS3 Globe is visible at t=5s!');
  }
  if (state5s.maxSheetEmissive > 0) {
    throw new Error('RS1 Blueprints are emitting light at t=5s!');
  }
  if (state15s.ls1Visible || state15s.ls1Light > 0 || state15s.ls1ActivatorEmissive > 0) {
    throw new Error('LS1 is not completely deactivated at t=15s!');
  }
  if (state15s.globeVisible) {
    throw new Error('LS3 Globe is visible at t=15s!');
  }
  if (state15s.maxSheetEmissive > 0) {
    throw new Error('RS1 Blueprints are emitting light at t=15s!');
  }
  console.log('✓ SUCCESS: All 3 objects are completely deactivated during startup darkness.');

  // ─────────────────────────────────────────────────────────────
  // 3. Verify Powered-On State at boot=skip (when lights power on)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing powered-on state at boot=skip ---');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__lab && window.__lab.state && window.__lab.state.ready, { timeout: 15000 });
  await page.waitForTimeout(1000);

  const poweredState = await page.evaluate(() => {
    const lab = window.__lab;
    let ls1Visible = false;
    let ls1Light = 0;
    let ls1ActivatorEmissive = 0;
    let ls1CoreEmissive = 0;
    if (lab.sectorGroups && lab.sectorGroups['LS1']) {
      const g = lab.sectorGroups['LS1'];
      ls1Visible = g.visible;
      g.traverse(o => {
        if (o.isPointLight) ls1Light = o.intensity;
        if (o.userData?.isActivator && o.material) ls1ActivatorEmissive = o.material.emissiveIntensity;
        if (o.material?.emissiveIntensity && o.geometry?.type === 'RingGeometry') {
          ls1CoreEmissive = o.material.emissiveIntensity;
        }
      });
    }

    const globeVisible = lab.globeGroup ? lab.globeGroup.visible : false;

    let maxSheetEmissive = 0;
    if (lab.sheets) {
      lab.sheets.forEach(s => {
        if (s.plane?.material?.emissiveIntensity > maxSheetEmissive) {
          maxSheetEmissive = s.plane.material.emissiveIntensity;
        }
      });
    }

    return {
      ready: lab.state.ready,
      ls1Visible,
      ls1Light,
      ls1ActivatorEmissive: +ls1ActivatorEmissive.toFixed(2),
      ls1CoreEmissive: +ls1CoreEmissive.toFixed(2),
      globeVisible,
      maxSheetEmissive: +maxSheetEmissive.toFixed(2)
    };
  });

  console.log('Powered-On State:', poweredState);
  await page.screenshot({ path: 'public/screenshots/startup-powered-ready.png' });

  if (!poweredState.ls1Visible || poweredState.ls1ActivatorEmissive <= 0) {
    throw new Error('LS1 did not power on!');
  }
  if (!poweredState.globeVisible) {
    throw new Error('LS3 Globe did not power on!');
  }
  if (poweredState.maxSheetEmissive <= 0) {
    throw new Error('RS1 Blueprints did not power on!');
  }
  console.log('✓ SUCCESS: All 3 objects power on and activate cleanly when lights are active.');

  // ─────────────────────────────────────────────────────────────
  // 4. Verify Sector Focus Camera for all 6 sectors
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing Sector Focus Camera Directions for all 6 Sectors ---');
  const sectors = ['RS1', 'RS2', 'RS3', 'LS3', 'LS2', 'LS1'];
  const focusResults = {};

  for (const s of sectors) {
    await page.evaluate((sec) => {
      window.__lab.focusSector(sec, true);
    }, s);
    await page.waitForTimeout(700);

    const info = await page.evaluate((sec) => {
      const c = window.__lab.camera;
      const fwd = new THREE.Vector3();
      c.getWorldDirection(fwd);
      const targetGroup = window.__lab.sectorGroups[sec];
      const targetWorldPos = new THREE.Vector3();
      if (targetGroup) targetGroup.getWorldPosition(targetWorldPos);

      // Vector from camera position to sector target center
      const toTarget = targetWorldPos.clone().sub(c.position).normalize();
      const dot = fwd.dot(toTarget);

      return {
        pos: c.position.toArray().map(v => +v.toFixed(2)),
        dir: fwd.toArray().map(v => +v.toFixed(2)),
        dotWithTarget: +dot.toFixed(2),
        facingWorkbench: dot > 0.6 // Must be facing towards the workbench sector
      };
    }, s);

    focusResults[s] = info;
    console.log(`Sector ${s} Focus:`, info);
    await page.screenshot({ path: `public/screenshots/focus-test-${s}.png` });

    if (!info.facingWorkbench) {
      throw new Error(`Sector ${s} camera is NOT facing the workbench prop! dot=${info.dotWithTarget}`);
    }
  }

  console.log('\n✓ SUCCESS: All 6 sector focus cameras point directly at their respective workbench sectors!');
  console.log('WebGL Warnings Count:', webglWarnings.length);
  if (webglWarnings.length > 0) {
    console.warn('WebGL Warnings encountered:', webglWarnings);
  }

  await browser.close();
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
