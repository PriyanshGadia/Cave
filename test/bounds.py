import json
import struct
import os

paths = [
    'public/assets/armor/vault-mk1/final/boots.glb',
    'public/assets/armor/vault-mk1/final/legs.glb',
    'public/assets/armor/vault-mk1/final/torso.glb',
    'public/assets/armor/vault-mk1/final/arms.glb',
    'public/assets/armor/vault-mk1/final/gauntlets.glb',
    'public/assets/armor/vault-mk1/final/helmet.glb'
]

global_min = [float('inf')] * 3
global_max = [float('-inf')] * 3

for p in paths:
    with open(p, 'rb') as f:
        magic = f.read(4)
        version = struct.unpack('<I', f.read(4))[0]
        length = struct.unpack('<I', f.read(4))[0]
        
        chunk_len = struct.unpack('<I', f.read(4))[0]
        chunk_type = f.read(4)
        
        json_data = f.read(chunk_len).decode('utf-8')
        gltf = json.loads(json_data)
        
        # find all meshes and their position accessors
        b_min = [float('inf')] * 3
        b_max = [float('-inf')] * 3
        
        for mesh in gltf.get('meshes', []):
            for prim in mesh.get('primitives', []):
                if 'POSITION' in prim.get('attributes', {}):
                    acc_idx = prim['attributes']['POSITION']
                    acc = gltf['accessors'][acc_idx]
                    
                    if 'min' in acc and 'max' in acc:
                        b_min = [min(b_min[i], acc['min'][i]) for i in range(3)]
                        b_max = [max(b_max[i], acc['max'][i]) for i in range(3)]
        
        print(f"\n{os.path.basename(p)}")
        print(f"Min: [{b_min[0]:.3f}, {b_min[1]:.3f}, {b_min[2]:.3f}]")
        print(f"Max: [{b_max[0]:.3f}, {b_max[1]:.3f}, {b_max[2]:.3f}]")
        
        global_min = [min(global_min[i], b_min[i]) for i in range(3)]
        global_max = [max(global_max[i], b_max[i]) for i in range(3)]

print("\n--- UNION BOX3 ---")
print(f"Min: [{global_min[0]:.3f}, {global_min[1]:.3f}, {global_min[2]:.3f}]")
print(f"Max: [{global_max[0]:.3f}, {global_max[1]:.3f}, {global_max[2]:.3f}]")
print(f"Size: [{(global_max[0]-global_min[0]):.3f}, {global_max[1]-global_min[1]:.3f}, {global_max[2]-global_min[2]:.3f}]")
