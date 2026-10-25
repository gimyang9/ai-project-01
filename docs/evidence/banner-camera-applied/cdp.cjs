const fs=require('fs'),path=require('path');
module.exports=async function connect(profile,targetId){
 let lines;for(let i=0;i<100;i++){try{lines=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 if(!lines)throw Error('Chrome endpoint unavailable');
 const targets=await(await fetch('http://127.0.0.1:'+lines[0]+'/json/list')).json(),ws=new WebSocket((targetId?targets.find(t=>t.id===targetId):targets.find(t=>t.type==='page')).webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let next=0;const pending=new Map(),errors=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout '+method+' '+String(params.expression||'').slice(0,180)));},25000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const settle=()=>evaluate("(async()=>{await document.fonts?.ready;await Promise.all([...document.images||[]].map(i=>i.decode().catch(()=>{})));await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()");
 const close=async()=>{try{ws.send(JSON.stringify({id:++next,method:'Browser.close'}));await new Promise(r=>{ws.addEventListener('close',r,{once:true});setTimeout(r,2000).unref();});}catch{}ws.close();};
 await send('Page.enable');await send('Runtime.enable');return {send,evaluate,settle,close,errors};
};