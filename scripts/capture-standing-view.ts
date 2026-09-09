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

  // Navigate to RS3 sector using goTo('RS3')
  await page.evaluate(() => {
    const lab = (window as any).__lab;
    lab.goTo('RS3');
  });
  // Wait for turntable rotation to settle
  await page.waitForTimeout(2500);

  await page.screenshot({ path: 'public/screenshots/rs3-standing-view.png' });
  console.log('Captured RS3 standing view screenshot');

  await browser.close();
}

run().catch(console.error);
