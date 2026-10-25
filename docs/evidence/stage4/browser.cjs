
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const D=require('../../../dist/study-data.js'),E=require('../../../dist/exam-management.js'),L=require('../../../dist/learning-plan.js');
(async()=>{
const dir=path.join(process.cwd(),'docs/evidence/stage4'),profile=process.argv[2],today='2026-10-25';
let state=D.envelope(D.emptyStudy(),D.emptyExams());
const update=a=>state=D.update(state,{today,...a},E);
for(const m of [{id:'m',name:'네트워크 · 겹친 범위 복습 확인용 긴 자료 이름',type:'book',unit:'페이지',total:100},{id:'lecture',name:'운영체제 강의',type:'lecture',unit:'강',total:25}])update({type:'material',material:m});
update({type:'record',id:'m',record:{id:'s1',date:L.shift(today,-10),position:60,understanding:'보통'}});
update({type:'review',id:'m',record:{id:'v1',date:L.shift(today,-3),start:1,end:20,understanding:'어려움'}});
update({type:'record',id:'lecture',record:{id:'s2',date:L.shift(today,-20),position:15,understanding:'보통'}});
update({type:'review',id:'lecture',record:{id:'v2',date:L.shift(today,-20),start:1,end:3,understanding:'보통'}});
update({type:'review-date',id:'m',start:31,end:40,date:L.shift(today,4)});
state.exams=E.update(state.exams,{type:'upsert',goal:{id:'g',name:'복습 연결 시험',date:L.shift(today,5),status:'active',note:'',materialIds:['m','lecture'],learningDays:[0,1,2,3,4,5,6],daysOff:[],focusMode:'manual',focusDate:L.shift(today,-7),continuedMaterialIds:[]}});
let lines;for(let i=0;i<100;i++){try{lines=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);break;}catch{await new Promise(r=>setTimeout(r,100));}}
assert.ok(lines);const targets=await(await fetch('http://127.0.0.1:'+lines[0]+'/json/list')).json();
const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
let next=0;const pending=new Map(),errors=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout '+method));},20000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
const settle=()=>evaluate("(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()");
const shot=async name=>{await settle();const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(r.data,'base64'));};
try{
await send('Page.enable');await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument',{source:"if(location.protocol==='file:'&&!localStorage.getItem("+JSON.stringify(D.KEY)+"))localStorage.setItem("+JSON.stringify(D.KEY)+","+JSON.stringify(JSON.stringify(state))+");"});
await send('Emulation.setDeviceMetricsOverride',{width:390,height:840,deviceScaleFactor:1,mobile:true});
await send('Page.navigate',{url:'file:///'+path.join(process.cwd(),'index.html').replaceAll('\\','/')});
for(let i=0;i<100;i++){if(await evaluate("typeof currentReviews==='function'"))break;await new Promise(r=>setTimeout(r,100));}
await settle();assert.equal(await evaluate('localToday()'),today);
const screens=[];
for(const width of [320,390,768,1024,1440]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:840,deviceScaleFactor:1,mobile:width<681});
 await evaluate("if(dialog.open)dialog.close();document.querySelector('[data-dialog=\"review-plan\"]').click();");await settle();
 const info=await evaluate("({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,dialogWidth:dialog.getBoundingClientRect().width,rows:activeReviewPlans().map(p=>({materialId:p.materialId,start:p.start,end:p.end,sources:p.sources})),streakExposed:document.getElementById('dialog-content').textContent.includes('연속 성공')})");
 assert.equal(info.overflow,false);assert.equal(info.streakExposed,false);
 for(const id of ['m','lecture']){const rows=info.rows.filter(p=>p.materialId===id).sort((a,b)=>a.start-b.start);for(let i=1;i<rows.length;i++)assert.ok(rows[i-1].end<rows[i].start);}
 assert.ok(info.rows.some(r=>r.sources.length===2));assert.ok(info.dialogWidth<=width);await shot('review-list-'+width);screens.push(info);
}
await send('Emulation.setDeviceMetricsOverride',{width:390,height:840,deviceScaleFactor:1,mobile:true});
const before=await evaluate("({count:dataState.study.materials[0].reviews.length,records:JSON.stringify(dataState.study.materials[0].records),round:dataState.study.materials[0].round})");
const selected=await evaluate("(()=>{const b=document.querySelector('#dialog-content [data-dialog=\"review\"]');const p={start:Number(b.dataset.reviewStart),end:Number(b.dataset.reviewEnd)};b.click();return {...p,from:Number(document.getElementById('review-from').value),to:Number(document.getElementById('review-to').value)};})()");
assert.equal(selected.from,selected.start);assert.equal(selected.to,selected.end);
await evaluate("document.querySelectorAll('[data-choice-group=\"understanding\"] button')[1].click();document.querySelector('[data-study-form=\"review\"]').requestSubmit();");await settle();
const after=await evaluate("({count:dataState.study.materials[0].reviews.length,records:JSON.stringify(dataState.study.materials[0].records),round:dataState.study.materials[0].round,remaining:activeReviewPlans().filter(p=>p.materialId==='m').map(p=>({start:p.start,end:p.end}))})");
assert.equal(after.count,before.count+1);assert.equal(after.records,before.records);assert.equal(after.round,before.round);
assert.ok(after.remaining.every(r=>r.end<selected.start||r.start>selected.end));
await evaluate("openDialog('review-settings','m');document.getElementById('manual-review-amount').value='5';document.querySelector('[data-study-form=\"review-settings\"]').requestSubmit();openDialog('review-settings','m');");await shot('review-settings-390');
await evaluate("openDialog('review-date','m');document.getElementById('review-schedule-start').value='21';document.getElementById('review-schedule-end').value='30';document.getElementById('review-schedule-date').value='2026-11-03';");
await shot('review-date-390');await evaluate("document.querySelector('[data-study-form=\"review-date\"]').requestSubmit()");
await send('Page.reload');for(let i=0;i<100;i++){if(await evaluate("typeof currentReviews==='function'&&document.readyState==='complete'"))break;await new Promise(r=>setTimeout(r,100));}await settle();
const reloaded=await evaluate("({amount:dataState.study.materials[0].reviewSettings.dailyAmount,schedules:dataState.study.materials[0].reviewSettings.schedules,rows:dataState.study.materials[0].reviews.length,old:localStorage.getItem('study-progress-data-v1')})");
assert.equal(reloaded.amount,5);assert.ok(reloaded.schedules.some(s=>s.start===21&&s.end===30&&s.date==='2026-11-03'));assert.equal(reloaded.rows,after.count);assert.equal(reloaded.old,null);assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify({browser:'Chrome CDP isolated synthetic profile; not Safari device',screens,completion:{before,selected,after},reload:reloaded,errors},null,2));console.log('Browser: 5 viewports; one completion; manual quantity/date; reload and source history preserved.');
}finally{try{ws.send(JSON.stringify({id:++next,method:'Browser.close'}));await new Promise(resolve=>{ws.addEventListener('close',resolve,{once:true});setTimeout(resolve,2000).unref();});}catch{}ws.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
