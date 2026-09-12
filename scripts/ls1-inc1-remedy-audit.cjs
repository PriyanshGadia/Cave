// scripts/ls1-inc1-remedy-audit.cjs
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
  console.log('=== [LS1 INCREMENT 1 REMEDY AUDIT & RIGOROUS MEASUREMENTS] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  const consoleLogs = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'warning' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      if (!text.includes('favicon')) consoleWarnings.push(text);
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });

  // 1. Cold Boot Sampling (60 frames)
  console.log('2. Sampling Cold-Boot FPS (initial 60 frames)...');
  const coldFps = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let count = 0, start = performance.now(), last = start, deltas = [];
      function sample(now) {
        deltas.push(now - last);
        last = now;
        count++;
        if (count < 60) requestAnimationFrame(sample);
        else {
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

  console.log('3. Waiting for scene settling and ready state...');
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
  await page.evaluate(() => {
    if (window.__lab?.skipToFinal) window.__lab.skipToFinal();
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(3500);

  // 2. Steady-State FPS at World-Context Unfocused View
  console.log('4. Sampling Steady-State FPS at World-Context (120 frames)...');
  await page.evaluate(() => {
    window.__lab.unfocusSector();
    window.__lab.state.theta = 5.23;
    window.__lab.state.lastInput = performance.now();
  });
  await page.waitForTimeout(600);

  const worldFps = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let count = 0, start = performance.now(), last = start, deltas = [];
      function sample(now) {
        deltas.push(now - last);
        last = now;
        count++;
        if (count < 120) requestAnimationFrame(sample);
        else {
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

  // 3. Steady-State FPS at Focused View (FOCUS_CFG.LS1)
  console.log('5. Focusing on Sector LS1 at FOCUS_CFG.LS1...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
  });
  await page.waitForTimeout(1000);

  console.log('6. Sampling Steady-State FPS at Focused View (120 frames)...');
  const focusedFps = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let count = 0, start = performance.now(), last = start, deltas = [];
      function sample(now) {
        deltas.push(now - last);
        last = now;
        count++;
        if (count < 120) requestAnimationFrame(sample);
        else {
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

  // 4. Diagnose dark rectangle: Inspect DOM and 3D raycast at (600, 350)
  console.log('7. Diagnosing screen elements and raycast at (600, 350)...');
  const probeDiagnostic = await page.evaluate(() => {
    const el = document.elementFromPoint(600, 350);
    const elements = Array.from(document.querySelectorAll('*')).map(e => {
      const rect = e.getBoundingClientRect();
      const style = window.getComputedStyle(e);
      return {
        tag: e.tagName,
        id: e.id,
        className: e.className,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        bg: style.backgroundColor
      };
    }).filter(e => e.rect.width > 0 && e.rect.height > 0 && e.display !== 'none' && e.visibility !== 'hidden' && parseFloat(e.opacity) > 0);

    return {
      elementFromPoint: el ? { tag: el.tagName, id: el.id, className: el.className } : null,
      visibleElements: elements
    };
  });

  // 5. Macro assembly shot with high-resolution geometric inspection
  console.log('8. Framing Macro Hardware Assembly view to independently resolve all 7 chassis layers...');
  const macroTransform = await page.evaluate(() => {
    const THREE = window.THREE;
    const g = window.__lab.sectorGroups['LS1'];
    g.updateWorldMatrix(true, true);
    const cam = window.__lab.camera;

    // We frame from an oblique perspective:
    // local (0.42, 0.48, 0.85) looking at (0.0, 0.32, 0.0)
    // Distance = 0.957m -> reveals 3D layers:
    // Layer 1: Backing plate (z=-0.035)
    // Layer 2: 4-piece Bezel frame (z=-0.015, thickness 0.02)
    // Layer 3: Recessed screen plane (z=+0.002, 3mm recessed from bezel outer face)
    // Layer 4: Mounting bracket base box(1.22, 0.06, 0.28)
    // Layer 5: Vertical support struts cyl(0.018, 0.018, 1.62) at x=+-0.55
    // Layer 6: Lower contact apron box(1.08, 0.04, 0.06)
    // Layer 7: Hex bolts cyl(0.008, 0.008, 0.008) at corners and bracket
    const localPos = new THREE.Vector3(0.42, 0.48, 0.85);
    const localLook = new THREE.Vector3(0.0, 0.32, 0.0);
    const worldPos = g.localToWorld(localPos.clone());
    const worldLook = g.localToWorld(localLook.clone());

    cam.position.copy(worldPos);
    cam.lookAt(worldLook);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();

    window.__lab.update = function(dt) {
      cam.position.copy(worldPos);
      cam.lookAt(worldLook);
    };

    return {
      localPos: localPos.toArray().map(v => +v.toFixed(3)),
      worldPos: worldPos.toArray().map(v => +v.toFixed(3)),
      localLook: localLook.toArray().map(v => +v.toFixed(3)),
      worldLook: worldLook.toArray().map(v => +v.toFixed(3)),
      distance: +worldPos.distanceTo(worldLook).toFixed(3)
    };
  });
  await page.waitForTimeout(800);
  console.log('9. Capturing Macro Hardware Assembly (ls1_inc1_macro_assembly.png)...');
  save('ls1_inc1_macro_assembly.png', await page.screenshot());

  // 6. Capture Focused Clean View
  console.log('10. Capturing Focused View without HUD (ls1_inc1_focused_clean.png)...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
  });
  await page.waitForTimeout(800);
  save('ls1_inc1_focused_clean.png', await page.screenshot());

  // 7. Capture World Context View
  console.log('11. Capturing World Context View (ls1_inc1_world_context.png)...');
  await page.evaluate(() => {
    window.__lab.unfocusSector();
    window.__lab.state.theta = 5.23;
    window.__lab.state.lastInput = performance.now();
  });
  await page.waitForTimeout(800);
  save('ls1_inc1_world_context.png', await page.screenshot());

  // 8. Capture Rule 4 HUD Shot (clean without dark block)
  console.log('12. Capturing Rule 4 HUD Shot on focused view (ls1_inc1_rule4_clean_hud.png)...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
    const dbg = document.getElementById('dbg');
    if (dbg) {
      dbg.style.display = 'block';
      dbg.style.fontSize = '12px';
      dbg.style.lineHeight = '1.45';
      dbg.style.background = 'rgba(4, 16, 28, 0.88)';
      dbg.style.border = '1px solid #00f0ff';
      dbg.style.padding = '8px 12px';
      dbg.style.borderRadius = '4px';
      dbg.style.zIndex = '999999';
    }
  });
  await page.waitForTimeout(1000);
  save('ls1_inc1_rule4_clean_hud.png', await page.screenshot());

  console.log('\n--- VERIFICATION AUDIT DATA ---');
  console.log('Cold Boot FPS:', JSON.stringify(coldFps, null, 2));
  console.log('World Context FPS (120 frames):', JSON.stringify(worldFps, null, 2));
  console.log('Focused Pose FPS (120 frames):', JSON.stringify(focusedFps, null, 2));
  console.log('Console Warnings Count:', consoleWarnings.length);
  if (consoleWarnings.length > 0) console.log('Warnings:', consoleWarnings);
  console.log('DOM Probe at (600, 350):', JSON.stringify(probeDiagnostic.elementFromPoint, null, 2));
  console.log('Visible Elements Count:', probeDiagnostic.visibleElements.length);
  console.log('-------------------------------\n');

  await browser.close();
  console.log('=== [AUDIT RUN COMPLETE] ===');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
