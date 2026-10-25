/* Pure actual-history statistics; no storage writes or inferred study time. */
(function(root){
 'use strict';
 function rows(state,today,study){
  const out=[];
  for(const m of state.study.materials){
   for(const round of [...m.roundHistory,{records:m.records,total:m.total,unit:m.unit,round:m.round}]){
    for(const r of study.calculate(round.records,round.total))if(r.date<=today&&r.amount>0)out.push({...r,kind:'study',materialId:m.id,name:m.name,unit:r.unit||round.unit,round:round.round,start:r.position-r.amount+1,end:r.position});
   }
   for(const r of m.reviews)if(r.date<=today)out.push({...r,kind:'review',amount:r.end-r.start+1,materialId:m.id,name:m.name});
  }
  return out.sort((a,b)=>a.date.localeCompare(b.date)||a.sequence-b.sequence);
 }
 function monthStart(today,delta=0){const [year,month]=today.split('-').map(Number),n=year*12+month-1+delta;return String(Math.floor(n/12)).padStart(4,'0')+'-'+String((n%12+12)%12+1).padStart(2,'0')+'-01';}
 function period(today,kind,learning){
  if(!['week','month','quarter','half'].includes(kind))throw Error('통계 기간을 확인해 주세요.');
  const start=kind==='week'?learning.shift(today,-learning.weekday(today)):monthStart(today,kind==='quarter'?-2:kind==='half'?-5:0);
  const bins=[];
  if(kind==='week')for(let i=0;i<7;i++)bins.push({key:learning.shift(start,i),label:['월','화','수','목','금','토','일'][i],study:0,review:0});
  else if(kind==='month'){const days=Number(today.slice(8));for(let i=0;i<Math.ceil(days/7);i++)bins.push({key:String(i),label:(i+1)+'주',study:0,review:0});}
  else for(let i=0;i<(kind==='quarter'?3:6);i++){const date=monthStart(today,i-(kind==='quarter'?2:5));bins.push({key:date.slice(0,7),label:Number(date.slice(5,7))+'월',study:0,review:0});}
  return {start,end:today,bins};
 }
 function shares(records,state,by='exam'){
  const groups=new Map();
  for(const r of records.filter(r=>r.kind==='study')){
   const linked=by==='material'?[{id:r.materialId,name:r.name}]:state.exams.goals.filter(g=>g.materialIds.includes(r.materialId));
   const targets=linked.length?linked:[{id:'independent',name:'독립 학습'}],weight=1/targets.length;
   for(const g of targets){const key=by+':'+g.id;if(!groups.has(key))groups.set(key,{id:g.id,name:g.name,value:0});groups.get(key).value+=weight;}
  }
  const total=records.filter(r=>r.kind==='study').length;
  return [...groups.values()].map(g=>({...g,percent:total?g.value/total*100:0})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name));
 }
 function summarize(state,today,kind,study,learning){
  if(!study.date(today))throw Error('통계 기준 날짜를 확인해 주세요.');
  const window=period(today,kind,learning),records=rows(state,today,study).filter(r=>r.date>=window.start);
  const units=new Map();
  for(const r of records){const key=r.kind+':'+r.unit;if(!units.has(key))units.set(key,{kind:r.kind,unit:r.unit,amount:0});units.get(key).amount+=r.amount;}
  for(const r of records){const key=kind==='week'?r.date:kind==='month'?String(Math.floor((Number(r.date.slice(8))-1)/7)):r.date.slice(0,7);const bin=window.bins.find(b=>b.key===key);if(bin)bin[r.kind]++;}
  return {...window,records,study:records.filter(r=>r.kind==='study').length,review:records.filter(r=>r.kind==='review').length,days:new Set(records.map(r=>r.date)).size,units:[...units.values()],exams:shares(records,state),materials:shares(records,state,'material')};
 }
 function calendar(state,today,study,reviewSnapshot){
  const dates={};
  const day=date=>dates[date]||(dates[date]={records:[],scheduled:[],focus:[]});
  for(const r of rows(state,today,study))day(r.date).records.push(r);
  for(const m of reviewSnapshot.materials){
   for(const s of m.segments)if(s.dueDate)day(s.dueDate).scheduled.push({...s,materialId:m.id});
   if(m.focus?.startDate)day(m.focus.startDate).focus.push({...m.focus,materialId:m.id});
  }
  return dates;
 }
 const api={rows,monthStart,period,shares,summarize,calendar};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudyStats=api;
})(typeof window==='undefined'?this:window);
