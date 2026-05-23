import JSZip from 'jszip';

export interface GitHubConfig {
  pat: string;
  owner: string;
  repo: string;
  branch: string;
}

export async function commitZipToGitHub(
  config: GitHubConfig,
  zipFile: File,
  commitMessage: string,
  onProgress: (msg: string) => void
) {
  const { pat, owner, repo, branch } = config;
  const headers = {
    'Authorization': `Bearer ${pat}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  const api = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    });
    if (!res.ok) {
      let message = res.statusText;
      try {
        const err = await res.json();
        message = err.message || message;
      } catch (e) {
        // ignore
      }
      throw new Error(`API Error: ${res.status} ${message}`);
    }
    return res.json();
  };

  try {
    onProgress('Extracting ZIP file...');
    const zip = await JSZip.loadAsync(zipFile);
    const files: { path: string, content: string }[] = [];
    
    // Find common root to avoid wrapping everything in unwanted folders
    // if the user zipped a folder directly
    let commonRoot = '';
    const rootFolders = new Set<string>();
    zip.forEach((relativePath, file) => {
      if (!file.dir) {
        const parts = relativePath.split('/');
        if (parts.length > 1) {
          rootFolders.add(parts[0]);
        } else {
          rootFolders.add('');
        }
      }
    });

    if (rootFolders.size === 1) {
      const root = Array.from(rootFolders)[0];
      if (root !== '') {
        commonRoot = root + '/';
      }
    }

    for (const [relativePath, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        // Skip hidden files if preferred, but usually we want to keep them.
        // We will skip mac specific weirdness like __MACOSX
        if (relativePath.includes('__MACOSX/') || relativePath.includes('.DS_Store')) {
          continue;
        }

        const content = await file.async('base64');
        let finalPath = relativePath;
        if (commonRoot && finalPath.startsWith(commonRoot)) {
          finalPath = finalPath.slice(commonRoot.length);
        }
        files.push({ path: finalPath, content });
      }
    }

    if (files.length === 0) {
      throw new Error('No valid files found in the zip archive.');
    }

    onProgress(`Found ${files.length} files. Fetching latest commit info...`);

    let latestCommitSha: string;
    let baseTreeSha: string | undefined;

    try {
      // 1. Get latest commit SHA
      const refRes = await api(`/git/ref/heads/${branch}`);
      latestCommitSha = refRes.object.sha;
      
      // 2. Get base tree SHA
      const commitRes = await api(`/git/commits/${latestCommitSha}`);
      baseTreeSha = commitRes.tree.sha;
    } catch (e: any) {
      if (e.message.includes('404')) {
        throw new Error(`Branch '${branch}' not found or repository is empty. Please initialize the repository and branch first.`);
      }
      throw e;
    }

    // 3. Create Blobs
    onProgress('Uploading files to GitHub...');
    const treeItems: any[] = [];
    let uploaded = 0;
    
    // Upload files sequentially or in small parallel batches. We do sequential to avoid rate limits/UI lag.
    for (const file of files) {
      const blobRes = await api(`/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({
          content: file.content,
          encoding: 'base64'
        })
      });
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobRes.sha
      });
      uploaded++;
      if (uploaded % Math.max(1, Math.floor(files.length / 5)) === 0 || uploaded === files.length) {
        onProgress(`Uploaded ${uploaded}/${files.length} files...`);
      }
    }

    onProgress('Creating new tree...');
    // 4. Create Tree
    const treeRes = await api(`/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems
      })
    });

    onProgress('Creating commit...');
    // 5. Create Commit
    const newCommitRes = await api(`/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: commitMessage,
        tree: treeRes.sha,
        parents: [latestCommitSha]
      })
    });

    onProgress('Updating branch reference...');
    // 6. Update Ref
    await api(`/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommitRes.sha
      })
    });

    onProgress('Success! Files committed to GitHub.');
  } catch (error: any) {
    throw new Error(error.message || 'An unknown error occurred.');
  }
}
