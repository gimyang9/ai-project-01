const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),cp=require('child_process'),assert=require('assert/strict'),connect=require('./stage6/cdp.cjs');
const base=process.cwd(),results=[],missing=[];let c,chrome;
const server=http.createServer((req,res)=>{try{if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}const f=path.resolve(base,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(base+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.webmanifest':'application/manifest+json'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{missing.push(req.url);res.writeHead(404);res.end();}});
async function wait(expr){for(let i=0;i<100;i++){if(await c.evaluate(expr))return;await new Promise(r=>setTimeout(r,80));}throw Error('timeout '+expr);}
async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'chagok-plan-target-'));
 chrome=cp.spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});c=await connect(profile);
 await c.send('Page.addScriptToEvaluateOnNewDocument',{source:"window.__qaErrors=[];const old=console.error;console.error=(...a)=>{__qaErrors.push(a.map(String).join(' '));old.apply(console,a);};"});
 for(const route of ['/index.html','/dist/index.html']){
  await c.send('Page.navigate',{url:origin+route});await wait("typeof commitStudy==='function'");
  if(route==='/index.html')await c.evaluate(`(async()=>{for(const id of ['both','exam','target','neither'])await commitStudy({type:'material',material:{id,name:id,type:'lecture',unit:'강',total:100,targetDate:['both','target'].includes(id)?'2026-11-30':''}},'ok');await commitExam({type:'upsert',goal:{id:'g',name:'토익 정기시험',date:'2026-12-02',status:'active',note:'',materialIds:['both','exam'],learningDays:[0,1,2,3,4,5,6],daysOff:[],focusMode:'auto',focusDate:'',continuedMaterialIds:[]}},'ok');})()`);
  const before=await c.evaluate('JSON.stringify({state:dataState,storage:{...localStorage}})');
  for(const width of [320,375,1440]){
   await c.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   for(const id of ['both','exam','target','neither']){
    await c.evaluate(`openDetail('${id}');renderDetailTab('basic')`);await c.settle();
    const value=await c.evaluate(`(()=>{const card=document.querySelector('.plan-compact'),row=card.querySelector('.plan-target'),exam=card.querySelector('.plan-exam:not(.plan-target)'),rect=card.getBoundingClientRect();const x=row?.getBoundingClientRect(),label=row?.firstElementChild.getBoundingClientRect(),date=row?.lastElementChild.getBoundingClientRect();return {target:row?.textContent||'',exam:!!exam,afterExam:!exam||!row||exam.compareDocumentPosition(row)===Node.DOCUMENT_POSITION_FOLLOWING,leftAligned:!row||Math.abs(x.left-label.left)<1,rightAligned:!row||Math.abs(x.right-date.right)<1,overflow:card.scrollWidth>card.clientWidth,pageOverflow:document.documentElement.scrollWidth>innerWidth,bounds:rect.width};})()`);
    assert.equal(!!value.target,['both','target'].includes(id));if(value.target)assert.equal(value.target,'목표 완료일2026.11.30');assert.equal(value.exam,['both','exam'].includes(id));assert.ok(value.afterExam&&value.leftAligned&&value.rightAligned);assert.equal(value.overflow,false);assert.equal(value.pageOverflow,false);
    results.push({route,width,id,pass:true,...value});
    // Hide only the fixed navigation while capturing the card beyond the viewport.
    if(id==='both'&&width===375){await c.evaluate("document.querySelector('nav').style.visibility='hidden';document.querySelector('.plan-compact').scrollIntoView({block:'center'})");await c.settle();}
    if(route==='/index.html'&&id==='both'&&width===375){const clip=await c.evaluate("(()=>{const r=document.querySelector('.plan-compact').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1};})()");const shot=await c.send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});fs.writeFileSync('docs/evidence/plan-target-date-375.png',Buffer.from(shot.data,'base64'));}
    await c.evaluate("document.querySelector('nav').style.visibility=''");
   }
  }
  assert.equal(await c.evaluate('JSON.stringify({state:dataState,storage:{...localStorage}})'),before);assert.deepEqual(await c.evaluate('__qaErrors'),[]);
 }
 assert.deepEqual(missing,[]);assert.deepEqual(c.errors,[]);console.log('PASS 24 combinations: root/dist, 320/375/1440px, target/exam set/unset; stored data unchanged');
}
run().catch(e=>{console.error(e);results.push({pass:false,error:e.stack});process.exitCode=1;}).finally(async()=>{fs.writeFileSync('docs/evidence/plan-target-date-results.json',JSON.stringify({results,missing,errors:c?.errors,physicalSafari:false},null,2));if(c)await c.close();if(chrome&&!chrome.killed)chrome.kill();server.close();});
