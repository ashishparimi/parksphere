#!/usr/bin/env python3
"""
Fetch assets from external APIs for ParkSphere MVP
This script fetches photos from Unsplash, satellite imagery from NASA,
and park information from NPS API.
"""

import os
import sys
import json
import requests
import sqlite3
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
import argparse
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

# Rate limiting (50 requests per hour = 1 request per 72 seconds)
RATE_LIMIT_DELAY = 72  # seconds between requests

class ParkAssetFetcher:
    def __init__(self, output_dir: str = "public/z/assets", db_path: str = "parks.db"):
        self.output_dir = Path(output_dir)
        self.db_path = db_path
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        self.init_database()
        
        # Load parks from CSV
        self.parks = self.load_parks()
        
    def init_database(self):
        """Initialize SQLite database for caching"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create parks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS parks (
                id INTEGER PRIMARY KEY,
                nps_code TEXT UNIQUE,
                name TEXT,
                summary TEXT,
                coordinates_lat REAL,
                coordinates_lon REAL,
                biome TEXT,
                established INTEGER,
                area_acres INTEGER,
                visitors_annual INTEGER,
                activities TEXT,
                climate TEXT,
                updated_at TIMESTAMP
            )
        """)
        
        # Create images table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                park_id INTEGER,
                type TEXT,  -- 'photo' or 'satellite'
                url TEXT,
                local_path TEXT,
                blur_hash TEXT,
                width INTEGER,
                height INTEGER,
                attribution TEXT,
                created_at TIMESTAMP,
                FOREIGN KEY (park_id) REFERENCES parks (id)
            )
        """)
        
        conn.commit()
        conn.close()
        
    def load_parks(self) -> List[Dict]:
        """Load parks from CSV file"""
        import csv
        parks = []
        csv_path = Path(__file__).parent / "parks_mvp_seed.csv"
        
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Convert numeric fields
                row['id'] = int(row['id'])
                row['coordinates'] = {
                    'lat': float(row['latitude']),
                    'lon': float(row['longitude'])
                }
                row['established'] = int(row['established'])
                row['area_acres'] = int(row['area_acres'])
                parks.append(row)
                
        return parks
    
    def fetch_unsplash_photos(self, park_name: str, count: int = 5) -> List[Dict]:
        """Fetch photos from Unsplash API"""
        print(f"Fetching Unsplash photos for {park_name}...")
        
        headers = {
            "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"
        }
        
        # Search for national park photos
        query = f"{park_name} National Park landscape"
        params = {
            "query": query,
            "per_page": count,
            "orientation": "landscape"
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
                photos.append({
                    "url": photo["urls"]["regular"],
                    "thumb_url": photo["urls"]["thumb"],
                    "width": photo["width"],
                    "height": photo["height"],
                    "attribution": f"Photo by {photo['user']['name']} on Unsplash",
                    "blur_hash": photo.get("blur_hash", "")
                })
                
            return photos
            
        except Exception as e:
            print(f"Error fetching Unsplash photos: {e}")
            return []
    
    def fetch_nasa_satellite_image(self, lat: float, lon: float) -> Optional[Dict]:
        """Fetch satellite imagery from NASA Earth API"""
        print(f"Fetching NASA satellite image for coordinates {lat}, {lon}...")
        
        # NASA Earth Imagery API
        params = {
            "lon": lon,
            "lat": lat,
            "dim": 0.3,  # Width/height in degrees
            "api_key": NASA_API_KEY
        }
        
        try:
            response = requests.get(
                "https://api.nasa.gov/planetary/earth/imagery",
                params=params
            )
            response.raise_for_status()
            
            # The response is the image itself
            if response.headers.get("content-type", "").startswith("image/"):
                return {
                    "data": response.content,
                    "content_type": response.headers.get("content-type", "image/png")
                }
            
        except Exception as e:
            print(f"Error fetching NASA satellite image: {e}")
            
        return None
    
    def fetch_nps_data(self, park_code: str) -> Optional[Dict]:
        """Fetch additional park data from NPS API"""
        print(f"Fetching NPS data for {park_code}...")
        
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
            if data.get("data"):
                park_data = data["data"][0]
                return {
                    "full_name": park_data.get("fullName", ""),
                    "description": park_data.get("description", ""),
                    "weather_info": park_data.get("weatherInfo", ""),
                    "directions_info": park_data.get("directionsInfo", ""),
                    "activities": [act["name"] for act in park_data.get("activities", [])],
                    "topics": [topic["name"] for topic in park_data.get("topics", [])],
                    "images": park_data.get("images", [])[:3]  # Get up to 3 NPS images
                }
                
        except Exception as e:
            print(f"Error fetching NPS data: {e}")
            
        return None
    
    def download_and_process_image(self, url: str, park_id: int, image_type: str) -> Optional[str]:
        """Download image and create optimized versions"""
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            # Open image
            img = Image.open(BytesIO(response.content))
            
            # Create filename
            url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
            filename = f"park_{park_id}_{image_type}_{url_hash}.jpg"
            
            # Create different sizes
            sizes = {
                "original": (1920, 1080),
                "medium": (800, 600),
                "thumb": (400, 300)
            }
            
            for size_name, dimensions in sizes.items():
                # Resize image
                img_resized = img.copy()
                img_resized.thumbnail(dimensions, Image.Resampling.LANCZOS)
                
                # Save
                output_path = self.output_dir / f"{size_name}_{filename}"
                img_resized.save(output_path, "JPEG", quality=85, optimize=True)
            
            # Generate blur placeholder (base64 encoded tiny version)
            tiny = img.copy()
            tiny.thumbnail((20, 20), Image.Resampling.LANCZOS)
            buffer = BytesIO()
            tiny.save(buffer, format="JPEG", quality=20)
            blur_hash = base64.b64encode(buffer.getvalue()).decode()
            
            return {
                "filename": filename,
                "blur_hash": f"data:image/jpeg;base64,{blur_hash}",
                "width": img.width,
                "height": img.height
            }
            
        except Exception as e:
            print(f"Error processing image from {url}: {e}")
            return None
    
    def save_park_data(self, park: Dict, unsplash_photos: List[Dict], 
                      nps_data: Optional[Dict], satellite_data: Optional[Dict]):
        """Save park data to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Update park information
        cursor.execute("""
            INSERT OR REPLACE INTO parks 
            (id, nps_code, name, summary, coordinates_lat, coordinates_lon, 
             biome, established, area_acres, activities, climate, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            park['id'],
            park['nps_code'],
            park['name'],
            nps_data.get('description', park['summary']) if nps_data else park['summary'],
            park['coordinates']['lat'],
            park['coordinates']['lon'],
            park['biome'],
            park['established'],
            park['area_acres'],
            json.dumps(nps_data.get('activities', [])) if nps_data else '[]',
            nps_data.get('weather_info', '') if nps_data else '',
            datetime.now()
        ))
        
        park_id = park['id']
        
        # Save photos
        for photo in unsplash_photos:
            processed = self.download_and_process_image(
                photo['url'], park_id, 'photo'
            )
            
            if processed:
                cursor.execute("""
                    INSERT INTO images 
                    (park_id, type, url, local_path, blur_hash, width, height, 
                     attribution, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    park_id,
                    'photo',
                    photo['url'],
                    processed['filename'],
                    processed['blur_hash'],
                    processed['width'],
                    processed['height'],
                    photo['attribution'],
                    datetime.now()
                ))
        
        conn.commit()
        conn.close()
    
    def fetch_all_assets(self, limit: Optional[int] = None):
        """Fetch assets for all parks"""
        parks_to_process = self.parks[:limit] if limit else self.parks
        
        print(f"Processing {len(parks_to_process)} parks...")
        print(f"Rate limit: {RATE_LIMIT_DELAY} seconds between API calls")
        
        for i, park in enumerate(parks_to_process):
            print(f"\n[{i+1}/{len(parks_to_process)}] Processing {park['name']}...")
            
            # Fetch Unsplash photos
            photos = self.fetch_unsplash_photos(park['name'])
            time.sleep(RATE_LIMIT_DELAY)  # Rate limiting
            
            # Fetch NPS data
            nps_data = self.fetch_nps_data(park['nps_code'])
            time.sleep(RATE_LIMIT_DELAY)  # Rate limiting
            
            # Fetch NASA satellite image
            satellite = self.fetch_nasa_satellite_image(
                park['coordinates']['lat'],
                park['coordinates']['lon']
            )
            time.sleep(RATE_LIMIT_DELAY)  # Rate limiting
            
            # Save to database
            self.save_park_data(park, photos, nps_data, satellite)
            
            print(f"✓ Completed {park['name']}")
        
        print("\n✅ Asset fetching complete!")
        print(f"Database saved to: {self.db_path}")
        print(f"Images saved to: {self.output_dir}")


def main():
    parser = argparse.ArgumentParser(description="Fetch assets for ParkSphere")
    parser.add_argument("--out", default="public/z/assets", 
                       help="Output directory for images")
    parser.add_argument("--db", default="parks.db",
                       help="SQLite database path")
    parser.add_argument("--limit", type=int, 
                       help="Limit number of parks to process")
    
    args = parser.parse_args()
    
    # Check for API keys
    if not all([UNSPLASH_ACCESS_KEY, NASA_API_KEY, NPS_API_KEY]):
        print("❌ Error: Missing API keys in .env file")
        print("Required keys: UNSPLASH_ACCESS_KEY, NASA_API_KEY, NPS_API_KEY")
        sys.exit(1)
    
    # Create fetcher and run
    fetcher = ParkAssetFetcher(output_dir=args.out, db_path=args.db)
    fetcher.fetch_all_assets(limit=args.limit)


if __name__ == "__main__":
    main()