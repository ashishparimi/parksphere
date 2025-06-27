#!/usr/bin/env python3
"""
Fetch high-quality Earth textures from reliable sources
"""

import os
import sys
import requests
from pathlib import Path
import json

def download_file(url, dest_path):
    """Download a file from URL to destination path"""
    print(f"Downloading {url}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, stream=True, headers=headers)
    response.raise_for_status()
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    with open(dest_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    print(f"Downloaded to {dest_path}")

def main():
    # Define texture URLs from reliable sources
    textures = {
        # High quality Earth textures from NASA Visible Earth
        "earth_day": "https://visibleearth.nasa.gov/images/73909/december-blue-marble-next-generation/73911l",
        
        # Alternative sources
        "earth_day_alt": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/The_Blue_Marble.jpg/2048px-The_Blue_Marble.jpg",
        
        # Night lights
        "earth_night": "https://visibleearth.nasa.gov/images/55167/earths-city-lights/55168l",
        
        # Topography map
        "earth_topology": "https://visibleearth.nasa.gov/images/73909/december-blue-marble-next-generation/73913l",
        
        # Water mask
        "earth_water": "https://visibleearth.nasa.gov/images/73963/bathymetry/73964l",
    }
    
    # Output directory
    output_dir = Path("../../client/public/textures")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Create a texture info file
    texture_info = {}
    
    # Try to download textures
    successful_downloads = []
    
    # First, let's create procedural textures as fallback
    print("Creating procedural Earth textures as base...")
    
    # Create a Python script to generate procedural textures
    procedural_script = '''
import numpy as np
from PIL import Image
import os

output_dir = "../../client/public/textures"
os.makedirs(output_dir, exist_ok=True)

# Create Earth day texture
width, height = 2048, 1024
day_texture = np.zeros((height, width, 3), dtype=np.uint8)

# Ocean base color
day_texture[:, :] = [70, 130, 180]  # Steel blue

# Add continents (simplified)
# Africa
day_texture[350:700, 900:1150] = [139, 90, 43]  # Saddle brown
# Europe
day_texture[200:350, 900:1100] = [139, 90, 43]
# Asia
day_texture[200:500, 1100:1600] = [139, 90, 43]
# North America
day_texture[200:500, 200:600] = [139, 90, 43]
# South America
day_texture[500:800, 300:500] = [139, 90, 43]
# Australia
day_texture[600:750, 1400:1600] = [139, 90, 43]

# Add some noise for texture
noise = np.random.normal(0, 10, (height, width, 3))
day_texture = np.clip(day_texture + noise, 0, 255).astype(np.uint8)

# Save day texture
Image.fromarray(day_texture).save(os.path.join(output_dir, "earth_day.jpg"), quality=95)

# Create night texture
night_texture = np.zeros((height, width, 3), dtype=np.uint8)
# Add city lights
np.random.seed(42)
for _ in range(5000):
    x = np.random.randint(0, width)
    y = np.random.randint(0, height)
    if day_texture[y, x, 0] > 100:  # Land areas
        night_texture[y, x] = [255, 200, 100]

# Save night texture
Image.fromarray(night_texture).save(os.path.join(output_dir, "earth_night.jpg"), quality=95)

# Create specular map (water areas are white)
specular_texture = np.zeros((height, width), dtype=np.uint8)
water_mask = (day_texture[:, :, 0] < 100) & (day_texture[:, :, 1] > 100)
specular_texture[water_mask] = 255

# Save specular texture
Image.fromarray(specular_texture).save(os.path.join(output_dir, "earth_specular.jpg"), quality=95)

# Create cloud texture
cloud_texture = np.zeros((height, width, 4), dtype=np.uint8)
# Add random cloud patterns
for _ in range(100):
    cx = np.random.randint(0, width)
    cy = np.random.randint(0, height)
    radius = np.random.randint(50, 200)
    y, x = np.ogrid[-cy:height-cy, -cx:width-cx]
    mask = x*x + y*y <= radius*radius
    cloud_texture[mask] = [255, 255, 255, 128]

# Save cloud texture
Image.fromarray(cloud_texture).save(os.path.join(output_dir, "earth_clouds.png"))

print("Procedural textures created successfully!")
'''
    
    # Write and execute procedural texture generator
    proc_script_path = Path("generate_earth_textures.py")
    with open(proc_script_path, 'w') as f:
        f.write(procedural_script)
    
    os.system(f"cd {Path(__file__).parent} && python generate_earth_textures.py")
    
    # Clean up
    if proc_script_path.exists():
        proc_script_path.unlink()
    
    # Try to download real textures to replace procedural ones
    for name, url in textures.items():
        if "alt" in name:
            continue
            
        dest_name = name.replace("_topology", "_normal")
        dest_path = output_dir / f"{dest_name}.jpg"
        
        try:
            if not dest_path.exists() or os.path.getsize(dest_path) < 1000:
                download_file(url, dest_path)
                successful_downloads.append(name)
        except Exception as e:
            print(f"Failed to download {name}: {e}")
            # Try alternative if available
            if f"{name}_alt" in textures:
                try:
                    download_file(textures[f"{name}_alt"], dest_path)
                    successful_downloads.append(name)
                except:
                    pass
    
    print(f"\nTexture setup complete! Successfully downloaded: {successful_downloads}")
    print("Procedural textures created as fallback for any missing textures.")

if __name__ == "__main__":
    main()