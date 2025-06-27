'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Park } from '@/lib/types';

// Dynamically import RealisticEarthGlobe to avoid SSR issues with Three.js
const RealisticEarthGlobe = dynamic(() => import('@/components/RealisticEarthGlobe'), { 
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-white text-2xl">Loading ParkSphere...</div>
    </div>
  )
});

// Dynamically import SearchPanel
const SearchPanel = dynamic(() => import('@/components/SearchPanel'), { 
  ssr: false
});

// Dynamically import CustomCursor
const CustomCursor = dynamic(() => import('@/components/CustomCursor'), {
  ssr: false,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Floating park info panel component
function ParkInfoPanel({ park, onClose }: { park: Park; onClose: () => void }) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [showSatellite, setShowSatellite] = useState(false);
  
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center p-8">
      <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-6 max-w-3xl w-full pointer-events-auto transform transition-all duration-300 border border-white/20 shadow-2xl max-h-[85vh] overflow-y-auto"
           style={{
             background: 'rgba(255, 255, 255, 0.1)',
             backdropFilter: 'blur(20px) saturate(180%)',
             WebkitBackdropFilter: 'blur(20px) saturate(180%)',
             boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
           }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10 p-1 hover:bg-white/10 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Park info */}
        <h2 className="text-3xl font-bold text-white mb-2">{park.name}</h2>
        <div className="flex items-center gap-3 mb-4 text-sm">
          <span className="text-green-400">{park.country}</span>
          <span className="text-white/40">•</span>
          <span className="text-white/70">{park.biome.replace('_', ' ')}</span>
          <span className="text-white/40">•</span>
          <span className="text-white/70">Est. {park.established}</span>
          {park.nasa_validated && (
            <span className="text-blue-400 ml-2">✓ Verified</span>
          )}
        </div>
        
        <p className="text-white/70 leading-relaxed mb-6">{park.summary}</p>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 bg-white/5 rounded-lg p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{park.established}</p>
            <p className="text-white/60 text-xs">Established</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400">{(park.area_acres / 1000).toFixed(0)}K</p>
            <p className="text-white/60 text-sm">Acres</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400">{park.coordinates.lat.toFixed(1)}°N</p>
            <p className="text-white/60 text-sm">Latitude</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400">{park.coordinates.lon.toFixed(1)}°W</p>
            <p className="text-white/60 text-sm">Longitude</p>
          </div>
        </div>
        
        {/* Activities if available */}
        {park.activities && park.activities.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Popular Activities</h3>
            <div className="flex flex-wrap gap-2">
              {park.activities.map((activity, idx) => (
                <span key={idx} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                  {activity}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Gallery with toggle */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Gallery</h3>
            {park.satellite && (
              <button
                onClick={() => setShowSatellite(!showSatellite)}
                className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
              >
                {showSatellite ? 'Show Photos' : 'Show Satellite'}
              </button>
            )}
          </div>
          
          {showSatellite && park.satellite ? (
            <div className="rounded-lg overflow-hidden">
              <img
                src={park.satellite}
                alt={`${park.name} satellite view`}
                className="w-full h-auto"
              />
              <p className="text-white/60 text-sm mt-2">Satellite view of {park.name}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {park.gallery.map((image, idx) => (
                <div 
                  key={idx} 
                  className="aspect-video rounded-lg overflow-hidden cursor-pointer group relative"
                  onClick={() => setSelectedImage(idx)}
                >
                  <img
                    src={image.url}
                    alt={`${park.name} ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  {image.attribution && (
                    <p className="absolute bottom-0 left-0 right-0 p-2 text-xs text-white/60 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      {image.attribution}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Full image viewer */}
      {selectedImage !== null && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-8 pointer-events-auto"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={park.gallery[selectedImage].url}
            alt={`${park.name} ${selectedImage + 1}`}
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [parks, setParks] = useState<Park[]>([]);
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [shouldResetCamera, setShouldResetCamera] = useState(false);

  useEffect(() => {
    fetchParks();
    // Prevent scrolling on the body
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Add keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchParks = async () => {
    try {
      console.log('Fetching parks from:', `${API_URL}/api/parks`);
      const response = await fetch(`${API_URL}/api/parks`);
      console.log('Response status:', response.status);
      if (!response.ok) throw new Error('Failed to fetch parks');
      const data = await response.json();
      console.log('Parks data:', data);
      setParks(data.parks || data);
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


  const handleParkSearchSelect = (park: Park) => {
    setSelectedPark(park);
  };

  const handleCloseParkInfo = () => {
    setSelectedPark(null);
    setShouldResetCamera(true);
    setTimeout(() => setShouldResetCamera(false), 100);
  };

  return (
    <div className="fixed inset-0">
      <CustomCursor />
      <RealisticEarthGlobe 
        parks={parks} 
        onParkClick={setSelectedPark} 
        selectedParkId={selectedPark?.id}
        shouldResetCamera={shouldResetCamera}
      />
      
      {/* Search Panel */}
      <SearchPanel 
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onParkSelect={handleParkSearchSelect}
      />
      
      {/* Search Button - Right Side */}
      {!showSearch && (
        <button
          onClick={() => setShowSearch(true)}
          className="absolute top-8 right-8 z-40 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white hover:bg-black/80 transition-all flex items-center gap-2 border border-white/20 hover:border-green-400/50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm">Search</span>
          <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded">⌘K</kbd>
        </button>
      )}
      
      {/* Floating park info panel */}
      {selectedPark && (
        <ParkInfoPanel
          park={selectedPark}
          onClose={handleCloseParkInfo}
        />
      )}
    </div>
  );
}