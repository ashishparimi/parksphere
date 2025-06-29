import * as THREE from 'three';

export interface OptimizationSettings {
  // Rendering
  pixelRatio: number;
  powerPreference: 'default' | 'high-performance' | 'low-power';
  antialias: boolean;
  alpha: boolean;
  premultipliedAlpha: boolean;
  preserveDrawingBuffer: boolean;
  
  // Textures
  maxTextureSize: number;
  anisotropy: number;
  textureFilter: THREE.TextureFilter;
  mipmaps: boolean;
  
  // Geometry
  maxVerticesPerMesh: number;
  useIndexedGeometry: boolean;
  mergeStaticGeometry: boolean;
  
  // Features
  useWorkers: boolean;
  offscreenCanvas: boolean;
  gpuCompute: boolean;
}

export class DeviceOptimizations {
  private static instance: DeviceOptimizations;
  private settings: OptimizationSettings;
  private deviceType: 'mobile' | 'tablet' | 'desktop';
  private gpuTier: 'low' | 'medium' | 'high';
  
  private constructor() {
    this.deviceType = this.detectDeviceType();
    this.gpuTier = this.detectGPUTier();
    this.settings = this.generateOptimalSettings();
  }
  
  public static getInstance(): DeviceOptimizations {
    if (!DeviceOptimizations.instance) {
      DeviceOptimizations.instance = new DeviceOptimizations();
    }
    return DeviceOptimizations.instance;
  }
  
  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = navigator.userAgent;
    
