// about-cinematic.js
// ONE scene, ONE camera, ONE paused GSAP master timeline (duration 1 == scroll progress 0..1).
// Nothing is created lazily inside timeline callbacks. Every object exists after createCinematic().
//
// Usage:
//   const cine = createCinematic({ THREE, gsap, scene, camera, parts, world, onShowcase, onFlight, onVaultReady });
//   scroll handler:  cine.setCinematicProgress(scrollProgress)   // pure function of p
//
// `parts` = { BOOTS, LEGS, TORSO, ARMS, GAUNTLETS, HELMET }  -> Object3D loaded from your existing GLBs, UNMODIFIED.
// `world` = optional hooks: { doorL, doorR, irisBlades:[], button, beam, roomLights:[], vaultLight, optics:[materials] }

export const SUIT_HEIGHT = 3.0; // the ONE documented scale: the whole assembly is normalised to 3.0 world units, once.

export const PART_ORDER = ['BOOTS', 'LEGS', 'TORSO', 'ARMS', 'GAUNTLETS', 'HELMET'];

// ---- coordinate contract (world units ~ metres, +y up, camera looks toward -z) -------------------------------
export const LAYOUT = {
  door:   { z: 8 },                                   // giant door plane
  bench:  { center: [0, 1.0, -16], width: 9 },        // FAR from the camera (camera starts z=24, passes door at z=8)
  hover:  { origin: [0, 4.5, -16] },                  // where finished showcase parts idle above the bench
  pad:    { center: [0, 0.3, -40], radius: 4 },       // landing pad, top surface y=0.3
  button: { pos: [6.2, 0.6, -38] },                   // single red button beside the pad
};

// ---- authored camera shots (A..L from the handoff). Position + look-at target. Tweened, never computed. ----------
export const SHOTS = {
  A_identity:  { p: [0, 2.2, 24],   l: [0, 2.6, 8]    },
  B_door:      { p: [0, 2.0, 18],   l: [0, 2.2, 4]    },
  C_workshop:  { p: [0, 1.8, 5],    l: [0, 1.4, -16]  },
  D_bench:     { p: [0, 1.9, 3.5],  l: [0, 1.3, -12]  }, // held for all six showcases (D..I) with small authored drifts
  J_allflight: { p: [0, 4.6, -3],   l: [0, 4.6, -20]  },
  K_landing:   { p: [0, 2.8, -27],  l: [0, 3.9, -40]  },
  L_vault:     { p: [0, 1.6, -31.5], l: [0, 0.4, -44] },
};

// showcase windows (scroll progress). Test points from the handoff: 0.30 boots, 0.50 torso, 0.60 arms, 0.70 gauntlets.
export const SHOW = {
  BOOTS: [0.26, 0.36], LEGS: [0.36, 0.46], TORSO: [0.46, 0.56],
  ARMS: [0.56, 0.64], GAUNTLETS: [0.64, 0.72], HELMET: [0.72, 0.80],
};
const LAND_ORDER = { BOOTS: 0.895, LEGS: 0.905, TORSO: 0.915, ARMS: 0.925, GAUNTLETS: 0.933, HELMET: 0.940 }; // each lasts LAND_DUR
const LAND_DUR = 0.02;

// where, on screen, the focused part sits: LEFT half, travelling diagonally up-and-right (ENE) -------------------
const SCREEN_LANDSCAPE = { startNDC: [-0.62, -0.30], endNDC: [-0.36, 0.14], maxFracH: 0.58, maxFracW: 0.40 };
// portrait/phone: the "left half" does not exist, so the part owns the UPPER centre and text sits below it
const SCREEN_PORTRAIT  = { startNDC: [0, 0.10],      endNDC: [0, 0.34],      maxFracH: 0.36, maxFracW: 0.80 };

