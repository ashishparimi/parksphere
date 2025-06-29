'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterChange: (filters: FilterOptions) => void;
}

export interface FilterOptions {
  biomes: string[];
  countries: string[];
  activities: string[];
  yearRange: [number, number];
}

const BIOME_OPTIONS = [
  { value: 'desert', label: 'Desert', icon: '🏜️', color: 'orange' },
  { value: 'alpine', label: 'Alpine', icon: '🏔️', color: 'blue' },
  { value: 'temperate_forest', label: 'Temperate Forest', icon: '🌲', color: 'green' },
  { value: 'temperate_rainforest', label: 'Temperate Rainforest', icon: '🌴', color: 'teal' }
];

const ACTIVITY_OPTIONS = [
  { value: 'Hiking', label: 'Hiking', icon: '🥾' },
  { value: 'Rock Climbing', label: 'Rock Climbing', icon: '🧗' },
  { value: 'Photography', label: 'Photography', icon: '📸' },
  { value: 'Camping', label: 'Camping', icon: '🏕️' },
  { value: 'Wildlife Viewing', label: 'Wildlife Viewing', icon: '🦌' },
  { value: 'Rafting', label: 'Rafting', icon: '🛶' },
  { value: 'Backpacking', label: 'Backpacking', icon: '🎒' },
  { value: 'Stargazing', label: 'Stargazing', icon: '🌟' },
  { value: 'Fishing', label: 'Fishing', icon: '🎣' }
];

export default function FilterPanel({ isOpen, onClose, onFilterChange }: FilterPanelProps) {
  const [selectedBiomes, setSelectedBiomes] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1870, 2023]);

  if (!isOpen) return null;

  const handleBiomeToggle = (biome: string) => {
    const newBiomes = selectedBiomes.includes(biome)
      ? selectedBiomes.filter(b => b !== biome)
      : [...selectedBiomes, biome];
    setSelectedBiomes(newBiomes);
    updateFilters(newBiomes, selectedActivities);
  };

  const handleActivityToggle = (activity: string) => {
    const newActivities = selectedActivities.includes(activity)
      ? selectedActivities.filter(a => a !== activity)
      : [...selectedActivities, activity];
    setSelectedActivities(newActivities);
    updateFilters(selectedBiomes, newActivities);
  };

  const updateFilters = (biomes: string[], activities: string[]) => {
    onFilterChange({
      biomes,
      countries: [], // Could be expanded later
      activities,
      yearRange
    });
  };

  const clearFilters = () => {
    setSelectedBiomes([]);
    setSelectedActivities([]);
    setYearRange([1870, 2023]);
    onFilterChange({
      biomes: [],
      countries: [],
      activities: [],
      yearRange: [1870, 2023]
    });
  };

  const hasActiveFilters = selectedBiomes.length > 0 || selectedActivities.length > 0;

  return (
    <div className="absolute top-20 left-8 z-50 w-80">
      <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-green-400" />
            <h3 className="text-white font-medium">Filter Parks</h3>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-white/60 hover:text-white px-2 py-1 hover:bg-white/10 rounded transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Biomes Section */}
        <div className="p-4 border-b border-white/10">
          <h4 className="text-white/80 text-sm font-medium mb-3">Biomes</h4>
          <div className="space-y-2">
            {BIOME_OPTIONS.map(biome => (
              <label
                key={biome.value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={selectedBiomes.includes(biome.value)}
                  onChange={() => handleBiomeToggle(biome.value)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-green-400 focus:ring-green-400/20"
                />
                <span className="text-2xl">{biome.icon}</span>
                <span className="text-white/70 group-hover:text-white transition-colors">
                  {biome.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Activities Section */}
        <div className="p-4 max-h-64 overflow-y-auto">
          <h4 className="text-white/80 text-sm font-medium mb-3">Activities</h4>
          <div className="space-y-2">
            {ACTIVITY_OPTIONS.map(activity => (
              <label
                key={activity.value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={selectedActivities.includes(activity.value)}
                  onChange={() => handleActivityToggle(activity.value)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-green-400 focus:ring-green-400/20"
                />
                <span className="text-lg">{activity.icon}</span>
                <span className="text-white/70 text-sm group-hover:text-white transition-colors">
                  {activity.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Active Filters Count */}
        {hasActiveFilters && (
          <div className="p-3 bg-green-500/10 border-t border-white/10">
            <p className="text-green-400 text-sm text-center">
              {selectedBiomes.length + selectedActivities.length} filter{selectedBiomes.length + selectedActivities.length > 1 ? 's' : ''} active
            </p>
          </div>
        )}
      </div>
    </div>
  );
}