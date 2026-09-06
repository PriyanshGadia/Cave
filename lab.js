// lab.js — VAULT-01 · Scene 2 · THE HALL  (rev C — document-aligned bench, AI entrance, lit end state)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const TAU = Math.PI * 2, NSEC = 9, SEC = TAU / NSEC;
export const SECTORS = [['S0','ENTRY GATE'],['RS1','BLUEPRINT DECK'],['RS2','RESUME FABRICATOR'],['RS3','HOLO-CALENDAR'],['RS4','WORKSTATION · SEALED'],
  ['LS4','WORKSTATION · SEALED'],['LS3','HOLO-GLOBE'],['LS2','SCRATCHPAD WALL'],['LS1','PROFILE PANEL']].map(([id, name], k) => ({ k, id, name, theta: k * SEC }));
export const T = { fade: [.3, 1.6], approach: [.4, 6.2], spark: [1.6, 4.2], table: [4.0, 5.4], beam: [5.2, 6.0], map: [6.0, 10.8], hold: [10.8, 12.0], retract: [12.0, 13.4],
  entity: [13.4, 16.0], greet: [16.0, 20.6], collapse: [20.6, 22.2], power: [22.2, 27.4], idle: [26.6, 28.4], ready: 28.4 };

/* ── math / noise ── */
const { clamp, lerp } = THREE.MathUtils;
const fract = x => x - Math.floor(x), sm = t => t * t * (3 - 2 * t), ph = (t, [a, b]) => clamp((t - a) / (b - a), 0, 1), eo = t => 1 - (1 - t) ** 3, ei = t => t * t * t;
const hash = n => fract(Math.sin(n * 12.9898) * 43758.5453), h2 = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453), h3 = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
const vn2 = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi); return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), xf), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), xf), yf); };
const fbm2 = (x, y, o = 3) => { let a = .5, f = 1, s = 0, n = 0; for (let i = 0; i < o; i++) { s += a * vn2(x * f + i * 7.1, y * f + i * 3.3); n += a; a *= .5; f *= 2.07; } return s / n; };
const vn3 = (x, y, z) => { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi), l = lerp;
  return l(l(l(h3(xi,yi,zi),h3(xi+1,yi,zi),xf), l(h3(xi,yi+1,zi),h3(xi+1,yi+1,zi),xf), yf), l(l(h3(xi,yi,zi+1),h3(xi+1,yi,zi+1),xf), l(h3(xi,yi+1,zi+1),h3(xi+1,yi+1,zi+1),xf), yf), zf); };
const fbm3 = (x, y, z, o = 3) => { let a = .5, f = 1, s = 0, n = 0; for (let i = 0; i < o; i++) { s += a * vn3(x * f + i * 17.3, y * f + i * 5.1, z * f); n += a; a *= .5; f *= 2.03; } return s / n; };

