const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/index.html?lab&boot=skip');
  await page.waitForFunction(() => window.__lab && window.__lab.state && window.__lab.state.ready, { timeout: 25000 });
  await page.waitForTimeout(1000);

  // Hide LS1 completely
  await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS1'];
    if (g) g.visible = false;
  });
  await page.waitForTimeout(500);

  const res = await page.evaluate(async () => {
    return new Promise(resolve => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        if (frames < 120) {
          requestAnimationFrame(tick);
        } else {
          const dur = performance.now() - start;
          resolve({
            fps: +(frames / (dur / 1000)).toFixed(1),
            ms: +dur.toFixed(1)
          });
        }
      }
      requestAnimationFrame(tick);
    });
  });

  console.log('Baseline HALL FPS without LS1:', res.fps, 'in', res.ms, 'ms');
  await browser.close();
})();
