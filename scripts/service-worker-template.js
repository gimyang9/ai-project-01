/* Versioned app shell; personal data stays in localStorage, outside this cache. */
'use strict';
const REVISION=__REVISION__;
const FILES=__FILES__;
const PREFIX='chagok-v2-shell:'+encodeURIComponent(self.registration.scope)+':';
const CACHE=PREFIX+REVISION;
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(file=>new URL(file,self.registration.scope).href))));
 // Do not skipWaiting: an update must not replace code while a record form is open.
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),base=new URL(self.registration.scope);
 if(request.method!=='GET'||url.origin!==base.origin)return;
 let file=FILES.find(file=>new URL(file,base).pathname===url.pathname);
 if(request.mode==='navigate'&&(url.pathname===base.pathname||url.pathname===new URL('index.html',base).pathname))file='index.html';
 if(!file)return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(new URL(file,base).href))||fetch(request)));
});
