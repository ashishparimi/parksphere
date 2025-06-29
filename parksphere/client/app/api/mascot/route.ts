import { NextRequest } from 'next/server';
import { services } from '@/lib/services';

// Use edge runtime for better performance
export const runtime = 'edge';

// Single mascot for all parks - Bear Park Ranger
const RANGER_BEAR = {
  name: "Ranger Bear",
  species: "Bear Park Ranger",
  personality: "Friendly, knowledgeable, and enthusiastic about all national parks. Has visited every park and loves sharing stories and tips.",
  style: "Warm, educational, and encouraging. Uses park ranger expertise to help visitors plan their adventures."
};

export async function POST(request: NextRequest) {
  try {
    // Check if GROQ_API_KEY is available
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not configured');
      return Response.json(
        { error: 'AI service is not configured. Please set GROQ_API_KEY environment variable.' },
        { status: 503 }
      );
    }

    const { parkId, message, conversationHistory = [] } = await request.json();
    
    // Use the single Ranger Bear mascot for all parks
    const mascot = RANGER_BEAR;
    
    // Get mascot service
    const mascotService = services.getMascotService();
    
    // Generate streaming response
    const stream = await mascotService.generateResponse({
      message,
      mascotName: mascot.name,
      mascotSpecies: mascot.species,
      parkName: parkId, // This should be the park ID/code for now
      parkCode: parkId,
      conversationHistory: conversationHistory.slice(-6) // Last 6 messages for context
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      }
    });
    
  } catch (error) {
    console.error('Mascot API error:', error);
    // Provide more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return Response.json(
      { error: `Failed to get response from mascot: ${errorMessage}` },
      { status: 500 }
    );
  }
}