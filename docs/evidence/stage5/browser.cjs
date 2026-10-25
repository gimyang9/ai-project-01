const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),connect=require('./cdp.cjs');
const D=require('../../../dist/study-data.js'),E=require('../../../dist/exam-management.js'),L=require('../../../dist/learning-plan.js');
(async()=>{
const dir=path.join(process.cwd(),'docs/evidence/stage5'),root=path.join(process.cwd(),'dist'),prefix='/project-v2-upload/',today='2026-10-25';
let state=D.envelope(D.emptyStudy(),D.emptyExams());const update=a=>state=D.update(state,{today,...a},E);
for(const m of [{id:'m',name:'네트워크 · 실제 통계 자료',type:'book',unit:'페이지',total:100},{id:'l',name:'운영체제 강의',type:'lecture',unit:'강',total:10},{id:'v',name:'보관한 단어장',type:'vocabulary',unit:'단어',total:50}])update({type:'material',material:m});
for(const [id,date,position] of [['a',-25,20],['b',-5,40],['c',0,60]])update({type:'record',id:'m',record:{id,date:L.shift(today,date),position,understanding:'보통'}});
update({type:'review',id:'m',record:{id:'rev',date:L.shift(today,-1),start:1,end:20,understanding:'어려움'}});
update({type:'record',id:'l',record:{id:'lc',date:L.shift(today,-40),position:10}});update({type:'next-round',id:'l'});update({type:'record',id:'l',record:{id:'ln',date:L.shift(today,-1),position:3}});
update({type:'record',id:'v',record:{id:'vr',date:L.shift(today,-70),position:20}});update({type:'archive',id:'v',archived:true});
update({type:'review-date',id:'m',start:41,end:50,date:L.shift(today,3)});
for(const [id,materialIds] of [['exam1',['m','l']],['exam2',['m']]])state.exams=E.update(state.exams,{type:'upsert',goal:{id,name:id==='exam1'?'연결된 시험 하나':'다른 시험',date:L.shift(today,10),status:'active',note:'',materialIds,learningDays:[0,1,2,3,4,5,6],daysOff:[],focusMode:'manual',focusDate:today,continuedMaterialIds:[]}});
let updateWorker=false;const requests=[],mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
 let rel=decodeURIComponent(url.pathname.slice(prefix.length))||'index.html',file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{let body=fs.readFileSync(file);if(rel==='service-worker.js'&&updateWorker)body=Buffer.from(body.toString().replace(/const REVISION="[^"]+";/,'const REVISION="synthetic-update-v2";'));
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);requests.push({path:url.pathname,status:200});
 }catch{res.writeHead(404);res.end();requests.push({path:url.pathname,status:404});}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,base=origin+prefix,c=await connect(process.argv[2]);
const wait=async expr=>{for(let i=0;i<120;i++){const v=await c.evaluate(expr);if(v)return v;await new Promise(r=>setTimeout(r,100));}throw Error('Wait failed: '+expr);};
const shot=async name=>{await c.settle();const s=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(s.data,'base64'));};
try{
await c.send('Network.enable');await c.send('Page.addScriptToEvaluateOnNewDocument',{source:"(()=>{const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-10-25T12:00:00+09:00']));}static now(){return new NativeDate('2026-10-25T12:00:00+09:00').getTime();}};})()"});await c.send('Page.addScriptToEvaluateOnNewDocument',{source:"if(location.origin==="+JSON.stringify(origin)+"&&!localStorage.getItem("+JSON.stringify(D.KEY)+"))localStorage.setItem("+JSON.stringify(D.KEY)+","+JSON.stringify(JSON.stringify(state))+");"});
await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:840,deviceScaleFactor:1,mobile:true});
await c.send('Page.navigate',{url:base+'index.html#stats'});await wait("typeof StudyStats!=='undefined'&&typeof currentReviews==='function'&&document.readyState==='complete'");await c.settle();
assert.equal(await c.evaluate('localToday()'),today);
const counts=await c.evaluate("({week:StudyStats.summarize(dataState,localToday(),'week',studyAPI,LearningPlan),plant:dataState.study.materials[1].growthState})");
assert.equal(counts.week.study,3);assert.equal(counts.week.review,1);assert.equal(counts.plant.completed,true);
await c.evaluate("navigator.serviceWorker.ready.then(()=>true)");await wait('!!navigator.serviceWorker.controller');
const sw=await c.evaluate("(async()=>({scope:(await navigator.serviceWorker.getRegistration()).scope,caches:await caches.keys(),manifest:document.querySelector('link[rel=manifest]').href}))()");
const appManifest=await c.send('Page.getAppManifest');assert.deepEqual(appManifest.errors,[]);let installability=null;try{installability=await c.send('Page.getInstallabilityErrors');}catch(error){installability={unsupported:error.message};}
assert.equal(sw.scope,base);assert.ok(sw.caches.some(k=>k.startsWith('chagok-v2-shell:')));
const screens=[];
for(const width of [320,390,768,1024,1440]){
 await c.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<681});await c.evaluate("showView('stats');window.scrollTo(0,0)");await c.settle();
 const info=await c.evaluate("({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,summary:document.getElementById('stats-summary').textContent,shares:document.getElementById('stats-proportions').textContent})");
 assert.equal(info.overflow,false);assert.ok(info.shares.includes('66.7%'));await shot('stats-'+width);screens.push(info);
}
for(const period of ['month','quarter','half']){await c.evaluate("document.querySelector('[data-period="+period+"]').click()");const n=await c.evaluate("document.getElementById('stats-summary').textContent");assert.ok(n.includes(period==='month'?'3':'6'));}
await c.evaluate("document.getElementById('stats-group').value='material';document.getElementById('stats-group').dispatchEvent(new Event('change',{bubbles:true}))");
assert.ok((await c.evaluate("document.getElementById('stats-proportions').textContent")).includes('保管')===false); // Korean fixture names checked below.
assert.ok((await c.evaluate("document.getElementById('stats-proportions').textContent")).includes('보관한 단어장'));
await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:840,deviceScaleFactor:1,mobile:true});
await c.evaluate("document.getElementById('weekly-summary').scrollIntoView({block:'center',behavior:'instant'})");await shot('stats-details-390');
await c.evaluate("document.querySelector('[data-day=\"25\"]').click()");await c.settle();assert.ok((await c.evaluate("document.getElementById('dialog-content').textContent")).includes('네트워크'));await shot('calendar-completed-390');
await c.evaluate("dialog.close();document.querySelector('[data-day=\"28\"]').click()");assert.ok((await c.evaluate("document.getElementById('dialog-content').textContent")).includes('복습 예정'));await shot('calendar-planned-390');
await c.evaluate("dialog.close();showView('home');openDialog('settings')");
const downloads=path.join(dir,'downloads');fs.mkdirSync(downloads,{recursive:true});await c.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
await c.evaluate("document.querySelector('[data-backup]').click()");
let backupPath;for(let i=0;i<100;i++){backupPath=fs.readdirSync(downloads).filter(f=>f.endsWith('.json')).map(f=>path.join(downloads,f))[0];if(backupPath)break;await new Promise(r=>setTimeout(r,100));}assert.ok(backupPath);
const backup=JSON.parse(fs.readFileSync(backupPath,'utf8'));assert.equal(backup.data.study.materials[1].growthState.completed,true);
await c.evaluate("dialog.close();openDialog('material','m',true);document.getElementById('material-name').value='저장 전 입력 유지'");
updateWorker=true;await c.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>true)");await wait("navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)");
assert.equal(await c.evaluate("document.getElementById('material-name').value"),'저장 전 입력 유지');assert.equal(await c.evaluate('dialog.open'),true);
await c.evaluate('dialog.close()');
await c.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
await c.send('Page.reload');await wait("typeof currentReviews==='function'&&document.readyState==='complete'");await c.settle();
assert.equal(await c.evaluate("[...document.images].every(i=>i.complete&&i.naturalWidth>0)"),true);
assert.equal(await c.evaluate("dataState.study.materials[1].growthState.completed"),true);
await c.evaluate("openDialog('record','m');document.getElementById('study-position').value='65';document.querySelector('[data-study-form=\"record\"]').requestSubmit()");
assert.equal(await c.evaluate("studyAPI.project(dataState.study.materials[0]).current"),65);await shot('offline-home-390');
await c.send('Page.reload');await wait("typeof currentReviews==='function'&&document.readyState==='complete'");
assert.equal(await c.evaluate("studyAPI.project(dataState.study.materials[0]).current"),65);
await c.evaluate("openDialog('settings')");
const doc=await c.send('DOM.getDocument'),input=await c.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#restore-file'});await c.send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[backupPath]});await wait("pendingRestore!==null");
assert.equal(await c.evaluate("studyAPI.project(dataState.study.materials[0]).current"),65);
await c.evaluate("document.querySelector('[data-study-form=\"restore\"]').requestSubmit()");
assert.equal(await c.evaluate("studyAPI.project(dataState.study.materials[0]).current"),60);
assert.equal(await c.evaluate("dataState.study.materials[1].growthState.completed"),true);
assert.equal(await c.evaluate("localStorage.getItem(studyAPI.LEGACY_KEY)"),null);
assert.deepEqual(c.errors,[]);assert.ok(!requests.some(r=>r.status===404));
fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify({browser:'Chrome CDP synthetic data, clock fixed to 2026-10-25, loopback project subdirectory; not iPhone Safari',screens,counts:{study:counts.week.study,review:counts.week.review},serviceWorker:sw,manifest:{url:appManifest.url,errors:appManifest.errors,installability},offline:{reload:true,save:true,secondReload:true,allDisplayedImagesLoaded:true},backup:{download:true,filePicker:true,confirmation:true,restore:true},updateWaitsWithoutReplacingOpenForm:true,errors:c.errors,missing:requests.filter(r=>r.status===404)},null,2));console.log('5 widths, real stats/calendar, PWA subpath, offline save/reload, update waiting, backup file selection/restore passed.');
}finally{await c.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
