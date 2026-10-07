// verify-about.mjs  — the pixels are the acceptance test.
//   node verify-about.mjs [url] [outDir]
//   env: CHROME=/path/to/chrome  W=1280 H=720
//
// For every checkpoint it calls window.setCinematicProgress(p), screenshots the canvas, and then PROVES the intended
// subject contributes pixels by hiding it and diffing the same frame. Exits 1 on any failure. No console-log optimism.
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const URL_ = process.argv[2] || 'http://localhost:8765/test/fixture.html';
const OUT = process.argv[3] || 'out';
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
fs.mkdirSync(OUT, { recursive: true });

const PORTRAIT = H > W;
const ALL = ['BOOTS', 'LEGS', 'TORSO', 'ARMS', 'GAUNTLETS', 'HELMET'];
// kind: lit = frame must not be a black void | focus = ONE part in the LEFT half, big | all = all six visible | suit = standing suit
const CHECKPOINTS = [
  { p: 0.10, name: 'door-opening', kind: 'lit' },
  { p: 0.15, name: 'workshop-reveal', kind: 'lit' },
  { p: 0.22, name: 'armor-powers-up', kind: 'lit' },
  { p: 0.30, name: 'boots-showcase', kind: 'focus', part: 'BOOTS' },
  { p: 0.40, name: 'legs-showcase', kind: 'focus', part: 'LEGS' },
  { p: 0.50, name: 'torso-showcase', kind: 'focus', part: 'TORSO' },
  { p: 0.60, name: 'arms-showcase', kind: 'focus', part: 'ARMS' },
  { p: 0.68, name: 'gauntlets-showcase', kind: 'focus', part: 'GAUNTLETS' },
  { p: 0.76, name: 'helmet-showcase', kind: 'focus', part: 'HELMET' },
  { p: 0.83, name: 'all-in-flight', kind: 'all' },
  { p: 0.90, name: 'descent', kind: 'all' },
  { p: 0.97, name: 'suit-standing', kind: 'suit' },
  { p: 0.995, name: 'vault-reveal', kind: 'lit' },
];

const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
const decode = (buf) => PNG.sync.read(buf);
function stats(png) {
  const d = png.data; let sum = 0, lit = 0; const n = png.width * png.height;
  for (let i = 0; i < d.length; i += 4) { const l = lum(d, i); sum += l; if (l > 35) lit++; }
  return { mean: sum / n, lit: lit / n };
}
function diffInBox(a, b, bb) {
  const x0 = Math.max(0, Math.floor(bb.x0)), y0 = Math.max(0, Math.floor(bb.y0));
  const x1 = Math.min(a.width, Math.ceil(bb.x1)), y1 = Math.min(a.height, Math.ceil(bb.y1));
  let changed = 0, total = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * a.width + x) * 4; total++;
    if (Math.abs(lum(a.data, i) - lum(b.data, i)) > 22) changed++;
  }
  return total ? changed / total : 0;
}
const clipFrac = (bb) => {
  const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0; if (w <= 0 || h <= 0) return 0;
  const cw = Math.min(W, bb.x1) - Math.max(0, bb.x0), ch = Math.min(H, bb.y1) - Math.max(0, bb.y0);
  return Math.max(0, cw) * Math.max(0, ch) / (w * h);
};

const browser = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto(URL_ + (URL_.includes('?') ? '&' : '?') + `w=${W}&h=${H}`);
await page.waitForFunction('window.__aboutReady === true', null, { timeout: 30000 });

