import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { VisualEffects } from './VisualEffects';

export interface RenderQuality {
  shadows: boolean;
  ssao: boolean;
  bloom: boolean;
  antialias: 'none' | 'fxaa' | 'smaa';
  textureQuality: 'low' | 'medium' | 'high' | 'ultra';
}

export class GlobeRenderer {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderQuality: RenderQuality;
  private visualEffects: VisualEffects | null = null;
  
  constructor(canvas: HTMLCanvasElement, quality: RenderQuality = {
    shadows: true,
    ssao: true,
    bloom: true,
    antialias: 'smaa',
    textureQuality: 'high'
  }) {
    this.renderQuality = quality;
    
    // WebGL 2.0 with all optimizations
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // Use post-processing AA instead
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    });
    
    // Enable WebGL 2.0 features
    this.renderer.capabilities.isWebGL2 = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = this.renderQuality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Set pixel ratio for retina displays
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Setup scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 100, 1000);
    
    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.width / canvas.height,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 3);
    
    // Setup post-processing
    this.setupComposer();
    
    // Handle resize
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }
  
  private setupComposer(): void {
    this.composer = new EffectComposer(this.renderer);
    
    // Main render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    // Bloom for god rays effect
    if (this.renderQuality.bloom) {
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5, // strength
        0.4, // radius
        0.85 // threshold
      );
      this.composer.addPass(bloomPass);
    }
    
    // Anti-aliasing
    if (this.renderQuality.antialias === 'smaa') {
      const smaaPass = new SMAAPass(
        window.innerWidth * this.renderer.getPixelRatio(),
        window.innerHeight * this.renderer.getPixelRatio()
      );
      this.composer.addPass(smaaPass);
    }
  }
  
  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }
  
  public render(deltaTime: number): void {
    if (this.renderQuality.bloom || this.renderQuality.ssao || this.renderQuality.antialias !== 'none') {
      this.composer.render(deltaTime);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  public setQuality(quality: RenderQuality): void {
    this.renderQuality = quality;
    this.renderer.shadowMap.enabled = quality.shadows;
    // Recreate composer with new settings
    this.setupComposer();
  }
  
  public dispose(): void {
    this.renderer.dispose();
    this.composer.dispose();
    window.removeEventListener('resize', () => this.handleResize());
  }
}