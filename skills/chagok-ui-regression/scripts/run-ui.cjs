const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),cp=require('node:child_process');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(profile){
 let lines;for(let n=0;n<100;n++){try{lines=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);break;}catch{await sleep(80);}}
 if(!lines)throw Error('Chrome endpoint unavailable');
 const targets=await(await fetch('http://127.0.0.1:'+lines[0]+'/json/list')).json(),target=targets.find(t=>t.type==='page');if(!target)throw Error('Chrome page unavailable');
 const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),errors=[];let id=0;
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push({type:'exception',text:m.params.exceptionDetails.text});if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push({type:'console.error',text:m.params.args.map(a=>a.value??a.description??a.type).join(' ')});const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
 ws.onclose=()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Chrome connection closed'));}pending.clear();};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const current=++id,timer=setTimeout(()=>{pending.delete(current);reject(Error('CDP timeout: '+method));},12000);pending.set(current,{resolve,reject,timer});ws.send(JSON.stringify({id:current,method,params}));});
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
 await send('Page.enable');await send('Runtime.enable');
 const wait=async expression=>{for(let n=0;n<125;n++){if(await evaluate(expression))return;await sleep(80);}throw Error('Wait failed: '+expression);};
 return {send,evaluate,wait,errors,close:async()=>{try{await send('Browser.close');}catch{}ws.close();}};
}
async function run(options){
 const root=fs.realpathSync(options.root),out=path.resolve(options.out),chromePath=options.chrome;
 if(fs.existsSync(out))throw Error('Output directory already exists; preserve earlier evidence');
 if(!fs.existsSync(chromePath))throw Error('Chrome executable not found');
 const allowed=[path.join(root,'docs')+path.sep,os.tmpdir()+path.sep].map(p=>p.toLowerCase());if(!allowed.some(p=>(out+path.sep).toLowerCase().startsWith(p)))throw Error('Output must be a new directory under project docs or system temp');
 fs.mkdirSync(out,{recursive:true});
 const result={root,route:options.route,node:process.version,chromePath,noSandbox:!!options.noSandbox,results:[],networkErrors:[],runtimeErrors:[],limitations:['Viewport simulation is not physical Safari or native keyboard testing.','Only selected cases/groups; no PWA, cache, deployment or mathematical-oracle audit.']};
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'chagok-ui-skill-'));result.profile=profile;
 let chrome,page,server;
 try{
  if(!options.route.startsWith('/')||options.route.includes('..')||options.route.startsWith('//'))throw Error('Use a local absolute route without traversal');
  server=http.createServer((req,res)=>{try{
   const url=new URL(req.url,'http://local'),name=decodeURIComponent(url.pathname);if(name==='/favicon.ico'){res.writeHead(204);return res.end();}
   if(name.split('/').some(p=>p.startsWith('.')))throw Error('Hidden path');
   const file=fs.realpathSync(path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name)));if(!file.startsWith(root+path.sep))throw Error('Outside root');
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
  }catch{result.networkErrors.push(req.url);res.writeHead(404);res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+options.route;
  const flags=['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'];if(options.noSandbox)flags.unshift('--no-sandbox');
  chrome=cp.spawn(chromePath,flags,{windowsHide:true,stdio:['ignore','ignore','pipe']});let stderr='';chrome.stderr.on('data',b=>{stderr=(stderr+b).slice(-2000);});chrome.on('error',e=>{result.launchError=e.message;});
  page=await connect(profile);await page.send('Page.navigate',{url});result.url=url;
  const suite=require(path.resolve(options.cases||path.join(__dirname,'chagok-cases.cjs')));
  await suite.setup?.(page);
  page.click=async selector=>{const point=await page.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing element');el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();if(r.width<=0||r.height<=0||r.top<0||r.bottom>innerHeight)throw Error('Button inaccessible');return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);for(const type of ['mousePressed','mouseReleased'])await page.send('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});};
  page.capture=async name=>{if(!/^[a-z0-9-]+$/.test(name))throw Error('Unsafe screenshot name');const shot=await page.send('Page.captureScreenshot',{format:'png'}),file=name+'.png';fs.writeFileSync(path.join(out,file),Buffer.from(shot.data,'base64'),{flag:'wx'});return file;};
  const cases=suite.cases.filter(c=>!options.groups||options.groups.includes(c.group));if(!cases.length)throw Error('No selected UI cases');
  for(const size of options.sizes){await page.send('Emulation.setDeviceMetricsOverride',{...size,deviceScaleFactor:1,mobile:false});for(const test of cases){try{
   const observed=await test.run(page,{...size,capture:!!options.capture});result.results.push({case:test.id,group:test.group,...size,status:observed?.status==='untested'?'untested':'passed',observed});
  }catch(error){result.results.push({case:test.id,group:test.group,...size,status:'failed',error:error.message});}}}
  result.runtimeErrors=page.errors;if(page.errors.length||result.networkErrors.length)result.results.push({case:'runtime/resources',status:'failed',error:'Runtime or HTTP errors observed'});
  result.browserVersion=(await page.send('Browser.getVersion')).product;
 }catch(error){result.results.push({case:'setup',status:'untested',error:error.message});}
 finally{if(page)await page.close();if(chrome&&!chrome.killed)chrome.kill();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r));}}
 result.summary=Object.fromEntries(['passed','failed','untested'].map(s=>[s,result.results.filter(r=>r.status===s).length]));
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});return result;
}
module.exports={run};
if(require.main===module){const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];try{
 const sizes=(args.includes('--sizes')?get('--sizes'):'320x400,375x700,1440x900').split(',').map(v=>{if(!/^\d+x\d+$/.test(v))throw Error('Use WIDTHxHEIGHT');const [width,height]=v.split('x').map(Number);if(width<200||height<200||width>3840||height>3840)throw Error('Unsupported viewport size');return {width,height};});
 run({root:args.includes('--root')?get('--root'):process.cwd(),chrome:get('--chrome'),out:get('--out'),route:args.includes('--route')?get('--route'):'/index.html',groups:args.includes('--groups')?get('--groups').split(','):null,cases:args.includes('--cases')?get('--cases'):null,sizes,capture:args.includes('--capture'),noSandbox:args.includes('--allow-test-no-sandbox')}).then(r=>{console.log(JSON.stringify(r.summary));process.exitCode=r.summary.failed?1:r.summary.untested?2:0;}).catch(e=>{console.error(e.message);process.exitCode=2;});
 }catch(e){console.error(e.message);process.exitCode=2;}}
