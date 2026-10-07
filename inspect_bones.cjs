const fs = require('fs');

function printBones(filepath) {
    const buffer = fs.readFileSync(filepath);
    const jsonChunkLength = buffer.readUInt32LE(12);
    const jsonBuffer = buffer.slice(20, 20 + jsonChunkLength);
    const gltf = JSON.parse(jsonBuffer.toString('utf8'));
    
    console.log(`\n--- Inspecting Bones in ${filepath} ---`);
    if (gltf.nodes) {
        gltf.nodes.forEach((node, idx) => {
            if (node.name) { // could be a bone
                console.log(`Node ${idx}: ${node.name}`);
            }
        });
    }
}

const dir = 'g:/Programming/Cave/cad/';
printBones(dir + 'iron_man_rig.glb');
