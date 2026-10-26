const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../dist/study-stats.js'),D=require('../dist/study-data.js'),E=require('../dist/exam-management.js'),L=require('../dist/learning-plan.js'),R=require('../dist/review-plan.js');
const today='2026-10-25',apply=(s,a)=>D.update(s,{today,...a},E);
function seed(){return apply(D.envelope(D.emptyStudy(),D.emptyExams()),{type:'material',material:{id:'m',name:'자료',type:'book',unit:'페이지',total:100}});}
test('empty statistics contain zero records and never manufacture chart percentages',()=>{
 const s=seed();for(const period of ['week','month','quarter','half']){const d=S.summarize(s,today,period,D,L);assert.equal(d.study,0);assert.equal(d.review,0);assert.equal(d.days,0);assert.deepEqual(d.exams,[]);assert.ok(d.bins.every(b=>!b.study&&!b.review));}
});
test('current week/month and recent calendar months have explicit year-safe boundaries',()=>{
 assert.equal(S.period(today,'week',L).start,'2026-10-19');assert.equal(S.period(today,'month',L).start,'2026-10-01');
 assert.equal(S.period(today,'quarter',L).start,'2026-08-01');assert.equal(S.period(today,'half',L).start,'2026-05-01');
 assert.equal(S.period('2026-01-03','quarter',L).start,'2025-11-01');assert.equal(S.period('2024-03-01','week',L).start,'2024-02-26');
});
test('historical rounds and archived materials count once with original units and positive deltas',()=>{
 let s=apply(seed(),{type:'record',id:'m',record:{id:'r',date:'2026-09-01',position:100}});
 s=apply(s,{type:'next-round',id:'m'});s=apply(s,{type:'record',id:'m',record:{id:'r2',date:'2026-10-20',position:20}});
 s=apply(s,{type:'review',id:'m',record:{id:'v',date:'2026-10-20',start:1,end:10}});s=apply(s,{type:'archive',id:'m',archived:true});
 const d=S.summarize(s,today,'quarter',D,L);assert.equal(d.study,2);assert.equal(d.review,1);assert.equal(d.days,2);assert.equal(d.units.find(g=>g.kind==='study').amount,120);
 assert.equal(S.summarize(s,today,'month',D,L).study,1);
});
test('future and zero-delta entries do not create completed study-day activity',()=>{
 let s=apply(seed(),{type:'record',id:'m',record:{id:'zero',date:today,position:0}});
 s.study.materials[0].records.push({id:'future',date:'2026-11-01',position:20,sequence:4});assert.equal(S.rows(s,today,D).length,0);
});
test('mixed units remain separate, repeated actual review entries are counted as real records',()=>{
 let s=apply(seed(),{type:'record',id:'m',record:{id:'r',date:today,position:30}});
 s=apply(s,{type:'material',material:{id:'l',name:'강의',type:'lecture',unit:'강',total:10}});
 s=apply(s,{type:'record',id:'l',record:{id:'r2',date:today,position:3}});
 for(const id of ['a','b'])s=apply(s,{type:'review',id:'m',record:{id,date:today,start:1,end:10}});
 const d=S.summarize(s,today,'week',D,L);assert.equal(d.study,2);assert.equal(d.review,2);assert.equal(d.days,1);
 assert.deepEqual(d.units.filter(g=>g.kind==='study').map(g=>[g.unit,g.amount]),[['페이지',30],['강',3]]);
});
test('multiple exam shares split a record instead of increasing the denominator',()=>{
 let s=apply(seed(),{type:'record',id:'m',record:{id:'r',date:today,position:30}});
 for(const id of ['a','b'])s.exams=E.update(s.exams,{type:'upsert',goal:{id,name:id,date:'',status:'active',note:'',materialIds:['m'],learningDays:[0],daysOff:[],focusMode:'auto',focusDate:'',continuedMaterialIds:[]}});
 const d=S.summarize(s,today,'week',D,L);assert.deepEqual(d.exams.map(g=>g.percent),[50,50]);assert.equal(d.exams.reduce((n,g)=>n+g.value,0),1);assert.equal(d.materials[0].percent,100);
});
test('calendar completion rows and current manual/automatic schedules remain separate',()=>{
 let s=apply(seed(),{type:'record',id:'m',record:{id:'r',date:'2026-10-23',position:30,understanding:'보통'}});
 s=apply(s,{type:'review-date',id:'m',start:1,end:10,date:'2026-10-30'});
 const before=structuredClone(s),dates=S.calendar(s,today,D,R.build(s,today,D,E,L));
 assert.equal(dates['2026-10-23'].records.length,1);assert.equal(dates['2026-10-30'].scheduled[0].start,1);assert.equal(dates['2026-10-30'].records.length,0);assert.deepEqual(s,before);
});
test('record edits/deletes and backup restoration produce statistics from the remaining originals',()=>{
 let s=apply(seed(),{type:'record',id:'m',record:{id:'r',date:'2026-10-20',position:30}});
 const backup=D.backup(s,E);s=apply(s,{type:'record',id:'m',record:{id:'r',date:'2026-10-21',position:20}});
 assert.equal(S.summarize(s,today,'week',D,L).units[0].amount,20);
 s=apply(s,{type:'delete-record',id:'m',recordId:'r'});assert.equal(S.summarize(s,today,'week',D,L).study,0);
 s=D.restore(backup,s,E);assert.equal(S.summarize(s,today,'week',D,L).units[0].amount,30);
});
test('new materials persist deterministic automatic plants while existing aliases survive',()=>{
 const s=seed(),m=s.study.materials[0];assert.ok(['tree','flower','cactus','mushroom'].includes(m.growthState.family));
 assert.deepEqual(D.restore(D.backup(s,E),seed(),E).study.materials[0].growthState,m.growthState);
 const raw={...m,plant:'daisy'};delete raw.growthState;assert.equal(D.growth(raw).family,'flower');
 assert.deepEqual(D.growth({...raw,plant:undefined}),D.growth({...raw,plant:undefined}));
});
test('first completion stays completed after correction/deletion, next round, archive and restore',()=>{
 let s=apply(seed(),{type:'record',id:'m',record:{id:'r',date:today,position:100}});const family=s.study.materials[0].growthState.family;
 s=apply(s,{type:'record',id:'m',record:{id:'r',date:today,position:20}});assert.equal(s.study.materials[0].growthState.completed,true);
 s=apply(s,{type:'delete-record',id:'m',recordId:'r'});assert.equal(D.project(s.study.materials[0]).current,0);assert.equal(D.growth(s.study.materials[0]).completed,true);
 s=apply(s,{type:'record',id:'m',record:{id:'r2',date:today,position:100}});s=apply(s,{type:'next-round',id:'m'});
 s=apply(s,{type:'archive',id:'m',archived:true});s=apply(s,{type:'archive',id:'m',archived:false});
 assert.deepEqual(s.study.materials[0].growthState,{family,completed:true});assert.equal(s.study.materials[0].round,2);
});
test('legacy validation/load remains read-compatible and does not rewrite bytes to assign growth',()=>{
 const raw=seed();delete raw.study.materials[0].growthState;const value=JSON.stringify(raw),map=new Map([[D.KEY,value]]);
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},loaded=D.load(storage,E);
 assert.equal(loaded.writable,true);assert.equal(map.get(D.KEY),value);assert.equal(loaded.state.study.materials[0].growthState,undefined);assert.ok(D.growth(loaded.state.study.materials[0]).family);
});
test('failed growth save leaves original plant and records unchanged',()=>{
 const s=seed(),before=structuredClone(s),next=apply(s,{type:'record',id:'m',record:{id:'r',date:today,position:100}});
 assert.throws(()=>D.save({setItem(){throw Error('quota');}},next,E));assert.deepEqual(s,before);
});

