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
              <h1 className="text-2xl font-bold text-gray-900">QA Configurations</h1>
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
        {/* Header with Add Button */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">QA Rubrics</h2>
            <p className="text-sm text-gray-600">
              Configure quality assurance criteria for call evaluation
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5" />
            <span>Create Rubric</span>
          </button>
        </div>

        {/* Configs List */}
        <div className="space-y-4">
          {configs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No QA configurations yet. Create your first rubric!</p>
            </div>
          ) : (
            configs.map((config) => (
              <div key={config.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
                      {config.is_default && (
                        <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingConfig(config)}
                      className="p-2 text-gray-600 hover:text-indigo-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!config.is_default && (
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="p-2 text-gray-600 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {config.criteria.categories.map((category, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        category.enabled
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200 opacity-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {category.name}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {category.description}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {config ? 'Edit QA Rubric' : 'Create QA Rubric'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rubric Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Sales Campaign QA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows={2}
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_default"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="is_default" className="text-sm text-gray-700">
                Set as default rubric
              </label>
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-medium text-gray-900">QA Categories</h4>
              <div className={`text-sm font-medium ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
                Total Weight: {totalWeight}% {totalWeight === 100 ? '✓' : '(must be 100%)'}
              </div>
            </div>

            <div className="space-y-4">
              {categories.map((category, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={category.enabled}
                      onChange={(e) => handleCategoryChange(index, 'enabled', e.target.checked)}
                      className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Category Name
                          </label>
                          <input
                            type="text"
                            value={category.name}
                            onChange={(e) => handleCategoryChange(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            disabled={!category.enabled}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Weight (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={category.weight}
                            onChange={(e) => handleCategoryChange(index, 'weight', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            disabled={!category.enabled}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={category.description}
                          onChange={(e) => handleCategoryChange(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
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

        <div className="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
          >
            <Save className="w-4 h-4" />
            <span>{config ? 'Update' : 'Create'} Rubric</span>
          </button>
        </div>
      </div>
    </div>
  );
}