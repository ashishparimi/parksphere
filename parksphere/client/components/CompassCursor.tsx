'use client';

import { useEffect, useState } from 'react';

export default function CompassCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none z-50 transition-transform duration-75"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Simple compass cursor design */}
      <div className="relative w-8 h-8">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="animate-pulse"
        >
          {/* North arrow - red */}
          <path
            d="M16 4 L12 16 L16 14 L20 16 Z"
            fill="#ef4444"
            opacity="0.8"
          />
          {/* South arrow - white */}
          <path
            d="M16 28 L20 16 L16 18 L12 16 Z"
            fill="#ffffff"
            opacity="0.6"
          />
          {/* East arrow - white */}
          <path
            d="M28 16 L16 12 L18 16 L16 20 Z"
            fill="#ffffff"
            opacity="0.6"
          />
          {/* West arrow - white */}
          <path
            d="M4 16 L16 20 L14 16 L16 12 Z"
            fill="#ffffff"
            opacity="0.6"
          />
          {/* Center dot */}
          <circle
            cx="16"
            cy="16"
            r="2"
            fill="#10b981"
            opacity="0.9"
          />
        </svg>
      </div>
    </div>
  );
}