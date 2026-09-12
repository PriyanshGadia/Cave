// scripts/verify-gate-b.cjs
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
  console.log('  -> Saved:', artPath);
  return artPath;
}

async function run() {
  console.log('=== [GATE B VERIFICATION SUITE — HOLOGRAPHIC CORE & CONTAINMENT] ===\n');

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
      if (!text.includes('favicon') && !text.includes('downloadable font')) consoleWarnings.push(text);
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });

  await page.evaluate(() => {
    if (window.__lab?.skipToFinal) window.__lab.skipToFinal();
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(2000);

  // 1. Diagnostic Scene Graph & Child Count Dump
  console.log('2. Inspecting Sector LS1 scene graph and child objects...');
  const ls1Diagnostics = await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    if (!g) return { error: 'sectorGroups.LS1 not found' };
    
    const items = [];
    g.traverse(o => {
      if (o !== g) {
        items.push({
          type: o.type,
          name: o.name || 'unnamed',
          isMesh: !!o.isMesh,
          isPoints: !!o.isPoints,
          isLine: !!o.isLine,
          isLight: !!o.isLight,
          geometry: o.geometry?.type || null,
          material: Array.isArray(o.material) ? o.material.map(m => m.type) : (o.material?.type || null),
          renderOrder: o.renderOrder,
          pos: [o.position.x.toFixed(2), o.position.y.toFixed(2), o.position.z.toFixed(2)]
        });
      }
    });

    return {
      groupExists: true,
      childrenCount: g.children.length,
      descendantCount: items.length,
      breakdown: {
        meshes: items.filter(x => x.isMesh).length,
        points: items.filter(x => x.isPoints).length,
        lines: items.filter(x => x.isLine).length,
        lights: items.filter(x => x.isLight).length,
        groups: items.filter(x => x.type === 'Group').length
      },
      sampleItems: items.slice(0, 25),
      inHeroGroups: window.__lab.heroGroups ? window.__lab.heroGroups.some(h => h.id === 'LS1') : false
    };
  });

  console.log('LS1 Diagnostics Dump:', JSON.stringify(ls1Diagnostics, null, 2));

  // 2. Unfocused Screenshot in World Context
  console.log('3. Positioning camera for unfocused World Context view (theta = 5.23 rad)...');
  await page.evaluate(() => {
    window.__lab.unfocusSector();
    window.__lab.state.theta = 5.23;
    window.__lab.state.lastInput = performance.now();
  });
  await page.waitForTimeout(1000);
  console.log('4. Capturing LS1 unfocused in world context (ls1_gate_b_world_context.png)...');
  save('ls1_gate_b_world_context.png', await page.screenshot());

  // 3. Focused Screenshot at Reported Dolly Position
  console.log('5. Focusing Sector LS1 at reported dolly position...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
  });
  await page.waitForTimeout(2000);
  console.log('6. Capturing LS1 focused (ls1_gate_b_focused.png)...');
  save('ls1_gate_b_focused.png', await page.screenshot());

  // 4. Close-Up Detail Screenshot (Upper Body, Glasses, Lapels, Volumetrics)
  console.log('7. Dolly in for close-up detail capture on figure and glasses...');
  await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    const cam = window.__lab.camera;
    g.updateWorldMatrix(true, true);
    // Position camera tight on upper body and glasses: local (0.05, 1.46, 0.55) looking at local (0, 1.44, 0.0)
    const eyeWorld = g.localToWorld(new THREE.Vector3(0.05, 1.46, 0.55));
    const lookWorld = g.localToWorld(new THREE.Vector3(0, 1.44, 0.0));
    window.__lab.state.fInit = true;
    cam.position.copy(eyeWorld);
    cam.lookAt(lookWorld);
  });
  console.log('8. Capturing LS1 detail close-up (ls1_gate_b_detail.png)...');
  save('ls1_gate_b_detail.png', await page.screenshot());

  // Return to standard focus position
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
  });
  await page.waitForTimeout(1000);

  // 5. Direct Three.js renderer.info telemetry
  console.log('9. Gathering live Three.js renderer.info telemetry...');
  const renderStats = await page.evaluate(() => {
    const stats = window.__lab.stats();
    return {
      statsOutput: stats,
      rendererInfo: {
        calls: window.__lab.scene ? (window.__lab.stats().calls) : null,
        triangles: window.__lab.scene ? (window.__lab.stats().triangles) : null,
        textures: window.__lab.stats().textures
      }
    };
  });

  // 6. Performance FPS Measurement (120-frame rAF)
  console.log('10. Sampling 120-frame rAF FPS...');
  const fpsMeasurement = await page.evaluate(async () => {
    return new Promise(resolve => {
      let count = 0, start = performance.now(), last = start, deltas = [];
      function sample(now) {
        deltas.push(now - last);
        last = now;
        count++;
        if (count < 120) requestAnimationFrame(sample);
        else {
          const total = now - start;
          const sorted = [...deltas.slice(1)].sort((a, b) => a - b);
          resolve({
            sampleCount: count,
            totalDurationMs: +total.toFixed(2),
            avgFps: +(count / (total / 1000)).toFixed(2),
            minFrameTimeMs: +sorted[0].toFixed(2),
            p50FrameTimeMs: +sorted[Math.floor(sorted.length * 0.5)].toFixed(2),
            p95FrameTimeMs: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
            maxFrameTimeMs: +sorted[sorted.length - 1].toFixed(2)
          });
        }
      }
      requestAnimationFrame(sample);
    });
  });

  // Enable HUD for capture
  await page.evaluate(() => {
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
  await page.waitForTimeout(500);
  const hudText = await page.locator('#dbg').innerText();
  save('ls1_gate_b_hud.png', await page.screenshot());

  // Resource Scan
  const resourceScan = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const rasterRegex = /\.(png|jpg|jpeg|webp|gif|svg|hdr|glb|gltf)($|\?)/i;
    const matches = resources.filter(r => rasterRegex.test(r.name)).map(r => r.name);
    return {
      totalResources: resources.length,
      rasterAssetCount: matches.length,
      rasterMatches: matches
    };
  });

  console.log('\n=== [GATE B RUNTIME METRICS] ===');
  console.log('FPS Measurement (120 frames):', JSON.stringify(fpsMeasurement, null, 2));
  console.log('Renderer Info Telemetry:', JSON.stringify(renderStats, null, 2));
  console.log('Engine HUD Readout:\n' + hudText);
  console.log('Console WebGL Warnings Count:', consoleWarnings.length);
  if (consoleWarnings.length > 0) console.log('Warnings:', consoleWarnings);
  console.log('Raster Assets Loaded Count:', resourceScan.rasterAssetCount);
  console.log('================================\n');

  await browser.close();
  console.log('=== [GATE B VERIFICATION COMPLETE] ===');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
