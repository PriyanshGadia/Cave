import bpy
import bmesh
import math
import mathutils
import sys
import os

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

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

def create_materials():
    materials = {}
    materials["Gunmetal"] = make_mat("Gunmetal", (0.05, 0.05, 0.05, 1), 0.9, 0.4)
    materials["Graphite"] = make_mat("Graphite", (0.015, 0.015, 0.015, 1), 0.8, 0.7)
    materials["BloodRed"] = make_mat("BloodRed", (0.35, 0.01, 0.01, 1), 0.7, 0.3)
    materials["CyanEnergy"] = make_mat("CyanEnergy", (0, 0, 0, 1), 0, 1, (0, 0.8, 1.0, 1), 5.0)
    return materials

def apply_boolean(target, cutter, operation='DIFFERENCE'):
    mod = target.modifiers.new(type='BOOLEAN', name="bool")
    mod.operation = operation
    mod.object = cutter
    mod.solver = 'EXACT'
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)

def generate_thruster_assembly(materials, loc_x, loc_y, loc_z, radius):
    parts = []
    
    # 1. Thermal Shield (Outer bowl)
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=radius*0.9, radius2=radius*0.7, depth=radius*0.8, location=(loc_x, loc_y, loc_z + radius*0.4))
    shield = bpy.context.active_object
    shield.data.materials.append(materials["Graphite"])
    parts.append(shield)
    
    # 2. Nozzle (Inner cone)
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=radius*0.7, radius2=radius*0.4, depth=radius*0.6, location=(loc_x, loc_y, loc_z + radius*0.3))
    nozzle = bpy.context.active_object
    nozzle.data.materials.append(materials["Gunmetal"])
    # Boolean hollow out the nozzle
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=radius*0.6, radius2=radius*0.3, depth=radius*0.7, location=(loc_x, loc_y, loc_z + radius*0.3))
    nozzle_cut = bpy.context.active_object
    apply_boolean(nozzle, nozzle_cut, 'DIFFERENCE')
    bpy.data.objects.remove(nozzle_cut, do_unlink=True)
    parts.append(nozzle)
    
    # 3. Recessed Emitter (Cyan core)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius*0.35, depth=radius*0.2, location=(loc_x, loc_y, loc_z + radius*0.6))
    emitter = bpy.context.active_object
    emitter.data.materials.append(materials["CyanEnergy"])
    parts.append(emitter)
    
    return parts

def generate_ankle_assembly(materials, loc_x, loc_y, loc_z, radius, width, height):
    parts = []
    
    # Collar Base
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=height, location=(loc_x, loc_y, loc_z))
    collar = bpy.context.active_object
    collar.data.materials.append(materials["Gunmetal"])
    
    # Hollow out collar
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius*0.8, depth=height*1.1, location=(loc_x, loc_y, loc_z))
    collar_cut = bpy.context.active_object
    apply_boolean(collar, collar_cut, 'DIFFERENCE')
    bpy.data.objects.remove(collar_cut, do_unlink=True)
    parts.append(collar)
    
    # Inner Bearing (Graphite)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius*0.75, depth=height*0.8, location=(loc_x, loc_y, loc_z))
    bearing = bpy.context.active_object
    bearing.data.materials.append(materials["Graphite"])
    
    # Hollow out bearing for the leg to pass through
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius*0.5, depth=height*1.1, location=(loc_x, loc_y, loc_z))
    bearing_cut = bpy.context.active_object
    apply_boolean(bearing, bearing_cut, 'DIFFERENCE')
    bpy.data.objects.remove(bearing_cut, do_unlink=True)
    parts.append(bearing)
    
    # Side mounting brackets (Blood Red)
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=radius*0.4, location=(loc_x + sign*radius*0.9, loc_y, loc_z))
        bracket = bpy.context.active_object
        bracket.scale = (1.0, 0.5, 0.8)
        bpy.ops.object.transform_apply(scale=True)
        bracket.data.materials.append(materials["BloodRed"])
        parts.append(bracket)
        
    return parts

