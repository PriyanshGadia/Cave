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

  const passStats = await page.evaluate(async () => {
    const composer = window.__lab.composer;
    const passes = composer.passes;
    const results = [];

    for (let i = 0; i < passes.length; i++) {
      const p = passes[i];
      const origRender = p.render.bind(p);
      let timeAcc = 0;
      let count = 0;
      p.render = function(...args) {
        const t0 = performance.now();
        origRender(...args);
        timeAcc += (performance.now() - t0);
        count++;
      };
      results.push({ name: p.constructor.name, getAvg: () => +(timeAcc / Math.max(1, count)).toFixed(2) });
    }

    await new Promise(r => setTimeout(r, 2000));
    return results.map(r => ({ name: r.name, avgMs: r.getAvg() }));
  });

  console.log('Pass times (ms):', passStats);
  await browser.close();
})();
