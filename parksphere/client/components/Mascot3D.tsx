'use client';

import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { ParkMascot as ParkMascotType } from '@/lib/types';

// Floating animation component
function FloatingGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });
  
  return <group ref={groupRef}>{children}</group>;
}

// Animated 3D Bear Model
function Bear3D({ color = '#8B4513' }: { color?: string }) {
  const bearRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (bearRef.current) {
      // Gentle breathing animation
      bearRef.current.scale.x = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      bearRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      bearRef.current.scale.z = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      
      // Slight swaying
      bearRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.05;
    }
  });

  return (
    <group ref={bearRef} position={[0, -1, 0]} scale={1.5}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* Belly */}
      <mesh position={[0, -0.1, 0.3]} scale={[0.9, 0.8, 0.6]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#D2691E" roughness={0.8} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 0.8, 0.2]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* Snout */}
      <mesh position={[0, 0.7, 0.6]} scale={[0.8, 0.6, 0.8]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#D2691E" roughness={0.8} />
      </mesh>
      
      {/* Ears */}
      <mesh position={[-0.3, 1.1, 0.1]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0.3, 1.1, 0.1]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.15, 0.9, 0.55]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.15, 0.9, 0.55]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      
      {/* Nose */}
      <mesh position={[0, 0.7, 0.75]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      
      {/* Arms */}
      <group position={[-0.6, 0.1, 0]} rotation={[0, 0, 0.3]}>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.2, 0.15, 0.8]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        {/* Paw */}
        <mesh position={[0, -0.6, 0]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
      
      <group position={[0.6, 0.1, 0]} rotation={[0, 0, -0.3]}>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.2, 0.15, 0.8]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        {/* Paw */}
        <mesh position={[0, -0.6, 0]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
      
      {/* Legs */}
      <mesh position={[-0.3, -0.8, 0]}>
        <cylinderGeometry args={[0.25, 0.2, 0.8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0.3, -0.8, 0]}>
        <cylinderGeometry args={[0.25, 0.2, 0.8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* Feet */}
      <mesh position={[-0.3, -1.2, 0.1]} scale={[1, 0.6, 1.2]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0.3, -1.2, 0.1]} scale={[1, 0.6, 1.2]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </group>
  );
}

// Eagle Model
function Eagle3D({ color = '#8B4513' }: { color?: string }) {
  const eagleRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (eagleRef.current) {
      // Wing flapping animation
      const flap = Math.sin(state.clock.elapsedTime * 3) * 0.2;
      eagleRef.current.children.forEach((child, index) => {
        if (child.name === 'wing-left') {
          child.rotation.z = -0.3 + flap;
        } else if (child.name === 'wing-right') {
          child.rotation.z = 0.3 - flap;
        }
      });
    }
  });

  return (
    <group ref={eagleRef} position={[0, 0, 0]} scale={1.5}>
      {/* Body */}
      <mesh position={[0, 0, 0]} scale={[1, 1.3, 0.8]}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 0.8, 0.2]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="white" roughness={0.8} />
      </mesh>
      
      {/* Beak */}
      <mesh position={[0, 0.75, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 0.4, 8]} />
        <meshStandardMaterial color="#FFD700" roughness={0.6} />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.15, 0.85, 0.35]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#FFA500" />
      </mesh>
      <mesh position={[0.15, 0.85, 0.35]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#FFA500" />
      </mesh>
      
      {/* Wings */}
      <mesh name="wing-left" position={[-1, 0, -0.2]} rotation={[0, 0.2, -0.3]}>
        <boxGeometry args={[2, 0.1, 1]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh name="wing-right" position={[1, 0, -0.2]} rotation={[0, -0.2, 0.3]}>
        <boxGeometry args={[2, 0.1, 1]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* Tail */}
      <mesh position={[0, -0.4, -0.6]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.6, 0.1, 0.8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* Talons */}
      <mesh position={[-0.2, -0.8, 0]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.05, 0.03, 0.3]} />
        <meshStandardMaterial color="#FFD700" roughness={0.6} />
      </mesh>
      <mesh position={[0.2, -0.8, 0]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.05, 0.03, 0.3]} />
        <meshStandardMaterial color="#FFD700" roughness={0.6} />
      </mesh>
    </group>
  );
}

interface Mascot3DProps {
  mascot: ParkMascotType;
  parkCode: string;
  parkName: string;
}

export default function Mascot3D({ mascot, parkCode, parkName }: Mascot3DProps) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'assistant', content: mascot.greeting }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/mascot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          mascotName: mascot.name,
          mascotSpecies: mascot.species,
          parkName: parkName,
          parkCode: parkCode,
          conversationHistory: messages
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  assistantMessage += parsed.choices[0].delta.content;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[newMessages.length - 1]?.role === 'assistant') {
                      newMessages[newMessages.length - 1].content = assistantMessage;
                    } else {
                      newMessages.push({ role: 'assistant', content: assistantMessage });
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Oh my! I seem to be having trouble connecting. Let me try again in a moment!" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Always show the bear park ranger
  const getMascotModel = () => {
    // Ranger Bear uses a brown color
    return <Bear3D color="#8B4513" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-0 right-8 z-50 flex items-end gap-4"
    >
      {/* 3D Mascot Character */}
      <div className="w-64 h-96">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={0.8} />
          <pointLight position={[-10, -10, -10]} intensity={0.4} />
          
          {/* 3D Model with floating animation */}
          <FloatingGroup>
            {getMascotModel()}
          </FloatingGroup>
          
          {/* Name tag floating above */}
          <sprite position={[0, 2.5, 0]} scale={[2, 0.5, 1]}>
            <spriteMaterial attach="material" color="white" />
          </sprite>
          
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 2}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </div>

      {/* Chat Bubble */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="relative mb-24"
      >
        {/* Bubble tail pointing to mascot */}
        <div className="absolute -left-8 bottom-4 w-0 h-0 
          border-t-[20px] border-t-transparent
          border-r-[30px] border-r-white/10
          border-b-[20px] border-b-transparent"
          style={{
            filter: 'drop-shadow(-2px 2px 4px rgba(0, 0, 0, 0.1))',
          }}
        />
        
        {/* Chat interface */}
        <div 
          className="bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
          style={{
            width: '400px',
            maxHeight: '500px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          {/* Messages */}
          <div 
            ref={chatContainerRef}
            className="h-80 overflow-y-auto p-4 space-y-3 mascot-chat allow-cursor"
          >
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                  message.role === 'user' 
                    ? 'bg-green-500/20 text-green-100 ml-8' 
                    : 'bg-white/10 text-white/90 mr-8'
                }`}>
                  {message.content}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 px-4 py-2 rounded-2xl mr-8">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${mascot.name} about ${parkName}...`}
                className="flex-1 bg-white/10 text-white placeholder-white/40 px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-400/50 allow-cursor"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-green-500/20 text-green-400 p-2 rounded-full hover:bg-green-500/30 transition-colors disabled:opacity-50 allow-cursor"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}