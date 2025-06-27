'use client';

import { useState, useEffect } from 'react';

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-green-50 to-amber-50">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-park-green/20 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-park-blue/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-park-amber/10 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className={`relative z-10 text-center px-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <h1 className="text-6xl md:text-8xl font-bold mb-6">
          <span className="gradient-text">ParkSphere</span>
        </h1>
        
        <p className="text-2xl md:text-3xl text-gray-700 mb-8 font-light">
          Explore America's National Parks in 
          <span className="font-bold text-park-green"> 3D</span>
        </p>
        
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-12">
          <div className="glass-effect px-6 py-3 rounded-full">
            <span className="text-xl">🌲 10 Parks</span>
          </div>
          <div className="glass-effect px-6 py-3 rounded-full">
            <span className="text-xl">🌍 Interactive Globe</span>
          </div>
          <div className="glass-effect px-6 py-3 rounded-full">
            <span className="text-xl">👨‍👩‍👧‍👦 Kid-Friendly</span>
          </div>
        </div>
        
        <a 
          href="#explore"
          className="inline-block bg-gradient-to-r from-park-green to-park-blue text-white px-8 py-4 rounded-full text-xl font-semibold hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
        >
          Start Exploring
        </a>
      </div>
      
      {/* Scroll indicator */}
      <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-col items-center animate-bounce">
          <span className="text-gray-600 mb-2">Scroll to explore</span>
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </div>
  );
}