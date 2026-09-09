import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Rotate camera or set position to match user screenshot looking directly at RS3
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    // Look at RS3 sector group
    const g = lab.sectorGroups['RS3'];
    const wp = new (window as any).THREE.Vector3();
    g.getWorldPosition(wp);
    
    // Position camera ~2.5m away, looking slightly down at RS3
    lab.camera.position.set(wp.x * 0.45, wp.y + 0.55, wp.z * 0.45);
    lab.camera.lookAt(wp.x, wp.y + 0.65, wp.z);
    lab.camera.updateProjectionMatrix();
  });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'public/screenshots/rs3-user-angle.png' });
  console.log('Saved user angle screenshot');

  await browser.close();
}

run().catch(console.error);
