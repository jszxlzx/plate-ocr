// Service Worker: 下載 CDN 模型 → 以 /local/* 提供，之後離線可用
const CACHE='plate-ocr-v4-oneclick';
const MAP = {
  '/local/worker.min.js':      'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/worker.min.js',
  '/local/tesseract-core.wasm.js': 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
  '/local/tesseract-core.wasm':    'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm',
  '/local/eng.traineddata':    'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata',
  './': null, './index.html': null
};

self.addEventListener('install', e=>{
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e=>{
  e.waitUntil(self.clients.claim());
});

self.addEventListener('message', async (e)=>{
  if (e.data && e.data.type==='prefetch-models'){
    const port = e.ports[0];
    const entries = Object.entries(MAP).filter(([k,v])=>v);
    const total = entries.length;
    let done = 0;
    const cache = await caches.open(CACHE);
    for (const [local, remote] of entries){
      try{
        const res = await fetch(remote, {cache:'no-cache'});
        await cache.put(local, res.clone());
      }catch(err){ /* 忽略單個錯誤 */ }
      done++;
      const p = Math.round(done/total*100);
      port.postMessage({type:'prefetch-progress', progress:p});
    }
    port.postMessage({type:'prefetch-done'});
  }
});

self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  // 以 Cache 優先提供 /local/* 與本頁
  if (url.pathname.startsWith('/local/') || url.pathname.endsWith('/index.html') || url.pathname===self.registration.scope.replace(location.origin,'')){
    e.respondWith((async()=>{
      const cache = await caches.open(CACHE);
      const hit = await cache.match(url.pathname);
      if (hit) return hit;
      // 若未命中，回源（對 /local/* 會失敗，除非已 prefetch）
      const remote = MAP[url.pathname];
      if (remote){
        const res = await fetch(remote);
        cache.put(url.pathname, res.clone());
        return res;
      }
      return fetch(e.request);
    })());
  }
});