export function createCinematic({ THREE, gsap, scene, camera, parts, world = {}, onShowcase = () => {}, onFlight = () => {}, onVaultReady = () => {} }) {
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

  const SCREEN = camera.aspect < 1 ? SCREEN_PORTRAIT : SCREEN_LANDSCAPE;   // chosen once at init (re-create on orientation change)

  // ---------- 1. normalise the six assemblies ONCE, as one unit (preserves their relative assembly) -------------
  const union = new THREE.Box3();
  PART_ORDER.forEach((n) => { scene.attach(parts[n]); parts[n].updateMatrixWorld(true); union.union(new THREE.Box3().setFromObject(parts[n])); });
  const usize = union.getSize(new THREE.Vector3());
  const s = SUIT_HEIGHT / usize.y;
  const base = new THREE.Vector3((union.min.x + union.max.x) / 2, union.min.y, (union.min.z + union.max.z) / 2);
  const M = new THREE.Matrix4().makeScale(s, s, s).multiply(new THREE.Matrix4().makeTranslation(-base.x, -base.y, -base.z));
  const pivots = {};
  PART_ORDER.forEach((n) => {
    const obj = parts[n];
    obj.applyMatrix4(M); obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const piv = new THREE.Group(); piv.name = 'PIVOT_' + n;
    piv.position.copy(box.getCenter(new THREE.Vector3()));
    scene.add(piv); piv.attach(obj);                       // pivot sits at the part's visual centre
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    piv.userData = { name: n, assembled: piv.position.clone(), radius: sphere.radius, size: box.getSize(new THREE.Vector3()) };
    pivots[n] = piv;
  });

  // ---------- 1b. authored showcase light rig: guarantees the focused part is lit (black-on-black is a FAIL) ----------
  if (!camera.parent) scene.add(camera);
  const rig = { i: 0 };
  const rigKey = new THREE.SpotLight(0xe6eeff, 0, 0, 0.95, 0.8, 1.0); rigKey.position.set(-1.5, 1.4, 0.5); rigKey.target.position.set(-2.2, 0, -10);
  const rigRim = new THREE.PointLight(0xff3040, 0, 40, 1.3); rigRim.position.set(1.5, 2.2, -9);      // red rim from behind-right
  const rigFill = new THREE.PointLight(0x5c86ff, 0, 40, 1.3); rigFill.position.set(-4, -0.5, -6);     // electric-blue underlight
  camera.add(rigKey, rigKey.target, rigRim, rigFill);
  const RIG = { key: 260, rim: 120, fill: 70 };

  // ---------- 2. camera proxy (the ONLY thing that moves the camera) ----------------------------------------------
  const cam = { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0 };
  const setShot = (sh) => Object.assign(cam, { px: sh.p[0], py: sh.p[1], pz: sh.p[2], lx: sh.l[0], ly: sh.l[1], lz: sh.l[2] });
  const shotTo = (sh, dur, at, ease = 'power2.inOut') =>
    tl.to(cam, { px: sh.p[0], py: sh.p[1], pz: sh.p[2], lx: sh.l[0], ly: sh.l[1], lz: sh.l[2], duration: dur, ease }, at);
  function applyCamera() {
    camera.position.set(cam.px, cam.py, cam.pz);
    camera.lookAt(cam.lx, cam.ly, cam.lz);
    camera.updateMatrixWorld(true);
    rigKey.intensity = RIG.key * rig.i; rigRim.intensity = RIG.rim * rig.i; rigFill.intensity = RIG.fill * rig.i;
  }

  // ---------- 3. per-part state proxies ---------------------------------------------------------------------------
  const st = {};
  const bench = V3(LAYOUT.bench.center), hov = V3(LAYOUT.hover.origin), pad = V3(LAYOUT.pad.center);
  const suitMid = new THREE.Vector3(0, SUIT_HEIGHT / 2, 0);
  PART_ORDER.forEach((n, k) => {
    const u = pivots[n].userData;
    const stage = new THREE.Vector3(bench.x - 3.6 + k * 1.44, bench.y + 0.1 + u.size.y / 2, bench.z);
    st[n] = {
      wx: stage.x, wy: stage.y, wz: stage.z,    // world-space proxy
      nx: 0, ny: 0, d: 10,                      // screen-space proxy (NDC x/y, distance along camera forward)
      w: 0,                                     // 0 = world proxy, 1 = screen proxy
      rx: 0, ry: 0, rz: 0, fly: 0, stage,
    };
  });

  const fwd = new THREE.Vector3(), tmpV = new THREE.Vector3(), tmpP = new THREE.Vector3();
  function ndcToWorld(nx, ny, d, out) {
    tmpV.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
    camera.getWorldDirection(fwd);
    const t = d / Math.max(1e-4, tmpV.dot(fwd));
    return out.copy(camera.position).addScaledVector(tmpV, t);
  }
  function worldToNdc(p) {
    camera.getWorldDirection(fwd);
    const d = tmpP.copy(p).sub(camera.position).dot(fwd);
    const q = p.clone().project(camera);
    return { nx: q.x, ny: q.y, d };
  }
  const fovHalfTan = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  function showDistance(n) {                      // authored once per part: sphere must fit the left-half frame
    const dia = pivots[n].userData.radius * 2;
    const dH = dia / (2 * fovHalfTan() * SCREEN.maxFracH);
    const dW = dia / (2 * fovHalfTan() * camera.aspect * SCREEN.maxFracW);
    return Math.max(dH, dW);
  }

  // launch NDC per part: projection of its bench slot through the AUTHORED bench shot (computed once, static)
  const launch = {};
  (function () {
    const keep = { ...cam };
    setShot(SHOTS.D_bench); applyCamera();
    PART_ORDER.forEach((n) => { launch[n] = worldToNdc(st[n].stage); });
    Object.assign(cam, keep);
  })();

  function applyParts() {
    PART_ORDER.forEach((n) => {
      const q = st[n], piv = pivots[n];
      const wv = tmpP.set(q.wx, q.wy, q.wz).clone();
      if (q.w > 0.0001) { const sv = ndcToWorld(q.nx, q.ny, q.d, new THREE.Vector3()); wv.lerp(sv, q.w); }
      piv.position.copy(wv);
      piv.rotation.set(q.rx, q.ry, q.rz);
    });
  }

  // ---------- 4. the ONE master timeline --------------------------------------------------------------------------
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const T = (p) => p;                                  // timeline time == scroll progress, deliberately boring
  const DOOR_SLIDE = 6.4;
  setShot(SHOTS.A_identity);

  // 0.00 - 0.08 identity (DOM P/G + name live in your existing overlay). Camera rests on the door.
  // 0.08 - 0.14 door divides; camera moves through the opening.
  if (world.doorL) tl.to(world.doorL.position, { x: -DOOR_SLIDE, duration: 0.06, ease: 'power2.inOut' }, T(0.08));
  if (world.doorR) tl.to(world.doorR.position, { x: DOOR_SLIDE, duration: 0.06, ease: 'power2.inOut' }, T(0.08));
  shotTo(SHOTS.B_door, 0.06, T(0.07));
  shotTo(SHOTS.C_workshop, 0.07, T(0.13));
  // 0.15 - 0.26 workshop wakes: room lights ramp, helmet optics first, then bench cam settles.
  (world.roomLights || []).forEach((l) => tl.fromTo(l, { intensity: 0 }, { intensity: l.userData?.full ?? 1, duration: 0.07, ease: 'power1.out' }, T(0.13)));
  (world.optics || []).forEach((m) => tl.fromTo(m, { emissiveIntensity: 0 }, { emissiveIntensity: 3, duration: 0.03 }, T(0.19)));
  shotTo(SHOTS.D_bench, 0.07, T(0.19));
  tl.fromTo(rig, { i: 0 }, { i: 1, duration: 0.04, ease: 'power1.in' }, T(0.24));        // rig on for the showcases
  tl.fromTo(rig, { i: 1 }, { i: 0.45, duration: 0.05, ease: 'power1.inOut', immediateRender: false }, T(0.80)); // eased down for flight/landing

  // 0.26 - 0.80 six showcases. Camera is HELD at D_bench with small authored drifts; parts are placed by authored
  // screen targets (left half, ENE diagonal) -> the camera never "solves" anything.
  PART_ORDER.forEach((n, k) => {
    const [a, b] = SHOW[n], dur = b - a, q = st[n], L = launch[n];
    const drift = [0.9, -0.8, 0.6, -0.7, 0.8, -0.5][k];
    const dShow = showDistance(n);
    tl.to(cam, { lx: SHOTS.D_bench.l[0] + drift, pz: SHOTS.D_bench.p[2] - 0.35, duration: dur, ease: 'sine.inOut' }, T(a));
    // launch: take over from the bench slot (same screen position -> no pop), fly to the left-half showcase
    tl.set(q, { w: 1, nx: L.nx, ny: L.ny, d: L.d }, T(a));
    tl.fromTo(q, { nx: L.nx, ny: L.ny, d: L.d }, { nx: SCREEN.startNDC[0], ny: SCREEN.startNDC[1], d: dShow, duration: dur * 0.35, ease: 'power2.out', immediateRender: false }, T(a) + 0.00001);
    tl.fromTo(q, { rx: 0, ry: 0 }, { ry: Math.PI * 1.1, rx: 0.25, duration: dur * 0.8, ease: 'sine.inOut', immediateRender: false }, T(a));
    tl.fromTo(q, { nx: SCREEN.startNDC[0], ny: SCREEN.startNDC[1], d: dShow }, { nx: SCREEN.endNDC[0], ny: SCREEN.endNDC[1], d: dShow * 0.96, duration: dur * 0.5, ease: 'none', immediateRender: false }, T(a + dur * 0.35));
    tl.fromTo(q, { nx: SCREEN.endNDC[0], ny: SCREEN.endNDC[1], d: dShow * 0.96 }, { nx: -0.2, ny: 0.42, d: dShow * 2.6, duration: dur * 0.15, ease: 'power2.in', immediateRender: false }, T(a + dur * 0.85));
    // hand back to the world proxy at the hover formation above the bench
    tl.set(q, { wx: hov.x - 5 + k * 2, wy: hov.y + 0.35 * Math.sin(k * 1.7), wz: hov.z, rx: 0.1, ry: 0.4 }, T(b) - 0.0002);
    tl.fromTo(q, { w: 1 }, { w: 0, duration: 0.0004, ease: 'none', immediateRender: false }, T(b) - 0.0002);
  });

  // 0.80 - 0.90 all pieces fly (exploded -> converged) toward the landing pad, camera widens then follows.
  shotTo(SHOTS.J_allflight, 0.04, T(0.78));
  PART_ORDER.forEach((n) => {
    const q = st[n], u = pivots[n].userData;
    const rel = u.assembled.clone().sub(suitMid);
    const exploded = hov.clone().add(rel.clone().multiplyScalar(1.7));
    tl.to(q, { wx: exploded.x, wy: exploded.y, wz: exploded.z - 1, rx: 0, ry: 0, duration: 0.05, ease: 'power2.inOut' }, T(0.80));
    const conv = new THREE.Vector3(pad.x, pad.y + 3.1, pad.z).add(rel).add(suitMid);
    tl.to(q, { wx: conv.x, wy: conv.y, wz: conv.z, duration: 0.05, ease: 'power2.inOut' }, T(0.85));
  });
  shotTo(SHOTS.K_landing, 0.06, T(0.85));

  // 0.90 - 0.96 ordered landing: boots, legs, torso, arms, gauntlets, helmet. Each lands in its assembled slot.
  const finalPos = {};
  PART_ORDER.forEach((n) => {
    const q = st[n], u = pivots[n].userData;
    finalPos[n] = new THREE.Vector3(pad.x, pad.y, pad.z).add(u.assembled);
    tl.to(q, { wx: finalPos[n].x, wy: finalPos[n].y, wz: finalPos[n].z, duration: LAND_DUR, ease: 'power2.in' }, T(LAND_ORDER[n]));
  });

  // 0.96 - 1.00 red button -> suit steps back, raises repulsor, fires; pad opens like an aperture; vault revealed.
  if (world.button) {
    tl.to(world.button.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 0.01, yoyo: true, repeat: 3 }, T(0.962));
    tl.to(world.button.position, { y: LAYOUT.button.pos[1] - 0.08, duration: 0.006 }, T(0.972));
  }
  PART_ORDER.forEach((n) => {                         // step back (toward camera)
    tl.to(st[n], { wz: finalPos[n].z + 1.6, duration: 0.01, ease: 'power1.inOut' }, T(0.972));
  });
  tl.to(st.ARMS, { rx: -1.15, wy: finalPos.ARMS.y + 0.35, duration: 0.01 }, T(0.975));
  tl.to(st.GAUNTLETS, { rx: -1.2, wy: finalPos.GAUNTLETS.y + 0.9, wz: finalPos.GAUNTLETS.z + 1.6 - 0.5, duration: 0.01 }, T(0.975));
  if (world.beam) {
    tl.fromTo(world.beam.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: 1, y: 1, z: 1, duration: 0.006, ease: 'power3.out' }, T(0.981));
    tl.to(world.beam.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.008 }, T(0.988));
  }
  (world.irisBlades || []).forEach((bl, i) => tl.to(bl.rotation, { z: bl.userData.openZ ?? 1.2, duration: 0.012, ease: 'power2.inOut' }, T(0.986)));
  if (world.vaultLight) tl.fromTo(world.vaultLight, { intensity: 0 }, { intensity: world.vaultLight.userData?.full ?? 40, duration: 0.01 }, T(0.988));
  shotTo(SHOTS.L_vault, 0.014, T(0.986));

  tl.duration(1);

  // ---------- 5. the deterministic setter ----------------------------------------------------------------------------
  let lastFocus = undefined, lastVault = undefined; const lastFly = {};
  function setCinematicProgress(p) {
    const pp = Math.min(1, Math.max(0, p));
    tl.progress(pp, false);
    applyCamera();
    applyParts();
    // everything below is a pure function of p (no stateful callbacks -> scrubbing both directions is exact)
    let focus = null;
    PART_ORDER.forEach((n) => { const [a, b] = SHOW[n]; if (pp >= a && pp < b) focus = n; });
    if (focus !== lastFocus) { lastFocus = focus; onShowcase(focus); }
    PART_ORDER.forEach((n) => { const q = st[n]; const f = n === focus ? Math.min(1, (pp - SHOW[n][0]) / ((SHOW[n][1] - SHOW[n][0]) * 0.2)) : 0; if (f !== lastFly[n]) { lastFly[n] = f; onFlight(n, f); } });
    const vr = pp >= 0.995; if (vr !== lastVault) { lastVault = vr; onVaultReady(vr); }
    return pp;
  }

  // ---------- 6. debug / acceptance hooks (read-only; safe to leave in production) ----------------------------------
  function projectBBox(name, W, H) {
    const box = new THREE.Box3().setFromObject(pivots[name]);
    const c = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) c.push(new THREE.Vector3(x, y, z));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, behind = 0;
    c.forEach((v) => {
      camera.getWorldDirection(fwd);
      if (v.clone().sub(camera.position).dot(fwd) <= 0.01) behind++;
      const q = v.project(camera); const px = (q.x * 0.5 + 0.5) * W, py = (-q.y * 0.5 + 0.5) * H;
      x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
    });
    return { x0, y0, x1, y1, behindCamera: behind, area: Math.max(0, x1 - x0) * Math.max(0, y1 - y0) };
  }
  const setSubjectVisible = (name, v) => { pivots[name].visible = v; };

  setCinematicProgress(0);
  return { setCinematicProgress, projectBBox, setSubjectVisible, pivots, timeline: tl, scale: s };
}
