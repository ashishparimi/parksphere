import * as THREE from 'three';
import { DataLoader } from './DataLoader';

export interface TerrainViewOptions {
  parkId: string;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  showWireframe?: boolean;
  enableShadows?: boolean;
  enableWater?: boolean;
}

export class TerrainRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private dataLoader: DataLoader;
  private currentTerrain: THREE.Mesh | null = null;
  private terrainGroup: THREE.Group;
  private waterMesh: THREE.Mesh | null = null;
  
  // Materials
  private terrainMaterial: THREE.ShaderMaterial;
  private waterMaterial: THREE.ShaderMaterial;
  private wireframeMaterial: THREE.LineBasicMaterial;
  
  // Terrain details
  private heightScale: number = 100;
  private terrainSize: number = 10;
  
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, dataLoader: DataLoader) {
    this.scene = scene;
    this.camera = camera;
    this.dataLoader = dataLoader;
    this.terrainGroup = new THREE.Group();
    this.scene.add(this.terrainGroup);
    
    this.createMaterials();
  }
  
  private createMaterials(): void {
    // Enhanced terrain material with realistic texturing
    this.terrainMaterial = new THREE.ShaderMaterial({
      uniforms: {
        // Textures
        grassTexture: { value: null },
        rockTexture: { value: null },
        sandTexture: { value: null },
        snowTexture: { value: null },
        normalMap: { value: null },
        
        // Height-based blending
        grassHeight: { value: 0.3 },
        rockHeight: { value: 0.6 },
        snowHeight: { value: 0.8 },
        blendSharpness: { value: 4.0 },
        
        // Lighting
        sunDirection: { value: new THREE.Vector3(1, 1, 0.5).normalize() },
        ambientStrength: { value: 0.4 },
        
        // Detail
        textureScale: { value: 20.0 },
        normalScale: { value: 1.0 },
        roughness: { value: 0.8 },
        
        // Fog
        fogColor: { value: new THREE.Color(0.7, 0.8, 0.9) },
        fogNear: { value: 100 },
        fogFar: { value: 1000 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewPos;
        varying float vHeight;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vHeight = position.y / 100.0; // Normalized height
          
          vec4 mvPosition = viewMatrix * worldPos;
          vViewPos = -mvPosition.xyz;
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D grassTexture;
        uniform sampler2D rockTexture;
        uniform sampler2D sandTexture;
        uniform sampler2D snowTexture;
        uniform sampler2D normalMap;
        
        uniform float grassHeight;
        uniform float rockHeight;
        uniform float snowHeight;
        uniform float blendSharpness;
        
        uniform vec3 sunDirection;
        uniform float ambientStrength;
        uniform float textureScale;
        uniform float normalScale;
        uniform float roughness;
        
        uniform vec3 fogColor;
        uniform float fogNear;
        uniform float fogFar;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewPos;
        varying float vHeight;
        
        // Triplanar mapping for steep slopes
        vec4 triplanar(sampler2D tex, vec3 worldPos, vec3 normal) {
          vec3 blending = abs(normal);
          blending = normalize(max(blending, 0.00001));
          float b = (blending.x + blending.y + blending.z);
          blending /= vec3(b, b, b);
          
          vec4 xaxis = texture2D(tex, worldPos.yz * textureScale * 0.1);
          vec4 yaxis = texture2D(tex, worldPos.xz * textureScale * 0.1);
          vec4 zaxis = texture2D(tex, worldPos.xy * textureScale * 0.1);
          
          return xaxis * blending.x + yaxis * blending.y + zaxis * blending.z;
        }
        
        // Normal mapping
        vec3 getNormal() {
          vec3 normalTex = texture2D(normalMap, vUv * textureScale).xyz * 2.0 - 1.0;
          normalTex.xy *= normalScale;
          
          vec3 q0 = dFdx(vWorldPos);
          vec3 q1 = dFdy(vWorldPos);
          vec2 st0 = dFdx(vUv);
          vec2 st1 = dFdy(vUv);
          
          vec3 N = normalize(vNormal);
          vec3 T = normalize(q0 * st1.t - q1 * st0.t);
          vec3 B = -normalize(cross(N, T));
          mat3 TBN = mat3(T, B, N);
          
          return normalize(TBN * normalTex);
        }
        
        void main() {
          // Get normal with detail
          vec3 normal = getNormal();
          
          // Sample textures with triplanar mapping for slopes
          float slope = 1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
          vec4 grass, rock, sand, snow;
          
          if (slope > 0.5) {
            // Steep slopes use triplanar
            grass = triplanar(grassTexture, vWorldPos, vNormal);
            rock = triplanar(rockTexture, vWorldPos, vNormal);
            sand = triplanar(sandTexture, vWorldPos, vNormal);
            snow = triplanar(snowTexture, vWorldPos, vNormal);
          } else {
            // Flat areas use regular UV
            vec2 scaledUV = vUv * textureScale;
            grass = texture2D(grassTexture, scaledUV);
            rock = texture2D(rockTexture, scaledUV);
            sand = texture2D(sandTexture, scaledUV);
            snow = texture2D(snowTexture, scaledUV);
          }
          
          // Height-based texture blending with smooth transitions
          vec3 color = sand.rgb;
          
          // Sand to grass
          float grassBlend = smoothstep(0.0, grassHeight, vHeight) * (1.0 - smoothstep(grassHeight, rockHeight, vHeight));
          color = mix(color, grass.rgb, grassBlend);
          
          // Grass to rock
          float rockBlend = smoothstep(grassHeight, rockHeight, vHeight) * (1.0 - smoothstep(rockHeight, snowHeight, vHeight));
          color = mix(color, rock.rgb, rockBlend);
          
          // Rock to snow
          float snowBlend = smoothstep(rockHeight - 0.1, snowHeight, vHeight);
          color = mix(color, snow.rgb, snowBlend);
          
          // Add slope-based rock
          color = mix(color, rock.rgb, smoothstep(0.3, 0.7, slope) * 0.5);
          
          // Lighting calculation
          float NdotL = max(dot(normal, sunDirection), 0.0);
          float diffuse = mix(ambientStrength, 1.0, NdotL);
          
          // Simple specular
          vec3 viewDir = normalize(vViewPos);
          vec3 halfDir = normalize(sunDirection + viewDir);
          float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * (1.0 - roughness);
          
          // Final color
          vec3 finalColor = color * diffuse + vec3(0.2) * spec;
          
          // Height-based atmospheric tinting
          vec3 atmosphereTint = mix(vec3(1.0), vec3(0.8, 0.85, 1.0), vHeight);
          finalColor *= atmosphereTint;
          
          // Fog
          float fogDistance = length(vViewPos);
          float fogFactor = smoothstep(fogNear, fogFar, fogDistance);
          finalColor = mix(finalColor, fogColor, fogFactor);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });
    
    // Water material
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waterColor: { value: new THREE.Color(0x006994) },
        sunDirection: { value: new THREE.Vector3(1, 1, 0.5).normalize() }
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          vUv = uv;
          
          // Simple wave animation
          vec3 pos = position;
          pos.y += sin(position.x * 10.0 + time) * 0.1;
          pos.y += sin(position.z * 10.0 + time * 1.5) * 0.1;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          vViewPosition = -mvPosition.xyz;
          vNormal = normalize(normalMatrix * normal);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 waterColor;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          vec3 normal = normalize(vNormal);
          
          // Fresnel effect
          float fresnel = pow(1.0 - dot(viewDir, normal), 2.0);
          
          // Simple specular
          vec3 halfDir = normalize(sunDirection + viewDir);
          float spec = pow(max(dot(normal, halfDir), 0.0), 128.0);
          
          vec3 color = mix(waterColor, vec3(0.8, 0.9, 1.0), fresnel);
          color += vec3(1.0) * spec;
          
          gl_FragColor = vec4(color, 0.8);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // Wireframe material for terrain analysis
    this.wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 1,
      opacity: 0.5,
      transparent: true
    });
  }
  
  public async loadTerrainForPark(parkId: string, options: TerrainViewOptions): Promise<void> {
    // Clear existing terrain
    this.clearTerrain();
    
    // Determine LOD based on quality
    const lodMap = {
      low: 3,
      medium: 2,
      high: 1,
      ultra: 0
    };
    
    const lod = lodMap[options.quality];
    
    // Load terrain geometry
    const geometry = await this.dataLoader.loadTerrain(parkId, lod as 0 | 1 | 2 | 3);
    if (!geometry) {
      console.error(`Failed to load terrain for park ${parkId}`);
      return;
    }
    
    // Load textures
    await this.loadTerrainTextures();
    
    // Create terrain mesh
    this.currentTerrain = new THREE.Mesh(geometry, this.terrainMaterial);
    this.currentTerrain.castShadow = options.enableShadows || false;
    this.currentTerrain.receiveShadow = options.enableShadows || false;
    
    // Center and scale terrain
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Position terrain at origin
    this.currentTerrain.position.sub(center);
    this.currentTerrain.position.y = -box.min.y;
    
    this.terrainGroup.add(this.currentTerrain);
    
    // Add wireframe if requested
    if (options.showWireframe) {
      const wireframe = new THREE.LineSegments(
        new THREE.WireframeGeometry(geometry),
        this.wireframeMaterial
      );
      wireframe.position.copy(this.currentTerrain.position);
      this.terrainGroup.add(wireframe);
    }
    
    // Add water plane if enabled
    if (options.enableWater) {
      this.addWaterPlane(box);
    }
    
    // Update terrain size for camera calculations
    this.terrainSize = Math.max(size.x, size.z);
  }
  
  private async loadTerrainTextures(): Promise<void> {
    // Create procedural textures as fallback
    const createProceduralTexture = (color: number, roughness: number = 1.0): THREE.DataTexture => {
      const size = 256;
      const data = new Uint8Array(size * size * 4);
      const c = new THREE.Color(color);
      
      for (let i = 0; i < size * size; i++) {
        const noise = Math.random() * 0.2 + 0.8;
        data[i * 4] = c.r * 255 * noise;
        data[i * 4 + 1] = c.g * 255 * noise;
        data[i * 4 + 2] = c.b * 255 * noise;
        data[i * 4 + 3] = 255;
      }
      
      const texture = new THREE.DataTexture(data, size, size);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.needsUpdate = true;
      return texture;
    };
    
    // Create normal map
    const createNormalMap = (): THREE.DataTexture => {
      const size = 256;
      const data = new Uint8Array(size * size * 4);
      
      for (let i = 0; i < size * size; i++) {
        data[i * 4] = 128;
        data[i * 4 + 1] = 128;
        data[i * 4 + 2] = 255;
        data[i * 4 + 3] = 255;
      }
      
      const texture = new THREE.DataTexture(data, size, size);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.needsUpdate = true;
      return texture;
    };
    
    try {
      const textureLoader = new THREE.TextureLoader();
      
      // Try to load real textures first
      const textures = await Promise.all([
        textureLoader.loadAsync('/textures/terrain/grass.jpg').catch(() => createProceduralTexture(0x3a5f3a)),
        textureLoader.loadAsync('/textures/terrain/rock.jpg').catch(() => createProceduralTexture(0x5a5a5a)),
        textureLoader.loadAsync('/textures/terrain/sand.jpg').catch(() => createProceduralTexture(0xc2b280)),
        textureLoader.loadAsync('/textures/terrain/snow.jpg').catch(() => createProceduralTexture(0xffffff)),
        textureLoader.loadAsync('/textures/terrain/normal.jpg').catch(() => createNormalMap())
      ]);
      
      // Configure textures
      textures.forEach(texture => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        if (texture.anisotropy) texture.anisotropy = 16;
      });
      
      // Assign to material
      this.terrainMaterial.uniforms.grassTexture.value = textures[0];
      this.terrainMaterial.uniforms.rockTexture.value = textures[1];
      this.terrainMaterial.uniforms.sandTexture.value = textures[2];
      this.terrainMaterial.uniforms.snowTexture.value = textures[3];
      this.terrainMaterial.uniforms.normalMap.value = textures[4];
    } catch (error) {
      console.warn('Failed to load some terrain textures, using procedural fallbacks');
    }
  }
  
  private addWaterPlane(terrainBounds: THREE.Box3): void {
    const waterLevel = terrainBounds.min.y + (terrainBounds.max.y - terrainBounds.min.y) * 0.3;
    const size = terrainBounds.getSize(new THREE.Vector3());
    
    const waterGeometry = new THREE.PlaneGeometry(size.x * 1.5, size.z * 1.5, 64, 64);
    waterGeometry.rotateX(-Math.PI / 2);
    
    this.waterMesh = new THREE.Mesh(waterGeometry, this.waterMaterial);
    this.waterMesh.position.y = waterLevel;
    this.terrainGroup.add(this.waterMesh);
  }
  
  public update(deltaTime: number): void {
    // Update water animation
    if (this.waterMesh) {
      this.waterMaterial.uniforms.time.value += deltaTime;
    }
  }
  
  public clearTerrain(): void {
    // Remove all children from terrain group
    while (this.terrainGroup.children.length > 0) {
      const child = this.terrainGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      this.terrainGroup.remove(child);
    }
    
    this.currentTerrain = null;
    this.waterMesh = null;
  }
  
  public getOptimalCameraPosition(): { position: THREE.Vector3; target: THREE.Vector3 } {
    if (!this.currentTerrain) {
      return {
        position: new THREE.Vector3(0, 10, 20),
        target: new THREE.Vector3(0, 0, 0)
      };
    }
    
    // Calculate optimal viewing position based on terrain size
    const distance = this.terrainSize * 1.5;
    const height = this.terrainSize * 0.8;
    
    return {
      position: new THREE.Vector3(distance * 0.7, height, distance),
      target: new THREE.Vector3(0, 0, 0)
    };
  }
  
  public dispose(): void {
    this.clearTerrain();
    this.terrainMaterial.dispose();
    this.waterMaterial.dispose();
    this.wireframeMaterial.dispose();
  }
}