#!/usr/bin/env python3
"""
Create high-quality Earth textures
"""

import os
from pathlib import Path
from PIL import Image
import numpy as np

def create_earth_textures():
    """Create Earth textures using actual Earth imagery data"""
    output_dir = Path("../../client/public/textures")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("Downloading and creating Earth textures...")
    
    # Try to download real textures first
    import requests
    
    texture_urls = {
        "earth_day.jpg": [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Blue_Marble_2002.png/2048px-Blue_Marble_2002.png",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/The_Blue_Marble.jpg/2048px-The_Blue_Marble.jpg"
        ],
        "earth_night.jpg": [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/The_earth_at_night.jpg/2048px-The_earth_at_night.jpg"
        ]
    }
    
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    for texture_name, urls in texture_urls.items():
        texture_path = output_dir / texture_name
        success = False
        
        for url in urls:
            try:
                response = requests.get(url, headers=headers, timeout=30)
                if response.status_code == 200:
                    with open(texture_path, 'wb') as f:
                        f.write(response.content)
                    print(f"Downloaded {texture_name} from {url}")
                    success = True
                    break
            except Exception as e:
                print(f"Failed to download from {url}: {e}")
        
        if not success:
            print(f"Creating procedural {texture_name}")
    
    # Create additional textures procedurally
    width, height = 2048, 1024
    
    # Create specular map if it doesn't exist
    if not (output_dir / "earth_specular.jpg").exists():
        print("Creating earth_specular.jpg")
        # Simple ocean mask - will be refined based on day texture
        specular = np.zeros((height, width), dtype=np.uint8)
        
        # Ocean areas (approximate)
        # Pacific
        specular[:, :int(width*0.15)] = 200
        specular[:, int(width*0.35):int(width*0.45)] = 200
        specular[:, int(width*0.55):int(width*0.7)] = 200
        specular[:, int(width*0.8):] = 200
        
        # Atlantic
        specular[int(height*0.2):int(height*0.8), int(width*0.35):int(width*0.45)] = 200
        
        # Indian
        specular[int(height*0.4):int(height*0.8), int(width*0.55):int(width*0.7)] = 200
        
        # Smooth it
        try:
            from scipy.ndimage import gaussian_filter
            specular = gaussian_filter(specular, sigma=20)
        except:
            pass
        
        Image.fromarray(specular).save(output_dir / "earth_specular.jpg", quality=90)
    
    # Create cloud texture if it doesn't exist
    if not (output_dir / "earth_clouds.png").exists():
        print("Creating earth_clouds.png")
        clouds = np.zeros((height, width, 4), dtype=np.uint8)
        
        # Generate realistic cloud patterns
        np.random.seed(42)
        for _ in range(100):
            # Cloud position biased towards equator and mid-latitudes
            lat = np.random.normal(0, 30)
            lon = np.random.uniform(-180, 180)
            
            y = int((90 - lat) / 180 * height)
            x = int((lon + 180) / 360 * width)
            
            # Cloud size
            size_x = np.random.randint(50, 150)
            size_y = np.random.randint(30, 80)
            
            y_start = max(0, y - size_y)
            y_end = min(height, y + size_y)
            x_start = max(0, x - size_x)
            x_end = min(width, x + size_x)
            
            for cy in range(y_start, y_end):
                for cx in range(x_start, x_end):
                    dist = np.sqrt(((cx - x) / size_x)**2 + ((cy - y) / size_y)**2)
                    if dist < 1:
                        alpha = int((1 - dist) * 255)
                        clouds[cy, cx % width] = [255, 255, 255, min(255, clouds[cy, cx % width, 3] + alpha // 2)]
        
        # Save with transparency
        Image.fromarray(clouds).save(output_dir / "earth_clouds.png")
    
    # Create normal map if it doesn't exist
    if not (output_dir / "earth_normal.jpg").exists():
        print("Creating earth_normal.jpg")
        normal = np.ones((height, width, 3), dtype=np.uint8) * 128
        
        # Add some elevation variations for major mountain ranges
        # Himalayas
        normal[int(height*0.35):int(height*0.4), int(width*0.6):int(width*0.7)] = [140, 140, 200]
        # Andes
        normal[int(height*0.5):int(height*0.8), int(width*0.25):int(width*0.28)] = [140, 140, 200]
        # Rockies
        normal[int(height*0.3):int(height*0.45), int(width*0.15):int(width*0.2)] = [135, 135, 190]
        # Alps
        normal[int(height*0.28):int(height*0.32), int(width*0.47):int(width*0.52)] = [135, 135, 190]
        
        Image.fromarray(normal).save(output_dir / "earth_normal.jpg", quality=90)
    
    # If we still don't have a day texture, create a simple one
    if not (output_dir / "earth_day.jpg").exists():
        print("Creating simple earth_day.jpg")
        earth = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Ocean
        earth[:, :] = [50, 100, 150]
        
        # Simple continents
        # Africa
        earth[int(height*0.35):int(height*0.7), int(width*0.45):int(width*0.55)] = [139, 90, 43]
        # Europe
        earth[int(height*0.2):int(height*0.35), int(width*0.45):int(width*0.55)] = [34, 139, 34]
        # Asia
        earth[int(height*0.2):int(height*0.5), int(width*0.55):int(width*0.8)] = [139, 119, 70]
        # Americas
        earth[int(height*0.2):int(height*0.8), int(width*0.15):int(width*0.35)] = [34, 139, 34]
        # Australia
        earth[int(height*0.65):int(height*0.8), int(width*0.7):int(width*0.8)] = [194, 178, 128]
        
        Image.fromarray(earth).save(output_dir / "earth_day.jpg", quality=90)
    
    # If we still don't have a night texture, create one
    if not (output_dir / "earth_night.jpg").exists():
        print("Creating simple earth_night.jpg")
        night = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Add some city lights
        cities = [
            (0.35, 0.2, 60),   # NYC
            (0.4, 0.25, 50),   # Chicago
            (0.27, 0.48, 70),  # London
            (0.25, 0.52, 60),  # Paris
            (0.35, 0.75, 80),  # Tokyo
            (0.4, 0.72, 70),   # Beijing
            (0.75, 0.32, 50),  # São Paulo
        ]
        
        for lat, lon, brightness in cities:
            y = int(height * lat)
            x = int(width * lon)
            for dy in range(-5, 6):
                for dx in range(-5, 6):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < height and 0 <= nx < width:
                        dist = np.sqrt(dy**2 + dx**2)
                        if dist < 5:
                            intensity = brightness * (1 - dist / 5)
                            night[ny, nx] = [intensity * 2, intensity * 1.5, intensity * 0.5]
        
        Image.fromarray(night).save(output_dir / "earth_night.jpg", quality=90)
    
    print("\nTexture creation complete!")

if __name__ == "__main__":
    create_earth_textures()