'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Park } from '@/lib/types';

interface TestGlobeProps {
  parks: Park[];
  onParkClick: (park: Park) => void;
  selectedParkId?: number;
  shouldResetCamera?: boolean;
}

function Earth() {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#4444ff" />
    </mesh>
  );
}

export default function TestGlobe({ parks }: TestGlobeProps) {
  return (
    <div className="fixed inset-0 bg-black">
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Earth />
        <OrbitControls />
      </Canvas>
      <div className="absolute top-10 left-10 text-white">
        <h1 className="text-4xl font-bold">ParkSphere Test</h1>
        <p>Parks loaded: {parks.length}</p>
      </div>
    </div>
  );
}