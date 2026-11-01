const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),cp=require('child_process'),assert=require('assert/strict'),connect=require('./stage6/cdp.cjs');
const base=process.cwd(),results=[],missing=[];let c,chrome;
const server=http.createServer((req,res)=>{try{if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}const f=path.resolve(base,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(base+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.webmanifest':'application/manifest+json'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{missing.push(req.url);res.writeHead(404);res.end();}});
async function wait(expr){for(let n=0;n<150;n++){if(await c.evaluate(expr))return;await new Promise(r=>setTimeout(r,80));}throw Error('timeout '+expr);}
async function setAmount(value){await c.evaluate(`openDialog('study-plan','m');document.querySelector('#manual-daily-amount').value=${JSON.stringify(value)};document.querySelector('[data-study-form="plan"]').requestSubmit();`);await wait('!dialog.open');}
async function check(name,fn){const value=await fn();results.push({name,pass:true,value});console.log('PASS '+name);}
async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'chagok-manual-forecast-'));
 chrome=cp.spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});c=await connect(profile);
 await c.send('Page.addScriptToEvaluateOnNewDocument',{source:"window.__qaErrors=[];const old=console.error;console.error=(...a)=>{__qaErrors.push(a.map(String).join(' '));old.apply(console,a);};"});
 for(const route of ['/index.html','/dist/index.html']){
  await c.send('Page.navigate',{url:origin+route});await wait("typeof commitStudy==='function'");
  if(route==='/index.html')await c.evaluate(`(async()=>{await commitStudy({type:'material',material:{id:'m',name:'계획 예상일',type:'book',unit:'페이지',total:100,targetDate:'2026-11-30'}},'ok');await commitStudy({type:'record',id:'m',record:{id:'r',date:LearningPlan.shift(localToday(),-7),position:20,understanding:'어려움'}},'ok');})()`);
  await c.evaluate("openDetail('m');renderDetailTab('basic');renderStats('month')");
  const original=await c.evaluate("JSON.stringify({records:dataState.study.materials[0].records,reviews:dataState.study.materials[0].reviews,history:dataState.study.materials[0].roundHistory,exams:dataState.exams})");
  const actual=await c.evaluate("currentPlans()[0].actualForecast.date"),stats=await c.evaluate("document.querySelector('#stats-forecast').textContent");
  await check(route+' manual form 10 then 20 refreshes card immediately; actual statistics remain unchanged',async()=>{
   await setAmount('10');await c.evaluate("openDetail('m');renderDetailTab('basic');renderStats('month')");const ten=await c.evaluate('currentPlans()[0].forecast.date');assert.equal(ten,await c.evaluate('LearningPlan.shift(localToday(),7)'));assert.ok(await c.evaluate("document.querySelector('.plan-metrics').textContent.includes(currentPlans()[0].forecast.date.replaceAll('-','.'))"));
   await setAmount('20');await c.evaluate("openDetail('m');renderDetailTab('basic');renderStats('month')");const twenty=await c.evaluate('currentPlans()[0].forecast.date');assert.equal(twenty,await c.evaluate('LearningPlan.shift(localToday(),3)'));assert.notEqual(ten,twenty);assert.equal(await c.evaluate("document.querySelector('#stats-forecast').textContent"),stats);
   for(const width of [375,1440]){await c.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});assert.equal(await c.evaluate('document.documentElement.scrollWidth>innerWidth'),false);}return {ten,twenty,actual};
  });
  await check(route+' reload retains manual setting, clearing form restores actual estimate and original history',async()=>{
   await c.send('Page.reload');await wait("typeof currentPlans==='function'&&dataState.study.materials.length>0");assert.equal(await c.evaluate('currentPlans()[0].manualDailyAmount'),20);
   await setAmount('');assert.equal(await c.evaluate('currentPlans()[0].manualDailyAmount'),null);assert.equal(await c.evaluate('currentPlans()[0].forecast.date'),actual);
   assert.equal(await c.evaluate("JSON.stringify({records:dataState.study.materials[0].records,reviews:dataState.study.materials[0].reviews,history:dataState.study.materials[0].roundHistory,exams:dataState.exams})"),original);return true;
  });
  await check(route+' configured weekdays/rest dates and no available weekdays',async()=>{
   await c.evaluate(`(async()=>{await commitExam({type:'upsert',goal:{id:'g',name:'시험',date:'2026-12-31',status:'active',note:'',materialIds:['m'],learningDays:[0,2,4],daysOff:[localToday()],focusMode:'auto',focusDate:'',continuedMaterialIds:[]}},'ok');})()`);await setAmount('20');
   const forecast=await c.evaluate('currentPlans()[0].forecast.date');assert.ok(await c.evaluate("LearningPlan.allowed(currentPlans()[0].forecast.date,dataState.exams.goals[0])"));assert.notEqual(forecast,await c.evaluate('localToday()'));
   await c.evaluate("commitExam({type:'upsert',goal:{...dataState.exams.goals[0],learningDays:[]}},'ok')");await wait('dataState.exams.goals[0].learningDays.length===0');await c.evaluate("openDetail('m');renderDetailTab('basic')");assert.equal(await c.evaluate('currentPlans()[0].forecast.reason'),'no-learning-days');assert.ok(await c.evaluate("document.querySelector('.plan-metrics').textContent.includes('학습 가능일 없음')"));
   await c.evaluate("commitExam({type:'delete',id:'g'},'ok')");await wait('dataState.exams.goals.length===0');await setAmount('');return {forecast};
  });
  await check(route+' failed save retains manual setting, estimate and stored bytes',async()=>{
   const before=await c.evaluate('JSON.stringify({state:dataState,storage:{...localStorage}})');
   assert.equal(await c.evaluate("(async()=>{const old=appStorage;appStorage={getItem:old.getItem.bind(old),setItem(){throw Error('quota');}};try{return await commitStudy({type:'plan',id:'m',amount:30},'ok');}finally{appStorage=old;}})()"),false);
   assert.equal(await c.evaluate('JSON.stringify({state:dataState,storage:{...localStorage}})'),before);return true;
  });
  assert.deepEqual(await c.evaluate('__qaErrors'),[]);
 }
 assert.deepEqual(missing,[]);assert.deepEqual(c.errors,[]);
}
run().catch(e=>{console.error(e);results.push({pass:false,error:e.stack});process.exitCode=1;}).finally(async()=>{fs.writeFileSync('docs/evidence/manual-forecast-browser-results.json',JSON.stringify({results,missing,errors:c?.errors,physicalSafari:false},null,2));if(c)await c.close();if(chrome&&!chrome.killed)chrome.kill();server.close();});
