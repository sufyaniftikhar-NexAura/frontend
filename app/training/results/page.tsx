'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, TrendingUp, Award } from 'lucide-react';

export default function TrainingResultsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const sessionId = sessionStorage.getItem('training_session_id');
    if (!sessionId) {
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
      const response = await fetch(`${API_URL}/training/sessions/${sessionId}/details`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setSessionData(data);
      } else {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-indigo-900">Training Results</h1>
              <p className="text-sm text-gray-600">{sessionData.scenario.name}</p>
            </div>
            <button
              onClick={() => router.push('/training')}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Training
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Overall Score */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-24 h-24 rounded-full ${getScoreBg(sessionData.overall_score)} flex items-center justify-center`}>
                <span className={`text-3xl font-bold ${getScoreColor(sessionData.overall_score)}`}>
                  {sessionData.overall_grade}
                </span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{sessionData.overall_score}/100</h2>
                <p className="text-gray-600">Overall Performance</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Duration</p>
              <p className="text-lg font-semibold">
                {Math.floor(sessionData.duration_seconds / 60)}:{(sessionData.duration_seconds % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-sm text-gray-600 mt-2">Messages: {sessionData.message_count}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-gray-700">{sessionData.summary}</p>
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-bold">Strengths</h3>
            </div>
            <ul className="space-y-2">
              {sessionData.strengths?.map((strength: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-orange-600" />
              <h3 className="text-xl font-bold">Areas to Improve</h3>
            </div>
            <ul className="space-y-2">
              {sessionData.improvements?.map((improvement: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-600 font-bold">→</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Category Scores */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-6">Category Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(sessionData.category_scores || {}).map(([key, data]: [string, any]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className={`font-bold ${getScoreColor(data.score)}`}>{data.score}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      data.score >= 90 ? 'bg-green-500' :
                      data.score >= 80 ? 'bg-blue-500' :
                      data.score >= 70 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${data.score}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">{data.feedback}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handlePracticeAgain}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg transition-all flex items-center gap-2"
          >
            <Award className="w-6 h-6" />
            Practice Again
          </button>
          <button
            onClick={() => router.push('/training/history')}
            className="bg-white hover:bg-gray-50 text-gray-800 px-8 py-4 rounded-xl font-semibold shadow-lg transition-all border-2 border-gray-200"
          >
            View History
          </button>
        </div>
      </main>
    </div>
  );
}