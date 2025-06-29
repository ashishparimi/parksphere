/**
 * Generate Terrain Data for Parks
 * Developer 1: Data Pipeline
 * 
 * This script generates Draco-compressed terrain meshes for each park
 * Creates LOD levels 0-3 as expected by the DataLoader
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import TerrainProcessor from './terrain-processor.js';
import APIClient from './api-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Park configurations with accurate bounds
const PARKS = [
  { 
    id: 'yose',
    name: 'Yosemite',
    bounds: { north: 38.1133, south: 37.4958, east: -119.2073, west: -119.8868 },
    center: { lat: 37.8651, lon: -119.5383 }
  },
  {
    id: 'grca',
    name: 'Grand Canyon',
    bounds: { north: 36.3482, south: 35.9735, east: -111.7383, west: -112.6019 },
    center: { lat: 36.1069, lon: -112.1129 }
  },
  {
    id: 'yell',
    name: 'Yellowstone',
    bounds: { north: 45.1100, south: 44.1311, east: -109.8316, west: -111.1539 },
    center: { lat: 44.4280, lon: -110.5885 }
  },
  {
    id: 'grsm',
    name: 'Great Smoky Mountains',
    bounds: { north: 35.7117, south: 35.4310, east: -83.2067, west: -83.9467 },
    center: { lat: 35.6131, lon: -83.5532 }
  },
  {
    id: 'zion',
    name: 'Zion',
    bounds: { north: 37.5359, south: 37.1081, east: -112.8614, west: -113.2652 },
    center: { lat: 37.2982, lon: -113.0263 }
  },
  {
    id: 'romo',
    name: 'Rocky Mountain',
    bounds: { north: 40.5008, south: 40.1580, east: -105.4933, west: -106.0606 },
    center: { lat: 40.3428, lon: -105.6836 }
  },
  {
    id: 'acad',
    name: 'Acadia',
    bounds: { north: 44.4092, south: 44.1031, east: -68.0236, west: -68.4275 },
    center: { lat: 44.3386, lon: -68.2733 }
  },
  {
    id: 'grte',
    name: 'Grand Teton',
    bounds: { north: 44.0052, south: 43.4900, east: -110.4803, west: -110.9025 },
    center: { lat: 43.7904, lon: -110.6818 }
  },
  {
    id: 'olym',
    name: 'Olympic',
    bounds: { north: 48.0985, south: 47.5694, east: -123.4289, west: -124.7361 },
    center: { lat: 47.8021, lon: -123.6044 }
  },
  {
    id: 'glac',
    name: 'Glacier',
    bounds: { north: 49.0000, south: 48.2350, east: -113.2475, west: -114.5088 },
    center: { lat: 48.6961, lon: -113.7185 }
  }
];

async function generateTerrainData() {
  console.log('🏔️  Generating terrain data for all parks...\n');
  
  const terrainProcessor = new TerrainProcessor();
  const apiClient = new APIClient();
  const outputDir = path.join(__dirname, '../../client/public/data');
  
  // Process each park
  for (const park of PARKS) {
    console.log(`\n📍 Processing ${park.name}...`);
    
    try {
      // Create park directory
      const parkDir = path.join(outputDir, 'parks', park.id);
      await fs.mkdir(parkDir, { recursive: true });
      
      // Get elevation data (using mock data for now)
      const elevationData = await apiClient.fetchUSGSElevation(park.bounds);
      
      // Generate terrain meshes with LODs
      const terrainMeshes = await terrainProcessor.generateTerrain(elevationData, {
        resolution: 10,
        levels: [0, 1, 2, 3],
        smoothing: true,
        normalMaps: true,
        geomorphing: true
      });
      
      // Save Draco files
      for (const [lodKey, meshData] of Object.entries(terrainMeshes)) {
        const lodNumber = lodKey.replace('lod', '');
        const filename = `terrain-lod${lodNumber}.draco`;
        
        await fs.writeFile(
          path.join(parkDir, filename),
          Buffer.from(meshData.buffer)
        );
        
        console.log(`  ✅ Generated ${filename} (${(meshData.fileSize / 1024).toFixed(1)} KB)`);
      }
      
      // Generate texture references
      const textureData = {
        satellite: `/images/parks/${park.id}/satellite.ktx2`,
        terrain: `/images/parks/${park.id}/terrain.ktx2`,
        normal: `/images/parks/${park.id}/normal.ktx2`
      };
      
      await fs.writeFile(
        path.join(parkDir, 'textures.json'),
        JSON.stringify(textureData, null, 2)
      );
      
      // Update park info with terrain metadata
      const infoPath = path.join(parkDir, 'info.json');
      let parkInfo = {};
      
      try {
        const existingInfo = await fs.readFile(infoPath, 'utf-8');
        parkInfo = JSON.parse(existingInfo);
      } catch (e) {
        // File doesn't exist yet
      }
      
      parkInfo = {
        ...parkInfo,
        id: park.id,
        name: park.name,
        bounds: park.bounds,
        center: park.center,
        terrainFiles: {
          lod0: `/data/parks/${park.id}/terrain-lod0.draco`,
          lod1: `/data/parks/${park.id}/terrain-lod1.draco`,
          lod2: `/data/parks/${park.id}/terrain-lod2.draco`,
          lod3: `/data/parks/${park.id}/terrain-lod3.draco`
        },
        textures: textureData
      };
      
      await fs.writeFile(infoPath, JSON.stringify(parkInfo, null, 2));
      
    } catch (error) {
      console.error(`❌ Error processing ${park.name}:`, error.message);
    }
  }
  
  // Update manifest with park data
  await updateManifest(PARKS);
  
  console.log('\n✅ Terrain generation complete!');
}

async function updateManifest(parks) {
  const outputDir = path.join(__dirname, '../../client/public/data');
  const manifestPath = path.join(outputDir, 'manifest.json');
  
  let manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    parks: []
  };
  
  // Try to load existing manifest
  try {
    const existing = await fs.readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(existing);
  } catch (e) {
    // Manifest doesn't exist yet
  }
  
  // Update with park data
  manifest.parks = await Promise.all(parks.map(async (park) => {
    const infoPath = path.join(outputDir, 'parks', park.id, 'info.json');
    
    try {
      const info = await fs.readFile(infoPath, 'utf-8');
      return JSON.parse(info);
    } catch (e) {
      // Return basic structure if info doesn't exist
      return {
        id: park.id,
        name: park.name,
        bounds: park.bounds,
        center: park.center,
        terrainFiles: {
          lod0: `/data/parks/${park.id}/terrain-lod0.draco`,
          lod1: `/data/parks/${park.id}/terrain-lod1.draco`,
          lod2: `/data/parks/${park.id}/terrain-lod2.draco`,
          lod3: `/data/parks/${park.id}/terrain-lod3.draco`
        },
        textures: {
          satellite: `/images/parks/${park.id}/satellite.ktx2`,
          terrain: `/images/parks/${park.id}/terrain.ktx2`,
          normal: `/images/parks/${park.id}/normal.ktx2`
        }
      };
    }
  }));
  
  // Update generated timestamp
  manifest.generated = new Date().toISOString();
  
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('📋 Updated manifest.json');
}

// Add JSDOM polyfill for OffscreenCanvas (needed for terrain processor)
async function setupEnvironment() {
  if (typeof OffscreenCanvas === 'undefined') {
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM();
    global.OffscreenCanvas = dom.window.OffscreenCanvas;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupEnvironment().then(() => {
    generateTerrainData().catch(console.error);
  });
}

export default generateTerrainData;