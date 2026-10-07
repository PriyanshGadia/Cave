const fs = require('fs');

function inspectGlb(filepath) {
    const buffer = fs.readFileSync(filepath);
    const magic = buffer.readUInt32LE(0);
    if (magic !== 0x46546C67) {
        console.log(filepath, 'Not a GLB file');
        return;
    }
    const jsonChunkLength = buffer.readUInt32LE(12);
    const jsonChunkType = buffer.readUInt32LE(16);
    if (jsonChunkType !== 0x4E4F534A) {
        console.log(filepath, 'First chunk is not JSON');
        return;
    }
    const jsonBuffer = buffer.slice(20, 20 + jsonChunkLength);
    const jsonStr = jsonBuffer.toString('utf8');
    const gltf = JSON.parse(jsonStr);
    
    console.log(`\n--- Inspecting ${filepath} ---`);
    console.log(`Nodes: ${gltf.nodes ? gltf.nodes.length : 0}`);
    console.log(`Meshes: ${gltf.meshes ? gltf.meshes.length : 0}`);
    console.log(`Materials: ${gltf.materials ? gltf.materials.length : 0}`);
    console.log(`Skins (Rigged): ${gltf.skins ? gltf.skins.length : 0}`);
    console.log(`Animations: ${gltf.animations ? gltf.animations.length : 0}`);
    
    if (gltf.meshes) {
        // print mesh names
        const names = gltf.meshes.map(m => m.name || 'unnamed').join(', ');
        console.log('Mesh names:', names.substring(0, 100) + (names.length > 100 ? '...' : ''));
    }
    if (gltf.materials) {
        const matNames = gltf.materials.map(m => m.name || 'unnamed').join(', ');
        console.log('Materials:', matNames.substring(0, 100) + (matNames.length > 100 ? '...' : ''));
    }
}

const dir = 'g:/Programming/Cave/cad/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.glb'));
for (const f of files) {
    try {
        inspectGlb(dir + f);
    } catch(e) {
        console.error('Error on', f, e.message);
    }
}
