'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle, XCircle, Loader2, ArrowLeft, FileAudio, Archive, FileSpreadsheet } from 'lucide-react';

interface UploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  message?: string;
  taskId?: string;
  callId?: number;
}

interface Agent {
  id: number;
  name: string;
  email: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadStatus[]>([]);
  const [campaign, setCampaign] = useState('');
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [bulkZipFile, setBulkZipFile] = useState<File | null>(null);
  const [bulkCsvFile, setBulkCsvFile] = useState<File | null>(null);
  const [bulkAgentId, setBulkAgentId] = useState<number | null>(null);
  const [bulkCampaign, setBulkCampaign] = useState('Bulk Upload');
  const [bulkTaskId, setBulkTaskId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<any>(null);
  const [qaConfigs, setQaConfigs] = useState<Array<{id: number, name: string}>>([]);
  const [selectedQaConfigId, setSelectedQaConfigId] = useState<number | null>(null);
  const [bulkQaConfigId, setBulkQaConfigId] = useState<number | null>(null);
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
      
      // Fetch agents and QA configs
      fetchAgents();
      fetchQaConfigs();
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
        if (data.agents && data.agents.length > 0) {
          setAgentId(data.agents[0].id);
          setBulkAgentId(data.agents[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchQaConfigs = async () => {
    try {
      const response = await fetch(`${API_URL}/qa-configs/list`, {
        credentials: 'include'  // ✅ Use cookies
      });

      if (response.ok) {
        const data = await response.json();
        setQaConfigs(data.configs || []);
        const defaultConfig = data.configs?.find((c: any) => c.is_default);
        if (defaultConfig) {
          setSelectedQaConfigId(defaultConfig.id);
          setBulkQaConfigId(defaultConfig.id);
        }
      }
    } catch (error) {
      console.error('Error fetching QA configs:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.includes('audio')
    );
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const fileStatuses: UploadStatus[] = newFiles.map((file) => ({
      file,
      status: 'pending',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...fileStatuses]);
  };

  const uploadFile = async (fileStatus: UploadStatus, index: number) => {
    if (!agentId) {
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'error', message: 'Please select an agent' };
        return updated;
      });
      return;
    }

    // Update status to uploading
    setFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'uploading', progress: 0 };
      return updated;
    });

    try {
      const formData = new FormData();
      formData.append('file', fileStatus.file);
      formData.append('agent_id', agentId.toString());
      formData.append('campaign', campaign || 'Default Campaign');
      if (selectedQaConfigId) {
        formData.append('qa_config_id', selectedQaConfigId.toString());
      }

      const response = await fetch(`${API_URL}/calls/upload`, {
        method: 'POST',
        credentials: 'include',  // ✅ Use cookies
        body: formData,
        // Note: Don't set Content-Type header for FormData - browser sets it with boundary
      });

      if (response.ok) {
        const data = await response.json();
        setFiles((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status: 'processing',
            taskId: data.task_id,
            callId: data.call_id,
            message: 'Processing...',
          };
          return updated;
        });
        // Start polling for status
        pollTaskStatus(data.task_id, index);
      } else {
        const error = await response.json();
        setFiles((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status: 'error',
            message: error.detail || 'Upload failed',
          };
          return updated;
        });
      }
    } catch (error) {
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'error',
          message: 'Network error',
        };
        return updated;
      });
    }
  };

  const pollTaskStatus = async (taskId: string, index: number) => {
    const poll = async () => {
      try {
        const response = await fetch(`${API_URL}/calls/task/${taskId}`, {
          credentials: 'include'  // ✅ Use cookies
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'completed') {
            setFiles((prev) => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                status: 'success',
                message: `Score: ${data.result?.qa_score || 'N/A'}`,
              };
              return updated;
            });
          } else if (data.status === 'failed') {
            setFiles((prev) => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                status: 'error',
                message: data.error || 'Processing failed',
              };
              return updated;
            });
          } else {
            // Still processing, poll again
            setTimeout(poll, 3000);
          }
        }
      } catch (error) {
        console.error('Error polling task status:', error);
      }
    };
    poll();
  };

  const uploadAllFiles = async () => {
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(files[i], i);
      }
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkZipFile || !bulkCsvFile) {
      alert('Please select both ZIP and CSV files');
      return;
    }

    if (!bulkAgentId) {
      alert('Please select a default agent');
      return;
    }

    const formData = new FormData();
    formData.append('zip_file', bulkZipFile);
    formData.append('csv_file', bulkCsvFile);
    formData.append('default_agent_id', bulkAgentId.toString());
    formData.append('default_campaign', bulkCampaign);
    if (bulkQaConfigId) {
      formData.append('qa_config_id', bulkQaConfigId.toString());
    }

    try {
      const response = await fetch(`${API_URL}/calls/bulk-upload`, {
        method: 'POST',
        credentials: 'include',  // ✅ Use cookies
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setBulkTaskId(data.task_id);
        pollBulkStatus(data.task_id);
      } else {
        const error = await response.json();
        alert(error.detail || 'Bulk upload failed');
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      alert('Network error during bulk upload');
    }
  };

  const pollBulkStatus = async (taskId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`${API_URL}/calls/bulk-task/${taskId}`, {
          credentials: 'include'  // ✅ Use cookies
        });

        if (response.ok) {
          const data = await response.json();
          setBulkStatus(data);
          
          if (data.status !== 'completed' && data.status !== 'failed') {
            setTimeout(poll, 3000);
          }
        }
      } catch (error) {
        console.error('Error polling bulk status:', error);
      }
    };
    poll();
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

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                    Upload Calls
                  </h1>
                  <p className="text-gray-600 text-sm">Upload and process call recordings</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
        {/* Mode Selection */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg mb-8 border border-gray-100">
          <nav className="flex">
            <button
              onClick={() => setUploadMode('single')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-all ${
                uploadMode === 'single'
                  ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <FileAudio className="w-5 h-5 mx-auto mb-1" />
              Single/Multiple Files
            </button>
            <button
              onClick={() => setUploadMode('bulk')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-all ${
                uploadMode === 'bulk'
                  ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Archive className="w-5 h-5 mx-auto mb-1" />
              Bulk Upload (ZIP + CSV)
            </button>
          </nav>
        </div>

        {uploadMode === 'single' ? (
          <>
            {/* Settings */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                  <select
                    value={agentId || ''}
                    onChange={(e) => setAgentId(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select agent...</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign</label>
                  <input
                    type="text"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    placeholder="Campaign name"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">QA Config</label>
                  <select
                    value={selectedQaConfigId || ''}
                    onChange={(e) => setSelectedQaConfigId(Number(e.target.value) || null)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Default config</option>
                    {qaConfigs.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-12 mb-8 border-2 border-dashed transition-all ${
                isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-300'
              }`}
            >
              <div className="text-center">
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Drop audio files here</h3>
                <p className="text-gray-600 mb-4">or click to browse</p>
                <label className="inline-block">
                  <input
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <span className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium cursor-pointer transition-all">
                    Select Files
                  </span>
                </label>
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Files ({files.length})</h2>
                  <button
                    onClick={uploadAllFiles}
                    disabled={!agentId || files.every((f) => f.status !== 'pending')}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload All
                  </button>
                </div>
                <div className="space-y-3">
                  {files.map((fileStatus, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <FileAudio className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-900">{fileStatus.file.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {fileStatus.status === 'pending' && (
                          <span className="text-sm text-gray-500">Ready</span>
                        )}
                        {fileStatus.status === 'uploading' && (
                          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                        )}
                        {fileStatus.status === 'processing' && (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                            <span className="text-sm text-yellow-600">Processing...</span>
                          </div>
                        )}
                        {fileStatus.status === 'success' && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-600">{fileStatus.message}</span>
                          </div>
                        )}
                        {fileStatus.status === 'error' && (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="text-sm text-red-600">{fileStatus.message}</span>
                          </div>
                        )}
                        {fileStatus.status === 'pending' && (
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Bulk Upload Mode */
          <div className="space-y-6">
            {/* Bulk Settings */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Bulk Upload Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Agent</label>
                  <select
                    value={bulkAgentId || ''}
                    onChange={(e) => setBulkAgentId(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select agent...</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign</label>
                  <input
                    type="text"
                    value={bulkCampaign}
                    onChange={(e) => setBulkCampaign(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">QA Config</label>
                  <select
                    value={bulkQaConfigId || ''}
                    onChange={(e) => setBulkQaConfigId(Number(e.target.value) || null)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Default config</option>
                    {qaConfigs.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* File Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <Archive className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-lg font-bold text-gray-900">ZIP File</h3>
                </div>
                <label className="block">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setBulkZipFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    bulkZipFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-indigo-500'
                  }`}>
                    {bulkZipFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-700">{bulkZipFile.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-600">Click to select ZIP file</span>
                    )}
                  </div>
                </label>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-lg font-bold text-gray-900">CSV File</h3>
                </div>
                <label className="block">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBulkCsvFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    bulkCsvFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-indigo-500'
                  }`}>
                    {bulkCsvFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-700">{bulkCsvFile.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-600">Click to select CSV file</span>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Upload Button */}
            <div className="text-center">
              <button
                onClick={handleBulkUpload}
                disabled={!bulkZipFile || !bulkCsvFile || !bulkAgentId || !!bulkTaskId}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkTaskId ? 'Processing...' : 'Start Bulk Upload'}
              </button>
            </div>

            {/* Bulk Status */}
            {bulkStatus && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Bulk Upload Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-medium ${
                      bulkStatus.status === 'completed' ? 'text-green-600' :
                      bulkStatus.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {bulkStatus.status}
                    </span>
                  </div>
                  {bulkStatus.progress && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Files</span>
                        <span className="font-medium">{bulkStatus.progress.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Processed</span>
                        <span className="font-medium text-green-600">{bulkStatus.progress.processed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Failed</span>
                        <span className="font-medium text-red-600">{bulkStatus.progress.failed}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}