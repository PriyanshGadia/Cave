import bpy
import bmesh
import math
import sys
import os

print("Checkpoint: Start Pass 03", flush=True)

# Clean up initial scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Load donor
original_glb = os.path.join("public", "assets", "armor", "vault-mk1", "work", "boots", "pass_02", "original_working_copy.glb")
bpy.ops.import_scene.gltf(filepath=original_glb)

# Find donor mesh
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not meshes:
    print("Warning: No mesh data to join")
    sys.exit(1)

# Join all into one, just in case
bpy.ops.object.select_all(action='DESELECT')
for m in meshes:
    m.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
donor_combined = bpy.context.active_object

# Apply all transforms to donor
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Create Clay Material
clay_mat = bpy.data.materials.new(name="Clay_Neutral")
clay_mat.use_nodes = True
nodes = clay_mat.node_tree.nodes
bsdf = nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs["Base Color"].default_value = (0.5, 0.5, 0.5, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.6
    bsdf.inputs["Metallic"].default_value = 0.0

# Clear donor materials and assign clay
donor_combined.data.materials.clear()
donor_combined.data.materials.append(clay_mat)

# Split into Left and Right boots by X coordinate
donor_L = donor_combined
donor_R = donor_combined.copy()
donor_R.data = donor_combined.data.copy()
bpy.context.scene.collection.objects.link(donor_R)
donor_L.name = "Boot_L"
donor_R.name = "Boot_R"

# Delete right side from Left boot
bpy.context.view_layer.objects.active = donor_L
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bm = bmesh.from_edit_mesh(donor_L.data)
for v in bm.verts:
    if v.co.x < 0:
        v.select = True
bmesh.update_edit_mesh(donor_L.data)
bpy.ops.mesh.delete(type='VERT')
bpy.ops.object.mode_set(mode='OBJECT')

# Delete left side from Right boot
bpy.context.view_layer.objects.active = donor_R
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bm = bmesh.from_edit_mesh(donor_R.data)
for v in bm.verts:
    if v.co.x > 0:
        v.select = True
bmesh.update_edit_mesh(donor_R.data)
bpy.ops.mesh.delete(type='VERT')
bpy.ops.object.mode_set(mode='OBJECT')

boot_objects = [donor_L, donor_R]
print(f"Separated into L and R boots.", flush=True)

# Create BOOT_ROOT
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
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

generated_parts = []

def apply_boolean(target, cutter, operation):
    mod = target.modifiers.new(name="Bool", type='BOOLEAN')
    mod.operation = operation
    mod.object = cutter
    mod.solver = 'EXACT'
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)

