'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Park } from '@/lib/types';
import ParkCard from '@/components/ParkCard';
import HeroSection from '@/components/HeroSection';

// Dynamically import Globe to avoid SSR issues with Three.js
const Globe = dynamic(() => import('@/components/Globe'), { 
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-gradient-to-br from-blue-900 to-blue-600 rounded-3xl animate-pulse" />
});

const ImmersiveGlobe = dynamic(() => import('@/components/ImmersiveGlobe'), { 
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-[#0B1C2D] animate-pulse" />
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [parks, setParks] = useState<Park[]>([]);
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGlobe, setShowGlobe] = useState(true);
  const [selectedBiome, setSelectedBiome] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchParks();
  }, []);

  useEffect(() => {
    if (!selectedPark || !scrollRef.current) return;
    
    const handleScroll = () => {
      if (!scrollRef.current) return;
      const sections = scrollRef.current.querySelectorAll('.chapter-section');
      
      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const scrollProgress = 1 - (rect.top / window.innerHeight);
        
        if (scrollProgress > 0 && scrollProgress < 2) {
          // Parallax effect for images
          const image = section.querySelector('.chapter-image') as HTMLElement;
          if (image) {
            const speed = index % 2 === 0 ? 0.5 : 0.3;
            image.style.transform = `translateY(${scrollProgress * 100 * speed}px) scale(${1 + scrollProgress * 0.05})`;
          }
          
          // Fade in content
          const content = section.querySelector('.chapter-content') as HTMLElement;
          if (content) {
            content.style.opacity = Math.min(1, scrollProgress * 2).toString();
            content.style.transform = `translateY(${(1 - scrollProgress) * 50}px)`;
          }
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedPark]);

  const fetchParks = async () => {
    try {
      console.log('Fetching parks from:', `${API_URL}/api/parks`);
      const response = await fetch(`${API_URL}/api/parks`);
      console.log('Response status:', response.status);
      if (!response.ok) throw new Error('Failed to fetch parks');
      const data = await response.json();
      console.log('Parks data:', data);
      setParks(data);
    } catch (err) {
      console.error('Error fetching parks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load parks');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-park-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-2xl text-gray-600">Loading amazing parks...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-3xl text-red-500">Error: {error}</div>
      </div>
    );
  }

  const biomes = ['all', ...Array.from(new Set(parks.map(p => p.biome)))];
  const filteredParks = selectedBiome === 'all' 
    ? parks 
    : parks.filter(p => p.biome === selectedBiome);

  if (selectedPark) {
    return (
      <div ref={scrollRef} className="min-h-screen bg-[#0B1C2D] text-white">
        {/* Full-screen hero image */}
        <div className="relative h-screen chapter-section">
          <img
            src={selectedPark.gallery[0].url}
            alt={selectedPark.name}
            className="w-full h-full object-cover chapter-image"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C2D] via-[#0B1C2D]/50 to-transparent" />
          
          {/* Back button */}
          <button
            onClick={() => setSelectedPark(null)}
            className="absolute top-8 left-8 px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transform hover:scale-105 transition-all duration-300 text-lg border border-white/20"
          >
            ← Back
          </button>
          
          {/* Park title */}
          <div className="absolute bottom-0 left-0 right-0 p-12 lg:p-24 chapter-content" style={{ transition: 'all 0.6s ease-out' }}>
            <div className="max-w-7xl mx-auto animate-fadeInUp">
              <p className="text-[#4CA2FF] text-xl mb-4 tracking-widest uppercase">
                {selectedPark.biome.replace('_', ' ')}
              </p>
              <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tight">
                {selectedPark.name.replace(' National Park', '')}
              </h1>
              <p className="text-2xl font-light opacity-80">
                National Park • Established {selectedPark.established}
              </p>
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div className="relative z-10">
          {/* Stats section */}
          <div className="py-24 border-b border-white/10 chapter-section">
            <div className="max-w-7xl mx-auto px-12 lg:px-24 chapter-content" style={{ transition: 'all 0.6s ease-out' }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="text-center animate-fadeInUp">
                  <p className="text-6xl font-bold text-[#4CA2FF] mb-4">{selectedPark.established}</p>
                  <p className="text-xl opacity-60 uppercase tracking-wider">Year Established</p>
                </div>
                <div className="text-center animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                  <p className="text-6xl font-bold text-[#4CA2FF] mb-4">{(selectedPark.area_acres / 1000).toFixed(0)}K</p>
                  <p className="text-xl opacity-60 uppercase tracking-wider">Acres</p>
                </div>
                <div className="text-center animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                  <p className="text-6xl font-bold text-[#4CA2FF] mb-4">{selectedPark.coordinates.lat.toFixed(1)}°</p>
                  <p className="text-xl opacity-60 uppercase tracking-wider">North Latitude</p>
                </div>
              </div>
            </div>
          </div>

          {/* Description section with image */}
          <div className="relative min-h-screen flex items-center chapter-section">
            <img
              src={selectedPark.gallery[1]?.url || selectedPark.gallery[0].url}
              alt={`${selectedPark.name} landscape`}
              className="absolute inset-0 w-full h-full object-cover chapter-image"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B1C2D] to-[#0B1C2D]/50" />
            <div className="relative z-10 max-w-4xl mx-auto px-12 lg:px-24 chapter-content" style={{ transition: 'all 0.6s ease-out' }}>
              <h2 className="text-6xl font-bold mb-8">The Story</h2>
              <p className="text-3xl leading-relaxed font-light">
                {selectedPark.summary}
              </p>
            </div>
          </div>

          {/* Gallery section */}
          <div className="py-24 chapter-section">
            <div className="max-w-7xl mx-auto px-12 lg:px-24 chapter-content" style={{ transition: 'all 0.6s ease-out' }}>
              <h2 className="text-4xl font-bold mb-12 animate-fadeInUp">Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {selectedPark.gallery.map((image, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer animate-fadeInUp"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <img
                      src={image.url}
                      alt={`${selectedPark.name} ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fun fact section with cinematic reveal */}
          <div className="relative min-h-screen flex items-center justify-center chapter-section">
            <img
              src={selectedPark.gallery[2]?.url || selectedPark.gallery[0].url}
              alt={`${selectedPark.name} vista`}
              className="absolute inset-0 w-full h-full object-cover chapter-image"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B1C2D]/80 to-[#0B1C2D]" />
            <div className="relative z-10 max-w-4xl mx-auto px-12 lg:px-24 text-center chapter-content" style={{ transition: 'all 0.6s ease-out' }}>
              <h3 className="text-5xl font-bold mb-8">Did You Know?</h3>
              <p className="text-3xl leading-relaxed">
                {selectedPark.name} covers an area of {Math.floor(selectedPark.area_acres / 640)} square miles—
                that's larger than the state of Rhode Island!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Full-screen immersive globe */}
      <div className="relative min-h-screen">
        <ImmersiveGlobe parks={filteredParks} onParkClick={setSelectedPark} selectedBiome={selectedBiome} />
        
        {/* Hero content overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="h-screen flex items-center justify-center">
            <div className="text-center text-white animate-fadeIn">
              <h1 className="text-7xl md:text-9xl font-bold tracking-wider mb-6">
                <span className="block">PARK</span>
                <span className="block text-[#4CA2FF]">SPHERE</span>
              </h1>
              <p className="text-2xl md:text-3xl font-light tracking-wide opacity-80">
                Explore America's Natural Wonders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter controls section */}
      <div className="relative z-10 bg-[#0B1C2D] py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fadeInUp">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Select Your Journey
            </h2>
            <p className="text-xl text-white/60">
              Filter by biome or view all parks as cards
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <button
              onClick={() => setShowGlobe(!showGlobe)}
              className="px-8 py-4 bg-[#4CA2FF] text-white rounded-full hover:bg-[#5ab0ff] transform hover:scale-105 transition-all duration-300 text-lg font-medium tracking-wide"
            >
              {showGlobe ? 'View as Cards' : 'Back to Globe'}
            </button>
            
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
              <span className="text-lg font-medium text-white/80">Filter by Biome:</span>
              <select
                value={selectedBiome}
                onChange={(e) => setSelectedBiome(e.target.value)}
                className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#4CA2FF] transition-colors"
              >
                {biomes.map(biome => (
                  <option key={biome} value={biome} className="bg-[#0B1C2D]">
                    {biome === 'all' ? 'All Parks' : biome.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Park cards section */}
      {!showGlobe && (
        <div className="min-h-screen bg-gradient-to-b from-[#0B1C2D] to-[#1a3a5c] py-24">
          <div className="container mx-auto px-4">
            <p className="text-2xl text-center mb-12 text-white/60 animate-fadeInUp">
              {filteredParks.length} parks to explore
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredParks.map((park, index) => (
                <div 
                  key={park.id} 
                  className="animate-fadeInUp" 
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-1 hover:bg-white/10 transition-colors">
                    <ParkCard
                      park={park}
                      onClick={() => setSelectedPark(park)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}