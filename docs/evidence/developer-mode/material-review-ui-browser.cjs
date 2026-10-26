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
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'chagok-today-ui-'));chrome=cp.spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});c=await connect(profile);
 await c.send('Page.navigate',{url:origin+'/dist/index.html'});await ready();
 await c.evaluate("(async()=>{const t=localToday(),day=n=>LearningPlan.shift(t,n);let s=StudyData.envelope(StudyData.emptyStudy(),StudyData.emptyExams());const apply=a=>s=StudyData.update(s,{today:t,...a},examAPI);for(const [id,name,unit,total]of [['m','LongStudyName'.repeat(7),'페이지',200],['m2','LongStudyName'.repeat(7),'강',100],['d','오늘 예정 교재','문제',100],['f','집중 복습','페이지',100],['a','오늘 학습 교재','페이지',300],['c','완료 자료','페이지',100],['p','중단 자료','페이지',100],['rest','쉬는 날 자료','페이지',100]])apply({type:'material',material:{id,name,type:'other',unit,total,category:id==='m'?'school':'exam'}});for(let i=0;i<14;i++)apply({type:'record',id:'m',record:{id:'m-r-'+i,date:day(-30+i),position:(i+1)*2,understanding:i%2?'보통':'어려움'}});for(const [id,date,position,understanding]of [['m2',day(-20),6,'보통'],['d',day(-3),10,'보통'],['f',day(-1),20,'쉬움'],['c',day(-20),100,'보통'],['p',day(-20),10,'보통']])apply({type:'record',id,record:{id:id+'-r',date,position,understanding}});apply({type:'review-date',id:'m',start:1,end:2,date:t});apply({type:'review-date',id:'m',start:3,end:4,date:day(3)});apply({type:'review-date',id:'f',start:1,end:5,date:t});apply({type:'review-settings',id:'f',amount:10});apply({type:'archive',id:'c',archived:true});s.exams=examAPI.update(s.exams,{type:'material-status',id:'p',status:'paused'});for(const goal of [{id:'ga',name:'학습량 시험',date:day(10),materialIds:['a'],focusMode:'auto',focusDate:'',learningDays:[0,1,2,3,4,5,6]},{id:'gf',name:'집중 시험',date:day(7),materialIds:['f'],focusMode:'manual',focusDate:t,learningDays:[0,1,2,3,4,5,6]},{id:'gr',name:'쉬는 날 시험',date:day(10),materialIds:['rest'],focusMode:'auto',focusDate:'',learningDays:[]}])s.exams=examAPI.update(s.exams,{type:'upsert',goal:{status:'active',note:'',continuedMaterialIds:[],daysOff:[],...goal}});return await persistData(s,'seed')})()");

 const unchanged=await real(),stateBefore=await c.evaluate('JSON.stringify(dataState)');
 await check('hidden counts, real chevron, popup never shifts filters/cards and plus matches exam',async()=>{
 const out=[];for(const width of [320,375,430,768,1024,1440]){
 await c.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
 await c.evaluate("showView('home');window.scrollTo(0,0)");await c.settle();
 const before=await c.evaluate("({filter:document.querySelector('.materials-section .filter-row').getBoundingClientRect().y,grid:document.querySelector('#material-grid').getBoundingClientRect().y})");
 await c.evaluate("document.querySelector('#material-list-picker summary').click()");
 const r=await c.evaluate("(()=>{const popup=document.querySelector('.material-list-options').getBoundingClientRect(),style=b=>{const s=getComputedStyle(b),i=getComputedStyle(b.querySelector('svg'));return {w:s.width,h:s.height,radius:s.borderRadius,pad:s.padding,bg:s.backgroundColor,iconW:i.width,iconH:i.height}};return{filter:document.querySelector('.materials-section .filter-row').getBoundingClientRect().y,grid:document.querySelector('#material-grid').getBoundingClientRect().y,popup:{left:popup.left,right:popup.right,w:popup.width},allHidden:['material-count','material-count-all','material-count-school','material-count-exam'].every(id=>document.getElementById(id).getClientRects().length===0),chevron:document.querySelector('#material-list-picker summary svg').getBoundingClientRect().width,plus:style(document.querySelector('.material-heading>[data-dialog=material]'))}})()");
 assert.equal(r.filter,before.filter);assert.equal(r.grid,before.grid);assert.equal(r.allHidden,true);assert.equal(r.chevron,19);assert.ok(r.popup.left>=0&&r.popup.right<=width);
 await c.evaluate("document.querySelector('[data-material-list=active]').click();showView('goals')");
 const exam=await c.evaluate("(()=>{const b=document.querySelector('[data-dialog=goal]'),s=getComputedStyle(b),i=getComputedStyle(b.querySelector('svg'));return{w:s.width,h:s.height,radius:s.borderRadius,pad:s.padding,bg:s.backgroundColor,iconW:i.width,iconH:i.height}})()");
 assert.deepEqual(r.plus,exam);out.push({width,...r});}return out;});
 await check('completed/category filtering and dropdown outside/Escape leave data unchanged',async()=>{
 await c.evaluate("showView('home');document.querySelector('[data-material-list=completed]').click()");
 assert.equal(await c.evaluate("document.querySelector('#material-list-title').textContent"),'학습 완료');assert.equal(await c.evaluate("document.querySelectorAll('[data-card-detail]').length"),1);
 await c.evaluate("document.querySelector('[data-filter=school]').click()");assert.equal(await c.evaluate("document.querySelectorAll('[data-card-detail]').length"),0);
 await c.evaluate("document.querySelector('[data-filter=all]').click();document.querySelector('[data-material-list=active]').click();document.querySelector('#material-list-picker summary').click()");
 await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 assert.equal(await c.evaluate("document.querySelector('#material-list-picker').open"),false);
 await c.evaluate("document.querySelector('#material-list-picker summary').click();document.querySelector('#today-heading').click()");
 assert.equal(await c.evaluate("document.querySelector('#material-list-picker').open"),false);
 await c.evaluate("document.querySelector('[data-filter=school]').click()");assert.deepEqual(await c.evaluate("[...document.querySelectorAll('[data-card-detail]')].map(e=>e.dataset.cardDetail)"),['m']);await c.evaluate("document.querySelector('[data-filter=exam]').click()");assert.equal(await c.evaluate("!!document.querySelector('[data-card-detail=m]')"),false);await c.evaluate("document.querySelector('[data-filter=all]').click()");assert.equal(await real(),unchanged);return true;});
 await check('group heading outside range card; 5/10/all, no large record buttons or explanations',async()=>{
 await c.evaluate("openDialog('review-plan');document.querySelector('[data-review-filter=overdue]').click();document.querySelector('[data-review-material=m]').click()");
 assert.equal(await c.evaluate("document.querySelectorAll('.review-range-row').length"),5);
 assert.equal(await c.evaluate("document.querySelectorAll('.review-range-row [data-dialog]').length"),0);
 assert.equal(await c.evaluate("document.querySelector('.review-range-row small')===null"),true);
 assert.equal(await c.evaluate("document.querySelector('.review-material-toggle').closest('.review-material-ranges')===null"),true);
 assert.equal(await c.evaluate("getComputedStyle(document.querySelector('.review-material-toggle'),'::before').width"),'3px');
 await c.evaluate("document.querySelector('[data-review-more]').click()");assert.equal(await c.evaluate("document.querySelectorAll('.review-range-row').length"),10);
 await c.evaluate("document.querySelector('[data-review-more]').click()");assert.equal(await c.evaluate("document.querySelectorAll('.review-range-row').length"),12);
 await c.evaluate("document.querySelector('[data-review-collapse]').click()");assert.equal(await c.evaluate("document.querySelectorAll('.review-range-row').length"),5);
 assert.equal(await c.evaluate('JSON.stringify(dataState)'),stateBefore);return true;});
 await check('popup overlays without shifting rows; opens above edge and remains hit-test reachable',async()=>{
 const out=[];for(const [width,height]of [[320,400],[375,600],[430,800],[768,500],[1024,400],[1440,900]]){
 await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
 await c.evaluate("closeReviewMenu();dialog.scrollTop=0;document.querySelector('.review-range-trigger').scrollIntoView({block:'end',behavior:'instant'})");
 const before=await c.evaluate("[...document.querySelectorAll('.review-range-row')].map(e=>e.getBoundingClientRect().y)");
 await c.evaluate("document.querySelector('.review-range-trigger').click()");await sleep(80);
 const r=await c.evaluate("(()=>{const p=reviewPopup.getBoundingClientRect(),d=dialog.getBoundingClientRect();return{width:innerWidth,scroll:document.documentElement.scrollWidth,popup:{left:p.left,right:p.right,top:p.top,bottom:p.bottom},parent:{left:d.left,right:d.right,top:d.top,bottom:d.bottom},rows:[...document.querySelectorAll('.review-range-row')].map(e=>e.getBoundingClientRect().y),items:[...reviewPopup.querySelectorAll('button')].map(b=>b.textContent),icons:reviewPopup.querySelectorAll('svg,img').length,accessible:[...reviewPopup.querySelectorAll('button')].every(b=>{const r=b.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b}),placement:reviewPopup.dataset.placement}})()");
 assert.deepEqual(r.rows,before);assert.deepEqual(r.items,['복습 기록','복습 날짜 변경']);assert.equal(r.icons,0);assert.equal(r.accessible,true);assert.ok(r.popup.left>=r.parent.left&&r.popup.right<=r.parent.right&&r.popup.top>=r.parent.top&&r.popup.bottom<=r.parent.bottom,JSON.stringify(r));assert.ok(r.scroll<=width+1);
 if([375,1440].includes(width)){const shot=await c.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('docs/evidence/developer-mode/material-review-'+width+'.png',Buffer.from(shot.data,'base64'));}
 await c.evaluate("closeReviewMenu()");out.push(r);}return out;});
 await check('keyboard menu, outside click and Escape close popup only',async()=>{
 await c.evaluate("document.querySelector('.review-range-trigger').focus()");
 await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
 assert.equal(await c.evaluate("document.activeElement.textContent"),'복습 기록');
 await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
 assert.equal(await c.evaluate("document.activeElement.textContent"),'복습 날짜 변경');
 await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 assert.equal(await c.evaluate("dialog.open&&reviewPopup.hidden&&document.activeElement.matches('[data-review-menu]')"),true);
 await c.evaluate("document.querySelector('.review-range-trigger').click();document.querySelector('#dialog-title').click()");
 assert.equal(await c.evaluate("reviewPopup.hidden&&dialog.open"),true);
 assert.equal(await real(),unchanged);return true;});
 await check('record menu pre-fills exact range and saves one review then returns to same list',async()=>{
 await c.evaluate("document.querySelector('.review-range-trigger').click()");
 const attrs=await c.evaluate("({...reviewPopupTrigger.dataset})"),before=await c.evaluate("dataState.study.materials.find(m=>m.id==='m').reviews.length");
 await c.evaluate("reviewPopup.querySelector('[data-dialog=review]').click()");
 assert.equal(await c.evaluate("Number(document.querySelector('#review-from').value)"),Number(attrs.reviewStart));assert.equal(await c.evaluate("Number(document.querySelector('#review-to').value)"),Number(attrs.reviewEnd));
 await c.evaluate("document.querySelector('[data-study-form=review]').requestSubmit()");await waitFor("!!document.querySelector('.review-browser')");
 assert.equal(await c.evaluate("dataState.study.materials.find(m=>m.id==='m').reviews.length"),before+1);assert.equal(await c.evaluate('reviewUI.filter'),'overdue');assert.equal(await c.evaluate('reviewUI.materialId'),'m');return attrs;});
 await check('reschedule menu preserves history, moves range to today and refreshes counts',async()=>{
 const records=await c.evaluate("JSON.stringify(dataState.study.materials.find(m=>m.id==='m').reviews)");
 await c.evaluate("document.querySelector('.review-range-trigger').click()");const attrs=await c.evaluate("({...reviewPopupTrigger.dataset})");
 await c.evaluate("reviewPopup.querySelector('[data-dialog=review-date]').click();document.querySelector('#review-schedule-date').value=localToday();document.querySelector('[data-study-form=review-date]').requestSubmit()");
 await waitFor("!!document.querySelector('.review-browser')");
 assert.equal(await c.evaluate("JSON.stringify(dataState.study.materials.find(m=>m.id==='m').reviews)"),records);
 const list=await c.evaluate("reviewView().due.find(g=>g.id==='m').items");assert.ok(list.some(r=>r.start===Number(attrs.reviewStart)&&r.end===Number(attrs.reviewEnd)));assert.equal(await c.evaluate('reviewUI.filter'),'overdue');
 await c.evaluate("document.querySelector('[data-review-filter=due]').click()");
 assert.equal(await c.evaluate("reviewUI.materialId===null&&reviewUI.limit===5"),true);return true;});
 await check('touch pointer popup tap and cancellation returns to same selection',async()=>{
 await c.send('Emulation.setDeviceMetricsOverride',{width:375,height:600,deviceScaleFactor:1,mobile:true});await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await c.evaluate("document.querySelector('[data-review-material=m]').click();document.querySelector('.review-range-trigger').scrollIntoView({block:'center',behavior:'instant'})");
 const p=await c.evaluate("(()=>{const r=document.querySelector('.review-range-trigger').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(60);
 assert.equal(await c.evaluate("!reviewPopup.hidden"),true);
 await c.evaluate("reviewPopup.querySelector('[data-dialog=review]').click();document.querySelector('[data-close]').click()");await waitFor("!!document.querySelector('.review-browser')");assert.equal(await c.evaluate('reviewUI.materialId'),'m');return true;});
 await check('backup/reload preserve records, schedules and real/test isolation',async()=>{
 assert.equal(await c.evaluate("JSON.stringify(StudyData.restore(StudyData.backup(dataState,examAPI),dataState,examAPI))===JSON.stringify(dataState)"),true);
 await c.evaluate("dialog.close();showView('more')");const before=await real();await toggle(true);await waitFor('applicationContext.test');
 await c.evaluate("commitStudy({type:'delete',id:dataState.study.materials[0].id},'ok')");assert.equal(await real(),before);await toggle(false);await waitFor('!applicationContext.test');assert.equal(await real(),before);
 await c.evaluate("window.__qaReloadToken='before'");await c.send('Page.reload');for(let i=0;i<100;i++){try{if(await c.evaluate("window.__qaReloadToken===undefined&&document.readyState==='complete'&&typeof commitStudy==='function'"))break;}catch{}await sleep(40);}await ready();assert.equal(await real(),before);return true;});
 await check('home heading touch/click, popup capture and existing add action',async()=>{
 for(const width of [375,1440]){
 await c.send('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:width<768});
 await c.send('Emulation.setTouchEmulationEnabled',{enabled:width<768,maxTouchPoints:1});
 await c.evaluate("showView('home');document.querySelector('.material-heading').scrollIntoView({block:'center',behavior:'instant'})");await c.settle();
 const point=await c.evaluate("(()=>{const r=document.querySelector('#material-list-picker summary').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
 if(width<768){await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await c.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});}
 await sleep(350);const debug=await c.evaluate("({open:document.querySelector('#material-list-picker').open,rect:document.querySelector('#material-list-picker summary').getBoundingClientRect().toJSON(),view:currentView,dialog:dialog.open})");assert.equal(debug.open,true,JSON.stringify({width,point,...debug}));
 const shot=await c.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('docs/evidence/developer-mode/material-heading-'+width+'.png',Buffer.from(shot.data,'base64'));
 await c.evaluate("document.querySelector('.material-heading>[data-dialog=material]').click()");assert.equal(await c.evaluate("dialog.open&&!!document.querySelector('[data-study-form=material]')"),true);
 await c.evaluate("document.querySelector('[data-close]').click()");await waitFor('!dialog.open');
 }return true;});

}
run().catch(e=>{console.error(e);results.push({name:'execution',pass:false,error:e.stack});process.exitCode=1;}).finally(async()=>{fs.writeFileSync('docs/evidence/developer-mode/material-review-ui-results.json',JSON.stringify({results,errors:c?.errors,physicalSafari:false},null,2));if(c)await c.close();if(chrome&&!chrome.killed)chrome.kill();server.close();});
