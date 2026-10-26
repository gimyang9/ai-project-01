const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),cp=require('child_process'),assert=require('assert/strict'),connect=require('../stage6/cdp.cjs');
const base=process.cwd(),results=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));let c,chrome,origin;
const server=http.createServer((req,res)=>{try{if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}let file=path.resolve(base,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(base+path.sep))throw Error();const body=fs.readFileSync(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
async function check(name,fn){const value=await fn();results.push({name,pass:true,value});console.log('PASS '+name);}
async function ready(){for(let i=0;i<100;i++){if(await c.evaluate("typeof commitStudy==='function'&&!!AppContext"))return;await sleep(100);}throw Error('app not ready');}
const settings=()=>c.evaluate("document.querySelector('dialog[open]')?.close();openDialog('settings')");
const toggle=on=>c.evaluate("document.querySelector('[data-test-mode="+(on?'on':'off')+"]').click()");
const real=()=>c.evaluate("JSON.stringify({...localStorage})");



async function waitFor(expression){for(let i=0;i<100;i++){if(await c.evaluate(expression))return;await sleep(30);}throw Error('timeout: '+expression);}
async function submit(selector='[data-exam-form]'){await c.evaluate('document.querySelector('+JSON.stringify(selector)+').requestSubmit()');await waitFor("!document.querySelector('dialog[open]')");}


async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'chagok-integrated-ui-'));
 chrome=cp.spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});c=await connect(profile);
 await c.send('Page.navigate',{url:origin+'/dist/index.html'});await ready();await c.send('Page.enable');
 await c.evaluate("(async()=>{let s=StudyData.envelope(StudyData.emptyStudy(),StudyData.emptyExams());const t=localToday(),day=n=>LearningPlan.shift(t,n),apply=a=>s=StudyData.update(s,{today:t,...a},examAPI);for(const [id,name,total,unit]of [['m','긴 교재명'.repeat(12),1000,'페이지'],['a','영어 강의',120,'강'],['n','독립 학습',100,'문제'],['old','완료 교재',100,'페이지']])apply({type:'material',material:{id,name,total,unit,type:'other'}});for(let i=0;i<14;i++){apply({type:'record',id:'m',record:{id:'mr'+i,date:day(-13+i),position:(i+1)*5,understanding:i%3===0?'어려움':i%3===1?'보통':'쉬움'}});if(i<12)apply({type:'review',id:'m',record:{id:'mv'+i,date:day(-12+i),start:1,end:10,understanding:i%2?'보통':'어려움'}});}apply({type:'record',id:'a',record:{id:'ar',date:day(-1),position:5,understanding:'어려움'}});apply({type:'record',id:'old',record:{id:'oldr',date:day(-30),position:100}});apply({type:'next-round',id:'old'});apply({type:'archive',id:'old',archived:true});s.exams=examAPI.update(s.exams,{type:'upsert',goal:{id:'g',name:'준비 시험',date:day(4),status:'active',note:'  시험 메모  ',materialIds:['m','a','old'],learningDays:[0,1,2,3,4,5,6],daysOff:[],continuedMaterialIds:[],focusMode:'auto',focusDate:''}});await persistData(s,'fixture',true)})()");
 await check('compact plan uses home quota, independent forecast, one warning and no duplicate explanations',async()=>{
 await c.evaluate("openDetail('m');renderDetailTab('basic')");
 const r=await c.evaluate("({plan:currentPlans().find(p=>p.id==='m'),text:document.querySelector('.plan-compact').textContent,cols:getComputedStyle(document.querySelector('.plan-metrics')).gridTemplateColumns,notices:document.querySelectorAll('.plan-inline-notice').length})");
 assert.match(r.text,/다소 부담/);assert.equal(r.notices,1);assert.doesNotMatch(r.text,/최근.*평균|학습 기준일|자세히/);
 assert.match(r.text,new RegExp(r.plan.amount+'페이지'));assert.equal(r.cols.split(' ').length,2);
 await c.evaluate("openDetail('n');renderDetailTab('basic')");assert.equal(await c.evaluate("document.querySelector('.plan-exam')===null&&document.querySelector('.plan-inline-notice')===null"),true);return r;});
 await check('timeline 5/10/all; actual position, same-day stable order and review range without position',async()=>{
 await c.evaluate("openDetail('m')");assert.equal(await c.evaluate("document.querySelectorAll('.timeline-record').length"),5);
 assert.equal(await c.evaluate("document.querySelector('.timeline-position').textContent"),'학습 후 위치 · 70페이지');
 await c.evaluate("document.querySelector('[data-history-more]').click()");assert.equal(await c.evaluate("document.querySelectorAll('.timeline-record').length"),10);
 await c.evaluate("document.querySelector('[data-history-more]').click()");assert.equal(await c.evaluate("document.querySelectorAll('.timeline-record').length"),14);
 assert.equal(await c.evaluate("document.querySelector('[data-history-more]')===null"),true);
 await c.evaluate("document.querySelector('[data-detail-tab=review]').click()");assert.equal(await c.evaluate("document.querySelectorAll('.timeline-record').length"),5);
 assert.equal(await c.evaluate("document.querySelector('.timeline-position')===null"),true);assert.match(await c.evaluate("document.querySelector('.timeline-amount').textContent"),/1–10페이지 복습/);return true;});
 await check('optional understanding clears existing evaluation and refreshes exact recommendation projection',async()=>{
 await c.evaluate("openDetail('a');document.querySelector('[data-edit-entry=record]').click();document.querySelector('.choice-button.active').click()");
 assert.equal(await c.evaluate("document.querySelector('.choice-button.active')===null"),true);
 await submit('[data-study-form=record]');
 assert.equal(await c.evaluate("dataState.study.materials.find(m=>m.id==='a').records[0].understanding"),'');
 assert.equal(await c.evaluate("JSON.stringify(currentReviews())===JSON.stringify(ReviewPlan.build(dataState,localToday(),studyAPI,examAPI,LearningPlan))"),true);
 await c.evaluate("openDetail('m');renderDetailTab('review');document.querySelector('[data-edit-entry=review]').click();document.querySelector('.choice-button.active').click();document.querySelectorAll('.choice-button')[2].click()");
 await submit('[data-study-form=review]');
 assert.equal(await c.evaluate("dataState.study.materials.find(m=>m.id==='m').reviews.at(-1).understanding"),'어려움');
 assert.equal(await c.evaluate("JSON.stringify(currentReviews())===JSON.stringify(ReviewPlan.build(dataState,localToday(),studyAPI,examAPI,LearningPlan))"),true);
 return true;});
 await check('delete confirmation keeps records until save then refreshes timeline and review projection',async()=>{
 const count=await c.evaluate("dataState.study.materials.find(m=>m.id==='m').reviews.length");
 await c.evaluate("document.querySelector('[data-delete-entry=review]').click()");assert.equal(await c.evaluate("dataState.study.materials.find(m=>m.id==='m').reviews.length"),count);
 await submit('[data-study-form=delete-review]');assert.equal(await c.evaluate("dataState.study.materials.find(m=>m.id==='m').reviews.length"),count-1);
 assert.equal(await c.evaluate("document.querySelectorAll('.timeline-record').length"),5);
 assert.equal(await c.evaluate("JSON.stringify(currentReviews())===JSON.stringify(ReviewPlan.build(dataState,localToday(),studyAPI,examAPI,LearningPlan))"),true);return true;});
 await check('memo targets, whitespace, auto-height and duplicate save protection',async()=>{
 await c.evaluate("openDialog('memo','m')");
 assert.equal(await c.evaluate("document.querySelector('#dialog-title').textContent"),'메모');
 assert.equal(await c.evaluate("document.querySelectorAll('#dialog-content button').length"),1);
 await c.evaluate("document.querySelector('#material-note').value=String.fromCharCode(10)+'  첫 줄  '+String.fromCharCode(10)+'둘째 줄'+String.fromCharCode(10).repeat(20);document.querySelector('#material-note').dispatchEvent(new Event('input',{bubbles:true}))");
 assert.equal(await c.evaluate("document.querySelector('#material-note').getBoundingClientRect().height"),240);
 await c.evaluate("document.querySelector('[data-study-form=memo]').requestSubmit();document.querySelector('[data-study-form=memo]')?.requestSubmit()");await waitFor('!dialog.open');
 assert.equal(await c.evaluate("dataState.study.materials.find(m=>m.id==='m').note"),'\n  첫 줄  \n둘째 줄'+'\n'.repeat(20));
 await c.evaluate("openExamDialog('memo','g');document.querySelector('#exam-note').value=' 시험 메모 수정 ';document.querySelector('[data-exam-form=memo]').requestSubmit()");
 await waitFor('!dialog.open');assert.equal(await c.evaluate("examState.goals[0].note"),' 시험 메모 수정 ');return true;});
 await check('memo dirty close dismiss preserves input; accept discards; unchanged closes immediately',async()=>{
 await c.evaluate("openDialog('memo','m')");assert.equal(await c.evaluate("document.querySelector('#material-note').value"),await c.evaluate("dataState.study.materials.find(m=>m.id==='m').note"));await c.evaluate("document.querySelector('#material-note').value='미저장'");
 const pending=c.send('Runtime.evaluate',{expression:"document.querySelector('[data-close]').click()",returnByValue:true});await sleep(100);await c.send('Page.handleJavaScriptDialog',{accept:false});await pending;
 assert.equal(await c.evaluate("dialog.open&&document.querySelector('#material-note').value==='미저장'"),true);
 const pending2=c.send('Runtime.evaluate',{expression:"requestDialogClose()",returnByValue:true});await sleep(100);await c.send('Page.handleJavaScriptDialog',{accept:true});await pending2;await waitFor('!dialog.open');
 await c.evaluate("openDialog('memo','m');document.querySelector('[data-close]').click()");await waitFor('!dialog.open');return true;});
 await check('memo Escape and backdrop use the same unsaved-change protection',async()=>{
 await c.evaluate("openDialog('memo','m');document.querySelector('#material-note').value='닫기 보호'");
 const keyDown=c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27}),keyUp=c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await sleep(50);await c.send('Page.handleJavaScriptDialog',{accept:false});await Promise.all([keyDown,keyUp]);
 assert.equal(await c.evaluate('dialog.open'),true);
 const point=await c.evaluate("(()=>{const r=dialog.getBoundingClientRect();return{x:Math.max(1,r.left-5),y:Math.max(1,r.top-5)}})()");
 await c.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});const release=c.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});await sleep(50);await c.send('Page.handleJavaScriptDialog',{accept:true});await release;await waitFor('!dialog.open');return true;});
 await check('linked list contains archived history and opens correct material without changing completion',async()=>{
 await c.evaluate("showView('goals');document.querySelector('[data-linked=g]').click()");
 assert.equal(await c.evaluate("document.querySelectorAll('.linked-material-link').length"),3);
 assert.equal(await c.evaluate("document.querySelector('.linked-materials .learning-plan')===null"),true);
 await c.evaluate("document.querySelector('.linked-materials [data-detail=old]').click()");
 assert.equal(await c.evaluate("dataState.study.materials.find(m=>m.id==='old').archived"),true);
 assert.match(await c.evaluate("document.querySelector('#detail-tab-content').textContent"),/100페이지 학습/);assert.match(await c.evaluate("document.querySelector('#detail-tab-content').textContent"),/1회독/);return true;});
 await check('quota30 minus10 is20; manual preserved and warning only for insufficient capacity',async()=>{
 await c.evaluate("(async()=>{await commitStudy({type:'material',material:{id:'quota',name:'권장량 검증',type:'book',unit:'페이지',total:120}},'ok');await commitExam({type:'upsert',goal:{...examState.goals[0],materialIds:[...examState.goals[0].materialIds,'quota']}},'ok')})()");
 assert.equal(await c.evaluate("currentPlans().find(p=>p.id==='quota').amount"),30);
 await c.evaluate("commitStudy({type:'record',id:'quota',record:{id:'qr',date:localToday(),position:10}},'ok')");assert.equal(await c.evaluate("currentPlans().find(p=>p.id==='quota').amount"),20);
 await c.evaluate("openDetail('quota');renderDetailTab('basic')");assert.match(await c.evaluate("document.querySelector('.plan-metrics').textContent"),/20페이지/);
 await c.evaluate("(async()=>{await commitStudy({type:'plan',id:'quota',amount:10},'ok');openDetail('quota');renderDetailTab('basic')})()");assert.match(await c.evaluate("document.querySelector('.plan-compact').textContent"),/今日|오늘 설정 학습량/);assert.match(await c.evaluate("document.querySelector('.plan-inline-notice').textContent"),/설정한 학습량/);
 await c.evaluate("(async()=>{await commitStudy({type:'plan',id:'quota',amount:40},'ok');openDetail('quota');renderDetailTab('basic')})()");assert.equal(await c.evaluate("document.querySelector('.plan-inline-notice')===null"),true);return true;});
 await check('320..1440 layout, short memo viewport and touch targets',async()=>{
 const out=[];for(const [width,height]of [[320,400],[375,600],[430,800],[768,500],[1024,400],[1440,900]]){
 await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
 await c.evaluate("openDetail('m');renderDetailTab('basic')");
 const r=await c.evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth,cols:getComputedStyle(document.querySelector('.plan-metrics')).gridTemplateColumns})");assert.ok(r.scroll<=width+1,JSON.stringify(r));assert.equal(r.cols.split(' ').length,2);
 await c.evaluate("openDialog('record','m')");
 assert.equal(await c.evaluate("[...document.querySelectorAll('.choice-button')].every(b=>b.getBoundingClientRect().height>=44)"),true);await c.evaluate("dialog.close();openDialog('memo','m')");
 const b=await c.evaluate("(()=>{const r=dialog.getBoundingClientRect();return{x:r.right-10,y:r.top+30,width:dialog.clientWidth,scroll:dialog.scrollWidth}})()");assert.ok(b.scroll<=b.width+1);
 await c.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:b.x,y:b.y,deltaX:0,deltaY:5000});await sleep(40);
 assert.equal(await c.evaluate("(()=>{const b=dialog.querySelector('[type=submit]'),r=b.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b})()"),true);
 await c.evaluate("dialog.close();openDetail('m');renderDetailTab('basic');document.querySelector('.plan-compact').scrollIntoView({block:'center',behavior:'instant'})");if([375,1440].includes(width)){const shot=await c.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('docs/evidence/developer-mode/integrated-management-'+width+'.png',Buffer.from(shot.data,'base64'));}out.push(r);
 }return out;});
 await check('backup/reload and test ON/OFF isolation preserve actual stored study and exam data',async()=>{
 assert.equal(await c.evaluate("JSON.stringify(StudyData.restore(StudyData.backup(dataState,examAPI),dataState,examAPI))===JSON.stringify(dataState)"),true);
 await c.evaluate("showView('more')");const before=await real();await toggle(true);await waitFor('applicationContext.test');
 await c.evaluate("commitStudy({type:'delete',id:dataState.study.materials[0].id},'ok')");assert.equal(await real(),before);await toggle(false);await waitFor('!applicationContext.test');assert.equal(await real(),before);
 await c.send('Page.reload');await ready();assert.equal(await real(),before);assert.equal(await c.evaluate("dataState.study.materials.find(m=>m.id==='quota').manualDailyAmount"),40);return true;});
}
run().catch(e=>{console.error(e);results.push({name:'execution',pass:false,error:e.stack});process.exitCode=1;}).finally(async()=>{fs.writeFileSync('docs/evidence/developer-mode/integrated-management-results.json',JSON.stringify({results,errors:c?.errors,physicalSafari:false},null,2));if(c)await c.close();if(chrome&&!chrome.killed)chrome.kill();server.close();});
