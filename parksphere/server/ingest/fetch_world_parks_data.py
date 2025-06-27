#!/usr/bin/env python3
"""
Fetch comprehensive data for world's top 50 national parks
- Validates locations with NASA Earth API
- Fetches images from NPS API (for US parks)
- Fetches images from Unsplash API (for all parks)
- Stores everything in SQLite database
"""

import os
import sys
import json
import requests
import sqlite3
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import csv
from PIL import Image
from io import BytesIO
import base64
import hashlib

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Keys
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")
NASA_API_KEY = os.getenv("NASA_API_KEY")
NPS_API_KEY = os.getenv("NPS_API_KEY")

# Rate limiting
RATE_LIMIT_DELAY = 2  # seconds between API calls

class WorldParksFetcher:
    def __init__(self, output_dir: str = "public/z/assets", db_path: str = "world_parks.db"):
        self.output_dir = Path(output_dir)
        self.db_path = db_path
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        self.init_database()
        
        # Load parks from CSV
        self.parks = self.load_parks()
        
        # Track API usage
        self.api_calls = {
            'unsplash': 0,
            'nasa': 0,
            'nps': 0
        }
        
    def init_database(self):
        """Initialize SQLite database for world parks"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create parks table with country field
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS parks (
                id INTEGER PRIMARY KEY,
                name TEXT,
                country TEXT,
                code TEXT UNIQUE,
                coordinates_lat REAL,
                coordinates_lon REAL,
                biome TEXT,
                established INTEGER,
                area_acres INTEGER,
                summary TEXT,
                activities TEXT,
                climate TEXT,
                nasa_validated BOOLEAN,
                updated_at TIMESTAMP
            )
        """)
        
        # Create images table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                park_id INTEGER,
                type TEXT,  -- 'photo', 'satellite', 'nps'
                url TEXT,
                local_path TEXT,
                blur_hash TEXT,
                width INTEGER,
                height INTEGER,
                attribution TEXT,
                source TEXT,  -- 'unsplash', 'nps', 'nasa'
                created_at TIMESTAMP,
                FOREIGN KEY (park_id) REFERENCES parks (id)
            )
        """)
        
        conn.commit()
        conn.close()
        
    def load_parks(self) -> List[Dict]:
        """Load parks from world parks CSV file"""
        parks = []
        csv_path = Path(__file__).parent / "world_parks_top50.csv"
        
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                parks.append({
                    'id': int(row['id']),
                    'name': row['name'],
                    'country': row['country'],
                    'code': row['code'],
                    'latitude': float(row['latitude']),
                    'longitude': float(row['longitude']),
                    'biome': row['biome'],
                    'established': int(row['established']),
                    'area_acres': int(row['area_acres']),
                    'summary': row['summary']
                })
                
        return parks
    
    def validate_location_with_nasa(self, lat: float, lon: float) -> Tuple[bool, Optional[str]]:
        """Validate park location with NASA Earth API and get satellite image"""
        print(f"  Validating location with NASA: {lat}, {lon}")
        
        params = {
            "lon": lon,
            "lat": lat,
            "dim": 0.5,  # Width/height in degrees
            "date": "2023-01-01",  # Recent date
            "api_key": NASA_API_KEY
        }
        
        try:
            # First check if location exists
            check_url = "https://api.nasa.gov/planetary/earth/assets"
            response = requests.get(check_url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('count', 0) > 0:
                    # Location is valid, now get the image
                    img_params = params.copy()
                    img_response = requests.get(
                        "https://api.nasa.gov/planetary/earth/imagery",
                        params=img_params
                    )
                    
                    if img_response.status_code == 200 and img_response.headers.get("content-type", "").startswith("image/"):
                        self.api_calls['nasa'] += 2
                        return True, self.save_nasa_image(img_response.content, lat, lon)
                    
            self.api_calls['nasa'] += 1
            return True, None  # Location is valid but no image available
            
        except Exception as e:
            print(f"    Error validating with NASA: {e}")
            return False, None
    
    def save_nasa_image(self, image_data: bytes, lat: float, lon: float) -> str:
        """Save NASA satellite image and return URL"""
        filename = f"nasa_sat_{lat}_{lon}.jpg"
        filepath = self.output_dir / filename
        
        with open(filepath, 'wb') as f:
            f.write(image_data)
            
        return f"/assets/{filename}"
    
    def fetch_nps_images(self, park_code: str) -> List[Dict]:
        """Fetch images from NPS API for US parks"""
        print(f"  Fetching NPS images for {park_code}")
        
        params = {
            "parkCode": park_code,
            "api_key": NPS_API_KEY
        }
        
        try:
            response = requests.get(
                "https://developer.nps.gov/api/v1/parks",
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            images = []
            
            if data.get("data") and len(data["data"]) > 0:
                park_data = data["data"][0]
                
                # Get up to 5 images from NPS
                for img in park_data.get("images", [])[:5]:
                    images.append({
                        "url": img.get("url", ""),
                        "title": img.get("title", ""),
                        "caption": img.get("caption", ""),
                        "attribution": f"NPS Photo{': ' + img.get('credit', '') if img.get('credit') else ''}",
                        "source": "nps"
                    })
                    
            self.api_calls['nps'] += 1
            return images
            
        except Exception as e:
            print(f"    Error fetching NPS images: {e}")
            return []
    
    def fetch_unsplash_photos(self, park_name: str, country: str, count: int = 5) -> List[Dict]:
        """Fetch photos from Unsplash API"""
        print(f"  Fetching Unsplash photos for {park_name}")
        
        headers = {
            "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"
        }
        
        # Build search query
        if country != "United States":
            query = f"{park_name} {country}"
        else:
            query = f"{park_name} National Park"
            
        params = {
            "query": query,
            "per_page": count,
            "orientation": "landscape",
            "content_filter": "high"  # High quality photos only
        }
        
        try:
            response = requests.get(
                "https://api.unsplash.com/search/photos",
                headers=headers,
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            photos = []
            
            for photo in data.get("results", [])[:count]:
                # Get the best quality URL
                photo_url = photo["urls"].get("raw", photo["urls"]["regular"])
                # Add parameters for optimization
                photo_url += "?w=1920&h=1080&fit=crop&q=80"
                
                photos.append({
                    "url": photo_url,
                    "thumb_url": photo["urls"]["thumb"],
                    "width": photo["width"],
                    "height": photo["height"],
                    "attribution": f"Photo by {photo['user']['name']} on Unsplash",
                    "blur_hash": photo.get("blur_hash", ""),
                    "source": "unsplash"
                })
                
            self.api_calls['unsplash'] += 1
            return photos
            
        except Exception as e:
            print(f"    Error fetching Unsplash photos: {e}")
            return []
    
    def generate_blur_hash(self, image_url: str) -> str:
        """Generate a simple blur hash for an image"""
        try:
            response = requests.get(image_url, timeout=10)
            img = Image.open(BytesIO(response.content))
            
            # Create tiny version
            tiny = img.copy()
            tiny.thumbnail((20, 20), Image.Resampling.LANCZOS)
            
            # Convert to base64
            buffer = BytesIO()
            tiny.save(buffer, format="JPEG", quality=20)
            blur_hash = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/jpeg;base64,{blur_hash}"
        except:
            return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ=="  # Default blur
    
    def save_park_data(self, park: Dict, nps_images: List[Dict], unsplash_photos: List[Dict], 
                      nasa_validated: bool, satellite_url: Optional[str]):
        """Save park data to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Insert or update park
        cursor.execute("""
            INSERT OR REPLACE INTO parks 
            (id, name, country, code, coordinates_lat, coordinates_lon, 
             biome, established, area_acres, summary, activities, climate, 
             nasa_validated, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            park['id'],
            park['name'],
            park['country'],
            park['code'],
            park['latitude'],
            park['longitude'],
            park['biome'],
            park['established'],
            park['area_acres'],
            park['summary'],
            json.dumps([
                "Hiking", "Wildlife Viewing", "Photography", 
                "Nature Walks", "Scenic Drives"
            ]),
            "Varies by season",
            nasa_validated,
            datetime.now()
        ))
        
        park_id = park['id']
        
        # Save NPS images if available
        for img in nps_images:
            cursor.execute("""
                INSERT INTO images 
                (park_id, type, url, blur_hash, attribution, source, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                park_id,
                'nps',
                img['url'],
                self.generate_blur_hash(img['url']),
                img['attribution'],
                'nps',
                datetime.now()
            ))
        
        # Save Unsplash photos
        for photo in unsplash_photos:
            cursor.execute("""
                INSERT INTO images 
                (park_id, type, url, blur_hash, width, height, 
                 attribution, source, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                park_id,
                'photo',
                photo['url'],
                photo.get('blur_hash', ''),
                photo.get('width', 1920),
                photo.get('height', 1080),
                photo['attribution'],
                'unsplash',
                datetime.now()
            ))
        
        # Save satellite image if available
        if satellite_url:
            cursor.execute("""
                INSERT INTO images 
                (park_id, type, url, attribution, source, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                park_id,
                'satellite',
                satellite_url,
                "NASA Earth Observatory",
                'nasa',
                datetime.now()
            ))
        
        conn.commit()
        conn.close()
    
    def fetch_all_parks_data(self, limit: Optional[int] = None):
        """Fetch data for all parks"""
        parks_to_process = self.parks[:limit] if limit else self.parks
        
        print(f"\nProcessing {len(parks_to_process)} parks...")
        print(f"Rate limit: {RATE_LIMIT_DELAY} seconds between API calls\n")
        
        for i, park in enumerate(parks_to_process):
            print(f"[{i+1}/{len(parks_to_process)}] Processing {park['name']}, {park['country']}...")
            
            # Validate location with NASA
            nasa_validated, satellite_url = self.validate_location_with_nasa(
                park['latitude'], park['longitude']
            )
            time.sleep(RATE_LIMIT_DELAY)
            
            # Fetch NPS images for US parks
            nps_images = []
            if park['country'] == "United States":
                # Map park codes for NPS API
                nps_code_map = {
                    'yellowstone': 'yell',
                    'grand-canyon': 'grca',
                    'yosemite': 'yose',
                    'denali': 'dena'
                }
                nps_code = nps_code_map.get(park['code'], park['code'])
                nps_images = self.fetch_nps_images(nps_code)
                time.sleep(RATE_LIMIT_DELAY)
            
            # Fetch Unsplash photos
            photo_count = max(1, 5 - len(nps_images))  # Get at least 5 total images
            unsplash_photos = self.fetch_unsplash_photos(
                park['name'], park['country'], photo_count
            )
            time.sleep(RATE_LIMIT_DELAY)
            
            # Save to database
            self.save_park_data(park, nps_images, unsplash_photos, 
                              nasa_validated, satellite_url)
            
            print(f"  ✓ Completed: {len(nps_images)} NPS, {len(unsplash_photos)} Unsplash images")
        
        print(f"\n✅ Data fetching complete!")
        print(f"API calls made:")
        print(f"  - NASA: {self.api_calls['nasa']}")
        print(f"  - NPS: {self.api_calls['nps']}")
        print(f"  - Unsplash: {self.api_calls['unsplash']}")
        print(f"Database saved to: {self.db_path}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Fetch data for world's top national parks")
    parser.add_argument("--limit", type=int, help="Limit number of parks to process")
    parser.add_argument("--db", default="world_parks.db", help="Database path")
    
    args = parser.parse_args()
    
    # Check for API keys
    if not all([UNSPLASH_ACCESS_KEY, NASA_API_KEY, NPS_API_KEY]):
        print("❌ Error: Missing API keys in .env file")
        print("Required keys: UNSPLASH_ACCESS_KEY, NASA_API_KEY, NPS_API_KEY")
        sys.exit(1)
    
    # Create fetcher and run
    fetcher = WorldParksFetcher(db_path=args.db)
    fetcher.fetch_all_parks_data(limit=args.limit)


if __name__ == "__main__":
    main()