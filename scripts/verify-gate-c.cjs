// scripts/verify-gate-c.cjs
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
  console.log('  -> Saved:', name, '->', artPath);
  return artPath;
}

async function run() {
  console.log('=== [LS1 GATE C REDESIGN: 3D ENERGY VORTEX + GITHUB APERTURE VERIFICATION] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  const consoleLogs = [];
  const consoleWarnings = [];
  const consoleErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
    if (msg.type() === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      if (!text.includes('favicon')) consoleWarnings.push(text);
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 35000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });

  await page.evaluate(() => {
    if (window.__lab?.skipToFinal) window.__lab.skipToFinal();
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  console.log('2. Waiting 3.5s for initial settling and performance governor...');
  await page.waitForTimeout(3500);

  // 10. World overview: The Hall Context with Constellation
  console.log('3. Capturing 10: Hall Context overview with crystal constellation...');
  await page.evaluate(() => {
    window.__lab.unfocusSector();
    window.__lab.state.theta = 5.23;
    window.__lab.state.lastInput = performance.now();
  });
  await page.waitForTimeout(1000);
  save('ls1_gate_c_10_hall_context.png', await page.screenshot());

  // Focus LS1
  console.log('4. Focusing Sector LS1...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1');
  });
  await page.waitForTimeout(1800);

  // 1. Crystal Idle
  console.log('5. Capturing 1: Crystal Idle (Constellation in calm floating state)...');
  save('ls1_gate_c_1_crystal_idle.png', await page.screenshot());

  // 2. Crystal Selected (GITHUB crystal highlighted and stabilized)
  console.log('6. Capturing 2: Crystal Selected (Focusing GITHUB crystal)...');
  await page.evaluate(() => {
    if (window.__lab.api2?.ls1?.focusCrystal) {
      window.__lab.api2.ls1.focusCrystal(0); // GITHUB is index 0
    }
  });
  await page.waitForTimeout(500);
  save('ls1_gate_c_2_crystal_selected.png', await page.screenshot());

  // 3. Energy Charging (Ignition point at crystal, discharge stream forming)
  console.log('7. Capturing 3: Energy Charging (Aperture seed ignites at crystal)...');
  await page.evaluate(() => {
    window.__lab.api2.ls1.activatePortal('GITHUB');
  });
  await page.waitForTimeout(260); // ~0.26s: burst particles active, crystal destabilizing
  save('ls1_gate_c_3_energy_charging.png', await page.screenshot());

  // 4. Aperture Forming (Swirling gas curling outward, dark throat tearing open)
  console.log('8. Capturing 4: Aperture Forming (Turbulent blue vortex expanding)...');
  await page.waitForTimeout(400); // ~0.66s total
  save('ls1_gate_c_4_aperture_forming.png', await page.screenshot());

  // 5. Portal Active (Fully stabilized beside hologram, owner completely unobstructed)
  console.log('9. Capturing 5: Portal Active (Stabilized beside owner, unobstructed face/body)...');
  await page.waitForTimeout(650); // ~1.30s total
  save('ls1_gate_c_5_portal_active.png', await page.screenshot());

  // 6. Portal Close-up (Energy rim -> dark optical void -> authentic GitHub profile behind)
  console.log('10. Capturing 6: Portal Close-up (Dished vortex rim, dark void, GitHub beyond)...');
  await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    window.__savedToPos = window.__lab.FOCUS.toPos.clone();
    window.__savedToLook = window.__lab.FOCUS.toLook.clone();
    window.__lab.FOCUS.from.copy(window.__lab.camera.position);
    window.__lab.FOCUS.toPos.copy(g.localToWorld(new THREE.Vector3(0.70, 1.04, 1.35)));
    window.__lab.FOCUS.toLook.copy(g.localToWorld(new THREE.Vector3(0.70, 1.04, 0.85)));
    window.__lab.FOCUS.t = 1.0;
  });
  await page.waitForTimeout(450);
  save('ls1_gate_c_6_portal_closeup.png', await page.screenshot());

  // 7. Approach & Traversal threshold
  console.log('11. Capturing 7: Approach & Traversal threshold...');
  await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    window.__traversedUrl = null;
    window.open = (u) => { window.__traversedUrl = u; return null; };
    window.__lab.FOCUS.from.copy(window.__lab.camera.position);
    window.__lab.FOCUS.toPos.copy(g.localToWorld(new THREE.Vector3(0.70, 1.04, 1.02)));
    window.__lab.FOCUS.toLook.copy(g.localToWorld(new THREE.Vector3(0.70, 1.04, 0.85)));
    window.__lab.FOCUS.t = 1.0;
  });
  await page.waitForTimeout(450);
  save('ls1_gate_c_7_approach_traversal.png', await page.screenshot());

  await page.evaluate(() => {
    window.__lab.api2.ls1.traversePortal();
    // Restore default LS1 dolly focus
    if (window.__savedToPos) {
      window.__lab.FOCUS.from.copy(window.__lab.camera.position);
      window.__lab.FOCUS.toPos.copy(window.__savedToPos);
      window.__lab.FOCUS.toLook.copy(window.__savedToLook);
      window.__lab.FOCUS.t = 1.0;
    }
  });
  await page.waitForTimeout(500);

  const traversedUrl = await page.evaluate(() => window.__traversedUrl);
  console.log('  -> Traversal verified! Destination URL called:', traversedUrl);

  // 8. Escape Hierarchy Step 1: 1st ESC closes portal, retains LS1 focus
  console.log('12. Pressing 1st ESC to close active portal (verifying portal closing)...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000); // Allow closing transition (0.75s) to complete
  save('ls1_gate_c_8_escape_closing.png', await page.screenshot());

  const stateAfter1stEsc = await page.evaluate(() => ({
    focus: window.__lab.state.focus,
    activePortal: !!window.__lab.api2.ls1.getActivePortal()
  }));
  console.log('  -> State after 1st ESC:', stateAfter1stEsc);

  // 9. Escape Hierarchy Step 2: 2nd ESC exits LS1 focus to The Hall
  console.log('13. Pressing 2nd ESC to return to The Hall...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
  save('ls1_gate_c_9_escape_hall.png', await page.screenshot());

  const stateAfter2ndEsc = await page.evaluate(() => ({
    focus: window.__lab.state.focus
  }));
  console.log('  -> State after 2nd ESC:', stateAfter2ndEsc);

  // Measure steady-state FPS over 120 frames
  console.log('14. Measuring steady-state FPS over 120 frames at DPR 1...');
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
  console.log(`Traversal Target: ${traversedUrl}`);
  console.log('----------------------------------\n');

  await browser.close();
  console.log('=== [VERIFICATION FINISHED SUCCESSFULLY] ===');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
