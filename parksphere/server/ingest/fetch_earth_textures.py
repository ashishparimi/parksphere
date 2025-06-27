#!/usr/bin/env python3
"""
Fetch high-quality Earth textures from NASA and other sources
"""

import os
import sys
import requests
from pathlib import Path
import shutil

def download_file(url, dest_path):
    """Download a file from URL to destination path"""
    print(f"Downloading {url} to {dest_path}")
    
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    with open(dest_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    print(f"Downloaded {dest_path}")

def main():
    # Define texture URLs - using NASA's Blue Marble and other public domain sources
    textures = {
        # Earth day texture (8K resolution from NASA Blue Marble)
        "earth_day": "https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74343/world.200412.3x5400x2700.jpg",
        
        # Earth night texture (city lights)
        "earth_night": "https://eoimages.gsfc.nasa.gov/images/imagerecords/55000/55167/earth_lights_lrg.jpg",
        
        # Earth normal map (topography)
        "earth_normal": "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/gebco_08_rev_elev_5400x2700.png",
        
        # Earth specular map (water reflection)
        "earth_specular": "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/gebco_08_rev_bath_3600x1800.png",
        
        # Cloud texture
        "earth_clouds": "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_3600.jpg"
    }
    
    # Alternative lower resolution URLs if high-res fails
    fallback_textures = {
        "earth_day": "https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg",
        "earth_night": "https://www.solarsystemscope.com/textures/download/2k_earth_nightmap.jpg",
        "earth_normal": "https://www.solarsystemscope.com/textures/download/2k_earth_normal_map.jpg",
        "earth_specular": "https://www.solarsystemscope.com/textures/download/2k_earth_specular_map.jpg",
        "earth_clouds": "https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg"
    }
    
    # Output directory
    output_dir = Path("../../client/public/textures")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Download each texture
    for name, url in textures.items():
        dest_path = output_dir / f"{name}.jpg"
        if name == "earth_normal":
            dest_path = output_dir / f"{name}.png"
        
        try:
            if not dest_path.exists():
                download_file(url, dest_path)
            else:
                print(f"{dest_path} already exists, skipping")
        except Exception as e:
            print(f"Failed to download {name} from primary source: {e}")
            # Try fallback URL
            if name in fallback_textures:
                try:
                    print(f"Trying fallback URL for {name}")
                    download_file(fallback_textures[name], dest_path)
                except Exception as e2:
                    print(f"Failed to download {name} from fallback: {e2}")
    
    print("Earth texture download complete!")

if __name__ == "__main__":
    main()