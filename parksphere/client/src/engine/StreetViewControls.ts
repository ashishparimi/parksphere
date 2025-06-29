import * as THREE from 'three';

export interface StreetViewControlsOptions {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  moveSpeed?: number;
  lookSpeed?: number;
  enableDamping?: boolean;
  dampingFactor?: number;
}

export class StreetViewControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  
  // Movement
  private moveSpeed: number;
  private lookSpeed: number;
  private enableDamping: boolean;
  private dampingFactor: number;
  
  // State
  private isMouseDown: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private lat: number = 0;
  private lon: number = 0;
  private phi: number = 0;
  private theta: number = 0;
  
  // Velocity for smooth movement
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private rotationVelocity: { lat: number; lon: number } = { lat: 0, lon: 0 };
  
  // Keys pressed
  private keys: { [key: string]: boolean } = {};
  
  // Touch support
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  
  // Bounds
  private minHeight: number = 2;
  private maxHeight: number = 100;
  private bounds: THREE.Box3 | null = null;
  
  constructor(options: StreetViewControlsOptions) {
    this.camera = options.camera;
    this.domElement = options.domElement;
    this.moveSpeed = options.moveSpeed || 20;
    this.lookSpeed = options.lookSpeed || 0.005;
    this.enableDamping = options.enableDamping !== false;
    this.dampingFactor = options.dampingFactor || 0.05;
    
    this.init();
  }
  
  private init(): void {
    // Mouse events
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this));
    
    // Touch events
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
    
    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Context menu
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Initialize camera rotation
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.lat = Math.asin(direction.y) * 180 / Math.PI;
    this.lon = Math.atan2(direction.x, direction.z) * 180 / Math.PI;
  }
  
  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // Left click
      this.isMouseDown = true;
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
    }
  }
  
  private onMouseMove(event: MouseEvent): void {
    if (!this.isMouseDown) return;
    
    const deltaX = event.clientX - this.mouseX;
    const deltaY = event.clientY - this.mouseY;
    
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
    
    // Update rotation velocity
    this.rotationVelocity.lon = -deltaX * this.lookSpeed * 100;
    this.rotationVelocity.lat = deltaY * this.lookSpeed * 100;
  }
  
  private onMouseUp(): void {
    this.isMouseDown = false;
  }
  
  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    
    // Move forward/backward based on wheel
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = 0; // Keep movement horizontal
    forward.normalize();
    
    const speed = event.deltaY > 0 ? -this.moveSpeed * 0.5 : this.moveSpeed * 0.5;
    this.velocity.add(forward.multiplyScalar(speed));
  }
  
  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
      this.isMouseDown = true;
    }
  }
  
  private onTouchMove(event: TouchEvent): void {
    if (!this.isMouseDown || event.touches.length !== 1) return;
    
    const deltaX = event.touches[0].clientX - this.touchStartX;
    const deltaY = event.touches[0].clientY - this.touchStartY;
    
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    
    // Update rotation velocity
    this.rotationVelocity.lon = -deltaX * this.lookSpeed * 50;
    this.rotationVelocity.lat = deltaY * this.lookSpeed * 50;
  }
  
  private onTouchEnd(): void {
    this.isMouseDown = false;
  }
  
  private onKeyDown(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = true;
  }
  
  private onKeyUp(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = false;
  }
  
  public update(deltaTime: number): void {
    // Update rotation with damping
    if (this.enableDamping) {
      this.lon += this.rotationVelocity.lon;
      this.lat += this.rotationVelocity.lat;
      
      this.rotationVelocity.lon *= 1 - this.dampingFactor;
      this.rotationVelocity.lat *= 1 - this.dampingFactor;
    } else {
      this.lon += this.rotationVelocity.lon;
      this.lat += this.rotationVelocity.lat;
      
      this.rotationVelocity.lon = 0;
      this.rotationVelocity.lat = 0;
    }
    
    // Clamp latitude
    this.lat = Math.max(-85, Math.min(85, this.lat));
    
    // Convert to radians
    this.phi = THREE.MathUtils.degToRad(90 - this.lat);
    this.theta = THREE.MathUtils.degToRad(this.lon);
    
    // Calculate look direction
    const lookAt = new THREE.Vector3();
    lookAt.x = this.camera.position.x + Math.sin(this.phi) * Math.cos(this.theta);
    lookAt.y = this.camera.position.y + Math.cos(this.phi);
    lookAt.z = this.camera.position.z + Math.sin(this.phi) * Math.sin(this.theta);
    
    this.camera.lookAt(lookAt);
    
    // Handle keyboard movement
    const moveVector = new THREE.Vector3();
    
    if (this.keys['w'] || this.keys['arrowup']) {
      moveVector.z -= 1;
    }
    if (this.keys['s'] || this.keys['arrowdown']) {
      moveVector.z += 1;
    }
    if (this.keys['a'] || this.keys['arrowleft']) {
      moveVector.x -= 1;
    }
    if (this.keys['d'] || this.keys['arrowright']) {
      moveVector.x += 1;
    }
    if (this.keys['q']) {
      moveVector.y -= 1;
    }
    if (this.keys['e']) {
      moveVector.y += 1;
    }
    
    // Apply movement in camera space
    if (moveVector.length() > 0) {
      moveVector.normalize();
      moveVector.applyQuaternion(this.camera.quaternion);
      
      // Keep vertical movement separate
      const verticalMovement = moveVector.y;
      moveVector.y = 0;
      moveVector.normalize();
      
      this.velocity.add(moveVector.multiplyScalar(this.moveSpeed * deltaTime));
      this.velocity.y += verticalMovement * this.moveSpeed * deltaTime;
    }
    
    // Apply velocity with damping
    this.camera.position.add(this.velocity);
    
    if (this.enableDamping) {
      this.velocity.multiplyScalar(1 - this.dampingFactor * 2);
    } else {
      this.velocity.set(0, 0, 0);
    }
    
    // Keep camera within bounds
    if (this.bounds) {
      this.camera.position.clamp(this.bounds.min, this.bounds.max);
    }
    
    // Maintain minimum height above terrain
    this.camera.position.y = Math.max(this.camera.position.y, this.minHeight);
    this.camera.position.y = Math.min(this.camera.position.y, this.maxHeight);
  }
  
  public setBounds(bounds: THREE.Box3): void {
    this.bounds = bounds;
  }
  
  public setPosition(position: THREE.Vector3): void {
    this.camera.position.copy(position);
    this.velocity.set(0, 0, 0);
  }
  
  public lookAt(target: THREE.Vector3): void {
    const direction = new THREE.Vector3().subVectors(target, this.camera.position).normalize();
    this.lat = Math.asin(direction.y) * 180 / Math.PI;
    this.lon = Math.atan2(direction.x, direction.z) * 180 / Math.PI;
  }
  
  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.removeEventListener('wheel', this.onWheel.bind(this));
    this.domElement.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.domElement.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.domElement.removeEventListener('touchend', this.onTouchEnd.bind(this));
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}