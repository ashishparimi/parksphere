// API Client for National Parks Earth
// Handles all external API integrations with rate limiting

import axios from 'axios';
import dotenv from 'dotenv';
import { RateLimiter } from './rate-limiter.js';

dotenv.config();

class APIClient {
  constructor() {
    // Initialize rate limiters for each API
    this.rateLimiters = {
      nps: new RateLimiter(10, 3600000), // 10 requests per hour
      usgs: new RateLimiter(50, 3600000), // 50 requests per hour
      nasa: new RateLimiter(30, 3600000), // 30 requests per hour
      wikipedia: new RateLimiter(100, 3600000) // 100 requests per hour
    };
    
    // API configurations
    this.apis = {
      nps: {
        baseURL: 'https://developer.nps.gov/api/v1',
        apiKey: process.env.NPS_API_KEY || ''
      },
      usgs: {
        baseURL: 'https://elevation.nationalmap.gov/arcgis/rest/services',
        // USGS doesn't require API key
      },
      nasa: {
        baseURL: 'https://api.nasa.gov',
        apiKey: process.env.NASA_API_KEY || 'DEMO_KEY'
      },
      wikipedia: {
        baseURL: 'https://en.wikipedia.org/w/api.php'
      }
    };
  }

  async fetchNPSData(parkCode) {
    await this.rateLimiters.nps.waitForToken();
    
    try {
      const response = await axios.get(`${this.apis.nps.baseURL}/parks`, {
        params: {
          parkCode: parkCode,
          api_key: this.apis.nps.apiKey,
          fields: 'images,addresses,contacts,entranceFees,activities,topics,operatingHours'
        }
      });
      
      if (response.data.data && response.data.data.length > 0) {
        const park = response.data.data[0];
        return {
          id: park.parkCode,
          name: park.fullName,
          description: park.description,
          designation: park.designation,
          states: park.states,
          latLong: park.latLong,
          activities: park.activities.map(a => a.name),
          topics: park.topics.map(t => t.name),
          entranceFees: park.entranceFees,
          images: park.images.slice(0, 10), // Limit to 10 images
          weatherInfo: park.weatherInfo,
          directionsInfo: park.directionsInfo,
          url: park.url
        };
      }
      
      throw new Error(`No data found for park code: ${parkCode}`);
    } catch (error) {
      console.error(`NPS API error for ${parkCode}:`, error.message);
      // Return mock data as fallback
      return this.getMockNPSData(parkCode);
    }
  }

  async fetchUSGSElevation(bounds, resolution = 10) {
    await this.rateLimiters.usgs.waitForToken();
    
    const { north, south, east, west } = bounds;
    
    try {
      // USGS National Elevation Dataset (NED) endpoint
      const response = await axios.get(
        `${this.apis.usgs.baseURL}/3DEPElevation/ImageServer/exportImage`,
        {
          params: {
            bbox: `${west},${south},${east},${north}`,
            bboxSR: 4326, // WGS84
            size: `${Math.ceil((east - west) * 111000 / resolution)},${Math.ceil((north - south) * 111000 / resolution)}`,
            imageSR: 4326,
            format: 'tiff',
            pixelType: 'F32',
            noDataInterpretation: 'esriNoDataMatchAny',
            interpolation: 'RSP_BilinearInterpolation',
            f: 'json'
          }
        }
      );
      
      // Process elevation data
      if (response.data.href) {
        const elevationResponse = await axios.get(response.data.href, {
          responseType: 'arraybuffer'
        });
        
        return {
          bounds,
          resolution,
          data: elevationResponse.data,
          format: 'tiff'
        };
      }
      
      throw new Error('No elevation data URL returned');
    } catch (error) {
      console.error(`USGS API error:`, error.message);
      // Return mock elevation data
      return this.getMockElevationData(bounds, resolution);
    }
  }

