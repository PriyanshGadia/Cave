// scripts/test-detail-build.cjs
const fs = require('fs');

// Let's test the face grid math in node with three
const THREE = require('three');

function createUnifiedFaceGeometry() {
  const rows = 48;
  const cols = 36;
  const pos = [];
  const idx = [];

  for (let r = 0; r <= rows; r++) {
    const v = r / rows; // 0 (chin/neck) to 1 (hairline)
    const y = 1.465 + v * 0.220; // 1.465 to 1.685

    // Width factor of face at height y
    const yNorm = (y - 1.580) / 0.125;
    const wMax = 0.065 * Math.sqrt(Math.max(0.05, 1.0 - yNorm * yNorm * 0.7));

    for (let c = 0; c <= cols; c++) {
      const uNorm = (c / cols) * 2.0 - 1.0; // -1 to +1
      const x = uNorm * wMax;

      // Base anatomical face depth
      const u2 = uNorm * uNorm;
      let z = 0.088 + 0.012 * (1.0 - u2 * 0.85);

      // --- FOREHEAD & BROW ---
      if (y >= 1.615 && y <= 1.685) {
        // Forehead gentle backward slope
        const fT = (y - 1.615) / 0.070;
        z -= fT * 0.005;

        // Brow ridge prominence
        const browY = 1.625 + 0.002 * Math.cos(uNorm * Math.PI * 2.0);
        const browDist = Math.abs(y - browY);
        if (browDist < 0.015 && Math.abs(uNorm) < 0.80) {
          const browF = Math.cos((browDist / 0.015) * Math.PI * 0.5);
          z += browF * 0.006 * (1.0 - u2 * 0.5);
        }
      }

      // --- ORBITAL SOCKETS (Eyes) ---
      if (y >= 1.590 && y <= 1.620) {
        for (const side of [-1, 1]) {
          const eyeX = side * 0.032;
          const eyeDist = Math.hypot(x - eyeX, y - 1.604);
          if (eyeDist < 0.016) {
            const eyeF = Math.cos((eyeDist / 0.016) * Math.PI * 0.5);
            z -= eyeF * 0.004; // slight orbital socket recession
          }
        }
      }

      // --- NOSE BRIDGE & TIP ---
      if (y >= 1.546 && y <= 1.622) {
        // Nose half-width along height
        let nHW = 0.0055;
        let nProj = 0.005;
        if (y < 1.575) {
          const tipT = (1.575 - y) / 0.025; // 0 to 1 down to tip
          nHW = 0.006 + tipT * 0.008; // widens to 14mm at nostrils
          nProj = 0.012 + (1.0 - Math.abs(y - 1.564) / 0.015) * 0.007; // peak 0.019m at tip
        } else {
          const bT = (y - 1.575) / 0.047; // bridge rising to nasion
          nHW = 0.006 - bT * 0.001;
          nProj = 0.012 - bT * 0.007;
        }

        const xNose = Math.abs(x);
        if (xNose < nHW) {
          const nCurve = Math.cos((xNose / nHW) * Math.PI * 0.5);
          z += nCurve * Math.max(0.0, nProj);
        }
      }

      // --- PHILTRUM ---
      if (y >= 1.534 && y <= 1.550 && Math.abs(x) < 0.012) {
        const pX = Math.abs(x);
        if (pX < 0.0035) {
          z -= 0.0012; // groove
        } else if (pX < 0.007) {
          z += 0.0010; // lateral ridges
        }
      }

      // --- LIPS & MOUTH ---
      if (y >= 1.505 && y <= 1.536 && Math.abs(x) < 0.026) {
        const lipU = Math.abs(x) / 0.026;
        const lipCurve = Math.cos(lipU * Math.PI * 0.5);

        // Upper lip
        if (y >= 1.522 && y <= 1.536) {
          const uDist = Math.abs(y - 1.529);
          if (uDist < 0.007) {
            const uF = Math.cos((uDist / 0.007) * Math.PI * 0.5);
            z += uF * lipCurve * 0.0055;
          }
        }
        // Mouth closure line
        if (Math.abs(y - 1.522) < 0.0025) {
          z -= lipCurve * 0.0020;
        }
        // Lower lip
        if (y >= 1.508 && y <= 1.522) {
          const lDist = Math.abs(y - 1.515);
          if (lDist < 0.007) {
            const lF = Math.cos((lDist / 0.007) * Math.PI * 0.5);
            z += lF * lipCurve * 0.0060;
          }
        }
      }

      // --- LABIOMENTAL GROOVE ---
      if (y >= 1.496 && y <= 1.508 && Math.abs(x) < 0.020) {
        const gF = Math.cos(((y - 1.502) / 0.006) * Math.PI * 0.5);
        z -= gF * 0.0025;
      }

      // --- CHIN ---
      if (y >= 1.468 && y <= 1.498 && Math.abs(x) < 0.024) {
        const cDist = Math.hypot(x * 1.1, y - 1.484);
        if (cDist < 0.016) {
          const cF = Math.cos((cDist / 0.016) * Math.PI * 0.5);
          z += cF * 0.0065;
        }
      }

      // --- MANDIBULAR JAWLINE CONTOUR ---
      if (y >= 1.470 && y <= 1.540) {
        const jawY = 1.480 + Math.abs(uNorm) * 0.050; // angles up toward ear
        const jawDist = Math.abs(y - jawY);
        if (jawDist < 0.012 && Math.abs(uNorm) > 0.45) {
          const jawF = Math.cos((jawDist / 0.012) * Math.PI * 0.5);
          z += jawF * 0.0035;
        }
      }

      pos.push(x, y, z);
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i0 = r * (cols + 1) + c;
      const i1 = i0 + 1;
      const i2 = (r + 1) * (cols + 1) + c;
      const i3 = i2 + 1;
      idx.push(i0, i2, i1);
      idx.push(i1, i2, i3);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geom.setIndex(idx);
  geom.computeVertexNormals();
  return geom;
}

const g = createUnifiedFaceGeometry();
console.log('Face geometry created:', {
  vertices: g.attributes.position.count,
  triangles: g.index.count / 3
});
