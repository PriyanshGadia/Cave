const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ART = 'C:/Users/gadia/.gemini/antigravity-ide/brain/694bd3af-9386-4a86-8cb6-98cd73f0a84a';
const PUB = path.join(process.cwd(), 'public/screenshots');

function save(name, buf) {
  const artPath = path.join(ART, name);
  const pubPath = path.join(PUB, name);
  fs.writeFileSync(artPath, buf);
  try { fs.writeFileSync(pubPath, buf); } catch {}
  console.log('Saved:', artPath);
  return artPath;
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/test-isolated.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready);

  const stats = await page.evaluate(() => window.__stats);

  const views = [
    { name: 'FRONT', file: 'isolated_front.png', phi: 0 },
    { name: 'RIGHT 3/4', file: 'isolated_right_three_quarter.png', phi: Math.PI / 4 },
    { name: 'RIGHT', file: 'isolated_right.png', phi: Math.PI / 2 },
    { name: 'LEFT 3/4', file: 'isolated_left_three_quarter.png', phi: -Math.PI / 4 },
    { name: 'LEFT', file: 'isolated_left.png', phi: -Math.PI / 2 },
    { name: 'BACK', file: 'isolated_back.png', phi: Math.PI }
  ];

  for (const v of views) {
    await page.evaluate((phi) => {
      window.__setAngle(phi);
    }, v.phi);
    await page.waitForTimeout(200);
    const buf = await page.screenshot();
    save(v.file, buf);
  }

  // Measure honest FPS on this isolated render
  const fps = await page.evaluate(async () => {
    let frames = 0;
    const start = performance.now();
    while (performance.now() - start < 500) {
      window.__setAngle(0);
      frames++;
      await new Promise(r => requestAnimationFrame(r));
    }
    return Math.round(frames / ((performance.now() - start) / 1000));
  });

  console.log('STATS:', JSON.stringify({ ...stats, fps, drawCalls: 1 }));
  await browser.close();
})();
