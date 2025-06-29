import * as THREE from 'three';

export interface OptimizationConfig {
  enableFrustumCulling?: boolean;
  enableOcclusionCulling?: boolean;
  enableLODBias?: boolean;
  enableBatching?: boolean;
  maxDrawDistance?: number;
  lodBias?: number;
}

export class GPUOptimizer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private config: Required<OptimizationConfig>;
  
  // Culling systems
  private frustumMatrix: THREE.Matrix4;
  private frustumPlanes: THREE.Plane[];
  private occlusionQueries: Map<string, WebGLQuery>;
  private visibilityCache: Map<string, boolean>;
  
  // LOD management
  private lodObjects: Map<string, THREE.LOD>;
  private dynamicLODBias: number = 1.0;
  
  // Performance metrics
  private frameTimeHistory: number[] = [];
  private targetFrameTime: number = 16.67; // 60 FPS
  
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config?: OptimizationConfig
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    this.config = {
      enableFrustumCulling: true,
      enableOcclusionCulling: true,
      enableLODBias: true,
      enableBatching: true,
      maxDrawDistance: 1000,
      lodBias: 1.0,
      ...config
    };
    
    this.frustumMatrix = new THREE.Matrix4();
    this.frustumPlanes = [];
    this.occlusionQueries = new Map();
    this.visibilityCache = new Map();
    this.lodObjects = new Map();
    
    this.initializeFrustumPlanes();
    this.setupOcclusionQueries();
  }
  
  private initializeFrustumPlanes(): void {
    // Create 6 frustum planes
    for (let i = 0; i < 6; i++) {
      this.frustumPlanes.push(new THREE.Plane());
    }
  }
  
  private setupOcclusionQueries(): void {
    if (!this.config.enableOcclusionCulling) return;
    
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !('createQuery' in gl)) {
      console.warn('WebGL2 occlusion queries not supported');
      this.config.enableOcclusionCulling = false;
    }
  }
  
  /**
   * Update frustum planes from camera matrices
   */
  private updateFrustumPlanes(): void {
    const camera = this.camera as THREE.PerspectiveCamera;
    
    // Compute frustum matrix
    this.frustumMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    
    // Extract planes from frustum matrix
    const me = this.frustumMatrix.elements;
    
    // Left plane
    this.frustumPlanes[0].setComponents(
      me[3] + me[0],
      me[7] + me[4],
      me[11] + me[8],
      me[15] + me[12]
    );
    
    // Right plane
    this.frustumPlanes[1].setComponents(
      me[3] - me[0],
      me[7] - me[4],
      me[11] - me[8],
      me[15] - me[12]
    );
    
    // Bottom plane
    this.frustumPlanes[2].setComponents(
      me[3] + me[1],
      me[7] + me[5],
      me[11] + me[9],
      me[15] + me[13]
    );
    
    // Top plane
    this.frustumPlanes[3].setComponents(
      me[3] - me[1],
      me[7] - me[5],
      me[11] - me[9],
      me[15] - me[13]
    );
    
    // Near plane
    this.frustumPlanes[4].setComponents(
      me[3] + me[2],
      me[7] + me[6],
      me[11] + me[10],
      me[15] + me[14]
    );
    
    // Far plane
    this.frustumPlanes[5].setComponents(
      me[3] - me[2],
      me[7] - me[6],
      me[11] - me[10],
      me[15] - me[14]
    );
    
    // Normalize planes
    this.frustumPlanes.forEach(plane => plane.normalize());
  }
  
  /**
   * GPU-accelerated frustum culling
   */
  private frustumCullObject(object: THREE.Object3D): boolean {
    if (!object.visible) return false;
    
    // Get bounding sphere
    let sphere: THREE.Sphere;
    if (object instanceof THREE.Mesh && object.geometry.boundingSphere) {
      sphere = object.geometry.boundingSphere.clone();
      sphere.applyMatrix4(object.matrixWorld);
    } else {
      // Estimate bounding sphere
      const box = new THREE.Box3().setFromObject(object);
      sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
    }
    
    // Test against frustum planes
    for (const plane of this.frustumPlanes) {
      if (plane.distanceToSphere(sphere) < 0) {
        return false; // Outside frustum
      }
    }
    
    return true; // Inside frustum
  }
  
  /**
   * Perform occlusion culling using GPU queries
   */
  private async performOcclusionCulling(object: THREE.Object3D): Promise<boolean> {
    if (!this.config.enableOcclusionCulling) return true;
    
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const objectId = object.uuid;
    
    // Check cache first
    if (this.visibilityCache.has(objectId)) {
      return this.visibilityCache.get(objectId)!;
    }
    
    // Create query if needed
    if (!this.occlusionQueries.has(objectId)) {
      const query = gl.createQuery();
      if (query) {
        this.occlusionQueries.set(objectId, query);
      }
    }
    
    // Perform occlusion test
    const query = this.occlusionQueries.get(objectId);
    if (query) {
      gl.beginQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE, query);
      // Render bounding box
      this.renderBoundingBox(object);
      gl.endQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE);
      
      // Check result (async)
      const result = await this.checkOcclusionQuery(gl, query);
      this.visibilityCache.set(objectId, result);
      return result;
    }
    
    return true; // Default to visible
  }
  
  private renderBoundingBox(object: THREE.Object3D): void {
    // Simplified bounding box rendering for occlusion test
    const box = new THREE.Box3().setFromObject(object);
    const helper = new THREE.Box3Helper(box, 0xffff00);
    helper.visible = false; // Don't actually show it
    this.renderer.render(helper, this.camera);
  }
  
  private checkOcclusionQuery(gl: WebGL2RenderingContext, query: WebGLQuery): Promise<boolean> {
    return new Promise((resolve) => {
      const check = () => {
        const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
        if (available) {
          const result = gl.getQueryParameter(query, gl.QUERY_RESULT);
          resolve(result > 0);
        } else {
          // Check again next frame
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }
  
  /**
   * Optimize LOD bias based on performance
   */
  private updateDynamicLODBias(): void {
    if (!this.config.enableLODBias) return;
    
    // Calculate average frame time
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    
    // Adjust LOD bias based on performance
    if (avgFrameTime > this.targetFrameTime * 1.1) {
      // Performance too low, increase LOD bias (use lower detail)
      this.dynamicLODBias = Math.min(this.dynamicLODBias * 1.1, 2.0);
    } else if (avgFrameTime < this.targetFrameTime * 0.9) {
      // Performance good, decrease LOD bias (use higher detail)
      this.dynamicLODBias = Math.max(this.dynamicLODBias * 0.95, 0.5);
    }
    
    // Apply to all LOD objects
    this.lodObjects.forEach((lod) => {
      lod.levels.forEach((level, index) => {
        const baseDistance = level.distance;
        level.distance = baseDistance * this.dynamicLODBias;
      });
    });
  }
  
  /**
   * Batch similar geometries for reduced draw calls
   */
  private batchGeometries(): void {
    if (!this.config.enableBatching) return;
    
    const meshGroups = new Map<string, THREE.Mesh[]>();
    
    // Group meshes by geometry and material
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.visible) {
        const key = `${object.geometry.uuid}_${object.material.uuid}`;
        if (!meshGroups.has(key)) {
          meshGroups.set(key, []);
        }
        meshGroups.get(key)!.push(object);
      }
    });
    
    // Create batched meshes
    meshGroups.forEach((meshes, key) => {
      if (meshes.length > 10) { // Only batch if we have enough meshes
        this.createBatchedMesh(meshes);
      }
    });
  }
  
  private createBatchedMesh(meshes: THREE.Mesh[]): void {
    const geometries: THREE.BufferGeometry[] = [];
    const matrices: THREE.Matrix4[] = [];
    
    meshes.forEach(mesh => {
      geometries.push(mesh.geometry);
      matrices.push(mesh.matrixWorld);
    });
    
    // For now, skip batching - would need BufferGeometryUtils import
    // This is an optimization that can be added later
    return;
  }
  
  /**
   * Main optimization update function
   */
  public optimize(frameTime: number): void {
    // Update performance history
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    
    // Update frustum planes
    if (this.config.enableFrustumCulling) {
      this.updateFrustumPlanes();
    }
    
    // Clear visibility cache periodically
    if (Math.random() < 0.1) {
      this.visibilityCache.clear();
    }
    
    // Optimize scene
    this.scene.traverse((object) => {
      // Distance culling
      if (object instanceof THREE.Mesh) {
        const distance = object.position.distanceTo(this.camera.position);
        if (distance > this.config.maxDrawDistance) {
          object.visible = false;
          return;
        }
      }
      
      // Frustum culling
      if (this.config.enableFrustumCulling) {
        object.visible = this.frustumCullObject(object);
      }
      
      // Register LOD objects
      if (object instanceof THREE.LOD) {
        this.lodObjects.set(object.uuid, object);
      }
    });
    
    // Update dynamic LOD bias
    this.updateDynamicLODBias();
    
    // Batch geometries periodically
    if (Math.random() < 0.01) {
      this.batchGeometries();
    }
  }
  
  /**
   * Get optimization statistics
   */
  public getStats(): {
    visibleObjects: number;
    culledObjects: number;
    drawCalls: number;
    triangles: number;
    avgFrameTime: number;
    lodBias: number;
  } {
    let visibleObjects = 0;
    let totalObjects = 0;
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        totalObjects++;
        if (object.visible) visibleObjects++;
      }
    });
    
    const info = this.renderer.info;
    const avgFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 0;
    
    return {
      visibleObjects,
      culledObjects: totalObjects - visibleObjects,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      avgFrameTime,
      lodBias: this.dynamicLODBias
    };
  }
  
  /**
   * Dispose of GPU resources
   */
  public dispose(): void {
    // Clean up occlusion queries
    if (this.config.enableOcclusionCulling) {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      this.occlusionQueries.forEach(query => {
        gl.deleteQuery(query);
      });
    }
    
    this.occlusionQueries.clear();
    this.visibilityCache.clear();
    this.lodObjects.clear();
  }
}