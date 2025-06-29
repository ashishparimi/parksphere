#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

const OUTPUT_DIR = path.resolve('../../client/public/data/parks');

const PARKS = [
  'yose', 'grca', 'yell', 'grsm', 'zion',
  'romo', 'acad', 'grte', 'olym', 'glac'
];

// Create a simple binary file that represents a terrain mesh
// This is a placeholder that the frontend can detect
async function createPlaceholderTerrain(size) {
  // Header: Magic number "DRACO" + version + vertex count
  const header = Buffer.from('DRACO100', 'utf8');
  const vertexCount = size * size;
  const vertexBuffer = Buffer.allocUnsafe(4);
  vertexBuffer.writeUInt32LE(vertexCount, 0);
  
  // Create some dummy vertex data
  const vertices = Buffer.allocUnsafe(vertexCount * 3 * 4); // 3 floats per vertex
  for (let i = 0; i < vertexCount; i++) {
    const offset = i * 12; // 3 floats * 4 bytes
    vertices.writeFloatLE(Math.random() * 10 - 5, offset);     // x
    vertices.writeFloatLE(Math.random() * 10 - 5, offset + 4); // y
    vertices.writeFloatLE(Math.random() * 2, offset + 8);      // z (elevation)
  }
  
  return Buffer.concat([header, vertexBuffer, vertices]);
}

async function generateParkTerrain(parkCode) {
  console.log(`📍 Generating terrain for ${parkCode}...`);
  
  const parkDir = path.join(OUTPUT_DIR, parkCode);
  await fs.mkdir(parkDir, { recursive: true });
  
  const lodSizes = [64, 32, 16, 8]; // Decreasing detail levels
  
  for (let lod = 0; lod < 4; lod++) {
    const size = lodSizes[lod];
    console.log(`  📐 Creating LOD ${lod} (${size}x${size})...`);
    
    try {
      const data = await createPlaceholderTerrain(size);
      const filename = `terrain-lod${lod}.draco`;
      const filepath = path.join(parkDir, filename);
      
      await fs.writeFile(filepath, data);
      console.log(`  ✅ Saved ${filename} (${(data.length / 1024).toFixed(1)} KB)`);
    } catch (error) {
      console.error(`  ❌ Error generating LOD ${lod}:`, error.message);
    }
  }
}

async function main() {
  console.log('🏔️  Generating terrain placeholder files...\n');
  
  for (const parkCode of PARKS) {
    await generateParkTerrain(parkCode);
  }
  
  console.log('\n✅ Terrain generation complete!');
}

main().catch(console.error);