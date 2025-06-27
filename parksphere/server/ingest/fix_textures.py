#!/usr/bin/env python3
"""
Fix missing Earth textures
"""

import os
from pathlib import Path
from PIL import Image
import numpy as np

def fix_textures():
    output_dir = Path("../../client/public/textures")
    
    # Convert PNG to JPG if needed
    day_png = output_dir / "earth_day.jpg"
    if day_png.exists():
        img = Image.open(day_png)
        if img.format == 'PNG':
            print("Converting earth_day from PNG to proper JPG")
            rgb_img = img.convert('RGB')
            rgb_img.save(day_png, 'JPEG', quality=95)
    
    # Create earth_normal.jpg if missing
    normal_path = output_dir / "earth_normal.jpg"
    if not normal_path.exists() or os.path.getsize(normal_path) < 10000:
        print("Creating earth_normal.jpg")
        width, height = 2048, 1024
        normal = np.ones((height, width, 3), dtype=np.uint8) * 128
        
        # Add some height variation for major features
        # Mountains (brighter = higher)
        # Himalayas
        normal[int(height*0.35):int(height*0.4), int(width*0.6):int(width*0.7), 2] = 200
        # Andes  
        normal[int(height*0.5):int(height*0.8), int(width*0.25):int(width*0.28), 2] = 190
        # Rockies
        normal[int(height*0.3):int(height*0.45), int(width*0.15):int(width*0.2), 2] = 180
        # Alps
        normal[int(height*0.28):int(height*0.32), int(width*0.47):int(width*0.52), 2] = 175
        
        # Ocean depths (darker = deeper)
        # Pacific
        normal[:, :int(width*0.15), 2] = 100
        normal[:, int(width*0.8):, 2] = 100
        # Atlantic
        normal[int(height*0.2):int(height*0.8), int(width*0.35):int(width*0.45), 2] = 110
        
        Image.fromarray(normal).save(normal_path, 'JPEG', quality=90)
    
    # Ensure other textures exist with fallbacks
    textures = {
        "earth_specular.jpg": lambda: create_specular_map(width, height),
        "earth_clouds.png": lambda: create_clouds_map(width, height),
        "earth_night.jpg": lambda: create_night_map(width, height)
    }
    
    for name, creator in textures.items():
        path = output_dir / name
        if not path.exists() or os.path.getsize(path) < 10000:
            print(f"Creating {name}")
            img = creator()
            img.save(path)
    
    print("Texture fixes complete!")

def create_specular_map(width, height):
    """Create water/ocean specular map"""
    specular = np.zeros((height, width), dtype=np.uint8)
    
    # Oceans are white (reflective), land is black
    # Pacific
    specular[:, :int(width*0.15)] = 255
    specular[:, int(width*0.8):] = 255
    # Atlantic
    specular[int(height*0.2):int(height*0.8), int(width*0.35):int(width*0.45)] = 255
    # Indian
    specular[int(height*0.4):int(height*0.8), int(width*0.55):int(width*0.7)] = 255
    # Arctic
    specular[:int(height*0.15), :] = 128
    # Antarctic
    specular[int(height*0.85):, :] = 128
    
    return Image.fromarray(specular, mode='L')

def create_clouds_map(width, height):
    """Create cloud map with transparency"""
    clouds = np.zeros((height, width, 4), dtype=np.uint8)
    
    # Add some cloud patterns
    np.random.seed(42)
    for _ in range(50):
        cx = np.random.randint(0, width)
        cy = np.random.randint(int(height*0.2), int(height*0.8))
        w = np.random.randint(50, 150)
        h = np.random.randint(30, 80)
        
        for y in range(max(0, cy-h), min(height, cy+h)):
            for x in range(max(0, cx-w), min(width, cx+w)):
                dist = np.sqrt(((x-cx)/w)**2 + ((y-cy)/h)**2)
                if dist < 1:
                    alpha = int((1 - dist) * 128)
                    clouds[y, x] = [255, 255, 255, min(255, clouds[y, x, 3] + alpha)]
    
    return Image.fromarray(clouds)

def create_night_map(width, height):
    """Create night lights map"""
    night = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Major cities
    cities = [
        (0.35, 0.2, 80),   # NYC
        (0.4, 0.25, 60),   # Chicago  
        (0.32, 0.18, 70),  # LA
        (0.27, 0.48, 90),  # London
        (0.25, 0.52, 80),  # Paris
        (0.35, 0.75, 100), # Tokyo
        (0.4, 0.72, 90),   # Beijing
        (0.45, 0.65, 70),  # Delhi
        (0.75, 0.32, 60),  # São Paulo
    ]
    
    for lat, lon, brightness in cities:
        y = int(height * lat)
        x = int(width * lon)
        for dy in range(-10, 11):
            for dx in range(-10, 11):
                ny, nx = y + dy, x + dx
                if 0 <= ny < height and 0 <= nx < width:
                    dist = np.sqrt(dy**2 + dx**2)
                    if dist < 10:
                        intensity = brightness * (1 - dist / 10)
                        night[ny, nx] = np.clip(night[ny, nx] + [intensity*2, intensity*1.5, intensity*0.5], 0, 255)
    
    return Image.fromarray(night)

if __name__ == "__main__":
    fix_textures()