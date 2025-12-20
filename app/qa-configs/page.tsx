'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Save, X, AlertCircle } from 'lucide-react';

interface QACategory {
  name: string;
  weight: number;
  enabled: boolean;
  description: string;
}

interface QAConfig {
  id: number;
  name: string;
  description: string;
  criteria: {
    categories: QACategory[];
  };
  is_default: boolean;
  created_at?: string;
}

export default function QAConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<QAConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<QAConfig | null>(null);
  const [user, setUser] = useState<any>(null);

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
    const savedUser = localStorage.getItem('user');
    
    if (!token || !savedUser) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(savedUser);
    setUser(userData);

    // Only managers can access
    if (userData.role !== 'manager') {
      alert('Access denied. Only managers can manage QA configurations.');
      router.push('/');
      return;
    }

    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_URL}/qa-configs/list`, { headers });

      if (response.ok) {
        const data = await response.json();
        setConfigs(data.configs);
      } else if (response.status === 401) {
        router.push('/login');
      } else if (response.status === 403) {
        alert('Access denied. Only managers can view QA configurations.');
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (config: Omit<QAConfig, 'id' | 'created_at'>, isEdit: boolean, configId?: number) => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      const url = isEdit 
        ? `${API_URL}/qa-configs/${configId}`
        : `${API_URL}/qa-configs/create`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({
          name: config.name,
          description: config.description,
          categories: config.criteria.categories,
          is_default: config.is_default
        })
      });

      if (response.ok) {
        alert(isEdit ? 'QA config updated!' : 'QA config created!');
        setShowCreateModal(false);
        setEditingConfig(null);
        fetchConfigs();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to save QA config');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDelete = async (configId: number) => {
    if (!confirm('Are you sure you want to delete this QA configuration?')) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${API_URL}/qa-configs/${configId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        alert('QA config deleted!');
        fetchConfigs();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to delete QA config');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
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
          <p className="text-gray-700 font-medium text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/10">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-indigo-900 bg-clip-text text-transparent">QA Configurations</h1>
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
        {/* Header with Add Button */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">QA Rubrics</h2>
            <p className="text-sm text-gray-600 mt-1 font-medium">
              Configure quality assurance criteria for call evaluation
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span>Create Rubric</span>
          </button>
        </div>

        {/* Configs List */}
        <div className="space-y-6">
          {configs.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-16 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-6" />
              <p className="text-gray-700 text-lg font-medium">No QA configurations yet. Create your first rubric!</p>
            </div>
          ) : (
            configs.map((config) => (
              <div key={config.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl border border-gray-200 p-7 transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="text-2xl font-bold text-gray-900">{config.name}</h3>
                      {config.is_default && (
                        <span className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl shadow-md">
                          Default
                        </span>
                      )}
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-600 mt-2 font-medium">{config.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingConfig(config)}
                      className="p-3 text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-100 rounded-xl transition-all duration-200"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    {!config.is_default && (
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="p-3 text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-red-100 rounded-xl transition-all duration-200"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {config.criteria.categories.map((category, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border shadow-sm transition-all duration-200 ${
                        category.enabled
                          ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300 hover:shadow-md'
                          : 'bg-gray-50 border-gray-200 opacity-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-gray-900 capitalize">
                            {category.name}
                          </p>
                          <p className="text-xs text-gray-600 mt-1.5">
                            {category.description}
                          </p>
                        </div>
                        <span className="text-base font-bold bg-white px-2.5 py-1 rounded-lg shadow-sm text-gray-900">
                          {category.weight}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingConfig) && (
        <ConfigModal
          config={editingConfig}
          onSave={handleCreateOrUpdate}
          onClose={() => {
            setShowCreateModal(false);
            setEditingConfig(null);
          }}
        />
      )}
    </div>
  );
}

// Modal Component
function ConfigModal({
  config,
  onSave,
  onClose
}: {
  config: QAConfig | null;
  onSave: (config: Omit<QAConfig, 'id' | 'created_at'>, isEdit: boolean, configId?: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(config?.name || '');
  const [description, setDescription] = useState(config?.description || '');
  const [categories, setCategories] = useState<QACategory[]>(
    config?.criteria.categories || [
      { name: 'greeting', weight: 15, enabled: true, description: 'Proper greeting and introduction' },
      { name: 'tone', weight: 20, enabled: true, description: 'Professional and empathetic tone' },
      { name: 'understanding', weight: 20, enabled: true, description: 'Understanding customer needs' },
      { name: 'solution', weight: 25, enabled: true, description: 'Providing accurate solutions' },
      { name: 'clarity', weight: 10, enabled: true, description: 'Clear communication' },
      { name: 'closing', weight: 10, enabled: true, description: 'Proper call closing' }
    ]
  );
  const [isDefault, setIsDefault] = useState(config?.is_default || false);

  const totalWeight = categories.reduce((sum, cat) => cat.enabled ? sum + cat.weight : sum, 0);
  const isValid = totalWeight === 100 && name.trim() !== '';

  const handleCategoryChange = (index: number, field: keyof QACategory, value: any) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);
  };

  const handleSave = () => {
    if (!isValid) {
      alert('Please ensure enabled weights sum to 100% and name is provided');
      return;
    }

    onSave(
      {
        name,
        description,
        criteria: { categories },
        is_default: isDefault
      },
      !!config,
      config?.id
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-8 border border-gray-200 transform transition-all duration-300">
        <div className="flex justify-between items-center px-8 py-6 border-b bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-indigo-900 bg-clip-text text-transparent">
            {config ? 'Edit QA Rubric' : 'Create QA Rubric'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:rotate-90 transform">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-7 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Rubric Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                placeholder="e.g., Sales Campaign QA"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                rows={2}
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center space-x-3 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <input
                type="checkbox"
                id="is_default"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5"
              />
              <label htmlFor="is_default" className="text-sm font-semibold text-gray-800">
                Set as default rubric
              </label>
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="flex justify-between items-center mb-5 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
              <h4 className="text-base font-bold text-gray-900">QA Categories</h4>
              <div className={`text-sm font-bold px-4 py-2 rounded-lg ${totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                Total Weight: {totalWeight}% {totalWeight === 100 ? '✓' : '(must be 100%)'}
              </div>
            </div>

            <div className="space-y-5">
              {categories.map((category, index) => (
                <div key={index} className="border-2 border-gray-200 rounded-2xl p-5 hover:border-indigo-300 transition-all duration-200 bg-white shadow-sm">
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={category.enabled}
                      onChange={(e) => handleCategoryChange(index, 'enabled', e.target.checked)}
                      className="mt-1.5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                    />

                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                            Category Name
                          </label>
                          <input
                            type="text"
                            value={category.name}
                            onChange={(e) => handleCategoryChange(index, 'name', e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            disabled={!category.enabled}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                            Weight (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={category.weight}
                            onChange={(e) => handleCategoryChange(index, 'weight', parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            disabled={!category.enabled}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                          Description
                        </label>
                        <textarea
                          value={category.description}
                          onChange={(e) => handleCategoryChange(index, 'description', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          rows={2}
                          disabled={!category.enabled}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 px-8 py-6 border-t bg-gradient-to-r from-gray-50 to-white">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
          >
            <Save className="w-5 h-5" />
            <span>{config ? 'Update' : 'Create'} Rubric</span>
          </button>
        </div>
      </div>
    </div>
  );
}