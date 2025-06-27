from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import json
from pathlib import Path

app = FastAPI(title="ParkSphere API - World Edition", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Coordinates(BaseModel):
    lat: float
    lon: float

class GalleryImage(BaseModel):
    url: str
    blur: str
    attribution: Optional[str] = None
    source: Optional[str] = None  # 'unsplash', 'nps', 'nasa'

class Park(BaseModel):
    id: int
    name: str
    country: str
    code: str
    coordinates: Coordinates
    biome: str
    established: int
    area_acres: int
    summary: str
    gallery: List[GalleryImage]
    satellite: Optional[str] = None
    activities: Optional[List[str]] = []
    climate: Optional[str] = None
    nasa_validated: Optional[bool] = True

class ParksList(BaseModel):
    parks: List[Park]
    total: int

# Database path - check for world_parks.db first, fallback to regular parks.db
DB_PATH = Path(__file__).parent / "world_parks.db"
if not DB_PATH.exists():
    DB_PATH = Path(__file__).parent / "parks.db"

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def get_park_images(conn, park_id: int, image_type: str = None) -> List[GalleryImage]:
    """Get images for a park"""
    if image_type:
        cursor = conn.execute(
            "SELECT * FROM images WHERE park_id = ? AND type = ? ORDER BY id",
            (park_id, image_type)
        )
    else:
        # Get all non-satellite images
        cursor = conn.execute(
            "SELECT * FROM images WHERE park_id = ? AND type != 'satellite' ORDER BY source DESC, id",
            (park_id,)
        )
    
    images = cursor.fetchall()
    
    gallery = []
    for img in images:
        gallery.append(GalleryImage(
            url=img['url'],
            blur=img['blur_hash'] if img['blur_hash'] else 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ==',
            attribution=img['attribution'] if 'attribution' in img.keys() else None,
            source=img['source'] if 'source' in img.keys() else None
        ))
    
    return gallery

def get_park_from_row(conn, row) -> Park:
    """Convert database row to Park model"""
    # Get gallery images (NPS + Unsplash)
    gallery = get_park_images(conn, row['id'])
    
    # Get satellite image
    cursor = conn.execute(
        "SELECT url FROM images WHERE park_id = ? AND type = 'satellite' LIMIT 1",
        (row['id'],)
    )
    satellite_row = cursor.fetchone()
    satellite_url = satellite_row['url'] if satellite_row else None
    
    # Parse activities
    activities = json.loads(row['activities']) if row['activities'] else []
    
    # Handle both old and new database schemas
    country = row['country'] if 'country' in row.keys() else 'United States'
    code = row['code'] if 'code' in row.keys() else (row['nps_code'] if 'nps_code' in row.keys() else '')
    nasa_validated = row['nasa_validated'] if 'nasa_validated' in row.keys() else True
    
    return Park(
        id=row['id'],
        name=row['name'],
        country=country,
        code=code,
        coordinates=Coordinates(
            lat=row['coordinates_lat'],
            lon=row['coordinates_lon']
        ),
        biome=row['biome'],
        established=row['established'],
        area_acres=row['area_acres'],
        summary=row['summary'],
        gallery=gallery[:10],  # Limit to 10 images
        satellite=satellite_url,
        activities=activities,
        climate=row['climate'] if 'climate' in row.keys() else None,
        nasa_validated=nasa_validated
    )

@app.get("/")
def read_root():
    return {
        "message": "Welcome to ParkSphere API - World Edition",
        "version": "3.0.0",
        "features": ["50 World National Parks", "NASA Validation", "NPS + Unsplash Images"]
    }

@app.get("/api/health")
def health_check():
    # Check if database exists
    db_exists = DB_PATH.exists()
    
    # Get some stats
    stats = {"parks": 0, "images": 0}
    if db_exists:
        conn = get_db()
        try:
            cursor = conn.execute("SELECT COUNT(*) as count FROM parks")
            stats["parks"] = cursor.fetchone()["count"]
            cursor = conn.execute("SELECT COUNT(*) as count FROM images")
            stats["images"] = cursor.fetchone()["count"]
        finally:
            conn.close()
    
    return {
        "status": "healthy",
        "database": "connected" if db_exists else "not found",
        "database_path": str(DB_PATH.name),
        "stats": stats
    }

@app.get("/api/parks", response_model=ParksList)
def get_parks(
    biome: Optional[str] = None,
    country: Optional[str] = None,
    limit: Optional[int] = None
):
    """Get all parks with optional filters"""
    conn = get_db()
    try:
        # Build query
        query = "SELECT * FROM parks WHERE 1=1"
        params = []
        
        if biome:
            query += " AND biome = ?"
            params.append(biome)
            
        if country:
            query += " AND country = ?"
            params.append(country)
            
        query += " ORDER BY id"
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        
        parks = []
        for row in rows:
            park = get_park_from_row(conn, row)
            parks.append(park)
        
        return ParksList(parks=parks, total=len(parks))
    finally:
        conn.close()

@app.get("/api/parks/{park_id}", response_model=Park)
def get_park(park_id: int):
    """Get a specific park by ID"""
    conn = get_db()
    try:
        cursor = conn.execute(
            "SELECT * FROM parks WHERE id = ?",
            (park_id,)
        )
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Park not found")
        
        return get_park_from_row(conn, row)
    finally:
        conn.close()

@app.get("/api/countries")
def get_countries():
    """Get list of countries with parks"""
    conn = get_db()
    try:
        cursor = conn.execute(
            "SELECT DISTINCT country, COUNT(*) as count FROM parks GROUP BY country ORDER BY count DESC"
        )
        rows = cursor.fetchall()
        
        return {
            "countries": [
                {"name": row['country'], "count": row['count']} 
                for row in rows
            ]
        }
    finally:
        conn.close()

@app.get("/api/biomes")
def get_biomes():
    """Get list of unique biomes"""
    conn = get_db()
    try:
        cursor = conn.execute(
            "SELECT DISTINCT biome, COUNT(*) as count FROM parks GROUP BY biome ORDER BY count DESC"
        )
        rows = cursor.fetchall()
        
        return {
            "biomes": [
                {"name": row['biome'], "count": row['count']} 
                for row in rows
            ]
        }
    finally:
        conn.close()

@app.get("/api/search")
def search_parks(q: str):
    """Search parks by name, country, or summary"""
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
    
    conn = get_db()
    try:
        cursor = conn.execute(
            """
            SELECT * FROM parks 
            WHERE name LIKE ? OR country LIKE ? OR summary LIKE ? 
            ORDER BY 
                CASE 
                    WHEN name LIKE ? THEN 1
                    WHEN country LIKE ? THEN 2
                    ELSE 3
                END,
                name
            """,
            (f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%")
        )
        rows = cursor.fetchall()
        
        parks = []
        for row in rows:
            park = get_park_from_row(conn, row)
            parks.append(park)
        
        return {"results": parks, "query": q, "total": len(parks)}
    finally:
        conn.close()

@app.get("/api/stats")
def get_stats():
    """Get statistics about the parks"""
    conn = get_db()
    try:
        stats = {}
        
        # Total parks
        cursor = conn.execute("SELECT COUNT(*) as count FROM parks")
        stats["total_parks"] = cursor.fetchone()["count"]
        
        # Total countries
        cursor = conn.execute("SELECT COUNT(DISTINCT country) as count FROM parks")
        stats["total_countries"] = cursor.fetchone()["count"]
        
        # Total area
        cursor = conn.execute("SELECT SUM(area_acres) as total FROM parks")
        stats["total_area_acres"] = cursor.fetchone()["total"]
        
        # Oldest park
        cursor = conn.execute("SELECT name, established FROM parks ORDER BY established ASC LIMIT 1")
        oldest = cursor.fetchone()
        stats["oldest_park"] = {"name": oldest["name"], "year": oldest["established"]}
        
        # Largest park
        cursor = conn.execute("SELECT name, area_acres FROM parks ORDER BY area_acres DESC LIMIT 1")
        largest = cursor.fetchone()
        stats["largest_park"] = {"name": largest["name"], "acres": largest["area_acres"]}
        
        # Parks by continent
        continent_map = {
            "United States": "North America",
            "Canada": "North America",
            "Costa Rica": "North America",
            "Colombia": "South America",
            "Ecuador": "South America",
            "Argentina": "South America",
            "Brazil": "South America",
            "Chile": "South America",
            "Bolivia": "South America",
            "Tanzania": "Africa",
            "South Africa": "Africa",
            "Zimbabwe": "Africa",
            "Zambia": "Africa",
            "Namibia": "Africa",
            "Uganda": "Africa",
            "Croatia": "Europe",
            "Switzerland": "Europe",
            "England": "Europe",
            "Scotland": "Europe",
            "Iceland": "Europe",
            "Portugal": "Europe",
            "Italy": "Europe",
            "Germany": "Europe",
            "Spain": "Europe",
            "Sweden": "Europe",
            "Turkey": "Europe/Asia",
            "Nepal": "Asia",
            "India": "Asia",
            "China": "Asia",
            "Japan": "Asia",
            "Thailand": "Asia",
            "Vietnam": "Asia",
            "Indonesia": "Asia",
            "Malaysia": "Asia",
            "South Korea": "Asia",
            "Bangladesh": "Asia",
            "Australia": "Oceania",
            "New Zealand": "Oceania"
        }
        
        cursor = conn.execute("SELECT country, COUNT(*) as count FROM parks GROUP BY country")
        continents = {}
        for row in cursor.fetchall():
            continent = continent_map.get(row["country"], "Other")
            continents[continent] = continents.get(continent, 0) + row["count"]
        
        stats["parks_by_continent"] = continents
        
        return stats
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)