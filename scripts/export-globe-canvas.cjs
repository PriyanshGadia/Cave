const { chromium } = require('playwright');
const fs = require('fs');

async function exportCanvas() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1024, height: 768 },
  });

  try {
    await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__globe_canvas != null, { timeout: 20000 });

    const dataUrl = await page.evaluate(() => {
      return window.__globe_canvas.toDataURL('image/png');
    });

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync('public/screenshots/globe-surf-raw.png', base64Data, 'base64');
    console.log('Successfully saved public/screenshots/globe-surf-raw.png');
  } finally {
    await browser.close();
  }
}

exportCanvas().catch(err => {
  console.error(err);
  process.exit(1);
});
