'use client';

import { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Park } from '@/lib/types';
import SmoothOrbitControls from './SmoothOrbitControls';
import ParkTooltip from './ParkTooltip';
import CompassCursor from './CompassCursor';

// Distinct biome color mapping for clear differentiation
const biomeColors = {
  'Tropical Rainforest': { primary: '#00b300', secondary: '#009900' },     // Deep green
  'Temperate Forest': { primary: '#228b22', secondary: '#006400' },        // Forest green
  'Boreal Forest': { primary: '#0f4d0f', secondary: '#003300' },           // Dark green
  'Desert': { primary: '#ff8c00', secondary: '#ff6600' },                  // Orange
  'Alpine': { primary: '#6495ed', secondary: '#4169e1' },                  // Cornflower blue
  'Grassland': { primary: '#9acd32', secondary: '#7cfc00' },               // Yellow-green
  'Mediterranean': { primary: '#daa520', secondary: '#b8860b' },           // Goldenrod
  'Tundra': { primary: '#b0c4de', secondary: '#778899' },                  // Light steel blue
  'Wetland': { primary: '#4682b4', secondary: '#1e90ff' },                 // Steel blue
  'Coral Reef': { primary: '#ff1493', secondary: '#ff69b4' },              // Deep pink
  'Marine': { primary: '#0000cd', secondary: '#0000ff' },                  // Medium blue
  'Savanna': { primary: '#d2691e', secondary: '#a0522d' },                 // Chocolate/sienna
  'Ice Sheet': { primary: '#add8e6', secondary: '#87ceeb' },               // Light blue
  'Mountain': { primary: '#8b4513', secondary: '#654321' },                // Saddle brown
  'Volcanic': { primary: '#dc143c', secondary: '#8b0000' },                // Crimson
  'Coastal': { primary: '#20b2aa', secondary: '#008b8b' }                  // Light sea green
};

// Park type icons (using Unicode symbols)
const parkIcons = {
  'Tropical Rainforest': '🌴',
  'Desert': '🏜️',
  'Alpine': '🏔️',
  'Marine': '🌊',
  'Volcanic': '🌋',
  'Ice Sheet': '🧊',
  'Wetland': '🦆',
  'Coral Reef': '🐠',
  'default': '🏞️'
};

// Park marker component with effects
interface ParkMarkerProps {
  park: Park;
  onClick: () => void;
  onHover: (park: Park | null) => void;
  isSelected: boolean;
}

