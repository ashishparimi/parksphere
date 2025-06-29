/**
 * Build All Data for National Parks Earth
 * Developer 1: Data Pipeline
 * 
 * Master script that generates all static data for the frontend
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import generateStaticData from './generate-static-data.js';
import generateTerrainData from './generate-terrain-data.js';
import TextureProcessor from './texture-processor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PARKS = [
  'yose', 'grca', 'yell', 'grsm', 'zion',
  'romo', 'acad', 'grte', 'olym', 'glac'
];

async function buildAllData() {
  console.log('🚀 Building all data for National Parks Earth\n');
  console.log('This will generate:');
  console.log('  - Static park data (parks.json)');
  console.log('  - Search indices');
  console.log('  - Terrain meshes (4 LOD levels per park)');
  console.log('  - Texture placeholders');
  console.log('  - Gallery images\n');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Generate static park data
    console.log('\n📊 Step 1: Generating static park data...');
    await generateStaticData();
    
    // Step 2: Generate terrain data
    console.log('\n🏔️  Step 2: Generating terrain data...');
    await generateTerrainData();
    
    // Step 3: Generate textures and gallery images
    console.log('\n🎨 Step 3: Generating textures and gallery images...');
    const textureProcessor = new TextureProcessor();
    
    for (const parkId of PARKS) {
      console.log(`\nProcessing images for ${parkId}...`);
      
      // Generate textures
      await textureProcessor.processTextures(parkId);
      
      // Generate gallery images
      const galleryImages = await textureProcessor.generateGalleryImages(parkId, 5);
      
      // Update park data with gallery images
      await updateParkGallery(parkId, galleryImages);
    }
    
    // Step 4: Generate final manifest
    console.log('\n📋 Step 4: Updating final manifest...');
    await updateFinalManifest();
    
    // Step 5: Generate build report
    console.log('\n📈 Step 5: Generating build report...');
    await generateBuildReport();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n✅ Build complete!');
    console.log(`⏱️  Total time: ${duration.toFixed(1)} seconds`);
    
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

async function updateParkGallery(parkId, galleryImages) {
  const parksJsonPath = path.join(__dirname, '../../client/public/data/parks.json');
  
  // Read current parks data
  const parksData = JSON.parse(await fs.readFile(parksJsonPath, 'utf-8'));
  
  // Find park by code
  const park = parksData.parks.find(p => p.code === parkId);
  if (park) {
    park.gallery = galleryImages;
  }
  
  // Write updated data
  await fs.writeFile(parksJsonPath, JSON.stringify(parksData, null, 2));
}

async function updateFinalManifest() {
  const manifestPath = path.join(__dirname, '../../client/public/data/manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  
  // Add build metadata
  manifest.build = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };
  
  // Update texture paths to use WebP for now
  for (const park of manifest.parks) {
    if (park.textures) {
      park.textures = {
        satellite: `/images/parks/${park.id}/satellite.webp`,
        terrain: `/images/parks/${park.id}/terrain.webp`,
        normal: `/images/parks/${park.id}/normal.webp`
      };
    }
  }
  
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

async function generateBuildReport() {
  const reportPath = path.join(__dirname, '../../client/public/data/build-report.json');
  const dataDir = path.join(__dirname, '../../client/public/data');
  
  // Calculate data sizes
  const sizes = {
    total: 0,
    parks: {},
    categories: {
      terrain: 0,
      textures: 0,
      metadata: 0
    }
  };
  
  // Get parks directory sizes
  const parksDir = path.join(dataDir, 'parks');
  const parkDirs = await fs.readdir(parksDir);
  
  for (const parkId of parkDirs) {
    const parkPath = path.join(parksDir, parkId);
    const files = await fs.readdir(parkPath);
    
    let parkSize = 0;
    for (const file of files) {
      const stats = await fs.stat(path.join(parkPath, file));
      parkSize += stats.size;
      
      if (file.includes('terrain')) {
        sizes.categories.terrain += stats.size;
      } else if (file.includes('texture')) {
        sizes.categories.textures += stats.size;
      } else {
        sizes.categories.metadata += stats.size;
      }
    }
    
    sizes.parks[parkId] = parkSize;
    sizes.total += parkSize;
  }
  
  // Add other files
  const rootFiles = ['parks.json', 'manifest.json', 'search-index.json'];
  for (const file of rootFiles) {
    try {
      const stats = await fs.stat(path.join(dataDir, file));
      sizes.total += stats.size;
      sizes.categories.metadata += stats.size;
    } catch (e) {
      // File might not exist
    }
  }
  
  const report = {
    generated: new Date().toISOString(),
    dataSize: {
      totalMB: (sizes.total / 1024 / 1024).toFixed(2),
      byPark: Object.entries(sizes.parks).reduce((acc, [id, size]) => {
        acc[id] = (size / 1024).toFixed(1) + ' KB';
        return acc;
      }, {}),
      byCategory: {
        terrainMB: (sizes.categories.terrain / 1024 / 1024).toFixed(2),
        texturesMB: (sizes.categories.textures / 1024 / 1024).toFixed(2),
        metadataKB: (sizes.categories.metadata / 1024).toFixed(1)
      }
    },
    files: {
      terrainMeshes: PARKS.length * 4, // 4 LODs per park
      textures: PARKS.length * 3,      // 3 textures per park
      galleryImages: PARKS.length * 5  // 5 gallery images per park
    }
  };
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📊 Build Report:');
  console.log(`  Total data size: ${report.dataSize.totalMB} MB`);
  console.log(`  Terrain meshes: ${report.dataSize.byCategory.terrainMB} MB`);
  console.log(`  Textures: ${report.dataSize.byCategory.texturesMB} MB`);
  console.log(`  Metadata: ${report.dataSize.byCategory.metadataKB} KB`);
}

// Add JSDOM polyfill for OffscreenCanvas
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
    buildAllData().catch(console.error);
  });
}

export default buildAllData;