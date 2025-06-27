from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import json
from pathlib import Path

app = FastAPI(title="ParkSphere API", version="2.0.0")

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

class Park(BaseModel):
    id: int
    name: str
    nps_code: str
    coordinates: Coordinates
    biome: str
    established: int
    area_acres: int
    summary: str
    gallery: List[GalleryImage]
    satellite: Optional[str] = None
    activities: Optional[List[str]] = []
    climate: Optional[str] = None

class ParksList(BaseModel):
    parks: List[Park]
    total: int

# Database path
DB_PATH = Path(__file__).parent / "parks.db"

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def get_park_images(conn, park_id: int, image_type: str = 'photo') -> List[GalleryImage]:
    """Get images for a park"""
    cursor = conn.execute(
        "SELECT * FROM images WHERE park_id = ? AND type = ? ORDER BY id",
        (park_id, image_type)
    )
    images = cursor.fetchall()
    
    gallery = []
    for img in images:
        gallery.append(GalleryImage(
            url=img['url'],
            blur=img['blur_hash'],
            attribution=img['attribution']
        ))
    
    return gallery

def get_park_from_row(conn, row) -> Park:
    """Convert database row to Park model"""
    # Get gallery images
    gallery = get_park_images(conn, row['id'], 'photo')
    
    # Get satellite image
    cursor = conn.execute(
        "SELECT url FROM images WHERE park_id = ? AND type = 'satellite' LIMIT 1",
        (row['id'],)
    )
    satellite_row = cursor.fetchone()
    satellite_url = satellite_row['url'] if satellite_row else None
    
    # Parse activities
    activities = json.loads(row['activities']) if row['activities'] else []
    
    return Park(
        id=row['id'],
        name=row['name'],
        nps_code=row['nps_code'],
        coordinates=Coordinates(
            lat=row['coordinates_lat'],
            lon=row['coordinates_lon']
        ),
        biome=row['biome'],
        established=row['established'],
        area_acres=row['area_acres'],
        summary=row['summary'],
        gallery=gallery,
        satellite=satellite_url,
        activities=activities,
        climate=row['climate']
    )

@app.get("/")
def read_root():
    return {"message": "Welcome to ParkSphere API v2.0"}

@app.get("/api/health")
def health_check():
    # Check if database exists
    db_exists = DB_PATH.exists()
    return {
        "status": "healthy",
        "database": "connected" if db_exists else "not found"
    }

@app.get("/api/parks", response_model=ParksList)
def get_parks(biome: Optional[str] = None):
    """Get all parks with optional biome filter"""
    conn = get_db()
    try:
        if biome:
            cursor = conn.execute(
                "SELECT * FROM parks WHERE biome = ? ORDER BY name",
                (biome,)
            )
        else:
            cursor = conn.execute("SELECT * FROM parks ORDER BY name")
        
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

@app.get("/api/parks/biome/{biome}", response_model=ParksList)
def get_parks_by_biome(biome: str):
    """Get parks filtered by biome"""
    return get_parks(biome=biome)

@app.get("/api/biomes")
def get_biomes():
    """Get list of unique biomes"""
    conn = get_db()
    try:
        cursor = conn.execute("SELECT DISTINCT biome FROM parks ORDER BY biome")
        rows = cursor.fetchall()
        
        return {
            "biomes": [row['biome'] for row in rows]
        }
    finally:
        conn.close()

@app.get("/api/search")
def search_parks(q: str):
    """Search parks by name or summary"""
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
    
    conn = get_db()
    try:
        cursor = conn.execute(
            """
            SELECT * FROM parks 
            WHERE name LIKE ? OR summary LIKE ? 
            ORDER BY name
            """,
            (f"%{q}%", f"%{q}%")
        )
        rows = cursor.fetchall()
        
        parks = []
        for row in rows:
            park = get_park_from_row(conn, row)
            parks.append(park)
        
        return {"results": parks, "query": q, "total": len(parks)}
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)