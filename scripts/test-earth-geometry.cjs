const THREE = require('three');

const CONTINENTS = {
  northAmerica: [
    [71, -156], [70, -135], [69, -115], [60, -90], [55, -80], [51, -56], [47, -53], [44, -64],
    [41, -71], [35, -75], [30, -81], [25, -80], [28, -97], [22, -97], [16, -92], [9, -79],
    [8, -82], [14, -92], [19, -104], [23, -110], [32, -117], [37, -122], [47, -124], [54, -130],
    [59, -140], [60, -150], [55, -163], [65, -168], [71, -156]
  ],
  southAmerica: [
    [12, -72], [10, -62], [5, -52], [-2, -44], [-8, -35], [-18, -38], [-23, -43], [-32, -52],
    [-38, -57], [-52, -68], [-55, -67], [-52, -75], [-42, -74], [-33, -72], [-18, -71], [-5, -80],
    [2, -78], [8, -77], [12, -72]
  ],
  europe: [
    [36, -6], [43, -9], [48, -5], [51, 1], [54, 8], [58, 5], [62, 5], [71, 26], [68, 44],
    [60, 50], [55, 38], [45, 35], [44, 28], [40, 23], [37, 15], [36, 5], [36, -6]
  ],
  africa: [
    [36, -6], [32, 24], [31, 32], [28, 34], [12, 44], [12, 51], [-5, 40], [-15, 40],
    [-26, 33], [-34, 18], [-34, 26], [-23, 14], [-12, 13], [5, 2], [4, 9], [6, 1],
    [4, -7], [14, -17], [21, -17], [32, -9], [36, -6]
  ],
  asia: [
    [40, 26], [41, 41], [30, 48], [24, 57], [22, 69], [8, 77], [16, 82], [22, 89],
    [10, 99], [1, 104], [22, 108], [30, 122], [39, 128], [43, 132], [53, 142], [60, 162],
    [66, 170], [70, 180], [73, 140], [73, 110], [73, 80], [68, 44]
  ],
  australia: [
    [-11, 142], [-15, 145], [-24, 153], [-34, 151], [-38, 147], [-38, 140], [-35, 136],
    [-32, 132], [-35, 118], [-32, 115], [-22, 114], [-17, 123], [-14, 126], [-12, 132],
    [-12, 136], [-11, 142]
  ],
  uk: [
    [50, -5], [51, 1], [55, -1], [58, -3], [58, -5], [55, -5], [51, -4], [50, -5]
  ],
  japan: [
    [31, 131], [35, 136], [41, 141], [45, 142], [43, 145], [38, 141], [34, 135], [31, 131]
  ],
  greenland: [
    [60, -44], [65, -37], [70, -22], [76, -19], [83, -30], [82, -50], [76, -68], [68, -53],
    [60, -44]
  ],
  antarctica: [
    [-64, -64], [-68, -40], [-72, 0], [-70, 40], [-68, 80], [-66, 110], [-66, 140],
    [-71, 170], [-78, 180], [-75, -140], [-72, -100], [-64, -64]
  ]
};

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

function isLand(lat, lon) {
  for (const key in CONTINENTS) {
    if (pointInPoly(lat, lon, CONTINENTS[key])) return true;
  }
  return false;
}

console.log('Testing points:');
console.log('San Francisco (37.77, -122.42): isLand =', isLand(37.77, -122.42));
console.log('London (51.5, -0.1): isLand =', isLand(51.5, -0.1));
console.log('Tokyo (35.7, 139.7): isLand =', isLand(35.7, 139.7));
console.log('Sydney (-33.9, 151.2): isLand =', isLand(-33.9, 151.2));
console.log('Pacific Ocean (0, -140): isLand =', isLand(0, -140));
console.log('Atlantic Ocean (25, -40): isLand =', isLand(25, -40));

// Benchmark 2000 Fibonacci points
const t0 = performance.now();
const N = 2000;
const phi = Math.PI * (Math.sqrt(5) - 1);
let landCount = 0;
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = phi * i;
  const x = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;
  const lat = Math.asin(y) * 180 / Math.PI;
  const lon = Math.atan2(z, x) * 180 / Math.PI;
  if (isLand(lat, lon)) landCount++;
}
const elapsed = (performance.now() - t0).toFixed(2);
console.log(`Generated ${N} Fibonacci points in ${elapsed}ms: ${landCount} land points (${(landCount/N*100).toFixed(1)}%)`);
