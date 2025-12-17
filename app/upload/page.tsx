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
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [bulkZipFile, setBulkZipFile] = useState<File | null>(null);
  const [bulkCsvFile, setBulkCsvFile] = useState<File | null>(null);
  const [bulkAgentId, setBulkAgentId] = useState<number | null>(null);
  const [bulkCampaign, setBulkCampaign] = useState('Bulk Upload');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<any>(null);

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

const handleBulkUpload = async () => {
  if (!bulkZipFile) {
    alert('Please select a ZIP file');
    return;
  }

  if (!bulkCsvFile && !bulkAgentId) {
    alert('Please either upload a CSV file or select a default agent');
    return;
  }

  setBulkUploading(true);
  setBulkResults(null);

  try {
    const formData = new FormData();
    formData.append('zip_file', bulkZipFile);
    
    if (bulkCsvFile) {
      formData.append('csv_file', bulkCsvFile);
    }

    const params = new URLSearchParams();
    if (bulkAgentId) {
      params.append('default_agent_id', bulkAgentId.toString());
    }
    if (bulkCampaign) {
      params.append('default_campaign', bulkCampaign);
    }

    const response = await fetch(
      `${API_URL}/calls/bulk-upload?${params.toString()}`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      }
    );

    const result = await response.json();

    if (response.ok) {
      setBulkResults(result);
      alert(`Success! Processed ${result.successful} out of ${result.total_files} files`);
    } else {
      throw new Error(result.detail || 'Bulk upload failed');
    }
  } catch (error: any) {
    alert(`Error: ${error.message}`);
  } finally {
    setBulkUploading(false);
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
        {/* Mode Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setUploadMode('single')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  uploadMode === 'single'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Single/Multiple Files
              </button>
              <button
                onClick={() => setUploadMode('bulk')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  uploadMode === 'bulk'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Bulk Upload (ZIP + CSV)
              </button>
            </nav>
          </div>
        </div>
              
        {uploadMode === 'single' ? (
          <>
            {/* EXISTING SINGLE UPLOAD CODE - Keep everything as is */}
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
          </>
        ) : (
          <>
            {/* BULK UPLOAD MODE */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Upload Settings</h2>
              
              <div className="space-y-4">
                {/* ZIP File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP File (Required)
                  </label>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setBulkZipFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Upload a ZIP file containing audio files (.wav, .mp3, .m4a, .flac)
                  </p>
                </div>
        
                {/* CSV File Upload (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSV Metadata File (Optional)
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBulkCsvFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    CSV with columns: filename, agent_id, campaign, call_date
                  </p>
                </div>
        
                {/* Default Settings (used when no CSV) */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Default Settings (for files not in CSV)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Agent
                      </label>
                      <select
                        value={bulkAgentId || ''}
                        onChange={(e) => setBulkAgentId(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select an agent...</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.email})
                          </option>
                        ))}
                      </select>
                    </div>
                      
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Campaign
                      </label>
                      <input
                        type="text"
                        value={bulkCampaign}
                        onChange={(e) => setBulkCampaign(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Sales Campaign"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
                      
            {/* Upload Button */}
            <div className="mb-6">
              <button
                onClick={handleBulkUpload}
                disabled={bulkUploading || !bulkZipFile}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
              >
                {bulkUploading ? 'Processing...' : 'Upload & Process Bulk Files'}
              </button>
            </div>
                      
            {/* Results */}
            {bulkResults && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Upload Results</h3>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Total Files</div>
                    <div className="text-2xl font-bold text-gray-900">{bulkResults.total_files}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600">Successful</div>
                    <div className="text-2xl font-bold text-green-600">{bulkResults.successful}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-sm text-red-600">Failed</div>
                    <div className="text-2xl font-bold text-red-600">{bulkResults.failed}</div>
                  </div>
                </div>
            
                {bulkResults.results && bulkResults.results.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Successful Uploads:</h4>
                    <div className="space-y-2">
                      {bulkResults.results.map((result: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded">
                          <span className="text-sm text-gray-700">{result.filename}</span>
                          <span className="text-sm text-green-600">
                            Score: {result.qa_score || 'Processing...'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
  
                {bulkResults.errors && bulkResults.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Failed Uploads:</h4>
                    <div className="space-y-2">
                      {bulkResults.errors.map((error: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded">
                          <span className="text-sm text-gray-700">{error.filename}</span>
                          <span className="text-sm text-red-600">{error.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )}