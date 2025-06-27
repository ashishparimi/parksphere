#!/usr/bin/env python3
"""Quick park data ingestion with real Unsplash images but avoiding rate limits"""

import os
import sys
import sqlite3
import json
from datetime import datetime
from pathlib import Path

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def init_database(db_path: str = "parks.db"):
    """Initialize SQLite database"""
    conn = sqlite3.connect(db_path)
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
            type TEXT,
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
    return conn

def load_parks_from_csv():
    """Load parks from CSV"""
    import csv
    parks = []
    csv_path = Path(__file__).parent / "parks_mvp_seed.csv"
    
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            parks.append({
                'id': int(row['id']),
                'name': row['name'],
                'nps_code': row['nps_code'],
                'latitude': float(row['latitude']),
                'longitude': float(row['longitude']),
                'biome': row['biome'],
                'established': int(row['established']),
                'area_acres': int(row['area_acres']),
                'summary': row['summary']
            })
    
    return parks

def get_mock_images(park_name: str, park_id: int):
    """Get mock images with real Unsplash URLs"""
    # Predefined beautiful nature photos from Unsplash
    nature_photos = [
        {
            "url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
            "attribution": "Photo by Samuel Ferrara on Unsplash",
            "blur_hash": "L65Yk?D%00M{_3xuRjWB_3ofRjj[",
        },
        {
            "url": "https://images.unsplash.com/photo-1511884642898-4c92249e20b6",
            "attribution": "Photo by Holly Mandarich on Unsplash", 
            "blur_hash": "LKO2:N%2Tw=w]~RBVZRi};RPxuwH",
        },
        {
            "url": "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
            "attribution": "Photo by David Marcu on Unsplash",
            "blur_hash": "L15Yk?D%00M{_3xuRjWB_3ofRjj[",
        },
        {
            "url": "https://images.unsplash.com/photo-1426604966848-d7adac402bff",
            "attribution": "Photo by John Towner on Unsplash",
            "blur_hash": "L65Yk?D%00M{_3xuRjWB_3ofRjj[",
        },
        {
            "url": "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d",
            "attribution": "Photo by Tim Stief on Unsplash",
            "blur_hash": "L15Yk?D%00M{_3xuRjWB_3ofRjj[",
        }
    ]
    
    # Rotate through photos for variety
    start_idx = (park_id - 1) % len(nature_photos)
    photos = []
    
    for i in range(5):
        idx = (start_idx + i) % len(nature_photos)
        photo = nature_photos[idx].copy()
        # Add size parameters to URL
        photo['url'] = photo['url'] + "?w=1920&h=1080&fit=crop"
        photos.append(photo)
    
    return photos

def ingest_all_parks():
    """Ingest all parks with mock data"""
    print("Initializing database...")
    conn = init_database()
    cursor = conn.cursor()
    
    print("Loading parks from CSV...")
    parks = load_parks_from_csv()
    
    print(f"Ingesting {len(parks)} parks...")
    
    for park in parks:
        # Insert park data
        cursor.execute("""
            INSERT OR REPLACE INTO parks 
            (id, nps_code, name, summary, coordinates_lat, coordinates_lon, 
             biome, established, area_acres, activities, climate, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            park['id'],
            park['nps_code'],
            park['name'],
            park['summary'],
            park['latitude'],
            park['longitude'],
            park['biome'],
            park['established'],
            park['area_acres'],
            json.dumps([
                "Hiking", "Wildlife Viewing", "Photography", 
                "Camping", "Scenic Drives"
            ]),
            "Varies by season",
            datetime.now()
        ))
        
        # Insert mock images
        images = get_mock_images(park['name'], park['id'])
        for i, img in enumerate(images):
            cursor.execute("""
                INSERT INTO images 
                (park_id, type, url, local_path, blur_hash, width, height, 
                 attribution, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                park['id'],
                'photo',
                img['url'],
                f"park_{park['id']}_photo_{i}.jpg",
                img['blur_hash'],
                1920,
                1080,
                img['attribution'],
                datetime.now()
            ))
        
        # Add a mock satellite image
        cursor.execute("""
            INSERT INTO images 
            (park_id, type, url, local_path, blur_hash, width, height, 
             attribution, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            park['id'],
            'satellite',
            f"https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/{park['longitude']},{park['latitude']},12,0/800x600?access_token=demo",
            f"park_{park['id']}_satellite.jpg",
            "L02rMH~q00WB00ofRjWB00WB~qof",
            800,
            600,
            "Satellite imagery from Mapbox",
            datetime.now()
        ))
        
        print(f"✓ Ingested {park['name']}")
    
    conn.commit()
    conn.close()
    
    print("\n✅ All parks ingested successfully!")
    print("Database: parks.db")

if __name__ == "__main__":
    ingest_all_parks()