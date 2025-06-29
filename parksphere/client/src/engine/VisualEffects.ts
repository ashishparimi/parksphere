import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass';
import { GodRaysEffect } from './effects/GodRaysEffect';

export interface VisualEffectOptions {
  godRays?: boolean;
  atmosphere?: boolean;
  ssao?: boolean;
  bloom?: boolean;
  timeOfDay?: number; // 0-24 hours
  cloudDensity?: number; // 0-1
}

export class VisualEffects {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private sunLight: THREE.DirectionalLight;
  private skyMaterial: THREE.ShaderMaterial;
  private cloudsMesh: THREE.Mesh;
  private options: Required<VisualEffectOptions>;
  private time: number = 0;
  
  // Effects
  private godRaysEffect: GodRaysEffect | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private ssaoPass: SSAOPass | null = null;
  
  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    options?: VisualEffectOptions
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    this.options = {
      godRays: true,
      atmosphere: true,
      ssao: true,
      bloom: true,
      timeOfDay: 12,
      cloudDensity: 0.3,
      ...options
    };
    
    this.setupLighting();
    this.createSky();
    this.createClouds();
    this.setupEffects();
  }
  
  private setupLighting(): void {
    // Remove existing lights
    const existingLights = this.scene.children.filter(child => child instanceof THREE.Light);
    existingLights.forEach(light => this.scene.remove(light));
    
    // Ambient light varies with time of day
    const ambientIntensity = this.calculateAmbientIntensity();
    const ambientLight = new THREE.AmbientLight(0x404060, ambientIntensity);
    this.scene.add(ambientLight);
    
    // Main sun light
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.updateSunPosition();
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.near = 0.1;
    this.sunLight.shadow.camera.far = 100;
    this.sunLight.shadow.camera.left = -10;
    this.sunLight.shadow.camera.right = 10;
    this.sunLight.shadow.camera.top = 10;
    this.sunLight.shadow.camera.bottom = -10;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
    
    // Moon light for night
    const moonLight = new THREE.DirectionalLight(0x4080ff, 0.2);
    moonLight.position.set(-5, 3, -5);
    this.scene.add(moonLight);
  }
  
  private createSky(): void {
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        sunPosition: { value: new THREE.Vector3() },
        rayleigh: { value: 2.0 },
        mieCoefficient: { value: 0.005 },
        mieDirectionalG: { value: 0.8 },
        turbidity: { value: 10.0 },
        luminance: { value: 1.0 },
        timeOfDay: { value: this.options.timeOfDay }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vSunDirection;
        varying float vSunfade;
        varying vec3 vBetaR;
        varying vec3 vBetaM;
        varying float vSunE;
        
        uniform vec3 sunPosition;
        uniform float rayleigh;
        uniform float turbidity;
        uniform float mieCoefficient;
        uniform float timeOfDay;
        
        const vec3 up = vec3(0.0, 1.0, 0.0);
        const float e = 2.71828182845904523536028747135266249775724709369995957;
        const float pi = 3.141592653589793238462643383279502884197169;
        
        const vec3 lambda = vec3(680E-9, 550E-9, 450E-9);
        const vec3 totalRayleigh = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);
        const float v = 4.0;
        const vec3 K = vec3(0.686, 0.678, 0.666);
        const vec3 MieConst = vec3(1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14);
        
        const float cutoffAngle = 1.6110731556870734;
        const float steepness = 1.5;
        
        float sunIntensity(float zenithAngleCos) {
          zenithAngleCos = clamp(zenithAngleCos, -1.0, 1.0);
          return 1000.0 * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zenithAngleCos)) / steepness)));
        }
        
        vec3 totalMie(float T) {
          float c = (0.2 * T) * 10E-18;
          return 0.434 * c * MieConst;
        }
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          
          vSunDirection = normalize(sunPosition);
          vSunE = sunIntensity(dot(vSunDirection, up));
          vSunfade = 1.0 - clamp(1.0 - exp((sunPosition.y / 450000.0)), 0.0, 1.0);
          
          float rayleighCoefficient = rayleigh - (1.0 * (1.0 - vSunfade));
          vBetaR = totalRayleigh * rayleighCoefficient;
          vBetaM = totalMie(turbidity) * mieCoefficient;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;
        varying vec3 vSunDirection;
        varying float vSunfade;
        varying vec3 vBetaR;
        varying vec3 vBetaM;
        varying float vSunE;
        
        uniform float luminance;
        uniform float mieDirectionalG;
        uniform float timeOfDay;
        
        const vec3 cameraPos = vec3(0.0, 0.0, 0.0);
        const float pi = 3.141592653589793238462643383279502884197169;
        const float n = 1.0003;
        const float N = 2.545E25;
        const float rayleighZenithLength = 8.4E3;
        const float mieZenithLength = 1.25E3;
        const vec3 up = vec3(0.0, 1.0, 0.0);
        const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;
        
        vec3 Uncharted2Tonemap(vec3 x) {
          float A = 0.15;
          float B = 0.50;
          float C = 0.10;
          float D = 0.20;
          float E = 0.02;
          float F = 0.30;
          float W = 11.2;
          return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
        }
        
        vec3 Uncharted2ToneMapping(vec3 color) {
          float W = 11.2;
          float exposureBias = 2.0;
          vec3 curr = Uncharted2Tonemap(exposureBias * color);
          vec3 whiteScale = 1.0 / Uncharted2Tonemap(vec3(W));
          return curr * whiteScale;
        }
        
        float rayleighPhase(float cosTheta) {
          return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0));
        }
        
        float hgPhase(float cosTheta, float g) {
          float g2 = pow(g, 2.0);
          float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
          return (1.0 / (4.0 * pi)) * ((1.0 - g2) * inverse);
        }
        
        void main() {
          vec3 direction = normalize(vWorldPosition - cameraPos);
          
          float zenithAngle = acos(max(0.0, dot(up, direction)));
          float inverse = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
          float sR = rayleighZenithLength * inverse;
          float sM = mieZenithLength * inverse;
          
          vec3 Fex = exp(-(vBetaR * sR + vBetaM * sM));
          
          float cosTheta = dot(direction, vSunDirection);
          float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
          vec3 betaRTheta = vBetaR * rPhase;
          
          float mPhase = hgPhase(cosTheta, mieDirectionalG);
          vec3 betaMTheta = vBetaM * mPhase;
          
          vec3 Lin = pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * (1.0 - Fex), vec3(1.5));
          Lin *= mix(vec3(1.0), pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * Fex, vec3(1.0 / 2.0)), clamp(pow(1.0 - dot(up, vSunDirection), 5.0), 0.0, 1.0));
          
          vec3 L0 = vec3(0.1) * Fex;
          
          float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
          L0 += (vSunE * 19000.0 * Fex) * sundisk;
          
          vec3 texColor = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);
          vec3 mapped = Uncharted2ToneMapping(texColor * luminance);
          
          // Night sky color
          vec3 nightColor = vec3(0.01, 0.02, 0.05);
          float nightBlend = smoothstep(0.0, 4.0, timeOfDay) * (1.0 - smoothstep(20.0, 24.0, timeOfDay));
          
          gl_FragColor = vec4(mix(nightColor, mapped, nightBlend), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });
    
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const sky = new THREE.Mesh(skyGeometry, this.skyMaterial);
    this.scene.add(sky);
  }
  
  private createClouds(): void {
    const cloudMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        cloudDensity: { value: this.options.cloudDensity },
        sunDirection: { value: new THREE.Vector3() }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float cloudDensity;
        uniform vec3 sunDirection;
        
        varying vec2 vUv;
        varying vec3 vWorldPos;
        
        // Simplex noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m;
          m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        
        void main() {
          vec2 uv = vUv * 4.0 + vec2(time * 0.02, time * 0.01);
          
          // Multi-octave noise for clouds
          float n = 0.0;
          n += snoise(uv * 1.0) * 0.5;
          n += snoise(uv * 2.0) * 0.25;
          n += snoise(uv * 4.0) * 0.125;
          n += snoise(uv * 8.0) * 0.0625;
          
          // Cloud shape
          float cloud = smoothstep(0.3 - cloudDensity, 0.6, n);
          
          // Lighting
          float light = max(dot(normalize(vWorldPos), sunDirection), 0.0);
          vec3 cloudColor = mix(vec3(0.4, 0.4, 0.5), vec3(1.0, 1.0, 1.0), light);
          
          gl_FragColor = vec4(cloudColor, cloud * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    
    const cloudGeometry = new THREE.SphereGeometry(2, 64, 32);
    this.cloudsMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    this.scene.add(this.cloudsMesh);
  }
  
  private setupEffects(): void {
    const renderTargetSize = new THREE.Vector2(
      window.innerWidth,
      window.innerHeight
    );
    
    // God rays
    if (this.options.godRays) {
      this.godRaysEffect = new GodRaysEffect(
        this.scene,
        this.camera as THREE.PerspectiveCamera,
        this.renderer,
        this.sunLight
      );
    }
    
    // Bloom
    if (this.options.bloom) {
      this.bloomPass = new UnrealBloomPass(
        renderTargetSize,
        0.6,  // strength
        0.5,  // radius
        0.85  // threshold
      );
    }
    
    // SSAO
    if (this.options.ssao) {
      this.ssaoPass = new SSAOPass(
        this.scene,
        this.camera,
        window.innerWidth,
        window.innerHeight
      );
      this.ssaoPass.kernelRadius = 16;
      this.ssaoPass.minDistance = 0.005;
      this.ssaoPass.maxDistance = 0.1;
    }
  }
  
  private calculateAmbientIntensity(): number {
    const hour = this.options.timeOfDay;
    
    // Night (0-6, 18-24)
    if (hour < 6 || hour > 18) {
      return 0.1;
    }
    
    // Dawn/Dusk (6-8, 16-18)
    if (hour < 8) {
      return 0.1 + (hour - 6) * 0.2;
    }
    if (hour > 16) {
      return 0.5 - (hour - 16) * 0.2;
    }
    
    // Day (8-16)
    return 0.5;
  }
  
  private updateSunPosition(): void {
    const hour = this.options.timeOfDay;
    const dayProgress = hour / 24;
    
    // Calculate sun angle
    const sunAngle = (dayProgress - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle) * 10;
    const sunDistance = Math.cos(sunAngle) * 10;
    
    this.sunLight.position.set(sunDistance, sunHeight, 0);
    this.sunLight.intensity = Math.max(0, Math.sin(sunAngle)) * 1.5;
    
    // Update sun color based on time
    if (hour < 6 || hour > 18) {
      this.sunLight.color.setHex(0x4080ff); // Night blue
      this.sunLight.intensity = 0.1;
    } else if (hour < 8 || hour > 16) {
      this.sunLight.color.setHex(0xff6b35); // Sunrise/sunset orange
      this.sunLight.intensity = 1.0;
    } else {
      this.sunLight.color.setHex(0xffffff); // Day white
      this.sunLight.intensity = 1.5;
    }
    
    // Update shader uniforms
    if (this.skyMaterial) {
      this.skyMaterial.uniforms.sunPosition.value.copy(this.sunLight.position);
      this.skyMaterial.uniforms.timeOfDay.value = hour;
    }
    
    if (this.cloudsMesh) {
      const cloudMaterial = this.cloudsMesh.material as THREE.ShaderMaterial;
      cloudMaterial.uniforms.sunDirection.value.copy(this.sunLight.position).normalize();
    }
  }
  
  public setTimeOfDay(hour: number): void {
    this.options.timeOfDay = hour % 24;
    this.updateSunPosition();
    
    const ambientLight = this.scene.children.find(
      child => child instanceof THREE.AmbientLight
    ) as THREE.AmbientLight;
    
    if (ambientLight) {
      ambientLight.intensity = this.calculateAmbientIntensity();
    }
  }
  
  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    // Update clouds
    if (this.cloudsMesh) {
      const cloudMaterial = this.cloudsMesh.material as THREE.ShaderMaterial;
      cloudMaterial.uniforms.time.value = this.time;
    }
    
    // Update god rays
    if (this.godRaysEffect) {
      this.godRaysEffect.update();
    }
  }
  
  public getPostProcessingPasses(): any[] {
    const passes = [];
    
    if (this.ssaoPass && this.options.ssao) {
      passes.push(this.ssaoPass);
    }
    
    if (this.bloomPass && this.options.bloom) {
      passes.push(this.bloomPass);
    }
    
    return passes;
  }
  
  public dispose(): void {
    if (this.skyMaterial) {
      this.skyMaterial.dispose();
    }
    
    if (this.cloudsMesh) {
      this.cloudsMesh.geometry.dispose();
      (this.cloudsMesh.material as THREE.Material).dispose();
    }
    
    if (this.godRaysEffect) {
      this.godRaysEffect.dispose();
    }
  }
}