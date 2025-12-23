'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Trophy, TrendingUp, Target, Sparkles, Lock, Loader2, ArrowLeft } from 'lucide-react';

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
  const [user, setUser] = useState<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    // ✅ Cookie-based auth
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      // Check auth status
      const authResponse = await fetch(`${API_URL}/auth/check`, {
        credentials: 'include'  // ✅ Use cookies
      });
      
      if (!authResponse.ok) {
        router.push('/login');
        return;
      }
      
      const authData = await authResponse.json();
      setUser(authData.user);
      
      // Fetch training data
      fetchData();
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchData = async () => {
    try {
      // Fetch scenarios
      const scenariosRes = await fetch(`${API_URL}/training/scenarios`, {
        credentials: 'include'  // ✅ Use cookies
      });

      if (scenariosRes.ok) {
        const data = await scenariosRes.json();
        setDefaultScenarios(data.default || []);
        setPersonalizedScenarios(data.personalized || []);
      }

      // Fetch training progress
      const statsRes = await fetch(`${API_URL}/training/analytics/progress`, {
        credentials: 'include'  // ✅ Use cookies
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
        credentials: 'include'  // ✅ Use cookies
      });

      const data = await response.json();

      if (data.scenario_created) {
        alert(`✅ ${data.message}`);
        fetchData(); // Refresh scenarios
      } else {
        alert(`ℹ️ ${data.message}`);
      }
    } catch (error) {
      console.error('Error generating scenario:', error);
      alert('Failed to generate personalized scenario');
    } finally {
      setGenerating(false);
    }
  };

  // ✅ FIXED: Don't call API here. Just save ID and redirect.
  const startTrainingSession = (scenarioId: string) => {
    // Store in sessionStorage so the session page can read it
    sessionStorage.setItem('selected_training_scenario', scenarioId);
    
    // Navigate to session page (which will handle the API call)
    router.push(`/training/session?scenarioId=${scenarioId}`);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'  // ✅ Use cookies
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-indigo-400 opacity-20"></div>
          </div>
          <p className="text-gray-700 font-medium text-lg">Loading training portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50/50 to-pink-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 to-pink-900 bg-clip-text text-transparent">
                    Training Portal
                  </h1>
                  <p className="text-gray-600 text-sm">Practice with AI customers</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <div className="text-right px-3">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize font-medium">{user.role}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Section */}
        {trainingStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Sessions Completed</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{trainingStats.sessions_completed || 0}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Average Score</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{(trainingStats.average_score || 0).toFixed(0)}%</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Trophy className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Best Score</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{trainingStats.best_score || 0}%</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Practice Time</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{trainingStats.total_practice_minutes || 0} min</p>
            </div>
          </div>
        )}

        {/* Default Scenarios */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Standard Scenarios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {defaultScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{scenario.name}</h3>
                    <p className="text-sm text-gray-500">{scenario.name_urdu}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(scenario.difficulty)}`}>
                    {scenario.difficulty}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4">{scenario.description}</p>
                <button
                  onClick={() => startTrainingSession(scenario.scenario_id)}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium transition-all duration-200"
                >
                  Start Practice
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Personalized Scenarios */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Personalized Scenarios</h2>
            <button
              onClick={handleGeneratePersonalized}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate New
                </>
              )}
            </button>
          </div>
          
          {personalizedScenarios.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {personalizedScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-indigo-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-medium text-indigo-600">Personalized</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{scenario.name}</h3>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(scenario.difficulty)}`}>
                      {scenario.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{scenario.description}</p>
                  {scenario.based_on_calls && (
                    <p className="text-xs text-indigo-600 mb-4">Based on {scenario.based_on_calls} of your calls</p>
                  )}
                  <button
                    onClick={() => startTrainingSession(scenario.scenario_id)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200"
                  >
                    Start Practice
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-gray-100">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Personalized Scenarios Yet</h3>
              <p className="text-gray-600 mb-4">
                Complete more QA evaluations to unlock AI-generated scenarios based on your specific improvement areas.
              </p>
              <button
                onClick={handleGeneratePersonalized}
                disabled={generating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium"
              >
                <Sparkles className="w-4 h-4" />
                Generate Scenario
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}