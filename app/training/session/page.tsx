'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useTrackTranscription,
} from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import { Phone, PhoneOff, Loader2, AlertCircle } from 'lucide-react';

import '@livekit/components-styles';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isFinal: boolean;
}

// ✅ 1. Main logic moved to this inner component
function TrainingSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connectionDetails, setConnectionDetails] = useState<{
    token: string;
    url: string;
    roomName: string;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    // ✅ NEW: Check cookie auth instead of localStorage
    checkAuthAndStart();
  }, []);

  const checkAuthAndStart = async () => {
    try {
      // 1. Verify User is Logged In (Cookie Auth)
      const authResponse = await fetch(`${API_URL}/auth/check`, {
        credentials: 'include' // ✅ Send cookies
      });
      
      if (!authResponse.ok) {
        console.log('❌ Not authenticated');
        router.push('/login');
        return;
      }

      // 2. Get Scenario ID (from URL or SessionStorage)
      const urlScenarioId = searchParams.get('scenarioId');
      const storageScenarioId = sessionStorage.getItem('selected_training_scenario');
      const scenarioId = urlScenarioId || storageScenarioId;

      if (!scenarioId) {
        console.log('❌ No scenario selected');
        router.push('/training');
        return;
      }

      console.log('✅ Starting session with scenario:', scenarioId);
      setSelectedScenarioId(scenarioId);
      startSession(scenarioId);

    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const startSession = async (scenarioId: string) => {
    setIsConnecting(true);
    setError(null);

    console.log('🔄 Step 1: Getting LiveKit token...');

    try {
      // Step 1: Get LiveKit token from LOCAL API route
      // (This creates the room on LiveKit server)
      const livekitResponse = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: 'trainee',
          scenarioId: scenarioId,
        }),
      });

      if (!livekitResponse.ok) {
        throw new Error('Failed to get LiveKit token');
      }

      const livekitData = await livekitResponse.json();
      console.log('✅ LiveKit token received:', {
        roomName: livekitData.roomName,
        url: livekitData.url
      });
      
      // Step 2: Create training session in Backend
      console.log('🔄 Step 2: Creating training session in backend...');
      
      // ✅ FIXED: Use cookie auth (credentials: 'include')
      const sessionResponse = await fetch(`${API_URL}/training/sessions/start`, {
        method: 'POST',
        credentials: 'include', // ✅ Sends HttpOnly cookie
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scenario_id: scenarioId,
          room_name: livekitData.roomName
        })
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        console.error('❌ Session creation failed:', errorData);
        throw new Error(errorData.detail || 'Failed to create training session');
      }

      const sessionData = await sessionResponse.json();
      console.log('✅ Training session created:', sessionData);
      setSessionId(sessionData.id);

      // Step 3: Set connection details to start LiveKit
      setConnectionDetails(livekitData);
      setSessionStartTime(new Date());
      setMessages([]);
      console.log('✅ Ready to connect to LiveKit room');

    } catch (err) {
      console.error('💥 Failed to start session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session');
      setIsConnecting(false);
    }
  };

  const endSession = useCallback(async () => {
    console.log('🔄 End session called');
    
    if (!sessionId || !sessionStartTime) {
      console.log('❌ No session ID or start time:', { sessionId, sessionStartTime });
      router.push('/training');
      return;
    }

    const duration = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000);
    const finalMessages = messages.filter(m => m.isFinal);

    try {
      // Generate evaluation using LOCAL API route
      console.log('🔄 Step 1: Calling evaluation API...');
      const evaluationResponse = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: finalMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          scenario: { 
            id: selectedScenarioId,
            name: 'Training Scenario',
            evaluationFocus: ['Communication', 'Problem Solving']
          },
          duration
        })
      });

      if (!evaluationResponse.ok) {
        throw new Error(`Evaluation failed: ${evaluationResponse.status}`);
      }

      const evaluation = await evaluationResponse.json();
      console.log('✅ Evaluation received:', evaluation);

      // Save session results to QA SaaS backend
      console.log('🔄 Step 2: Saving to backend...');
      const savePayload = {
        duration_seconds: duration,
        message_count: finalMessages.length,
        transcript: finalMessages,
        evaluation
      };

      // ✅ FIXED: Use cookie auth (credentials: 'include')
      const saveResponse = await fetch(`${API_URL}/training/sessions/${sessionId}/complete`, {
        method: 'POST',
        credentials: 'include', // ✅ Sends HttpOnly cookie
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(savePayload)
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error('❌ Backend save error:', errorText);
        throw new Error(`Save failed: ${saveResponse.status}`);
      }

      const saveResult = await saveResponse.json();
      console.log('✅ Session saved successfully:', saveResult);

      // Navigate to results page
      sessionStorage.setItem('training_session_id', sessionId.toString());
      router.push('/training/results');

    } catch (err) {
      console.error('💥 Error ending session:', err);
      alert(`Failed to save training results: ${err instanceof Error ? err.message : 'Unknown error'}`);
      router.push('/training');
    }
  }, [messages, sessionId, sessionStartTime, selectedScenarioId, router, API_URL]);

  // Pre-connection screen
  if (!connectionDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          {error ? (
            <>
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/training')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold"
              >
                Back to Training Portal
              </button>
            </>
          ) : (
            <>
              <Loader2 className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Starting Training Session</h2>
              <p className="text-gray-600">Connecting to AI training room...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Connected: LiveKit Room
  return (
    <LiveKitRoom
      token={connectionDetails.token}
      serverUrl={connectionDetails.url}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={() => {
        console.log('🔌 Disconnected from room');
      }}
      onError={(err) => {
        console.error('💥 LiveKit error:', err);
        setError(err.message);
      }}
      className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100"
    >
      <ActiveSession
        sessionStartTime={sessionStartTime}
        messages={messages}
        setMessages={setMessages}
        onEndSession={endSession}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

// ============================================
// ✅ 2. Default export wraps content in Suspense
// ============================================
export default function TrainingSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
      </div>
    }>
      <TrainingSessionContent />
    </Suspense>
  );
}

// ============================================
// Active Session Component (Helper)
// ============================================
interface ActiveSessionProps {
  sessionStartTime: Date | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onEndSession: () => void;
}

function ActiveSession({
  sessionStartTime,
  messages,
  setMessages,
  onEndSession
}: ActiveSessionProps) {
  const connectionState = useConnectionState();
  const voiceAssistant = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { state: agentState, audioTrack, agentTranscriptions } = voiceAssistant;

  const micTrackRef = localParticipant?.getTrackPublication(Track.Source.Microphone)
    ? {
        participant: localParticipant,
        publication: localParticipant.getTrackPublication(Track.Source.Microphone)!,
        source: Track.Source.Microphone,
      }
    : undefined;

  const userTranscription = useTrackTranscription(micTrackRef);
  const isConnected = connectionState === ConnectionState.Connected;
  const isConnecting = connectionState === ConnectionState.Connecting;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle agent transcriptions
  useEffect(() => {
    if (!agentTranscriptions || agentTranscriptions.length === 0) return;

    agentTranscriptions.forEach((segment) => {
      const segmentId = segment.id || `agent-${segment.firstReceivedTime}`;
      const messageId = `assistant-${segmentId}`;
      
      if (!segment.text || segment.text.trim() === '') return;

      setMessages(prev => {
        const existingIndex = prev.findIndex(m => m.id === messageId);
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            content: segment.text,
            isFinal: segment.final ?? false,
          };
          return updated;
        } else {
          return [...prev, {
            id: messageId,
            role: 'assistant' as const,
            content: segment.text,
            timestamp: new Date(),
            isFinal: segment.final ?? false,
          }];
        }
      });
    });
  }, [agentTranscriptions, setMessages]);

  // Handle user transcriptions
  useEffect(() => {
    if (!userTranscription.segments || userTranscription.segments.length === 0) return;

    userTranscription.segments.forEach((segment) => {
      const segmentId = segment.id || `user-${segment.firstReceivedTime}`;
      const messageId = `user-${segmentId}`;
      
      if (!segment.text || segment.text.trim() === '') return;

      setMessages(prev => {
        const existingIndex = prev.findIndex(m => m.id === messageId);
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            content: segment.text,
            isFinal: segment.final ?? false,
          };
          return updated;
        } else {
          return [...prev, {
            id: messageId,
            role: 'user' as const,
            content: segment.text,
            timestamp: new Date(),
            isFinal: segment.final ?? false,
          }];
        }
      });
    });
  }, [userTranscription.segments, setMessages]);

  const getStatusDisplay = () => {
    if (!isConnected) {
      return {
        icon: '🔄',
        text: isConnecting ? 'Connecting...' : 'Disconnected',
        color: 'bg-yellow-100 text-yellow-800'
      };
    }
    
    switch (agentState) {
      case 'listening':
        return { icon: '🎤', text: 'Listening...', color: 'bg-green-100 text-green-800' };
      case 'thinking':
        return { icon: '🤔', text: 'Processing...', color: 'bg-yellow-100 text-yellow-800' };
      case 'speaking':
        return { icon: '🔊', text: 'Customer Speaking', color: 'bg-blue-100 text-blue-800' };
      default:
        return { icon: '⏳', text: 'Waiting...', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const status = getStatusDisplay();
  const displayMessages = messages.filter(m => m.content && m.content.trim() !== '');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-indigo-900">QA Training Session</h1>
              <p className="text-sm text-gray-600">Practice your customer service skills</p>
            </div>
            <div className="flex items-center gap-4">
              {sessionStartTime && <SessionTimer startTime={sessionStartTime} />}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {isConnected ? '● Connected' : '○ Connecting'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-6 w-full">
        {/* Status Card */}
        <div className={`rounded-2xl p-6 mb-6 text-center ${status.color}`}>
          <div className="text-5xl mb-3">{status.icon}</div>
          <p className="text-xl font-semibold">{status.text}</p>
          
          {audioTrack && (
            <div className="mt-4 flex justify-center">
              <BarVisualizer
                state={agentState}
                trackRef={audioTrack}
                barCount={7}
                className="h-16 w-48"
              />
            </div>
          )}
        </div>

        {/* Conversation Messages */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Conversation</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {displayMessages.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                {isConnected ? "Waiting for customer to speak..." : "Connecting..."}
              </p>
            ) : (
              displayMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    } ${!msg.isFinal ? 'opacity-70' : ''}`}
                  >
                    <p className="text-xs font-semibold mb-1 opacity-70">
                      {msg.role === 'user' ? 'You (Agent)' : 'Customer (AI)'}
                    </p>
                    <p className="text-base leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* End Session Button */}
        <div className="flex justify-center">
          <button
            onClick={() => onEndSession()}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg"
          >
            <PhoneOff className="w-5 h-5" />
            End Session & Get Evaluation
          </button>
        </div>
      </main>
    </div>
  );
}

function SessionTimer({ startTime }: { startTime: Date }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="text-right">
      <p className="text-xs text-gray-500">Duration</p>
      <p className="text-lg font-semibold text-indigo-900">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </p>
    </div>
  );
}