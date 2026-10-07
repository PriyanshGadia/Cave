const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }});
  
  // Expose a way to take a screenshot and get stats from page
  page.on('console', msg => console.log('BROWSER: ' + msg.text()));
  await page.goto('http://localhost:3000/about/armor-lab/components.html', { timeout: 120000, waitUntil: 'domcontentloaded' });
  // Wait for the components to load (btn-helmet gets active when they load)
  console.log("Waiting for components to load...");
  await page.waitForFunction(() => document.getElementById('btn-helmet').classList.contains('active'), { timeout: 120000 });
  await page.waitForTimeout(2000); // Allow rendering to settle
  
  const modes = ['helmet', 'arms', 'torso', 'gauntlets', 'legs', 'boots', 'assembly', 'exploded'];
  
  const results = {};
  
  for (const mode of modes) {
    console.log(`Taking screenshot for ${mode}...`);
    await page.click(`#btn-${mode}`);
    await page.waitForTimeout(1000); // wait for camera transition and render
    
    await page.screenshot({ path: `component_${mode}.png` });
    
    if (mode !== 'assembly' && mode !== 'exploded') {
        const statsHtml = await page.$eval('#stats-content', el => el.innerText);
        results[mode] = statsHtml;
    }
  }
  
  // Save stats to json
  fs.writeFileSync('component_stats.json', JSON.stringify(results, null, 2));

  // Take exploded wireframe
  console.log('Taking wireframe screenshot...');
  await page.click('#btn-exploded');
  await page.waitForTimeout(500);
  await page.click('#btn-wireframe');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `component_exploded_wireframe.png` });

  await browser.close();
  console.log('Screenshots saved');
})();
