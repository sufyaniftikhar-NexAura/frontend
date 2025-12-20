'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Call {
  call_id: number;
  agent_name: string;
  campaign: string;
  call_date: string;
  qa_score: number | null;
  qa_grade: string | null;
}

interface DashboardData {
  total_calls: number;
  calls_evaluated: number;
  average_score: number;
  calls: Call[];
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<number | null>(null);
  const [callDetails, setCallDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDashboard();
  }, [router]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchDashboard = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/calls/dashboard/summary`, {
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
      // Token expired
      localStorage.clear();
      router.push('/login');
      return;
      }
      
      const result = await response.json();
      setData(result);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setLoading(false);
    }
  };

  const fetchCallDetails = async (callId: number) => {
    setLoadingDetails(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/calls/${callId}/qa`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      setCallDetails(result);
      setLoadingDetails(false);
    } catch (error) {
      console.error('Error fetching call details:', error);
      setLoadingDetails(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getUserInfo = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return { name: 'User', role: '' };
      }
    }
    return { name: 'User', role: '' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-indigo-400 opacity-20 mx-auto"></div>
          </div>
          <p className="text-gray-700 font-medium text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl">Failed to load dashboard</p>
          <button 
            onClick={fetchDashboard}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const user = getUserInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">QA Dashboard</h1>
              <p className="text-gray-600 mt-1 font-medium">Call Center Quality Assurance</p>
            </div>
            <div className="flex items-center gap-3">
              {user && user.role === 'manager' && (
                <>
                <button
                  onClick={() => router.push('/team')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Manage Team
                </button>

                <button
                  onClick={() => router.push('/qa-configs')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  QA Configs
                </button>
              </>
            )}
            
              {user && user.role === 'manager' && (
                <button
                  onClick={() => router.push('/analytics')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analytics
                </button>
              )}
              
              <button
                onClick={() => router.push('/upload')}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Upload Calls
              </button>
              <div className="text-right px-3">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize font-medium">{user.role}</p>
              </div>
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-7 transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Calls</div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-900">{data.total_calls}</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-7 transition-all duration-300 transform hover:-translate-y-1 border border-indigo-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Calls Evaluated</div>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{data.calls_evaluated}</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl p-7 transition-all duration-300 transform hover:-translate-y-1 border border-green-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Average Score</div>
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold text-green-600">
              {data.average_score.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Calls Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-2xl font-bold text-gray-900">Recent Calls</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Call ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    QA Score
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200">
                {data.calls.map((call) => (
                  <tr key={call.call_id} className="hover:bg-indigo-50/50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      #{call.call_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {call.agent_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {call.campaign}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(call.call_date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {call.qa_score !== null ? (
                        <span className={`font-bold px-3 py-1 rounded-lg ${
                          call.qa_score >= 80 ? 'bg-green-100 text-green-700' :
                          call.qa_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {call.qa_score}%
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Not evaluated</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {call.qa_grade ? (
                        <span className={`px-3 py-1.5 text-xs font-bold rounded-xl shadow-sm ${
                          call.qa_grade === 'A' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                          call.qa_grade === 'B' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                          call.qa_grade === 'C' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                          call.qa_grade === 'D' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' :
                          'bg-gradient-to-r from-red-500 to-red-600 text-white'
                        }`}>
                          {call.qa_grade}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {call.qa_score !== null ? (
                        <button
                          onClick={() => {
                            setSelectedCall(call.call_id);
                            fetchCallDetails(call.call_id);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 font-semibold hover:underline underline-offset-2 transition-all duration-200"
                        >
                          View Details →
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal for call details */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100 border border-gray-200">
            {loadingDetails ? (
              <div className="text-center py-12">
                <div className="relative inline-block">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-indigo-400 opacity-20"></div>
                </div>
                <p className="text-gray-700 font-medium text-lg">Loading call details...</p>
              </div>
            ) : callDetails ? (
              <>
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Call #{callDetails.call_id}</h3>
                    <p className="text-gray-600 mt-2 font-medium">
                      {callDetails.agent_name} • {callDetails.campaign} • {new Date(callDetails.call_date).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCall(null);
                      setCallDetails(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-3xl transition-colors duration-200 hover:rotate-90 transform"
                  >
                    ×
                  </button>
                </div>

                {callDetails.qa_evaluation ? (
                  <>
                    {/* Overall Score */}
                    <div className="bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 rounded-2xl p-8 mb-8 shadow-lg border border-indigo-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Overall Score</div>
                          <div className="text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            {callDetails.qa_evaluation.overall_score}%
                          </div>
                        </div>
                        <div className={`text-7xl font-bold px-8 py-4 rounded-2xl shadow-xl transform transition-transform hover:scale-110 ${
                          callDetails.qa_evaluation.overall_grade === 'A' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' :
                          callDetails.qa_evaluation.overall_grade === 'B' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' :
                          callDetails.qa_evaluation.overall_grade === 'C' ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' :
                          callDetails.qa_evaluation.overall_grade === 'D' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' :
                          'bg-gradient-to-br from-red-500 to-red-600 text-white'
                        }`}>
                          {callDetails.qa_evaluation.overall_grade}
                        </div>
                      </div>
                    </div>

                    {/* Category Scores */}
                    <div className="mb-8">
                      <h4 className="text-xl font-bold text-gray-900 mb-5">Category Scores</h4>
                      <div className="grid grid-cols-2 gap-5">
                        {Object.entries(callDetails.qa_evaluation.categories).map(([category, score]: [string, any]) => (
                          <div key={category} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-bold text-gray-700 capitalize">
                                {category.replace('_', ' ')}
                              </span>
                              <span className={`text-xl font-bold px-3 py-1 rounded-lg ${
                                score >= 80 ? 'bg-green-100 text-green-700' :
                                score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {score}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${
                                  score >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                                  score >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                                  'bg-gradient-to-r from-red-400 to-red-600'
                                }`}
                                style={{ width: `${score}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strengths */}
                    <div className="mb-8">
                      <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-2xl">✅</span> Strengths
                      </h4>
                      <ul className="space-y-3">
                        {callDetails.qa_evaluation.strengths.map((strength: string, idx: number) => (
                          <li key={idx} className="flex items-start bg-green-50 p-4 rounded-xl border border-green-200">
                            <span className="text-green-600 mr-3 text-xl">•</span>
                            <span className="text-gray-800 font-medium">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="mb-8">
                      <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-2xl">📈</span> Areas for Improvement
                      </h4>
                      <ul className="space-y-3">
                        {callDetails.qa_evaluation.improvements.map((improvement: string, idx: number) => (
                          <li key={idx} className="flex items-start bg-orange-50 p-4 rounded-xl border border-orange-200">
                            <span className="text-orange-600 mr-3 text-xl">•</span>
                            <span className="text-gray-800 font-medium">{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Transcript */}
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-2xl">📝</span> Transcript
                      </h4>
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-sm text-gray-800 font-mono whitespace-pre-wrap shadow-inner border border-gray-200" dir="rtl">
                        {callDetails.transcript}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-600">No QA evaluation available for this call.</p>
                )}

                {/* Close Button */}
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedCall(null);
                      setCallDetails(null);
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <p className="text-red-600">Failed to load call details</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}