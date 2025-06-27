# Missing Components for ParkSphere Build

## Critical Missing Items

### 1. Project Structure
- **parksphere/** directory (main project folder) - MISSING
- All subdirectories need to be created

### 2. Backend Components
- **server/main.py** - FastAPI application (MISSING)
- **server/requirements.txt** - Python dependencies (MISSING)
- **server/ingest/parks_mvp_seed.csv** - Seed data for 10 parks (MISSING)
- **server/ingest/fetch_assets_mvp.py** - Asset fetching script (MISSING)

### 3. Frontend Components  
- **client/** - Next.js project directory (MISSING)
- All frontend code needs to be created

### 4. Configuration Files
- **.env.template** - Environment variables template (MISSING)
- **config.py** - Configuration settings (MISSING)

### 5. Data Files
- Park seed data CSV with the 10 featured parks
- Mock gallery URLs and satellite image references

## Next Steps to Build

According to the 4-hour hackathon plan:

1. **Hour 1**: Create backend structure and FastAPI server with mock data
2. **Hour 2**: Initialize Next.js frontend with basic components
3. **Hour 3**: Implement 3D globe with React Three Fiber
4. **Hour 4**: Integration and polish

## Immediate Actions Required

1. Create `parksphere/` directory structure
2. Create park seed data CSV
3. Build FastAPI server with mock endpoints
4. Initialize Next.js project
5. Implement core features following the MVP plan