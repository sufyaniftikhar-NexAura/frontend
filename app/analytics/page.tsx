'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Target, Award } from 'lucide-react';

interface GradeData {
  grade: string;
  count: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(user);
    if (userData.role !== 'manager') {
      alert('Only managers can access analytics');
      router.push('/');
      return;
    }

    fetchAnalytics();
  }, [period, router]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/analytics/dashboard?days=${period}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-indigo-400 opacity-20"></div>
          </div>
          <p className="text-gray-700 font-medium text-lg">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Failed to load analytics</p>
      </div>
    );
  }

  const COLORS: Record<string, string> = {
    A: '#10b981',
    B: '#3b82f6',
    C: '#f59e0b',
    D: '#f97316',
    F: '#ef4444'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1 font-medium">Performance insights and trends</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Calls</div>
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{data.summary.total_calls}</div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-indigo-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Avg Score</div>
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {data.summary.average_score}%
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-green-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Best Score</div>
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">{data.summary.best_score}%</div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Agents</div>
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-orange-600">{data.agents.length}</div>
          </div>
        </div>

        {/* Charts Row 1: Trend + Grades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* QA Score Trend */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">QA Score Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} name="Avg Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Grade Distribution */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Grade Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.grades}
                  dataKey="count"
                  nameKey="grade"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: GradeData) => `${entry.grade}: ${entry.count}`}
                >
                  {data.grades.map((entry: GradeData, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.grade] || '#999999'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2: Agents + Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Agent Performance */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Agent Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.agents}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="agent" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#6366f1" name="Avg Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Category Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.categories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="category" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#f59e0b" name="Avg Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Comparison Table */}
        {data.campaigns.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-2xl font-bold text-gray-900">Campaign Performance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Calls</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Avg Score</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200">
                  {data.campaigns.map((campaign: any, idx: number) => (
                    <tr key={idx} className="hover:bg-indigo-50/50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{campaign.campaign}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{campaign.calls}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
                          campaign.score >= 80 ? 'bg-green-100 text-green-700' :
                          campaign.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {campaign.score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{campaign.success_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}