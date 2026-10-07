import { NodeIO } from '@gltf-transform/core';
import { bounds } from '@gltf-transform/functions';
import fs from 'fs';

const io = new NodeIO();

const paths = [
  '../public/assets/armor/vault-mk1/final/boots.glb',
  '../public/assets/armor/vault-mk1/final/legs.glb',
  '../public/assets/armor/vault-mk1/final/torso.glb',
  '../public/assets/armor/vault-mk1/final/arms.glb',
  '../public/assets/armor/vault-mk1/final/gauntlets.glb',
  '../public/assets/armor/vault-mk1/final/helmet.glb'
];

async function run() {
  let globalMin = [Infinity, Infinity, Infinity];
  let globalMax = [-Infinity, -Infinity, -Infinity];

  for (const p of paths) {
    const doc = await io.read(p);
    const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
    const b = bounds(scene);
    console.log(`\n${p}`);
    console.log(`Min: [${b.min[0].toFixed(3)}, ${b.min[1].toFixed(3)}, ${b.min[2].toFixed(3)}]`);
    console.log(`Max: [${b.max[0].toFixed(3)}, ${b.max[1].toFixed(3)}, ${b.max[2].toFixed(3)}]`);
    
    globalMin = [
      Math.min(globalMin[0], b.min[0]),
      Math.min(globalMin[1], b.min[1]),
      Math.min(globalMin[2], b.min[2])
    ];
    globalMax = [
      Math.max(globalMax[0], b.max[0]),
      Math.max(globalMax[1], b.max[1]),
      Math.max(globalMax[2], b.max[2])
    ];
  }
  
  console.log(`\n--- UNION BOX3 ---`);
  console.log(`Min: [${globalMin[0].toFixed(3)}, ${globalMin[1].toFixed(3)}, ${globalMin[2].toFixed(3)}]`);
  console.log(`Max: [${globalMax[0].toFixed(3)}, ${globalMax[1].toFixed(3)}, ${globalMax[2].toFixed(3)}]`);
  console.log(`Size: [${(globalMax[0] - globalMin[0]).toFixed(3)}, ${(globalMax[1] - globalMin[1]).toFixed(3)}, ${(globalMax[2] - globalMin[2]).toFixed(3)}]`);
}

run();
