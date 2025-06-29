'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import { ParkMascot as ParkMascotType } from '@/lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ParkMascotProps {
  mascot: ParkMascotType;
  parkCode: string;
  parkName: string;
}

export default function ParkMascot({ mascot, parkCode, parkName }: ParkMascotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  console.log('ParkMascot rendering:', { mascot, parkCode, parkName });

  useEffect(() => {
    // Show greeting when chat opens
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'assistant', content: mascot.greeting }]);
    }
  }, [isOpen, mascot.greeting, messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/mascot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          parkCode,
          parkName,
          mascotName: mascot.name,
          mascotSpecies: mascot.species
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          assistantMessage += chunk;
          
          // Update the last message with streaming content
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages[newMessages.length - 1]?.role === 'assistant') {
              newMessages[newMessages.length - 1].content = assistantMessage;
            } else {
              newMessages.push({ role: 'assistant', content: assistantMessage });
            }
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Oh no! I'm having trouble connecting right now. Let me try again in a moment. ${mascot.name} is temporarily away!` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating mascot button */}
      <motion.button
        className="fixed bottom-8 right-8 z-[100] bg-black/20 rounded-full p-2"
        style={{ cursor: 'pointer' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-50 animate-pulse" />
          <div className="relative bg-gradient-to-br from-green-500 to-green-600 rounded-full p-4 shadow-2xl">
            {mascot.avatar ? (
              <img 
                src={mascot.avatar} 
                alt={`${mascot.name} the ${mascot.species}`}
                className="w-16 h-16"
                onError={(e) => {
                  console.error('Failed to load mascot image:', mascot.avatar);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <span className="text-4xl absolute inset-0 flex items-center justify-center">
              {mascot.species.toLowerCase().includes('bear') ? '🐻' :
               mascot.species.toLowerCase().includes('eagle') ? '🦅' :
               mascot.species.toLowerCase().includes('bison') ? '🦬' :
               mascot.species.toLowerCase().includes('ram') ? '🐏' :
               mascot.species.toLowerCase().includes('goat') ? '🐐' :
               mascot.species.toLowerCase().includes('seal') ? '🦭' :
               mascot.species.toLowerCase().includes('elk') ? '🦌' : '🦝'}
            </span>
          </div>
          <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-2 shadow-lg">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
        </div>
      </motion.button>

      {/* Chat interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-8 right-8 z-[100] w-96 max-w-[calc(100vw-2rem)]"
            style={{ cursor: 'auto' }}
          >
            <div className="bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden allow-cursor">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {mascot.avatar ? (
                      <img 
                        src={mascot.avatar} 
                        alt={mascot.name}
                        className="w-10 h-10"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <span className="text-2xl absolute inset-0 flex items-center justify-center">
                      {mascot.species.toLowerCase().includes('bear') ? '🐻' :
                       mascot.species.toLowerCase().includes('eagle') ? '🦅' :
                       mascot.species.toLowerCase().includes('bison') ? '🦬' :
                       mascot.species.toLowerCase().includes('ram') ? '🐏' :
                       mascot.species.toLowerCase().includes('goat') ? '🐐' :
                       mascot.species.toLowerCase().includes('seal') ? '🦭' :
                       mascot.species.toLowerCase().includes('elk') ? '🦌' : '🦝'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{mascot.name}</h3>
                    <p className="text-white/70 text-sm">{mascot.species} Guide</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white transition-colors"
                  style={{ cursor: 'pointer' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messages.map((message, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-blue-500/20 text-white' 
                        : 'bg-white/10 text-white/90'
                    }`}>
                      {message.content}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex gap-1">
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-2 h-2 bg-white/60 rounded-full"
                        />
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                          className="w-2 h-2 bg-white/60 rounded-full"
                        />
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                          className="w-2 h-2 bg-white/60 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Ask ${mascot.name} about ${parkName}...`}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-green-400/50"
                    style={{ cursor: 'text' }}
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-green-400 rounded-lg p-2 transition-colors"
                    style={{ cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer' }}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}