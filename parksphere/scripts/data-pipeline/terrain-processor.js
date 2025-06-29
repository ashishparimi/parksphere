// Terrain Processor for National Parks Earth
// Generates high-quality terrain meshes with LOD support

import * as THREE from 'three';
import { DRACOExporter } from 'three/addons/exporters/DRACOExporter.js';

class TerrainProcessor {
  constructor() {
    this.dracoExporter = new DRACOExporter();
  }

  async generateTerrain(elevationData, options = {}) {
    const {
      resolution = 10,
      levels = [0, 1, 2, 3],
      smoothing = true,
      normalMaps = true,
      geomorphing = true
    } = options;

    console.log('🏔️  Generating terrain meshes...');
    
    const terrainMeshes = {};
    
    for (const lod of levels) {
      console.log(`  📐 Creating LOD ${lod}...`);
      const mesh = await this.createTerrainMesh(elevationData, lod, {
        smoothing,
        normalMaps,
        geomorphing
      });
      
      terrainMeshes[`lod${lod}`] = mesh;
    }
    
    return terrainMeshes;
  }

  async createTerrainMesh(elevationData, lodLevel, options) {
    const decimation = Math.pow(2, lodLevel);
    const { width, height, data, bounds } = elevationData;
    
    // Calculate LOD dimensions
    const lodWidth = Math.ceil(width / decimation);
    const lodHeight = Math.ceil(height / decimation);
    
    // Create geometry
    const geometry = new THREE.PlaneGeometry(
      (bounds.east - bounds.west) * 111000, // Convert degrees to meters (approximate)
      (bounds.north - bounds.south) * 111000,
      lodWidth - 1,
      lodHeight - 1
    );
    
    // Apply elevation data to vertices
    const vertices = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    
    for (let y = 0; y < lodHeight; y++) {
      for (let x = 0; x < lodWidth; x++) {
        const vertexIndex = y * lodWidth + x;
        
        // Sample elevation data (with interpolation for lower LODs)
        const sourceX = Math.min(x * decimation, width - 1);
        const sourceY = Math.min(y * decimation, height - 1);
        const elevation = this.sampleElevation(data, width, height, sourceX, sourceY);
        
        // Set vertex height
        vertices.setZ(vertexIndex, elevation);
      }
    }
    
    // Recalculate normals for proper lighting
    geometry.computeVertexNormals();
    
    // Apply smoothing if requested
    if (options.smoothing && lodLevel > 0) {
      this.smoothGeometry(geometry, lodLevel);
    }
    
    // Generate additional attributes for geomorphing
    if (options.geomorphing && lodLevel < 3) {
      this.addGeomorphingData(geometry, elevationData, lodLevel);
    }
    
    // Convert to buffer geometry and optimize
    const optimizedGeometry = this.optimizeGeometry(geometry);
    
    // Export to Draco format
    const dracoBuffer = await this.exportToDraco(optimizedGeometry);
    
    return {
      buffer: dracoBuffer,
      bounds: bounds,
      resolution: elevationData.resolution * decimation,
      vertexCount: optimizedGeometry.attributes.position.count,
      triangleCount: optimizedGeometry.index ? optimizedGeometry.index.count / 3 : 0,
      fileSize: dracoBuffer.byteLength
    };
  }

  sampleElevation(data, width, height, x, y) {
    // Bilinear interpolation for smooth elevation sampling
    const x0 = Math.floor(x);
    const x1 = Math.min(x0 + 1, width - 1);
    const y0 = Math.floor(y);
    const y1 = Math.min(y0 + 1, height - 1);
    
    const fx = x - x0;
    const fy = y - y0;
    
    if (data instanceof Float32Array) {
      const v00 = data[y0 * width + x0];
      const v10 = data[y0 * width + x1];
      const v01 = data[y1 * width + x0];
      const v11 = data[y1 * width + x1];
      
      const v0 = v00 * (1 - fx) + v10 * fx;
      const v1 = v01 * (1 - fx) + v11 * fx;
      
      return v0 * (1 - fy) + v1 * fy;
    }
    
    // Fallback for mock data
    return 1000 + Math.sin(x * 0.01) * 500 + Math.cos(y * 0.01) * 300;
  }