  async fetchNASAImagery(bounds, parkName) {
    await this.rateLimiters.nasa.waitForToken();
    
    const { north, south, east, west } = bounds;
    const centerLat = (north + south) / 2;
    const centerLon = (east + west) / 2;
    
    try {
      // NASA Earth Imagery API
      const response = await axios.get(`${this.apis.nasa.baseURL}/planetary/earth/assets`, {
        params: {
          lon: centerLon,
          lat: centerLat,
          date: '2023-01-01', // Get recent imagery
          dim: 0.15, // Width/height in degrees
          api_key: this.apis.nasa.apiKey
        }
      });
      
      if (response.data.url) {
        // Fetch the actual image
        const imageResponse = await axios.get(response.data.url, {
          responseType: 'arraybuffer',
          params: {
            api_key: this.apis.nasa.apiKey
          }
        });
        
        return {
          imageData: imageResponse.data,
          date: response.data.date,
          url: response.data.url,
          id: response.data.id,
          cloudScore: response.data.cloud_score || 0
        };
      }
      
      throw new Error('No imagery available');
    } catch (error) {
      console.error(`NASA API error:`, error.message);
      // Return placeholder data
      return {
        imageData: null,
        date: new Date().toISOString(),
        url: `/placeholder/satellite-${parkName.toLowerCase().replace(/ /g, '-')}.jpg`,
        cloudScore: 0
      };
    }
  }

  async fetchWikipediaData(parkName) {
    await this.rateLimiters.wikipedia.waitForToken();
    
    try {
      // Search for the park
      const searchResponse = await axios.get(this.apis.wikipedia.baseURL, {
        params: {
          action: 'query',
          format: 'json',
          list: 'search',
          srsearch: `${parkName} National Park`,
          srlimit: 1
        }
      });
      
      if (searchResponse.data.query.search.length > 0) {
        const pageId = searchResponse.data.query.search[0].pageid;
        
        // Get page content
        const contentResponse = await axios.get(this.apis.wikipedia.baseURL, {
          params: {
            action: 'query',
            format: 'json',
            prop: 'extracts|info|pageimages',
            pageids: pageId,
            exintro: true,
            explaintext: true,
            inprop: 'url',
            piprop: 'original'
          }
        });
        
        const page = contentResponse.data.query.pages[pageId];
        
        return {
          title: page.title,
          extract: page.extract,
          url: page.fullurl,
          thumbnail: page.original ? page.original.source : null
        };
      }
      
      throw new Error('No Wikipedia page found');
    } catch (error) {
      console.error(`Wikipedia API error:`, error.message);
      return {
        title: `${parkName} National Park`,
        extract: `${parkName} National Park is a protected area known for its natural beauty.`,
        url: `https://en.wikipedia.org/wiki/${parkName.replace(/ /g, '_')}_National_Park`
      };
    }
  }

  // Mock data methods for development/fallback
  getMockNPSData(parkCode) {
    const parkNames = {
      'yose': 'Yosemite',
      'grca': 'Grand Canyon',
      'yell': 'Yellowstone',
      'grsm': 'Great Smoky Mountains',
      'zion': 'Zion',
      'romo': 'Rocky Mountain',
      'acad': 'Acadia',
      'grte': 'Grand Teton',
      'olym': 'Olympic',
      'glac': 'Glacier'
    };
    
    return {
      id: parkCode,
      name: parkNames[parkCode] || 'Unknown Park',
      description: `${parkNames[parkCode]} National Park offers stunning natural beauty and diverse ecosystems.`,
      activities: ['Hiking', 'Camping', 'Wildlife Viewing', 'Photography', 'Backpacking'],
      entranceFees: [{
        cost: '35.00',
        description: 'Vehicle pass valid for 7 days'
      }],
      images: [],
      weatherInfo: 'Weather varies by season. Check current conditions before visiting.'
    };
  }

  getMockElevationData(bounds, resolution) {
    const { north, south, east, west } = bounds;
    const width = Math.ceil((east - west) * 111000 / resolution);
    const height = Math.ceil((north - south) * 111000 / resolution);
    
    // Generate simple terrain data
    const data = new Float32Array(width * height);
    for (let i = 0; i < data.length; i++) {
      // Simple noise-based terrain
      const x = (i % width) / width;
      const y = Math.floor(i / width) / height;
      data[i] = 1000 + Math.sin(x * Math.PI * 4) * 200 + Math.cos(y * Math.PI * 4) * 150;
    }
    
    return {
      bounds,
      resolution,
      width,
      height,
      data,
      format: 'float32array'
    };
  }
}

export default APIClient;