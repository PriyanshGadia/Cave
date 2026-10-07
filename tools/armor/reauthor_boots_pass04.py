import bpy
import bmesh
import math
import sys
import os
from mathutils import Vector

print("Checkpoint: Start Pass 04 Recovery v2", flush=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

original_glb = os.path.join("public", "assets", "armor", "vault-mk1", "work", "boots", "pass_02", "original_working_copy.glb")
bpy.ops.import_scene.gltf(filepath=original_glb)

meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not meshes:
    print("Warning: No mesh data to join")
    sys.exit(1)

bpy.ops.object.select_all(action='DESELECT')
for m in meshes:
    m.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
donor_combined = bpy.context.active_object
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# -------------------------------------------------------------
# Material System (Gunmetal, Graphite, Blood Red, Amber)
# -------------------------------------------------------------
def create_material(name, base_color, metallic, roughness):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = base_color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
    return mat

mat_gunmetal = create_material("Vault_Gunmetal", (0.05, 0.05, 0.055, 1.0), 0.9, 0.4)
mat_graphite = create_material("Vault_Graphite", (0.02, 0.02, 0.02, 1.0), 0.8, 0.6)
mat_bloodred = create_material("Vault_BloodRed", (0.35, 0.01, 0.01, 1.0), 0.7, 0.3)
mat_amber = create_material("Vault_Amber", (1.0, 0.4, 0.0, 1.0), 0.5, 0.5)

# Split boots
donor_L = donor_combined
donor_R = donor_combined.copy()
donor_R.data = donor_combined.data.copy()
bpy.context.scene.collection.objects.link(donor_R)
donor_L.name = "Boot_L"
donor_R.name = "Boot_R"

def split_boot(obj, keep_x_positive):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bm = bmesh.from_edit_mesh(obj.data)
    for v in bm.verts:
        if (v.co.x < 0) if keep_x_positive else (v.co.x > 0):
            v.select = True
    bmesh.update_edit_mesh(obj.data)
    bpy.ops.mesh.delete(type='VERT')
    bpy.ops.object.mode_set(mode='OBJECT')

split_boot(donor_L, keep_x_positive=True)
split_boot(donor_R, keep_x_positive=False)

boot_objects = [donor_L, donor_R]

for obj in boot_objects:
    obj.data.materials.clear()
    obj.data.materials.append(mat_gunmetal)

boot_root = bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
boot_root = bpy.context.active_object
boot_root.name = "BOOT_ROOT"

def get_bounds(obj):
    verts = [obj.matrix_world @ v.co for v in obj.data.vertices]
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

def apply_boolean(target, cutter, operation):
    mod = target.modifiers.new(name="Bool", type='BOOLEAN')
    mod.operation = operation
    mod.object = cutter
    mod.solver = 'EXACT'
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)

generated_parts = []
locators = []

