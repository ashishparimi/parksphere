import { NextResponse } from 'next/server';
import { services } from '@/lib/services';

interface EnrichedParkData {
  seasons: {
    spring: { weather: string; highlights: string[]; crowdLevel: string };
    summer: { weather: string; highlights: string[]; crowdLevel: string };
    fall: { weather: string; highlights: string[]; crowdLevel: string };
    winter: { weather: string; highlights: string[]; crowdLevel: string };
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
    beginner: { name: string; distance: string; highlights: string }[];
    intermediate: { name: string; distance: string; highlights: string }[];
    advanced: { name: string; distance: string; highlights: string }[];
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
}

const PARK_PROMPTS = {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parkCode = searchParams.get('park') as keyof typeof PARK_PROMPTS;
  
  if (!parkCode || !PARK_PROMPTS[parkCode]) {
    return NextResponse.json({ error: 'Invalid park code' }, { status: 400 });
  }

  try {
    const prompt = `You are a National Park expert. Provide detailed, accurate information about ${PARK_PROMPTS[parkCode]}.

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

    const enrichmentService = services.getEnrichmentService();
    const enrichedDataRaw = await enrichmentService.enrichParkData(parkCode);
    
    // The service returns parsed JSON, so we need to validate it matches our expected structure
    const response = JSON.stringify(enrichedDataRaw);
    if (!response) {
      console.error('No response from AI.');
      throw new Error('No response from AI');
    }
    
    console.log(`AI response for ${parkCode} (first 200 chars):`, response.substring(0, 200));

    // Parse the JSON response
    let enrichedData: EnrichedParkData;
    try {
      // Remove any markdown code blocks if present
      let cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try to find JSON object in the response
      const jsonStart = cleanJson.indexOf('{');
      const jsonEnd = cleanJson.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
      }
      
      enrichedData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse AI response:', response);
      console.error('Parse error:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    return NextResponse.json({
      parkCode,
      enrichedData,
      generated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Enrichment error:', error);
    return NextResponse.json({ 
      error: 'Failed to enrich park data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Endpoint to enrich all parks
export async function POST(request: Request) {
  const parks = Object.keys(PARK_PROMPTS);
  const results = [];
  
  for (const parkCode of parks) {
    try {
      console.log(`Enriching data for ${parkCode}...`);
      
      // Call the GET method directly instead of making HTTP request
      const url = new URL(request.url);
      url.searchParams.set('park', parkCode);
      const getResponse = await GET(new Request(url.toString()));
      const data = await getResponse.json();
      
      if (getResponse.ok) {
        results.push({ parkCode, status: 'success', data });
      } else {
        results.push({ parkCode, status: 'error', error: data.error });
      }
      
      // Rate limit: wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      results.push({ 
        parkCode, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
  
  return NextResponse.json({
    message: 'Enrichment complete',
    results,
    timestamp: new Date().toISOString()
  });
}