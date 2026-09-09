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
  window.THREE = THREE;
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
  const screenMat = t => mat({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0, color: 0x101010, roughness: .3, side: THREE.DoubleSide });
  const blueprintPaperMat = t => mat({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.55, color: 0xffffff, roughness: 0.88, metalness: 0.02, side: THREE.DoubleSide });
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
  const bay = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.2, 1.4), new THREE.MeshBasicMaterial({ visible: false })); bay.visible = false; bay.position.set(0, .8, 4.0); bay.userData.sector = 'S0'; table.add(bay); hits.push(bay);
  // hinged leaves: thin gate leaves on the end caps, swing outward flat against the bench
  const HR_ = B_OUT + .1, leafL = 2 * HR_ * Math.sin(SEC / 2) / 2 - .03, leaves = [1, -1].map(s => { const g = new THREE.Group(); g.position.copy(polar(s * SEC / 2, HR_, .16)); table.add(g);
    add(box(leafL, .74, .07, gun), -s * leafL / 2, .43, 0, g); add(box(leafL - .2, .02, .012, portalE), -s * leafL / 2, .62, .04, g); add(new THREE.Mesh(new THREE.PlaneGeometry(leafL - .3, .24), mat({ map: TEX.gate(), roughness: .8, metalness: .4 })), -s * leafL / 2, .36, .037, g); for (let i = 0; i < 2; i++) add(cyl(.03, .03, .14, tit, 12), 0, .2 + i * .45, .05, g); g.userData.s = s; return g; });

  /* ── sector installations (physical, on the deck) ── */
  const sectorGroup = (k, r, y = TOP) => { const g = new THREE.Group(); g.position.copy(polar(k * SEC, r, y)); g.rotation.y = k * SEC; table.add(g); return g; };

  /* ── generic persisted state synchronization client (polling + ETag + visibility pause) ── */
  function makeStateSync(namespace, { interval = 3500 } = {}) {
    const cache = new Map(), listeners = new Set();
    let etag = null, timer = null, hidden = false;
    const notify = (id, data) => {
      if (data === undefined) cache.delete(id);
      else cache.set(id, data);
      listeners.forEach(fn => fn(id, data));
    };
    const base = {
      get: id => cache.get(id),
      all: () => cache,
      onChange: fn => { listeners.add(fn); return () => listeners.delete(fn); }
    };
    const poll = async () => {
      try {
        const r = await fetch(`/api/state/${namespace}`, {
          headers: etag ? { 'If-None-Match': etag } : {}
        });
        if (r.status === 304) return;
        etag = r.headers.get('ETag');
        const snap = await r.json();
        const seen = new Set();
        for (const [id, d] of Object.entries(snap)) {
          seen.add(id);
          if (JSON.stringify(cache.get(id)) !== JSON.stringify(d)) notify(id, d);
        }
        for (const id of [...cache.keys()]) {
          if (!seen.has(id)) notify(id, undefined);
        }
      } catch {}
    };
    base.load = poll;
    base.start = () => {
      poll();
      timer = setInterval(() => { if (!hidden) poll(); }, interval);
    };
    document.addEventListener('visibilitychange', () => {
      hidden = document.hidden;
      if (!hidden) poll();
    });
    base.patch = async (id, partial) => {
      notify(id, { ...(cache.get(id) || {}), ...partial });
      try {
        const r = await fetch(`/api/state/${namespace}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(partial)
        });
        if (r.ok) notify(id, await r.json());
      } catch {}
    };
    return base;
  }

  function wrapText(g, text, x, y, maxWidth, lineHeight) {
    const words = (text || '').split(' ');
    let line = '', curY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (g.measureText(testLine).width > maxWidth && n > 0) {
        g.fillText(line, x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    g.fillText(line, x, curY);
  }

  /* ── Rich Domain-Specific Blueprint Technical Diagrams ── */
  function drawCaveDiagram(g, x, y, w, h) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#7dd3fc'; mono(g, 10, 'bold');
    g.fillText('FIGURE 1.0 : RAYMARCHED SDF PIPELINE & PERSPECTIVE FRUSTUM', 10, 16);

    // 3D coordinate gimbal
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(35, 75); g.lineTo(35, 30); // Y
    g.moveTo(35, 75); g.lineTo(75, 88); // X
    g.moveTo(35, 75); g.lineTo(15, 95); // Z
    g.stroke();
    g.fillStyle = '#e0f2fe'; mono(g, 9, 'bold');
    g.fillText('+Y (UP)', 25, 26); g.fillText('+X', 78, 92); g.fillText('+Z', 4, 102);

    // Camera box & projection rays
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5;
    g.strokeRect(110, 45, 28, 20);
    g.beginPath();
    g.moveTo(138, 50); g.lineTo(148, 42); g.lineTo(148, 68); g.lineTo(138, 60); g.closePath();
    g.fillStyle = 'rgba(56, 189, 248, 0.2)'; g.fill(); g.stroke();

    // Frustum projection rays
    g.strokeStyle = 'rgba(125, 211, 252, 0.7)'; g.setLineDash([4, 3]);
    g.beginPath();
    g.moveTo(148, 42); g.lineTo(350, 25);
    g.moveTo(148, 68); g.lineTo(350, 145);
    g.moveTo(148, 55); g.lineTo(350, 85); // optical axis
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#93c5fd'; mono(g, 8, '');
    g.fillText('RAYMARCH FRUSTUM (60° FOV)', 160, 38);

    // Cavern tunnel cross-section & distance field isolines
    g.strokeStyle = '#38bdf8'; g.lineWidth = 2;
    g.beginPath(); g.arc(260, 85, 45, -Math.PI * 0.7, Math.PI * 0.7); g.stroke();
    g.strokeStyle = 'rgba(56, 189, 248, 0.35)'; g.lineWidth = 1;
    for (let r = 55; r <= 75; r += 10) {
      g.beginPath(); g.arc(260, 85, r, -Math.PI * 0.75, Math.PI * 0.75); g.stroke();
    }
    // Blast door profile
    g.strokeStyle = '#67e8f9'; g.lineWidth = 1.8;
    g.beginPath(); g.arc(260, 85, 26, 0, Math.PI * 2); g.stroke();
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      g.beginPath(); g.moveTo(260 + Math.cos(a) * 26, 85 + Math.sin(a) * 26);
      g.lineTo(260 + Math.cos(a) * 31, 85 + Math.sin(a) * 31); g.stroke();
    }
    g.fillStyle = '#bae6fd'; mono(g, 8, '');
    g.fillText('VAULT BLAST DOOR (R=3.6m)', 205, 125);
    g.fillText('SDF FIELD: d(p) = min(tunnel, door)', 185, 140);

    // Middle section: Sphere tracing vector steps
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 160); g.lineTo(355, 160); g.stroke();
    g.fillStyle = '#7dd3fc'; mono(g, 10, 'bold');
    g.fillText('SPHERE TRACING & INTERSECTION DYNAMICS', 10, 178);

    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(25, 220); g.lineTo(345, 220); g.stroke();
    const steps = [[50, 220, 25], [110, 220, 35], [195, 220, 50], [285, 220, 40], [335, 220, 10]];
    steps.forEach(([cx, cy, cr], idx) => {
      g.strokeStyle = 'rgba(56, 189, 248, 0.4)'; g.lineWidth = 1;
      g.beginPath(); g.arc(cx, cy, cr, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#38bdf8'; g.beginPath(); g.arc(cx, cy, 2.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#bae6fd'; mono(g, 8, ''); g.fillText(`t${idx}`, cx - 5, cy + 14);
    });
    g.fillStyle = '#93c5fd'; mono(g, 8, '');
    g.fillText('RAY VECTOR: p(t) = ro + t · rd  |  STEP: t += d(p)', 25, 276);

    // Lower Section: PBR Mathematical Equation & GBuffer
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 296); g.lineTo(355, 296); g.stroke();
    g.fillStyle = '#7dd3fc'; mono(g, 10, 'bold');
    g.fillText('COOK-TORRANCE SPECULAR BRDF & POST STACK', 10, 314);

    g.fillStyle = '#e0f2fe'; mono(g, 9, '');
    g.fillText('f_r(p, ω_i, ω_o) = D(h) · F(ω_o, h) · G(ω_i, ω_o, h)', 25, 336);
    g.fillText('                   ─────────────────────────────────', 25, 344);
    g.fillText('                        4 · (n · ω_i) · (n · ω_o)', 25, 354);

    const gbufs = ['ALBEDO (SRGB)', 'NORMALS (OCT)', 'ROUGH / METAL', 'EMISSIVE'];
    gbufs.forEach((b, idx) => {
      const bx = 25 + idx * 82, by = 370;
      g.fillStyle = 'rgba(14, 116, 144, 0.25)'; g.fillRect(bx, by, 76, 22);
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1; g.strokeRect(bx, by, 76, 22);
      g.fillStyle = '#bae6fd'; mono(g, 8, 'bold'); g.fillText(b, bx + 4, by + 14);
    });

    g.fillStyle = '#38bdf8'; mono(g, 8, '');
    g.fillText('POST COMPOSER: [ RenderPass ──▶ GTAOPass ──▶ BokehPass ──▶ FilmGrade ]', 25, 412);
    g.restore();
  }

  function drawArgusDiagram(g, x, y, w, h) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#7dd3fc'; mono(g, 10, 'bold');
    g.fillText('FIGURE 1.0 : MAMBA-3 SSM + GAT + HRP RISK BUDGETING', 10, 16);

    // Mamba-3 State Space Discretization Flow
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.2;
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('1. SELECTIVE STATE-SPACE MODEL (MAMBA-3):', 15, 36);

    g.fillStyle = 'rgba(14, 116, 144, 0.25)'; g.fillRect(20, 46, 68, 28);
    g.strokeStyle = '#38bdf8'; g.strokeRect(20, 46, 68, 28);
    g.fillStyle = '#e0f2fe'; mono(g, 9, 'bold'); g.fillText('x_t (DATA)', 25, 63);

    // Arrow to SSM core
    g.beginPath(); g.moveTo(88, 60); g.lineTo(130, 60); g.stroke();
    g.fillStyle = '#38bdf8'; g.fillText('▶', 125, 63);

    g.fillStyle = 'rgba(14, 116, 144, 0.35)'; g.fillRect(135, 42, 110, 36);
    g.strokeStyle = '#67e8f9'; g.strokeRect(135, 42, 110, 36);
    g.fillStyle = '#ffffff'; mono(g, 8, 'bold');
    g.fillText('h_t = Ā h_{t-1} + B̄ x_t', 142, 56);
    g.fillText('y_t = C h_t', 165, 70);

    g.beginPath(); g.moveTo(245, 60); g.lineTo(285, 60); g.stroke();
    g.fillStyle = '#38bdf8'; g.fillText('▶', 280, 63);

    g.fillStyle = 'rgba(14, 116, 144, 0.25)'; g.fillRect(290, 46, 60, 28);
    g.strokeStyle = '#38bdf8'; g.strokeRect(290, 46, 60, 28);
    g.fillStyle = '#e0f2fe'; mono(g, 9, 'bold'); g.fillText('y_t (ALPHA)', 294, 63);

    g.fillStyle = '#bae6fd'; mono(g, 8, '');
    g.fillText('ZOH: Ā = exp(Δ A), B̄ = (Δ A)⁻¹ (exp(Δ A) - I) Δ B', 25, 93);

    // GAT Network graph
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 105); g.lineTo(355, 105); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('2. GRAPH ATTENTION NETWORK (ASSET CLUSTERS):', 15, 122);

    const nodes = [
      { name: 'REL', x: 60, y: 155 },
      { name: 'HDFC', x: 135, y: 140 },
      { name: 'INFY', x: 195, y: 175 },
      { name: 'ICICI', x: 125, y: 200 },
      { name: 'TCS', x: 260, y: 150 }
    ];
    // Attention edges
    g.strokeStyle = 'rgba(56, 189, 248, 0.5)'; g.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        g.beginPath(); g.moveTo(nodes[i].x, nodes[i].y); g.lineTo(nodes[j].x, nodes[j].y); g.stroke();
      }
    }
    nodes.forEach(n => {
      g.fillStyle = '#081e3e'; g.beginPath(); g.arc(n.x, n.y, 14, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#ffffff'; mono(g, 8, 'bold'); g.fillText(n.name, n.x - 10, n.y + 3);
    });
    g.fillStyle = '#bae6fd'; mono(g, 8, '');
    g.fillText('ATTENTION: α_ij = softmax_j( LeakyReLU( aᵀ [Wh_i || Wh_j] ) )', 25, 230);

    // HRP & Risk Budgeting
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 245); g.lineTo(355, 245); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('3. HIERARCHICAL RISK PARITY & DEFLATED SHARPE:', 15, 262);

    // Dendrogram tree
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(50, 310); g.lineTo(50, 290); g.lineTo(90, 290); g.lineTo(90, 310);
    g.moveTo(70, 290); g.lineTo(70, 275);
    g.moveTo(130, 310); g.lineTo(130, 295); g.lineTo(165, 295); g.lineTo(165, 310);
    g.moveTo(147, 295); g.lineTo(147, 275);
    g.moveTo(70, 275); g.lineTo(147, 275);
    g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 7, '');
    g.fillText('c1', 45, 320); g.fillText('c2', 85, 320); g.fillText('c3', 125, 320); g.fillText('c4', 160, 320);

    // Risk curve
    g.beginPath(); g.moveTo(210, 310); g.lineTo(340, 310); g.stroke();
    g.beginPath(); g.moveTo(210, 310); g.lineTo(210, 270); g.stroke();
    g.strokeStyle = '#4ade80'; g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(215, 305); g.bezierCurveTo(240, 275, 280, 270, 335, 272);
    g.stroke();
    g.fillStyle = '#4ade80'; mono(g, 7, 'bold'); g.fillText('KELLY RISK FRONTIER', 240, 265);

    // Equations & Compliance
    g.fillStyle = '#e0f2fe'; mono(g, 8, '');
    g.fillText('DSR = Φ( (SR - SR₀) √(T - 1) / √(1 - γ₃ SR + ((γ₄ - 1)/4) SR²) )', 25, 345);
    g.fillText('PBO TEST: Combinatorial Symmetric Cross-Validation (CSCV, N=50)', 25, 362);

    g.fillStyle = 'rgba(14, 116, 144, 0.3)'; g.fillRect(25, 376, 325, 38);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1; g.strokeRect(25, 376, 325, 38);
    g.fillStyle = '#4ade80'; mono(g, 9, 'bold'); g.fillText('SEBI MASTER CIRCULAR 2026 // COMPLIANT', 35, 392);
    g.fillStyle = '#bae6fd'; mono(g, 8, ''); g.fillText('IMMUTABLE SHA-256 REBALANCE AUDIT CHAIN VERIFIED', 35, 406);
    g.restore();
  }

  function drawCryptoGraphDiagram(g, x, y, w, h) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#7dd3fc'; mono(g, 10, 'bold');
    g.fillText('FIGURE 1.0 : SPATIO-TEMPORAL GCN × LIVE DEPTH MATRIX', 10, 16);

    // ST-GCN 3D lattice
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('1. SPATIO-TEMPORAL GRAPH CONVOLUTION (ST-GCN):', 15, 36);

    const planes = [
      { t: 'T-1', y: 70 },
      { t: 'T',   y: 110 },
      { t: 'T+1', y: 150 }
    ];
    planes.forEach((p, idx) => {
      g.strokeStyle = 'rgba(56, 189, 248, 0.4)'; g.lineWidth = 1;
      g.beginPath();
      g.moveTo(40, p.y); g.lineTo(260, p.y); g.lineTo(220, p.y + 24); g.lineTo(20, p.y + 24); g.closePath();
      g.stroke();
      g.fillStyle = '#93c5fd'; mono(g, 8, 'bold'); g.fillText(p.t, 25, p.y + 16);

      // Nodes on each plane
      const nx = [70, 120, 170, 220];
      nx.forEach(cx => {
        g.fillStyle = '#38bdf8'; g.beginPath(); g.arc(cx, p.y + 12, 3, 0, Math.PI * 2); g.fill();
      });
      // Intra-plane spatial edges
      g.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      g.beginPath(); g.moveTo(70, p.y + 12); g.lineTo(120, p.y + 12); g.lineTo(170, p.y + 12); g.lineTo(220, p.y + 12); g.stroke();

      // Inter-plane temporal edges
      if (idx < 2) {
        g.strokeStyle = 'rgba(74, 222, 128, 0.6)'; g.setLineDash([3, 2]);
        nx.forEach(cx => {
          g.beginPath(); g.moveTo(cx, p.y + 12); g.lineTo(cx, planes[idx + 1].y + 12); g.stroke();
        });
        g.setLineDash([]);
      }
    });
    g.fillStyle = '#bae6fd'; mono(g, 8, '');
    g.fillText('SPECTRAL FILTER: H^{(l+1)} = σ( D̃^{-1/2} Ã D̃^{-1/2} H^{(l)} W^{(l)} )', 25, 192);

    // L2 Order-Book Depth Curve
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 208); g.lineTo(355, 208); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('2. ORDER-BOOK DEPTH LADDER & SPREAD DYNAMICS:', 15, 225);

    // Depth chart axes
    g.strokeStyle = 'rgba(56, 189, 248, 0.5)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(35, 305); g.lineTo(335, 305); g.stroke();
    g.beginPath(); g.moveTo(185, 310); g.lineTo(185, 238); g.stroke(); // Mid-price line
    g.fillStyle = '#93c5fd'; mono(g, 7, ''); g.fillText('MID PRICE (P_mid)', 150, 236);

    // Bid staircase (green)
    g.strokeStyle = '#4ade80'; g.fillStyle = 'rgba(74, 222, 128, 0.15)'; g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(40, 305);
    g.lineTo(40, 250); g.lineTo(75, 250);
    g.lineTo(75, 265); g.lineTo(110, 265);
    g.lineTo(110, 280); g.lineTo(145, 280);
    g.lineTo(145, 298); g.lineTo(175, 298);
    g.lineTo(175, 305); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = '#4ade80'; mono(g, 8, 'bold'); g.fillText('BIDS (BUY CUMULATIVE)', 50, 245);

    // Ask staircase (red/orange)
    g.strokeStyle = '#f87171'; g.fillStyle = 'rgba(248, 113, 113, 0.15)'; g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(195, 305);
    g.lineTo(195, 298); g.lineTo(225, 298);
    g.lineTo(225, 280); g.lineTo(260, 280);
    g.lineTo(260, 265); g.lineTo(295, 265);
    g.lineTo(295, 250); g.lineTo(330, 250);
    g.lineTo(330, 305); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = '#f87171'; mono(g, 8, 'bold'); g.fillText('ASKS (SELL CUMULATIVE)', 220, 245);

    // Spread bracket
    g.strokeStyle = '#fbbf24'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(175, 314); g.lineTo(195, 314); g.stroke();
    g.fillStyle = '#fbbf24'; mono(g, 7, 'bold'); g.fillText('SPREAD ΔP', 165, 324);

    // Ingestion pipeline flow
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 336); g.lineTo(355, 336); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('3. REAL-TIME DISTRIBUTED PIPELINE ARCHITECTURE:', 15, 353);

    const pipes = ['BINANCE WS (107)', 'REDIS BUFFER', 'FASTAPI + CELERY', 'NEXT.JS 14'];
    pipes.forEach((p, idx) => {
      const px = 22 + idx * 84, py = 368;
      g.fillStyle = 'rgba(14, 116, 144, 0.3)'; g.fillRect(px, py, 78, 26);
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1; g.strokeRect(px, py, 78, 26);
      g.fillStyle = '#e0f2fe'; mono(g, 7, 'bold'); g.fillText(p, px + 3, py + 16);
      if (idx < 3) {
        g.fillStyle = '#38bdf8'; mono(g, 8, ''); g.fillText('▶', px + 76, py + 16);
      }
    });
    g.fillStyle = '#bae6fd'; mono(g, 8, '');
    g.fillText('LATENCY: <12ms END-TO-END | ENSEMBLE GATING: SHARPE > 1.5', 25, 412);
    g.restore();
  }

  function drawPhysioNetDiagram(g, x, y, w, h) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#7dd3fc'; mono(g, 10, 'bold');
    g.fillText('FIGURE 1.0 : 12-LEAD CARDIAC ECG & EEG SLEEP SPECTROGRAM', 10, 16);

    // 12-lead ECG cardiac waveform
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('1. HIGH-RESOLUTION P-Q-R-S-T CARDIAC CYCLE:', 15, 36);

    // Isoelectric baseline
    g.strokeStyle = 'rgba(56, 189, 248, 0.3)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 95); g.lineTo(355, 95); g.stroke();

    // ECG waveform path
    g.strokeStyle = '#38bdf8'; g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(25, 95);
    g.lineTo(55, 95);
    // P wave
    g.bezierCurveTo(65, 80, 75, 80, 85, 95);
    // PR segment
    g.lineTo(110, 95);
    // Q wave
    g.lineTo(118, 105);
    // R peak
    g.lineTo(132, 38);
    // S wave
    g.lineTo(146, 120);
    // ST segment
    g.lineTo(168, 95);
    // T wave
    g.bezierCurveTo(185, 70, 210, 70, 225, 95);
    // TP interval
    g.lineTo(260, 95);
    // Second smaller P wave
    g.bezierCurveTo(270, 84, 278, 84, 286, 95);
    g.lineTo(300, 95);
    g.lineTo(306, 102);
    g.lineTo(316, 52);
    g.lineTo(326, 112);
    g.lineTo(340, 95);
    g.stroke();

    // Callout labels
    g.fillStyle = '#4ade80'; mono(g, 8, 'bold');
    g.fillText('P', 72, 74);
    g.fillText('R (PEAK +1.4mV)', 122, 32);
    g.fillText('Q', 112, 116);
    g.fillText('S', 148, 130);
    g.fillText('T', 202, 66);

    // Intervals measurement markers
    g.strokeStyle = '#fbbf24'; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(55, 110); g.lineTo(118, 110); // PR
    g.moveTo(118, 124); g.lineTo(146, 124); // QRS
    g.moveTo(118, 136); g.lineTo(225, 136); // QT
    g.stroke();
    g.fillStyle = '#fbbf24'; mono(g, 7, '');
    g.fillText('PR: 160ms', 65, 108);
    g.fillText('QRS: 85ms', 114, 122);
    g.fillText('QTc: 410ms', 160, 134);

    // EEG Sleep Frequency Bands
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 150); g.lineTo(355, 150); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('2. MULTI-SPECTRAL EEG SLEEP ARCHITECTURE:', 15, 167);

    const bands = [
      { name: 'DELTA (0.5-4 Hz · N3 DEEP SLEEP)', color: '#60a5fa', freq: 0.05, amp: 10, y: 190 },
      { name: 'ALPHA (8-12 Hz · RESTING AWAKE)', color: '#34d399', freq: 0.22, amp: 6, y: 222 },
      { name: 'GAMMA (>30 Hz · COGNITIVE TRANSIENT)', color: '#f472b6', freq: 0.65, amp: 3, y: 252 }
    ];
    bands.forEach(b => {
      g.fillStyle = b.color; mono(g, 7, 'bold'); g.fillText(b.name, 25, b.y - 4);
      g.strokeStyle = b.color; g.lineWidth = 1.3;
      g.beginPath();
      for (let px = 25; px < 345; px += 2) {
        const val = Math.sin((px - 25) * b.freq) * b.amp + Math.cos((px - 25) * b.freq * 0.4) * (b.amp * 0.3);
        px === 25 ? g.moveTo(px, b.y + val) : g.lineTo(px, b.y + val);
      }
      g.stroke();
    });

    // Dual-Layer Age Residualization
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 275); g.lineTo(355, 275); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('3. DUAL-LAYER AGE RESIDUALIZATION & INFERENCE:', 15, 292);

    // Scatter plot + regression curve
    g.strokeStyle = 'rgba(56, 189, 248, 0.4)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(35, 375); g.lineTo(335, 375); g.stroke(); // Age axis
    g.beginPath(); g.moveTo(35, 375); g.lineTo(35, 305); g.stroke(); // Feature axis
    g.fillStyle = '#93c5fd'; mono(g, 7, ''); g.fillText('AGE (YEARS 20-90)', 240, 385);

    // Scatter dots
    for (let i = 0; i < 35; i++) {
      const ax = 45 + (i / 35) * 280;
      const ay = 360 - Math.pow((i / 35), 1.4) * 45 + (Math.sin(i * 3.7) * 8);
      g.fillStyle = 'rgba(56, 189, 248, 0.5)'; g.fillRect(ax, ay, 2, 2);
    }
    // Fitted residual curve f_age_z
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(45, 360); g.bezierCurveTo(120, 355, 220, 335, 325, 315);
    g.stroke();
    g.fillStyle = '#38bdf8'; mono(g, 8, 'bold'); g.fillText('f_age_z + POST-HOC γ', 180, 328);

    g.fillStyle = 'rgba(14, 116, 144, 0.3)'; g.fillRect(25, 392, 325, 25);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1; g.strokeRect(25, 392, 325, 25);
    g.fillStyle = '#4ade80'; mono(g, 8, 'bold'); g.fillText('DATASET: ~6,600 PSG RECORDS // 3 HOSPITAL SITES // LOSO CV', 32, 408);
    g.restore();
  }

  function drawVentilatorDiagram(g, x, y, w, h) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#7dd3fc'; mono(g, 10, 'bold');
    g.fillText('FIGURE 1.0 : DUAL VENTILATOR WAVEFORMS & ESOPHAGEAL PVA', 10, 16);

    // Channel 1: Airway Pressure Paw(t)
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('1. AIRWAY PRESSURE P_aw(t) [cmH₂O]:', 15, 36);

    // Axis
    g.strokeStyle = 'rgba(56, 189, 248, 0.3)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(35, 115); g.lineTo(345, 115); g.stroke();
    g.beginPath(); g.moveTo(35, 115); g.lineTo(35, 45); g.stroke();

    // Grid ticks
    g.fillStyle = '#93c5fd'; mono(g, 7, '');
    g.fillText('30 -', 18, 52); g.fillText('PEEP-', 10, 102); g.fillText('0 -', 23, 116);

    // Paw curve
    g.strokeStyle = '#38bdf8'; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(35, 100); // PEEP baseline = 5
    // Cycle 1: normal breath
    g.lineTo(60, 100);
    g.lineTo(65, 105); // Trigger dip ΔPtrig
    g.lineTo(85, 52);  // Peak inspiratory Ppeak = 24
    g.lineTo(120, 68); // Plateau Pplat = 18
    g.lineTo(135, 100); // Expiration back to PEEP
    g.lineTo(165, 100);
    // Cycle 2: Ineffective effort during expiration
    g.lineTo(170, 100);
    g.lineTo(176, 108); // Failed trigger dip
    g.lineTo(182, 100); // Does not cycle ventilator!
    g.lineTo(210, 100);
    // Cycle 3: Double trigger
    g.lineTo(215, 105);
    g.lineTo(235, 50);
    g.lineTo(250, 68);
    g.lineTo(255, 62); // Second breath stacked!
    g.lineTo(275, 46);
    g.lineTo(290, 66);
    g.lineTo(305, 100);
    g.lineTo(345, 100);
    g.stroke();

    // Callout highlights
    g.fillStyle = '#fbbf24'; mono(g, 7, 'bold');
    g.fillText('ΔP_trig', 50, 116);
    g.fillText('P_peak: 24 cmH₂O', 80, 46);
    g.fillText('P_plat: 18 cmH₂O', 125, 64);
    g.fillStyle = '#f87171';
    g.fillText('INEFFECTIVE EFFORT', 158, 124);
    g.fillText('DOUBLE TRIGGER STACK', 230, 40);

    // Channel 2: Flow Rate V̇(t)
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 136); g.lineTo(355, 136); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('2. FLOW RATE V̇(t) [L/min] & ESOPHAGEAL P_es:', 15, 154);

    // Zero-flow line
    g.strokeStyle = 'rgba(56, 189, 248, 0.4)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(35, 195); g.lineTo(345, 195); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 7, ''); g.fillText('+60', 16, 172); g.fillText('  0', 16, 197); g.fillText('-60', 16, 222);

    // Flow waveform
    g.strokeStyle = '#4ade80'; g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(35, 195);
    g.lineTo(65, 195);
    // Insp delivery
    g.lineTo(70, 168); g.lineTo(120, 182); g.lineTo(125, 195);
    // Exp decay
    g.lineTo(130, 226); g.bezierCurveTo(145, 210, 155, 198, 165, 195);
    // Ineffective effort perturbation
    g.lineTo(176, 190); g.lineTo(182, 195);
    // Double trigger flow
    g.lineTo(215, 195); g.lineTo(220, 165); g.lineTo(250, 180);
    g.lineTo(255, 162); g.lineTo(290, 180); g.lineTo(295, 195);
    g.lineTo(300, 225); g.bezierCurveTo(315, 208, 330, 198, 345, 195);
    g.stroke();

    // Channel 3: Esophageal ground truth Pes & Transpulmonary PL = Paw - Pes
    g.strokeStyle = '#c084fc'; g.lineWidth = 1.6; g.setLineDash([3, 2]);
    g.beginPath();
    g.moveTo(35, 252);
    for (let px = 35; px < 345; px += 4) {
      const pwave = (px > 55 && px < 125) ? -16 : (px > 170 && px < 185) ? -14 : (px > 210 && px < 295) ? -20 : 0;
      g.lineTo(px, 252 + pwave + Math.sin(px * 0.1) * 2);
    }
    g.stroke(); g.setLineDash([]);
    g.fillStyle = '#c084fc'; mono(g, 8, 'bold');
    g.fillText('ESOPHAGEAL P_es (BALLOON GROUND TRUTH)', 35, 272);
    g.fillText('TRANSPULMONARY PRESSURE: P_L = P_aw - P_es', 35, 286);

    // Lung Mechanics Equation
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 302); g.lineTo(355, 302); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('3. EQUATION OF MOTION FOR THE RESPIRATORY SYSTEM:', 15, 320);

    g.fillStyle = '#e0f2fe'; mono(g, 9, '');
    g.fillText('P_aw(t) = (1 / C_rs) · V(t) + R_aw · V̇(t) + PEEP', 25, 344);
    g.fillStyle = '#93c5fd'; mono(g, 8, '');
    g.fillText('C_rs: Respiratory System Compliance (ΔV / ΔP)', 25, 362);
    g.fillText('R_aw: Airway Resistance (ΔP / V̇)', 25, 376);

    g.fillStyle = 'rgba(14, 116, 144, 0.3)'; g.fillRect(25, 390, 325, 26);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1; g.strokeRect(25, 390, 325, 26);
    g.fillStyle = '#4ade80'; mono(g, 8, 'bold');
    g.fillText('50,920 MIMIC-IV RECORDS // LOPO CV ACROSS 1,405 RUNS', 32, 407);
    g.restore();
  }

  function drawInsightEngineDiagram(g, x, y, w, h) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#7dd3fc'; mono(g, 10, 'bold');
    g.fillText('FIGURE 1.0 : MULTIMODAL 2D LAYOUT & EMBEDDING MANIFOLD', 10, 16);

    // Document Page Layout Segmentation
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('1. DOCUMENT 2D SPATIAL BOUNDING-BOX HIERARCHY:', 15, 36);

    // Miniature Document Sheet
    g.fillStyle = 'rgba(14, 116, 144, 0.15)'; g.fillRect(35, 48, 120, 140);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.strokeRect(35, 48, 120, 140);

    // Title box
    g.strokeStyle = '#67e8f9'; g.lineWidth = 1;
    g.strokeRect(42, 54, 106, 14);
    g.fillStyle = 'rgba(103, 232, 249, 0.3)'; g.fillRect(42, 54, 106, 14);

    // 2-column text paragraphs
    g.strokeStyle = '#4ade80';
    g.strokeRect(42, 74, 50, 45); g.strokeRect(98, 74, 50, 45);
    g.fillStyle = '#4ade80'; mono(g, 6, ''); g.fillText('PARAGRAPH A', 44, 84); g.fillText('PARAGRAPH B', 100, 84);

    // Table grid
    g.strokeStyle = '#fbbf24';
    g.strokeRect(42, 125, 106, 35);
    g.beginPath();
    g.moveTo(42, 137); g.lineTo(148, 137);
    g.moveTo(78, 125); g.lineTo(78, 160);
    g.moveTo(112, 125); g.lineTo(112, 160);
    g.stroke();
    g.fillStyle = '#fbbf24'; mono(g, 6, ''); g.fillText('TABLE CELL MATRIX', 50, 172);

    // Signature box
    g.strokeStyle = '#f472b6'; g.strokeRect(98, 166, 50, 16);

    // Reading order vector arrow
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(165, 80); g.lineTo(215, 80); g.stroke();
    g.fillStyle = '#38bdf8'; mono(g, 9, ''); g.fillText('▶', 210, 83);

    // Bounding Box Coordinates spec
    g.fillStyle = '#e0f2fe'; mono(g, 8, '');
    g.fillText('NORM COORDS: [x₀, y₀, x₁, y₁]', 220, 75);
    g.fillText('TOKEN MAPPING: OCR TEXT + POS', 220, 92);
    g.fillText('READING ORDER: DAG GRAPH', 220, 109);
    g.fillText('LAYOUT MODEL: LayoutLMv3', 220, 126);

    // Multimodal Transformer Cross-Attention
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 202); g.lineTo(355, 202); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('2. MULTIMODAL TRANSFORMER TOKEN FUSION:', 15, 219);

    const tokens = ['1D TEXT EMB', '2D SPATIAL POS', 'VISUAL PATCH'];
    tokens.forEach((t, idx) => {
      const tx = 25 + idx * 110, ty = 232;
      g.fillStyle = 'rgba(14, 116, 144, 0.3)'; g.fillRect(tx, ty, 100, 24);
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1; g.strokeRect(tx, ty, 100, 24);
      g.fillStyle = '#ffffff'; mono(g, 7, 'bold'); g.fillText(t, tx + 6, ty + 16);
      // downward arrow into attention
      g.beginPath(); g.moveTo(tx + 50, ty + 24); g.lineTo(tx + 50, ty + 38); g.stroke();
    });

    g.fillStyle = 'rgba(8, 30, 62, 0.9)'; g.fillRect(25, 272, 320, 32);
    g.strokeStyle = '#67e8f9'; g.lineWidth = 1.4; g.strokeRect(25, 272, 320, 32);
    g.fillStyle = '#67e8f9'; mono(g, 9, 'bold');
    g.fillText('MULTIMODAL CROSS-ATTENTION (Q, K, V MATRIX)', 35, 292);

    // Semantic Vector Clustering & Cache
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 316); g.lineTo(355, 316); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('3. SEMANTIC VECTOR RETRIEVAL & SHA-256 CACHE:', 15, 333);

    // Vector cluster
    g.fillStyle = 'rgba(56, 189, 248, 0.4)';
    const cluster = [[50, 365], [62, 355], [70, 375], [58, 380], [75, 360]];
    cluster.forEach(([cx, cy]) => {
      g.beginPath(); g.arc(cx, cy, 2.5, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = 'rgba(74, 222, 128, 0.5)';
    const clusterB = [[120, 360], [135, 350], [140, 370], [130, 380]];
    clusterB.forEach(([cx, cy]) => {
      g.beginPath(); g.arc(cx, cy, 2.5, 0, Math.PI * 2); g.fill();
    });

    // Query vector arrow
    g.strokeStyle = '#fbbf24'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(90, 400); g.lineTo(125, 365); g.stroke();
    g.fillStyle = '#fbbf24'; mono(g, 7, 'bold'); g.fillText('QUERY VECTOR q⃗', 128, 375);

    g.fillStyle = '#e0f2fe'; mono(g, 8, '');
    g.fillText('SIMILARITY: cos(θ) = (q⃗ · d⃗) / (||q⃗|| ||d⃗||)', 180, 355);
    g.fillText('ROUTER: 4-Tier Routing Engine', 180, 372);
    g.fillText('CACHE: O(1) Response in <150MB RAM', 180, 389);

    g.fillStyle = 'rgba(14, 116, 144, 0.3)'; g.fillRect(25, 400, 325, 20);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1; g.strokeRect(25, 400, 325, 20);
    g.fillStyle = '#4ade80'; mono(g, 8, 'bold');
    g.fillText('1:1 OCI CLOUD ADAPTER PATTERN & AUTO-SCALING DEPLOYMENT', 30, 414);
    g.restore();
  }

  function drawFormDispatcherDiagram(g, x, y, w, h) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#7dd3fc'; mono(g, 10, 'bold');
    g.fillText('FIGURE 1.0 : HTTP/2 MULTIPLEX STREAM & AST PROBE', 10, 16);

    // HTTP/2 Multiplexing
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('1. SINGLE-CONNECTION HTTP/2 MULTIPLEXING:', 15, 36);

    // Socket pipe
    g.strokeStyle = 'rgba(56, 189, 248, 0.6)'; g.lineWidth = 1.5;
    g.strokeRect(25, 46, 325, 78);
    g.fillStyle = 'rgba(8, 30, 62, 0.7)'; g.fillRect(25, 46, 325, 78);

    // Parallel interleaved streams
    const streamCols = ['#38bdf8', '#4ade80', '#fbbf24', '#f472b6'];
    for (let s = 0; s < 4; s++) {
      const sy = 56 + s * 16;
      g.strokeStyle = streamCols[s]; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(40, sy); g.lineTo(330, sy); g.stroke();
      g.fillStyle = streamCols[s]; mono(g, 7, 'bold');
      g.fillText(`STREAM ${s * 2 + 1} [DATA FRAMES]`, 45, sy - 2);
    }
    g.fillStyle = '#bae6fd'; mono(g, 8, '');
    g.fillText('BINARY FRAMING: [ LENGTH:24b | TYPE:8b | FLAGS:8b | STREAM_ID:31b ]', 25, 140);

    // AST Schema Reverse Engineering State Machine
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 154); g.lineTo(355, 154); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('2. AST SCHEMA PROBE & ENTRY REVERSE-ENGINEERING:', 15, 172);

    const stages = ['HTML RESPONSE', 'REGEX SCAN', 'AST TOKENIZER', 'ENTRY SCHEMA'];
    stages.forEach((st, idx) => {
      const sx = 25 + idx * 82, sy = 186;
      g.fillStyle = 'rgba(14, 116, 144, 0.3)'; g.fillRect(sx, sy, 76, 24);
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1; g.strokeRect(sx, sy, 76, 24);
      g.fillStyle = '#ffffff'; mono(g, 7, 'bold'); g.fillText(st, sx + 4, sy + 15);
      if (idx < 3) {
        g.fillStyle = '#38bdf8'; mono(g, 8, ''); g.fillText('▶', sx + 74, sy + 15);
      }
    });

    // Extracted JSON structure
    g.fillStyle = 'rgba(4, 16, 26, 0.8)'; g.fillRect(25, 222, 325, 55);
    g.strokeStyle = 'rgba(56, 189, 248, 0.4)'; g.lineWidth = 1; g.strokeRect(25, 222, 325, 55);
    g.fillStyle = '#4ade80'; mono(g, 8, '');
    g.fillText('{"FB_PUBLIC_LOAD_DATA_": [', 35, 235);
    g.fillText('  [12948194, "Q1_TITLE", 0, [ [101, ["OPTION_A", "OPTION_B"]] ] ],', 35, 248);
    g.fillText('  [94829102, "Q2_NUMERIC", 1, [ [102, "entry.94829102"] ] ] ]}', 35, 262);

    // Concurrency Worker Pool & Token Bucket
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 290); g.lineTo(355, 290); g.stroke();
    g.fillStyle = '#93c5fd'; mono(g, 9, 'bold');
    g.fillText('3. TOKEN-BUCKET RATE LIMITER & WORKER POOL:', 15, 308);

    // Token Bucket icon
    g.strokeStyle = '#fbbf24'; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(40, 325); g.lineTo(50, 370); g.lineTo(80, 370); g.lineTo(90, 325);
    g.stroke();
    g.fillStyle = 'rgba(251, 191, 36, 0.3)';
    g.beginPath(); g.arc(65, 350, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fbbf24'; mono(g, 7, 'bold'); g.fillText('TOKENS', 52, 353);

    // Workers flow
    g.fillStyle = '#e0f2fe'; mono(g, 8, '');
    g.fillText('ASYNCIO COROUTINES: N = 250 CONCURRENT', 110, 335);
    g.fillText('REFILL RATE: ρ = 60 req/sec', 110, 352);
    g.fillText('CAPACITY: C = 100 burst tokens', 110, 369);

    g.fillStyle = 'rgba(14, 116, 144, 0.3)'; g.fillRect(25, 386, 325, 28);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 1; g.strokeRect(25, 386, 325, 28);
    g.fillStyle = '#4ade80'; mono(g, 8, 'bold');
    g.fillText('HIGH-THROUGHPUT LOAD TESTING & CONCURRENCY BENCHMARKING', 30, 404);
    g.restore();
  }

  function drawGenericTechDiagram(g, p, x, y, w, h) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#7dd3fc'; mono(g, 10, 'bold');
    g.fillText('FIGURE 1.0 : SYSTEM TOPOLOGY & ARCHITECTURE', 10, 16);

    // Pipeline nodes
    const steps = ['INGESTION', 'FEATURE STORE', 'CORE MODEL', 'INFERENCE BUS'];
    steps.forEach((st, idx) => {
      const sy = 40 + idx * 80;
      g.fillStyle = 'rgba(14, 116, 144, 0.25)'; g.fillRect(35, sy, 140, 42);
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1.4; g.strokeRect(35, sy, 140, 42);
      g.fillStyle = '#ffffff'; mono(g, 9, 'bold'); g.fillText(st, 45, sy + 25);

      if (idx < 3) {
        g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(105, sy + 42); g.lineTo(105, sy + 80); g.stroke();
        g.fillStyle = '#38bdf8'; g.fillText('▼', 101, sy + 66);
      }
    });

    // Right details
    g.fillStyle = '#bae6fd'; mono(g, 9, '');
    g.fillText('ARCHITECTURAL METRICS:', 200, 55);
    g.fillText('• Language: ' + (p.stats?.lang || 'Polyglot'), 200, 80);
    g.fillText('• Architecture: Monorepo', 200, 105);
    g.fillText('• Runtime: Zero-Raster PBR', 200, 130);
    g.fillText('• Verification: Automated', 200, 155);

    g.restore();
  }

  function drawProjectDiagram(g, p, x, y, w, h) {
    const id = (p.id || p.repo_full || '').toLowerCase();
    if (id.includes('cave')) drawCaveDiagram(g, x, y, w, h);
    else if (id.includes('argus')) drawArgusDiagram(g, x, y, w, h);
    else if (id.includes('cryptograph')) drawCryptoGraphDiagram(g, x, y, w, h);
    else if (id.includes('physionet')) drawPhysioNetDiagram(g, x, y, w, h);
    else if (id.includes('respiratory') || id.includes('ventilator')) drawVentilatorDiagram(g, x, y, w, h);
    else if (id.includes('document') || id.includes('insight')) drawInsightEngineDiagram(g, x, y, w, h);
    else if (id.includes('form') || id.includes('responder')) drawFormDispatcherDiagram(g, x, y, w, h);
    else drawGenericTechDiagram(g, p, x, y, w, h);
  }

  const sheetGroup = new THREE.Group();
  const DESK = { w: 1.4, d: 0.8 };
  const sheets = new Map();
  let rs1g = null;

  function defaultLayout(i, n) {
    // 7 blueprints: 4 in front row, 3 in back row, arranged neatly across the desk
    if (i < 4) {
      const u = (i - 1.5) / 1.5; // -1.0, -0.33, +0.33, +1.0
      return {
        x: u * 0.54,
        z: 0.09 + Math.abs(u) * 0.02,
        rot: u * 0.08
      };
    } else {
      const u = (i - 5.0) / 1.0; // -1.0, 0.0, +1.0
      return {
        x: u * 0.38,
        z: -0.16 + Math.abs(u) * 0.02,
        rot: u * 0.05
      };
    }
  }

  function sheetCanvas(p) {
    const cnv = document.createElement('canvas'); cnv.width = 768; cnv.height = 528;
    const draw = () => {
      const g = cnv.getContext('2d');
      g.fillStyle = '#081e3e'; g.fillRect(0, 0, 768, 528);

      // Technical grids
      gridLines(g, 768, 528, 24, 'rgba(28, 86, 158, 0.32)');
      gridLines(g, 768, 528, 96, 'rgba(45, 120, 215, 0.42)');

      // Double outer engineering border
      g.strokeStyle = '#38bdf8'; g.lineWidth = 2.5; g.strokeRect(14, 14, 740, 500);
      g.strokeStyle = 'rgba(56, 189, 248, 0.6)'; g.lineWidth = 1; g.strokeRect(20, 20, 728, 488);

      // Corner crosshairs (+)
      const cross = (cx, cy) => {
        g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(cx - 8, cy); g.lineTo(cx + 8, cy);
        g.moveTo(cx, cy - 8); g.lineTo(cx, cy + 8);
        g.stroke();
      };
      cross(14, 14); cross(754, 14); cross(14, 514); cross(754, 514);

      // Ruler graduation marks along top & left
      g.strokeStyle = 'rgba(56, 189, 248, 0.4)'; g.lineWidth = 1;
      mono(g, 9, ''); g.fillStyle = 'rgba(186, 230, 253, 0.6)';
      for (let x = 44, idx = 1; x < 740; x += 48, idx++) {
        g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 20); g.stroke();
        g.fillText(String(idx).padStart(2, '0'), x - 5, 12);
      }
      for (let y = 44, idx = 1; y < 500; y += 48, idx++) {
        g.beginPath(); g.moveTo(14, y); g.lineTo(20, y); g.stroke();
        g.fillText(String.fromCharCode(64 + idx), 4, y + 3);
      }

      // Top header banner
      g.fillStyle = 'rgba(8, 30, 62, 0.85)'; g.fillRect(21, 21, 726, 36);
      g.fillStyle = '#38bdf8'; mono(g, 15, 'bold'); g.fillText('ARCHITECTURAL SCHEMATIC // SECTOR RS-01', 34, 45);
      mono(g, 11, ''); g.fillStyle = 'rgba(186, 230, 253, 0.85)'; g.fillText('CLASSIFICATION: REPO_BLUEPRINT // ENGINE V3', 420, 45);
      g.strokeStyle = '#2563eb'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(21, 57); g.lineTo(747, 57); g.stroke();

      // Divider between schematic (left) and metadata (right)
      g.strokeStyle = 'rgba(56, 189, 248, 0.4)'; g.beginPath(); g.moveTo(405, 57); g.lineTo(405, 508); g.stroke();

      // Left pane: Rich Technical Diagram Sketch
      drawProjectDiagram(g, p, 24, 65, 376, 435);

      // Right pane: Title & Specifications
      mono(g, 12, 'bold'); g.fillStyle = '#38bdf8'; g.fillText((p.source || 'GITHUB REPOSITORY').toUpperCase(), 420, 84);
      mono(g, 22, 'bold'); g.fillStyle = '#ffffff'; g.fillText(p.title.toUpperCase(), 420, 114);
      g.strokeStyle = '#2563eb'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(420, 124); g.lineTo(726, 124); g.stroke();

      mono(g, 13, ''); g.fillStyle = '#bae6fd'; wrapText(g, p.tagline ?? '', 420, 148, 305, 18);

      // Tags badges
      if (p.tags && p.tags.length) {
        let tx = 420, ty = 230;
        mono(g, 11, '');
        for (const tg of p.tags.slice(0, 6)) {
          const tw = g.measureText(tg).width + 16;
          if (tx + tw > 726) { tx = 420; ty += 24; }
          g.strokeStyle = 'rgba(56, 189, 248, 0.5)'; g.strokeRect(tx, ty - 14, tw, 20);
          g.fillStyle = 'rgba(14, 116, 144, 0.25)'; g.fillRect(tx, ty - 14, tw, 20);
          g.fillStyle = '#e0f2fe'; g.fillText(tg, tx + 8, ty);
          tx += tw + 8;
        }
      }

      // Interactive GitHub Hyperlink Action Banner
      const ghBtnX = 420, ghBtnY = 286, ghBtnW = 308, ghBtnH = 48;
      g.fillStyle = 'rgba(14, 116, 144, 0.35)'; g.fillRect(ghBtnX, ghBtnY, ghBtnW, ghBtnH);
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1.8; g.strokeRect(ghBtnX, ghBtnY, ghBtnW, ghBtnH);
      g.fillStyle = '#38bdf8'; g.fillRect(ghBtnX, ghBtnY, ghBtnW, 3); // top accent line
      g.fillStyle = '#ffffff'; mono(g, 12, 'bold');
      g.fillText('↗  OPEN REPOSITORY ON GITHUB', ghBtnX + 14, ghBtnY + 22);
      g.fillStyle = '#7dd3fc'; mono(g, 10, '');
      const repoUrlClean = p.repo_full || (p.id ? p.id.replace(/^gh:/, '') : 'github');
      g.fillText(`github.com/${repoUrlClean}`, ghBtnX + 14, ghBtnY + 39);

      // Engineering Title Block (bottom-right)
      const bx = 420, by = 356, bw = 308, bh = 132;
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.strokeRect(bx, by, bw, bh);
      g.fillStyle = 'rgba(8, 30, 62, 0.9)'; g.fillRect(bx, by, bw, bh);
      g.strokeStyle = 'rgba(56, 189, 248, 0.4)'; g.lineWidth = 1;
      g.beginPath();
      g.moveTo(bx, by + 33); g.lineTo(bx + bw, by + 33);
      g.moveTo(bx, by + 66); g.lineTo(bx + bw, by + 66);
      g.moveTo(bx, by + 99); g.lineTo(bx + bw, by + 99);
      g.moveTo(bx + 154, by + 33); g.lineTo(bx + 154, by + 99);
      g.stroke();

      mono(g, 11, ''); g.fillStyle = '#7dd3fc'; g.fillText('REPO:', bx + 8, by + 21);
      g.fillStyle = '#ffffff'; mono(g, 11, 'bold'); g.fillText((p.repo_full || p.id).slice(0, 26), bx + 55, by + 21);

      mono(g, 11, ''); g.fillStyle = '#7dd3fc'; g.fillText(`LANG: ${p.stats?.lang || 'SYSTEM'}`, bx + 8, by + 54);
      g.fillStyle = '#38bdf8'; g.fillText(`★ ${p.stats?.stars ?? 0}   ⑂ ${p.stats?.forks ?? 0}`, bx + 162, by + 54);

      const fresh = p.stats?.lastCommitAt && (Date.now() - new Date(p.stats.lastCommitAt)) < 48 * 3600e3;
      g.fillStyle = fresh ? '#4ade80' : '#38bdf8'; mono(g, 11, 'bold'); g.fillText(fresh ? '● ACTIVE REPO' : '○ STABLE PROD', bx + 8, by + 87);
      g.fillStyle = '#94a3b8'; mono(g, 11, ''); g.fillText('REV: 2.6 // PBR', bx + 162, by + 87);

      g.fillStyle = '#93c5fd'; mono(g, 10, ''); g.fillText('ARCHITECT: PRIYANSH GADIA // VAULT-01', bx + 8, by + 120);

      if (cnv.__tex) cnv.__tex.needsUpdate = true;
    };
    const tex = new THREE.CanvasTexture(cnv); tex.colorSpace = THREE.SRGBColorSpace; cnv.__tex = tex; draw();
    return { cnv, tex, redraw: draw };
  }

  function buildSheet(p, i, n) {
    const { tex, redraw } = sheetCanvas(p);
    const g = new THREE.Group();

    // Dark paper drop shadow / backing
    const shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(.426, .296),
      new THREE.MeshBasicMaterial({ color: 0x020509, transparent: true, opacity: 0.5, depthWrite: false })
    );
    shadowMesh.position.set(0, 0, -0.0006);
    g.add(shadowMesh);

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(.42, .29), blueprintPaperMat(tex));
    plane.userData = { interactive: true, sector: 'RS1', projectId: p.id };
    g.add(plane); hits.push(plane);

    const d = defaultLayout(i, n);
    const baseRot = d.rot ?? 0;
    const baseQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, baseRot, 0, 'YXZ'));
    g.position.set(d.x, 0.003 + i * 0.002, d.z);
    g.quaternion.copy(baseQuat);
    sheetGroup.add(g);
    sheets.set(p.id, { group: g, plane, redraw, project: p, basePos: g.position.clone(), baseRot, baseQuat });
    return g;
  }

  const DEFAULT_BLUEPRINTS = [
    {
      id: 'gh:PriyanshGadia/Cave',
      source: 'github',
      repo_full: 'PriyanshGadia/Cave',
      url: 'https://github.com/PriyanshGadia/Cave',
      title: 'Cave',
      tagline: 'VAULT-01 real-time procedural WebGL engine. Zero raster images, 60 FPS PBR renderer with Cook-Torrance BRDF & raymarched SDF.',
      tags: ['WebGL', 'Three.js', 'Procedural PBR', 'Zero-Raster', 'GLSL'],
      stats: { stars: 12, forks: 2, lang: 'TypeScript' }
    },
    {
      id: 'gh:PriyanshGadia/Argus',
      source: 'github',
      repo_full: 'PriyanshGadia/Argus',
      url: 'https://github.com/PriyanshGadia/Argus',
      title: 'Argus',
      tagline: 'Quantitative trading execution engine. Mamba-3 SSM discretization, GAT asset correlation & HRP risk budgeting.',
      tags: ['Mamba-3 SSM', 'Graph Attention', 'HRP', 'SEBI Compliant', 'PyTorch'],
      stats: { stars: 8, forks: 1, lang: 'Python' }
    },
    {
      id: 'gh:PriyanshGadia/physionet2026-unchartered-iitian',
      source: 'github',
      repo_full: 'PriyanshGadia/physionet2026-unchartered-iitian',
      url: 'https://github.com/PriyanshGadia/physionet2026-unchartered-iitian',
      title: 'PhysioNet 2026',
      tagline: 'Multimodal sleep-staging & 12-lead ECG foundation model. Wavelet spectrograms with dual-layer age residualization.',
      tags: ['12-Lead ECG', 'EEG Spectrogram', 'Residualization', 'Bioinformatics', 'PyTorch'],
      stats: { stars: 15, forks: 3, lang: 'Python' }
    },
    {
      id: 'gh:PriyanshGadia/CryptoGraph_Analytics',
      source: 'github',
      repo_full: 'PriyanshGadia/CryptoGraph_Analytics',
      url: 'https://github.com/PriyanshGadia/CryptoGraph_Analytics',
      title: 'CryptoGraph',
      tagline: 'Spatio-temporal GCN for cryptocurrency market microstructure & L2 order-book depth dynamics.',
      tags: ['ST-GCN', 'Spectral Graph', 'L2 Order Book', 'Redis Stream', 'FastAPI'],
      stats: { stars: 6, forks: 0, lang: 'Python' }
    },
    {
      id: 'gh:PriyanshGadia/Respiratory-Support-Optimization',
      source: 'github',
      repo_full: 'PriyanshGadia/Respiratory-Support-Optimization',
      url: 'https://github.com/PriyanshGadia/Respiratory-Support-Optimization',
      title: 'Ventilator AI',
      tagline: 'Closed-loop adaptive mechanical ventilation & patient-ventilator asynchrony detection on 50,920 MIMIC-IV records.',
      tags: ['MIMIC-IV', 'Equation of Motion', 'PEEP Control', 'Asynchrony Detection', 'Python'],
      stats: { stars: 10, forks: 2, lang: 'Python' }
    },
    {
      id: 'gh:PriyanshGadia/Intelligent-Document-Processing-And-Insight-Engine',
      source: 'github',
      repo_full: 'PriyanshGadia/Intelligent-Document-Processing-And-Insight-Engine',
      url: 'https://github.com/PriyanshGadia/Intelligent-Document-Processing-And-Insight-Engine',
      title: 'Insight Engine',
      tagline: 'LayoutLMv3 multimodal document intelligence engine with 2D spatial cross-attention & semantic vector caching.',
      tags: ['LayoutLMv3', 'Spatial Bounding Box', 'Vector RAG', 'OCR Pipeline', 'Python'],
      stats: { stars: 9, forks: 1, lang: 'Python' }
    },
    {
      id: 'gh:PriyanshGadia/Google-Forms-Bulk-Responder',
      source: 'github',
      repo_full: 'PriyanshGadia/Google-Forms-Bulk-Responder',
      url: 'https://github.com/PriyanshGadia/Google-Forms-Bulk-Responder',
      title: 'Form Dispatcher',
      tagline: 'High-throughput HTTP/2 multiplexed concurrency load-testing engine with AST schema reverse-engineering.',
      tags: ['HTTP/2 Multiplex', 'AST Parser', 'Token Bucket', 'AsyncIO', 'Concurrency'],
      stats: { stars: 14, forks: 4, lang: 'Python' }
    }
  ];

  async function initRS1() {
    let projects = [];
    try {
      const res = await fetch('/api/projects');
      if (res.ok) projects = await res.json();
    } catch {}
    if (!projects || !projects.length) {
      projects = DEFAULT_BLUEPRINTS;
    }
    if (!projects || !projects.length) {
      const phCanvas = document.createElement('canvas'); phCanvas.width = 768; phCanvas.height = 528;
      const g = phCanvas.getContext('2d');
      g.fillStyle = '#081e3e'; g.fillRect(0, 0, 768, 528);
      gridLines(g, 768, 528, 24, 'rgba(28, 86, 158, 0.32)');
      gridLines(g, 768, 528, 96, 'rgba(45, 120, 215, 0.42)');
      g.strokeStyle = '#38bdf8'; g.lineWidth = 2.5; g.strokeRect(14, 14, 740, 500);
      g.strokeStyle = 'rgba(56, 189, 248, 0.6)'; g.lineWidth = 1; g.strokeRect(20, 20, 728, 488);
      g.fillStyle = '#e0f2fe'; mono(g, 26, 'bold'); g.fillText('PROJECT INDEX // ARCHITECTURAL ARCHIVE', 40, 70);
      mono(g, 16, ''); g.fillStyle = '#93c5fd';
      g.fillText('NO APPROVED PROJECTS PUBLISHED YET', 40, 130);
      g.fillText('SYNC LINK: GITHUB REPOSITORIES PENDING', 40, 165);
      g.fillStyle = '#38bdf8';
      g.fillText('CANONICAL SOURCE: GITHUB.COM/PRIYANSHGADIA', 40, 470);
      const phTex = new THREE.CanvasTexture(phCanvas); phTex.colorSpace = THREE.SRGBColorSpace;
      const phGroup = new THREE.Group();
      const phMesh = new THREE.Mesh(new THREE.PlaneGeometry(.65, .44), blueprintPaperMat(phTex));
      phMesh.userData = { interactive: false, sector: 'RS1', projectId: '__placeholder__' };
      phGroup.add(phMesh);
      phGroup.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0, 'YXZ'));
      phGroup.position.set(0, .01, 0);
      sheetGroup.add(phGroup); hits.push(phMesh);
      return;
    }
    projects.forEach((p, i) => buildSheet(p, i, projects.length));
  }

  {
    rs1g = sectorGroup(1, 3.95);                                                 // RS1 · blueprints + clamp lamp
    rs1g.add(sheetGroup);
    initRS1();
    const arm = add(cyl(.014, .014, .7, tit, 8), -.7, .34, -.35, rs1g); arm.rotation.z = .5;
    const head = add(new THREE.Mesh(new THREE.ConeGeometry(.09, .13, 14, 1, true), compD), -.38, .62, -.35, rs1g); head.rotation.z = 1.9;
    const hl = E(0xffd39a); add(cyl(.06, .06, .01, hl, 14), -.33, .6, -.35, rs1g).rotation.z = 1.9;
    leds.push({ m: hl, target: 3, t0: T.power[0] + 2.4 }); tag(rs1g, 'RS1'); heroGroups.push({ id: 'RS1', group: rs1g });
  }

  // ── RS2 · Resume Fabricator Terminal & Procedural State ──
  const DEFAULT_RESUME_ITEMS = [
    // Education
    {
      id: 'edu:iitg',
      kind: 'education',
      title: 'IIT Guwahati — B.Sc. (Hons) Data Science & AI',
      summary: 'CPI: 9.25/10.0 (Upto Trimester VIII, peak 9.77 in Tri V) · Enrolled in 10th Trimester · Coursework: ML, Statistical Inference, Linear Algebra, Optimization, DSA, Stochastic Processes.',
      proof_url: 'https://iitg.ac.in/acad/admission/online/Bsc_DSAI_Curriculum.pdf',
      proof_type: 'transcript',
      issuer: 'IIT Guwahati',
      date_from: '2023-10',
      date_to: '2027-08',
      tags: ['Data Science', 'AI', 'Machine Learning', 'Optimization', 'IIT'],
      weight: 100
    },
    {
      id: 'edu:djsce',
      kind: 'education',
      title: 'DJSCE — B.Tech (Hons) Mechanical & Robotics',
      summary: 'CGPA: 8.23/10.0 (Upto Sem VI) · Enrolled in 7th Semester · Grade O in AI/ML, CAD/CAM & FEA Labs; Grade A+ in AI & ML · Coursework: Robotics, CAD/CAM, FEA, Thermodynamics.',
      proof_url: 'https://www.djsce.ac.in',
      proof_type: 'transcript',
      issuer: 'DJSCE',
      date_from: '2023-08',
      date_to: '2027-08',
      tags: ['Mechanical Engineering', 'Robotics', 'CAD/CAM', 'Thermodynamics', 'CNC'],
      weight: 95
    },
    {
      id: 'edu:kc-college',
      kind: 'education',
      title: 'K.C. College — Higher Secondary Certificate (HSC)',
      summary: 'Class 12 HSC (2023) · Marks: 452 / 600 · Percentage: 75.33% · Science & Electronics Stream (PCMEEm).',
      proof_url: 'https://kccollege.edu.in',
      proof_type: 'transcript',
      issuer: 'K.C. College',
      date_from: '2021',
      date_to: '2023',
      tags: ['HSC', 'Class 12', 'Academics', 'High School', 'Mathematics'],
      weight: 80
    },
    {
      id: 'edu:activity-school',
      kind: 'education',
      title: 'Activity High School — ICSE Class 10',
      summary: 'Class 10 ICSE (2021) · Marks: 448 / 500 · Percentage: 89.60%.',
      proof_url: 'https://activityhighschool.com',
      proof_type: 'transcript',
      issuer: 'Activity High School',
      date_from: '2019',
      date_to: '2021',
      tags: ['ICSE', 'Class 10', 'Academics', 'School'],
      weight: 75
    },

    // Experience
    {
      id: 'exp:the-key',
      kind: 'experience',
      title: 'The Key — Marketing Operations Intern',
      summary: 'Managed data collection/uploading across retail store owners/staff, liaised with tech-team for app development (Aug–Sep 2022, Mumbai).',
      proof_url: 'https://linkedin.com/in/priyansh-gadia-b7645320b',
      proof_type: 'link',
      issuer: 'The Key',
      date_from: '2022-08',
      date_to: '2022-09',
      tags: ['Marketing Operations', 'App Development', 'Retail Data', 'Coordination'],
      weight: 70
    },
    {
      id: 'exp:rotaract-photo',
      kind: 'experience',
      title: 'Official & Event Photographer — Rotaract Club of KC College',
      summary: 'Appointed Official Photographer for Rotaract Club of KC College AGM 2022. Event Photographer for R.E.D. 2022 (Rotaract Mumbai district youth fest at SPIT Andheri). 4+ years field practice.',
      proof_url: 'https://kccollege.edu.in',
      proof_type: 'link',
      issuer: 'Rotaract Club of KC College / Rotaract Mumbai',
      date_from: '2022-07',
      date_to: '2022-12',
      tags: ['Photography', 'Event Photography', 'Rotaract', 'Creative Media'],
      weight: 72
    },

    // Certifications & Specialized Qualifications
    {
      id: 'cert:oci-ds',
      kind: 'certification',
      title: 'OCI 2025 Certified Data Science Professional',
      summary: 'Oracle University (Oct 2025). Certified in distributed ML training, MLOps model deployment, automated pipelines, and cloud adapters.',
      proof_url: 'https://catalog-education.oracle.com/ords/certview/sharebadge?id=045EC65FDEB4B83DAFF5596C9995FB467E12374A19E8627EA37A14267A0E737B',
      proof_type: 'credential',
      issuer: 'Oracle University',
      date_from: '2025-10',
      date_to: '2025-10',
      tags: ['Oracle Cloud', 'Data Science', 'MLOps', 'Pipelines', 'Infrastructure'],
      weight: 98
    },
    {
      id: 'cert:citi-program',
      kind: 'certification',
      title: 'CITI Program — Human Research / Data & Specimens',
      summary: 'MIT Affiliate (Jul 2025). Certified protocol in clinical trial data management, human subject protections, HIPAA, and ethics.',
      proof_url: 'https://www.citiprogram.org/verify/?k56a0e057-078f-4fcb-931c-35d6abd67ca3-70963231',
      proof_type: 'credential',
      issuer: 'MIT Affiliate / CITI',
      date_from: '2025-07',
      date_to: '2025-07',
      tags: ['CITI Program', 'Human Subjects', 'MIT Affiliate', 'Clinical Ethics', 'MIMIC-IV'],
      weight: 90
    },
    {
      id: 'cert:michiganx-py4e',
      kind: 'certification',
      title: 'University of Michigan — Programming for Everybody (Python)',
      summary: 'Verified Certificate in Python programming foundations, data structures, conditional execution, and algorithm design from Univ. of Michigan / edX. Verification ID: cb80bebc7b7044fe85f6a17f2282e12e.',
      proof_url: 'https://courses.edx.org/certificates/cb80bebc7b7044fe85f6a17f2282e12e',
      proof_type: 'credential',
      issuer: 'University of Michigan / edX',
      date_from: '2021',
      date_to: '2021',
      tags: ['Python', 'Programming', 'University of Michigan', 'edX', 'Computer Science'],
      weight: 88
    },
    {
      id: 'cert:glasgow-cdss',
      kind: 'certification',
      title: 'University of Glasgow — Data Mining of Clinical Databases',
      summary: 'Clinical Decision Support Systems (CDSS) & large-scale ICU EHR data mining certification (Jul 2025).',
      proof_url: 'https://www.gla.ac.uk',
      proof_type: 'credential',
      issuer: 'University of Glasgow',
      date_from: '2025-07',
      date_to: '2025-07',
      tags: ['Clinical AI', 'EHR', 'CDSS', 'Healthcare', 'Data Mining', 'Glasgow'],
      weight: 85
    },
    {
      id: 'cert:glasgow-dl-ehr',
      kind: 'certification',
      title: 'University of Glasgow — Deep Learning in EHR',
      summary: 'Advanced deep learning models for longitudinal electronic health records, temporal sequence modeling, and clinical risk prediction (2026).',
      proof_url: 'https://www.gla.ac.uk',
      proof_type: 'credential',
      issuer: 'University of Glasgow',
      date_from: '2026',
      date_to: '2026',
      tags: ['Deep Learning', 'EHR', 'Clinical ML', 'Glasgow', 'Bioinformatics'],
      weight: 84
    },

    // Projects
    {
      id: 'proj:cryptograph',
      kind: 'project',
      title: 'CryptoGraph Analytics — Ensemble Trading Platform',
      summary: 'Full-stack platform ingesting Binance feeds across 100+ crypto assets. ST-GCN x LSTM x NeuralProphet ensemble with Mixture-of-Agents swarm & LLaMA 3.3.',
      proof_url: 'https://github.com/PriyanshGadia',
      proof_type: 'repo',
      issuer: 'Self-Directed',
      date_from: '2024',
      date_to: 'Present',
      tags: ['Graph Neural Networks', 'PyTorch', 'FastAPI', 'Next.js 14', 'WebSockets', 'ST-GCN'],
      weight: 100
    },
    {
      id: 'proj:rso',
      kind: 'project',
      title: 'Respiratory Support Optimization — Biomedical ML',
      summary: '3-phase study detecting clinically invisible ICU pressure transients across 50,920 MIMIC-IV patient records with esophageal pressure ground truth under LOPO.',
      proof_url: 'https://github.com/PriyanshGadia/Respiratory-Support-Optimization',
      proof_type: 'repo',
      issuer: 'Biomedical ML',
      date_from: '2025-12',
      date_to: 'Present',
      tags: ['Biomedical ML', 'Physiological Waveforms', 'MIMIC-IV', 'SciPy', 'ICU Ventilator'],
      weight: 98
    },
    {
      id: 'proj:idp',
      kind: 'project',
      title: 'Intelligent Document Processing & Insight Engine',
      summary: 'Document intelligence with TF-IDF/XGBoost routing, LayoutLMv3 table extraction, DistilBERT sentiment, LLM streaming, and LRU cache (~150MB cold start).',
      proof_url: 'https://github.com/PriyanshGadia',
      proof_type: 'repo',
      issuer: 'Enterprise AI',
      date_from: '2025',
      date_to: '2026',
      tags: ['LayoutLMv3', 'FastAPI', 'XGBoost', 'DistilBERT', 'Document AI', 'Ollama'],
      weight: 92
    },
    {
      id: 'proj:tesla-prophet',
      kind: 'project',
      title: 'Tesla Stock Price Prediction using Facebook Prophet',
      summary: 'Facebook Prophet model forecasting Tesla stock price 30 days into the future, evaluated using automated Google Finance pipelines (Apr 2025).',
      proof_url: 'https://coursera.org/verify/U1T7WE8IW6BT',
      proof_type: 'credential',
      issuer: 'Coursera Project',
      date_from: '2025-04',
      date_to: '2025-04',
      tags: ['Facebook Prophet', 'Time-Series', 'Google Finance', 'Tesla', 'Forecasting'],
      weight: 88
    },
    {
      id: 'proj:forms-bulk',
      kind: 'project',
      title: 'Google Forms Bulk Responder',
      summary: 'Reverse engineered Google Form schemas to submit high-concurrency randomized responses for load testing and test data generation (Jan 2026).',
      proof_url: 'https://github.com/PriyanshGadia/Google-Forms-Bulk-Responder',
      proof_type: 'repo',
      issuer: 'Automation Tool',
      date_from: '2026-01',
      date_to: 'Present',
      tags: ['Automation', 'Reverse Engineering', 'Load Testing', 'Python', 'Testing'],
      weight: 85
    },
    {
      id: 'proj:argus',
      kind: 'project',
      title: 'Argus — Quantitative & RegTech OS',
      summary: '11-package monorepo for quant asset management: feature store (path signatures, rough vol), alpha models (Mamba-3 + GAT), and strict anti-overfitting (DSR/PBO).',
      proof_url: 'https://github.com/PriyanshGadia/Argus',
      proof_type: 'repo',
      issuer: 'Quant Research',
      date_from: '2025',
      date_to: 'Present',
      tags: ['Quantitative Finance', 'PyTorch', 'Mamba', 'GAT', 'Risk Budgeting', 'RegTech'],
      weight: 98
    },
    {
      id: 'proj:physionet',
      kind: 'project',
      title: 'PhysioNet Challenge 2026 — Cognitive Impairment Prediction',
      summary: 'Predicting cognitive impairment across 6,600 PSG records (3 hospital sites); extracted 120+ sleep/EEG/HRV features with dual-layer age residualization (fage_z + post-hoc gamma) in Dockerized pipeline.',
      proof_url: 'https://github.com/PriyanshGadia',
      proof_type: 'repo',
      issuer: 'PhysioNet / CinC',
      date_from: '2026',
      date_to: 'Present',
      tags: ['PhysioNet', 'LightGBM', 'XGBoost', 'Docker', 'Biomedical ML', 'Sleep EEG'],
      weight: 96
    },
    {
      id: 'proj:gpt2',
      kind: 'project',
      title: 'GPT-2 From Scratch — Autoregressive Transformer in PyTorch',
      summary: 'Autoregressive transformer architecture (multi-head causal self-attention, learned positional embeddings, layer normalization, causal masking) implemented end-to-end in pure PyTorch.',
      proof_url: 'https://github.com/PriyanshGadia',
      proof_type: 'repo',
      issuer: 'Deep Learning Research',
      date_from: '2024',
      date_to: '2024',
      tags: ['PyTorch', 'Transformers', 'GPT-2', 'Attention', 'Deep Learning'],
      weight: 90
    },
    {
      id: 'proj:cave',
      kind: 'project',
      title: 'Cave — VAULT-01 Procedural 3D WebGL Engine',
      summary: 'Real-time procedural WebGL engine built without raster assets. Custom GLSL PBR shader stack, raymarched volumetric fog, 60+ FPS tabletop cyberdecks.',
      proof_url: 'https://github.com/PriyanshGadia/Cave',
      proof_type: 'repo',
      issuer: 'Computer Graphics',
      date_from: '2026',
      date_to: 'Present',
      tags: ['WebGL', 'Three.js', 'GLSL', 'PBR', 'Procedural Geometry'],
      weight: 86
    },

    // Skills & Technical Competencies
    {
      id: 'skill:languages',
      kind: 'skill',
      title: 'Languages: Python, SQL, C, C++, Java, R, MATLAB, TypeScript',
      summary: 'Production proficiency across Python, SQL (PostgreSQL, SQLite), C, C++, Java, R, MATLAB, TypeScript, and modern JavaScript.',
      proof_url: 'https://github.com/PriyanshGadia',
      proof_type: 'repo',
      issuer: 'Core Languages',
      date_from: '2021',
      date_to: 'Present',
      tags: ['Python', 'SQL', 'C++', 'Java', 'R', 'MATLAB', 'TypeScript'],
      weight: 100
    },
    {
      id: 'skill:ml-analytics',
      kind: 'skill',
      title: 'ML & Analytics: PyTorch, scikit-learn, XGBoost, LSTM, ST-GCN, SHAP',
      summary: 'Deep neural network architectures (ST-GCN, LSTM, NeuralProphet), model explainability (SHAP), time-series forecasting, pandas, NumPy, SciPy.',
      proof_url: 'https://github.com/PriyanshGadia',
      proof_type: 'repo',
      issuer: 'Machine Learning',
      date_from: '2022',
      date_to: 'Present',
      tags: ['PyTorch', 'scikit-learn', 'XGBoost', 'LSTM', 'ST-GCN', 'SHAP', 'SciPy'],
      weight: 98
    },
    {
      id: 'skill:frameworks-systems',
      kind: 'skill',
      title: 'Systems & Cloud: FastAPI, Next.js 14, Docker, Redis, WebSockets',
      summary: 'Full-stack production web architectures, async APIs (FastAPI), real-time WebSockets, Redis caching, SQLAlchemy, Prometheus, Sentry observability.',
      proof_url: 'https://github.com/PriyanshGadia',
      proof_type: 'repo',
      issuer: 'Systems & Cloud',
      date_from: '2023',
      date_to: 'Present',
      tags: ['FastAPI', 'Next.js 14', 'Docker', 'Redis', 'WebSockets', 'Observability'],
      weight: 92
    },
    {
      id: 'skill:cad-robotics',
      kind: 'skill',
      title: 'Machine Design & CAD/CAM: Autodesk, Fusion 360, KeyShot, CNC',
      summary: 'Parametric mechanical design, Autodesk Inventor, Fusion 360, KeyShot rendering, CNC machining (milling & lathe), Applied Thermodynamics & Fluid Mechanics.',
      proof_url: 'https://www.djsce.ac.in',
      proof_type: 'link',
      issuer: 'Mechanical & Robotics',
      date_from: '2023',
      date_to: 'Present',
      tags: ['CAD/CAM', 'Autodesk', 'Fusion 360', 'KeyShot', 'CNC', 'Robotics'],
      weight: 90
    },
    {
      id: 'skill:finance-quant',
      kind: 'skill',
      title: 'Quantitative Finance, Valuation & Economical Management',
      summary: 'Quantitative risk budgeting, portfolio valuation, econometric modeling, automated financial forecasting pipelines, and market microstructure analysis.',
      proof_url: 'https://github.com/PriyanshGadia',
      proof_type: 'repo',
      issuer: 'Quantitative Finance',
      date_from: '2023',
      date_to: 'Present',
      tags: ['Financial Valuation', 'Portfolio Analysis', 'Econometrics', 'Risk Management'],
      weight: 88
    },
    {
      id: 'skill:photography',
      kind: 'skill',
      title: 'Photography & Visual Media (Sam Bagli Mentorship, Adobe Suite)',
      summary: '2 years formal photography study under mentor Sam Bagli + 2 years advanced practice & active hobby. Portrait, event, product, nature, sports. Tools: Adobe Lightroom, Photoshop, Canva, Filmora.',
      proof_url: 'https://kccollege.edu.in',
      proof_type: 'link',
      issuer: 'Sam Bagli Mentorship',
      date_from: '2020',
      date_to: 'Present',
      tags: ['Photography', 'Adobe Lightroom', 'Photoshop', 'Canva', 'Filmora', 'Visual Media'],
      weight: 86
    },
    {
      id: 'skill:creative-arts',
      kind: 'skill',
      title: 'Visual Arts & Creative Expression: Sketching, Singing, Dancing',
      summary: 'Fine arts & illustration with dedicated Instagram sketch portfolio. Qualified UCEED 2023 (National Design Entrance Examination). Passionate performer across freehand drawing, vocal singing, and dance.',
      proof_url: 'https://instagram.com',
      proof_type: 'link',
      issuer: 'Creative Arts / UCEED',
      date_from: '2020',
      date_to: 'Present',
      tags: ['Visual Arts', 'Sketching', 'Illustration', 'UCEED', 'Creative Arts'],
      weight: 84
    }
  ];

  const RESUME_TEMPLATES = [
    {
      id: 'quant-research',
      name: 'QUANT / ML RESEARCH',
      accent: '#39d6ff',
      defaults: ['edu:iitg', 'edu:djsce', 'proj:argus', 'proj:cryptograph', 'proj:rso', 'proj:physionet', 'cert:oci-ds', 'cert:citi-program', 'skill:languages', 'skill:ml-analytics', 'skill:finance-quant']
    },
    {
      id: 'fullstack-ai',
      name: 'FULL-STACK AI / PROD',
      accent: '#4dff8a',
      defaults: ['edu:iitg', 'edu:djsce', 'proj:cryptograph', 'proj:idp', 'proj:argus', 'proj:gpt2', 'cert:oci-ds', 'skill:languages', 'skill:ml-analytics', 'skill:frameworks-systems']
    },
    {
      id: 'robotics-mech',
      name: 'ROBOTICS & MECH-ENG',
      accent: '#ffb15c',
      defaults: ['edu:djsce', 'edu:iitg', 'proj:cryptograph', 'proj:rso', 'cert:oci-ds', 'skill:cad-robotics', 'skill:languages', 'skill:ml-analytics']
    },
    {
      id: 'exec-clean',
      name: 'EXECUTIVE / CLEAN',
      accent: '#c084fc',
      defaults: ['edu:iitg', 'edu:djsce', 'edu:kc-college', 'exp:rotaract-photo', 'proj:argus', 'proj:cryptograph', 'cert:oci-ds', 'cert:michiganx-py4e', 'skill:photography', 'skill:creative-arts']
    }
  ];

  const RESUME = {
    items: DEFAULT_RESUME_ITEMS,
    filtered: [],
    selected: new Set([
      'edu:iitg', 'edu:djsce', 'proj:argus', 'proj:cryptograph', 'proj:rso',
      'proj:physionet', 'cert:oci-ds', 'cert:citi-program',
      'skill:languages', 'skill:ml-analytics', 'skill:finance-quant'
    ]),
    template: 'quant-research',
    category: 'all',
    query: '',
    typing: false,
    scroll: 0,
    busy: false
  };

  function applyResumeFilter() {
    const q = RESUME.query.trim().toLowerCase();
    const cat = RESUME.category;
    RESUME.filtered = RESUME.items.filter(it => {
      if (cat !== 'all' && it.kind !== cat) return false;
      if (!q) return true;
      const t = (it.title || '').toLowerCase();
      const s = (it.summary || '').toLowerCase();
      const iss = (it.issuer || '').toLowerCase();
      const tags = Array.isArray(it.tags) ? it.tags.join(' ').toLowerCase() : '';
      return t.includes(q) || s.includes(q) || iss.includes(q) || tags.includes(q);
    });
  }
  RESUME.setQuery = (q) => {
    RESUME.query = q;
    RESUME.scroll = 0;
    applyResumeFilter();
    if (resumeCanvas) drawResume(resumeCanvas);
    if (resumeTex) resumeTex.needsUpdate = true;
  };
  applyResumeFilter();

  let resumeCanvas, resumeTex;
  let paperMesh, paperCanvas, paperTex;
  const PRINT = { active: false, t: 0 };

  function drawPaperPreview(cnv, items, templateId) {
    if (!cnv) return;
    const g = cnv.getContext('2d'), w = cnv.width, h = cnv.height;
    g.fillStyle = '#f8fafc';
    g.fillRect(0, 0, w, h);

    // Document header
    g.fillStyle = '#0f172a';
    mono(g, 13, 'bold');
    g.fillText('PRIYANSH GADIA', 18, 24);

    g.fillStyle = '#1e3a8a';
    mono(g, 8.5, '');
    g.fillText('DUAL DEGREE: B.Sc. DATA SCIENCE (IITG) · B.Tech ROBOTICS (DJSCE)', 18, 36);

    g.fillStyle = '#94a3b8';
    g.fillRect(18, 42, w - 36, 1);

    let y = 58;
    const sections = ['education', 'projects', 'skills', 'certifications', 'experience'];
    for (const sec of sections) {
      const secItems = items.filter(it => it.kind === sec || (sec === 'skills' && it.kind === 'skill') || (sec === 'projects' && it.kind === 'project') || (sec === 'certifications' && it.kind === 'certification') || (sec === 'education' && it.kind === 'education'));
      if (!secItems.length) continue;
      if (y > h - 40) break;

      g.fillStyle = '#1e3a8a';
      mono(g, 9.5, 'bold');
      g.fillText(sec.toUpperCase(), 18, y);
      g.fillStyle = '#cbd5e1';
      g.fillRect(18, y + 2, w - 36, 0.5);
      y += 14;

      for (const it of secItems.slice(0, 2)) {
        if (y > h - 20) break;
        g.fillStyle = '#0f172a';
        mono(g, 8, 'bold');
        g.fillText('• ' + it.title.slice(0, 36), 20, y);
        y += 11;
        g.fillStyle = '#475569';
        mono(g, 7, '');
        g.fillText(it.summary.slice(0, 44) + '…', 26, y);
        y += 13;
      }
      y += 5;
    }
  }

  function drawResume(cnv) {
    if (!cnv) return;
    const g = cnv.getContext('2d'), w = cnv.width, h = cnv.height;

    // 1. Deep Obsidian Tactical Space Background
    g.fillStyle = '#01050a';
    g.fillRect(0, 0, w, h);

    // Micro cyber-grid overlay (20px fine grid, 80px major grid)
    gridLines(g, w, h, 20, 'rgba(57, 214, 255, 0.035)');
    gridLines(g, w, h, 80, 'rgba(57, 214, 255, 0.07)');

    // Vertex coordinate crosshairs at grid intersections
    g.fillStyle = 'rgba(57, 214, 255, 0.25)';
    mono(g, 6, '');
    for (let gx = 80; gx < w; gx += 160) {
      for (let gy = 80; gy < h; gy += 120) {
        g.fillText('+', gx - 2, gy + 2);
      }
    }

    // Tactical Corner HUD Brackets with registration marks
    g.strokeStyle = '#39d6ff';
    g.lineWidth = 1.5;
    const bk = 14;
    // Top-Left
    g.beginPath(); g.moveTo(8, 8 + bk); g.lineTo(8, 8); g.lineTo(8 + bk, 8); g.stroke();
    g.fillStyle = '#39d6ff'; g.fillRect(10, 10, 2, 2);
    // Top-Right
    g.beginPath(); g.moveTo(w - 8 - bk, 8); g.lineTo(w - 8, 8); g.lineTo(w - 8, 8 + bk); g.stroke();
    g.fillRect(w - 12, 10, 2, 2);
    // Bottom-Left
    g.beginPath(); g.moveTo(8, h - 8 - bk); g.lineTo(8, h - 8); g.lineTo(8 + bk, h - 8); g.stroke();
    g.fillRect(10, h - 12, 2, 2);
    // Bottom-Right
    g.beginPath(); g.moveTo(w - 8 - bk, h - 8); g.lineTo(w - 8, h - 8); g.lineTo(w - 8, h - 8 - bk); g.stroke();
    g.fillRect(w - 12, h - 12, 2, 2);

    // ── Header HUD Banner ──
    // Left: System Identity
    g.fillStyle = '#5fe8ff';
    mono(g, 11, 'bold');
    g.fillText('❖ VAULT-01 // TACTICAL RESUME FABRICATOR // MK-VII', 18, 20);

    // Dynamic telemetry & category counts
    const counts = { all: RESUME.items.length };
    for (const it of RESUME.items) counts[it.kind] = (counts[it.kind] || 0) + 1;

    // Center Telemetry: Diagnostic Readouts
    g.fillStyle = '#3a7288';
    mono(g, 8, '');
    g.fillText(`SYS: D1-SQL // LAT: 0.8ms // ${counts.all} NODES CACHED`, 320, 20);

    // Right: Animated Spectrum Analyzer Bars
    const eqX = w - 170, eqY = 13, eqH = 10;
    for (let bi = 0; bi < 6; bi++) {
      const barAmp = Math.sin(S.t * 4 + bi * 1.2) * 0.5 + 0.5;
      const curH = Math.max(2, Math.floor(barAmp * eqH));
      g.fillStyle = bi > 3 ? '#ff9a3c' : '#39d6ff';
      g.fillRect(eqX + bi * 4, eqY + (eqH - curH), 2.5, curH);
    }

    // Audit status badge
    g.fillStyle = '#35ff7a';
    mono(g, 8.5, 'bold');
    g.fillText('● 100% PROOF-VERIFIED', w - 140, 20);

    // Sleek cyan divider line with center notch
    g.fillStyle = '#103848';
    g.fillRect(18, 27, w - 36, 1);
    g.fillStyle = '#39d6ff';
    g.fillRect(18, 27, 40, 1.5);
    g.fillRect(w - 58, 27, 40, 1.5);

    // ── Search Matrix ──
    const sbX = 18, sbY = 34, sbW = w - 106, sbH = 26;
    g.fillStyle = RESUME.typing ? '#061a26' : '#030e16';
    g.fillRect(sbX, sbY, sbW, sbH);
    g.strokeStyle = RESUME.typing ? '#39d6ff' : '#1b4a5a';
    g.lineWidth = RESUME.typing ? 1.5 : 1;
    g.strokeRect(sbX, sbY, sbW, sbH);

    // Tactical corner ticks on search bar
    g.fillStyle = '#39d6ff';
    g.fillRect(sbX, sbY, 3, 3);
    g.fillRect(sbX + sbW - 3, sbY + sbH - 3, 3, 3);

    g.fillStyle = RESUME.query ? '#ffffff' : (RESUME.typing ? '#a5e8ff' : '#45798e');
    mono(g, 10, '');
    const cursor = (RESUME.typing && (Math.floor(S.t * 3) % 2)) ? '▮' : '';
    const qText = RESUME.query ? RESUME.query : (RESUME.typing ? '' : 'QUERY MATRIX [KEYWORD / TECH / DOMAIN / ROLE]...');
    g.fillText('>_ ' + qText + cursor, sbX + 8, sbY + 17);

    // Search Clear Button [CLR]
    const clrX = w - 82, clrY = sbY, clrW = 64, clrH = sbH;
    g.fillStyle = '#061822';
    g.fillRect(clrX, clrY, clrW, clrH);
    g.strokeStyle = RESUME.query ? '#ff9a3c' : '#22556b';
    g.lineWidth = 1;
    g.strokeRect(clrX, clrY, clrW, clrH);
    g.fillStyle = RESUME.query ? '#ffb366' : '#65a9bf';
    mono(g, 8.5, 'bold');
    g.fillText('CLR ✕', clrX + 16, clrY + 17);

    // ── Template Selection Tabs (4 specialized mission profiles) ──
    const tplTabs = [
      { id: 'quant-research', label: '01 · QUANT / RESEARCH', tag: 'ST-GCN / MIMIC',  x: 18,  w: 146 },
      { id: 'fullstack-ai',   label: '02 · FULL-STACK AI',    tag: 'NEXT14 / REDIS',  x: 170, w: 146 },
      { id: 'robotics-mech',  label: '03 · ROBOTICS / MECH',  tag: 'CAD / CNC / DJS', x: 322, w: 146 },
      { id: 'exec-clean',     label: '04 · EXECUTIVE CLEAN',  tag: 'IITG / DUAL-DEG', x: 474, w: 148 }
    ];

    tplTabs.forEach(t => {
      const active = RESUME.template === t.id;
      g.fillStyle = active ? '#0b2b3a' : '#031018';
      g.fillRect(t.x, 66, t.w, 24);
      g.strokeStyle = active ? '#39d6ff' : '#143644';
      g.lineWidth = active ? 1.5 : 1;
      g.strokeRect(t.x, 66, t.w, 24);

      if (active) {
        g.fillStyle = '#39d6ff';
        g.fillRect(t.x, 88, t.w, 2); // active underline
        // Active indicator pip
        g.fillStyle = '#35ff7a';
        g.fillRect(t.x + 6, 73, 3, 10);
      }

      g.fillStyle = active ? '#ffffff' : '#6293a6';
      mono(g, 8.5, active ? 'bold' : '');
      g.fillText(t.label, t.x + (active ? 14 : 8), 78);

      g.fillStyle = active ? '#39d6ff' : '#356375';
      mono(g, 7, '');
      g.fillText(t.tag, t.x + (active ? 14 : 8), 87);
    });

    // ── Category Filter Sub-System Badges ──
    const catPills = [
      { id: 'all',           label: `SYS: ALL (${counts.all})`,               x: 18,  w: 80 },
      { id: 'experience',    label: `EXP (${counts.experience || 0})`,        x: 104, w: 58 },
      { id: 'project',       label: `PROJECT (${counts.project || 0})`,       x: 168, w: 84 },
      { id: 'certification', label: `CERTS (${counts.certification || 0})`,   x: 258, w: 76 },
      { id: 'education',     label: `EDUC (${counts.education || 0})`,        x: 340, w: 74 },
      { id: 'skill',         label: `SKILLS (${counts.skill || 0})`,          x: 420, w: 78 }
    ];

    catPills.forEach(c => {
      const active = RESUME.category === c.id;
      g.fillStyle = active ? '#184f66' : '#04151f';
      g.fillRect(c.x, 96, c.w, 18);
      g.strokeStyle = active ? '#39d6ff' : '#193f4e';
      g.lineWidth = 1;
      g.strokeRect(c.x, 96, c.w, 18);
      g.fillStyle = active ? '#a5f3ff' : '#528296';
      mono(g, 8, active ? 'bold' : '');
      g.fillText(c.label, c.x + 6, 109);
    });

    // ── Items Table Header Legend ──
    g.fillStyle = '#225367';
    mono(g, 7.5, '');
    g.fillText('STATE   SUBSYS   VERIFIED CLAIM / INSTITUTION / RESEARCH PROJECT / ARCHITECTURE       PROOF GATE ↗', 18, 126);
    g.fillStyle = '#0f2f3d';
    g.fillRect(18, 129, w - 36, 1);

    // ── Items List (6 visible per view) ──
    const visibleCount = 6;
    const itemsToShow = RESUME.filtered.slice(RESUME.scroll, RESUME.scroll + visibleCount);

    itemsToShow.forEach((it, idx) => {
      const rowY = 134 + idx * 35;
      const isSelected = RESUME.selected.has(it.id);

      // Tactical data node card background
      g.fillStyle = isSelected ? '#0b2e40' : '#041824';
      g.fillRect(18, rowY, w - 36, 31);
      g.strokeStyle = isSelected ? '#39d6ff' : '#143c4e';
      g.lineWidth = 1;
      g.strokeRect(18, rowY, w - 36, 31);

      // Card left accent bar
      if (isSelected) {
        g.fillStyle = '#39d6ff';
        g.fillRect(18, rowY, 3, 31);
      } else {
        g.fillStyle = '#143c4e';
        g.fillRect(18, rowY, 2, 31);
      }

      // Checkbox / Armed Toggle
      g.fillStyle = isSelected ? '#35ff7a' : '#45788c';
      mono(g, 9, isSelected ? 'bold' : '');
      g.fillText(isSelected ? '[■ ON]' : '[□ OFF]', 25, rowY + 19);

      // Subsystem Category badge with custom neon color
      const kindColor = it.kind === 'project' ? '#a78bfa' : it.kind === 'skill' ? '#f472b6' : it.kind === 'certification' ? '#34d399' : it.kind === 'education' ? '#38bdf8' : '#fbbf24';
      g.fillStyle = isSelected ? kindColor : '#628a9a';
      mono(g, 8, 'bold');
      const kindBadge = it.kind === 'certification' ? '[CERT]' : it.kind === 'education' ? '[EDUC]' : it.kind === 'experience' ? '[EXP]' : it.kind === 'project' ? '[PROJ]' : '[SKILL]';
      g.fillText(kindBadge, 72, rowY + 19);

      // Title (Line 1)
      g.fillStyle = isSelected ? '#ffffff' : '#b8e2f0';
      mono(g, 9.2, isSelected ? 'bold' : '');
      const maxTitleLen = 46;
      const displayTitle = it.title.length > maxTitleLen ? it.title.slice(0, maxTitleLen - 1) + '…' : it.title;
      g.fillText(displayTitle, 126, rowY + 13);

      // Summary snippet (Line 2)
      g.fillStyle = isSelected ? '#7fe0ff' : '#5c8a9c';
      mono(g, 7.8, '');
      const maxSummaryLen = 64;
      const displaySummary = it.summary.length > maxSummaryLen ? it.summary.slice(0, maxSummaryLen - 1) + '…' : it.summary;
      g.fillText(displaySummary, 126, rowY + 25);

      // Interactive Proof Link Button [PROOF ↗]
      const btnProofX = w - 108, btnProofY = rowY + 5, btnProofW = 84, btnProofH = 21;
      g.fillStyle = '#051d29';
      g.fillRect(btnProofX, btnProofY, btnProofW, btnProofH);
      g.strokeStyle = '#2d6d84';
      g.lineWidth = 1;
      g.strokeRect(btnProofX, btnProofY, btnProofW, btnProofH);
      g.fillStyle = '#5fe8ff';
      mono(g, 8, 'bold');
      g.fillText('PROOF ↗', btnProofX + 16, btnProofY + 15);
    });

    // ── Sci-Fi Scrollbar ──
    if (RESUME.filtered.length > visibleCount) {
      const trackX = w - 14, trackY = 134, trackH = 210;
      g.fillStyle = '#04121a';
      g.fillRect(trackX, trackY, 4, trackH);
      const maxScroll = RESUME.filtered.length - visibleCount;
      const thumbH = Math.max(20, (visibleCount / RESUME.filtered.length) * trackH);
      const thumbY = trackY + (RESUME.scroll / maxScroll) * (trackH - thumbH);
      g.fillStyle = '#39d6ff';
      g.fillRect(trackX, thumbY, 4, thumbH);
    }

    // ── Bottom Action Console & Laser Dispatch ──
    g.fillStyle = '#103848';
    g.fillRect(18, 350, w - 36, 1);

    // Left Telemetry Readout
    g.fillStyle = '#6598aa';
    mono(g, 8.5, '');
    g.fillText(`⚡ ${RESUME.selected.size} NODES ARMED // 0 UNVERIFIED CLAIMS // STRICT CRYPTO-AUDIT`, 20, 375);

    // Right Action Button
    const btnActX = w - 280, btnActY = 356, btnActW = 262, btnActH = 34;
    g.fillStyle = RESUME.busy ? '#ff9a3c' : '#0c3444';
    g.fillRect(btnActX, btnActY, btnActW, btnActH);
    g.strokeStyle = RESUME.busy ? '#ffb15c' : '#39d6ff';
    g.lineWidth = 1.5;
    g.strokeRect(btnActX, btnActY, btnActW, btnActH);

    // Decorative hazard hatch lines on button edge
    g.fillStyle = RESUME.busy ? 'rgba(0,0,0,.2)' : 'rgba(57,214,255,.15)';
    for (let hi = 0; hi < 6; hi++) {
      g.fillRect(btnActX + 6 + hi * 5, btnActY + 4, 2, btnActH - 8);
    }

    g.fillStyle = RESUME.busy ? '#040d12' : '#9ff3ff';
    mono(g, 9.5, 'bold');
    const actText = RESUME.busy ? '… COMPILING & PRINTING' : `▶ EXECUTE LASER PRINT (${RESUME.selected.size})`;
    g.fillText(actText, btnActX + 42, btnActY + 22);

    // ── Laser Deposition HUD Overlay when printing (tactical scan wash, no blackout) ──
    if (PRINT.active) {
      g.fillStyle = 'rgba(2, 16, 28, 0.62)';
      g.fillRect(0, 0, w, h);

      g.strokeStyle = '#39d6ff';
      g.lineWidth = 1.5;
      g.strokeRect(30, 45, w - 60, h - 90);

      const progress = clamp(PRINT.t / 1.4, 0, 1);
      const laserY = 60 + ((Math.sin(S.t * 8) + 1) / 2) * (h - 120);

      // Sweeping beam
      const grad = g.createLinearGradient(0, laserY - 14, 0, laserY + 14);
      grad.addColorStop(0, 'rgba(57, 214, 255, 0)');
      grad.addColorStop(0.5, 'rgba(57, 214, 255, 0.8)');
      grad.addColorStop(1, 'rgba(57, 214, 255, 0)');
      g.fillStyle = grad;
      g.fillRect(32, laserY - 14, w - 64, 28);

      g.strokeStyle = '#ffffff';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(32, laserY);
      g.lineTo(w - 32, laserY);
      g.stroke();

      // Telemetry readouts
      g.fillStyle = '#5fe8ff';
      mono(g, 13, 'bold');
      g.fillText('❖ MOLECULAR LASER FABRICATION ACTIVE', w / 2 - 180, 105);

      g.fillStyle = '#94d8ec';
      mono(g, 9.5, '');
      g.fillText(`SYNTHESIZING PHYSICAL RESUME SPECIMEN [${RESUME.template.toUpperCase()}]`, w / 2 - 160, 130);
      g.fillText(`EMITTER: 450nm SOLID-STATE DIODE // DEPOSITION: 1200 DPI`, w / 2 - 150, 150);

      // Progress bar
      const barX = 120, barY = 190, barW = w - 240, barH = 18;
      g.fillStyle = '#041520';
      g.fillRect(barX, barY, barW, barH);
      g.strokeStyle = '#39d6ff';
      g.lineWidth = 1;
      g.strokeRect(barX, barY, barW, barH);

      g.fillStyle = '#35ff7a';
      g.fillRect(barX + 2, barY + 2, (barW - 4) * progress, barH - 4);

      g.fillStyle = '#ffffff';
      mono(g, 9.5, 'bold');
      g.fillText(`${Math.round(progress * 100)}% FABRICATED`, w / 2 - 42, barY + 13);

      g.fillStyle = '#39d6ff';
      mono(g, 9, '');
      g.fillText('EJECTING SPECIMEN TO CONSOLE APRON TRAY...', w / 2 - 110, 245);
    }
  }

  function downloadBlob(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function cleanWinAnsi(str) {
    if (!str) return '';
    return str
      .replace(/[γΓ]/g, 'gamma')
      .replace(/[αΑ]/g, 'alpha')
      .replace(/[βΒ]/g, 'beta')
      .replace(/[λΛ]/g, 'lambda')
      .replace(/[μΜ]/g, 'mu')
      .replace(/[σΣ]/g, 'sigma')
      .replace(/[θΘ]/g, 'theta')
      .replace(/—/g, '-')
      .replace(/–/g, '-')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[•]/g, '-')
      .replace(/[·]/g, '|')
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
  }

  function wrapPdfText(text, font, size, maxWidth) {
    const safeText = cleanWinAnsi(text);
    const words = safeText.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const w = font.widthOfTextAtSize(testLine, size);
      if (w > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  async function buildResumePdf(selectedItems, template) {
    const PDFLib = window.PDFLib;
    if (!PDFLib) throw new Error('PDFLib not available');
    const { PDFDocument, StandardFonts, rgb, PDFName } = PDFLib;

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);

    let page = doc.addPage([595.28, 841.89]); // A4 standard
    const { width, height } = page.getSize();
    const left = 38;
    const right = width - 38;
    const contentW = right - left;
    let y = height - 34;

    const navy = rgb(0.12, 0.23, 0.54);
    const dark = rgb(0.06, 0.09, 0.16);
    const textGray = rgb(0.2, 0.24, 0.32);
    const lineGray = rgb(0.78, 0.82, 0.88);
    const blueLink = rgb(0.11, 0.31, 0.85);

    function safeDraw(text, opts) {
      const safe = cleanWinAnsi(text);
      page.drawText(safe, opts);
      return safe;
    }

    function addLink(rect, url) {
      if (!url) return;
      try {
        const linkAnnot = doc.context.register(doc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: rect,
          Border: [0, 0, 0],
          A: doc.context.obj({ Type: 'Action', S: 'URI', URI: url }),
        }));
        const existing = page.node.Annots();
        page.node.set(PDFName.of('Annots'), doc.context.obj([...(existing ? existing.asArray() : []), linkAnnot]));
      } catch {}
    }

    function checkPage(needed) {
      if (y - needed < 32) {
        page = doc.addPage([595.28, 841.89]);
        y = height - 34;
      }
    }

    function drawSection(title) {
      checkPage(30);
      y -= 8;
      safeDraw(title, { x: left, y, size: 10.5, font: bold, color: navy });
      y -= 3;
      page.drawLine({
        start: { x: left, y },
        end: { x: right, y },
        thickness: 0.6,
        color: lineGray,
      });
      y -= 10;
    }

    // 1. Header
    const nameStr = 'Priyansh Gadia';
    const nameW = bold.widthOfTextAtSize(nameStr, 22);
    safeDraw(nameStr, { x: (width - nameW) / 2, y, size: 22, font: bold, color: dark });
    y -= 16;

    const tplId = template?.id || 'quant-research';
    const subMap = {
      'quant-research': 'ML Engineer  |  Quantitative Research  |  Full-Stack AI Systems',
      'fullstack-ai': 'Full-Stack AI Engineer  |  Distributed Systems  |  Production ML',
      'robotics-mech': 'Robotics Engineer  |  Autonomous Systems  |  CAD / Mechanical Design',
      'exec-clean': 'Dual-Degree Technologist  |  AI Systems  |  Creative Media',
    };
    const subStr = cleanWinAnsi(subMap[tplId] || subMap['quant-research']);
    const subW = bold.widthOfTextAtSize(subStr, 9.5);
    safeDraw(subStr, { x: (width - subW) / 2, y, size: 9.5, font: bold, color: navy });
    y -= 14;

    const contactStr = cleanWinAnsi('Mumbai, India  |  +91 8104521541  |  gadiapriyansh@gmail.com  |  LinkedIn  |  GitHub');
    const contactW = font.widthOfTextAtSize(contactStr, 8.5);
    safeDraw(contactStr, { x: (width - contactW) / 2, y, size: 8.5, font, color: textGray });

    // Contact clickable links
    const startX = (width - contactW) / 2;
    const emailOff = font.widthOfTextAtSize('Mumbai, India  |  +91 8104521541  |  ', 8.5);
    const emailW = font.widthOfTextAtSize('gadiapriyansh@gmail.com', 8.5);
    addLink([startX + emailOff, y - 2, startX + emailOff + emailW, y + 10], 'mailto:gadiapriyansh@gmail.com');

    const liOff = emailOff + emailW + font.widthOfTextAtSize('  |  ', 8.5);
    const liW = font.widthOfTextAtSize('LinkedIn', 8.5);
    addLink([startX + liOff, y - 2, startX + liOff + liW, y + 10], 'https://linkedin.com/in/priyanshgadia');

    const ghOff = liOff + liW + font.widthOfTextAtSize('  |  ', 8.5);
    const ghW = font.widthOfTextAtSize('GitHub', 8.5);
    addLink([startX + ghOff, y - 2, startX + ghOff + ghW, y + 10], 'https://github.com/PriyanshGadia');
    y -= 4;

    // 2. Summary
    drawSection('SUMMARY');
    const summaryMap = {
      'quant-research': 'Dual-degree engineer (IIT Guwahati 9.25 GPA | DJSCE 8.23 GPA) shipping production AI and quantitative systems end-to-end - from research hypothesis to deployed containerized infrastructure. Architected Argus (institutional quant monorepo with strict DSR/PBO anti-overfitting discipline), CryptoGraph Analytics (live real-time platform forecasting 107 crypto assets), and clinical ML models validated across 50,920 ICU records. Combines deep mathematical rigor (PyTorch, GNNs, state spaces) with enterprise engineering (FastAPI, Docker, Next.js 14) to build robust, high-conviction systems.',
      'fullstack-ai': 'Dual-degree engineer (IIT Guwahati 9.25 GPA | DJSCE 8.23 GPA) engineering enterprise-grade full-stack AI platforms and microservices. Architected CryptoGraph Analytics with real-time WebSocket feeds across 107 crypto assets and Next.js 14 dashboards, and an Intelligent Document Processing engine with 1:1 OCI Cloud Adapter pattern under 150 MB RAM cold start. Expert in async APIs (FastAPI), Redis pub/sub, Dockerized deployments, and production MLOps.',
      'robotics-mech': 'Dual-degree engineer (IIT Guwahati 9.25 GPA | DJSCE 8.23 GPA) bridging advanced robotics, machine learning, and precision mechanical design. Hands-on mastery of parametric CAD/CAM (Autodesk Inventor, Fusion 360), CNC manufacturing, FEA analysis, and autonomous robotics perception (ST-GCN graph neural networks, ROS). Strong academic grounding with Grade O across AI/ML, CAD/CAM, and FEA Laboratories.',
      'exec-clean': 'Dual-degree technologist (IIT Guwahati 9.25 GPA | DJSCE 8.23 GPA) combining deep technical AI rigor with visual media leadership and creative communication. Qualified national UCEED 2023 design exam with dedicated illustration portfolio; official photographer for Rotaract Club of KC College AGM 2022 and R.E.D. 2022 Mumbai youth fest. Proven leadership across cross-functional engineering, production AI, and visual arts.',
    };
    const sumLines = wrapPdfText(summaryMap[tplId] || summaryMap['quant-research'], font, 8.5, contentW);
    for (const l of sumLines) {
      checkPage(12);
      safeDraw(l, { x: left, y, size: 8.5, font, color: textGray });
      y -= 11.2;
    }
    y -= 4;

    // 3. Technical Skills
    const selSkills = selectedItems.filter(i => i.kind === 'skill');
    if (selSkills.length > 0) {
      drawSection('TECHNICAL SKILLS');
      for (const sk of selSkills) {
        checkPage(13);
        const titleSafe = cleanWinAnsi(sk.title + ': ');
        const tW = bold.widthOfTextAtSize(titleSafe, 8.5);
        safeDraw(titleSafe, { x: left, y, size: 8.5, font: bold, color: dark });
        const valLines = wrapPdfText(sk.summary, font, 8.5, contentW - tW);
        safeDraw(valLines[0] || '', { x: left + tW, y, size: 8.5, font, color: textGray });
        y -= 11.5;
        for (let vi = 1; vi < valLines.length; vi++) {
          checkPage(12);
          safeDraw(valLines[vi], { x: left + tW, y, size: 8.5, font, color: textGray });
          y -= 11.5;
        }
      }
      y -= 4;
    }

    // 4. Projects
    const selProjects = selectedItems.filter(i => i.kind === 'project');
    if (selProjects.length > 0) {
      drawSection('PROJECTS');
      for (const p of selProjects) {
        checkPage(28);
        const pTitle = cleanWinAnsi(p.title);
        safeDraw(pTitle, { x: left, y, size: 9.5, font: bold, color: dark });
        let curX = left + bold.widthOfTextAtSize(pTitle, 9.5) + 6;

        if (p.proof_url) {
          const linkLabel = p.proof_type === 'repo' ? '[GitHub]' : '[Proof ↗]';
          safeDraw(linkLabel, { x: curX, y, size: 8.5, font: bold, color: blueLink });
          const lW = bold.widthOfTextAtSize(linkLabel, 8.5);
          addLink([curX, y - 2, curX + lW, y + 10], p.proof_url);
        }
        y -= 11.5;

        // Tags / Tech line
        if (p.tags && p.tags.length) {
          const techStr = cleanWinAnsi(Array.isArray(p.tags) ? p.tags.join(', ') : String(p.tags));
          checkPage(12);
          safeDraw(techStr, { x: left, y, size: 8.2, font: oblique, color: rgb(0.35, 0.4, 0.48) });
          y -= 10.5;
        }

        // Summary bullets
        const pSummaryLines = wrapPdfText(p.summary, font, 8.5, contentW - 14);
        checkPage(12);
        safeDraw('-', { x: left + 2, y, size: 8.5, font: bold, color: navy });
        safeDraw(pSummaryLines[0] || '', { x: left + 12, y, size: 8.5, font, color: textGray });
        y -= 10.8;
        for (let bi = 1; bi < pSummaryLines.length; bi++) {
          checkPage(12);
          safeDraw(pSummaryLines[bi], { x: left + 12, y, size: 8.5, font, color: textGray });
          y -= 10.8;
        }
        y -= 3;
      }
      y -= 2;
    }

    // 5. Education
    const selEdu = selectedItems.filter(i => i.kind === 'education');
    if (selEdu.length > 0) {
      drawSection('EDUCATION');
      for (const ed of selEdu) {
        checkPage(24);
        const edInst = cleanWinAnsi(ed.title);
        safeDraw(edInst, { x: left, y, size: 9.5, font: bold, color: dark });
        if (ed.proof_url) {
          const instW = bold.widthOfTextAtSize(edInst, 9.5);
          addLink([left, y - 2, left + instW, y + 10], ed.proof_url);
        }

        const dateRange = cleanWinAnsi(`${ed.date_from || ''} - ${ed.date_to || ''}`);
        const dateW = font.widthOfTextAtSize(dateRange, 8.5);
        safeDraw(dateRange, { x: right - dateW, y, size: 8.5, font, color: textGray });
        y -= 11.5;

        // Degree & summary
        const edLines = wrapPdfText(ed.summary, font, 8.5, contentW);
        for (const el of edLines) {
          checkPage(12);
          safeDraw(el, { x: left, y, size: 8.5, font, color: textGray });
          y -= 10.8;
        }
        y -= 3;
      }
      y -= 2;
    }

    // 6. Certifications
    const selCerts = selectedItems.filter(i => i.kind === 'certification');
    if (selCerts.length > 0) {
      drawSection('CERTIFICATIONS');
      for (const c of selCerts) {
        checkPage(14);
        const titleStr = cleanWinAnsi(`${c.title} - `);
        safeDraw(titleStr, { x: left, y, size: 8.5, font: bold, color: dark });
        const tW = bold.widthOfTextAtSize(titleStr, 8.5);
        const issStr = cleanWinAnsi(c.issuer || '');
        safeDraw(issStr, { x: left + tW, y, size: 8.5, font, color: textGray });

        if (c.proof_url) {
          addLink([left, y - 2, left + tW + font.widthOfTextAtSize(issStr, 8.5), y + 10], c.proof_url);
        }

        const cDate = cleanWinAnsi(c.date_from || c.date_to || '');
        const cDateW = font.widthOfTextAtSize(cDate, 8.5);
        safeDraw(cDate, { x: right - cDateW, y, size: 8.5, font, color: textGray });
        y -= 11.5;
      }
      y -= 2;
    }

    // 7. Experience
    const selExp = selectedItems.filter(i => i.kind === 'experience');
    if (selExp.length > 0) {
      drawSection('EXPERIENCE');
      for (const ex of selExp) {
        checkPage(24);
        const exTitle = cleanWinAnsi(ex.title);
        safeDraw(exTitle, { x: left, y, size: 9.5, font: bold, color: dark });
        if (ex.proof_url) {
          const tw = bold.widthOfTextAtSize(exTitle, 9.5);
          addLink([left, y - 2, left + tw, y + 10], ex.proof_url);
        }

        const exDate = cleanWinAnsi(`${ex.date_from || ''} - ${ex.date_to || ''}`);
        const dateW = font.widthOfTextAtSize(exDate, 8.5);
        safeDraw(exDate, { x: right - dateW, y, size: 8.5, font, color: textGray });
        y -= 11.5;

        const exLines = wrapPdfText(ex.summary, font, 8.5, contentW);
        for (const el of exLines) {
          checkPage(12);
          safeDraw(el, { x: left, y, size: 8.5, font, color: textGray });
          y -= 10.8;
        }
        y -= 3;
      }
    }

    return doc.save();
  }

  function triggerPrint(items, templateId) {
    PRINT.active = true;
    PRINT.t = 0;
    if (paperMesh) {
      paperMesh.visible = true;
      paperMesh.scale.set(1, 0.05, 1);
      paperMesh.position.set(0, 0.021, 0.185);
    }
    sfx.servo(1.2, true);
    drawPaperPreview(paperCanvas, items || RESUME.items.filter(i => RESUME.selected.has(i.id)), templateId);
    paperTex.needsUpdate = true;
  }

  async function triggerGenerateAndPrint() {
    if (RESUME.busy) return;
    RESUME.busy = true;
    drawResume(resumeCanvas);
    resumeTex.needsUpdate = true;
    sfx.relay();

    try {
      const chosen = RESUME.items.filter(i => RESUME.selected.has(i.id));
      const tpl = RESUME_TEMPLATES.find(t => t.id === RESUME.template) || RESUME_TEMPLATES[0];

      // 1. Build and download client-side PDF with verified proof hyperlinks
      if (window.PDFLib) {
        const bytes = await buildResumePdf(chosen, tpl);
        downloadBlob(bytes, `Priyansh_Gadia_Resume_${tpl.id}.pdf`);
      }

      // 2. Trigger physical 3D print slot animation
      triggerPrint(chosen, tpl.id);
      if (api2.resume.onBuild) await api2.resume.onBuild(Array.from(RESUME.selected));
    } catch (err) {
      console.error('Resume generation error:', err);
    } finally {
      RESUME.busy = false;
      drawResume(resumeCanvas);
      resumeTex.needsUpdate = true;
    }
  }

  async function loadPortfolio() {
    try {
      const res = await fetch('/api/portfolio');
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          RESUME.items = data.items;
        }
      }
    } catch {
      // Keep DEFAULT_RESUME_ITEMS
    }
    applyResumeFilter();
    drawResume(resumeCanvas);
    if (resumeTex) resumeTex.needsUpdate = true;
  }
  loadPortfolio();

  // ── Physical Sector RS2 Tabletop Tapered Sci-Fi Cyberdeck & Print Slot ──
  {
    const g = sectorGroup(2, 3.96, TOP); // Mounted flat on the workbench deck (y = TOP)

    // Tapered console chassis (sloping from rear down to front edge at ~0.082 rad)
    const slope = 0.082;

    // 1. Heavy machined titanium base plate resting flat on the workbench
    add(box(.74, .010, .52, compD), 0, .005, .01, g);
    add(box(.76, .004, .54, gunD), 0, .002, .01, g); // perimeter rim

    // 2. Tapered chassis housing (lowered so screen sits recessed flush on top)
    const chassis = box(.70, .020, .46, tit);
    chassis.rotation.x = slope;
    add(chassis, 0, .018, -.01, g);

    // 3. Side armor bolsters with chamfered profile
    const leftBolster = box(.044, .030, .48, gunD);
    leftBolster.rotation.x = slope;
    add(leftBolster, -.345, .020, -.01, g);

    const rightBolster = box(.044, .030, .48, gunD);
    rightBolster.rotation.x = slope;
    add(rightBolster, .345, .020, -.01, g);

    // 4. Recessed heat-sink cooling vents with cyan interior underglow on left & right
    const ventGlow = E(0x39d6ff);
    for (let v = 0; v < 5; v++) {
      const vz = -.16 + v * .075;
      const vL = box(.008, .005, .048, ventGlow);
      vL.rotation.x = slope;
      add(vL, -.365, .020, vz, g);

      const vR = box(.008, .005, .048, ventGlow);
      vR.rotation.x = slope;
      add(vR, .365, .020, vz, g);
    }
    leds.push({ m: ventGlow, target: 1.8, t0: T.power[0] + 2.7 });

    // 5. Corner hex bolt caps
    for (const bx of [-.33, .33]) {
      for (const bz of [-.21, .19]) {
        const by = bz < 0 ? .040 : .016;
        add(cyl(.008, .008, .008, tit, 6), bx, by, bz, g);
      }
    }

    // 6. Embedded conduit fiber lines flanking screen
    const conduitGlow = E(0x5fe8ff);
    const cL = box(.004, .003, .36, conduitGlow); cL.rotation.x = slope; add(cL, -.305, .034, -.04, g);
    const cR = box(.004, .003, .36, conduitGlow); cR.rotation.x = slope; add(cR, .305, .034, -.04, g);
    leds.push({ m: conduitGlow, target: 2.0, t0: T.power[0] + 2.8 });

    // 7. Tactical flat screen panel embedded flush into the tapered deck
    resumeCanvas = document.createElement('canvas');
    resumeCanvas.width = 640;
    resumeCanvas.height = 400;
    drawResume(resumeCanvas);
    resumeTex = new THREE.CanvasTexture(resumeCanvas);
    resumeTex.colorSpace = THREE.SRGBColorSpace;
    const smR = new THREE.MeshBasicMaterial({ map: resumeTex });

    const scrMesh = new THREE.Mesh(new THREE.PlaneGeometry(.58, .35), smR);
    scrMesh.rotation.x = -Math.PI / 2 + slope;
    scrMesh.position.set(0, .033, -.04);
    scrMesh.receiveShadow = false;
    scrMesh.userData.interactive = true;
    scrMesh.userData.uvW = 640;
    scrMesh.userData.uvH = 400;
    g.add(scrMesh);
    screens.push({ m: smR, t0: T.power[0] + 2.9, i: 1.1 });

    // 8. Screen perimeter raised bezel rim with laser-etched framing
    const topBezel = box(.60, .010, .016, gunD); topBezel.rotation.x = slope; add(topBezel, 0, .047, -.22, g);
    const leftBezel = box(.014, .010, .36, gunD); leftBezel.rotation.x = slope; add(leftBezel, -.297, .034, -.04, g);
    const rightBezel = box(.014, .010, .36, gunD); rightBezel.rotation.x = slope; add(rightBezel, .297, .034, -.04, g);
    const midBezel = box(.60, .010, .014, gunD); midBezel.rotation.x = slope; add(midBezel, 0, .021, .14, g);

    // Jewel status LEDs at top rear of console
    const stCyan = E(0x39d6ff), stGrn = E(0x35ff7a), stAmb = E(0xff9a3c), stPur = E(0xa78bfa);
    add(box(.014, .004, .004, stCyan), -.09, .052, -.225, g);
    add(box(.014, .004, .004, stGrn), -.03, .052, -.225, g);
    add(box(.014, .004, .004, stAmb), .03, .052, -.225, g);
    add(box(.014, .004, .004, stPur), .09, .052, -.225, g);
    leds.push({ m: stCyan, target: 2.2, t0: T.power[0] + 3.0 });
    leds.push({ m: stGrn, target: 2.0, t0: T.power[0] + 3.05 });
    leds.push({ m: stAmb, target: 1.8, t0: T.power[0] + 3.1 });
    leds.push({ m: stPur, target: 2.0, t0: T.power[0] + 3.15 });

    // 9. Precision resume paper printing slot integrated on the front deck directly in front of the user
    const slotPlate = box(.58, .006, .08, compD); slotPlate.rotation.x = slope; add(slotPlate, 0, .015, .185, g);
    // Recessed discharge mouth
    const slotMouth = box(.34, .005, .016, mat({ color: 0x010508, roughness: 1 })); slotMouth.rotation.x = slope; add(slotMouth, 0, .017, .185, g);
    // Cyan glowing laser feed aperture guide line
    const slotGlow = E(0x5fe8ff);
    const slotGuide = box(.32, .002, .003, slotGlow); slotGuide.rotation.x = slope; add(slotGuide, 0, .018, .188, g);
    leds.push({ m: slotGlow, target: 2.4, t0: T.power[0] + 3.2 });

    // Laser optical alignment brackets flanking slot
    const brkL = box(.018, .005, .014, tit); brkL.rotation.x = slope; add(brkL, -.185, .018, .185, g);
    const brkR = box(.018, .005, .014, tit); brkR.rotation.x = slope; add(brkR, .185, .018, .185, g);

    // Front casing chamfer apron tapering down to the tabletop
    add(box(.70, .008, .04, gunD), 0, .006, .245, g);

    // 10. Ejected paper sheet (procedural canvas texture, zero raster assets)
    paperCanvas = document.createElement('canvas');
    paperCanvas.width = 400;
    paperCanvas.height = 566;
    drawPaperPreview(paperCanvas, RESUME.items.filter(i => RESUME.selected.has(i.id)), RESUME.template);
    paperTex = new THREE.CanvasTexture(paperCanvas);
    paperTex.colorSpace = THREE.SRGBColorSpace;
    const paperMat = new THREE.MeshBasicMaterial({
      map: paperTex,
      side: THREE.DoubleSide
    });
    const paperGeom = new THREE.PlaneGeometry(.18, .22);
    paperGeom.translate(0, -.11, 0);
    paperMesh = new THREE.Mesh(paperGeom, paperMat);
    paperMesh.rotation.x = -Math.PI / 2 + slope;
    paperMesh.position.set(0, .021, .185); // tucked inside slot mouth before print
    paperMesh.scale.set(1, 0.05, 1);
    paperMesh.visible = false;
    g.add(paperMesh);

    tag(g, 'RS2');
    heroGroups.push({ id: 'RS2', group: g });
  }

  // ── RS3 · HOLO-CALENDAR — real Google Calendar sync ──
  const CAL_W = 400, CAL_H = 320;
  const CAL_WINDOW_DAYS = 30, CAL_DAY_START_H = 9, CAL_DAY_END_H = 18, CAL_SLOT_MIN = 30;
  const CAL_FIELDS = ['name','email','location','description'];
  const CAL_FIELD_LABELS = { name:'NAME', email:'EMAIL', location:'LOCATION', description:'DESCRIPTION' };
  const CAL_WD = ['S','M','T','W','T','F','S'];

  const CAL = {
    configured: null,        // null = unknown, true/false once fetched
    busy: [],                // [{start:Date, end:Date}]
    events: [],              // [{id, summary, start:Date, end:Date, status, location, description}]
    lastBooked: null,        // {name, email, location, start:Date, end:Date, summary}
    syncedAt: 0,
    syncing: false,
    syncFailed: false,
    monthCursor: (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })(),
    view: 'grid',            // grid | slots | form | sending | sent | error
    selectedDate: null,
    selectedSlot: null,
    form: { name:'', email:'', location:'', description:'', field:null },
    errorMsg: '',
    _formBoxes: null,
    _formSubmitBox: null,
    _slotBoxes: [],
  };
  let calCanvas, calTex;

  function calIsPast(dayDate) { const now = new Date(); now.setHours(0,0,0,0); return dayDate < now; }
  function calWithinSyncWindow(d) { return d < new Date(Date.now() + CAL_WINDOW_DAYS * 86400000); }
  function calEventsForDay(dayDate) {
    const startOfDay = new Date(dayDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dayDate); endOfDay.setHours(23, 59, 59, 999);
    return (CAL.events || []).filter(ev => ev.start <= endOfDay && ev.end >= startOfDay);
  }
  function calFreeMinutesOnDay(dayDate) {
    const dayStart = new Date(dayDate); dayStart.setHours(CAL_DAY_START_H,0,0,0);
    const dayEnd = new Date(dayDate); dayEnd.setHours(CAL_DAY_END_H,0,0,0);
    const now = new Date();
    const rangeStart = dayStart < now ? now : dayStart;
    if (rangeStart >= dayEnd) return 0;
    let freeMs = dayEnd - rangeStart;
    for (const b of CAL.busy) {
      const s = b.start < rangeStart ? rangeStart : b.start, e = b.end > dayEnd ? dayEnd : b.end;
      if (e > s) freeMs -= (e - s);
    }
    return Math.max(0, freeMs / 60000);
  }
  function calSlotsForDay(dayDate) {
    const slots = [], now = new Date();
    let cur = new Date(dayDate); cur.setHours(CAL_DAY_START_H,0,0,0);
    const dayEnd = new Date(dayDate); dayEnd.setHours(CAL_DAY_END_H,0,0,0);
    while (cur.getTime() + CAL_SLOT_MIN*60000 <= dayEnd.getTime()) {
      const slotStart = new Date(cur), slotEnd = new Date(cur.getTime() + CAL_SLOT_MIN*60000);
      if (slotStart > now && !CAL.busy.some(b => b.start < slotEnd && b.end > slotStart)) slots.push({ start: slotStart, end: slotEnd });
      cur = new Date(cur.getTime() + CAL_SLOT_MIN*60000);
    }
    return slots;
  }
  function calShiftMonth(delta) {
    const d = new Date(CAL.monthCursor); d.setMonth(d.getMonth() + delta); d.setDate(1);
    const now = new Date(), minMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const maxD = new Date(now.getTime() + CAL_WINDOW_DAYS*86400000), maxMonth = new Date(maxD.getFullYear(), maxD.getMonth(), 1);
    if (d < minMonth || d > maxMonth) return;
    CAL.monthCursor = d; sfx.blip(900,.03,.02); redrawCal();
  }
  function redrawCal() { if (calCanvas) { drawCal(calCanvas); if (calTex) calTex.needsUpdate = true; } }

  async function syncCalendarIfStale(force = false) {
    const STALE_MS = 5 * 60 * 1000;
    if (CAL.syncing || (!force && CAL.syncedAt && (Date.now() - CAL.syncedAt < STALE_MS))) return;
    CAL.syncing = true; CAL.syncFailed = false; redrawCal();
    try {
      const res = await fetch('/api/calendar/freebusy');
      if (res.status === 304) { CAL.syncedAt = Date.now(); }
      else if (res.ok) {
        const data = await res.json();
        CAL.configured = data.configured ?? false;
        if (data.configured) {
          const srvBusy = (data.busy || []).map(b => ({ start: new Date(b.start), end: new Date(b.end) }));
          const srvEvents = (data.events || []).map(ev => ({
            id: ev.id,
            summary: ev.summary || 'Scheduled Plan / Meeting',
            start: new Date(ev.start),
            end: new Date(ev.end),
            status: ev.status || 'confirmed',
            location: ev.location || '',
            description: ev.description || ''
          }));

          // Preserve any freshly booked reservation if Google Calendar hasn't finished indexing it yet
          if (CAL.lastBooked && (Date.now() - (CAL.lastBooked.bookedAt || 0) < 5 * 60 * 1000)) {
            const exists = srvEvents.some(e => e.id === CAL.lastBooked.id || Math.abs(e.start.getTime() - CAL.lastBooked.start.getTime()) < 60000);
            if (!exists) {
              srvEvents.push(CAL.lastBooked);
              srvBusy.push({ start: CAL.lastBooked.start, end: CAL.lastBooked.end });
            }
          }

          CAL.busy = srvBusy;
          CAL.events = srvEvents;
          CAL.syncFailed = !!data.error;
        }
        CAL.syncedAt = Date.now();
      } else CAL.syncFailed = true;
    } catch { CAL.syncFailed = true; if (CAL.configured === null) CAL.configured = false; }
    CAL.syncing = false; redrawCal();
  }

  function calWrapText(g, text, x, y, maxW, lineH, maxLines) {
    const words = text.split(' '); let line = '', ln = 0;
    for (let i = 0; i < words.length && ln < maxLines; i++) {
      const test = line + words[i] + ' ';
      if (g.measureText(test).width > maxW && line) { g.textAlign='left'; g.fillText(line, x, y + ln*lineH); line = words[i] + ' '; ln++; }
      else line = test;
    }
    if (ln < maxLines && line) { g.textAlign='left'; g.fillText(line, x, y + ln*lineH); }
  }

  function drawCal(cnv) {
    const g = cnv.getContext('2d'), w = cnv.width, h = cnv.height;
    // Solid opaque obsidian hard-light field — zero bleed-through from background cavern
    g.fillStyle = '#020812'; g.fillRect(0, 0, w, h);

    // Hard-light nano-grid texture
    g.strokeStyle = 'rgba(56, 189, 248, 0.05)'; g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= w; x += 16) { g.moveTo(x, 0); g.lineTo(x, h); }
    for (let y = 0; y <= h; y += 16) { g.moveTo(0, y); g.lineTo(w, y); }
    g.stroke();

    // Futuristic hard-light border frame & chamfered tech corners
    g.strokeStyle = '#1e3a8a'; g.lineWidth = 1; g.strokeRect(2, 2, w - 4, h - 4);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 2;
    const C = 12;
    g.beginPath(); g.moveTo(2, C); g.lineTo(2, 2); g.lineTo(C, 2); g.stroke();
    g.beginPath(); g.moveTo(w - C, 2); g.lineTo(w - 2, 2); g.lineTo(w - 2, C); g.stroke();
    g.beginPath(); g.moveTo(2, h - C); g.lineTo(2, h - 2); g.lineTo(C, h - 2); g.stroke();
    g.beginPath(); g.moveTo(w - C, h - 2); g.lineTo(w - 2, h - 2); g.lineTo(w - 2, h - C); g.stroke();

    // Header
    mono(g, 13, 'bold'); g.fillStyle = '#e0f2fe'; g.textAlign = 'left';
    g.fillText('HOLO-CALENDAR', 14, 22);
    mono(g, 8, ''); g.fillStyle = '#38bdf8';
    g.fillText('HARD-LIGHT HUD', 145, 22);

    const dotColor = CAL.configured === false ? '#ff5a5a' : (CAL.syncFailed ? '#ffb15c' : '#4dff8a');
    g.fillStyle = dotColor; g.beginPath(); g.arc(w - 14, 16, 4, 0, TAU); g.fill();
    mono(g, 8, ''); g.fillStyle = '#7dd3fc'; g.textAlign = 'right';
    g.fillText(CAL.syncing ? 'SYNCING…' : (CAL.syncedAt ? `SYNCED ${Math.max(0,Math.floor((Date.now()-CAL.syncedAt)/1000))}s AGO` : 'NOT SYNCED'), w - 22, 19);
    g.strokeStyle = 'rgba(56, 189, 248, 0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(10, 30); g.lineTo(w - 10, 30); g.stroke();

    if (CAL.configured === null) { mono(g,11,''); g.fillStyle='#7dd3fc'; g.textAlign='center'; g.fillText('CONNECTING TO CALENDAR…', w/2, h/2); return; }
    if (CAL.configured === false) {
      g.textAlign = 'center';
      mono(g, 13); g.fillStyle = '#ffb15c'; g.fillText('CALENDAR SYNC NOT YET', w/2, h/2 - 10); g.fillText('ESTABLISHED', w/2, h/2 + 10);
      mono(g, 9, ''); g.fillStyle = '#5fa8b8'; g.fillText('OWNER HAS NOT CONNECTED GOOGLE CALENDAR', w/2, h/2 + 34);
      return;
    }
    if (CAL.view === 'grid') return drawCalGrid(g, w, h);
    if (CAL.view === 'slots') return drawCalSlots(g, w, h);
    if (CAL.view === 'form') return drawCalForm(g, w, h);
    if (CAL.view === 'sending') return drawCalSending(g, w, h);
    if (CAL.view === 'sent') return drawCalSent(g, w, h);
    if (CAL.view === 'error') return drawCalError(g, w, h);
  }

  function drawCalGrid(g, w, h) {
    const mc = CAL.monthCursor, M = mc.toLocaleString('en', { month: 'long' }).toUpperCase();
    mono(g, 9, 'bold'); g.fillStyle = '#38bdf8'; g.textAlign = 'left'; g.fillText('‹ PREV', 14, 52);
    g.textAlign = 'right'; g.fillText('NEXT ›', w - 14, 52);
    mono(g, 12, 'bold'); g.fillStyle = '#f0f9ff'; g.textAlign = 'center'; g.fillText(`${M} ${mc.getFullYear()}`, w/2, 52);

    mono(g, 9, 'bold'); g.fillStyle = '#7dd3fc';
    const cellW = (w - 20) / 7, gridX0 = 10, gridY0 = 76, rowH = 30;
    CAL_WD.forEach((d,i) => { g.textAlign='center'; g.fillText(d, gridX0 + cellW*i + cellW/2, gridY0 - 6); });

    const first = new Date(mc.getFullYear(), mc.getMonth(), 1).getDay();
    const daysInMonth = new Date(mc.getFullYear(), mc.getMonth()+1, 0).getDate();
    const now = new Date();
    const isCurMonth = now.getFullYear() === mc.getFullYear() && now.getMonth() === mc.getMonth();

    for (let d = 1; d <= daysInMonth; d++) {
      const col = (first + d - 1) % 7, row = Math.floor((first + d - 1) / 7);
      const cx = gridX0 + col*cellW, cy = gridY0 + row*rowH;
      const dayDate = new Date(mc.getFullYear(), mc.getMonth(), d);
      const past = calIsPast(dayDate), inWindow = calWithinSyncWindow(dayDate);
      const dayEvents = calEventsForDay(dayDate);
      const hasEvents = dayEvents.length > 0;

      let fill = '#06101c', border = 'rgba(30, 58, 138, 0.4)', textCol = '#2a4855';
      if (!past && inWindow) {
        const free = calFreeMinutesOnDay(dayDate);
        if (free >= CAL_SLOT_MIN) {
          fill = 'rgba(12, 43, 66, 0.85)';
          border = '#0284c7';
          textCol = '#e0f2fe';
        } else {
          fill = 'rgba(50, 20, 16, 0.85)';
          border = '#e11d48';
          textCol = '#fca5a5';
        }
      }
      g.fillStyle = fill; g.fillRect(cx+2, cy+2, cellW-4, rowH-4);
      g.strokeStyle = border; g.lineWidth = 1; g.strokeRect(cx+2, cy+2, cellW-4, rowH-4);

      // Today highlight
      if (isCurMonth && d === now.getDate()) {
        g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.strokeRect(cx+1, cy+1, cellW-2, rowH-2);
      }

      // Scheduled plans indicator pip (amber gold)
      if (hasEvents) {
        g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(cx + cellW - 6, cy + 6, 2.5, 0, TAU); g.fill();
      }

      mono(g, 9, 'bold');
      g.fillStyle = textCol; g.textAlign = 'center'; g.fillText(String(d), cx + cellW/2, cy + rowH/2 + 3);
    }

    // Legend
    mono(g, 8, ''); g.textAlign = 'left';
    g.fillStyle = '#38bdf8'; g.fillRect(12, h - 22, 7, 7);
    g.fillStyle = '#94a3b8'; g.fillText('OPEN', 23, h - 16);

    g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(72, h - 18.5, 3.5, 0, TAU); g.fill();
    g.fillStyle = '#94a3b8'; g.fillText('PLANS / RESERVATIONS', 80, h - 16);

    g.fillStyle = '#e11d48'; g.fillRect(238, h - 22, 7, 7);
    g.fillStyle = '#94a3b8'; g.fillText('BUSY', 249, h - 16);

    mono(g, 8, ''); g.fillStyle = '#38bdf8'; g.fillText('CLICK ANY DATE TO VIEW SCHEDULE & PLANS', 12, h - 6);
  }

  function drawCalSlots(g, w, h) {
    const d = CAL.selectedDate;
    const label = d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

    // Navigation header
    mono(g, 9, 'bold'); g.fillStyle = '#38bdf8'; g.textAlign = 'left'; g.fillText('‹ MONTH', 14, 46);
    mono(g, 11, 'bold'); g.fillStyle = '#f0f9ff'; g.textAlign = 'center'; g.fillText(label, w / 2, 46);
    mono(g, 8, ''); g.fillStyle = '#7dd3fc'; g.textAlign = 'right'; g.fillText('SCHEDULE', w - 14, 46);

    g.strokeStyle = 'rgba(56, 189, 248, 0.25)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(12, 54); g.lineTo(w - 12, 54); g.stroke();

    // SECTION 1: SCHEDULED PLANS & RESERVATIONS
    mono(g, 8, 'bold'); g.fillStyle = '#f59e0b'; g.textAlign = 'left';
    g.fillText('■ SCHEDULED PLANS & RESERVATIONS', 14, 66);

    const dayEvents = calEventsForDay(d);
    let curY = 72;
    if (dayEvents.length === 0) {
      g.fillStyle = 'rgba(12, 28, 44, 0.6)'; g.fillRect(14, curY, w - 28, 26);
      g.strokeStyle = 'rgba(56, 189, 248, 0.15)'; g.strokeRect(14, curY, w - 28, 26);
      mono(g, 8, ''); g.fillStyle = '#64748b'; g.textAlign = 'center';
      g.fillText('NO PRE-EXISTING PLANS SCHEDULED FOR THIS DATE', w / 2, curY + 16);
      curY += 32;
    } else {
      const showEvs = dayEvents.slice(0, 2);
      showEvs.forEach(ev => {
        g.fillStyle = 'rgba(28, 20, 8, 0.9)'; g.fillRect(14, curY, w - 28, 24);
        g.strokeStyle = '#f59e0b'; g.lineWidth = 1; g.strokeRect(14, curY, w - 28, 24);

        const tStart = ev.start.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
        const tEnd = ev.end.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
        mono(g, 8, 'bold'); g.fillStyle = '#fbbf24'; g.textAlign = 'left';
        g.fillText(`${tStart}-${tEnd}`, 20, curY + 15);

        mono(g, 8, ''); g.fillStyle = '#f8fafc';
        let title = ev.summary || 'Reserved Event';
        if (title.length > 22) title = title.slice(0, 20) + '…';
        g.fillText(title, 130, curY + 15);

        mono(g, 7, 'bold'); g.fillStyle = '#34d399'; g.textAlign = 'right';
        g.fillText('RESERVED', w - 20, curY + 15);

        curY += 27;
      });
      if (dayEvents.length > 2) {
        mono(g, 7, ''); g.fillStyle = '#94a3b8'; g.textAlign = 'right';
        g.fillText(`+${dayEvents.length - 2} MORE PLAN(S)`, w - 16, curY + 6);
        curY += 10;
      } else {
        curY += 4;
      }
    }

    // Divider between sections
    g.strokeStyle = 'rgba(56, 189, 248, 0.2)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(14, curY); g.lineTo(w - 14, curY); g.stroke();
    curY += 11;

    // SECTION 2: AVAILABLE APPOINTMENT SLOTS
    mono(g, 8, 'bold'); g.fillStyle = '#38bdf8'; g.textAlign = 'left';
    g.fillText('■ AVAILABLE APPOINTMENT SLOTS (CLICK TO BOOK)', 14, curY);
    curY += 8;

    const slots = calSlotsForDay(d);
    CAL._slotBoxes = [];
    if (slots.length === 0) {
      g.fillStyle = 'rgba(40, 16, 16, 0.7)'; g.fillRect(14, curY, w - 28, 36);
      g.strokeStyle = 'rgba(239, 68, 68, 0.4)'; g.strokeRect(14, curY, w - 28, 36);
      mono(g, 9, ''); g.fillStyle = '#f87171'; g.textAlign = 'center';
      g.fillText('NO OPEN APPOINTMENT SLOTS REMAIN FOR THIS DAY', w / 2, curY + 22);
    } else {
      const cols = 3, cellW = (w - 28) / cols, cellH = 26;
      const maxRows = 4;
      const maxDisplay = cols * maxRows;
      const displaySlots = slots.slice(0, maxDisplay);
      displaySlots.forEach((s, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const cx = 14 + col * cellW, cy = curY + row * (cellH + 4);
        const bx = cx + 2, by = cy, bw = cellW - 4, bh = cellH;

        g.fillStyle = 'rgba(14, 42, 66, 0.9)'; g.fillRect(bx, by, bw, bh);
        g.strokeStyle = '#0284c7'; g.lineWidth = 1; g.strokeRect(bx, by, bw, bh);
        mono(g, 9, 'bold'); g.fillStyle = '#7dd3fc'; g.textAlign = 'center';
        g.fillText(s.start.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }), bx + bw / 2, by + bh / 2 + 4);

        CAL._slotBoxes.push({ x: bx, y: by, w: bw, h: bh, slot: s });
      });
      if (slots.length > maxDisplay) {
        mono(g, 7, ''); g.fillStyle = '#64748b'; g.textAlign = 'center';
        g.fillText(`+${slots.length - maxDisplay} MORE SLOTS AVAILABLE`, w / 2, h - 8);
      }
    }
  }

  function drawCalForm(g, w, h) {
    const slot = CAL.selectedSlot;
    mono(g, 9, 'bold'); g.fillStyle = '#38bdf8'; g.textAlign = 'left'; g.fillText('‹ BACK', 14, 46);
    mono(g, 10, 'bold'); g.fillStyle = '#8fe8ff'; g.textAlign = 'center';
    g.fillText(slot.start.toLocaleString('en', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }).toUpperCase(), w/2, 46);

    const x0 = 14, boxW = w - 28, rowH = { name:24, email:24, location:24, description:54 };
    let y = 60; const boxes = {};
    for (const f of CAL_FIELDS) {
      mono(g, 8, 'bold'); g.fillStyle = '#7dd3fc'; g.textAlign = 'left'; g.fillText(CAL_FIELD_LABELS[f], x0, y - 2);
      const bh = rowH[f], active = CAL.form.field === f;
      g.fillStyle = active ? '#0c273d' : '#030e16'; g.fillRect(x0, y, boxW, bh);
      g.strokeStyle = active ? '#38bdf8' : '#1e3a8a'; g.lineWidth = active ? 1.5 : 1; g.strokeRect(x0, y, boxW, bh);
      boxes[f] = { x: x0, y, w: boxW, h: bh };
      mono(g, 10, '');
      g.fillStyle = CAL.form[f] ? '#ffffff' : (active ? '#a5e8ff' : '#45798e');
      const cursor = (active && (Math.floor(S.t*3)%2)) ? '▮' : '';
      if (f === 'description') {
        const text = (CAL.form[f] || (active ? '' : 'brief description of the meeting...')) + cursor;
        calWrapText(g, text, x0 + 6, y + 14, boxW - 12, 14, 3);
      } else {
        const placeholder = { name:'your name', email:'you@example.com', location:'e.g. video call / office' }[f];
        const text = CAL.form[f] ? CAL.form[f] + cursor : (active ? cursor : placeholder);
        g.textAlign = 'left'; g.fillText(text, x0 + 6, y + bh/2 + 3);
      }
      y += bh + 12;
    }
    CAL._formBoxes = boxes;

    const btnY = y + 2, btnH = 26;
    g.fillStyle = 'rgba(77,255,138,.18)'; g.fillRect(x0, btnY, boxW, btnH);
    g.strokeStyle = '#4dff8a'; g.lineWidth = 1; g.strokeRect(x0, btnY, boxW, btnH);
    mono(g, 11, 'bold'); g.fillStyle = '#4dff8a'; g.textAlign = 'center'; g.fillText('SEND MEETING REQUEST', w/2, btnY + btnH/2 + 4);
    CAL._formSubmitBox = { x: x0, y: btnY, w: boxW, h: btnH };

    if (CAL.errorMsg) { mono(g, 8, ''); g.fillStyle = '#ff5a5a'; g.textAlign = 'center'; g.fillText(CAL.errorMsg, w/2, btnY + btnH + 14); }
  }

  function drawCalSending(g, w, h) {
    mono(g, 12, 'bold'); g.fillStyle = '#8fe8ff'; g.textAlign = 'center';
    g.fillText('SENDING REQUEST' + '.'.repeat(Math.floor(S.t*2)%4), w/2, h/2);
  }

  function drawCalSent(g, w, h) {
    const s = CAL.lastBooked || CAL.selectedSlot;
    // Glowing confirmation card frame
    g.fillStyle = 'rgba(6, 32, 20, 0.95)'; g.fillRect(16, 44, w - 32, h - 68);
    g.strokeStyle = '#4dff8a'; g.lineWidth = 1.5; g.strokeRect(16, 44, w - 32, h - 68);

    mono(g, 12, 'bold'); g.fillStyle = '#4dff8a'; g.textAlign = 'center';
    g.fillText('✓ REQUEST ACCEPTED & RECORDED', w / 2, 68);

    // EVENT BLOCKED ON CALENDAR high-contrast banner
    g.fillStyle = '#4dff8a'; g.fillRect(30, 82, w - 60, 22);
    mono(g, 10, 'bold'); g.fillStyle = '#020812';
    g.fillText('EVENT BLOCKED ON CALENDAR', w / 2, 97);

    if (s) {
      mono(g, 9, ''); g.fillStyle = '#a7f3d0'; g.textAlign = 'left';
      const tStr = s.start.toLocaleString('en', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase();
      g.fillText(`RESERVATION: ${s.name ? s.name.toUpperCase() : 'VISITOR'}`, 34, 130);
      g.fillText(`TIME: ${tStr}`, 34, 150);
      g.fillText(`LOCATION: ${(s.location || 'ONLINE / CAVE').toUpperCase()}`, 34, 170);
      g.fillStyle = '#6ee7b7';
      g.fillText('STATUS: SYNCHRONIZED & LOCKED', 34, 194);
    }

    mono(g, 8, 'bold'); g.fillStyle = '#34d399'; g.textAlign = 'center';
    g.fillText('[ CLICK ANYWHERE TO VIEW UPDATED SCHEDULE ]', w / 2, h - 14);
  }

  function drawCalError(g, w, h) {
    mono(g, 12, 'bold'); g.fillStyle = '#ff5a5a'; g.textAlign = 'center'; g.fillText('REQUEST FAILED', w/2, h/2 - 16);
    mono(g, 9, ''); g.fillStyle = '#ffb15c'; g.fillText(CAL.errorMsg || 'PLEASE TRY AGAIN', w/2, h/2 + 6);
    mono(g, 8, ''); g.fillStyle = '#7dd3fc'; g.fillText('CLICK ANYWHERE TO RETURN', w/2, h - 16);
  }

  async function calSubmitRequest() {
    const { name, email, location, description } = CAL.form;
    if (!name.trim() || !location.trim() || !description.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      CAL.errorMsg = 'FILL ALL FIELDS WITH A VALID EMAIL'; redrawCal(); return;
    }
    CAL.errorMsg = ''; CAL.view = 'sending'; redrawCal();
    try {
      const res = await fetch('/api/calendar/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), location: location.trim(), description: description.trim(),
          startIso: CAL.selectedSlot.start.toISOString(), endIso: CAL.selectedSlot.end.toISOString() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        const newEvent = {
          id: data.id || ('local-' + Date.now()),
          summary: data.event?.summary || `Meeting request: ${name.trim()}`,
          start: new Date(CAL.selectedSlot.start),
          end: new Date(CAL.selectedSlot.end),
          status: 'confirmed',
          location: location.trim(),
          description: description.trim(),
          bookedAt: Date.now()
        };
        CAL.events.push(newEvent);
        CAL.busy.push({ start: newEvent.start, end: newEvent.end });
        CAL.lastBooked = { ...newEvent, name: name.trim(), email: email.trim() };
        CAL.view = 'sent';
        sfx.relay();
        setTimeout(() => syncCalendarIfStale(true), 1500);
      }
      else if (res.status === 409) { CAL.errorMsg = 'SLOT NO LONGER AVAILABLE'; CAL.view = 'error'; }
      else if (res.status === 429) { CAL.errorMsg = 'TOO MANY REQUESTS — TRY AGAIN SHORTLY'; CAL.view = 'error'; }
      else { CAL.errorMsg = 'COULD NOT SEND REQUEST'; CAL.view = 'error'; }
    } catch { CAL.errorMsg = 'NETWORK ERROR'; CAL.view = 'error'; }
    redrawCal();
  }

  { const g = sectorGroup(3, 3.95); add(cyl(.24, .28, .07, tit, 24), 0, .035, 0, g); const puck = E(0x3fe0ff); add(cyl(.16, .16, .006, puck, 24), 0, .074, 0, g); leds.push({ m: puck, target: 1.8, t0: T.power[0] + 3.4 });   // RS3 · holo-calendar
    calCanvas = document.createElement('canvas'); calCanvas.width = CAL_W; calCanvas.height = CAL_H; drawCal(calCanvas);
    calTex = new THREE.CanvasTexture(calCanvas); calTex.colorSpace = THREE.SRGBColorSpace;

    // Hard-light screen assembly: tilted group containing opaque backing, bezel emitters, and interactive screen
    const screenGrp = new THREE.Group();
    screenGrp.position.set(0, .78, 0);
    screenGrp.rotation.x = -.12;
    g.add(screenGrp);

    // 1. Solid opaque hard-light physical backing plate: completely occludes all background cave walls, sconces, and dust
    const hardLightMat = mat({ color: 0x020812, roughness: 0.92, metalness: 0.25 });
    const backPlate = add(box(1.27, .99, .014, hardLightMat), 0, 0, -.008, screenGrp);
    backPlate.renderOrder = 18;

    // 2. High-tech titanium bezel framing the hard-light panel
    const bezelMat = compD;
    add(box(1.28, .018, .02, bezelMat), 0, .495, -.004, screenGrp);   // top rail
    add(box(1.28, .018, .02, bezelMat), 0, -.495, -.004, screenGrp);  // bottom rail
    add(box(.018, .98, .02, bezelMat), -.635, 0, -.004, screenGrp);   // left rail
    add(box(.018, .98, .02, bezelMat), .635, 0, -.004, screenGrp);    // right rail

    // 3. Glowing hard-light edge emitters (cyan) along the top and bottom chamfers
    const emitTop = add(box(1.24, .006, .01, E(0x38bdf8)), 0, .488, -.001, screenGrp);
    const emitBot = add(box(1.24, .006, .01, E(0x38bdf8)), 0, -.488, -.001, screenGrp);
    leds.push({ m: emitTop.material, target: 1.6, t0: T.power[0] + 3.5 });
    // 4. Interactive screen plane with depthWrite: true and solid tone-mapped false texture
    const hm = new THREE.MeshBasicMaterial({ map: calTex, transparent: true, opacity: 0, blending: THREE.NormalBlending, depthWrite: true, side: THREE.FrontSide, toneMapped: false });
    const p = add(new THREE.Mesh(new THREE.PlaneGeometry(1.25, .98), hm), 0, 0, .001, screenGrp);
    p.renderOrder = 20;
    p.userData.interactive = true; p.userData.uvW = CAL_W; p.userData.uvH = CAL_H;
    holos.push({ m: hm, target: 1.0, t0: T.power[0] + 3.6 }); tag(g, 'RS3'); heroGroups.push({ id: 'RS3', group: g });
    syncCalendarIfStale();
    window.addEventListener('lab:focus', e => { if (e.detail?.id === 'RS3') syncCalendarIfStale(); });
  }

  for (const k of [4, 5]) { const g = sectorGroup(k, 3.98, TOP + .03); add(box(2.7, .06, 1.02, compD), 0, 0, 0, g); add(new THREE.Mesh(new THREE.PlaneGeometry(2.4, .62), mat({ map: TEX.sealed(), roughness: .85, metalness: .3 })).rotateX(-Math.PI / 2), 0, .031, 0, g);   // RS4/LS4 · sealed
    for (const [x, z] of [[-1.25, -.4], [1.25, -.4], [-1.25, .4], [1.25, .4]]) add(cyl(.035, .035, .015, tit, 10), x, .036, z, g); tag(g, k === 4 ? 'RS4' : 'LS4'); heroGroups.push({ id: k === 4 ? 'RS4' : 'LS4', group: g }); }
  let globeGroup = null;
  let beaconRingMat = null;
  let beaconGroup = null;
  let globeLabelCanvas = null, globeLabelTex = null, globeLabelMesh = null;
  let satMeshes = [], flightPulseMeshes = [], radarSweepMesh = null;
  let coastLinesMesh = null, landPointsMesh = null, oceanPointsMesh = null, cityNodesGroup = null;
  let orbitRingsGroup = null, flightArcsGroup = null;
  let liveSatsGroup = null, liveFlightsGroup = null, earthquakesGroup = null;
  let newsBeaconsGroup = null;
  let holoPyramidGroup = null, holoPyramidLeft = null, holoPyramidRight = null;

  const TARGET_PRESETS = [
    { id: 'ATX', name: 'AUSTIN · TEXAS', lat: 30.274, lon: -97.740 },
    { id: 'SFO', name: 'SAN FRANCISCO · BAY AREA', lat: 37.775, lon: -122.419 },
    { id: 'NYC', name: 'NEW YORK · MANHATTAN', lat: 40.758, lon: -73.985 },
    { id: 'LON', name: 'LONDON · UNITED KINGDOM', lat: 51.507, lon: -0.128 },
    { id: 'TYO', name: 'TOKYO · JAPAN', lat: 35.689, lon: 139.692 },
    { id: 'SYD', name: 'SYDNEY · AUSTRALIA', lat: -33.868, lon: 151.209 }
  ];

  const GLOBE = {
    autoSpin: true,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastX: 0,
    lastY: 0,
    rotVelX: 0,
    rotVelY: 0,
    geo: null,
    geoFetched: false,
    albumNoticeUntil: 0,
    mode: 'SURFACE', // 'SURFACE' | 'ORBITAL' | 'AIRSPACE' | 'NEWS'
    zoom: 1.0,
    displayZoom: 1.0,
    targetLat: 30.274,
    targetLon: -97.740,
    targetName: 'AUSTIN · TEXAS',
    targetRotY: 0,
    targetRotX: 0,
    animatingToTarget: false,
    liveISS: null,
    liveEarthquakes: [],
    liveFlights: [],
    liveNews: [],
    selectedNewsChannel: null,
    selectedEntity: null,
    lastLiveSatPoll: 0,
    lastLiveFlightPoll: 0,
    lastLiveQuakePoll: 0,
    lastLiveNewsPoll: 0,
    newsFetched: false,
    taskbarOpen: false,
    holoPyramidProgress: 0,
    holoPyramidTarget: 0
  };

  function latLonToVec3(lat, lon, radius = 0.504) {
    const phi = THREE.MathUtils.degToRad(lat);
    const theta = THREE.MathUtils.degToRad(lon);
    const y = radius * Math.sin(phi);
    const r = radius * Math.cos(phi);
    const x = r * Math.sin(theta);
    const z = r * Math.cos(theta);
    return new THREE.Vector3(x, y, z);
  }

  // Continental Polygons for Landmass Dot-Matrix Classifier
  const CONTINENT_POLYS = [
    [[72,-156],[71,-140],[70,-125],[68,-110],[60,-86],[54,-80],[51,-56],[47,-53],[44,-64],[41,-71],[35,-75],[30,-81],[25,-80],[28,-97],[22,-97],[16,-92],[9,-79],[8,-82],[14,-92],[19,-104],[23,-110],[32,-117],[37,-122],[47,-124],[54,-130],[59,-140],[60,-150],[55,-163],[65,-168],[72,-156]],
    [[12,-72],[10,-62],[5,-52],[-2,-44],[-8,-35],[-18,-38],[-23,-43],[-32,-52],[-38,-57],[-52,-68],[-55,-67],[-52,-75],[-42,-74],[-33,-72],[-18,-71],[-5,-80],[2,-78],[8,-77],[12,-72]],
    [[36,-6],[43,-9],[48,-5],[51,1],[54,8],[58,5],[62,5],[71,26],[68,44],[60,50],[55,38],[45,35],[44,28],[40,23],[37,15],[36,5],[36,-6]],
    [[36,-6],[32,24],[31,32],[28,34],[12,44],[12,51],[-5,40],[-15,40],[-26,33],[-34,18],[-34,26],[-23,14],[-12,13],[5,2],[4,9],[6,1],[4,-7],[14,-17],[21,-17],[32,-9],[36,-6]],
    [[40,26],[41,41],[30,48],[24,57],[22,69],[8,77],[16,82],[22,89],[10,99],[1,104],[22,108],[30,122],[39,128],[43,132],[53,142],[60,162],[66,170],[70,180],[73,140],[73,110],[73,80],[68,44],[40,26]],
    [[-11,142],[-15,145],[-24,153],[-34,151],[-38,147],[-38,140],[-35,136],[-32,132],[-35,118],[-32,115],[-22,114],[-17,123],[-14,126],[-12,132],[-12,136],[-11,142]],
    [[50,-5],[51,1],[55,-1],[58,-3],[58,-5],[55,-5],[51,-4],[50,-5]]
  ];

  function pointInPoly(lat, lon, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > lon) !== (yj > lon)) &&
        (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function isLandPoint(lat, lon) {
    for (let i = 0; i < CONTINENT_POLYS.length; i++) {
      if (pointInPoly(lat, lon, CONTINENT_POLYS[i])) return true;
    }
    return false;
  }

  const CITY_NODES = [
    { name: 'LONDON', lat: 51.5, lon: -0.1 },
    { name: 'NEW YORK', lat: 40.7, lon: -74.0 },
    { name: 'TOKYO', lat: 35.7, lon: 139.7 },
    { name: 'AUSTIN', lat: 30.3, lon: -97.7 },
    { name: 'SAN FRANCISCO', lat: 37.8, lon: -122.4 },
    { name: 'SYDNEY', lat: -33.9, lon: 151.2 },
    { name: 'DUBAI', lat: 25.2, lon: 55.3 },
    { name: 'SINGAPORE', lat: 1.35, lon: 103.8 }
  ];

  const FLIGHT_CORRIDORS = [
    { from: [51.5, -0.1], to: [40.7, -74.0] },
    { from: [37.8, -122.4], to: [35.7, 139.7] },
    { from: [25.2, 55.3], to: [-33.9, 151.2] },
    { from: [40.7, -74.0], to: [30.3, -97.7] },
    { from: [51.5, -0.1], to: [25.2, 55.3] },
    { from: [1.35, 103.8], to: [35.7, 139.7] }
  ];

  const SATELLITE_CONFIGS = [
    { name: 'ISS (ZARYA)', inc: 51.6, radius: 0.540, speed: 0.22, color: 0x00f0ff },
    { name: 'TIANGONG', inc: 41.5, radius: 0.536, speed: 0.23, color: 0xffb347 },
    { name: 'HUBBLE', inc: 28.5, radius: 0.548, speed: 0.20, color: 0x70d6ff }
  ];

  async function loadDetailedCoastlines() {
    try {
      const res = await fetch('/data/coastlines.json');
      if (!res.ok) return;
      const paths = await res.json();
      if (!Array.isArray(paths) || paths.length === 0) return;

      const pts = [];
      for (let p = 0; p < paths.length; p++) {
        const line = paths[p];
        for (let i = 0; i < line.length - 1; i++) {
          pts.push(latLonToVec3(line[i][1], line[i][0], 0.503));
          pts.push(latLonToVec3(line[i + 1][1], line[i + 1][0], 0.503));
        }
      }
      if (pts.length > 0 && coastLinesMesh) {
        coastLinesMesh.geometry.dispose();
        coastLinesMesh.geometry = new THREE.BufferGeometry().setFromPoints(pts);
      }
    } catch {}
  }

  // ── Real-Time Live Telemetry Pollers ──
  async function pollLiveSatellites() {
    try {
      const res = await fetch('/api/geo/satellites');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.lat != null && data.lon != null) {
        GLOBE.liveISS = data;
        updateLiveISS3D();
        if (globeLabelCanvas && GLOBE.mode === 'ORBITAL') {
          drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
          if (globeLabelTex) globeLabelTex.needsUpdate = true;
        }
      }
    } catch {}
  }

  async function pollLiveEarthquakes() {
    try {
      const res = await fetch('/api/geo/earthquakes');
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.earthquakes)) {
        GLOBE.liveEarthquakes = data.earthquakes;
        updateLiveEarthquakes3D();
        if (globeLabelCanvas && GLOBE.mode === 'SURFACE') {
          drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
          if (globeLabelTex) globeLabelTex.needsUpdate = true;
        }
      }
    } catch {}
  }

  async function pollLiveFlights() {
    try {
      const res = await fetch('/api/geo/flights');
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.flights)) {
        GLOBE.liveFlights = data.flights;
        updateLiveFlights3D();
        if (globeLabelCanvas && GLOBE.mode === 'AIRSPACE') {
          drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
          if (globeLabelTex) globeLabelTex.needsUpdate = true;
        }
      }
    } catch {}
  }

  // ── 3D Live Renderers ──
  function updateLiveISS3D() {
    if (!liveSatsGroup || !GLOBE.liveISS) return;
    while (liveSatsGroup.children.length > 0) {
      const obj = liveSatsGroup.children.pop();
      if (obj.geometry) obj.geometry.dispose();
    }
    const iss = GLOBE.liveISS;
    const altRadius = 0.504 + (iss.altitude_km / 6371) * 0.50;
    const pos = latLonToVec3(iss.lat, iss.lon, altRadius);

    const issG = new THREE.Group();
    issG.position.copy(pos);

    // Habitat cylinder
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.024, 8), new THREE.MeshBasicMaterial({ color: 0xdff6ff }));
    body.rotation.z = Math.PI / 2;
    issG.add(body);

    // Dual solar panels
    const solarWing = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.002, 0.016), new THREE.MeshBasicMaterial({ color: 0xffb040 }));
    issG.add(solarWing);

    // Optical beacon ping
    const ping = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    issG.add(ping);

    // Ground footprint ring projection
    const groundPos = latLonToVec3(iss.lat, iss.lon, 0.504);
    const fpGeo = new THREE.RingGeometry(0.045, 0.048, 32);
    const fpMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.45, depthWrite: false });
    const fpMesh = new THREE.Mesh(fpGeo, fpMat);
    fpMesh.position.copy(groundPos);
    fpMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), groundPos.clone().normalize());
    liveSatsGroup.add(fpMesh);

    // Nadir tether line from satellite to ground subpoint
    const tetherGeo = new THREE.BufferGeometry().setFromPoints([pos, groundPos]);
    const tetherLine = new THREE.Line(tetherGeo, lineM({ color: 0x00f0ff, transparent: true, opacity: 0.6 }));
    liveSatsGroup.add(tetherLine);

    // Interactive hit sphere
    const issHit = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    issHit.userData = { interactive: true, isSatellite: true, data: iss };
    issG.add(issHit);

    issG.lookAt(new THREE.Vector3(0, 0, 0));
    issG.userData = { isSatellite: true, data: iss };
    liveSatsGroup.add(issG);
  }

  function updateLiveEarthquakes3D() {
    if (!earthquakesGroup || !GLOBE.liveEarthquakes) return;
    while (earthquakesGroup.children.length > 0) {
      const obj = earthquakesGroup.children.pop();
      if (obj.geometry) obj.geometry.dispose();
    }
    const quakes = GLOBE.liveEarthquakes.slice(0, 60);
    for (let i = 0; i < quakes.length; i++) {
      const q = quakes[i];
      const pos = latLonToVec3(q.lat, q.lon, 0.504);
      const qG = new THREE.Group();
      qG.position.copy(pos);

      const r = Math.max(0.008, Math.min(0.045, (q.mag / 8.0) * 0.035));
      const col = q.mag >= 4.5 ? 0xff3b30 : (q.mag >= 2.5 ? 0xff9500 : 0x00f0ff);

      const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.75, r, 16), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthWrite: false }));
      qG.add(ring);

      const centerDot = new THREE.Mesh(new THREE.CircleGeometry(r * 0.35, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthWrite: false }));
      qG.add(centerDot);

      const normal = pos.clone().normalize();
      qG.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

      const qHit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.016, r * 1.2), 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      qHit.userData = { interactive: true, isQuake: true, data: q };
      qG.add(qHit);

      qG.userData = { isQuake: true, data: q, baseR: r };
      earthquakesGroup.add(qG);
    }
  }

  function updateLiveFlights3D() {
    if (!liveFlightsGroup || !GLOBE.liveFlights) return;
    while (liveFlightsGroup.children.length > 0) {
      const obj = liveFlightsGroup.children.pop();
      if (obj.geometry) obj.geometry.dispose();
    }
    const flights = GLOBE.liveFlights.slice(0, 60);
    for (const flt of flights) {
      const altNorm = 0.504 + Math.min(0.025, (flt.alt_m / 15000) * 0.018);
      const pos = latLonToVec3(flt.lat, flt.lon, altNorm);
      const fltG = new THREE.Group();
      fltG.position.copy(pos);

      const chevronPts = [
        new THREE.Vector3(0, 0.010, 0), new THREE.Vector3(-0.006, -0.006, 0),
        new THREE.Vector3(-0.006, -0.006, 0), new THREE.Vector3(0, -0.002, 0),
        new THREE.Vector3(0, -0.002, 0), new THREE.Vector3(0.006, -0.006, 0),
        new THREE.Vector3(0.006, -0.006, 0), new THREE.Vector3(0, 0.010, 0)
      ];
      const chevron = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(chevronPts), lineM({ color: 0x38bdf8 }));
      fltG.add(chevron);

      const normal = pos.clone().normalize();
      fltG.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      fltG.rotateZ(-THREE.MathUtils.degToRad(flt.heading || 0));

      // Ground altitude tether post
      const groundPos = latLonToVec3(flt.lat, flt.lon, 0.504);
      const tetherGeo = new THREE.BufferGeometry().setFromPoints([pos, groundPos]);
      const tetherLine = new THREE.Line(tetherGeo, lineM({ color: 0x38bdf8, transparent: true, opacity: 0.35 }));
      liveFlightsGroup.add(tetherLine);

      const fltHit = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      fltHit.userData = { interactive: true, isFlight: true, data: flt };
      fltG.add(fltHit);

      fltG.userData = { isFlight: true, data: flt };
      liveFlightsGroup.add(fltG);
    }
  }

  // ── 3D Live News Beacons & Holographic Light Pyramids ──
  async function pollLiveNews() {
    try {
      const res = await fetch('/api/geo/news');
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.channels)) {
        GLOBE.liveNews = data.channels;
        GLOBE.newsFetched = true;
        buildNewsBeacons();
        if (globeLabelCanvas && GLOBE.mode === 'NEWS') {
          drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
          if (globeLabelTex) globeLabelTex.needsUpdate = true;
        }
        syncLS3Taskbar();
      }
    } catch (e) {
      console.warn('Live news poll warning:', e);
    }
  }

  function buildNewsBeacons() {
    if (!newsBeaconsGroup || !GLOBE.liveNews.length) return;
    while (newsBeaconsGroup.children.length > 0) {
      const child = newsBeaconsGroup.children.pop();
      if (child.geometry) child.geometry.dispose();
    }

    GLOBE.liveNews.forEach((item) => {
      const pos = latLonToVec3(item.lat, item.lon, 0.506);
      const normal = pos.clone().normalize();
      const beaconItem = new THREE.Group();
      beaconItem.position.copy(pos);
      beaconItem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

      const hexColor = parseInt(item.color.replace('#', '0x'), 16) || 0x00e5ff;
      // Core glowing dot (decreased diameter to 0.014)
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.007, 10, 8),
        new THREE.MeshBasicMaterial({ color: hexColor, toneMapped: false })
      );
      beaconItem.add(core);

      // Additive glowing corona shell (pure glow, no rings)
      const glowMat = new THREE.MeshBasicMaterial({
        color: hexColor,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), glowMat);
      beaconItem.add(glow);

      // Hit sphere for raycasting
      const hitSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 8, 6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hitSphere.userData = { interactive: true, isNews: true, channel: item };
      beaconItem.add(hitSphere);

      beaconItem.userData = {
        core,
        glow,
        glowMat,
        baseScale: (item.intensity === 'BREAKING' ? 1.4 : (item.intensity === 'HIGH' ? 1.2 : 1.0)),
        channel: item
      };
      newsBeaconsGroup.add(beaconItem);
    });
  }

  function buildHoloPyramids() {
    holoPyramidGroup = new THREE.Group();
    holoPyramidGroup.visible = false;
    holoPyramidGroup.renderOrder = 35;

    function createPyramid(isLeft) {
      // 4 side triangles (12 vertices) + base quad (2 triangles = 6 vertices) = 18 vertices
      const geom = new THREE.BufferGeometry();
      const posArray = new Float32Array(18 * 3);
      geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

      const mat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const mesh = new THREE.Mesh(geom, mat);

      // Stage 1 Leading Beam Rays: 4 rays from apex to expanding corners (4 segments = 8 vertices)
      const rayGeom = new THREE.BufferGeometry();
      const rayArray = new Float32Array(8 * 3);
      rayGeom.setAttribute('position', new THREE.BufferAttribute(rayArray, 3));
      const rayMat = new THREE.LineBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const rayLines = new THREE.LineSegments(rayGeom, rayMat);

      // Stage 2 Base Perimeter Frame: 4 segments around the rectangular news display (8 vertices)
      const baseGeom = new THREE.BufferGeometry();
      const baseArray = new Float32Array(8 * 3);
      baseGeom.setAttribute('position', new THREE.BufferAttribute(baseArray, 3));
      const baseMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const baseLines = new THREE.LineSegments(baseGeom, baseMat);

      const grp = new THREE.Group();
      grp.add(mesh);
      grp.add(rayLines);
      grp.add(baseLines);
      grp.userData = {
        geom, posArray, mat,
        rayGeom, rayArray, rayMat,
        baseGeom, baseArray, baseMat,
        isLeft
      };
      return grp;
    }

    holoPyramidLeft = createPyramid(true);
    holoPyramidRight = createPyramid(false);
    holoPyramidGroup.add(holoPyramidLeft);
    holoPyramidGroup.add(holoPyramidRight);
    return holoPyramidGroup;
  }

  function updateHoloPyramids(progress) {
    if (!holoPyramidGroup) return;
    if (progress <= 0.005) {
      holoPyramidGroup.visible = false;
      window.dispatchEvent(new CustomEvent('lab:ls3:news:progress', {
        detail: { progress: 0, rayProgress: 0, displayProgress: 0 }
      }));
      return;
    }
    holoPyramidGroup.visible = true;

    // Get current world/sector position of selected news dot
    let apex = new THREE.Vector3(0, 0.8, 0.505);
    if (GLOBE.selectedNewsChannel && globeGroup) {
      const c = GLOBE.selectedNewsChannel;
      const physScale = 1.0 + (GLOBE.displayZoom - 1.0) * 0.20;
      const dotLocal = latLonToVec3(c.lat, c.lon, 0.506 * physScale);
      dotLocal.applyEuler(globeGroup.rotation);
      dotLocal.y += globeGroup.position.y;
      apex.copy(dotLocal);
    }

    // 3-Stage Holographic Manifestation Pipeline:
    // Stage 1 (0.0 to 0.35): 4 Individual light rays shoot out from apex toward the 4 display corners
    const rayT = THREE.MathUtils.clamp(progress / 0.35, 0.0, 1.0);
    const rayEased = 1.0 - Math.pow(1.0 - rayT, 2.8);

    // Stage 2 (0.35 to 0.70): Rays connect at corners and form the EXACT, light-filled rectangular BORDERs
    const borderT = THREE.MathUtils.clamp((progress - 0.35) / 0.35, 0.0, 1.0);
    const borderEased = 1.0 - Math.pow(1.0 - borderT, 2.2);

    // Stage 3 (0.70 to 1.0): Border slowly morphs into flickering holographic display
    const morphT = THREE.MathUtils.clamp((progress - 0.70) / 0.30, 0.0, 1.0);
    const morphEased = 1.0 - Math.pow(1.0 - morphT, 2.0);

    function updateWing(wingGroup, isLeft) {
      const u = wingGroup.userData;
      const pos = u.posArray;
      const rpos = u.rayArray;
      const bpos = u.baseArray;

      // Target rectangular base aligned to the EXACT 2D streaming panel on screen
      let tCorners = null;
      const domEl = typeof document !== 'undefined' ? (isLeft ? document.getElementById('ls3-news-left') : document.getElementById('ls3-news-right')) : null;
      if (domEl && cam) {
        const r = domEl.getBoundingClientRect();
        if (r.width > 20 && r.height > 20 && window.innerWidth > 0 && window.innerHeight > 0) {
          const w = window.innerWidth, h = window.innerHeight;
          // 4 screen pixel corners: bottom-left, bottom-right, top-right, top-left
          const screenCorners = [
            [r.left, r.bottom],
            [r.right, r.bottom],
            [r.right, r.top],
            [r.left, r.top]
          ];
          // Distance from camera along look axis (place base plane near globe depth)
          const apexWorld = wingGroup.parent ? wingGroup.parent.localToWorld(apex.clone()) : apex.clone();
          const d = Math.max(0.8, cam.position.distanceTo(apexWorld));
          const tanFov2 = Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5));
          const aspect = cam.aspect || (w / h);

          tCorners = screenCorners.map(([px, py]) => {
            const ndcX = (px / w) * 2 - 1;
            const ndcY = -(py / h) * 2 + 1;
            const xCam = ndcX * d * tanFov2 * aspect;
            const yCam = ndcY * d * tanFov2;
            const zCam = -d;
            const pWorld = new THREE.Vector3(xCam, yCam, zCam).applyMatrix4(cam.matrixWorld);
            return wingGroup.parent ? wingGroup.parent.worldToLocal(pWorld) : pWorld;
          });
        }
      }

      // Fallback if DOM element is not mounted/measurable
      if (!tCorners) {
        const cx = isLeft ? -1.35 : 1.35;
        const cy = 0.86;
        const cz = 0.72;
        const bw = 0.88;
        const bh = 0.65;
        tCorners = [
          new THREE.Vector3(cx - bw / 2, cy - bh / 2, cz),
          new THREE.Vector3(cx + bw / 2, cy - bh / 2, cz),
          new THREE.Vector3(cx + bw / 2, cy + bh / 2, cz),
          new THREE.Vector3(cx - bw / 2, cy + bh / 2, cz)
        ];
      }

      // Current corner positions of the expanding beam rays
      const bCorners = tCorners.map(tc => apex.clone().lerp(tc, rayEased));

      // 1. Stage 1: Update 4 leading beam rays from apex to bCorners
      let ri = 0;
      for (let c = 0; c < 4; c++) {
        rpos[ri++] = apex.x; rpos[ri++] = apex.y; rpos[ri++] = apex.z;
        rpos[ri++] = bCorners[c].x; rpos[ri++] = bCorners[c].y; rpos[ri++] = bCorners[c].z;
      }
      u.rayGeom.attributes.position.needsUpdate = true;

      // 2. Stage 2: Update exact rectangular base perimeter frame
      let bi = 0;
      for (let c = 0; c < 4; c++) {
        const cNext = (c + 1) % 4;
        bpos[bi++] = bCorners[c].x; bpos[bi++] = bCorners[c].y; bpos[bi++] = bCorners[c].z;
        bpos[bi++] = bCorners[cNext].x; bpos[bi++] = bCorners[cNext].y; bpos[bi++] = bCorners[cNext].z;
      }
      u.baseGeom.attributes.position.needsUpdate = true;

      // 3. Stage 3: Update 4 side triangles + 2 base quad triangles for pyramid volume
      const tris = [
        [apex, bCorners[0], bCorners[1]],
        [apex, bCorners[1], bCorners[2]],
        [apex, bCorners[2], bCorners[3]],
        [apex, bCorners[3], bCorners[0]],
        [bCorners[0], bCorners[1], bCorners[2]],
        [bCorners[0], bCorners[2], bCorners[3]]
      ];
      let vi = 0;
      for (let t = 0; t < tris.length; t++) {
        for (let p = 0; p < 3; p++) {
          pos[vi++] = tris[t][p].x;
          pos[vi++] = tris[t][p].y;
          pos[vi++] = tris[t][p].z;
        }
      }
      u.geom.attributes.position.needsUpdate = true;

      // High-tech sci-fi light shimmer & flicker
      const flicker = 0.88 + Math.sin(S.t * 16.0) * 0.08 + (Math.random() < 0.03 ? -0.12 : 0.04);
      
      // Stage 1: Leading rays shoot outward with high luminosity
      u.rayMat.opacity = Math.min(1.0, rayEased * 1.4) * (0.85 + 0.15 * morphEased) * flicker;
      
      // Stage 2: Exact rectangular base perimeter forms in brilliant light (invisible in Stage 1)
      u.baseMat.opacity = borderEased * 0.95 * flicker;

      // Stage 3: Volumetric translucent faces slowly morph into holographic display (invisible in Stage 1 & 2)
      u.mat.opacity = 0.18 * morphEased * flicker;
    }

    if (holoPyramidLeft) updateWing(holoPyramidLeft, true);
    if (holoPyramidRight) updateWing(holoPyramidRight, false);

    // Broadcast 3-stage synchronization progress to DOM displays
    window.dispatchEvent(new CustomEvent('lab:ls3:news:progress', {
      detail: {
        progress,
        rayProgress: rayEased,
        borderProgress: borderEased,
        displayProgress: morphEased
      }
    }));
  }

  function openLS3Taskbar() {
    GLOBE.taskbarOpen = true;
    window.dispatchEvent(new CustomEvent('lab:ls3:taskbar:open'));
    syncLS3Taskbar();
    sfx.relay();
  }

  function closeLS3Taskbar() {
    GLOBE.taskbarOpen = false;
    window.dispatchEvent(new CustomEvent('lab:ls3:taskbar:close'));
    sfx.servo(0.25, false);
  }

  function openNewsDispatch(channel) {
    GLOBE.selectedNewsChannel = channel;
    GLOBE.holoPyramidTarget = 1.0;
    GLOBE.targetLat = channel.lat;
    GLOBE.targetLon = channel.lon;
    GLOBE.targetName = `${channel.name.toUpperCase()} // ${channel.city.toUpperCase()}`;
    GLOBE.autoSpin = false;
    GLOBE.animatingToTarget = true;
    GLOBE.targetRotY = -THREE.MathUtils.degToRad(channel.lon);
    GLOBE.targetRotX = THREE.MathUtils.degToRad(channel.lat);
    sfx.blip(2600, 0.12, 0.05);
    const countryChannels = GLOBE.liveNews.filter(c => c.country === channel.country);
    window.dispatchEvent(new CustomEvent('lab:ls3:news:open', { detail: { channel, channels: countryChannels } }));
    syncLS3Taskbar();
  }

  function closeLS3News() {
    GLOBE.holoPyramidTarget = 0.0;
    GLOBE.selectedNewsChannel = null;
    window.dispatchEvent(new CustomEvent('lab:ls3:news:close'));
    sfx.servo(0.25, false);
  }

  function syncLS3Taskbar() {
    let telemetry = '';
    if (GLOBE.mode === 'SURFACE') {
      const count = GLOBE.liveEarthquakes.length;
      const topQ = GLOBE.liveEarthquakes[0];
      telemetry = `USGS SEISMIC: ${count} ACTIVE | TOP: ${topQ ? `M${topQ.mag.toFixed(1)} ${topQ.place.slice(0, 26).toUpperCase()}` : 'SYNCING...'}`;
    } else if (GLOBE.mode === 'ORBITAL') {
      const iss = GLOBE.liveISS;
      telemetry = iss ? `ISS ALT: ${iss.altitude_km.toFixed(1)}KM | VEL: ${iss.velocity_kmh}KM/H | ${iss.visibility}` : 'ACQUIRING ISS EPHEMERIS...';
    } else if (GLOBE.mode === 'AIRSPACE') {
      telemetry = `ADS-B RADAR: ${GLOBE.liveFlights.length} TRANSPONDERS ACTIVE ACROSS CORRIDORS`;
    } else if (GLOBE.mode === 'NEWS') {
      const sel = GLOBE.selectedNewsChannel;
      telemetry = sel ? `NEWS UPLINK: ${sel.name.toUpperCase()} (${sel.city.toUpperCase()}) | ${sel.intensity}` : `GLOBAL LIVE NEWS: ${GLOBE.liveNews.length} CHANNELS MONITORING LIVE`;
    }

    let activePreset = null;
    ['ATX', 'SFO', 'NYC', 'LON', 'TYO', 'GPS', 'ISS'].forEach(p => {
      if (p === 'ATX' && GLOBE.targetName?.includes('AUSTIN')) activePreset = 'ATX';
      if (p === 'SFO' && GLOBE.targetName?.includes('FRANCISCO')) activePreset = 'SFO';
      if (p === 'NYC' && GLOBE.targetName?.includes('NEW YORK')) activePreset = 'NYC';
      if (p === 'LON' && GLOBE.targetName?.includes('LONDON')) activePreset = 'LON';
      if (p === 'TYO' && GLOBE.targetName?.includes('TOKYO')) activePreset = 'TYO';
      if (p === 'GPS' && (GLOBE.targetName?.includes('CLIENT') || GLOBE.targetName?.includes('VISITOR'))) activePreset = 'GPS';
      if (p === 'ISS' && GLOBE.targetName?.includes('ISS')) activePreset = 'ISS';
    });

    window.dispatchEvent(new CustomEvent('lab:ls3:taskbar:update', {
      detail: {
        mode: GLOBE.mode,
        targetName: GLOBE.targetName || 'GLOBAL INTELLIGENCE NETWORK',
        zoom: GLOBE.displayZoom,
        telemetry,
        activePreset
      }
    }));
  }

  // ── High-Resolution Tactical Telemetry Plaque ──
  function drawGlobeLabel(cnv, geo) {
    if (!cnv) return;
    const ctx = cnv.getContext('2d'), w = cnv.width, h = cnv.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(4,18,28,.95)'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, w - 4, h - 4);

    if (GLOBE.albumNoticeUntil > performance.now()) {
      ctx.fillStyle = '#ff9fc0'; mono(ctx, 12, 'bold');
      ctx.fillText('ALBUM SYNC NOT YET ESTABLISHED', 12, 24);
      ctx.fillStyle = '#7ec5df'; mono(ctx, 10, '');
      ctx.fillText('RULE 5: PROCEDURAL REPOSITORY SPEC', 12, 44);
      ctx.fillText('RASTER ASSETS PERMANENTLY DEFERRED', 12, 60);
      return;
    }

    // Row 1: Header + Zoom Telemetry
    ctx.fillStyle = '#7ec5df'; mono(ctx, 8.5, '');
    ctx.fillText('GLOBAL SITUATIONAL INTELLIGENCE // LS3 GODS-EYE RECON', 12, 14);
    ctx.fillStyle = '#00f0ff'; mono(ctx, 8.5, 'bold');
    ctx.fillText(`ZOOM: ${GLOBE.displayZoom.toFixed(1)}x`, w - 82, 14);

    // Row 2: 4 Primary Mode Tabs
    const tabs = ['SURFACE', 'ORBITAL', 'AIRSPACE', 'NEWS'];
    tabs.forEach((tab, i) => {
      const bx = 12 + i * 90, by = 20, bw = 86, bh = 22;
      const isActive = (GLOBE.mode === tab);
      ctx.fillStyle = isActive ? 'rgba(0,240,255,0.28)' : 'rgba(10,35,50,0.5)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = isActive ? '#00f0ff' : '#225566';
      ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = isActive ? '#ffffff' : '#5fb3cc';
      mono(ctx, 8, isActive ? 'bold' : '');
      const sub = (tab === 'SURFACE' ? 'SEIS' : (tab === 'ORBITAL' ? 'ISS' : (tab === 'AIRSPACE' ? 'FLTS' : 'LIVE')));
      ctx.fillText(`[${i + 1}] ${tab.slice(0, 4)} (${sub})`, bx + 4, by + 15);
    });

    // Row 3: Presets (ATX, SFO, NYC, LON, TYO, GPS, ISS) + Zoom [-] and [+]
    ctx.strokeStyle = '#1a4455'; ctx.beginPath(); ctx.moveTo(12, 46); ctx.lineTo(w - 12, 46); ctx.stroke();

    const presets = [
      { id: 'ATX', label: 'ATX' },
      { id: 'SFO', label: 'SFO' },
      { id: 'NYC', label: 'NYC' },
      { id: 'LON', label: 'LON' },
      { id: 'TYO', label: 'TYO' },
      { id: 'GPS', label: 'GPS' },
      { id: 'ISS', label: 'ISS' }
    ];
    presets.forEach((p, i) => {
      const px = 12 + i * 42, py = 50, pw = 38, ph = 18;
      const isTarget = (p.id === 'ATX' && GLOBE.targetName?.includes('AUSTIN')) ||
                       (p.id === 'SFO' && GLOBE.targetName?.includes('FRANCISCO')) ||
                       (p.id === 'NYC' && GLOBE.targetName?.includes('NEW YORK')) ||
                       (p.id === 'LON' && GLOBE.targetName?.includes('LONDON')) ||
                       (p.id === 'TYO' && GLOBE.targetName?.includes('TOKYO')) ||
                       (p.id === 'GPS' && (GLOBE.targetName?.includes('CLIENT') || GLOBE.targetName?.includes('VISITOR'))) ||
                       (p.id === 'ISS' && GLOBE.targetName?.includes('ISS'));
      ctx.fillStyle = isTarget ? 'rgba(255,176,64,0.30)' : 'rgba(8,24,36,0.6)';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = isTarget ? '#ffb040' : '#1e4858';
      ctx.strokeRect(px, py, pw, ph);
      ctx.fillStyle = isTarget ? '#ffdf99' : '#7ec5df';
      mono(ctx, 8, isTarget ? 'bold' : '');
      ctx.fillText(`[${p.id}]`, px + 4, py + 13);
    });

    // Zoom Buttons [-] and [+]
    ctx.fillStyle = 'rgba(8,24,36,0.8)';
    ctx.fillRect(w - 62, 50, 22, 18);
    ctx.strokeStyle = '#38bdf8'; ctx.strokeRect(w - 62, 50, 22, 18);
    ctx.fillStyle = '#38bdf8'; mono(ctx, 10, 'bold');
    ctx.fillText('[-]', w - 59, 63);

    ctx.fillStyle = 'rgba(8,24,36,0.8)';
    ctx.fillRect(w - 34, 50, 22, 18);
    ctx.strokeStyle = '#38bdf8'; ctx.strokeRect(w - 34, 50, 22, 18);
    ctx.fillStyle = '#38bdf8'; mono(ctx, 10, 'bold');
    ctx.fillText('[+]', w - 31, 63);

    ctx.strokeStyle = '#1a4455'; ctx.beginPath(); ctx.moveTo(12, 72); ctx.lineTo(w - 12, 72); ctx.stroke();

    // Row 4: Mode Specific Real-Time Telemetry Readout
    if (GLOBE.mode === 'SURFACE') {
      const qCount = GLOBE.liveEarthquakes.length;
      const topQ = GLOBE.liveEarthquakes[0];
      ctx.fillStyle = '#9ff3ff'; mono(ctx, 9, 'bold');
      const loc = geo && geo.city ? `${geo.city}, ${geo.country}`.toUpperCase() : (GLOBE.targetName || 'CLIENT FIX ACQUIRED');
      ctx.fillText(`SURFACE MONITOR // ${loc}`, 12, 85);
      ctx.fillStyle = '#38bdf8'; mono(ctx, 8, '');
      ctx.fillText(`USGS SEISMIC FEED: ${qCount} LIVE EARTHQUAKES ACTIVE (M1.0+)`, 12, 98);
      if (topQ) {
        ctx.fillStyle = topQ.mag >= 4.5 ? '#ff4d4d' : '#ffb040';
        ctx.fillText(`RECENT EVENT: M${topQ.mag.toFixed(1)} · ${topQ.place.slice(0, 36).toUpperCase()} · ${topQ.depth_km.toFixed(1)}KM`, 12, 110);
      } else {
        ctx.fillText('GLOBAL SEISMIC NETWORK SYNCHRONIZING...', 12, 110);
      }
      ctx.fillStyle = '#5fb3cc';
      ctx.fillText('100% REAL-TIME USGS SEISMOLOGY & CF-EDGE GEOLOCATION', 12, 122);
    } else if (GLOBE.mode === 'ORBITAL') {
      const iss = GLOBE.liveISS;
      ctx.fillStyle = '#9ff3ff'; mono(ctx, 9, 'bold');
      ctx.fillText('ORBITAL RECON: INTERNATIONAL SPACE STATION (ISS 25544)', 12, 85);
      ctx.fillStyle = '#38bdf8'; mono(ctx, 8, '');
      if (iss) {
        const latStr = `${Math.abs(iss.lat).toFixed(2)}°${iss.lat >= 0 ? 'N' : 'S'}`;
        const lonStr = `${Math.abs(iss.lon).toFixed(2)}°${iss.lon >= 0 ? 'E' : 'W'}`;
        ctx.fillText(`POSITION: ${latStr} ${lonStr} · ALT: ${iss.altitude_km.toFixed(1)} KM · VEL: ${iss.velocity_kmh.toLocaleString()} KM/H`, 12, 98);
        ctx.fillText(`STATUS: ${(iss.visibility || 'DAYLIGHT').toUpperCase()} · FOOTPRINT: ${Math.round(iss.footprint_km || 4500)} KM`, 12, 110);
      } else {
        ctx.fillText('ACQUIRING REAL-TIME NORAD / CELESTRAK EPHEMERIS...', 12, 98);
        ctx.fillText('STANDBY FOR LIVE TELEMETRY LOCK...', 12, 110);
      }
      ctx.fillStyle = '#5fb3cc';
      ctx.fillText('100% REAL-TIME CELESTRAK / WHERE-THE-ISS-AT ORBITAL FEED', 12, 122);
    } else if (GLOBE.mode === 'AIRSPACE') {
      const flts = GLOBE.liveFlights;
      ctx.fillStyle = '#9ff3ff'; mono(ctx, 9, 'bold');
      ctx.fillText(`LIVE AIRSPACE: ${flts.length} AIRCRAFT TRANSPONDERS ACTIVE [ADS-B]`, 12, 85);
      ctx.fillStyle = '#38bdf8'; mono(ctx, 8, '');
      const f0 = flts[0];
      if (f0) {
        ctx.fillText(`TRACKING: ${f0.callsign} (${f0.country}) · ALT: ${f0.alt_m}M · SPEED: ${f0.velocity_kmh} KM/H`, 12, 98);
        ctx.fillText(`HEADING: ${Math.round(f0.heading || 0)}° · RADAR INTERCEPT VECTOR ACTIVE`, 12, 110);
      } else {
        ctx.fillText('ACQUIRING GLOBAL ADS-B RADAR TRANSPONDERS...', 12, 98);
        ctx.fillText('CONNECTING TO OPENSKY / ADSB.LOL RECEPTORS...', 12, 110);
      }
      ctx.fillStyle = '#5fb3cc';
      ctx.fillText('100% REAL-TIME OPENSKY NETWORK / ADSB.LOL SURVEILLANCE FEED', 12, 122);
    } else if (GLOBE.mode === 'NEWS') {
      const nCount = GLOBE.liveNews.length;
      const sel = GLOBE.selectedNewsChannel;
      ctx.fillStyle = '#9ff3ff'; mono(ctx, 9, 'bold');
      if (sel) {
        ctx.fillText(`GLOBAL NEWS UPLINK // ${sel.name.toUpperCase()} (${sel.city.toUpperCase()})`, 12, 85);
        ctx.fillStyle = '#ff7a8a'; mono(ctx, 8, 'bold');
        ctx.fillText(`BROADCAST INTENSITY: [${sel.intensity}] · NETWORK: ${sel.network.toUpperCase()}`, 12, 98);
        ctx.fillStyle = '#cbf5ff'; mono(ctx, 8, '');
        ctx.fillText(sel.headlines?.[0]?.slice(0, 56) || 'LIVE BROADCAST STREAMING IN PROGRESS...', 12, 110);
      } else {
        ctx.fillText(`GLOBAL NEWS NETWORK: ${nCount} INTERNATIONAL CHANNELS ACTIVE`, 12, 85);
        ctx.fillStyle = '#38bdf8'; mono(ctx, 8, '');
        ctx.fillText('CLICK ANY GLOWING BEACON ON GLOBE TO OPEN 3D HOLOGRAPHIC DISPLAY', 12, 98);
        ctx.fillText('ENGLISH LIVE STREAMING (YOUTUBE) + REAL-TIME DISPATCH DESK', 12, 110);
      }
      ctx.fillStyle = '#5fb3cc';
      ctx.fillText('100% REAL-TIME INTERNATIONAL NEWS FEEDS · ZERO EXTERNAL RASTERS', 12, 122);
    }
  }

  function zoomGlobe(factor) {
    GLOBE.zoom = clamp(GLOBE.zoom * factor, 1.0, 4.5);
    sfx.blip(1400 + Math.floor(GLOBE.zoom * 80), 0.03, 0.015);
    if (globeLabelCanvas) {
      drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
      if (globeLabelTex) globeLabelTex.needsUpdate = true;
    }
  }

  function selectTargetPreset(presetId) {
    let target = null;
    if (presetId === 'GPS') {
      if (GLOBE.geo && GLOBE.geo.lat != null) {
        target = {
          name: `${(GLOBE.geo.city || 'VISITOR').toUpperCase()} · LOCAL CLIENT`,
          lat: GLOBE.geo.lat,
          lon: GLOBE.geo.lon
        };
        setGlobeMode('SURFACE');
      } else {
        target = TARGET_PRESETS[0];
      }
    } else if (presetId === 'ISS') {
      if (GLOBE.liveISS && GLOBE.liveISS.lat != null) {
        target = {
          name: 'ISS (ZARYA) · ORBITAL STATION',
          lat: GLOBE.liveISS.lat,
          lon: GLOBE.liveISS.lon
        };
        setGlobeMode('ORBITAL');
      } else {
        target = TARGET_PRESETS[0];
      }
    } else {
      target = TARGET_PRESETS.find(p => p.id === presetId) || TARGET_PRESETS[0];
    }
    GLOBE.targetLat = target.lat;
    GLOBE.targetLon = target.lon;
    GLOBE.targetName = target.name;
    GLOBE.autoSpin = false;
    GLOBE.animatingToTarget = true;
    GLOBE.targetRotY = -THREE.MathUtils.degToRad(target.lon);
    GLOBE.targetRotX = THREE.MathUtils.degToRad(target.lat);
    sfx.blip(1700, 0.06, 0.03);
    GLOBE.zoom = 2.2;
    if (globeLabelCanvas) {
      drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
      if (globeLabelTex) globeLabelTex.needsUpdate = true;
    }
  }

  function placeBeacon(lat, lon) {
    if (!globeGroup) return;
    if (!beaconGroup) {
      beaconGroup = new THREE.Group();
      beaconGroup.renderOrder = 100;
      globeGroup.add(beaconGroup);

      const backGeo = new THREE.CircleGeometry(0.040, 32);
      const backMat = new THREE.MeshBasicMaterial({ color: 0x021620, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthWrite: false });
      const backMesh = new THREE.Mesh(backGeo, backMat);
      backMesh.renderOrder = 100;
      beaconGroup.add(backMesh);

      const reticlePts = [
        new THREE.Vector3(-0.055, 0, 0), new THREE.Vector3(-0.035, 0, 0),
        new THREE.Vector3(0.035, 0, 0), new THREE.Vector3(0.055, 0, 0),
        new THREE.Vector3(0, -0.055, 0), new THREE.Vector3(0, -0.035, 0),
        new THREE.Vector3(0, 0.035, 0), new THREE.Vector3(0, 0.055, 0)
      ];
      const reticleGeo = new THREE.BufferGeometry().setFromPoints(reticlePts);
      const reticleMat = lineM({ color: 0x00f0ff });
      const reticleMesh = new THREE.LineSegments(reticleGeo, reticleMat);
      reticleMesh.renderOrder = 101;
      beaconGroup.add(reticleMesh);

      const ringGeo = new THREE.RingGeometry(0.024, 0.032, 32);
      beaconRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false });
      const ring = new THREE.Mesh(ringGeo, beaconRingMat);
      ring.renderOrder = 102;
      beaconGroup.add(ring);

      const beadGeo = new THREE.SphereGeometry(0.012, 16, 16);
      const beadMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false });
      const bead = new THREE.Mesh(beadGeo, beadMat);
      bead.renderOrder = 103;
      beaconGroup.add(bead);
    }

    const pos = latLonToVec3(lat, lon, 0.512);
    beaconGroup.position.copy(pos);
    const normal = pos.clone().normalize();
    beaconGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  }

  function setGlobeMode(newMode) {
    if (GLOBE.mode === newMode) return;
    GLOBE.mode = newMode;
    if (globeLabelCanvas) {
      drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
      if (globeLabelTex) globeLabelTex.needsUpdate = true;
    }
    sfx.blip(1200, 0.04, 0.02);

    if (orbitRingsGroup) orbitRingsGroup.visible = (newMode === 'ORBITAL');
    if (liveSatsGroup) liveSatsGroup.visible = (newMode === 'ORBITAL');
    if (flightArcsGroup) flightArcsGroup.visible = (newMode === 'AIRSPACE');
    if (liveFlightsGroup) liveFlightsGroup.visible = (newMode === 'AIRSPACE');
    if (cityNodesGroup) cityNodesGroup.visible = (newMode === 'SURFACE' || newMode === 'AIRSPACE' || newMode === 'NEWS');
    if (earthquakesGroup) earthquakesGroup.visible = (newMode === 'SURFACE');
    if (newsBeaconsGroup) newsBeaconsGroup.visible = (newMode === 'NEWS' || newMode === 'SURFACE');

    if (newMode === 'ORBITAL') pollLiveSatellites();
    else if (newMode === 'AIRSPACE') pollLiveFlights();
    else if (newMode === 'SURFACE') pollLiveEarthquakes();
    else if (newMode === 'NEWS') pollLiveNews();

    syncLS3Taskbar();
  }

  function triggerGlobeAlbum() {
    GLOBE.albumNoticeUntil = performance.now() + 3500;
    if (globeLabelCanvas) {
      drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
      if (globeLabelTex) globeLabelTex.needsUpdate = true;
    }
    sfx.servo(0.3, false);
    if (api2.globe.onAlbum) api2.globe.onAlbum();
  }

  async function fetchGeoIfNeeded(force = false) {
    if (GLOBE.geoFetched && !force) return;
    GLOBE.geoFetched = true;
    try {
      const res = await fetch('/api/geo/locate', { cache: 'no-store' });
      if (!res.ok) throw new Error('geo_fail');
      const data = await res.json();
      GLOBE.geo = data;
      if (data.lat != null && data.lon != null) {
        GLOBE.targetLat = data.lat;
        GLOBE.targetLon = data.lon;
        GLOBE.targetName = [data.city, data.country].filter(Boolean).join(', ') || 'VISITOR SECTOR';
        placeBeacon(data.lat, data.lon);
      }
      if (globeLabelCanvas) {
        drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
        if (globeLabelTex) globeLabelTex.needsUpdate = true;
      }
    } catch {
      GLOBE.geo = { lat: null, lon: null, error: true };
      if (globeLabelCanvas) {
        drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
        if (globeLabelTex) globeLabelTex.needsUpdate = true;
      }
    }
    pollLiveSatellites();
    pollLiveEarthquakes();
    pollLiveFlights();
  }

  { const g = sectorGroup(6, 3.95); add(cyl(.26, .3, .07, tit, 24), 0, .035, 0, g); const puck = E(0x3fe0ff); const puckMesh = add(cyl(.18, .18, .006, puck, 24), 0, .074, 0, g); puckMesh.userData.interactive = true; puckMesh.userData.isPuck = true; leds.push({ m: puck, target: 1.8, t0: T.power[0] + 3.3 });   // LS3 · holo-globe
    const globe = new THREE.Group(); globe.position.y = .8; g.add(globe); globeGroup = globe; globe.userData.isGlobe = true;

    // ── 1. Smooth Obsidian Base Core (64x48 smooth silhouette, depthWrite: true) ──
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x030814, roughness: 0.85, metalness: 0.15, transparent: false, depthWrite: true });
    const globeCore = new THREE.Mesh(new THREE.SphereGeometry(.498, LOW ? 32 : 64, LOW ? 24 : 48), coreMat);
    globe.add(globeCore);

    // ── 2. Vector Earth Coastlines (5,128-point precision geometry) ──
    const coastPts = [];
    for (let p = 0; p < CONTINENT_POLYS.length; p++) {
      const poly = CONTINENT_POLYS[p];
      for (let i = 0; i < poly.length - 1; i++) {
        coastPts.push(latLonToVec3(poly[i][0], poly[i][1], 0.503));
        coastPts.push(latLonToVec3(poly[i + 1][0], poly[i + 1][1], 0.503));
      }
    }
    const coastGeo = new THREE.BufferGeometry().setFromPoints(coastPts);
    const coastMat = lineM({ color: 0x00f0ff });
    coastLinesMesh = new THREE.LineSegments(coastGeo, coastMat);
    globe.add(coastLinesMesh);
    holos.push({ m: coastMat, target: 0.95, t0: T.power[0] + 3.5 });

    // ── 3. Uniform Fibonacci Landmass Dot-Matrix ──
    const landPts = [], oceanPts = [];
    const N_FIBO = LOW ? 1400 : 2600;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N_FIBO; i++) {
      const y = 1 - (i / (N_FIBO - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const lat = Math.asin(y) * 180 / Math.PI;
      const lon = Math.atan2(z, x) * 180 / Math.PI;
      if (isLandPoint(lat, lon)) {
        landPts.push(new THREE.Vector3(x * 0.502, y * 0.502, z * 0.502));
      } else if (i % 4 === 0) {
        oceanPts.push(new THREE.Vector3(x * 0.5005, y * 0.5005, z * 0.5005));
      }
    }
    const landGeo = new THREE.BufferGeometry().setFromPoints(landPts);
    const landMat = new THREE.PointsMaterial({ color: 0x10b981, size: 0.009, transparent: true, opacity: 0.85, depthWrite: false });
    landPointsMesh = new THREE.Points(landGeo, landMat);
    globe.add(landPointsMesh);
    holos.push({ m: landMat, target: 0.85, t0: T.power[0] + 3.5 });

    const oceanGeo = new THREE.BufferGeometry().setFromPoints(oceanPts);
    const oceanMat = new THREE.PointsMaterial({ color: 0x034559, size: 0.005, transparent: true, opacity: 0.35, depthWrite: false });
    oceanPointsMesh = new THREE.Points(oceanGeo, oceanMat);
    globe.add(oceanPointsMesh);
    holos.push({ m: oceanMat, target: 0.35, t0: T.power[0] + 3.5 });

    // ── 4. Strategic City Nodes ──
    cityNodesGroup = new THREE.Group();
    for (const city of CITY_NODES) {
      const pos = latLonToVec3(city.lat, city.lon, 0.505);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), new THREE.MeshBasicMaterial({ color: 0x5fe8ff }));
      dot.position.copy(pos);
      dot.userData = { isCity: true, city };
      cityNodesGroup.add(dot);
    }
    globe.add(cityNodesGroup);

    // ── 5. Latitude / Longitude Reference Grid ──
    const gridMat = lineM({ color: 0x185566 });
    const R_GRID = .501;
    const gridPts = [];
    const PAR_COUNT = 6, MER_COUNT = 8, SEGS = 48;
    for (let i = 1; i < PAR_COUNT; i++) {
      const lat = (i / PAR_COUNT - .5) * Math.PI;
      const y = Math.sin(lat) * R_GRID, r = Math.cos(lat) * R_GRID;
      for (let j = 0; j < SEGS; j++) {
        const a1 = (j / SEGS) * TAU, a2 = ((j + 1) / SEGS) * TAU;
        gridPts.push(new THREE.Vector3(Math.cos(a1) * r, y, Math.sin(a1) * r), new THREE.Vector3(Math.cos(a2) * r, y, Math.sin(a2) * r));
      }
    }
    for (let i = 0; i < MER_COUNT; i++) {
      const lon = (i / MER_COUNT) * Math.PI;
      const cosL = Math.cos(lon), sinL = Math.sin(lon);
      for (let j = 0; j < SEGS; j++) {
        const a1 = (j / SEGS) * TAU, a2 = ((j + 1) / SEGS) * TAU;
        gridPts.push(new THREE.Vector3(Math.sin(a1) * cosL * R_GRID, Math.cos(a1) * R_GRID, Math.sin(a1) * sinL * R_GRID), new THREE.Vector3(Math.sin(a2) * cosL * R_GRID, Math.cos(a2) * R_GRID, Math.sin(a2) * sinL * R_GRID));
      }
    }
    const gridMesh = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPts), gridMat);
    globe.add(gridMesh);
    holos.push({ m: gridMat, target: .22, t0: T.power[0] + 3.5 });

    // ── 6. Orbital Satellite Constellations & Live Vehicles ──
    orbitRingsGroup = new THREE.Group();
    satMeshes = [];
    for (const satCfg of SATELLITE_CONFIGS) {
      const orbitRingPts = [];
      const O_SEGS = 64;
      for (let i = 0; i <= O_SEGS; i++) {
        const a = (i / O_SEGS) * TAU;
        orbitRingPts.push(new THREE.Vector3(Math.cos(a) * satCfg.radius, 0, Math.sin(a) * satCfg.radius));
      }
      const ringMat = lineM({ color: satCfg.color });
      const ringLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbitRingPts), ringMat);
      ringLine.rotation.x = THREE.MathUtils.degToRad(satCfg.inc);
      orbitRingsGroup.add(ringLine);
      holos.push({ m: ringMat, target: 0.35, t0: T.power[0] + 3.6 });

      const satVehicle = new THREE.Group();
      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.010, 0.008), new THREE.MeshBasicMaterial({ color: 0xdff6ff }));
      const wingMesh = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.002, 0.010), new THREE.MeshBasicMaterial({ color: satCfg.color }));
      satVehicle.add(bodyMesh, wingMesh);
      orbitRingsGroup.add(satVehicle);

      satMeshes.push({ group: satVehicle, inc: THREE.MathUtils.degToRad(satCfg.inc), radius: satCfg.radius, speed: satCfg.speed, angle: Math.random() * TAU });
    }
    globe.add(orbitRingsGroup);

    liveSatsGroup = new THREE.Group();
    globe.add(liveSatsGroup);

    // ── 7. Airspace Great-Circle Flight Corridors & Live Transponders ──
    flightArcsGroup = new THREE.Group();
    flightPulseMeshes = [];
    for (let c = 0; c < FLIGHT_CORRIDORS.length; c++) {
      const corridor = FLIGHT_CORRIDORS[c];
      const p1 = latLonToVec3(corridor.from[0], corridor.from[1], 0.504);
      const p2 = latLonToVec3(corridor.to[0], corridor.to[1], 0.504);
      const arcPts = [];
      const ARC_SEGS = 32;
      for (let i = 0; i <= ARC_SEGS; i++) {
        const s = i / ARC_SEGS;
        const pt = new THREE.Vector3().copy(p1).lerp(p2, s).normalize();
        const alt = 4 * s * (1 - s) * 0.038;
        pt.multiplyScalar(0.504 + alt);
        arcPts.push(pt);
      }
      const arcMat = lineM({ color: 0x38bdf8 });
      const arcLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), arcMat);
      flightArcsGroup.add(arcLine);
      holos.push({ m: arcMat, target: 0.40, t0: T.power[0] + 3.6 });

      const pulseDot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      flightArcsGroup.add(pulseDot);
      flightPulseMeshes.push({ mesh: pulseDot, pts: arcPts, speed: 0.25 + c * 0.05, progress: (c * 0.22) % 1.0 });
    }
    globe.add(flightArcsGroup);

    liveFlightsGroup = new THREE.Group();
    globe.add(liveFlightsGroup);

    // ── 8. Tactical Radar Sweep Meridian ──
    const sweepPts = [];
    for (let i = 0; i <= 36; i++) {
      const lat = (i / 36 - 0.5) * Math.PI;
      sweepPts.push(new THREE.Vector3(0, Math.sin(lat) * 0.506, Math.cos(lat) * 0.506));
    }
    const sweepMat = lineM({ color: 0x00f0ff });
    radarSweepMesh = new THREE.Line(new THREE.BufferGeometry().setFromPoints(sweepPts), sweepMat);
    globe.add(radarSweepMesh);
    holos.push({ m: sweepMat, target: 0.30, t0: T.power[0] + 3.5 });

    // ── 8b. Real-Time Seismic Group (USGS Earthquakes) ──
    earthquakesGroup = new THREE.Group();
    earthquakesGroup.visible = true;
    globe.add(earthquakesGroup);

    // ── 8c. Global Live News Beacons ──
    newsBeaconsGroup = new THREE.Group();
    newsBeaconsGroup.visible = true;
    globe.add(newsBeaconsGroup);

    // ── 8d. 3D Dual Square Pyramid Holographic Light Beams ──
    buildHoloPyramids();
    g.add(holoPyramidGroup);

    // Invisible Hit Sphere for pointer drag
    const globeHit = new THREE.Mesh(new THREE.SphereGeometry(.51, 16, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    globeHit.userData.interactive = true; globeHit.userData.isGlobe = true; globe.add(globeHit);

    // ── 9. High-Resolution Interactive Telemetry Plaque ──
    globeLabelCanvas = document.createElement('canvas');
    globeLabelCanvas.width = 384;
    globeLabelCanvas.height = 128;
    drawGlobeLabel(globeLabelCanvas, null);
    globeLabelTex = new THREE.CanvasTexture(globeLabelCanvas);
    globeLabelTex.colorSpace = THREE.SRGBColorSpace;
    const labelMat = new THREE.MeshBasicMaterial({ map: globeLabelTex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    globeLabelMesh = add(new THREE.Mesh(new THREE.PlaneGeometry(.52, .17), labelMat), 0, .38, .42, g);
    globeLabelMesh.rotation.x = -0.58; globeLabelMesh.renderOrder = 20;
    globeLabelMesh.userData.interactive = true; globeLabelMesh.userData.isLabel = true;
    holos.push({ m: labelMat, target: 0.98, t0: T.power[0] + 3.4 });

    tag(g, 'LS3'); heroGroups.push({ id: 'LS3', group: g });
    loadDetailedCoastlines();
    fetchGeoIfNeeded();
    pollLiveSatellites();
    pollLiveEarthquakes();
    pollLiveFlights();
    pollLiveNews();
    window.addEventListener('lab:focus', e => {
      if (e.detail?.id === 'LS3') {
        fetchGeoIfNeeded();
        pollLiveSatellites();
        pollLiveEarthquakes();
        pollLiveFlights();
        pollLiveNews();
        syncLS3Taskbar();
      }
    });
  }
  { const g = sectorGroup(7, 3.55); add(box(1.9, 1.15, .05, compD), 0, .62, 0, g); for (const x of [-.85, .85]) add(cyl(.015, .015, 1.24, tit, 8), x, .62, -.04, g);   // LS2 · scratchpad wall
    const nt = TEX.note(), cols = [0xfff07a, 0xffb1c8, 0x9fe8ff, 0xc8ffb0], notes = []; for (let i = 0; i < 16; i++) { const n = new THREE.Mesh(new THREE.PlaneGeometry(.16, .16), mat({ map: nt, color: cols[i % 4], roughness: .95 })); n.position.set((hash(i * 1.9) - .5) * 1.6, .22 + hash(i * 3.3) * .8, .03); n.rotation.z = (hash(i * 5.1) - .5) * .4; n.userData.interactive = true; n.userData.noteIdx = i; notes.push(n); } notes.forEach(n => g.add(n));
    add(box(.34, .035, .26, mat({ color: 0x2a2620, roughness: .9 })), .55, .018, .42, g); add(cyl(.007, .007, .16, tit, 6), .1, .007, .46, g).rotation.set(Math.PI / 2, 0, .6); tag(g, 'LS2'); heroGroups.push({ id: 'LS2', group: g }); }

  const PROFILE_TABS = ['PROFILE', 'SYSTEMS', 'PAPERS', 'CONTACT'];
  let curProfTab = 0, profCanvas, profTex;
  function drawProf(cnv) {
    const g = cnv.getContext('2d'), w = cnv.width, h = cnv.height;
    g.fillStyle = 'rgba(6,26,38,.85)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#39d6ff'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = '#9ff3ff'; mono(g, 15); g.fillText('OPERATIVE PROFILE', 14, 26);
    g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; g.lineTo(60 + Math.cos(a) * 34, 90 + Math.sin(a) * 34); } g.closePath(); g.strokeStyle = '#5fe8ff'; g.stroke(); mono(g, 10, '');
    PROFILE_TABS.forEach((t, i) => { g.fillStyle = i === curProfTab ? '#5fe8ff' : '#3f7a88'; g.fillText(`[${t}]`, 14 + i * 76, 156); });
    const desc = [
      'PRIYANSH GADIA · SYSTEMS ARCHITECT / GRAPHICS SPECIALIST',
      'ENGINE: REAL-TIME PROCEDURAL WEBGL R160 · ZERO RASTER ASSETS',
      'PUBLICATIONS & RESEARCH CITATIONS SYNCHRONIZED',
      'ENCRYPTED UPLINK: PRIYANSHGADIA@GITHUB · CLEARANCE L5'
    ];
    g.fillStyle = '#cbf5ff'; mono(g, 11, '');
    g.fillText(desc[curProfTab] || '', 14, 195);
    for (let i = 0; i < 7; i++) { g.fillStyle = '#1b4a58'; g.fillRect(14, 220 + i * 22, 120 + hash(i + curProfTab * 5) * 160, 8); }
  }
  { const g = sectorGroup(8, 3.95); add(box(1.1, .04, .26, gunD), 0, .02, 0, g); for (const x of [-.5, .5]) add(cyl(.014, .014, 1.6, tit, 8), x, .82, 0, g);   // LS1 · profile panel
    profCanvas = document.createElement('canvas'); profCanvas.width = 320; profCanvas.height = 440; drawProf(profCanvas);
    profTex = new THREE.CanvasTexture(profCanvas); profTex.colorSpace = THREE.SRGBColorSpace;
    const pm = holoMat(profTex);
    const profMesh = add(new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.4), pm), 0, .85, 0, g);
    profMesh.userData.interactive = true; profMesh.userData.uvW = 320; profMesh.userData.uvH = 440;
    holos.push({ m: pm, target: .8, t0: T.power[0] + 3.2 }); tag(g, 'LS1'); heroGroups.push({ id: 'LS1', group: g }); }
  { const cans = [], boxes = [], bars = []; for (const k of [1, 3, 6, 7, 8]) for (let i = 0; i < 3; i++) { const side = i & 1 ? 1 : -1, th = k * SEC + side * (.29 + hash(k * 13 + i) * .03), r = 3.5 + hash(k * 7 + i * 3) * .7, kind = Math.floor(hash(k + i * 11) * 3);   // clutter at sector edges only — never under an installation
      const o = kind === 0 ? cyl(.04, .045, .14, tit, 12) : kind === 1 ? box(.18, .08, .1, comp) : box(.16, .012, .03, tit); o.position.copy(polar(th, r, TOP + (kind === 0 ? .07 : kind === 1 ? .04 : .006))); o.rotation.y = hash(i * k) * TAU; (kind === 0 ? cans : kind === 1 ? boxes : bars).push(o); }
    merged(cans, tit, table); merged(boxes, comp, table); merged(bars, tit, table); }
  for (const s of SECTORS) if (s.k) { const hb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 1.4), new THREE.MeshBasicMaterial({ visible: false })); hb.visible = false; hb.position.copy(polar(s.theta, 3.98, DK_Y + .5)); hb.rotation.y = s.theta; hb.userData.sector = s.id; table.add(hb); hits.push(hb); }

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
  const bokeh = null;
  const sectorGroups = {}; heroGroups.forEach(h => { sectorGroups[h.id] = h.group; });
  const FOCUS_CFG = {
    RS1: { dolly: (g) => [g.localToWorld(new THREE.Vector3(0, .6, .5)), g.localToWorld(new THREE.Vector3(0, .01, 0))] },
    RS2: { dolly: (g) => [g.localToWorld(new THREE.Vector3(0, .45, .36)), g.localToWorld(new THREE.Vector3(0, .025, .03))] },
    RS3: { dolly: (g) => [g.localToWorld(new THREE.Vector3(0, .84, 1.05)), g.localToWorld(new THREE.Vector3(0, .78, 0))] },
    LS3: { dolly: (g) => [g.localToWorld(new THREE.Vector3(0, 1.05, 2.35)), g.localToWorld(new THREE.Vector3(0, 0.62, 0.15))] },
    LS2: { dolly: (g) => [g.localToWorld(new THREE.Vector3(0, .65, .75)), g.localToWorld(new THREE.Vector3(0, .62, 0))] },
    LS1: { dolly: (g) => [g.localToWorld(new THREE.Vector3(0, .88, .88)), g.localToWorld(new THREE.Vector3(0, .85, 0))] },
  };
  const FOCUS = { id: null, t: 0, from: new THREE.Vector3(), fromQ: new THREE.Quaternion(), toPos: new THREE.Vector3(), toLook: new THREE.Vector3(), active: false };

  const api2 = {
    resume: {
      onFields: null,
      onBuild: null,
      get busy() { return RESUME.busy; },
      set busy(v) { RESUME.busy = v; },
      triggerPrint: () => triggerGenerateAndPrint(),
      getState: () => RESUME,
      setQuery: (q) => RESUME.setQuery(q),
      setCategory: (cat) => { RESUME.category = cat; RESUME.scroll = 0; applyResumeFilter(); drawResume(resumeCanvas); if (resumeTex) resumeTex.needsUpdate = true; },
      setTemplate: (tpl) => { RESUME.template = tpl; drawResume(resumeCanvas); if (resumeTex) resumeTex.needsUpdate = true; },
    },
    notes: { onLoad: null, onSave: null },
    globe: {
      onLocate: null,
      _onAlbum: null,
      get onAlbum() { return this._onAlbum; },
      set onAlbum(fn) { this._onAlbum = fn; },
      triggerAlbum: () => triggerGlobeAlbum(),
      openTaskbar: () => openLS3Taskbar(),
      closeTaskbar: () => closeLS3Taskbar(),
      openNews: (channel) => openNewsDispatch(channel),
      closeNews: () => closeLS3News(),
      setMode: (m) => setGlobeMode(m),
      zoom: (f) => zoomGlobe(f),
      selectPreset: (p) => selectTargetPreset(p),
      pollNews: () => pollLiveNews(),
      getState: () => GLOBE,
      getGroup: () => globeGroup,
      syncGeo: () => fetchGeoIfNeeded(true),
      setGeo: (data) => {
        GLOBE.geo = data;
        if (data.lat != null && data.lon != null) placeBeacon(data.lat, data.lon);
        if (globeLabelCanvas) {
          drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
          if (globeLabelTex) globeLabelTex.needsUpdate = true;
        }
      },
    },
    calendar: {
      onLoad: null,
      getState: () => CAL,
      sync: (force) => syncCalendarIfStale(force),
      redraw: () => redrawCal(),
      submit: () => calSubmitRequest(),
    },
    blueprint: { onRepos: null },
    profile: { onLinks: null, onBlog: null },
  };

  const dragPlaneY = new THREE.Plane(new THREE.Vector3(0, 1, 0));
  const dragPt = new THREE.Vector3(), dragOff = new THREE.Vector3();
  let dragging = null;
  let readId = null, justOpenedReadAt = 0;
  let dragScreenDist = 0, dragPointerId = null, dragStartX = 0, dragStartY = 0;
  const READ_DIST = 0.50, READ_SCALE = 1.20;

  function openReadMode(id, instant = false) {
    if (!id || id === '__placeholder__') return;
    const s = sheets.get(id);
    if (!s) return;
    readId = id;
    justOpenedReadAt = performance.now();
    s.plane.renderOrder = 999;
    s.group.renderOrder = 999;
    sfx.relay();
    const p = s.project;
    const repo = p?.repo_full || (p?.id ? p.id.replace(/^gh:/, '') : '');
    const url = p?.url || (repo ? `https://github.com/${repo}` : 'https://github.com/PriyanshGadia');
    if (instant) {
      const camFwd = new THREE.Vector3();
      const camUp = new THREE.Vector3();
      cam.getWorldDirection(camFwd);
      camUp.set(0, 1, 0).applyQuaternion(cam.quaternion);
      const targetWorldPos = cam.position.clone()
        .add(camFwd.clone().multiplyScalar(READ_DIST))
        .add(camUp.clone().multiplyScalar(0.008));
      const lookObj = new THREE.Object3D();
      lookObj.position.copy(targetWorldPos);
      lookObj.lookAt(cam.position);
      lookObj.up.copy(camUp);
      const parentWorldQuat = new THREE.Quaternion();
      s.group.parent.getWorldQuaternion(parentWorldQuat);
      const localTargetQuat = parentWorldQuat.clone().invert().multiply(lookObj.quaternion);
      s.group.position.copy(s.group.parent.worldToLocal(targetWorldPos));
      s.group.quaternion.copy(localTargetQuat);
      s.group.scale.set(READ_SCALE, READ_SCALE, READ_SCALE);
      s.plane.updateWorldMatrix(true, true);
    }
    window.dispatchEvent(new CustomEvent('lab:blueprint:read', { detail: { id, project: p, url } }));
  }

  function closeReadMode(instant = false) {
    if (!readId) return;
    const s = sheets.get(readId);
    if (s) {
      s.rest = true;
      s.plane.renderOrder = 0;
      s.group.renderOrder = 0;
      if (instant) {
        s.group.position.copy(s.basePos);
        s.group.quaternion.copy(s.baseQuat);
        s.group.scale.set(1, 1, 1);
        s.rest = null;
      }
    }
    readId = null;
    renderer.domElement.style.cursor = 'default';
    sfx.servo(.4, false);
    window.dispatchEvent(new CustomEvent('lab:blueprint:unread'));
  }

  const SECTOR_HANDLERS = {
    RS1: {
      usesPointerDrag: true,
      onHit(mesh, uv, point, e) {
        const id = mesh.userData.projectId;
        if (!id || id === '__placeholder__') return;
        if (readId) {
          closeReadMode();
          return;
        }
        const group = mesh.parent;
        dragPlaneY.constant = -group.getWorldPosition(new THREE.Vector3()).y;
        ray.ray.intersectPlane(dragPlaneY, dragPt);
        group.parent.updateWorldMatrix(true, false);
        const localPt = group.parent.worldToLocal(dragPt.clone());
        dragOff.copy(localPt).sub(group.position);
        dragScreenDist = 0;
        if (e) {
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          dragPointerId = e.pointerId;
        }
        dragging = { id, group, moved: false, downAt: performance.now(), mesh };
      },
      onMove(e) {
        if (!dragging) return;
        if (e) {
          dragScreenDist += Math.hypot(e.movementX || (e.clientX - dragStartX), e.movementY || (e.clientY - dragStartY));
          dragStartX = e.clientX;
          dragStartY = e.clientY;
        }
        ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
        ray.setFromCamera(ndc, cam);
        if (!ray.ray.intersectPlane(dragPlaneY, dragPt)) return;
        dragging.group.parent.updateWorldMatrix(true, false);
        const localPt = dragging.group.parent.worldToLocal(dragPt.clone());
        const local = localPt.sub(dragOff);
        local.x = clamp(local.x, -DESK.w / 2 + 0.15, DESK.w / 2 - 0.15);
        local.z = clamp(local.z, -DESK.d / 2 + 0.1, DESK.d / 2 - 0.1);
        if (dragScreenDist > 6 || Math.hypot(local.x - dragging.group.position.x, local.z - dragging.group.position.z) > .003) {
          dragging.moved = true;
        }
        dragging.group.position.x = local.x;
        dragging.group.position.z = local.z;
      },
      onRelease(e) {
        if (!dragging) return;
        const { id, moved, downAt } = dragging;
        const elapsed = performance.now() - downAt;
        const s = sheets.get(id);
        if (!moved && dragScreenDist < 10 && elapsed < 800) {
          openReadMode(id);
        } else if (s) {
          // Immediately spring back to clean default position - no retention of moved position
          s.rest = true;
        }
        dragging = null;
      },
      onKey(e) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          if (readId) {
            closeReadMode();
            e.preventDefault();
          }
        }
      },
      onExit() {
        dragging = null;
        if (readId) closeReadMode();
        sheets.forEach(s => { s.rest = true; });
      },
    },
    RS2: {
      onHit(mesh, uv, point, e) {
        if (!uv) return;
        const px = uv.x * 640, py = (1 - uv.y) * 400;

        // Search bar click
        if (py >= 36 && py <= 66) {
          if (px <= 556) {
            RESUME.typing = true;
            sfx.blip(1200, .03, .02);
          } else {
            RESUME.query = '';
            RESUME.scroll = 0;
            applyResumeFilter();
            sfx.relay();
          }
          drawResume(resumeCanvas);
          resumeTex.needsUpdate = true;
          return;
        }

        // Template tabs click (4 options)
        if (py >= 68 && py <= 94) {
          const prevTpl = RESUME.template;
          if (px < 166) RESUME.template = 'quant-research';
          else if (px < 318) RESUME.template = 'fullstack-ai';
          else if (px < 470) RESUME.template = 'robotics-mech';
          else RESUME.template = 'exec-clean';
          if (RESUME.template !== prevTpl) {
            const tplObj = RESUME_TEMPLATES.find(t => t.id === RESUME.template);
            if (tplObj && tplObj.defaults) {
              RESUME.selected = new Set(tplObj.defaults);
            }
          }
          sfx.blip(1100, .03, .02);
          drawResume(resumeCanvas);
          resumeTex.needsUpdate = true;
          return;
        }

        // Category filter pills click
        if (py >= 96 && py <= 120) {
          if (px < 88) RESUME.category = 'all';
          else if (px < 160) RESUME.category = 'experience';
          else if (px < 258) RESUME.category = 'project';
          else if (px < 348) RESUME.category = 'certification';
          else if (px < 438) RESUME.category = 'education';
          else RESUME.category = 'skill';
          RESUME.scroll = 0;
          applyResumeFilter();
          sfx.blip(1000, .03, .02);
          drawResume(resumeCanvas);
          resumeTex.needsUpdate = true;
          return;
        }

        // List item click
        if (py >= 138 && py <= 348) {
          const rowIndex = Math.floor((py - 140) / 34);
          const item = RESUME.filtered[RESUME.scroll + rowIndex];
          if (item) {
            // Click on proof link button
            if (px > 640 - 116) {
              window.open(item.proof_url, '_blank');
              sfx.relay();
              return;
            }
            // Toggle selection
            if (RESUME.selected.has(item.id)) {
              RESUME.selected.delete(item.id);
            } else {
              RESUME.selected.add(item.id);
            }
            sfx.blip(900, .04, .02);
            drawResume(resumeCanvas);
            resumeTex.needsUpdate = true;
            if (api2.resume.onFields) api2.resume.onFields(Array.from(RESUME.selected));
          }
          return;
        }

        // Print button click
        if (py >= 354 && py <= 394 && px >= 340) {
          triggerGenerateAndPrint();
          return;
        }

        // Clicking elsewhere blurs typing
        if (RESUME.typing) {
          RESUME.typing = false;
          drawResume(resumeCanvas);
          resumeTex.needsUpdate = true;
        }
      },
      onKey(e) {
        if (!RESUME.typing) {
          if (e.key === '/' || e.key === 's' || e.key === 'S') {
            RESUME.typing = true;
            drawResume(resumeCanvas);
            resumeTex.needsUpdate = true;
            e.preventDefault();
          }
          return;
        }
        if (e.key === 'Escape' || e.key === 'Enter') {
          RESUME.typing = false;
          drawResume(resumeCanvas);
          resumeTex.needsUpdate = true;
          e.preventDefault();
          return;
        }
        if (e.key === 'Backspace') {
          RESUME.query = RESUME.query.slice(0, -1);
          RESUME.scroll = 0;
          applyResumeFilter();
          drawResume(resumeCanvas);
          resumeTex.needsUpdate = true;
          e.preventDefault();
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          RESUME.query += e.key;
          RESUME.scroll = 0;
          applyResumeFilter();
          drawResume(resumeCanvas);
          resumeTex.needsUpdate = true;
          e.preventDefault();
        }
      },
      onWheel(e) {
        const maxScroll = Math.max(0, RESUME.filtered.length - 7);
        RESUME.scroll = clamp(RESUME.scroll + Math.sign(e.deltaY), 0, maxScroll);
        drawResume(resumeCanvas);
        resumeTex.needsUpdate = true;
      },
      onExit() {
        RESUME.typing = false;
        drawResume(resumeCanvas);
        resumeTex.needsUpdate = true;
      }
    },
    RS3: {
      onHit(mesh, uv, point, e) {
        if (!uv || CAL.configured !== true || CAL.view === 'sending') return;
        const px = uv.x * CAL_W, py = (1 - uv.y) * CAL_H;

        if (CAL.view === 'grid') {
          if (py >= 38 && py <= 64) { if (px <= 60) calShiftMonth(-1); else if (px >= CAL_W - 60) calShiftMonth(1); return; }
          const cellW = (CAL_W - 20) / 7, gridX0 = 10, gridY0 = 76, rowH = 30;
          if (py >= gridY0 && py < gridY0 + rowH*6 && px >= gridX0 && px < gridX0 + cellW*7) {
            const col = Math.floor((px - gridX0) / cellW), row = Math.floor((py - gridY0) / rowH);
            const mc = CAL.monthCursor, first = new Date(mc.getFullYear(), mc.getMonth(), 1).getDay();
            const dayNum = row*7 + col - first + 1, daysInMonth = new Date(mc.getFullYear(), mc.getMonth()+1, 0).getDate();
            if (dayNum >= 1 && dayNum <= daysInMonth) {
              const dayDate = new Date(mc.getFullYear(), mc.getMonth(), dayNum);
              if (!calIsPast(dayDate) && calWithinSyncWindow(dayDate)) {
                CAL.selectedDate = dayDate; CAL.view = 'slots'; sfx.blip(1100,.04,.02); redrawCal();
              } else sfx.blip(300,.05,.02);
            }
          }
          return;
        }
        if (CAL.view === 'slots') {
          if (py >= 34 && py <= 58 && px <= 75) { CAL.view = 'grid'; sfx.blip(700,.04,.02); redrawCal(); return; }
          for (const sb of (CAL._slotBoxes || [])) {
            if (px >= sb.x && px <= sb.x + sb.w && py >= sb.y && py <= sb.y + sb.h) {
              CAL.selectedSlot = sb.slot; CAL.form = { name:'', email:'', location:'', description:'', field:null };
              CAL.errorMsg = ''; CAL.view = 'form'; sfx.blip(1200,.04,.02); redrawCal();
              return;
            }
          }
          return;
        }
        if (CAL.view === 'form') {
          if (py >= 34 && py <= 58 && px <= 60) { CAL.view = 'slots'; redrawCal(); return; }
          const boxes = CAL._formBoxes || {};
          for (const f of CAL_FIELDS) {
            const b = boxes[f];
            if (b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) { CAL.form.field = f; sfx.blip(1200,.03,.02); redrawCal(); return; }
          }
          const sb = CAL._formSubmitBox;
          if (sb && px >= sb.x && px <= sb.x + sb.w && py >= sb.y && py <= sb.y + sb.h) { calSubmitRequest(); return; }
          if (CAL.form.field) { CAL.form.field = null; redrawCal(); }
          return;
        }
        if (CAL.view === 'sent') {
          CAL.view = 'slots';
          CAL.selectedSlot = null;
          CAL.errorMsg = '';
          sfx.blip(900,.03,.02);
          redrawCal();
          syncCalendarIfStale(true);
          return;
        }
        if (CAL.view === 'error') {
          const resync = CAL.errorMsg === 'SLOT NO LONGER AVAILABLE';
          CAL.view = 'grid'; CAL.selectedDate = null; CAL.selectedSlot = null; CAL.errorMsg = ''; redrawCal();
          if (resync) syncCalendarIfStale(true);
          return;
        }
      },
      onKey(e) {
        if (CAL.view === 'sending') { e.preventDefault(); return; }
        if (CAL.view === 'form' && CAL.form.field) {
          const f = CAL.form.field, max = { name:60, email:80, location:100, description:240 }[f];
          if (e.key === 'Escape' || e.key === 'Enter') { CAL.form.field = null; redrawCal(); e.preventDefault(); return; }
          if (e.key === 'Backspace') { CAL.form[f] = CAL.form[f].slice(0,-1); redrawCal(); e.preventDefault(); return; }
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            if (CAL.form[f].length < max) CAL.form[f] += e.key;
            redrawCal(); e.preventDefault();
          }
          return;
        }
        if (e.key === 'Escape') {
          if (CAL.view === 'form') { CAL.view = 'slots'; redrawCal(); e.preventDefault(); return; }
          if (CAL.view === 'slots') { CAL.view = 'grid'; CAL.selectedDate = null; redrawCal(); e.preventDefault(); return; }
          if (CAL.view === 'sent') { CAL.view = 'slots'; CAL.selectedSlot = null; redrawCal(); syncCalendarIfStale(true); e.preventDefault(); return; }
          if (CAL.view === 'error') { CAL.view = 'grid'; CAL.selectedSlot = null; redrawCal(); e.preventDefault(); return; }
        }
      },
      onExit() {
        CAL.view = 'grid'; CAL.selectedDate = null; CAL.selectedSlot = null;
        CAL.form = { name:'', email:'', location:'', description:'', field:null }; CAL.errorMsg = '';
        redrawCal();
      }
    },
    LS1: {
      onHit(mesh, uv) {
        if (!uv) return;
        const px = uv.x * 320, py = (1 - uv.y) * 440;
        if (py >= 142 && py <= 165) {
          const tabIdx = Math.floor((px - 14) / 76);
          if (tabIdx >= 0 && tabIdx < 4) {
            curProfTab = tabIdx;
            drawProf(profCanvas);
            profTex.needsUpdate = true;
            sfx.blip(1200, .04, .02);
            if (api2.profile.onLinks) api2.profile.onLinks(PROFILE_TABS[tabIdx]);
          }
        }
      }
    },
    LS2: {
      onHit(mesh) {
        mesh.rotation.z += (Math.random() - .5) * .3;
        sfx.blip(1300, .03, .02);
      }
    },
    LS3: {
      usesPointerDrag: true,
      onHit(mesh, uv, point, e) {
        if (mesh?.userData?.isCity && mesh.userData.city) {
          const c = mesh.userData.city;
          GLOBE.targetLat = c.lat;
          GLOBE.targetLon = c.lon;
          GLOBE.targetName = c.name;
          GLOBE.autoSpin = false;
          GLOBE.animatingToTarget = true;
          GLOBE.targetRotY = -THREE.MathUtils.degToRad(c.lon);
          GLOBE.targetRotX = THREE.MathUtils.degToRad(c.lat);
          GLOBE.zoom = 2.2;
          sfx.blip(1700, 0.06, 0.03);
          if (globeLabelCanvas) {
            drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
            if (globeLabelTex) globeLabelTex.needsUpdate = true;
          }
          return;
        }
        if (mesh?.userData?.isFlight && mesh.userData.data) {
          const flt = mesh.userData.data;
          GLOBE.targetLat = flt.lat;
          GLOBE.targetLon = flt.lon;
          GLOBE.targetName = `${flt.callsign} · FLIGHT INTERCEPT`;
          GLOBE.autoSpin = false;
          GLOBE.animatingToTarget = true;
          GLOBE.targetRotY = -THREE.MathUtils.degToRad(flt.lon);
          GLOBE.targetRotX = THREE.MathUtils.degToRad(flt.lat);
          GLOBE.zoom = 2.4;
          sfx.blip(1900, 0.06, 0.03);
          if (globeLabelCanvas) {
            drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
            if (globeLabelTex) globeLabelTex.needsUpdate = true;
          }
          return;
        }
        if (mesh?.userData?.isQuake && mesh.userData.data) {
          const q = mesh.userData.data;
          GLOBE.targetLat = q.lat;
          GLOBE.targetLon = q.lon;
          GLOBE.targetName = `M${q.mag.toFixed(1)} · ${q.place.toUpperCase()}`;
          GLOBE.autoSpin = false;
          GLOBE.animatingToTarget = true;
          GLOBE.targetRotY = -THREE.MathUtils.degToRad(q.lon);
          GLOBE.targetRotX = THREE.MathUtils.degToRad(q.lat);
          GLOBE.zoom = 2.4;
          sfx.blip(1500, 0.06, 0.03);
          if (globeLabelCanvas) {
            drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
            if (globeLabelTex) globeLabelTex.needsUpdate = true;
          }
          return;
        }
        if (mesh?.userData?.isNews && mesh.userData.channel) {
          openNewsDispatch(mesh.userData.channel);
          return;
        }
        if (mesh?.userData?.isSatellite && mesh.userData.data) {
          selectTargetPreset('ISS');
          return;
        }
        if (mesh?.userData?.isLabel && uv) {
          const px = uv.x * 384, py = (1 - uv.y) * 128;
          // Row 2: 4 Mode Tabs (SURFACE, ORBITAL, AIRSPACE, NEWS)
          if (py >= 20 && py <= 44) {
            if (px >= 12 && px < 100) { setGlobeMode('SURFACE'); return; }
            if (px >= 102 && px < 190) { setGlobeMode('ORBITAL'); return; }
            if (px >= 192 && px < 280) { setGlobeMode('AIRSPACE'); return; }
            if (px >= 282 && px < 372) { setGlobeMode('NEWS'); return; }
          }
          // Row 3: Presets & Zoom
          if (py >= 48 && py <= 70) {
            if (px >= 320 && px <= 344) { zoomGlobe(0.8); return; }
            if (px >= 348 && px <= 372) { zoomGlobe(1.25); return; }
            const presets = ['ATX', 'SFO', 'NYC', 'LON', 'TYO', 'GPS', 'ISS'];
            for (let i = 0; i < presets.length; i++) {
              const bx = 12 + i * 42;
              if (px >= bx && px <= bx + 38) {
                selectTargetPreset(presets[i]);
                return;
              }
            }
          }
          // Clicking anywhere on the panel brings it up into focus as a bottom taskbar!
          openLS3Taskbar();
          return;
        }
        if (mesh?.userData?.isPuck) {
          openLS3Taskbar();
          return;
        }

        // Clicking elsewhere on globe or background retracts taskbar & news display
        if (GLOBE.taskbarOpen) {
          closeLS3Taskbar();
        }
        if (GLOBE.selectedNewsChannel) {
          closeLS3News();
        }

        GLOBE.dragging = true;
        GLOBE.autoSpin = false;
        if (e) {
          GLOBE.dragStartX = e.clientX;
          GLOBE.dragStartY = e.clientY;
          GLOBE.lastX = e.clientX;
          GLOBE.lastY = e.clientY;
        }
        GLOBE.rotVelX = 0;
        GLOBE.rotVelY = 0;
        sfx.blip(1400, .05, .03);
        if (api2.globe.onLocate) api2.globe.onLocate();
      },
      onMove(e) {
        if (!GLOBE.dragging || !globeGroup) return;
        const dx = e.clientX - GLOBE.lastX;
        const dy = e.clientY - GLOBE.lastY;
        GLOBE.lastX = e.clientX;
        GLOBE.lastY = e.clientY;
        globeGroup.rotation.y += dx * 0.008;
        globeGroup.rotation.x = clamp(globeGroup.rotation.x + dy * 0.008, -1.2, 1.2);
        GLOBE.rotVelY = dx * 0.008;
        GLOBE.rotVelX = dy * 0.008;
      },
      onRelease(e) {
        if (!GLOBE.dragging) return;
        GLOBE.dragging = false;
        GLOBE.autoSpin = true;
      },
      onWheel(e) {
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        zoomGlobe(factor);
      },
      onKey(e) {
        if (e.key === '1') { setGlobeMode('SURFACE'); e.preventDefault(); }
        else if (e.key === '2') { setGlobeMode('ORBITAL'); e.preventDefault(); }
        else if (e.key === '3') { setGlobeMode('AIRSPACE'); e.preventDefault(); }
        else if (e.key === '4') { setGlobeMode('NEWS'); e.preventDefault(); }
        else if (e.key === '+' || e.key === '=') { zoomGlobe(1.25); e.preventDefault(); }
        else if (e.key === '-' || e.key === '_') { zoomGlobe(0.8); e.preventDefault(); }
        else if (e.key === 'm' || e.key === 'M') {
          const modes = ['SURFACE', 'ORBITAL', 'AIRSPACE', 'NEWS'];
          const nextIdx = (modes.indexOf(GLOBE.mode) + 1) % modes.length;
          setGlobeMode(modes[nextIdx]);
          e.preventDefault();
        }
        else if (e.key === 'Escape') {
          if (GLOBE.selectedNewsChannel) { closeLS3News(); e.preventDefault(); }
          else if (GLOBE.taskbarOpen) { closeLS3Taskbar(); e.preventDefault(); }
        }
        else if (e.key === 'a' || e.key === 'A') {
          triggerGlobeAlbum();
          e.preventDefault();
        }
      },
      onExit() {
        GLOBE.dragging = false;
        GLOBE.autoSpin = true;
        if (GLOBE.taskbarOpen) closeLS3Taskbar();
        if (GLOBE.selectedNewsChannel) closeLS3News();
        if (globeGroup) globeGroup.rotation.x = 0;
      }
    }
  };

  function focusSector(id) {
    const cfg = FOCUS_CFG[id]; if (!cfg || !S.ready) return;
    if (FOCUS.active) {
      if (FOCUS.id === id) return;
      unfocusSector();
    }
    const g = sectorGroups[id]; if (!g) return;
    g.updateWorldMatrix(true, true);
    const [pos, look] = cfg.dolly(g);
    FOCUS.id = id; S.focus = id; FOCUS.t = 0; FOCUS.active = true; S.navLocked = true;
    FOCUS.from.copy(cam.position); FOCUS.fromQ.copy(cam.quaternion);
    FOCUS.toPos.copy(pos); FOCUS.toLook.copy(look);
    if (bokeh) {
      bokeh.enabled = true;
      bokeh.uniforms.focus.value = cam.position.distanceTo(look);
      bokeh.uniforms.aperture.value = LOW ? 0.00004 : 0.00008;
    }
    dispatchEvent(new CustomEvent('lab:focus', { detail: { id } }));
    dispatchEvent(new CustomEvent('lab:sector:focus', { detail: { id } }));
    sfx.relay();
  }

  function unfocusSector() {
    if (!FOCUS.active) return;
    const prevId = FOCUS.id;
    SECTOR_HANDLERS[prevId]?.onExit?.();
    FOCUS.active = false; S.navLocked = false;
    dispatchEvent(new CustomEvent('lab:unfocus', { detail: { id: prevId } }));
    dispatchEvent(new CustomEvent('lab:sector:unfocus', { detail: { id: prevId } }));
    FOCUS.id = null; S.focus = null;
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
  addEventListener('wheel', e => {
    if (FOCUS.active && SECTOR_HANDLERS[FOCUS.id]?.onWheel) {
      e.preventDefault();
      SECTOR_HANDLERS[FOCUS.id].onWheel(e);
      return;
    }
    if (!S.active || S.t < T.power[0] || FOCUS.active || S.navLocked) return;
    e.preventDefault();
    if (S.inside || S.wantIn) { exit(); return; }
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    nudge(clamp(d, -140, 140) * NAV.wheel);
  }, { passive: false });
  addEventListener('mousemove', e => { if (!canLook()) return; S.look.tx = -((e.clientX / innerWidth) * 2 - 1) * .32; S.look.ty = -((e.clientY / innerHeight) * 2 - 1) * .18; });
  let touch = null; addEventListener('touchstart', e => { if (S.active) { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY, vy: 0, moved: 0 }; } }, { passive: true });
  addEventListener('touchmove', e => { if (!touch || !S.active) return; const t = e.touches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y; touch.moved += Math.abs(dx) + Math.abs(dy); if (canMove()) { S.theta += dy * NAV.drag; touch.vy = dy; S.lastInput = S.t; S.magnet = null; } if (canLook()) S.look.tx = clamp(S.look.tx - dx * .0025, -.5, .5); touch.x = t.clientX; touch.y = t.clientY; e.preventDefault(); }, { passive: false });
  addEventListener('touchend', () => { if (touch && canMove()) nudge(clamp(touch.vy * .22, -1.4, 1.4)); if (touch && touch.moved > 40 && (S.inside || S.wantIn)) exit(); touch = null; }, { passive: true });
  addEventListener('keydown', e => { if (!S.active) return;
    if (FOCUS.active) {
      if (SECTOR_HANDLERS[FOCUS.id]?.onKey) {
        SECTOR_HANDLERS[FOCUS.id].onKey(e);
        if (e.defaultPrevented) return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') { unfocusSector(); e.preventDefault(); return; }
      return;
    }
    if (S.inside) { if (e.key === 'Escape') exit(); else if (e.key === 'Enter') ask(AI.input); else if (e.key === 'Backspace') AI.input = AI.input.slice(0, -1); else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && AI.input.length < 140) AI.input += e.key; else return; AI.dirty = true; e.preventDefault(); return; }
    if (!canMove()) return; if (e.key === 'Enter' && S.sector === 0) { enter(); return; } if (['ArrowRight', 'd', 'ArrowDown', 's'].includes(e.key)) nudge(.65); else if (['ArrowLeft', 'a', 'ArrowUp', 'w'].includes(e.key)) nudge(-.65); else if (/^[1-9]$/.test(e.key)) goTo(SECTORS[+e.key - 1].id); });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let lastHover = 0;
  const pick = (x, y) => {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, cam);

    // 1. Raycast direct visible meshes inside each sectorGroup (prioritize visual screen/model targets)
    let bestSector = null, bestDist = Infinity;
    for (const [id, grp] of Object.entries(sectorGroups)) {
      grp.updateWorldMatrix(true, true);
      const sHits = ray.intersectObjects(grp.children, true);
      for (const h of sHits) {
        if (h.object.visible && h.distance < bestDist) {
          bestDist = h.distance;
          bestSector = id;
        }
      }
    }
    if (bestSector) return bestSector;

    // 2. Raycast turntable / deck / threshold plate to determine clicked sector by angle or userData
    const sceneHits = ray.intersectObjects(lab.children, true);
    for (const h of sceneHits) {
      if (!h.object.visible || h.distance > 16) continue;
      if (h.object.userData?.sector) return h.object.userData.sector;
      const p = h.point, r = Math.hypot(p.x, p.z);
      if (r >= 2.8 && r <= 5.4 && p.y >= 0.05 && p.y <= 1.8) {
        let th = Math.atan2(p.x, p.z);
        if (th < 0) th += TAU;
        const k = ((Math.round(th / SEC) % NSEC) + NSEC) % NSEC;
        return SECTORS[k]?.id || null;
      }
    }

    // 3. Fallback to hits if anything matched
    const h = ray.intersectObjects(hits, false)[0];
    return h ? h.object.userData.sector : null;
  };
  let tableDrag = null;
  addEventListener('pointerdown', e => {
    if (!S.ready) return;
    if (!FOCUS.active) {
      if (canMove()) {
        tableDrag = {
          startX: e.clientX,
          startY: e.clientY,
          startTheta: S.theta,
          lastX: e.clientX,
          lastY: e.clientY,
          moved: false,
          pointerId: e.pointerId,
          downAt: performance.now(),
          vX: 0
        };
        try { renderer.domElement.setPointerCapture(e.pointerId); } catch {}
      }
      return;
    }
    if (readId) {
      if (performance.now() - justOpenedReadAt > 150) {
        const s = sheets.get(readId);
        if (s) {
          ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
          ray.setFromCamera(ndc, cam);
          const rHits = ray.intersectObject(s.plane, false);
          if (rHits.length > 0 && rHits[0].uv) {
            const uv = rHits[0].uv;
            const px = uv.x * 768, py = (1 - uv.y) * 528;
            if (px >= 410 && px <= 738 && py >= 280 && py <= 340) {
              const p = s.project;
              const repo = p?.repo_full || (p?.id ? p.id.replace(/^gh:/, '') : '');
              const url = p?.url || (repo ? `https://github.com/${repo}` : 'https://github.com/PriyanshGadia');
              window.open(url, '_blank');
              sfx.relay();
              e.preventDefault();
              return;
            }
          }
        }
        closeReadMode();
      }
      e.preventDefault();
      return;
    }
    const g = sectorGroups[FOCUS.id];
    if (!g) return;
    g.updateWorldMatrix(true, true);
    const targets = [];
    g.traverse(o => { if (o.isMesh && o.userData.interactive) targets.push(o); });
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(targets, false)[0];
    if (hit) {
      e.preventDefault();
      try { renderer.domElement.setPointerCapture(e.pointerId); } catch {}
      if (SECTOR_HANDLERS[FOCUS.id]?.usesPointerDrag) {
        SECTOR_HANDLERS[FOCUS.id]?.onHit?.(hit.object, hit.uv, hit.point, e);
      }
    }
  });
  addEventListener('pointermove', e => {
    if (tableDrag && tableDrag.pointerId === e.pointerId) {
      const dx = e.clientX - tableDrag.startX;
      const dy = e.clientY - tableDrag.startY;
      if (Math.hypot(dx, dy) > 6) tableDrag.moved = true;
      if (tableDrag.moved && canMove()) {
        const stepX = e.clientX - tableDrag.lastX;
        tableDrag.vX = stepX;
        S.theta -= stepX * NAV.drag * 1.5;
        S.lastInput = S.t;
        S.magnet = null;
      }
      tableDrag.lastX = e.clientX;
      tableDrag.lastY = e.clientY;
      return;
    }
    if (FOCUS.active) {
      if (readId) {
        const s = sheets.get(readId);
        if (s) {
          ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
          ray.setFromCamera(ndc, cam);
          const rHits = ray.intersectObject(s.plane, false);
          if (rHits.length > 0 && rHits[0].uv) {
            const uv = rHits[0].uv;
            const px = uv.x * 768, py = (1 - uv.y) * 528;
            if (px >= 410 && px <= 738 && py >= 280 && py <= 340) {
              renderer.domElement.style.cursor = 'pointer';
              return;
            }
          }
        }
        renderer.domElement.style.cursor = 'default';
        return;
      }
      SECTOR_HANDLERS[FOCUS.id]?.onMove?.(e);
      return;
    }
    if (!S.ready || S.inside || e.pointerType === 'touch') return;
    const now = performance.now();
    if (now - lastHover < 90) return;
    lastHover = now;
    S.hover = pick(e.clientX, e.clientY);
    renderer.domElement.style.cursor = S.hover ? 'pointer' : '';
  });
  addEventListener('pointerup', e => {
    if (tableDrag && tableDrag.pointerId === e.pointerId) {
      const moved = tableDrag.moved;
      const vX = tableDrag.vX;
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
      tableDrag = null;
      if (moved) {
        if (canMove() && Math.abs(vX) > 1.5) {
          nudge(-vX * 0.08);
        }
        e.stopPropagation();
        return;
      }
    }
    try { if (e && e.pointerId !== undefined) renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
    if (FOCUS.active) SECTOR_HANDLERS[FOCUS.id]?.onRelease?.(e);
  });
  addEventListener('pointercancel', e => {
    if (tableDrag && tableDrag.pointerId === e.pointerId) {
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
      tableDrag = null;
    }
    try { if (e && e.pointerId !== undefined) renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
    if (FOCUS.active) SECTOR_HANDLERS[FOCUS.id]?.onRelease?.(e);
  });
  addEventListener('click', e => {
    if (!S.ready) return;
    if (e.target?.closest && e.target.closest('#ls3-taskbar, #ls3-news-holo, #blueprint-hud, #cal-slot-modal, #cal-admin-modal, .hud-overlay')) return;
    if (e.target !== renderer.domElement && !renderer.domElement.contains(e.target)) return;
    if (tableDrag?.moved) return;
    if (FOCUS.active) {
      if (readId) {
        if (performance.now() - justOpenedReadAt > 150) {
          const s = sheets.get(readId);
          if (s) {
            ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
            ray.setFromCamera(ndc, cam);
            const rHits = ray.intersectObject(s.plane, false);
            if (rHits.length > 0 && rHits[0].uv) {
              const uv = rHits[0].uv;
              const px = uv.x * 768, py = (1 - uv.y) * 528;
              if (px >= 410 && px <= 738 && py >= 280 && py <= 340) {
                const p = s.project;
                const repo = p?.repo_full || (p?.id ? p.id.replace(/^gh:/, '') : '');
                const url = p?.url || (repo ? `https://github.com/${repo}` : 'https://github.com/PriyanshGadia');
                window.open(url, '_blank');
                sfx.relay();
                return;
              }
            }
          }
          closeReadMode();
        }
        return;
      }
      const g = sectorGroups[FOCUS.id];
      if (!g) return;
      g.updateWorldMatrix(true, true);
      const targets = [];
      g.traverse(o => { if (o.isMesh && o.userData.interactive) targets.push(o); });
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      const hit = ray.intersectObjects(targets, false)[0];
      if (hit) {
        if (!SECTOR_HANDLERS[FOCUS.id]?.usesPointerDrag) {
          SECTOR_HANDLERS[FOCUS.id]?.onHit?.(hit.object, hit.uv, hit.point, e);
        } else if (FOCUS.id === 'RS1' && hit.object.userData.projectId) {
          openReadMode(hit.object.userData.projectId);
        }
      } else if (!PRINT.active && !RESUME.busy) {
        if (FOCUS.id === 'LS3' && (GLOBE.taskbarOpen || GLOBE.selectedNewsChannel)) {
          if (GLOBE.selectedNewsChannel) closeLS3News();
          else if (GLOBE.taskbarOpen) closeLS3Taskbar();
          return;
        }
        unfocusSector();
      }
      return;
    }
    if (S.inside || S.wantIn) { exit(); return; }
    const id = pick(e.clientX, e.clientY);
    if (!id) return;
    sfx.blip(1320, .07);
    dispatchEvent(new CustomEvent('lab:interact', { detail: { id } }));
    if (id === 'S0') enter();
    else if (FOCUS_CFG[id]) focusSector(id);
    else goTo(id);
  });

  /* ── update: every visual is a pure function of t (+ the visitor's θ and inside-state) ── */
  const fA = new THREE.Vector3(), fB = new THREE.Vector3(), tmp = new THREE.Vector3(), fwdScratch = new THREE.Vector3();
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
      for (const s of screens) { const p = ph(t, [s.t0, s.t0 + .3]) * s.i * (1 + .05 * Math.sin(t * 30 + s.t0)); if (s.m.isMeshBasicMaterial) s.m.color.setScalar(Math.min(1, p)); else s.m.emissiveIntensity = p; } for (const l of leds) l.m.emissiveIntensity = ph(t, [l.t0, l.t0 + .2]) * l.target; for (const h of holos) h.m.opacity = sm(ph(t, [h.t0, h.t0 + .8])) * h.target * (.93 + .07 * Math.sin(t * 9 + h.t0));
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
      if (globeGroup) {
        // Smooth zoom interpolation and altitude elevation
        GLOBE.displayZoom += (GLOBE.zoom - GLOBE.displayZoom) * (1 - Math.exp(-dt * 6));
        const physScale = 1.0 + (GLOBE.displayZoom - 1.0) * 0.20;
        globeGroup.scale.setScalar(physScale);
        globeGroup.position.y = 0.8 + (physScale - 1.0) * 0.35;

        // Periodic live telemetry polling
        const nowMs = performance.now();
        if (nowMs - GLOBE.lastLiveSatPoll > 8000) {
          GLOBE.lastLiveSatPoll = nowMs;
          pollLiveSatellites();
        }
        if (nowMs - GLOBE.lastLiveFlightPoll > 25000) {
          GLOBE.lastLiveFlightPoll = nowMs;
          pollLiveFlights();
        }
        if (nowMs - GLOBE.lastLiveQuakePoll > 60000) {
          GLOBE.lastLiveQuakePoll = nowMs;
          pollLiveEarthquakes();
        }
        if (nowMs - GLOBE.lastLiveNewsPoll > 45000) {
          GLOBE.lastLiveNewsPoll = nowMs;
          pollLiveNews();
        }

        if (!GLOBE.dragging) {
          if (GLOBE.animatingToTarget) {
            let diffY = (GLOBE.targetRotY - globeGroup.rotation.y) % (Math.PI * 2);
            if (diffY > Math.PI) diffY -= Math.PI * 2;
            if (diffY < -Math.PI) diffY += Math.PI * 2;
            globeGroup.rotation.y += diffY * (1 - Math.exp(-dt * 5));
            globeGroup.rotation.x += (GLOBE.targetRotX - globeGroup.rotation.x) * (1 - Math.exp(-dt * 5));
            if (Math.abs(diffY) < 0.005 && Math.abs(GLOBE.targetRotX - globeGroup.rotation.x) < 0.005) {
              GLOBE.animatingToTarget = false;
            }
          } else if (Math.abs(GLOBE.rotVelY) > 0.0001 || Math.abs(GLOBE.rotVelX) > 0.0001) {
            globeGroup.rotation.y += GLOBE.rotVelY;
            globeGroup.rotation.x = clamp(globeGroup.rotation.x + GLOBE.rotVelX, -1.2, 1.2);
            GLOBE.rotVelY *= 0.92;
            GLOBE.rotVelX *= 0.92;
          } else if (GLOBE.autoSpin) {
            globeGroup.rotation.y += dt * 0.18;
            globeGroup.rotation.x *= 0.98;
          }
        }
        // Advance Satellites along inclined orbital planes
        for (let i = 0; i < satMeshes.length; i++) {
          const sat = satMeshes[i];
          sat.angle += dt * sat.speed;
          const sx = Math.cos(sat.angle) * sat.radius;
          const sz = Math.sin(sat.angle) * sat.radius;
          sat.group.position.set(sx, -sz * Math.sin(sat.inc), sz * Math.cos(sat.inc));
          sat.group.rotation.y = -sat.angle;
        }
        // Animate Airspace Flight Transponders
        for (let i = 0; i < flightPulseMeshes.length; i++) {
          const fp = flightPulseMeshes[i];
          fp.progress = (fp.progress + dt * fp.speed) % 1.0;
          const idx = Math.min(fp.pts.length - 1, Math.floor(fp.progress * fp.pts.length));
          fp.mesh.position.copy(fp.pts[idx]);
        }
        // Animate Earthquake pulsing sonar rings
        if (earthquakesGroup && earthquakesGroup.visible) {
          for (let i = 0; i < earthquakesGroup.children.length; i++) {
            const qG = earthquakesGroup.children[i];
            if (qG.userData?.isQuake && qG.children[0]) {
              const ring = qG.children[0];
              const pulse = 1.0 + 0.25 * Math.sin(t * 3.2 + i * 0.7);
              ring.scale.set(pulse, pulse, 1.0);
            }
          }
        }
        // Animate Global News Glowing Dots
        if (newsBeaconsGroup && newsBeaconsGroup.visible) {
          for (let i = 0; i < newsBeaconsGroup.children.length; i++) {
            const bItem = newsBeaconsGroup.children[i];
            const u = bItem.userData;
            if (u && u.glow) {
              const pulse = (u.baseScale || 1.0) * (1.0 + 0.22 * Math.sin(t * 4.2 + i * 0.6));
              u.glow.scale.setScalar(pulse);
              if (u.glowMat) {
                u.glowMat.opacity = 0.45 + 0.25 * Math.sin(t * 3.8 + i * 0.8);
              }
            }
          }
        }
        // Animate 3D Dual Square Pyramid Holographic Light Beams
        const pySpeed = GLOBE.holoPyramidTarget > 0.5 ? 2.2 : 5.0;
        GLOBE.holoPyramidProgress += (GLOBE.holoPyramidTarget - GLOBE.holoPyramidProgress) * (1 - Math.exp(-dt * pySpeed));
        updateHoloPyramids(GLOBE.holoPyramidProgress);

        // Smooth plaque position/opacity for bottom taskbar focus
        if (globeLabelMesh) {
          const targetY = GLOBE.taskbarOpen ? 0.16 : 0.38;
          const targetOp = GLOBE.taskbarOpen ? 0.05 : 0.98;
          globeLabelMesh.position.y += (targetY - globeLabelMesh.position.y) * (1 - Math.exp(-dt * 8));
          if (globeLabelMesh.material) {
            globeLabelMesh.material.opacity += (targetOp - globeLabelMesh.material.opacity) * (1 - Math.exp(-dt * 8));
          }
        }

        // Rotate Tactical Radar Sweep Meridian
        if (radarSweepMesh) radarSweepMesh.rotation.y = t * 0.75;

        // Periodic taskbar sync
        if (GLOBE.taskbarOpen && Math.floor(t * 3) !== Math.floor((t - dt) * 3)) {
          syncLS3Taskbar();
        }
      }
      if (beaconRingMat) beaconRingMat.opacity = 0.88 + 0.10 * Math.sin(t * 3.5);
      if (GLOBE.albumNoticeUntil > 0 && performance.now() > GLOBE.albumNoticeUntil) {
        GLOBE.albumNoticeUntil = 0;
        if (globeLabelCanvas) {
          drawGlobeLabel(globeLabelCanvas, GLOBE.geo);
          if (globeLabelTex) globeLabelTex.needsUpdate = true;
        }
      }
      aiPanel.visible = w > .02; if (aiPanel.visible) { aiM.opacity = w * .92; aiPanel.lookAt(cam.position); const L = AI.lines.at(-1); if (L && AI.reveal < L.length) { AI.reveal = Math.min(L.length, AI.reveal + dt * 48); AI.dirty = true; } const bl = Math.floor(t * 2) % 2; if (bl !== S.bl) { S.bl = bl; AI.dirty = true; } if (AI.dirty) aiDraw(); } }
    // wet-floor reflections: mirror clones follow transforms, visibility and glow of their sources (during power-on)
    if (t < T.ready) {
      for (const [a, b, root] of mirrorPairs) { b.visible = a.visible; if (root) { b.matrix.copy(a.matrixWorld); b.matrixWorldNeedsUpdate = true; } else { b.position.copy(a.position); b.quaternion.copy(a.quaternion); b.scale.copy(a.scale); }
        const ma = a.material, mb = b.material; if (!ma) continue; if (ma.isShaderMaterial) { for (const k in ma.uniforms) if (k !== 'uA') mb.uniforms[k].value = ma.uniforms[k].value; mb.uniforms.uA.value = ma.uniforms.uA.value * MIR; } else { if (mb.opacity !== undefined) mb.opacity = ma.opacity * MIR; if (mb.emissiveIntensity !== undefined) mb.emissiveIntensity = ma.emissiveIntensity * MIR; } }
    }
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
      S.focusE = e;
    }

    const camFwd = new THREE.Vector3();
    const camUp = new THREE.Vector3();
    cam.getWorldDirection(camFwd);
    camUp.set(0, 1, 0).applyQuaternion(cam.quaternion);

    const activeSheet = readId ? sheets.get(readId) : null;
    if (activeSheet) {
      // Elevated in camera space so the bottom of the sheet is well above the desk
      const targetWorldPos = cam.position.clone()
        .add(camFwd.clone().multiplyScalar(READ_DIST))
        .add(camUp.clone().multiplyScalar(0.008));

      const lookObj = new THREE.Object3D();
      lookObj.position.copy(targetWorldPos);
      lookObj.lookAt(cam.position);
      lookObj.up.copy(camUp);

      const parentWorldQuat = new THREE.Quaternion();
      activeSheet.group.parent.getWorldQuaternion(parentWorldQuat);
      const localTargetQuat = parentWorldQuat.clone().invert().multiply(lookObj.quaternion);

      activeSheet.group.position.lerp(activeSheet.group.parent.worldToLocal(targetWorldPos), 1 - Math.exp(-dt * 10));
      activeSheet.group.quaternion.slerp(localTargetQuat, 1 - Math.exp(-dt * 10));
      activeSheet.group.scale.lerp(new THREE.Vector3(READ_SCALE, READ_SCALE, READ_SCALE), 1 - Math.exp(-dt * 10));
    }

    sheets.forEach(s => {
      if (s === activeSheet || !s.rest) return;
      const done = s.group.position.distanceTo(s.basePos) < .003 && s.group.quaternion.angleTo(s.baseQuat) < .008;
      s.group.position.lerp(s.basePos, 1 - Math.exp(-dt * 10));
      s.group.quaternion.slerp(s.baseQuat, 1 - Math.exp(-dt * 10));
      s.group.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-dt * 10));
      if (done) {
        s.group.position.copy(s.basePos);
        s.group.quaternion.copy(s.baseQuat);
        s.group.scale.set(1, 1, 1);
        s.rest = null;
      }
    });

    if (PRINT.active && paperMesh) {
      PRINT.t += dt;
      const pe = eo(clamp(PRINT.t / 1.4, 0, 1));
      const curLen = 0.05 + pe * 0.95;
      paperMesh.scale.set(1, curLen, 1);
      paperMesh.position.set(0, 0.021 - pe * 0.003, 0.185);
      if (resumeCanvas && resumeTex) {
        drawResume(resumeCanvas);
        resumeTex.needsUpdate = true;
      }
      if (PRINT.t >= 1.6) {
        PRINT.active = false;
        if (resumeCanvas && resumeTex) {
          drawResume(resumeCanvas);
          resumeTex.needsUpdate = true;
        }
      }
    }

    if (!S.ready && t >= T.ready) { S.ready = true; fade.style.opacity = '0'; dispatchEvent(new CustomEvent('lab:ready', { detail: { sector: SECTORS[S.sector] } })); }
  }

  /* ── activation ── */
  let sceneCalls = 0, sceneTris = 0;
  const takeover = () => {
    for (const p of composer.passes) {
      if (p.constructor.name === 'GTAOPass') {
        p.enabled = false;
        continue;
      }
      if (p.isRenderPass || (p.scene && p.camera && !p.isShaderPass)) {
        p.scene = lab; p.camera = cam;
        if (!p._labHooked) {
          p._labHooked = true;
          const origRender = p.render.bind(p);
          p.render = (r, writeBuffer, readBuffer, deltaTime, maskActive) => {
            origRender(r, writeBuffer, readBuffer, deltaTime, maskActive);
            sceneCalls = r.info.render.calls; sceneTris = r.info.render.triangles;
          };
        }
      }
    }
    lab.environment = null;
  };
  function activate(startAt = 0) { if (S.active) return; S.active = true; Object.assign(S, { t: 0, theta: 0, vel: 0, magnet: null, sector: 0, fInit: false, ready: false, inside: 0, insideT: 0, wantIn: false, navLocked: false }); FOCUS.active = false; FOCUS.id = null; FOCUS.t = 0; cues.clear(); fade.style.opacity = '1'; takeover(); fit();
    const b = q.get('boot'); if (b === 'skip') startAt = T.ready - .01; else if (b !== null && !isNaN(+b)) startAt = +b;
    if (startAt > 0) { S.t = startAt; const bk = {}; for (const k in sfx) if (typeof sfx[k] === 'function') { bk[k] = sfx[k]; sfx[k] = () => {}; } update(0); Object.assign(sfx, bk); if (S.t > T.table[0]) sfx.hum(S.t > T.power[0] ? .22 : .12, 1); }
    dispatchEvent(new CustomEvent('lab:activated', { detail: { t: S.t } })); }

  function skipToFinal(targetSector = null) {
    if (!S.active) activate(T.ready);
    S.t = T.ready; S.ready = true; S.inside = 0; S.insideT = 0; S.wantIn = false; S.navLocked = false;
    fade.style.opacity = '0';
    ringE.emissiveIntensity = 2.6; chanE.emissiveIntensity = 2.2; coreE.emissiveIntensity = 5.0;
    tableLight.intensity = 2.35 * LK; entLight.intensity = 4.2 * LK;
    for (const L of pendants) { L.light.intensity = L.target; L.disc.emissiveIntensity = 3.4; }
    downSpot.intensity = 16 * LK; hemi.intensity = (0.16 + 0.79) * LKh;
    blueFillA.intensity = LOW ? 1.25 : 2.5; blueFillB.intensity = LOW ? 1.0 : 2.0; blueArch.intensity = 0.22;
    if (crownWash) crownWash.intensity = 12 * LK;
    for (const l of perimeterBlue) l.intensity = 5 * LK;
    sconceE.emissiveIntensity = 3.4; portalE.emissiveIntensity = 3.0; amberE.emissiveIntensity = 2.6;
    gantryE.emissiveIntensity = 3.4; downE.emissiveIntensity = 4.0; railE.emissiveIntensity = 2.8;
    renderer.toneMappingExposure = EXP0 * 1.32; lab.fog.density = 0.02; lab.fog.color.copy(fogB);
    for (const s of screens) s.m.emissiveIntensity = s.i;
    for (const h of holos) h.m.opacity = h.target;
    for (const [a, b, root] of mirrorPairs) {
      b.visible = a.visible;
      if (root) { b.matrix.copy(a.matrixWorld); b.matrixWorldNeedsUpdate = true; }
      else { b.position.copy(a.position); b.quaternion.copy(a.quaternion); b.scale.copy(a.scale); }
      const ma = a.material, mb = b.material; if (!ma) continue;
      if (mb.opacity !== undefined) mb.opacity = ma.opacity * MIR;
      if (mb.emissiveIntensity !== undefined) mb.emissiveIntensity = ma.emissiveIntensity * MIR;
    }
    takeover();
    if (targetSector) {
      focusSector(targetSector);
      FOCUS.t = 1.0;
      S.focusE = 1.0;
      const cfg = FOCUS_CFG[targetSector];
      const g = sectorGroups[targetSector];
      if (cfg && g) {
        g.updateWorldMatrix(true, true);
        const [pos, look] = cfg.dolly(g);
        cam.position.copy(pos);
        cam.lookAt(look);
      }
    } else {
      unfocusSector();
      FOCUS.active = false;
      FOCUS.id = null;
      FOCUS.t = 0;
      S.focus = null;
      S.focusE = 0;
      S.navLocked = false;
      S.theta = 0;
      cam.position.set(0, EYE, CAM_R);
      cam.lookAt(0, EMIT_Y + 0.5, 0);
    }
    dispatchEvent(new CustomEvent('lab:ready', { detail: { sector: SECTORS[S.sector] } }));
  }

  window.addEventListener('lab:ls3:action', e => {
    const d = e.detail;
    if (!d) return;
    if (d.action === 'mode' && d.mode) setGlobeMode(d.mode);
    else if (d.action === 'preset' && d.preset) selectTargetPreset(d.preset);
    else if (d.action === 'zoom' && d.factor) zoomGlobe(d.factor);
  });
  window.addEventListener('lab:ls3:taskbar:retract', () => closeLS3Taskbar());
  window.addEventListener('lab:ls3:news:retract', () => closeLS3News());
  window.addEventListener('lab:ls3:channel:select', e => {
    const chId = e.detail?.channelId;
    if (!chId) return;
    const found = GLOBE.liveNews.find(c => c.id === chId);
    if (found) openNewsDispatch(found);
  });

  const stats = () => ({ t: +S.t.toFixed(2), theta: +S.theta.toFixed(3), sector: SECTORS[S.sector].id, ready: S.ready, active: S.active, inside: +S.insideT.toFixed(2), exposure: +renderer.toneMappingExposure.toFixed(3), calls: sceneCalls || renderer.info.render.calls, triangles: sceneTris || renderer.info.render.triangles, textures: renderer.info.memory.textures,
    camera: { p: cam.position.toArray().map(v => +v.toFixed(3)), q: cam.quaternion.toArray().map(v => +v.toFixed(4)) }, focus: FOCUS.id });
  const ai = { say, ask, get lines() { return AI.lines.slice(); }, get onAsk() { return AI.onAsk; }, set onAsk(f) { AI.onAsk = f; } };
  return { scene: lab, camera: cam, composer, state: S, T, SECTORS, update, activate, skipToFinal, openReadMode, closeReadMode, get sheets() { return sheets; }, goTo, enter, exit, focusSector, unfocusSector, focus: focusSector, blurFocus: unfocusSector, ai, stats, fade, pick, api2, sectorGroups, bokeh, handlers: SECTOR_HANDLERS, get dragging() { return dragging; }, get readId() { return readId; }, get pendingPatch() { return null; }, resume: RESUME, calendar: CAL, globe: GLOBE, get globeGroup() { return globeGroup; }, setGlobeMode, triggerGenerateAndPrint, triggerPrint, buildResumePdf, get paperMesh() { return paperMesh; }, openLS3Taskbar, closeLS3Taskbar, openNewsDispatch, closeNewsDispatch: closeLS3News, pollLiveNews, updateHoloPyramids };
}

/* ── install: one call from index.html; hooks the existing composer loop, listens for vault:entered ── */
export function installLab(opts) {
  const api = createLab(opts), { composer } = opts, q = new URLSearchParams(location.search); let last = performance.now();
  const _render = composer.render.bind(composer); composer.render = (...a) => { const now = performance.now(), dt = (now - last) / 1000; last = now; if (api.state.active) api.update(dt); _render(...a); };
  addEventListener('vault:entered', () => api.activate(), { once: true });
  if (Array.isArray(opts.blackout)) addEventListener('lab:activated', () => setTimeout(() => opts.blackout.forEach(el => { el.style.transition = 'none'; el.style.opacity = '0'; el.style.pointerEvents = 'none'; }), 50), { once: true });
  if (q.has('lab')) requestAnimationFrame(() => api.activate()); if (q.has('inside')) addEventListener('lab:ready', () => api.enter(), { once: true });
  if (window.__skipToFinalRequested) requestAnimationFrame(() => api.skipToFinal());
  window.__lab = api; return api;
}
