/**
 * Data Pipeline for National Parks Earth
 * Developer 1: Data & Build Pipeline Lead
 * 
 * ACTIVE DEVELOPMENT - DO NOT DELETE
 * Part of TWO_DEVELOPER_PLAN.md implementation
 * This module handles all data pre-processing for static deployment
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import APIClient from './api-client.js';
import TerrainProcessor from './terrain-processor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Park IDs for MVP (10 parks)
const PARKS = [
  { id: 'yosemite', name: 'Yosemite', bounds: { north: 38.1133, south: 37.4958, east: -119.2073, west: -119.8868 } },
  { id: 'grand-canyon', name: 'Grand Canyon', bounds: { north: 36.3482, south: 35.9735, east: -111.7383, west: -112.6019 } },
  { id: 'yellowstone', name: 'Yellowstone', bounds: { north: 45.1100, south: 44.1311, east: -109.8316, west: -111.1539 } },
  { id: 'great-smoky-mountains', name: 'Great Smoky Mountains', bounds: { north: 35.7117, south: 35.4310, east: -83.2067, west: -83.9467 } },
  { id: 'zion', name: 'Zion', bounds: { north: 37.5359, south: 37.1081, east: -112.8614, west: -113.2652 } },
  { id: 'rocky-mountain', name: 'Rocky Mountain', bounds: { north: 40.5008, south: 40.1580, east: -105.4933, west: -106.0606 } },
  { id: 'acadia', name: 'Acadia', bounds: { north: 44.4092, south: 44.1031, east: -68.0236, west: -68.4275 } },
  { id: 'grand-teton', name: 'Grand Teton', bounds: { north: 44.0052, south: 43.4900, east: -110.4803, west: -110.9025 } },
  { id: 'olympic', name: 'Olympic', bounds: { north: 48.0985, south: 47.5694, east: -123.4289, west: -124.7361 } },
  { id: 'glacier', name: 'Glacier', bounds: { north: 49.0000, south: 48.2350, east: -113.2475, west: -114.5088 } }
];

class ParkDataPipeline {
  constructor() {
    this.outputDir = path.join(__dirname, '../../client/public/data');
    this.tempDir = path.join(__dirname, '../../temp');
    this.apiClient = new APIClient();
    this.terrainProcessor = new TerrainProcessor();
  }

  async initialize() {
    // Create necessary directories
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.tempDir, { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'parks'), { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'globe'), { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'textures'), { recursive: true });
  }

  async ingestPark(parkId) {
    console.log(`\n🏔️  Processing ${parkId}...`);
    
    try {
      // 1. Fetch from APIs (respecting rate limits)
      const npsData = await this.fetchNPS(parkId);
      const elevation = await this.fetchUSGS(parkId);
      const imagery = await this.fetchNASA(parkId);
      const wikiData = await this.fetchWikipedia(parkId);
      
      // 2. Generate high-quality terrain mesh
      const terrain = await this.generateTerrain(elevation, {
        resolution: 10, // 10m resolution
        levels: [0, 1, 2, 3], // Multiple LODs
        smoothing: true,
        normalMaps: true
      });
      
      // 3. Process textures
      const textures = await this.processTextures(imagery, {
        satellite: { size: 4096, format: 'ktx2' },
        terrain: { size: 2048, format: 'ktx2' },
        normal: { size: 2048, format: 'ktx2' }
      });
      
      // 4. Optimize for web
      const optimized = await this.optimize({ 
        terrain, 
        textures, 
        metadata: {
          ...npsData,
          wikipedia: wikiData,
          bounds: this.getParkBounds(parkId)
        }
      });
      
      // 5. Save to public directory
      await this.saveParkData(parkId, optimized);
      
      console.log(`✅ ${parkId} processed successfully`);
      return optimized;
      
    } catch (error) {
      console.error(`❌ Error processing ${parkId}:`, error.message);
      throw error;
    }
  }

  async fetchNPS(parkId) {
    // Mock implementation for now - will integrate with real NPS API
    console.log(`  📡 Fetching NPS data for ${parkId}...`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const parkInfo = PARKS.find(p => p.id === parkId);
    return {
      id: parkId,
      name: parkInfo.name,
      description: `${parkInfo.name} National Park is a stunning natural wonder.`,
      established: 1900 + Math.floor(Math.random() * 100),
      area: Math.floor(Math.random() * 1000000) + 100000,
      visitors: Math.floor(Math.random() * 5000000) + 1000000,
      activities: ['Hiking', 'Camping', 'Wildlife Viewing', 'Photography'],
      entranceFees: {
        vehicle: 35,
        motorcycle: 30,
        individual: 20
      }
    };
  }

  async fetchUSGS(parkId) {
    // Mock elevation data - will integrate with USGS elevation API
    console.log(`  📡 Fetching USGS elevation data for ${parkId}...`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const park = PARKS.find(p => p.id === parkId);
    const { north, south, east, west } = park.bounds;
    
    // Generate mock elevation grid (will be replaced with real data)
    const resolution = 0.001; // ~100m
    const width = Math.ceil((east - west) / resolution);
    const height = Math.ceil((north - south) / resolution);
    
    const elevationData = {
      bounds: park.bounds,
      width,
      height,
      resolution,
      data: new Float32Array(width * height)
    };
    
    // Generate realistic terrain (placeholder)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        // Simple noise-based terrain
        elevationData.data[idx] = 1000 + Math.sin(x * 0.1) * 500 + Math.cos(y * 0.1) * 300;
      }
    }
    
    return elevationData;
  }

  async fetchNASA(parkId) {
    // Mock satellite imagery - will integrate with NASA Earthdata
    console.log(`  📡 Fetching NASA satellite imagery for ${parkId}...`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      satelliteImageUrl: `/placeholder/satellite-${parkId}.jpg`,
      captureDate: new Date().toISOString(),
      cloudCoverage: Math.random() * 0.1,
      resolution: 30 // meters per pixel
    };
  }

  async fetchWikipedia(parkId) {
    // Mock Wikipedia data - will integrate with Wikipedia API
    console.log(`  📡 Fetching Wikipedia data for ${parkId}...`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const park = PARKS.find(p => p.id === parkId);
    return {
      summary: `${park.name} National Park is renowned for its natural beauty and diverse ecosystems.`,
      url: `https://en.wikipedia.org/wiki/${park.name.replace(/ /g, '_')}_National_Park`
    };
  }

  async generateTerrain(elevationData, options) {
    console.log(`  🏔️  Generating terrain mesh...`);
    
    // This will be replaced with actual terrain generation using Three.js
    // For now, return mock terrain data structure
    const terrainMeshes = {};
    
    for (const lod of options.levels) {
      const decimation = Math.pow(2, lod);
      const width = Math.ceil(elevationData.width / decimation);
      const height = Math.ceil(elevationData.height / decimation);
      
      terrainMeshes[`lod${lod}`] = {
        vertices: new Float32Array(width * height * 3),
        normals: new Float32Array(width * height * 3),
        uvs: new Float32Array(width * height * 2),
        indices: new Uint32Array((width - 1) * (height - 1) * 6),
        bounds: elevationData.bounds,
        resolution: elevationData.resolution * decimation
      };
    }
    
    return terrainMeshes;
  }

  async processTextures(imagery, options) {
    console.log(`  🎨 Processing textures...`);
    
    // Mock texture processing - will use sharp/canvas for real implementation
    return {
      satellite: {
        url: imagery.satelliteImageUrl,
        size: options.satellite.size,
        format: options.satellite.format
      },
      terrain: {
        url: `/textures/terrain-base.ktx2`,
        size: options.terrain.size,
        format: options.terrain.format
      },
      normal: {
        url: `/textures/terrain-normal.ktx2`,
        size: options.normal.size,
        format: options.normal.format
      }
    };
  }

  async optimize(data) {
    console.log(`  ⚡ Optimizing assets...`);
    
    // This will implement Draco compression, texture optimization, etc.
    return {
      terrain: data.terrain,
      textures: data.textures,
      metadata: data.metadata,
      fileSize: {
        terrain: Object.keys(data.terrain).reduce((acc, lod) => {
          acc[lod] = Math.floor(Math.random() * 1000) + 50; // KB
          return acc;
        }, {}),
        textures: {
          satellite: 500,
          terrain: 200,
          normal: 150
        }
      }
    };
  }

  async saveParkData(parkId, data) {
    const parkDir = path.join(this.outputDir, 'parks', parkId);
    await fs.mkdir(parkDir, { recursive: true });
    
    // Save metadata
    await fs.writeFile(
      path.join(parkDir, 'info.json'),
      JSON.stringify(data.metadata, null, 2)
    );
    
    // Save terrain LODs (will be Draco compressed)
    for (const [lod, mesh] of Object.entries(data.terrain)) {
      await fs.writeFile(
        path.join(parkDir, `terrain-${lod}.json`),
        JSON.stringify({
          type: 'terrain',
          lod,
          bounds: mesh.bounds,
          resolution: mesh.resolution,
          vertexCount: mesh.vertices.length / 3
        }, null, 2)
      );
    }
    
    // Save texture references
    await fs.writeFile(
      path.join(parkDir, 'textures.json'),
      JSON.stringify(data.textures, null, 2)
    );
  }

  getParkBounds(parkId) {
    const park = PARKS.find(p => p.id === parkId);
    return park ? park.bounds : null;
  }

  async ingestAllParks() {
    console.log('🚀 Starting National Parks Earth data ingestion...\n');
    
    await this.initialize();
    
    const results = [];
    for (const park of PARKS) {
      try {
        const result = await this.ingestPark(park.id);
        results.push({ parkId: park.id, success: true, data: result });
      } catch (error) {
        results.push({ parkId: park.id, success: false, error: error.message });
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate search index
    await this.generateSearchIndex(results.filter(r => r.success));
    
    // Generate data manifest
    await this.generateManifest(results);
    
    console.log('\n📊 Ingestion Summary:');
    console.log(`✅ Success: ${results.filter(r => r.success).length}`);
    console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
    
    return results;
  }

  async generateSearchIndex(parks) {
    console.log('\n🔍 Generating search index...');
    
    const searchData = parks.map(p => ({
      id: p.data.metadata.id,
      name: p.data.metadata.name,
      description: p.data.metadata.description,
      activities: p.data.metadata.activities,
      searchText: `${p.data.metadata.name} ${p.data.metadata.description} ${p.data.metadata.activities.join(' ')}`
    }));
    
    await fs.writeFile(
      path.join(this.outputDir, 'search-index.json'),
      JSON.stringify(searchData, null, 2)
    );
  }

  async generateManifest(results) {
    console.log('📋 Generating data manifest...');
    
    const manifest = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      parks: results.map(r => ({
        id: r.parkId,
        success: r.success,
        files: r.success ? {
          info: `/data/parks/${r.parkId}/info.json`,
          terrain: {
            lod0: `/data/parks/${r.parkId}/terrain-lod0.draco`,
            lod1: `/data/parks/${r.parkId}/terrain-lod1.draco`,
            lod2: `/data/parks/${r.parkId}/terrain-lod2.draco`,
            lod3: `/data/parks/${r.parkId}/terrain-lod3.draco`
          },
          textures: `/data/parks/${r.parkId}/textures.json`
        } : null
      }))
    };
    
    await fs.writeFile(
      path.join(this.outputDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const pipeline = new ParkDataPipeline();
  pipeline.ingestAllParks().catch(console.error);
}

export default ParkDataPipeline;