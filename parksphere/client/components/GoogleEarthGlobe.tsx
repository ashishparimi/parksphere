'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Park } from '@/lib/types';
import SimpleOrbitControls from './SimpleOrbitControls';

// Park marker component - glowing dots
interface ParkMarkerProps {
  park: Park;
  onClick: () => void;
  scale: number;
  zoomLevel: number;
  selectedParkId?: number | null;
}

function ParkMarker({ park, onClick, scale, zoomLevel, selectedParkId }: ParkMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const labelRef = useRef<THREE.Sprite>(null);
  const isSelected = selectedParkId === park.id;
  
  const phi = (90 - park.coordinates.lat) * (Math.PI / 180);
  const theta = (park.coordinates.lon + 180) * (Math.PI / 180);
  
  const radius = 2.02;
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  useFrame((state) => {
    if (groupRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 3 + park.id) * 0.1 + 1;
      const baseScale = isSelected ? 1.5 : 1;
      groupRef.current.scale.setScalar(pulse * scale * baseScale);
    }
    
    // Make label face camera
    if (labelRef.current) {
      labelRef.current.lookAt(state.camera.position);
    }
  });
  
  // LOD settings based on zoom level
  const showLabel = zoomLevel > 0.6 || hovered || isSelected;
  const showMiddleGlow = zoomLevel > 0.3;
  const markerSize = zoomLevel > 0.8 ? 1 : 0.7;
  
  return (
    <group ref={groupRef} position={[x, y, z]}>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.04 * markerSize, 16, 16]} />
        <meshBasicMaterial
          color={isSelected ? "#ffff00" : "#00ff88"}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Middle glow - only show at higher zoom levels */}
      {showMiddleGlow && (
        <mesh>
          <sphereGeometry args={[0.025 * markerSize, 16, 16]} />
          <meshBasicMaterial
            color={isSelected ? "#ffff66" : "#44ff99"}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      
      {/* Core dot */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'grab';
        }}
      >
        <sphereGeometry args={[0.015 * markerSize, 8, 8]} />
        <meshBasicMaterial
          color={hovered || isSelected ? '#ffffff' : '#88ffaa'}
        />
      </mesh>
      
      {/* Label - show based on zoom level or interaction */}
      {showLabel && (
        <sprite ref={labelRef} position={[0, 0.08, 0]}>
          <spriteMaterial 
            opacity={0.9} 
            color="#ffffff"
            depthWrite={false}
            sizeAttenuation={false}
          >
            <canvasTexture
              attach="map"
              image={(() => {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                  ctx.roundRect(0, 0, 256, 64, 8);
                  ctx.fill();
                  
                  ctx.font = 'bold 20px Arial';
                  ctx.fillStyle = 'white';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(park.name, 128, 22);
                  
                  ctx.font = '14px Arial';
                  ctx.fillStyle = '#88ffaa';
                  ctx.fillText(park.country, 128, 42);
                }
                return canvas;
              })()}
            />
          </spriteMaterial>
        </sprite>
      )}
    </group>
  );
}

