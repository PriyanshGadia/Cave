// scripts/export-destination-canvases.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function exportCanvases() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  const port = process.env.PORT || '8788';
  await page.goto(`http://localhost:${port}/index.html?lab&boot=skip`, { waitUntil: 'load', timeout: 35000 });
  await page.waitForFunction(() => window.__lab && window.__lab.state && window.__lab.state.ready, { timeout: 25000 });
  await page.waitForTimeout(1000);

  // Focus LS1 and wake it
  await page.evaluate(() => {
    window.__lab.focusSector('LS1', true);
    window.__lab.wakeLS1();
    window.__lab.setBirthTimer(25.0);
    window.__lab.update(0.1);
  });
  await page.waitForTimeout(800);

  const destinations = ['GITHUB', 'LINKEDIN', 'SPOTIFY', 'ABOUT', 'FACEBOOK', 'CONTACT', 'YOUTUBE', 'INSTAGRAM'];
  const artifactDir = path.resolve('C:/Users/gadia/.gemini/antigravity-ide/brain/5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75');
  const pubDir = path.resolve(process.cwd(), 'public', 'screenshots');

  for (const id of destinations) {
    const dataUrl = await page.evaluate((destId) => {
      const lab = window.__lab;
      const crystal = lab.ls1Crystals.find(c => c.userData?.dest?.id === destId);
      if (!crystal) return null;

      lab.activatePortal(crystal);
      if (lab.ls1ActivePortal) {
        lab.ls1ActivePortal.seqTime = 4.5; // open stable
      }
      lab.update(0.05);

      const destGroup = lab.ls1Destination3DGroup;
      const slab = destGroup ? destGroup.children[0] : null;
      const pageMesh = slab ? slab.children.find(c => c.material && c.material.map) : null;
      const canvas = pageMesh?.material?.map?.image;

      if (!canvas || !canvas.toDataURL) return null;
      return canvas.toDataURL('image/png');
    }, id);

    if (dataUrl) {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const buf = Buffer.from(base64Data, 'base64');
      const filename = `canvas-dest-${id.toLowerCase()}.png`;
      const pubPath = path.join(pubDir, filename);
      const artPath = path.join(artifactDir, filename);

      fs.writeFileSync(pubPath, buf);
      fs.writeFileSync(artPath, buf);
      console.log(`Exported canvas for [${id}] -> ${pubPath}`);
    }
  }

  await browser.close();
  console.log('All destination procedural canvases exported cleanly.');
}

exportCanvases().catch(err => {
  console.error(err);
  process.exit(1);
});
