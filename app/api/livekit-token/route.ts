import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { participantName, scenarioId } = await request.json();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('LiveKit credentials missing:', { 
        hasApiKey: !!apiKey, 
        hasApiSecret: !!apiSecret, 
        hasUrl: !!livekitUrl 
      });
      return NextResponse.json(
        { error: 'LiveKit credentials not configured' },
        { status: 500 }
      );
    }

    // Create unique room name
    const roomName = `training-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    // Participant metadata - this is what the agent will read
    const participantMetadata = JSON.stringify({ 
      scenarioId: scenarioId || 'billing_complaint',
      participantName: participantName || 'trainee'
    });

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName || `trainee-${Date.now()}`,
      name: participantName || 'Trainee', // Display name
      metadata: participantMetadata, // This gets passed to participant.metadata
      ttl: 3600,
    });

    // Grant permissions
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();
    
    console.log('✅ Generated token:', {
      room: roomName,
      scenario: scenarioId,
      participant: participantName,
      livekitUrl: livekitUrl
    });

    return NextResponse.json({
      token: jwt,
      roomName: roomName,
      url: livekitUrl,
    });

  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const configured = !!(
    process.env.LIVEKIT_API_KEY && 
    process.env.LIVEKIT_API_SECRET && 
    process.env.LIVEKIT_URL
  );
  
  return NextResponse.json({ 
    status: 'ok',
    livekitConfigured: configured,
  });
}