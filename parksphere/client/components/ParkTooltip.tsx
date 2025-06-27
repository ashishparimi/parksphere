'use client';

import { Park } from '@/lib/types';

interface ParkTooltipProps {
  park: Park | null;
  position: { x: number; y: number };
}

export default function ParkTooltip({ park, position }: ParkTooltipProps) {
  if (!park) return null;

  return (
    <div 
      className="absolute pointer-events-none z-50 transition-all duration-150"
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y - 40}px`,
      }}
    >
      <div className="bg-black/80 backdrop-blur-md text-white px-3 py-2 rounded-lg shadow-xl">
        <p className="font-semibold">{park.name}</p>
        <p className="text-sm text-gray-300">{park.country}</p>
        <p className="text-xs text-green-400">{park.biome}</p>
      </div>
    </div>
  );
}