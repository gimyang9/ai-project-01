const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../dist/study-data.js'), E=require('../dist/exam-management.js');
const apply=(s,a)=>D.update(s,a,E);
function seed(){return apply(D.envelope(D.emptyStudy(),D.emptyExams()),{type:'material',material:{id:'m',name:'Review foundation',type:'book',unit:'pages',total:100}});}
function memory(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};}
test('optional understanding survives progress/review save, reload and backup for every supported value',()=>{
 for(const understanding of ['', '쉬움','보통','어려움']){
  let s=apply(seed(),{type:'record',id:'m',today:'2026-10-25',record:{id:'r',date:'2026-10-25',position:30,understanding}});
  s=apply(s,{type:'review',id:'m',today:'2026-10-25',record:{id:'v',date:'2026-10-25',start:10,end:20,understanding}});
  const store=memory();D.save(store,s,E);const reloaded=D.load(store,E).state;
  assert.equal(reloaded.study.materials[0].records[0].understanding,understanding);
  assert.equal(reloaded.study.materials[0].reviews[0].understanding,understanding);
  assert.deepEqual(D.restore(D.backup(reloaded,E),seed(),E),reloaded);
  assert.equal(D.project(reloaded.study.materials[0]).current,30);assert.equal(reloaded.study.materials[0].round,1);
 }
});
test('understanding edit retains record identity, original time, sequence and unknown fields',()=>{
 let s=apply(seed(),{type:'record',id:'m',today:'2026-10-25',record:{id:'r',date:'2026-10-25',position:30,understanding:'어려움',custom:{keep:true}}});
 const original=structuredClone(s),before=s.study.materials[0].records[0];
 const next=apply(s,{type:'record',id:'m',today:'2026-10-25',record:{id:'r',date:'2026-10-25',position:30,understanding:'쉬움'}});
 const after=next.study.materials[0].records[0];assert.equal(after.createdAt,before.createdAt);assert.equal(after.sequence,before.sequence);assert.deepEqual(after.custom,before.custom);assert.deepEqual(s,original);
});
test('starting next round preserves original assessments and partial reviews',()=>{
 let s=apply(seed(),{type:'record',id:'m',today:'2026-10-25',record:{id:'r',date:'2026-10-25',position:100,understanding:'보통'}});
 s=apply(s,{type:'review',id:'m',today:'2026-10-25',record:{id:'v',date:'2026-10-25',start:1,end:20,understanding:'어려움'}});
 const original=structuredClone(s.study.materials[0]);s=apply(s,{type:'next-round',id:'m'});
 assert.deepEqual(s.study.materials[0].roundHistory[0].records,original.records);assert.deepEqual(s.study.materials[0].reviews,original.reviews);
});
test('invalid understanding fails transaction without mutating input',()=>{
 const s=seed(),before=structuredClone(s);assert.throws(()=>apply(s,{type:'record',id:'m',today:'2026-10-25',record:{id:'r',date:'2026-10-25',position:10,understanding:'unknown'}}));assert.deepEqual(s,before);
});
test('same-day review assessments retain distinct IDs and deterministic saved order',()=>{
 let s=apply(seed(),{type:'record',id:'m',today:'2026-10-25',record:{id:'r',date:'2026-10-25',position:50,understanding:'보통'}});
 for(const [id,understanding] of [['a','어려움'],['b','쉬움']])s=apply(s,{type:'review',id:'m',today:'2026-10-25',record:{id,date:'2026-10-25',start:20,end:30,understanding}});
 const rows=D.sorted(s.study.materials[0].reviews);assert.deepEqual(rows.map(r=>r.id),['a','b']);assert.ok(rows[0].sequence<rows[1].sequence);assert.equal(rows[0].understanding,'어려움');assert.equal(rows[1].understanding,'쉬움');
});
