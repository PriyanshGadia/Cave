import bpy
import bmesh
import math
import mathutils
import sys
import os

# Ensure clean scene
bpy.ops.wm.read_factory_settings(use_empty=True)

work_dir = "public/assets/armor/vault-mk1/work/boots"
in_path = os.path.join(work_dir, "original_working_copy.glb")
out_path = os.path.join(work_dir, "boots_mk1.glb")

# 1. Import donor
bpy.ops.import_scene.gltf(filepath=in_path)

# Find all meshes, join them
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not meshes:
    print("No meshes found in boots donor.")
    sys.exit(1)

bpy.ops.object.select_all(action='DESELECT')
for m in meshes:
    m.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
donor = bpy.context.active_object
donor.name = "VAULT_BOOT_DONOR"

# Clear existing materials
donor.data.materials.clear()

# 2. Create Vault Materials
def make_mat(name, color, metallic, roughness, emission=None, emission_strength=0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission:
            bsdf.inputs["Emission Color"].default_value = emission
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat

mat_gunmetal = make_mat("Gunmetal", (0.05, 0.05, 0.05, 1), 0.9, 0.4)
mat_graphite = make_mat("Graphite", (0.015, 0.015, 0.015, 1), 0.8, 0.7)
mat_bloodred = make_mat("BloodRed", (0.35, 0.01, 0.01, 1), 0.7, 0.3)
mat_cyan = make_mat("CyanEnergy", (0, 0, 0, 1), 0, 1, (0, 0.8, 1.0, 1), 5.0)

donor.data.materials.append(mat_gunmetal) # 0
donor.data.materials.append(mat_graphite) # 1
donor.data.materials.append(mat_bloodred) # 2
donor.data.materials.append(mat_cyan)     # 3

# Apply transforms to get accurate bounds
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Find bounds
bbox = [donor.matrix_world @ mathutils.Vector(corner) for corner in donor.bound_box]
min_z = min([v.z for v in bbox])
max_z = max([v.z for v in bbox])
height = max_z - min_z

# 3. Clean up ragged top (slice off top 5%)
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(donor.data)
bmesh.ops.bisect_plane(
    bm, 
    geom=bm.faces[:] + bm.edges[:] + bm.verts[:],
    dist=0.0001,
    plane_co=(0, 0, max_z - height * 0.08),
    plane_no=(0, 0, 1),
    clear_outer=True,
    clear_inner=False
)
bmesh.update_edit_mesh(donor.data)
bpy.ops.object.mode_set(mode='OBJECT')

# Re-evaluate bounds after cut
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bbox = [donor.matrix_world @ mathutils.Vector(corner) for corner in donor.bound_box]
min_x = min([v.x for v in bbox])
max_x = max([v.x for v in bbox])
min_y = min([v.y for v in bbox])
max_y = max([v.y for v in bbox])
min_z = min([v.z for v in bbox])
max_z = max([v.z for v in bbox])
center_y = (min_y + max_y) / 2

# We have two boots. Right boot is X < 0, Left boot is X > 0.
# Let's find centers of each
right_boot_center = (min_x / 2, center_y, min_z)
left_boot_center = (max_x / 2, center_y, min_z)

# Function to add geometry and join
def add_part(primitive_op, location, scale, material_idx, **kwargs):
    bpy.ops.object.select_all(action='DESELECT')
    primitive_op(location=location, **kwargs)
    obj = bpy.context.active_object
    obj.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    
    # assign material
    if not obj.data.materials:
        obj.data.materials.append(donor.data.materials[material_idx])
    else:
        obj.data.materials[0] = donor.data.materials[material_idx]
        
    return obj

mechanics = []

# Generate Thrusters & Ankle Bearings for each boot
for cx in [min_x/2.2, max_x/2.2]:
    # 1. Ankle bearing (articulated mechanical collar) at the cut top
    collar = add_part(bpy.ops.mesh.primitive_torus_add, 
                      location=(cx, center_y - (max_y-min_y)*0.1, max_z), 
                      scale=(0.0012, 0.0012, 0.0012), 
                      material_idx=1, # Graphite
                      major_radius=1.5, minor_radius=0.5)
    mechanics.append(collar)
    
    collar_armor = add_part(bpy.ops.mesh.primitive_cylinder_add,
                            location=(cx, center_y - (max_y-min_y)*0.1, max_z + 0.0002),
                            scale=(0.002, 0.002, 0.0005),
                            material_idx=0, # Gunmetal
                            radius=1.0)
    mechanics.append(collar_armor)
    
    # 2. Heel Housing (layered armor plates)
    heel = add_part(bpy.ops.mesh.primitive_cube_add,
                    location=(cx, min_y + (max_y-min_y)*0.1, min_z + height*0.4),
                    scale=(0.0015, 0.0015, 0.002),
                    material_idx=2) # Blood Red structural accent
    mechanics.append(heel)
    
    # 3. Toe Armor (layered plates)
    toe = add_part(bpy.ops.mesh.primitive_cube_add,
                   location=(cx, max_y - (max_y-min_y)*0.15, min_z + height*0.2),
                   scale=(0.0018, 0.0025, 0.001),
                   material_idx=0) # Gunmetal
    # Angle the toe
    toe.rotation_euler = (0.2, 0, 0)
    mechanics.append(toe)
    
    # 4. Side armor modules
    side_l = add_part(bpy.ops.mesh.primitive_cube_add,
                      location=(cx + 0.0015, center_y, min_z + height*0.3),
                      scale=(0.0005, 0.002, 0.001),
                      material_idx=0)
    mechanics.append(side_l)
    side_r = add_part(bpy.ops.mesh.primitive_cube_add,
                      location=(cx - 0.0015, center_y, min_z + height*0.3),
                      scale=(0.0005, 0.002, 0.001),
                      material_idx=0)
    mechanics.append(side_r)
    
    # 5. Propulsion System (Bottom Thrusters)
    # Heat sink/Nozzle Housing
    nozzle = add_part(bpy.ops.mesh.primitive_cylinder_add,
                      location=(cx, center_y - (max_y-min_y)*0.1, min_z - 0.0005),
                      scale=(0.001, 0.001, 0.001),
                      material_idx=1,
                      radius=1.0)
    mechanics.append(nozzle)
    
    # Cyan core
    core = add_part(bpy.ops.mesh.primitive_cylinder_add,
                    location=(cx, center_y - (max_y-min_y)*0.1, min_z - 0.0007),
                    scale=(0.0007, 0.0007, 0.0007),
                    material_idx=3, # Cyan Energy
                    radius=1.0)
    mechanics.append(core)
    
    # Secondary thrust (Toe)
    sec_nozzle = add_part(bpy.ops.mesh.primitive_cylinder_add,
                      location=(cx, max_y - (max_y-min_y)*0.2, min_z),
                      scale=(0.0005, 0.0005, 0.0005),
                      material_idx=1)
    mechanics.append(sec_nozzle)
    sec_core = add_part(bpy.ops.mesh.primitive_cylinder_add,
                    location=(cx, max_y - (max_y-min_y)*0.2, min_z - 0.0002),
                    scale=(0.0003, 0.0003, 0.0003),
                    material_idx=3)
    mechanics.append(sec_core)
    
    # 6. Sole Structure & Fasteners
    # Replace generic bottom surfaces by cutting a channel
    sole_channel = add_part(bpy.ops.mesh.primitive_cube_add,
                            location=(cx, center_y, min_z),
                            scale=(0.0008, 0.005, 0.0005),
                            material_idx=1)
    # We will use boolean difference on the donor, but joining is simpler and less prone to breaking geometry.
    # Instead, we just embed the channel as a Graphite block that overrides the sole visually.
    mechanics.append(sole_channel)
    
    # Fasteners (Pins on the ankle)
    pin1 = add_part(bpy.ops.mesh.primitive_cylinder_add,
                    location=(cx + 0.002, center_y - (max_y-min_y)*0.1, max_z),
                    scale=(0.0003, 0.0003, 0.0003),
                    material_idx=0)
    pin1.rotation_euler = (0, 1.57, 0)
    mechanics.append(pin1)
    pin2 = add_part(bpy.ops.mesh.primitive_cylinder_add,
                    location=(cx - 0.002, center_y - (max_y-min_y)*0.1, max_z),
                    scale=(0.0003, 0.0003, 0.0003),
                    material_idx=0)
    pin2.rotation_euler = (0, 1.57, 0)
    mechanics.append(pin2)

# Join all new mechanical components into donor
bpy.ops.object.select_all(action='DESELECT')
donor.select_set(True)
for m in mechanics:
    m.select_set(True)
bpy.context.view_layer.objects.active = donor
bpy.ops.object.join()

# Surface treatment on donor: Red panels
# Let's select some faces to assign to Blood Red or Graphite
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(donor.data)

# Re-assign faces based on height/position for visual segmentation
for f in bm.faces:
    center = f.calc_center_median()
    # If face is very low (sole), graphite
    if center.z < min_z + height * 0.1:
        f.material_index = 1
    # Some specific mid panels red
    elif center.z > min_z + height * 0.5 and center.z < min_z + height * 0.7:
        if center.y < center_y: # rear
            f.material_index = 2

bmesh.update_edit_mesh(donor.data)
bpy.ops.object.mode_set(mode='OBJECT')

# Validate export
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    export_materials='EXPORT',
    use_selection=True,
    export_apply=True
)
print(f"Successfully reauthored boots to {out_path}")
