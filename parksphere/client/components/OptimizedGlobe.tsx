'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GlobeEngine } from '@/src/engine/GlobeEngine';
import { Park } from '@/lib/types';
import dynamic from 'next/dynamic';

const PerformanceMonitorUI = dynamic(() => import('./PerformanceMonitorUI'), { ssr: false });

interface OptimizedGlobeProps {
  onParkClick?: (park: Park) => void;
  selectedParkId?: number | null;
  quality?: 'auto' | 'low' | 'medium' | 'high' | 'ultra';
  showPerformanceStats?: boolean;
  streetViewPark?: Park | null;
}

export default function OptimizedGlobe({ 
  onParkClick, 
  selectedParkId,
  quality = 'auto',
  showPerformanceStats = false,
  streetViewPark
}: OptimizedGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GlobeEngine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parks, setParks] = useState<Park[]>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('');
  const [fps, setFps] = useState<number>(0);
  const [selectedParkForTerrain, setSelectedParkForTerrain] = useState<Park | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const initEngine = async () => {
      try {
        // Quality presets (auto will be handled by AdaptiveQualityManager)
        const qualitySettings = quality === 'auto' ? undefined : {
          low: {
            shadows: false,
            ssao: false,
            bloom: false,
            antialias: 'none' as const,
            textureQuality: 'low' as const
          },
          medium: {
            shadows: false,
            ssao: false,
            bloom: true,
            antialias: 'fxaa' as const,
            textureQuality: 'medium' as const
          },
          high: {
            shadows: true,
            ssao: true,
            bloom: true,
            antialias: 'smaa' as const,
            textureQuality: 'high' as const
          },
          ultra: {
            shadows: true,
            ssao: true,
            bloom: true,
            antialias: 'smaa' as const,
            textureQuality: 'ultra' as const
          }
        }[quality];

        // Initialize engine
        const engine = new GlobeEngine({
          canvas: canvasRef.current,
          quality: qualitySettings,
          showStats: showPerformanceStats || process.env.NODE_ENV === 'development'
        });
        
        engineRef.current = engine;

        // Load static data
        const loadedParks = await engine.loadStaticData();
        setParks(loadedParks);

        // Set up event handlers
        engine.on('click', (park: Park) => {
          // Store the park for terrain view
          setSelectedParkForTerrain(park);
          
          // Don't notify parent component - we handle it internally
        });

        engine.on('hover', (park: Park | null) => {
          if (canvasRef.current) {
            canvasRef.current.style.cursor = park ? 'pointer' : 'grab';
          }
        });

        // Monitor quality changes
        if (quality === 'auto') {
          const canvas = canvasRef.current;
          canvas.addEventListener('qualitychange', (event: any) => {
            const preset = event.detail;
            setCurrentQuality(preset.name);
          });
        }

        // Start animation loop
        engine.animate();
        
        // Update FPS counter
        if (showPerformanceStats) {
          const updateStats = () => {
            if (engineRef.current) {
              const stats = engineRef.current.getMetrics();
              setFps(stats.fps);
            }
            requestAnimationFrame(updateStats);
          };
          updateStats();
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize globe engine:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setLoading(false);
      }
    };

    initEngine();

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, [quality, onParkClick]);

  // Handle park selection
  useEffect(() => {
    if (engineRef.current && selectedParkId !== undefined) {
      if (selectedParkId === null) {
        // Reset view
        engineRef.current.setView({
          position: new THREE.Vector3(0, 0, 3)
        });
      } else {
        // Find park and fly to it
        const park = parks.find(p => p.id === selectedParkId);
        if (park) {
          engineRef.current.flyTo(park, {
            duration: 2000,
            onComplete: () => {
              console.log(`Arrived at ${park.name}`);
              // Auto-trigger street view if park was selected from URL
              setSelectedParkForTerrain(park);
            }
          });
          engineRef.current.highlightPark(selectedParkId);
        }
      }
    }
  }, [selectedParkId, parks]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white/20 text-xl font-light tracking-wider">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-red-500 text-2xl">Error: {error}</div>
      </div>
    );
  }


  return (
    <>
      <canvas 
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />
      
      
      {/* Performance Monitor UI */}
      {(showPerformanceStats || process.env.NODE_ENV === 'development') && engineRef.current && (
        <PerformanceMonitorUI
          getMetrics={() => engineRef.current?.getMetrics() || {}}
          isVisible={true}
          position="top-right"
        />
      )}
    </>
  );
}