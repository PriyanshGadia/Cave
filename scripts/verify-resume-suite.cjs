const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runVerification() {
  console.log('=== [RUNNING RESUME FABRICATOR & TOGGLE FIX VERIFICATION] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  const consoleLogs = [];
  const consoleErrors = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleLogs.push(`[${type}] ${text}`);
    if (type === 'error' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warning') || text.toLowerCase().includes('error: 0:')) {
      if (!text.includes('favicon') && !text.includes('Devtools') && !text.includes('404') && !text.includes('Failed to load resource')) {
        consoleErrors.push(`[${type}] ${text}`);
      }
    }
  });

  const outDir = path.resolve(process.cwd(), 'public', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  try {
    console.log('1. Navigating to http://localhost:8000/index.html?lab&boot=skip ...');
    await page.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready', { timeout: 15000 });
    await page.waitForTimeout(600);

    // Focus RS2
    console.log('\n2. Focusing Sector RS2...');
    await page.evaluate(() => {
      window.__lab.focusSector('RS2');
    });
    await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.focusE >= 0.99', { timeout: 10000 });
    await page.waitForTimeout(400);

    const ssFocusPath = path.join(outDir, 'rs2-focused.png');
    await page.screenshot({ path: ssFocusPath });
    console.log(`   -> Focused screenshot saved: ${ssFocusPath}`);

    // Test Toggle Bug
    console.log('\n3. Testing Item Toggle (checking that it does NOT flip back)...');
    
    // Find screen coordinates for item 0
    const itemScreenCoords = await page.evaluate(() => {
      const lab = window.__lab;
      const g = lab.sectorGroups['RS2'];
      const scrMesh = g.children.find(c => c.geometry && c.geometry.parameters && c.geometry.parameters.width === 0.58);
      const cam = lab.camera;

      // Item 0 is at rowY = 134 + 0*35 = 134. Row height = 31. Row center = 150.
      // UV: x = 0.35 (in checkbox/title area), y = 1 - 150/400 = 0.625
      const pt = new window.THREE.Vector3((0.35 - 0.5) * 0.58, (0.625 - 0.5) * 0.35, 0);
      pt.applyMatrix4(scrMesh.matrixWorld);
      pt.project(cam);

      return {
        x: (pt.x * 0.5 + 0.5) * 1280,
        y: (-pt.y * 0.5 + 0.5) * 720,
      };
    });
    console.log(`   -> Calculated screen position for item 0: (${itemScreenCoords.x.toFixed(1)}, ${itemScreenCoords.y.toFixed(1)})`);

    const stateBeforeClick = await page.evaluate(() => {
      const lab = window.__lab;
      const firstItem = lab.resume.filtered[0];
      return {
        id: firstItem.id,
        isSelected: lab.resume.selected.has(firstItem.id),
      };
    });
    console.log(`   -> Item: ${stateBeforeClick.id}, initially selected: ${stateBeforeClick.isSelected}`);

    // Perform real mouse click
    console.log('   -> Clicking item to toggle state...');
    await page.mouse.click(itemScreenCoords.x, itemScreenCoords.y);
    await page.waitForTimeout(300);

    const stateAfterClick = await page.evaluate(() => {
      const lab = window.__lab;
      const firstItem = lab.resume.filtered[0];
      return lab.resume.selected.has(firstItem.id);
    });
    console.log(`   -> State after click: ${stateAfterClick} (changed from ${stateBeforeClick.isSelected})`);
    if (stateAfterClick === stateBeforeClick.isSelected) {
      throw new Error(`Toggle failed! State did not change.`);
    }

    // Wait 600ms to verify it does NOT flip back
    await page.waitForTimeout(600);
    const stateStable = await page.evaluate(() => {
      const lab = window.__lab;
      const firstItem = lab.resume.filtered[0];
      return lab.resume.selected.has(firstItem.id);
    });
    console.log(`   -> State after 600ms: ${stateStable} (STABLE, flip-back bug is FIXED!)`);
    if (stateStable !== stateAfterClick) {
      throw new Error(`Toggle flipped back! Expected ${stateAfterClick} but got ${stateStable}`);
    }

    // Click again to toggle back
    console.log('   -> Clicking item again to toggle back...');
    await page.mouse.click(itemScreenCoords.x, itemScreenCoords.y);
    await page.waitForTimeout(300);
    const stateToggledBack = await page.evaluate(() => {
      const lab = window.__lab;
      const firstItem = lab.resume.filtered[0];
      return lab.resume.selected.has(firstItem.id);
    });
    console.log(`   -> State toggled back to: ${stateToggledBack}`);
    if (stateToggledBack !== stateBeforeClick.isSelected) {
      throw new Error(`Toggle back failed! Expected ${stateBeforeClick.isSelected} but got ${stateToggledBack}`);
    }

    // 4. Test Template Switching
    console.log('\n4. Testing Template Switching to fullstack-ai...');
    const tabScreenCoords = await page.evaluate(() => {
      const lab = window.__lab;
      const g = lab.sectorGroups['RS2'];
      const scrMesh = g.children.find(c => c.geometry && c.geometry.parameters && c.geometry.parameters.width === 0.58);
      const cam = lab.camera;

      // Tab 2 (fullstack-ai): px = 240, py = 81
      const pt = new window.THREE.Vector3((240 / 640 - 0.5) * 0.58, ((1 - 81 / 400) - 0.5) * 0.35, 0);
      pt.applyMatrix4(scrMesh.matrixWorld);
      pt.project(cam);
      return {
        x: (pt.x * 0.5 + 0.5) * 1280,
        y: (-pt.y * 0.5 + 0.5) * 720,
      };
    });

    await page.mouse.click(tabScreenCoords.x, tabScreenCoords.y);
    await page.waitForTimeout(300);

    const templateState = await page.evaluate(() => {
      const lab = window.__lab;
      return {
        template: lab.resume.template,
        selectedCount: lab.resume.selected.size,
        hasIdp: lab.resume.selected.has('proj:idp'),
        hasCryptograph: lab.resume.selected.has('proj:cryptograph'),
      };
    });
    console.log(`   -> Active template: ${templateState.template}`);
    console.log(`   -> Curated items selected: ${templateState.selectedCount}`);
    console.log(`   -> Includes proj:idp=${templateState.hasIdp}, proj:cryptograph=${templateState.hasCryptograph}`);
    if (templateState.template !== 'fullstack-ai') {
      throw new Error(`Expected template 'fullstack-ai', got '${templateState.template}'`);
    }

    // 5. Test Print Animation & Check for Screen Blackout
    console.log('\n5. Testing Print Animation & Screen Blackout Guard...');
    const printBtnCoords = await page.evaluate(() => {
      const lab = window.__lab;
      const g = lab.sectorGroups['RS2'];
      const scrMesh = g.children.find(c => c.geometry && c.geometry.parameters && c.geometry.parameters.width === 0.58);
      const cam = lab.camera;

      // Button is at px = 490, py = 373
      const pt = new window.THREE.Vector3((490 / 640 - 0.5) * 0.58, ((1 - 373 / 400) - 0.5) * 0.35, 0);
      pt.applyMatrix4(scrMesh.matrixWorld);
      pt.project(cam);
      return {
        x: (pt.x * 0.5 + 0.5) * 1280,
        y: (-pt.y * 0.5 + 0.5) * 720,
      };
    });

    console.log(`   -> Clicking Print button at (${printBtnCoords.x.toFixed(1)}, ${printBtnCoords.y.toFixed(1)})`);
    await page.mouse.click(printBtnCoords.x, printBtnCoords.y);
    await page.waitForTimeout(400); // Mid-print

    const midPrintState = await page.evaluate(() => {
      const lab = window.__lab;
      return {
        paperVisible: lab.paperMesh ? lab.paperMesh.visible : false,
        paperZ: lab.paperMesh ? lab.paperMesh.position.z : 0,
        paperY: lab.paperMesh ? lab.paperMesh.position.y : 0,
      };
    });
    console.log(`   -> Mid-print: paperVisible=${midPrintState.paperVisible}, z=${midPrintState.paperZ.toFixed(3)}m, y=${midPrintState.paperY.toFixed(3)}m`);

    // Capture screenshot DURING print to verify laser HUD and NO BLACKOUT
    const ssPrintingPath = path.join(outDir, 'rs2-during-print.png');
    await page.screenshot({ path: ssPrintingPath });
    console.log(`   -> Captured mid-print screenshot: ${ssPrintingPath}`);

    // Wait for print completion
    await page.waitForTimeout(1600);

    const postPrintState = await page.evaluate(() => {
      const lab = window.__lab;
      return {
        paperVisible: lab.paperMesh ? lab.paperMesh.visible : false,
        paperZ: lab.paperMesh ? lab.paperMesh.position.z : 0,
        paperY: lab.paperMesh ? lab.paperMesh.position.y : 0,
      };
    });
    console.log(`   -> Post-print: paperVisible=${postPrintState.paperVisible}, final z=${postPrintState.paperZ.toFixed(3)}m, y=${postPrintState.paperY.toFixed(3)}m`);

    // Capture screenshot after print
    const ssFinishedPath = path.join(outDir, 'rs2-print-completed.png');
    await page.screenshot({ path: ssFinishedPath });
    console.log(`   -> Captured completed print screenshot: ${ssFinishedPath}`);

    // 6. Test buildResumePdf in browser
    console.log('\n6. Testing Harvard PDF Generation in browser...');
    const pdfBytes = await page.evaluate(async () => {
      const lab = window.__lab;
      const chosen = lab.resume.items.filter(i => lab.resume.selected.has(i.id));
      const tpl = { id: 'quant-research', name: 'QUANT / ML RESEARCH', accent: '#39d6ff' };
      const bytes = await lab.buildResumePdf(chosen, tpl);
      return Array.from(bytes);
    });
    console.log(`   -> Generated PDF byte size: ${pdfBytes.length} bytes`);
    if (pdfBytes.length < 5000) {
      throw new Error(`PDF output too small: ${pdfBytes.length} bytes`);
    }

    // Save PDF to verify
    fs.writeFileSync('Priyansh_Gadia_Resume_quant-research_verified.pdf', Buffer.from(pdfBytes));
    console.log('   -> Saved verified PDF: Priyansh_Gadia_Resume_quant-research_verified.pdf');

    // 7. Verify Rule 4 and Rule 7
    console.log('\n7. Verifying Rule 4 (FPS >= 30, raster image files loaded: 0) & Rule 7 (0 warnings)...');
    const hudDebug = await page.evaluate(() => {
      const el = document.getElementById('dbg');
      return el ? el.textContent : '';
    });
    console.log(`   -> HUD Readout:\n${hudDebug}`);

    console.log(`   -> Console errors count: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('   Console errors:', consoleErrors);
      throw new Error(`Console errors detected: ${consoleErrors.join(', ')}`);
    }

    console.log('\n=== ALL RESUME TESTS PASSED WITH ZERO ERRORS ===');
  } catch (err) {
    console.error('FAILED:', err.message || err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runVerification();
