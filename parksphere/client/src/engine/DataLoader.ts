import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';

export interface ParkData {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center: {
    lat: number;
    lon: number;
  };
  info: {
    description: string;
    activities: string[];
    entranceFees: Array<{ title: string; cost: string }>;
    wikipediaSummary: string;
    wikipediaUrl: string;
  };
  terrainFiles: {
    lod0: string;
    lod1: string;
    lod2: string;
    lod3: string;
  };
  textures: {
    satellite: string;
    terrain: string;
    normal: string;
  };
}

export interface DataManifest {
  version: string;
  generated: string;
  parks: ParkData[];
}

export class DataLoader {
  private dracoLoader: DRACOLoader;
  private ktx2Loader: KTX2Loader;
  private textureLoader: THREE.TextureLoader;
  private renderer: THREE.WebGLRenderer;
  private cache: Map<string, any>;
  
  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.cache = new Map();
    
    // Initialize Draco loader
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/');
    this.dracoLoader.setDecoderConfig({ type: 'js' });
    
    // Initialize KTX2 loader
    this.ktx2Loader = new KTX2Loader();
    this.ktx2Loader.setTranscoderPath('/basis/');
    this.ktx2Loader.detectSupport(renderer);
    
    // Standard texture loader
    this.textureLoader = new THREE.TextureLoader();
  }
  
  /**
   * Load the data manifest
   */
  public async loadManifest(): Promise<DataManifest> {
    const cacheKey = 'manifest';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const response = await fetch('/data/manifest.json');
      const manifest = await response.json();
      this.cache.set(cacheKey, manifest);
      return manifest;
    } catch (error) {
      console.error('Failed to load manifest:', error);
      // Return empty manifest as fallback
      return {
        version: '1.0.0',
        generated: new Date().toISOString(),
        parks: []
      };
    }
  }
  
  /**
   * Load park metadata
   */
  public async loadParkInfo(parkId: string): Promise<any> {
    const cacheKey = `park-info-${parkId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const response = await fetch(`/data/parks/${parkId}/info.json`);
      const info = await response.json();
      this.cache.set(cacheKey, info);
      return info;
    } catch (error) {
      console.error(`Failed to load park info for ${parkId}:`, error);
      return null;
    }
  }
  
  /**
   * Load terrain mesh with specified LOD
   */
  public async loadTerrain(parkId: string, lod: 0 | 1 | 2 | 3): Promise<THREE.BufferGeometry | null> {
    const cacheKey = `terrain-${parkId}-lod${lod}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // Try to load actual terrain data first
    const geometry = await this.loadTerrainFromFile(parkId, lod);
    
    if (geometry) {
      this.cache.set(cacheKey, geometry);
      return geometry;
    }
    
    // Fallback to procedural terrain
    console.log(`Creating procedural terrain for park ${parkId} at LOD ${lod}`);
    const proceduralGeometry = this.createProceduralTerrain(parkId, lod);
    this.cache.set(cacheKey, proceduralGeometry);
    return proceduralGeometry;
  }
  
  private async loadTerrainFromFile(parkId: string, lod: 0 | 1 | 2 | 3): Promise<THREE.BufferGeometry | null> {
    return new Promise((resolve) => {
      const url = `/data/parks/${parkId}/terrain-lod${lod}.draco`;
      
      this.dracoLoader.load(
        url,
        (geometry) => {
          // Ensure proper attributes
          if (!geometry.attributes.normal) {
            geometry.computeVertexNormals();
          }
          if (!geometry.attributes.uv) {
            console.warn(`Terrain ${parkId} LOD${lod} missing UV coordinates`);
          }
          
          resolve(geometry);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Loading terrain ${parkId} LOD${lod}: ${percent.toFixed(0)}%`);
        },
        (error) => {
          console.warn(`Failed to load terrain file for ${parkId} LOD${lod}, will use procedural terrain`);
          resolve(null);
        }
      );
    });
  }
  
  private createProceduralTerrain(parkId: string, lod: 0 | 1 | 2 | 3): THREE.BufferGeometry {
    // Terrain parameters based on LOD
    const segmentMap = {
      0: 256, // Ultra quality
      1: 128, // High quality
      2: 64,  // Medium quality
      3: 32   // Low quality
    };
    
    const segments = segmentMap[lod];
    const size = 100;
    const maxHeight = 20;
    
    // Create terrain geometry
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    
    // Generate height map using Perlin-like noise
    const vertices = geometry.attributes.position;
    const vertexCount = vertices.count;
    
    // Use park ID as seed for consistent terrain per park
    const parkSeed = parseInt(parkId) || parkId.charCodeAt(0);
    
    for (let i = 0; i < vertexCount; i++) {
      const x = vertices.getX(i);
      const z = vertices.getZ(i);
      
      // Multi-octave noise for realistic terrain
      let height = 0;
      let amplitude = 1;
      let frequency = 0.02;
      
      for (let octave = 0; octave < 4; octave++) {
        height += amplitude * this.noise2D(x * frequency + parkSeed, z * frequency + parkSeed);
        amplitude *= 0.5;
        frequency *= 2;
      }
      
      // Add some variety based on position
      height += Math.sin(x * 0.1 + parkSeed) * 0.2;
      height += Math.cos(z * 0.1 + parkSeed * 2) * 0.2;
      
      // Create valleys and peaks
      const distanceFromCenter = Math.sqrt(x * x + z * z) / (size * 0.5);
      height *= 1.0 - Math.pow(distanceFromCenter, 2) * 0.3;
      
      // Scale and set height
      vertices.setY(i, height * maxHeight);
    }
    
    // Ensure proper UVs
    if (!geometry.attributes.uv) {
      const uvs = new Float32Array(vertexCount * 2);
      for (let i = 0; i < vertexCount; i++) {
        uvs[i * 2] = (vertices.getX(i) + size / 2) / size;
        uvs[i * 2 + 1] = (vertices.getZ(i) + size / 2) / size;
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }
    
    // Recompute normals for proper lighting
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    
    return geometry;
  }
  
  // Simple 2D noise function for terrain generation
  private noise2D(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }
  
  /**
   * Load texture (KTX2 or standard format)
   */
  public async loadTexture(url: string): Promise<THREE.Texture | null> {
    const cacheKey = `texture-${url}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    return new Promise((resolve) => {
      const isKTX2 = url.endsWith('.ktx2');
      const loader = isKTX2 ? this.ktx2Loader : this.textureLoader;
      
      loader.load(
        url,
        (texture) => {
          texture.encoding = THREE.sRGBEncoding;
          texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
          
          this.cache.set(cacheKey, texture);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`Failed to load texture ${url}:`, error);
          resolve(null);
        }
      );
    });
  }
  
  /**
   * Load all textures for a park
   */
  public async loadParkTextures(parkId: string): Promise<{
    satellite: THREE.Texture | null;
    terrain: THREE.Texture | null;
    normal: THREE.Texture | null;
  }> {
    const textureInfo = await this.loadTextureInfo(parkId);
    
    if (!textureInfo) {
      return { satellite: null, terrain: null, normal: null };
    }
    
    const [satellite, terrain, normal] = await Promise.all([
      this.loadTexture(textureInfo.satellite),
      this.loadTexture(textureInfo.terrain),
      this.loadTexture(textureInfo.normal)
    ]);
    
    return { satellite, terrain, normal };
  }
  
  /**
   * Load texture references for a park
   */
  private async loadTextureInfo(parkId: string): Promise<any> {
    const cacheKey = `texture-info-${parkId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const response = await fetch(`/data/parks/${parkId}/textures.json`);
      const info = await response.json();
      this.cache.set(cacheKey, info);
      return info;
    } catch (error) {
      console.error(`Failed to load texture info for ${parkId}:`, error);
      return null;
    }
  }
  
  /**
   * Preload all assets for a park
   */
  public async preloadPark(parkId: string): Promise<void> {
    console.log(`Preloading assets for ${parkId}...`);
    
    // Load all LODs in parallel
    const terrainPromises = [0, 1, 2, 3].map(lod => 
      this.loadTerrain(parkId, lod as 0 | 1 | 2 | 3)
    );
    
    // Load info and textures
    await Promise.all([
      this.loadParkInfo(parkId),
      this.loadParkTextures(parkId),
      ...terrainPromises
    ]);
    
    console.log(`Preloading complete for ${parkId}`);
  }
  
  /**
   * Get cache size in MB
   */
  public getCacheSize(): number {
    let size = 0;
    
    this.cache.forEach((value) => {
      if (value instanceof THREE.BufferGeometry) {
        // Estimate geometry size
        const positions = value.attributes.position;
        if (positions) {
          size += positions.array.byteLength;
        }
      } else if (value instanceof THREE.Texture) {
        // Estimate texture size
        if (value.image && value.image.data) {
          size += value.image.data.byteLength;
        }
      } else if (typeof value === 'object') {
        // Rough estimate for JSON objects
        size += JSON.stringify(value).length;
      }
    });
    
    return size / (1024 * 1024); // Convert to MB
  }
  
  /**
   * Clear cache for a specific park
   */
  public clearParkCache(parkId: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.includes(parkId)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      const value = this.cache.get(key);
      if (value instanceof THREE.BufferGeometry) {
        value.dispose();
      } else if (value instanceof THREE.Texture) {
        value.dispose();
      }
      this.cache.delete(key);
    });
  }
  
  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.forEach((value) => {
      if (value instanceof THREE.BufferGeometry) {
        value.dispose();
      } else if (value instanceof THREE.Texture) {
        value.dispose();
      }
    });
    
    this.cache.clear();
  }
  
  /**
   * Dispose of loaders and clear cache
   */
  public dispose(): void {
    this.clearCache();
    this.dracoLoader.dispose();
    this.ktx2Loader.dispose();
  }
}