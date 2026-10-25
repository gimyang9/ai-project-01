const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),connect=require('./cdp.cjs');
(async()=>{
 const dir=path.join(process.cwd(),'docs/evidence/banner-camera-applied'),root=path.join(process.cwd(),'dist'),prefix='/project-v2-upload/',today='2026-10-26';
 const legacy={version:1,recordSequence:5,materials:[{id:'legacy',name:'이전 자료 · 통합 점검',type:'book',unit:'페이지',total:100,current:50,round:2,note:'이전 메모',records:[{id:'old-r1',date:'2026-10-01',position:20,sequence:2},{id:'old-r2',date:'2026-10-02',position:50,sequence:3}],roundHistory:[{round:1,total:100,unit:'페이지',completedDate:'2026-09-01',records:[{id:'old-h1',date:'2026-09-01',position:100,sequence:0,custom:'keep'}]}],reviews:[{id:'old-v1',date:'2026-10-03',start:10,end:30,total:100,unit:'페이지',sequence:4}],custom:{keep:true}}]};
 const raw=JSON.stringify(legacy),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2'},requests=[];
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
  const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length))||'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(file));requests.push({path:url.pathname,status:200});}catch{res.writeHead(404);res.end();requests.push({path:url.pathname,status:404});}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+prefix,c=await connect(process.argv[2]);let second;
 const fixed="(()=>{const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[(window.__auditClock||'2026-10-26T12:00:00+09:00')]));}static now(){return new NativeDate((window.__auditClock||'2026-10-26T12:00:00+09:00')).getTime();}};})()";
 const wait=async(ctx,expr)=>{for(let i=0;i<120;i++){if(await ctx.evaluate(expr))return;await new Promise(r=>setTimeout(r,80));}throw Error('Wait failed: '+expr);};
 const capture=async name=>{await c.send('Page.bringToFront');await c.settle();const image=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(image.data,'base64'));};
 const submit=async selector=>{console.log('submit',selector);await c.evaluate("document.querySelector("+JSON.stringify(selector)+").requestSubmit()");await wait(c,'!saveGuard.busy&&!dialog.open');};
 const commit=async expression=>{console.log('commit',expression.slice(0,80));const ok=await c.evaluate('Promise.resolve('+expression+')');assert.equal(ok,true);};
 try{
  await c.send('Page.addScriptToEvaluateOnNewDocument',{source:fixed+";if(!localStorage.getItem('study-progress-data-v1'))localStorage.setItem('study-progress-data-v1',"+JSON.stringify(raw)+");"});
  await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:840,deviceScaleFactor:1,mobile:true});await c.send('Page.navigate',{url:base+'index.html'});
  await wait(c,"typeof saveGuard!=='undefined'&&typeof currentReviews==='function'&&document.readyState==='complete'");await c.settle();
  assert.equal(await c.evaluate("localStorage.getItem(studyAPI.LEGACY_KEY)"),raw);
  const migrated=await c.evaluate("JSON.parse(JSON.stringify(dataState.study))");assert.deepEqual(migrated,legacy);console.log('migration passed');


  const modalChecks=[];
  for(const [width,height] of [[390,840],[1440,900],[390,400]]){
   await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
   await c.evaluate("openDialog('study-plan','legacy')");
   const metrics=await c.evaluate("(()=>{const d=document.querySelector('.app-dialog.study-plan-dialog'),s=getComputedStyle(d),r=d.getBoundingClientRect();return {height:r.height,top:r.top,bottom:r.bottom,maxHeight:s.maxHeight,overflowY:s.overflowY,minHeight:s.minHeight,padding:s.padding,viewport:innerHeight,scrollHeight:d.scrollHeight,clientHeight:d.clientHeight};})()");
   assert.equal(metrics.overflowY,'auto');assert.equal(metrics.minHeight,'0px');assert.equal(metrics.padding,'20px');
   assert.ok(metrics.height<=height-28+1);assert.ok(metrics.top>=0&&metrics.bottom<=height+1);
   if(height===400)assert.ok(metrics.scrollHeight>=metrics.clientHeight);
   modalChecks.push({width,height,...metrics});await capture('study-plan-'+width+'x'+height);
   await c.evaluate('dialog.close()');
  }
  fs.writeFileSync(path.join(dir,'modal-browser-results.json'),JSON.stringify(modalChecks,null,2));
  await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:840,deviceScaleFactor:1,mobile:true});
  await c.evaluate("openDialog('memo','legacy');document.getElementById('material-note').value='day-rollover-input'");
  const dayRaw=await c.evaluate('localStorage.getItem(studyAPI.KEY)');
  await c.evaluate("window.__auditClock='2026-10-27T12:00:00+09:00';window.dispatchEvent(new Event('focus'))");
  assert.ok((await c.evaluate("document.getElementById('home-date').textContent")).includes('27'));
  assert.equal(await c.evaluate("document.getElementById('material-note').value"),'day-rollover-input');assert.equal(await c.evaluate('dialog.open'),true);assert.equal(await c.evaluate('localStorage.getItem(studyAPI.KEY)'),dayRaw);
  await capture('date-refresh-preserves-form-390');
  await c.evaluate("window.__auditClock='2026-10-26T12:00:00+09:00';refreshForDayChange();scheduleDayRefresh();dialog.close()");

  await c.evaluate("openDialog('material');document.getElementById('material-name').value='추가 강의';document.getElementById('material-type').value='lecture';document.getElementById('material-type').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('material-unit').value='강';document.getElementById('material-total').value='20'");
  await submit('[data-study-form="material"]');const extra=await c.evaluate("dataState.study.materials.find(m=>m.id!=='legacy').id");
  await c.evaluate("openExamDialog('edit');document.getElementById('goal-name').value='통합 시험';document.getElementById('goal-date').value='2026-11-10';document.querySelectorAll('[name=\"goal-material\"]').forEach(i=>i.checked=true)");
  await submit('[data-exam-form]');const goalId=await c.evaluate('dataState.exams.goals[0].id');assert.equal(await c.evaluate('dataState.exams.goals[0].materialIds.length'),2);
  await commit("commitExam({type:'upsert',goal:{id:'undated',name:'날짜 없는 시험',date:'',status:'active',note:'',materialIds:['legacy'],learningDays:[0,1,2,3,4,5,6],daysOff:[],focusMode:'auto',focusDate:'',continuedMaterialIds:[]}},'검증')");
  await commit("commitExam({type:'status',id:"+JSON.stringify(goalId)+",status:'paused',continuedMaterialIds:[]},'검증')");
  assert.equal(await c.evaluate("examAPI.materialStatus(examState,'legacy')"),'active');assert.equal(await c.evaluate("examAPI.materialStatus(examState,"+JSON.stringify(extra)+")"),'paused');
  await commit("commitExam({type:'status',id:"+JSON.stringify(goalId)+",status:'active',continuedMaterialIds:[]},'검증')");
  await c.evaluate("openDialog('record','legacy');document.getElementById('study-position').value='100';document.querySelectorAll('[data-choice-group=\"understanding\"] button')[1].click()");
  await submit('[data-study-form="record"]');
  await c.evaluate("openDialog('review','legacy');document.getElementById('review-from').value='20';document.getElementById('review-to').value='50';document.querySelectorAll('[data-choice-group=\"understanding\"] button')[2].click()");
  await submit('[data-study-form="review"]');
  assert.equal(await c.evaluate("dataState.study.materials[0].reviews.length"),2);
  assert.equal(await c.evaluate("dataState.study.materials[0].reviews[0].id"),'old-v1');
  await c.evaluate("openDialog('next-round','legacy')");await submit('[data-study-form="next-round"]');assert.equal(await c.evaluate('dataState.study.materials[0].round'),3);
  await commit("commitStudy({type:'archive',id:'legacy',archived:true},'검증')");await commit("commitStudy({type:'archive',id:'legacy',archived:false},'검증')");
  const screens=[];
  for(const width of [320,390,768,1023,1024,1440]){
   await c.send('Emulation.setDeviceMetricsOverride',{width,height:840,deviceScaleFactor:1,mobile:width<681});
   await c.evaluate("showView('stats');window.scrollTo({top:0,behavior:'instant'})");await c.settle();
   const info=await c.evaluate("({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,summary:document.getElementById('stats-summary').textContent})");assert.equal(info.overflow,false);screens.push(info);await capture('final-stats-'+width);
  }
  await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:840,deviceScaleFactor:1,mobile:true});
  await c.evaluate("openDialog('settings')");const downloads=fs.mkdtempSync(path.join(dir,'downloads-'));await c.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});await c.evaluate("document.querySelector('[data-backup]').click()");
  let file;for(let i=0;i<100;i++){file=fs.readdirSync(downloads).find(f=>f.endsWith('.json'));if(file)break;await new Promise(r=>setTimeout(r,80));}assert.ok(file);file=path.join(downloads,file);const backup=JSON.parse(fs.readFileSync(file,'utf8'));
  await c.evaluate("openDialog('reset')");await submit('[data-study-form="reset"]');assert.equal(await c.evaluate('dataState.study.materials.length'),0);assert.equal(await c.evaluate("localStorage.getItem(studyAPI.LEGACY_KEY)"),raw);
  await c.send('Page.reload');await wait(c,"typeof currentReviews==='function'&&document.readyState==='complete'");assert.equal(await c.evaluate('dataState.study.materials.length'),0);
  await c.evaluate("openDialog('settings')");const doc=await c.send('DOM.getDocument'),input=await c.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#restore-file'});await c.send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[file]});await wait(c,'pendingRestore!==null');await submit('[data-study-form="restore"]');
  assert.deepEqual(await c.evaluate("JSON.parse(JSON.stringify(dataState))"),backup.data);

  await c.send('Network.enable');await c.evaluate("navigator.serviceWorker.ready.then(()=>true)");await wait(c,'!!navigator.serviceWorker.controller');
  await c.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  let origin=await c.evaluate('performance.timeOrigin');await c.send('Page.reload');await wait(c,"performance.timeOrigin!=="+origin+"&&typeof saveGuard!=='undefined'&&document.readyState==='complete'");await c.settle();
  assert.equal(await c.evaluate("[...document.images].every(i=>i.complete&&i.naturalWidth>0)"),true);
  assert.equal(await c.evaluate("getComputedStyle(document.querySelector('.forest-banner'),'::before').display"),'block');
  await commit("commitStudy({type:'note',id:'legacy',note:'오프라인 저장 확인'},'검증')");
  origin=await c.evaluate('performance.timeOrigin');await c.send('Page.reload');await wait(c,"performance.timeOrigin!=="+origin+"&&typeof saveGuard!=='undefined'&&document.readyState==='complete'");
  assert.equal(await c.evaluate('dataState.study.materials[0].note'),'오프라인 저장 확인');
  await c.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});

  const target=await c.send('Target.createTarget',{url:'about:blank'});second=await connect(process.argv[2],target.targetId);
  await second.send('Page.addScriptToEvaluateOnNewDocument',{source:fixed});await second.send('Page.navigate',{url:base+'index.html'});await wait(second,"typeof saveGuard!=='undefined'&&document.readyState==='complete'");
  await c.evaluate("openDialog('memo','legacy');document.getElementById('material-note').value='복사할 미저장 입력'");
  assert.equal(await second.evaluate("Promise.resolve(commitStudy({type:'note',id:'legacy',note:'다른 창에서 저장'},'검증'))"),true);
  await wait(c,'storageConflict===true');assert.equal(await c.evaluate("document.getElementById('material-note').value"),'복사할 미저장 입력');assert.equal(await c.evaluate('dialog.open'),true);
  await c.evaluate("document.querySelector('[data-study-form=\"memo\"]').requestSubmit()");assert.equal(await c.evaluate("JSON.parse(localStorage.getItem(studyAPI.KEY)).study.materials[0].note"),'다른 창에서 저장');assert.equal(await c.evaluate('dialog.open'),true);
  assert.ok((await c.evaluate("document.getElementById('storage-conflict-notice').textContent")).includes('새로고침하면'));await capture('conflict-preserves-input-390');
  await c.send('Page.reload');await wait(c,"typeof saveGuard!=='undefined'&&document.readyState==='complete'");
  const race=await Promise.all([
   c.evaluate("Promise.resolve(commitStudy({type:'material',material:{id:'race-a',name:'Race A',type:'book',unit:'pages',total:20}},'검증'))"),
   second.evaluate("Promise.resolve(commitStudy({type:'material',material:{id:'race-b',name:'Race B',type:'book',unit:'pages',total:20}},'검증'))")
  ]);
  assert.equal(race.filter(Boolean).length,1);
  const losing=race[0]?second:c,losingId=race[0]?'race-b':'race-a';await losing.send('Page.reload');await wait(losing,"typeof saveGuard!=='undefined'&&document.readyState==='complete'");
  assert.equal(await losing.evaluate("Promise.resolve(commitStudy({type:'material',material:{id:"+JSON.stringify(losingId)+",name:'Retry',type:'book',unit:'pages',total:20}},'검증'))"),true);
  const ids=await losing.evaluate("JSON.parse(localStorage.getItem(studyAPI.KEY)).study.materials.map(m=>m.id)");assert.ok(ids.includes('race-a')&&ids.includes('race-b'));assert.equal(await losing.evaluate("localStorage.getItem(studyAPI.LEGACY_KEY)"),raw);
  assert.deepEqual(c.errors,[]);assert.deepEqual(second.errors,[]);assert.ok(!requests.some(r=>r.status===404));
  fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify({scope:'Chrome isolated synthetic legacy data; fixed date 2026-10-26; project subpath',legacyBytesPreserved:true,roundHistoryPreserved:true,workflow:['migration','material registration form','exam registration form','shared material pause/resume','progress/review forms','next round','archive/unarchive','actual statistics','backup download','reset','reload','file picker restore','two-window conflict','simultaneous saves and retry'],screens,backupRoundTripExact:true,dayRefresh:{headerUpdated:true,inputPreserved:true,modalPreserved:true,storageUnchanged:true},offlineAfterCorrections:{actualReload:true,imagesLoaded:true,save:true,secondReload:true},conflict:{inputPreserved:true,modalPreserved:true,refreshWarning:true,newerDataPreserved:true,simultaneousResults:race,retryRetainsBoth:true,webLocks:await losing.evaluate('!!navigator.locks')},errors:[],missingAssets:[]},null,2));console.log('Synthetic legacy full flow, 6 viewports, exact backup restore, two real tabs, Web Locks conflict and retry passed.');
 }finally{await c.close();if(second)await second.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
