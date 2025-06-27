export interface Coordinates {
  lat: number;
  lon: number;
}

export interface GalleryImage {
  url: string;
  blur: string;
}

export interface Park {
  id: number;
  name: string;
  nps_code: string;
  coordinates: Coordinates;
  biome: string;
  established: number;
  area_acres: number;
  summary: string;
  gallery: GalleryImage[];
  satellite: string;
}