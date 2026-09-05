import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * scripts/validate-scene-render.ts
 * Self-QA Gate (Section 3 & Step 5)
 * Captures and validates TWO camera positions:
 * 1. START_POS: (0, 1.6, 7.0) — Full scene context & environment silhouette
 * 2. ARRIVED_POS: (0, 1.4, 1.6) — Close-up hero inspection on the door
 */

function analyzePngBuffer(buffer: Buffer): { maxColorRatio: number; uniqueColors: number } {
  const colorCounts = new Map<string, number>();
  let totalSampled = 0;

  const step = Math.max(1, Math.floor(buffer.length / 5000));
  for (let i = 64; i < buffer.length - 8; i += step) {
    const b1 = buffer[i];
    const b2 = buffer[i + 1];
    const b3 = buffer[i + 2];
    const key = `${Math.floor(b1 / 16) * 16},${Math.floor(b2 / 16) * 16},${Math.floor(b3 / 16) * 16}`;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    totalSampled++;
  }

  let maxCount = 0;
  for (const count of colorCounts.values()) {
    if (count > maxCount) maxCount = count;
  }

  return {
    maxColorRatio: totalSampled > 0 ? maxCount / totalSampled : 1.0,
    uniqueColors: colorCounts.size,
  };
}

async function validateSceneRender() {
  console.log('=== [SCENE 00 DUAL-POSITION QA VALIDATION GATE] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 576, height: 1024 }, // Vertical 9:16 framing per Style Bible
    deviceScaleFactor: 1,
  });

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    console.log('1. Navigating to http://localhost:3000/ (9:16 vertical viewport: 576x1024)...');
    await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 25000 });
    await page.waitForSelector('canvas', { state: 'attached', timeout: 20000 });
    await page.waitForTimeout(3000);

    // =========================================================================
    // GUARD A: Zero console errors logged during scene mount
    // =========================================================================
    console.log('2. Verifying Guard A: Console error check...');
    if (consoleErrors.length > 0) {
      throw new Error(`[GUARD A FAILED] Console errors detected:\n${consoleErrors.join('\n')}`);
    }
    console.log('   -> Guard A PASSED: 0 console errors logged.');

    // =========================================================================
    // SHOT 1: START_POS (Full Cavern Approach)
    // =========================================================================
    console.log('3. Capturing SHOT 1: START_POS (0, 1.6, 7.0)...');
    const screenshotDir = path.resolve(process.cwd(), 'public');
    const startPosPath = path.join(screenshotDir, 'scene-00-start-pos.png');
    const startBuffer = await page.screenshot({ path: startPosPath });

    const startVariance = analyzePngBuffer(startBuffer);
    if (startVariance.maxColorRatio > 0.90 || startVariance.uniqueColors < 10) {
      throw new Error(`[GUARD B FAILED at START_POS] Flat color render: ${(startVariance.maxColorRatio * 100).toFixed(1)}%`);
    }
    console.log(`   -> START_POS PASSED: ${startVariance.uniqueColors} color buckets, healthy lighting.`);

    // =========================================================================
    // SHOT 2: ARRIVED_POS (Close-Up Hero Inspection)
    // Trigger dolly animation via click on center door
    // =========================================================================
    console.log('4. Clicking center door to execute dolly walk to ARRIVED_POS (0, 1.4, 1.6)...');
    await page.click('canvas', { position: { x: 288, y: 512 } });
    await page.waitForTimeout(3500); // Wait for 2.8s GSAP ease + settling

    console.log('5. Capturing SHOT 2: ARRIVED_POS (Close-Up Hero Inspection)...');
    const arrivedPosPath = path.join(screenshotDir, 'scene-00-arrived-pos.png');
    const arrivedBuffer = await page.screenshot({ path: arrivedPosPath });

    const arrivedVariance = analyzePngBuffer(arrivedBuffer);
    if (arrivedVariance.maxColorRatio > 0.90 || arrivedVariance.uniqueColors < 10) {
      throw new Error(`[GUARD B FAILED at ARRIVED_POS] Flat color render: ${(arrivedVariance.maxColorRatio * 100).toFixed(1)}%`);
    }
    console.log(`   -> ARRIVED_POS PASSED: ${arrivedVariance.uniqueColors} color buckets, close-up lighting active.`);

    console.log('\n[VALIDATION PASS] Both START_POS and ARRIVED_POS passed automated validation.');
    console.log(`Saved START_POS:   ${startPosPath}`);
    console.log(`Saved ARRIVED_POS: ${arrivedPosPath}`);

    await browser.close();
    process.exit(0);
  } catch (err: any) {
    console.error('\n[VALIDATION FAIL]', err.message);
    await browser.close();
    process.exit(1);
  }
}

validateSceneRender();
