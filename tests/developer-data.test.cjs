const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const D=require('../study-data.js'),E=require('../exam-management.js'),L=require('../learning-plan.js'),R=require('../review-plan.js'),T=require('../test-data.js');
const today='2026-10-26';
function initial(){
 let s=D.update(D.envelope(D.emptyStudy(),D.emptyExams()),{today,type:'material',material:{id:'m',name:'학습 자료',type:'book',unit:'페이지',total:200}},E);
 s=D.update(s,{today,type:'record',id:'m',record:{id:'old',date:'2026-10-25',position:100}},E);
 s.exams=E.update(s.exams,{type:'upsert',goal:{id:'g',name:'시험',date:'2026-10-31',status:'active',materialIds:['m'],learningDays:[0,1,2,3,4],daysOff:[],note:'',focusMode:'auto',focusDate:'',continuedMaterialIds:[]}});
 return D.validate(s,E);
}
const record=(s,position,id)=>R.stabilize(s,L.stabilize(s,D.update(s,{today,type:'record',id:'m',record:{id,date:today,position}},E),today,D,E),today,D,E,L);
test('approved daily amount:20 minus5, rebase10, minus3; backup reload unchanged',()=>{
 let s=initial();assert.equal(L.build(s,today,D,E)[0].amount,20);
 s=record(s,105,'one');assert.equal(L.build(s,today,D,E)[0].amount,15);
 const next={...s,exams:E.update(s.exams,{type:'upsert',goal:{...s.exams.goals[0],date:'2026-11-07'}})};
 s=L.stabilize(s,next,today,D,E);assert.equal(L.build(s,today,D,E)[0].amount,10);
 s=record(s,108,'two');assert.equal(L.build(s,today,D,E)[0].amount,7);
 s=D.restore(D.backup(s,E),s,E);assert.equal(L.build(s,today,D,E)[0].amount,7);
});
test('old backup fallback subtracts actual daily amount without mutating raw state',()=>{
 const s=D.update(initial(),{today,type:'record',id:'m',record:{id:'new',date:today,position:105}},E),raw=JSON.stringify(s);
 assert.equal(L.build(s,today,D,E)[0].amount,15);assert.equal(JSON.stringify(s),raw);
});
test('single virtual history is consistent, modest, varied and repeatable',()=>{
 const a=T.create(today,D,E,L),b=T.create(today,D,E,L);
 // createdAt is an audit timestamp, not part of the fixed study dates.
 const dates=s=>s.study.materials.flatMap(m=>[...m.records,...m.reviews,...m.roundHistory.flatMap(h=>h.records)]).map(r=>[r.id,r.date,r.position,r.start,r.end]);
 assert.deepEqual(dates(a),dates(b));assert.equal(a.study.materials.length,7);assert.equal(a.exams.goals.length,3);
 assert.equal(dates(a).length,127);assert.ok(a.study.materials.some(m=>m.round>1));assert.ok(a.study.materials.some(m=>m.archived));assert.ok(a.exams.goals.some(g=>g.status==='paused'));
 assert.deepEqual(new Set(a.study.materials.map(m=>m.unit)),new Set(['페이지','문제','강']));
 for(const m of a.study.materials)for(const r of [...m.records,...m.reviews])assert.ok(r.date<=today);
 assert.doesNotThrow(()=>R.build(a,today,D,E,L));
 assert.deepEqual(D.restore(D.backup(a,E),a,E),a);
});
test('virtual history follows real date across year and month boundaries',()=>{
 const date='2027-01-02',s=T.create(date,D,E,L);
 assert.equal(s.exams.goals[0].date,'2027-01-07');assert.ok(s.study.materials[0].roundHistory[0].records[0].date<'2026-09-01');assert.ok(s.study.materials.some(m=>m.records.some(r=>r.date===date)));
});
test('real restore rejects test wrapper while normal backup remains compatible',()=>{
 const s=initial(),b=D.backup(s,E);assert.deepEqual(D.restore(b,s,E),s);assert.throws(()=>D.restore({app:'chagok-dev-backup',fixtureVersion:1,backup:b},s,E));
});
test('published app includes only the single switch and fixed data, no separate dev build',()=>{
 for(const p of ['index.html','dist/index.html']){const html=fs.readFileSync(p,'utf8');assert.match(html,/test-data.js/);assert.match(html,/test-mode.js/);assert.doesNotMatch(html,/bootstrap.js|panel.css|scenarios.js/);}
 assert.equal(fs.existsSync('dev'),false);assert.equal(fs.existsSync('dev-dist'),false);assert.equal(fs.existsSync('scripts/build-dev.cjs'),false);
});
