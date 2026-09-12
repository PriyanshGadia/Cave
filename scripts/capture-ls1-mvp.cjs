// scripts/capture-ls1-mvp.cjs
// Automated verification and capture script for LS1 MVP Photographic Hologram Projection
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ART_DIR = 'C:/Users/gadia/.gemini/antigravity-ide/brain/694bd3af-9386-4a86-8cb6-98cd73f0a84a';
const PUB_DIR = path.join(process.cwd(), 'public/screenshots');

function saveArtifact(filename, buffer) {
  const artPath = path.join(ART_DIR, filename);
  const pubPath = path.join(PUB_DIR, filename);
  fs.writeFileSync(artPath, buffer);
  try { fs.writeFileSync(pubPath, buffer); } catch {}
  console.log(`  [Saved] -> ${artPath}`);
  return artPath;
}

async function run() {
  console.log('================================================================');
  console.log('=== SECTOR LS1 MVP PHOTOGRAPHIC HOLOGRAM VERIFICATION AUDIT ===');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  const consoleLogs = [];
  const webglWarnings = [];
  const consoleErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push(`[${type}] ${text}`);
    if (type === 'error') {
      consoleErrors.push(text);
    }
    if (type === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      // Filter out known harmless favicon or dev logs if any
      if (!text.includes('favicon') && !text.includes('Download the Vue Devtools')) {
        webglWarnings.push(text);
      }
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
  });

  console.log('1. Navigating to THE HALL (http://localhost:3000/index.html?lab&boot=skip)...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 35000 });

  console.log('2. Waiting for scene state ready...');
  await page.waitForFunction(() => window.__lab && window.__lab.state && window.__lab.state.ready, { timeout: 25000 });

  // Settle scene and skip animation
  await page.evaluate(() => {
    if (window.__lab && typeof window.__lab.skipToFinal === 'function') {
      window.__lab.skipToFinal();
    }
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });

  console.log('3. Stabilizing pipeline (allowing adaptive governor to settle)...');
  await page.waitForTimeout(6000);

  // ── FPS SAMPLING (Steady-State at DPR 1) ──
  console.log('4. Measuring Steady-State FPS over 120 frames...');
  const fpsData = await page.evaluate(async () => {
    const initialScale = window.VAULT?.perf?.scale || 1.0;
    return new Promise(resolve => {
      let count = 0;
      const start = performance.now();
      let last = start;
      const deltas = [];

      function tick(now) {
        deltas.push(now - last);
        last = now;
        count++;
        if (count < 120) {
          requestAnimationFrame(tick);
        } else {
          const totalMs = now - start;
          const avgFps = +(count / (totalMs / 1000)).toFixed(1);
          resolve({
            frameCount: count,
            totalMs: +totalMs.toFixed(1),
            avgFps: avgFps,
            initialScale: initialScale,
            finalScale: window.VAULT?.perf?.scale || 1.0,
            minFrameMs: +Math.min(...deltas.slice(1)).toFixed(2),
            maxFrameMs: +Math.max(...deltas.slice(1)).toFixed(2)
          });
        }
      }
      requestAnimationFrame(tick);
    });
  });

  console.log(`   -> FPS: ${fpsData.avgFps} (120 frames in ${fpsData.totalMs} ms)`);
  console.log(`   -> Perf Scale: ${fpsData.initialScale} -> ${fpsData.finalScale}`);
  console.log(`   -> Frame times: min ${fpsData.minFrameMs} ms, max ${fpsData.maxFrameMs} ms`);

  // ── RENDERER STATS ──
  const renderStats = await page.evaluate(() => {
    const s = window.__lab.stats();
    const g = window.__lab.sectorGroups['LS1'];
    let holoPlaneCount = 0;
    let particleCount = 0;
    g.traverse(c => {
      if (c.userData && c.userData.isHoloPlane) holoPlaneCount++;
      if (c.isPoints) particleCount += c.geometry.attributes.position.count;
    });

    return {
      triangles: s.triangles,
      drawCalls: s.calls,
      textures: s.textures,
      holoPlanes: holoPlaneCount,
      particles: particleCount
    };
  });

  console.log('   -> Scene Triangles:', renderStats.triangles);
  console.log('   -> Scene Draw Calls:', renderStats.drawCalls);
  console.log('   -> Holo Planes in LS1:', renderStats.holoPlanes);
  console.log('   -> Quantum Sparkle Particles:', renderStats.particles);
  console.log('   -> WebGL Warnings:', webglWarnings.length);
  console.log('   -> Console Errors:', consoleErrors.length);

  // ── HOOK CAMERA OVERRIDE WHILE PRESERVING UPDATE TICK ──
  await page.evaluate(() => {
    const origUpdate = window.__lab.update;
    window.__overrideCam = null;
    window.__lab.update = function(dt) {
      if (origUpdate) origUpdate.call(window.__lab, dt);
      if (window.__overrideCam) {
        window.__lab.camera.position.copy(window.__overrideCam.pos);
        window.__lab.camera.lookAt(window.__overrideCam.look);
      }
    };
    window.__setCam = function(pos, look) {
      window.__overrideCam = { pos, look };
      window.__lab.camera.position.copy(pos);
      window.__lab.camera.lookAt(look);
    };
  });

  // ── CAPTURE 1: LS1 WORLD CONTEXT ──
  console.log('\n5. Capturing View 1: LS1 World Context inside THE HALL...');
  await page.evaluate(() => {
    const THREE = window.THREE;
    if (window.__lab.entity) window.__lab.entity.visible = true;
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);

    // Place camera back across inner floor looking toward Sector LS1
    // Framed with slight offset so LS1 and center pedestal/Hall are visible side-by-side
    const localTarget = new THREE.Vector3(0, 0.95, 0);
    const worldTarget = g.localToWorld(localTarget.clone());

    const localCamPos = new THREE.Vector3(1.35, 1.45, 3.5);
    const worldCamPos = g.localToWorld(localCamPos.clone());

    window.__setCam(worldCamPos, worldTarget);
  });
  await page.waitForTimeout(600);
  saveArtifact('ls1_mvp_1_world.png', await page.screenshot());

  // ── CAPTURE 2: LS1 FOCUSED FRONT VIEW ──
  console.log('6. Capturing View 2: LS1 Focused Front View...');
  await page.evaluate(() => {
    const THREE = window.THREE;
    if (window.__lab.entity) window.__lab.entity.visible = false;
    if (window.__lab && window.__lab.focusSector) {
      window.__lab.focusSector('LS1', true);
    }
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);

    // Full figure view centered from front (crown to platform base)
    const localTarget = new THREE.Vector3(0, 0.88, 0);
    const worldTarget = g.localToWorld(localTarget.clone());

    const localCamPos = new THREE.Vector3(0, 0.92, 2.30);
    const worldCamPos = g.localToWorld(localCamPos.clone());

    window.__setCam(worldCamPos, worldTarget);
  });
  await page.waitForTimeout(600);
  saveArtifact('ls1_mvp_2_front.png', await page.screenshot());

  // ── CAPTURE 3: LS1 FOCUSED 3/4 VIEW ──
  console.log('7. Capturing View 3: LS1 Focused 3/4 View (Parallax & Depth Verification)...');
  await page.evaluate(() => {
    const THREE = window.THREE;
    if (window.__lab.entity) window.__lab.entity.visible = false;
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);

    const localTarget = new THREE.Vector3(0, 0.90, 0);
    const worldTarget = g.localToWorld(localTarget.clone());

    // 40 degrees off-axis: local X = 1.65, local Z = 1.95 (distance ~2.55m)
    const localCamPos = new THREE.Vector3(1.65, 1.05, 1.95);
    const worldCamPos = g.localToWorld(localCamPos.clone());

    window.__setCam(worldCamPos, worldTarget);
  });
  await page.waitForTimeout(600);
  saveArtifact('ls1_mvp_3_3q.png', await page.screenshot());

  // ── CAPTURE 4: LS1 REAR VIEW ──
  console.log('8. Capturing View 4: LS1 Rear View (Back Hologram Plane Verification)...');
  await page.evaluate(() => {
    const THREE = window.THREE;
    if (window.__lab.entity) window.__lab.entity.visible = false;
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);

    const localTarget = new THREE.Vector3(0, 0.88, 0);
    const worldTarget = g.localToWorld(localTarget.clone());

    // Directly behind: local Z = -2.30
    const localCamPos = new THREE.Vector3(0, 0.92, -2.30);
    const worldCamPos = g.localToWorld(localCamPos.clone());

    window.__setCam(worldCamPos, worldTarget);
  });
  await page.waitForTimeout(600);
  saveArtifact('ls1_mvp_4_rear.png', await page.screenshot());

  // ── CAPTURE 5: LS1 CLOSE-UP VIEW ──
  console.log('9. Capturing View 5: LS1 Close-Up View (Facial Identity, Glasses, Hair, Blazer)...');
  await page.evaluate(() => {
    const THREE = window.THREE;
    if (window.__lab.entity) window.__lab.entity.visible = false;
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);

    // Focus tightly on upper torso and head (y ~ 1.35m to 1.70m)
    const localTarget = new THREE.Vector3(0, 1.46, 0);
    const worldTarget = g.localToWorld(localTarget.clone());

    // 0.85m distance in front of face
    const localCamPos = new THREE.Vector3(0, 1.48, 0.85);
    const worldCamPos = g.localToWorld(localCamPos.clone());

    window.__setCam(worldCamPos, worldTarget);
  });
  await page.waitForTimeout(600);
  saveArtifact('ls1_mvp_5_close.png', await page.screenshot());

  // ── CAPTURE 6: LS1 SIDE-ISH OBLIQUE VIEW ──
  console.log('10. Capturing View 6: LS1 Side-ish Oblique View (Steep Angle & Depth Profile)...');
  await page.evaluate(() => {
    const THREE = window.THREE;
    if (window.__lab.entity) window.__lab.entity.visible = false;
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);

    const localTarget = new THREE.Vector3(0, 0.88, 0);
    const worldTarget = g.localToWorld(localTarget.clone());

    // ~70 degrees oblique angle: local X = 2.15, local Z = 0.80
    const localCamPos = new THREE.Vector3(2.15, 0.95, 0.80);
    const worldCamPos = g.localToWorld(localCamPos.clone());

    window.__setCam(worldCamPos, worldTarget);
  });
  await page.waitForTimeout(600);
  saveArtifact('ls1_mvp_6_oblique.png', await page.screenshot());

  await browser.close();
  console.log('\n=== AUDIT COMPLETE: ALL 6 VISUAL STATES CAPTURED SUCCESSFULLY ===\n');

  return {
    fps: fpsData.avgFps,
    triangles: renderStats.triangles,
    drawCalls: renderStats.drawCalls,
    holoPlanes: renderStats.holoPlanes,
    particles: renderStats.particles,
    webglWarnings: webglWarnings.length,
    consoleErrors: consoleErrors.length
  };
}

run().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
