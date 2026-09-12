const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/index.html?lab&boot=skip');
  await page.waitForFunction(() => window.__lab && window.__lab.state && window.__lab.state.ready, { timeout: 25000 });
  
  // Wait 4.5 seconds for perf governor to adapt
  console.log('Waiting for governor to adapt...');
  await page.waitForTimeout(4500);

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
            ms: +dur.toFixed(1),
            perfScale: window.VAULT?.perf?.scale,
            bloom: window.VAULT?.perf ? window.bloom?.enabled : 'unknown'
          });
        }
      }
      requestAnimationFrame(tick);
    });
  });

  console.log('Adapted FPS:', res.fps, 'in', res.ms, 'ms, perfScale:', res.perfScale);
  await browser.close();
})();
