// scripts/capture-ls1-baseline.cjs
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
  console.log('=== [LS1 BASELINE CAPTURE SUITE] ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  async function captureCanvas(name) {
    const dataUrl = await page.evaluate(() => {
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          if (window.__lab?.composer) {
            window.__lab.composer.render();
          }
          const c = document.querySelector('canvas');
          resolve(c ? c.toDataURL('image/png') : null);
        });
      });
    });
    if (dataUrl) {
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const buf = Buffer.from(base64, 'base64');
      return save(name, buf);
    } else {
      return save(name, await page.locator('canvas').screenshot());
    }
  }

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

  // 1. Unfocused / World-Context View
  console.log('2. Orbiting camera to face LS1 in world context...');
  await page.evaluate(() => {
    const cam = window.__lab.camera;
    // LS1 is sector 8 (theta approx 8 * 2pi/9 = 5.585 rad)
    // Place camera at bench looking towards LS1
    cam.position.set(-1.8, 1.3, 3.2);
    cam.lookAt(-3.2, 1.2, 2.3);
  });
  await page.waitForTimeout(800);
  console.log('3. Capturing Unfocused World View (audit_ls1_unfocused_world.png)...');
  await captureCanvas('audit_ls1_unfocused_world.png');

  // 2. Focused Normal-Distance View
  console.log('4. Focusing camera on Sector LS1...');
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
  });
  await page.waitForTimeout(800);
  console.log('5. Capturing Focused Normal View (audit_ls1_focused_normal.png)...');
  await captureCanvas('audit_ls1_focused_normal.png');

  // 3. Close-up Assembly View
  console.log('6. Dollying camera to close-up assembly view of LS1...');
  await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    const cam = window.__lab.camera;
    const wp = new THREE.Vector3(0, 0.85, 0.45);
    const target = new THREE.Vector3(0, 0.85, 0);
    cam.position.copy(g.localToWorld(wp));
    cam.lookAt(g.localToWorld(target));
  });
  await page.waitForTimeout(800);
  console.log('7. Capturing Close-up Assembly View (audit_ls1_closeup_assembly.png)...');
  await captureCanvas('audit_ls1_closeup_assembly.png');

  await browser.close();
  console.log('\n=== [LS1 BASELINE CAPTURES COMPLETE] ===\n');
}

run().catch(err => {
  console.error('Capture Failed:', err);
  process.exit(1);
});
