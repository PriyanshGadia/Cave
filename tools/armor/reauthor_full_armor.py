import bpy
import bmesh
import math
import sys
import os
from mathutils import Vector

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_materials():
    mats = {}
    mats['gunmetal'] = create_material("Vault_Gunmetal", (0.05, 0.05, 0.055, 1.0), 0.9, 0.4)
    mats['graphite'] = create_material("Vault_Graphite", (0.02, 0.02, 0.02, 1.0), 0.8, 0.6)
    mats['bloodred'] = create_material("Vault_BloodRed", (0.35, 0.01, 0.01, 1.0), 0.7, 0.3)
    mats['amber']    = create_material("Vault_Amber", (1.0, 0.4, 0.0, 1.0), 0.5, 0.5)
    mats['blue']     = create_emissive("Vault_BlueEnergy", (0.0, 0.3, 1.0, 1.0), 2.0)
    mats['white']    = create_emissive("Vault_HotCore", (0.9, 0.95, 1.0, 1.0), 5.0)
    return mats

def create_material(name, base_color, metallic, roughness):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = base_color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
    return mat

def create_emissive(name, color, strength):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Emission Color"].default_value = color
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat

def get_bounds(obj):
    verts = [obj.matrix_world @ v.co for v in obj.data.vertices]
    if not verts:
        return None
    min_x = min([v.x for v in verts])
    max_x = max([v.x for v in verts])
    min_y = min([v.y for v in verts])
    max_y = max([v.y for v in verts])
    min_z = min([v.z for v in verts])
    max_z = max([v.z for v in verts])
    return {
        "min_x": min_x, "max_x": max_x,
        "min_y": min_y, "max_y": max_y,
        "min_z": min_z, "max_z": max_z,
        "center_x": (min_x + max_x) / 2,
        "center_y": (min_y + max_y) / 2,
        "center_z": (min_z + max_z) / 2,
        "width": max_x - min_x,
        "depth": max_y - min_y,
        "height": max_z - min_z
    }

def create_locator(name, parent, loc, rot):
    bpy.ops.object.empty_add(type='SINGLE_ARROW', radius=0.2, location=loc)
    locator = bpy.context.active_object
    locator.name = name
    locator.rotation_euler = rot
    locator.parent = parent
    return locator

def add_plate(obj, mats, z_threshold, x_sign):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    
    bm = bmesh.from_edit_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    
    for f in bm.faces:
        if f.normal.x * x_sign > 0.6 and f.calc_center_median().z > z_threshold:
            f.select = True
            
    bpy.ops.mesh.duplicate()
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    
    new_objs = [o for o in bpy.context.selected_objects if o != obj and o.type == 'MESH']
    if new_objs:
        armor_plate = new_objs[0]
        mod = armor_plate.modifiers.new(name="Solidify", type='SOLIDIFY')
        mod.thickness = 0.03
        mod.offset = 1.0
        bpy.context.view_layer.objects.active = armor_plate
        bpy.ops.object.modifier_apply(modifier=mod.name)
        
        armor_plate.data.materials.clear()
        armor_plate.data.materials.append(mats['bloodred'])
        armor_plate.parent = obj.parent
        return armor_plate
    return None

def process_legs(mats):
    clear_scene()
    bpy.ops.import_scene.gltf(filepath="public/assets/armor/vault-mk1/source/legs.glb")
    obj = bpy.context.active_object
    if not obj or obj.type != 'MESH':
        obj = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
    
    # Material
    obj.data.materials.clear()
    obj.data.materials.append(mats['gunmetal'])
    
    root = bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
    root = bpy.context.active_object
    root.name = "LEGS_ROOT"
    obj.parent = root
    obj.name = "Legs_Mesh"
    
    bounds = get_bounds(obj)
    
    # Blood Red plates
    parts = []
    p1 = add_plate(obj, mats, bounds['min_z'] + bounds['height']*0.6, 1)
    p2 = add_plate(obj, mats, bounds['min_z'] + bounds['height']*0.6, -1)
    if p1: parts.append(p1)
    if p2: parts.append(p2)
    
    # Locators (calves)
    create_locator("THRUSTER_L", root, (bounds['center_x'] + bounds['width']*0.25, bounds['max_y'] - bounds['depth']*0.2, bounds['min_z'] + bounds['height']*0.2), (math.pi, 0, 0))
    create_locator("THRUSTER_R", root, (bounds['center_x'] - bounds['width']*0.25, bounds['max_y'] - bounds['depth']*0.2, bounds['min_z'] + bounds['height']*0.2), (math.pi, 0, 0))
    
    export_path = "public/assets/armor/vault-mk1/final/legs.glb"
    export_component([root, obj] + parts + [o for o in root.children if o.type == 'EMPTY'], export_path)

def process_torso(mats):
    clear_scene()
    bpy.ops.import_scene.gltf(filepath="public/assets/armor/vault-mk1/source/torso.glb")
    obj = bpy.context.active_object
    if not obj or obj.type != 'MESH':
        obj = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
    
    # Material
    obj.data.materials.clear()
    obj.data.materials.append(mats['gunmetal'])
    
    root = bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
    root = bpy.context.active_object
    root.name = "TORSO_ROOT"
    obj.parent = root
    obj.name = "Torso_Mesh"
    
    bounds = get_bounds(obj)
    
    parts = []
    
    # Angular chest aperture (just add an angular graphite piece over the center)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bounds['center_x'], bounds['min_y'] - 0.05, bounds['center_z'] + bounds['height']*0.2))
    chest_ap = bpy.context.active_object
    chest_ap.scale = (0.2, 0.05, 0.15)
    chest_ap.rotation_euler = (0.2, 0, 0)
    chest_ap.data.materials.append(mats['graphite'])
    chest_ap.parent = root
    parts.append(chest_ap)
    
    # Locators (stabilization thrusts rear waist)
    create_locator("THRUSTER_STAB_L", root, (bounds['center_x'] + bounds['width']*0.3, bounds['max_y'], bounds['min_z'] + bounds['height']*0.1), (math.pi*0.8, 0, -0.2))
    create_locator("THRUSTER_STAB_R", root, (bounds['center_x'] - bounds['width']*0.3, bounds['max_y'], bounds['min_z'] + bounds['height']*0.1), (math.pi*0.8, 0, 0.2))
    
    export_path = "public/assets/armor/vault-mk1/final/torso.glb"
    export_component([root, obj] + parts + [o for o in root.children if o.type == 'EMPTY'], export_path)

