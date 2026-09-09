const { chromium } = require('playwright');
const fs = require('fs');

async function testRender() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  await page.goto('http://localhost:3000/index.html?lab&boot=skip', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__lab?.state?.ready);
  
  console.log('Engine ready, testing new geometry injection in LS3...');
  
  const res = await page.evaluate(() => {
    const g = window.__lab.sectorGroups['LS3'];
    const globe = window.__lab_backend.globe.getGroup();
    
    // Check current children
    return {
      childrenCount: globe.children.length,
      types: globe.children.map(c => c.type + (c.geometry ? ':' + c.geometry.type : ''))
    };
  });
  console.log('Current globe children:', res);
  await browser.close();
}

testRender().catch(console.error);
