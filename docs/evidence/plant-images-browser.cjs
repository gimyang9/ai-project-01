// Isolated synthetic-profile browser QA. Never attach to the user's browser/storage.
const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),cp=require('child_process'),assert=require('assert/strict');
const connect=require('./stage6/cdp.cjs'),D=require('../../study-data.js'),E=require('../../exam-management.js');
const base=process.cwd(),results=[],missing=[],consoleErrors=[];let chrome,c;
const server=http.createServer((req,res)=>{try{
 let url=decodeURIComponent(req.url.split('?')[0]);if(url==='/favicon.ico'){res.writeHead(204);return res.end();}
 if(url.startsWith('/ai-project-01/'))url=url.slice('/ai-project-01'.length);
 const file=path.resolve(base,'.'+url);if(!file.startsWith(base+path.sep))throw Error('outside');
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 }catch{missing.push(req.url);res.writeHead(404);res.end();}});
async function wait(expr){for(let n=0;n<150;n++){if(await c.evaluate(expr))return;await new Promise(r=>setTimeout(r,100));}throw Error('timeout '+expr);}
async function check(name,fn){const value=await fn();results.push({name,pass:true,value});console.log('PASS '+name);}
function legacy(){let s=D.envelope(D.emptyStudy(),D.emptyExams());for(const family of ['flower','tree','cactus','mushroom']){
 s=D.update(s,{type:'material',material:{id:family,name:family,type:'book',unit:'pages',total:100}},E);
 s.study.materials.at(-1).growthState={family,completed:false,collectionLedger:['keep']};
 }s.collection={items:['keep']};s.preferences={keep:true};return s;}
