const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/index.html?lab&boot=skip');
  await page.waitForFunction(() => window.__lab && window.__lab.state && window.__lab.state.ready, { timeout: 25000 });

  const fps = await page.evaluate(async () => {
    // Let's test disabling bloom
    const bloom = window.VAULT?.composer?.passes?.find(p => p.name === 'UnrealBloomPass' || p.strength !== undefined);
    if (bloom) bloom.enabled = false;

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

  console.log('FPS without bloom on Intel HD 4600:', fps);
  await browser.close();
})();