# Process each boot
for idx, boot_obj in enumerate(boot_objects):
    name_prefix = "L" if boot_obj.location.x > 0 or get_bounds(boot_obj)["center_x"] > 0 else "R"
    print(f"\n--- Processing {name_prefix} Boot ---", flush=True)
    
    boot_obj.parent = boot_root
    
    # Calculate initial donor bounds
    bounds = get_bounds(boot_obj)
    b_w = bounds["width"]
    b_h = bounds["height"]
    b_d = bounds["depth"]
    
    print(f"DONOR BOUNDS [{name_prefix}]: W={b_w:.4f}, H={b_h:.4f}, D={b_d:.4f}", flush=True)
    
    # --- 1. Flatten top edge for ankle ---
    cut_z = bounds["max_z"] - (b_h * 0.05) # Cut off top 5%
    bpy.ops.mesh.primitive_cube_add(size=1, location=(bounds["center_x"], bounds["center_y"], cut_z + 0.5))
    top_cutter = bpy.context.active_object
    apply_boolean(boot_obj, top_cutter, 'DIFFERENCE')
    bpy.data.objects.remove(top_cutter, do_unlink=True)
    
    # Update bounds after cut
    bounds = get_bounds(boot_obj)
    
    # --- 2. Ankle Interface ---
    # Flange, bearing housing, ring, shaft
    ankle_radius = b_w * 0.38
    ankle_z = bounds["max_z"]
    
    # Flange (outermost overlapping boot)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=ankle_radius * 1.05, depth=b_h * 0.05, location=(bounds["center_x"], bounds["center_y"] - b_d * 0.05, ankle_z - b_h * 0.025))
    flange = bpy.context.active_object
    flange.data.materials.append(clay_mat)
    flange.parent = boot_root
    generated_parts.append(flange)
    
    # Bearing Housing
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=ankle_radius, depth=b_h * 0.08, location=(bounds["center_x"], bounds["center_y"] - b_d * 0.05, ankle_z + b_h * 0.04))
    bearing = bpy.context.active_object
    bearing.data.materials.append(clay_mat)
    bearing.parent = boot_root
    generated_parts.append(bearing)
    
    # Central Shaft
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=ankle_radius * 0.6, depth=b_h * 0.15, location=(bounds["center_x"], bounds["center_y"] - b_d * 0.05, ankle_z + b_h * 0.075))
    shaft = bpy.context.active_object
    shaft.data.materials.append(clay_mat)
    shaft.parent = boot_root
    generated_parts.append(shaft)
    
    # --- 3. Thruster ---
    # Carve recess
    thruster_radius = b_w * 0.35
    thruster_y = bounds["center_y"] - b_d * 0.15
    thruster_z = bounds["min_z"]
    
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=thruster_radius, depth=b_h * 0.2, location=(bounds["center_x"], thruster_y, thruster_z + b_h * 0.05))
    t_cutter = bpy.context.active_object
    apply_boolean(boot_obj, t_cutter, 'DIFFERENCE')
    bpy.data.objects.remove(t_cutter, do_unlink=True)
    
    # Thruster Outer Housing (inside the recess)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=thruster_radius * 0.95, depth=b_h * 0.08, location=(bounds["center_x"], thruster_y, thruster_z + b_h * 0.04))
    t_housing = bpy.context.active_object
    t_housing.data.materials.append(clay_mat)
    t_housing.parent = boot_root
    generated_parts.append(t_housing)
    
    # Thruster Nozzle
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=thruster_radius * 0.7, radius2=thruster_radius * 0.4, depth=b_h * 0.06, location=(bounds["center_x"], thruster_y, thruster_z + b_h * 0.03))
    t_nozzle = bpy.context.active_object
    t_nozzle.data.materials.append(clay_mat)
    t_nozzle.parent = boot_root
    # invert cone
    t_nozzle.rotation_euler[0] = math.pi
    generated_parts.append(t_nozzle)
    
    # --- 4. Sole carrier ---
    # Instead of flat plate, we duplicate the bottom faces and extrude them
    # For now, a fitted bevel cube that strictly matches the sole footprint
    sole_w = b_w * 0.95
    sole_d = b_d * 0.95
    sole_h = b_h * 0.05
    bpy.ops.mesh.primitive_cube_add(size=1, location=(bounds["center_x"], bounds["center_y"], bounds["min_z"] - sole_h/2))
    sole = bpy.context.active_object
    sole.scale = (sole_w, sole_d, sole_h)
    
    # Make it follow foot curvature by boolean intersecting with a scaled up boot
    # To keep it simple and clean, just bevel the cube so it's rounded
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.bevel(offset=sole_w * 0.1, segments=3)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    sole.data.materials.append(clay_mat)
    sole.parent = boot_root
    generated_parts.append(sole)
    
    # --- 5. Side Armor Plates via Extrusion/Solidify ---
    print(f"Generating Armor Plates...", flush=True)
    # We duplicate the outer faces (e.g. normals pointing sideways)
    bpy.context.view_layer.objects.active = boot_obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    
    bm = bmesh.from_edit_mesh(boot_obj.data)
    bm.faces.ensure_lookup_table()
    
    # Select faces on the outer side (x > 0 for L boot, x < 0 for R boot)
    sign = 1 if name_prefix == "L" else -1
    for f in bm.faces:
        if f.normal.x * sign > 0.5 and f.calc_center_median().z > bounds["min_z"] + b_h*0.2:
            f.select = True
            
    # Duplicate and separate
    bpy.ops.mesh.duplicate()
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # The new object is the last selected/active? Actually separate creates a new object
    # Let's find it.
    new_objs = [o for o in bpy.context.selected_objects if o != boot_obj]
    if new_objs:
        armor_plate = new_objs[0]
        # Add solidify modifier
        mod = armor_plate.modifiers.new(name="Solidify", type='SOLIDIFY')
        mod.thickness = b_w * 0.04  # 4% of width
        mod.offset = 1.0 # outward
        bpy.context.view_layer.objects.active = armor_plate
        bpy.ops.object.modifier_apply(modifier=mod.name)
        
        # Add bevel
        mod_bev = armor_plate.modifiers.new(name="Bevel", type='BEVEL')
        mod_bev.width = b_w * 0.01
        mod_bev.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod_bev.name)
        
        armor_plate.data.materials.append(clay_mat)
        armor_plate.parent = boot_root
        generated_parts.append(armor_plate)
        print(f"Generated: Armor Plate, bounds: {get_bounds(armor_plate)['width']:.4f} width")
    else:
        print("Warning: No faces selected for armor plate.")
    
    # Report generated objects
    for p in [flange, bearing, shaft, t_housing, t_nozzle, sole]:
        pb = get_bounds(p)
        print(f"Generated: {p.name}")
        print(f"  Dimensions: {pb['width']:.4f} x {pb['depth']:.4f} x {pb['height']:.4f}")
        print(f"  Local Pos: {p.location.x:.4f}, {p.location.y:.4f}, {p.location.z:.4f}")
        print(f"  Parent: BOOT_ROOT")

# Join all into final structure (optional, but requested to have final bounds)
print("\n--- FINAL BOUNDS ---", flush=True)
all_objs = [boot_root] + boot_objects + generated_parts
min_x = min([get_bounds(o)["min_x"] for o in boot_objects + generated_parts])
max_x = max([get_bounds(o)["max_x"] for o in boot_objects + generated_parts])
min_y = min([get_bounds(o)["min_y"] for o in boot_objects + generated_parts])
max_y = max([get_bounds(o)["max_y"] for o in boot_objects + generated_parts])
min_z = min([get_bounds(o)["min_z"] for o in boot_objects + generated_parts])
max_z = max([get_bounds(o)["max_z"] for o in boot_objects + generated_parts])

print(f"FINAL BOOT BOUNDS: W={max_x - min_x:.4f}, H={max_z - min_z:.4f}, D={max_y - min_y:.4f}")

# Export
out_path = os.path.join("public", "assets", "armor", "vault-mk1", "work", "boots", "pass_03", "boots_mk1_pass03.glb")
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

print(f"\nSuccessfully reauthored boots to {out_path}", flush=True)
