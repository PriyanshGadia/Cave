const { chromium } = require('playwright');

async function check() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage();

  page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack));
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
  page.on('response', res => {
    if (res.status() >= 400) console.log('FAILED URL:', res.status(), res.url());
  });

  console.log('Navigating to http://127.0.0.1:8788/ ...');
  await page.goto('http://127.0.0.1:8788/', { waitUntil: 'commit' });

  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const loadEl = document.getElementById('load');
      return {
        hasLoadEl: Boolean(loadEl),
        hasVault: Boolean(window.VAULT),
        vaultKeys: window.VAULT ? Object.keys(window.VAULT) : [],
      };
    });
    if (info.hasVault) {
      console.log('Found VAULT! Keys:', info.vaultKeys);
      console.log('Realism:', await page.evaluate(() => window.VAULT?.realism));
      break;
    }
    console.log(`[Second ${i+1}]:`, info);
  }

  await browser.close();
}

check().catch(console.error);
