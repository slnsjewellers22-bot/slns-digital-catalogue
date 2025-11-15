/* admin.js
   Shared GitHub helper functions for Upload & Manage pages.
   - getPathMeta(owner, repo, path, branch, pat) -> meta (type, sha, download_url, etc) or null
   - uploadFile(owner, repo, path, File, branch, pat) -> resolves with response json or rejects with Error
   - deleteFile(owner, repo, path, message, branch, pat)
   - fetchItems(owner, repo, branch) -> parse items.json (or [])
   - updateItemsJson(owner, repo, branch, itemsArray, message, pat)
   - copyFile(owner, repo, srcPath, destPath, branch, pat)
   - utility: b64 conversion
*/
window.GH = (function(){
  async function apiFetch(url, opts = {}) {
    const res = await fetch(url, opts);
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch(e){ /* not json */ }
    if (!res.ok) {
      const err = new Error(json && json.message ? json.message : `HTTP ${res.status}`);
      err.status = res.status; err.body = json;
      throw err;
    }
    return json;
  }

  async function getPathMeta(owner, repo, path, branch = 'main', pat){
    // GET /repos/{owner}/{repo}/contents/{path}?ref=branch
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`;
    try{
      const headers = pat ? { Authorization: 'token ' + pat } : {};
      const meta = await apiFetch(url, { headers });
      return meta; // object with { type: "file"|"dir", sha, download_url, ... }
    }catch(err){
      if(err.status === 404) return null;
      throw err;
    }
  }

  async function uploadFile(owner, repo, path, file, branch = 'main', pat){
    // Try to fetch existing sha (file exists => update with sha)
    const meta = await getPathMeta(owner, repo, path, branch, pat).catch(()=>null);
    const sha = meta && meta.sha ? meta.sha : null;

    // read file to base64
    const b64 = await fileToBase64(file);
    const content = b64.split(',')[1];

    const body = { message: sha ? `Update ${path}` : `Add ${path}`, content, branch };
    if(sha) body.sha = sha;

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const headers = { Authorization: 'token ' + pat, Accept: 'application/vnd.github.v3+json' };
    const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
    const text = await res.text();
    let json = null; try { json = text ? JSON.parse(text) : null; } catch(e){}
    if (!res.ok) {
      const message = json && json.message ? json.message : `Upload failed: ${res.status}`;
      const err = new Error(message);
      err.body = json; throw err;
    }
    return json;
  }

  async function deleteFile(owner, repo, path, message = 'Delete file', branch = 'main', pat){
    // need sha of file
    const meta = await getPathMeta(owner, repo, path, branch, pat);
    if(!meta || !meta.sha) throw new Error('File not found');
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const body = { message, sha: meta.sha, branch };
    const headers = { Authorization: 'token ' + pat, Accept: 'application/vnd.github.v3+json' };
    const res = await fetch(url, { method: 'DELETE', headers, body: JSON.stringify(body) });
    const text = await res.text();
    let json = null; try{ json = text ? JSON.parse(text) : null } catch(e){}
    if(!res.ok){
      const msg = json && json.message ? json.message : `Delete failed: ${res.status}`;
      const err = new Error(msg); err.body = json; throw err;
    }
    return json;
  }

  async function fetchItems(owner, repo, branch = 'main'){
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/items.json`;
    const res = await fetch(rawUrl);
    if(!res.ok) throw new Error('items.json not found');
    return await res.json();
  }

  async function updateItemsJson(owner, repo, branch, itemsArray, message = 'Update items.json', pat){
    // Get sha if exists
    const meta = await getPathMeta(owner, repo, 'items.json', branch, pat).catch(()=>null);
    const sha = meta && meta.sha ? meta.sha : null;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(itemsArray, null, 2))));
    const body = { message, content, branch };
    if(sha) body.sha = sha;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/items.json`;
    const headers = { Authorization: 'token ' + pat, Accept: 'application/vnd.github.v3+json' };
    const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
    const text = await res.text();
    let json = null; try { json = text ? JSON.parse(text) : null } catch(e){}
    if(!res.ok){
      const msg = json && json.message ? json.message : `Update items.json failed: ${res.status}`;
      const err = new Error(msg); err.body = json; throw err;
    }
    return json;
  }

  async function copyFile(owner, repo, srcPath, destPath, branch = 'main', pat){
    // fetch raw bytes from raw.githubusercontent then PUT into dest
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${srcPath}`;
    const r = await fetch(rawUrl);
    if(!r.ok) throw new Error('Source not found: ' + srcPath);
    const blob = await r.blob();
    const b64 = await blobToBase64(blob);
    const content = b64.split(',')[1];
    const body = { message: `Copy ${srcPath} -> ${destPath}`, content, branch };
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(destPath)}`;
    const headers = { Authorization: 'token ' + pat, Accept: 'application/vnd.github.v3+json' };
    const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
    const text = await res.text();
    let json = null; try{ json = text ? JSON.parse(text) : null } catch(e){}
    if(!res.ok){
      const msg = json && json.message ? json.message : `Copy failed: ${res.status}`;
      const err = new Error(msg); err.body = json; throw err;
    }
    return json;
  }

  // helpers
  function fileToBase64(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=err=>rej(err); r.readAsDataURL(file); }); }
  function blobToBase64(blob){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=err=>rej(err); r.readAsDataURL(blob); }); }

  return {
    getPathMeta,
    uploadFile,
    deleteFile,
    fetchItems,
    updateItemsJson,
    copyFile,
    fileToBase64,
    blobToBase64
  };
})();
