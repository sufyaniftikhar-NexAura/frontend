'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface UploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  message?: string;
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
  const [campaign, setCampaign] = useState('test');
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Check authentication and fetch agents
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAgents();
  }, [router]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/agents/list`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents);
        // Set first agent as default if available
        if (data.agents.length > 0) {
          setAgentId(data.agents[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadStatus[] = Array.from(selectedFiles).map(file => ({
      file,
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const uploadFile = async (fileStatus: UploadStatus, index: number) => {
    if (!agentId) {
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error', 
          message: 'Please select an agent' 
        } : f
      ));
      return;
    }

    const formData = new FormData();
    formData.append('file', fileStatus.file);

    try {
      // Update status to uploading
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'uploading', progress: 50 } : f
      ));

      const response = await fetch(
        `${API_URL}/calls/upload?agent_id=${agentId}&campaign=${campaign}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData
        }
      );

      const result = await response.json();

      if (response.ok) {
        setFiles(prev => prev.map((f, i) => 
          i === index ? { 
            ...f, 
            status: 'success', 
            progress: 100,
            callId: result.call_id,
            message: `QA Score: ${result.qa_evaluation?.overall_score || 'Processing...'}%`
          } : f
        ));
      } else {
        throw new Error(result.detail || 'Upload failed');
      }
    } catch (error: any) {
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error', 
          progress: 0,
          message: error.message 
        } : f
      ));
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files
      .map((f, i) => ({ file: f, index: i }))
      .filter(({ file }) => file.status === 'pending');

    for (const { file, index } of pendingFiles) {
      await uploadFile(file, index);
    }
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status === 'pending' || f.status === 'uploading'));
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Upload Calls</h1>
              <p className="text-gray-600">Upload audio files for QA evaluation</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Upload Settings */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Agent
              </label>
              <select
                value={agentId || ''}
                onChange={(e) => setAgentId(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select an agent...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.email})
                  </option>
                ))}
              </select>
              {agents.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  No agents found. Create agents in Team Management first.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign
              </label>
              <input
                type="text"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-lg p-12 text-center mb-6 transition-colors ${
            isDragging 
              ? 'border-indigo-600 bg-indigo-50' 
              : 'border-gray-300 bg-white hover:border-indigo-400'
          }`}
        >
          <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-900 mb-2">
            Drop audio files here
          </p>
          <p className="text-gray-600 mb-4">
            or click to browse
          </p>
          <input
            type="file"
            multiple
            accept="audio/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer font-medium"
          >
            Select Files
          </label>
          <p className="text-sm text-gray-500 mt-4">
            Supports: WAV, MP3, M4A, FLAC
          </p>
        </div>

        {/* Stats */}
        {files.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Files</div>
              <div className="text-2xl font-bold text-gray-900">{files.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Success</div>
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Failed</div>
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {files.length > 0 && (
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleUploadAll}
              disabled={pendingCount === 0 || !agentId}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
            >
              Upload {pendingCount} File{pendingCount !== 1 ? 's' : ''}
            </button>
            {successCount > 0 && (
              <button
                onClick={clearCompleted}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
              >
                Clear Completed
              </button>
            )}
          </div>
        )}

        {/* Files List */}
        {files.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Files</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {files.map((fileStatus, index) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      {fileStatus.status === 'pending' && (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                      {fileStatus.status === 'uploading' && (
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                      )}
                      {fileStatus.status === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {fileStatus.status === 'error' && (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{fileStatus.file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                          {fileStatus.message && ` • ${fileStatus.message}`}
                        </p>
                      </div>
                    </div>
                    {fileStatus.callId && (
                      <button
                        onClick={() => router.push(`/?view=${fileStatus.callId}`)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                      >
                        View QA →
                      </button>
                    )}
                  </div>
                  {fileStatus.status === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${fileStatus.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}