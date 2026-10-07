const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }});
  page.on('console', msg => console.log('BROWSER: ' + msg.text()));
  
  await page.goto('http://localhost:3001/about/armor-lab/index.html');
  
  console.log("Loading Mark 7...");
  await page.waitForFunction(() => document.getElementById('loading-overlay').classList.contains('hidden'), { timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'armor-lab-mark7.png' });
  
  console.log("Loading War Machine...");
  await page.selectOption('#donor-select', '/assets/armor/donors/warmachine/war_machine_-_cacw.glb');
  await page.waitForFunction(() => document.getElementById('loading-overlay').classList.contains('hidden'), { timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'armor-lab-warmachine.png' });
  
  console.log("Loading Mark 85...");
  await page.selectOption('#donor-select', '/assets/armor/donors/mark85/iron-man_mark_85__rigged.glb');
  await page.waitForFunction(() => document.getElementById('loading-overlay').classList.contains('hidden'), { timeout: 120000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'armor-lab-mark85.png' });

  await browser.close();
  console.log('Screenshots saved');
})();
