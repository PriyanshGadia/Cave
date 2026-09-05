import { chromium } from 'playwright';

async function test() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage();
  page.on('console', m => console.log('PAGE LOG:', m.type(), m.text()));
  page.on('pageerror', e => console.error('PAGE ERROR:', e.message, e.stack));

  console.log('Navigating to http://localhost:8000/index.html?lab&boot=0.6 ...');
  await page.goto('http://localhost:8000/index.html?lab&boot=0.6', { waitUntil: 'load', timeout: 30000 });
  console.log('Page loaded. Waiting for #load to be detached...');
  await page.waitForSelector('#load', { state: 'detached', timeout: 30000 });
  console.log('#load detached! Checking window.__lab...');

  const lab = await page.evaluate(() => {
    return {
      hasLab: !!(window as any).__lab,
      state: (window as any).__lab?.state,
      ready: (window as any).__lab?.state?.ready,
      active: (window as any).__lab?.state?.active,
      t: (window as any).__lab?.state?.t,
    };
  });
  console.log('LAB EVAL RESULT:', lab);
  await browser.close();
}

test().catch(e => console.error('TEST CAUGHT ERROR:', e));
