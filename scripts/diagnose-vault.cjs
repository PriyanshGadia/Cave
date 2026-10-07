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
  console.log('Evaluating import("./realism.js") in browser...');
  const result = await page.evaluate(async () => {
    try {
      const mod = await import('./realism.js');
      return { success: true, keys: Object.keys(mod) };
    } catch (err) {
      return { success: false, error: err.message, stack: err.stack };
    }
  });
  console.log('import("./realism.js") result:', result);

  await browser.close();
}

main().catch(console.error);
