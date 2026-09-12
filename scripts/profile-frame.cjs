const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/index.html?lab&boot=skip');
  await page.waitForFunction(() => window.__lab && window.__lab.state && window.__lab.state.ready, { timeout: 25000 });
  await page.waitForTimeout(2000);

  const breakdown = await page.evaluate(async () => {
    return new Promise(resolve => {
      let samples = 0;
      let totalComposerMs = 0;
      let totalUpdateMs = 0;
      let totalOtherMs = 0;

      const origComposerRender = window.__lab.composer.render.bind(window.__lab.composer);
      // Wait, in lab.js:
      // composer.render was hooked:
      // composer.render = (...a) => { const now = performance.now(), dt = (now - last) / 1000; last = now; if (api.state.active) api.update(dt); _render(...a); };

      const origUpdate = window.__lab.update;
      let updateTimeAcc = 0;
      window.__lab.update = function(dt) {
        const t0 = performance.now();
        origUpdate(dt);
        updateTimeAcc += (performance.now() - t0);
      };

      const start = performance.now();
      let frames = 0;
      function tick() {
        frames++;
        if (frames < 60) {
          requestAnimationFrame(tick);
        } else {
          const totalTime = performance.now() - start;
          resolve({
            fps: +(frames / (totalTime / 1000)).toFixed(1),
            avgFrameMs: +(totalTime / frames).toFixed(2),
            avgUpdateMs: +(updateTimeAcc / frames).toFixed(2),
            avgComposerAndOtherMs: +((totalTime - updateTimeAcc) / frames).toFixed(2)
          });
        }
      }
      requestAnimationFrame(tick);
    });
  });

  console.log('Performance breakdown:', breakdown);
  await browser.close();
})();
