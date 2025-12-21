import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { participantName, scenarioId } = await request.json();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    // Check if credentials are configured
    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('LiveKit credentials missing:', { 
        hasApiKey: !!apiKey, 
        hasApiSecret: !!apiSecret, 
        hasUrl: !!livekitUrl 
      });
      return NextResponse.json(
        { error: 'LiveKit credentials not configured. Please check your .env.local file.' },
        { status: 500 }
      );
    }

    // Create unique room name for this training session
    const roomName = `umar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Create access token for the participant
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName || 'trainee',
      ttl: 3600, // Token valid for 1 hour
      metadata: JSON.stringify({ 
        scenarioId: scenarioId || 'billing_complaint' 
      }),
    });

    // Grant permissions to join room and publish/subscribe audio
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    console.log('Generated token for room:', roomName, 'scenario:', scenarioId);

    return NextResponse.json({
      token: await token.toJwt(),
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

// Health check endpoint
export async function GET() {
  const configured = !!(
    process.env.LIVEKIT_API_KEY && 
    process.env.LIVEKIT_API_SECRET && 
    process.env.LIVEKIT_URL
  );
  
  return NextResponse.json({ 
    status: 'ok',
    livekitConfigured: configured,
    message: configured 
      ? 'LiveKit is configured' 
      : 'LiveKit credentials missing - check .env.local'
  });
}
