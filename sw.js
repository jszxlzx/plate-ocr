// SW：兼容 GitHub Pages 子路徑，並把模型緩存到 scope/local/*
const CACHE='plate-ocr-v4-oneclick-c';
const CDN = {
  'local/worker.min.js':           'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/worker.min.js',
  'local/tesseract-core.wasm.js':  'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
  'local/tesseract-core.wasm':     'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm',
  'local/eng.traineddata':         'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata'
};

self.addEventListener('message', async (e)=>{
  if (e.data?.type==='prefetch-models'){
    const port = e.ports[0];
    const cache = await caches.open(CACHE);
    let done = 0, total = Object.keys(CDN).length;
    for (const [local, remote] of Object.entries(CDN)){
      try{
        const res = await fetch(remote, {cache:'no-cache'});
        await cache.put(new Request(local), res.clone());
      }catch(err){}
      done++; port.postMessage({type:'prefetch-progress', progress:Math.round(done/total*100)});
    }
    port.postMessage({type:'prefetch-done'});
  }
});

self.addEventListener('fetch', e=>{
  const scope = new URL(self.registration.scope).pathname; // e.g. /plate-ocr/
  const reqPath = new URL(e.request.url).pathname;
  // 只攔截當前 scope 下的 /local/*
  if (reqPath.startsWith(scope+'local/')){
    const key = 'local/' + reqPath.slice((scope+'local/').length + scope.length - (scope).length);
    e.respondWith((async()=>{
      const cache = await caches.open(CACHE);
      const hit = await cache.match(key);
      if (hit) return hit;
      const remote = CDN[key];
      if (remote){
        const res = await fetch(remote, {cache:'no-cache'});
        cache.put(key, res.clone());
        return res;
      }
      return fetch(e.request);
    })());
  }
});
