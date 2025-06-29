import * as THREE from 'three';
import { Park } from '@/lib/types';
import { GlobeRenderer, RenderQuality } from './GlobeRenderer';
import { EarthMesh } from './EarthMesh';
import { ParkMarkers } from './ParkMarkers';
import { PerformanceOptimizer } from './PerformanceOptimizer';
import { DataLoader } from './DataLoader';
import { TerrainSystem } from './TerrainSystem';
import { VisualEffects } from './VisualEffects';
import { GPUOptimizer } from './GPUOptimizer';
import { AdaptiveQualityManager } from './AdaptiveQualityManager';
import { TerrainRenderer } from './TerrainRenderer';
import { CameraControls } from './CameraControls';
import { StreetViewControls } from './StreetViewControls';

export interface GlobeEngineOptions {
  canvas: HTMLCanvasElement;
  quality?: RenderQuality;
  showStats?: boolean;
}

export interface FlyToOptions {
  duration?: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
}

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  up: THREE.Vector3;
  zoom: number;
}

type GlobeEvent = 'click' | 'hover' | 'cameraChange';
type EventHandler = (data: any) => void;

export class GlobeEngine {
  private renderer: GlobeRenderer;
  private earth: EarthMesh;
  private markers: ParkMarkers;
  private optimizer: PerformanceOptimizer;
  private dataLoader: DataLoader;
  private terrainSystem: TerrainSystem;
  private visualEffects: VisualEffects;
  private gpuOptimizer: GPUOptimizer;
  private adaptiveQuality: AdaptiveQualityManager;
  private terrainRenderer: TerrainRenderer;
  private cameraControls: CameraControls | null = null;
  private streetViewControls: StreetViewControls | null = null;
  private raycaster: THREE.Raycaster;
  
  // View state
  private viewMode: 'globe' | 'terrain' = 'globe';
  private currentParkId: string | null = null;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private autoRotate: boolean = true;
  private lastInteractionTime: number = Date.now();
  private eventHandlers: Map<GlobeEvent, Set<EventHandler>>;
  private selectedParkId: number | null = null;
  
  // Animation state
  private isAnimating: boolean = false;
  private animationStartTime: number = 0;
  private animationDuration: number = 0;
  private animationStartState: CameraState | null = null;
  private animationEndState: CameraState | null = null;
  private animationCallback: (() => void) | null = null;
  
  constructor(options: GlobeEngineOptions) {
    this.renderer = new GlobeRenderer(options.canvas, options.quality);
    this.earth = new EarthMesh();
    this.markers = new ParkMarkers([]);
    this.optimizer = new PerformanceOptimizer(options.showStats);
    this.dataLoader = new DataLoader(this.renderer.getRenderer());
    this.terrainSystem = new TerrainSystem(this.dataLoader);
    this.visualEffects = new VisualEffects(
      this.renderer.getScene(),
      this.renderer.getCamera(),
      this.renderer.getRenderer()
    );
    this.gpuOptimizer = new GPUOptimizer(
      this.renderer.getRenderer(),
      this.renderer.getScene(),
      this.renderer.getCamera()
    );
    this.adaptiveQuality = new AdaptiveQualityManager(this.renderer.getRenderer());
    this.terrainRenderer = new TerrainRenderer(
      this.renderer.getScene(),
      this.renderer.getCamera(),
      this.dataLoader
    );
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.eventHandlers = new Map();
    
    this.setupScene();
    this.setupEventListeners(options.canvas);
    this.loadAssets();
  }
  
  private setupScene(): void {
    const scene = this.renderer.getScene();
    
    // Add earth
    scene.add(this.earth.getGroup());
    
    // Add markers
    this.markers.getMeshes().forEach(mesh => scene.add(mesh));
    
    // Add stars background
    this.createStarField(scene);
    
    // Setup lighting
    this.setupLighting(scene);
  }
  
