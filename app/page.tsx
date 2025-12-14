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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">QA Dashboard</h1>
              <p className="text-gray-600">Call Center Quality Assurance</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/upload')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
              >
                Upload Calls
              </button>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Calls</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{data.total_calls}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Calls Evaluated</div>
            <div className="text-3xl font-bold text-indigo-600 mt-2">{data.calls_evaluated}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Average Score</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {data.average_score.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Calls Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Calls</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QA Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.calls.map((call) => (
                  <tr key={call.call_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{call.call_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {call.agent_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.campaign}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(call.call_date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {call.qa_score !== null ? (
                        <span className={`font-semibold ${
                          call.qa_score >= 80 ? 'text-green-600' :
                          call.qa_score >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {call.qa_score}%
                        </span>
                      ) : (
                        <span className="text-gray-400">Not evaluated</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {call.qa_grade ? (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          call.qa_grade === 'A' ? 'bg-green-100 text-green-800' :
                          call.qa_grade === 'B' ? 'bg-blue-100 text-blue-800' :
                          call.qa_grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                          call.qa_grade === 'D' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
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
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {loadingDetails ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading call details...</p>
              </div>
            ) : callDetails ? (
              <>
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Call #{callDetails.call_id}</h3>
                    <p className="text-gray-600 mt-1">
                      {callDetails.agent_name} • {callDetails.campaign} • {new Date(callDetails.call_date).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCall(null);
                      setCallDetails(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {callDetails.qa_evaluation ? (
                  <>
                    {/* Overall Score */}
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-600">Overall Score</div>
                          <div className="text-5xl font-bold text-indigo-600 mt-2">
                            {callDetails.qa_evaluation.overall_score}%
                          </div>
                        </div>
                        <div className={`text-6xl font-bold px-6 py-3 rounded-lg ${
                          callDetails.qa_evaluation.overall_grade === 'A' ? 'bg-green-100 text-green-600' :
                          callDetails.qa_evaluation.overall_grade === 'B' ? 'bg-blue-100 text-blue-600' :
                          callDetails.qa_evaluation.overall_grade === 'C' ? 'bg-yellow-100 text-yellow-600' :
                          callDetails.qa_evaluation.overall_grade === 'D' ? 'bg-orange-100 text-orange-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {callDetails.qa_evaluation.overall_grade}
                        </div>
                      </div>
                    </div>

                    {/* Category Scores */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Category Scores</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(callDetails.qa_evaluation.categories).map(([category, score]: [string, any]) => (
                          <div key={category} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700 capitalize">
                                {category.replace('_', ' ')}
                              </span>
                              <span className={`text-lg font-bold ${
                                score >= 80 ? 'text-green-600' :
                                score >= 60 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {score}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  score >= 80 ? 'bg-green-500' :
                                  score >= 60 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${score}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strengths */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">✅ Strengths</h4>
                      <ul className="space-y-2">
                        {callDetails.qa_evaluation.strengths.map((strength: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            <span className="text-gray-700">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">📈 Areas for Improvement</h4>
                      <ul className="space-y-2">
                        {callDetails.qa_evaluation.improvements.map((improvement: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-orange-500 mr-2">•</span>
                            <span className="text-gray-700">{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Transcript */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">📝 Transcript</h4>
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 font-mono whitespace-pre-wrap" dir="rtl">
                        {callDetails.transcript}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-600">No QA evaluation available for this call.</p>
                )}

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedCall(null);
                      setCallDetails(null);
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
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