import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileArchive, Settings, CheckCircle2, Loader2, AlertCircle, Github, Plus, Search, GitBranch } from 'lucide-react';
import { GitHubConfig, GitHubRepo } from './types';
import { commitZipToGitHub, fetchRepositories, createRepository } from './github';

export default function App() {
  const [config, setConfig] = useState<GitHubConfig>({
    pat: '',
    branch: 'main'
  });
  
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [createRepoLoading, setCreateRepoLoading] = useState(false);

  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

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
        const parsed = JSON.parse(saved);
        setConfig({ pat: parsed.pat || '', branch: parsed.branch || 'main' });
        if (parsed.pat) {
          loadRepositories(parsed.pat);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('github-zip-config', JSON.stringify(config));
  }, [config]);

  const loadRepositories = async (pat: string) => {
    if (!pat) return;
    setIsLoadingRepos(true);
    try {
      const repos = await fetchRepositories(pat);
      setRepositories(repos);
      if (repos.length > 0 && !selectedRepo) {
        setSelectedRepo(repos[0].full_name);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch repositories.');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfig = { ...config, [e.target.name]: e.target.value };
    setConfig(newConfig);
  };

  const handlePatBlur = () => {
    loadRepositories(config.pat);
  };

  const handleCreateRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.pat || !newRepoName) return;
    setCreateRepoLoading(true);
    try {
      const newRepo = await createRepository(config.pat, newRepoName, newRepoPrivate);
      setRepositories([newRepo, ...repositories]);
      setSelectedRepo(newRepo.full_name);
      setIsCreatingRepo(false);
      setNewRepoName('');
      setNewRepoPrivate(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create repository.');
    } finally {
      setCreateRepoLoading(false);
    }
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
    
    if (!config.pat || !selectedRepo || !config.branch) {
      setErrorMsg('Please properly configure Pat, select a Repository, and branch.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setErrorMsg('');
    setProgressMsg('Looking into zip file...');

    try {
      await commitZipToGitHub(config, selectedRepo, zipFile, commitMessage, (msg) => {
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

  const filteredRepos = repositories.filter(r => r.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

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
                  onBlur={handlePatBlur}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600"
                />
                <p className="text-[10px] text-neutral-600 mt-1.5 ml-0.5">Needs "repo" scope to commit to repositories.</p>
              </div>

              {!isCreatingRepo ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-neutral-500 ml-0.5">Select Repository</label>
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingRepo(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> New Repo
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {isLoadingRepos ? <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" /> : <Search className="w-4 h-4 text-neutral-500" />}
                      </div>
                      <input
                        type="text"
                        className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600"
                        placeholder="Search repositories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <select
                      className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer appearance-none"
                      value={selectedRepo}
                      onChange={(e) => setSelectedRepo(e.target.value)}
                    >
                      <option value="" disabled>Select a repository...</option>
                      {filteredRepos.map(repo => (
                        <option key={repo.id} value={repo.full_name}>
                          {repo.full_name} {repo.private ? '(Private)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-[#1a1a1a] p-4 rounded-xl border border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-white">Create New Repository</h3>
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingRepo(false)}
                      className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1 ml-0.5">Repository Name</label>
                    <input
                      type="text"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="my-awesome-project"
                      className="w-full bg-[#121212] border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600 mb-3"
                    />
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={newRepoPrivate}
                      onChange={(e) => setNewRepoPrivate(e.target.value === 'true' || e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-neutral-700 bg-[#121212] text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0 transition-all cursor-pointer"
                    />
                    <span className="text-xs font-medium text-neutral-300">Private repository</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={handleCreateRepository}
                    disabled={createRepoLoading || !newRepoName}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {createRepoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    <span>Create Repository</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5 ml-0.5">Branch</label>
                <div className="relative">
                  <GitBranch className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="branch"
                    value={config.branch}
                    onChange={handleConfigChange}
                    placeholder="main"
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600"
                  />
                </div>
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

