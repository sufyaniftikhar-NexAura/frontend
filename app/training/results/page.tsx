'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, TrendingUp, Award } from 'lucide-react';

interface CategoryScore {
  score: number;
  feedback: string;
}

interface SessionData {
  id: number;
  duration_seconds: number;
  message_count: number;
  overall_score: number;
  overall_grade: string;
  category_scores: Record<string, CategoryScore>;
  strengths: string[];
  improvements: string[];
  summary: string;
  summary_urdu: string;
  transcript: any[];
  completed_at: string;
  scenario: {
    name: string;
    name_urdu: string;
    difficulty: string;
  };
  agent_name: string;
}

export default function TrainingResultsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const sessionId = sessionStorage.getItem('training_session_id');
    if (!sessionId) {
      console.error('No session ID found');
      router.push('/training');
      return;
    }

    fetchSessionResults(parseInt(sessionId));
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchSessionResults = async (sessionId: number) => {
    try {
      console.log('📥 Fetching results for session:', sessionId);
      const response = await fetch(`${API_URL}/training/sessions/${sessionId}/details`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Results loaded:', data);
        setSessionData(data);
      } else {
        console.error('❌ Failed to load results:', response.status);
        alert('Failed to load results');
        router.push('/training');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      alert('Error loading results');
      router.push('/training');
    } finally {
      setLoading(false);
    }
  };

  const handlePracticeAgain = () => {
    sessionStorage.removeItem('training_session_id');
    sessionStorage.removeItem('selected_training_scenario');
    router.push('/training');
  };

  const handleViewHistory = () => {
    // TODO: Create training/history page
    alert('Training history page coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!sessionData) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 80) return 'bg-blue-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-blue-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCategoryName = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-indigo-900">Training Results</h1>
              <p className="text-sm text-gray-600">{sessionData.scenario.name}</p>
              <p className="text-xs text-gray-500">{sessionData.scenario.name_urdu}</p>
            </div>
            <button
              onClick={() => router.push('/training')}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Training
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Overall Score Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-24 h-24 rounded-full ${getScoreBg(sessionData.overall_score)} flex items-center justify-center`}>
                <span className={`text-4xl font-bold ${getScoreColor(sessionData.overall_score)}`}>
                  {sessionData.overall_grade}
                </span>
              </div>
              <div>
                <h2 className="text-4xl font-bold text-gray-900">{sessionData.overall_score}/100</h2>
                <p className="text-gray-600">Overall Performance</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-gray-600">Duration</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatDuration(sessionData.duration_seconds)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Messages: {sessionData.message_count}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Difficulty: <span className="font-medium capitalize">{sessionData.scenario.difficulty}</span>
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
            <p className="text-gray-700 leading-relaxed">{sessionData.summary}</p>
            {sessionData.summary_urdu && (
              <p className="text-gray-600 mt-3 leading-relaxed text-right" dir="rtl">
                {sessionData.summary_urdu}
              </p>
            )}
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Strengths */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-bold text-gray-900">Strengths</h3>
            </div>
            {sessionData.strengths && sessionData.strengths.length > 0 ? (
              <ul className="space-y-3">
                {sessionData.strengths.map((strength: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-green-600 font-bold text-lg">✓</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No strengths recorded</p>
            )}
          </div>

          {/* Improvements */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-orange-600" />
              <h3 className="text-xl font-bold text-gray-900">Areas to Improve</h3>
            </div>
            {sessionData.improvements && sessionData.improvements.length > 0 ? (
              <ul className="space-y-3">
                {sessionData.improvements.map((improvement: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-orange-600 font-bold text-lg">→</span>
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No improvements suggested</p>
            )}
          </div>
        </div>

        {/* Category Scores */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-6 text-gray-900">Category Breakdown</h3>
          {sessionData.category_scores && Object.keys(sessionData.category_scores).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(sessionData.category_scores).map(([key, data]: [string, any]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{formatCategoryName(key)}</span>
                    <span className={`font-bold text-lg ${getScoreColor(data.score)}`}>
                      {data.score}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor(data.score)}`}
                      style={{ width: `${data.score}%` }}
                    />
                  </div>
                  {data.feedback && (
                    <p className="text-sm text-gray-600 leading-relaxed">{data.feedback}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No category scores available</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handlePracticeAgain}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Award className="w-6 h-6" />
            Practice Again
          </button>
          <button
            onClick={handleViewHistory}
            className="bg-white hover:bg-gray-50 text-gray-800 px-8 py-4 rounded-xl font-semibold shadow-lg transition-all border-2 border-gray-200"
          >
            View History
          </button>
        </div>
      </main>
    </div>
  );
}