async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'chagok-plant-images-'));
 chrome=cp.spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});c=await connect(profile);
 const initial=JSON.stringify(legacy());await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`if(!localStorage.getItem(${JSON.stringify(D.KEY)}))localStorage.setItem(${JSON.stringify(D.KEY)},${JSON.stringify(initial)});`});
 await c.send('Page.addScriptToEvaluateOnNewDocument',{source:"window.__plantConsoleErrors=[];const originalError=console.error;console.error=(...args)=>{__plantConsoleErrors.push(args.map(String).join(' '));originalError.apply(console,args);};"});
 for(const route of ['/ai-project-01/index.html','/dist/index.html']){
  await c.send('Page.navigate',{url:origin+route});await wait("typeof plantMarkup==='function'&&!!document.querySelector('.material-card')");await c.settle();
  await check(route+' legacy load and card/detail mapping preserve stored bytes',async()=>{
   if(route.startsWith('/ai-'))assert.equal(await c.evaluate(`localStorage.getItem(${JSON.stringify(D.KEY)})`),initial);
   const rows=await c.evaluate(`(()=>{const before=JSON.stringify(dataState);const rows=dataState.study.materials.filter(m=>['flower','tree','cactus','mushroom'].includes(m.id)).map(m=>{const card=document.querySelector('[data-detail="'+m.id+'"]').closest('.material-card').querySelector('.plant-sprite').style.backgroundImage;openDetail(m.id);const detail=document.querySelector('#view-detail .plant-sprite').style.backgroundImage;return {id:m.id,card,detail};});showView('home');return {rows,unchanged:before===JSON.stringify(dataState)};})()`);
   assert.ok(rows.unchanged);for(const r of rows.rows){const species={flower:'daisy',tree:'oak',cactus:'cactus',mushroom:'hydrangea'}[r.id];assert.ok(r.detail.includes('assets/plants/'+species+'-1.png'));assert.equal(r.card,r.detail);}return rows.rows.length;
  });
  await check(route+' all forty rendered images at mobile/desktop with no crop or distortion',async()=>{
   await c.evaluate(`(()=>{document.querySelector('#plant-qa')?.remove();const grid=document.createElement('section');grid.id='plant-qa';grid.style='display:grid;grid-template-columns:repeat(5,100px);gap:4px;background:#fff8e8;padding:8px';for(const family of studyAPI.plantSpecies)for(const current of [0,20,40,80,100]){const m={id:family,name:family,total:100,round:1,current,records:[{id:'r',date:'2026-10-01',sequence:0,position:current}],growthState:{family,completed:false}};grid.insertAdjacentHTML('beforeend',plantMarkup(m));}document.body.append(grid);})()`);
   for(const width of [375,1440]){
    await c.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
    const rows=await c.evaluate(`Promise.all([...document.querySelectorAll('#plant-qa .plant-sprite')].map(async el=>{const s=getComputedStyle(el),url=s.backgroundImage.slice(5,-2),img=new Image();img.src=url;await img.decode();return {url,width:img.naturalWidth,height:img.naturalHeight,box:[el.offsetWidth,el.offsetHeight],size:s.backgroundSize,clip:s.clipPath};}))`);
    assert.equal(rows.length,40);assert.equal(new Set(rows.map(r=>r.url)).size,40);for(const r of rows){assert.equal(r.width,384);assert.equal(r.height,384);assert.equal(r.size,'contain');assert.equal(r.clip,'none');assert.equal(r.box[0],r.box[1]);assert.ok(r.url.includes('/assets/plants/'));}
   }
   if(route==='/dist/index.html'){
    const clip=await c.evaluate("(()=>{const r=document.querySelector('#plant-qa').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1};})()");
    const shot=await c.send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});fs.writeFileSync('docs/evidence/plant-images-grid.png',Buffer.from(shot.data,'base64'));
   }
   consoleErrors.push(...await c.evaluate('__plantConsoleErrors'));return {images:40,widths:[375,1440]};
  });
 }
 await check('real registration, progress, review, next round and backup roundtrip',async()=>{
  await c.evaluate(`(async()=>{for(const id of 'abcdefgh'){if(!dataState.study.materials.some(m=>m.id===id))await commitStudy({type:'material',material:{id,name:id,type:'book',unit:'pages',total:100}},'ok');}await commitStudy({type:'record',id:'a',record:{id:'qa-record',date:localToday(),position:100}},'ok');await commitStudy({type:'review',id:'a',record:{id:'qa-review',date:localToday(),start:1,end:20}},'ok');await commitStudy({type:'next-round',id:'a'},'ok');})()`);
  const result=await c.evaluate(`(()=>{const m=dataState.study.materials.find(m=>m.id==='a');const restored=studyAPI.restore(studyAPI.backup(dataState,examAPI),dataState,examAPI);const counts=studyAPI.plantSpecies.map(species=>dataState.study.materials.filter(m=>studyAPI.plantImage(m,0)==='assets/plants/'+species+'-1.png').length);return {counts,round:m.round,reviews:m.reviews.length,history:m.roundHistory[0].records.length,completed:m.growthState.completed,equal:JSON.stringify(restored)===JSON.stringify(dataState),collection:dataState.collection};})()`);
  assert.ok(result.counts.every(n=>n>0));assert.ok(Math.max(...result.counts)-Math.min(...result.counts)<=1);assert.equal(result.round,2);assert.equal(result.reviews,1);assert.equal(result.history,1);assert.ok(result.completed&&result.equal);assert.deepEqual(result.collection,{items:['keep']});return result;
 });
 await check('root Pages subdirectory worker caches all forty PNGs, offline app and storage survive',async()=>{
  await c.send('Page.navigate',{url:origin+'/ai-project-01/index.html'});await wait("typeof plantMarkup==='function'");
  await wait("navigator.serviceWorker.controller!==null");
  await c.evaluate('navigator.serviceWorker.ready');
  const paths=await c.evaluate(`(async()=>{const all=await caches.keys();const key=all.find(k=>k.includes(encodeURIComponent(location.origin+'/ai-project-01/')));const cache=await caches.open(key);return (await cache.keys()).map(r=>r.url).filter(u=>/assets\\/plants\\/.*\\.png$/.test(u));})()`);
  assert.equal(paths.length,40);const before=await c.evaluate('JSON.stringify({...localStorage})');
  await c.send('Network.enable');await c.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await c.send('Page.reload');await wait("typeof plantMarkup==='function'&&!!document.querySelector('.material-card')");
  assert.equal(await c.evaluate('JSON.stringify({...localStorage})'),before);
  assert.equal(await c.evaluate(`(async()=>{for(const species of studyAPI.plantSpecies)for(let stage=1;stage<=5;stage++){const img=new Image();img.src='assets/plants/'+species+'-'+stage+'.png';await img.decode();}return true;})()`),true);
  await c.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});return {cachedImages:paths.length,storageUnchanged:true};
 });
 consoleErrors.push(...await c.evaluate('__plantConsoleErrors'));assert.deepEqual(missing,[]);assert.deepEqual(c.errors,[]);assert.deepEqual(consoleErrors,[]);
}
run().catch(e=>{console.error(e);results.push({name:'execution',pass:false,error:e.stack});process.exitCode=1;}).finally(async()=>{fs.writeFileSync('docs/evidence/plant-images-browser-results.json',JSON.stringify({results,missing,errors:c?.errors,consoleErrors,physicalSafari:false},null,2));if(c)await c.close();if(chrome&&!chrome.killed)chrome.kill();server.close();});