for boot_obj in boot_objects:
    bounds = get_bounds(boot_obj)
    b_w = bounds["width"]
    b_h = bounds["height"]
    b_d = bounds["depth"]
    
    name_prefix = "L" if bounds["center_x"] > 0 else "R"
    boot_obj.parent = boot_root
    
    # 1. Ankle Clean Cut
    cut_z = bounds["max_z"] - (b_h * 0.05)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(bounds["center_x"], bounds["center_y"], cut_z + 0.5))
    top_cutter = bpy.context.active_object
    apply_boolean(boot_obj, top_cutter, 'DIFFERENCE')
    bpy.data.objects.remove(top_cutter, do_unlink=True)
    
    bounds = get_bounds(boot_obj)
    
    # 2. Ankle (Compact, 3-layer)
    ankle_radius = b_w * 0.35
    ankle_z = bounds["max_z"]
    
    # Collar
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=ankle_radius, depth=b_h * 0.04, location=(bounds["center_x"], bounds["center_y"] - b_d * 0.05, ankle_z - b_h * 0.02))
    collar = bpy.context.active_object
    collar.data.materials.append(mat_graphite)
    collar.parent = boot_root
    generated_parts.append(collar)
    
    # Inner Race
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=ankle_radius * 0.8, depth=b_h * 0.05, location=(bounds["center_x"], bounds["center_y"] - b_d * 0.05, ankle_z + b_h * 0.01))
    race = bpy.context.active_object
    race.data.materials.append(mat_gunmetal)
    race.parent = boot_root
    generated_parts.append(race)
    
    # Shaft
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=ankle_radius * 0.4, depth=b_h * 0.08, location=(bounds["center_x"], bounds["center_y"] - b_d * 0.05, ankle_z + b_h * 0.02))
    shaft = bpy.context.active_object
    shaft.data.materials.append(mat_graphite)
    shaft.parent = boot_root
    generated_parts.append(shaft)

    # 3. Thruster Recess
    thruster_radius = b_w * 0.30  # Smaller, more realistic
    thruster_y = bounds["center_y"] - b_d * 0.15
    thruster_z = bounds["min_z"]
    
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=thruster_radius, depth=b_h * 0.15, location=(bounds["center_x"], thruster_y, thruster_z + b_h * 0.05))
    t_cutter = bpy.context.active_object
    apply_boolean(boot_obj, t_cutter, 'DIFFERENCE')
    bpy.data.objects.remove(t_cutter, do_unlink=True)
    
    # 4. Physical Thruster Internals
    # Housing
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=thruster_radius * 0.95, depth=b_h * 0.08, location=(bounds["center_x"], thruster_y, thruster_z + b_h * 0.04))
    t_housing = bpy.context.active_object
    t_housing.data.materials.append(mat_graphite)
    t_housing.parent = boot_root
    t_housing.name = f"Thruster_Housing_{name_prefix}"
    generated_parts.append(t_housing)
    
    # Nozzle (Amber thermal hardware, NOT emissive)
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=thruster_radius * 0.7, radius2=thruster_radius * 0.3, depth=b_h * 0.04, location=(bounds["center_x"], thruster_y, thruster_z + b_h * 0.02))
    t_nozzle = bpy.context.active_object
    t_nozzle.data.materials.append(mat_amber)
    t_nozzle.parent = boot_root
    t_nozzle.rotation_euler[0] = math.pi
    t_nozzle.name = f"Thruster_Nozzle_{name_prefix}"
    generated_parts.append(t_nozzle)

    # NO EFFECT GEOMETRY IN GLB!
    
    # 5. THRUSTER LOCATOR
    bpy.ops.object.empty_add(type='SINGLE_ARROW', radius=b_w * 0.5, location=(bounds["center_x"], thruster_y, thruster_z))
    locator = bpy.context.active_object
    locator.name = f"THRUSTER_{name_prefix}"
    # Orient arrow pointing down (-Z)
    locator.rotation_euler = (math.pi, 0, 0)
    locator.parent = boot_root
    locators.append(locator)
    
    # 6. Side Armor Plate (Blood Red Accent)
    bpy.context.view_layer.objects.active = boot_obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    
    bm = bmesh.from_edit_mesh(boot_obj.data)
    bm.faces.ensure_lookup_table()
    
    sign = 1 if name_prefix == "L" else -1
    for f in bm.faces:
        if f.normal.x * sign > 0.5 and f.calc_center_median().z > bounds["min_z"] + b_h*0.2:
            f.select = True
            
    bpy.ops.mesh.duplicate()
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    
    new_objs = [o for o in bpy.context.selected_objects if o != boot_obj and o.type == 'MESH']
    if new_objs:
        armor_plate = new_objs[0]
        mod = armor_plate.modifiers.new(name="Solidify", type='SOLIDIFY')
        mod.thickness = b_w * 0.04
        mod.offset = 1.0
        bpy.context.view_layer.objects.active = armor_plate
        bpy.ops.object.modifier_apply(modifier=mod.name)
        
        mod_bev = armor_plate.modifiers.new(name="Bevel", type='BEVEL')
        mod_bev.width = b_w * 0.01
        mod_bev.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod_bev.name)
        
        armor_plate.data.materials.clear()
        armor_plate.data.materials.append(mat_bloodred)
        armor_plate.parent = boot_root
        generated_parts.append(armor_plate)

out_path = os.path.join("public", "assets", "armor", "vault-mk1", "work", "boots", "pass_04", "boots_mk1_pass04.glb")
all_objs = [boot_root] + boot_objects + generated_parts + locators

bpy.ops.object.select_all(action='DESELECT')
for o in all_objs:
    o.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=True,
    export_materials='EXPORT',
    export_yup=True
)

print(f"Successfully reauthored boots to {out_path}", flush=True)
