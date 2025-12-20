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
  const [qaConfigs, setQaConfigs] = useState<Array<{id: number, name: string}>>([]);
  const [selectedQaConfigId, setSelectedQaConfigId] = useState<number | null>(null);
  const [bulkQaConfigId, setBulkQaConfigId] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Check authentication and fetch agents
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAgents();
    fetchQaConfigs();
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

  const fetchQaConfigs = async () => {
    try {
      const response = await fetch(`${API_URL}/qa-configs/list`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setQaConfigs(data.configs);
        // Set default as selected
        const defaultConfig = data.configs.find((c: any) => c.is_default);
        if (defaultConfig) {
          setSelectedQaConfigId(defaultConfig.id);
          setBulkQaConfigId(defaultConfig.id);
        }
      }
    } catch (error) {
      console.error('Error fetching QA configs:', error);
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
          `${API_URL}/calls/upload?agent_id=${agentId}&campaign=${campaign}&qa_config_id=${selectedQaConfigId}`,
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
    if (bulkQaConfigId) {
      params.append('qa_config_id', bulkQaConfigId.toString());
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">Upload Calls</h1>
              <p className="text-gray-600 mt-1 font-medium">Upload audio files for QA evaluation</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>
  
      <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Mode Tabs */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg mb-8 border border-gray-100">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setUploadMode('single')}
                className={`px-8 py-4 text-base font-semibold border-b-3 transition-all duration-200 ${
                  uploadMode === 'single'
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                Single/Multiple Files
              </button>
              <button
                onClick={() => setUploadMode('bulk')}
                className={`px-8 py-4 text-base font-semibold border-b-3 transition-all duration-200 ${
                  uploadMode === 'bulk'
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'
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
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Select Agent
                  </label>
                  <select
                    value={agentId || ''}
                    onChange={(e) => setAgentId(Number(e.target.value))}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                  >
                    <option value="">Select an agent...</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.email})
                      </option>
                    ))}
                  </select>
                  {agents.length === 0 && (
                    <p className="text-sm text-gray-600 mt-2 font-medium">
                      No agents found. Create agents in Team Management first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    QA Rubric
                  </label>
                  <select
                    value={selectedQaConfigId || ''}
                    onChange={(e) => setSelectedQaConfigId(Number(e.target.value))}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                  >
                    <option value="">Select rubric...</option>
                    {qaConfigs.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Campaign
                  </label>
                  <input
                    type="text"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                  />
                </div>
              </div>
            </div>
                
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`border-3 border-dashed rounded-3xl p-16 text-center mb-8 transition-all duration-300 ${
                isDragging
                  ? 'border-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-xl scale-105'
                  : 'border-gray-300 bg-white/90 backdrop-blur-sm hover:border-indigo-400 hover:shadow-lg shadow-md'
              }`}
            >
              <div className={`transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
                <Upload className={`w-20 h-20 mx-auto mb-6 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-3">
                Drop audio files here
              </p>
              <p className="text-gray-600 mb-6 text-lg">
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
                className="inline-block px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 cursor-pointer font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                Select Files
              </label>
              <p className="text-sm text-gray-600 mt-6 font-medium">
                Supports: WAV, MP3, M4A, FLAC
              </p>
            </div>
            
            {/* Stats */}
            {files.length > 0 && (
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border border-gray-100">
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Files</div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">{files.length}</div>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border border-orange-100">
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Pending</div>
                  <div className="text-3xl font-bold text-orange-600 mt-2">{pendingCount}</div>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border border-green-100">
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Success</div>
                  <div className="text-3xl font-bold text-green-600 mt-2">{successCount}</div>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border border-red-100">
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Failed</div>
                  <div className="text-3xl font-bold text-red-600 mt-2">{errorCount}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {files.length > 0 && (
              <div className="flex gap-4 mb-8">
                <button
                  onClick={handleUploadAll}
                  disabled={pendingCount === 0 || !agentId}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                >
                  Upload {pendingCount} File{pendingCount !== 1 ? 's' : ''}
                </button>
                {successCount > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="px-8 py-4 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Clear Completed
                  </button>
                )}
              </div>
            )}
  
            {/* Files List */}
            {files.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="text-2xl font-bold text-gray-900">Files</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {files.map((fileStatus, index) => (
                    <div key={index} className="px-8 py-6 hover:bg-indigo-50/30 transition-colors duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4 flex-1">
                          {fileStatus.status === 'pending' && (
                            <div className="w-6 h-6 rounded-full border-3 border-gray-300" />
                          )}
                          {fileStatus.status === 'uploading' && (
                            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                          )}
                          {fileStatus.status === 'success' && (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          )}
                          {fileStatus.status === 'error' && (
                            <XCircle className="w-6 h-6 text-red-600" />
                          )}
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-lg">{fileStatus.file.name}</p>
                            <p className="text-sm text-gray-600 mt-1 font-medium">
                              {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                              {fileStatus.message && ` • ${fileStatus.message}`}
                            </p>
                          </div>
                        </div>
                        {fileStatus.callId && (
                          <button
                            onClick={() => router.push(`/?view=${fileStatus.callId}`)}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm hover:underline underline-offset-2 transition-all duration-200"
                          >
                            View QA →
                          </button>
                        )}
                      </div>
                      {fileStatus.status === 'uploading' && (
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-300"
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
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Bulk Upload Settings</h2>
              
              <div className="space-y-6">
                {/* ZIP File Upload */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ZIP File (Required)
                  </label>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setBulkZipFile(e.target.files?.[0] || null)}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                  />
                  <p className="text-sm text-gray-600 mt-2 font-medium">
                    Upload a ZIP file containing audio files (.wav, .mp3, .m4a, .flac)
                  </p>
                </div>

                {/* CSV File Upload (Optional) */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    CSV Metadata File (Optional)
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBulkCsvFile(e.target.files?.[0] || null)}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                  />
                  <p className="text-sm text-gray-600 mt-2 font-medium">
                    CSV with columns: filename, agent_id, campaign, call_date
                  </p>
                </div>
        
                {/* Default Settings (used when no CSV) */}
                <div className="border-t-2 border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-5">
                    Default Settings (for files not in CSV)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Default Agent
                      </label>
                      <select
                        value={bulkAgentId || ''}
                        onChange={(e) => setBulkAgentId(Number(e.target.value))}
                        className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
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
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Default Campaign
                      </label>
                      <input
                        type="text"
                        value={bulkCampaign}
                        onChange={(e) => setBulkCampaign(e.target.value)}
                        className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                        placeholder="e.g., Sales Campaign"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        QA Rubric
                      </label>
                      <select
                        value={bulkQaConfigId || ''}
                        onChange={(e) => setBulkQaConfigId(Number(e.target.value))}
                        className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                      >
                        <option value="">Select rubric...</option>
                        {qaConfigs.map((config) => (
                          <option key={config.id} value={config.id}>
                            {config.name}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>
                </div>
              </div>
            </div>
                      
            {/* Upload Button */}
            <div className="mb-8">
              <button
                onClick={handleBulkUpload}
                disabled={bulkUploading || !bulkZipFile}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none inline-flex items-center gap-3"
              >
                {bulkUploading && (
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{bulkUploading ? 'Processing Files... This may take a few minutes' : 'Upload & Process Bulk Files'}</span>
              </button>
            </div>

            {bulkUploading && (
              <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-2xl shadow-md">
                <div className="flex items-center gap-4">
                  <div className="animate-pulse w-3 h-3 bg-blue-600 rounded-full"></div>
                  <div>
                    <p className="text-base font-bold text-blue-900">
                      Processing bulk upload...
                    </p>
                    <p className="text-sm text-blue-700 mt-1.5 font-medium">
                      Uploading, transcribing, and evaluating calls. Estimated time: ~30 seconds per file.
                    </p>
                  </div>
                </div>
              </div>
            )}
                      
            {/* Results */}
            {bulkResults && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Bulk Upload Results</h3>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-md border border-gray-200">
                    <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Files</div>
                    <div className="text-3xl font-bold text-gray-900 mt-2">{bulkResults.total_files}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-md border border-green-200">
                    <div className="text-sm font-semibold text-green-700 uppercase tracking-wide">Successful</div>
                    <div className="text-3xl font-bold text-green-600 mt-2">{bulkResults.successful}</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 shadow-md border border-red-200">
                    <div className="text-sm font-semibold text-red-700 uppercase tracking-wide">Failed</div>
                    <div className="text-3xl font-bold text-red-600 mt-2">{bulkResults.failed}</div>
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