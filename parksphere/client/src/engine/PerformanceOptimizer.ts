import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  memory: number;
}

export class PerformanceOptimizer {
  private stats: Stats | null = null;
  private clock: THREE.Clock;
  private metrics: PerformanceMetrics;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private adaptiveQuality: boolean = true;
  private qualityLevel: number = 1; // 0-1 range
  
  constructor(showStats: boolean = false) {
    this.clock = new THREE.Clock();
    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      drawCalls: 0,
      triangles: 0,
      memory: 0
    };
    
    if (showStats) {
      this.stats = new Stats();
      this.stats.showPanel(0); // FPS
      document.body.appendChild(this.stats.dom);
    }
  }
  
  public beginFrame(): void {
    if (this.stats) this.stats.begin();
    this.lastTime = performance.now();
  }
  
  public endFrame(renderer: THREE.WebGLRenderer): void {
    if (this.stats) this.stats.end();
    
    // Calculate frame time
    const frameTime = performance.now() - this.lastTime;
    this.metrics.frameTime = frameTime;
    
    // Update FPS
    this.frameCount++;
    if (this.frameCount % 30 === 0) {
      this.metrics.fps = 1000 / frameTime;
      
      // Get renderer info
      const info = renderer.info;
      this.metrics.drawCalls = info.render.calls;
      this.metrics.triangles = info.render.triangles;
      
      // Adaptive quality
      if (this.adaptiveQuality) {
        this.adjustQuality();
      }
    }
  }
  
  private adjustQuality(): void {
    const targetFPS = 55;
    const fps = this.metrics.fps;
    
    if (fps < targetFPS - 10) {
      // Reduce quality
      this.qualityLevel = Math.max(0, this.qualityLevel - 0.1);
    } else if (fps > targetFPS + 5) {
      // Increase quality
      this.qualityLevel = Math.min(1, this.qualityLevel + 0.05);
    }
  }
  
  public getQualityLevel(): number {
    return this.qualityLevel;
  }
  
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  public optimizeScene(scene: THREE.Scene, camera: THREE.Camera): void {
    // Frustum culling is automatic in Three.js
    // Additional optimizations can be added here
    
    // LOD-based visibility
    scene.traverse((object) => {
      if (object instanceof THREE.LOD) {
        object.update(camera);
      }
    });
  }
  
  public createLOD(
    highDetail: THREE.Object3D,
    mediumDetail: THREE.Object3D,
    lowDetail: THREE.Object3D
  ): THREE.LOD {
    const lod = new THREE.LOD();
    
    lod.addLevel(highDetail, 0);
    lod.addLevel(mediumDetail, 50);
    lod.addLevel(lowDetail, 100);
    
    return lod;
  }
  
  public enableGPUInstancing(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    count: number
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return mesh;
  }
  
  public dispose(): void {
    if (this.stats && this.stats.dom.parentElement) {
      document.body.removeChild(this.stats.dom);
    }
  }
}