const shot = async () => decode(await page.screenshot({ type: 'png' }));
const results = [], frames = [];
for (const c of CHECKPOINTS) {
  await page.evaluate((p) => window.setCinematicProgress(p), c.p);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const png = await shot(); const st = stats(png);
  fs.writeFileSync(path.join(OUT, `${String(Math.round(c.p * 1000)).padStart(4, '0')}-${c.name}.png`), PNG.sync.write(png));
  frames.push({ c, png });
  const fail = [], info = { p: c.p, name: c.name, mean: +st.mean.toFixed(1), lit: +(st.lit * 100).toFixed(1) };

  if (st.mean < 4 || st.lit < 0.01) fail.push(`BLACK VOID (mean ${st.mean.toFixed(1)}, lit ${(st.lit * 100).toFixed(2)}%)`);

  const proveSubject = async (part, opts) => {
    const bb = await page.evaluate((n) => window.__about.projectBBox(n), part);
    const areaFrac = bb.area / (W * H), cx = (bb.x0 + bb.x1) / 2;
    await page.evaluate((n) => window.__about.setSubjectVisible(n, false), part);
    const hidden = await shot();
    await page.evaluate((n) => window.__about.setSubjectVisible(n, true), part);
    await page.evaluate((p) => window.setCinematicProgress(p), c.p);
    const changedBox = diffInBox(png, hidden, bb);
    const changed = changedBox * Math.max(0, bb.area) / (W * H) ;   // changed pixels as a fraction of the whole frame
    const row = { part, areaPct: +(areaFrac * 100).toFixed(1), cxPct: +((cx / W) * 100).toFixed(0), onScreen: +clipFrac(bb).toFixed(2), pixelsProvedPct: +(changed * 100).toFixed(2) };
    if (bb.behindCamera > 0 && bb.behindCamera < 8 && areaFrac < 0.001) fail.push(`${part}: behind camera`);
    if (areaFrac < opts.minArea) fail.push(`${part}: too small (${(areaFrac * 100).toFixed(2)}% of frame, need >= ${(opts.minArea * 100).toFixed(1)}%)`);
    if (opts.left && cx > W * 0.5) fail.push(`${part}: not in LEFT half (centre at ${((cx / W) * 100).toFixed(0)}%)`);
    if (clipFrac(bb) < opts.minOnScreen) fail.push(`${part}: only ${(clipFrac(bb) * 100).toFixed(0)}% on screen`);
    if (changed < opts.minPixels) fail.push(`${part}: NOT PROVEN IN PIXELS (hiding it changes only ${(changed * 100).toFixed(3)}% of the frame, need >= ${(opts.minPixels * 100).toFixed(3)}%)`);
    return row;
  };

  info.subjects = [];
  if (c.kind === 'focus') info.subjects.push(await proveSubject(c.part, PORTRAIT ? { minArea: 0.04, left: false, minOnScreen: 0.9, minPixels: 0.006 } : { minArea: 0.06, left: true, minOnScreen: 0.9, minPixels: 0.015 }));
  if (c.kind === 'all') for (const n of ALL) info.subjects.push(await proveSubject(n, { minArea: 0.0015, left: false, minOnScreen: 0.6, minPixels: 0.0004 }));
  if (c.kind === 'suit') for (const n of ALL) info.subjects.push(await proveSubject(n, { minArea: 0.0015, left: false, minOnScreen: 0.95, minPixels: 0.0008 }));
  info.pass = fail.length === 0; info.fail = fail; results.push(info);
}
await browser.close();

// contact sheet
const TW = 320, TH = Math.round((320 * H) / W), COLS = 4, ROWS = Math.ceil(frames.length / COLS);
const sheet = new PNG({ width: TW * COLS, height: TH * ROWS });
frames.forEach(({ c, png }, idx) => {
  const ox = (idx % COLS) * TW, oy = Math.floor(idx / COLS) * TH, pass = results[idx].pass;
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    const sx = Math.floor((x / TW) * png.width), sy = Math.floor((y / TH) * png.height), si = (sy * png.width + sx) * 4, di = ((oy + y) * sheet.width + ox + x) * 4;
    const border = x < 3 || y < 3 || x >= TW - 3 || y >= TH - 3;
    sheet.data[di] = border ? (pass ? 40 : 230) : png.data[si]; sheet.data[di + 1] = border ? (pass ? 190 : 30) : png.data[si + 1]; sheet.data[di + 2] = border ? 60 : png.data[si + 2]; sheet.data[di + 3] = 255;
  }
});
fs.writeFileSync(path.join(OUT, 'contact-sheet.png'), PNG.sync.write(sheet));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ results, pageErrors: errs }, null, 2));

let bad = 0;
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  p=${r.p.toFixed(3)}  ${r.name.padEnd(20)} mean=${r.mean}  lit=${r.lit}%`);
  r.fail.forEach((f) => console.log('        - ' + f)); if (!r.pass) bad++;
}
if (errs.length) { console.log('\npage errors:\n  ' + errs.join('\n  ')); bad++; }
console.log(`\n${bad ? 'ACCEPTANCE FAILED' : 'ACCEPTANCE PASSED'} — contact sheet: ${path.join(OUT, 'contact-sheet.png')}`);
process.exit(bad ? 1 : 0);
