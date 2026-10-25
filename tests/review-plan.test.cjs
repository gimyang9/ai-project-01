const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../dist/review-plan.js'),D=require('../dist/study-data.js'),E=require('../dist/exam-management.js'),L=require('../dist/learning-plan.js');
const today='2026-10-25';
function apply(s,action){return D.update(s,{today,...action},E);}
function seed(current=100,understanding='보통',date='2026-10-01'){
 let s=apply(D.envelope(D.emptyStudy(),D.emptyExams()),{type:'material',material:{id:'m',name:'자료',type:'book',unit:'페이지',total:100}});
 if(current)s=apply(s,{type:'record',id:'m',record:{id:'study',date,position:current,understanding}});
 return s;
}
const review=(s,id,date,start,end,understanding='보통')=>apply(s,{type:'review',id:'m',record:{id,date,start,end,understanding}});
function exam(s,extra={}){s=structuredClone(s);s.exams=E.update(s.exams,{type:'upsert',goal:{id:'g',name:'시험',date:'2026-11-10',status:'active',note:'',materialIds:['m'],learningDays:[0,1,2,3,4,5,6],daysOff:[],focusMode:'auto',focusDate:'',continuedMaterialIds:[],...extra}});return s;}
const build=(s,date=today)=>R.build(s,date,D,E,L),derive=(s,date=today)=>R.derive(s.study.materials[0],date,D,L);
test('approved intervals use constants, round halves, and enforce 1..180 days',()=>{
 assert.equal(R.interval(null,'어려움'),1);assert.equal(R.interval(null,'보통'),3);assert.equal(R.interval(null,'쉬움'),7);assert.equal(R.interval(null,''),3);
 assert.equal(R.interval(3,'어려움'),2);assert.equal(R.interval(3,'보통'),5);assert.equal(R.interval(3,'쉬움'),6);
 assert.equal(R.interval(1,'어려움'),1);assert.equal(R.interval(120,'쉬움'),180);assert.ok(Object.isFrozen(R.POLICY.first));
});
test('new evaluations split overlap without changing source ratings/progress/round',()=>{
 const s=review(seed(50),'v','2026-10-02',20,30,'어려움'),before=structuredClone(s),rows=derive(s).segments;
 assert.deepEqual(rows.map(r=>[r.start,r.end,r.understanding]),[[1,19,'보통'],[20,30,'어려움'],[31,50,'보통']]);
 assert.equal(rows[1].interval,2);assert.deepEqual(s,before);assert.equal(D.project(s.study.materials[0]).current,50);
});
test('overlapping reviews retain correct latest assessment separately on each interval',()=>{
 let s=review(seed(60),'a','2026-10-02',1,30,'어려움');s=review(s,'b','2026-10-03',20,50,'쉬움');
 const rows=derive(s).segments;assert.equal(rows.find(r=>r.start===1).understanding,'어려움');
 assert.ok(rows.filter(r=>r.start>=20&&r.end<=50).every(r=>r.understanding==='쉬움'));
});
test('same-day saved sequence beats createdAt; duplicate sequence falls back deterministically',()=>{
 let s=review(seed(30),'a','2026-10-02',1,30,'어려움');s=review(s,'b','2026-10-02',1,30,'쉬움');
 s.study.materials[0].reviews[0].createdAt='2026-10-25T20:00:00Z';s.study.materials[0].reviews[1].createdAt='2026-10-25T10:00:00Z';
 assert.equal(derive(s).segments[0].understanding,'쉬움');
 s.study.materials[0].reviews[1].sequence=s.study.materials[0].reviews[0].sequence;
 assert.equal(derive(s).segments[0].understanding,'어려움');
});
test('record edit/delete replays affected range and leaves disjoint segment values unchanged',()=>{
 let s=review(seed(60),'v','2026-10-02',20,30,'어려움'),original=derive(s);
 const changed=review(s,'v','2026-10-03',20,30,'쉬움'),rows=derive(changed).segments;
 assert.deepEqual(rows.find(r=>r.start===1),original.segments.find(r=>r.start===1));
 assert.equal(rows.find(r=>r.start===20).understanding,'쉬움');
 const removed=apply(changed,{type:'delete-review',id:'m',recordId:'v'});assert.equal(derive(removed).segments.length,1);assert.equal(removed.study.materials[0].reviews.length,0);
});
test('missed due date remains overdue; next schedule uses actual completion day',()=>{
 let s=seed(20,'어려움','2026-10-01');assert.equal(build(s).today[0].status,'복습 지연');
 s=review(s,'v',today,1,20,'보통');const row=derive(s).segments[0];assert.equal(row.dueDate,'2026-10-27');assert.equal(build(s).today.length,0);
});
test('unselected rating uses normal policy without overwriting original blank',()=>{
 const s=seed(20,'');assert.equal(derive(s).segments[0].interval,3);assert.equal(s.study.materials[0].records[0].understanding,'');
});
test('future rows and never-learned reviews are excluded from automatic schedules and speed',()=>{
 let s=review(seed(20),'v','2026-10-02',10,50,'쉬움');assert.ok(derive(s).segments.every(r=>r.end<=20));assert.equal(R.amount(derive(s).reviews),11);
 s.study.materials[0].reviews.push({id:'future',date:'2026-11-01',start:1,end:20,total:100,unit:'페이지',sequence:99,understanding:'어려움'});
 assert.ok(derive(s).segments.every(r=>r.lastRecordId!=='future'));
});
test('next round retains previous memory, but focus target and initial speed use current-round progress only',()=>{
 let s=seed(100);s=apply(s,{type:'next-round',id:'m'});s=apply(s,{type:'record',id:'m',record:{id:'new',date:'2026-10-20',position:20,understanding:'보통'}});
 const p=build(exam(s)).materials[0];assert.equal(p.focus.total,20);assert.equal(p.speed.amount,2);assert.ok(p.segments.some(r=>r.end===100));assert.equal(s.study.materials[0].round,2);
});
test('incompatible historical units do not get relabeled or converted',()=>{
 const s=seed(100);s.study.materials[0].reviews.push({id:'old',date:'2026-10-02',start:1,end:20,total:100,unit:'강',sequence:9,understanding:'어려움'});
 assert.equal(derive(s).reviews.length,0);assert.equal(s.study.materials[0].reviews[0].unit,'강');
});
test('initial review estimate is 10 percent of learned amount, not whole total',()=>{
 const s=exam(seed(25));assert.equal(build(s).materials[0].speed.amount,3);
 assert.equal(build(exam(seed(0))).materials[0].speed.amount,null);
});
test('record-span windows are 7/14/28 days and include idle days',()=>{
 for(const [first,window] of [['2026-10-19',7],['2026-10-12',14],['2026-09-28',28]]){
  let s=review(seed(100,'보통','2026-09-01'),'a',first,1,14);const rate=build(s).materials[0].speed;
  assert.equal(rate.window,window);assert.equal(rate.amount,14/window);
 }
});
test('overlapping same-day reviews count union volume once when estimating speed',()=>{
 let s=review(seed(100),'a','2026-10-19',1,20);s=review(s,'b','2026-10-19',10,30);
 const rate=build(s).materials[0].speed;assert.equal(rate.recentAmount,30);assert.equal(rate.amount,30/7);
});
test('zero recent review and manual daily override behave independently',()=>{
 let s=review(seed(100,'보통','2026-09-01'),'a','2026-09-01',1,10),rate=build(s).materials[0].speed;
 assert.equal(rate.window,28);assert.equal(rate.reason,'no-recent-review');assert.equal(rate.amount,null);
 s=apply(s,{type:'review-settings',id:'m',amount:8});assert.equal(build(s).materials[0].speed.amount,8);assert.equal(build(s).materials[0].speed.reason,'manual');
 s=apply(s,{type:'review-settings',id:'m',amount:null});assert.equal(build(s).materials[0].speed.amount,null);
});
test('focus buffer follows approved ceil 20 percent and 1..7 day limits',()=>{
 let s=apply(exam(seed(100)),{type:'review-settings',id:'m',amount:1});const f=build(s).materials[0].focus;
 assert.equal(f.neededDays,100);assert.equal(f.bufferDays,7);assert.equal(f.startDate,L.shift('2026-11-10',-107));
 s=apply(exam(seed(1)),{type:'review-settings',id:'m',amount:1});assert.equal(build(s).materials[0].focus.bufferDays,1);
});
test('focus starts backward over permitted weekdays/holidays, excluding exam day',()=>{
 const g={date:'2026-11-10',learningDays:[0,1,2,3,4],daysOff:['2026-11-09']};
 const start=R.backwardStart(g.date,8,g,L);assert.equal(L.availableDays(start,L.shift(g.date,-1),g),8);
 assert.equal(L.allowed(start,g),true);assert.equal(R.backwardStart(g.date,1,{...g,learningDays:[]},L),null);
});
test('manual focus start wins; a passed start recommends from today without losing prior completions',()=>{
 let s=exam(seed(100),{focusMode:'manual',focusDate:'2026-10-20'});s=review(s,'done','2026-10-21',1,10);
 const f=build(s).materials[0].focus;assert.equal(f.startDate,'2026-10-20');assert.equal(f.effectiveStart,today);assert.equal(f.remaining,90);
});
test('closest non-past active exam wins, including undated/multiple linked exams',()=>{
 let s=exam(seed(100));s=exam(s,{id:'later',date:'2026-12-01'});s=exam(s,{id:'early',date:'2026-11-01'});s=exam(s,{id:'past',date:'2026-10-01'});s=exam(s,{id:'undated',date:''});
 assert.equal(build(s).materials[0].focus.goalId,'early');s.exams=E.update(s.exams,{type:'priority',id:'later'});assert.equal(build(s).materials[0].focus.goalId,'early');
});
test('hard ranges first, then oldest ranges; focus never targets unlearned pages',()=>{
 let s=seed(60,'보통','2026-10-23');s=review(s,'v','2026-10-24',40,50,'어려움');s=exam(s,{date:'2026-10-27',focusMode:'manual',focusDate:today});
 const rows=build(s).materials[0].focus.recommendations;assert.equal(rows[0].start,40);assert.ok(rows.every(r=>r.end<=60));
 const picked=R.pick([{start:1,end:10,understanding:'보통',lastDate:'2026-10-01'},{start:11,end:20,understanding:'보통',lastDate:'2026-10-02'}],5);assert.equal(picked[0].start,1);
});
test('focus shortage reflects available days; today exam and rest day assign no extra ranges',()=>{
 let s=exam(seed(100),{date:'2026-10-27',focusMode:'manual',focusDate:today});
 let f=build(s).materials[0].focus;assert.equal(f.daysLeft,2);assert.equal(f.shortfall,80);
 s=exam(s,{date:today});assert.equal(build(s).materials[0].focus.recommendations.length,0);
 s=exam(s,{date:'2026-10-27',daysOff:[today]});assert.equal(build(s).materials[0].focus.recommendations.length,0);
});
test('regular plus focus overlap is a single nonoverlapping today list',()=>{
 const s=exam(seed(100),{focusMode:'manual',focusDate:today}),rows=build(s).today;
 assert.equal(R.amount(rows),100);assert.equal(rows.filter(r=>r.sources.length===2).length,1);
 for(let i=1;i<rows.length;i++)assert.ok(rows[i-1].end<rows[i].start);
});
test('completing combined recommendation once makes one original record and reduces both plans',()=>{
 let s=exam(seed(100),{focusMode:'manual',focusDate:today});const r=build(s).today[0],original=structuredClone(s.study.materials[0].records);
 s=review(s,'single',today,r.start,r.end);assert.equal(s.study.materials[0].reviews.length,1);assert.deepEqual(s.study.materials[0].records,original);
 assert.ok(build(s).today.every(p=>p.start>r.end||p.end<r.start));assert.equal(build(s).materials[0].focus.remaining,100-(r.end-r.start+1));
});
test('manual dates override automation and are consumed only on covered completed ranges',()=>{
 let s=apply(seed(40),{type:'review-date',id:'m',start:1,end:20,date:'2026-11-01'});
 assert.equal(derive(s).segments.find(r=>r.start===1).dueDate,'2026-11-01');
 s=review(s,'v',today,1,10,'보통');const rows=derive(s).segments;
 assert.equal(rows.find(r=>r.start===1).manual,undefined);assert.equal(rows.find(r=>r.start===11).dueDate,'2026-11-01');
 assert.equal(rows.find(r=>r.start===21).dueDate,'2026-10-04');
 s=apply(s,{type:'delete-review',id:'m',recordId:'v'});assert.equal(derive(s).segments.find(r=>r.start===1).dueDate,'2026-11-01');
});
test('manual dates remain authoritative over focus picks',()=>{
 const s=exam(apply(seed(40),{type:'review-date',id:'m',start:1,end:20,date:'2026-11-01'}),{focusMode:'manual',focusDate:today});
 assert.ok(build(s).materials[0].focus.recommendations.every(r=>r.start>20));
});
test('manual date overwrite and automatic reset only change the requested intersection',()=>{
 let s=apply(seed(40),{type:'review-date',id:'m',start:1,end:30,date:'2026-11-01'});
 s=apply(s,{type:'review-date',id:'m',start:10,end:20,date:'2026-11-05'});
 s=apply(s,{type:'review-date',id:'m',start:15,end:18,date:''});const rows=derive(s).segments;
 assert.equal(rows.find(r=>r.start===1).dueDate,'2026-11-01');assert.equal(rows.find(r=>r.start===10).dueDate,'2026-11-05');assert.equal(rows.find(r=>r.start===15).dueDate,'2026-10-04');assert.equal(rows.find(r=>r.start===21).dueDate,'2026-11-01');
});
test('review settings backup round trip retains unknown fields, old backups need no new fields',()=>{
 let s=apply(seed(40),{type:'review-settings',id:'m',amount:5});s=apply(s,{type:'review-date',id:'m',start:1,end:20,date:'2026-11-01'});s.study.materials[0].reviewSettings.custom={keep:true};
 const b=D.backup(s,E);assert.deepEqual(D.restore(b,seed(),E),s);assert.equal(D.validate(seed(),E).study.materials[0].reviewSettings,undefined);
 const original=structuredClone(s);assert.throws(()=>apply(s,{type:'review-settings',id:'m',amount:0}));assert.throws(()=>apply(s,{type:'review-date',id:'m',start:40,end:20,date:'2026-11-01'}));assert.deepEqual(s,original);
});
test('paused/archive states exclude recommendations while stored data stays untouched',()=>{
 let s=exam(seed(100));s.exams=E.update(s.exams,{type:'material-status',id:'m',status:'paused'});const before=structuredClone(s);assert.equal(build(s).materials.length,0);assert.deepEqual(s,before);
 s.exams=E.update(s.exams,{type:'material-status',id:'m',status:'active'});s=apply(s,{type:'archive',id:'m',archived:true});assert.equal(build(s).today.length,0);
});

