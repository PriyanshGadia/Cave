const { chromium } = require('playwright');

async function measure() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  // Open the image in the page and read pixels from a canvas
  await page.goto('http://localhost:8000/public/screenshots/canvas-before-print.png');
  const analysis = await page.evaluate(() => {
    const img = document.querySelector('img');
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Sample along canvas y = 271 across x from 100 to 540
    const row = [];
    for (let x = 100; x < 540; x += 10) {
      const p = ctx.getImageData(x, 271, 1, 1).data;
      row.push({ x, r: p[0], g: p[1], b: p[2] });
    }

    return { w: c.width, h: c.height, row };
  });

  console.log('Canvas row samples (y=271):', JSON.stringify(analysis.row));
  await browser.close();
}

measure();
