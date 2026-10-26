/* Presentation only. Consume the existing non-overlapping recommendations; never reschedule. */
(function(root){
'use strict';
function build(snapshot,state,today,D,E,L){
 const lists={due:[],overdue:[]},seen=new Set();
 for(const row of snapshot.today){
  const m=state.study.materials.find(m=>m.id===row.materialId);if(!m||m.archived||E.materialStatus(state.exams,m.id)!=='active')continue;
  const regular=row.sources.includes('regular'),due=regular?row.dueDate:today;
  if(!due||due>today)continue;
  const round=row.round||m.round,key=JSON.stringify([m.id,m.unit,round,row.start,row.end]);
  if(seen.has(key))continue;seen.add(key);
  const learned=D.project(m).current;
  const exams=row.end<=learned?state.exams.goals.filter(g=>g.status==='active'&&g.date&&g.date>=today&&g.materialIds.includes(m.id)):[];
  const days=exams.length?Math.min(...exams.map(g=>L.diff(g.date,today))):Infinity;
  let urgency=days<=3?3:days<=7?2:days<=14?1:0;
  const focus=snapshot.materials.find(p=>p.id===m.id)?.focus;
  const inFocus=row.sources.includes('focus')&&focus?.started;
  if(inFocus)urgency=Math.max(urgency,2);
  const difficulty={'어려움':3,'보통':1.5,'쉬움':0}[row.understanding]??1.5;
  const delay=Math.min(2,Math.max(0,L.diff(today,due))/7);
  const reason=days<=7?'시험이 가까워 먼저 복습하면 좋아요.':inFocus?'시험 전 집중 복습 범위예요.':row.understanding==='어려움'?'이전에 어려웠던 범위예요.':due<today?'복습 예정일이 지났어요.':'';
  lists[due<today?'overdue':'due'].push({...row,unit:m.unit,round,key,displayDue:due,rank:urgency+difficulty+delay,reason});
 }
 const compare=(a,b)=>b.rank-a.rank||a.displayDue.localeCompare(b.displayDue)||(a.key<b.key?-1:a.key>b.key?1:0);
 const group=rows=>{
  const groups=new Map();
  for(const row of rows.sort(compare)){if(!groups.has(row.materialId))groups.set(row.materialId,{id:row.materialId,name:state.study.materials.find(m=>m.id===row.materialId).name,items:[]});groups.get(row.materialId).items.push(row);}
  return [...groups.values()].sort((a,b)=>compare(a.items[0],b.items[0])||(a.id<b.id?-1:a.id>b.id?1:0));
 };
 return {due:group(lists.due),overdue:group(lists.overdue),counts:{due:lists.due.length,overdue:lists.overdue.length}};
}
const api={build};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TodayReviewView=api;
})(typeof window==='undefined'?this:window);
