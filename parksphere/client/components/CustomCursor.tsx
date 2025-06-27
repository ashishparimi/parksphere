'use client';

import { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };
    
    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);
    
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      setIsPointer(
        window.getComputedStyle(target).cursor === 'pointer' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.onclick !== null
      );
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseover', handleMouseOver);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <>
      {/* Hide default cursor */}
      <style jsx global>{`
        * {
          cursor: none !important;
        }
      `}</style>
      
      {/* Custom cursor */}
      <div
        className="fixed pointer-events-none z-[9999] mix-blend-difference"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      >
        {/* Main cursor dot */}
        <div
          className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out ${
            isPointer ? 'scale-150' : 'scale-100'
          }`}
        >
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
        
        {/* Outer ring */}
        <div
          className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out ${
            isPointer ? 'scale-100 opacity-100' : 'scale-150 opacity-60'
          }`}
        >
          <div className="w-8 h-8 border border-white rounded-full" />
        </div>
        
        {/* Nature elements - leaves */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2">
          {[0, 90, 180, 270].map((rotation, i) => (
            <div
              key={i}
              className={`absolute transition-all duration-700 ${
                isPointer ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                transform: `rotate(${rotation}deg) translateY(-20px) scale(0.6)`,
                transitionDelay: `${i * 50}ms`,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                  fill="white"
                  opacity="0.8"
                />
                <path
                  d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"
                  fill="white"
                />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}