// Earth component with realistic texture
function Earth({ parks, onParkClick, selectedParkId }: { parks: Park[], onParkClick: (park: Park) => void, selectedParkId?: number | null }) {
  const groupRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const earthRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [autoRotate, setAutoRotate] = useState(true);
  const lastInteractionTime = useRef(Date.now());
  const [normZoomLevel, setNormZoomLevel] = useState(1);
  
  // Handle user interaction
  useEffect(() => {
    const handleInteraction = () => {
      lastInteractionTime.current = Date.now();
      setAutoRotate(false);
    };
    
    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('wheel', handleInteraction);
    
    return () => {
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('wheel', handleInteraction);
    };
  }, []);
  
  // Calculate zoom level based on camera distance
  useFrame((state, delta) => {
    if (groupRef.current) {
      const distance = camera.position.length();
      const newZoomLevel = Math.max(0.2, Math.min(2, 10 / distance));
      setZoomLevel(newZoomLevel);
      
      // Normalized zoom level (0 = far, 1 = close)
      const normalizedZoom = (20 - distance) / 17; // Based on min/max distance 3-20
      setNormZoomLevel(Math.max(0, Math.min(1, normalizedZoom)));
      
      // Re-enable auto-rotation after 5 seconds of inactivity
      if (!autoRotate && Date.now() - lastInteractionTime.current > 5000) {
        setAutoRotate(true);
      }
      
      // Gentle auto-rotation for kids
      if (autoRotate) {
        groupRef.current.rotation.y += 0.0008; // Slow, steady rotation
      }
    }
    
    // Rotate clouds slowly - speed based on zoom
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0001 * (1 + normZoomLevel * 0.5);
    }
    
    // Update shader uniforms
    if (earthRef.current && earthRef.current.material) {
      const material = earthRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value = state.clock.elapsedTime;
        material.uniforms.zoomLevel.value = normZoomLevel;
      }
    }
  });
  
  // Create a more realistic Earth shader with LOD
  const earthShader = {
    uniforms: {
      time: { value: 0 },
      zoomLevel: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float zoomLevel;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      // Simple noise function for continent generation
      float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      // Smooth noise
      float smoothNoise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        
        float a = noise(i);
        float b = noise(i + vec2(1.0, 0.0));
        float c = noise(i + vec2(0.0, 1.0));
        float d = noise(i + vec2(1.0, 1.0));
        
        vec2 u = f * f * (3.0 - 2.0 * f);
        
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      
      // Multi-octave noise for detail
      float detailNoise(vec2 st, float zoom) {
        float value = 0.0;
        float amplitude = 1.0;
        float frequency = 1.0;
        
        // Add more octaves when zoomed in
        int octaves = int(3.0 + zoom * 3.0);
        
        for (int i = 0; i < 6; i++) {
          if (i >= octaves) break;
          value += smoothNoise(st * frequency) * amplitude;
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        
        return value;
      }
      
      void main() {
        // Base continent patterns
        float continent = smoothNoise(vUv * 8.0) * smoothNoise(vUv * 4.0 + 100.0);
        
        // Add detail based on zoom level
        float detail = detailNoise(vUv * 32.0, zoomLevel) * zoomLevel * 0.1;
        continent += detail;
        
        continent = smoothstep(0.3, 0.4, continent);
        
        // Ocean colors with zoom-based detail
        vec3 oceanDeep = vec3(0.05, 0.15, 0.4);
        vec3 oceanShallow = vec3(0.1, 0.3, 0.6);
        float oceanDetail = smoothNoise(vUv * (20.0 + zoomLevel * 30.0));
        vec3 ocean = mix(oceanDeep, oceanShallow, oceanDetail);
        
        // Add wave patterns when zoomed in
        if (zoomLevel > 0.5) {
          float waves = sin(vUv.x * 200.0 + time * 2.0) * sin(vUv.y * 200.0 + time * 1.5) * 0.02;
          ocean += vec3(0.05, 0.1, 0.15) * waves * (zoomLevel - 0.5) * 2.0;
        }
        
        // Land colors with vegetation detail
        vec3 landGreen = vec3(0.2, 0.5, 0.2);
        vec3 landBrown = vec3(0.4, 0.35, 0.2);
        vec3 landYellow = vec3(0.7, 0.6, 0.3); // Desert
        
        float landType = smoothNoise(vUv * (15.0 + zoomLevel * 20.0) + 50.0);
        vec3 land = landGreen;
        if (landType > 0.6) land = mix(landGreen, landBrown, (landType - 0.6) * 2.5);
        if (landType > 0.8) land = mix(landBrown, landYellow, (landType - 0.8) * 5.0);
        
        // Mountain ranges when zoomed in
        if (zoomLevel > 0.4) {
          float mountains = smoothNoise(vUv * 100.0) * smoothNoise(vUv * 50.0);
          if (mountains > 0.5) {
            land = mix(land, vec3(0.5, 0.45, 0.4), (mountains - 0.5) * 2.0 * zoomLevel);
          }
        }
        
        // Snow at poles with better gradients
        float polar = abs(vUv.y - 0.5) * 2.0;
        float snow = smoothstep(0.7 - zoomLevel * 0.1, 0.8, polar);
        vec3 snowColor = vec3(0.95, 0.95, 1.0);
        
        // Mix colors
        vec3 color = mix(ocean, land, continent);
        color = mix(color, snowColor, snow);
        
        // Enhanced lighting
        float light = dot(vNormal, normalize(vec3(1.0, 1.0, 0.5)));
        light = light * 0.5 + 0.5;
        color *= light;
        
        // Cloud shadows when zoomed in
        if (zoomLevel > 0.3) {
          float cloudShadow = smoothNoise(vUv * 10.0 + time * 0.05);
          color *= 1.0 - cloudShadow * 0.1 * zoomLevel;
        }
        
        // Atmosphere on edges
        float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 1.5);
        color += vec3(0.1, 0.3, 0.6) * fresnel * (0.5 - zoomLevel * 0.2);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  };
  
  return (
    <group ref={groupRef}>
      {/* Earth sphere with realistic shader - LOD based on zoom */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, normZoomLevel > 0.5 ? 256 : 128, normZoomLevel > 0.5 ? 256 : 128]} />
        <shaderMaterial
          vertexShader={earthShader.vertexShader}
          fragmentShader={earthShader.fragmentShader}
          uniforms={earthShader.uniforms}
        />
      </mesh>
      
      {/* Cloud layer - more detail when zoomed */}
      <mesh ref={cloudsRef} scale={[1.01, 1.01, 1.01]}>
        <sphereGeometry args={[2, normZoomLevel > 0.4 ? 64 : 32, normZoomLevel > 0.4 ? 64 : 32]} />
        <meshPhongMaterial
          color="#ffffff"
          transparent
          opacity={0.4 - normZoomLevel * 0.1}
          depthWrite={false}
        />
      </mesh>
      
      {/* Atmosphere */}
      <mesh scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial
          color="#4ca2ff"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Park markers with LOD */}
      {parks.map((park) => (
        <ParkMarker
          key={park.id}
          park={park}
          onClick={() => onParkClick(park)}
          scale={zoomLevel}
          zoomLevel={normZoomLevel}
          selectedParkId={selectedParkId}
        />
      ))}
    </group>
  );
}

