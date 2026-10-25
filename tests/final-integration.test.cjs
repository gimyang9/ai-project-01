const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../dist/study-data.js'),E=require('../dist/exam-management.js'),L=require('../dist/learning-plan.js'),R=require('../dist/review-plan.js'),S=require('../dist/study-stats.js'),G=require('../dist/storage-guard.js');
const today='2026-10-26',memory=entries=>{const map=new Map(entries);return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),map};};
const raw=(s,a)=>D.update(s,{today,...a},E),apply=(s,a)=>R.stabilize(s,raw(s,a),today,D,E,L);
function seed(){let s=raw(D.envelope(D.emptyStudy(),D.emptyExams()),{type:'material',material:{id:'m',name:'Material',type:'book',unit:'pages',total:100}});s=raw(s,{type:'record',id:'m',record:{id:'s',date:'2026-10-01',position:100}});return s;}
function goal(s,extra={}){return {...s,exams:E.update(s.exams,{type:'upsert',goal:{id:'g',name:'Exam',date:'2026-11-10',status:'active',note:'',materialIds:['m'],learningDays:[0,1,2,3,4,5,6],daysOff:[],focusMode:'auto',focusDate:'',continuedMaterialIds:[],...extra}})};}
test('stale tab cannot replace newer data and stays blocked until a fresh guard is created',()=>{
 const store=memory([[D.KEY,'initial']]),a=G.create(store,D.KEY),b=G.create(store,D.KEY);a.run(()=>store.setItem(D.KEY,'new'));
 assert.throws(()=>b.run(()=>store.setItem(D.KEY,'lost')),e=>e.code==='CHAGOK_CONFLICT');assert.equal(store.getItem(D.KEY),'new');
 store.setItem(D.KEY,'initial');assert.throws(()=>b.run(()=>{}),e=>e.code==='CHAGOK_CONFLICT');G.create(store,D.KEY).run(()=>store.setItem(D.KEY,'reloaded'));assert.equal(store.getItem(D.KEY),'reloaded');
});
test('storage event blocks changes while unrelated keys and other storage areas do not',()=>{
 const store=memory([[D.KEY,'a']]),guard=G.create(store,D.KEY);
 assert.equal(guard.observe({key:'other',newValue:'x',storageArea:store}),false);
 assert.equal(guard.observe({key:D.KEY,newValue:'x',storageArea:{}}),false);
 store.setItem(D.KEY,'b');assert.equal(guard.observe({key:D.KEY,newValue:'b',storageArea:store}),true);
 assert.throws(()=>guard.run(()=>{}),e=>e.code==='CHAGOK_CONFLICT');
});
test('normal and failed saves retain the existing synchronous fallback and retry behaviour',()=>{
 const store=memory([[D.KEY,'a']]),g=G.create(store,D.KEY);assert.equal(g.run(()=>{store.setItem(D.KEY,'b');return 42;}),42);
 assert.throws(()=>g.run(()=>{throw Error('quota');}),/quota/);assert.equal(g.busy,false);assert.equal(store.getItem(D.KEY),'b');
 g.run(()=>store.setItem(D.KEY,'c'));assert.equal(store.getItem(D.KEY),'c');
});
test('cross-window Web Lock serializes overlapping requests and prevents stale retry',async()=>{
 const store=memory([[D.KEY,'a']]);let held=false;
 const locks={request:(name,options,callback)=>{if(held)return Promise.resolve().then(()=>callback(null));held=true;return Promise.resolve().then(()=>callback({name})).finally(()=>{held=false;});}};
 const a=G.create(store,D.KEY,locks),b=G.create(store,D.KEY,locks);
 const results=await Promise.allSettled([a.run(()=>store.setItem(D.KEY,'first')),b.run(()=>store.setItem(D.KEY,'second'))]);
 assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.code,'CHAGOK_SAVE_BUSY');assert.equal(store.getItem(D.KEY),'first');
 assert.throws(()=>b.run(()=>{}),e=>e.code==='CHAGOK_CONFLICT');
});
test('busy same-window operation is rejected without duplicate submissions',async()=>{
 const store=memory([[D.KEY,'a']]);let release;
 const locks={request:(name,options,callback)=>new Promise(resolve=>{release=()=>resolve(callback({name}));})},g=G.create(store,D.KEY,locks);
 const saving=g.run(()=>store.setItem(D.KEY,'b'));assert.throws(()=>g.run(()=>{}),e=>e.code==='CHAGOK_SAVE_BUSY');release();await saving;assert.equal(g.busy,false);
});
test('automatic focus completion stays complete when a new review makes speed much faster',()=>{
 let s=goal(raw(seed(),{type:'review',id:'m',record:{id:'v1',date:'2026-10-20',start:1,end:7}}));const before=R.build(s,today,D,E,L).materials[0].focus;
 const oldRows=structuredClone(s.study.materials[0].reviews);const next=apply(s,{type:'review',id:'m',record:{id:'v2',date:today,start:8,end:100}});
 const after=R.build(next,today,D,E,L).materials[0].focus;assert.equal(after.startDate,before.startDate);assert.equal(after.remaining,0);assert.equal(after.completedAmount,100);
 assert.deepEqual(next.study.materials[0].reviews[0],oldRows[0]);assert.equal(s.study.materials[0].reviewSettings,undefined);
});
test('a due repeat is a new target without reopening prior focus completion',()=>{
 let s=goal(seed(),{focusMode:'manual',focusDate:'2026-10-20'});
 s=apply(s,{type:'review',id:'m',record:{id:'v',date:'2026-10-21',start:1,end:100,understanding:'어려움'}});
 const p=R.build(s,today,D,E,L);assert.equal(p.materials[0].focus.remaining,0);assert.equal(p.materials[0].focus.completedAmount,100);assert.ok(p.today.some(r=>r.newTarget));
 const row=p.today.find(r=>r.newTarget);const next=apply(s,{type:'review',id:'m',record:{id:'new',date:today,start:row.start,end:row.end,understanding:'쉬움'}});
 assert.equal(next.study.materials[0].reviews.length,2);assert.equal(next.study.materials[0].reviews[0].understanding,'어려움');assert.ok(R.derive(next.study.materials[0],today,D,L).segments.some(r=>r.understanding==='쉬움'));
});
test('moving manual start forward starts new targets while preserving earlier cycle and original reviews',()=>{
 let s=goal(seed(),{focusMode:'manual',focusDate:'2026-10-20'});s=apply(s,{type:'review',id:'m',record:{id:'v',date:'2026-10-21',start:1,end:100}});
 const before=structuredClone(s),draft=goal(s,{focusMode:'manual',focusDate:'2026-11-01'}),next=R.stabilize(s,draft,today,D,E,L),focus=R.build(next,today,D,E,L).materials[0].focus;
 assert.equal(focus.startDate,'2026-11-01');assert.equal(focus.remaining,100);assert.equal(focus.started,false);assert.equal(next.study.materials[0].reviewSettings.focusCycles.length,2);assert.deepEqual(next.study.materials[0].reviews,before.study.materials[0].reviews);
});
test('same exam date change keeps completed coverage; resit uses new exam cycle and preserves history',()=>{
 let s=goal(seed(),{focusMode:'manual',focusDate:'2026-10-20'});s=apply(s,{type:'review',id:'m',record:{id:'v',date:'2026-10-21',start:1,end:40}});
 const old=R.build(s,today,D,E,L).materials[0].focus,changed=R.stabilize(s,goal(s,{date:'2026-12-10',focusMode:'manual',focusDate:'2026-10-20'}),today,D,E,L);
 assert.equal(R.build(changed,today,D,E,L).materials[0].focus.remaining,old.remaining);
 const archived={...changed,exams:E.update(changed.exams,{type:'status',id:'g',status:'archived',continuedMaterialIds:['m']})};
 const newState={...archived,exams:E.update(archived.exams,{type:'resit',id:'g',goal:{id:'resit',name:'Resit',date:'2027-01-10',note:'',materialIds:['m'],learningDays:[0,1,2,3,4,5,6],focusMode:'manual',focusDate:'2026-12-01',daysOff:[]}})};
 const next=R.stabilize(archived,newState,today,D,E,L);assert.deepEqual(next.study.materials[0].reviews,s.study.materials[0].reviews);assert.equal(R.build(next,today,D,E,L).materials[0].focus.goalId,'resit');assert.equal(R.build(next,today,D,E,L).materials[0].focus.remaining,100);
});
test('focus-cycle metadata survives backup and old backup remains loadable',()=>{
 let s=goal(seed(),{focusMode:'manual',focusDate:'2026-10-20'});s=apply(s,{type:'review-settings',id:'m',amount:10});const copy=D.restore(D.backup(s,E),seed(),E);
 assert.deepEqual(copy,s);assert.ok(copy.study.materials[0].reviewSettings.focusCycles.length);assert.equal(D.validate(seed(),E).study.materials[0].reviewSettings,undefined);
});
test('end-to-end synthetic legacy migration retains bytes, IDs, rounds, reviews, manual settings and restore/reset boundaries',()=>{
 const legacy={version:1,recordSequence:5,materials:[{id:'m',name:'Legacy',type:'book',unit:'pages',total:100,current:50,round:2,note:'Legacy note',records:[{id:'r1',date:'2026-10-01',position:20,sequence:2},{id:'r2',date:'2026-10-02',position:50,sequence:3}],roundHistory:[{round:1,total:100,unit:'pages',completedDate:'2026-09-01',records:[{id:'h1',date:'2026-09-01',position:100,sequence:0,custom:'keep'}]}],reviews:[{id:'v1',date:'2026-10-03',start:10,end:30,total:100,unit:'pages',sequence:4}],custom:{retain:true}}]};
 const rawLegacy=JSON.stringify(legacy),store=memory([[D.LEGACY_KEY,rawLegacy]]);let s=D.load(store,E).state;
 assert.deepEqual(s.study,legacy);
 s=apply(s,{type:'material',material:{id:'extra',name:'Extra',type:'lecture',unit:'lectures',total:20}});
 s=goal(s);s={...s,exams:E.update(s.exams,{type:'upsert',goal:{...s.exams.goals[0],id:'second',date:'',materialIds:['m','extra']}})};
 s={...s,exams:E.update(s.exams,{type:'status',id:'g',status:'paused',continuedMaterialIds:[]})};assert.equal(E.materialStatus(s.exams,'m'),'active');
 s=apply(s,{type:'plan',id:'m',amount:5});s=apply(s,{type:'review-settings',id:'m',amount:4});s=apply(s,{type:'review-date',id:'m',start:1,end:10,date:'2026-11-02'});
 s=apply(s,{type:'review',id:'m',record:{id:'overlap',date:today,start:20,end:40,understanding:'어려움'}});
 assert.deepEqual(s.study.materials[0].roundHistory[0],legacy.materials[0].roundHistory[0]);assert.deepEqual(s.study.materials[0].records,legacy.materials[0].records);
 s=apply(s,{type:'record',id:'m',record:{id:'finish',date:today,position:100}});s=apply(s,{type:'next-round',id:'m'});
 s=apply(s,{type:'archive',id:'m',archived:true});s=apply(s,{type:'archive',id:'m',archived:false});
 const backup=D.backup(s,E),stats=S.summarize(s,today,'quarter',D,L);D.save(store,s,E);assert.deepEqual(D.load(store,E).state,s);
 D.save(store,D.envelope(D.emptyStudy(),D.emptyExams()),E);assert.equal(D.load(store,E).state.study.materials.length,0);assert.equal(store.getItem(D.LEGACY_KEY),rawLegacy);
 const restored=D.restore(JSON.parse(JSON.stringify(backup)),s,E);D.save(store,restored,E);assert.deepEqual(D.load(store,E).state,s);assert.deepEqual(S.summarize(restored,today,'quarter',D,L),stats);assert.equal(store.getItem(D.LEGACY_KEY),rawLegacy);
});

test('observed external change blocks even if another writer later restores the same raw value',()=>{
 const store=memory([[D.KEY,'a']]),g=G.create(store,D.KEY);assert.equal(g.observe({key:D.KEY,newValue:'b',storageArea:store}),true);assert.throws(()=>g.run(()=>{}),e=>e.code==='CHAGOK_CONFLICT');assert.equal(store.getItem(D.KEY),'a');
});
