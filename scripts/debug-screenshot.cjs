const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://localhost:3000/index.html?lab&boot=skip');
  await p.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  console.log('1. Page ready. Checking fonts...');
  let fState = await p.evaluate(() => ({ status: document.fonts.status, count: document.fonts.size }));
  console.log('   Font state:', fState);
  
  await p.evaluate(() => window.__lab.focusSector('RS3'));
  console.log('2. focusSector(RS3) called. Checking fonts...');
  fState = await p.evaluate(() => ({ status: document.fonts.status, count: document.fonts.size }));
  console.log('   Font state:', fState);
  
  console.log('3. Waiting for focus animation...');
  await p.waitForFunction(() => window.__lab.state.focusE >= 0.99);
  console.log('   Camera at RS3. Checking document.fonts.ready resolution...');
  const readyPromise = p.evaluate(() => {
    return Promise.race([
      document.fonts.ready.then(() => 'ready'),
      new Promise(res => setTimeout(() => res('timed out after 3s'), 3000))
    ]);
  });
  console.log('   document.fonts.ready result:', await readyPromise);
  
  console.log('4. Attempting screenshot...');
  const t0 = Date.now();
  await p.screenshot({ path: 'public/screenshots/debug-snap.png' });
  console.log('   Screenshot success in', Date.now() - t0, 'ms');
  
  await b.close();
})();
