const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent('<canvas id="c"></canvas>');
  const t0 = Date.now();
  await p.evaluate(() => {
    const c = document.getElementById('c').getContext('2d');
    c.font = 'bold 13px ui-monospace,Menlo,Consolas,monospace';
    c.fillText('hi', 10, 10);
  });
  await p.screenshot({ path: 'public/screenshots/test-font-a.png' });
  console.log('ui-monospace took:', Date.now() - t0);
  const t1 = Date.now();
  await p.evaluate(() => {
    const c = document.getElementById('c').getContext('2d');
    c.font = 'bold 13px Consolas, monospace';
    c.fillText('hi', 10, 10);
  });
  await p.screenshot({ path: 'public/screenshots/test-font-b.png' });
  console.log('Consolas took:', Date.now() - t1);
  await b.close();
})();
