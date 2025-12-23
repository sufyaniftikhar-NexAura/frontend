'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Users, Mail, User, Key, X, ArrowLeft, Copy, CheckCircle } from 'lucide-react';

interface Agent {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

export default function TeamManagement() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', email: '', password: '' });
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [copied, setCopied] = useState(false);

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
      setCurrentUser(authData.user);
      
      // Only managers can access team management
      if (authData.user.role !== 'manager') {
        alert('Only managers can access team management.');
        router.push('/');
        return;
      }

      // Fetch agents
      fetchAgents();
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/agents`, {
        credentials: 'include'  // ✅ Use cookies
      });

      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
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

    if (!newAgent.name || !newAgent.email || !newAgent.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/agents`, {
        method: 'POST',
        credentials: 'include',  // ✅ Use cookies
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newAgent.name,
          email: newAgent.email,
          password: newAgent.password
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTempPassword(newAgent.password);
        fetchAgents(); // Refresh list
        setNewAgent({ name: '', email: '', password: '' });
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to create agent');
      }
    } catch (error) {
      setError('Network error. Please try again.');
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

  const closeModal = () => {
    setShowAddModal(false);
    setNewAgent({ name: '', email: '', password: '' });
    setTempPassword('');
    setError('');
    setCopied(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAgent({ ...newAgent, password });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-indigo-400 opacity-20"></div>
          </div>
          <p className="text-gray-700 font-medium text-lg">Loading team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10">
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
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                    Team Management
                  </h1>
                  <p className="text-gray-600 text-sm">Manage your agents</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <UserPlus className="w-4 h-4" />
                Add Agent
              </button>
              {currentUser && (
                <div className="text-right px-3">
                  <p className="text-sm font-semibold text-gray-900">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 capitalize font-medium">{currentUser.role}</p>
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

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Agents</p>
              <p className="text-3xl font-bold text-gray-900">{agents.length}</p>
            </div>
          </div>
        </div>

        {/* Agents List */}
        {agents.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-12 text-center border border-gray-100">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Agents Yet</h3>
            <p className="text-gray-600 mb-6">Add your first agent to start building your team.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium"
            >
              <UserPlus className="w-5 h-5" />
              Add Your First Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                    <User className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{agent.name}</h3>
                    <div className="flex items-center gap-2 text-gray-600 text-sm mt-1">
                      <Mail className="w-4 h-4" />
                      {agent.email}
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
                      {agent.role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Add New Agent</h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {tempPassword ? (
              // Success view
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Agent Created!</h3>
                  <p className="text-gray-600">Share these credentials with the new agent.</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Password</span>
                    <button
                      onClick={() => copyToClipboard(tempPassword)}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <code className="text-lg font-mono text-gray-900">{tempPassword}</code>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  ⚠️ This password won't be shown again. Make sure to save it.
                </p>

                <button
                  onClick={closeModal}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              // Form view
              <form onSubmit={handleCreateAgent} className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={newAgent.name}
                        onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={newAgent.email}
                        onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="john@company.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={newAgent.password}
                        onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                        className="w-full pl-10 pr-24 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Secure password"
                        required
                      />
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all"
                  >
                    Create Agent
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}