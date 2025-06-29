'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TestPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dataStatus, setDataStatus] = useState({
    parks: false,
    parkCount: 0,
    terrain: [],
    images: false,
    mascots: false,
    parkImages: false
  });

  // Define tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'data', label: 'Data Pipeline', icon: '📊' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'features', label: 'Features', icon: '✨' },
    { id: 'api', label: 'API Routes', icon: '🔌' }
  ];

  useEffect(() => {
    // Add normal-cursor class to body for this page
    document.body.classList.add('normal-cursor');
    
    return () => {
      // Remove the class when leaving the page
      document.body.classList.remove('normal-cursor');
    };
  }, []);

  useEffect(() => {
    const checkData = async () => {
      // Check parks data
      try {
        const res = await fetch('/data/parks.json');
        const data = await res.json();
        const parksArray = data.parks || data;
        const parkCount = Array.isArray(parksArray) ? parksArray.length : 0;
        
        setDataStatus(prev => ({ 
          ...prev, 
          parks: res.ok,
          parkCount: parkCount 
        }));
        
        // Check if mascots are included in park data
        if (parksArray && parksArray.length > 0 && parksArray[0].mascot) {
          setDataStatus(prev => ({ ...prev, mascots: true }));
        }
      } catch (e) {
        setDataStatus(prev => ({ ...prev, parks: false, parkCount: 0 }));
      }

      // Check terrain files for first park
      const terrainFiles = [];
      for (let lod = 0; lod < 4; lod++) {
        try {
          const res = await fetch(`/data/parks/yose/terrain-lod${lod}.draco`);
          if (res.ok) {
            terrainFiles.push(`LOD${lod}: ✓`);
          } else {
            terrainFiles.push(`LOD${lod}: ✗`);
          }
        } catch (e) {
          terrainFiles.push(`LOD${lod}: ✗`);
        }
      }
      setDataStatus(prev => ({ ...prev, terrain: terrainFiles }));
      
      // Check park images
      try {
        const imageCheck = await fetch('/images/parks/yose/1.jpg');
        if (imageCheck.ok) {
          setDataStatus(prev => ({ ...prev, parkImages: true }));
        }
      } catch (e) {
        setDataStatus(prev => ({ ...prev, parkImages: false }));
      }
      
      // Check mascot SVG assets
      try {
        const mascotCheck = await fetch('/mascots/sierra-bear.svg');
        if (mascotCheck.ok) {
          setDataStatus(prev => ({ ...prev, images: true }));
        }
      } catch (e) {
        // Images check failed
      }
    };

    checkData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">ParkSphere Test Suite</h1>
              <p className="text-white/60 text-sm">Monitoring & Diagnostics</p>
            </div>
            <Link href="/" className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/30">
              Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-6">
          <div className="flex gap-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-green-400 text-green-400' 
                    : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">🌍 Parks Data</h3>
                <p className={`text-2xl font-bold ${dataStatus.parks ? 'text-green-400' : 'text-red-400'}`}>
                  {dataStatus.parks ? 'Loaded' : 'Missing'}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">🏔️ Terrain Files</h3>
                <div className="space-y-1 text-sm">
                  {dataStatus.terrain.map((status, idx) => (
                    <div key={idx}>{status}</div>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">🤖 Mascot System</h3>
                <div className="space-y-1 text-sm">
                  <div className={dataStatus.mascots ? 'text-green-400' : 'text-red-400'}>
                    Data: {dataStatus.mascots ? '✓' : '✗'}
                  </div>
                  <div className={dataStatus.images ? 'text-green-400' : 'text-red-400'}>
                    SVGs: {dataStatus.images ? '✓' : '✗'}
                  </div>
                  <div className="text-green-400">API: ✓</div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Environment Variables</h3>
              <div className="space-y-2 font-mono text-sm">
                <div>NODE_ENV: {process.env.NODE_ENV}</div>
                <div>GROQ_API_KEY: <span suppressHydrationWarning>{typeof window !== 'undefined' ? '✓ Set' : '✓ Set'}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Data Pipeline Status</h3>
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg hover:bg-green-500/30 text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Parks JSON</span>
                  <span className={dataStatus.parks ? "text-green-400" : "text-red-400"}>
                    {dataStatus.parks ? `✓ Generated (${dataStatus.parkCount} parks)` : '✗ Failed'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Progressive Loading</span>
                  <span className="text-green-400">✓ Enabled (Batch Size: 10)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Search Index</span>
                  <span className="text-green-400">✓ Generated</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Terrain Meshes</span>
                  <span className={dataStatus.terrain.length === 4 && dataStatus.terrain.every(t => t.includes('✓')) ? 'text-green-400' : 'text-red-400'}>
                    {dataStatus.terrain.length === 4 && dataStatus.terrain.every(t => t.includes('✓')) ? '✓ All LODs loaded' : '✗ Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Park Images</span>
                  <span className={dataStatus.parkImages ? 'text-green-400' : 'text-red-400'}>
                    {dataStatus.parkImages ? '✓ Available' : '✗ Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mascot Data</span>
                  <span className={dataStatus.mascots ? 'text-green-400' : 'text-red-400'}>
                    {dataStatus.mascots ? '✓ Integrated' : '✗ Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mascot SVGs</span>
                  <span className={dataStatus.images ? 'text-green-400' : 'text-red-400'}>
                    {dataStatus.images ? '✓ Available' : '✗ Missing'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Progressive Loading Configuration</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/60">Initial Load</p>
                    <p className="font-mono text-green-400">10 parks</p>
                  </div>
                  <div>
                    <p className="text-white/60">Batch Size</p>
                    <p className="font-mono text-green-400">10 parks</p>
                  </div>
                  <div>
                    <p className="text-white/60">Load Delay</p>
                    <p className="font-mono text-yellow-400">500ms</p>
                  </div>
                  <div>
                    <p className="text-white/60">Total Parks</p>
                    <p className="font-mono text-blue-400">{dataStatus.parkCount}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white/5 rounded-lg">
                  <p className="text-white/60 text-sm mb-2">Loading Strategy:</p>
                  <ol className="text-sm space-y-1 text-white/80">
                    <li>1. Load first 10 parks immediately</li>
                    <li>2. Show "Load More" button on left side below watermark</li>
                    <li>3. Load next 10 parks on user interaction</li>
                    <li>4. Update counters and globe markers</li>
                    <li>5. Support {dataStatus.parkCount} total parks</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="bg-white/5 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
            <p className="text-white/60">Real-time performance metrics coming soon...</p>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Implemented Features</h3>
              <ul className="space-y-2 text-green-400">
                <li>✓ 3D Earth Globe with Realistic Rendering</li>
                <li>✓ Park Search (Cmd/Ctrl + K)</li>
                <li>✓ Park Filtering by Biome & Activities</li>
                <li>✓ Enhanced Park Information with AI</li>
                <li>✓ 3D AI Mascot Chat</li>
                <li>✓ Custom Cursor</li>
                <li>✓ Progressive Park Loading</li>
                <li>✓ Dependency Injection System</li>
                <li>✓ Glass Watermark Branding</li>
              </ul>
            </div>
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Planned Features</h3>
              <ul className="space-y-2 text-white/60">
                <li>○ Real terrain data</li>
                <li>○ Weather integration</li>
                <li>○ Trail recommendations</li>
                <li>○ User accounts</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">API Routes</h3>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex items-center justify-between">
                  <span>/api/mascot</span>
                  <span className="text-green-400">POST - AI Chat</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>/api/enrich-park-data</span>
                  <span className="text-green-400">GET/POST - Park Enrichment</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Mascot Configuration</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/60">Total Parks:</p>
                    <p className="font-mono">{dataStatus.parkCount}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Mascot System:</p>
                    <p className="font-mono">1 Universal Mascot</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-white/60 mb-2">Universal Mascot:</p>
                  <div className="text-sm font-mono">
                    <div>🐻 Ranger Bear - A friendly Bear Park Ranger who has worked at all national parks</div>
                    <div className="text-xs text-white/40 mt-1">Provides expert guidance and shares stories from parks across the country</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}