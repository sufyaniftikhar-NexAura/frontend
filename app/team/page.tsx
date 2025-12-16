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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
              <button
                onClick={() => router.push('/')}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                ← Back to Dashboard
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-indigo-600" />
              <div>
                <p className="text-sm text-gray-600">Total Agents</p>
                <p className="text-3xl font-bold text-gray-900">{agents.length}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <UserPlus className="w-5 h-5" />
              <span>Add Agent</span>
            </button>
          </div>
        </div>

        {/* Agents List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Agents</h2>
          </div>
          <div className="divide-y">
            {agents.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No agents yet. Add your first agent to get started!</p>
              </div>
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{agent.name}</p>
                      <p className="text-sm text-gray-600 flex items-center space-x-1">
                        <Mail className="w-4 h-4" />
                        <span>{agent.email}</span>
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add New Agent</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {tempPassword && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-2">Agent created successfully!</p>
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-green-700" />
                    <p className="text-sm text-green-700">
                      Temporary Password: <span className="font-mono font-bold">{tempPassword}</span>
                    </p>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    Please save this passwor