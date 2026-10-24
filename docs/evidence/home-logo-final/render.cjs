
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const qa=path.join(process.cwd(),'docs/evidence/home-logo-final'),profile=process.argv[2];
 let lines;
 for(let i=0;i<100;i++){try{lines=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 if(!lines)throw Error('Headless Chrome debug endpoint not ready');
 const port=Number(lines[0]),targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 let next=0;const pending=new Map();
 ws.onmessage=event=>{const m=JSON.parse(event.data);if(pending.has(m.id)){const {resolve,reject,timer}=pending.get(m.id);clearTimeout(timer);pending.delete(m.id);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);}};
 function send(method,params={}){return new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},25000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
 await send('Page.enable');const results=[];
 try{
  for(const variant of ['app'])for(const width of [320,390,430,680,681,767,768,900,1023,1024,1150,1280,1439,1440,1920]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:740,screenWidth:width,screenHeight:740,deviceScaleFactor:1,mobile:width<681});
   await send('Page.navigate',{url:'file:///'+path.join(process.cwd(),'index.html').replaceAll('\\','/')});
   let info;
   for(let i=0;i<60;i++){
    const r=await send('Runtime.evaluate',{expression:`(async()=>{if(document.readyState!=='complete')return null;await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const logo=document.querySelector('.home-brand-logo'),banner=document.querySelector('.forest-banner');if(!logo)return null;const l=logo.getBoundingClientRect(),b=banner.getBoundingClientRect();return {viewport:innerWidth,logo:{x:l.x,y:l.y,width:l.width,height:l.height},banner:{x:b.x,y:b.y,width:b.width,height:b.height},image:{fit:getComputedStyle(document.querySelector('.forest-image')).objectFit,position:getComputedStyle(document.querySelector('.forest-image')).objectPosition},logoLoaded:logo.naturalWidth>0,subtitleRemoved:!document.querySelector('.forest-copy .brand-subtitle')};})()`,awaitPromise:true,returnByValue:true});
    info=r.result.value;if(info)break;await new Promise(r=>setTimeout(r,100));
   }
   assert.ok(info);assert.equal(info.viewport,width);assert.equal(info.logoLoaded,true);assert.equal(info.subtitleRemoved,true);
   assert.ok(info.logo.x>=info.banner.x&&info.logo.x+info.logo.width<=info.banner.x+info.banner.width);
   if(width>=768)assert.ok(Math.abs(info.banner.width/info.banner.height-3)<0.02);
   const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   fs.writeFileSync(path.join(qa,variant+'-'+width+'.png'),Buffer.from(shot.data,'base64'));results.push({variant,width,...info});
  }
  fs.writeFileSync(path.join(qa,'render-results.json'),JSON.stringify({browser:'Chrome headless with exact CDP viewport; mobile simulation, not Safari',screens:results},null,2));
  console.log('Rendered and measured '+results.length+' exact-viewport screens.');
 }finally{
  try{ws.send(JSON.stringify({id:++next,method:'Browser.close'}));await new Promise(resolve=>{ws.addEventListener('close',resolve,{once:true});setTimeout(resolve,2000).unref();});}catch{}ws.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
