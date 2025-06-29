'use client';

import { Trail } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

interface TrailPanelProps {
  trails: Trail[];
  selectedTrail: Trail | null;
  onTrailSelect: (trail: Trail) => void;
  onClose: () => void;
}

export default function TrailPanel({ 
  trails, 
  selectedTrail, 
  onTrailSelect,
  onClose 
}: TrailPanelProps) {
  const difficultyConfig = {
    easy: { color: 'text-green-400', bg: 'bg-green-500/20', icon: '🥾' },
    moderate: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '🥾🥾' },
    hard: { color: 'text-orange-400', bg: 'bg-orange-500/20', icon: '🥾🥾🥾' },
    expert: { color: 'text-red-400', bg: 'bg-red-500/20', icon: '🥾🥾🥾🥾' }
  };

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      className="fixed left-4 top-24 z-40 w-80 max-h-[calc(100vh-120px)] overflow-hidden"
    >
      <div className="bg-black/60 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>🥾</span> Park Trails
            </h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Trail List */}
        <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
          {trails.map(trail => {
            const config = difficultyConfig[trail.difficulty];
            const isSelected = selectedTrail?.id === trail.id;

            return (
              <motion.div
                key={trail.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onTrailSelect(trail)}
                className={`cursor-pointer rounded-lg p-3 transition-all ${
                  isSelected 
                    ? 'bg-white/20 ring-2 ring-green-400' 
                    : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-white text-sm">{trail.name}</h4>
                  <span className={`${config.bg} ${config.color} px-2 py-1 rounded-full text-xs`}>
                    {trail.difficulty}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-white/70">
                  <div>
                    <span className="text-white/50">Length:</span>
                    <p className="font-medium">{trail.length} mi</p>
                  </div>
                  <div>
                    <span className="text-white/50">Elevation:</span>
                    <p className="font-medium">+{trail.elevationGain} ft</p>
                  </div>
                  <div>
                    <span className="text-white/50">Time:</span>
                    <p className="font-medium">{trail.estimatedTime}h</p>
                  </div>
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-3 pt-3 border-t border-white/10"
                  >
                    <p className="text-xs text-white/70 mb-2">{trail.description}</p>
                    {trail.highlights.length > 0 && (
                      <div>
                        <p className="text-xs text-white/50 mb-1">Highlights:</p>
                        <div className="flex flex-wrap gap-1">
                          {trail.highlights.map((highlight, idx) => (
                            <span
                              key={idx}
                              className="bg-white/10 px-2 py-0.5 rounded-full text-xs text-white/80"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-white/10 bg-black/40">
          <p className="text-xs text-white/50 mb-2">Difficulty Legend:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(difficultyConfig).map(([level, config]) => (
              <div key={level} className="flex items-center gap-2">
                <span className={config.color}>{config.icon}</span>
                <span className="text-white/70 capitalize">{level}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}