'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Users, Mail, User, Key, X } from 'lucide-react';

interface Agent {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function TeamManagement() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', email: '' });
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return null;
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_URL}/auth/agents/list`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTempPassword('');

    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      const response = await fetch(
        `${API_URL}/auth/agents/create?name=${encodeURIComponent(newAgent.name)}&email=${encodeURIComponent(newAgent.email)}`,
        {
          method: 'POST',
          headers,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTempPassword(data.temporary_password);
        setAgents([...agents, data.agent]);
        setNewAgent({ name: '', email: '' });
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to create agent');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const closeModal = () => {
    setShowAddModal(false);
    setNewAgent({ name: '', email: '' });
    setTempPassword('');
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-indigo-400 opacity-20"></div>
          </div>
          <p className="text-gray-700 font-medium text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-indigo-900 bg-clip-text text-transparent">Team Management</h1>
              <button
                onClick={() => router.push('/')}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors duration-200 hover:underline underline-offset-4"
              >
                ← Back to Dashboard
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Stats */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-8 mb-8 transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-5">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <Users className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Agents</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{agents.length}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 font-semibold"
            >
              <UserPlus className="w-5 h-5" />
              <span>Add Agent</span>
            </button>
          </div>
        </div>

        {/* Agents List */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-2xl font-bold text-gray-900">Agents</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {agents.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                <p className="text-gray-700 text-lg font-medium">No agents yet. Add your first agent to get started!</p>
              </div>
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="px-8 py-6 hover:bg-indigo-50/50 flex items-center justify-between transition-all duration-200">
                  <div className="flex items-center space-x-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center shadow-md">
                      <User className="w-7 h-7 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{agent.name}</p>
                      <p className="text-sm text-gray-600 flex items-center space-x-2 mt-1">
                        <Mail className="w-4 h-4" />
                        <span>{agent.email}</span>
                      </p>
                    </div>
                  </div>
                  <span className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl shadow-sm">
                    Agent
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-200 transform transition-all duration-300">
            <div className="flex justify-between items-center px-8 py-6 border-b bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-indigo-900 bg-clip-text text-transparent">Add New Agent</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:rotate-90 transform">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="p-8 space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-semibold text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {tempPassword && (
                <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-xl shadow-md">
                  <p className="text-sm font-bold text-green-900 mb-3">Agent created successfully!</p>
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                    <Key className="w-5 h-5 text-green-700" />
                    <div>
                      <p className="text-xs text-green-700 font-medium mb-1">Temporary Password:</p>
                      <p className="text-sm font-mono font-bold text-green-900">{tempPassword}</p>
                    </div>
                  </div>
                  <p className="text-xs text-green-700 mt-3 font-medium">
                    Please save this password. The agent should change it after first login.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  required
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newAgent.email}
                  onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                  placeholder="john@example.com"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Create Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}