function ParkMarker({ park, onClick, onHover, isSelected }: ParkMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Get biome-specific colors
  const colors = biomeColors[park.biome as keyof typeof biomeColors] || biomeColors['Grassland'];
  
  const phi = (90 - park.coordinates.lat) * (Math.PI / 180);
  const theta = (park.coordinates.lon + 180) * (Math.PI / 180);
  
  const radius = 1.005;
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Floating animation
    const floatY = Math.sin(time * 2 + park.id) * 0.002;
    groupRef.current.position.y = y + floatY;
    
    // Pulse glow
    if (glowRef.current) {
      const pulse = Math.sin(time * 3 + park.id) * 0.1 + 0.9;
      glowRef.current.scale.setScalar(pulse);
    }
    
    // Scale on hover
    const scale = isSelected ? 1.3 : (hovered ? 1.1 : 1);
    groupRef.current.scale.x = scale;
    groupRef.current.scale.z = scale;
  });
  
  return (
    <group 
      ref={groupRef} 
      position={[x, y, z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(park);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHover(null);
      }}
    >
      {/* Glow base */}
      <mesh ref={glowRef}>
        <circleGeometry args={[0.015, 32]} />
        <meshBasicMaterial
          color={colors.primary}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Main marker dot */}
      <mesh>
        <circleGeometry args={[0.008, 32]} />
        <meshBasicMaterial
          color={colors.primary}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Inner bright dot */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[0.004, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Selection indicator */}
      {isSelected && (
        <mesh>
          <ringGeometry args={[0.012, 0.015, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// Enhanced Earth component with real textures
function Earth({ parks, onParkClick, onParkHover, selectedParkId }: { 
  parks: Park[], 
  onParkClick: (park: Park) => void,
  onParkHover: (park: Park | null) => void,
  selectedParkId?: number | null 
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const lastInteractionTime = useRef(Date.now());
  
  // Load textures
  const [dayTexture, nightTexture, specularTexture, normalTexture] = useLoader(
    THREE.TextureLoader,
    [
      '/textures/earth_day.jpg',
      '/textures/earth_night.jpg',
      '/textures/earth_specular.jpg',
      '/textures/earth_normal.jpg'
    ]
  );
  
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
  
  // Animation loop
  useFrame((state, delta) => {
    // Re-enable auto-rotation after 3 seconds of inactivity
    if (!autoRotate && Date.now() - lastInteractionTime.current > 3000) {
      setAutoRotate(true);
    }
    
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });
  
  // Create custom shader material for Earth
  const earthMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        specularTexture: { value: specularTexture },
        normalTexture: { value: normalTexture },
        sunDirection: { value: new THREE.Vector3(1, 0.5, 0).normalize() }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewPosition;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D specularTexture;
        uniform sampler2D normalTexture;
        uniform vec3 sunDirection;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewPosition;
        
        void main() {
          // Sample textures
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          vec3 nightColor = texture2D(nightTexture, vUv).rgb * 2.0; // Brighten city lights
          float specular = texture2D(specularTexture, vUv).r;
          vec3 normal = texture2D(normalTexture, vUv).rgb * 2.0 - 1.0;
          
          // Calculate lighting
          vec3 lightDir = normalize(sunDirection);
          float cosAngle = dot(vNormal, lightDir);
          float dayAmount = smoothstep(-0.1, 0.4, cosAngle);
          
          // Mix day and night sides
          vec3 color = mix(nightColor * 0.3, dayColor, dayAmount);
          
          // Add specular highlight on water
          if (specular > 0.5) {
            vec3 viewDir = normalize(vViewPosition);
            vec3 halfDir = normalize(lightDir + viewDir);
            float specularAmount = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
            color += vec3(0.5, 0.7, 1.0) * specularAmount * dayAmount;
          }
          
          // Add atmospheric scattering at edges
          float rim = 1.0 - max(dot(normalize(vViewPosition), vNormal), 0.0);
          color += vec3(0.1, 0.3, 0.6) * pow(rim, 2.0) * 0.5;
          
          // Enhance contrast
          color = pow(color, vec3(0.9));
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
  }, [dayTexture, nightTexture, specularTexture, normalTexture]);
  
  return (
    <group ref={groupRef}>
      {/* Earth sphere with custom shader */}
      <mesh>
        <sphereGeometry args={[1, 64, 32]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>
      
      
      {/* Thin atmosphere rim light only */}
      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          vertexShader={`
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            void main() {
              float intensity = pow(0.5 - dot(vNormal, vec3(0, 0, 1.0)), 3.0);
              gl_FragColor = vec4(0.5, 0.7, 1.0, intensity * 0.2);
            }
          `}
        />
      </mesh>
      
      {/* Park markers */}
      {parks.map((park) => (
        <ParkMarker
          key={park.id}
          park={park}
          onClick={() => onParkClick(park)}
          onHover={onParkHover}
          isSelected={selectedParkId === park.id}
        />
      ))}
    </group>
  );
}

// Loading component
function LoadingEarth() {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#1a3a52" wireframe />
    </mesh>
  );
}

interface RealisticEarthGlobeProps {
  parks: Park[];
  onParkClick: (park: Park) => void;
  selectedParkId?: number | null;
  shouldResetCamera?: boolean;
}

// Camera controller for cinematic movements
function CameraController({ targetPark, shouldReset }: { 
  targetPark: Park | null; 
  shouldReset: boolean;
}) {
  const { camera } = useThree();
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 3));
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  
  useEffect(() => {
    if (shouldReset) {
      // Force reset to default position
      targetRef.current.set(0, 0, 3);
      targetLookAt.current.set(0, 0, 0);
      camera.position.set(0, 0, 3);
      camera.lookAt(0, 0, 0);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      return;
    }
    
    if (targetPark) {
      // Calculate park position
      const phi = (90 - targetPark.coordinates.lat) * (Math.PI / 180);
      const theta = (targetPark.coordinates.lon + 180) * (Math.PI / 180);
      
      // Position camera to look at the park
      const distance = 1.8;
      const x = -(distance * Math.sin(phi) * Math.cos(theta));
      const y = distance * Math.cos(phi);
      const z = distance * Math.sin(phi) * Math.sin(theta);
      
      targetRef.current.set(x, y, z);
      targetLookAt.current.set(0, 0, 0);
    } else {
      // Return to default
      targetRef.current.set(0, 0, 3);
      targetLookAt.current.set(0, 0, 0);
    }
  }, [targetPark, shouldReset, camera]);
  
  useFrame(() => {
    // Smooth camera movement
    camera.position.lerp(targetRef.current, 0.05);
    camera.lookAt(targetLookAt.current);
  });
  
  return null;
}

export default function RealisticEarthGlobe({ parks, onParkClick, selectedParkId, shouldResetCamera: externalShouldReset }: RealisticEarthGlobeProps) {
  const [hoveredPark, setHoveredPark] = useState<Park | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);
  const [shouldResetCamera, setShouldResetCamera] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  const handleParkClick = (park: Park) => {
    setSelectedPark(selectedPark?.id === park.id ? null : park);
    onParkClick(park);
  };
  
  const handleBackToGlobe = () => {
    setSelectedPark(null);
    // Trigger camera reset
    setShouldResetCamera(true);
    setTimeout(() => setShouldResetCamera(false), 100);
  };

  return (
    <div 
      className="fixed inset-0 bg-black"
      style={{ 
        cursor: 'none'
      }}>
      <Canvas
        camera={{ 
          position: [0, 0, 3], 
          fov: 45,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0
        }}
      >
        {/* Realistic space lighting */}
        <ambientLight intensity={0.15} />
        <directionalLight 
          position={[10, 5, 5]} 
          intensity={1.2}
          color="#ffffff"
          castShadow
        />
        
        {/* Realistic stars - smaller and white */}
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={10000}
              array={(() => {
                const positions = new Float32Array(10000 * 3);
                for (let i = 0; i < 10000; i++) {
                  const r = 100 + Math.random() * 900;
                  const theta = Math.random() * Math.PI * 2;
                  const phi = Math.acos(2 * Math.random() - 1);
                  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                  positions[i * 3 + 2] = r * Math.cos(phi);
                }
                return positions;
              })()}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial size={0.5} color="#ffffff" sizeAttenuation={false} />
        </points>
        
        {/* Milky way effect */}
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={5000}
              array={(() => {
                const positions = new Float32Array(5000 * 3);
                for (let i = 0; i < 5000; i++) {
                  positions[i * 3] = (Math.random() - 0.5) * 1000;
                  positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
                  positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
                }
                return positions;
              })()}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial size={0.3} color="#e8e8ff" transparent opacity={0.6} sizeAttenuation={false} />
        </points>
        
        {/* Earth with loading fallback */}
        <Suspense fallback={<LoadingEarth />}>
          <Earth 
            parks={parks} 
            onParkClick={handleParkClick} 
            onParkHover={setHoveredPark}
            selectedParkId={selectedParkId} 
          />
        </Suspense>
        
        {/* Camera controller for cinematic movements */}
        <CameraController 
          targetPark={selectedPark} 
          shouldReset={shouldResetCamera || externalShouldReset}
        />
        
        {/* Orbit controls - always enabled but with conditions */}
        <SmoothOrbitControls
          enablePan={false}
          enableZoom={!selectedPark}
          enableRotate={!selectedPark}
          zoomSpeed={0.8}
          rotateSpeed={0.6}
          minDistance={2.5}
          maxDistance={8}
          dampingFactor={0.08}
          autoRotate={false}
        />
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Title - moved below search bar */}
        <div className="absolute top-24 left-8">
          <h1 className="text-5xl font-bold">
            <span className="text-yellow-300">PARK</span>
            <span className="text-green-400">SPHERE</span>
            <span className="text-4xl ml-2">🌍</span>
          </h1>
          <p className="text-white text-lg mt-1 font-medium">
            Explore Amazing National Parks Around the World! 🎒
          </p>
        </div>
        
        {/* Instructions - bigger and clearer */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="bg-white/90 backdrop-blur-sm text-gray-800 px-6 py-3 rounded-full text-base font-medium shadow-lg">
            🖱️ Drag to spin • 🔍 Scroll to zoom • 👆 Click markers
          </div>
        </div>
      </div>
      
      {/* Park tooltip on hover */}
      <ParkTooltip park={hoveredPark} position={mousePosition} />
      
      {/* Compass cursor */}
      <CompassCursor />
      
      {/* Back button when park is selected - top left */}
      {selectedPark && (
        <button
          onClick={handleBackToGlobe}
          className="absolute top-8 left-8 z-50 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white hover:bg-white/20 transition-all flex items-center gap-2 border border-white/20"
          style={{ pointerEvents: 'auto' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Globe
        </button>
      )}
    </div>
  );
}
