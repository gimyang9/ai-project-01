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
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'chagok-settings-ui-')),downloads=fs.mkdtempSync(path.join(os.tmpdir(),'chagok-settings-backup-'));
 chrome=cp.spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});c=await connect(profile);
 await c.send('Page.navigate',{url:origin+'/dist/index.html'});await ready();await c.settle();
 await c.evaluate("(async()=>{await commitStudy({type:'material',material:{id:'m',name:'설정 레이아웃 검증 교재',type:'book',unit:'페이지',total:100}},'ok');await commitStudy({type:'record',id:'m',record:{id:'mr',date:localToday(),position:10}},'ok')})()");
 await check('controlled old header reproduction confirms 44px first grid column and two lines',async()=>{
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 const r=await c.evaluate("(()=>{showView('more');const h=document.querySelector('#more-heading'),wrapper=h.parentElement;wrapper.replaceWith(h);const s=document.createElement('style');s.textContent='#view-more .page-title h1{font-size:26px}';document.head.append(s);const range=document.createRange();range.selectNodeContents(h);const result={width:h.getBoundingClientRect().width,lines:range.getClientRects().length,columns:getComputedStyle(h.parentElement).gridTemplateColumns};h.replaceWith(wrapper);wrapper.append(h);s.remove();return result})()");
 assert.equal(r.width,44);assert.equal(r.lines,2);return r;});
 await check('settings title shares exam/stat styling, center and top spacing at 320..1920px',async()=>{
 const out=[];for(const width of [320,375,430,680,768,1023,1024,1280,1440,1920]){
 await c.send('Emulation.setDeviceMetricsOverride',{width,height:width===320?400:900,deviceScaleFactor:1,mobile:width<768});
 const values=[];for(const view of ['goals','stats','more']){
 await c.evaluate("showView('"+view+"')");await c.settle();
 const r=await c.evaluate("(()=>{const view=document.querySelector('.view:not([hidden])'),h=view.querySelector('.page-title h1'),s=getComputedStyle(h),rect=h.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(h);const header=view.querySelector('.page-title').getBoundingClientRect();return{font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,center:rect.x+rect.width/2-(header.x+header.width/2),top:rect.top,lines:range.getClientRects().length,headerBottom:header.bottom,headerHeight:header.height,margin:getComputedStyle(view.querySelector('.page-title')).marginBottom}})()");
 values.push(r);}
 assert.deepEqual(values[2],values[1]);assert.deepEqual(values[2],values[0]);assert.equal(values[2].lines,1);
 const gap=await c.evaluate("document.querySelector('.settings-page .settings-block').getBoundingClientRect().top-document.querySelector('#view-more .page-title').getBoundingClientRect().bottom");
 assert.equal(gap,parseFloat(values[2].margin));assert.ok(await c.evaluate("document.documentElement.scrollWidth<=innerWidth+1"));
 const cardGap=await c.evaluate("(()=>{const cards=[...document.querySelector('.settings-page').children].map(e=>e.getBoundingClientRect());return [cards[1].top-cards[0].bottom,cards[2].top-cards[1].bottom]})()");assert.deepEqual(cardGap,[12,12]);
 if([375,1440].includes(width)){const shot=await c.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('docs/evidence/developer-mode/settings-layout-'+width+'.png',Buffer.from(shot.data,'base64'));}
 out.push({width,header:values[2],gap,cardGap});
 }return out;});
 await check('test switch preserves real storage through changes and OFF',async()=>{
 const before=await real();await toggle(true);await waitFor('applicationContext.test');
 await c.evaluate("commitStudy({type:'delete',id:dataState.study.materials[0].id},'ok')");assert.equal(await real(),before);
 await toggle(false);await waitFor('!applicationContext.test');assert.equal(await real(),before);return true;});
 let backup;
 await check('backup button downloads valid original-format JSON with original history',async()=>{
 await c.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
 await c.evaluate("document.querySelector('[data-backup]').click()");
 let file;for(let i=0;i<100;i++){file=fs.readdirSync(downloads).find(p=>p.endsWith('.json'));if(file)break;await sleep(50);}assert.ok(file);
 backup=path.join(downloads,file);const json=JSON.parse(fs.readFileSync(backup,'utf8'));assert.equal(json.app,'chagok-v2');assert.equal(json.backupVersion,1);return {format:json.app,version:json.backupVersion};});
 const original=await c.evaluate('JSON.stringify(dataState)');
 await check('reset stays behind confirmation; restore file stages then restores exact original history',async()=>{
 await c.evaluate("document.querySelector('[data-dialog=reset]').click()");
 assert.equal(await c.evaluate('JSON.stringify(dataState)'),original);assert.equal(await c.evaluate("!!document.querySelector('[data-study-form=reset]')"),true);
 await c.evaluate("document.querySelector('[data-close]').click()");await sleep(60);assert.equal(await c.evaluate('JSON.stringify(dataState)'),original);
 await c.evaluate("document.querySelector('[data-dialog=reset]').click();document.querySelector('[data-study-form=reset]').requestSubmit()");await waitFor('!dialog.open');await sleep(60);
 assert.equal(await c.evaluate("dataState.study.materials.length"),0);await c.evaluate("showView('more')");
 await c.send('Page.setInterceptFileChooserDialog',{enabled:true});await c.evaluate("document.querySelector('[data-restore]').click()");
 const root=(await c.send('DOM.getDocument')).root.nodeId,node=(await c.send('DOM.querySelector',{nodeId:root,selector:'#restore-file'})).nodeId;
 await c.send('DOM.setFileInputFiles',{nodeId:node,files:[backup]});await waitFor("!!document.querySelector('[data-study-form=restore]')");
 assert.equal(await c.evaluate('dataState.study.materials.length'),0);
 await c.evaluate("document.querySelector('[data-study-form=restore]').requestSubmit()");await waitFor('!dialog.open');
 assert.equal(await c.evaluate('JSON.stringify(dataState)'),original);return true;});
}
run().catch(e=>{console.error(e);results.push({name:'execution',pass:false,error:e.stack});process.exitCode=1;}).finally(async()=>{fs.writeFileSync('docs/evidence/developer-mode/settings-layout-results.json',JSON.stringify({results,errors:c?.errors,physicalSafari:false},null,2));if(c)await c.close();if(chrome&&!chrome.killed)chrome.kill();server.close();});
