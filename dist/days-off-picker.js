/* Draft-only calendar. Completion updates the exam form; saving remains with the exam. */
(function(root){
'use strict';
function parse(value,valid){
 const tokens=String(value||'').split(/[\s,]+/).filter(Boolean),dates=new Set();let invalid=0;
 for(const token of tokens){if(valid(token))dates.add(token);else invalid++;}
 return {dates:[...dates].sort(),invalid};
}
let modal,target,onDone,returnFocus,draft,year,month,today,invalidCount;
const byId=id=>document.getElementById(id);
const dateString=(y,m,d)=>String(y).padStart(4,'0')+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
const arrow=(id)=>'<svg class="icon" aria-hidden="true"><use href="#i-'+id+'"/></svg>';
function ensure(){
 if(modal)return;
 modal=document.createElement('dialog');modal.id='days-off-dialog';modal.className='app-dialog days-off-dialog';modal.setAttribute('aria-labelledby','days-off-title');
 modal.innerHTML='<div class="dialog-header"><h2 id="days-off-title">쉬는 날짜</h2><button type="button" class="icon-button" data-off-cancel aria-label="닫기">×</button></div><div class="days-off-month-nav"><button type="button" class="icon-button" id="days-off-prev" data-off-month="-1" aria-label="이전 달">'+arrow('back')+'</button><b id="days-off-month-title" aria-live="polite"></b><button type="button" class="icon-button" id="days-off-next" data-off-month="1" aria-label="다음 달">'+arrow('chevron')+'</button></div><div class="days-off-weekdays" aria-hidden="true">'+['일','월','화','수','목','금','토'].map(d=>'<span>'+d+'</span>').join('')+'</div><div id="days-off-grid" class="days-off-grid" role="group" aria-label="쉬는 날짜 선택"></div><p class="days-off-legend">점선 테두리: 오늘</p><div class="days-off-selection-heading"><strong id="days-off-count" role="status"></strong><button type="button" class="subtle-button" data-off-clear>선택 초기화</button></div><div id="days-off-chips" class="days-off-chips" aria-label="선택한 쉬는 날짜"></div><p id="days-off-warning" class="field-help" role="status"></p><div class="dialog-actions"><button type="button" class="button cream" data-off-cancel>취소</button><button type="button" class="button primary" data-off-done>완료</button></div>';
 document.body.append(modal);
 modal.addEventListener('click',event=>{
  event.stopPropagation();
  if(event.target===modal){const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();return;}
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-off-cancel')){modal.close();return;}
  if(button.hasAttribute('data-off-done')){
   const values=[...draft].sort();
   target.value=values.join(', ');
   target.dispatchEvent(new Event('input',{bubbles:true}));
   if(onDone)onDone(values);
   modal.close();return;
  }
  if(button.dataset.offMonth){const n=year*12+month+Number(button.dataset.offMonth),y=Math.floor(n/12);if(y>=1000&&y<=9999){year=y;month=n%12;render();}return;}
  if(button.hasAttribute('data-off-clear')){draft.clear();render();modal.querySelector('[data-off-date]')?.focus({preventScroll:true});return;}
  const date=button.dataset.offDate||button.dataset.offRemove;
  if(date){if(draft.has(date))draft.delete(date);else draft.add(date);render();const focus=button.dataset.offDate?modal.querySelector('[data-off-date="'+date+'"]'):modal.querySelector('[data-off-remove]')||modal.querySelector('[data-off-date]');focus?.focus({preventScroll:true});}
 });
 document.addEventListener('keydown',event=>{if(modal.open&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();modal.close();}},true);
 modal.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();modal.close();});
 modal.addEventListener('close',()=>{if(modal.open)return;draft=null;target=null;onDone=null;if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
}
function render(){
 byId('days-off-month-title').textContent=year+'년 '+(month+1)+'월';
 byId('days-off-prev').disabled=year===1000&&month===0;byId('days-off-next').disabled=year===9999&&month===11;
 const offset=new Date(year,month,1).getDay(),count=new Date(year,month+1,0).getDate();
 byId('days-off-grid').innerHTML='<span class="days-off-blank" aria-hidden="true"></span>'.repeat(offset)+Array.from({length:count},(_,i)=>{
  const date=dateString(year,month,i+1),selected=draft.has(date);
  return '<button type="button" data-off-date="'+date+'" aria-label="'+date+'" aria-pressed="'+selected+'" class="'+(date===today?'today':'')+'" '+(date===today?'aria-current="date"':'')+'>'+(i+1)+'</button>';
 }).join('');
 byId('days-off-count').textContent='선택한 날짜 '+draft.size+'일';
 byId('days-off-chips').innerHTML=[...draft].sort().map(date=>'<button type="button" class="days-off-chip" data-off-remove="'+date+'" aria-label="'+date+' 선택 해제"><span>'+date.replaceAll('-','.')+'</span><span aria-hidden="true">×</span></button>').join('')||'<p class="field-help">쉬는 날짜를 선택해 주세요.</p>';
 byId('days-off-warning').textContent=invalidCount?'잘못된 날짜 '+invalidCount+'개는 선택에서 제외했어요. 취소하면 원래 입력은 유지됩니다.':'';
 byId('days-off-warning').hidden=!invalidCount;
 modal.querySelector('[data-off-clear]').disabled=draft.size===0;
}
function open(input,localDate,done){
 ensure();if(modal.open)return;
 const parsed=parse(input.value,root.StudyData.date);target=input;onDone=done;returnFocus=document.activeElement;today=localDate;draft=new Set(parsed.dates);invalidCount=parsed.invalid;
 const initial=parsed.dates.find(d=>d>=today)||parsed.dates.at(-1)||today;year=Number(initial.slice(0,4));month=Number(initial.slice(5,7))-1;
 render();modal.showModal();modal.scrollTop=0;modal.querySelector('[data-off-cancel]').focus({preventScroll:true});
}
if(typeof module!=='undefined'&&module.exports)module.exports={parse};else root.DaysOffPicker={open};
})(typeof window==='undefined'?this:window);
