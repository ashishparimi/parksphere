import { Park } from '@/lib/types';
import Image from 'next/image';
import { useRef, useState } from 'react';

interface ParkCardProps {
  park: Park;
  onClick: () => void;
}

export default function ParkCard({ park, onClick }: ParkCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isHovered, setIsHovered] = useState(false);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !isHovered) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate distance from center
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    
    // Magnetic effect strength
    const magnetStrength = 0.15;
    const maxDistance = 100;
    
    // Calculate magnetic pull
    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
    const strength = Math.max(0, 1 - distance / maxDistance);
    
    setTransform({
      x: distanceX * magnetStrength * strength,
      y: distanceY * magnetStrength * strength,
      scale: 1 + strength * 0.05
    });
  };
  
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransform({ x: 0, y: 0, scale: 1 });
  };
  const biomeGradients: Record<string, string> = {
    desert: 'from-orange-400 to-red-500',
    temperate_forest: 'from-green-400 to-emerald-600',
    alpine: 'from-blue-400 to-indigo-600',
    wetland: 'from-cyan-400 to-teal-600',
    temperate_rainforest: 'from-emerald-500 to-green-700',
  };

  const biomeEmojis: Record<string, string> = {
    desert: '🏜️',
    temperate_forest: '🌲',
    alpine: '🏔️',
    wetland: '🏞️',
    temperate_rainforest: '🌿',
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden cursor-pointer"
      style={{
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transition: isHovered ? 'none' : 'transform 0.5s ease-out',
      }}
    >
      <div className="relative h-56 bg-gray-200">
        <Image
          src={park.gallery[0].url}
          alt={park.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className={`absolute top-4 right-4 px-4 py-2 bg-gradient-to-r ${biomeGradients[park.biome] || 'from-gray-400 to-gray-600'} text-white rounded-full text-sm font-bold shadow-lg`}>
          {biomeEmojis[park.biome]} {park.biome.replace('_', ' ')}
        </div>
      </div>
      <div className="p-8">
        <h3 className="text-2xl font-bold mb-3 text-gray-800 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-park-green group-hover:to-park-blue transition-all duration-300">
          {park.name}
        </h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">📅</span>
            <span className="text-lg font-medium text-gray-700">{park.established}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">📏</span>
            <span className="text-lg font-medium text-gray-700">{(park.area_acres / 1000).toFixed(0)}k acres</span>
          </div>
        </div>
        <p className="text-gray-700 text-lg leading-relaxed line-clamp-3">{park.summary}</p>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-park-green font-bold text-lg group-hover:text-park-blue transition-colors">
            Learn More →
          </span>
          <div 
            className="w-12 h-12 bg-gradient-to-br from-park-green/20 to-park-blue/20 rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              transform: isHovered ? 'scale(1.2) rotate(10deg)' : 'scale(1) rotate(0deg)'
            }}
          >
            <span className="text-2xl">🏕️</span>
          </div>
        </div>
      </div>
    </div>
  );
}