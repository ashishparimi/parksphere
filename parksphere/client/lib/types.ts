export interface Coordinates {
  lat: number;
  lon: number;
}

export interface GalleryImage {
  url: string;
  blur: string;
  attribution?: string;
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
}