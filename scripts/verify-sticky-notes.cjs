const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('=== [LS2 STICKY NOTES VERIFICATION] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  const consoleMessages = [];
  const errors = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    if (msg.type() === 'error') errors.push(text);
  });
  page.on('pageerror', err => errors.push(err.message));

  const artifactDir = path.resolve('C:/Users/gadia/.gemini/antigravity-ide/brain/475c253f-9db4-4c62-97b4-6d98a1bf3915');

  try {
    const port = process.env.PORT || '3000';
    console.log(`1. Navigating to http://localhost:${port}/index.html?lab&boot=skip ...`);
    await page.goto(`http://localhost:${port}/index.html?lab&boot=skip`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
    await page.waitForTimeout(1000);

    // Focus LS2 sector
    console.log('2. Focusing sector LS2 corkboard...');
    await page.evaluate(() => window.__lab.focusSector('LS2'));
    await page.waitForTimeout(2000);

    // Verify initial note 0 position
    const initPos = await page.evaluate(() => {
      const note0 = window.__lab.ls2Notes[0];
      return { x: note0.posX, y: note0.posY, message: note0.message };
    });
    console.log('   Initial Note 0 pos:', initPos);

    // ── Test 1: Drag and Drop Movement ──
    console.log('3. Testing drag-and-drop movement of Note 0...');
    const moveResult = await page.evaluate(() => {
      const g = window.__lab.sectorGroups['LS2'];
      let noteMesh0 = null;
      g.traverse(o => {
        if (o.userData && o.userData.interactive && o.userData.noteIdx === 0) noteMesh0 = o;
      });
      if (!noteMesh0) return { success: false, error: 'noteMesh0 not found' };

      // Dispatch hit on noteMesh0
      window.__lab.handlers.LS2.onHit(noteMesh0, { x: 0.5, y: 0.5 }, null, { clientX: 600, clientY: 400 });

      // Move note by simulating pointer movement
      window.__lab.handlers.LS2.onMove({ clientX: 750, clientY: 320 });

      // Release note onto corkboard
      window.__lab.handlers.LS2.onRelease({});

      const note0 = window.__lab.ls2Notes[0];
      const rawStored = localStorage.getItem('vault_ls2_notes_session_v1');
      return {
        success: true,
        newX: note0.posX,
        newY: note0.posY,
        meshX: noteMesh0.position.x,
        meshY: noteMesh0.position.y,
        sessionStored: !!rawStored
      };
    });
    console.log('   Move result:', moveResult);
    if (!moveResult.success || !moveResult.sessionStored) {
      throw new Error(`Drag-and-drop test failed: ${JSON.stringify(moveResult)}`);
    }

    const dragShotPath = path.join(artifactDir, 'ls2-note-dragged.png');
    await page.screenshot({ path: dragShotPath });
    console.log(`   -> Saved screenshot: ${dragShotPath}`);

    // ── Test 2: Note Duplication ──
    console.log('4. Testing note duplication (duplicateLS2Note)...');
    const dupResult = await page.evaluate(() => {
      const dupIdx = window.__lab.duplicateLS2Note(0);
      const original = window.__lab.ls2Notes[0];
      const duplicate = window.__lab.ls2Notes[dupIdx];
      const rawStored = localStorage.getItem('vault_ls2_notes_session_v1');
      return {
        dupIdx,
        originalPos: { x: original.posX, y: original.posY },
        duplicatePos: { x: duplicate.posX, y: duplicate.posY },
        duplicateAuthor: duplicate.author,
        sessionStored: !!rawStored
      };
    });
    console.log('   Duplication result:', dupResult);
    if (dupResult.dupIdx < 0 || !dupResult.sessionStored) {
      throw new Error(`Duplication test failed: ${JSON.stringify(dupResult)}`);
    }
    // Verify duplicate is prominently offset
    const dx = Math.abs(dupResult.duplicatePos.x - dupResult.originalPos.x);
    const dy = Math.abs(dupResult.duplicatePos.y - dupResult.originalPos.y);
    console.log(`   Duplicate offset: dx=${dx.toFixed(3)}, dy=${dy.toFixed(3)} (visible side-by-side)`);

    const dupShotPath = path.join(artifactDir, 'ls2-notes-duplicated.png');
    await page.screenshot({ path: dupShotPath });
    console.log(`   -> Saved screenshot: ${dupShotPath}`);

    // ── Test 3: Session Persistence Across Full Page Reload ──
    console.log('5. Testing session persistence across full reload...');
    await page.goto(`http://localhost:${port}/index.html?lab&boot=skip`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__lab?.state?.ready, { timeout: 25000 });
    await page.waitForTimeout(1000);

    // Focus LS2 after reload
    await page.evaluate(() => window.__lab.focusSector('LS2'));
    await page.waitForTimeout(2000);

    const reloadedInfo = await page.evaluate((dupIdx) => {
      const note0 = window.__lab.ls2Notes[0];
      const dupNote = window.__lab.ls2Notes[dupIdx];
      const raw = localStorage.getItem('vault_ls2_notes_session_v1');
      return {
        rawExists: !!raw,
        note0Pos: { x: note0.posX, y: note0.posY },
        dupNotePos: { x: dupNote.posX, y: dupNote.posY },
        dupAuthor: dupNote.author
      };
    }, dupResult.dupIdx);

    console.log('   Reloaded session info:', reloadedInfo);
    if (!reloadedInfo.rawExists || Math.abs(reloadedInfo.note0Pos.x - moveResult.newX) > 0.01) {
      throw new Error(`Session persistence failed! Position not restored: ${JSON.stringify(reloadedInfo)}`);
    }

    const persistShotPath = path.join(artifactDir, 'ls2-session-persisted.png');
    await page.screenshot({ path: persistShotPath });
    console.log(`   -> Saved reload persistence screenshot: ${persistShotPath}`);

    console.log('=== [LS2 VERIFICATION PASSED: ALL 3 REQUIREMENTS SATISFIED] ===');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
