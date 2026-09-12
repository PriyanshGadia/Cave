const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--enable-gpu-rasterization', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/index.html?lab&boot=skip');
  await page.waitForFunction(() => window.__lab && window.__lab.state && window.__lab.state.ready, { timeout: 25000 });
  await page.waitForTimeout(1500);

  const glInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'unknown',
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown'
    };
  });
  console.log('GL Info:', glInfo);

  // Now measure FPS
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

  console.log('Benchmark FPS with GPU flags:', res.fps, 'in', res.ms, 'ms');
  await browser.close();
})();
