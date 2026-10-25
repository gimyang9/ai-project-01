const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),connect=require('../stage6/cdp.cjs'),measure=require('./measure.cjs');
(async()=>{
 const dir=path.resolve('docs/evidence/responsive-audit'),root=path.resolve('dist'),seed=require('./seed.cjs'),phase=process.argv[3],results=[],screens=[],requests=[];
 const server=http.createServer((req,res)=>{const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1))||'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.woff2':'font/woff2','.woff':'font/woff','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(file));}catch{requests.push(req.url);res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/',c=await connect(process.argv[2]);
 const fixed="(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-10-26T12:00:00+09:00']))}static now(){return new D('2026-10-26T12:00:00+09:00').getTime()}}})()";
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),take=async(extra={})=>{const v=await c.evaluate('('+measure.toString()+')()');const row={...extra,...v};results.push(row);return row;};
 const go=async view=>{await c.evaluate(view==='detail'?"openDetail('m1')":"showView("+JSON.stringify(view)+")");};
 const viewport=async(w,h=840)=>{await c.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});await c.evaluate('new Promise(r=>requestAnimationFrame(r))');};
 const capture=async(name,full=false)=>{await c.settle();const m=await c.send('Page.getLayoutMetrics');const params={format:'png',captureBeyondViewport:full};if(full)params.clip={x:0,y:0,width:m.cssLayoutViewport.clientWidth,height:Math.min(7000,m.cssContentSize.height),scale:1};const r=await c.send('Page.captureScreenshot',params);fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(r.data,'base64'));screens.push(name+'.png');};
 try{
 await c.send('Page.addScriptToEvaluateOnNewDocument',{source:fixed+";if(location.protocol==='http:'&&!localStorage.getItem('chagok-v2-data-v1'))localStorage.setItem('chagok-v2-data-v1',"+JSON.stringify(JSON.stringify(seed))+");"});
 await viewport(1440,900);await c.send('Page.navigate',{url:base});for(let i=0;i<100;i++){if(await c.evaluate("typeof openDialog==='function'&&document.readyState==='complete'"))break;await pause(50);}await c.settle();
 const views=['home','goals','stats','more','detail'],widths=[320,375,430,680,768,1023,1024,1280,1440,1920];

 if(phase==='widths'){
  for(const view of views){await go(view);for(const w of widths){await viewport(w);await c.evaluate('window.scrollTo(0,0)');await take({phase:'major-width',view,width:w});await capture(view+'-'+w,w===320||w===1024||w===1440);}
   for(const direction of ['grow','shrink']){const steps=Array.from({length:101},(_,i)=>320+16*i);if(direction==='shrink')steps.reverse();for(const w of steps){await viewport(w);await take({phase:'sweep',direction,view,width:w});}}
   console.log('rendered widths and 16px bidirectional sweep:',view);
  }
  for(const w of [359,360,361,429,430,431,679,680,681,767,768,769,1022,1023,1024,1025,1150,1151,1399,1400,1401,1439,1440]){
   await viewport(w);for(const view of views){await go(view);await take({phase:'boundary',view,width:w});}
  }
  for(const w of [680,681,767,768,1023,1024,1150,1151,1399,1400]){await viewport(w);await go('home');await capture('boundary-home-'+w);}
 }

 if(phase==='modals'){
  const modes=['study-plan','record','review','material','memo','review-settings','review-date','settings','archive','material-menu','review-plan','exam-edit','exam-pause','exam-archive','exam-resit'];
  for(const [w,h] of [[320,400],[375,600],[430,840],[680,400],[768,600],[1024,400],[1440,900]]){
   await viewport(w,h);await go('home');
   for(const mode of modes){
    const expr=mode==='exam-edit'?"openExamDialog('edit','g0')":mode==='exam-pause'?"openExamDialog('status','g0','paused')":mode==='exam-archive'?"openExamDialog('status','g0','archived')":mode==='exam-resit'?"openExamDialog('resit','g0')":"openDialog("+JSON.stringify(mode)+",'m1',"+(mode==='material')+")";
    await c.evaluate(expr);const info=await take({phase:'modal',mode,width:w,viewportHeight:h});
    const reach=await c.evaluate("(()=>{const d=document.querySelector('dialog[open]');const b=d.querySelector('.dialog-actions button[type=submit]')||[...d.querySelectorAll('button')].at(-1);if(!b)return null;b.scrollIntoView({block:'end',behavior:'instant'});const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,e=document.elementFromPoint(x,y);return {text:b.textContent.trim(),x,y,height:r.height,visible:y>=0&&y<innerHeight&&x>=0&&x<innerWidth,hit:!!e&&(e===b||b.contains(e)),dialogScroll:d.scrollTop};})()");
    info.actionReach=reach;if((w===320||w===1024||w===1440)&&['study-plan','review','material','exam-pause','exam-archive','exam-edit','archive'].includes(mode)){await c.evaluate('dialog.scrollTop=0');await capture('modal-'+mode+'-'+w+'x'+h);}
    await c.evaluate('dialog.close()');
   }console.log('modals rendered',w,h);
  }
  for(const [w,h] of [[320,300],[1024,300],[1440,400]]){await viewport(w,h);for(const view of views){await go(view);const info=await take({phase:'short-window',view,width:w,viewportHeight:h});await c.evaluate("document.querySelector('.nav-item:last-of-type').scrollIntoView({block:'nearest',behavior:'instant'})");info.navReach=await c.evaluate("(()=>{const e=document.querySelector('.nav-item:last-of-type'),r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,inView:r.top>=0&&r.bottom<=innerHeight};})()");await capture('short-'+view+'-'+w+'x'+h);}}
 }

 if(phase==='zoom'){
  await c.send('Emulation.clearDeviceMetricsOverride');const target=await c.send('Target.createTarget',{url:'chrome://settings/'}),settings=await connect(process.argv[2],target.targetId);await pause(700);
  const windowId=(await c.send('Browser.getWindowForTarget')).windowId;
  for(const physical of [680,1024,1440,1920]){
   await settings.evaluate('chrome.settingsPrivate.setDefaultZoom(1)');await c.send('Browser.setWindowBounds',{windowId,bounds:{width:physical+22,height:998}});await pause(100);
   for(const zoom of [.8,.9,1,1.1,1.25,1.5,2]){
    await settings.evaluate('chrome.settingsPrivate.setDefaultZoom('+zoom+')');const actualZoom=await settings.evaluate('new Promise(r=>chrome.settingsPrivate.getDefaultZoom(r))');await c.send('Page.bringToFront');await pause(100);
    for(const view of views){await go(view);await take({phase:'browser-zoom',view,requestedPhysicalWidth:physical,zoom,actualZoom});}
    if(physical===1024||physical===1440){await go('home');await capture('zoom-home-'+physical+'-'+Math.round(zoom*100));}
    for(const mode of ['study-plan','review','exam-edit','exam-archive']){
     await c.evaluate(mode==='exam-edit'?"openExamDialog('edit','g0')":mode==='exam-archive'?"openExamDialog('status','g0','archived')":"openDialog("+JSON.stringify(mode)+",'m1')");
     const info=await take({phase:'zoom-modal',mode,requestedPhysicalWidth:physical,zoom,actualZoom});
     info.actionReach=await c.evaluate("(()=>{const b=document.querySelector('dialog[open] .dialog-actions button[type=submit]');if(!b)return null;b.scrollIntoView({block:'end',behavior:'instant'});const r=b.getBoundingClientRect(),e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {height:r.height,visible:r.y>=0&&r.bottom<=innerHeight,hit:!!e&&(e===b||b.contains(e))};})()");
     if(physical===1024&&zoom===2){await c.evaluate('dialog.scrollTop=0');await capture('zoom-modal-'+mode+'-1024-200');}
     await c.evaluate('dialog.close()');
    }
   }console.log('actual browser zoom tested',physical,'80..200%');
  }
  await settings.evaluate('chrome.settingsPrivate.setDefaultZoom(1)');await c.send('Page.bringToFront');
  for(const view of views){await go(view);for(const direction of ['grow','shrink']){let ww=Array.from({length:41},(_,i)=>320+40*i);if(direction==='shrink')ww.reverse();for(const width of ww){await c.send('Browser.setWindowBounds',{windowId,bounds:{width:width+22,height:838}});await pause(20);await take({phase:'native-window-sweep',view,direction,requestedWidth:width});}}console.log('native window grow/shrink',view);}
  await c.send('Target.closeTarget',{targetId:target.targetId});
 }


 if(phase==='investigate'){
  for(const w of [320,430,500,540,600,680,681,700,767,768,1023,1024,1150,1151,1280,1399,1400,1440,1920]){
   await viewport(w);await go('home');
   const info=await take({phase:'banner-investigate',view:'home',width:w});
   info.scenery=await c.evaluate("(()=>{const sels=['.forest-banner','.forest-copy','.forest-image','.home-brand-logo','.banner-cottage','.banner-cottage img','.home-overview','.summary-stack'];return sels.map(sel=>{const e=document.querySelector(sel),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {sel,rect:r.toJSON(),position:s.position,zIndex:s.zIndex,overflow:s.overflow,transform:s.transform,containerType:s.containerType,natural:e.naturalWidth?[e.naturalWidth,e.naturalHeight]:null};});})()");
   if([430,500,540,600,680,767,768,1023,1024,1151,1440,1920].includes(w)){await c.settle();const r=await c.evaluate("document.querySelector('.forest-banner').getBoundingClientRect().toJSON()");const shot=await c.send('Page.captureScreenshot',{format:'png',clip:{x:Math.max(0,r.x),y:r.y,width:Math.min(r.width,info.innerWidth),height:r.height,scale:1},captureBeyondViewport:true});const name='issue-banner-'+w+'.png';fs.writeFileSync(path.join(dir,name),Buffer.from(shot.data,'base64'));screens.push(name);}
  }
  for(const [w,h] of [[320,400],[375,400],[430,400],[680,400],[1024,400],[1440,400],[320,600],[375,600],[430,600],[768,600]]){
   await viewport(w,h);await go('home');
   for(const mode of ['exam-pause','exam-archive']){
    await c.evaluate("openExamDialog('status','g0',"+JSON.stringify(mode==='exam-pause'?'paused':'archived')+")");const info=await take({phase:'user-wheel',mode,width:w,viewportHeight:h});
    info.before=await c.evaluate("(()=>{const d=document.querySelector('dialog[open]'),b=d.querySelector('.dialog-actions button[type=submit]'),r=b.getBoundingClientRect(),help=d.querySelector('.exam-choice-help'),list=d.querySelector('.exam-choice-list');return {action:r.toJSON(),help:help.getBoundingClientRect().toJSON(),list:list.getBoundingClientRect().toJSON(),listScroll:list.scrollTop,dialogScroll:d.scrollTop};})()");
    const x=info.dialog.x+info.dialog.w/2,y=Math.min(h-65,info.dialog.y+info.dialog.h-95);
    await c.send('Input.dispatchMouseEvent',{type:'mouseWheel',x,y,deltaX:0,deltaY:850});await pause(100);
    info.afterWheel=await c.evaluate("(()=>{const d=document.querySelector('dialog[open]'),b=d.querySelector('.dialog-actions button[type=submit]'),r=b.getBoundingClientRect(),list=d.querySelector('.exam-choice-list'),x=r.x+r.width/2,y=r.y+r.height/2,e=document.elementFromPoint(x,y);return {action:r.toJSON(),hit:!!e&&(e===b||b.contains(e)),visible:r.y>=0&&r.bottom<=innerHeight,dialogScroll:d.scrollTop,listScroll:list.scrollTop};})()");
    await capture('wheel-'+mode+'-'+w+'x'+h);
    const list=info.before.list;await c.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:list.x+list.width/2,y:Math.min(h-80,list.y+list.height/2),deltaX:0,deltaY:850});await pause(100);
    info.listAfterWheel=await c.evaluate("document.querySelector('.exam-choice-list').scrollTop");await c.evaluate('dialog.close()');
   }
  }
  for(const w of [320,375,430,680,768,1024,1440,1920]){
   await viewport(w);await go('goals');await c.evaluate("document.querySelectorAll('.linked-toggle').forEach(b=>b.click())");await take({phase:'expanded-goals',view:'goals',width:w});if(w===320||w===1024)await capture('expanded-goals-'+w,true);
   await go('detail');for(const tab of ['review','basic']){await c.evaluate('renderDetailTab('+JSON.stringify(tab)+')');await take({phase:'detail-tabs',view:'detail',tab,width:w});if(w===320||w===1024)await capture('detail-'+tab+'-'+w,true);}
   await go('stats');for(const period of ['week','month','quarter','half']){await c.evaluate('renderStats('+JSON.stringify(period)+')');await take({phase:'stats-periods',view:'stats',period,width:w});}
  }
 }

 if(phase==='evidence'){
  for(const w of [320,375,430,680,768,1024,1440,1920]){
   await viewport(w,840);await go('goals');await c.evaluate("document.querySelectorAll('.linked-toggle[aria-expanded=false]').forEach(b=>b.click())");const info=await take({phase:'expanded-goal-evidence',view:'goals',width:w});
   await c.evaluate("(()=>{const e=[...document.querySelectorAll('.linked-materials strong')].find(e=>e.textContent.startsWith('VeryLong'));if(e){const r=e.getBoundingClientRect();window.scrollTo({top:r.y+scrollY-180,left:0,behavior:'instant'})}})()");if([320,1024,1440].includes(w))await capture('issue-linked-name-'+w);
   await go('stats');await c.evaluate("statsGroup='exam';renderStats('month');document.querySelector('.proportion-panel').scrollIntoView({block:'center',behavior:'instant'})");const stats=await take({phase:'stats-name-evidence',view:'stats',width:w});
   stats.textRanges=await c.evaluate("(()=>{const panel=document.querySelector('.proportion-panel');return [...panel.querySelectorAll('.proportion-list li')].map(li=>{const span=li.querySelector('span'),b=li.querySelector('b'),range=document.createRange();range.selectNodeContents(span);return {name:span.textContent,span:span.getBoundingClientRect().toJSON(),ink:range.getBoundingClientRect().toJSON(),percentage:b.getBoundingClientRect().toJSON()};})})()");
   if([320,1024,1440].includes(w))await capture('issue-stats-name-'+w);
  }
  await c.send('Emulation.clearDeviceMetricsOverride');const t=await c.send('Target.createTarget',{url:'chrome://settings/'}),settings=await connect(process.argv[2],t.targetId);await pause(500);const windowId=(await c.send('Browser.getWindowForTarget')).windowId;
  for(const physical of [680,1024,1440]){await c.send('Browser.setWindowBounds',{windowId,bounds:{width:physical+22,height:998}});
   for(const zoom of [1,1.25,1.5,2]){
    await settings.evaluate('chrome.settingsPrivate.setDefaultZoom('+zoom+')');await c.send('Page.bringToFront');await pause(80);
    await go('goals');await c.evaluate("document.querySelectorAll('.linked-toggle[aria-expanded=false]').forEach(b=>b.click())");await take({phase:'expanded-goal-zoom',view:'goals',requestedPhysicalWidth:physical,zoom});
    await go('stats');await c.evaluate("statsGroup='exam';renderStats('month')");await take({phase:'stats-name-zoom',view:'stats',requestedPhysicalWidth:physical,zoom});
    if(physical===1024&&zoom===2){await c.evaluate("document.querySelector('.proportion-panel').scrollIntoView({block:'center',behavior:'instant'})");await capture('issue-stats-name-zoom200');}
   }
  }await settings.evaluate('chrome.settingsPrivate.setDefaultZoom(1)');await c.send('Target.closeTarget',{targetId:t.targetId});
 }
 fs.writeFileSync(path.join(dir,phase+'-results.json'),JSON.stringify({browser:await c.send('Browser.getVersion'),phase,source:'dist served on isolated loopback; synthetic fixture only',results,screens,errors:c.errors,missingRequests:requests},null,2));
 console.log('saved',phase,results.length,'measurements,',screens.length,'screenshots',c.errors.length,'runtime errors');
 }finally{await c.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});