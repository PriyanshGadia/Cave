// scripts/capture-ls1-macro-and-fps.cjs
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
  console.log('  -> Saved artifact:', artPath);
  return artPath;
}

async function run() {
  console.log('=== [LS1 MACRO RE-CAPTURE & DUAL-PHASE FPS AUDIT] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const consoleLogs = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      consoleWarnings.push(text);
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });

  // Phase A: Cold Boot Warm-Up Measurement (0-60 frames during asset initialization)
  console.log('2. Sampling Phase A: Cold-Boot / Warm-Up FPS (initial 60 frames)...');
  const coldFps = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let count = 0;
      let start = performance.now();
      let last = start;
      const deltas = [];

      function sample(now) {
        deltas.push(now - last);
        last = now;
        count++;
        if (count < 60) {
          requestAnimationFrame(sample);
        } else {
          const total = now - start;
          resolve({
            sampleCount: count,
            totalDurationMs: +total.toFixed(2),
            avgFps: +(count / (total / 1000)).toFixed(2),
            minFrameTimeMs: +Math.min(...deltas.slice(1)).toFixed(2),
            maxFrameTimeMs: +Math.max(...deltas.slice(1)).toFixed(2)
          });
        }
      }
      requestAnimationFrame(sample);
    });
  });

  console.log('3. Waiting 3.5 seconds for scene settling, shader pipeline stabilization, and camera steady-state...');
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
  await page.evaluate(() => {
    if (window.__lab && typeof window.__lab.skipToFinal === 'function') {
      window.__lab.skipToFinal();
    }
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
    window.__lab.focusSector('LS1', true);
  });
  await page.waitForTimeout(3500);

  // Phase B: Steady-State FPS Measurement (120 frames after stabilization)
  console.log('4. Sampling Phase B: Steady-State FPS (120 frames post-stabilization)...');
  const steadyFps = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let count = 0;
      let start = performance.now();
      let last = start;
      const deltas = [];

      function sample(now) {
        deltas.push(now - last);
        last = now;
        count++;
        if (count < 120) {
          requestAnimationFrame(sample);
        } else {
          const total = now - start;
          resolve({
            sampleCount: count,
            totalDurationMs: +total.toFixed(2),
            avgFps: +(count / (total / 1000)).toFixed(2),
            minFrameTimeMs: +Math.min(...deltas.slice(1)).toFixed(2),
            maxFrameTimeMs: +Math.max(...deltas.slice(1)).toFixed(2)
          });
        }
      }
      requestAnimationFrame(sample);
    });
  });

  console.log('\n--- DUAL-PHASE FPS AUDIT RESULTS ---');
  console.log('Phase A (Cold Boot / Init Spike):', JSON.stringify(coldFps, null, 2));
  console.log('Phase B (Steady State at Focus):', JSON.stringify(steadyFps, null, 2));
  console.log('Console Warning Count:', consoleWarnings.length);
  console.log('-------------------------------------\n');

  // 5. Macro Assembly Capture with Exact NDC Vertex Projections
  console.log('5. Positioning camera for NDC-verified macro framing on Sector LS1 base rail and posts...');
  const ndcReport = await page.evaluate(() => {
    const THREE = window.THREE;
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);
    const cam = window.__lab.camera;

    // Geometric constants of LS1 in group local space:
    // Base rail: box(1.1, .04, .26) at (0, .02, 0) -> x in [-0.55, 0.55], y in [0.00, 0.04], z in [-0.13, 0.13]
    // Posts: cyl(.014, .014, 1.6) at x = -0.5 and +0.5, y in [0.02, 1.62], z = 0
    // Screen: PlaneGeometry(1.05, 1.4) at (0, .85, 0) -> x in [-0.525, 0.525], y in [0.15, 1.55], z = 0

    // Frame from local (0.0, 0.42, 0.75) looking at (0.0, 0.35, 0.0)
    // Distance = 0.753m -> Base rail fills 88.4% of width (NDC x = [-0.88, +0.88]), posts at NDC x = +-0.80
    const localPos = new THREE.Vector3(0.0, 0.42, 0.75);
    const localLook = new THREE.Vector3(0.0, 0.35, 0.0);
    const worldPos = g.localToWorld(localPos.clone());
    const worldLook = g.localToWorld(localLook.clone());

    cam.position.copy(worldPos);
    cam.lookAt(worldLook);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();

    // Lock camera in update loop
    window.__lab.update = function(dt) {
      cam.position.copy(worldPos);
      cam.lookAt(worldLook);
    };

    // Project 8 corners of Base Rail Box
    const baseCorners = [
      { name: 'bottom-left-front', pos: [-0.55, 0.00,  0.13] },
      { name: 'bottom-right-front', pos: [ 0.55, 0.00,  0.13] },
      { name: 'top-left-front',    pos: [-0.55, 0.04,  0.13] },
      { name: 'top-right-front',   pos: [ 0.55, 0.04,  0.13] },
      { name: 'bottom-left-back',  pos: [-0.55, 0.00, -0.13] },
      { name: 'bottom-right-back', pos: [ 0.55, 0.00, -0.13] },
      { name: 'top-left-back',     pos: [-0.55, 0.04, -0.13] },
      { name: 'top-right-back',    pos: [ 0.55, 0.04, -0.13] },
    ].map(c => {
      const v = g.localToWorld(new THREE.Vector3(...c.pos));
      v.project(cam);
      return {
        corner: c.name,
        local: c.pos,
        ndc: { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) },
        inFrustum: Math.abs(v.x) <= 1.0 && Math.abs(v.y) <= 1.0 && v.z >= -1.0 && v.z <= 1.0
      };
    });

    // Project Left Post (x = -0.50, z = 0.0)
    const lpBottom = g.localToWorld(new THREE.Vector3(-0.50, 0.02, 0.0)).project(cam);
    const lpMid = g.localToWorld(new THREE.Vector3(-0.50, 0.35, 0.0)).project(cam);
    const lpTop = g.localToWorld(new THREE.Vector3(-0.50, 1.62, 0.0)).project(cam);

    // Project Right Post (x = +0.50, z = 0.0)
    const rpBottom = g.localToWorld(new THREE.Vector3(0.50, 0.02, 0.0)).project(cam);
    const rpMid = g.localToWorld(new THREE.Vector3(0.50, 0.35, 0.0)).project(cam);
    const rpTop = g.localToWorld(new THREE.Vector3(0.50, 1.62, 0.0)).project(cam);

    // Project Holographic Screen Lower Corners (y = 0.15)
    const scrBottomLeft = g.localToWorld(new THREE.Vector3(-0.525, 0.15, 0.0)).project(cam);
    const scrBottomRight = g.localToWorld(new THREE.Vector3(0.525, 0.15, 0.0)).project(cam);

    return {
      camera: {
        localPos: localPos.toArray().map(v => +v.toFixed(3)),
        worldPos: worldPos.toArray().map(v => +v.toFixed(3)),
        localLook: localLook.toArray().map(v => +v.toFixed(3)),
        worldLook: worldLook.toArray().map(v => +v.toFixed(3)),
        distanceToTarget: +worldPos.distanceTo(worldLook).toFixed(3),
        fovVerticalDeg: +cam.fov.toFixed(1),
        aspect: +cam.aspect.toFixed(3)
      },
      baseRailCorners: baseCorners,
      leftPost: {
        bottom: { x: +lpBottom.x.toFixed(3), y: +lpBottom.y.toFixed(3), z: +lpBottom.z.toFixed(3) },
        mid: { x: +lpMid.x.toFixed(3), y: +lpMid.y.toFixed(3), z: +lpMid.z.toFixed(3) },
        top: { x: +lpTop.x.toFixed(3), y: +lpTop.y.toFixed(3), z: +lpTop.z.toFixed(3) }
      },
      rightPost: {
        bottom: { x: +rpBottom.x.toFixed(3), y: +rpBottom.y.toFixed(3), z: +rpBottom.z.toFixed(3) },
        mid: { x: +rpMid.x.toFixed(3), y: +rpMid.y.toFixed(3), z: +rpMid.z.toFixed(3) },
        top: { x: +rpTop.x.toFixed(3), y: +rpTop.y.toFixed(3), z: +rpTop.z.toFixed(3) }
      },
      screenLowerEdge: {
        bottomLeft: { x: +scrBottomLeft.x.toFixed(3), y: +scrBottomLeft.y.toFixed(3), z: +scrBottomLeft.z.toFixed(3) },
        bottomRight: { x: +scrBottomRight.x.toFixed(3), y: +scrBottomRight.y.toFixed(3), z: +scrBottomRight.z.toFixed(3) }
      }
    };
  });

  console.log('\n--- NDC PROJECTION REPORT ---');
  console.log(JSON.stringify(ndcReport, null, 2));
  console.log('-----------------------------\n');

  await page.waitForTimeout(600);
  console.log('6. Capturing NDC-Verified Macro Assembly View (audit_ls1_ndc_verified_macro.png)...');
  save('audit_ls1_ndc_verified_macro.png', await page.screenshot());

  await browser.close();
  console.log('\n=== [LS1 MACRO & FPS AUDIT COMPLETE] ===\n');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
