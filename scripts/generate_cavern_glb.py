"""
scripts/generate_cavern_glb.py
Procedural 3D Volumetric Cavern Environment Generator (Rule 1, 14, 19)
Constructs hyper-realistic, highly-sculpted living rock cave geometry:
- Left & Right Craggy Fractured Rock Walls with jutting shelves & sedimentary strata
- Low jagged ceiling rock arch with angular overhanging crags framing the door
- Bedrock ground floor with natural elevation contours and rubble beds
- Fully UV-mapped for seamless 2K PBR rock materials
- Exported as an optimized, lightweight binary GLB (cavern-environment.glb)
"""

import os
import math
import numpy as np
import trimesh
from PIL import Image

def generate_cavern_mesh():
    print("=== [GENERATING 3D VOLUMETRIC CAVERN ENVIRONMENT GLB] ===")
    output_dir = os.path.join(os.getcwd(), "public", "models")
    os.makedirs(output_dir, exist_ok=True)
    glb_path = os.path.join(output_dir, "cavern-environment.glb")
    
    # We will build a continuous, high-density arch tunnel
    # Grid dimensions
    n_theta = 128  # radial subdivisions around arch
    n_z = 96      # longitudinal subdivisions along tunnel
    
    # Tunnel parameters
    z_min = -0.4   # just behind the door
    z_max = 7.2    # behind camera
    length = z_max - z_min
    
    # 3D noise pseudo-random generator
    np.random.seed(42)
    
    # Generate multi-octave noise grid
    theta_vals = np.linspace(-math.pi * 0.5, math.pi * 1.5, n_theta)
    z_vals = np.linspace(z_min, z_max, n_z)
    
    verts = []
    uvs = []
    
    # Noise displacement functions using multi-frequency sinusoids and harmonic noise
    def rock_noise(x, y, z):
        # Layer 1: Macro geological formations & jutting rock shelves
        macro = math.sin(y * 2.2 + z * 0.8) * 0.22 + math.cos(x * 1.8 + z * 0.6) * 0.18
        
        # Layer 2: Sedimentary horizontal rock strata bands (tight Y frequency)
        strata = math.sin(y * 9.5 + z * 1.5 + math.sin(x * 3.0) * 0.4) * 0.09
        
        # Layer 3: Angular rock fractures & cleavage planes
        angular = (math.sin(x * 5.0 + y * 4.0) * math.cos(z * 4.0)) * 0.06
        
        # Layer 4: High-frequency crag roughness
        fine = math.sin(x * 12.0 + z * 8.0) * math.sin(y * 12.0) * 0.025
        
        return macro + strata + angular + fine

    for zi, z in enumerate(z_vals):
        # Tapering factor near door at Z = 0
        door_proximity = max(0.0, 1.0 - z / 1.6) if z < 1.6 else 0.0
        
        for ti, theta in enumerate(theta_vals):
            # Base cross section: arch-topped tunnel with flattened craggy side walls
            # theta: -pi/2 (bottom right) -> 0 (right wall) -> pi/2 (ceiling) -> pi (left wall) -> 3pi/2 (bottom left)
            
            # Parametric arch-tunnel profile
            rad_base_x = 1.60 + 0.12 * (z / length)
            rad_base_y = 1.50 + 0.10 * (z / length)
            
            # Base position on cylinder
            bx = math.cos(theta) * rad_base_x
            by = 1.35 + math.sin(theta) * rad_base_y
            
            # 1. Flatten side walls to create authentic subterranean passage corridor
            if bx < -1.15:
                bx = -1.15 - (abs(bx) - 1.15) * 0.38
            elif bx > 1.15:
                bx = 1.15 + (abs(bx) - 1.15) * 0.38
                
            # Floor bed flattening
            if by < 0.05:
                by = -0.15 + by * 0.15
                
            # 2. Rock Displacements
            disp = rock_noise(bx, by, z)
            
            # Extra jutting crags on left wall (where warm light hits)
            if bx < -0.8 and by > 0.4:
                disp += math.sin(by * 4.2 + z * 1.8) * 0.14
                
            # Overhanging rocky ceiling shelves
            if by > 2.0 and abs(bx) < 1.0:
                disp -= math.sin(bx * 3.5 + z * 2.0) * 0.12
                
            # 3. Door Embedding at Z=0 (wrap tightly around octagonal blast door)
            if z < 1.4:
                door_w_half = 1.20
                door_h_top = 3.10
                if abs(bx) < door_w_half + 0.08 and by > 0.0 and by < door_h_top + 0.08:
                    if bx < 0:
                        bx = bx * (1.0 - door_proximity * 0.85) + (-door_w_half - 0.06) * (door_proximity * 0.85)
                    else:
                        bx = bx * (1.0 - door_proximity * 0.85) + (door_w_half + 0.06) * (door_proximity * 0.85)
                    if by > 1.4:
                        by = by * (1.0 - door_proximity * 0.85) + (door_h_top + 0.08) * (door_proximity * 0.85)

            # Apply outward displacement along radial normal
            dx = bx
            dy = by - 1.35
            norm_len = math.sqrt(dx * dx + dy * dy)
            if norm_len > 0.001:
                final_x = bx + (dx / norm_len) * disp
                final_y = by + (dy / norm_len) * disp
            else:
                final_x = bx
                final_y = by
                
            verts.append([final_x, final_y, z])
            
            # UV mapping: seamless cylindrical unwrap
            u = (ti / (n_theta - 1)) * 3.0
            v = (zi / (n_z - 1)) * 4.0
            uvs.append([u, v])
            
    # Generate quad faces with standard front-facing normals pointing inward
    faces = []
    for zi in range(n_z - 1):
        for ti in range(n_theta - 1):
            i0 = zi * n_theta + ti
            i1 = zi * n_theta + (ti + 1)
            i2 = (zi + 1) * n_theta + (ti + 1)
            i3 = (zi + 1) * n_theta + ti
            
            # Front-facing inward winding
            faces.append([i0, i1, i2])
            faces.append([i0, i2, i3])
            
    cavern_mesh = trimesh.Trimesh(
        vertices=np.array(verts, dtype=np.float64),
        faces=np.array(faces, dtype=np.int64),
        process=True
    )
    cavern_mesh.visual = trimesh.visual.TextureVisuals(
        uv=np.array(uvs, dtype=np.float64)
    )
    cavern_mesh.fix_normals()
    
    glb_data = cavern_mesh.export(file_type='glb')
    with open(glb_path, 'wb') as f:
        f.write(glb_data)
        
    print(f"[SUCCESS] cavern-environment.glb generated successfully!")
    print(f"File Size: {len(glb_data) / 1024:.1f} KB")
    print(f"Vertices:  {len(cavern_mesh.vertices):,}")
    print(f"Faces:     {len(cavern_mesh.faces):,}")

if __name__ == "__main__":
    generate_cavern_mesh()
