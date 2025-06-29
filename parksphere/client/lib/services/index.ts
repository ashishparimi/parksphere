// Service Layer - Centralized API and service management
// This provides a clean interface for all external services

import { getConfig } from '../config';
import Groq from 'groq-sdk';

// Service interfaces
interface MascotService {
  generateResponse(params: {
    message: string;
    mascotName: string;
    mascotSpecies: string;
    parkName: string;
    parkCode: string;
    conversationHistory: Array<{ role: string; content: string }>;
  }): Promise<ReadableStream<Uint8Array>>;
}

interface EnrichmentService {
  enrichParkData(parkCode: string): Promise<any>;
}

// Groq service implementation
class GroqMascotService implements MascotService {
  private client: Groq | null = null;

  private getClient(): Groq {
    if (!this.client) {
      const config = getConfig();
      if (!config.api.groqKey) {
        throw new Error('GROQ_API_KEY is not configured');
      }
      this.client = new Groq({ apiKey: config.api.groqKey });
    }
    return this.client;
  }

  async generateResponse(params: {
    message: string;
    mascotName: string;
    mascotSpecies: string;
    parkName: string;
    parkCode: string;
    conversationHistory: Array<{ role: string; content: string }>;
  }): Promise<ReadableStream<Uint8Array>> {
    const client = this.getClient();
    
    const systemPrompt = `You are Ranger Bear, a friendly Bear Park Ranger who has visited and worked at all national parks across the country.
    
    Currently helping visitors at: ${params.parkName}
    
    Personality: Friendly, knowledgeable, and enthusiastic about all national parks. You have years of experience and love sharing stories and tips.
    Speaking style: Warm, educational, and encouraging. Use your park ranger expertise to help visitors plan their adventures.
    
    You have extensive knowledge about:
    - The park's history, geology, and ecosystem
    - Wildlife and plant species
    - Hiking trails and viewpoints
    - Safety guidelines and regulations
    - Best times to visit different areas
    - Photography spots and tips
    - Connections and comparisons between different parks
    
    Always stay in character as a helpful park ranger. Be engaging and educational.
    Keep responses concise (2-3 sentences unless asked for more detail).
    Share your experience from other parks when relevant to help visitors.`;
    
    const stream = await client.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...params.conversationHistory,
        { role: 'user', content: params.message }
      ],
      model: 'llama-3.3-70b-versatile',
      stream: true,
      temperature: 0.7,
      max_tokens: 800
    });

    // Convert to ReadableStream
    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            controller.enqueue(encoder.encode(text));
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(encoder.encode('I seem to be having trouble right now. Please try again!'));
        } finally {
          controller.close();
        }
      }
    });
  }
}

class GroqEnrichmentService implements EnrichmentService {
  private client: Groq | null = null;

  private getClient(): Groq {
    if (!this.client) {
      const config = getConfig();
      if (!config.api.groqKey) {
        throw new Error('GROQ_API_KEY is not configured');
      }
      this.client = new Groq({ apiKey: config.api.groqKey });
    }
    return this.client;
  }

  async enrichParkData(parkCode: string): Promise<any> {
    const client = this.getClient();
    
    const parkNames: Record<string, string> = {
      yose: "Yosemite National Park in California",
      grca: "Grand Canyon National Park in Arizona",
      yell: "Yellowstone National Park in Wyoming",
      grsm: "Great Smoky Mountains National Park in Tennessee/North Carolina",
      zion: "Zion National Park in Utah",
      romo: "Rocky Mountain National Park in Colorado",
      acad: "Acadia National Park in Maine",
      grte: "Grand Teton National Park in Wyoming",
      olym: "Olympic National Park in Washington",
      glac: "Glacier National Park in Montana"
    };
    
    const parkName = parkNames[parkCode] || `${parkCode} National Park`;
    
    const prompt = `You are a National Park expert. Provide detailed, accurate information about ${parkName}.

Return a JSON object with this exact structure (no markdown, just JSON):
{
  "seasons": {
    "spring": {
      "weather": "Temperature range and conditions",
      "highlights": ["3-4 specific activities or sights"],
      "crowdLevel": "Low/Moderate/High"
    },
    "summer": {
      "weather": "Temperature range and conditions",
      "highlights": ["3-4 specific activities or sights"],
      "crowdLevel": "Low/Moderate/High"
    },
    "fall": {
      "weather": "Temperature range and conditions",
      "highlights": ["3-4 specific activities or sights"],
      "crowdLevel": "Low/Moderate/High"
    },
    "winter": {
      "weather": "Temperature range and conditions",
      "highlights": ["3-4 specific activities or sights"],
      "crowdLevel": "Low/Moderate/High"
    }
  },
  "bestTimeToVisit": "Specific months and why",
  "averageVisitors": {
    "annual": "X million visitors",
    "peakMonth": "Month - X visitors",
    "quietMonth": "Month - X visitors"
  },
  "busyHours": {
    "weekday": "9am-11am least busy, 2pm-4pm busiest",
    "weekend": "Specific hours",
    "holidays": "Specific advice"
  },
  "wildlife": {
    "common": ["5-6 commonly seen animals"],
    "rare": ["2-3 rare sightings"],
    "bestViewingTimes": "Dawn and dusk in specific areas",
    "safetyTips": ["3-4 specific safety tips"]
  },
  "popularTrails": {
    "beginner": [
      {"name": "Trail Name", "distance": "X miles", "highlights": "What you'll see"}
    ],
    "intermediate": [
      {"name": "Trail Name", "distance": "X miles", "highlights": "What you'll see"}
    ],
    "advanced": [
      {"name": "Trail Name", "distance": "X miles", "highlights": "What you'll see"}
    ]
  },
  "localTips": ["5 insider tips from locals"],
  "photographySpots": {
    "sunrise": ["2-3 specific locations"],
    "sunset": ["2-3 specific locations"],
    "night": ["1-2 spots for astrophotography"]
  },
  "nearbyAttractions": ["3-4 attractions within 30 miles"],
  "parkingInfo": {
    "mainLots": ["Names of main parking areas"],
    "alternativeParking": ["Overflow or alternative options"],
    "busyTimes": "Specific times when parking is hardest"
  }
}`;
    
    const completion = await client.chat.completions.create({
      messages: [{
        role: 'system',
        content: 'You are a National Park expert providing accurate, detailed information. Always return valid JSON without markdown formatting.'
      }, {
        role: 'user',
        content: prompt
      }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  }
}

// Service factory
class ServiceProvider {
  private static instance: ServiceProvider;
  private services: Map<string, any> = new Map();

  private constructor() {
    // Register services
    this.services.set('mascot', new GroqMascotService());
    this.services.set('enrichment', new GroqEnrichmentService());
  }

  static getInstance(): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider();
    }
    return ServiceProvider.instance;
  }

  getMascotService(): MascotService {
    return this.services.get('mascot');
  }

  getEnrichmentService(): EnrichmentService {
    return this.services.get('enrichment');
  }
}

// Export service provider
export const services = ServiceProvider.getInstance();

// Export service types
export type { MascotService, EnrichmentService };