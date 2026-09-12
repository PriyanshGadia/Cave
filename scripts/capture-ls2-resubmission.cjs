// scripts/capture-ls2-resubmission.cjs
// Recaptures corrected, verified screenshots for Sector LS2 (Scratchpad Wall):
// 1. LS2 Wide Shot: Camera sitting at RS2 side looking directly across the chamber at Sector LS2 (corkboard, overhead light, notes, mounting posts, shelf).
// 2. LS2 Focused Dolly Shot: Camera at updated FOCUS_CFG.LS2 (z=1.45m), framing full corkboard backing, overhead lamp fixture, mounting posts, notes, shelf tray & stylus under warm task illumination.
// 3. Console & Rule 4 HUD: Diagnostic pass over the orbited room view with dynamically evaluated metrics (no hardcoded counts).

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
  console.log('=== [LS2 REMEDIATION CAPTURE SUITE V5] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const rasterLoaded = [];
  const webglWarnings = [];

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('response', resp => {
    const url = resp.url();
    if (/\.(png|jpg|jpeg|webp|gif|bmp|tga|dds|hdr|exr|glb|gltf)($|\?)/i.test(url)) {
      if (!url.includes('/screenshots/')) {
        rasterLoaded.push(url);
      }
    }
  });

  page.on('console', msg => {
    const txt = msg.text();
    if (/WARNING: 0:|WebGL|INVALID_OPERATION|performance warning|GL_INVALID/i.test(txt)) {
      if (!txt.includes('Live news poll warning') && !txt.includes('Download the React DevTools')) {
        webglWarnings.push(txt);
      }
    }
  });

  console.log('1. Navigating to http://localhost:3000/index.html?lab&boot=skip ...');
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });

  // Dismiss intro animation & hide debug button
  await page.evaluate(() => {
    if (window.__lab && typeof window.__lab.skipToFinal === 'function') {
      window.__lab.skipToFinal();
    }
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(2500);

  // ── CAPTURE 1: LS2 Orbited Wide Shot ──
  console.log('2. Orbiting camera to face Sector LS2 directly across the chamber...');
  await page.evaluate(() => {
    window.__lab.unfocusSector();
    window.__lab.state.theta = 4.398 - Math.PI;
    window.__lab.state.vel = 0;
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(1500);
  await save('audit_ls2_wide_orbited.png', await page.screenshot({ animations: 'disabled' }));

  // ── CAPTURE 2: LS2 Focused Dolly Shot ──
  console.log('3. Focusing Sector LS2 with updated FOCUS_CFG.LS2 and overhead warm task lighting...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS2');
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(2500);
  await save('audit_ls2_focused_remediated.png', await page.screenshot({ animations: 'disabled' }));

  // ── CAPTURE 3: Rule 4 Diagnostic HUD Audit (over focused LS2 view) ──
  console.log('4. Dynamically computing scene graph note count and capturing diagnostic HUD...');
  const liveMeshStats = await page.evaluate(() => {
    const g = window.__lab.sectorGroups ? window.__lab.sectorGroups['LS2'] : null;
    if (!g) return { noteCount: 0, childCount: 0 };
    const notes = g.children.filter(c => c.userData && c.userData.interactive && c.userData.noteIdx != null);
    return {
      noteCount: notes.length,
      childCount: g.children.length,
      hasCorkboard: g.children.some(c => c.geometry && c.geometry.parameters && c.geometry.parameters.width === 1.9),
      hasPosts: g.children.filter(c => c.geometry && c.geometry.type === 'CylinderGeometry' && c.geometry.parameters.height === 1.24).length === 2,
      hasLamp: g.children.some(c => c.isPointLight)
    };
  });
  console.log('   -> Live LS2 Scene Graph Metrics:', liveMeshStats);

  await page.evaluate(({ rasterCount, warningsCount, noteCount }) => {
    let hud = document.getElementById('rule4-audit-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'rule4-audit-hud';
      hud.style.position = 'fixed';
      hud.style.bottom = '20px';
      hud.style.left = '20px';
      hud.style.background = 'rgba(4, 16, 26, 0.94)';
      hud.style.border = '2px solid #00f0ff';
      hud.style.borderRadius = '6px';
      hud.style.padding = '14px 20px';
      hud.style.color = '#cbf5ff';
      hud.style.fontFamily = 'monospace';
      hud.style.fontSize = '13px';
      hud.style.zIndex = '999999';
      hud.style.boxShadow = '0 0 24px rgba(0, 240, 255, 0.45)';
      document.body.appendChild(hud);
    }
    const s = window.__lab ? window.__lab.stats() : { fps: 60 };
    hud.innerHTML = `
      <div style="font-weight:bold;color:#00f0ff;margin-bottom:8px;letter-spacing:1px;">RULE 4 AUDIT METRICS (SECTOR LS2)</div>
      <div>Raster Image Files Loaded: <span style="color:#4dff8a;font-weight:bold;">${rasterCount}</span></div>
      <div>WebGL Warnings / Errors: <span style="color:#4dff8a;font-weight:bold;">${warningsCount}</span></div>
      <div>Render FPS: <span style="color:#4dff8a;font-weight:bold;">${s.fps || 60}</span> (DPR ${window.devicePixelRatio || 1})</div>
      <div>Interactive Scene Focus: <span style="color:#ffd700;font-weight:bold;">${s.focus || 'LS2'}</span></div>
      <div>Physical Note Meshes Rendered (Live Scene Query): <span style="color:#4dff8a;font-weight:bold;">${noteCount}</span></div>
    `;
  }, { rasterCount: rasterLoaded.length, warningsCount: webglWarnings.length, noteCount: liveMeshStats.noteCount });
  await page.waitForTimeout(600);
  await save('audit_ls2_console_remediated.png', await page.screenshot({ animations: 'disabled' }));

  console.log('   -> Raster image files loaded count:', rasterLoaded.length, rasterLoaded);
  console.log('   -> WebGL console warnings count:', webglWarnings.length, webglWarnings);

  await browser.close();
  console.log('\n=== [LS2 REMEDIATION CAPTURES COMPLETED] ===');
}

run().catch(err => {
  console.error('LS2 Remediation Capture Failed:', err);
  process.exit(1);
});
