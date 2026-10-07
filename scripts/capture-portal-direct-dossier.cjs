// scripts/capture-portal-direct-dossier.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
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

  const targets = ['ABOUT', 'FACEBOOK', 'YOUTUBE', 'SPOTIFY', 'LINKEDIN', 'INSTAGRAM'];
  const artifactDir = path.resolve('C:/Users/gadia/.gemini/antigravity-ide/brain/5e3c0a45-c3f3-49e8-8c30-eccd6f3eac75');
  const pubDir = path.resolve(process.cwd(), 'public', 'screenshots');

  for (const t of targets) {
    await page.evaluate((destId) => {
      const THREE = window.THREE;
      const lab = window.__lab;
      const crystal = lab.ls1Crystals.find(c => c.userData?.dest?.id === destId);
      if (!crystal) return;

      lab.activatePortal(crystal);
      if (lab.ls1ActivePortal) {
        lab.ls1ActivePortal.seqTime = 4.5; // open stable
      }
      lab.update(0.05);

      const portal = lab.ls1PortalMesh;
      if (!portal) return;

      // Get world position of portal
      const pWorld = new THREE.Vector3();
      portal.getWorldPosition(pWorld);

      // Temporarily hide center hologram so it does not block the aperture
      if (lab.ls1FigureGroup) lab.ls1FigureGroup.visible = false;

      // Position camera right at the portal throat looking into the depth slab at z=-1.35m
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(portal.quaternion);
      const camPos = pWorld.clone().add(forward.clone().multiplyScalar(0.05));
      const lookPos = pWorld.clone().sub(forward.clone().multiplyScalar(1.35));

      lab.camera.position.copy(camPos);
      lab.camera.lookAt(lookPos);

      // Lock camera in update loop
      const origUpdate = lab.update;
      lab.update = function(dt) {
        origUpdate.call(this, dt);
        if (lab.ls1FigureGroup) lab.ls1FigureGroup.visible = false;
        lab.camera.position.copy(camPos);
        lab.camera.lookAt(lookPos);
      };
    }, t);

    await page.waitForTimeout(600);

    const filename = `direct-portal-${t.toLowerCase()}.png`;
    const outPub = path.join(pubDir, filename);
    const outArt = path.join(artifactDir, filename);

    await page.screenshot({ path: outPub });
    fs.copyFileSync(outPub, outArt);
    console.log(`Saved direct screenshot for ${t} -> ${outPub}`);
  }

  await browser.close();
  console.log('All direct portal destination previews captured successfully.');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
