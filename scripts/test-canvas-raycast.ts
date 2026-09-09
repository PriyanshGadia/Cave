import { chromium } from 'playwright';

async function run() {
  console.log('=== [TESTING CANVAS CLICK RAYCASTING] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  await page.goto('http://localhost:3000/index.html', { waitUntil: 'load', timeout: 30000 });
  await page.click('#btn-skip-anim');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Find screen coordinate of RS3
  const rs3ScreenPos = await page.evaluate(() => {
    const lab = (window as any).__lab;
    const g = lab.sectorGroups['RS3'];
    const wp = new (window as any).THREE.Vector3();
    g.getWorldPosition(wp);
    wp.y += 0.8; // center of RS3 screen
    wp.project(lab.camera);
    const x = (wp.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-wp.y * 0.5 + 0.5) * window.innerHeight;
    return { x, y };
  });
  console.log('RS3 projected screen position:', rs3ScreenPos);

  // Click on RS3 screen position in canvas
  console.log(`Clicking on canvas at (${Math.round(rs3ScreenPos.x)}, ${Math.round(rs3ScreenPos.y)})...`);
  await page.mouse.click(rs3ScreenPos.x, rs3ScreenPos.y);
  await page.waitForTimeout(1200);

  const focusAfterClick = await page.evaluate(() => (window as any).__lab.state.focus);
  console.log('Focus after canvas click on RS3:', focusAfterClick);
  if (focusAfterClick !== 'RS3') {
    throw new Error('Canvas raycasting click failed to focus RS3!');
  }

  // Press Escape to unfocus
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const focusAfterEscape = await page.evaluate(() => (window as any).__lab.state.focus);
  console.log('Focus after Escape:', focusAfterEscape);
  if (focusAfterEscape !== null) {
    throw new Error('Escape failed to unfocus!');
  }

  await browser.close();
  console.log('=== [CANVAS CLICK RAYCASTING VERIFIED] ===');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
