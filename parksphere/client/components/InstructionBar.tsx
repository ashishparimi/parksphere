'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MousePointer, Search, Filter, MessageCircle, Globe, MapPin } from 'lucide-react';

export default function InstructionBar() {
  const [isVisible, setIsVisible] = useState(true);
  const [currentTip, setCurrentTip] = useState(0);

  const tips = [
    {
      icon: <Globe className="w-4 h-4" />,
      text: "Drag to rotate the Earth",
      highlight: "Left Click + Drag"
    },
    {
      icon: <MousePointer className="w-4 h-4" />,
      text: "Scroll to zoom in/out",
      highlight: "Mouse Wheel"
    },
    {
      icon: <MapPin className="w-4 h-4" />,
      text: "Click on a park marker to explore",
      highlight: "Click Parks"
    },
    {
      icon: <Search className="w-4 h-4" />,
      text: "Search for parks",
      highlight: "⌘K"
    },
    {
      icon: <MessageCircle className="w-4 h-4" />,
      text: "Chat with park mascots for local insights",
      highlight: "AI Guide"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [tips.length]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
      >
        <div className="relative">
          {/* Gradient fade at top */}
          <div className="absolute inset-x-0 -top-20 h-20 bg-gradient-to-t from-black/20 to-transparent" />
          
          {/* Main bar */}
          <div 
            className="bg-white/10 backdrop-blur-2xl border-t border-white/20"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: '0 -8px 32px 0 rgba(31, 38, 135, 0.37)'
            }}
          >
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left section - Current tip */}
                <motion.div 
                  key={currentTip}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                      {tips[currentTip].icon}
                    </div>
                    <div>
                      <p className="text-white/80 text-sm">{tips[currentTip].text}</p>
                      <p className="text-green-400 text-xs font-semibold tracking-wide">{tips[currentTip].highlight}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Center section - Quick actions */}
                <div className="hidden md:flex items-center gap-6 pointer-events-auto">
                  <a 
                    href="/test" 
                    className="text-white/60 hover:text-green-400 transition-colors text-sm font-light"
                  >
                    System Status
                  </a>
                </div>

                {/* Right section - Progress dots and close */}
                <div className="flex items-center gap-4 pointer-events-auto">
                  <div className="flex gap-1">
                    {tips.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentTip(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          index === currentTip 
                            ? 'bg-green-400 w-8' 
                            : 'bg-white/30 hover:bg-white/50 w-1.5'
                        }`}
                      />
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setIsVisible(false)}
                    className="text-white/40 hover:text-white/60 transition-colors p-2 hover:bg-white/10 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}