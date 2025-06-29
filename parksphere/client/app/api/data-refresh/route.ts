import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Rate limit configuration
const RATE_LIMITS = {
  unsplash: { requests: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour
  nps: { requests: 100, windowMs: 60 * 60 * 1000 },     // 100 per hour
  nasa: { requests: 30, windowMs: 60 * 60 * 1000 },      // 30 per hour
};

// In-memory rate limit tracking (use Redis in production)
const rateLimitTracker = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(service: string): Promise<boolean> {
  const now = Date.now();
  const limit = RATE_LIMITS[service as keyof typeof RATE_LIMITS];
  
  if (!limit) return true;
  
  const tracker = rateLimitTracker.get(service) || { count: 0, resetTime: now + limit.windowMs };
  
  // Reset if window expired
  if (now > tracker.resetTime) {
    tracker.count = 0;
    tracker.resetTime = now + limit.windowMs;
  }
  
  // Check if under limit
  if (tracker.count < limit.requests) {
    tracker.count++;
    rateLimitTracker.set(service, tracker);
    return true;
  }
  
  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parkCode = searchParams.get('park');
  const dataType = searchParams.get('type'); // 'images', 'details', 'terrain'
  
  if (!parkCode || !dataType) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }
  
  try {
    // Check which service we need based on data type
    const service = dataType === 'images' ? 'unsplash' : 
                   dataType === 'terrain' ? 'nasa' : 'nps';
    
    // Check rate limit
    const canProceed = await checkRateLimit(service);
    
    if (!canProceed) {
      // Calculate time until rate limit resets
      const tracker = rateLimitTracker.get(service);
      const timeUntilReset = tracker ? Math.ceil((tracker.resetTime - Date.now()) / 1000) : 3600;
      
      return NextResponse.json({
        error: 'Rate limit exceeded',
        retryAfter: timeUntilReset,
        service
      }, { 
        status: 429,
        headers: {
          'Retry-After': timeUntilReset.toString()
        }
      });
    }
    
    // Simulate API call (replace with actual API calls)
    const mockData = await fetchDataFromAPI(parkCode, dataType);
    
    // Update local cache
    await updateLocalCache(parkCode, dataType, mockData);
    
    return NextResponse.json({
      success: true,
      park: parkCode,
      dataType,
      timestamp: new Date().toISOString(),
      remainingRequests: RATE_LIMITS[service as keyof typeof RATE_LIMITS].requests - (rateLimitTracker.get(service)?.count || 0)
    });
    
  } catch (error) {
    console.error('Data refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function fetchDataFromAPI(parkCode: string, dataType: string): Promise<any> {
  // This is where you'd make actual API calls
  // For now, return mock data
  return {
    parkCode,
    dataType,
    data: `Mock ${dataType} data for ${parkCode}`,
    fetchedAt: new Date().toISOString()
  };
}

async function updateLocalCache(parkCode: string, dataType: string, data: any): Promise<void> {
  // Update the static JSON files
  const dataPath = path.join(process.cwd(), 'public', 'data', 'parks');
  const parkDataPath = path.join(dataPath, parkCode);
  
  // Ensure directory exists
  await fs.mkdir(parkDataPath, { recursive: true });
  
  // Write updated data
  const filename = `${dataType}-enhanced.json`;
  await fs.writeFile(
    path.join(parkDataPath, filename),
    JSON.stringify(data, null, 2)
  );
}

// Background job endpoint to progressively update all parks
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'start-progressive-update') {
    // Start background job to update parks one by one
    startProgressiveUpdate();
    
    return NextResponse.json({
      message: 'Progressive update started',
      estimatedTime: '2-3 hours for all parks'
    });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

async function startProgressiveUpdate() {
  const parks = ['yose', 'grca', 'yell', 'grsm', 'zion', 'romo', 'acad', 'grte', 'olym', 'glac'];
  const dataTypes = ['images', 'details', 'terrain'];
  
  for (const park of parks) {
    for (const dataType of dataTypes) {
      try {
        // Make request to our own endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/data-refresh?park=${park}&type=${dataType}`);
        
        if (response.status === 429) {
          // Rate limited, wait and retry
          const retryAfter = parseInt(response.headers.get('Retry-After') || '3600');
          console.log(`Rate limited for ${park} ${dataType}, waiting ${retryAfter}s`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        
        console.log(`Updated ${park} ${dataType}`);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error(`Failed to update ${park} ${dataType}:`, error);
      }
    }
  }
}