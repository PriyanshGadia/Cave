const fs = require('fs');

const content = fs.readFileSync('ls1_identity_mesh.js', 'utf8');
const posMatch = content.match(/export const LS1_POSITIONS = new Float32Array\(\[([\s\S]*?)\]\);/);
const nums = posMatch[1].split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));

let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;

for (let i = 0; i < nums.length; i += 3) {
  const x = nums[i], y = nums[i+1], z = nums[i+2];
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (y < minY) minY = y; if (y > maxY) maxY = y;
  if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
}

console.log('Overall bounds:');
console.log({ minX, maxX, width: maxX-minX, minY, maxY, height: maxY-minY, minZ, maxZ, depth: maxZ-minZ });

for (let y = 0.0; y <= maxY + 0.05; y += 0.05) {
  let yMinZ = Infinity, yMaxZ = -Infinity, yMinX = Infinity, yMaxX = -Infinity, count = 0;
  for (let i = 0; i < nums.length; i += 3) {
    if (Math.abs(nums[i+1] - y) < 0.025) {
      count++;
      yMinZ = Math.min(yMinZ, nums[i+2]);
      yMaxZ = Math.max(yMaxZ, nums[i+2]);
      yMinX = Math.min(yMinX, nums[i]);
      yMaxX = Math.max(yMaxX, nums[i]);
    }
  }
  if (count > 0) {
    console.log(`Y=${y.toFixed(2)}: count=${count}, X=[${yMinX.toFixed(3)}, ${yMaxX.toFixed(3)}] (w=${(yMaxX-yMinX).toFixed(3)}), Z=[${yMinZ.toFixed(3)}, ${yMaxZ.toFixed(3)}] (d=${(yMaxZ-yMinZ).toFixed(3)}), Z_mid=${((yMinZ+yMaxZ)*0.5).toFixed(3)}`);
  }
}
