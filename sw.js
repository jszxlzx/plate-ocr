// SW 修正版：兼容 GitHub Pages 子路徑（如 /plate-ocr/）
const CACHE='plate-ocr-v4-oneclick-b';
const CDN = {
  'local/worker.min.js':           'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/worker.min.js',
  'local/tesseract-core.wasm.js':  'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
  'local/tesseract-core.wasm':     'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm',
  'local/eng.traineddata':         'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata'
};

function scopePathname(pathname){
  // 轉成相對於 scope 的路徑
  const scope = new URL(self.registration.scope).pathname; // e.g. /plate-ocr/
  if (pathname.startsWith(scope)) return pathname.slice(scope.length);
  return pathname.startsWith('/') ? pathname.slice(1) : pathname;
}

self.addEventListener('message', async (e)=>{
  if (e.data?.type==='prefetch-models'){
    const port = e.ports[0];
    const cache = await caches.open(CACHE);
    let done = 0, total = Object.keys(CDN).length;
    for (const [local, remote] of Object.entries(CDN)){
      try{
        const res = await fetch(remote, {cache:'no-cache'});
        // 存成 scope 相對路徑
        await cache.put(new Request(local), res.clone());
      }catch(err){ /* ignore single error */ }
      done++; port.postMessage({type:'prefetch-progress', progress:Math.round(done/total*100)});
    }
    port.postMessage({type:'prefetch-done'});
  }
});

self.addEventListener('fetch', e=>{
  const pathname = scopePathname(new URL(e.request.url).pathname); // e.g. 'local/worker.min.js'
  if (pathname in CDN){
    e.respondWith((async()=>{
      const cache = await caches.open(CACHE);
      const hit = await cache.match(pathname);
      if (hit) return hit;
      const res = await fetch(CDN[pathname], {cache:'no-cache'});
      cache.put(pathname, res.clone());
      return res;
    })());
  }
});
