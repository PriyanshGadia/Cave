const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/index.html?lab&boot=skip');
  await page.waitForFunction(() => window.__lab && window.__lab.state && window.__lab.state.ready, { timeout: 25000 });

  const res = await page.evaluate(async () => {
    // Set scale via perf governor if available, or composer
    if (window.VAULT?.perf) {
      // test scale
    }
    const composer = window.__lab.composer;
    const w = 1280, h = 720;
    const scale = 0.78;
    const dw = Math.round(w * scale), dh = Math.round(h * scale);
    composer.renderer.setSize(dw, dh, false);
    composer.setSize(dw, dh);

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

  console.log('FPS at scale 0.78 on Intel HD 4600:', res);
  await browser.close();
})();
