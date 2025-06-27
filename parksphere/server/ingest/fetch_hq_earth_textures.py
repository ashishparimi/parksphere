#!/usr/bin/env python3
"""
Fetch high-quality Earth textures from multiple reliable sources
"""

import os
import requests
from pathlib import Path
import time

def download_with_retry(url, dest_path, max_retries=3):
    """Download with retry logic"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    for attempt in range(max_retries):
        try:
            print(f"Downloading {url} (attempt {attempt + 1})")
            response = requests.get(url, headers=headers, stream=True, timeout=30)
            response.raise_for_status()
            
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            
            with open(dest_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            file_size = os.path.getsize(dest_path)
            print(f"Successfully downloaded {dest_path} ({file_size / 1024 / 1024:.1f} MB)")
            return True
            
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
    
    return False

def main():
    output_dir = Path("../../client/public/textures")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # High quality texture sources
    textures = [
        {
            "name": "earth_day_hq.jpg",
            "urls": [
                # NASA Blue Marble
                "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751/world.topo.bathy.200407.3x5400x2700.jpg",
                "https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74117/world.200408.3x5400x2700.jpg",
                # Alternative high-res sources
                "https://www.shadedrelief.com/natural3/images/earth_texture_map.jpg",
                "https://planetpixelemporium.com/download/download.php?earthmap4k.jpg",
            ]
        },
        {
            "name": "earth_night_hq.jpg",
            "urls": [
                # NASA Black Marble
                "https://eoimages.gsfc.nasa.gov/images/imagerecords/90000/90008/earth_lights_4800.png",
                "https://www.nasa.gov/sites/default/files/images/712129main_8247975848_88635d38a1_o.jpg",
                # Alternative
                "https://planetpixelemporium.com/download/download.php?earthlights4k.jpg",
            ]
        },
        {
            "name": "earth_normal_hq.jpg",
            "urls": [
                # Elevation/Normal maps
                "https://planetpixelemporium.com/download/download.php?earthbump4k.jpg",
                "https://www.shadedrelief.com/natural3/images/earth_normal_map.jpg",
            ]
        },
        {
            "name": "earth_specular_hq.jpg",
            "urls": [
                # Water/Ocean masks
                "https://planetpixelemporium.com/download/download.php?earthspec4k.jpg",
                "https://www.shadedrelief.com/natural3/images/water_4k.png",
            ]
        },
        {
            "name": "earth_clouds_hq.jpg",
            "urls": [
                # Cloud maps
                "https://planetpixelemporium.com/download/download.php?earthclouds4k.jpg",
                "https://www.shadedrelief.com/natural3/images/clouds_4k.png",
            ]
        }
    ]
    
    # Download each texture, trying multiple sources
    for texture in textures:
        dest_path = output_dir / texture["name"]
        
        if dest_path.exists() and os.path.getsize(dest_path) > 100000:
            print(f"{dest_path} already exists with good size, skipping")
            continue
        
        success = False
        for url in texture["urls"]:
            if download_with_retry(url, dest_path):
                success = True
                break
        
        if not success:
            print(f"Failed to download {texture['name']} from any source")
    
    # Also create optimized versions for web
    print("\nCreating web-optimized versions...")
    try:
        from PIL import Image
        
        for texture in textures:
            src_path = output_dir / texture["name"]
            if src_path.exists():
                # Create 2K version for better performance
                opt_name = texture["name"].replace("_hq", "")
                opt_path = output_dir / opt_name
                
                img = Image.open(src_path)
                # Resize to 2048 width maintaining aspect ratio
                width = 2048
                height = int(img.height * (width / img.width))
                img_resized = img.resize((width, height), Image.Resampling.LANCZOS)
                img_resized.save(opt_path, quality=90, optimize=True)
                print(f"Created optimized {opt_path}")
                
    except ImportError:
        print("PIL not available, skipping optimization")
    
    print("\nTexture download complete!")

if __name__ == "__main__":
    main()