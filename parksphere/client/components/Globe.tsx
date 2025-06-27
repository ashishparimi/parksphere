'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Park } from '@/lib/types';

interface ParkMarkerProps {
  park: Park;
  onClick: () => void;
}

function ParkMarker({ park, onClick }: ParkMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Convert lat/lon to 3D coordinates on sphere
  const phi = (90 - park.coordinates.lat) * (Math.PI / 180);
  const theta = (park.coordinates.lon + 180) * (Math.PI / 180);
  
  const radius = 2.05; // Slightly above Earth surface
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.scale.lerp(new THREE.Vector3(1.5, 1.5, 1.5), 0.1);
    } else if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });
  
  return (
    <mesh
      ref={meshRef}
      position={[x, y, z]}
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
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshStandardMaterial 
        color={hovered ? '#ff6b6b' : '#ff0000'} 
        emissive={hovered ? '#ff0000' : '#800000'}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

interface EarthProps {
  autoRotate: boolean;
}

function Earth({ autoRotate }: EarthProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial 
          color="#0077be"
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>
    </group>
  );
}

// Camera controls without drei
function CameraController() {
  useFrame(({ camera, pointer }) => {
    camera.position.x = Math.sin(pointer.x * Math.PI) * 6;
    camera.position.z = Math.cos(pointer.x * Math.PI) * 6;
    camera.position.y = pointer.y * 2;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

interface GlobeProps {
  parks: Park[];
  onParkClick: (park: Park) => void;
}

export default function Globe({ parks, onParkClick }: GlobeProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  
  return (
    <div className="w-full h-[600px] bg-gradient-to-b from-indigo-900 via-blue-800 to-cyan-700 rounded-3xl overflow-hidden relative">
      {/* Animated stars background */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        onPointerDown={() => setAutoRotate(false)}
        onPointerUp={() => setTimeout(() => setAutoRotate(true), 5000)}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#fff5e6" />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#e6f2ff" />
        
        <Earth autoRotate={autoRotate} />
        
        {parks.map((park) => (
          <ParkMarker
            key={park.id}
            park={park}
            onClick={() => onParkClick(park)}
          />
        ))}
        
        <CameraController />
      </Canvas>
      
      <div className="absolute bottom-6 left-6 glass-effect text-white px-6 py-3 rounded-2xl shadow-xl">
        <p className="text-lg font-medium">🌍 Click and drag to rotate • Click a red marker to explore</p>
      </div>
      
      {/* Corner glow effects */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
    </div>
  );
}