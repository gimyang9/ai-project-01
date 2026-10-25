const frame=document.getElementById('banner-frame'),stage=document.getElementById('stage'),workbench=document.getElementById('workbench'),handle=document.getElementById('resize-handle'),follow=document.getElementById('follow-window'),input=document.getElementById('frame-width'),contextSelect=document.getElementById('context');
let mode='improved',context='banner',manualWidth=768,drag=null;
const clamp=w=>Math.min(2560,Math.max(240,w));
function send(){frame.contentWindow?.postMessage({type:'banner-review:set',mode,context},'*');}
function label(){document.getElementById('mode-label').textContent=(mode==='improved'?'개선 배너':'기존 배너')+' · '+(follow.checked?'브라우저 연동':'드래그/수동 너비');}
function setWidth(w){const width=clamp(w);stage.style.width=width+'px';input.value=String(Math.round(width));handle.setAttribute('aria-valuenow',String(Math.round(width)));label();}
function fit(){if(follow.checked){const s=getComputedStyle(workbench);setWidth(workbench.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-4);}else setWidth(manualWidth);}
function manual(w){follow.checked=false;manualWidth=clamp(w);setWidth(manualWidth);}
handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();manual(stage.getBoundingClientRect().width);drag={id:e.pointerId,startX:e.clientX,startWidth:manualWidth};handle.setPointerCapture(e.pointerId);document.body.classList.add('is-resizing');});
handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;manual(drag.startWidth+e.clientX-drag.startX);});
function end(e){if(!drag||e.pointerId!==drag.id)return;drag=null;document.body.classList.remove('is-resizing');if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);}
handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);handle.addEventListener('lostpointercapture',()=>{drag=null;document.body.classList.remove('is-resizing')});
handle.addEventListener('keydown',e=>{let w=stage.getBoundingClientRect().width,step=e.shiftKey?10:1;if(e.key==='ArrowLeft')w-=step;else if(e.key==='ArrowRight')w+=step;else if(e.key==='Home')w=320;else if(e.key==='End')w=1920;else return;e.preventDefault();manual(w);});
input.addEventListener('input',()=>{const w=Number(input.value);if(Number.isFinite(w)&&w>=240&&w<=2560)manual(w)});
input.addEventListener('change',()=>manual(Number(input.value)||320));follow.addEventListener('change',fit);
contextSelect.addEventListener('change',()=>{context=contextSelect.value;send()});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));label();send()}));
for(const width of [320,375,430,600,680,767,768,936,1023,1024,1280,1440,1920]){const b=document.createElement('button');b.textContent=width+'px';b.dataset.width=width;b.addEventListener('click',()=>manual(width));document.getElementById('presets').append(b);}
window.addEventListener('message',e=>{if(e.source!==frame.contentWindow||e.data?.type!=='banner-review:metrics')return;const m=e.data;document.getElementById('actual-width').textContent='배너 실제 '+m.bannerWidth.toFixed(2)+'px · 높이 '+m.bannerHeight.toFixed(2)+'px · 프레임 '+m.frameWidth+'px';const status=document.getElementById('coverage');status.textContent=m.maxGap<=.5?'배경 빈 영역 없음':'배경 빈 영역 '+m.maxGap.toFixed(1)+'px';status.classList.toggle('warn',m.maxGap>.5);const h=m.height;if(Math.abs(parseFloat(frame.style.height||'360')-h)>1)frame.style.height=h+'px';window.lastBannerMetrics=m;});
frame.addEventListener('load',send);new ResizeObserver(fit).observe(workbench);window.addEventListener('resize',fit);fit();
