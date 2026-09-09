const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function diagnose() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  try {
    await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__lab?.state?.ready);

    // Hide debug skip button
    await page.evaluate(() => {
      const btn = document.getElementById('btn-skip-anim');
      if (btn) btn.style.display = 'none';
      window.__lab.focusSector('LS3');
    });

    await page.waitForTimeout(2000);

    const diagnostics = await page.evaluate(() => {
      const cam = window.__lab.camera;
      const globe = window.__lab_backend.globe.getGroup();

      const camPos = new THREE.Vector3(); cam.getWorldPosition(camPos);
      const camDir = new THREE.Vector3(); cam.getWorldDirection(camDir);
      const globePos = new THREE.Vector3(); globe.getWorldPosition(globePos);
      const toGlobe = globePos.clone().sub(camPos).normalize();
      const dot = camDir.dot(toGlobe);
      const angleDeg = (Math.acos(Math.min(1, Math.max(-1, dot))) * 180 / Math.PI);

      // Project globe center to screen
      const globeNdc = globePos.clone().project(cam);
      const globeScreenPx = {
        x: Math.round((globeNdc.x * 0.5 + 0.5) * 1280),
        y: Math.round((-(globeNdc.y * 0.5) + 0.5) * 720)
      };

      // Raycast at the glowing sliver pixels:
      // Left sliver ~ (70, 370), Right sliver ~ (1200, 370)
      const ray = new THREE.Raycaster();
      function identifyAt(px, py) {
        const ndc = new THREE.Vector2((px / 1280) * 2 - 1, -(py / 720) * 2 + 1);
        ray.setFromCamera(ndc, cam);
        const hits = ray.intersectObjects(window.__lab.scene.children, true);
        return hits.slice(0, 4).map(h => ({
          name: h.object.name || 'unnamed',
          type: h.object.type,
          parent: h.object.parent?.name || h.object.parent?.type,
          distance: +h.distance.toFixed(3),
          color: h.object.material?.color?.getHexString(),
          emissive: h.object.material?.emissive?.getHexString?.()
        }));
      }

      // Also search scene for glowing blue/cyan objects near those positions
      const glowingFixtures = [];
      window.__lab.scene.traverse(o => {
        if (o.material?.emissiveIntensity > 1.5 || o.material?.color?.getHex() === 0x3fe0ff || o.material?.color?.getHex() === 0x00f0ff) {
          const wp = new THREE.Vector3(); o.getWorldPosition(wp);
          const pNdc = wp.clone().project(cam);
          if (pNdc.z > 0 && pNdc.z < 1) {
            const sx = Math.round((pNdc.x * 0.5 + 0.5) * 1280);
            const sy = Math.round((-(pNdc.y * 0.5) + 0.5) * 720);
            glowingFixtures.push({
              type: o.type,
              geometry: o.geometry?.type,
              color: o.material?.color?.getHexString(),
              emissive: o.material?.emissive?.getHexString?.(),
              screen: [sx, sy],
              distance: +camPos.distanceTo(wp).toFixed(2)
            });
          }
        }
      });

      return {
        camPos: { x: +camPos.x.toFixed(3), y: +camPos.y.toFixed(3), z: +camPos.z.toFixed(3) },
        camDir: { x: +camDir.x.toFixed(3), y: +camDir.y.toFixed(3), z: +camDir.z.toFixed(3) },
        globePos: { x: +globePos.x.toFixed(3), y: +globePos.y.toFixed(3), z: +globePos.z.toFixed(3) },
        camToGlobeDot: +dot.toFixed(4),
        angleOffCenterDeg: +angleDeg.toFixed(2),
        globeCenterScreenPx: globeScreenPx,
        leftRaycast: identifyAt(70, 370),
        rightRaycast: identifyAt(1200, 370),
        glowingFixtures
      };
    });

    console.log('Geometry & Alignment Diagnostic:\n', JSON.stringify(diagnostics, null, 2));

    // ─────────────────────────────────────────────────────────────
    // THROWAWAY SCREENSHOT: TEMPORARY RED EMISSIVE SPHERE
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Capturing Throwaway Diagnostic Red Sphere ---');
    await page.evaluate(() => {
      let globeMat = null;
      window.__lab.scene.traverse(o => {
        if (o.geometry?.type === 'SphereGeometry' && o.material?.map) globeMat = o.material;
      });
      // Temporarily set emissive to dim crimson red to outline sphere silhouette
      globeMat.emissive.setHex(0xb91c1c);
      globeMat.emissiveIntensity = 0.55;
    });

    await page.waitForTimeout(300);
    const redPath = 'public/screenshots/ls3-diagnostic-red-sphere.png';
    await page.screenshot({ path: redPath });
    console.log(`Saved diagnostic red sphere screenshot to ${redPath}`);

    // Revert back to original white emissive with 0 intensity (pre-power)
    await page.evaluate(() => {
      let globeMat = null;
      window.__lab.scene.traverse(o => {
        if (o.geometry?.type === 'SphereGeometry' && o.material?.map) globeMat = o.material;
      });
      globeMat.emissive.setHex(0xffffff);
      globeMat.emissiveIntensity = 0;
    });

    // Copy to artifact directory
    const artDir = 'C:\\Users\\gadia\\.gemini\\antigravity-ide\\brain\\083cf90c-eec5-4055-8991-b6f7b0b443d4';
    fs.copyFileSync(redPath, path.join(artDir, 'ls3-diagnostic-red-sphere.png'));
    console.log('Copied diagnostic red sphere to artifacts folder.');

  } finally {
    await browser.close();
  }
}

diagnose().catch(err => {
  console.error(err);
  process.exit(1);
});
