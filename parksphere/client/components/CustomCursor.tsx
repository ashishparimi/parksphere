'use client';

import { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isOverPark, setIsOverPark] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);

  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const checkParkHover = () => {
      setIsOverPark(document.body.classList.contains('park-hover'));
    };

    const checkShouldHide = () => {
      // Hide cursor if body has normal-cursor class
      setShouldHide(document.body.classList.contains('normal-cursor'));
    };

    window.addEventListener('mousemove', updateCursor);
    
    // Use MutationObserver to watch for class changes
    const observer = new MutationObserver(() => {
      checkParkHover();
      checkShouldHide();
    });
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    // Check initial state
    checkShouldHide();
    
    return () => {
      window.removeEventListener('mousemove', updateCursor);
      observer.disconnect();
    };
  }, [isVisible]);

  // Animate rotation when hovering over parks
  useEffect(() => {
    let animationFrame: number;
    
    if (isOverPark) {
      const animate = () => {
        setRotation(prev => prev + 2);
        animationFrame = requestAnimationFrame(animate);
      };
      animate();
    } else {
      setRotation(0);
    }
    
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isOverPark]);

  return (
    <>
      {isVisible && !shouldHide && (
        <div
          className="fixed pointer-events-none z-[200]"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: `translate(-50%, -50%) scale(${isOverPark ? 1.5 : 1}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease-out',
          }}
        >
        <svg 
          width={isOverPark ? "40" : "30"} 
          height={isOverPark ? "40" : "30"} 
          viewBox="0 0 40 40" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer circle */}
          <circle 
            cx="20" 
            cy="20" 
            r="18" 
            stroke={isOverPark ? "#4ade80" : "#ffffff"} 
            strokeWidth="2" 
            strokeOpacity={isOverPark ? "0.8" : "0.6"}
          />
          
          {/* North pointer (red) */}
          <path 
            d="M20 4 L24 16 L20 14 L16 16 Z" 
            fill="#ef4444" 
            fillOpacity="0.8"
          />
          
          {/* South pointer (white) */}
          <path 
            d="M20 36 L16 24 L20 26 L24 24 Z" 
            fill="#ffffff" 
            fillOpacity="0.6"
          />
          
          {/* East pointer */}
          <path 
            d="M36 20 L24 24 L26 20 L24 16 Z" 
            fill="#64748b" 
            fillOpacity="0.5"
          />
          
          {/* West pointer */}
          <path 
            d="M4 20 L16 16 L14 20 L16 24 Z" 
            fill="#64748b" 
            fillOpacity="0.5"
          />
          
          {/* Center dot */}
          <circle 
            cx="20" 
            cy="20" 
            r="3" 
            fill={isOverPark ? "#4ade80" : "#ffffff"}
            fillOpacity="0.8"
          />
          
          {/* Glow effect when over park */}
          {isOverPark && (
            <>
              <circle 
                cx="20" 
                cy="20" 
                r="18" 
                stroke="#4ade80" 
                strokeWidth="1" 
                strokeOpacity="0.3"
                filter="url(#glow)"
              />
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
            </>
          )}
        </svg>
        </div>
      )}
    </>
  );
}