test('future progress cannot inflate initial review capacity or focus targets',()=>{
 const s=seed(0);s.study.materials[0].records.push({id:'future-study',date:'2026-11-01',position:100,sequence:4});
 const p=build(exam(s)).materials[0];assert.equal(p.speed.amount,null);assert.equal(p.focus.total,0);
});
test('manual schedules after exam are reported as unavailable instead of overwritten',()=>{
 const s=exam(apply(seed(40),{type:'review-date',id:'m',start:1,end:20,date:'2026-12-01'}),{date:'2026-11-10',focusMode:'manual',focusDate:today});
 const f=build(s).materials[0].focus;assert.ok(f.shortfall>=20);assert.ok(f.recommendations.every(r=>r.start>20));
});
test('review settings save failure keeps old data, backup and manual schedule unchanged',()=>{
 let s=apply(seed(40),{type:'review-settings',id:'m',amount:5});const original=structuredClone(s);
 const next=apply(s,{type:'review-date',id:'m',start:1,end:10,date:'2026-11-01'});
 assert.throws(()=>D.save({setItem(){throw Error('quota');}},next,E));assert.deepEqual(s,original);
});

test('today display also places difficult and older ranges before newer easy ranges',()=>{
 let s=review(seed(60),'hard','2026-10-20',40,50,'어려움');
 const list=build(s).today;assert.equal(list[0].understanding,'어려움');assert.equal(list[0].start,40);
});

test('internal success streak resets on difficulty and is derived without writing original records',()=>{
 let s=review(seed(20),'one','2026-10-02',1,20,'쉬움');s=review(s,'two','2026-10-03',1,20,'보통');
 const before=structuredClone(s);assert.equal(derive(s).segments[0].successStreak,2);assert.deepEqual(s,before);
 s=review(s,'three','2026-10-04',1,20,'어려움');assert.equal(derive(s).segments[0].successStreak,0);
 assert.ok(s.study.materials[0].reviews.every(r=>!Object.hasOwn(r,'successStreak')));
});
test('shortfall uses actual fractional speed and never penalises over-completion twice',()=>{
 const goal={learningDays:[0,1,2,3,4,5,6],daysOff:[]};
 assert.equal(R.shortage([{start:1,end:10}],today,'2026-10-26',today,goal,0.25,0,L),10);
 assert.equal(R.shortage([{start:21,end:100}],today,'2026-10-26',today,goal,10,20,L),70);
});