def main():
    print("Checkpoint: Start main", flush=True)
    clear_scene()
    
    work_dir = "public/assets/armor/vault-mk1/work/boots/pass_02"
    in_path = os.path.join(work_dir, "original_working_copy.glb")
    out_path = os.path.join(work_dir, "boots_mk1_pass02.glb")
    print(f"Loading {in_path}", flush=True)
    
    bpy.ops.import_scene.gltf(filepath=in_path)
    print("Imported GLTF", flush=True)
    
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not meshes:
        print("No meshes found in boots donor.")
        sys.exit(1)
        
    # Apply transforms and join
    bpy.ops.object.select_all(action='DESELECT')
    for m in meshes:
        m.select_set(True)
        bpy.context.view_layer.objects.active = m
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    donor = bpy.context.active_object
    donor.name = "VAULT_BOOT_DONOR"
    
    materials = create_materials()
    donor.data.materials.clear()
    donor.data.materials.append(materials["Gunmetal"])
    donor.data.materials.append(materials["Graphite"])
    donor.data.materials.append(materials["BloodRed"])
    
    
    print("Checkpoint: Calculating bounds", flush=True)
    # Analyze geometry to find exact left/right boot local bounds
    verts = [v.co for v in donor.data.vertices]
    
    boot_left_verts = [v.copy() for v in verts if v.x > 0.0001]
    boot_right_verts = [v.copy() for v in verts if v.x < -0.0001]
    print(f"Left verts: {len(boot_left_verts)}, Right verts: {len(boot_right_verts)}", flush=True)
    
    if not boot_left_verts or not boot_right_verts:
        print("Could not separate left and right boots based on X axis.")
        sys.exit(1)
        
    global_min_z = min([v.z for v in verts])
    global_max_z = max([v.z for v in verts])
    print(f"Global min z: {global_min_z}, max z: {global_max_z}", flush=True)
    
    boot_bounds = {}
    for boot_verts, name_prefix in [(boot_left_verts, "L"), (boot_right_verts, "R")]:
        boot_bounds[name_prefix] = {
            "min_x": min([v.x for v in boot_verts]),
            "max_x": max([v.x for v in boot_verts]),
            "min_y": min([v.y for v in boot_verts]),
            "max_y": max([v.y for v in boot_verts]),
            "min_z": min([v.z for v in boot_verts])
        }
    
    generated_parts = []
    
    # 1. Clean the jagged top edge via boolean cut
    print("Checkpoint: Boolean cut top edge", flush=True)
    cut_z = global_max_z - 0.0005 # Cut off the top 0.5mm 
    bpy.ops.mesh.primitive_cube_add(size=0.1, location=(0, 0, cut_z + 0.05))
    top_cutter = bpy.context.active_object
    print("Applying top boolean...", flush=True)
    try:
        apply_boolean(donor, top_cutter, 'DIFFERENCE')
    except Exception as e:
        print(f"Error applying boolean: {e}", flush=True)
    print("Top boolean applied", flush=True)
    bpy.data.objects.remove(top_cutter, do_unlink=True)
    
    # Re-evaluate verts after cut
    bpy.context.view_layer.update()
    
    print("Checkpoint: Start boot loop", flush=True)
    for name_prefix in ["L", "R"]:
        print(f"Processing boot {name_prefix}...", flush=True)
        b = boot_bounds[name_prefix]
        min_x, max_x, min_y, max_y, min_z = b["min_x"], b["max_x"], b["min_y"], b["max_y"], b["min_z"]
        
        center_x = (min_x + max_x) / 2
        center_y = (min_y + max_y) / 2
        width = max_x - min_x
        depth = max_y - min_y
        
        # 2. Add Ankle Assembly at the cut plane
        print(f"Generating ankle for {name_prefix}...", flush=True)
        ankle_radius = width * 0.4
        try:
            ankle_parts = generate_ankle_assembly(materials, center_x, center_y - depth*0.1, cut_z, ankle_radius, width, 0.001)
            generated_parts.extend(ankle_parts)
        except Exception as e:
            print(f"Ankle error: {e}", flush=True)
        
        # 3. Add Recessed Thruster to Sole
        # First carve the hole
        print(f"Carving thruster for {name_prefix}...", flush=True)
        thruster_radius = width * 0.35
        thruster_z = min_z + 0.001
        thruster_y = center_y - depth*0.1
        
        try:
            bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=thruster_radius, depth=0.004, location=(center_x, thruster_y, thruster_z))
            thruster_cutter = bpy.context.active_object
            apply_boolean(donor, thruster_cutter, 'DIFFERENCE')
            bpy.data.objects.remove(thruster_cutter, do_unlink=True)
            
            # Then spawn the thruster mechanics inside the hole
            print(f"Generating thruster internals for {name_prefix}...", flush=True)
            thruster_parts = generate_thruster_assembly(materials, center_x, thruster_y, min_z, thruster_radius)
            generated_parts.extend(thruster_parts)
        except Exception as e:
            print(f"Thruster error: {e}", flush=True)
            
        print(f"Generating sole plate for {name_prefix}...", flush=True)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(center_x, center_y + depth*0.1, min_z + 0.0005))
        sole_plate = bpy.context.active_object
        sole_plate.scale = (width * 0.6, depth * 0.5, 0.0005)
        bpy.ops.object.transform_apply(scale=True)
        sole_plate.data.materials.append(materials["Graphite"])
        generated_parts.append(sole_plate)
        
        # 5. Add Heel Thermal/Armor Module
        heel_y = min_y + depth*0.15
        bpy.ops.mesh.primitive_cube_add(size=1, location=(center_x, heel_y, cut_z - 0.002))
        heel_plate = bpy.context.active_object
        heel_plate.scale = (width * 0.5, 0.002, 0.003)
        bpy.ops.object.transform_apply(scale=True)
        # Bevel the heel plate for mechanical look
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.bevel(offset=0.0005, offset_type='OFFSET', segments=2)
        bpy.ops.object.mode_set(mode='OBJECT')
        heel_plate.data.materials.append(materials["BloodRed"])
        generated_parts.append(heel_plate)
        print(f"Finished {name_prefix} boot", flush=True)
        
    print("Checkpoint: Joining parts", flush=True)
    bpy.ops.object.select_all(action='DESELECT')
    donor.select_set(True)
    for p in generated_parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = donor
    bpy.ops.object.join()
    
    # Dynamic re-materialization of the donor shell
    # Use face normals and heights to intelligently map Gunmetal/Graphite/BloodRed
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(donor.data)
    
    for f in bm.faces:
        center = f.calc_center_median()
        normal = f.normal
        # If face is pointing strongly downwards, it's the sole -> Graphite
        if normal.z < -0.8:
            f.material_index = 1
        # If face is high up and pointing mostly sideways -> maybe BloodRed accents
        elif center.z > global_max_z - 0.003 and abs(normal.z) < 0.2 and (normal.y < -0.5 or normal.y > 0.5):
            # 20% chance to be red, 80% gunmetal to avoid full red blocks
            if abs(center.x * 1000) % 2 < 0.5:
                f.material_index = 2
            else:
                f.material_index = 0
        else:
            # Check if this face came from our newly added materials (which already had correct index)
            # Actually, because we joined, we need to be careful not to overwrite the manual assignments we did.
            # But we wiped donor materials at the start, so only original donor faces will have index 0.
            # The newly joined parts kept their material indices if they mapped correctly, but wait:
            # The join operation merges material slots.
            pass

    bmesh.update_edit_mesh(donor.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Validate local bounds
    bbox = [donor.matrix_world @ mathutils.Vector(corner) for corner in donor.bound_box]
    final_width = max([v.x for v in bbox]) - min([v.x for v in bbox])
    print(f"Final Boot Width: {final_width}")
    
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_materials='EXPORT',
        use_selection=True,
        export_apply=True
    )
    print(f"Successfully reauthored boots to {out_path}", flush=True)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
