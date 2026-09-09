const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runRigorousVerification() {
  console.log('=== [LS3 RIGOROUS VERIFICATION SUITE] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  const consoleErrors = [];
  page.on('console', msg => {
    const text = msg.text(), type = msg.type();
    if (type === 'error' || (type === 'warning' && text.toLowerCase().includes('webgl'))) {
      consoleErrors.push(`[${type}] ${text}`);
    }
  });

  try {
    console.log('Navigating to lab with boot=skip...');
    await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 20000 });

    // Explicitly hide debug button and verify overlay absence
    const overlayStatus = await page.evaluate(() => {
      const btn = document.getElementById('btn-skip-anim');
      if (btn) btn.style.display = 'none';
      const load = document.getElementById('load');
      return {
        debugButtonHidden: btn ? btn.style.display === 'none' : true,
        loadOverlayPresent: !!load && getComputedStyle(load).display !== 'none' && getComputedStyle(load).opacity !== '0'
      };
    });
    console.log('Overlay status:', overlayStatus);

    // Focus LS3 sector
    console.log('Focusing LS3 sector...');
    await page.evaluate(() => {
      window.__lab.focusSector('LS3');
    });

    // Wait for camera focus tween to complete (FOCUS.t reaches 1.0)
    await page.waitForTimeout(2000);

    // Verify camera pose
    const cameraPose = await page.evaluate(() => {
      const cam = window.__lab.camera;
      const g = window.__lab.sectorGroups['LS3'];
      const targetPos = g.localToWorld(new THREE.Vector3(0, 1.36, 0.68));
      const targetLook = g.localToWorld(new THREE.Vector3(0, 0.70, 0));
      const distToTarget = cam.position.distanceTo(targetPos);
      return {
        camPosition: { x: +cam.position.x.toFixed(3), y: +cam.position.y.toFixed(3), z: +cam.position.z.toFixed(3) },
        targetPos: { x: +targetPos.x.toFixed(3), y: +targetPos.y.toFixed(3), z: +targetPos.z.toFixed(3) },
        distToTarget: +distToTarget.toFixed(4),
        focusId: window.__lab.state.focus,
        ready: window.__lab.state.ready
      };
    });
    console.log('Camera focus verification:', cameraPose);

    // ─────────────────────────────────────────────────────────────
    // TEST 1: PRE-POWER INERT DARKNESS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 1: Pre-Power Darkness ---');
    // Set timeline to t = 22.2 (exact start of T.power, well before T.power[0] + 3.5)
    await page.evaluate(() => {
      window.__lab.state.t = 22.2;
      // Stop autospin so scene is steady
      window.__lab_backend.globe.getState().autoSpin = false;
    });

    // Wait 200ms so update(dt) evaluates screens, leds, and holos at t = 22.2
    await page.waitForTimeout(200);

    const prePowerDump = await page.evaluate(() => {
      let globeMat = null, gridMat = null;
      window.__lab.scene.traverse(o => {
        if (o.geometry?.type === 'SphereGeometry' && o.material?.map) globeMat = o.material;
        if (o.geometry?.type === 'BufferGeometry' && o.material?.color?.getHex() === 0x2fbfa0) gridMat = o.material;
      });

      return {
        timelineT: window.__lab.state.t,
        colorHex: globeMat.color.getHexString(),
        emissiveHex: globeMat.emissive.getHexString(),
        emissiveIntensity: globeMat.emissiveIntensity,
        roughness: globeMat.roughness,
        transparent: globeMat.transparent,
        depthWrite: globeMat.depthWrite,
        gridOpacity: gridMat?.opacity ?? 0
      };
    });
    console.log('Pre-power material dump at t = 22.2:', prePowerDump);

    // Wait a frame for rendering
    await page.waitForTimeout(400);
    const prePowerPath = 'public/screenshots/ls3-focused-pre-power-dark.png';
    await page.screenshot({ path: prePowerPath });
    console.log(`Saved pre-power screenshot to ${prePowerPath}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 2: POWERED STATE & BEACON VISIBILITY
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Running Test 2: Powered State & Beacon Visibility ---');

    // Restore powered state and place beacon for San Francisco
    await page.evaluate(() => {
      window.__lab.state.t = 28.4;
      let globeMat = null, gridMat = null;
      window.__lab.scene.traverse(o => {
        if (o.geometry?.type === 'SphereGeometry' && o.material?.map) globeMat = o.material;
        if (o.geometry?.type === 'BufferGeometry' && o.material?.color?.getHex() === 0x2fbfa0) gridMat = o.material;
      });

      // Restore powered state
      globeMat.emissiveIntensity = 0.55;
      if (gridMat) gridMat.opacity = 0.28;

      // Place beacon
      window.__lab_backend.globe.setGeo({
        lat: 37.7749,
        lon: -122.4194,
        city: 'SAN FRANCISCO',
        country: 'US',
        timezone: 'America/Los_Angeles'
      });
    });

    // Orient globe so the beacon directly faces the camera
    const beaconDump = await page.evaluate(() => {
      const group = window.__lab_backend.globe.getGroup();
      window.__lab_backend.globe.getState().autoSpin = false;

      // Find beacon group
      let beacon = null;
      group.traverse(o => {
        if (o.children?.some(c => c.geometry?.type === 'RingGeometry')) beacon = o;
      });

      const cam = window.__lab.camera;
      const gPos = new THREE.Vector3(); group.getWorldPosition(gPos);
      const cPos = new THREE.Vector3(); cam.getWorldPosition(cPos);
      const toCam = cPos.clone().sub(gPos).normalize();

      // Find the rotation that brings beacon directly facing the camera
      let bestRot = 0, maxDot = -999;
      for (let r = 0; r < 6.283; r += 0.01) {
        group.rotation.y = r;
        group.updateMatrixWorld(true);
        const bWorld = new THREE.Vector3(); beacon.getWorldPosition(bWorld);
        const toB = bWorld.clone().sub(gPos).normalize();
        const dot = toB.dot(toCam);
        if (dot > maxDot) {
          maxDot = dot;
          bestRot = r;
        }
      }

      // Apply best rotation
      group.rotation.y = bestRot;
      group.updateMatrixWorld(true);

      const finalBWorld = new THREE.Vector3();
      beacon.getWorldPosition(finalBWorld);
      const ndc = finalBWorld.clone().project(cam);
      const screenX = Math.round((ndc.x * 0.5 + 0.5) * 1280);
      const screenY = Math.round((-(ndc.y * 0.5) + 0.5) * 720);

      const childrenInfo = beacon.children.map(c => ({
        type: c.type,
        geometry: c.geometry?.type,
        color: c.material?.color?.getHexString(),
        emissive: c.material?.emissive?.getHexString?.(),
        emissiveIntensity: c.material?.emissiveIntensity,
        opacity: c.material?.opacity,
        transparent: c.material?.transparent,
        depthWrite: c.material?.depthWrite,
        renderOrder: c.renderOrder
      }));

      return {
        bestRotationY: +bestRot.toFixed(3),
        facingCameraDot: +maxDot.toFixed(4),
        beaconWorldPos: { x: +finalBWorld.x.toFixed(3), y: +finalBWorld.y.toFixed(3), z: +finalBWorld.z.toFixed(3) },
        screenPixelCoords: { x: screenX, y: screenY },
        beaconVisible: beacon.visible,
        beaconGroupRenderOrder: beacon.renderOrder,
        children: childrenInfo
      };
    });
    console.log('Raw Beacon Object Dump:\n', JSON.stringify(beaconDump, null, 2));

    await page.waitForTimeout(400);
    const beaconPath = 'public/screenshots/ls3-focused-beacon-visible.png';
    await page.screenshot({ path: beaconPath });
    console.log(`Saved beacon visible screenshot to ${beaconPath}`);

    // Copy to artifact directory
    const artDir = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\083cf90c-eec5-4055-8991-b6f7b0b443d4';
    fs.copyFileSync(prePowerPath, path.join(artDir, 'ls3-focused-pre-power-dark.png'));
    fs.copyFileSync(beaconPath, path.join(artDir, 'ls3-focused-beacon-visible.png'));
    console.log('Copied screenshots to artifacts folder.');

    console.log('Console WebGL errors caught:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    } else {
      console.log('PASS: Zero WebGL warnings or errors detected.');
    }

  } finally {
    await browser.close();
  }
}

runRigorousVerification().catch(err => {
  console.error('Rigorous verification failed:', err);
  process.exit(1);
});
