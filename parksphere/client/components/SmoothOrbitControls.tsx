import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SmoothOrbitControlsProps {
  minDistance?: number;
  maxDistance?: number;
  rotateSpeed?: number;
  zoomSpeed?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  dampingFactor?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

export default function SmoothOrbitControls({
  minDistance = 2.5,
  maxDistance = 8,
  rotateSpeed = 0.5,
  zoomSpeed = 1.0,
  enablePan = false,
  enableZoom = true,
  enableRotate = true,
  dampingFactor = 0.05,
  autoRotate = false,
  autoRotateSpeed = 0.5,
}: SmoothOrbitControlsProps) {
  const { camera, gl } = useThree();
  
  // State refs
  const spherical = useRef(new THREE.Spherical());
  const sphericalTarget = useRef(new THREE.Spherical());
  const rotateStart = useRef(new THREE.Vector2());
  const rotateEnd = useRef(new THREE.Vector2());
  const rotateDelta = useRef(new THREE.Vector2());
  const dollyStart = useRef(new THREE.Vector2());
  const dollyEnd = useRef(new THREE.Vector2());
  const dollyDelta = useRef(new THREE.Vector2());
  
  // Interaction state
  const state = useRef({
    isRotating: false,
    isZooming: false,
    touches: [] as Touch[],
    lastTouchDistance: 0,
  });
  
  // Inertia
  const velocity = useRef({ theta: 0, phi: 0 });
  const lastInteraction = useRef(0);

  useEffect(() => {
    const element = gl.domElement;
    
    // Initialize spherical from camera position
    spherical.current.setFromVector3(camera.position);
    sphericalTarget.current.copy(spherical.current);

    // Mouse handlers
    const handleMouseDown = (event: MouseEvent) => {
      if (!enableRotate || event.button !== 0) return;
      
      event.preventDefault();
      rotateStart.current.set(event.clientX, event.clientY);
      state.current.isRotating = true;
      lastInteraction.current = Date.now();
      
      // Clear velocity on new interaction
      velocity.current.theta = 0;
      velocity.current.phi = 0;
      
      element.style.cursor = 'grabbing';
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!state.current.isRotating) return;
      
      event.preventDefault();
      rotateEnd.current.set(event.clientX, event.clientY);
      rotateDelta.current.subVectors(rotateEnd.current, rotateStart.current);
      
      const deltaTime = Date.now() - lastInteraction.current;
      lastInteraction.current = Date.now();
      
      // Calculate rotation with proper scaling
      const rotateLeft = 2 * Math.PI * rotateDelta.current.x / element.clientHeight * rotateSpeed;
      const rotateUp = 2 * Math.PI * rotateDelta.current.y / element.clientHeight * rotateSpeed;
      
      sphericalTarget.current.theta -= rotateLeft;
      sphericalTarget.current.phi -= rotateUp;
      
      // Track velocity for inertia
      if (deltaTime > 0) {
        velocity.current.theta = -rotateLeft / (deltaTime * 0.001);
        velocity.current.phi = -rotateUp / (deltaTime * 0.001);
      }
      
      rotateStart.current.copy(rotateEnd.current);
    };

    const handleMouseUp = () => {
      state.current.isRotating = false;
      element.style.cursor = 'grab';
    };

    // Wheel handler with smooth zoom
    const handleWheel = (event: WheelEvent) => {
      if (!enableZoom) return;
      
      event.preventDefault();
      
      // Normalize wheel delta across browsers and devices
      let delta = event.deltaY;
      
      // Handle different wheel modes
      if (event.deltaMode === 1) {
        delta *= 40; // Line mode
      } else if (event.deltaMode === 2) {
        delta *= 800; // Page mode
      }
      
      // Clamp delta to prevent extreme zoom jumps
      delta = Math.max(-50, Math.min(50, delta));
      
      // Apply zoom with exponential scaling for ultra-smooth zoom
      const zoomFactor = 1.0 + (delta * 0.001 * zoomSpeed);
      sphericalTarget.current.radius *= zoomFactor;
      
      // Smooth clamping with slight overshoot allowance
      const clampedRadius = Math.max(minDistance * 0.95, Math.min(maxDistance * 1.05, sphericalTarget.current.radius));
      sphericalTarget.current.radius += (clampedRadius - sphericalTarget.current.radius) * 0.5;
    };

    // Touch handlers for mobile
    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      
      state.current.touches = Array.from(event.touches);
      
      switch (event.touches.length) {
        case 1:
          if (enableRotate) {
            const touch = event.touches[0];
            rotateStart.current.set(touch.clientX, touch.clientY);
            state.current.isRotating = true;
          }
          break;
          
        case 2:
          if (enableZoom) {
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            state.current.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
            state.current.isZooming = true;
          }
          break;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      
      switch (event.touches.length) {
        case 1:
          if (state.current.isRotating && enableRotate) {
            const touch = event.touches[0];
            rotateEnd.current.set(touch.clientX, touch.clientY);
            rotateDelta.current.subVectors(rotateEnd.current, rotateStart.current);
            
            const rotateLeft = 2 * Math.PI * rotateDelta.current.x / element.clientHeight * rotateSpeed;
            const rotateUp = 2 * Math.PI * rotateDelta.current.y / element.clientHeight * rotateSpeed;
            
            sphericalTarget.current.theta -= rotateLeft;
            sphericalTarget.current.phi -= rotateUp;
            
            rotateStart.current.copy(rotateEnd.current);
          }
          break;
          
        case 2:
          if (state.current.isZooming && enableZoom) {
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const zoomScale = state.current.lastTouchDistance / distance;
            sphericalTarget.current.radius *= zoomScale;
            sphericalTarget.current.radius = Math.max(minDistance, Math.min(maxDistance, sphericalTarget.current.radius));
            
            state.current.lastTouchDistance = distance;
          }
          break;
      }
    };

    const handleTouchEnd = () => {
      state.current.isRotating = false;
      state.current.isZooming = false;
      state.current.touches = [];
    };

    // Context menu prevention
    const handleContextMenu = (event: Event) => {
      event.preventDefault();
    };

    // Add event listeners
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('wheel', handleWheel, { passive: false });
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('contextmenu', handleContextMenu);
    
    // Global listeners
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gl, camera, enablePan, enableZoom, enableRotate, rotateSpeed, zoomSpeed, minDistance, maxDistance]);

  useFrame((_, delta) => {
    // Apply inertia when not interacting
    if (!state.current.isRotating && !state.current.isZooming) {
      if (Math.abs(velocity.current.theta) > 0.001 || Math.abs(velocity.current.phi) > 0.001) {
        sphericalTarget.current.theta += velocity.current.theta * delta;
        sphericalTarget.current.phi += velocity.current.phi * delta;
        
        // Dampen velocity
        velocity.current.theta *= 0.92;
        velocity.current.phi *= 0.92;
      }
    }
    
    // Auto-rotate
    if (autoRotate && !state.current.isRotating) {
      sphericalTarget.current.theta += autoRotateSpeed * delta;
    }
    
    // Clamp phi to prevent flipping
    sphericalTarget.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalTarget.current.phi));
    
    // Smooth interpolation towards target
    spherical.current.theta += (sphericalTarget.current.theta - spherical.current.theta) * dampingFactor;
    spherical.current.phi += (sphericalTarget.current.phi - spherical.current.phi) * dampingFactor;
    spherical.current.radius += (sphericalTarget.current.radius - spherical.current.radius) * dampingFactor;
    
    // Apply to camera
    const offset = new THREE.Vector3();
    offset.setFromSpherical(spherical.current);
    camera.position.copy(offset);
    camera.lookAt(0, 0, 0);
  });

  return null;
}