// Loading component
function LoadingEarth() {
  return (
    <mesh>
      <sphereGeometry args={[2, 32, 32]} />
      <meshBasicMaterial color="#1a3a52" wireframe />
    </mesh>
  );
}

interface GoogleEarthGlobeProps {
  parks: Park[];
  onParkClick: (park: Park) => void;
  selectedParkId?: number | null;
}

export default function GoogleEarthGlobe({ parks, onParkClick, selectedParkId }: GoogleEarthGlobeProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Set cursor style for the globe
    document.body.style.cursor = 'grab';
    
    return () => {
      document.body.style.cursor = 'default';
    };
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black">
      <Canvas
        camera={{ 
          position: [0, 0, 8], 
          fov: 45,
          near: 0.1,
          far: 1000
        }}
        onCreated={() => setIsLoading(false)}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} color="#ffffff" />
        <directionalLight position={[-10, -10, -5]} intensity={0.2} color="#4ca2ff" />
        
        {/* Stars background */}
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={5000}
              array={new Float32Array(5000 * 3).map(() => (Math.random() - 0.5) * 300)}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial size={0.5} sizeAttenuation color="white" />
        </points>
        
        {/* Earth and controls */}
        <Suspense fallback={<LoadingEarth />}>
          <Earth parks={parks} onParkClick={onParkClick} selectedParkId={selectedParkId} />
        </Suspense>
        
        {/* Custom OrbitControls for Google Earth-like navigation */}
        <SimpleOrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          zoomSpeed={0.8}
          rotateSpeed={0.5}
          minDistance={3}
          maxDistance={20}
        />
        
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Instructions */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="bg-black/70 backdrop-blur-md text-white px-6 py-3 rounded-full pointer-events-auto">
            <p className="text-sm font-light">
              🌍 Drag to spin Earth • 🔍 Scroll to zoom • ✨ Click green dots to explore parks
            </p>
          </div>
        </div>
        
        {/* Title */}
        <div className="absolute top-8 left-8">
          <h1 className="text-4xl font-bold text-white">
            PARK<span className="text-green-400">SPHERE</span>
          </h1>
          <p className="text-white/70 mt-1">Explore the World's Greatest National Parks</p>
        </div>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-xl">Loading Earth...</div>
          </div>
        )}
      </div>
    </div>
  );
}