test('date lookup includes archived history, original units and rounds; latest first; read only',()=>{
 let s=apply(seed(),{type:'record',id:'m',record:{id:'old',date:'2026-09-01',position:100}});
 s=apply(s,{type:'review',id:'m',record:{id:'v1',date:'2026-09-01',start:1,end:10,round:1}});
 s=apply(s,{type:'next-round',id:'m'});
 s=apply(s,{type:'record',id:'m',record:{id:'new',date:'2026-10-20',position:20}});
 s=apply(s,{type:'review',id:'m',record:{id:'v2',date:'2026-10-20',start:1,end:5}});
 s=apply(s,{type:'archive',id:'m',archived:true});
 const raw=JSON.stringify(s),old=S.onDate(s,'2026-09-01',today,D),recent=S.onDate(s,'2026-10-20',today,D);
 assert.deepEqual(old.map(r=>[r.id,r.round,r.unit]),[['v1',1,'페이지'],['old',1,'페이지']]);
 assert.deepEqual(recent.map(r=>[r.id,r.round]),[['v2',2],['new',2]]);
 assert.equal(JSON.stringify(s),raw);assert.equal(s.study.materials[0].archived,true);
});
test('date lookup excludes planned events and reflects edits/deletions without a second store',()=>{
 let s=apply(seed(),{type:'record',id:'m',record:{id:'r',date:today,position:30}});
 s=apply(s,{type:'review-date',id:'m',start:1,end:10,date:'2026-11-01'});
 assert.deepEqual(S.onDate(s,'2026-11-01',today,D),[]);
 s=apply(s,{type:'record',id:'m',record:{id:'r',date:'2026-10-24',position:35}});
 assert.deepEqual(S.onDate(s,today,today,D),[]);assert.equal(S.onDate(s,'2026-10-24',today,D)[0].amount,35);
 s=apply(s,{type:'delete-record',id:'m',recordId:'r'});assert.deepEqual(S.onDate(s,'2026-10-24',today,D),[]);
});
test('many same-day mixed-unit records are returned individually by sequence',()=>{
 let s=seed();
 s=apply(s,{type:'material',material:{id:'lecture',name:'강의',type:'lecture',unit:'강',total:20}});
 for(let i=1;i<=7;i++)s=apply(s,{type:'record',id:i%2?'m':'lecture',record:{id:'r'+i,date:today,position:i}});
 const rows=S.onDate(s,today,today,D);assert.equal(rows.length,7);assert.deepEqual(rows.map(r=>r.id),['r7','r6','r5','r4','r3','r2','r1']);assert.deepEqual(new Set(rows.map(r=>r.unit)),new Set(['페이지','강']));
});
test('legacy review between completed and next round is not assigned a guessed round',()=>{
 let s=apply(seed(),{type:'record',id:'m',record:{id:'old',date:'2026-09-01',position:100}});
 s=apply(s,{type:'review',id:'m',record:{id:'ambiguous',date:'2026-09-01',start:1,end:10}});
 s=apply(s,{type:'next-round',id:'m'});s=apply(s,{type:'record',id:'m',record:{id:'next',date:today,position:10}});
 assert.equal(S.onDate(s,'2026-09-01',today,D).find(r=>r.id==='ambiguous').round,null);
});
