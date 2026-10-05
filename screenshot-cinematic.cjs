const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }});
  page.on('console', msg => console.log('BROWSER: ' + msg.text()));
  
  await page.goto('http://localhost:3000/about.html?cinematicTest=1', { timeout: 120000, waitUntil: 'domcontentloaded' });
  
  console.log("Waiting for cinematic to load...");
  
  // Wait for armor to be ready
  await page.waitForFunction(() => window.__ARMOR_READY === true, { timeout: 60000 });
  
  // Wait at least 2 rAF cycles
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  
  await page.waitForTimeout(2000); // extra wait for shaders/animations to stabilize
  
  const shots = [
    { name: '01_intro_0', p: 0 },
    { name: '02_intro_name', p: 5 },
    { name: '03_door', p: 10 },
    { name: '04_workshop', p: 15 },
    { name: '05_armor_activation', p: 20 },
    { name: '06_boot_flight', p: 25 },
    { name: '07_legs_flight', p: 35 },
    { name: '08_torso_flight', p: 45 },
    { name: '09_arms_flight', p: 55 },
    { name: '10_gauntlets_flight', p: 65 },
    { name: '11_helmet_flight', p: 75 },
    { name: '12_all_flight', p: 85 },
    { name: '13_descent', p: 90 },
    { name: '14_landing', p: 92 },
    { name: '15_assembled', p: 95 },
    { name: '16_landing_pad', p: 98 },
    { name: '17_vault_entry', p: 100 }
  ];
  
  for (const shot of shots) {
    console.log(`Capturing ${shot.name} at scroll ${shot.p}%`);
    await page.evaluate((p) => {
      // Direct GSAP control for perfect determinism without scroll physics
      if (window.setCinematicProgress) {
         window.setCinematicProgress(p / 100);
      } else {
         window.scrollTo(0, document.body.scrollHeight * (p / 100));
      }
    }, shot.p);
    // Give GSAP time to update and WebGL to render
    await page.waitForTimeout(1000); 
    await page.screenshot({ path: `${shot.name}.png` });
  }

  await browser.close();
  console.log('Screenshots saved');
})();
