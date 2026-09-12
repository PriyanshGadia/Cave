// ls1_identity_detail.js - Gate B-2B: Identity Detail Pass
// Zero external network assets. Pure THREE.BufferGeometry.
// Additive identity geometry for Priyansh Gadia likeness:
// 1. HEAD: Continuous anatomical face sculpt wrapping from ear to ear, centered on hull axis
//          (forehead, brow ridge, orbital hollows, nose bridge/tip/wings, philtrum,
//          mouth plane & lips, chin, mandibular jawline) + anatomical ears
// 2. HAIR: Volumetric dark wavy/curly hair mass matching owner's characteristic silhouette
// 3. GLASSES: Explicit thin rectangular frames, arched bridge, temple arms, fitted inner lenses
// 4. CLOTHING: Blazer notch lapels, collar roll, shirt collar, buttons, pocket flaps, hem, rear vent
// 5. SHOES: Sneaker cupsole, foxing stripe, toe cap, tongue, laces, ankle collar

export function createIdentityDetailGroup(THREE, defaultMat) {
  const root = new THREE.Group();
  root.name = 'LS1_Identity_Detail_Root';

  const mat = defaultMat || new THREE.MeshStandardMaterial({
    color: 0xc8c0b8,
    roughness: 0.78,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  function addMesh(geom, parent, name, customMat) {
    geom.computeVertexNormals();
    const m = new THREE.Mesh(geom, customMat || mat);
    if (name) m.name = name;
    m.castShadow = false;
    m.receiveShadow = false;
    parent.add(m);
    return m;
  }

  // Exact Z surface of the base visual hull in the head region
  function getHullZ(y) {
    const pts = [
      [1.46, 0.050],
      [1.48, 0.075],
      [1.50, 0.090],
      [1.52, 0.094],
      [1.54, 0.099],
      [1.56, 0.101],
      [1.58, 0.101],
      [1.60, 0.096],
      [1.62, 0.092],
      [1.64, 0.090],
      [1.66, 0.098],
      [1.68, 0.099]
    ];
    if (y <= pts[0][0]) return pts[0][1];
    if (y >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (let i = 0; i < pts.length - 1; i++) {
      if (y >= pts[i][0] && y <= pts[i + 1][0]) {
        const t = (y - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
        return pts[i][1] + t * (pts[i + 1][1] - pts[i][1]);
      }
    }
    return 0.095;
  }

  // Head center axis in the visual hull
  const X0 = 0.010;

  // =========================================================================
  // 1. HEAD & FACIAL SUBSTRUCTURE (Continuous Anatomical Face Sculpt)
  // =========================================================================
  const headGroup = new THREE.Group();
  headGroup.name = 'Head_Facial_Structure';
  root.add(headGroup);

  // --- A. CONTINUOUS ANATOMICAL FACIAL SURFACE MESH ---
  // Parameterized across the frontal hemisphere from behind right ear to behind left ear
  // and from inside the shirt collar (y=1.435) to high under the hair cap (y=1.710).
  // Guaranteed proud of the visual hull front across the entire face (zero z-fighting).
  {
    const rows = 64;
    const cols = 56;
    const pos = [];
    const idx = [];

    const Y_MIN = 1.435;
    const Y_MAX = 1.710;

    for (let r = 0; r <= rows; r++) {
      const v = r / rows; // 0 (neck/collar) to 1 (cranium under hair)
      const y = Y_MIN + v * (Y_MAX - Y_MIN);

      const hZ = getHullZ(y);
      const yNorm = (y - 1.580) / 0.130;
      // Cranium / jaw half-width at height y
      const Rx = 0.082 * Math.sqrt(Math.max(0.18, 1.0 - yNorm * yNorm * 0.60));

      for (let c = 0; c <= cols; c++) {
        const uNorm = (c / cols) * 2.0 - 1.0; // -1 (behind right ear) to +1 (behind left ear)
        const x = X0 + uNorm * Rx;

        // Base frontal depth: strictly proud of visual hull across entire face
        const u2 = uNorm * uNorm;
        let zBase = hZ + 0.0040 - 0.0035 * u2;

        // Turn the lateral corner into the ear and nape only at the outer temple perimeter (|uNorm| > 0.85)
        if (Math.abs(uNorm) > 0.85) {
          const sideT = (Math.abs(uNorm) - 0.85) / 0.15;
          zBase -= sideT * sideT * 0.075;
        }

        // Round the top of the forehead cleanly back into the skull to meet the hair volume
        if (y > 1.650) {
          const topT = (y - 1.650) / 0.060;
          zBase -= topT * topT * 0.038;
        }

        // Round under the chin and neck into the shirt collar
        if (y < 1.465) {
          const botT = (1.465 - y) / 0.030;
          zBase -= botT * botT * 0.025;
        }

        let deltaZ = 0.0;

        // 1. Forehead bossing: smooth gentle curvature centered at y=1.658, uNorm=0
        const fGaussY = Math.exp(-Math.pow((y - 1.658) / 0.032, 2));
        const fGaussU = Math.exp(-Math.pow(uNorm / 0.60, 2));
        deltaZ += fGaussY * fGaussU * 0.0035;

        // 2. Brow ridge (Superciliary arches & glabella): prominent bar across brow at y=1.624
        const bGaussY = Math.exp(-Math.pow((y - 1.624) / 0.011, 2));
        const bGaussU = Math.exp(-Math.pow(uNorm / 0.58, 4));
        deltaZ += bGaussY * bGaussU * 0.0065;

        // 3. Orbital hollows (Eye sockets where glasses rest): uNorm = ±0.39, y = 1.604
        const eGaussY = Math.exp(-Math.pow((y - 1.604) / 0.013, 2));
        const eGaussL = Math.exp(-Math.pow((uNorm - 0.39) / 0.16, 2));
        const eGaussR = Math.exp(-Math.pow((uNorm + 0.39) / 0.16, 2));
        deltaZ -= eGaussY * (eGaussL + eGaussR) * 0.0055;

        // 4. Nose bridge & dorsum: y from 1.564 up to 1.618
        if (y >= 1.545 && y <= 1.620) {
          const nBridgeW = 0.09 + ((y - 1.564) / 0.056) * 0.03;
          const nBridge = Math.exp(-Math.pow(uNorm / Math.max(0.07, nBridgeW), 2)) * (0.006 + (1.618 - y) * 0.14);
          deltaZ += nBridge;
        }

        // Nose tip (pronasale): crisp rounded apex at y=1.564, uNorm=0
        const tipY = Math.exp(-Math.pow((y - 1.564) / 0.012, 2));
        const tipU = Math.exp(-Math.pow(uNorm / 0.11, 2));
        deltaZ += tipY * tipU * 0.0150;

        // Alar wings (nostrils): y=1.558, uNorm=±0.17
        const alaY = Math.exp(-Math.pow((y - 1.558) / 0.009, 2));
        const alaL = Math.exp(-Math.pow((uNorm - 0.17) / 0.08, 2));
        const alaR = Math.exp(-Math.pow((uNorm + 0.17) / 0.08, 2));
        deltaZ += alaY * (alaL + alaR) * 0.0065;

        // 5. Philtrum depression at midline between nose and upper lip
        const pGaussY = Math.exp(-Math.pow((y - 1.539) / 0.008, 2));
        const pMid = Math.exp(-Math.pow(uNorm / 0.045, 2));
        const pColL = Math.exp(-Math.pow((uNorm - 0.075) / 0.035, 2));
        const pColR = Math.exp(-Math.pow((uNorm + 0.075) / 0.035, 2));
        deltaZ += pGaussY * (-pMid * 0.0020 + (pColL + pColR) * 0.0012);

        // 6. Mouth & Lips
        // Upper lip with cupid's bow: y=1.527
        const uLipY = Math.exp(-Math.pow((y - 1.527) / 0.0060, 2));
        const uLipU = Math.exp(-Math.pow(uNorm / 0.26, 2));
        const cupidBow = 1.0 - 0.35 * Math.exp(-Math.pow(uNorm / 0.05, 2));
        deltaZ += uLipY * uLipU * cupidBow * 0.0065;

        // Oral fissure (mouth separation line): y=1.520
        const slitY = Math.exp(-Math.pow((y - 1.520) / 0.0030, 2));
        const slitU = Math.exp(-Math.pow(uNorm / 0.28, 2));
        deltaZ -= slitY * slitU * 0.0025;

        // Lower lip cushion: y=1.513
        const lLipY = Math.exp(-Math.pow((y - 1.513) / 0.0065, 2));
        const lLipU = Math.exp(-Math.pow(uNorm / 0.23, 2));
        deltaZ += lLipY * lLipU * 0.0075;

        // Labiomental groove: y=1.501
        const gGaussY = Math.exp(-Math.pow((y - 1.501) / 0.0060, 2));
        const gGaussU = Math.exp(-Math.pow(uNorm / 0.25, 2));
        deltaZ -= gGaussY * gGaussU * 0.0030;

        // 7. Chin (Mental protuberance): y=1.482, uNorm=0
        const cGaussY = Math.exp(-Math.pow((y - 1.482) / 0.015, 2));
        const cGaussU = Math.exp(-Math.pow(uNorm / 0.28, 2));
        deltaZ += cGaussY * cGaussU * 0.0085;

        // 8. Mandibular jawline contour
        const jawY = 1.474 + Math.abs(uNorm) * 0.035;
        const jGaussY = Math.exp(-Math.pow((y - jawY) / 0.014, 2));
        const jGaussU = Math.exp(-Math.pow((Math.abs(uNorm) - 0.65) / 0.20, 2));
        deltaZ += jGaussY * jGaussU * 0.0040;

        // 9. Cheeks (Zygomatic fullness): y=1.585, uNorm=±0.50
        const chGaussY = Math.exp(-Math.pow((y - 1.585) / 0.020, 2));
        const chL = Math.exp(-Math.pow((uNorm - 0.50) / 0.18, 2));
        const chR = Math.exp(-Math.pow((uNorm + 0.50) / 0.18, 2));
        deltaZ += chGaussY * (chL + chR) * 0.0035;

        pos.push(x, y, zBase + deltaZ);
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i0 = r * (cols + 1) + c;
        const i1 = i0 + 1;
        const i2 = (r + 1) * (cols + 1) + c;
        const i3 = i2 + 1;
        idx.push(i0, i1, i2);
        idx.push(i1, i3, i2);
      }
    }

    const faceGeom = new THREE.BufferGeometry();
    faceGeom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    faceGeom.setIndex(idx);
    addMesh(faceGeom, headGroup, 'Unified_Face_Sculpt');
  }

  // --- B. ANATOMICAL EARS ---
  for (const side of [-1, 1]) {
    const earGroup = new THREE.Group();
    earGroup.name = `Ear_${side > 0 ? 'Left' : 'Right'}`;

    const helixCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, -0.018, -0.003),
      new THREE.Vector3(0.005, -0.009, -0.009),
      new THREE.Vector3(0.007,  0.006, -0.011),
      new THREE.Vector3(0.005,  0.019, -0.006),
      new THREE.Vector3(0.0,    0.021,  0.003),
      new THREE.Vector3(-0.004, 0.011,  0.006),
    ]);
    const helixGeom = new THREE.TubeGeometry(helixCurve, 18, 0.0032, 8, false);
    addMesh(helixGeom, earGroup, 'Helix_Rim');

    const conchaGeom = new THREE.SphereGeometry(0.012, 12, 10, 0, Math.PI, 0, Math.PI * 0.65);
    conchaGeom.rotateY(Math.PI / 2);
    conchaGeom.scale(0.5, 1.35, 0.85);
    conchaGeom.translate(0.001, 0.002, 0.0);
    addMesh(conchaGeom, earGroup, 'Concha_Bowl');

    const lobeGeom = new THREE.SphereGeometry(0.0058, 10, 8);
    lobeGeom.scale(0.75, 1.25, 0.9);
    lobeGeom.translate(0.0, -0.016, -0.001);
    addMesh(lobeGeom, earGroup, 'Ear_Lobe');

    const earX = side > 0 ? (X0 + 0.078) : (X0 - 0.078);
    earGroup.position.set(earX, 1.580, 0.006);
    earGroup.rotation.y = side * 0.22;
    earGroup.rotation.z = side * -0.08;
    headGroup.add(earGroup);
  }

  // =========================================================================
  // 2. HAIR (Characteristic voluminous dark wavy/curly silhouette)
  // =========================================================================
  const hairGroup = new THREE.Group();
  hairGroup.name = 'Hair_Volumetric_System';
  root.add(hairGroup);

  // A. Main volumetric wave cap over skull
  {
    const hairCap = new THREE.SphereGeometry(0.088, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.76);
    const pos = hairCap.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);

      const wave1 = Math.sin(px * 32.0) * Math.cos(pz * 28.0) * 0.0045;
      const wave2 = Math.cos(py * 25.0 + px * 18.0) * 0.0035;
      const quiffLift = (pz > -0.01 && py > 0.0) ? (Math.max(0.0, pz) * py * 0.42) : 0.0;
      const rearFull = (pz < 0.0 && py < 0.0) ? (-pz * 0.18) : 0.0;

      pos.setX(i, px * 1.03 + wave1);
      pos.setY(i, py * 1.05 + wave2 + quiffLift);
      pos.setZ(i, pz * 1.04 + wave1 + rearFull);
    }
    hairCap.translate(X0, 1.666, 0.006);
    addMesh(hairCap, hairGroup, 'Hair_Main_Cap');
  }

  // B. Natural Wavy Locks & Quiff (Flowing naturally across brow, hairline and crown)
  {
    const hairLocks = [
      // Main quiff wave sweeping up and to the right
      {
        pts: [
          new THREE.Vector3(X0 - 0.045, 1.690, 0.082),
          new THREE.Vector3(X0 - 0.020, 1.725, 0.104),
          new THREE.Vector3(X0 + 0.015, 1.738, 0.106),
          new THREE.Vector3(X0 + 0.040, 1.718, 0.092),
        ],
        r: 0.0105
      },
      // Secondary crest curl
      {
        pts: [
          new THREE.Vector3(X0 - 0.025, 1.712, 0.098),
          new THREE.Vector3(X0 + 0.005, 1.745, 0.114),
          new THREE.Vector3(X0 + 0.035, 1.732, 0.102),
        ],
        r: 0.0090
      },
      // Front hairline wavy fringe lock 1 (sweeping across upper forehead)
      {
        pts: [
          new THREE.Vector3(X0 - 0.046, 1.682, 0.088),
          new THREE.Vector3(X0 - 0.020, 1.666, 0.106),
          new THREE.Vector3(X0 + 0.012, 1.678, 0.108),
          new THREE.Vector3(X0 + 0.036, 1.665, 0.098),
        ],
        r: 0.0090
      },
      // Front hairline wavy fringe lock 2 (curl accent)
      {
        pts: [
          new THREE.Vector3(X0 - 0.012, 1.674, 0.104),
          new THREE.Vector3(X0 + 0.014, 1.658, 0.111),
          new THREE.Vector3(X0 + 0.026, 1.672, 0.105),
        ],
        r: 0.0080
      },
      // Left temple wave
      {
        pts: [
          new THREE.Vector3(X0 + 0.035, 1.705, 0.086),
          new THREE.Vector3(X0 + 0.052, 1.678, 0.070),
          new THREE.Vector3(X0 + 0.060, 1.645, 0.050),
        ],
        r: 0.0085
      },
      // Right side part
      {
        pts: [
          new THREE.Vector3(X0 - 0.035, 1.700, 0.082),
          new THREE.Vector3(X0 - 0.054, 1.672, 0.066),
          new THREE.Vector3(X0 - 0.062, 1.640, 0.048),
        ],
        r: 0.0085
      }
    ];

    hairLocks.forEach((lock, idx) => {
      const curve = new THREE.CatmullRomCurve3(lock.pts);
      const geom = new THREE.TubeGeometry(curve, 20, lock.r, 10, false);
      addMesh(geom, hairGroup, `Hair_Wave_Lock_${idx}`);
    });
  }

  // C. Crown & Parietal Wavy Lobes
  {
    const crownWaves = [
      { x: X0 - 0.034, y: 1.742, z: 0.028, r: 0.026, sx: 1.3, sy: 0.82, sz: 1.4 },
      { x: X0 + 0.018, y: 1.750, z: 0.032, r: 0.028, sx: 1.4, sy: 0.85, sz: 1.3 },
      { x: X0 - 0.022, y: 1.746, z: -0.028, r: 0.029, sx: 1.25, sy: 0.82, sz: 1.35 },
      { x: X0 + 0.028, y: 1.742, z: -0.022, r: 0.028, sx: 1.3, sy: 0.85, sz: 1.25 },
      { x: X0 + 0.000, y: 1.752, z: 0.006, r: 0.031, sx: 1.5, sy: 0.88, sz: 1.4 },
      { x: X0 - 0.042, y: 1.724, z: -0.058, r: 0.027, sx: 1.2, sy: 0.9, sz: 1.2 },
      { x: X0 + 0.040, y: 1.722, z: -0.052, r: 0.027, sx: 1.2, sy: 0.9, sz: 1.2 },
    ];

    crownWaves.forEach((cw, idx) => {
      const g = new THREE.SphereGeometry(cw.r, 14, 12);
      g.scale(cw.sx, cw.sy, cw.sz);
      g.translate(cw.x, cw.y, cw.z);
      addMesh(g, hairGroup, `Hair_Crown_Lobe_${idx}`);
    });
  }

  // D. Sides & Temples
  for (const side of [-1, 1]) {
    const sbCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(X0 + side * 0.076, 1.664, 0.038),
      new THREE.Vector3(X0 + side * 0.079, 1.630, 0.030),
      new THREE.Vector3(X0 + side * 0.080, 1.595, 0.022),
    ]);
    const sbGeom = new THREE.TubeGeometry(sbCurve, 12, 0.0085, 8, false);
    addMesh(sbGeom, hairGroup, `Hair_Sideburn_${side > 0 ? 'L' : 'R'}`);

    const oerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(X0 + side * 0.074, 1.670,  0.042),
      new THREE.Vector3(X0 + side * 0.082, 1.648,  0.006),
      new THREE.Vector3(X0 + side * 0.080, 1.628, -0.036),
      new THREE.Vector3(X0 + side * 0.072, 1.590, -0.066),
    ]);
    const oerGeom = new THREE.TubeGeometry(oerCurve, 16, 0.0125, 8, false);
    addMesh(oerGeom, hairGroup, `Hair_OverEar_${side > 0 ? 'L' : 'R'}`);
  }

  // E. Occipital Fullness & Nape Taper
  {
    const napeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(X0, 1.665, -0.090),
      new THREE.Vector3(X0, 1.605, -0.112),
      new THREE.Vector3(X0, 1.545, -0.108),
      new THREE.Vector3(X0, 1.485, -0.096),
    ]);
    const napeGeom = new THREE.TubeGeometry(napeCurve, 18, 0.044, 12, false);
    napeGeom.scale(1.3, 1.0, 0.65);
    addMesh(napeGeom, hairGroup, 'Hair_Nape_Volume');
  }

  // =========================================================================
  // 3. GLASSES (Explicit thin rectangular frames, arched bridge, temples, lenses)
  // =========================================================================
  const glassesGroup = new THREE.Group();
  glassesGroup.name = 'Glasses_Rig';
  root.add(glassesGroup);

  const FRAME_Y = 1.604;
  const FRAME_Z = 0.1155; // Placed proudly on the sculpted nose bridge
  const RIM_W = 0.019; // 38mm total frame width per eye
  const RIM_H = 0.014; // 28mm total frame height per eye
  const WIRE_R = 0.0016;

  function createSmoothRim(cx, cy, cz) {
    const r = 0.0035;
    const w = RIM_W - r;
    const h = RIM_H - r;
    const pts = [
      new THREE.Vector3(cx + w, cy + h - r, cz),
      new THREE.Vector3(cx + w, cy - h + r, cz),
      new THREE.Vector3(cx + w - r, cy - h, cz),
      new THREE.Vector3(cx - w + r, cy - h, cz),
      new THREE.Vector3(cx - w, cy - h + r, cz),
      new THREE.Vector3(cx - w, cy + h - r, cz),
      new THREE.Vector3(cx - w + r, cy + h, cz),
      new THREE.Vector3(cx + w - r, cy + h, cz),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, true);
    return new THREE.TubeGeometry(curve, 32, WIRE_R, 8, true);
  }

  // Left & Right Rims centered around X0
  const leftRimGeom = createSmoothRim(X0 + 0.032, FRAME_Y, FRAME_Z);
  addMesh(leftRimGeom, glassesGroup, 'Glasses_Rim_Left');

  const rightRimGeom = createSmoothRim(X0 - 0.032, FRAME_Y, FRAME_Z);
  addMesh(rightRimGeom, glassesGroup, 'Glasses_Rim_Right');

  // Arched Bridge Bar across nose
  {
    const bridgeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(X0 - 0.0125, FRAME_Y + 0.001, FRAME_Z - 0.001),
      new THREE.Vector3(X0 + 0.0000, FRAME_Y + 0.0042, FRAME_Z + 0.0015),
      new THREE.Vector3(X0 + 0.0125, FRAME_Y + 0.001, FRAME_Z - 0.001),
    ]);
    const bridgeGeom = new THREE.TubeGeometry(bridgeCurve, 14, WIRE_R * 1.05, 8, false);
    addMesh(bridgeGeom, glassesGroup, 'Glasses_Bridge');
  }

  // Nose Pads
  for (const side of [-1, 1]) {
    const padArm = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(X0 + side * 0.0125, FRAME_Y - 0.002, FRAME_Z - 0.001),
        new THREE.Vector3(X0 + side * 0.0095, FRAME_Y - 0.007, FRAME_Z - 0.005),
      ]),
      6, WIRE_R * 0.75, 6, false
    );
    addMesh(padArm, glassesGroup, `NosePad_Arm_${side > 0 ? 'L' : 'R'}`);

    const padGeom = new THREE.BoxGeometry(0.002, 0.006, 0.004);
    padGeom.translate(X0 + side * 0.0090, FRAME_Y - 0.007, FRAME_Z - 0.006);
    addMesh(padGeom, glassesGroup, `NosePad_${side > 0 ? 'L' : 'R'}`);
  }

  // Temple Arms (Curve cleanly outside the skull and hook over ears)
  for (const side of [-1, 1]) {
    const templeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(X0 + side * (0.032 + RIM_W), FRAME_Y + 0.002, FRAME_Z - 0.002),
      new THREE.Vector3(X0 + side * 0.072, FRAME_Y + 0.003, 0.075),
      new THREE.Vector3(X0 + side * 0.079, FRAME_Y + 0.002, 0.035),
      new THREE.Vector3(X0 + side * 0.081, FRAME_Y + 0.001, 0.006),
      new THREE.Vector3(X0 + side * 0.079, FRAME_Y - 0.015, -0.015),
      new THREE.Vector3(X0 + side * 0.076, FRAME_Y - 0.025, -0.020),
    ]);
    const templeGeom = new THREE.TubeGeometry(templeCurve, 28, WIRE_R * 0.95, 8, false);
    addMesh(templeGeom, glassesGroup, `Glasses_Temple_${side > 0 ? 'L' : 'R'}`);
  }

  // Inset Lens Discs
  for (const side of [-1, 1]) {
    const lensGeom = new THREE.CylinderGeometry(RIM_H * 0.95, RIM_H * 0.95, 0.001, 16);
    lensGeom.rotateX(Math.PI / 2);
    lensGeom.scale(RIM_W / RIM_H, 1.0, 1.0);
    lensGeom.translate(X0 + side * 0.032, FRAME_Y, FRAME_Z - 0.0005);
    addMesh(lensGeom, glassesGroup, `Glasses_Lens_${side > 0 ? 'L' : 'R'}`);
  }

  // =========================================================================
  // 4. CLOTHING IDENTITY DETAIL (Blazer notch lapels, collar, buttons, pockets, vent)
  // =========================================================================
  const clothingGroup = new THREE.Group();
  clothingGroup.name = 'Clothing_Identity_Structure';
  root.add(clothingGroup);

  // --- A. BLAZER NOTCH LAPELS & COLLAR ROLL ---
  for (const side of [-1, 1]) {
    const collarCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.052, 1.425, -0.030),
      new THREE.Vector3(side * 0.068, 1.415,  0.025),
      new THREE.Vector3(side * 0.082, 1.370,  0.076),
      new THREE.Vector3(side * 0.096, 1.295,  0.096),
    ]);
    const collarGeom = new THREE.TubeGeometry(collarCurve, 16, 0.008, 8, false);
    collarGeom.scale(1.2, 0.6, 1.0);
    addMesh(collarGeom, clothingGroup, `Blazer_Collar_${side > 0 ? 'L' : 'R'}`);

    // 2. Lapel Blade with distinct 3D relief
    const lapelPts = [];
    const lapelIdx = [];
    const lapelSlices = [
      { y: 1.285, xInner: side * 0.045, zInner: 0.098, xOuter: side * 0.100, zOuter: 0.098 },
      { y: 1.240, xInner: side * 0.038, zInner: 0.104, xOuter: side * 0.096, zOuter: 0.102 },
      { y: 1.190, xInner: side * 0.028, zInner: 0.110, xOuter: side * 0.084, zOuter: 0.108 },
      { y: 1.145, xInner: side * 0.015, zInner: 0.116, xOuter: side * 0.064, zOuter: 0.114 },
      { y: 1.100, xInner: side * 0.003, zInner: 0.120, xOuter: side * 0.038, zOuter: 0.118 },
    ];

    for (let s = 0; s < lapelSlices.length; s++) {
      const sl = lapelSlices[s];
      lapelPts.push(sl.xInner, sl.y, sl.zInner + 0.005);
      lapelPts.push((sl.xInner + sl.xOuter) * 0.5, sl.y, (sl.zInner + sl.zOuter) * 0.5 + 0.008);
      lapelPts.push(sl.xOuter, sl.y, sl.zOuter + 0.005);
    }

    for (let s = 0; s < lapelSlices.length - 1; s++) {
      const b = s * 3;
      lapelIdx.push(b, b + 1, b + 3);
      lapelIdx.push(b + 1, b + 4, b + 3);
      lapelIdx.push(b + 1, b + 2, b + 4);
      lapelIdx.push(b + 2, b + 5, b + 4);
    }

    const lapelGeom = new THREE.BufferGeometry();
    lapelGeom.setAttribute('position', new THREE.Float32BufferAttribute(lapelPts, 3));
    lapelGeom.setIndex(lapelIdx);
    addMesh(lapelGeom, clothingGroup, `Blazer_Lapel_${side > 0 ? 'L' : 'R'}`);
  }

  // --- B. OPEN WHITE COLLARED SHIRT & PLACKET ---
  {
    for (const side of [-1, 1]) {
      const collarPtCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.035, 1.415, 0.054),
        new THREE.Vector3(side * 0.048, 1.375, 0.084),
        new THREE.Vector3(side * 0.040, 1.335, 0.094),
      ]);
      const collarPtGeom = new THREE.TubeGeometry(collarPtCurve, 10, 0.0045, 6, false);
      addMesh(collarPtGeom, clothingGroup, `Shirt_Collar_Leaf_${side > 0 ? 'L' : 'R'}`);
    }

    const placketGeom = new THREE.PlaneGeometry(0.026, 0.20, 2, 8);
    const pPos = placketGeom.attributes.position;
    for (let i = 0; i < pPos.count; i++) {
      const y = pPos.getY(i) + 1.23;
      pPos.setY(i, y);
      pPos.setZ(i, 0.098 + (1.23 - y) * 0.08);
    }
    addMesh(placketGeom, clothingGroup, 'Shirt_Placket');

    for (const by of [1.30, 1.24, 1.18]) {
      const bGeom = new THREE.CylinderGeometry(0.0035, 0.0035, 0.002, 10);
      bGeom.rotateX(Math.PI / 2);
      bGeom.translate(0, by, 0.104 + (1.23 - by) * 0.07);
      addMesh(bGeom, clothingGroup, `Shirt_Button_${by.toFixed(2)}`);
    }
  }

  // --- C. BLAZER FRONT CLOSURE & BUTTONS ---
  {
    const seamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.003, 1.100, 0.120),
      new THREE.Vector3(0.004, 1.010, 0.118),
      new THREE.Vector3(0.005, 0.940, 0.124),
      new THREE.Vector3(0.006, 0.865, 0.130),
    ]);
    const seamGeom = new THREE.TubeGeometry(seamCurve, 16, 0.0035, 6, false);
    addMesh(seamGeom, clothingGroup, 'Blazer_Front_Closure_Seam');

    const buttonYs = [1.100, 1.010];
    const buttonZs = [0.122, 0.120];
    buttonYs.forEach((by, idx) => {
      const bGeom = new THREE.CylinderGeometry(0.009, 0.009, 0.004, 16);
      bGeom.rotateX(Math.PI / 2);
      bGeom.translate(0.002, by, buttonZs[idx]);
      addMesh(bGeom, clothingGroup, `Blazer_Button_${idx + 1}`);

      const holeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.014, by, buttonZs[idx] - 0.001),
        new THREE.Vector3( 0.000, by, buttonZs[idx] - 0.001),
      ]);
      const holeGeom = new THREE.TubeGeometry(holeCurve, 6, 0.0012, 6, false);
      addMesh(holeGeom, clothingGroup, `Blazer_ButtonHole_${idx + 1}`);
    });
  }

  // --- D. POCKET FLAPS & BREAST WELT ---
  {
    const flapL = new THREE.BoxGeometry(0.082, 0.026, 0.008);
    flapL.rotateZ(-0.06);
    flapL.rotateY(-0.12);
    flapL.translate(0.170, 0.908, 0.128);
    addMesh(flapL, clothingGroup, 'Pocket_Flap_Left');

    const flapR = new THREE.BoxGeometry(0.082, 0.026, 0.008);
    flapR.rotateZ(0.06);
    flapR.rotateY(0.12);
    flapR.translate(-0.170, 0.908, 0.128);
    addMesh(flapR, clothingGroup, 'Pocket_Flap_Right');

    const weltGeom = new THREE.BoxGeometry(0.056, 0.014, 0.006);
    weltGeom.rotateZ(-0.08);
    weltGeom.translate(0.068, 1.245, 0.106);
    addMesh(weltGeom, clothingGroup, 'Breast_Pocket_Welt');
  }

  // --- E. JACKET HEM & REAR SEAM / VENT ---
  {
    const hemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3( 0.006, 0.865,  0.130),
      new THREE.Vector3( 0.122, 0.868,  0.126),
      new THREE.Vector3( 0.210, 0.865,  0.038),
      new THREE.Vector3( 0.152, 0.868, -0.096),
      new THREE.Vector3( 0.000, 0.865, -0.138),
      new THREE.Vector3(-0.152, 0.868, -0.096),
      new THREE.Vector3(-0.210, 0.865,  0.038),
      new THREE.Vector3(-0.122, 0.868,  0.126),
      new THREE.Vector3( 0.006, 0.865,  0.130),
    ]);
    const hemGeom = new THREE.TubeGeometry(hemCurve, 36, 0.0050, 8, false);
    addMesh(hemGeom, clothingGroup, 'Jacket_Hem_Border');

    const rearSeamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 1.360, -0.136),
      new THREE.Vector3(0.0, 1.200, -0.140),
      new THREE.Vector3(0.0, 1.050, -0.138),
      new THREE.Vector3(0.0, 0.965, -0.136),
    ]);
    const rearSeamGeom = new THREE.TubeGeometry(rearSeamCurve, 16, 0.0030, 6, false);
    addMesh(rearSeamGeom, clothingGroup, 'Jacket_Rear_Center_Seam');

    const ventFlapGeom = new THREE.PlaneGeometry(0.018, 0.105);
    ventFlapGeom.translate(0.009, 0.915, -0.137);
    addMesh(ventFlapGeom, clothingGroup, 'Jacket_Rear_Vent_Overlap');
  }

  // =========================================================================
  // 5. SHOES (Sneakers: cupsole, foxing stripe, toe cap, tongue, laces)
  // =========================================================================
  const shoesGroup = new THREE.Group();
  shoesGroup.name = 'Shoes_Identity_Structure';
  root.add(shoesGroup);

  for (const side of [-1, 1]) {
    const footGroup = new THREE.Group();
    footGroup.name = `Sneaker_${side > 0 ? 'Left' : 'Right'}`;

    const fx = side * 0.170;
    const fy = 0.010;
    const fz = 0.020;

    const solePts = [
      new THREE.Vector3( 0.000, 0,  0.124),
      new THREE.Vector3( 0.042, 0,  0.100),
      new THREE.Vector3( 0.050, 0,  0.035),
      new THREE.Vector3( 0.044, 0, -0.025),
      new THREE.Vector3( 0.042, 0, -0.075),
      new THREE.Vector3( 0.000, 0, -0.092),
      new THREE.Vector3(-0.040, 0, -0.075),
      new THREE.Vector3(-0.038, 0, -0.025),
      new THREE.Vector3(-0.048, 0,  0.035),
      new THREE.Vector3(-0.038, 0,  0.100),
    ];
    const soleSpline = new THREE.CatmullRomCurve3(solePts, true);

    const wallPts = [];
    const wallIdx = [];
    const SAMPLES = 32;
    const SOLE_H = 0.030;

    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const p = soleSpline.getPoint(t);
      const px = side > 0 ? p.x : -p.x;
      wallPts.push(px, 0.000, p.z);
      wallPts.push(px * 0.98, SOLE_H, p.z * 0.98);
    }

    for (let i = 0; i < SAMPLES; i++) {
      const b = i * 2;
      wallIdx.push(b, b + 1, b + 2);
      wallIdx.push(b + 1, b + 3, b + 2);
    }

    const soleGeom = new THREE.BufferGeometry();
    soleGeom.setAttribute('position', new THREE.Float32BufferAttribute(wallPts, 3));
    soleGeom.setIndex(wallIdx);
    addMesh(soleGeom, footGroup, 'Sneaker_Midsole_Cupsole');

    const beadCurve = new THREE.CatmullRomCurve3(solePts.map(pt => new THREE.Vector3(side > 0 ? pt.x : -pt.x, SOLE_H, pt.z)), true);
    const beadGeom = new THREE.TubeGeometry(beadCurve, 32, 0.0028, 6, true);
    addMesh(beadGeom, footGroup, 'Foxing_Stripe_Bead');

    const toeCapGeom = new THREE.SphereGeometry(0.046, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45);
    toeCapGeom.scale(0.95, 0.65, 1.25);
    toeCapGeom.translate(0.0, SOLE_H + 0.006, 0.068);
    addMesh(toeCapGeom, footGroup, 'Sneaker_Toe_Cap');

    const tongueGeom = new THREE.CylinderGeometry(0.025, 0.029, 0.078, 10, 1, true);
    tongueGeom.rotateX(0.45);
    tongueGeom.translate(0, SOLE_H + 0.044, 0.016);
    addMesh(tongueGeom, footGroup, 'Sneaker_Tongue');

    const laceYs = [0.038, 0.052, 0.066, 0.080];
    const laceZs = [0.062, 0.048, 0.034, 0.020];
    laceYs.forEach((ly, lIdx) => {
      const hw = 0.017 + lIdx * 0.002;
      const laceCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-hw, SOLE_H + ly, laceZs[lIdx]),
        new THREE.Vector3(0.0, SOLE_H + ly + 0.003, laceZs[lIdx] + 0.002),
        new THREE.Vector3( hw, SOLE_H + ly, laceZs[lIdx]),
      ]);
      const laceGeom = new THREE.TubeGeometry(laceCurve, 8, 0.0018, 6, false);
      addMesh(laceGeom, footGroup, `Sneaker_Lace_${lIdx + 1}`);
    });

    const collarCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.034, SOLE_H + 0.074,  0.005),
      new THREE.Vector3(-0.038, SOLE_H + 0.070, -0.045),
      new THREE.Vector3( 0.000, SOLE_H + 0.067, -0.078),
      new THREE.Vector3( 0.038, SOLE_H + 0.070, -0.045),
      new THREE.Vector3( 0.034, SOLE_H + 0.074,  0.005),
    ]);
    const ankleCollarGeom = new THREE.TubeGeometry(collarCurve, 16, 0.0055, 8, false);
    addMesh(ankleCollarGeom, footGroup, 'Sneaker_Ankle_Collar');

    footGroup.position.set(fx, fy, fz);
    shoesGroup.add(footGroup);
  }

  return root;
}
