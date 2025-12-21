'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Trophy, TrendingUp, Target, Sparkles, Lock, Loader2 } from 'lucide-react';

interface Scenario {
  id: number;
  scenario_id: string;
  name: string;
  name_urdu: string;
  description: string;
  description_urdu: string;
  difficulty: 'easy' | 'medium' | 'hard';
  is_default: boolean;
  based_on_calls?: number;
}

export default function TrainingPortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [defaultScenarios, setDefaultScenarios] = useState<Scenario[]>([]);
  const [personalizedScenarios, setPersonalizedScenarios] = useState<Scenario[]>([]);
  const [trainingStats, setTrainingStats] = useState<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchData = async () => {
    try {
      // Fetch scenarios
      const scenariosRes = await fetch(`${API_URL}/training/scenarios`, {
        headers: getAuthHeaders()
      });

      if (scenariosRes.ok) {
        const data = await scenariosRes.json();
        setDefaultScenarios(data.default || []);
        setPersonalizedScenarios(data.personalized || []);
      }

      // Fetch training progress
      const statsRes = await fetch(`${API_URL}/training/analytics/progress`, {
        headers: getAuthHeaders()
      });

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setTrainingStats(stats);
      }

    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePersonalized = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`${API_URL}/training/scenarios/generate`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (data.scenario_created) {
        alert(`✅ ${data.message}\n\nNew scenario: ${data.scenario.name}`);
        fetchData(); // Refresh scenarios
      } else {
        alert(`ℹ️ ${data.message}`);
      }

    } catch (error) {
      console.error('Error generating scenario:', error);
      alert('❌ Failed to generate personalized scenario');
    } finally {
      setGenerating(false);
    }
  };

  const handleStartTraining = (scenarioId: string) => {
    // Save selected scenario and navigate to LiveKit training page
    sessionStorage.setItem('selected_training_scenario', scenarioId);
    router.push('/training/session');
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-700 font-medium text-lg">Loading training portal...</p>
        </div>
      </div>
    );
  }

  const getDifficultyBadge = (difficulty: string) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    };
    return colors[difficulty as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Training Portal
                </h1>
                <p className="text-gray-600 mt-1 font-medium">Practice & Improve Your Skills</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="px-5 py-2.5 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                ← Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        {trainingStats && trainingStats.total_sessions > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-indigo-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-600 uppercase">Total Sessions</div>
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-3xl font-bold text-indigo-600">{trainingStats.total_sessions}</div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-600 uppercase">Avg Score</div>
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-600">{trainingStats.average_score}%</div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-pink-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-600 uppercase">Latest Score</div>
                <TrendingUp className="w-6 h-6 text-pink-600" />
              </div>
              <div className="text-3xl font-bold text-pink-600">{trainingStats.latest_score}%</div>
            </div>
          </div>
        )}

        {/* Personalized Scenarios Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-7 h-7 text-purple-600" />
                Personalized Training
              </h2>
              <p className="text-gray-600 mt-1">Custom scenarios based on your QA performance</p>
            </div>
            <button
              onClick={handleGeneratePersonalized}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate New Scenario
                </>
              )}
            </button>
          </div>

          {personalizedScenarios.length === 0 ? (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-12 text-center border-2 border-dashed border-purple-300">
              <Lock className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Personalized Scenarios Yet</h3>
              <p className="text-gray-600 mb-4">
                Complete some QA calls first, then click "Generate New Scenario" to create custom training based on your performance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {personalizedScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="bg-gradient-to-br from-white to-purple-50/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border border-purple-200"
                >
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getDifficultyBadge(scenario.difficulty)}`}>
                        {scenario.difficulty}
                      </span>
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{scenario.name}</h3>
                    <p className="text-purple-100 text-sm" dir="rtl">{scenario.name_urdu}</p>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-700 text-sm mb-4">{scenario.description}</p>
                    {scenario.based_on_calls && scenario.based_on_calls > 0 && (
                      <p className="text-xs text-purple-600 mb-4 flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        Based on {scenario.based_on_calls} QA call{scenario.based_on_calls > 1 ? 's' : ''}
                      </p>
                    )}
                    <button
                      onClick={() => handleStartTraining(scenario.scenario_id)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      Start Training
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Default Scenarios Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-indigo-600" />
            Standard Training Scenarios
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {defaultScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-200"
              >
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getDifficultyBadge(scenario.difficulty)}`}>
                      {scenario.difficulty}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{scenario.name}</h3>
                  <p className="text-blue-100 text-sm" dir="rtl">{scenario.name_urdu}</p>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 text-sm mb-4">{scenario.description}</p>
                  <button
                    onClick={() => handleStartTraining(scenario.scenario_id)}
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Start Training
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View History Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/training/history')}
            className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-gray-200"
          >
            View Training History →
          </button>
        </div>
      </main>
    </div>
  );
}