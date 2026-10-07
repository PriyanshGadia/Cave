const { chromium } = require('playwright');

(async () => {
    console.log("Launching browser for Pass 04B final screenshots...");
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Make sure we catch console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    await page.goto('http://localhost:3000/about/armor-lab/boot_pass04_effect_test.html', { waitUntil: 'networkidle' });
    
    // Wait for model load
    try {
        await page.waitForFunction(() => window.isLoaded === true, { timeout: 15000 });
    } catch (e) {
        console.error("Timeout waiting for model to load!");
        await browser.close();
        process.exit(1);
    }
    
    // Hide UI
    await page.evaluate(() => {
        const ui = document.getElementById('ui');
        if (ui) ui.style.display = 'none';
    });

    const outDir = 'C:/Users/gadia/.gemini/antigravity-ide/brain/6fa56ad6-0f4e-42c4-8245-3c7b55557f0e/';

    // 1 - DORMANT
    console.log("Capturing 01: DORMANT...");
    await page.evaluate(() => window.setDiagnosticMode('01_DORMANT'));
    await page.waitForTimeout(500);
    await page.screenshot({ path: outDir + 'pass04d_final_01_dormant.png' });
    
    // 2 - IGNITION
    console.log("Capturing 02: IGNITION...");
    await page.evaluate(() => window.setDiagnosticMode('02_IGNITION'));
    await page.waitForTimeout(350);
    await page.screenshot({ path: outDir + 'pass04d_final_02_ignition.png' });

    // 3 - FULL_THRUST_NO_LIGHT
    console.log("Capturing 03: FULL_THRUST_NO_LIGHT...");
    await page.evaluate(() => window.setDiagnosticMode('03_FULL_THRUST_NO_LIGHT'));
    await page.waitForTimeout(700);
    await page.screenshot({ path: outDir + 'pass04d_final_03_full_thrust_no_light.png' });

    // 4 - FULL_THRUST_WITH_LIGHT
    console.log("Capturing 04: FULL_THRUST_WITH_LIGHT...");
    await page.evaluate(() => window.setDiagnosticMode('04_FULL_THRUST_WITH_LIGHT'));
    await page.waitForTimeout(700);
    await page.screenshot({ path: outDir + 'pass04d_final_04_full_thrust_with_light.png' });

    // 5 - THROTTLE_DOWN
    console.log("Capturing 05: THROTTLE_DOWN...");
    await page.evaluate(() => window.setDiagnosticMode('05_THROTTLE_DOWN'));
    await page.waitForTimeout(500);
    await page.screenshot({ path: outDir + 'pass04d_final_05_throttle_down.png' });

    // 6 - SHUTDOWN
    console.log("Capturing 06: SHUTDOWN...");
    await page.evaluate(() => window.setDiagnosticMode('06_SHUTDOWN'));
    await page.waitForTimeout(700);
    await page.screenshot({ path: outDir + 'pass04d_final_06_shutdown.png' });

    // 7 - MACRO_FULL_THRUST
    console.log("Capturing 07: MACRO_FULL_THRUST...");
    await page.evaluate(() => window.setDiagnosticMode('07_MACRO_FULL_THRUST'));
    await page.waitForTimeout(700);
    await page.screenshot({ path: outDir + 'pass04d_final_07_macro_full_thrust.png' });

    // 8 - DEBUG_THRUST
    console.log("Capturing 08: DEBUG_THRUST...");
    await page.evaluate(() => window.setDiagnosticMode('08_DEBUG_THRUST'));
    await page.waitForTimeout(700);
    await page.screenshot({ path: outDir + 'pass04d_final_08_debug_thrust.png' });

    await browser.close();
    console.log("Screenshots completed.");
})();
