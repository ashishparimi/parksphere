import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SimpleOrbitControlsProps {
  minDistance?: number;
  maxDistance?: number;
  rotateSpeed?: number;
  zoomSpeed?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  enableMagneticScroll?: boolean;
  magneticScrollThreshold?: number;
  magneticScrollSpeed?: number;
  reset?: boolean;
}

export default function SimpleOrbitControls({
  minDistance = 2.5,
  maxDistance = 8,
  rotateSpeed = 0.3,
  zoomSpeed = 0.3,
  enablePan = false,
  enableZoom = true,
  enableRotate = true,
  enableMagneticScroll = false,  // Disabled by default - too annoying
  magneticScrollThreshold = 150,
  magneticScrollSpeed = 0.2,  // Much slower for kid-friendly experience
  reset = false,
}: SimpleOrbitControlsProps) {
  const { camera, gl } = useThree();
  const spherical = useRef(new THREE.Spherical());
  const sphericalDelta = useRef(new THREE.Spherical());
  const scale = useRef(1);
  const panOffset = useRef(new THREE.Vector3());
  const rotateStart = useRef(new THREE.Vector2());
  const rotateEnd = useRef(new THREE.Vector2());
  const rotateDelta = useRef(new THREE.Vector2());
  const isRotating = useRef(false);
  const mousePosition = useRef(new THREE.Vector2());

  useEffect(() => {
    const element = gl.domElement;
    
    // Initialize spherical from camera position
    spherical.current.setFromVector3(camera.position);

    const handleMouseDown = (event: MouseEvent) => {
      if (!enableRotate) return;
      
      rotateStart.current.set(event.clientX, event.clientY);
      isRotating.current = true;
      document.body.style.cursor = 'grabbing';
    };


    const handleMouseUp = () => {
      isRotating.current = false;
      document.body.style.cursor = 'grab';
    };

    const handleWheel = (event: WheelEvent) => {
      if (!enableZoom) return;
      
      event.preventDefault();
      
      // Much smoother zoom with deltaY normalization
      const delta = event.deltaY;
      const normalizedDelta = delta > 0 ? 1 : -1;
      
      // Smaller increment for smoother zoom
      const zoomFactor = 1 + (normalizedDelta * 0.02 * zoomSpeed);
      scale.current *= zoomFactor;
      
      // Clamp scale to reasonable values
      scale.current = Math.max(0.9, Math.min(1.1, scale.current));
    };

    const handleMouseMoveGlobal = (event: MouseEvent) => {
      // Update mouse position for magnetic scrolling
      mousePosition.current.set(event.clientX, event.clientY);
      
      // Also handle rotation if dragging
      if (isRotating.current && enableRotate) {
        rotateEnd.current.set(event.clientX, event.clientY);
        rotateDelta.current.subVectors(rotateEnd.current, rotateStart.current);

        const element = gl.domElement;
        
        // Rotate left/right
        sphericalDelta.current.theta -= 2 * Math.PI * rotateDelta.current.x / element.clientWidth * rotateSpeed;
        
        // Rotate up/down
        sphericalDelta.current.phi -= 2 * Math.PI * rotateDelta.current.y / element.clientHeight * rotateSpeed;

        rotateStart.current.copy(rotateEnd.current);
      }
    };

    element.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [gl, camera, enablePan, enableZoom, enableRotate, rotateSpeed, zoomSpeed]);

  useFrame(() => {
    const offset = new THREE.Vector3();
    
    // Handle reset - properly reset camera to default position
    if (reset) {
      // Set camera to default viewing angle
      spherical.current.radius = 3;
      spherical.current.theta = 0;
      spherical.current.phi = Math.PI / 2;
      sphericalDelta.current.set(0, 0, 0);
      scale.current = 1;
      
      // Apply immediately
      const offset = new THREE.Vector3();
      offset.setFromSpherical(spherical.current);
      camera.position.copy(offset);
      camera.lookAt(0, 0, 0);
    }
    
    // Get current position in spherical coordinates
    offset.copy(camera.position);
    spherical.current.setFromVector3(offset);
    
    // Apply magnetic edge scrolling if enabled and not rotating
    if (enableMagneticScroll && !isRotating.current) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const mouseX = mousePosition.current.x;
      const mouseY = mousePosition.current.y;
      
      // Calculate distance from edges
      const leftEdgeDist = mouseX;
      const rightEdgeDist = viewportWidth - mouseX;
      const topEdgeDist = mouseY;
      const bottomEdgeDist = viewportHeight - mouseY;
      
      // Apply magnetic rotation based on edge proximity
      let isInEdgeZone = false;
      
      if (leftEdgeDist < magneticScrollThreshold) {
        const force = (1 - leftEdgeDist / magneticScrollThreshold) * magneticScrollSpeed * 0.002;
        sphericalDelta.current.theta += force;
        isInEdgeZone = true;
      } else if (rightEdgeDist < magneticScrollThreshold) {
        const force = -(1 - rightEdgeDist / magneticScrollThreshold) * magneticScrollSpeed * 0.002;
        sphericalDelta.current.theta += force;
        isInEdgeZone = true;
      }
      
      if (topEdgeDist < magneticScrollThreshold) {
        const force = (1 - topEdgeDist / magneticScrollThreshold) * magneticScrollSpeed * 0.001;
        sphericalDelta.current.phi += force;
        isInEdgeZone = true;
      } else if (bottomEdgeDist < magneticScrollThreshold) {
        const force = -(1 - bottomEdgeDist / magneticScrollThreshold) * magneticScrollSpeed * 0.001;
        sphericalDelta.current.phi += force;
        isInEdgeZone = true;
      }
      
      // If not in edge zone, apply stronger damping for quicker stop
      if (!isInEdgeZone) {
        sphericalDelta.current.theta *= 0.9;
        sphericalDelta.current.phi *= 0.9;
      }
    }
    
    // Apply delta with damping
    spherical.current.theta += sphericalDelta.current.theta;
    spherical.current.phi += sphericalDelta.current.phi;
    
    // Restrict phi to be between desired limits
    spherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.current.phi));
    
    // Apply zoom
    spherical.current.radius *= scale.current;
    spherical.current.radius = Math.max(minDistance, Math.min(maxDistance, spherical.current.radius));
    
    // Apply to camera
    offset.setFromSpherical(spherical.current);
    camera.position.copy(offset);
    camera.lookAt(0, 0, 0);
    
    // Apply stronger damping for smoother movement
    sphericalDelta.current.theta *= 0.85;
    sphericalDelta.current.phi *= 0.85;
    
    // Stop if velocity is very small
    if (Math.abs(sphericalDelta.current.theta) < 0.00001) {
      sphericalDelta.current.theta = 0;
    }
    if (Math.abs(sphericalDelta.current.phi) < 0.00001) {
      sphericalDelta.current.phi = 0;
    }
    
    // Reset scale after applying
    scale.current = 1;
  });

  return null;
}