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
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'chagok-home-management-'));
 chrome=cp.spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});c=await connect(profile);
 await c.send('Page.navigate',{url:origin+'/dist/index.html'});await ready();
 await c.evaluate("(async()=>{for(const [id,name,category]of [['m','긴 자료명'.repeat(12),'school'],['n','시험 교재','exam']])await commitStudy({type:'material',material:{id,name,category,type:'book',unit:'페이지',total:100}},'ok');await commitStudy({type:'record',id:'m',record:{id:'mr',date:localToday(),position:100}},'ok');await commitStudy({type:'review',id:'m',review:{id:'mv',date:localToday(),start:1,end:10,understanding:'보통'}},'ok')})()");
 await check('100% stays active; card body and title each open detail',async()=>{
 assert.equal(await c.evaluate("dataState.study.materials.find(m=>m.id==='m').archived"),false);
 for(const part of ['.plant-sprite','.quantity','.progress-track','.card-title']){
 await c.evaluate("showView('home');document.querySelector('[data-card-detail=m] "+part+"').click()");
 assert.equal(await c.evaluate('currentView'),'detail');
 assert.equal(await c.evaluate('dialog.open'),false);
 }return true;});
 await check('record/review/menu buttons open only their action after filter rerender',async()=>{
 for(const type of ['record','review','material-menu']){
 await c.evaluate("showView('home');document.querySelector('[data-filter=school]').click();document.querySelector('[data-card-detail=m] [data-dialog="+type+"]').click()");
 assert.equal(await c.evaluate('currentView'),'home');assert.equal(await c.evaluate('dialog.open'),true);
 assert.equal(await c.evaluate("selectedMaterial.id"),'m');await c.evaluate('dialog.close()');
 }return true;});
 const history=await c.evaluate("JSON.stringify((({records,reviews,round,roundHistory})=>({records,reviews,round,roundHistory}))(dataState.study.materials.find(m=>m.id==='m')))");
 await check('complete preserves history; completed category lists and details work',async()=>{
 await c.evaluate("openDialog('material-menu','m');document.querySelector('[data-archive-material=m]').click()");
 await waitFor("!dialog.open");
 assert.equal(await c.evaluate("document.querySelector('[data-card-detail=m]')===null"),true);
 await c.evaluate("document.querySelector('[data-material-list=completed]').click()");
 assert.equal(await c.evaluate("document.querySelectorAll('[data-card-detail]').length"),1);
 assert.equal(await c.evaluate("document.querySelector('#material-list-title').textContent"),'학습 완료');
 await c.evaluate("document.querySelector('[data-filter=exam]').click()");
 assert.equal(await c.evaluate("document.querySelectorAll('[data-card-detail]').length"),0);
 await c.evaluate("document.querySelector('[data-filter=school]').click();document.querySelector('[data-card-detail=m] .plant-sprite').click()");
 assert.equal(await c.evaluate('currentView'),'detail');assert.equal(await c.evaluate("dataState.study.materials.find(m=>m.id==='m').archived"),true);
 assert.equal(await c.evaluate("document.querySelectorAll('[data-history-record]').length"),1);
 assert.equal(await c.evaluate("currentPlans().some(p=>p.id==='m')"),false);
 return true;});
 await check('resume preserves IDs, records and round; next round remains explicit',async()=>{
 await c.evaluate("openDialog('material-menu','m');document.querySelector('[data-unarchive-material=m]').click()");
 await waitFor('!dialog.open');
 assert.equal(await c.evaluate("JSON.stringify((({records,reviews,round,roundHistory})=>({records,reviews,round,roundHistory}))(dataState.study.materials.find(m=>m.id==='m')))"),history);
 await c.evaluate("document.querySelector('[data-material-list=active]').click();openDialog('material-menu','m')");
 assert.equal(await c.evaluate("!!document.querySelector('[data-dialog=next-round]')"),true);await c.evaluate("dialog.close()");
 return true;});
 await check('direct settings tab; isolated ON/OFF returns byte-identical real storage',async()=>{
 await c.evaluate("document.querySelector('.nav-item[data-view=more]').click()");
 assert.equal(await c.evaluate("!!document.querySelector('#settings-content [data-backup]')&&!dialog.open"),true);
 const before=await real();await toggle(true);await waitFor('applicationContext.test');
 await c.evaluate("commitStudy({type:'delete',id:dataState.study.materials[0].id},'ok')");
 assert.equal(await real(),before);await toggle(false);await waitFor('!applicationContext.test');assert.equal(await real(),before);
 return true;});
 await check('mobile/PC containment and all actual card hit targets',async()=>{
 const out=[];for(const width of [320,375,430,768,1023,1024,1440,1920]){
 await c.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<768});
 await c.evaluate("showView('home');materialStatusFilter='active';renderMaterials('all')");
 const r=await c.evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth})");assert.ok(r.scroll<=width+1,JSON.stringify(r));
 for(const selector of ['.plant-sprite','.quantity','.card-title','[data-dialog=record]','[data-dialog=review]','.card-menu']){
 const point=await c.evaluate("(()=>{const e=document.querySelector('[data-card-detail=m] "+selector+"');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await c.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
 if(selector.includes('dialog')||selector==='.card-menu')assert.equal(await c.evaluate('dialog.open'),true);else assert.equal(await c.evaluate('currentView'),'detail');
 await c.evaluate("if(dialog.open)dialog.close();showView('home')");
 }out.push(r);
 }return out;});
 await check('backup roundtrip; old records and review projection preserved',async()=>{
 assert.equal(await c.evaluate("JSON.stringify(StudyData.restore(StudyData.backup(dataState,examAPI),dataState,examAPI))===JSON.stringify(dataState)"),true);
 assert.equal(await c.evaluate("JSON.stringify((({records,reviews,round,roundHistory})=>({records,reviews,round,roundHistory}))(dataState.study.materials.find(m=>m.id==='m')))"),history);
 return true;});
 await check('explicit next round and edited card navigation',async()=>{
 await c.evaluate("openDialog('next-round','m');document.querySelector('[data-study-form=next-round]').requestSubmit()");
 await waitFor('!dialog.open');
 assert.equal(await c.evaluate("dataState.study.materials.find(m=>m.id==='m').round"),2);
 assert.equal(await c.evaluate("dataState.study.materials.find(m=>m.id==='m').roundHistory[0].records[0].id"),'mr');
 await c.evaluate("openDialog('material','n',true);document.querySelector('#material-name').value='수정한 교재';document.querySelector('[data-study-form=material]').requestSubmit()");
 await waitFor('!dialog.open');await c.evaluate("showView('home');document.querySelector('[data-card-detail=n] .quantity').click()");
 assert.equal(await c.evaluate('selectedMaterial.name'),'수정한 교재');
 for(const width of [375,1440]){
 await c.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await c.evaluate("showView('home');window.scrollTo(0,0)");await sleep(80);
 const shot=await c.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('docs/evidence/developer-mode/home-management-'+width+'.png',Buffer.from(shot.data,'base64'));
 }return true;});

}
run().catch(e=>{console.error(e);results.push({name:'execution',pass:false,error:e.stack});process.exitCode=1;}).finally(async()=>{fs.writeFileSync('docs/evidence/developer-mode/home-management-results.json',JSON.stringify({results,errors:c?.errors,physicalSafari:false},null,2));if(c)await c.close();if(chrome&&!chrome.killed)chrome.kill();server.close();});
