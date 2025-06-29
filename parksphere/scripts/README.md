# ParkSphere Data Pipeline

This directory contains the build scripts that generate static data files for the ParkSphere application.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Generate all data files (recommended)
npm run build:all
```

## 📁 Generated Files

All generated data goes to `../client/public/`:

### Data Files (`/data/`)
- `parks.json` - Main parks database with trails and mascot info
- `search-index.json` - Search indices for park lookup  
- `manifest.json` - Data manifest with timestamps
- `build-report.json` - Build statistics
- `parks/[id]/` - Park-specific terrain and texture files

### Image Files (`/images/parks/[id]/`)
- `1.jpg` through `5.jpg` - Gallery images
- `satellite.webp` - Satellite texture
- `terrain.webp` - Terrain texture
- `normal.webp` - Normal map

## 🛠️ Available Scripts

```bash
npm run build:all          # Generate all static data
npm run generate:static    # Generate parks.json and search index
npm run generate:terrain   # Generate terrain meshes
npm run build:parks        # Generate parks data only
npm run build:textures     # Generate texture files
npm run clean             # Clean generated files
```

## 📊 Data Pipeline Architecture

```
scripts/
├── data-pipeline/
│   ├── build-all-data.js       # Main orchestrator
│   ├── generate-static-data.js # Parks JSON generator
│   ├── generate-terrain-data.js # Terrain mesh generator
│   ├── texture-processor.js    # Image processing
│   ├── terrain-processor.js    # Terrain mesh processor
│   ├── api-client.js          # External API integration
│   └── parks-seed.csv         # Source data
├── package.json
└── README.md
```

### Key Features
1. **Static Generation** - All data pre-built at compile time
2. **Terrain Processing** - Procedural mesh generation with 4 LOD levels
3. **Draco Compression** - 90% smaller 3D mesh files
4. **Placeholder Generation** - Automatic image/texture creation
5. **API Integration** - NPS, USGS, NASA, Wikipedia data
6. **Rate Limiting** - Respects API quotas automatically

## ⚙️ Configuration

Edit `data-pipeline/config.js` to modify:
- Number of parks to process
- Terrain mesh resolution
- Texture dimensions
- Output directories

## 🔧 Adding New Parks

1. Add park data to `data-pipeline/parks-data.json` or PARKS array in scripts
2. Include required fields: name, coordinates, biome, established
3. Add mascot info and trail data
4. Ensure API keys are configured in `.env`
5. Run `npm run build:all`
6. Verify files in `../client/public/data/`

## 📝 Data Format

### Parks JSON Structure
```json
{
  "parks": [{
    "id": 1,
    "code": "yose",
    "name": "Yosemite",
    "coordinates": { "lat": 37.8651, "lon": -119.5383 },
    "biome": "temperate_forest",
    "established": 1890,
    "area_acres": 759620,
    "activities": ["Hiking", "Rock Climbing"],
    "trails": [...],
    "mascot": {...}
  }]
}
```

### Output Structure
```
client/public/
├── data/
│   ├── parks.json          # Main database
│   ├── search-index.json   # Search indices
│   ├── manifest.json       # Build manifest
│   ├── build-report.json   # Build statistics
│   └── parks/
│       └── [park-code]/
│           ├── info.json
│           ├── terrain-lod0.draco  # Highest detail
│           ├── terrain-lod1.draco  # Medium detail
│           ├── terrain-lod2.draco  # Low detail
│           ├── terrain-lod3.draco  # Lowest detail
│           └── textures.json
└── images/
    └── parks/
        └── [park-code]/
            ├── 1.jpg through 5.jpg
            ├── satellite.webp
            ├── terrain.webp
            └── normal.webp
```

## 🚀 Performance

- Terrain meshes: ~50-200KB per LOD (Draco compressed)
- Textures: ~200-500KB each (WebP format)
- Total data: ~5-10MB for all 10 parks
- Build time: ~30-60 seconds

## 📋 Production Notes

- All data is static - no runtime API calls
- Designed for CDN deployment (immutable files)
- Compatible with Vercel/Render free tier
- Progressive loading supported via LOD system

## 🔧 Troubleshooting

- **Missing Draco files**: Copy decoders to `/client/public/draco/`
- **API rate limits**: Pipeline includes automatic rate limiting
- **Memory issues**: Process parks in batches if needed
- **Build errors**: Check `.env` file for required API keys