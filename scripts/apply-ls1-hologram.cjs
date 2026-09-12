const fs = require('fs');

let raw = fs.readFileSync('lab.js', 'utf8');
const isCRLF = raw.includes('\r\n');
let src = raw.replace(/\r\n/g, '\n');

// 1. Ensure import
if (!src.includes('ls1_holo_data.js')) {
  src = src.replace("import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';",
    "import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';\nimport { LS1_FRONT_DATA_URI, LS1_BACK_DATA_URI } from './ls1_holo_data.js';");
}

// 2. Find LS1 body code block
const holoStart = '    // ── 2. 2.5D HOLOGRAPHIC IDENTITY CORE (Photo-Derived Multilayer Reconstruction) ──';
const loftStart = '    // ── Helper: Parametric Loft Geometry Generator (Smooth Anatomical Body Lofts) ──';
const tagLS1 = "    tag(g, 'LS1');";

let startIdx = src.indexOf(holoStart);
if (startIdx === -1) startIdx = src.indexOf(loftStart);
const tagIdx = src.indexOf(tagLS1, startIdx);

if (startIdx === -1 || tagIdx === -1) {
  console.error('Could not find startIdx or tagIdx!', startIdx, tagIdx);
  process.exit(1);
}

const refinedHoloCode = `    // ── 2. 2.5D HOLOGRAPHIC IDENTITY CORE (Photo-Derived Multilayer Reconstruction) ──
    ls1FigureGroup = new THREE.Group();
    ls1FigureGroup.position.set(0, 0.08, 0); // Sits right on optical crystal lens
    g.add(ls1FigureGroup);

    // Canvas textures for Front and Back
    function makeHoloTexture(dataUri) {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 1024;
      const ctx = c.getContext('2d');
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      const img = new Image();
      const draw = () => {
        ctx.clearRect(0, 0, 512, 1024);
        ctx.drawImage(img, 0, 0, 512, 1024);
        t.needsUpdate = true;
      };
      img.onload = draw;
      img.src = dataUri;
      if (img.complete && img.naturalWidth > 0) draw();
      return t;
    }

    const frontTex = makeHoloTexture(LS1_FRONT_DATA_URI);
    const backTex = makeHoloTexture(LS1_BACK_DATA_URI);

    function getSmoothBodyThickness(v) {
      const pts = [
        [0.00, 0.12],
        [0.05, 0.12],
        [0.10, 0.09],
        [0.25, 0.08],
        [0.38, 0.10],
        [0.48, 0.14],
        [0.60, 0.19],
        [0.72, 0.18],
        [0.78, 0.16],
        [0.83, 0.09],
        [0.88, 0.13],
        [0.96, 0.13],
        [1.00, 0.07]
      ];
      if (v <= pts[0][0]) return pts[0][1];
      if (v >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
      for (let i = 0; i < pts.length - 1; i++) {
        if (v >= pts[i][0] && v <= pts[i + 1][0]) {
          const u = (v - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
          const smU = u * u * (3.0 - 2.0 * u);
          return pts[i][1] + smU * (pts[i + 1][1] - pts[i][1]);
        }
      }
      return 0.11;
    }

    const FIG_W = 0.84, FIG_H = 1.68;
    function createCurvedHoloPlane(W, H, segX, segY, zMult) {
      const geo = new THREE.PlaneGeometry(W, H, segX, segY);
      geo.translate(0, H / 2, 0);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const v = Math.max(0.0, Math.min(1.0, y / H));
        const thick = getSmoothBodyThickness(v);
        const xNorm = Math.abs(x) / (W * 0.44);
        const curve = Math.sqrt(Math.max(0.0, 1.0 - Math.min(1.0, xNorm * xNorm)));
        pos.setZ(i, zMult * thick * 0.5 * curve);
      }
      geo.computeVertexNormals();
      return geo;
    }

    const holoVertShader = \`
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec3 vViewDir;
      uniform float uTime;
      uniform float uGlitch;

      void main() {
        vUv = uv;
        vec3 pos = position;
        float glitchLine = sin(pos.y * 45.0 + uTime * 18.0);
        if (glitchLine > 0.994) {
          pos.x += sin(uTime * 45.0) * 0.002 * uGlitch;
        }
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPos.xyz;
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    \`;

    const holoFragShader = \`
      uniform sampler2D tHolo;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uIsFront;
      uniform vec3 uHoloColor;
      uniform vec3 uRimColor;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec3 vViewDir;

      void main() {
        vec2 uv = vUv;
        float ca = 0.0012 * sin(uv.y * 90.0 + uTime * 2.5);
        vec4 texR = texture2D(tHolo, vec2(uv.x + ca, uv.y));
        vec4 texG = texture2D(tHolo, uv);
        vec4 texB = texture2D(tHolo, vec2(uv.x - ca, uv.y));

        float alpha = texG.a;
        if (alpha < 0.05) discard;

        // Controlled photographic RGB — clean natural fidelity with identity preservation
        vec3 rgb = vec3(texR.r, texG.g, texB.b);

        // Subtle fine scanlines
        float scanline = 0.93 + 0.07 * sin(uv.y * 380.0 - uTime * 5.0);

        // Soft upward data beam sweep
        float beam = smoothstep(0.05, 0.0, abs(fract(uv.y * 0.35 - uTime * 0.20) - 0.5)) * 0.18;

        // Fresnel cyber edge glow
        float NdotV = max(0.0, dot(normalize(vNormal), normalize(vViewDir)));
        float fresnel = pow(1.0 - NdotV, 2.8);

        // Infuse subtle cyan glow and rim without overwhelming photo colors
        vec3 holoGlow = uHoloColor * (0.25 + 0.75 * scanline);
        vec3 finalRgb = mix(rgb * 0.90, holoGlow, 0.10) + uRimColor * (fresnel * 0.38 + beam * 0.18);

        float pulse = 0.97 + 0.03 * sin(uTime * 2.2);
        float finalAlpha = alpha * uOpacity * pulse * (0.92 + 0.08 * scanline);

        gl_FragColor = vec4(finalRgb, finalAlpha);
      }
    \`;

    function createHoloMat(tex, isFront, opacity) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: holoVertShader,
        fragmentShader: holoFragShader,
        uniforms: {
          tHolo: { value: tex },
          uTime: { value: 0.0 },
          uGlitch: { value: 1.0 },
          uOpacity: { value: opacity },
          uIsFront: { value: isFront ? 1.0 : 0.0 },
          uHoloColor: { value: new THREE.Color(0x00f0ff) },
          uRimColor: { value: new THREE.Color(0x80f0ff) }
        },
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide // Critical: Culls backfaces so front and back do not show through each other
      });
      ls1HoloMats.push(mat);
      return mat;
    }

    function makeHoloMesh(geo, tex, isFront, opacity, isPrimary) {
      const shaderMat = createHoloMat(tex, isFront, opacity);
      const mesh = new THREE.Mesh(geo, shaderMat);
      mesh.userData.isHoloPlane = true;
      mesh.userData.isPrimary = isPrimary;
      mesh.userData.tex = tex;
      let curMat = shaderMat;
      Object.defineProperty(mesh, 'material', {
        get() { return curMat; },
        set(newMat) {
          curMat = newMat;
          if (newMat && newMat.isMeshBasicMaterial) {
            if (isPrimary) {
              newMat.map = tex;
              newMat.transparent = true;
              newMat.alphaTest = 0.45;
              newMat.side = THREE.DoubleSide;
              newMat.needsUpdate = true;
            } else {
              // Hide secondary slices during silhouette capture to ensure razor-clean outline
              newMat.visible = false;
            }
          }
        }
      });
      return mesh;
    }

    // 1. Front Primary Shell (Faces +Z forward)
    const frontMesh = makeHoloMesh(createCurvedHoloPlane(FIG_W, FIG_H, 24, 64, 1.0), frontTex, true, 0.95, true);
    ls1FigureGroup.add(frontMesh);

    // 2. Back Primary Shell (Facing backward: rotated PI on Y, so FrontSide faces -Z)
    const backGeo = createCurvedHoloPlane(FIG_W, FIG_H, 24, 64, 1.0);
    backGeo.rotateY(Math.PI);
    const backMesh = makeHoloMesh(backGeo, backTex, false, 0.95, false);
    ls1FigureGroup.add(backMesh);

    // 3. Volumetric Depth Slices (Intermediate depth planes)
    // Slices with zMult > 0 face forward (+Z); slices with zMult < 0 face backward (-Z)
    const sliceConfigs = [
      { zMult: -0.5, isFront: false },
      { zMult: -0.25, isFront: false },
      { zMult: 0.25, isFront: true },
      { zMult: 0.5, isFront: true }
    ];
    for (let i = 0; i < sliceConfigs.length; i++) {
      const cfg = sliceConfigs[i];
      const t = cfg.isFront ? frontTex : backTex;
      const sGeo = createCurvedHoloPlane(FIG_W, FIG_H, 16, 48, Math.abs(cfg.zMult));
      if (!cfg.isFront) sGeo.rotateY(Math.PI);
      const sMesh = makeHoloMesh(sGeo, t, cfg.isFront, 0.18, false);
      ls1FigureGroup.add(sMesh);
    }

    // ── Layer 3: Silhouette Glow Aura (Additive Fresnel Shell) ──
    const glowGeo = createCurvedHoloPlane(FIG_W * 1.015, FIG_H * 1.010, 16, 40, 1.02);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: \`
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      \`,
      fragmentShader: \`
        uniform sampler2D tHolo;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 tex = texture2D(tHolo, vUv);
          if (tex.a < 0.05) discard;
          float fresnel = pow(1.0 - max(0.0, dot(normalize(vNormal), normalize(vViewDir))), 2.5);
          gl_FragColor = vec4(uColor * (fresnel * 0.40), fresnel * 0.30);
        }
      \`,
      uniforms: {
        tHolo: { value: frontTex },
        uColor: { value: new THREE.Color(0x00f0ff) }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    let curGlowMat = glowMat;
    Object.defineProperty(glowMesh, 'material', {
      get() { return curGlowMat; },
      set(newMat) {
        curGlowMat = newMat;
        if (newMat && newMat.isMeshBasicMaterial) newMat.visible = false;
      }
    });
    ls1FigureGroup.add(glowMesh);

    // ── Layer 4: Holographic Particle Fragments (Quantum Sparkles) ──
    const NUM_PTS = 120;
    const ptPos = new Float32Array(NUM_PTS * 3);
    ls1PointData = [];
    for (let i = 0; i < NUM_PTS; i++) {
      const u = i / NUM_PTS;
      const y = 0.05 + Math.random() * 1.62;
      const thick = getSmoothBodyThickness(y / FIG_H);
      const rad = (thick * 0.75 + 0.03) * Math.sqrt(Math.random());
      const ang = Math.random() * TAU;
      const px = Math.cos(ang) * (rad * 1.4);
      const pz = Math.sin(ang) * (rad * 0.65);
      ptPos[i * 3] = px;
      ptPos[i * 3 + 1] = y;
      ptPos[i * 3 + 2] = pz;
      ls1PointData.push({
        baseX: px,
        baseZ: pz,
        y: y,
        speed: 0.12 + Math.random() * 0.20,
        wobble: Math.random() * TAU,
        rad: rad
      });
    }
    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3));
    const ptMat = new THREE.PointsMaterial({
      color: 0x60f5ff,
      size: 0.022,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: softDisc(32)
    });
    ls1PointsMesh = new THREE.Points(ptGeo, ptMat);
    ls1FigureGroup.add(ls1PointsMesh);

    // ── Layer 5: Scanning Laser Disc ──
    const scanGeo = new THREE.RingGeometry(0.04, 0.42, 48).rotateX(-Math.PI / 2);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    ls1ScanRing = new THREE.Mesh(scanGeo, scanMat);
    ls1ScanRing.position.set(0, 0.8, 0);
    let curScanMat = scanMat;
    Object.defineProperty(ls1ScanRing, 'material', {
      get() { return curScanMat; },
      set(newMat) {
        curScanMat = newMat;
        if (newMat && newMat.isMeshBasicMaterial) newMat.visible = false;
      }
    });
    ls1FigureGroup.add(ls1ScanRing);

    // ── Layer 6: Helical Energy Filaments ──
    for (let f = 0; f < 3; f++) {
      const strandPts = [];
      const baseAng = (f / 3) * TAU;
      const count = 36;
      for (let j = 0; j < count; j++) {
        const u = j / (count - 1);
        const y = 0.05 + u * 1.62;
        const rad = 0.36 + 0.06 * Math.sin(u * Math.PI * 2.0);
        const ang = baseAng + u * 4.2;
        strandPts.push(new THREE.Vector3(Math.cos(ang) * rad, y, Math.sin(ang) * rad * 0.65));
      }
      const strandGeo = new THREE.BufferGeometry().setFromPoints(strandPts);
      const strandMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.40,
        blending: THREE.AdditiveBlending
      });
      const strandLine = new THREE.Line(strandGeo, strandMat);
      strandLine.userData.baseAng = baseAng;
      ls1FilamentLines.push(strandLine);
      ls1FigureGroup.add(strandLine);
    }

`;

src = src.substring(0, startIdx) + refinedHoloCode + src.substring(tagIdx);
console.log('Applied frontside culling refined 2.5D hologram core');

if (isCRLF) {
  src = src.replace(/\n/g, '\r\n');
}

fs.writeFileSync('lab.js', src, 'utf8');
console.log('Successfully wrote refined lab.js!');