  private createStarField(scene: THREE.Scene): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 15000;
    const positions = new Float32Array(starsCount * 3);
    const colors = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount; i++) {
      const i3 = i * 3;
      
      // Random position on sphere
      const radius = 100 + Math.random() * 900;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Star color (slightly varied white)
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness * (0.8 + Math.random() * 0.2);
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const starsMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      sizeAttenuation: false,
      opacity: 0.9,
      transparent: true
    });
    
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
  }
  
  private setupLighting(scene: THREE.Scene): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    // Main sun light
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(10, 5, 5);
    sunLight.castShadow = true;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -2;
    sunLight.shadow.camera.right = 2;
    sunLight.shadow.camera.top = 2;
    sunLight.shadow.camera.bottom = -2;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0x4080ff, 0.3);
    fillLight.position.set(-5, -2, -5);
    scene.add(fillLight);
  }
  
  private setupEventListeners(canvas: HTMLCanvasElement): void {
    // Mouse events
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('click', (e) => this.onClick(e));
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
    
    // Interaction tracking
    const trackInteraction = () => {
      this.lastInteractionTime = Date.now();
      this.autoRotate = false;
    };
    
    canvas.addEventListener('mousedown', trackInteraction);
    canvas.addEventListener('wheel', trackInteraction);
    canvas.addEventListener('touchstart', trackInteraction);
  }
  
  private onMouseMove(event: MouseEvent): void {
    const canvas = this.renderer.getRenderer().domElement;
    const rect = canvas.getBoundingClientRect();
    
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycast for hover
    this.updateRaycast();
  }
  
  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const canvas = this.renderer.getRenderer().domElement;
      const rect = canvas.getBoundingClientRect();
      
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    }
  }
  
  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.onTouchStart(event);
      this.updateRaycast();
    }
  }
  
  private onClick(event: MouseEvent): void {
    this.updateRaycast();
    
    const hoveredPark = this.markers.raycast(this.raycaster);
    if (hoveredPark) {
      this.selectedParkId = hoveredPark.id;
      this.markers.setSelected(hoveredPark.id);
      this.emit('click', hoveredPark);
      
      // Switch to terrain view
      this.loadTerrainView(hoveredPark);
    }
  }
  
  private updateRaycast(): void {
    this.raycaster.setFromCamera(this.mouse, this.renderer.getCamera());
    
    const hoveredPark = this.markers.raycast(this.raycaster);
    this.emit('hover', hoveredPark);
  }
  
  private async loadAssets(): Promise<void> {
    try {
      await this.earth.loadTextures();
    } catch (error) {
      console.error('Failed to load earth textures:', error);
    }
  }
  
  public animate(): void {
    requestAnimationFrame(() => this.animate());
    
    this.optimizer.beginFrame();
    
    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    
    // Auto-rotate after inactivity
    if (!this.autoRotate && Date.now() - this.lastInteractionTime > 3000) {
      this.autoRotate = true;
    }
    
    // Update earth rotation
    if (this.autoRotate && !this.isAnimating) {
      this.earth.setRotation(elapsedTime * 0.05);
    }
    
    // Update earth shaders
    this.earth.update(elapsedTime);
    
    // Update markers animation
    this.markers.update(deltaTime);
    
    // Update terrain system
    this.terrainSystem.update(elapsedTime, this.renderer.getCamera());
    
    // Update terrain renderer if in terrain view
    if (this.viewMode === 'terrain') {
      this.terrainRenderer.update(deltaTime);
      
      // Update Street View controls
      if (this.streetViewControls) {
        this.streetViewControls.update(deltaTime);
      }
    }
    
    // Update visual effects
    this.visualEffects.update(deltaTime);
    
    // Handle camera animation
    if (this.isAnimating) {
      this.updateCameraAnimation();
    }
    
    // GPU optimizations
    const frameTime = deltaTime * 1000; // Convert to ms
    this.gpuOptimizer.optimize(frameTime);
    
    // Adaptive quality management
    this.adaptiveQuality.update(frameTime);
    
    // Update renderer quality if changed
    const currentQuality = this.adaptiveQuality.getRenderQuality();
    this.renderer.setQuality(currentQuality);
    
    // Optimize scene
    this.optimizer.optimizeScene(
      this.renderer.getScene(),
      this.renderer.getCamera()
    );
    
    // Render
    this.renderer.render(deltaTime);
    
    this.optimizer.endFrame(this.renderer.getRenderer());
  }
  
  private updateCameraAnimation(): void {
    const now = Date.now();
    const elapsed = now - this.animationStartTime;
    const progress = Math.min(elapsed / this.animationDuration, 1);
    
    if (progress >= 1) {
      this.isAnimating = false;
      if (this.animationCallback) {
        this.animationCallback();
        this.animationCallback = null;
      }
      return;
    }
    
    // Smooth easing
    const t = this.easeInOutCubic(progress);
    
    const camera = this.renderer.getCamera();
    if (this.animationStartState && this.animationEndState) {
      camera.position.lerpVectors(
        this.animationStartState.position,
        this.animationEndState.position,
        t
      );
      
      camera.lookAt(
        new THREE.Vector3().lerpVectors(
          this.animationStartState.target,
          this.animationEndState.target,
          t
        )
      );
    }
  }
  
  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  // Public API
  
  public async loadParks(parks: Park[]): Promise<void> {
    this.markers.dispose();
    this.markers = new ParkMarkers(parks);
    
    const scene = this.renderer.getScene();
    this.markers.getMeshes().forEach(mesh => scene.add(mesh));
  }
  
  public async loadStaticData(): Promise<Park[]> {
    try {
      const response = await fetch('/data/parks.json');
      if (!response.ok) throw new Error('Failed to load parks data');
      const data = await response.json();
      
      // Load parks into the engine
      await this.loadParks(data.parks || data);
      
      return data.parks || data;
    } catch (error) {
      console.error('Failed to load static data:', error);
      return [];
    }
  }
  
  public flyTo(target: Park | { lat: number; lng: number }, options?: FlyToOptions): Promise<void> {
    return new Promise((resolve) => {
      const camera = this.renderer.getCamera();
      const duration = options?.duration || 2000;
      
      // Calculate target position
      let lat: number, lng: number;
      if ('coordinates' in target) {
        lat = target.coordinates.lat;
        lng = target.coordinates.lon;
      } else {
        lat = target.lat;
        lng = target.lng;
      }
      
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      
      const distance = 2.5;
      const x = -(distance * Math.sin(phi) * Math.cos(theta));
      const y = distance * Math.cos(phi);
      const z = distance * Math.sin(phi) * Math.sin(theta);
      
      // Setup animation
      this.isAnimating = true;
      this.animationStartTime = Date.now();
      this.animationDuration = duration;
      this.animationStartState = {
        position: camera.position.clone(),
        target: new THREE.Vector3(0, 0, 0),
        up: camera.up.clone(),
        zoom: camera.zoom
      };
      this.animationEndState = {
        position: new THREE.Vector3(x, y, z),
        target: new THREE.Vector3(0, 0, 0),
        up: camera.up.clone(),
        zoom: camera.zoom
      };
      this.animationCallback = () => {
        resolve();
        options?.onComplete?.();
      };
    });
  }
  
  public setView(state: Partial<CameraState>): void {
    const camera = this.renderer.getCamera();
    
    if (state.position) {
      camera.position.copy(state.position);
    }
    if (state.target) {
      camera.lookAt(state.target);
    }
    if (state.zoom !== undefined) {
      camera.zoom = state.zoom;
      camera.updateProjectionMatrix();
    }
  }
  
  public getView(): CameraState {
    const camera = this.renderer.getCamera();
    return {
      position: camera.position.clone(),
      target: new THREE.Vector3(0, 0, 0),
      up: camera.up.clone(),
      zoom: camera.zoom
    };
  }
  
  public highlightPark(parkId: number): void {
    this.markers.setSelected(parkId);
  }
  
  public on(event: GlobeEvent, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }
  
  public off(event: GlobeEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }
  
  private emit(event: GlobeEvent, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
  
  public showLayer(layer: 'satellite' | 'terrain' | 'boundaries'): void {
    // Implement layer toggling
    console.log(`Showing layer: ${layer}`);
  }
  
  public hideLayer(layer: string): void {
    // Implement layer hiding
    console.log(`Hiding layer: ${layer}`);
  }
  
  public setQuality(quality: RenderQuality): void {
    this.renderer.setQuality(quality);
  }
  
  public getMetrics(): any {
    const optimizerMetrics = this.optimizer.getMetrics();
    const performanceReport = this.optimizer.getPerformanceReport();
    const performanceScore = this.optimizer.getPerformanceScore();
    const suggestions = this.optimizer.getOptimizationSuggestions();
    
    return {
      fps: optimizerMetrics.fps,
      frameTime: optimizerMetrics.frameTime,
      drawCalls: performanceReport?.drawCalls || 0,
      triangles: performanceReport?.triangles || 0,
      geometries: performanceReport?.geometries || 0,
      textures: performanceReport?.textures || 0,
      memoryUsage: performanceReport?.memoryUsage || { total: 0, geometries: 0, textures: 0 },
      score: performanceScore,
      suggestions: suggestions,
      quality: this.renderer.getCurrentQuality ? this.renderer.getCurrentQuality() : 'unknown',
      ...optimizerMetrics
    };
  }
  
  public isInTerrainView(): boolean {
    return this.viewMode === 'terrain';
  }
  
  public getCurrentViewMode(): 'globe' | 'terrain' {
    return this.viewMode;
  }
  
  // Terrain view methods
  
  private async loadTerrainView(park: Park): Promise<void> {
    // Save current camera state for returning
    const currentState = this.getView();
    
    // Set view mode
    this.viewMode = 'terrain';
    this.currentParkId = park.id.toString();
    
    // Hide globe elements
    this.earth.getGroup().visible = false;
    this.markers.getMeshes().forEach(mesh => mesh.visible = false);
    
    // Load terrain for the park
    await this.terrainRenderer.loadTerrainForPark(park.id.toString(), {
      parkId: park.id.toString(),
      quality: 'high',
      enableShadows: true,
      enableWater: true
    });
    
    // Get optimal camera position for terrain
    const { position, target } = this.terrainRenderer.getOptimalCameraPosition();
    
    // Animate camera to terrain view
    await this.flyToPosition(position, target, {
      duration: 2000,
      onComplete: () => {
        console.log(`Entered terrain view for ${park.name}`);
        
        // Initialize Street View controls
        this.initializeStreetViewControls();
      }
    });
  }
  
  private initializeStreetViewControls(): void {
    // Dispose of existing controls
    if (this.streetViewControls) {
      this.streetViewControls.dispose();
    }
    
    // Create new Street View controls
    this.streetViewControls = new StreetViewControls({
      camera: this.renderer.getCamera(),
      domElement: this.renderer.getRenderer().domElement,
      moveSpeed: 20,
      lookSpeed: 0.005,
      enableDamping: true,
      dampingFactor: 0.05
    });
    
    // Set initial position slightly above terrain
    const camera = this.renderer.getCamera();
    camera.position.y = Math.max(camera.position.y, 5);
    
    // Look towards center of terrain
    this.streetViewControls.lookAt(new THREE.Vector3(0, 0, 0));
  }
  
  public async exitTerrainView(): Promise<void> {
    if (this.viewMode !== 'terrain') return;
    
    // Dispose of Street View controls
    if (this.streetViewControls) {
      this.streetViewControls.dispose();
      this.streetViewControls = null;
    }
    
    // Clear terrain
    this.terrainRenderer.clearTerrain();
    
    // Show globe elements
    this.earth.getGroup().visible = true;
    this.markers.getMeshes().forEach(mesh => mesh.visible = true);
    
    // Reset view mode
    this.viewMode = 'globe';
    this.currentParkId = null;
    
    // Fly back to globe view
    await this.flyToPosition(
      new THREE.Vector3(0, 0, 3),
      new THREE.Vector3(0, 0, 0),
      {
        duration: 1500,
        onComplete: () => {
          console.log('Returned to globe view');
        }
      }
    );
  }
  
  private flyToPosition(
    position: THREE.Vector3,
    target: THREE.Vector3,
    options?: FlyToOptions
  ): Promise<void> {
    return new Promise((resolve) => {
      const camera = this.renderer.getCamera();
      const duration = options?.duration || 2000;
      
      // Setup animation
      this.isAnimating = true;
      this.animationStartTime = Date.now();
      this.animationDuration = duration;
      this.animationStartState = {
        position: camera.position.clone(),
        target: new THREE.Vector3(0, 0, 0), // Current target
        up: camera.up.clone(),
        zoom: camera.zoom
      };
      this.animationEndState = {
        position: position.clone(),
        target: target.clone(),
        up: camera.up.clone(),
        zoom: camera.zoom
      };
      this.animationCallback = () => {
        resolve();
        options?.onComplete?.();
      };
    });
  }
  
  public dispose(): void {
    this.earth.dispose();
    this.markers.dispose();
    this.renderer.dispose();
    this.optimizer.dispose();
    this.terrainRenderer.dispose();
  }
}