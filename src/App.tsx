import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileArchive, Settings, CheckCircle2, Loader2, AlertCircle, Github } from 'lucide-react';
import { GitHubConfig } from './types';
import { commitZipToGitHub } from './github';

export default function App() {
  const [config, setConfig] = useState<GitHubConfig>({
    pat: '',
    owner: '',
    repo: '',
    branch: 'main'
  });
  
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [commitMessage, setCommitMessage] = useState('Update via Zip upload');
  
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('github-zip-config');
    if (saved) {
      try {
        setConfig((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('github-zip-config', JSON.stringify(config));
  }, [config]);

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);
    if (status === 'uploading') return;
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/zip' || file.name.endsWith('.zip'))) {
      setZipFile(file);
      setStatus('idle');
    } else {
      setErrorMsg('Please upload a valid .zip file.');
      setStatus('error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setZipFile(file);
      setStatus('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipFile) {
      setErrorMsg('Please select a zip file first.');
      setStatus('error');
      return;
    }
    
    if (!config.pat || !config.owner || !config.repo || !config.branch) {
      setErrorMsg('Please fill out all repository configuration fields.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setErrorMsg('');
    setProgressMsg('Looking into zip file...');

    try {
      await commitZipToGitHub(config, zipFile, commitMessage, (msg) => {
        setProgressMsg(msg);
      });
      setStatus('success');
      setZipFile(null); // Reset after success
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during upload.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans p-4 sm:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <header className="flex items-center space-x-3 pt-4">
          <div className="w-10 h-10 bg-neutral-800 border border-neutral-700 rounded-xl flex items-center justify-center shadow-sm">
            <Github className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight text-white">Zip to GitHub</h1>
            <p className="text-sm text-neutral-500">Unpack and commit zipped repositories</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Config Section */}
          <section className="bg-[#121212] border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-5 transition-all">
            <div className="flex items-center space-x-2 pb-2 border-b border-neutral-800/60">
              <Settings className="w-4 h-4 text-neutral-400" />
              <h2 className="text-sm font-medium text-neutral-300 tracking-tight">Repository Configuration</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5 ml-0.5">Personal Access Token</label>
                <input
                  type="password"
                  name="pat"
                  value={config.pat}
                  onChange={handleConfigChange}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600"
                />
                <p className="text-[10px] text-neutral-600 mt-1.5 ml-0.5">Needs "repo" scope to commit to repositories.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5 ml-0.5">Owner / Org</label>
                  <input
                    type="text"
                    name="owner"
                    value={config.owner}
                    onChange={handleConfigChange}
                    placeholder="e.g. torvalds"
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5 ml-0.5">Repository</label>
                  <input
                    type="text"
                    name="repo"
                    value={config.repo}
                    onChange={handleConfigChange}
                    placeholder="e.g. linux"
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5 ml-0.5">Branch</label>
                <input
                  type="text"
                  name="branch"
                  value={config.branch}
                  onChange={handleConfigChange}
                  placeholder="main"
                  className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600"
                />
              </div>
            </div>
          </section>

          {/* Upload Section */}
          <section className="space-y-3">
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
              onDragLeave={() => setIsHovering(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative cursor-pointer flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed
                transition-all duration-200 
                ${isHovering 
                  ? 'bg-blue-500/5 border-blue-500/50' 
                  : zipFile 
                    ? 'bg-neutral-800/30 border-neutral-700/50 hover:bg-neutral-800/50' 
                    : 'bg-[#121212] border-neutral-800 hover:border-neutral-700'}
              `}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".zip,application/zip" 
                onChange={handleFileChange}
                className="hidden" 
              />
              
              {zipFile ? (
                <div className="flex flex-col items-center space-y-3 text-center">
                  <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center text-blue-400 border border-neutral-700/50">
                    <FileArchive className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-200">{zipFile.name}</p>
                    <p className="text-xs text-neutral-500 mt-1">{(zipFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-2 px-3 py-1 bg-neutral-900 rounded-full">Click or drag to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3 text-center">
                  <div className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center text-neutral-400 border border-neutral-800">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-300">Select a zip archive</p>
                    <p className="text-xs text-neutral-500 mt-1">Drag and drop or click to browse</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Commit Message */}
            <div>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message (e.g., Update project from zip)"
                className="w-full bg-[#121212] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600"
              />
            </div>
          </section>

          {/* Messages */}
          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-start space-x-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl flex items-start space-x-3 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="leading-relaxed">Archive unpacked and successfully pushed to GitHub.</p>
            </div>
          )}

          {status === 'uploading' && (
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-3 rounded-xl flex items-center space-x-3 text-sm">
              <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
              <p className="leading-relaxed">{progressMsg}</p>
            </div>
          )}

          {/* Action */}
          <button
            type="submit"
            disabled={status === 'uploading'}
            className="w-full py-3.5 px-4 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-black text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {status === 'uploading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
                <span>Committing to Repo...</span>
              </>
            ) : (
              <>
                <span>Push Archive</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

