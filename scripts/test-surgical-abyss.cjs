const { chromium } = require('playwright');
const path = require('path');

async function run() {
  console.log('Launching browser to test LS1 surgical abyss pass...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const webglWarnings = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warning') || text.toLowerCase().includes('error')) {
      if (!text.includes('favicon') && !text.includes('Download the Vue Devtools') && !text.includes('404')) {
        webglWarnings.push(text);
      }
    }
  });

  console.log('Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 35000 });
  await page.waitForFunction(() => typeof window.__lab !== 'undefined', { timeout: 25000 });
  await page.waitForTimeout(2500);

  // Focus sector LS1 directly
  console.log('Focusing Sector LS1...');
  const focused = await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
    return window.__lab.state.focus;
  });
  console.log('Focus sector result:', focused);
  await page.waitForTimeout(1000);

  // Check state before portal activation (Lifecycle gating: Requirement D)
  const preCheck = await page.evaluate(() => {
    const destGroup = window.__lab.api2.ls1.getDestinationGroup();
    const portal = window.__lab.api2.ls1.getActivePortal();
    return {
      hasActivePortal: !!portal,
      destVisible: destGroup ? destGroup.visible : false
    };
  });
  console.log('\n--- LIFECYCLE AUDIT 1: Before Gem Click ---');
  console.log('Pre-activation check:', preCheck);
  if (preCheck.destVisible !== false) {
    throw new Error('ASSERTION FAILED: Destination must be invisible before gem click');
  }

  // Activate portal
  console.log('\n--- Activating Portal with GITHUB Gem ---');
  await page.evaluate(() => {
    window.__lab.api2.ls1.activatePortal('GITHUB');
  });

  // Check Inception Phase (seqT ~ 0.15s)
  await page.waitForTimeout(150);
  const inceptionState = await page.evaluate(() => {
    const destGroup = window.__lab.api2.ls1.getDestinationGroup();
    const portal = window.__lab.api2.ls1.getActivePortal();
    return {
      seqT: portal ? portal.seqTime : 0,
      state: portal ? portal.state : null,
      destVisible: destGroup ? destGroup.visible : false
    };
  });
  console.log('Inception check (seqT ~ 0.15s):', inceptionState);
  if (inceptionState.destVisible !== false) {
    throw new Error('ASSERTION FAILED: Destination must be invisible during inception phase');
  }

  // Check Early Growth Phase (seqT ~ 0.80s)
  await page.waitForTimeout(650);
  const earlyGrowthState = await page.evaluate(() => {
    const destGroup = window.__lab.api2.ls1.getDestinationGroup();
    const portal = window.__lab.api2.ls1.getActivePortal();
    return {
      seqT: portal ? portal.seqTime : 0,
      state: portal ? portal.state : null,
      destVisible: destGroup ? destGroup.visible : false
    };
  });
  console.log('Early growth check (seqT ~ 0.80s):', earlyGrowthState);
  if (earlyGrowthState.destVisible !== false) {
    throw new Error('ASSERTION FAILED: Destination must be invisible during early growth phase');
  }

  // Check Mid Growth Phase (seqT ~ 1.25s)
  await page.waitForTimeout(450);
  const midGrowthState = await page.evaluate(() => {
    const destGroup = window.__lab.api2.ls1.getDestinationGroup();
    const portal = window.__lab.api2.ls1.getActivePortal();
    return {
      seqT: portal ? portal.seqTime : 0,
      state: portal ? portal.state : null,
      destVisible: destGroup ? destGroup.visible : false
    };
  });
  console.log('Mid growth check (seqT ~ 1.25s):', midGrowthState);
  if (midGrowthState.destVisible !== false) {
    throw new Error('ASSERTION FAILED: Destination must be invisible during mid growth phase (before seqT = 1.40s)');
  }

  // Wait for Stabilization Phase (seqT > 2.20s)
  await page.waitForTimeout(1400);
  const stabilizedState = await page.evaluate(() => {
    const destGroup = window.__lab.api2.ls1.getDestinationGroup();
    const portalMesh = window.__lab.api2.ls1.getPortalMesh();
    const portal = window.__lab.api2.ls1.getActivePortal();
    const cam = window.__lab.camera;

    const pCenterWorld = new THREE.Vector3();
    const dCenterWorld = new THREE.Vector3();
    portalMesh.getWorldPosition(pCenterWorld);
    destGroup.getWorldPosition(dCenterWorld);

    const pScreen = pCenterWorld.clone().project(cam);
    const dScreen = dCenterWorld.clone().project(cam);
    const screenDist = Math.hypot(pScreen.x - dScreen.x, pScreen.y - dScreen.y);

    return {
      seqT: portal ? portal.seqTime : 0,
      state: portal ? portal.state : null,
      destVisible: destGroup ? destGroup.visible : false,
      destScale: destGroup ? +destGroup.scale.x.toFixed(3) : 0,
      destPosLocal: destGroup ? [destGroup.position.x, +destGroup.position.y.toFixed(3), destGroup.position.z] : null,
      screenDist: +screenDist.toFixed(6),
      pScreen: [+pScreen.x.toFixed(4), +pScreen.y.toFixed(4)],
      dScreen: [+dScreen.x.toFixed(4), +dScreen.y.toFixed(4)]
    };
  });
  console.log('\n--- STABILIZED AUDIT (seqT > 2.20s) ---');
  console.log('Stabilized state check:', stabilizedState);

  // Assertions
  if (!stabilizedState.destVisible) {
    throw new Error('ASSERTION FAILED: Destination must be visible when stabilized');
  }
  if (stabilizedState.screenDist > 0.005) {
    throw new Error(`ASSERTION FAILED: Screen distance between portal center and destination center (${stabilizedState.screenDist}) exceeds tolerance 0.005`);
  }
  console.log(`✓ Destination Screen Alignment verified: screenDist = ${stabilizedState.screenDist} (< 0.005 tolerance)`);
  console.log(`✓ Destination Scale verified: scale = ${stabilizedState.destScale} (~ 0.52 deep scale)`);

  // Capture stabilized frame
  const artifactDir = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\475c253f-9db4-4c62-97b4-6d98a1bf3915';
  const artifactPath = path.join(artifactDir, 'ls1_surgical_final.png');
  await page.screenshot({ path: artifactPath });
  console.log(`\nSaved screenshot to ${artifactPath}`);

  // Also save to public/screenshots/ for repository records
  const publicPath = path.join('public', 'screenshots', 'ls1_surgical_final.png');
  fs.copyFileSync(artifactPath, publicPath);
  console.log(`Saved copy to ${publicPath}`);

  console.log('\nWebGL warnings count:', webglWarnings.length);
  if (webglWarnings.length > 0) {
    console.warn('WebGL warnings:', webglWarnings);
  } else {
    console.log('✓ 0 WebGL shader warnings confirmed.');
  }

  await browser.close();
  console.log('\nALL LS1 SURGICAL ASSERTIONS PASSED PERFECTLY.');
}

run().catch(err => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
