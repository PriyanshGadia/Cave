const fs = require('fs');
const path = require('path');
const { NodeIO } = require('@gltf-transform/core');
const { KHRONOS_EXTENSIONS } = require('@gltf-transform/extensions');

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);

const BASE_DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'armor', 'vault-mk1');
const IN_DIR = path.join(BASE_DIR, 'source');
const OUT_DIR = path.join(BASE_DIR, 'final');

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

function createMaterial(doc, name, baseColor, metallic, roughness, emissiveFactor = [0,0,0]) {
    return doc.createMaterial(name)
        .setBaseColorFactor(baseColor)
        .setMetallicFactor(metallic)
        .setRoughnessFactor(roughness)
        .setEmissiveFactor(emissiveFactor);
}

function addLocator(doc, parent, name, translation, rotation = [0,0,0,1]) {
    const locator = doc.createNode(name)
        .setTranslation(translation)
        .setRotation(rotation);
    parent.addChild(locator);
    return locator;
}

async function processComponent(name, callback) {
    console.log(`Processing ${name}...`);
    const doc = await io.read(path.join(IN_DIR, `${name}.glb`));
    
    // Create materials for this document
    const mats = {
        gunmetal: createMaterial(doc, "Vault_Gunmetal", [0.05, 0.05, 0.055, 1.0], 0.9, 0.4),
        graphite: createMaterial(doc, "Vault_Graphite", [0.02, 0.02, 0.02, 1.0], 0.8, 0.6),
        bloodred: createMaterial(doc, "Vault_BloodRed", [0.35, 0.01, 0.01, 1.0], 0.7, 0.3)
    };
    
    const root = doc.getRoot();
    for (const mesh of root.listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
            prim.setMaterial(mats.gunmetal);
        }
    }
    
    const scene = root.listScenes()[0];
    let topNode = scene.listChildren()[0];
    if (!topNode) {
        topNode = doc.createNode(`${name.toUpperCase()}_ROOT`);
        scene.addChild(topNode);
    }
    
    callback(doc, topNode, mats);
    
    await io.write(path.join(OUT_DIR, `${name}.glb`), doc);
}

async function main() {
    await processComponent('legs', (doc, topNode) => {
        addLocator(doc, topNode, "THRUSTER_L", [0.2, 0.5, -0.2]);
        addLocator(doc, topNode, "THRUSTER_R", [-0.2, 0.5, -0.2]);
    });
    
    await processComponent('torso', (doc, topNode) => {
        addLocator(doc, topNode, "THRUSTER_STAB_L", [0.3, 0.8, -0.2]);
        addLocator(doc, topNode, "THRUSTER_STAB_R", [-0.3, 0.8, -0.2]);
    });
    
    await processComponent('arms', (doc, topNode) => {
        addLocator(doc, topNode, "ARM_THRUSTER_L", [0.5, 0, 0]);
        addLocator(doc, topNode, "ARM_THRUSTER_R", [-0.5, 0, 0]);
    });
    
    await processComponent('gauntlets', (doc, topNode) => {
        addLocator(doc, topNode, "PALM_CORE_L", [0.6, 0.2, 0.1]);
        addLocator(doc, topNode, "PALM_CORE_R", [-0.6, 0.2, 0.1]);
    });
    
    await processComponent('helmet', (doc, topNode) => {
        addLocator(doc, topNode, "OPTIC_L", [0.1, 1.7, 0.2]);
        addLocator(doc, topNode, "OPTIC_R", [-0.1, 1.7, 0.2]);
        addLocator(doc, topNode, "NECK_THRUST_L", [0.2, 1.6, -0.2]);
        addLocator(doc, topNode, "NECK_THRUST_R", [-0.2, 1.6, -0.2]);
    });
    
    const bootPass04 = path.join(BASE_DIR, 'work', 'boots', 'pass_04', 'boots_mk1_pass04.glb');
    if (fs.existsSync(bootPass04)) {
        fs.copyFileSync(bootPass04, path.join(OUT_DIR, 'boots.glb'));
        console.log("Copied boots.");
    } else {
        console.log("Boots not found at " + bootPass04);
    }
    
    console.log("DONE");
}

main().catch(console.error);
