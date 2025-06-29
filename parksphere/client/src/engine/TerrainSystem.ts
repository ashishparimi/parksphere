import * as THREE from 'three';
import { DataLoader } from './DataLoader';

export interface TerrainTile {
  id: string;
  parkId: string;
  mesh: THREE.Mesh;
  lod: number;
  bounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
  center: THREE.Vector3;
  material: THREE.ShaderMaterial;
}

export interface TerrainOptions {
  enableGeomorphing?: boolean;
  enableShadows?: boolean;
  maxLOD?: number;
  lodDistances?: number[];
}

export class TerrainSystem {
  private dataLoader: DataLoader;
  private terrainTiles: Map<string, TerrainTile[]>;
  private activeTiles: Set<string>;
  private terrainMaterial: THREE.ShaderMaterial;
  private options: Required<TerrainOptions>;
  private morphTargets: Map<string, Float32Array>;
  
  constructor(dataLoader: DataLoader, options?: TerrainOptions) {
    this.dataLoader = dataLoader;
    this.terrainTiles = new Map();
    this.activeTiles = new Set();
    this.morphTargets = new Map();
    
    this.options = {
      enableGeomorphing: true,
      enableShadows: true,
      maxLOD: 3,
      lodDistances: [0, 50, 150, 300], // Distance thresholds for LOD levels
      ...options
    };
    
    this.createTerrainMaterial();
  }
  
