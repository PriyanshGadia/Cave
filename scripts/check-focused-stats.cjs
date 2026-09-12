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

  const res = await page.evaluate(async () => {
    window.__lab.focusSector('LS1', true);
    await new Promise(r => setTimeout(r, 500));
    const composer = window.__lab.composer;
    const renderer = composer.renderer;

    let frames = 0;
    const start = performance.now();
    function tick() {
      frames++;
      if (frames < 60) {
        requestAnimationFrame(tick);
      } else {
        // finished
      }
    }
    await new Promise(resolve => {
      function run() {
        frames++;
        if (frames < 60) {
          requestAnimationFrame(run);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(run);
    });

    const dur = performance.now() - start;
    return {
      fps: +(frames / (dur / 1000)).toFixed(1),
      calls: renderer.info.render.calls,
      tris: renderer.info.render.triangles
    };
  });

  console.log('Focused LS1 Stats:', res);
  await browser.close();
})();
