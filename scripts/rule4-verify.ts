import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('=== [RULE 4 & 7 VERIFICATION GATE] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 576, height: 1024 },
    deviceScaleFactor: 1,
  });

  const consoleMessages: { type: string; text: string }[] = [];
  const webglWarnings: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleMessages.push({ type, text });
    console.log(`[BROWSER ${type.toUpperCase()}]: ${text}`);
    if (type === 'warning' || type === 'error' || text.toLowerCase().includes('webgl') || text.toLowerCase().includes('warn')) {
      if (!text.includes('Failed to load resource') && !text.includes('favicon')) {
        webglWarnings.push(`[${type}] ${text}`);
      }
    }
  });

  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]:', err);
    webglWarnings.push(`[PAGE ERROR] ${err.message}`);
  });

  try {
    const port = process.env.PORT || '3000';
    console.log(`Navigating to http://localhost:${port}/index.html ...`);
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load', timeout: 30000 });

    console.log('Waiting for procedural compilation to complete (#load removed)...');
    await page.waitForSelector('#load', { state: 'detached', timeout: 30000 });
    console.log('Compilation finished.');

    // Wait for realism.js to finish applyRealism
    await page.waitForFunction(() => (window as any).VAULT?.realism !== undefined, { timeout: 10000 });
    console.log('realism.js applied.');

    // Press 'd' to toggle debug HUDs (both #dbg on left and realism hud on right)
    await page.keyboard.press('d');

    // Add a small on-screen console audit HUD at the bottom to visibly screenshot the console state
    await page.evaluate(() => {
      const cBox = document.createElement('div');
      cBox.id = 'console-audit';
      cBox.style.cssText = 'position:fixed;bottom:10px;left:10px;right:10px;background:#000c;color:#0f0;font:10px ui-monospace,monospace;padding:6px 10px;z-index:9999;border:1px solid #0f04;white-space:pre-wrap;pointer-events:none;line-height:1.4;';
      document.body.appendChild(cBox);
    });

    const updateConsoleAudit = async () => {
      await page.evaluate((msgs) => {
        const el = document.getElementById('console-audit');
        if (!el) return;
        const warns = msgs.filter(m => m.type === 'warning' || m.type === 'error');
        if (warns.length === 0) {
          el.innerHTML = '<span style="color:#6f9">CONSOLE: 0 WebGL warnings · 0 errors · Shaders compiled cleanly</span>';
        } else {
          el.innerHTML = '<span style="color:#f66">CONSOLE WARNINGS/ERRORS:\n' + warns.map(w => `${w.type}: ${w.text}`).join('\n') + '</span>';
        }
      }, consoleMessages);
    };

    console.log('Waiting for FPS accumulator to reach steady state (6.5s)...');
    await page.waitForTimeout(6500);
    await updateConsoleAudit();

    const outDir = path.resolve(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Capture walk = 0
    const walk0Path = path.join(outDir, 'walk-0.png');
    await page.screenshot({ path: walk0Path });
    console.log(`Saved walk=0 screenshot to: ${walk0Path}`);

    const hudText0 = await page.locator('#dbg').innerText();
    console.log(`\nHUD at walk=0:\n${hudText0}\n`);

    // Transition walk to 1
    console.log('Setting walk.target = 1...');
    await page.evaluate(() => {
      (window as any).VAULT.walk.target = 1;
    });

    await page.waitForTimeout(4000);
    await updateConsoleAudit();

    // Capture walk = 1
    const walk1Path = path.join(outDir, 'walk-1.png');
    await page.screenshot({ path: walk1Path });
    console.log(`Saved walk=1 screenshot to: ${walk1Path}`);

    const hudText1 = await page.locator('#dbg').innerText();
    console.log(`\nHUD at walk=1:\n${hudText1}\n`);

    // Separate console screenshot
    const consolePath = path.join(outDir, 'console-audit.png');
    await page.screenshot({ path: consolePath });
    console.log(`Saved console audit screenshot to: ${consolePath}`);

    console.log('=== WEBGL CONSOLE AUDIT ===');
    const realWarnings = webglWarnings.filter(w => !w.includes('Download the Vue Devtools') && !w.includes('favicon'));
    if (realWarnings.length > 0) {
      console.warn('WebGL Warnings/Errors detected:', realWarnings);
      throw new Error(`WebGL warnings found: ${realWarnings.join(', ')}`);
    } else {
      console.log('PASS: 0 WebGL warnings detected in console.');
    }

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    await browser.close();
    process.exit(1);
  }
}

main();
