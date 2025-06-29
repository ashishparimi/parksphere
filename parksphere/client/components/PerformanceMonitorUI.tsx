'use client';

import { useEffect, useState } from 'react';
import { PerformanceReport } from '@/src/engine/PerformanceMonitor';

interface PerformanceMonitorUIProps {
  getMetrics: () => any;
  isVisible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export default function PerformanceMonitorUI({ 
  getMetrics, 
  isVisible = true,
  position = 'top-left' 
}: PerformanceMonitorUIProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      const data = getMetrics();
      setMetrics(data);
    };

    const interval = setInterval(updateMetrics, 100);
    return () => clearInterval(interval);
  }, [getMetrics, isVisible]);

  if (!isVisible || !metrics) return null;

  const getColorForValue = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-400';
    if (value >= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  };

  return (
    <div 
      className={`fixed ${positionClasses[position]} z-50 transition-all duration-300`}
      style={{ maxWidth: expanded ? '400px' : '280px' }}
    >
      {/* Compact View */}
      <div className="bg-black/85 backdrop-blur-md rounded-lg p-3 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-white/90 tracking-wide uppercase">Performance Monitor</h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {expanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              )}
            </svg>
          </button>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className={`text-2xl font-bold ${getColorForValue(metrics.fps || 0, { good: 55, warning: 30 })}`}>
              {metrics.fps?.toFixed(0) || '0'}
            </div>
            <div className="text-white/50 text-[10px] uppercase">FPS</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${getColorForValue(100 - (metrics.frameTime || 0), { good: 80, warning: 50 })}`}>
              {metrics.frameTime?.toFixed(1) || '0'}
            </div>
            <div className="text-white/50 text-[10px] uppercase">MS</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${getScoreColor(metrics.score?.overall || 0)}`}>
              {metrics.score?.overall || 0}
            </div>
            <div className="text-white/50 text-[10px] uppercase">Score</div>
          </div>
        </div>

        {/* Expanded View */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
            {/* Performance Scores */}
            {metrics.score && (
              <div className="space-y-1">
                <div className="text-xs text-white/70 font-semibold mb-1">Performance Breakdown</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">FPS Score</span>
                    <span className={getScoreColor(metrics.score.fps)}>{metrics.score.fps}/100</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Draw Calls</span>
                    <span className={getScoreColor(metrics.score.drawCalls)}>{metrics.score.drawCalls}/100</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Triangles</span>
                    <span className={getScoreColor(metrics.score.triangles)}>{metrics.score.triangles}/100</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Memory</span>
                    <span className={getScoreColor(metrics.score.memory)}>{metrics.score.memory}/100</span>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Stats */}
            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="text-xs text-white/70 font-semibold mb-1">Render Stats</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">Draw Calls</span>
                  <span className="text-white/90">{metrics.drawCalls || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Triangles</span>
                  <span className="text-white/90">{((metrics.triangles || 0) / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Geometries</span>
                  <span className="text-white/90">{metrics.geometries || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Textures</span>
                  <span className="text-white/90">{metrics.textures || 0}</span>
                </div>
              </div>
            </div>

            {/* Memory Usage */}
            {metrics.memoryUsage && (
              <div className="space-y-1 pt-2 border-t border-white/10">
                <div className="text-xs text-white/70 font-semibold mb-1">Memory Usage</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Total</span>
                    <span className="text-white/90">{metrics.memoryUsage.total.toFixed(1)} MB</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Geometries</span>
                    <span className="text-white/90">{metrics.memoryUsage.geometries.toFixed(1)} MB</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Textures</span>
                    <span className="text-white/90">{metrics.memoryUsage.textures.toFixed(1)} MB</span>
                  </div>
                </div>
              </div>
            )}

            {/* Optimization Suggestions */}
            {metrics.suggestions && metrics.suggestions.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-white/10">
                <div className="text-xs text-white/70 font-semibold mb-1">Optimization Tips</div>
                <div className="space-y-1">
                  {metrics.suggestions.slice(0, 3).map((suggestion: string, idx: number) => (
                    <div key={idx} className="text-[10px] text-yellow-400/80 flex items-start gap-1">
                      <span>•</span>
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Settings */}
            {metrics.quality && (
              <div className="flex justify-between text-xs pt-2 border-t border-white/10">
                <span className="text-white/60">Render Quality</span>
                <span className="text-white/90 capitalize">{metrics.quality}</span>
              </div>
            )}
          </div>
        )}

        {/* Performance Bar */}
        <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              (metrics.score?.overall || 0) >= 80 ? 'bg-green-400' :
              (metrics.score?.overall || 0) >= 60 ? 'bg-yellow-400' :
              (metrics.score?.overall || 0) >= 40 ? 'bg-orange-400' :
              'bg-red-400'
            }`}
            style={{ width: `${metrics.score?.overall || 0}%` }}
          />
        </div>
      </div>

      {/* FPS Graph (optional, when expanded) */}
      {expanded && metrics.fpsHistory && (
        <div className="mt-2 bg-black/85 backdrop-blur-md rounded-lg p-3 border border-white/10">
          <div className="text-xs text-white/70 font-semibold mb-2">FPS History</div>
          <div className="h-16 flex items-end gap-[1px]">
            {metrics.fpsHistory.slice(-60).map((fps: number, idx: number) => (
              <div 
                key={idx}
                className={`flex-1 ${
                  fps >= 55 ? 'bg-green-400' :
                  fps >= 30 ? 'bg-yellow-400' :
                  'bg-red-400'
                }`}
                style={{ 
                  height: `${(fps / 60) * 100}%`,
                  minHeight: '2px',
                  opacity: 0.8
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-white/40 mt-1">
            <span>60s ago</span>
            <span>now</span>
          </div>
        </div>
      )}
    </div>
  );
}