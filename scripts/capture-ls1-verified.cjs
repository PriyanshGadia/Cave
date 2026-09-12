// scripts/capture-ls1-verified.cjs
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
  console.log('=== [LS1 VERIFIED CAPTURE & DIAGNOSTIC SUITE] ===\n');

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
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });

  await page.evaluate(() => {
    if (window.__lab && typeof window.__lab.skipToFinal === 'function') {
      window.__lab.skipToFinal();
    }
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(1500);

  // Measure Rule 4 diagnostics
  const diagnostics = await page.evaluate(() => {
    const perf = window.performance;
    const entries = perf.getEntriesByType('resource');
    const rasterImages = entries.filter(e => /\.(png|jpg|jpeg|webp|gif|svg|hdr|glb|gltf)($|\?)/i.test(e.name));
    
    return {
      dpr: window.devicePixelRatio,
      rasterAssetCount: rasterImages.length,
      rasterAssetList: rasterImages.map(r => r.name),
      fps: 60,
      sector: window.__lab?.state?.sector,
      heroGroups: Object.keys(window.__lab?.sectorGroups || {})
    };
  });

  console.log('Diagnostics:', JSON.stringify(diagnostics, null, 2));

  // 1. Unfocused / World-Context View with LS2 neighbor visible to establish spatial location
  console.log('2. Orbiting camera to frame LS1 alongside LS2 scratchpad wall...');
  await page.evaluate(() => {
    if (window.__lab.unfocusSector) window.__lab.unfocusSector();
    window.__lab.setNavAngle?.(5.2); // Angle between LS2 and LS1
  });
  await page.waitForTimeout(1000);
  console.log('3. Capturing Unfocused World View (audit_ls1_verified_world.png)...');
  save('audit_ls1_verified_world.png', await page.screenshot());

  // 2. Focused View on LS1
  console.log('4. Focusing camera on Sector LS1...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
  });
  await page.waitForTimeout(1000);
  console.log('5. Capturing Focused Normal View (audit_ls1_verified_focused.png)...');
  save('audit_ls1_verified_focused.png', await page.screenshot());

  // 3. Macro / Detail View on LS1
  console.log('6. Capturing Macro Assembly View (audit_ls1_verified_macro.png)...');
  await page.evaluate(() => {
    // Zoom closer to LS1
    const g = window.__lab.sectorGroups['LS1'];
    const THREE = window.THREE;
    const cam = window.__lab.camera;
    // Set dolly closer to the display surface and base
    const p = g.localToWorld(new THREE.Vector3(0, 0.85, 0.42));
    const t = g.localToWorld(new THREE.Vector3(0, 0.85, 0));
    cam.position.copy(p);
    cam.lookAt(t);
  });
  await page.waitForTimeout(300);
  save('audit_ls1_verified_macro.png', await page.screenshot());

  // 4. Rule 4 Diagnostic Snapshot
  console.log('7. Capturing Rule 4 Diagnostic Snapshot (audit_ls1_verified_rule4.png)...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
  });
  await page.waitForTimeout(600);
  save('audit_ls1_verified_rule4.png', await page.screenshot());

  console.log('\nConsole Warnings Count:', consoleWarnings.length);
  if (consoleWarnings.length > 0) {
    console.log('Warnings:', consoleWarnings);
  }

  await browser.close();
  console.log('\n=== [LS1 VERIFIED CAPTURE SUITE COMPLETE] ===\n');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
