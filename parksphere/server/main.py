from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import csv
import json
from pathlib import Path

app = FastAPI(title="ParkSphere API", version="1.0.0")

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
    satellite: str

def load_parks_data():
    parks = []
    csv_path = Path(__file__).parent / "ingest" / "parks_mvp_seed.csv"
    
    with open(csv_path, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            gallery = []
            for i in range(5):
                gallery.append(GalleryImage(
                    url=f"https://picsum.photos/seed/park{row['id']}-{i}/1920/1080",
                    blur=f"https://picsum.photos/seed/park{row['id']}-{i}/32/32?blur=10"
                ))
            
            park = Park(
                id=int(row['id']),
                name=row['name'],
                nps_code=row['nps_code'],
                coordinates=Coordinates(lat=float(row['latitude']), lon=float(row['longitude'])),
                biome=row['biome'],
                established=int(row['established']),
                area_acres=int(row['area_acres']),
                summary=row['summary'],
                gallery=gallery,
                satellite=f"https://picsum.photos/seed/sat{row['id']}/800/600"
            )
            parks.append(park)
    
    return parks

PARKS_DATA = load_parks_data()

@app.get("/")
def read_root():
    return {"message": "Welcome to ParkSphere API", "version": "1.0.0"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "parks_loaded": len(PARKS_DATA)}

@app.get("/api/parks", response_model=List[Park])
def get_parks(limit: Optional[int] = None, biome: Optional[str] = None):
    parks = PARKS_DATA
    
    if biome:
        parks = [p for p in parks if p.biome == biome]
    
    if limit:
        parks = parks[:limit]
    
    return parks

@app.get("/api/parks/{park_id}", response_model=Park)
def get_park(park_id: int):
    park = next((p for p in PARKS_DATA if p.id == park_id), None)
    
    if not park:
        raise HTTPException(status_code=404, detail="Park not found")
    
    return park

@app.get("/api/parks/biome/{biome}", response_model=List[Park])
def get_parks_by_biome(biome: str):
    parks = [p for p in PARKS_DATA if p.biome == biome]
    
    if not parks:
        raise HTTPException(status_code=404, detail=f"No parks found with biome: {biome}")
    
    return parks

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)