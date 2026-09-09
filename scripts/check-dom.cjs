const { chromium } = require('playwright');

async function domCheck() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8000/index.html?lab&boot=skip');
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready');
  await page.waitForTimeout(500);

  await page.evaluate(() => window.__lab.focusSector('RS2'));
  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.focusE >= 0.99');
  await page.waitForTimeout(400);

  // Trigger print
  await page.evaluate(() => {
    window.__lab.triggerPrint();
  });
  await page.waitForTimeout(400);

  // Check DOM elements
  const elements = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    return all.map(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        id: el.id,
        className: el.className,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        background: style.backgroundColor,
      };
    }).filter(e => e.rect.w > 0 && e.rect.h > 0 && e.display !== 'none' && e.visibility !== 'hidden' && parseFloat(e.opacity) > 0);
  });

  console.log('Visible DOM Elements:', JSON.stringify(elements, null, 2));
  await browser.close();
}

domCheck();
