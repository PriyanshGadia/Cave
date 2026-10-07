import { chromium } from 'playwright-core'; import crypto from 'node:crypto';
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } }); await pg.goto('http://localhost:8765/test/fixture.html?w=1280&h=720');
await pg.waitForFunction('window.__aboutReady===true');
const h = async (p) => { await pg.evaluate((p)=>window.setCinematicProgress(p), p); return crypto.createHash('md5').update(await pg.screenshot()).digest('hex').slice(0,8); };
const fwd = {}; for (const p of [0.12,0.30,0.60,0.83,0.97]) fwd[p] = await h(p);
await h(1.0); await h(0.0);
let ok = true; for (const p of [0.97,0.83,0.60,0.30,0.12]) { const r = await h(p); const same = r === fwd[p]; ok &&= same; console.log(`p=${p} forward=${fwd[p]} after-reverse-scrub=${r} ${same?'IDENTICAL':'DIFFERENT'}`); }
console.log(ok ? 'DETERMINISTIC: scrubbing back reproduces every frame exactly' : 'NON-DETERMINISTIC'); await b.close(); process.exit(ok?0:1);