/* ── canvas helpers ── */
const cvs = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const mono = (g, px, w = 'bold') => g.font = `${w} ${px}px ui-monospace,Menlo,Consolas,monospace`;
const gridLines = (g, w, h, s, c) => { g.strokeStyle = c; g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= w; x += s) { g.moveTo(x, 0); g.lineTo(x, h); } for (let y = 0; y <= h; y += s) { g.moveTo(0, y); g.lineTo(w, y); } g.stroke(); };
const hazard = (g, x, y, w, h) => { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = '#c9a227'; g.fillRect(x, y, w, h); g.fillStyle = '#111'; for (let i = -h; i < w + h; i += 24) { g.beginPath(); g.moveTo(x + i, y); g.lineTo(x + i + 12, y); g.lineTo(x + i + 12 - h, y + h); g.lineTo(x + i - h, y + h); g.fill(); } g.restore(); };
const softDisc = (N = 32) => { const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), r = g.createRadialGradient(N/2, N/2, 0, N/2, N/2, N/2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.2, 'rgba(255,255,255,.45)'); r.addColorStop(.55, 'rgba(255,255,255,.08)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, N, N); return new THREE.CanvasTexture(c); };
const dataTex = (d, N, srgb) => { const c = document.createElement('canvas'); c.width = c.height = N; c.getContext('2d').putImageData(new ImageData(d, N, N), 0, 0); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };

/* wet plated floor: heightfield → albedo / normal / roughness (plates, seams, concentric grooves, grated gutters, puddles, rust) */
function floorMaterial(N = 512, W = 24) {
  const H = new Float32Array(N * N), RG = new Float32Array(N * N), RU = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, wx = (x / N - .5) * W, wz = (.5 - y / N) * W, r = Math.hypot(wx, wz), th = Math.atan2(wx, wz);
    let h = .5, ro = .40; const px = fract(wx / 1.5), pz = fract(wz / 1.5), e = Math.min(px, 1 - px, pz, 1 - pz) * 1.5;
    if (e < .014) h = .28; else if (e < .04) h -= .07; h += (fbm2(wx * 1.1, wz * 1.1, 2) - .5) * .05 + (h2(x, y) - .5) * .012;
    for (const g of [5.45, 6.7, 8.8, 10.3]) if (Math.abs(r - g) < .045) { h = .3; ro = .7; }
    const ringG = r > 5.55 && r < 5.9, strG = (Math.abs(wx) < .27 && Math.abs(wz) > 5.2) || (Math.abs(wz) < .27 && Math.abs(wx) > 5.2);
    if (ringG || strG) { const bar = ringG ? Math.sin(th * 140) > .1 : fract((Math.abs(wx) < .27 ? wz : wx) * 7) > .4; h = bar ? .44 : .02; ro = bar ? .75 : .95; }
    const pud = fbm2(wx * .33 + 5, wz * .33 + 2, 3); if (pud > .58 && !ringG && !strG) ro = lerp(ro, .06, sm(clamp((pud - .58) / .09, 0, 1)));
    const rust = fbm2(wx * .9 + 11, wz * .9 + 7, 2); if (rust > .64) { RU[i] = sm(clamp((rust - .64) / .08, 0, 1)); ro = lerp(ro, .88, RU[i]); h += RU[i] * .02; }
    H[i] = h; RG[i] = ro; }
  const A = new Uint8ClampedArray(N*N*4), Nm = new Uint8ClampedArray(N*N*4), R = new Uint8ClampedArray(N*N*4), k = N * .022;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, o = i * 4, L = H[y*N + ((x-1+N)%N)], Rr = H[y*N + ((x+1)%N)], U = H[((y-1+N)%N)*N + x], D = H[((y+1)%N)*N + x];
    const nx = -(Rr - L) * k, ny = (D - U) * k, il = 1 / Math.hypot(nx, ny, 1); Nm[o] = (nx*il*.5+.5)*255; Nm[o+1] = (ny*il*.5+.5)*255; Nm[o+2] = (il*.5+.5)*255;
    const c = clamp(30 + H[i] * 36, 6, 70), ru = RU[i]; A[o] = c + ru * 34; A[o+1] = c * 1.02 + ru * 12; A[o+2] = c * 1.1 - ru * 4; R[o] = R[o+1] = R[o+2] = RG[i] * 255; A[o+3] = Nm[o+3] = R[o+3] = 255; }
  return new THREE.MeshStandardMaterial({ map: dataTex(A, N, true), normalMap: dataTex(Nm, N), roughnessMap: dataTex(R, N), metalness: .82, roughness: 1, envMapIntensity: .6, normalScale: new THREE.Vector2(1.1, 1.1), transparent: true, opacity: .8 });
}
/* riveted plate panels (albedo + roughness) */
function panelMaterial(repX, repY, base = '#1a1d22') {
  const draw = rough => (g, w, h) => { g.fillStyle = rough ? '#8c8c8c' : base; g.fillRect(0, 0, w, h); const P = 128;
    for (let py = 0; py < h; py += P) for (let px = 0; px < w; px += P) { const s = hash(px * 3.1 + py * 1.7);
      g.fillStyle = rough ? `rgb(${120 + s * 60},${120 + s * 60},${120 + s * 60})` : `rgba(${s > .7 ? 0 : 255},${s > .7 ? 0 : 255},${s > .7 ? 0 : 255},${.035 + s * .04})`; g.fillRect(px + 2, py + 2, P - 4, P - 4);
      g.strokeStyle = rough ? '#e0e0e0' : 'rgba(0,0,0,.75)'; g.lineWidth = 3; g.strokeRect(px + 1.5, py + 1.5, P - 3, P - 3);
      g.fillStyle = rough ? '#404040' : '#33373d'; for (const [a, b] of [[9, 9], [P - 9, 9], [9, P - 9], [P - 9, P - 9]]) { g.beginPath(); g.arc(px + a, py + b, 2.6, 0, TAU); g.fill(); }
      if (s > .82) { g.fillStyle = rough ? '#f0f0f0' : '#0b0d10'; for (let v = 0; v < 6; v++) g.fillRect(px + 24, py + 46 + v * 7, P - 48, 3); } }
    g.strokeStyle = rough ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.3)'; g.lineWidth = 1; for (let i = 0; i < 90; i++) { g.beginPath(); const x = hash(i) * w, y = hash(i * 3) * h; g.moveTo(x, y); g.lineTo(x + (hash(i * 7) - .5) * 60, y + (hash(i * 11) - .5) * 14); g.stroke(); } };
  const map = cvs(512, 512, draw(false)), rm = cvs(512, 512, draw(true), false); for (const t of [map, rm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX, repY); }
  return new THREE.MeshStandardMaterial({ map, roughnessMap: rm, metalness: .78, roughness: 1, envMapIntensity: .5 });
}
/* content canvases — static placeholders; Phase 3 swaps them from the backend */
const TEX = {
  blueprint: () => cvs(512, 352, (g, w, h) => { g.fillStyle = '#0a2a5c'; g.fillRect(0, 0, w, h); gridLines(g, w, h, 16, 'rgba(255,255,255,.07)'); gridLines(g, w, h, 64, 'rgba(255,255,255,.15)'); g.strokeStyle = '#e8f1ff'; g.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) { const x = 30 + hash(i*3) * 360, y = 50 + hash(i*5) * 200, ww = 40 + hash(i*7) * 120, hh = 30 + hash(i*11) * 80; g.strokeRect(x, y, ww, hh); g.beginPath(); g.arc(x + ww/2, y + hh/2, Math.min(ww, hh) * .3, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + ww, y - 8); g.stroke(); }
    g.fillStyle = '#e8f1ff'; mono(g, 18); g.fillText('PROJECT INDEX · SOURCE: GITHUB', 16, 28); mono(g, 11, ''); ['CORE','HUD','DRIVE','LINK','SHELL'].forEach((s, i) => g.fillText(`REV ${i+1}  ${s.padEnd(6)} ▮▮▮▮▯`, 16, h - 66 + i * 13)); }),
  resume: () => cvs(256, 160, (g, w, h) => { g.fillStyle = '#06131a'; g.fillRect(0, 0, w, h); g.fillStyle = '#5fe8ff'; mono(g, 13); g.fillText('RESUME FABRICATOR', 12, 22); g.fillStyle = '#2a6a78'; g.fillRect(12, 28, w - 24, 1); mono(g, 11, '');
    ['[x] PROJECTS','[x] EXPERIENCE','[ ] RESEARCH','[ ] SKILLS','[ ] CERTIFICATIONS'].forEach((s, i) => { g.fillStyle = s[1] === 'x' ? '#9ff3ff' : '#3f7a88'; g.fillText(s, 14, 50 + i * 16); }); g.fillStyle = '#4dff8a'; mono(g, 12); g.fillText('▶ BUILD TAILORED PDF', 14, h - 14); }),
  calendar: () => cvs(384, 300, (g, w, h) => { const now = new Date(), M = now.toLocaleString('en', { month: 'long' }).toUpperCase(); g.fillStyle = 'rgba(8,30,44,.85)'; g.fillRect(0, 0, w, h); g.strokeStyle = '#39d6ff'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = '#9ff3ff'; mono(g, 16); g.fillText(`${M} ${now.getFullYear()} · SCHEDULE`, 14, 26); mono(g, 11, ''); 'SMTWTFS'.split('').forEach((d, i) => g.fillText(d, 20 + i * 50, 50));
    const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay(), days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) { const c = (first + d - 1) % 7, r = Math.floor((first + d - 1) / 7), busy = hash(d * 3.7 + now.getMonth()) > .7; if (d === now.getDate()) { g.fillStyle = '#39d6ff'; g.fillRect(12 + c * 50, 58 + r * 30, 44, 26); g.fillStyle = '#031018'; } else g.fillStyle = busy ? '#ffb15c' : '#5fa8b8'; g.fillText(String(d), 20 + c * 50, 76 + r * 30); }
    g.fillStyle = '#7fb8c8'; g.fillText('■ BUSY   ■ TODAY   FREE SLOTS: EVENINGS', 14, h - 12); }),
  profile: () => cvs(320, 440, (g, w, h) => { g.fillStyle = 'rgba(6,26,38,.85)'; g.fillRect(0, 0, w, h); g.strokeStyle = '#39d6ff'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4); g.fillStyle = '#9ff3ff'; mono(g, 15); g.fillText('OPERATIVE PROFILE', 14, 26);
    g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; g.lineTo(60 + Math.cos(a) * 34, 90 + Math.sin(a) * 34); } g.closePath(); g.strokeStyle = '#5fe8ff'; g.stroke(); mono(g, 10, '');
    ['BLOG','LINKEDIN','GITHUB','YOUTUBE','SPOTIFY','CONTACT'].forEach((t, i) => { g.fillStyle = i ? '#3f7a88' : '#9ff3ff'; g.fillText(t, 14 + (i % 3) * 100, 156 + Math.floor(i / 3) * 20); }); g.fillStyle = '#2a6a78'; for (let i = 0; i < 9; i++) g.fillRect(14, 210 + i * 22, 120 + hash(i) * 160, 8); }),
  monitors: () => cvs(768, 256, (g, w, h) => { const cw = w / 3; g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3; i++) { const x = i * cw; g.fillStyle = '#020604'; g.fillRect(x + 4, 4, cw - 8, h - 8); g.fillStyle = '#35ff7a'; mono(g, 10, '');
      for (let r = 0; r < 12; r++) { let l = ''; for (let c = 0; c < 6; c++) l += Math.floor(hash(i * 90 + r * 8 + c) * 65535).toString(16).padStart(4, '0') + ' '; g.fillText(l, x + 10, 22 + r * 13); } for (let b = 0; b < 16; b++) { const bh = 10 + hash(i * 3 + b) * 40; g.fillRect(x + 10 + b * 15, h - 12 - bh, 10, bh); } g.fillStyle = '#e8ffe8'; g.fillText('TELEMETRY · NODE ' + i, x + cw - 120, 16); } }),
  ledGrid: () => cvs(64, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) if (hash(x * 7 + y) > .55) { g.fillStyle = hash(x + y * 3) > .85 ? '#ffb15c' : '#35ff7a'; g.fillRect(x + 2, y + 2, 3, 3); } }),
  gate: () => cvs(512, 160, (g, w, h) => { g.fillStyle = '#23262b'; g.fillRect(0, 0, w, h); hazard(g, 0, 0, w, 20); hazard(g, 0, h - 20, w, 20); g.fillStyle = '#c8c8c8'; mono(g, 36); g.textAlign = 'center'; g.fillText('00 · ENTRY', w / 2, h / 2 + 12); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 600; i++) g.fillRect(hash(i) * w, hash(i * 3) * h, 2, 2); }),
  sealed: () => cvs(512, 192, (g, w, h) => { g.fillStyle = '#1c1f24'; g.fillRect(0, 0, w, h); hazard(g, 0, 0, w, 18); hazard(g, 0, h - 18, w, 18); g.fillStyle = '#d0d0d0'; mono(g, 30); g.textAlign = 'center'; g.fillText('SEALED', w / 2, 82); mono(g, 16); g.fillText('WORKSTATION OFFLINE · PHASE 3', w / 2, 118); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 600; i++) g.fillRect(hash(i * 1.3) * w, hash(i * 2.1) * h, 2, 2); }),
  note: () => cvs(64, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(30,30,40,.7)'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(10, 20 + i * 14); g.lineTo(10 + 30 + hash(i) * 20, 20 + i * 14); g.stroke(); } }),
  label: (id, name) => cvs(256, 48, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#9ff3ff'; mono(g, 15); g.fillText(`${id} · ${name}`, 10, 30); g.fillStyle = '#ffb15c'; g.fillRect(0, h - 4, w, 4); }),
  wall: () => cvs(768, 448, (g, w, h) => { g.fillStyle = '#03111a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2b7f96'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#9ff3ff'; mono(g, 22); g.fillText('VAULT-01 · GLOBAL RELAY MAP', 24, 44); gridLines(g, w, h, 32, 'rgba(95,232,255,.25)'); mono(g, 11, '');
    for (let i = 0; i < 14; i++) { g.fillStyle = i % 4 ? '#3fa8bf' : '#ffb15c'; g.fillText(`${['LINK','NODE','RELAY','UPLINK'][i % 4]}-${i.toString().padStart(2, '0')}  ${(hash(i) * 400).toFixed(0).padStart(3)} ms`, w - 210, 90 + i * 22); } }),
  portal: () => cvs(256, 64, (g, w, h) => { g.fillStyle = '#16181c'; g.fillRect(0, 0, w, h); hazard(g, 0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.45)'; for (let i = 0; i < 300; i++) g.fillRect(hash(i) * w, hash(i * 3) * h, 3, 2); }),
};

/* WebAudio synthesis */
function makeSfx() { let ac, master; const ctx = () => { if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination); } if (ac.state === 'suspended') ac.resume(); return ac; };
  const noise = d => { const a = ctx(), b = a.createBuffer(1, Math.ceil(a.sampleRate * d), a.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; const s = a.createBufferSource(); s.buffer = b; return s; };
  const env = (g, t0, att, peak, dec) => { g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + att); g.gain.exponentialRampToValueAtTime(.0001, t0 + att + dec); }; const W = f => (...a) => { try { f(...a); } catch {} };
  const s = {
    spark: W(() => { const a = ctx(), n = noise(.08), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'bandpass'; const maxF = Math.min(3600, (a.sampleRate || 44100) * .45); f.frequency.value = Math.min(3400 + Math.random() * 3000, maxF); f.Q.value = 9; n.connect(f).connect(g).connect(master); env(g, a.currentTime, .004, .08, .07); n.start(); }),
    hum: W((v, r = 2) => { const a = ctx(); if (!s._h) { const o = a.createOscillator(), o2 = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.value = 54; o2.type = 'sine'; o2.frequency.value = 108.7; f.type = 'lowpass'; f.frequency.value = 210; g.gain.value = .0001; o.connect(f); o2.connect(f); f.connect(g).connect(master); o.start(); o2.start(); s._h = g; } s._h.gain.linearRampToValueAtTime(Math.max(v, .0001), a.currentTime + r); }),
    sweep: W((d = 4.5) => { const a = ctx(), o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(160, t0); const maxF = Math.min(3600, (a.sampleRate || 44100) * .45); o.frequency.exponentialRampToValueAtTime(Math.min(1500, maxF), t0 + d); o.connect(g).connect(master); env(g, t0, .3, .06, d); o.start(); o.stop(t0 + d + .5); }),
    beam: W(() => { const a = ctx(), n = noise(.6), f = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime; f.type = 'highpass'; f.frequency.setValueAtTime(400, t0); const maxF = Math.min(3600, (a.sampleRate || 44100) * .45); f.frequency.exponentialRampToValueAtTime(maxF, t0 + .5); n.connect(f).connect(g).connect(master); env(g, t0, .05, .22, .5); n.start(); }),
    thud: W(() => { const a = ctx(), o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(52, t0); o.frequency.exponentialRampToValueAtTime(24, t0 + .7); o.connect(g).connect(master); env(g, t0, .01, .9, 1.4); o.start(); o.stop(t0 + 2); const n = noise(.3), f = a.createBiquadFilter(), g2 = a.createGain(); f.type = 'lowpass'; f.frequency.value = 140; n.connect(f).connect(g2).connect(master); env(g2, t0, .01, .5, .3); n.start(); }),
    relay: W(() => { const a = ctx(), n = noise(.04), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 3; n.connect(f).connect(g).connect(master); env(g, a.currentTime, .002, .16, .05); n.start(); }),
    blip: W((fr = 880, d = .08, v = .05) => { const a = ctx(), o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime; o.type = 'sine'; o.frequency.value = fr; o.connect(g).connect(master); env(g, t0, .005, v, d); o.start(); o.stop(t0 + d + .1); }),
    servo: W((d = 1.2, up = false) => { const a = ctx(), o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime; o.type = 'sawtooth'; o.frequency.setValueAtTime(up ? 90 : 260, t0); o.frequency.exponentialRampToValueAtTime(up ? 260 : 90, t0 + d); f.type = 'lowpass'; f.frequency.value = 900; o.connect(f).connect(g).connect(master); env(g, t0, .05, .05, d); o.start(); o.stop(t0 + d + .3); })
  };
  return s; }

/* ═════════════════════════════════════════════ THE HALL ═════════════════════════════════════════════ */
export function createLab({ renderer, composer, env, LOW = false, rockMats, metalMats, idHash = '00000000' }) {
  const [gun, gunD, tit] = metalMats, rock = rockMats[0], q = new URLSearchParams(location.search);
  const legacy = false, LK = 1, LKh = 1, EXP0 = renderer.toneMappingExposure ?? 1;
  /* dimensions (m) */ const HR = 10.8, WH = 5.6, RK = 8.6, FR = 12, PL_R = 5.0, B_OUT = 4.66, B_IN = 3.3, DK_Y = .95, TOP = DK_Y + .012, HT_R = 1.9, EMIT_Y = .72, BEAM_H = 5.0, CAM_R = 5.95, IN_R = 2.62, EYE = 1.62, PZ = 9.4, MIR = .5;

  const lab = new THREE.Scene(); lab.background = new THREE.Color(0); lab.fog = new THREE.FogExp2(0x03050a, .055);
  const cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .05, 80);
  const S = { active: false, t: 0, theta: 0, vel: 0, magnet: null, lastInput: -9, sector: 0, stride: 0, look: { x: 0, y: 0, tx: 0, ty: 0 }, ready: false, entF: 0, insideT: 0, inside: 0, hover: null, focus: null, focusT: 0, focusReady: false };
  const disc = softDisc(), cues = new Set(), sfx = makeSfx(), cue = (n, c, f) => { if (c && !cues.has(n)) { cues.add(n); f(); } };
  const polar = (th, r, y = 0) => new THREE.Vector3(Math.sin(th) * r, y, Math.cos(th) * r);
  const mat = o => new THREE.MeshStandardMaterial(o), E = (c, i = 0) => mat({ color: 0, emissive: c, emissiveIntensity: i });
  const comp = mat({ color: 0x15171b, roughness: .8, metalness: .3, envMapIntensity: .4 }), compD = mat({ color: 0x0a0b0e, roughness: .9, metalness: .2 }), matte = mat({ color: 0x0e0f12, roughness: .95, metalness: .05 });
  const wallPanel = panelMaterial(18, 4), riserPanel = panelMaterial(14, 1, '#1c1f25'), deckMat = panelMaterial(.5, .5, '#22262c');
  const chanE = E(0x3fe0ff), ringE = E(0x3fe0ff), coreE = E(0xb8f6ff), amberE = E(0xff9a3c), portalE = E(0xff9a3c), gantryE = E(0x9fe8ff), greenE = E(0x35ff7a), downE = E(0xdff6ff), sconceE = E(0xffb060), railE = E(0x4fd0ff);
  const glass = mat({ color: 0x061014, roughness: .05, metalness: .1, transparent: true, opacity: .45, envMapIntensity: 1.2 });
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), cyl = (r1, r2, h, m, s = 20, open = false, a0 = 0, al = TAU) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s, 1, open, a0, al), m);
  const add = (o, x, y, z, p = lab) => { o.position.set(x, y, z); p.add(o); return o; };
  const merged = (list, m, parent = lab) => { if (!list.length) return null; const nonIdx = list.some(o => !o.geometry.index); const geos = list.map(o => { o.updateMatrix(); let g = o.geometry.clone().applyMatrix4(o.matrix); if (nonIdx && g.index) g = g.toNonIndexed(); return g; }); const mg = mergeGeometries(geos, false); if (!mg) return null; const mesh = new THREE.Mesh(mg, m); parent.add(mesh); return mesh; };
  const arcShape = (ro, ri, a0, a1) => { const s = new THREE.Shape(); s.absarc(0, 0, ro, a0 - Math.PI / 2, a1 - Math.PI / 2, false); s.absarc(0, 0, ri, a1 - Math.PI / 2, a0 - Math.PI / 2, true); s.closePath(); return s; };
  const arcGeo = (ro, ri, d, a0 = 0, a1 = TAU, seg = 96) => new THREE.ExtrudeGeometry(arcShape(ro, ri, a0, a1), { depth: d, bevelEnabled: false, curveSegments: seg }).rotateX(-Math.PI / 2);   // θ-space matches polar()
  const ringArc = (ri, ro, a0, a1, seg = 120) => new THREE.RingGeometry(ri, ro, seg, 1, a0 - Math.PI / 2, a1 - a0).rotateX(-Math.PI / 2);
  const holoMat = t => new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const lineM = o => new THREE.LineBasicMaterial({ color: 0x5fe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, ...o });
  const screenMat = t => mat({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0, color: 0x101010, roughness: .3 });
  const hits = [], scanSrc = [], holos = [], screens = [], leds = [], labels = [], spin = [], heroGroups = [], mirrorPairs = [], mirror = new THREE.Group(); mirror.scale.y = -1; lab.add(mirror);
  const tag = (g, id) => { g.traverse(o => { if (o.isMesh) { o.userData.sector = id; hits.push(o); } }); return g; };
  const reflect = o => { o.updateWorldMatrix(true, true); const c = o.clone(true), a = [], b = []; o.traverse(x => a.push(x)); c.traverse(x => { if (x.material) x.material = x.material.clone(); b.push(x); }); c.matrixAutoUpdate = false; a.forEach((x, i) => mirrorPairs.push([x, b[i], i === 0])); mirror.add(c); return c; };

  /* ── floor, contact shadow, wall, rock crown ── */
  const floor = add(new THREE.Mesh(new THREE.CircleGeometry(FR, 96).rotateX(-Math.PI / 2), floorMaterial(LOW ? 384 : 512, FR * 2)), 0, 0, 0); floor.renderOrder = 2; scanSrc.push(floor);
  { const t = cvs(256, 256, (g, w) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128), u = x => x / 7.0; r.addColorStop(0, '#333'); r.addColorStop(u(HT_R + .2), '#333'); r.addColorStop(u(HT_R + .7), '#eee'); r.addColorStop(u(B_IN - .5), '#fff'); r.addColorStop(u(B_IN - .1), '#222'); r.addColorStop(u(PL_R), '#000'); r.addColorStop(u(PL_R + .5), '#777'); r.addColorStop(u(6.4), '#fff'); r.addColorStop(1, '#fff'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, false);
    add(new THREE.Mesh(new THREE.CircleGeometry(7.0, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0, alphaMap: t, transparent: true, opacity: .8, depthWrite: false })), 0, .008, 0).renderOrder = 3; }
  const wall = add(new THREE.Mesh(new THREE.CylinderGeometry(HR, HR, WH, 64, 1, true), wallPanel), 0, WH / 2, 0); wall.material.side = THREE.BackSide; scanSrc.push(wall);
  { const g = new THREE.CylinderGeometry(HR, HR + .3, RK - WH + .1, 56, 5, true), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = (fbm3(x * .3, y * .4, z * .3, 3) - .5) * 1.6 + (fbm3(x * 1.3, y * 1.3, z * 1.3, 2) - .5) * .4, s = 1 - d / HR; p.setXYZ(i, x * s, y + (fbm3(x, 3, z, 2) - .5) * .3, z * s); } g.computeVertexNormals();
    add(new THREE.Mesh(g, rock), 0, WH + (RK - WH) / 2, 0).material.side = THREE.DoubleSide;
    const dome = new THREE.SphereGeometry(HR + .2, LOW ? 32 : 44, LOW ? 12 : 16, 0, TAU, 0, Math.PI * .5); dome.scale(1, .5, 1); const dp = dome.attributes.position; for (let i = 0; i < dp.count; i++) { const x = dp.getX(i), y = dp.getY(i), z = dp.getZ(i), s = 1 - (fbm3(x * .35, y * .5, z * .35, 3) - .5) * 1.8 / HR; dp.setXYZ(i, x * s, y * s, z * s); } dome.computeVertexNormals(); add(new THREE.Mesh(dome, rock), 0, RK, 0).material.side = THREE.DoubleSide; }
  { // columns, sconces (emissive only), mezzanine + rail, robot arms
    const cols = [], bk = [], bars = []; for (let k = 0; k < 12; k++) { const th = k / 12 * TAU + .26, c = box(.8, RK, .6, compD); c.position.copy(polar(th, HR - .45, RK / 2)); c.rotation.y = th; cols.push(c); const cap = box(1.1, .3, .9, compD); cap.position.copy(polar(th, HR - .45, WH - .15)); cap.rotation.y = th; cols.push(cap);
      const b = box(.16, 1.5, .08, gunD); b.position.copy(polar(th, HR - .8, 3.0)); b.rotation.y = th; bk.push(b); const s = box(.05, 1.3, .05, sconceE); s.position.copy(polar(th, HR - .87, 3.0)); s.rotation.y = th; bars.push(s); }
    scanSrc.push(merged(cols, compD)); merged(bk, gunD); reflect(merged(bars, sconceE));
    scanSrc.push(add(new THREE.Mesh(arcGeo(HR + .1, 9.4, .24, 0, TAU, 72), gunD), 0, WH - 1.4, 0));
    add(new THREE.Mesh(new THREE.TorusGeometry(9.42, .025, 6, 120).rotateX(Math.PI / 2), tit), 0, WH - .3, 0); add(new THREE.Mesh(new THREE.TorusGeometry(9.41, .008, 6, 120).rotateX(Math.PI / 2), railE), 0, WH - .28, 0); add(new THREE.Mesh(new THREE.TorusGeometry(9.42, .018, 6, 120).rotateX(Math.PI / 2), tit), 0, WH - .78, 0);
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(.02, .02, 1.1, 6), tit, 60), m = new THREE.Object3D(); for (let i = 0; i < 60; i++) { m.position.copy(polar(i / 60 * TAU, 9.42, WH - .85)); m.updateMatrix(); im.setMatrixAt(i, m.matrix); } lab.add(im);
    const arms = []; for (const s of [-1, 1]) { const th = Math.PI + s * .8, g = new THREE.Group(); g.position.copy(polar(th, 8.4)); g.rotation.y = th + Math.PI; lab.add(g); const P = (o, x, y, z, rx = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, 0, rz); g.add(o); arms.push(o); };
      P(cyl(.4, .48, .5, matte, 24), 0, .25, 0); P(box(.3, 1.5, .3, matte), 0, 1.2, 0, 0, s * .35); P(new THREE.Mesh(new THREE.SphereGeometry(.24, 12, 10), matte), s * .5, 1.9, 0); P(box(.22, 1.6, .22, matte), s * .8, 2.5, .3, .55, s * .95); P(box(.3, .3, .4, matte), s * 1.5, 3.0, .75); g.updateMatrixWorld(true); }
    lab.add(new THREE.Mesh(mergeGeometries(arms.map(o => o.geometry.clone().applyMatrix4(o.matrixWorld)), false), matte)); arms.forEach(o => o.parent.remove(o)); }
  { // left workstation (long bench, three wall monitors, server rack) · right wall (pressure door, pipes) · back wall relay map
    const gL = new THREE.Group(); gL.position.copy(polar(-1.55, HR - 1.35)); gL.rotation.y = -1.55 + Math.PI; lab.add(gL); add(box(5.2, .9, .8, gunD), 0, .45, 0, gL); add(box(5.3, .05, .86, comp), 0, .92, 0, gL);
    const mons = [], atlas = TEX.monitors(); for (let i = 0; i < 3; i++) { const h = box(.92, .62, .08, compD); h.position.set(-1.5 + i * 1.5, 2.6, -.15); mons.push(h); const s = new THREE.Mesh(new THREE.PlaneGeometry(.84, .54), compD); s.position.set(-1.5 + i * 1.5, 2.6, -.105); const uv = s.geometry.attributes.uv; for (let v = 0; v < uv.count; v++) uv.setX(v, (i + uv.getX(v)) / 3); mons.push(s); s.userData.atlas = true; }
    merged(mons.filter(o => !o.userData.atlas), compD, gL); const sm3 = screenMat(atlas); merged(mons.filter(o => o.userData.atlas), sm3, gL); screens.push({ m: sm3, t0: T.power[0] + 2.4, i: 1.1 });
    add(box(.7, 1.9, .7, compD), 3.3, .95, .2, gL); const lg = screenMat(TEX.ledGrid()); add(new THREE.Mesh(new THREE.PlaneGeometry(.3, .6), lg), 3.3, 1.2, .56, gL); leds.push({ m: lg, target: 1.6, t0: T.power[0] + 3.2 });
    const tools = []; for (let i = 0; i < 12; i++) { const o = i % 3 === 0 ? cyl(.04, .045, .16, tit, 10) : i % 3 === 1 ? box(.22, .09, .12, comp) : box(.2, .015, .04, tit); o.position.set(-2.3 + hash(i) * 4.6, .95 + (i % 3 === 0 ? .08 : i % 3 === 1 ? .045 : .008), (hash(i * 3) - .5) * .5); o.rotation.y = hash(i * 7) * TAU; tools.push(o); } merged(tools, tit, gL);
    const gR = new THREE.Group(); gR.position.copy(polar(1.55, HR - 1.0)); gR.rotation.y = 1.55 + Math.PI; lab.add(gR); add(box(2.4, 3.4, .2, gunD), 0, 1.7, 0, gR); add(box(2.0, 3.0, .08, gun), 0, 1.7, .12, gR); add(new THREE.Mesh(new THREE.TorusGeometry(.3, .03, 8, 24), tit), 0, 1.7, .2, gR);
    const pipes = []; for (const x of [-2.2, -1.8, 1.9, 2.3]) { const p = cyl(.08, .08, 5.2, comp, 12); p.position.set(x, 2.6, .2); pipes.push(p); } const hp = cyl(.08, .08, 5.0, comp, 12); hp.rotation.z = Math.PI / 2; hp.position.set(0, 4.4, .2); pipes.push(hp); merged(pipes, comp, gR);
    const wm = screenMat(TEX.wall()); add(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.0), wm), 0, 2.7, -(HR - 1.0)); screens.push({ m: wm, t0: T.power[0] + 3.3, i: .9 }); add(box(3.6, 2.2, .1, gunD), 0, 2.7, -(HR - .94));
    const gl = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(.75, 2)), lineM({})); add(gl, 0, 2.7, -(HR - 1.9)); holos.push({ m: gl.material, target: .28, t0: T.power[0] + 3.5 }); spin.push(gl); }

  /* ── portal frame (we stand in it) + short tunnel + closed door behind us ── */
  { const R = 3.0, cy = 2.77, members = [], strips = [], edge = 2 * R * Math.sin(Math.PI / 8), portal = new THREE.Group(); portal.position.set(0, cy, PZ); lab.add(portal);
    const rivets = new THREE.InstancedMesh(new THREE.CylinderGeometry(.035, .035, .03, 8).rotateX(Math.PI / 2), tit, 40), m = new THREE.Object3D();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8, x = Math.cos(a) * R * Math.cos(Math.PI / 8), y = Math.sin(a) * R * Math.cos(Math.PI / 8); const b = box(edge + .34, .36, .55, gun); b.position.set(x, y, 0); b.rotation.z = a + Math.PI / 2; members.push(b);
      const inner = box(edge - .1, .1, .5, gunD); inner.position.set(x * .9, y * .9, 0); inner.rotation.z = a + Math.PI / 2; members.push(inner);
      if (i === 0 || i === 4 || i === 1 || i === 3) { const s = box(edge * .8, .035, .025, portalE); s.position.set(x * .905, y * .905, .27); s.rotation.z = a + Math.PI / 2; strips.push(s); }
      for (let j = 0; j < 5; j++) { const u = (j - 2) / 5 * edge, ta = a + Math.PI / 2; m.position.set(x + Math.cos(ta) * u, y + Math.sin(ta) * u, .28); m.updateMatrix(); rivets.setMatrixAt(i * 5 + j, m.matrix); } }
    merged(members, gun, portal); const st = merged(strips, portalE, portal); portal.add(rivets); add(new THREE.Mesh(new THREE.PlaneGeometry(2.4, .3), mat({ map: TEX.portal(), roughness: .8, metalness: .4 })), 0, R * Math.cos(Math.PI / 8) - .45, .29, portal); reflect(st);
    const tun = new THREE.Group(); tun.position.set(0, 0, PZ + 1.8); lab.add(tun); add(box(.4, 6.2, 3.6, compD), -2.95, 3.1, 0, tun); add(box(.4, 6.2, 3.6, compD), 2.95, 3.1, 0, tun); add(box(6.3, .4, 3.6, compD), 0, 5.95, 0, tun); add(box(5.6, 5.6, .5, gunD), 0, 2.8, 1.85, tun); }

  /* ── THE WORKBENCH: donut with an open bay at S0 ── */
  const table = new THREE.Group(), glow = new THREE.Group(); lab.add(table); table.add(glow);
  const A0 = SEC / 2, A1 = TAU - SEC / 2;                                                                       // bench spans θ ∈ [A0, A1]; the bay at S0 is open
  add(new THREE.Mesh(arcGeo(PL_R, B_IN - .15, .16, 0, TAU, 96), compD), 0, 0, 0, table);                       // plinth (full ring — the bay has a threshold step)
  add(new THREE.Mesh(new THREE.TorusGeometry(PL_R + .01, .03, 6, 120).rotateX(Math.PI / 2), tit), 0, .17, 0, table);
  const body = add(new THREE.Mesh(arcGeo(B_OUT, B_IN, DK_Y - .19, A0, A1, 96), gunD), 0, .16, 0, table); scanSrc.push(body);
  add(cyl(B_OUT + .006, B_OUT + .006, DK_Y - .19, riserPanel, 72, true, A0, A1 - A0), 0, .16 + (DK_Y - .19) / 2, 0, table);
  add(cyl(B_IN - .006, B_IN - .006, DK_Y - .19, riserPanel, 60, true, A0, A1 - A0), 0, .16 + (DK_Y - .19) / 2, 0, table).material = riserPanel.clone(); table.children.at(-1).material.side = THREE.BackSide;
  const deck = add(new THREE.Mesh(arcGeo(B_OUT + .02, B_IN - .02, .03, A0, A1, 96), deckMat), 0, DK_Y - .03, 0, table); scanSrc.push(deck);
  add(new THREE.Mesh(ringArc(4.35 - .012, 4.35 + .012, A0, A1), chanE), 0, DK_Y + .003, 0, glow); add(new THREE.Mesh(ringArc(3.56 - .012, 3.56 + .012, A0, A1), chanE), 0, DK_Y + .003, 0, glow);
  { const fronts = [], handles = [], ledB = [], bars = [];                                                    // drawer fronts + handles on the outer riser, green LEDs, amber floor bars
    for (let k = 1; k < NSEC; k++) for (let c = -1; c <= 1; c++) for (let r = 0; r < 2; r++) { const th = k * SEC + c * .2, open = hash(k * 9 + c * 3 + r) > .86 ? .06 : 0; const f = box(.86, .28, .025, gunD); f.position.copy(polar(th, B_OUT + .02 + open, .36 + r * .34)); f.rotation.y = th; fronts.push(f);
      const h = cyl(.008, .008, .2, tit, 8); h.rotation.z = Math.PI / 2; h.position.copy(polar(th, B_OUT + .045 + open, .36 + r * .34)); h.rotation.y = th; handles.push(h); }
    for (let i = 0; i < 27; i++) { const th = A0 + (i + .5) / 27 * (A1 - A0), l = box(.035, .035, .012, greenE); l.position.copy(polar(th, B_OUT + .015, .82)); l.rotation.y = th; ledB.push(l); }
    for (let k = 1; k < NSEC; k++) { const b = box(1.1, .03, .02, amberE); b.position.copy(polar(k * SEC, PL_R + .01, .1)); b.rotation.y = k * SEC; bars.push(b); }
    merged(fronts, gunD, table); merged(handles, tit, table); merged(ledB, greenE, glow); reflect(merged(bars, amberE, glow)); }
  for (const s of SECTORS) if (s.k) { const m = screenMat(TEX.label(s.id, s.name)); const l = new THREE.Mesh(new THREE.PlaneGeometry(.7, .13), m); l.position.copy(polar(s.theta, B_OUT - .12, TOP + .002)); l.rotation.set(-Math.PI / 2, 0, 0); l.rotateZ(s.theta); table.add(l); labels.push(m); }
  add(box(3.1, .03, 1.3, mat({ map: TEX.gate(), roughness: .7, metalness: .5 })), 0, .175, 4.0, table);       // threshold plate in the bay
  const bay = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.2, 1.4), new THREE.MeshBasicMaterial({ visible: false })); bay.position.set(0, .8, 4.0); bay.userData.sector = 'S0'; table.add(bay); hits.push(bay);
  // hinged leaves: thin gate leaves on the end caps, swing outward flat against the bench
  const HR_ = B_OUT + .1, leafL = 2 * HR_ * Math.sin(SEC / 2) / 2 - .03, leaves = [1, -1].map(s => { const g = new THREE.Group(); g.position.copy(polar(s * SEC / 2, HR_, .16)); table.add(g);
    add(box(leafL, .74, .07, gun), -s * leafL / 2, .43, 0, g); add(box(leafL - .2, .02, .012, portalE), -s * leafL / 2, .62, .04, g); add(new THREE.Mesh(new THREE.PlaneGeometry(leafL - .3, .24), mat({ map: TEX.gate(), roughness: .8, metalness: .4 })), -s * leafL / 2, .36, .037, g); for (let i = 0; i < 2; i++) add(cyl(.03, .03, .14, tit, 12), 0, .2 + i * .45, .05, g); g.userData.s = s; return g; });

  /* ── sector installations (physical, on the deck) ── */
  const sectorGroup = (k, r, y = TOP) => { const g = new THREE.Group(); g.position.copy(polar(k * SEC, r, y)); g.rotation.y = k * SEC; table.add(g); return g; };
  { const g = sectorGroup(1, 3.95), bp = mat({ map: TEX.blueprint(), roughness: .92, metalness: 0 });          // RS1 · blueprints + clamp lamp
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.9, .62), bp); p.rotation.set(-Math.PI / 2, 0, (hash(i * 3) - .5) * .8); p.position.set((hash(i) - .5) * .7, .002 + i * .0015, (hash(i * 7) - .5) * .4); g.add(p); }
    const arm = add(cyl(.014, .014, .7, tit, 8), -.7, .34, -.35, g); arm.rotation.z = .5; const head = add(new THREE.Mesh(new THREE.ConeGeometry(.09, .13, 14, 1, true), compD), -.38, .62, -.35, g); head.rotation.z = 1.9; const hl = E(0xffd39a); add(cyl(.06, .06, .01, hl, 14), -.33, .6, -.35, g).rotation.z = 1.9; leds.push({ m: hl, target: 3, t0: T.power[0] + 2.4 }); tag(g, 'RS1'); heroGroups.push({ id: 'RS1', group: g }); }
  { const g = sectorGroup(2, 4.0, TOP + .36); add(box(1.1, .72, .6, comp), 0, 0, 0, g); add(box(1.12, .05, .62, gunD), 0, .385, 0, g); add(box(1.12, .05, .62, gunD), 0, -.385, 0, g);   // RS2 · resume fabricator
    const smR = screenMat(TEX.resume()); add(new THREE.Mesh(new THREE.PlaneGeometry(.68, .42), smR), .12, .08, .302, g); screens.push({ m: smR, t0: T.power[0] + 2.9, i: 1.1 });
    add(box(.7, .035, .06, mat({ color: 0x020202, roughness: 1 })), .08, -.22, .305, g); const al = E(0xffb55a); add(box(.64, .012, .01, al), .08, -.18, .306, g); leds.push({ m: al, target: 2.5, t0: T.power[0] + 3.1 }); for (let i = 0; i < 2; i++) add(cyl(.035, .035, .04, tit, 14), -.4, .1 - i * .16, .32, g).rotation.x = Math.PI / 2; tag(g, 'RS2'); heroGroups.push({ id: 'RS2', group: g }); }
  { const g = sectorGroup(3, 3.95); add(cyl(.24, .28, .07, tit, 24), 0, .035, 0, g); const puck = E(0x3fe0ff); add(cyl(.16, .16, .006, puck, 24), 0, .074, 0, g); leds.push({ m: puck, target: 1.8, t0: T.power[0] + 3.4 });   // RS3 · holo-calendar
    const hm = holoMat(TEX.calendar()); const p = add(new THREE.Mesh(new THREE.PlaneGeometry(1.25, .98), hm), 0, .78, 0, g); p.rotation.x = -.12; holos.push({ m: hm, target: .78, t0: T.power[0] + 3.6 }); tag(g, 'RS3'); heroGroups.push({ id: 'RS3', group: g }); }
  for (const k of [4, 5]) { const g = sectorGroup(k, 3.98, TOP + .03); add(box(2.7, .06, 1.02, compD), 0, 0, 0, g); add(new THREE.Mesh(new THREE.PlaneGeometry(2.4, .62), mat({ map: TEX.sealed(), roughness: .85, metalness: .3 })).rotateX(-Math.PI / 2), 0, .031, 0, g);   // RS4/LS4 · sealed
    for (const [x, z] of [[-1.25, -.4], [1.25, -.4], [-1.25, .4], [1.25, .4]]) add(cyl(.035, .035, .015, tit, 10), x, .036, z, g); tag(g, k === 4 ? 'RS4' : 'LS4'); heroGroups.push({ id: k === 4 ? 'RS4' : 'LS4', group: g }); }
  { const g = sectorGroup(6, 3.95); add(cyl(.26, .3, .07, tit, 24), 0, .035, 0, g); const puck = E(0x3fe0ff); add(cyl(.18, .18, .006, puck, 24), 0, .074, 0, g); leds.push({ m: puck, target: 1.8, t0: T.power[0] + 3.3 });   // LS3 · holo-globe
    const globe = new THREE.Group(); globe.position.y = .8; g.add(globe); spin.push(globe); const wf = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(.5, 2)), lineM({})); globe.add(wf); holos.push({ m: wf.material, target: .16, t0: T.power[0] + 3.5 });
    const N = LOW ? 1100 : 2000, pos = new Float32Array(N * 3); let c = 0; for (let i = 0; i < 6000 && c < N; i++) { const u = hash(i * 1.3) * 2 - 1, a = hash(i * 2.7) * TAU, r = Math.sqrt(1 - u * u), x = r * Math.cos(a), z = r * Math.sin(a); if (fbm3(x * 2.2 + 3, u * 2.2, z * 2.2, 3) > .54) { pos.set([x * .505, u * .505, z * .505], c * 3); c++; } }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, c * 3), 3)); const gp = new THREE.Points(gg, new THREE.PointsMaterial({ map: disc, color: 0x7ff0ff, size: .02, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); globe.add(gp); holos.push({ m: gp.material, target: .9, t0: T.power[0] + 3.5 }); tag(g, 'LS3'); heroGroups.push({ id: 'LS3', group: g }); }
  { const g = sectorGroup(7, 3.55); add(box(1.9, 1.15, .05, compD), 0, .62, 0, g); for (const x of [-.85, .85]) add(cyl(.015, .015, 1.24, tit, 8), x, .62, -.04, g);   // LS2 · scratchpad wall
    const nt = TEX.note(), cols = [0xfff07a, 0xffb1c8, 0x9fe8ff, 0xc8ffb0], notes = []; for (let i = 0; i < 16; i++) { const n = new THREE.Mesh(new THREE.PlaneGeometry(.16, .16), mat({ map: nt, color: cols[i % 4], roughness: .95 })); n.position.set((hash(i * 1.9) - .5) * 1.6, .22 + hash(i * 3.3) * .8, .03); n.rotation.z = (hash(i * 5.1) - .5) * .4; notes.push(n); } notes.forEach(n => g.add(n));
    add(box(.34, .035, .26, mat({ color: 0x2a2620, roughness: .9 })), .55, .018, .42, g); add(cyl(.007, .007, .16, tit, 6), .1, .007, .46, g).rotation.set(Math.PI / 2, 0, .6); tag(g, 'LS2'); heroGroups.push({ id: 'LS2', group: g }); }
  { const g = sectorGroup(8, 3.95); add(box(1.1, .04, .26, gunD), 0, .02, 0, g); for (const x of [-.5, .5]) add(cyl(.014, .014, 1.6, tit, 8), x, .82, 0, g);   // LS1 · profile panel
    const pm = holoMat(TEX.profile()); add(new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.4), pm), 0, .85, 0, g); holos.push({ m: pm, target: .8, t0: T.power[0] + 3.2 }); tag(g, 'LS1'); heroGroups.push({ id: 'LS1', group: g }); }
  { const cans = [], boxes = [], bars = []; for (const k of [1, 2, 3, 6, 7, 8]) for (let i = 0; i < 3; i++) { const side = i & 1 ? 1 : -1, th = k * SEC + side * (.29 + hash(k * 13 + i) * .03), r = 3.5 + hash(k * 7 + i * 3) * .7, kind = Math.floor(hash(k + i * 11) * 3);   // clutter at sector edges only — never under an installation
      const o = kind === 0 ? cyl(.04, .045, .14, tit, 12) : kind === 1 ? box(.18, .08, .1, comp) : box(.16, .012, .03, tit); o.position.copy(polar(th, r, TOP + (kind === 0 ? .07 : kind === 1 ? .04 : .006))); o.rotation.y = hash(i * k) * TAU; (kind === 0 ? cans : kind === 1 ? boxes : bars).push(o); }
    merged(cans, tit, table); merged(boxes, comp, table); merged(bars, tit, table); }
  for (const s of SECTORS) if (s.k) { const hb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 1.4), new THREE.MeshBasicMaterial({ visible: false })); hb.position.copy(polar(s.theta, 3.98, DK_Y + .5)); hb.rotation.y = s.theta; hb.userData.sector = s.id; table.add(hb); hits.push(hb); }

  /* ── HOLO-PEDESTAL (low-profile, centre of the inner floor) ── */
  add(cyl(HT_R + .12, HT_R + .16, .06, compD, 64), 0, .03, 0, table);
  const drum = add(cyl(HT_R, HT_R + .04, .42, gunD, 64), 0, .27, 0, table); scanSrc.push(drum);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, v = box(.22, .07, .02, compD); v.position.set(Math.cos(a) * (HT_R + .03), .3, Math.sin(a) * (HT_R + .03)); v.rotation.y = -a + Math.PI / 2; table.add(v); }
  add(new THREE.Mesh(new THREE.TorusGeometry(HT_R + .01, .03, 8, 96).rotateX(Math.PI / 2), tit), 0, .49, 0, table);
  add(cyl(HT_R - .06, HT_R - .02, .08, comp, 64), 0, .53, 0, table);
  add(new THREE.Mesh(new THREE.RingGeometry(HT_R - .5, HT_R - .44, 96).rotateX(-Math.PI / 2), chanE), 0, .573, 0, glow); for (const r of [.68, .95, 1.22]) add(new THREE.Mesh(new THREE.RingGeometry(r - .01, r + .01, 96).rotateX(-Math.PI / 2), ringE), 0, .573, 0, glow);
  add(cyl(.34, .4, .1, tit, 32), 0, .62, 0, table); add(cyl(.2, .2, .03, glass, 32), 0, .685, 0, table); add(cyl(.13, .13, .02, coreE, 24), 0, .71, 0, glow);
  { const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(.02, .02, .012, 8), tit, 16), m = new THREE.Object3D(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; m.position.set(Math.cos(a) * (HT_R - .14), .576, Math.sin(a) * (HT_R - .14)); m.updateMatrix(); im.setMatrixAt(i, m.matrix); } table.add(im); }
  const tableLight = add(new THREE.PointLight(0x3fe0ff, 0, 8, 2), 0, 1.4, 0, table), beamLight = add(new THREE.PointLight(0x3fe0ff, 0, 12, 2), 0, EMIT_Y + 2.2, 0, table), entLight = add(new THREE.PointLight(0x6fe6ff, 0, 9, 2), 0, 2.3, 0, table);

  /* ── suspended gantry, pendants, downspot, cables ── */
  const gantry = new THREE.Group(); lab.add(gantry); const gglow = new THREE.Group(); gantry.add(gglow);
  { const ib = [], hang = [], strips = [], dl = []; for (const [r, y] of [[4.9, 6.3], [3.7, 6.0], [2.5, 5.7]]) for (const [ro, ri, d, yy] of [[r + .16, r - .16, .03, y + .17], [r + .16, r - .16, .03, y - .2], [r + .02, r - .02, .37, y - .17]]) { const m = new THREE.Mesh(arcGeo(ro, ri, d, 0, TAU, 72)); m.position.y = yy; ib.push(m); }
    for (let i = 0; i < 12; i++) { const th = i / 12 * TAU, s = box(2.7, .12, .1, gunD); s.position.copy(polar(th, 3.7, 6.0)); s.rotation.y = th + Math.PI / 2; ib.push(s); const h = cyl(.045, .045, RK - 6.3, gunD, 8); h.position.copy(polar(th + .13, 4.9, (RK + 6.3) / 2)); hang.push(h);
      for (const r of [4.9, 3.7]) { const st = box(.6, .025, .06, gantryE); st.position.copy(polar(th + .1, r, r > 4 ? 6.08 : 5.78)); st.rotation.y = th + Math.PI / 2; strips.push(st); } }
    for (let i = 0; i < 6; i++) { const th = i / 6 * TAU + .3, h = cyl(.1, .2, .22, compD, 16); h.position.copy(polar(th, 3.1, 5.55)); ib.push(h); const d = cyl(.17, .17, .01, downE, 16); d.position.copy(polar(th, 3.1, 5.435)); dl.push(d); }
    const col = cyl(.55, .65, RK - 5.7, gunD, 24); col.position.y = (RK + 5.7) / 2; ib.push(col); for (let i = 0; i < 4; i++) { const b = box(.14, 1.6, .14, gunD); b.position.copy(polar(i / 4 * TAU, .75, 6.9)); b.rotation.y = i / 4 * TAU; ib.push(b); }
    scanSrc.push(merged(ib, gunD, gantry)); merged(hang, gunD, gantry); reflect(merged(strips, gantryE, gglow)); merged(dl, downE, gglow); }
  // three warm pendants over the bench (the document's "overhead industrial pendant lamps"), overhead downspot, hemisphere fill  → 8 dynamic lights total in this scene
  const pendants = [0, 1, 2].map(j => { const th = SEC * (1.5 + 3 * j), g = new THREE.Group(); g.position.copy(polar(th, 3.95, 3.15)); lab.add(g);
    add(cyl(.008, .008, 2.55, compD, 6), 0, 1.3, 0, g); add(cyl(.05, .26, .24, mat({ color: 0x1c1e22, roughness: .55, metalness: .65 }), 20), 0, 0, 0, g); const dm = E(0xffc27a); add(cyl(.22, .22, .012, dm, 20), 0, -.125, 0, g);
    const l = add(new THREE.PointLight(0xffb070, 0, 9.5, 2), 0, -.24, 0, g); return { light: l, disc: dm, t0: T.power[0] + 1.2 + j * .55, target: 13 * LK }; });
  const downSpot = new THREE.SpotLight(0xdff6ff, 0, 11, .78, .55, 1.6); downSpot.position.set(0, 5.4, 0); downSpot.target = table; lab.add(downSpot);
  const hemi = new THREE.HemisphereLight(0x5c7a9a, 0x1c130c, 0); lab.add(hemi);
  const crownWash = !LOW ? (() => {
    const l = new THREE.SpotLight(0x3fa8ff, 0, 16, Math.PI / 2.6, 0.6, 1.5);
    l.position.set(0, RK - 0.6, 0); l.target.position.set(0, 0, 0); lab.add(l, l.target);
    return l;
  })() : null;
  const perimeterBlue = [0, 1].map(i => {
    const th = Math.PI * 0.5 + i * Math.PI;
    const l = new THREE.PointLight(0x2f6fff, 0, 10, 2);
    l.position.copy(polar(th, HR - 1.2, 3.6)); lab.add(l);
    return l;
  });
  // Architectural cool fill: broad, shadowless blue laboratory illumination that rises only after the power-on beat.
  const blueFillA = new THREE.PointLight(0x3d8fc7, 0, 8.5, 2); blueFillA.position.set(-5.8, 3.0, 1.2); lab.add(blueFillA);
  const blueFillB = new THREE.PointLight(0x2e74b5, 0, 8.0, 2); blueFillB.position.set(5.2, 2.6, -1.8); lab.add(blueFillB);
  const blueArch = new THREE.DirectionalLight(0x397ea8, 0); blueArch.position.set(0, 5.5, 2.5); blueArch.target.position.set(0, 0, 0); lab.add(blueArch, blueArch.target);
  const fogA = new THREE.Color(0x03050a), fogB = new THREE.Color(0x0c0906);
  { const tubes = [], clamps = [], up = new THREE.Vector3(0, 1, 0);                                                                                  // sagging ceiling cable runs
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .9, pts = [polar(a, .8, RK - .1), polar(a + .35, 4.2, RK - .9 - hash(i) * .5), polar(a + .7, 8.0, RK - .5), polar(a + .78, HR - .8, WH + .4)], c = new THREE.CatmullRomCurve3(pts);
      for (const [r, off] of [[.035, 0], [.022, .05]]) tubes.push(new THREE.Mesh(new THREE.TubeGeometry(off ? new THREE.CatmullRomCurve3(pts.map((p, j) => p.clone().add(new THREE.Vector3(Math.cos(a + j) * off, -off, Math.sin(a + j) * off)))) : c, LOW ? 28 : 48, r, 6)));
      const L = c.getLength(); for (let s = .3; s < L; s += .8) { const u = s / L, cl = cyl(.07, .07, .05, tit, 8); cl.position.copy(c.getPointAt(u)); cl.quaternion.setFromUnitVectors(up, c.getTangentAt(u)); clamps.push(cl); } }
    merged(tubes, compD); merged(clamps, tit); }

  /* ── beam: emissive core + fresnel sheath + haze cone, one shader ── */
  const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, uniforms: { uT: { value: 0 }, uOpen: { value: 0 }, uA: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN,vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uT,uOpen,uA; varying vec2 vUv; varying vec3 vN,vV; float hh(float n){return fract(sin(n)*43758.5453);}
      void main(){ if(vUv.y>uOpen) discard; float fres=pow(abs(dot(vN,vV)),1.6); float scan=.85+.15*sin(vUv.y*80.-uT*12.)*sin(vUv.y*19.+uT*3.); float fl=.93+.07*hh(floor(uT*40.));
        float tip=1.-smoothstep(0.,.12,uOpen-vUv.y); float a=(fres*scan*fl*(1.-vUv.y*.35)+tip*fres*.6)*uA; gl_FragColor=vec4(vec3(.35,.9,1.)*a,a); }` });
  const beamMats = [beamMat, beamMat.clone(), beamMat.clone()]; beamMats[1].uniforms.uA.value = .26; beamMats[2].uniforms.uA.value = .06;
  const beamSeg = LOW ? 14 : 24;
  const beams = [[.04, .055], [.11, .28], [1.3, .1]].map(([a, b], i) => { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(a, b, BEAM_H, beamSeg, 1, true), beamMats[i]), 0, EMIT_Y + BEAM_H / 2, 0, glow); m.visible = false; m.renderOrder = 6; return m; });

  /* ── room scan: sweep front + world-space triplanar grid drawn on clones of the real surfaces (visible only while scanning) ── */
  const scanMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, uniforms: { uR: { value: 0 }, uA: { value: 0 }, uT: { value: 0 } },
    vertexShader: `varying vec3 vW,vN; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uR,uA,uT; varying vec3 vW,vN; float grid(vec2 p){ vec2 q=abs(fract(p)-.5); return 1.-smoothstep(0.,.06,min(q.x,q.y)); }
      void main(){ float d=length(vW-vec3(0.,${EMIT_Y},0.)); float inside=1.-smoothstep(uR-.2,uR,d); float front=smoothstep(uR-.5,uR,d)*(1.-smoothstep(uR,uR+.06,d));
        vec3 a=abs(vN); a/=(a.x+a.y+a.z+1e-4); float g=a.y*grid(vW.xz*2.)+a.z*grid(vW.xy*2.)+a.x*grid(vW.yz*2.); float G=a.y*grid(vW.xz*.5)+a.z*grid(vW.xy*.5)+a.x*grid(vW.yz*.5);
        float pulse=.8+.2*sin(d*4.-uT*4.); float al=((g*.18+G*.5)*inside*pulse+front*1.4)*uA*(1.-smoothstep(12.,17.,d)); gl_FragColor=vec4(vec3(.3,.88,1.)*al,al); }` });
  const scanMeshes = scanSrc.filter(Boolean).map(src => { src.updateWorldMatrix(true, false); const m = new THREE.Mesh(src.geometry, scanMat); m.matrixAutoUpdate = false; m.matrix.copy(src.matrixWorld); m.visible = false; m.renderOrder = 5; lab.add(m); return m; });

  /* ── THE ENTITY (document design): wireframe cube + nested octahedron/icosahedron, core, four plasma ribbons, energy haze, anchor cone ── */
  const ent = new THREE.Group(); ent.visible = false; ent.scale.setScalar(0); glow.add(ent);
  const wire = g => new THREE.LineSegments(g, lineM({}));
  const shellsN = LOW ? 2 : 3;
  const allShells = [wire(new THREE.EdgesGeometry(new THREE.BoxGeometry(.72, .72, .72))), wire(new THREE.WireframeGeometry(new THREE.OctahedronGeometry(.5, 0))), wire(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.02, 1)))];
  const shells = allShells.slice(0, shellsN);
  [[.18, .27, .09], [-.35, .2, .42], [.06, -.12, .08]].slice(0, shellsN).forEach((w, i) => { shells[i].userData.w = w; ent.add(shells[i]); });
  const entCore = add(new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), E(0xb8f6ff)), 0, 0, 0, ent);
  const ribMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, uniforms: { uT: { value: 0 }, uA: { value: 0 }, uPh: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT,uA,uPh; varying vec2 vUv; void main(){ float s=fract(vUv.x-uT*.3-uPh); float band=smoothstep(0.,.38,s)*(1.-smoothstep(.38,.46,s)); float a=(band*1.3+.12)*uA; gl_FragColor=vec4(vec3(.4,.95,1.)*a,a); }` });
  const ribbonCount = LOW ? 3 : 4;
  const ribbons = [0, 1, 2, 3].slice(0, ribbonCount).map(k => { const pts = [], [A, B, C] = [[1, 2, 3], [2, 1, 3], [3, 2, 1], [1, 3, 2]][k], f = .62 + k * .08;
    for (let i = 0; i < 64; i++) { const u = i / 64 * TAU; pts.push(new THREE.Vector3(Math.sin(A * u + k) * f, Math.sin(B * u) * f * .7, Math.cos(C * u + k * .7) * f)); }
    const m = ribMat.clone(); m.uniforms.uPh.value = k * .25; const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), LOW ? 96 : 160, .012, 5, true), m); ent.add(tube); return tube; });
  const haze = (() => { const n = LOW ? 18 : 28, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = hash(i * 3.3) * TAU, r = .35 + hash(i * 5.9) * .8; p.set([Math.cos(a) * r, (hash(i * 7.1) - .5) * 1.5, Math.sin(a) * r], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pt = new THREE.Points(g, new THREE.PointsMaterial({ map: disc, color: 0x4fd8ff, size: LOW ? .5 : .65, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); ent.add(pt); return pt; })();
  const anchorMat = beamMat.clone(); anchorMat.uniforms.uA.value = 0; const anchor = add(new THREE.Mesh(new THREE.CylinderGeometry(.02, .13, 1, 16, 1, true), anchorMat), 0, EMIT_Y, 0, glow); anchor.visible = false; anchor.renderOrder = 6;
  reflect(glow);                                                                                                   // every glowing thing on/over the pedestal is mirrored under the wet floor
  const greetC = document.createElement('canvas'); greetC.width = 512; greetC.height = 160; const greetTex = new THREE.CanvasTexture(greetC); greetTex.colorSpace = THREE.SRGBColorSpace;
  const greetLines = [`SIGNATURE ${idHash.slice(0, 8).toUpperCase()} RECOGNISED`, 'ACCESS TIER · VISITOR', 'WELCOME TO VAULT-01. I AM THE RESIDENT SYSTEM.'], greetTotal = greetLines.join('').length; let greetShown = -1;
  const greetDraw = n => { if (n === greetShown) return; greetShown = n; const g = greetC.getContext('2d'); g.clearRect(0, 0, 512, 160); g.fillStyle = '#9ff3ff'; let left = n; greetLines.forEach((l, i) => { mono(g, i === 2 ? 15 : 18, i ? '' : 'bold'); g.fillText(l.slice(0, Math.max(0, left)) + (left > 0 && left < l.length ? '▮' : ''), 14, 40 + i * 42); left -= l.length; }); greetTex.needsUpdate = true; };
  const greetM = holoMat(greetTex), greet = add(new THREE.Mesh(new THREE.PlaneGeometry(2.1, .66), greetM), 0, 3.6, 0); greet.visible = false;

  /* ── AI CONSOLE (inside S0): holo panel over the pedestal rim; api.ai.onAsk is the backend hook ── */
  const aiC = document.createElement('canvas'); aiC.width = 640; aiC.height = 320; const aiTex = new THREE.CanvasTexture(aiC); aiTex.colorSpace = THREE.SRGBColorSpace;
  const aiM = holoMat(aiTex), aiPanel = add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, .75), aiM), 0, 1.42, 1.15); aiPanel.visible = false;
  const AI = { lines: [], input: '', reveal: 0, dirty: true, busy: false, onAsk: null };
  const aiDraw = () => { AI.dirty = false; const g = aiC.getContext('2d'), W = aiC.width, H = aiC.height; g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(4,20,30,.78)'; g.fillRect(0, 0, W, H); g.strokeStyle = '#39d6ff'; g.lineWidth = 2; g.strokeRect(2, 2, W - 4, H - 4);
    g.fillStyle = '#9ff3ff'; mono(g, 15); g.fillText('RESIDENT SYSTEM · CONSOLE', 16, 26); mono(g, 14, ''); const rows = [];
    AI.lines.forEach((l, i) => { const txt = i === AI.lines.length - 1 ? l.slice(0, Math.ceil(AI.reveal)) : l, mine = l[0] === '>'; let line = ''; for (const wd of txt.split(' ')) { const tr = line ? line + ' ' + wd : wd; if (line && g.measureText(tr).width > W - 32) { rows.push([line, mine]); line = wd; } else line = tr; } rows.push([line, mine]); });
    rows.slice(-9).forEach(([r, mine], i) => { g.fillStyle = mine ? '#ffb15c' : '#7fe6ff'; g.fillText(r, 16, 52 + i * 22); });
    g.fillStyle = '#3f7a88'; g.fillRect(16, H - 40, W - 32, 1); g.fillStyle = AI.busy ? '#3f7a88' : '#e8ffff'; g.fillText((AI.busy ? '… ' : '> ') + AI.input + (Math.floor(S.t * 2) % 2 ? '▮' : ' '), 16, H - 16); aiTex.needsUpdate = true; };
  const say = text => { AI.lines.push(String(text ?? '…')); if (AI.lines.length > 40) AI.lines.shift(); AI.reveal = 0; AI.dirty = true; sfx.blip(1400, .04, .02); };
  const ask = async q => { q = String(q ?? '').trim(); if (!q || AI.busy) return; AI.lines.push('> ' + q); AI.input = ''; AI.busy = true; AI.dirty = true; dispatchEvent(new CustomEvent('lab:ai:ask', { detail: { q } }));
    let r; try { r = AI.onAsk ? await AI.onAsk(q) : 'RESIDENT MODEL LINK NOT YET ESTABLISHED. CONSOLE IS LIVE; THE BACKEND ARRIVES WITH PHASE 1.'; } catch { r = 'LINK FAULT. TRY AGAIN.'; } AI.busy = false; say(r); };

  /* ── particles: first sparks (tiny cyan) + ambient dust (warm, near-invisible). Soft discs only. ── */
  const points = (n, fill, color, size, max) => { const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) fill(i, pos); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ map: disc, color, size, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); p.userData.max = max; lab.add(p); return p; };
  const NSP = LOW ? 24 : 40, sseed = new Float32Array(NSP * 3); for (let i = 0; i < NSP; i++) { sseed[i*3] = hash(i * 1.7); sseed[i*3+1] = hash(i * 2.9) * TAU; sseed[i*3+2] = .05 + hash(i * 4.3) * .3; }
  const sparks = points(NSP, (i, p) => p.set([0, EMIT_Y, 0], i * 3), 0x8ff2ff, .018, .55);
  const dust = points(LOW ? 220 : 420, (i, p) => { const a = hash(i * 3.1) * TAU, r = Math.sqrt(hash(i * 5.3)) * 9; p.set([Math.cos(a) * r, .3 + hash(i * 7.7) * 5.5, Math.sin(a) * r], i * 3); }, 0xffb37a, .03, .06);

  /* ── gate leaves: re-seat hinges .012 rad inside the bay so the open leaf lies 5 cm in front of the end cap, not inside it ── */
  const OPEN_A = Math.PI / 2 - SEC / 2; leaves.forEach(L => L.position.copy(polar(L.userData.s * (SEC / 2 - .012), HR_, .16)));

  /* ── blackout we own from vault:entered; camera fit; input (movement / look / raycast / console kept separate) ── */
  const bokeh = new BokehPass(lab, cam, { focus: 6, aperture: LOW ? 0.00002 : 0.000035, maxblur: LOW ? 0.0045 : 0.006 }); bokeh.enabled = false; if (bokeh) composer.insertPass(bokeh, 1);
  const sectorGroups = {}; heroGroups.forEach(h => { sectorGroups[h.id] = h.group; });
  const FOCUS_CFG = {
    RS1: { dolly: (g)=>[g.localToWorld(new THREE.Vector3(0,.55,.9)), g.localToWorld(new THREE.Vector3(0,.15,0))], panel: 'blueprint' },
    RS2: { dolly: (g)=>[g.localToWorld(new THREE.Vector3(.25,.5,.8)),  g.localToWorld(new THREE.Vector3(.1,.15,0))], panel: 'resume' },
    RS3: { dolly: (g)=>[g.localToWorld(new THREE.Vector3(0,.9,.6)),   g.localToWorld(new THREE.Vector3(0,.7,0))],  panel: 'calendar' },
    LS3: { dolly: (g)=>[g.localToWorld(new THREE.Vector3(0,.95,.65)), g.localToWorld(new THREE.Vector3(0,.85,0))], panel: 'globe' },
    LS2: { dolly: (g)=>[g.localToWorld(new THREE.Vector3(0,.75,.55)),g.localToWorld(new THREE.Vector3(0,.5,0))],  panel: 'notes' },
    LS1: { dolly: (g)=>[g.localToWorld(new THREE.Vector3(0,.9,.7)),  g.localToWorld(new THREE.Vector3(0,.85,0))], panel: 'profile' },
  };
  const FOCUS = { id: null, t: 0, from: new THREE.Vector3(), fromQ: new THREE.Quaternion(), toPos: new THREE.Vector3(), toLook: new THREE.Vector3(), active: false };

  let activeBlobUrls = [];
  const overlayHost = document.createElement('div'); overlayHost.id = 'labFocus';
  Object.assign(overlayHost.style, { position:'fixed', inset:0, display:'grid', placeItems:'center', pointerEvents:'none', opacity:0, transition:'opacity .35s', zIndex: 9500 });
  document.body.appendChild(overlayHost);

  if (!document.getElementById('labFocusStyles')) {
    const st = document.createElement('style'); st.id = 'labFocusStyles';
    st.textContent = `
      #labFocus .holo-card{ width:min(90vw,var(--w,600px)); background:rgba(4,20,30,.72); border:1px solid #39d6ff; border-radius:6px;
        box-shadow:0 0 40px rgba(63,224,255,.25), inset 0 0 30px rgba(63,224,255,.08); backdrop-filter: blur(6px) saturate(1.3);
        color:#9ff3ff; font-family:ui-monospace,Menlo,Consolas,monospace; padding:16px; box-sizing:border-box; }
      #labFocus header{ display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #2b7f96; padding-bottom:8px; margin-bottom:10px; letter-spacing:.05em; font-weight:bold; }
      #labFocus header button.x{ background:transparent; border:none; color:#39d6ff; font-size:18px; cursor:pointer; padding:2px 8px; }
      #labFocus header button.x:hover{ color:#fff; }
      #labFocus textarea{ width:100%; height:180px; background:#031018; color:#e8ffff; border:1px solid #2b7f96; padding:10px; resize:vertical; font-family:inherit; box-sizing:border-box; }
      #labFocus button{ background:#0c2530; color:#9ff3ff; border:1px solid #39d6ff; padding:6px 14px; cursor:pointer; font-family:inherit; }
      #labFocus button:hover{ background:#133c4e; color:#fff; }
      #labFocus footer{ margin-top:12px; display:flex; justify-content:flex-end; }
      #labFocus .check-list{ display:flex; flex-direction:column; gap:8px; margin:14px 0; }
      #labFocus .check-item{ display:flex; align-items:center; gap:8px; color:#cbf5ff; cursor:pointer; }
    `;
    document.head.appendChild(st);
  }

  const PANELS = {
    globe: () => `<div class="holo-card" style="--w:720px">
        <header><span>LS3 · HOLO-GLOBE</span><button class="x" data-close>✕</button></header>
        <div id="globeMeta" style="margin-bottom:12px;color:#39d6ff">RESOLVING GEO-IP…</div>
        <div id="globeAlbum" class="thumb-grid">CONNECTIVITY LIVE · NO ACTIVE TARGETS</div></div>`,
    notes: () => `<div class="holo-card" style="--w:640px">
        <header><span>LS2 · SCRATCHPAD</span><button class="x" data-close>✕</button></header>
        <textarea id="noteArea" maxlength="2000" placeholder="Leave a note for the owner…"></textarea>
        <footer><button id="noteSave">COMMIT TO LOG</button></footer></div>`,
    resume: () => `<div class="holo-card" style="--w:560px">
        <header><span>RS2 · RESUME FABRICATOR</span><button class="x" data-close>✕</button></header>
        <div id="resumeFields" class="check-list">
          <label class="check-item"><input type="checkbox" checked disabled> CORE COMPETENCIES & ARCHITECTURE</label>
          <label class="check-item"><input type="checkbox" checked disabled> GRAPHICS & SPATIAL ENGINE REVS</label>
          <label class="check-item"><input type="checkbox" checked disabled> RESEARCH CITATIONS & PUBLICATIONS</label>
        </div>
        <footer><button id="resumeBuild">▶ BUILD TAILORED PDF</button></footer></div>`,
    calendar: () => `<div class="holo-card" style="--w:480px">
        <header><span>RS3 · SCHEDULE</span><button class="x" data-close>✕</button></header>
        <div id="calGrid" style="line-height:1.6;color:#cbf5ff">CALENDAR UPLINK: SYNCHRONISED<br>AVAILABLE: WEEKDAYS 18:00 - 22:00 UTC<br>STATUS: ACTIVE</div></div>`,
    blueprint:() => `<div class="holo-card" style="--w:640px">
        <header><span>RS1 · PROJECT INDEX</span><button class="x" data-close>✕</button></header>
        <div id="repoList" style="line-height:1.6;color:#cbf5ff">GITHUB REPOSITORY SYNC ACTIVE<br>CAVE ARCHITECTURE · REV C<br>SHADERS & GEOMETRY · ZERO RASTER ASSETS</div></div>`,
    profile:  () => `<div class="holo-card" style="--w:560px">
        <header><span>LS1 · PROFILE</span><button class="x" data-close>✕</button></header>
        <div id="profileTabs" style="line-height:1.6;color:#cbf5ff">OPERATIVE: PRIYANSH GADIA<br>SECURITY CLEARANCE: LEVEL 5<br>SYSTEMS: GRAPHICS / FULL-STACK / COMPILERS</div></div>`,
  };

  const api2 = {
    globe:   { onLocate: null, onAlbum: null },
    notes:   { onLoad: null, onSave: null },
    resume:  { onFields: null, onBuild: null },
    calendar:{ onLoad: null },
    blueprint:{ onRepos: null },
    profile: { onLinks: null, onBlog: null },
  };

  function wireOverlay(kind, id) {
    if (kind === 'notes') {
      const ta = overlayHost.querySelector('#noteArea');
      (api2.notes.onLoad ? Promise.resolve(api2.notes.onLoad()) : Promise.resolve(localStorage.getItem('vault_note') || '')).then(v => { if (ta) ta.value = v ?? ''; });
      const btn = overlayHost.querySelector('#noteSave');
      if (btn) btn.onclick = () => {
        if (api2.notes.onSave) api2.notes.onSave(ta.value);
        else localStorage.setItem('vault_note', ta.value);
        btn.textContent = 'COMMITTED ✓';
        setTimeout(() => { if (btn) btn.textContent = 'COMMIT TO LOG'; }, 1500);
      };
    }
    if (kind === 'globe') {
      (api2.globe.onLocate ? Promise.resolve(api2.globe.onLocate()) : Promise.resolve(null)).then(loc => {
        const el = overlayHost.querySelector('#globeMeta');
        if (el) el.textContent = loc ? `${loc.city} · ${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}` : 'LOCATION TELEMETRY: RELAY PASSIVE';
      });
    }
    if (kind === 'resume') {
      const btn = overlayHost.querySelector('#resumeBuild');
      if (btn) btn.onclick = async () => {
        btn.textContent = 'FABRICATING…';
        if (api2.resume.onBuild) {
          const url = await api2.resume.onBuild();
          if (url) activeBlobUrls.push(url);
        }
        setTimeout(() => { if (btn) btn.textContent = 'PDF READY'; }, 1000);
      };
    }
  }

  function openOverlay(kind, id) {
    if (!PANELS[kind]) return;
    overlayHost.innerHTML = PANELS[kind]();
    overlayHost.style.pointerEvents = 'auto';
    overlayHost.style.opacity = '1';
    const closeBtn = overlayHost.querySelector('[data-close]');
    if (closeBtn) closeBtn.onclick = unfocusSector;
    wireOverlay(kind, id);
  }

  function closeOverlay() {
    overlayHost.style.opacity = '0';
    overlayHost.style.pointerEvents = 'none';
    setTimeout(() => {
      overlayHost.innerHTML = '';
      activeBlobUrls.forEach(url => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      activeBlobUrls = [];
    }, 350);
  }

  function focusSector(id) {
    const cfg = FOCUS_CFG[id]; if (!cfg || FOCUS.active || !S.ready) return;
    const g = sectorGroups[id]; if (!g) return;
    g.updateWorldMatrix(true, false);
    const [pos, look] = cfg.dolly(g);
    FOCUS.id = id; FOCUS.t = 0; FOCUS.active = true; S.navLocked = true;
    FOCUS.from.copy(cam.position); FOCUS.fromQ.copy(cam.quaternion);
    FOCUS.toPos.copy(pos); FOCUS.toLook.copy(look);
    if (bokeh) {
      bokeh.enabled = true;
      bokeh.uniforms.focus.value = cam.position.distanceTo(look);
      bokeh.uniforms.aperture.value = LOW ? 0.00004 : 0.00008;
    }
    openOverlay(cfg.panel, id);
    dispatchEvent(new CustomEvent('lab:focus', { detail: { id } }));
    sfx.relay();
  }

  function unfocusSector() {
    if (!FOCUS.active) return;
    const prevId = FOCUS.id;
    FOCUS.active = false; S.navLocked = false;
    closeOverlay();
    dispatchEvent(new CustomEvent('lab:unfocus', { detail: { id: prevId } }));
    FOCUS.id = null;
    sfx.servo(.6, false);
  }

  window.__lab_backend = api2;

  const fade = document.createElement('div'); fade.id = 'labFade'; Object.assign(fade.style, { position: 'fixed', inset: 0, background: '#000', opacity: 0, pointerEvents: 'none', zIndex: 9990 }); document.body.appendChild(fade);
  const fit = () => { cam.aspect = innerWidth / innerHeight; cam.fov = clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(78) / 2) / cam.aspect)), 50, 100); cam.updateProjectionMatrix(); }; fit(); addEventListener('resize', fit);
  const NAV = { wheel: .0075, drag: .004, damp: 5, max: 2 }, canMove = () => S.active && S.t >= T.power[0] && !S.inside && !S.wantIn && !FOCUS.active && !S.navLocked, canLook = () => S.active && S.t > 1 && !FOCUS.active;
  const nudge = v => { S.vel = clamp(S.vel + v, -NAV.max, NAV.max); S.lastInput = S.t; S.magnet = null; };
  function goTo(id) { const s = SECTORS.find(x => x.id === id); if (!s) return; let d = (s.theta - S.theta) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; S.magnet = S.theta + d; S.lastInput = -9; }
  function enter() { if (!S.ready || S.inside || S.wantIn) return; S.wantIn = true; S.vel = 0; goTo('S0'); }
  function exit() { if (!S.inside && !S.wantIn) return; S.inside = 0; S.wantIn = false; S.lastInput = -9; sfx.servo(1.0, false); dispatchEvent(new CustomEvent('lab:ai:exit')); }
  addEventListener('wheel', e => { if (!S.active || S.t < T.power[0] || FOCUS.active || S.navLocked) return; e.preventDefault(); if (S.inside || S.wantIn) { exit(); return; } const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY; nudge(clamp(d, -140, 140) * NAV.wheel); }, { passive: false });
  addEventListener('mousemove', e => { if (!canLook()) return; S.look.tx = -((e.clientX / innerWidth) * 2 - 1) * .32; S.look.ty = -((e.clientY / innerHeight) * 2 - 1) * .18; });
  let touch = null; addEventListener('touchstart', e => { if (S.active) { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY, vy: 0, moved: 0 }; } }, { passive: true });
  addEventListener('touchmove', e => { if (!touch || !S.active) return; const t = e.touches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y; touch.moved += Math.abs(dx) + Math.abs(dy); if (canMove()) { S.theta += dy * NAV.drag; touch.vy = dy; S.lastInput = S.t; S.magnet = null; } if (canLook()) S.look.tx = clamp(S.look.tx - dx * .0025, -.5, .5); touch.x = t.clientX; touch.y = t.clientY; e.preventDefault(); }, { passive: false });
  addEventListener('touchend', () => { if (touch && canMove()) nudge(clamp(touch.vy * .22, -1.4, 1.4)); if (touch && touch.moved > 40 && (S.inside || S.wantIn)) exit(); touch = null; }, { passive: true });
  addEventListener('keydown', e => { if (!S.active) return; if (FOCUS.active && (e.key === 'Escape' || e.key === 'Backspace')) { unfocusSector(); e.preventDefault(); return; }
    if (S.inside) { if (e.key === 'Escape') exit(); else if (e.key === 'Enter') ask(AI.input); else if (e.key === 'Backspace') AI.input = AI.input.slice(0, -1); else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && AI.input.length < 140) AI.input += e.key; else return; AI.dirty = true; e.preventDefault(); return; }
    if (!canMove()) return; if (e.key === 'Enter' && S.sector === 0) { enter(); return; } if (['ArrowRight', 'd', 'ArrowDown', 's'].includes(e.key)) nudge(.65); else if (['ArrowLeft', 'a', 'ArrowUp', 'w'].includes(e.key)) nudge(-.65); else if (/^[1-9]$/.test(e.key)) goTo(SECTORS[+e.key - 1].id); });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let lastHover = 0; const pick = (x, y) => { ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); const h = ray.intersectObjects(hits, false)[0]; return h ? h.object.userData.sector : null; };
  addEventListener('pointermove', e => { if (!S.ready || S.inside || e.pointerType === 'touch') return; const now = performance.now(); if (now - lastHover < 90) return; lastHover = now; S.hover = pick(e.clientX, e.clientY); renderer.domElement.style.cursor = S.hover ? 'pointer' : ''; });
  addEventListener('click', e => { if (!S.ready) return; if (FOCUS.active) return; if (S.inside || S.wantIn) { exit(); return; } const id = pick(e.clientX, e.clientY); if (!id) return; sfx.blip(1320, .07); dispatchEvent(new CustomEvent('lab:interact', { detail: { id } })); if (id === 'S0') enter(); else if (FOCUS_CFG[id]) focusSector(id); else goTo(id); });

  /* ── update: every visual is a pure function of t (+ the visitor's θ and inside-state) ── */
  const fA = new THREE.Vector3(), fB = new THREE.Vector3(), tmp = new THREE.Vector3();
  function update(dt) {
    if (!S.active) return; dt = Math.min(dt, .05); S.t += dt; const t = S.t;
    fade.style.opacity = String(1 - sm(ph(t, T.fade)));
    // inside-state (S0 entrance)
    if (S.wantIn && S.magnet === null && Math.abs(S.theta - Math.round(S.theta / TAU) * TAU) < .02) { S.wantIn = false; S.inside = 1; sfx.servo(1.2, true); if (!AI.lines.length) say('RESIDENT SYSTEM ONLINE. STATE YOUR QUERY.'); dispatchEvent(new CustomEvent('lab:ai:enter')); }
    const pIn = S.insideT; S.insideT += (S.inside - S.insideT) * (1 - Math.exp(-dt * 1.7)); const w = sm(S.insideT), inSpd = Math.abs(S.insideT - pIn) / Math.max(dt, 1e-3) * (CAM_R - IN_R);
    // first sparks
    { const a = sm(ph(t, T.spark)) * (1 - ph(t, T.beam)); sparks.material.opacity = a * sparks.userData.max; sparks.visible = a > .001;
      if (sparks.visible) { const p = sparks.geometry.attributes.position; for (let i = 0; i < NSP; i++) { const life = fract(sseed[i*3] + t * .14), ang = sseed[i*3+1] + t * .5, r = sseed[i*3+2] * (1 - life * .4); p.setXYZ(i, Math.cos(ang) * r, EMIT_Y + life * 1.1, Math.sin(ang) * r); } p.needsUpdate = true; }
      cue('sp0', t > T.spark[0], sfx.spark); cue('sp1', t > T.spark[0] + .8, sfx.spark); cue('sp2', t > T.spark[0] + 1.5, () => { sfx.spark(); sfx.spark(); }); }
    // pedestal wake
    { const a = sm(ph(t, T.table)); ringE.emissiveIntensity = a * 2.6; chanE.emissiveIntensity = ph(t, [T.table[0] + .5, T.table[1] + .3]) * 2.2; coreE.emissiveIntensity = ph(t, [T.table[1] - .3, T.beam[0] + .3]) * 8; tableLight.intensity = (.15 + a * 2.2) * LK;
      cue('hum', t > T.table[0], () => sfx.hum(.12, 1.8)); cue('rl1', t > T.table[0] + .5, sfx.relay); }
    // beam
    { const open = eo(ph(t, T.beam)) * (1 - sm(ph(t, T.retract))); beams.forEach((b, i) => { b.visible = open > .002; beamMats[i].uniforms.uOpen.value = open; beamMats[i].uniforms.uT.value = t; }); beamLight.intensity = open * 7 * LK; beamLight.position.y = EMIT_Y + .4 + open * 2.2;
      cue('beam', t > T.beam[0], () => { sfx.beam(); sfx.hum(.2, .4); }); }
    // room scan → reabsorbed
    { const R = eo(ph(t, T.map)) * (HR + 6) * (1 - ei(ph(t, T.retract))), f = Math.min(1, ph(t, T.map) * 5) * (1 - ph(t, [T.retract[1] - .3, T.retract[1]])); scanMat.uniforms.uR.value = R; scanMat.uniforms.uA.value = f; scanMat.uniforms.uT.value = t; scanMeshes.forEach(m => m.visible = f > .002);
      cue('sweep', t > T.map[0], () => sfx.sweep(T.map[1] - T.map[0])); cue('retract', t > T.retract[0], () => sfx.servo(1.4, false)); }
    // entity: forms for the greeting, collapses, then re-forms at T.idle as the resident presence (attentive when the visitor is inside)
    let entY = EMIT_Y;
    { const F = sm(ph(t, T.entity)) * (1 - ei(ph(t, T.collapse))), idle = sm(ph(t, T.idle)) * (.72 + .28 * w), Fe = Math.max(F, idle), gp = ph(t, T.greet), att = Math.max(gp, w), pulse = 1 + .28 * Math.sin(t * 6.5) * att, j = F > 0 && F < 1 ? 1 + .3 * (1 - F) * Math.sin(t * 23) : 1;
      S.entF = Fe; ent.visible = Fe > .002; entY = EMIT_Y + .35 + Fe * 1.55; ent.position.y = entY; ent.scale.setScalar(Fe * j); ent.rotation.y = t * .14;
      if (ent.visible) { const spd = 1 + att * .6; shells.forEach((s, i) => { s.rotation.x += s.userData.w[0] * dt * spd; s.rotation.y += s.userData.w[1] * dt * spd; s.rotation.z += s.userData.w[2] * dt * spd; s.material.opacity = Fe * (i ? .6 : .95); });
        entCore.material.emissiveIntensity = 9 * pulse; ribbons.forEach((r, k) => { const u = r.material.uniforms; u.uT.value = t * (1 + att * .5); u.uA.value = .55 + .45 * att; r.rotation.y = t * (.25 + k * .08) * (k & 1 ? -1 : 1); r.rotation.x = Math.sin(t * .5 + k * 1.7) * .4; }); haze.material.opacity = .14 * Fe; haze.rotation.y = -t * .1; }
      entLight.position.y = entY; entLight.intensity = Fe * 4.2 * LK * pulse;
      const anc = F < .01 ? idle : 0; anchor.visible = anc > .002; if (anchor.visible) { const h = Math.max(.05, entY - .5 * Fe - EMIT_Y); anchor.scale.y = h; anchor.position.y = EMIT_Y + h / 2; anchorMat.uniforms.uOpen.value = 1; anchorMat.uniforms.uT.value = t; anchorMat.uniforms.uA.value = .45 * anc; }
      cue('e0', t > T.entity[0], () => { sfx.hum(.3, 1.6); sfx.blip(520, .5, .05); }); cue('e1', t > T.entity[0] + .8, () => sfx.blip(780, .4, .045)); cue('e2', t > T.entity[0] + 1.5, () => sfx.blip(1040, .35, .04));
      cue('col', t > T.collapse[0], () => { sfx.servo(1.5, false); sfx.hum(.15, 1.6); }); cue('idle', t > T.idle[0], () => { sfx.hum(.2, 1.5); sfx.blip(660, .4, .04); }); }
    // greeting (typed, faces the visitor)
    { const gp = ph(t, T.greet), vis = sm(ph(t, [T.greet[0], T.greet[0] + .5])) * (1 - sm(ph(t, [T.collapse[0] - .3, T.collapse[0] + .4]))); greetM.opacity = vis * .95; greet.visible = vis > .002;
      if (greet.visible) { const shown = Math.floor(eo(gp) * greetTotal); greetDraw(shown); greet.position.y = entY + 1.35 + Math.sin(t * 1.3) * .02; greet.lookAt(cam.position); if (shown !== S.gt && gp < 1 && shown % 3 === 0) { S.gt = shown; sfx.blip(1700 + hash(shown) * 500, .03, .012); } } }
    // power-on: thud → sconces → portal → amber bars → gantry → pendants (staggered, flickering) → downspot; exposure up, fog thins and warms, env attached
    { const P = ph(t, T.power), Ps = sm(P); cue('power', t > T.power[0], () => { sfx.thud(); sfx.hum(.22, 3); lab.environment = env ?? null; });
      sconceE.emissiveIntensity = ph(t, [T.power[0] + .3, T.power[0] + 1.9]) * 3.4; portalE.emissiveIntensity = 0.35 + ph(t, [T.power[0] + 1.6, T.power[0] + 2.1]) * 2.65; amberE.emissiveIntensity = ph(t, [T.power[0] + 1.9, T.power[0] + 2.4]) * 2.6;
      const g = ph(t, [T.power[0] + 2.2, T.power[0] + 2.8]); gantryE.emissiveIntensity = g * 3.4; downE.emissiveIntensity = g * 4; downSpot.intensity = sm(ph(t, [T.power[0] + 2.6, T.power[0] + 3.4])) * (legacy ? 1.6 : 60); cue('gan', t > T.power[0] + 2.2, () => { sfx.relay(); sfx.relay(); });
      for (const L of pendants) { const a = ph(t, [L.t0, L.t0 + .4]), fl = a > 0 && a < 1 ? (hash(Math.floor(t * 47) + L.t0) > .35 ? 1 : .15) : 1; L.light.intensity = a * fl * L.target; L.disc.emissiveIntensity = a * fl * 3.4; cue('pd' + L.t0, t > L.t0, sfx.relay); }
      for (const s of screens) s.m.emissiveIntensity = ph(t, [s.t0, s.t0 + .3]) * s.i * (1 + .05 * Math.sin(t * 30 + s.t0)); for (const l of leds) l.m.emissiveIntensity = ph(t, [l.t0, l.t0 + .2]) * l.target; for (const h of holos) h.m.opacity = sm(ph(t, [h.t0, h.t0 + .8])) * h.target * (.93 + .07 * Math.sin(t * 9 + h.t0));
      labels.forEach((m, k) => m.emissiveIntensity = ph(t, [T.power[0] + 1.6 + k * .12, T.power[0] + 1.9 + k * .12]) * 1.3); greenE.emissiveIntensity = ph(t, [T.power[0] + 3.0, T.power[0] + 3.3]) * 2.2;
      hemi.intensity = (0.16 + Ps * .79) * LKh; blueFillA.intensity = Ps * (LOW ? 1.25 : 2.5); blueFillB.intensity = Ps * (LOW ? 1.0 : 2.0); blueArch.intensity = Ps * .22; renderer.toneMappingExposure = EXP0 * (1 + .32 * Ps); lab.fog.density = lerp(.055, .02, Ps); lab.fog.color.copy(fogA).lerp(fogB, Ps);
      if (crownWash) crownWash.intensity = ph(t, [T.power[0] + 2.6, T.power[1]]) * 2.4;
      perimeterBlue.forEach((l, i) => l.intensity = ph(t, [T.power[0] + 2.8 + i * .2, T.power[1] + .3]) * 3.4 * LK);
      railE.emissiveIntensity = ph(t, [T.power[0] + 2.2, T.power[0] + 2.9]) * 2.8;
      hemi.color.set(0x5c7a9a); hemi.groundColor.set(0x1c130c);
      floor.material.envMapIntensity = lerp(0.6, 0.85, Ps);
      const gone = sm(ph(t, T.collapse)), back = sm(ph(t, T.idle)); coreE.emissiveIntensity = Math.max(coreE.emissiveIntensity * (1 - .85 * gone), back * 5 * (1 + .1 * Math.sin(t * 1.7))); tableLight.intensity = Math.max(tableLight.intensity, (gone * .9 + back * .6) * LK * (.9 + .1 * Math.sin(t * 1.7))); }
    // S0 gate leaves swing out flat against the end caps once the room is live
    { const g = sm(ph(t, [T.power[1] - 1.6, T.power[1] + .2])); leaves.forEach(L => L.rotation.y = -L.userData.s * OPEN_A * g); cue('gate', t > T.power[1] - 1.6, () => sfx.servo(1.6, true)); cue('gate2', t > T.power[1] + .2, sfx.relay); }
    // dust, spinning holos, console text
    { const lit = sm(ph(t, T.beam)) * (1 - sm(ph(t, T.retract))) * .5; dust.material.opacity = dust.userData.max * Math.max(lit, sm(ph(t, T.power))); dust.visible = dust.material.opacity > .001; dust.rotation.y += dt * .006; spin.forEach(o => o.rotation.y += dt * .25);
      aiPanel.visible = w > .02; if (aiPanel.visible) { aiM.opacity = w * .92; aiPanel.lookAt(cam.position); const L = AI.lines.at(-1); if (L && AI.reveal < L.length) { AI.reveal = Math.min(L.length, AI.reveal + dt * 48); AI.dirty = true; } const bl = Math.floor(t * 2) % 2; if (bl !== S.bl) { S.bl = bl; AI.dirty = true; } if (AI.dirty) aiDraw(); } }
    // wet-floor reflections: mirror clones follow transforms, visibility and glow of their sources
    for (const [a, b, root] of mirrorPairs) { b.visible = a.visible; if (root) { b.matrix.copy(a.matrixWorld); b.matrixWorldNeedsUpdate = true; } else { b.position.copy(a.position); b.quaternion.copy(a.quaternion); b.scale.copy(a.scale); }
      const ma = a.material, mb = b.material; if (!ma) continue; if (ma.isShaderMaterial) { for (const k in ma.uniforms) if (k !== 'uA') mb.uniforms[k].value = ma.uniforms[k].value; mb.uniforms.uA.value = ma.uniforms.uA.value * MIR; } else { if (mb.opacity !== undefined) mb.opacity = ma.opacity * MIR; if (mb.emissiveIntensity !== undefined) mb.emissiveIntensity = ma.emissiveIntensity * MIR; } }
    // camera: approach walk → orbit around the bench → (S0) walk through the bay to the inner floor and face the entity
    { const walk = sm(ph(t, T.approach)), approaching = t > T.approach[0] && walk < 1;
      if (canMove() && !FOCUS.active) { S.theta += S.vel * dt; S.vel *= Math.exp(-NAV.damp * dt); if (Math.abs(S.vel) < 1e-4) S.vel = 0; const idle = t - S.lastInput, near = Math.round(S.theta / SEC) * SEC;
        if (S.magnet === null && idle > 1.4 && Math.abs(S.vel) < .05 && Math.abs(near - S.theta) > .0008) S.magnet = near; }
      if (S.magnet !== null && !FOCUS.active) { const d = S.magnet - S.theta; S.theta += d * (1 - Math.exp(-2.6 * dt)); if (Math.abs(d) < .0006) { S.theta = S.magnet; S.magnet = null; S.lastInput = -9; } }
      const k = ((Math.round(S.theta / SEC) % NSEC) + NSEC) % NSEC; if (k !== S.sector && t >= T.power[0]) { S.sector = k; sfx.blip(1100, .05, .025); dispatchEvent(new CustomEvent('lab:sector', { detail: SECTORS[k] })); }
      const spd = approaching ? .55 : Math.max(Math.abs(S.vel) * CAM_R, inSpd); S.stride += spd * dt * 3.4; const bw = clamp(spd / .6, 0, 1), th = S.theta, r = lerp(lerp(PZ + .5, CAM_R, eo(walk)), IN_R, w);
      const F = FOCUS.active ? Math.min(1, FOCUS.t += dt * 1.8) : Math.max(0, (FOCUS.t -= dt * 2.2));
      const e = sm(F);
      fA.copy(polar(th, 3.98, DK_Y + .45)).lerp(tmp.set(0, EMIT_Y + 1.4, 0), .35); fA.lerp(tmp.set(0, entY - .1, 0), w);
      const fy = 1.3 + sm(ph(t, T.beam)) * .9 + S.entF * 1.2 + sm(ph(t, T.map)) * .3 * (1 - sm(ph(t, T.retract))); fA.lerp(tmp.set(0, fy, 0), 1 - sm(ph(t, [T.power[0] + 1.5, T.power[0] + 4])));
      if (!S.fInit) { fB.copy(fA); S.fInit = true; } else fB.lerp(fA, 1 - Math.exp(-dt * 3.2));
      if (!FOCUS.active && F <= 0) {
        cam.position.copy(polar(th, r, EYE + Math.sin(S.stride * 2) * .012 * bw)); cam.position.add(tmp.set(Math.cos(th), 0, -Math.sin(th)).multiplyScalar(Math.sin(S.stride) * .009 * bw));
        S.look.x += (S.look.tx - S.look.x) * (1 - Math.exp(-dt * 4)); S.look.y += (S.look.ty - S.look.y) * (1 - Math.exp(-dt * 4));
        cam.lookAt(fB); cam.rotateY(S.look.x * (1 - .6 * w)); cam.rotateX(S.look.y * (1 - .6 * w));
      } else {
        cam.position.lerpVectors(FOCUS.from, FOCUS.toPos, e);
        cam.lookAt(FOCUS.toLook.clone().lerp(cam.position.clone().add(fB.clone().sub(cam.position)), 1 - e));
      }
      if (bokeh && (FOCUS.active || F > 0)) {
        bokeh.uniforms.focus.value = FOCUS.active ? cam.position.distanceTo(FOCUS.toLook) : bokeh.uniforms.focus.value;
        bokeh.uniforms.aperture.value = lerp(LOW ? 0.00004 : 0.00008, LOW ? 0.00035 : 0.0009, e);
      }
      if (F <= 0 && !FOCUS.active && bokeh && bokeh.enabled) {
        bokeh.enabled = false;
      }
      S.focusE = e;
    }
    if (!S.ready && t >= T.ready) { S.ready = true; fade.style.opacity = '0'; dispatchEvent(new CustomEvent('lab:ready', { detail: { sector: SECTORS[S.sector] } })); }
  }

  /* ── activation ── */
  let sceneCalls = 0, sceneTris = 0;
  let took = false; const takeover = () => { if (took) return; took = true;
    for (const p of composer.passes) if (p.isRenderPass || (p.scene && p.camera && !p.isShaderPass)) {
      p.scene = lab; p.camera = cam;
      const origRender = p.render.bind(p);
      p.render = (r, writeBuffer, readBuffer, deltaTime, maskActive) => {
        origRender(r, writeBuffer, readBuffer, deltaTime, maskActive);
        sceneCalls = r.info.render.calls; sceneTris = r.info.render.triangles;
      };
    }
    lab.environment = null; };
  function activate(startAt = 0) { if (S.active) return; S.active = true; Object.assign(S, { t: 0, theta: 0, vel: 0, magnet: null, sector: 0, fInit: false, ready: false, inside: 0, insideT: 0, wantIn: false, navLocked: false }); FOCUS.active = false; FOCUS.id = null; FOCUS.t = 0; cues.clear(); fade.style.opacity = '1'; takeover(); fit();
    const b = q.get('boot'); if (b === 'skip') startAt = T.ready - .01; else if (b !== null && !isNaN(+b)) startAt = +b;
    if (startAt > 0) { S.t = startAt; const bk = {}; for (const k in sfx) if (typeof sfx[k] === 'function') { bk[k] = sfx[k]; sfx[k] = () => {}; } update(0); Object.assign(sfx, bk); if (S.t > T.table[0]) sfx.hum(S.t > T.power[0] ? .22 : .12, 1); }
    dispatchEvent(new CustomEvent('lab:activated', { detail: { t: S.t } })); }
  const stats = () => ({ t: +S.t.toFixed(2), theta: +S.theta.toFixed(3), sector: SECTORS[S.sector].id, ready: S.ready, active: S.active, inside: +S.insideT.toFixed(2), exposure: +renderer.toneMappingExposure.toFixed(3), calls: sceneCalls || renderer.info.render.calls, triangles: sceneTris || renderer.info.render.triangles, textures: renderer.info.memory.textures,
    camera: { p: cam.position.toArray().map(v => +v.toFixed(3)), q: cam.quaternion.toArray().map(v => +v.toFixed(4)) }, focus: FOCUS.id });
  const ai = { say, ask, get lines() { return AI.lines.slice(); }, get onAsk() { return AI.onAsk; }, set onAsk(f) { AI.onAsk = f; } };
  return { scene: lab, camera: cam, state: S, T, SECTORS, update, activate, goTo, enter, exit, focusSector, unfocusSector, focus: focusSector, blurFocus: unfocusSector, ai, stats, fade, pick, api2 };
}

/* ── install: one call from index.html; hooks the existing composer loop, listens for vault:entered ── */
export function installLab(opts) {
  const api = createLab(opts), { composer } = opts, q = new URLSearchParams(location.search); let last = performance.now();
  const _render = composer.render.bind(composer); composer.render = (...a) => { const now = performance.now(), dt = (now - last) / 1000; last = now; if (api.state.active) api.update(dt); _render(...a); };
  addEventListener('vault:entered', () => api.activate(), { once: true });
  if (Array.isArray(opts.blackout)) addEventListener('lab:activated', () => setTimeout(() => opts.blackout.forEach(el => { el.style.transition = 'none'; el.style.opacity = '0'; el.style.pointerEvents = 'none'; }), 50), { once: true });
  if (q.has('lab')) requestAnimationFrame(() => api.activate()); if (q.has('inside')) addEventListener('lab:ready', () => api.enter(), { once: true });
  window.__lab = api; return api;
}
