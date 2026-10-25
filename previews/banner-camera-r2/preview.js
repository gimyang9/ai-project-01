const range=document.getElementById('width-range'),number=document.getElementById('width-number');
let width=Number(new URLSearchParams(location.search).get('width'))||767;
function fit(){width=Math.max(320,Math.min(1920,Math.round(width)));range.value=number.value=width;const scales=[];
document.querySelectorAll('iframe').forEach(frame=>{const wrap=frame.parentElement;const scale=Math.min(1,(wrap.clientWidth-2)/width);frame.style.width=width+'px';frame.style.height='900px';frame.style.transform='scale('+scale+')';wrap.style.height=(900*scale)+'px';scales.push(Math.round(scale*100));});
document.getElementById('scale-label').textContent='비교 표시 '+Math.min(...scales)+'%';}
range.addEventListener('input',()=>{width=Number(range.value);fit()});number.addEventListener('change',()=>{width=Number(number.value)||320;fit()});
for(const w of [320,375,430,600,680,767,768,1023,1024,1280,1440,1920]){const b=document.createElement('button');b.textContent=w;b.addEventListener('click',()=>{width=w;fit()});document.getElementById('presets').append(b);}
window.addEventListener('resize',fit);fit();
