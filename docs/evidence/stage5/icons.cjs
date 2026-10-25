const fs=require('fs'),path=require('path'),connect=require('./cdp.cjs');
(async()=>{const c=await connect(process.argv[2]);try{for(const [size,name] of [[192,'icon-192.png'],[512,'icon-512.png'],[180,'apple-touch-icon.png']]){
 await c.send('Emulation.setDeviceMetricsOverride',{width:size,height:size,deviceScaleFactor:1,mobile:false});
 await c.send('Page.navigate',{url:'file:///'+path.join(process.cwd(),'assets/favicon.svg').replaceAll('\\','/')});
 for(let i=0;i<80;i++){if(await c.evaluate("document.documentElement?.tagName.toLowerCase()==='svg'"))break;await new Promise(r=>setTimeout(r,50));}
 await c.evaluate("document.documentElement.style.background='#f5ecd9'");await new Promise(r=>setTimeout(r,100));
 const shot=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 for(const p of ['','dist/'])fs.writeFileSync(p+'assets/'+name,Buffer.from(shot.data,'base64'));
}console.log('Existing SVG favicon rendered at 192, 512 and 180 pixels.');}finally{await c.close();}})().catch(e=>{console.error(e);process.exitCode=1;});