const { chromium } = require('playwright');

async function testLoad() {
  console.log('Testing Playwright navigation...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage();

  page.on('request', req => console.log('REQ:', req.method(), req.url()));
  page.on('response', res => console.log('RES:', res.status(), res.url()));
  page.on('requestfailed', req => console.log('FAIL:', req.url(), req.failure().errorText));
  page.on('console', msg => console.log('CONSOLE:', msg.text()));

  console.log('Navigating to http://127.0.0.1:8788/ ...');
  await page.goto('http://127.0.0.1:8788/', { waitUntil: 'commit' });
  console.log('Committed navigation!');
  await page.waitForTimeout(3000);

  const title = await page.title();
  console.log('Page title:', title);

  await browser.close();
}

testLoad().catch(console.error);
