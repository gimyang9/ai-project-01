const test=require('node:test'),assert=require('node:assert/strict');
const V=require('../today-review-view.js'),D=require('../study-data.js'),E=require('../exam-management.js'),L=require('../learning-plan.js'),R=require('../review-plan.js');
const today='2026-10-26';
function state(ids=['a','b']){
 let s=D.envelope(D.emptyStudy(),D.emptyExams());
 for(const id of ids){s=D.update(s,{today,type:'material',material:{id,name:'같은 이름',type:'book',unit:id==='b'?'문제':'페이지',total:100}},E);s=D.update(s,{today,type:'record',id,record:{id:id+'-r',date:'2026-10-01',position:80}},E);}
 return s;
}
const row=(id,start,end,due,extra={})=>({materialId:id,start,end,dueDate:due,understanding:'보통',sources:['regular'],status:'복습 예정',...extra});
const snapshot=rows=>({today:rows,materials:[]});
test('filter current effective dates, focus-only today, exclude future; exact duplicates count once',()=>{
 const s=state(),rows=[row('a',1,5,today),row('a',6,10,'2026-10-20'),row('a',11,15,'2026-10-30'),row('b',1,5,'2026-10-30',{sources:['focus']})];
 rows.push({...rows[0]});const snap=snapshot(rows),raw=JSON.stringify({s,snap}),v=V.build(snap,s,today,D,E,L);
 assert.deepEqual(v.counts,{due:2,overdue:1});assert.equal(v.due.find(g=>g.id==='b').items[0].displayDue,today);assert.equal(JSON.stringify({s,snap}),raw);
});
test('same names keep material IDs/units separate; explicit distinct rounds never deduplicate',()=>{
 const s=state(),v=V.build(snapshot([row('a',1,5,today,{round:1}),row('a',1,5,today,{round:2}),row('b',1,5,today)]),s,today,D,E,L);
 assert.equal(v.due.length,2);assert.equal(v.counts.due,3);assert.equal(v.due.find(g=>g.id==='a').items.length,2);assert.equal(v.due.find(g=>g.id==='b').items[0].unit,'문제');
});
test('exam urgency, difficulty and bounded delay balance groups; range count does not dominate',()=>{
 let s=state(['urgent','hard','old']);
 s.exams=E.update(s.exams,{type:'upsert',goal:{id:'g',name:'시험',date:'2026-10-28',status:'active',note:'',materialIds:['urgent'],learningDays:[0,1],daysOff:[],focusMode:'auto',focusDate:'',continuedMaterialIds:[]}});
 const rows=[row('urgent',1,5,today,{understanding:'보통'}),row('hard',1,5,today,{understanding:'어려움'}),...Array.from({length:12},(_,i)=>row('old',i*2+1,i*2+2,'2025-01-01',{understanding:'쉬움'}))];
 const v=V.build(snapshot(rows),s,today,D,E,L);assert.equal(v.due[0].id,'urgent');assert.equal(v.overdue[0].id,'old');assert.ok(v.due.find(g=>g.id==='hard').items[0].rank>v.overdue[0].items[0].rank);
 const harder=V.build(snapshot([row('urgent',1,5,'2026-10-25',{understanding:'쉬움'}),row('hard',1,5,'2026-10-24',{understanding:'어려움'})]),s,today,D,E,L);assert.equal(harder.overdue[0].id,'hard');
});
test('equal rank uses original effective date then stable range identity',()=>{
 const s=state(['a']),snap=snapshot([row('a',11,15,'2026-01-02'),row('a',6,10,'2026-01-01'),row('a',1,5,'2026-01-01')]);
 const first=V.build(snap,s,today,D,E,L),second=V.build(snapshot([...snap.today].reverse()),s,today,D,E,L);
 assert.deepEqual(first,second);assert.deepEqual(first.overdue[0].items.map(r=>r.start),[1,6,11]);
});
test('real regular/focus partial overlap covers each page once and completion removes reviewed range',()=>{
 let s=state(['a']);s=D.update(s,{today,type:'review-settings',id:'a',amount:10},E);
 s.exams=E.update(s.exams,{type:'upsert',goal:{id:'g',name:'시험',date:'2026-11-01',status:'active',note:'',materialIds:['a'],learningDays:[0,1,2,3,4,5,6],daysOff:[],focusMode:'manual',focusDate:today,continuedMaterialIds:[]}});
 let snap=R.build(s,today,D,E,L),v=V.build(snap,s,today,D,E,L),all=[...v.due,...v.overdue].flatMap(g=>g.items),pages=all.flatMap(r=>Array.from({length:r.end-r.start+1},(_,i)=>r.start+i));assert.equal(pages.length,new Set(pages).size);
 const first=all[0],next=D.update(s,{today,type:'review',id:'a',record:{id:'done',date:today,start:first.start,end:first.end,understanding:'보통'}},E);
 s=R.stabilize(s,L.stabilize(s,next,today,D,E),today,D,E,L);v=V.build(R.build(s,today,D,E,L),s,today,D,E,L);
 assert.ok([...v.due,...v.overdue].flatMap(g=>g.items).every(r=>r.start>first.end||r.end<first.start));assert.equal(s.study.materials[0].reviews.length,1);
});
test('archived and paused data do not leak into active presentation',()=>{
 let s=state();s=D.update(s,{today,type:'archive',id:'a',archived:true},E);s.exams=E.update(s.exams,{type:'material-status',id:'b',status:'paused'});
 const v=V.build(snapshot([row('a',1,5,today),row('b',1,5,today)]),s,today,D,E,L);assert.deepEqual(v.counts,{due:0,overdue:0});
});

test('manual focus started early has an accurate focus reason, not a false imminent-exam claim',()=>{
 let s=state(['a']);s.exams=E.update(s.exams,{type:'upsert',goal:{id:'far',name:'먼 시험',date:'2026-12-30',status:'active',note:'',materialIds:['a'],learningDays:[0,1],daysOff:[],focusMode:'manual',focusDate:today,continuedMaterialIds:[]}});
 const snap=snapshot([row('a',1,5,'2026-11-01',{sources:['focus']})]);snap.materials=[{id:'a',focus:{started:true}}];
 const item=V.build(snap,s,today,D,E,L).due[0].items[0];assert.equal(item.reason,'시험 전 집중 복습 범위예요.');assert.equal(item.displayDue,today);
});
