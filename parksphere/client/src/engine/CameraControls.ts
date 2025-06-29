import * as THREE from 'three';

export interface CameraControlsOptions {
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  zoomSpeed?: number;
  rotateSpeed?: number;
  panSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  dampingFactor?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

export class CameraControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private options: Required<CameraControlsOptions>;
  
  // State
  private spherical = new THREE.Spherical();
  private sphericalDelta = new THREE.Spherical();
  private scale = 1;
  private panOffset = new THREE.Vector3();
  private zoomChanged = false;
  
  // Mouse state
  private rotateStart = new THREE.Vector2();
  private rotateEnd = new THREE.Vector2();
  private rotateDelta = new THREE.Vector2();
  private panStart = new THREE.Vector2();
  private panEnd = new THREE.Vector2();
  private panDelta = new THREE.Vector2();
  
  // Touch state
  private touches = { ONE: 0, TWO: 1 };
  private touchState = this.touches.ONE;
  private touchStartDistance = 0;
  
  // Flags
  private isMouseDown = false;
  private isPanning = false;
  
  // Constants
  private EPS = 0.000001;
  private target = new THREE.Vector3();
  
  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, options?: CameraControlsOptions) {
    this.camera = camera;
    this.domElement = domElement;
    
    this.options = {
      enablePan: true,
      enableZoom: true,
      enableRotate: true,
      zoomSpeed: 1.0,
      rotateSpeed: 1.0,
      panSpeed: 1.0,
      minDistance: 0.1,
      maxDistance: Infinity,
      minPolarAngle: 0,
      maxPolarAngle: Math.PI,
      dampingFactor: 0.05,
      autoRotate: false,
      autoRotateSpeed: 2.0,
      ...options
    };
    
    this.init();
  }
  
  private init(): void {
    const position = this.camera.position;
    this.target.set(0, 0, 0);
    
    // Initialize spherical coordinates
    const offset = position.clone().sub(this.target);
    this.spherical.setFromVector3(offset);
    
    // Add event listeners
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('wheel', this.onMouseWheel.bind(this));
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
    
    // Keyboard controls
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }
  
  private onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isMouseDown = true;
    
    if (event.button === 0) { // Left mouse button
      if (event.ctrlKey || event.metaKey || event.shiftKey) {
        if (this.options.enablePan) {
          this.isPanning = true;
          this.panStart.set(event.clientX, event.clientY);
        }
      } else {
        if (this.options.enableRotate) {
          this.rotateStart.set(event.clientX, event.clientY);
        }
      }
    } else if (event.button === 1) { // Middle mouse button
      if (this.options.enablePan) {
        this.isPanning = true;
        this.panStart.set(event.clientX, event.clientY);
      }
    } else if (event.button === 2) { // Right mouse button
      if (this.options.enablePan) {
        this.isPanning = true;
        this.panStart.set(event.clientX, event.clientY);
      }
    }
    
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }
  
  private onMouseMove(event: MouseEvent): void {
    event.preventDefault();
    
    if (!this.isMouseDown) return;
    
    if (this.isPanning) {
      this.panEnd.set(event.clientX, event.clientY);
      this.panDelta.subVectors(this.panEnd, this.panStart);
      this.pan(this.panDelta.x, this.panDelta.y);
      this.panStart.copy(this.panEnd);
    } else if (this.options.enableRotate) {
      this.rotateEnd.set(event.clientX, event.clientY);
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
      
      const element = this.domElement;
      this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight * this.options.rotateSpeed);
      this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.options.rotateSpeed);
      
      this.rotateStart.copy(this.rotateEnd);
    }
  }
  
  private onMouseUp(): void {
    this.isMouseDown = false;
    this.isPanning = false;
    
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
  }
  
  private onMouseWheel(event: WheelEvent): void {
    event.preventDefault();
    
    if (!this.options.enableZoom) return;
    
    if (event.deltaY < 0) {
      this.zoomIn();
    } else if (event.deltaY > 0) {
      this.zoomOut();
    }
  }
  
  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    switch (event.touches.length) {
      case 1: // One-finger touch: rotate
        if (this.options.enableRotate) {
          this.rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
        }
        break;
        
      case 2: // Two-finger touch: zoom and pan
        if (this.options.enableZoom) {
          const dx = event.touches[0].pageX - event.touches[1].pageX;
          const dy = event.touches[0].pageY - event.touches[1].pageY;
          this.touchStartDistance = Math.sqrt(dx * dx + dy * dy);
        }
        
        if (this.options.enablePan) {
          const x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
          const y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
          this.panStart.set(x, y);
        }
        break;
    }
    
    this.touchState = event.touches.length === 1 ? this.touches.ONE : this.touches.TWO;
  }
  
  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    switch (event.touches.length) {
      case 1: // One-finger touch: rotate
        if (this.options.enableRotate && this.touchState === this.touches.ONE) {
          this.rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
          this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
          
          const element = this.domElement;
          this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight * this.options.rotateSpeed);
          this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.options.rotateSpeed);
          
          this.rotateStart.copy(this.rotateEnd);
        }
        break;
        
      case 2: // Two-finger touch: zoom and pan
        if (this.options.enableZoom && this.touchState === this.touches.TWO) {
          const dx = event.touches[0].pageX - event.touches[1].pageX;
          const dy = event.touches[0].pageY - event.touches[1].pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          const scale = distance / this.touchStartDistance;
          this.touchStartDistance = distance;
          
          if (scale < 1) {
            this.zoomOut();
          } else if (scale > 1) {
            this.zoomIn();
          }
        }
        
        if (this.options.enablePan && this.touchState === this.touches.TWO) {
          const x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
          const y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
          this.panEnd.set(x, y);
          this.panDelta.subVectors(this.panEnd, this.panStart);
          this.pan(this.panDelta.x, this.panDelta.y);
          this.panStart.copy(this.panEnd);
        }
        break;
    }
  }
  
  private onTouchEnd(): void {
    this.touchState = this.touches.ONE;
  }
  
  private onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
      case 'w':
        this.pan(0, -10);
        break;
      case 'ArrowDown':
      case 's':
        this.pan(0, 10);
        break;
      case 'ArrowLeft':
      case 'a':
        this.pan(-10, 0);
        break;
      case 'ArrowRight':
      case 'd':
        this.pan(10, 0);
        break;
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
      case '_':
        this.zoomOut();
        break;
    }
  }
  
  private rotateLeft(angle: number): void {
    this.sphericalDelta.theta -= angle;
  }
  
  private rotateUp(angle: number): void {
    this.sphericalDelta.phi -= angle;
  }
  
  private zoomIn(): void {
    this.scale *= 0.95;
    this.zoomChanged = true;
  }
  
  private zoomOut(): void {
    this.scale /= 0.95;
    this.zoomChanged = true;
  }
  
  private pan(deltaX: number, deltaY: number): void {
    const offset = new THREE.Vector3();
    const position = this.camera.position;
    offset.copy(position).sub(this.target);
    let targetDistance = offset.length();
    
    // Half of the fov in radians
    const fov = this.camera.fov / 2 * Math.PI / 180;
    targetDistance *= Math.tan(fov);
    
    // Pan left/right
    const panLeft = new THREE.Vector3();
    const panUp = new THREE.Vector3();
    
    panLeft.setFromMatrixColumn(this.camera.matrix, 0);
    panLeft.multiplyScalar(-2 * deltaX * targetDistance / this.domElement.clientHeight * this.options.panSpeed);
    
    panUp.setFromMatrixColumn(this.camera.matrix, 1);
    panUp.multiplyScalar(2 * deltaY * targetDistance / this.domElement.clientHeight * this.options.panSpeed);
    
    this.panOffset.add(panLeft);
    this.panOffset.add(panUp);
  }
  
  public update(): boolean {
    const offset = new THREE.Vector3();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      this.camera.up,
      new THREE.Vector3(0, 1, 0)
    );
    const quatInverse = quat.clone().invert();
    const position = this.camera.position;
    
    offset.copy(position).sub(this.target);
    offset.applyQuaternion(quat);
    
    this.spherical.setFromVector3(offset);
    
    if (this.options.autoRotate) {
      this.rotateLeft(this.getAutoRotationAngle());
    }
    
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;
    
    // Restrict phi to be between desired limits
    this.spherical.phi = Math.max(this.options.minPolarAngle, Math.min(this.options.maxPolarAngle, this.spherical.phi));
    this.spherical.phi = Math.max(this.EPS, Math.min(Math.PI - this.EPS, this.spherical.phi));
    
    this.spherical.radius *= this.scale;
    
    // Restrict radius to be between desired limits
    this.spherical.radius = Math.max(this.options.minDistance, Math.min(this.options.maxDistance, this.spherical.radius));
    
    // Move target to panned location
    this.target.add(this.panOffset);
    
    offset.setFromSpherical(this.spherical);
    offset.applyQuaternion(quatInverse);
    
    position.copy(this.target).add(offset);
    
    this.camera.lookAt(this.target);
    
    // Damping
    this.sphericalDelta.theta *= (1 - this.options.dampingFactor);
    this.sphericalDelta.phi *= (1 - this.options.dampingFactor);
    this.panOffset.multiplyScalar(1 - this.options.dampingFactor);
    
    // Update condition is:
    // min(camera displacement, camera rotation in radians)^2 > EPS
    // using small-angle approximation cos(x/2) = 1 - x^2 / 8
    if (this.zoomChanged ||
        this.panOffset.lengthSq() > this.EPS ||
        this.sphericalDelta.theta > this.EPS ||
        this.sphericalDelta.phi > this.EPS) {
      this.zoomChanged = false;
      this.scale = 1;
      return true;
    }
    
    return false;
  }
  
  private getAutoRotationAngle(): number {
    return 2 * Math.PI / 60 / 60 * this.options.autoRotateSpeed;
  }
  
  public reset(): void {
    this.target.set(0, 0, 0);
    this.camera.position.set(0, 0, 3);
    this.camera.lookAt(this.target);
    
    this.spherical.set(3, Math.PI / 2, 0);
    this.sphericalDelta.set(0, 0, 0);
    this.scale = 1;
    this.panOffset.set(0, 0, 0);
  }
  
  public dispose(): void {
    this.domElement.removeEventListener('contextmenu', (e) => e.preventDefault());
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.removeEventListener('wheel', this.onMouseWheel.bind(this));
    this.domElement.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.domElement.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.domElement.removeEventListener('touchend', this.onTouchEnd.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
  }
}