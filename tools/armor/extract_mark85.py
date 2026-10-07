import bpy
import sys
import os
import mathutils

# Ensure clean slate
bpy.ops.wm.read_factory_settings(use_empty=True)

glb_path = "g:/Programming/Cave/cad/iron-man_mark_85__rigged.glb"

if not os.path.exists(glb_path):
    print(f"Error: Could not find donor at {glb_path}")
    sys.exit(1)

# Import the GLB
print(f"Importing {glb_path}...")
bpy.ops.import_scene.gltf(filepath=glb_path)

print("\n--- PHASE 2: INVENTORY ---")
print(f"Scenes: {len(bpy.data.scenes)}")
print(f"Collections: {len(bpy.data.collections)}")
print(f"Objects: {len(bpy.data.objects)}")
print(f"Meshes: {len(bpy.data.meshes)}")
print(f"Armatures: {len(bpy.data.armatures)}")
print(f"Materials: {len(bpy.data.materials)}")
print(f"Textures: {len(bpy.data.textures)}")

print("\n--- OBJECT HIERARCHY ---")
def print_hierarchy(obj, indent=""):
    print(f"{indent}- {obj.name} ({obj.type})")
    for child in obj.children:
        print_hierarchy(child, indent + "  ")

# Find root objects (no parent)
roots = [obj for obj in bpy.context.scene.objects if not obj.parent]
for root in roots:
    print_hierarchy(root)


print("\n--- PHASE 3: MESH DETAILS ---")
mesh_objects = [obj for obj in bpy.data.objects if obj.type == 'MESH']
for obj in mesh_objects:
    print(f"\nObject: {obj.name}")
    print(f"  Parent: {obj.parent.name if obj.parent else 'None'}")
    print(f"  Vertices: {len(obj.data.vertices)}")
    print(f"  Polygons: {len(obj.data.polygons)}")
    print(f"  Materials: {[slot.material.name for slot in obj.material_slots if slot.material]}")
    
    is_skinned = len(obj.vertex_groups) > 0 and obj.parent and obj.parent.type == 'ARMATURE'
    print(f"  Skinned: {is_skinned}")
    print(f"  Modifiers: {[mod.type for mod in obj.modifiers]}")
    
    # World Transform
    loc, rot, sca = obj.matrix_world.decompose()
    print(f"  World Location: {loc.x:.3f}, {loc.y:.3f}, {loc.z:.3f}")
    
    # Bounding Box
    bbox_corners = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
    # compute extents
    xs = [v.x for v in bbox_corners]
    ys = [v.y for v in bbox_corners]
    zs = [v.z for v in bbox_corners]
    print(f"  Bounding Box Width: {max(xs)-min(xs):.3f}")
    print(f"  Bounding Box Height: {max(ys)-min(ys):.3f}")
    print(f"  Bounding Box Depth: {max(zs)-min(zs):.3f}")

print("\nDONE")
