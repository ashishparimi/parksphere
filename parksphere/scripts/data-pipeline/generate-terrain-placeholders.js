#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import * as THREE from 'three';
import { DRACOExporter } from 'three/addons/exporters/DRACOExporter.js';

const OUTPUT_DIR = path.resolve('../../client/public/data/parks');

const PARKS = [
  'yose', 'grca', 'yell', 'grsm', 'zion',
  'romo', 'acad', 'grte', 'olym', 'glac'
];

// LOD configurations
const LOD_CONFIGS = [
  { level: 0, size: 64, scale: 1 },     // Highest detail
  { level: 1, size: 32, scale: 2 },     // Medium detail
  { level: 2, size: 16, scale: 4 },     // Low detail
  { level: 3, size: 8, scale: 8 }       // Lowest detail
];

async function generateTerrainMesh(lodConfig) {
  const { size, scale } = lodConfig;
  
  // Create a simple plane geometry with some noise for elevation
  const geometry = new THREE.PlaneGeometry(10 * scale, 10 * scale, size - 1, size - 1);
  
  // Add some procedural elevation
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    
    // Simple noise function for elevation
    const elevation = 
      Math.sin(x * 0.3) * 0.5 + 
      Math.cos(y * 0.3) * 0.5 +
      Math.sin(x * 0.1 + y * 0.1) * 0.2;
    
    positions.setZ(i, elevation);
  }
  
  // Update normals
  geometry.computeVertexNormals();
  
  // Create mesh for export
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  
  return mesh;
}

async function exportToDraco(mesh) {
  const exporter = new DRACOExporter();
  
  return new Promise((resolve, reject) => {
    exporter.parse(
      mesh,
      (buffer) => resolve(buffer),
      (error) => reject(error),
      {
        quantization: {
          position: 14,
          normal: 10,
          uv: 12
        }
      }
    );
  });
}

async function generateParkTerrain(parkCode) {
  console.log(`\n📍 Generating terrain for ${parkCode}...`);
  
  const parkDir = path.join(OUTPUT_DIR, parkCode);
  await fs.mkdir(parkDir, { recursive: true });
  
  for (const lodConfig of LOD_CONFIGS) {
    console.log(`  📐 Creating LOD ${lodConfig.level}...`);
    
    try {
      // Generate mesh
      const mesh = await generateTerrainMesh(lodConfig);
      
      // Export to Draco
      const dracoBuffer = await exportToDraco(mesh);
      
      // Save file
      const filename = `terrain-lod${lodConfig.level}.draco`;
      const filepath = path.join(parkDir, filename);
      await fs.writeFile(filepath, Buffer.from(dracoBuffer));
      
      console.log(`  ✅ Saved ${filename} (${(dracoBuffer.byteLength / 1024).toFixed(1)} KB)`);
    } catch (error) {
      console.error(`  ❌ Error generating LOD ${lodConfig.level}:`, error.message);
    }
  }
}

async function main() {
  console.log('🏔️  Generating placeholder terrain files...\n');
  
  for (const parkCode of PARKS) {
    await generateParkTerrain(parkCode);
  }
  
  console.log('\n✅ Terrain generation complete!');
}

main().catch(console.error);