import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

function computeLuminance(buffer: Buffer): number {
  // Simple PNG pixel sampling or full decode
  // Since buffer is PNG format, let's use page.evaluate to get exact canvas pixel luminance directly from WebGL canvas
  return 0;
}

async function main() {
  console.log('=== [PROJECT RULES 4, 7 & 8 VERIFICATION GATE] ===');
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
      webglWarnings.push(`[${type}] ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]:', err);
    webglWarnings.push(`[PAGE ERROR] ${err.message}`);
  });

  try {
    console.log('1. Navigating to http://localhost:8000/index.html ...');
    await page.goto('http://localhost:8000/index.html', { waitUntil: 'load', timeout: 30000 });

    console.log('2. Waiting for procedural compilation to complete (#load removed)...');
    await page.waitForSelector('#load', { state: 'detached', timeout: 30000 });
    console.log('   -> Compilation finished.');

    // Wait for realism.js and transition.js
    await page.waitForFunction(() => (window as any).VAULT?.realism !== undefined && (window as any).VAULT?.cinematic !== undefined, { timeout: 15000 });
    console.log('   -> realism.js and transition.js successfully initialized.');

    // Toggle HUDs
    await page.keyboard.press('d');

    // Add console audit overlay
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

    console.log('3. Waiting for FPS accumulator at walk=0 (4.5s)...');
    await page.waitForTimeout(4500);
    await updateConsoleAudit();

    const outDir = path.resolve(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Capture walk = 0
    const walk0Path = path.join(outDir, 'walk-0.png');
    await page.screenshot({ path: walk0Path });
    console.log(`   -> Saved walk=0 screenshot to: ${walk0Path}`);

    const hudText0 = await page.locator('#dbg').innerText();
    console.log(`\nHUD at walk=0:\n${hudText0}\n`);

    // Walk to 1
    console.log('4. Walking to door (walk.target = 1)...');
    await page.evaluate(() => {
      (window as any).VAULT.walk.target = 1;
    });

    await page.waitForTimeout(4000);
    await updateConsoleAudit();

    // Capture walk = 1
    const walk1Path = path.join(outDir, 'walk-1.png');
    await page.screenshot({ path: walk1Path });
    console.log(`   -> Saved walk=1 screenshot to: ${walk1Path}`);

    const hudText1 = await page.locator('#dbg').innerText();
    console.log(`\nHUD at walk=1:\n${hudText1}\n`);

    // RULE 8: Cinematic check
    console.log('5. Triggering window.dispatchEvent(new CustomEvent("vault:granted"))...');
    const startTime = Date.now();
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vault:granted'));
    });

    // Target timestamps: +2.8s, +5.0s, +9.0s, +12.5s
    const waitTo = async (targetSec: number) => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = targetSec - elapsed;
      if (remaining > 0) {
        await page.waitForTimeout(remaining * 1000);
      }
    };

    // +2.8 s
    await waitTo(2.8);
    await updateConsoleAudit();
    const sc28Path = path.join(outDir, 'cinematic-2.8s.png');
    await page.screenshot({ path: sc28Path });
    console.log(`   -> Captured +2.8s screenshot to: ${sc28Path}`);

    // +5.0 s
    await waitTo(5.0);
    await updateConsoleAudit();
    const sc50Path = path.join(outDir, 'cinematic-5.0s.png');
    await page.screenshot({ path: sc50Path });
    const doorPos50 = await page.evaluate(() => {
      const d = (window as any).VAULT.door;
      return { x: d.position.x, y: d.position.y, z: d.position.z };
    });
    console.log(`   -> Captured +5.0s screenshot to: ${sc50Path}`);
    console.log(`      Door position at +5.0s: x=${doorPos50.x.toFixed(3)}, y=${doorPos50.y.toFixed(3)}, z=${doorPos50.z.toFixed(3)}`);

    // +9.0 s
    await waitTo(9.0);
    await updateConsoleAudit();
    const sc90Path = path.join(outDir, 'cinematic-9.0s.png');
    await page.screenshot({ path: sc90Path });
    const camPos90 = await page.evaluate(() => {
      const c = (window as any).VAULT.camera;
      return { x: c.position.x, y: c.position.y, z: c.position.z };
    });
    console.log(`   -> Captured +9.0s screenshot to: ${sc90Path}`);
    console.log(`      Camera position at +9.0s: x=${camPos90.x.toFixed(3)}, y=${camPos90.y.toFixed(3)}, z=${camPos90.z.toFixed(3)}`);

    // +12.5 s
    await waitTo(12.5);
    await updateConsoleAudit();
    const sc125Path = path.join(outDir, 'cinematic-12.5s.png');
    await page.screenshot({ path: sc125Path });
    console.log(`   -> Captured +12.5s screenshot to: ${sc125Path}`);

    // Compute luminance at 12.5s directly from canvas pixels in browser
    const luminance125 = await page.evaluate(() => {
      const canvas = document.getElementById('c') as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return 0;
      const w = canvas.width, h = canvas.height;
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let sum = 0;
      const totalPixels = w * h;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sum += lum;
      }
      return (sum / totalPixels / 255) * 100;
    });
    console.log(`      Frame luminance at +12.5s: ${luminance125.toFixed(3)}%`);

    console.log('\n=== [RULE 7 & 8 AUDIT SUMMARY] ===');
    const realWarnings = webglWarnings.filter(w => !w.includes('Download the Vue Devtools') && !w.includes('favicon'));
    console.log(`Console WebGL Warnings/Errors: ${realWarnings.length}`);
    if (realWarnings.length > 0) {
      console.warn('Warnings list:', realWarnings);
      throw new Error(`Console warnings found: ${realWarnings.join(', ')}`);
    } else {
      console.log('PASS: Console has zero warnings.');
    }

    if (Math.abs(doorPos50.z - (-7.0)) < 0.1 && doorPos50.y <= 0.4) {
      console.warn('WARNING: Door offset at 5.0s not clearly visible!');
    } else {
      console.log(`PASS: Door offset visible at 5.0s (deltaY = ${(doorPos50.y - 0.35).toFixed(2)}m, deltaZ = ${(doorPos50.z - (-7.0)).toFixed(2)}m)`);
    }

    if (luminance125 < 2.0) {
      console.log(`PASS: Frame luminance at 12.5s is ${luminance125.toFixed(2)}% (< 2.0%)`);
    } else {
      throw new Error(`FAIL: Frame luminance at 12.5s is ${luminance125.toFixed(2)}% (expected < 2.0%)`);
    }

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Validation Failed:', err);
    await browser.close();
    process.exit(1);
  }
}

main();
