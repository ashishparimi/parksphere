import * as THREE from 'three';
import { RenderQuality } from './GlobeRenderer';

export interface DeviceProfile {
  tier: 'mobile' | 'low' | 'medium' | 'high' | 'ultra';
  gpuScore: number;
  maxTextureSize: number;
  maxVertices: number;
  supportedFeatures: Set<string>;
}

export interface QualityPreset {
  name: string;
  renderScale: number;
  shadows: boolean;
  shadowResolution: number;
  ssao: boolean;
  ssaoSamples: number;
  bloom: boolean;
  bloomStrength: number;
  antialias: 'none' | 'fxaa' | 'smaa';
  textureQuality: 'low' | 'medium' | 'high' | 'ultra';
  maxLOD: number;
  particleCount: number;
  reflections: boolean;
  cloudDensity: number;
  terrainDetail: number;
}

export class AdaptiveQualityManager {
  private renderer: THREE.WebGLRenderer;
  private targetFPS: number = 60;
  private targetFrameTime: number = 16.67;
  private currentQuality: QualityPreset;
  private deviceProfile: DeviceProfile;
  
  // Performance tracking
  private frameTimeHistory: number[] = [];
  private qualityHistory: number[] = [];
  private lastQualityChange: number = 0;
  private qualityChangeThreshold: number = 3000; // 3 seconds between changes
  
