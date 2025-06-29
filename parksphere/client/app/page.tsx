'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Park, Trail } from '@/lib/types';

// Dynamically import RealisticEarthGlobe to avoid SSR issues with Three.js
const RealisticEarthGlobe = dynamic(() => import('@/components/RealisticEarthGlobe'), { 
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-white/20 text-xl font-light tracking-wider">Loading...</div>
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

// Dynamically import FilterPanel
const FilterPanel = dynamic(() => import('@/components/FilterPanel'), {
  ssr: false,
});

// Dynamically import ParkMascot
const ParkMascot = dynamic(() => import('@/components/ParkMascot'), {
  ssr: false,
});

// Dynamically import Mascot3D
const Mascot3D = dynamic(() => import('@/components/Mascot3D'), {
  ssr: false,
});

// Dynamically import TrailPanel
const TrailPanel = dynamic(() => import('@/components/TrailPanel'), {
  ssr: false,
});

// Dynamically import EnhancedParkInfo
const EnhancedParkInfo = dynamic(() => import('@/components/EnhancedParkInfo'), {
  ssr: false,
});

// Dynamically import InstructionBar
const InstructionBar = dynamic(() => import('@/components/InstructionBar'), {
  ssr: false,
});

// Static data - no API needed

// Floating park info panel component
function ParkInfoPanel({ park, onClose, onShowTrails }: { park: Park; onClose: () => void; onShowTrails?: () => void }) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [showSatellite, setShowSatellite] = useState(false);
  const hasMascot = park.mascot !== undefined;
  
  return (
    <div className={`fixed inset-0 pointer-events-none flex items-center ${hasMascot ? 'justify-start pl-16' : 'justify-center'} p-8`}>
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
          <span className={`px-2 py-1 rounded-full text-xs ${
            park.biome === 'desert' ? 'bg-orange-500/20 text-orange-400' :
            park.biome === 'alpine' ? 'bg-blue-500/20 text-blue-400' :
            park.biome === 'temperate_forest' ? 'bg-green-500/20 text-green-400' :
            park.biome === 'temperate_rainforest' ? 'bg-teal-500/20 text-teal-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {park.biome === 'desert' ? '🏜️' :
             park.biome === 'alpine' ? '🏔️' :
             park.biome === 'temperate_forest' ? '🌲' :
             park.biome === 'temperate_rainforest' ? '🌴' :
             '🏞️'} {park.biome.replace('_', ' ')}
          </span>
          <span className="text-white/40">•</span>
          <span className="text-white/70">Est. {park.established}</span>
          {park.nasa_validated && (
            <span className="text-blue-400 ml-2">✓ NASA Verified</span>
          )}
        </div>
        
        <p className="text-white/70 leading-relaxed mb-6">{park.summary}</p>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{park.established}</p>
            <p className="text-white/60 text-xs">Established</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{(park.area_acres / 1000).toFixed(0)}K</p>
            <p className="text-white/60 text-xs">Acres</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{Math.abs(park.coordinates.lat).toFixed(1)}°{park.coordinates.lat > 0 ? 'N' : 'S'}</p>
            <p className="text-white/60 text-xs">Latitude</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{Math.abs(park.coordinates.lon).toFixed(1)}°{park.coordinates.lon > 0 ? 'E' : 'W'}</p>
            <p className="text-white/60 text-xs">Longitude</p>
          </div>
        </div>
        
        {/* Activities if available */}
        {park.activities && park.activities.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-2xl">🎒</span> Popular Activities
            </h3>
            <div className="flex flex-wrap gap-2">
              {park.activities.map((activity, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-blue-500/20 text-white/80 rounded-full text-sm hover:from-green-500/30 hover:to-blue-500/30 transition-all cursor-default">
                  {activity === 'Hiking' ? '🥾' :
                   activity === 'Rock Climbing' ? '🧗' :
                   activity === 'Photography' ? '📸' :
                   activity === 'Camping' ? '🏕️' :
                   activity === 'Wildlife Viewing' ? '🦌' :
                   activity === 'Rafting' ? '🛶' :
                   activity === 'Mule Rides' ? '🐴' :
                   activity === 'Backpacking' ? '🎒' :
                   activity === 'Stargazing' ? '🌟' :
                   activity === 'Fishing' ? '🎣' :
                   '🏞️'} {activity}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Trails if available */}
        {park.trails && park.trails.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-2xl">🥾</span> Popular Trails
            </h3>
            <div className="space-y-2">
              {park.trails.slice(0, 3).map((trail) => {
                const difficultyColors = {
                  easy: 'text-green-400 bg-green-500/20',
                  moderate: 'text-yellow-400 bg-yellow-500/20',
                  hard: 'text-orange-400 bg-orange-500/20',
                  expert: 'text-red-400 bg-red-500/20'
                };
                
                return (
                  <div key={trail.id} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium text-white text-sm">{trail.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${difficultyColors[trail.difficulty]}`}>
                        {trail.difficulty}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-white/60">
                      <span>{trail.length} mi</span>
                      <span>↗ {trail.elevationGain} ft</span>
                      <span>⏱ {trail.estimatedTime}h</span>
                    </div>
                  </div>
                );
              })}
              {park.trails.length > 3 && onShowTrails && (
                <button
                  onClick={onShowTrails}
                  className="w-full mt-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <span>View All {park.trails.length} Trails</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Gallery with toggle */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Gallery</h3>
            <div className="flex gap-2">
              {park.satellite && (
                <button
                  onClick={() => setShowSatellite(!showSatellite)}
                  className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                >
                  {showSatellite ? 'Show Photos' : 'Show Satellite'}
                </button>
              )}
            </div>
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
  const [filteredParks, setFilteredParks] = useState<Park[]>([]);
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [shouldResetCamera, setShouldResetCamera] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showEnhancedInfo, setShowEnhancedInfo] = useState(true); // Default to enhanced view
  const [showTrails, setShowTrails] = useState(false);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  
  // Progressive loading state
  const [allParksData, setAllParksData] = useState<Park[]>([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreParks, setHasMoreParks] = useState(true);
  const BATCH_SIZE = 10; // Increased for 200 parks
  useEffect(() => {
    console.log('[MOUNT] Component mounting...');
    setMounted(true);
    console.log('[MOUNT] Calling fetchParks...');
    
    // Call fetchParks immediately
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

  const loadMoreParks = () => {
    if (!hasMoreParks || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    // Simulate network delay for progressive feel
    setTimeout(() => {
      const start = currentBatch * BATCH_SIZE;
      const end = start + BATCH_SIZE;
      const nextBatch = allParksData.slice(start, end);
      
      console.log('[PROGRESSIVE] Loading batch', currentBatch + 1, '- parks', start, 'to', end);
      
      // Add new parks to existing ones
      setParks(prev => [...prev, ...nextBatch]);
      setFilteredParks(prev => [...prev, ...nextBatch]);
      
      // Update batch counter
      setCurrentBatch(prev => prev + 1);
      
      // Check if we have more parks to load
      setHasMoreParks(end < allParksData.length);
      setIsLoadingMore(false);
      
      console.log('[PROGRESSIVE] Now showing', parks.length + nextBatch.length, 'of', allParksData.length, 'parks');
    }, 500); // 500ms delay for smooth UX
  };

  const fetchParks = async () => {
    try {
      console.log('[1] Starting fetchParks...');
      setError(null); // Clear any previous errors
      
      console.log('[2] Fetching /data/parks.json...');
      const url = '/data/parks.json';
      console.log('[2b] Full URL:', window.location.origin + url);
      const response = await fetch(url);
      
      console.log('[3] Response received:', { 
        status: response.status, 
        ok: response.ok,
        headers: response.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('[4] Parsing JSON...');
      const data = await response.json();
      
      console.log('[5] Data parsed:', { 
        hasData: !!data,
        hasParks: !!data?.parks,
        parksLength: data?.parks?.length || 0
      });
      
      const parksData = data.parks || data;
      
      console.log('[6] Setting state with', parksData.length, 'parks');
      
      // Store all parks data but only show first batch
      setAllParksData(parksData);
      
      // Load first batch
      const firstBatch = parksData.slice(0, BATCH_SIZE);
      setParks(firstBatch);
      setFilteredParks(firstBatch);
      setCurrentBatch(1);
      setHasMoreParks(parksData.length > BATCH_SIZE);
      
      console.log('[7] Progressive loading initialized - showing', firstBatch.length, 'of', parksData.length, 'parks');
    } catch (err) {
      console.error('[ERROR] fetchParks failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load parks');
    } finally {
      console.log('[8] Setting loading to false');
      setLoading(false);
    }
  };

  // Show loading state
  if (!mounted || loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white/40 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white/20 text-lg font-light tracking-wider">Loading parks data...</div>
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

  const handleFilterChange = (filters: any) => {
    // Filter from currently loaded parks
    let filtered = [...parks];

    // Filter by biomes
    if (filters.biomes.length > 0) {
      filtered = filtered.filter(park => filters.biomes.includes(park.biome));
    }

    // Filter by activities
    if (filters.activities.length > 0) {
      filtered = filtered.filter(park => 
        park.activities && filters.activities.some((activity: string) => 
          park.activities.includes(activity)
        )
      );
    }

    setFilteredParks(filtered);
    
    // Log filter status
    console.log('[FILTER] Applied filters - showing', filtered.length, 'of', parks.length, 'loaded parks');
  };

  return (
    <div className="fixed inset-0">
      <CustomCursor />
      <RealisticEarthGlobe 
        parks={filteredParks} 
        onParkClick={setSelectedPark} 
        selectedParkId={selectedPark?.id || null}
        shouldResetCamera={shouldResetCamera}
      />
      
      {/* Search Panel */}
      <SearchPanel 
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onParkSelect={handleParkSearchSelect}
      />
      
      {/* Filter Panel */}
      <FilterPanel
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onFilterChange={handleFilterChange}
      />
      
      {/* Control Buttons - Right Side */}
      <div className="absolute top-8 right-8 z-40 flex gap-2">
        {/* Filter Button */}
        {!showFilter && (
          <button
            onClick={() => setShowFilter(true)}
            className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white hover:bg-black/80 transition-all flex items-center gap-2 border border-white/20 hover:border-green-400/50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm">Filter</span>
            {filteredParks.length < parks.length && (
              <span className="bg-green-400/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                {filteredParks.length}/{parks.length}
              </span>
            )}
          </button>
        )}
        
        {/* Search Button */}
        {!showSearch && (
          <button
            onClick={() => setShowSearch(true)}
            className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white hover:bg-black/80 transition-all flex items-center gap-2 border border-white/20 hover:border-green-400/50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm">Search</span>
            <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded">⌘K</kbd>
          </button>
        )}
      </div>
      
      {/* Floating park info panel */}
      {selectedPark && (
        showEnhancedInfo ? (
          <EnhancedParkInfo
            park={selectedPark}
            enrichedData={selectedPark.enrichedData}
            onClose={handleCloseParkInfo}
          />
        ) : (
          <ParkInfoPanel
            park={selectedPark}
            onClose={handleCloseParkInfo}
            onShowTrails={() => {
              if (selectedPark.trails && selectedPark.trails.length > 0) {
                setShowTrails(true);
              }
            }}
          />
        )
      )}
      
      {/* Park Mascot 3D - More Immersive */}
      {selectedPark && selectedPark.mascot && (
        <Mascot3D
          mascot={selectedPark.mascot}
          parkCode={selectedPark.code}
          parkName={selectedPark.name}
        />
      )}
      
      {/* Trail Panel */}
      {showTrails && selectedPark && selectedPark.trails && (
        <TrailPanel
          trails={selectedPark.trails}
          selectedTrail={selectedTrail}
          onTrailSelect={setSelectedTrail}
          onClose={() => {
            setShowTrails(false);
            setSelectedTrail(null);
          }}
        />
      )}
      
      
      {/* ParkSphere Watermark */}
      <div className="fixed top-8 left-8 pointer-events-none select-none z-30">
        <div 
          className="text-5xl font-light tracking-wide watermark-glow"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.4) 75%, rgba(255,255,255,0.6) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 4px 30px rgba(255,255,255,0.5), 0 0 60px rgba(255,255,255,0.3), 0 0 120px rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '0.08em',
            fontWeight: 300,
            backgroundSize: '200% 200%',
            animation: 'shimmer 8s ease-in-out infinite'
          }}
        >
          ParkSphere
        </div>
        <div 
          className="text-white/30 text-sm tracking-[0.4em] mt-2 animate-pulse"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 400,
            textShadow: '0 2px 20px rgba(255,255,255,0.3)',
            animation: 'fadeInOut 4s ease-in-out infinite'
          }}
        >
          EXPLORE NATIONAL PARKS
        </div>
        {(filteredParks.length < parks.length || parks.length < allParksData.length) && (
          <div className="mt-4 space-y-2">
            {filteredParks.length < parks.length && (
              <div className="bg-green-500/20 backdrop-blur-md px-3 py-1.5 rounded-full text-green-400 text-sm inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filtered: {filteredParks.length} of {parks.length} parks
              </div>
            )}
            {parks.length < allParksData.length && (
              <button
                onClick={loadMoreParks}
                disabled={isLoadingMore}
                className="bg-blue-500/20 backdrop-blur-md px-3 py-1.5 rounded-full text-blue-400 text-sm inline-flex items-center gap-2 hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    <span>Load More: {parks.length} of {allParksData.length} parks</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Instruction Bar */}
      <InstructionBar />
    </div>
  );
}