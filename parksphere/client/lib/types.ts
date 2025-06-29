export interface Coordinates {
  lat: number;
  lon: number;
}

export interface GalleryImage {
  url: string;
  blur: string;
  attribution?: string;
}

export interface ParkMascot {
  name: string;
  species: string;
  avatar: string;
  greeting: string;
}

export interface Trail {
  id: string;
  name: string;
  difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
  length: number; // in miles
  elevationGain: number; // in feet
  estimatedTime: number; // in hours
  coordinates: Coordinates[];
  highlights: string[];
  description: string;
}

export interface Park {
  id: number;
  name: string;
  country: string;
  code: string;
  nps_code?: string; // For backwards compatibility
  coordinates: Coordinates;
  biome: string;
  established: number;
  area_acres: number;
  summary: string;
  gallery: GalleryImage[];
  satellite?: string;
  activities?: string[];
  climate?: string;
  nasa_validated?: boolean;
  mascot?: ParkMascot;
  trails?: Trail[];
  enrichedData?: {
    seasons: {
      [key: string]: {
        weather: string;
        highlights: string[];
        crowdLevel: string;
      };
    };
    bestTimeToVisit: string;
    averageVisitors: {
      annual: string;
      peakMonth: string;
      quietMonth: string;
    };
    busyHours: {
      weekday: string;
      weekend: string;
      holidays: string;
    };
    wildlife: {
      common: string[];
      rare: string[];
      bestViewingTimes: string;
      safetyTips: string[];
    };
    popularTrails: {
      [level: string]: Array<{
        name: string;
        distance: string;
        highlights: string;
      }>;
    };
    localTips: string[];
    photographySpots: {
      sunrise: string[];
      sunset: string[];
      night: string[];
    };
    nearbyAttractions: string[];
    parkingInfo: {
      mainLots: string[];
      alternativeParking: string[];
      busyTimes: string;
    };
  };
}