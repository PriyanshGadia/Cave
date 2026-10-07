import bpy
import sys
import os
import mathutils

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def extract_armor():
    glb_path = "g:/Programming/Cave/cad/iron-man_mark_85__rigged.glb"
    export_dir = "g:/Programming/Cave/public/assets/armor/vault-mk1/source"
    os.makedirs(export_dir, exist_ok=True)
    
    print(f"Importing {glb_path}...")
    bpy.ops.import_scene.gltf(filepath=glb_path)
    
    # 1. Join all meshes
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not meshes:
        print("No meshes found!")
        return

    bpy.ops.object.select_all(action='DESELECT')
    for m in meshes:
        m.select_set(True)
    
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    suit = bpy.context.view_layer.objects.active
    suit.name = "SuitMonolith"
    
    # 2. Map Vertex Groups to Components
    comp_mapping = {}
    for vg in suit.vertex_groups:
        name = vg.name.lower()
        if 'head' in name or 'neck' in name: 
            comp = 'helmet'
        elif 'foot' in name or 'toe' in name or 'heel' in name: 
            comp = 'boots'
        elif 'thigh' in name or 'shin' in name or 'calf' in name or 'leg' in name: 
            comp = 'legs'
        elif 'hand' in name or 'thumb' in name or 'index' in name or 'middle' in name or 'ring' in name or 'pinky' in name or 'f_' in name: 
            comp = 'gauntlets'
        elif 'arm' in name: 
            comp = 'arms'
        else: 
            comp = 'torso'
        comp_mapping[vg.index] = comp

    # Create new component vertex groups
    comps = ['helmet', 'arms', 'gauntlets', 'legs', 'boots']
    for c in comps:
        suit.vertex_groups.new(name=f"vault_{c}")
        
    # Assign vertices
    for v in suit.data.vertices:
        best_vg = -1
        max_w = -1.0
        for g in v.groups:
            if g.weight > max_w:
                max_w = g.weight
                best_vg = g.group
        
        if best_vg != -1 and best_vg in comp_mapping:
            comp = comp_mapping[best_vg]
            if comp in comps:
                suit.vertex_groups[f"vault_{comp}"].add([v.index], 1.0, 'REPLACE')

    # 3. Separate by faces
    extracted_objects = {}
    for c in comps:
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.select_all(action='DESELECT')
        suit.select_set(True)
        bpy.context.view_layer.objects.active = suit
        
        # Deselect all
        for p in suit.data.polygons:
            p.select = False
        for v in suit.data.vertices:
            v.select = False
            
        vg_idx = suit.vertex_groups[f"vault_{c}"].index
        
        selected_faces = 0
        for p in suit.data.polygons:
            count = 0
            for vid in p.vertices:
                v = suit.data.vertices[vid]
                for g in v.groups:
                    if g.group == vg_idx and g.weight > 0.5:
                        count += 1
                        break
            if count > len(p.vertices) / 2:
                p.select = True
                selected_faces += 1
                
        if selected_faces == 0:
            print(f"Warning: No faces found for {c}")
            continue
            
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.separate(type='SELECTED')
        bpy.ops.object.mode_set(mode='OBJECT')
        
        new_obj = [o for o in bpy.context.selected_objects if o != suit][0]
        new_obj.name = c
        extracted_objects[c] = new_obj
        
    suit.name = "torso"
    extracted_objects["torso"] = suit
    
    # 4. Cleanup, Re-origin, and Export
    
    # Strip massive textures to keep GLBs small for development
    for mat in bpy.data.materials:
        if mat.use_nodes:
            nodes = mat.node_tree.nodes
            for node in nodes:
                if node.type == 'TEX_IMAGE':
                    nodes.remove(node)
                    
    for name, obj in extracted_objects.items():
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        
        # Clear Parent
        bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
        
        # Remove Modifiers
        for mod in obj.modifiers:
            obj.modifiers.remove(mod)
            
        # Delete vertex groups
        obj.vertex_groups.clear()
        
        # Set Origin to Center of Geometry
        bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
        
        # Apply Transforms
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        
        # Log dimensions
        print(f"[{name.upper()}] Dimensions: {obj.dimensions.x:.3f} x {obj.dimensions.y:.3f} x {obj.dimensions.z:.3f}")
        
        # Export GLB
        out_path = os.path.join(export_dir, f"{name}.glb")
        bpy.ops.export_scene.gltf(
            filepath=out_path,
            use_selection=True,
            export_format='GLB',
            export_materials='EXPORT',
            export_normals=True,
            export_apply=True
        )
        print(f"Exported {out_path}")
        
    print("ALL DONE")

if __name__ == "__main__":
    clear_scene()
    extract_armor()