  // Quality presets
  private readonly presets: { [key: string]: QualityPreset } = {
    mobile: {
      name: 'mobile',
      renderScale: 0.5,
      shadows: false,
      shadowResolution: 512,
      ssao: false,
      ssaoSamples: 8,
      bloom: false,
      bloomStrength: 0.3,
      antialias: 'none',
      textureQuality: 'low',
      maxLOD: 2,
      particleCount: 1000,
      reflections: false,
      cloudDensity: 0.1,
      terrainDetail: 0.3
    },
    low: {
      name: 'low',
      renderScale: 0.75,
      shadows: false,
      shadowResolution: 1024,
      ssao: false,
      ssaoSamples: 16,
      bloom: true,
      bloomStrength: 0.4,
      antialias: 'fxaa',
      textureQuality: 'medium',
      maxLOD: 3,
      particleCount: 2500,
      reflections: false,
      cloudDensity: 0.2,
      terrainDetail: 0.5
    },
    medium: {
      name: 'medium',
      renderScale: 1.0,
      shadows: true,
      shadowResolution: 2048,
      ssao: true,
      ssaoSamples: 32,
      bloom: true,
      bloomStrength: 0.5,
      antialias: 'fxaa',
      textureQuality: 'high',
      maxLOD: 3,
      particleCount: 5000,
      reflections: false,
      cloudDensity: 0.3,
      terrainDetail: 0.7
    },
    high: {
      name: 'high',
      renderScale: 1.0,
      shadows: true,
      shadowResolution: 4096,
      ssao: true,
      ssaoSamples: 64,
      bloom: true,
      bloomStrength: 0.6,
      antialias: 'smaa',
      textureQuality: 'high',
      maxLOD: 4,
      particleCount: 10000,
      reflections: true,
      cloudDensity: 0.4,
      terrainDetail: 0.9
    },
    ultra: {
      name: 'ultra',
      renderScale: 1.5,
      shadows: true,
      shadowResolution: 8192,
      ssao: true,
      ssaoSamples: 128,
      bloom: true,
      bloomStrength: 0.7,
      antialias: 'smaa',
      textureQuality: 'ultra',
      maxLOD: 4,
      particleCount: 20000,
      reflections: true,
      cloudDensity: 0.5,
      terrainDetail: 1.0
    }
  };
  
  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.deviceProfile = this.detectDevice();
    this.currentQuality = this.getInitialQuality();
    this.applyQualityPreset(this.currentQuality);
  }
  
  private detectDevice(): DeviceProfile {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const capabilities = this.renderer.capabilities;
    
    // Detect GPU capabilities
    const maxTextureSize = capabilities.maxTextureSize;
    const maxVertices = capabilities.maxAttributes * 10000;
    
    // Check for WebGL extensions
    const supportedFeatures = new Set<string>();
    if (capabilities.isWebGL2) supportedFeatures.add('webgl2');
    if (gl.getExtension('WEBGL_compressed_texture_s3tc')) supportedFeatures.add('s3tc');
    if (gl.getExtension('WEBGL_compressed_texture_astc')) supportedFeatures.add('astc');
    if (gl.getExtension('OES_texture_float_linear')) supportedFeatures.add('floatLinear');
    
    // Benchmark GPU (simple test)
    const gpuScore = this.benchmarkGPU();
    
    // Determine device tier
    let tier: DeviceProfile['tier'] = 'medium';
    if (this.isMobile()) {
      tier = 'mobile';
    } else if (gpuScore < 30) {
      tier = 'low';
    } else if (gpuScore < 60) {
      tier = 'medium';
    } else if (gpuScore < 90) {
      tier = 'high';
    } else {
      tier = 'ultra';
    }
    
    return {
      tier,
      gpuScore,
      maxTextureSize,
      maxVertices,
      supportedFeatures
    };
  }
  
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  private benchmarkGPU(): number {
    // Simple GPU benchmark using render timing
    const testScene = new THREE.Scene();
    const testCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const testGeometry = new THREE.SphereGeometry(1, 64, 32);
    const testMaterial = new THREE.MeshPhongMaterial();
    
    // Create test meshes
    for (let i = 0; i < 100; i++) {
      const mesh = new THREE.Mesh(testGeometry, testMaterial);
      mesh.position.set(
        Math.random() * 10 - 5,
        Math.random() * 10 - 5,
        Math.random() * 10 - 5
      );
      testScene.add(mesh);
    }
    
    // Render test frames
    const startTime = performance.now();
    for (let i = 0; i < 10; i++) {
      this.renderer.render(testScene, testCamera);
    }
    const endTime = performance.now();
    const avgFrameTime = (endTime - startTime) / 10;
    
    // Clean up
    testScene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        obj.material.dispose();
      }
    });
    
    // Convert to score (0-100)
    return Math.max(0, Math.min(100, 100 - (avgFrameTime - 5) * 5));
  }
  
  private getInitialQuality(): QualityPreset {
    // Start with device-appropriate quality
    switch (this.deviceProfile.tier) {
      case 'mobile':
        return this.presets.mobile;
      case 'low':
        return this.presets.low;
      case 'medium':
        return this.presets.medium;
      case 'high':
        return this.presets.high;
      case 'ultra':
        return this.presets.ultra;
    }
  }
  
  public update(frameTime: number): void {
    // Track frame time
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    
    // Only adjust quality after threshold
    const now = performance.now();
    if (now - this.lastQualityChange < this.qualityChangeThreshold) {
      return;
    }
    
    // Calculate average performance
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    const currentFPS = 1000 / avgFrameTime;
    
    // Determine if quality adjustment needed
    if (currentFPS < this.targetFPS * 0.9) {
      this.decreaseQuality();
    } else if (currentFPS > this.targetFPS * 1.1 && avgFrameTime < this.targetFrameTime * 0.8) {
      this.increaseQuality();
    }
  }
  
  private decreaseQuality(): void {
    const presetNames = Object.keys(this.presets);
    const currentIndex = presetNames.findIndex(name => name === this.currentQuality.name);
    
    if (currentIndex > 0) {
      const newQuality = this.presets[presetNames[currentIndex - 1]];
      this.transitionToQuality(newQuality);
    } else {
      // Already at lowest, apply emergency optimizations
      this.applyEmergencyOptimizations();
    }
  }
  
  private increaseQuality(): void {
    const presetNames = Object.keys(this.presets);
    const currentIndex = presetNames.findIndex(name => name === this.currentQuality.name);
    
    if (currentIndex < presetNames.length - 1 && currentIndex < presetNames.indexOf(this.deviceProfile.tier)) {
      const newQuality = this.presets[presetNames[currentIndex + 1]];
      this.transitionToQuality(newQuality);
    }
  }
  
  private transitionToQuality(newQuality: QualityPreset): void {
    // Smooth transition between qualities
    const oldQuality = this.currentQuality;
    
    // Animate quality change over 500ms
    const startTime = performance.now();
    const duration = 500;
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      // Interpolate numeric values
      const interpolated = {
        ...newQuality,
        renderScale: this.lerp(oldQuality.renderScale, newQuality.renderScale, t),
        bloomStrength: this.lerp(oldQuality.bloomStrength, newQuality.bloomStrength, t),
        cloudDensity: this.lerp(oldQuality.cloudDensity, newQuality.cloudDensity, t),
        terrainDetail: this.lerp(oldQuality.terrainDetail, newQuality.terrainDetail, t)
      };
      
      this.applyQualityPreset(interpolated as QualityPreset);
      
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.currentQuality = newQuality;
        this.lastQualityChange = performance.now();
      }
    };
    
    animate();
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  
  private applyQualityPreset(preset: QualityPreset): void {
    // Update renderer settings
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth * preset.renderScale;
    const height = canvas.clientHeight * preset.renderScale;
    this.renderer.setSize(width, height, false);
    
    // Update shadow settings
    this.renderer.shadowMap.enabled = preset.shadows;
    if (preset.shadows) {
      this.renderer.shadowMap.type = preset.shadowResolution > 2048 
        ? THREE.PCFSoftShadowMap 
        : THREE.PCFShadowMap;
    }
    
    // Dispatch quality change event
    canvas.dispatchEvent(new CustomEvent('qualitychange', {
      detail: preset
    }));
  }
  
  private applyEmergencyOptimizations(): void {
    // Last resort optimizations
    const emergency = {
      ...this.currentQuality,
      renderScale: Math.max(0.25, this.currentQuality.renderScale * 0.75),
      particleCount: Math.max(100, this.currentQuality.particleCount * 0.5),
      maxLOD: Math.max(1, this.currentQuality.maxLOD - 1)
    };
    
    this.applyQualityPreset(emergency as QualityPreset);
  }
  
  public getRenderQuality(): RenderQuality {
    return {
      shadows: this.currentQuality.shadows,
      ssao: this.currentQuality.ssao,
      bloom: this.currentQuality.bloom,
      antialias: this.currentQuality.antialias,
      textureQuality: this.currentQuality.textureQuality
    };
  }
  
  public getCurrentPreset(): QualityPreset {
    return { ...this.currentQuality };
  }
  
  public getDeviceProfile(): DeviceProfile {
    return { ...this.deviceProfile };
  }
  
  public forceQuality(presetName: string): void {
    if (this.presets[presetName]) {
      this.currentQuality = this.presets[presetName];
      this.applyQualityPreset(this.currentQuality);
      this.lastQualityChange = performance.now();
    }
  }
  
  public getStats(): {
    currentQuality: string;
    deviceTier: string;
    gpuScore: number;
    avgFPS: number;
    renderScale: number;
  } {
    const avgFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 16.67;
    
    return {
      currentQuality: this.currentQuality.name,
      deviceTier: this.deviceProfile.tier,
      gpuScore: this.deviceProfile.gpuScore,
      avgFPS: 1000 / avgFrameTime,
      renderScale: this.currentQuality.renderScale
    };
  }
}