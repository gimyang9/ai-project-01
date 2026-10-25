const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
for(const prefix of ['', 'dist/'])test(prefix+'PWA shell revision matches every referenced local file and project-relative manifest',()=>{
 const source=fs.readFileSync(prefix+'service-worker.js','utf8'),revision=JSON.parse(source.match(/const REVISION=(.*);/)[1]),files=JSON.parse(source.match(/const FILES=(.*);/)[1]),hash=crypto.createHash('sha256');
 for(const f of files){assert.ok(!f.startsWith('/'));hash.update(f);hash.update(fs.readFileSync(prefix+f));}
 assert.equal(hash.digest('hex').slice(0,16),revision);
 const m=JSON.parse(fs.readFileSync(prefix+'manifest.webmanifest','utf8'));assert.equal(m.scope,'./');assert.equal(m.start_url,'./index.html#home');assert.equal(m.display,'standalone');
 for(const icon of m.icons){const png=fs.readFileSync(prefix+icon.src);const size=Number(icon.sizes.split('x')[0]);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
});
test('worker install/activate/cache fetch stays scoped and never forces an update or caches data requests',async()=>{
 const handlers={},deletes=[],cached=new Map(),scope='https://example.test/project-v2-upload/',prefix='chagok-v2-shell:'+encodeURIComponent(scope)+':';let activeCache,claim=0,network=0;
 const cache={addAll:async urls=>urls.forEach(url=>cached.set(url,{cached:url})),match:async key=>cached.get(key)};
 const context={URL,Promise,self:{registration:{scope},clients:{claim:async()=>{claim++;}},addEventListener:(type,fn)=>handlers[type]=fn},caches:{open:async name=>{activeCache=name;return cache;},keys:async()=>[activeCache,prefix+'old','other-app-cache'],delete:async key=>{deletes.push(key);return true;}},fetch:async()=>{network++;return {network:true};}};
 vm.runInNewContext(fs.readFileSync('dist/service-worker.js','utf8'),context);
 let waiting;handlers.install({waitUntil:p=>waiting=p});await waiting;assert.ok(cached.has(scope+'index.html'));assert.equal(context.self.skipWaiting,undefined);
 handlers.activate({waitUntil:p=>waiting=p});await waiting;assert.deepEqual(deletes,[prefix+'old']);assert.equal(claim,1);
 let response;handlers.fetch({request:{url:scope,method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.equal((await response).cached,scope+'index.html');assert.equal(network,0);
 let handled=false;for(const url of [scope+'personal-backup.json','https://other.test/app.js'])handlers.fetch({request:{url,method:'GET',mode:'cors'},respondWith:()=>{handled=true;}});assert.equal(handled,false);
});
test('all actual local HTML/CSS assets including separate banner layers are precached',()=>{
 for(const prefix of ['', 'dist/']){
  const sw=fs.readFileSync(prefix+'service-worker.js','utf8'),files=JSON.parse(sw.match(/const FILES=(.*);/)[1]),html=fs.readFileSync(prefix+'index.html','utf8'),css=fs.readFileSync(prefix+'style.css','utf8'),refs=[];
  for(const m of html.matchAll(/\b(src|href|srcset)=["']([^"']+)["']/g)){if(/^(data:|https?:|#)/.test(m[2]))continue;if(m[1]==='srcset')refs.push(...m[2].split(',').map(v=>v.trim().split(/\s+/)[0]));else refs.push(m[2]);}
  for(const m of css.matchAll(/url\(\s*['"]?([^)'"]+)['"]?\s*\)/g))refs.push(m[1].trim());
  for(const ref of refs)if(!/^(data:|https?:|#)/.test(ref))assert.ok(files.includes(ref.replace(/^\.\//,'')),prefix+'missing '+ref);
 }
});
