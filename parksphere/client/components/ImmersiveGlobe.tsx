'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Park } from '@/lib/types';

// Floating stars with parallax
function Stars() {
  const ref = useRef<THREE.Points>(null);
  const { viewport } = useThree();
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      temp.push(x, y, z);
    }
    return new Float32Array(temp);
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta * 0.02;
      ref.current.rotation.y -= delta * 0.05;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        sizeAttenuation={true}
        color="#ffffff"
        transparent={true}
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Volumetric clouds
function Clouds() {
  const cloudsRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.01;
    }
  });

  return (
    <group ref={cloudsRef}>
      {[...Array(8)].map((_, i) => (
        <mesh
          key={i}
          position={[
            Math.sin(i * Math.PI * 0.25) * 5,
            Math.random() * 2 - 1,
            Math.cos(i * Math.PI * 0.25) * 5
          ]}
        >
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.15}
            roughness={1}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  );
}

// Park marker - small glowing dot
interface ParkMarkerProps {
  park: Park;
  onClick: () => void;
}

function ParkMarker({ park, onClick }: ParkMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const phi = (90 - park.coordinates.lat) * (Math.PI / 180);
  const theta = (park.coordinates.lon + 180) * (Math.PI / 180);
  
  const radius = 2.01;
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle pulsing
      const pulse = Math.sin(state.clock.elapsedTime * 3 + park.id) * 0.2 + 1;
      groupRef.current.scale.setScalar(pulse);
    }
  });
  
  return (
    <group ref={groupRef} position={[x, y, z]}>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial
          color="#ff6b6b"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Middle glow */}
      <mesh>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial
          color="#ff8888"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
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
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshBasicMaterial
          color={hovered ? '#ffffff' : '#ffcccc'}
        />
      </mesh>
      
      {/* Hover ring */}
      {hovered && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.04, 0.05, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// Earth with realistic details
function Earth() {
  const groupRef = useRef<THREE.Group>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const { pointer } = useThree();
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Pointer-based rotation
      groupRef.current.rotation.y = pointer.x * Math.PI * 0.5;
      groupRef.current.rotation.x = -pointer.y * Math.PI * 0.2;
    }
    
    // Atmospheric glow animation
    if (atmosphereRef.current && atmosphereRef.current.material) {
      const material = atmosphereRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.time) {
        material.uniforms.time.value = state.clock.elapsedTime;
      }
    }
  });

  // Custom atmosphere shader
  const atmosphereShader = {
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        vec3 atmosphere = vec3(0.3, 0.6, 1.0) * pow(intensity, 1.5);
        float pulse = sin(time * 2.0) * 0.1 + 0.9;
        gl_FragColor = vec4(atmosphere * pulse, intensity * 0.6);
      }
    `,
  };

  // Earth surface shader for continents
  const earthShader = {
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      varying vec3 vNormal;
      
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      void main() {
        // Create pseudo-continents using noise
        float landmass = random(floor(vUv * 8.0)) * random(floor(vUv * 4.0 + 0.5));
        
        // Ocean color
        vec3 ocean = vec3(0.05, 0.15, 0.3);
        // Land color
        vec3 land = vec3(0.1, 0.25, 0.15);
        
        // Mix based on landmass
        vec3 color = mix(ocean, land, step(0.4, landmass));
        
        // Add lighting
        float light = dot(vNormal, vec3(0.5, 0.5, 0.5)) * 0.5 + 0.5;
        color *= light;
        
        // Add subtle glow to edges
        float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        color += vec3(0.1, 0.2, 0.3) * fresnel * 0.3;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  };
  
  return (
    <group ref={groupRef}>
      {/* Main Earth with details */}
      <mesh>
        <sphereGeometry args={[2, 128, 128]} />
        <shaderMaterial
          vertexShader={earthShader.vertexShader}
          fragmentShader={earthShader.fragmentShader}
          uniforms={earthShader.uniforms}
        />
      </mesh>
      
      {/* Cloud layer */}
      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
          roughness={1}
          metalness={0}
        />
      </mesh>
      
      {/* Atmosphere glow */}
      <mesh ref={atmosphereRef} scale={[1.15, 1.15, 1.15]}>
        <sphereGeometry args={[2, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereShader.vertexShader}
          fragmentShader={atmosphereShader.fragmentShader}
          uniforms={atmosphereShader.uniforms}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

// Light rays effect
function LightRays() {
  const rayRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (rayRef.current) {
      rayRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <mesh ref={rayRef} position={[5, 5, -5]}>
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial
        color="#4CA2FF"
        transparent
        opacity={0.05}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Firefly particles for night scenes
function Fireflies({ intensity = 0 }: { intensity: number }) {
  const ref = useRef<THREE.Points>(null);
  const count = 50;
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 10;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 10;
      temp.push(x, y, z);
    }
    return new Float32Array(temp);
  }, []);
  
  useFrame((state) => {
    if (ref.current && ref.current.material) {
      const material = ref.current.material as THREE.PointsMaterial;
      
      // Animate fireflies
      ref.current.rotation.y = state.clock.elapsedTime * 0.05;
      
      // Pulsing glow
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7;
      material.opacity = intensity * pulse;
      
      // Move particles
      const positions = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(state.clock.elapsedTime + i) * 0.002;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#FFD700"
        transparent
        opacity={intensity}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
      />
    </points>
  );
}

interface ImmersiveGlobeProps {
  parks: Park[];
  onParkClick: (park: Park) => void;
  selectedBiome?: string;
}

// Time of day based on scroll position
function useTimeOfDay() {
  const [timeOfDay, setTimeOfDay] = useState(0); // 0 = sunrise, 0.5 = noon, 1 = night
  
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = window.scrollY / scrollHeight;
      setTimeOfDay(scrollProgress);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return timeOfDay;
}

export default function ImmersiveGlobe({ parks, onParkClick, selectedBiome = 'all' }: ImmersiveGlobeProps) {
  const timeOfDay = useTimeOfDay();
  
  // Biome color palettes
  const biomeColors: Record<string, any> = {
    desert: {
      sunrise: { top: '#FF6347', mid: '#FFB347', bottom: '#FFD700', fog: '#FFB347' },
      day: { top: '#FFE5B4', mid: '#F5DEB3', bottom: '#FFDEAD', fog: '#F5DEB3' },
      night: { top: '#8B4513', mid: '#D2691E', bottom: '#DEB887', fog: '#8B4513' }
    },
    temperate_forest: {
      sunrise: { top: '#7CFC00', mid: '#228B22', bottom: '#006400', fog: '#228B22' },
      day: { top: '#98FB98', mid: '#90EE90', bottom: '#8FBC8F', fog: '#90EE90' },
      night: { top: '#013220', mid: '#023020', bottom: '#0B4D2C', fog: '#013220' }
    },
    alpine: {
      sunrise: { top: '#E0E5FF', mid: '#B0C4DE', bottom: '#87CEEB', fog: '#B0C4DE' },
      day: { top: '#F0F8FF', mid: '#E6E6FA', bottom: '#B0E0E6', fog: '#E6E6FA' },
      night: { top: '#191970', mid: '#000080', bottom: '#4169E1', fog: '#191970' }
    },
    wetland: {
      sunrise: { top: '#5F9EA0', mid: '#48D1CC', bottom: '#00CED1', fog: '#48D1CC' },
      day: { top: '#AFEEEE', mid: '#87CEEB', bottom: '#00BFFF', fog: '#87CEEB' },
      night: { top: '#2F4F4F', mid: '#008B8B', bottom: '#006B6B', fog: '#2F4F4F' }
    },
    temperate_rainforest: {
      sunrise: { top: '#2E8B57', mid: '#3CB371', bottom: '#00FF00', fog: '#3CB371' },
      day: { top: '#90EE90', mid: '#7CFC00', bottom: '#ADFF2F', fog: '#7CFC00' },
      night: { top: '#006400', mid: '#008000', bottom: '#228B22', fog: '#006400' }
    }
  };
  
  // Dynamic sky colors based on time and biome
  const skyGradient = useMemo(() => {
    const getDefaultColors = () => {
      if (timeOfDay < 0.3) {
        // Sunrise
        return {
          top: '#FF6B6B',
          mid: '#4ECDC4',
          bottom: '#45B7D1',
          fog: '#4ECDC4'
        };
      } else if (timeOfDay < 0.7) {
        // Day
        return {
          top: '#87CEEB',
          mid: '#98D8E8',
          bottom: '#F0F8FF',
          fog: '#87CEEB'
        };
      } else {
        // Night
        return {
          top: '#0B1C2D',
          mid: '#0f2744',
          bottom: '#1a3a5c',
          fog: '#0B1C2D'
        };
      }
    };
    
    const colors = biomeColors[selectedBiome];
    
    if (selectedBiome === 'all' || !colors) {
      return getDefaultColors();
    }
    
    // Return biome-specific colors based on time of day
    if (timeOfDay < 0.3) {
      return colors.sunrise;
    } else if (timeOfDay < 0.7) {
      return colors.day;
    } else {
      return colors.night;
    }
  }, [timeOfDay, selectedBiome]);
  
  return (
    <div 
      className="fixed inset-0 transition-all duration-2000"
      style={{
        background: `linear-gradient(to bottom, ${skyGradient.top}, ${skyGradient.mid}, ${skyGradient.bottom})`
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <fog attach="fog" color={skyGradient.fog} near={8} far={25} />
        
        <ambientLight intensity={0.2} color="#4CA2FF" />
        <directionalLight position={[10, 10, 5]} intensity={0.7} color="#F4F6F8" />
        <pointLight position={[-10, -10, -5]} intensity={0.3} color="#4CA2FF" />
        <pointLight position={[0, 0, -10]} intensity={0.2} color="#ffffff" />
        
        <Stars />
        <Clouds />
        <Earth />
        <LightRays />
        <Fireflies intensity={timeOfDay > 0.7 ? 1 : 0} />
        
        {parks.map((park) => (
          <ParkMarker
            key={park.id}
            park={park}
            onClick={() => onParkClick(park)}
          />
        ))}
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Vignette effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20" />
        
        {/* Navigation hint */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="glass-effect text-white px-8 py-4 rounded-full shadow-2xl backdrop-blur-xl">
            <p className="text-lg font-light tracking-wide">Move cursor to rotate Earth • Click a glowing dot to explore</p>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </div>
  );
}