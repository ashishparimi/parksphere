'use client';

import { useState, useEffect, useRef } from 'react';
import { Park } from '@/lib/types';
import { Search, X, MapPin, Trees, Globe } from 'lucide-react';

interface SearchPanelProps {
  onParkSelect: (park: Park) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchPanel({ onParkSelect, isOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Park[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    // Debounce search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      performSearch();
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError('Failed to search parks');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleParkSelect = (park: Park) => {
    onParkSelect(park);
    onClose();
    setQuery('');
    setResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-20 right-8 z-50 w-96">
      <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
        {/* Search Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-green-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parks by name, country..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40 text-lg"
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center text-white/60">
              Searching...
            </div>
          )}

          {error && (
            <div className="p-8 text-center text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && query.length >= 2 && results.length === 0 && (
            <div className="p-8 text-center text-white/60">
              No parks found for "{query}"
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="py-2">
              {results.map((park) => (
                <button
                  key={park.id}
                  onClick={() => handleParkSelect(park)}
                  className="w-full px-4 py-3 hover:bg-white/10 transition-colors text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-400/20 rounded-lg group-hover:bg-green-400/30 transition-colors">
                      <Trees className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">
                        {park.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-white/60">
                        <Globe className="w-3 h-3" />
                        <span>{park.country}</span>
                        <span className="text-white/30">•</span>
                        <span>{park.biome}</span>
                      </div>
                      {park.summary && (
                        <p className="mt-2 text-sm text-white/50 line-clamp-2">
                          {park.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.length < 2 && (
            <div className="p-8 text-center text-white/40">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}