    if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      return 'mobile';
    }
    
    if (/iPad|Android.*(?!Mobile)|Tablet/i.test(userAgent)) {
      return 'tablet';
    }
    
    return 'desktop';
  }
  
  private detectGPUTier(): 'low' | 'medium' | 'high' {
    // Check WebGL capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) return 'low';
    
    // Get renderer info
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo 
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : 'Unknown';
    
    // Check max texture size
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    
    // Detect known GPUs
    const rendererString = renderer.toString().toLowerCase();
    
    // High-end GPUs
    if (rendererString.includes('nvidia') && 
        (rendererString.includes('rtx') || rendererString.includes('gtx 10') || 
         rendererString.includes('gtx 16') || rendererString.includes('gtx 20'))) {
      return 'high';
    }
    
    if (rendererString.includes('apple') && rendererString.includes('m1')) {
      return 'high';
    }
    
    if (rendererString.includes('amd') && rendererString.includes('rx')) {
      return 'high';
    }
    
    // Low-end GPUs
    if (rendererString.includes('intel') && 
        (rendererString.includes('hd') || rendererString.includes('uhd'))) {
      return 'low';
    }
    
    if (rendererString.includes('adreno') && parseInt(rendererString.match(/\d+/)?.[0] || '0') < 600) {
      return 'low';
    }
    
    if (rendererString.includes('mali') && !rendererString.includes('g7')) {
      return 'low';
    }
    
    // Check texture size as fallback
    if (maxTextureSize < 4096) return 'low';
    if (maxTextureSize < 8192) return 'medium';
    
    return 'medium';
  }
  
  private generateOptimalSettings(): OptimizationSettings {
    const baseSettings: OptimizationSettings = {
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      powerPreference: 'high-performance',
      antialias: true,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      maxTextureSize: 4096,
      anisotropy: 16,
      textureFilter: THREE.LinearFilter,
      mipmaps: true,
      maxVerticesPerMesh: 65536,
      useIndexedGeometry: true,
      mergeStaticGeometry: true,
      useWorkers: true,
      offscreenCanvas: 'OffscreenCanvas' in window,
      gpuCompute: true
    };
    
    // Apply device-specific optimizations
    if (this.deviceType === 'mobile') {
      return {
        ...baseSettings,
        pixelRatio: 1,
        powerPreference: 'low-power',
        antialias: false,
        maxTextureSize: 2048,
        anisotropy: 4,
        textureFilter: THREE.NearestFilter,
        mipmaps: false,
        maxVerticesPerMesh: 32768,
        mergeStaticGeometry: false,
        useWorkers: false,
        gpuCompute: false
      };
    }
    
    if (this.deviceType === 'tablet') {
      return {
        ...baseSettings,
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
        maxTextureSize: 2048,
        anisotropy: 8,
        maxVerticesPerMesh: 49152
      };
    }
    
    // Apply GPU tier optimizations
    if (this.gpuTier === 'low') {
      return {
        ...baseSettings,
        antialias: false,
        maxTextureSize: 2048,
        anisotropy: 4,
        textureFilter: THREE.NearestFilter,
        mergeStaticGeometry: false,
        gpuCompute: false
      };
    }
    
    if (this.gpuTier === 'high') {
      return {
        ...baseSettings,
        pixelRatio: window.devicePixelRatio,
        maxTextureSize: 8192,
        anisotropy: 16
      };
    }
    
    return baseSettings;
  }
  
  public getSettings(): OptimizationSettings {
    return { ...this.settings };
  }
  
  public applyToRenderer(renderer: THREE.WebGLRenderer): void {
    renderer.setPixelRatio(this.settings.pixelRatio);
    
    const context = renderer.getContext();
    if (context && 'getContextAttributes' in context) {
      const attributes = context.getContextAttributes();
      if (attributes) {
        // These would need to be set at renderer creation
        console.log('Optimal context attributes:', {
          alpha: this.settings.alpha,
          antialias: this.settings.antialias,
          premultipliedAlpha: this.settings.premultipliedAlpha,
          preserveDrawingBuffer: this.settings.preserveDrawingBuffer,
          powerPreference: this.settings.powerPreference
        });
      }
    }
  }
  
  public optimizeTexture(texture: THREE.Texture): void {
    // Apply device-specific texture optimizations
    texture.anisotropy = Math.min(
      this.settings.anisotropy,
      texture.anisotropy
    );
    
    if (!this.settings.mipmaps) {
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
    }
    
    // Reduce texture size if needed
    if (texture.image && texture.image.width > this.settings.maxTextureSize) {
      console.warn(`Texture size ${texture.image.width} exceeds device limit ${this.settings.maxTextureSize}`);
      // In production, you'd resize the texture here
    }
  }
  
  public optimizeGeometry(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position;
    
    if (positions && positions.count > this.settings.maxVerticesPerMesh) {
      console.warn(`Geometry has ${positions.count} vertices, exceeds device limit ${this.settings.maxVerticesPerMesh}`);
      // In production, you'd implement geometry simplification here
    }
    
    // Ensure indexed geometry for better performance
    if (this.settings.useIndexedGeometry && !geometry.index) {
      // Convert to indexed geometry if beneficial
      const vertexCount = positions.count;
      if (vertexCount > 100) {
        // Simple deduplication (in production, use more sophisticated algorithm)
        const indices = [];
        for (let i = 0; i < vertexCount; i++) {
          indices.push(i);
        }
        geometry.setIndex(indices);
      }
    }
  }
  
  public shouldUseFeature(feature: string): boolean {
    switch (feature) {
      case 'shadows':
        return this.gpuTier !== 'low' && this.deviceType === 'desktop';
      case 'ssao':
        return this.gpuTier === 'high' && this.deviceType === 'desktop';
      case 'bloom':
        return this.gpuTier !== 'low';
      case 'reflections':
        return this.gpuTier === 'high';
      case 'particles':
        return this.deviceType !== 'mobile';
      case 'postprocessing':
        return this.gpuTier !== 'low';
      case 'highQualityTextures':
        return this.settings.maxTextureSize >= 4096;
      default:
        return true;
    }
  }
  
  public getRecommendedLOD(): { min: number; max: number; bias: number } {
    if (this.deviceType === 'mobile') {
      return { min: 0, max: 2, bias: 1.5 };
    }
    
    if (this.gpuTier === 'low') {
      return { min: 0, max: 2, bias: 1.3 };
    }
    
    if (this.gpuTier === 'high') {
      return { min: 0, max: 4, bias: 0.8 };
    }
    
    return { min: 0, max: 3, bias: 1.0 };
  }
  
  public getInfo(): {
    deviceType: string;
    gpuTier: string;
    pixelRatio: number;
    maxTextureSize: number;
    features: { [key: string]: boolean };
  } {
    return {
      deviceType: this.deviceType,
      gpuTier: this.gpuTier,
      pixelRatio: this.settings.pixelRatio,
      maxTextureSize: this.settings.maxTextureSize,
      features: {
        shadows: this.shouldUseFeature('shadows'),
        ssao: this.shouldUseFeature('ssao'),
        bloom: this.shouldUseFeature('bloom'),
        reflections: this.shouldUseFeature('reflections'),
        particles: this.shouldUseFeature('particles'),
        postprocessing: this.shouldUseFeature('postprocessing'),
        highQualityTextures: this.shouldUseFeature('highQualityTextures')
      }
    };
  }
}