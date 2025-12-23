'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Plus, Edit2, Trash2, Check, X, ArrowLeft } from 'lucide-react';

interface QACategory {
  name: string;
  weight: number;
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
  created_at: string;
}

export default function QAConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<QAConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<QAConfig | null>(null);
  const [user, setUser] = useState<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    // ✅ Cookie-based auth
    checkAuthAndFetch();
  }, [router]);

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
      
      // Only managers can access QA configs
      if (authData.user.role !== 'manager') {
        alert('Only managers can view QA configurations.');
        router.push('/');
        return;
      }

      // Fetch configs
      fetchConfigs();
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchConfigs = async () => {
    try {
      const response = await fetch(`${API_URL}/qa-configs/list`, {
        credentials: 'include'  // ✅ Use cookies
      });

      if (response.ok) {
        const data = await response.json();
        setConfigs(data.configs || []);
      } else if (response.status === 401) {
        router.push('/login');
      } else if (response.status === 403) {
        alert('Only managers can view QA configurations.');
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
      const url = isEdit 
        ? `${API_URL}/qa-configs/${configId}`
        : `${API_URL}/qa-configs/create`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',  // ✅ Use cookies
        headers: {
          'Content-Type': 'application/json'
        },
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
      const response = await fetch(`${API_URL}/qa-configs/${configId}`, {
        method: 'DELETE',
        credentials: 'include'  // ✅ Use cookies
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
          <p className="text-gray-700 font-medium text-lg">Loading QA configurations...</p>
        </div>
      </div>
    );
  }

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
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                    QA Configurations
                  </h1>
                  <p className="text-gray-600 text-sm">Manage evaluation rubrics</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-4 h-4" />
                New Config
              </button>
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
        {configs.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-12 text-center border border-gray-100">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No QA Configurations</h3>
            <p className="text-gray-600 mb-6">Create your first QA configuration to start evaluating calls.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Configuration
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configs.map((config) => (
              <div
                key={config.id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{config.name}</h3>
                      {config.is_default && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{config.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingConfig(config)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categories</p>
                  {config.criteria?.categories?.map((cat, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{cat.name}</span>
                      <span className="text-gray-500 font-medium">{cat.weight}%</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Created {new Date(config.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingConfig) && (
        <ConfigModal
          config={editingConfig}
          onSave={(config) => handleCreateOrUpdate(config, !!editingConfig, editingConfig?.id)}
          onClose={() => {
            setShowCreateModal(false);
            setEditingConfig(null);
          }}
        />
      )}
    </div>
  );
}

// Config Modal Component
function ConfigModal({
  config,
  onSave,
  onClose
}: {
  config: QAConfig | null;
  onSave: (config: Omit<QAConfig, 'id' | 'created_at'>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: config?.name || '',
    description: config?.description || '',
    is_default: config?.is_default || false,
    categories: config?.criteria?.categories || [
      { name: 'Communication', weight: 20, description: 'Clarity and professionalism' },
      { name: 'Product Knowledge', weight: 20, description: 'Accuracy of information' },
      { name: 'Problem Resolution', weight: 20, description: 'Issue handling effectiveness' },
      { name: 'Customer Engagement', weight: 15, description: 'Rapport building' },
      { name: 'Compliance', weight: 15, description: 'Following protocols' },
      { name: 'Efficiency', weight: 10, description: 'Time management' },
    ]
  });

  const handleCategoryChange = (index: number, field: string, value: string | number) => {
    const newCategories = [...formData.categories];
    newCategories[index] = { ...newCategories[index], [field]: value };
    setFormData({ ...formData, categories: newCategories });
  };

  const addCategory = () => {
    setFormData({
      ...formData,
      categories: [...formData.categories, { name: '', weight: 0, description: '' }]
    });
  };

  const removeCategory = (index: number) => {
    const newCategories = formData.categories.filter((_, i) => i !== index);
    setFormData({ ...formData, categories: newCategories });
  };

  const totalWeight = formData.categories.reduce((sum, cat) => sum + Number(cat.weight), 0);

  const handleSubmit = () => {
    if (totalWeight !== 100) {
      alert('Total weight must equal 100%');
      return;
    }
    onSave({
      name: formData.name,
      description: formData.description,
      is_default: formData.is_default,
      criteria: { categories: formData.categories }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {config ? 'Edit Configuration' : 'New Configuration'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Standard QA Rubric"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={2}
              placeholder="Describe this QA configuration..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_default" className="text-sm font-medium text-gray-700">
              Set as default configuration
            </label>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Categories ({totalWeight}% / 100%)
              </label>
              <button
                onClick={addCategory}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                + Add Category
              </button>
            </div>

            <div className="space-y-3">
              {formData.categories.map((cat, idx) => (
                <div key={idx} className="flex gap-3 items-start bg-gray-50 p-3 rounded-xl">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => handleCategoryChange(idx, 'name', e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Category name"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={cat.weight}
                      onChange={(e) => handleCategoryChange(idx, 'weight', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="%"
                      min="0"
                      max="100"
                    />
                  </div>
                  <button
                    onClick={() => removeCategory(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {totalWeight !== 100 && (
              <p className="mt-2 text-sm text-red-600">
                Total weight must equal 100% (currently {totalWeight}%)
              </p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={totalWeight !== 100 || !formData.name}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {config ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}