const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 576, height: 1024 },
    deviceScaleFactor: 1,
  });

  page.on('console', (msg) => console.log(`[CONSOLE ${msg.type()}]: ${msg.text()}`));
  page.on('pageerror', (err) => console.error('[PAGE ERROR]:', err));

  await page.goto('http://localhost:8788/index.html', { waitUntil: 'load' });

  // Monitor every second
  for (let s = 1; s <= 20; s++) {
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const v = window.VAULT;
      return {
        vaultExists: !!v,
        realismExists: !!v?.realism,
        hasCinematic: !!v?.cinematic,
        mode: v?.state?.mode,
        loadDetached: !document.getElementById('load'),
      };
    });
    console.log(`[T+${s}s]:`, JSON.stringify(info));
    if (info.realismExists) break;
  }

  await browser.close();
}

main().catch(console.error);
