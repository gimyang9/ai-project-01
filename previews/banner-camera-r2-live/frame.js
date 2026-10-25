const params=new URLSearchParams(location.search),banner=document.querySelector('.forest-banner');
let mode=params.get('mode')==='current'?'current':'improved',context=params.get('context')==='app'?'app':'banner',scheduled=false;
document.querySelector('#home-date').textContent='10월 26일 (월)';
document.querySelector('#home-streak').textContent='오늘도 작은 공부를 기록해요.';
document.querySelectorAll('a,button').forEach(e=>e.addEventListener('click',ev=>ev.preventDefault()));
function apply(){banner.classList.toggle('camera-continuous',mode==='improved');document.body.dataset.context=context;reportSoon();}
function reportSoon(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;report();});}
function report(){
 const b=banner.getBoundingClientRect(),img=document.querySelector('.forest-image'),i=img.getBoundingClientRect(),logo=document.querySelector('.forest-copy').getBoundingClientRect(),cottage=document.querySelector('.banner-cottage').getBoundingClientRect();
 const gaps={left:Math.max(0,i.left-b.left),right:Math.max(0,b.right-i.right),top:Math.max(0,i.top-b.top),bottom:Math.max(0,b.bottom-i.bottom)};
 const metrics={type:'banner-review:metrics',mode,context,frameWidth:innerWidth,bannerWidth:b.width,bannerHeight:b.height,height:context==='app'?900:Math.ceil(document.querySelector('.home-intro').getBoundingClientRect().bottom+24),maxGap:Math.max(...Object.values(gaps)),gaps,background:{width:i.width,height:i.height,left:i.left-b.left,top:i.top-b.top},logo:{width:logo.width,left:logo.left-b.left,top:logo.top-b.top},cottage:{width:cottage.width,height:cottage.height,left:cottage.left-b.left},imageRatio:img.naturalWidth/img.naturalHeight,imagesLoaded:img.complete&&img.naturalWidth>0&&document.querySelector('.home-brand-logo').complete};
 window.reviewMetrics=metrics;
 if(parent!==window)parent.postMessage(metrics,'*');
}
window.addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='banner-review:set')return;mode=e.data.mode==='current'?'current':'improved';context=e.data.context==='app'?'app':'banner';apply();});
const observer=new ResizeObserver(reportSoon);observer.observe(banner);observer.observe(document.querySelector('.home-intro'));
window.addEventListener('resize',reportSoon);document.images&&[...document.images].forEach(i=>i.addEventListener('load',reportSoon));document.fonts.ready.then(reportSoon);apply();
