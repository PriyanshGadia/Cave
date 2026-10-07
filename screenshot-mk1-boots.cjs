const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }});
  
  page.on('console', msg => console.log('BROWSER: ' + msg.text()));
  
  await page.goto('http://localhost:3000/about/armor-lab/mk1.html', { timeout: 120000, waitUntil: 'domcontentloaded' });
  
  console.log("Waiting for mk1 components to load...");
  await page.waitForTimeout(3000); 
  
  const views = ['front', 'rear', 'side', 'top', 'bottom', '3q', 'macro_ankle', 'macro_thruster', 'macro_sole'];
  
  for (const view of views) {
    console.log(`Taking screenshot for ${view}...`);
    // call window.frameCamera(view)
    await page.evaluate((v) => window.frameCamera(v), view);
    await page.waitForTimeout(1000); 
    await page.screenshot({ path: `boot_mk1_${view}.png` });
  }

  // Get stats
  const statsHtml = await page.$eval('#stats-content', el => el.innerText);
  fs.writeFileSync('boot_mk1_stats.txt', statsHtml);

  console.log("Loading donor boot...");
  await page.evaluate(() => window.loadDonor());
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `boot_donor_3q.png` });

  await browser.close();
  console.log('Screenshots saved');
})();
