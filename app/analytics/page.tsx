'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Target, Award, ArrowLeft } from 'lucide-react';

interface GradeData {
  grade: string;
  count: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [user, setUser] = useState<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    // ✅ Cookie-based auth - check auth status with backend
    checkAuthAndFetch();
  }, [period, router]);

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
      
      // Only managers can access analytics
      if (authData.user.role !== 'manager') {
        alert('Only managers can access analytics');
        router.push('/');
        return;
      }

      // Fetch analytics
      fetchAnalytics();
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/analytics/dashboard?days=${period}`, {
        credentials: 'include'  // ✅ Use cookies
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

  const COLORS = ['#10B981', '#22C55E', '#84CC16', '#EAB308', '#F97316', '#EF4444'];
  const gradeColors: Record<string, string> = {
    'A+': '#059669', 'A': '#10B981', 'B+': '#22C55E', 'B': '#84CC16',
    'C+': '#EAB308', 'C': '#F97316', 'D': '#EF4444', 'F': '#991B1B'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/10">
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
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Performance metrics and insights</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="px-4 py-2 border border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
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
        {data && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Total Calls</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{data.overview?.total_calls || 0}</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Avg Score</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{(data.overview?.average_score || 0).toFixed(1)}%</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Active Agents</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{data.overview?.active_agents || 0}</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Award className="w-5 h-5 text-yellow-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Top Grade</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{data.overview?.top_grade || 'N/A'}</p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Grade Distribution */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.grade_distribution || []}
                      dataKey="count"
                      nameKey="grade"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ grade, percent }) => `${grade}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {(data.grade_distribution || []).map((entry: GradeData, index: number) => (
                        <Cell key={`cell-${index}`} fill={gradeColors[entry.grade] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Trend */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Call Volume</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.daily_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="calls" 
                      stroke="#6366F1" 
                      strokeWidth={3}
                      dot={{ fill: '#6366F1', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#4F46E5' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Agent Performance */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.agent_performance || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" domain={[0, 100]} stroke="#6B7280" fontSize={12} />
                    <YAxis dataKey="agent_name" type="category" width={120} stroke="#6B7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="avg_score" 
                      fill="#6366F1" 
                      radius={[0, 8, 8, 0]}
                      name="Avg Score"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}