module.exports=function(){
 const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const label=e=>(e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,85);
 const key=e=>e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+[...e.classList].slice(0,3).join('.');
 const root=document.querySelector('dialog[open]')||document.querySelector('.view:not([hidden])');
 const elements=root?[...root.querySelectorAll('*')].filter(visible):[];
 const ignored=e=>e.closest('svg,.forest-banner,.plant-visual,.plant-sprite,.progress-track,.bar-chart,.donut');
 const horizontal=elements.filter(e=>!ignored(e)&&!['IMG','SVG','USE','OPTION'].includes(e.tagName)).map(e=>({el:e,r:rect(e)})).filter(({r})=>r.w>0&&(r.x < -1||r.right>innerWidth+1)).slice(0,25).map(({el,r})=>({selector:key(el),text:label(el),...r}));
 const clipped=elements.filter(e=>!ignored(e)&&e.children.length===0&&e.clientWidth>0&&e.scrollWidth>e.clientWidth+2).map(e=>({selector:key(e),text:label(e),clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,overflowX:getComputedStyle(e).overflowX,whiteSpace:getComputedStyle(e).whiteSpace})).slice(0,20);
 const siblings=[...root.querySelectorAll('.card-primary-actions,.dialog-actions,.segmented,.detail-page-top,.section-title')].filter(visible);
 const overlaps=[];for(const p of siblings){const c=[...p.children].filter(visible);for(let i=0;i<c.length;i++)for(let j=i+1;j<c.length;j++){const a=rect(c[i]),b=rect(c[j]);if(Math.min(a.right,b.right)-Math.max(a.x,b.x)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>2)overlaps.push({parent:key(p),a:label(c[i]),b:label(c[j])});}}
 const styles=sel=>{const e=document.querySelector(sel);if(!e||!visible(e))return null;const s=getComputedStyle(e);return {...rect(e),font:s.fontSize,padding:s.padding,gap:s.gap,minHeight:s.minHeight,cols:s.gridTemplateColumns,display:s.display,position:s.position,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,overflowY:s.overflowY}};
 const dialog=document.querySelector('dialog[open]');
 return {innerWidth,innerHeight,outerWidth,outerHeight,dpr:devicePixelRatio,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,horizontal,clipped,overlaps,nav:styles('.bottom-nav'),menu:styles('#view-more .more-list>button'),material:styles('.material-card'),goal:styles('.goal-card'),banner:styles('.forest-banner'),logo:styles('.forest-copy'),background:styles('.forest-image'),cottage:styles('.banner-cottage'),welcome:styles('.welcome-card'),dialog:dialog?{...styles('dialog[open]'),title:label(dialog.querySelector('h2')),contentScroll:styles('#dialog-content'),actions:[...dialog.querySelectorAll('.dialog-actions button')].map(e=>({text:label(e),...rect(e)}))}:null};
};