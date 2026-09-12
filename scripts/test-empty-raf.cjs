const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl']
  });
  const page = await browser.newPage();
  await page.setContent('<html><body><h1>Test</h1></body></html>');

  const res = await page.evaluate(async () => {
    return new Promise(resolve => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        if (frames < 120) {
          requestAnimationFrame(tick);
        } else {
          resolve(+(frames / ((performance.now() - start) / 1000)).toFixed(1));
        }
      }
      requestAnimationFrame(tick);
    });
  });

  console.log('Empty page rAF FPS in Playwright headless:', res);
  await browser.close();
})();