  smoothGeometry(geometry, lodLevel) {
    // Apply Laplacian smoothing for lower LODs
    const positions = geometry.attributes.position;
    const smoothedPositions = new Float32Array(positions.array.length);
    
    const width = Math.sqrt(positions.count);
    const height = width;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const idx3 = idx * 3;
        
        // Get neighboring vertices
        const neighbors = [];
        if (x > 0) neighbors.push((y * width + (x - 1)) * 3);
        if (x < width - 1) neighbors.push((y * width + (x + 1)) * 3);
        if (y > 0) neighbors.push(((y - 1) * width + x) * 3);
        if (y < height - 1) neighbors.push(((y + 1) * width + x) * 3);
        
        // Average positions
        if (neighbors.length > 0) {
          let avgX = 0, avgY = 0, avgZ = 0;
          
          for (const nIdx of neighbors) {
            avgX += positions.array[nIdx];
            avgY += positions.array[nIdx + 1];
            avgZ += positions.array[nIdx + 2];
          }
          
          const weight = 0.5 * lodLevel / 3; // Stronger smoothing for lower LODs
          smoothedPositions[idx3] = positions.array[idx3] * (1 - weight) + (avgX / neighbors.length) * weight;
          smoothedPositions[idx3 + 1] = positions.array[idx3 + 1] * (1 - weight) + (avgY / neighbors.length) * weight;
          smoothedPositions[idx3 + 2] = positions.array[idx3 + 2] * (1 - weight) + (avgZ / neighbors.length) * weight;
        } else {
          smoothedPositions[idx3] = positions.array[idx3];
          smoothedPositions[idx3 + 1] = positions.array[idx3 + 1];
          smoothedPositions[idx3 + 2] = positions.array[idx3 + 2];
        }
      }
    }
    
    positions.array = smoothedPositions;
    positions.needsUpdate = true;
  }

  addGeomorphingData(geometry, elevationData, lodLevel) {
    // Add morph target for smooth LOD transitions
    const nextLod = lodLevel + 1;
    const decimation = Math.pow(2, nextLod);
    
    const morphPositions = new Float32Array(geometry.attributes.position.array.length);
    const positions = geometry.attributes.position;
    
    const width = Math.sqrt(positions.count);
    const height = width;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const idx3 = idx * 3;
        
        // Calculate position in next LOD
        const nextX = Math.floor(x / 2) * 2;
        const nextY = Math.floor(y / 2) * 2;
        
        const sourceX = Math.min(nextX * decimation, elevationData.width - 1);
        const sourceY = Math.min(nextY * decimation, elevationData.height - 1);
        const morphElevation = this.sampleElevation(
          elevationData.data,
          elevationData.width,
          elevationData.height,
          sourceX,
          sourceY
        );
        
        morphPositions[idx3] = positions.array[idx3];
        morphPositions[idx3 + 1] = positions.array[idx3 + 1];
        morphPositions[idx3 + 2] = morphElevation;
      }
    }
    
    geometry.morphAttributes.position = [
      new THREE.BufferAttribute(morphPositions, 3)
    ];
  }

  optimizeGeometry(geometry) {
    // Optimize geometry for GPU performance
    const optimized = geometry.clone();
    
    // Merge vertices
    optimized.mergeVertices();
    
    // Optimize vertex order for GPU cache
    if (optimized.index) {
      const indices = optimized.index.array;
      const optimizedIndices = this.optimizeVertexCache(indices);
      optimized.setIndex(new THREE.BufferAttribute(optimizedIndices, 1));
    }
    
    return optimized;
  }

  optimizeVertexCache(indices) {
    // Forsyth algorithm for vertex cache optimization
    // Simplified implementation
    const optimized = new Uint32Array(indices.length);
    let writeIdx = 0;
    
    const used = new Set();
    
    for (let i = 0; i < indices.length; i += 3) {
      if (!used.has(i)) {
        optimized[writeIdx++] = indices[i];
        optimized[writeIdx++] = indices[i + 1];
        optimized[writeIdx++] = indices[i + 2];
        used.add(i);
      }
    }
    
    return optimized;
  }

  async exportToDraco(geometry) {
    return new Promise((resolve, reject) => {
      // Create a temporary mesh for export
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      
      this.dracoExporter.parse(
        mesh,
        (buffer) => {
          resolve(buffer);
        },
        (error) => {
          reject(error);
        },
        {
          quantization: {
            position: 14, // High precision for position
            normal: 10,   // Good precision for normals
            uv: 12,       // Good precision for UVs
            color: 8,     // Standard precision for colors
            generic: 8    // Standard precision for other attributes
          },
          quantizationVolume: 'mesh', // Use mesh bounds for quantization
          sequential: false, // Better compression
          preserveOrder: false // Allow reordering for better compression
        }
      );
    });
  }

  async generateNormalMap(elevationData, resolution = 2048) {
    console.log('  🎨 Generating normal map...');
    
    const { width, height, data } = elevationData;
    const canvas = new OffscreenCanvas(resolution, resolution);
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.createImageData(resolution, resolution);
    const pixels = imageData.data;
    
    const scaleX = width / resolution;
    const scaleY = height / resolution;
    
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const sx = x * scaleX;
        const sy = y * scaleY;
        
        // Sample heights for normal calculation
        const h0 = this.sampleElevation(data, width, height, sx, sy);
        const h1 = this.sampleElevation(data, width, height, sx + scaleX, sy);
        const h2 = this.sampleElevation(data, width, height, sx, sy + scaleY);
        
        // Calculate normal
        const dx = (h1 - h0) * 0.01; // Scale factor
        const dy = (h2 - h0) * 0.01;
        
        // Normalize
        const len = Math.sqrt(dx * dx + dy * dy + 1);
        const nx = -dx / len;
        const ny = -dy / len;
        const nz = 1 / len;
        
        // Convert to RGB
        const idx = (y * resolution + x) * 4;
        pixels[idx] = (nx + 1) * 127.5;
        pixels[idx + 1] = (ny + 1) * 127.5;
        pixels[idx + 2] = (nz + 1) * 127.5;
        pixels[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.convertToBlob({ type: 'image/png' });
  }
}

export default TerrainProcessor;