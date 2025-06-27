#!/usr/bin/env python3
"""
Fetch Earth textures from reliable sources
"""

import os
import requests
from pathlib import Path
from PIL import Image
import numpy as np

def download_texture(url, dest_path):
    """Download texture with proper headers"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, stream=True)
        response.raise_for_status()
        
        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return True
    except:
        return False

def create_high_quality_earth_textures():
    """Create high quality procedural Earth textures"""
    output_dir = Path("../../client/public/textures")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("Creating high-quality Earth textures...")
    
    # 1. Create realistic Earth day texture
    width, height = 4096, 2048
    
    # Base ocean color with variations
    earth_day = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Ocean gradient
    for y in range(height):
        lat = 90 - (y / height * 180)
        ocean_color = np.array([
            50 + 20 * np.cos(np.radians(lat)),  # R
            100 + 30 * np.cos(np.radians(lat)), # G  
            160 + 20 * np.cos(np.radians(lat))  # B
        ])
        earth_day[y, :] = ocean_color
    
    # Add continents with realistic shapes and colors
    # Africa
    for y in range(int(height * 0.35), int(height * 0.75)):
        for x in range(int(width * 0.45), int(width * 0.55)):
            if (((x - width * 0.5) / (width * 0.05))**2 + 
                ((y - height * 0.55) / (height * 0.2))**2 < 1):
                # Varying terrain colors
                terrain_var = np.random.normal(0, 10)
                if y < height * 0.45:  # Sahara
                    earth_day[y, x] = np.clip([194 + terrain_var, 178 + terrain_var, 128 + terrain_var], 0, 255)
                else:  # Savanna/Forest
                    earth_day[y, x] = np.clip([34 + terrain_var, 139 + terrain_var, 34 + terrain_var], 0, 255)
    
    # Europe
    for y in range(int(height * 0.2), int(height * 0.35)):
        for x in range(int(width * 0.45), int(width * 0.55)):
            if np.random.random() > 0.3:
                terrain_var = np.random.normal(0, 10)
                earth_day[y, x] = np.clip([34 + terrain_var, 139 + terrain_var, 34 + terrain_var], 0, 255)
    
    # Asia
    for y in range(int(height * 0.25), int(height * 0.5)):
        for x in range(int(width * 0.55), int(width * 0.8)):
            if (((x - width * 0.65) / (width * 0.15))**2 + 
                ((y - height * 0.375) / (height * 0.125))**2 < 1):
                terrain_var = np.random.normal(0, 10)
                if x > width * 0.7 and y < height * 0.35:  # Gobi/Tibet
                    earth_day[y, x] = np.clip([160 + terrain_var, 82 + terrain_var, 45 + terrain_var]
                else:
                    earth_day[y, x] = np.clip([34 + terrain_var, 139 + terrain_var, 34 + terrain_var]
    
    # Americas
    for y in range(int(height * 0.15), int(height * 0.85)):
        for x in range(int(width * 0.15), int(width * 0.35)):
            # North America
            if y < height * 0.5:
                if (((x - width * 0.25) / (width * 0.1))**2 + 
                    ((y - height * 0.325) / (height * 0.175))**2 < 1):
                    terrain_var = np.random.normal(0, 10)
                    if y < height * 0.3 and x < width * 0.25:  # Canada/Alaska
                        earth_day[y, x] = np.clip([240 + terrain_var, 248 + terrain_var, 255 + terrain_var]
                    else:
                        earth_day[y, x] = np.clip([34 + terrain_var, 139 + terrain_var, 34 + terrain_var]
            # South America
            else:
                if (((x - width * 0.275) / (width * 0.075))**2 + 
                    ((y - height * 0.65) / (height * 0.15))**2 < 1):
                    terrain_var = np.random.normal(0, 10)
                    if x > width * 0.27:  # Amazon
                        earth_day[y, x] = np.clip([0 + terrain_var, 100 + terrain_var, 0 + terrain_var]
                    else:  # Andes
                        earth_day[y, x] = np.clip([139 + terrain_var, 90 + terrain_var, 43 + terrain_var]
    
    # Australia
    for y in range(int(height * 0.65), int(height * 0.8)):
        for x in range(int(width * 0.7), int(width * 0.8)):
            if (((x - width * 0.75) / (width * 0.05))**2 + 
                ((y - height * 0.725) / (height * 0.075))**2 < 1):
                terrain_var = np.random.normal(0, 10)
                earth_day[y, x] = [194 + terrain_var, 178 + terrain_var, 128 + terrain_var]
    
    # Antarctica
    for y in range(int(height * 0.85), height):
        for x in range(width):
            earth_day[y, x] = [250, 250, 255]
    
    # Arctic
    for y in range(0, int(height * 0.15)):
        for x in range(width):
            if np.random.random() > 0.3:
                earth_day[y, x] = [240, 248, 255]
    
    # Add noise and smoothing
    from scipy.ndimage import gaussian_filter
    earth_day = gaussian_filter(earth_day.astype(float), sigma=1.5)
    earth_day = np.clip(earth_day, 0, 255).astype(np.uint8)
    
    # Save day texture
    Image.fromarray(earth_day).save(output_dir / "earth_day.jpg", quality=95)
    print("Created earth_day.jpg")
    
    # 2. Create night texture with city lights
    earth_night = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Major cities and populated areas
    cities = [
        # North America
        (0.2, 0.35, 50),  # NYC area
        (0.25, 0.4, 40),  # Chicago
        (0.18, 0.32, 30), # LA
        # Europe
        (0.48, 0.27, 60), # London/Paris
        (0.52, 0.25, 40), # Berlin
        # Asia
        (0.75, 0.35, 80), # Beijing/Shanghai
        (0.78, 0.4, 70),  # Tokyo
        (0.65, 0.45, 50), # Delhi
        # South America
        (0.32, 0.75, 40), # Sao Paulo
        (0.3, 0.73, 30),  # Buenos Aires
    ]
    
    for cx, cy, intensity in cities:
        x_center = int(width * cx)
        y_center = int(height * cy)
        
        for y in range(max(0, y_center - 50), min(height, y_center + 50)):
            for x in range(max(0, x_center - 50), min(width, x_center + 50)):
                dist = np.sqrt((x - x_center)**2 + (y - y_center)**2)
                if dist < 50:
                    brightness = intensity * (1 - dist / 50) * np.random.uniform(0.8, 1.2)
                    earth_night[y, x] = [
                        min(255, brightness * 2.5),
                        min(255, brightness * 2),
                        min(255, brightness * 1)
                    ]
    
    # Add coastal lights
    for y in range(height):
        for x in range(width):
            if earth_day[y, x, 2] > 150:  # Ocean
                # Check for nearby land
                for dy in [-2, -1, 0, 1, 2]:
                    for dx in [-2, -1, 0, 1, 2]:
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < height and 0 <= nx < width:
                            if earth_day[ny, nx, 1] > 100 and earth_day[ny, nx, 2] < 150:  # Land
                                if np.random.random() > 0.7:
                                    earth_night[y, x] = [200, 150, 50]
                                    break
    
    # Smooth night lights
    earth_night = gaussian_filter(earth_night.astype(float), sigma=2)
    earth_night = np.clip(earth_night, 0, 255).astype(np.uint8)
    
    Image.fromarray(earth_night).save(output_dir / "earth_night.jpg", quality=95)
    print("Created earth_night.jpg")
    
    # 3. Create specular map (water reflection)
    earth_specular = np.zeros((height, width), dtype=np.uint8)
    
    for y in range(height):
        for x in range(width):
            # Water is where blue channel is high
            if earth_day[y, x, 2] > 150 and earth_day[y, x, 1] > 80:
                earth_specular[y, x] = 255
    
    Image.fromarray(earth_specular).save(output_dir / "earth_specular.jpg", quality=95)
    print("Created earth_specular.jpg")
    
    # 4. Create normal map (elevation)
    earth_normal = np.ones((height, width, 3), dtype=np.uint8) * 128
    
    # Add mountain ranges
    mountain_ranges = [
        (0.22, 0.35, 0.05, 0.15),  # Rockies
        (0.27, 0.65, 0.02, 0.2),   # Andes
        (0.65, 0.35, 0.1, 0.05),   # Himalayas
        (0.47, 0.32, 0.08, 0.03),  # Alps
    ]
    
    for mx, my, mw, mh in mountain_ranges:
        x_center = int(width * mx)
        y_center = int(height * my)
        w = int(width * mw)
        h = int(height * mh)
        
        for y in range(max(0, y_center - h), min(height, y_center + h)):
            for x in range(max(0, x_center - w), min(width, x_center + w)):
                if earth_day[y, x, 1] > 80:  # Land only
                    # Generate height-based normal
                    height_val = np.random.uniform(0.7, 1.0)
                    earth_normal[y, x] = [
                        128 + int(30 * height_val * np.random.normal()),
                        128 + int(30 * height_val * np.random.normal()),
                        200
                    ]
    
    earth_normal = gaussian_filter(earth_normal.astype(float), sigma=1)
    earth_normal = np.clip(earth_normal, 0, 255).astype(np.uint8)
    
    Image.fromarray(earth_normal).save(output_dir / "earth_normal.jpg", quality=95)
    print("Created earth_normal.jpg")
    
    # 5. Create cloud texture
    earth_clouds = np.zeros((height, width, 4), dtype=np.uint8)
    
    # Generate cloud patterns
    for _ in range(200):
        cx = np.random.randint(0, width)
        cy = np.random.randint(int(height * 0.2), int(height * 0.8))
        cloud_w = np.random.randint(50, 200)
        cloud_h = np.random.randint(30, 100)
        
        for y in range(max(0, cy - cloud_h), min(height, cy + cloud_h)):
            for x in range(max(0, cx - cloud_w), min(width, cx + cloud_w)):
                dist_x = abs(x - cx) / cloud_w
                dist_y = abs(y - cy) / cloud_h
                if dist_x**2 + dist_y**2 < 1:
                    alpha = (1 - (dist_x**2 + dist_y**2)) * 200
                    earth_clouds[y, x] = [255, 255, 255, min(255, earth_clouds[y, x, 3] + alpha)]
    
    earth_clouds = gaussian_filter(earth_clouds.astype(float), sigma=3)
    earth_clouds = np.clip(earth_clouds, 0, 255).astype(np.uint8)
    
    Image.fromarray(earth_clouds).save(output_dir / "earth_clouds.png")
    print("Created earth_clouds.png")
    
    print("\nAll textures created successfully!")

if __name__ == "__main__":
    # Install scipy if needed
    try:
        from scipy.ndimage import gaussian_filter
    except ImportError:
        print("Installing scipy...")
        os.system("pip install scipy")
        from scipy.ndimage import gaussian_filter
    
    create_high_quality_earth_textures()