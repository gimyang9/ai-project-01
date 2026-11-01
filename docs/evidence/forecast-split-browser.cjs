const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),cp=require('child_process'),assert=require('assert/strict'),connect=require('./stage6/cdp.cjs');
const base=process.cwd(),results=[],missing=[];let c,chrome;
const server=http.createServer((req,res)=>{try{if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}const f=path.resolve(base,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(base+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.webmanifest':'application/manifest+json'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{missing.push(req.url);res.writeHead(404);res.end();}});
async function wait(expr){for(let n=0;n<150;n++){if(await c.evaluate(expr))return;await new Promise(r=>setTimeout(r,80));}throw Error('timeout '+expr);}
async function check(name,fn){const value=await fn();results.push({name,pass:true,value});console.log('PASS '+name);}
const snapshot=()=>c.evaluate('JSON.stringify({state:dataState,storage:{...localStorage},session:{...sessionStorage}})');
async function input(value){await c.evaluate(`document.querySelector('#manual-daily-amount').value=${JSON.stringify(value)};document.querySelector('#manual-daily-amount').dispatchEvent(new Event('input',{bubbles:true}));`);}
async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'chagok-forecast-split-'));
 chrome=cp.spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});c=await connect(profile);
 await c.send('Page.addScriptToEvaluateOnNewDocument',{source:"window.__qaErrors=[];const old=console.error;console.error=(...a)=>{__qaErrors.push(a.map(String).join(' '));old.apply(console,a);};"});
 for(const route of ['/index.html','/dist/index.html']){
  await c.send('Page.navigate',{url:origin+route});await wait("typeof LearningPlan!=='undefined'&&typeof LearningPlan.preview==='function'&&typeof commitStudy==='function'");await c.evaluate("document.querySelector('#toast').style.visibility='hidden'");
  if(route==='/index.html')await c.evaluate(`(async()=>{
   for(const [id,targetDate,manual] of [['m',LearningPlan.shift(localToday(),11),null],['none','',null],['manual','',10],['paused','',10],['round',LearningPlan.shift(localToday(),11),null],['complete','',null]]){
    await commitStudy({type:'material',material:{id,name:id==='m'?'운영체제 기본서 · 긴 자료명 학습 계획 확인':id,type:'book',unit:'페이지',total:100,targetDate}},'ok');if(manual)await commitStudy({type:'plan',id,amount:manual},'ok');
   }
   await commitStudy({type:'record',id:'m',record:{id:'r',date:LearningPlan.shift(localToday(),-6),position:20,understanding:'어려움'}},'ok');
   await commitStudy({type:'record',id:'round',record:{id:'round-old',date:LearningPlan.shift(localToday(),-30),position:100}},'ok');await commitStudy({type:'next-round',id:'round'},'ok');await commitStudy({type:'record',id:'round',record:{id:'round-new',date:localToday(),position:1}},'ok');
   await commitExam({type:'material-status',id:'paused',status:'paused'},'ok');
   await commitStudy({type:'record',id:'complete',record:{id:'done',date:localToday(),position:100}},'ok');
  })()`);
  await check(route+' auto plan exists before seven days, actual uses only current round, no-goal/manual/pause states',async()=>{
   const values=await c.evaluate(`currentPlans().map(p=>({id:p.id,plan:p.planForecast,actual:p.actualForecast,deadline:p.deadline}))`);
   const main=values.find(p=>p.id==='m');assert.equal(main.actual.reason,'estimated');assert.notEqual(main.plan.date,main.actual.date);assert.ok(main.plan.date<=main.deadline);assert.equal(values.find(p=>p.id==='complete').plan.reason,'completed');assert.equal(values.find(p=>p.id==='complete').actual.reason,'completed');
   assert.equal(values.find(p=>p.id==='round').actual.reason,'insufficient');assert.equal(values.find(p=>p.id==='round').actual.window,0);assert.equal(values.find(p=>p.id==='round').plan.reason,'estimated');
   assert.equal(values.find(p=>p.id==='none').plan.reason,'missing-deadline');assert.equal(values.find(p=>p.id==='manual').plan.reason,'estimated');assert.equal(values.find(p=>p.id==='paused').plan.reason,'paused');return values;
  });
  await check(route+' live numeric/automatic/invalid previews never save; cancel restores saved setting',async()=>{
   await c.evaluate("openDialog('study-plan','m')");const before=await snapshot(),dates=[];
   for(const value of ['10','20','1','']){await input(value);const result=await c.evaluate("({text:document.querySelector('#plan-preview').textContent,date:LearningPlan.preview(dataState,'m',document.querySelector('#manual-daily-amount').value?Number(document.querySelector('#manual-daily-amount').value):null,localToday(),studyAPI,examAPI).planForecast.date})");dates.push(result.date);assert.ok(result.text.includes(result.date.replaceAll('-','.')));if(value==='1')assert.ok(result.text.includes('늦게'));assert.equal(await snapshot(),before);}
   assert.notEqual(dates[0],dates[1]);
   for(const value of ['0','1.5','9007199254740992']){await input(value);assert.ok(await c.evaluate("document.querySelector('#plan-preview').textContent.includes('1 이상의 정수')"));await c.evaluate("document.querySelector('[data-study-form=plan]').requestSubmit()");assert.equal(await snapshot(),before);assert.equal(await c.evaluate('dialog.open'),true);}
   await input('20');assert.equal(await c.evaluate("(async()=>{const old=appStorage;appStorage={getItem:old.getItem.bind(old),setItem(){throw Error('quota');}};try{return await commitStudy({type:'plan',id:'m',amount:20},'ok');}finally{appStorage=old;}})()"),false);assert.equal(await snapshot(),before);
   await c.evaluate("document.querySelector('[data-close]').click()");await wait('!dialog.open');assert.equal(await snapshot(),before);return {dates};
  });
  await check(route+' saving matches preview and survives reload, clearing switches back to an automatic plan',async()=>{
   await c.evaluate("openDialog('study-plan','m')");await input('20');const preview=await c.evaluate("LearningPlan.preview(dataState,'m',20,localToday(),studyAPI,examAPI).planForecast.date"),original=await c.evaluate("JSON.stringify({records:dataState.study.materials[0].records,history:dataState.study.materials[0].roundHistory,exams:dataState.exams})");
   await c.evaluate("document.querySelector('[data-study-form=plan]').requestSubmit()");await wait('!dialog.open');assert.equal(await c.evaluate("currentPlans().find(p=>p.id==='m').planForecast.date"),preview);
   await c.send('Page.reload');await wait("typeof currentPlans==='function'&&dataState.study.materials.length>0");assert.equal(await c.evaluate('dataState.study.materials[0].manualDailyAmount'),20);
   await c.evaluate("openDialog('study-plan','m')");await input('');await c.evaluate("document.querySelector('[data-study-form=plan]').requestSubmit()");await wait('!dialog.open');
   assert.equal(await c.evaluate("currentPlans().find(p=>p.id==='m').planForecast.basis"),'automatic');assert.equal(await c.evaluate("JSON.stringify({records:dataState.study.materials[0].records,history:dataState.study.materials[0].roundHistory,exams:dataState.exams})"),original);return {preview};
  });
  await check(route+' home/detail/modal/statistics at mobile and desktop: one planned date on home, three distinct meanings in stats',async()=>{
   for(const width of [320,375,768,1440]){
    await c.send('Emulation.setDeviceMetricsOverride',{width,height:700,deviceScaleFactor:1,mobile:false});
    await c.evaluate("showView('home');renderToday();document.querySelector('#toast').style.visibility='hidden'");await c.settle();
    assert.equal(await c.evaluate("[...document.querySelectorAll('.today-task')].every(el=>el.scrollWidth<=el.clientWidth)"),true);assert.equal(await c.evaluate('document.documentElement.scrollWidth>innerWidth'),false);
    assert.equal(await c.evaluate("document.querySelector('#today-list').textContent.includes('현재 속도 예상 완료일')"),false);assert.ok(await c.evaluate("document.querySelector('#today-list').textContent.includes('계획한 학습량 기준')"));
    if(route==='/index.html'&&width===375){const shot=await c.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('docs/evidence/forecast-split-home-375.png',Buffer.from(shot.data,'base64'));}
    await c.evaluate("openDetail('m');renderDetailTab('basic')");assert.equal(await c.evaluate("document.querySelector('.plan-compact').scrollWidth>document.querySelector('.plan-compact').clientWidth"),false);
    await c.evaluate("openDialog('study-plan','m')");await input('10');assert.equal(await c.evaluate('dialog.scrollWidth>dialog.clientWidth'),false);await c.evaluate("document.querySelector('[type=submit]').scrollIntoView({block:'nearest'})");assert.ok(await c.evaluate("document.querySelector('[type=submit]').getBoundingClientRect().bottom<=innerHeight"));
    if(route==='/index.html'&&width===375){const shot=await c.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('docs/evidence/forecast-split-preview-375.png',Buffer.from(shot.data,'base64'));}
    await c.evaluate("document.querySelector('[data-close]').click();showView('stats');renderStats('month')");await wait('!dialog.open');
    const text=await c.evaluate("document.querySelector('#stats-forecast').textContent");for(const label of ['현재 속도 예상 완료일','계획상 예상 완료일','목표 완료일'])assert.ok(text.includes(label));assert.equal(await c.evaluate('document.documentElement.scrollWidth>innerWidth'),false);
    if(route==='/index.html'&&width===375){await c.evaluate("document.querySelector('.speed-panel').scrollIntoView({block:'start',behavior:'instant'})");await c.settle();const shot=await c.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('docs/evidence/forecast-split-stats-375.png',Buffer.from(shot.data,'base64'));}
   }return {widths:[320,375,768,1440]};
  });
  await check(route+' rest days, no eligible weekdays, completion and backup are consistent without losing old rounds',async()=>{
   await c.evaluate(`(async()=>{await commitExam({type:'upsert',goal:{id:'g',name:'시험',date:LearningPlan.shift(localToday(),20),status:'active',note:'',materialIds:['m'],learningDays:[0,2,4],daysOff:[localToday()],focusMode:'auto',focusDate:'',continuedMaterialIds:[]}},'ok');})()`);
   const rest=await c.evaluate("currentPlans().find(p=>p.id==='m')");assert.equal(rest.amount,0);assert.ok(rest.planForecast.date);assert.equal(await c.evaluate("LearningPlan.allowed(currentPlans().find(p=>p.id==='m').planForecast.date,dataState.exams.goals[0])"),true);
   await c.evaluate("commitExam({type:'upsert',goal:{...dataState.exams.goals[0],learningDays:[]}},'ok')");await wait('dataState.exams.goals[0].learningDays.length===0');assert.equal(await c.evaluate("currentPlans().find(p=>p.id==='m').planForecast.reason"),'no-learning-days');
   await c.evaluate("commitExam({type:'delete',id:'g'},'ok')");await wait('dataState.exams.goals.length===0');
   const before=await snapshot();assert.equal(await c.evaluate("JSON.stringify(studyAPI.restore(studyAPI.backup(dataState,examAPI),dataState,examAPI))===JSON.stringify(dataState)"),true);assert.equal(await snapshot(),before);return {restDate:rest.planForecast.date};
  });
  assert.deepEqual(await c.evaluate('__qaErrors'),[]);
 }
 assert.deepEqual(missing,[]);assert.deepEqual(c.errors,[]);
}
run().catch(e=>{console.error(e);results.push({pass:false,error:e.stack});process.exitCode=1;}).finally(async()=>{fs.writeFileSync('docs/evidence/forecast-split-browser-results.json',JSON.stringify({results,missing,errors:c?.errors,physicalSafari:false},null,2));if(c)await c.close();if(chrome&&!chrome.killed)chrome.kill();server.close();});