  private createTerrainMaterial(): void {
    this.terrainMaterial = new THREE.ShaderMaterial({
      uniforms: {
        // Textures
        satelliteTexture: { value: null },
        terrainTexture: { value: null },
        normalTexture: { value: null },
        
        // Height-based coloring
        minHeight: { value: 0 },
        maxHeight: { value: 1000 },
        heightGradient: { value: this.createHeightGradient() },
        
        // Lighting
        sunDirection: { value: new THREE.Vector3(1, 1, 0).normalize() },
        fogColor: { value: new THREE.Color(0x87CEEB) },
        fogDensity: { value: 0.00025 },
        
        // Geomorphing
        morphFactor: { value: 0 },
        morphStart: { value: 100 },
        morphEnd: { value: 150 },
        
        // Detail settings
        textureScale: { value: 10 },
        normalScale: { value: 1 },
        
        // Time for effects
        time: { value: 0 }
      },
      vertexShader: `
        uniform float morphFactor;
        uniform float minHeight;
        uniform float maxHeight;
        
        attribute vec3 morphTarget;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vElevation;
        varying vec3 vViewPosition;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          
          // Geomorphing
          vec3 morphedPosition = mix(position, morphTarget, morphFactor);
          
          vec4 worldPosition = modelMatrix * vec4(morphedPosition, 1.0);
          vWorldPos = worldPosition.xyz;
          
          // Normalized elevation for coloring
          vElevation = (morphedPosition.y - minHeight) / (maxHeight - minHeight);
          
          vec4 mvPosition = viewMatrix * worldPosition;
          vViewPosition = -mvPosition.xyz;
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D satelliteTexture;
        uniform sampler2D terrainTexture;
        uniform sampler2D normalTexture;
        uniform sampler2D heightGradient;
        uniform vec3 sunDirection;
        uniform vec3 fogColor;
        uniform float fogDensity;
        uniform float textureScale;
        uniform float normalScale;
        uniform float time;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vElevation;
        varying vec3 vViewPosition;
        
        // Triplanar mapping for steep slopes
        vec3 triplanarMapping(sampler2D tex, vec3 worldPos, vec3 normal) {
          vec3 blending = abs(normal);
          blending = normalize(max(blending, 0.00001));
          float b = (blending.x + blending.y + blending.z);
          blending /= vec3(b, b, b);
          
          vec4 xaxis = texture2D(tex, worldPos.yz * textureScale);
          vec4 yaxis = texture2D(tex, worldPos.xz * textureScale);
          vec4 zaxis = texture2D(tex, worldPos.xy * textureScale);
          
          return (xaxis * blending.x + yaxis * blending.y + zaxis * blending.z).rgb;
        }
        
        // Normal mapping
        vec3 perturbNormal(vec3 normal, vec3 viewDir, vec2 uv) {
          vec3 normalMap = texture2D(normalTexture, uv).xyz * 2.0 - 1.0;
          normalMap.xy *= normalScale;
          
          vec3 q0 = dFdx(vWorldPos);
          vec3 q1 = dFdy(vWorldPos);
          vec2 st0 = dFdx(vUv);
          vec2 st1 = dFdy(vUv);
          
          vec3 N = normalize(normal);
          vec3 T = normalize(q0 * st1.t - q1 * st0.t);
          vec3 B = -normalize(cross(N, T));
          mat3 TBN = mat3(T, B, N);
          
          return normalize(TBN * normalMap);
        }
        
        void main() {
          // Base color from satellite imagery
          vec3 satelliteColor = texture2D(satelliteTexture, vUv).rgb;
          
          // Terrain texture for detail (triplanar on steep slopes)
          vec3 terrainDetail = triplanarMapping(terrainTexture, vWorldPos, vNormal);
          
          // Height-based coloring
          vec3 heightColor = texture2D(heightGradient, vec2(vElevation, 0.5)).rgb;
          
          // Mix satellite and procedural textures
          vec3 baseColor = mix(satelliteColor, terrainDetail, 0.3);
          baseColor = mix(baseColor, heightColor, 0.2);
          
          // Get perturbed normal
          vec3 viewDir = normalize(vViewPosition);
          vec3 normal = perturbNormal(vNormal, viewDir, vUv);
          
          // Lighting calculation
          float NdotL = max(dot(normal, sunDirection), 0.0);
          vec3 diffuse = baseColor * (0.6 + 0.4 * NdotL);
          
          // Specular highlights
          vec3 halfDir = normalize(sunDirection + viewDir);
          float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
          vec3 specular = vec3(0.2) * spec;
          
          // Combine lighting
          vec3 color = diffuse + specular;
          
          // Atmospheric fog
          float fogFactor = 1.0 - exp(-fogDensity * length(vViewPosition));
          color = mix(color, fogColor, fogFactor);
          
          // Rim lighting for atmosphere
          float rim = 1.0 - max(dot(normal, viewDir), 0.0);
          color += vec3(0.1, 0.2, 0.4) * pow(rim, 2.0) * 0.3;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
      shadowSide: THREE.FrontSide
    });
    
    if (this.options.enableShadows) {
      this.terrainMaterial.castShadow = true;
      this.terrainMaterial.receiveShadow = true;
    }
  }
  
  private createHeightGradient(): THREE.DataTexture {
    const width = 256;
    const height = 1;
    const data = new Uint8Array(width * height * 4);
    
    // Define gradient colors (grass -> rock -> snow)
    const gradientStops = [
      { pos: 0.0, color: [34, 139, 34] },    // Forest green
      { pos: 0.3, color: [139, 90, 43] },    // Brown
      { pos: 0.6, color: [139, 119, 101] },  // Light brown/rock
      { pos: 0.8, color: [176, 176, 176] },  // Gray rock
      { pos: 1.0, color: [255, 255, 255] }   // Snow white
    ];
    
    for (let i = 0; i < width; i++) {
      const t = i / (width - 1);
      
      // Find gradient segment
      let color = [0, 0, 0];
      for (let j = 0; j < gradientStops.length - 1; j++) {
        const stop1 = gradientStops[j];
        const stop2 = gradientStops[j + 1];
        
        if (t >= stop1.pos && t <= stop2.pos) {
          const localT = (t - stop1.pos) / (stop2.pos - stop1.pos);
          color = [
            stop1.color[0] + (stop2.color[0] - stop1.color[0]) * localT,
            stop1.color[1] + (stop2.color[1] - stop1.color[1]) * localT,
            stop1.color[2] + (stop2.color[2] - stop1.color[2]) * localT
          ];
          break;
        }
      }
      
      const idx = i * 4;
      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
      data[idx + 3] = 255;
    }
    
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }
  
  public async loadTerrain(parkId: string): Promise<TerrainTile[]> {
    // Check if already loaded
    if (this.terrainTiles.has(parkId)) {
      return this.terrainTiles.get(parkId)!;
    }
    
    const tiles: TerrainTile[] = [];
    
    // Load all LOD levels
    for (let lod = 0; lod <= this.options.maxLOD; lod++) {
      const geometry = await this.dataLoader.loadTerrain(parkId, lod as 0 | 1 | 2 | 3);
      if (!geometry) continue;
      
      // Calculate bounds
      geometry.computeBoundingBox();
      const bounds = {
        min: geometry.boundingBox!.min.clone(),
        max: geometry.boundingBox!.max.clone()
      };
      const center = new THREE.Vector3();
      geometry.boundingBox!.getCenter(center);
      
      // Create material instance
      const material = this.terrainMaterial.clone();
      
      // Update height range
      material.uniforms.minHeight.value = bounds.min.y;
      material.uniforms.maxHeight.value = bounds.max.y;
      
      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = this.options.enableShadows;
      mesh.receiveShadow = this.options.enableShadows;
      mesh.visible = lod === 0; // Only show highest LOD initially
      
      // Store morph target for geomorphing
      if (this.options.enableGeomorphing && lod < this.options.maxLOD) {
        const nextLODGeometry = await this.dataLoader.loadTerrain(
          parkId, 
          (lod + 1) as 0 | 1 | 2 | 3
        );
        if (nextLODGeometry) {
          this.setupGeomorphing(geometry, nextLODGeometry);
        }
      }
      
      const tile: TerrainTile = {
        id: `${parkId}_lod${lod}`,
        parkId,
        mesh,
        lod,
        bounds,
        center,
        material
      };
      
      tiles.push(tile);
    }
    
    // Load textures
    const textures = await this.dataLoader.loadParkTextures(parkId);
    
    // Apply textures to all LODs
    tiles.forEach(tile => {
      if (textures.satellite) {
        tile.material.uniforms.satelliteTexture.value = textures.satellite;
      }
      if (textures.terrain) {
        tile.material.uniforms.terrainTexture.value = textures.terrain;
      }
      if (textures.normal) {
        tile.material.uniforms.normalTexture.value = textures.normal;
      }
    });
    
    this.terrainTiles.set(parkId, tiles);
    return tiles;
  }
  
  private setupGeomorphing(geometry: THREE.BufferGeometry, nextLODGeometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position;
    const nextPositions = nextLODGeometry.attributes.position;
    
    // Create morph target attribute
    const morphTarget = new Float32Array(positions.count * 3);
    
    // For each vertex in current LOD, find nearest in next LOD
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Simple mapping - in production, use proper vertex mapping
      const nearestIdx = Math.min(i, nextPositions.count - 1);
      
      morphTarget[i * 3] = nextPositions.getX(nearestIdx);
      morphTarget[i * 3 + 1] = nextPositions.getY(nearestIdx);
      morphTarget[i * 3 + 2] = nextPositions.getZ(nearestIdx);
    }
    
    geometry.setAttribute('morphTarget', new THREE.BufferAttribute(morphTarget, 3));
  }
  
  public updateLOD(camera: THREE.Camera, parkId: string): void {
    const tiles = this.terrainTiles.get(parkId);
    if (!tiles) return;
    
    // Calculate distance to terrain center
    const distance = camera.position.distanceTo(tiles[0].center);
    
    // Determine target LOD based on distance
    let targetLOD = 0;
    for (let i = 0; i < this.options.lodDistances.length; i++) {
      if (distance > this.options.lodDistances[i]) {
        targetLOD = i;
      }
    }
    
    targetLOD = Math.min(targetLOD, this.options.maxLOD);
    
    // Update visibility and morphing
    tiles.forEach(tile => {
      if (tile.lod === targetLOD) {
        tile.mesh.visible = true;
        
        // Update morph factor for smooth transition
        if (this.options.enableGeomorphing) {
          const morphStart = this.options.lodDistances[targetLOD];
          const morphEnd = targetLOD < this.options.maxLOD 
            ? this.options.lodDistances[targetLOD + 1] 
            : morphStart * 1.5;
          
          const morphFactor = THREE.MathUtils.smoothstep(
            distance,
            morphStart,
            morphEnd
          );
          
          tile.material.uniforms.morphFactor.value = morphFactor;
          tile.material.uniforms.morphStart.value = morphStart;
          tile.material.uniforms.morphEnd.value = morphEnd;
        }
      } else {
        tile.mesh.visible = false;
      }
    });
  }
  
  public addToScene(scene: THREE.Scene, parkId: string): void {
    const tiles = this.terrainTiles.get(parkId);
    if (!tiles) return;
    
    tiles.forEach(tile => {
      scene.add(tile.mesh);
    });
    
    this.activeTiles.add(parkId);
  }
  
  public removeFromScene(scene: THREE.Scene, parkId: string): void {
    const tiles = this.terrainTiles.get(parkId);
    if (!tiles) return;
    
    tiles.forEach(tile => {
      scene.remove(tile.mesh);
    });
    
    this.activeTiles.delete(parkId);
  }
  
  public update(time: number, camera: THREE.Camera): void {
    // Update time uniform for effects
    this.terrainMaterial.uniforms.time.value = time;
    
    // Update LOD for all active terrains
    this.activeTiles.forEach(parkId => {
      this.updateLOD(camera, parkId);
    });
  }
  
  public dispose(): void {
    this.terrainTiles.forEach(tiles => {
      tiles.forEach(tile => {
        tile.mesh.geometry.dispose();
        tile.material.dispose();
      });
    });
    
    this.terrainTiles.clear();
    this.activeTiles.clear();
    this.terrainMaterial.dispose();
  }
}