def process_arms(mats):
    clear_scene()
    bpy.ops.import_scene.gltf(filepath="public/assets/armor/vault-mk1/source/arms.glb")
    obj = bpy.context.active_object
    if not obj or obj.type != 'MESH':
        obj = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
    
    # Material
    obj.data.materials.clear()
    obj.data.materials.append(mats['gunmetal'])
    
    root = bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
    root = bpy.context.active_object
    root.name = "ARMS_ROOT"
    obj.parent = root
    obj.name = "Arms_Mesh"
    
    bounds = get_bounds(obj)
    
    parts = []
    p1 = add_plate(obj, mats, bounds['center_z'], 1)
    p2 = add_plate(obj, mats, bounds['center_z'], -1)
    if p1: parts.append(p1)
    if p2: parts.append(p2)
    
    # Locators (triceps / elbows)
    create_locator("ARM_THRUSTER_L", root, (bounds['max_x'] - bounds['width']*0.1, bounds['center_y'], bounds['center_z']), (math.pi, 0, 0))
    create_locator("ARM_THRUSTER_R", root, (bounds['min_x'] + bounds['width']*0.1, bounds['center_y'], bounds['center_z']), (math.pi, 0, 0))
    
    export_path = "public/assets/armor/vault-mk1/final/arms.glb"
    export_component([root, obj] + parts + [o for o in root.children if o.type == 'EMPTY'], export_path)

def process_gauntlets(mats):
    clear_scene()
    bpy.ops.import_scene.gltf(filepath="public/assets/armor/vault-mk1/source/gauntlets.glb")
    obj = bpy.context.active_object
    if not obj or obj.type != 'MESH':
        obj = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
    
    # Material
    obj.data.materials.clear()
    obj.data.materials.append(mats['gunmetal'])
    
    root = bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
    root = bpy.context.active_object
    root.name = "GAUNTLETS_ROOT"
    obj.parent = root
    obj.name = "Gauntlets_Mesh"
    
    bounds = get_bounds(obj)
    
    parts = []
    # Segmented palm emitters
    for sign, prefix in [(1, 'L'), (-1, 'R')]:
        x_pos = bounds['center_x'] + sign * (bounds['width']*0.3)
        bpy.ops.mesh.primitive_cube_add(size=0.1, location=(x_pos, bounds['min_y'] + bounds['depth']*0.4, bounds['min_z'] + 0.05))
        palm = bpy.context.active_object
        palm.scale = (1.0, 1.0, 0.2)
        palm.data.materials.append(mats['graphite'])
        palm.parent = root
        parts.append(palm)
        
        # Locators
        create_locator(f"PALM_CORE_{prefix}", root, (x_pos, bounds['min_y'] + bounds['depth']*0.4, bounds['min_z'] + 0.04), (0, 0, 0))
        
    export_path = "public/assets/armor/vault-mk1/final/gauntlets.glb"
    export_component([root, obj] + parts + [o for o in root.children if o.type == 'EMPTY'], export_path)

def process_helmet(mats):
    clear_scene()
    bpy.ops.import_scene.gltf(filepath="public/assets/armor/vault-mk1/source/helmet.glb")
    obj = bpy.context.active_object
    if not obj or obj.type != 'MESH':
        obj = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
    
    # Material
    obj.data.materials.clear()
    obj.data.materials.append(mats['gunmetal'])
    
    root = bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
    root = bpy.context.active_object
    root.name = "HELMET_ROOT"
    obj.parent = root
    obj.name = "Helmet_Mesh"
    
    bounds = get_bounds(obj)
    
    parts = []
    
    # Faceplate / Optics
    for sign, prefix in [(1, 'L'), (-1, 'R')]:
        x_pos = bounds['center_x'] + sign * 0.1
        y_pos = bounds['min_y'] + 0.02
        z_pos = bounds['center_z'] + 0.05
        
        # Optics locators
        create_locator(f"OPTIC_{prefix}", root, (x_pos, y_pos, z_pos), (math.pi/2, 0, 0))
        
        # Neck thrusters
        create_locator(f"NECK_THRUST_{prefix}", root, (x_pos * 1.5, bounds['max_y'] - 0.1, bounds['min_z']), (math.pi, 0, 0))
        
    export_path = "public/assets/armor/vault-mk1/final/helmet.glb"
    export_component([root, obj] + parts + [o for o in root.children if o.type == 'EMPTY'], export_path)

def export_component(objs, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=True,
        export_materials='EXPORT',
        export_yup=True
    )
    print(f"Exported {out_path}")

if __name__ == "__main__":
    print("Starting full armor reauthoring...")
    mats = create_materials()
    process_legs(mats)
    process_torso(mats)
    process_arms(mats)
    process_gauntlets(mats)
    process_helmet(mats)
    print("DONE ALL COMPONENTS.")
