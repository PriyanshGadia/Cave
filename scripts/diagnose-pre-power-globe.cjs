const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/gadia/.gemini/antigravity-ide/brain/694bd3af-9386-4a86-8cb6-98cd73f0a84a';

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  try {
    console.log('1. Navigating to pre-power timestamp t = 22.2...');
    await page.goto('http://localhost:3000/index.html?lab&boot=22.2', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.waitForFunction(() => !!window.__lab);

    console.log('2. Focusing Sector LS3 in pre-power state...');
    await page.evaluate(() => {
      window.__lab.focusSector('LS3');
    });
    await page.waitForTimeout(1800);

    console.log('3. Applying diagnostic emissive to globe mesh...');
    const applied = await page.evaluate(() => {
      let globeMesh = null;
      window.__lab.scene.traverse(o => {
        if (o.geometry?.type === 'SphereGeometry' && o.material?.map && !globeMesh) {
          globeMesh = o;
        }
      });
      if (globeMesh) {
        globeMesh.userData.__origEmissive = globeMesh.material.emissive.getHex();
        globeMesh.userData.__origIntensity = globeMesh.material.emissiveIntensity;
        // Diagnostic bright cyan wire/emissive glow
        globeMesh.material.emissive.set(0x00f0ff);
        globeMesh.material.emissiveIntensity = 2.0;
        globeMesh.material.needsUpdate = true;
        return {
          found: true,
          position: globeMesh.position,
          worldPos: globeMesh.getWorldPosition(new window.THREE.Vector3())
        };
      }
      return { found: false };
    });
    console.log('   -> Diagnostic emissive applied:', applied);

    await page.waitForTimeout(200);

    const outPath = path.join(ARTIFACTS_DIR, 'ls3-globe-diagnostic-emissive.png');
    const pubPath = path.join(process.cwd(), 'public/screenshots/ls3-globe-diagnostic-emissive.png');
    await page.screenshot({ path: outPath, timeout: 30000, animations: 'disabled' });
    fs.copyFileSync(outPath, pubPath);
    console.log(`   -> Captured throwaway diagnostic-emissive screenshot: ${outPath}`);

    console.log('4. Reverting diagnostic emissive state...');
    await page.evaluate(() => {
      let globeMesh = null;
      window.__lab.scene.traverse(o => {
        if (o.geometry?.type === 'SphereGeometry' && o.material?.map && !globeMesh) {
          globeMesh = o;
        }
      });
      if (globeMesh) {
        globeMesh.material.emissive.setHex(globeMesh.userData.__origEmissive || 0x000000);
        globeMesh.material.emissiveIntensity = globeMesh.userData.__origIntensity || 0.0;
        globeMesh.material.needsUpdate = true;
      }
    });
    console.log('   -> Emissive state successfully reverted.');

  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
