import * as THREE from 'three';

export class EarthMesh {
  private earthMaterial: THREE.ShaderMaterial;
  private atmosphereMaterial: THREE.ShaderMaterial;
  private earthMesh: THREE.Mesh;
  private atmosphereMesh: THREE.Mesh;
  private group: THREE.Group;
  
  constructor() {
    this.group = new THREE.Group();
    this.createEarthMaterial();
    this.createAtmosphereMaterial();
    this.createMeshes();
  }
  
  private createEarthMaterial(): void {
    this.earthMaterial = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: null },
        nightTexture: { value: null },
        specularTexture: { value: null },
        normalTexture: { value: null },
        cloudsTexture: { value: null },
        sunDirection: { value: new THREE.Vector3(1, 0.5, 0).normalize() },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewPosition;
        varying vec3 vWorldNormal;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D specularTexture;
        uniform sampler2D normalTexture;
        uniform sampler2D cloudsTexture;
        uniform vec3 sunDirection;
        uniform float time;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewPosition;
        varying vec3 vWorldNormal;
        
        // Normal mapping
        vec3 getNormal() {
          vec3 pos_dx = dFdx(vPosition);
          vec3 pos_dy = dFdy(vPosition);
          vec3 tex_dx = dFdx(vec3(vUv, 0.0));
          vec3 tex_dy = dFdy(vec3(vUv, 0.0));
          vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);
          vec3 ng = normalize(vNormal);
          t = normalize(t - ng * dot(ng, t));
          vec3 b = normalize(cross(ng, t));
          mat3 tbn = mat3(t, b, ng);
          vec3 n = texture2D(normalTexture, vUv).rgb * 2.0 - 1.0;
          n = normalize(tbn * n);
          return n;
        }
        
        void main() {
          // Sample textures
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          vec3 nightColor = texture2D(nightTexture, vUv).rgb * 2.5;
          float specular = texture2D(specularTexture, vUv).r;
          vec3 clouds = texture2D(cloudsTexture, vUv + vec2(time * 0.005, 0.0)).rgb;
          
          // Get proper normal
          vec3 normal = getNormal();
          
          // Calculate lighting
          vec3 lightDir = normalize(sunDirection);
          float cosAngle = dot(vWorldNormal, lightDir);
          float dayAmount = smoothstep(-0.15, 0.4, cosAngle);
          
          // Mix day and night with twilight zone
          vec3 twilightColor = mix(dayColor, vec3(1.0, 0.5, 0.2), 0.5);
          float twilightAmount = smoothstep(-0.15, 0.0, cosAngle) * (1.0 - smoothstep(0.0, 0.15, cosAngle));
          
          vec3 color = mix(nightColor * 0.3, dayColor, dayAmount);
          color = mix(color, twilightColor, twilightAmount * 0.3);
          
          // Add clouds
          color = mix(color, vec3(1.0), clouds.r * dayAmount * 0.5);
          
          // Specular reflection on water
          if (specular > 0.5) {
            vec3 viewDir = normalize(vViewPosition);
            vec3 halfDir = normalize(lightDir + viewDir);
            float specularAmount = pow(max(dot(normal, halfDir), 0.0), 64.0);
            color += vec3(0.8, 0.9, 1.0) * specularAmount * dayAmount * 1.5;
          }
          
          // Fresnel rim lighting
          float rim = 1.0 - max(dot(normalize(vViewPosition), vNormal), 0.0);
          vec3 rimColor = mix(vec3(0.1, 0.3, 0.6), vec3(1.0, 0.7, 0.3), dayAmount);
          color += rimColor * pow(rim, 2.5) * 0.4;
          
          // Tone mapping
          color = pow(color, vec3(0.85));
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
  }
  
  private createAtmosphereMaterial(): void {
    this.atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0.5, 0).normalize() }
      },
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 3.0);
          vec3 atmosphere = vec3(0.3, 0.6, 1.0) * intensity;
          
          // Sun-side glow
          float sunIntensity = max(dot(normalize(vPosition), sunDirection), 0.0);
          atmosphere += vec3(1.0, 0.8, 0.4) * pow(sunIntensity, 8.0) * intensity;
          
          gl_FragColor = vec4(atmosphere, intensity * 0.8);
        }
      `
    });
  }
  
  private createMeshes(): void {
    // Earth sphere
    const earthGeometry = new THREE.SphereGeometry(1, 128, 64);
    this.earthMesh = new THREE.Mesh(earthGeometry, this.earthMaterial);
    this.earthMesh.rotation.y = Math.PI;
    this.group.add(this.earthMesh);
    
    // Atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(1.03, 64, 32);
    this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, this.atmosphereMaterial);
    this.group.add(this.atmosphereMesh);
  }
  
  public async loadTextures(): Promise<void> {
    const textureLoader = new THREE.TextureLoader();
    
    const textures = await Promise.all([
      textureLoader.loadAsync('/textures/earth_day.jpg'),
      textureLoader.loadAsync('/textures/earth_night.jpg'),
      textureLoader.loadAsync('/textures/earth_specular.jpg'),
      textureLoader.loadAsync('/textures/earth_normal.jpg'),
      textureLoader.loadAsync('/textures/earth_clouds.jpg')
    ]);
    
    // Set texture properties
    textures.forEach(texture => {
      texture.encoding = THREE.sRGBEncoding;
      texture.anisotropy = 16;
    });
    
    // Assign textures
    this.earthMaterial.uniforms.dayTexture.value = textures[0];
    this.earthMaterial.uniforms.nightTexture.value = textures[1];
    this.earthMaterial.uniforms.specularTexture.value = textures[2];
    this.earthMaterial.uniforms.normalTexture.value = textures[3];
    this.earthMaterial.uniforms.cloudsTexture.value = textures[4];
  }
  
  public update(time: number): void {
    this.earthMaterial.uniforms.time.value = time;
  }
  
  public setRotation(y: number): void {
    this.group.rotation.y = y;
  }
  
  public getGroup(): THREE.Group {
    return this.group;
  }
  
  public dispose(): void {
    this.earthMesh.geometry.dispose();
    this.atmosphereMesh.geometry.dispose();
    this.earthMaterial.dispose();
    this.atmosphereMaterial.dispose();
  }
}