// scripts/capture-ls2-perfect-wide.cjs
// Captures wide shot explicitly framing Sector LS2 (Sector 7 at theta = 4.398 rad, x = -3.37m, z = -1.10m)
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
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });

  await page.evaluate(() => {
    if (window.__lab && typeof window.__lab.skipToFinal === 'function') {
      window.__lab.skipToFinal();
    }
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(2000);

  // Wide 3/4 Room Perspective framing Sector LS2 in the left-midground with central dais and room context
  console.log('Positioning camera for unobstructed LS2 wide environmental shot...');
  await page.evaluate(() => {
    window.__lab.unfocusSector();
    // Position camera at x = -0.8, y = 1.9, z = 3.6 looking at LS2 world position (-3.37, 1.2, -1.10)
    // with central dais and holo-entity visible in right-midground
    window.__lab.camera.position.set(-0.6, 1.85, 3.8);
    window.__lab.camera.lookAt(new THREE.Vector3(-2.8, 1.2, -1.1));
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.style.display = 'none';
  });
  await page.waitForTimeout(1000);
  await save('audit_ls2_wide_true_view.png', await page.screenshot({ animations: 'disabled' }));

  await browser.close();
  console.log('Done.');
}

run().catch(err => { console.error(err); process.exit(1); });
