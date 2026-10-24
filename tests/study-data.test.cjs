const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../dist/study-data.js'),E=require('../dist/exam-management.js');
const material=()=>({id:'m1',name:'기존 자료',type:'book',unit:'페이지',total:100,current:50,round:2,note:'수동 메모',records:[{id:'r1',date:'2026-10-01',position:20,sequence:2,understanding:'어려움',unknown:{keep:true}},{id:'r2',date:'2026-10-01',position:50,sequence:3}],roundHistory:[{round:1,total:100,unit:'페이지',completedDate:'2026-09-01',records:[{id:'h1',date:'2026-09-01',position:100,sequence:0}]}],reviews:[{id:'v1',date:'2026-10-02',start:10,end:30,total:100,unit:'페이지',sequence:4}],custom:{plan:'그대로'}});
const legacy=()=>({version:1,materials:[material()],recordSequence:7,customRoot:{keep:42}});
const state=()=>D.validate(D.envelope(legacy(),E.reconcile({...D.emptyExams(),materialSettings:{m1:{manualStatus:'active',autoPausedBy:[]}}})),E);
function storage(entries={}){const map=new Map(Object.entries(entries));return {getItem:key=>map.get(key)??null,setItem:(key,value)=>{map.set(key,value);},map};}
const apply=(s,a)=>D.update(s,a,E);
const record=(id,date,position)=>({id,date,position});
test('migration preserves legacy bytes, IDs, histories, unknown fields and sequences',()=>{
 const old=JSON.stringify(legacy()),store=storage({[D.LEGACY_KEY]:old});const loaded=D.load(store,E);
 assert.equal(loaded.writable,true);assert.equal(loaded.migrated,true);assert.equal(store.getItem(D.LEGACY_KEY),old);
 assert.deepEqual(loaded.state.study,legacy());assert.deepEqual(D.load(store,E).state,loaded.state);
});
test('new installation is empty, never persists UI fixtures',()=>{const loaded=D.load(storage(),E);assert.equal(loaded.state.study.materials.length,0);assert.equal(loaded.state.exams.goals.length,0);});
test('corrupt, unsupported legacy or exam source blocks migration without any write',()=>{
 for(const entries of [{[D.LEGACY_KEY]:'{'},{[D.LEGACY_KEY]:JSON.stringify({...legacy(),version:8})},{[E.KEY]:'{'},{[D.KEY]:'{'},{[D.KEY]:JSON.stringify({...state(),version:99})}]){
  const store=storage(entries),before=[...store.map];assert.equal(D.load(store,E).writable,false);assert.deepEqual([...store.map],before);
 }
});
test('migration write failure leaves original dataset available and blocks mutation',()=>{const store=storage({[D.LEGACY_KEY]:JSON.stringify(legacy())});store.setItem=()=>{throw Error('quota');};assert.equal(D.load(store,E).writable,false);assert.equal(store.getItem(D.KEY),null);assert.equal(store.getItem(D.LEGACY_KEY),JSON.stringify(legacy()));});
test('copy-on-write transaction failure does not mutate current state or saved data',()=>{const current=state(),snapshot=structuredClone(current);const store=storage({[D.KEY]:JSON.stringify(current)});store.setItem=()=>{throw Error('quota');};const next=apply(current,{type:'note',id:'m1',note:'새 메모'});assert.throws(()=>D.save(store,next,E));assert.deepEqual(current,snapshot);assert.deepEqual(JSON.parse(store.getItem(D.KEY)),snapshot);});
test('new/edit material, custom unit, target date, notes, archive and restore persist',()=>{
 let s=apply(state(),{type:'material',material:{id:'m2',name:'단어',type:'other',unit:'묶음',total:20,targetDate:'2026-11-01'}});
 s=apply(s,{type:'note',id:'m2',note:'메모'});s=apply(s,{type:'material',material:{id:'m2',name:'수정',type:'other',unit:'묶음',total:30,targetDate:'2026-12-01'}});
 s.exams=E.update(s.exams,{type:'material-status',id:'m2',status:'paused'});
 s=apply(s,{type:'archive',id:'m2',archived:true});assert.equal(s.exams.materialSettings.m2.manualStatus,'archived');
 s=apply(s,{type:'archive',id:'m2',archived:false});assert.equal(s.exams.materialSettings.m2.manualStatus,'paused');
 const store=storage();D.save(store,s,E);assert.deepEqual(D.load(store,E).state,s);assert.equal(s.study.materials[1].note,'메모');
});
test('material edits retain unknown fields and reject relabelling recorded ranges',()=>{
 const current=state(),next=apply(current,{type:'material',material:{id:'m1',name:'새 이름',unit:'페이지',total:120}});
 assert.deepEqual(next.study.materials[0].custom,current.study.materials[0].custom);
 assert.throws(()=>apply(current,{type:'material',material:{id:'m1',unit:'문제'}}));assert.throws(()=>apply(current,{type:'material',material:{id:'m1',total:40}}));
});
test('same date sequence orders progress; backdated edits recalculate deltas only',()=>{
 let s=apply(state(),{type:'record',id:'m1',record:record('r3','2026-10-01',70),today:'2026-10-24'});
 assert.equal(s.study.materials[0].records.at(-1).sequence,7);assert.equal(D.project(s.study.materials[0]).current,70);
 s=apply(s,{type:'record',id:'m1',record:record('r1','2026-10-01',25),today:'2026-10-24'});
 const rows=s.study.materials[0].records;assert.deepEqual(rows.map(r=>r.amount),[25,25,20]);assert.equal(rows[0].sequence,2);assert.deepEqual(rows[0].unknown,{keep:true});assert.equal(rows[0].understanding,'어려움');
 assert.throws(()=>apply(s,{type:'record',id:'m1',record:record('bad','2026-09-30',80),today:'2026-10-24'}));
});
test('future/invalid dates and fractional/out of range positions rejected',()=>{
 for(const r of [record('x','2026-10-25',60),record('x','2026-02-30',60),record('x','2026-10-24',100.5),record('x','2026-10-24',101)])assert.throws(()=>apply(state(),{type:'record',id:'m1',record:r,today:'2026-10-24'}));
});
test('delete/edit progress recalculates; review ranges may overlap without changing progress/round',()=>{
 const original=state();let s=apply(original,{type:'review',id:'m1',record:{id:'v2',date:'2026-10-03',start:20,end:50,understanding:'보통'},today:'2026-10-24'});
 assert.equal(D.project(s.study.materials[0]).current,50);assert.equal(s.study.materials[0].round,2);assert.deepEqual(s.study.materials[0].records,original.study.materials[0].records);
 s=apply(s,{type:'review',id:'m1',record:{id:'v2',date:'2026-10-04',start:25,end:45},today:'2026-10-24'});assert.equal(s.study.materials[0].reviews.at(-1).understanding,'보통');
 s=apply(s,{type:'delete-review',id:'m1',recordId:'v2'});assert.equal(s.study.materials[0].reviews.length,1);
 s=apply(s,{type:'delete-record',id:'m1',recordId:'r1'});assert.equal(s.study.materials[0].records[0].amount,50);
 s=apply(s,{type:'delete-record',id:'m1',recordId:'r2'});assert.equal(D.project(s.study.materials[0]).current,0);assert.equal(s.study.materials[0].roundHistory.length,1);
});
test('invalid review ranges rejected and original state remains unchanged',()=>{const s=state(),before=structuredClone(s);for(const [start,end] of [[0,10],[50,20],[1,101],[1.5,5]])assert.throws(()=>apply(s,{type:'review',id:'m1',record:{id:'x',date:'2026-10-03',start,end},today:'2026-10-24'}));assert.deepEqual(s,before);});
test('next round snapshots original records and units; repeated rounds retain all history',()=>{
 let s=state();assert.throws(()=>apply(s,{type:'next-round',id:'m1'}));
 s=apply(s,{type:'record',id:'m1',record:record('complete','2026-10-24',100),today:'2026-10-24'});const rows=structuredClone(s.study.materials[0].records),reviews=structuredClone(s.study.materials[0].reviews);
 s=apply(s,{type:'next-round',id:'m1'});let m=s.study.materials[0];assert.equal(m.round,3);assert.equal(D.project(m).current,0);assert.deepEqual(m.roundHistory[1].records,rows);assert.deepEqual(m.reviews,reviews);assert.equal(m.roundHistory[0].records[0].id,'h1');
 s=apply(s,{type:'record',id:'m1',record:record('complete2','2026-10-24',100),today:'2026-10-24'});s=apply(s,{type:'next-round',id:'m1'});assert.equal(s.study.materials[0].roundHistory.length,3);
});
test('v2 backup round trip includes exams, paused state, archived study and unknown fields',()=>{
 let s=apply(state(),{type:'archive',id:'m1',archived:true});const b=D.backup(s,E);assert.deepEqual(D.restore(JSON.parse(JSON.stringify(b)),D.envelope(D.emptyStudy(),D.emptyExams()),E),s);
 const store=storage();D.save(store,D.envelope(D.emptyStudy(),D.emptyExams()),E);D.save(store,D.restore(b,state(),E),E);assert.deepEqual(D.load(store,E).state,s);
 assert.throws(()=>D.restore({...b,backupVersion:99},s,E));assert.throws(()=>D.restore({...b,data:{...s,version:99}},s,E));
});
test('legacy backup formats preserve raw history and current exams; malformed files rejected',()=>{
 const s=state();for(const b of [{app:'study-progress',backupVersion:1,createdAt:'2026-10-24T00:00:00Z',data:legacy()},{...legacy(),app:'study-progress',exportedAt:'2026-10-24T00:00:00Z'}]){
 const restored=D.restore(b,s,E);assert.deepEqual(restored.study.materials,legacy().materials);assert.deepEqual(restored.exams,s.exams);
 }assert.throws(()=>D.restore({app:'other'},s,E));assert.throws(()=>D.restore({app:'study-progress',backupVersion:9},s,E));
});
test('deleting a material removes only its exam links and settings, retains other data',()=>{
 let s=apply(state(),{type:'material',material:{id:'m2',name:'남길 자료',type:'lecture',unit:'강',total:30}});
 s.exams=E.update(s.exams,{type:'upsert',goal:{id:'g',name:'시험',date:'',status:'paused',note:'시험 메모',materialIds:['m1','m2'],continuedMaterialIds:['m1'],learningDays:[0],focusMode:'manual',focusDate:'2026-11-01'}});
 s=apply(s,{type:'delete',id:'m1'});assert.deepEqual(s.exams.goals[0].materialIds,['m2']);assert.deepEqual(s.exams.goals[0].continuedMaterialIds,[]);assert.equal(s.exams.goals[0].focusDate,'2026-11-01');assert.equal(s.study.materials[0].id,'m2');
});
test('explicit recovery preserves unreadable original sources, then restores; preservation failure aborts',()=>{
 const entries={[D.KEY]:'{broken',[D.LEGACY_KEY]:'legacy raw',[E.KEY]:'exam raw'},store=storage(entries);
 const next=D.recover(store,state(),E);assert.deepEqual(D.load(store,E).state,next);
 assert.deepEqual(JSON.parse(store.getItem(D.KEY+'.before-recovery.0')),{v2:'{broken',legacy:'legacy raw',exams:'exam raw'});
 D.recover(store,state(),E);assert.ok(store.getItem(D.KEY+'.before-recovery.1'));
 const fail=storage(entries);fail.setItem=()=>{throw Error('quota');};assert.throws(()=>D.recover(fail,state(),E));assert.deepEqual([...fail.map],Object.entries(entries));
});
