const { chromium } = require('playwright');

async function debugScan() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:8788/', { waitUntil: 'load' });
  await page.waitForSelector('#load', { state: 'detached', timeout: 35000 });
  await page.waitForTimeout(1000);

  console.log('Enrolling first...');
  const enrollRes = await page.evaluate(async () => {
    return await window.VAULT.hooks.enroll('OPERATIVE-01');
  });
  console.log('Enroll result:', enrollRes);

  console.log('Deleting session...');
  await page.evaluate(async () => {
    await fetch('/api/vault/session', { method: 'DELETE' });
  });

  console.log('Testing scan...');
  const scanRes = await page.evaluate(async () => {
    return await window.VAULT.hooks.scan();
  });
  console.log('Scan result:', scanRes);

  await browser.close();
}

debugScan().catch(err => console.error(err));
