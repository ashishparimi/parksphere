'use client';

import { useState, useEffect } from 'react';
import { Park } from '@/lib/types';
import { 
  Calendar, Clock, Users, Camera, Car, TreePine, 
  Sunrise, Sunset, Moon, AlertTriangle, MapPin,
  TrendingUp, TrendingDown, Info
} from 'lucide-react';

interface EnhancedParkInfoProps {
  park: Park;
  enrichedData?: any;
  onClose: () => void;
}

export default function EnhancedParkInfo({ park, enrichedData, onClose }: EnhancedParkInfoProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'seasons' | 'wildlife' | 'trails' | 'tips'>('overview');
  const [loading, setLoading] = useState(!enrichedData);
  const [data, setData] = useState(enrichedData);
  const hasMascot = park.mascot !== undefined;

  useEffect(() => {
    if (!enrichedData) {
      fetchEnrichedData();
    }
  }, [park.code]);

  const fetchEnrichedData = async () => {
    try {
      const response = await fetch(`/api/enrich-park-data?park=${park.code}`);
      const result = await response.json();
      
      if (response.ok) {
        setData(result.enrichedData);
      }
    } catch (error) {
      console.error('Failed to fetch enriched data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'seasons', label: 'Seasons', icon: Calendar },
    { id: 'wildlife', label: 'Wildlife', icon: TreePine },
    { id: 'trails', label: 'Trails', icon: MapPin },
    { id: 'tips', label: 'Tips', icon: Camera }
  ];

  const getCrowdLevelColor = (level: string) => {
    switch(level?.toLowerCase()) {
      case 'low': return 'text-green-400';
      case 'moderate': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-white/60';
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center ${hasMascot ? 'justify-start pl-16' : 'justify-center'} p-4 bg-black/50 backdrop-blur-sm`}>
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/10">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-6 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">{park.name}</h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-400">{park.country}</span>
                <span className="px-2 py-1 bg-white/10 rounded-full text-white/80">
                  {park.biome.replace('_', ' ')}
                </span>
                <span className="text-white/60">Est. {park.established}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-white border-b-2 border-green-400' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-white/60">Loading enhanced data...</div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Best Time to Visit */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-green-400" />
                        Best Time to Visit
                      </h3>
                      <p className="text-white/80">{data?.bestTimeToVisit || 'Spring and Fall'}</p>
                    </div>

                    {/* Visitor Stats */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        Visitor Statistics
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">Annual Visitors:</span>
                          <span className="text-white">{data?.averageVisitors?.annual || '4.5 million'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Peak Month:</span>
                          <span className="text-red-400">{data?.averageVisitors?.peakMonth || 'July'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Quiet Month:</span>
                          <span className="text-green-400">{data?.averageVisitors?.quietMonth || 'February'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Busy Hours */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-yellow-400" />
                        Busy Hours
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-white/60">Weekdays: </span>
                          <span className="text-white">{data?.busyHours?.weekday || '10am-3pm'}</span>
                        </div>
                        <div>
                          <span className="text-white/60">Weekends: </span>
                          <span className="text-white">{data?.busyHours?.weekend || '9am-5pm'}</span>
                        </div>
                        <div>
                          <span className="text-white/60">Holidays: </span>
                          <span className="text-white">{data?.busyHours?.holidays || 'Extremely busy all day'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Parking Info */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Car className="w-5 h-5 text-purple-400" />
                        Parking Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-white/60">Main Lots: </span>
                          <span className="text-white">
                            {data?.parkingInfo?.mainLots?.join(', ') || 'Valley View, Glacier Point'}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/60">Busy Times: </span>
                          <span className="text-white">{data?.parkingInfo?.busyTimes || 'Weekends by 9am'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Photography Spots */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-pink-400" />
                      Best Photography Spots
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Sunrise className="w-4 h-4 text-orange-400" />
                          <span className="text-white/80 font-medium">Sunrise</span>
                        </div>
                        <ul className="text-sm text-white/60 space-y-1">
                          {data?.photographySpots?.sunrise?.map((spot: string, idx: number) => (
                            <li key={idx}>• {spot}</li>
                          )) || <li>• Tunnel View</li>}
                        </ul>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Sunset className="w-4 h-4 text-orange-500" />
                          <span className="text-white/80 font-medium">Sunset</span>
                        </div>
                        <ul className="text-sm text-white/60 space-y-1">
                          {data?.photographySpots?.sunset?.map((spot: string, idx: number) => (
                            <li key={idx}>• {spot}</li>
                          )) || <li>• Glacier Point</li>}
                        </ul>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Moon className="w-4 h-4 text-blue-400" />
                          <span className="text-white/80 font-medium">Night Sky</span>
                        </div>
                        <ul className="text-sm text-white/60 space-y-1">
                          {data?.photographySpots?.night?.map((spot: string, idx: number) => (
                            <li key={idx}>• {spot}</li>
                          )) || <li>• Washburn Point</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seasons Tab */}
              {activeTab === 'seasons' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['spring', 'summer', 'fall', 'winter'].map(season => {
                    const seasonData = data?.seasons?.[season];
                    const seasonIcons = {
                      spring: '🌸',
                      summer: '☀️',
                      fall: '🍂',
                      winter: '❄️'
                    };
                    
                    return (
                      <div key={season} className="bg-white/5 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-3 capitalize flex items-center justify-between">
                          <span>{seasonIcons[season as keyof typeof seasonIcons]} {season}</span>
                          <span className={`text-sm ${getCrowdLevelColor(seasonData?.crowdLevel)}`}>
                            {seasonData?.crowdLevel || 'Moderate'} crowds
                          </span>
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <span className="text-white/60 text-sm">Weather:</span>
                            <p className="text-white/80">{seasonData?.weather || 'Variable conditions'}</p>
                          </div>
                          <div>
                            <span className="text-white/60 text-sm">Highlights:</span>
                            <ul className="mt-1 space-y-1">
                              {seasonData?.highlights?.map((highlight: string, idx: number) => (
                                <li key={idx} className="text-white/80 text-sm">• {highlight}</li>
                              )) || <li className="text-white/80 text-sm">• Seasonal activities</li>}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Wildlife Tab */}
              {activeTab === 'wildlife' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-3">Common Wildlife</h3>
                      <div className="flex flex-wrap gap-2">
                        {data?.wildlife?.common?.map((animal: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                            {animal}
                          </span>
                        )) || <span className="text-white/60">Black bears, deer, squirrels</span>}
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-3">Rare Sightings</h3>
                      <div className="flex flex-wrap gap-2">
                        {data?.wildlife?.rare?.map((animal: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                            {animal}
                          </span>
                        )) || <span className="text-white/60">Mountain lions, bobcats</span>}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Wildlife Viewing</h3>
                    <p className="text-white/80 mb-4">
                      {data?.wildlife?.bestViewingTimes || 'Best viewing at dawn and dusk in meadows and near water sources.'}
                    </p>
                    
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Safety Tips
                      </h4>
                      <ul className="space-y-1">
                        {data?.wildlife?.safetyTips?.map((tip: string, idx: number) => (
                          <li key={idx} className="text-white/80 text-sm">• {tip}</li>
                        )) || (
                          <>
                            <li className="text-white/80 text-sm">• Keep 25 yards from most wildlife</li>
                            <li className="text-white/80 text-sm">• Store food in bear boxes</li>
                            <li className="text-white/80 text-sm">• Never feed wildlife</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Trails Tab */}
              {activeTab === 'trails' && (
                <div className="space-y-6">
                  {['beginner', 'intermediate', 'advanced'].map(level => {
                    const trails = data?.popularTrails?.[level] || [];
                    const levelColors = {
                      beginner: 'green',
                      intermediate: 'yellow',
                      advanced: 'red'
                    };
                    
                    return (
                      <div key={level} className="bg-white/5 rounded-lg p-4">
                        <h3 className={`text-lg font-semibold text-${levelColors[level as keyof typeof levelColors]}-400 mb-3 capitalize`}>
                          {level} Trails
                        </h3>
                        <div className="space-y-3">
                          {trails.length > 0 ? trails.map((trail: any, idx: number) => (
                            <div key={idx} className="border-l-2 border-white/20 pl-4">
                              <h4 className="text-white font-medium">{trail.name}</h4>
                              <p className="text-white/60 text-sm">{trail.distance} • {trail.highlights}</p>
                            </div>
                          )) : (
                            <p className="text-white/60">Popular {level} trails information coming soon...</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tips Tab */}
              {activeTab === 'tips' && (
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Local Tips</h3>
                    <ul className="space-y-2">
                      {data?.localTips?.map((tip: string, idx: number) => (
                        <li key={idx} className="text-white/80 flex items-start gap-2">
                          <span className="text-green-400 mt-1">💡</span>
                          {tip}
                        </li>
                      )) || (
                        <>
                          <li className="text-white/80 flex items-start gap-2">
                            <span className="text-green-400 mt-1">💡</span>
                            Visit early morning to avoid crowds
                          </li>
                          <li className="text-white/80 flex items-start gap-2">
                            <span className="text-green-400 mt-1">💡</span>
                            Book accommodations well in advance
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Nearby Attractions</h3>
                    <div className="flex flex-wrap gap-2">
                      {data?.nearbyAttractions?.map((attraction: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                          {attraction}
                        </span>
                      )) || <span className="text-white/60">Explore nearby towns and attractions</span>}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}