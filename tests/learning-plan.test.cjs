const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../dist/learning-plan.js'),D=require('../dist/study-data.js'),E=require('../dist/exam-management.js');
const today='2026-10-25';
const m=(id='m',extra={})=>({id,name:id,type:'book',unit:'페이지',total:100,round:1,records:[],roundHistory:[],reviews:[],note:'',...extra});
const g=(id,date,extra={})=>({id,name:id,date,status:'active',note:'',materialIds:['m'],continuedMaterialIds:[],learningDays:[0,1,2,3,4,5,6],daysOff:[],focusMode:'auto',focusDate:'',...extra});
const state=(materials=[m()],goals=[])=>D.validate(D.envelope({version:1,materials,recordSequence:100},{...D.emptyExams(),goals}),E);
const plans=s=>P.build(s,today,D,E);
const record=(id,date,position,sequence=0)=>({id,date,position,sequence});
test('approved example: 100 remaining / 5 days = 20, exam day excluded',()=>{
 const p=plans(state([m()],[g('exam','2026-10-30')]))[0];assert.equal(p.deadline,'2026-10-29');assert.equal(p.availableDays,5);assert.equal(p.requiredDaily,20);assert.equal(p.amount,20);
});
test('earlier exam deadline wins over a later material target',()=>{
 const p=plans(state([m('m',{targetDate:'2026-10-30'})],[g('exam','2026-10-27')]))[0];assert.equal(p.availableDays,2);assert.equal(p.deadline,'2026-10-26');assert.equal(p.requiredDaily,50);assert.equal(p.deadlineSource,'exam');
});
test('earliest active exam controls shared material once, priority changes ordering only',()=>{
 const s=state([m(),m('other')],[g('later','2026-11-01',{materialIds:['m','other']}),g('early','2026-10-30')]);s.exams=E.update(s.exams,{type:'priority',id:'later'});
 const all=plans(s),p=all.find(p=>p.id==='m');assert.equal(all.filter(p=>p.id==='m').length,1);assert.equal(p.goalId,'early');assert.equal(p.requiredDaily,20);
 const ordered=state([m(),m('other')],[g('a','2026-11-01'),g('b','2026-10-31',{materialIds:['other']})]);ordered.exams=E.update(ordered.exams,{type:'priority',id:'a'});assert.equal(plans(ordered)[0].id,'m');
});
test('independent/no-date materials get no invented quota; own target uses all calendar days',()=>{
 assert.equal(plans(state())[0].requiredDaily,null);assert.equal(plans(state([m()],[g('undated','')]))[0].amount,null);
 const p=plans(state([m('m',{targetDate:'2026-10-29'})]))[0];assert.equal(p.requiredDaily,20);assert.equal(p.goalId,null);
});
test('weekday and individual days off reduce divisor; rest today yields no assignment',()=>{
 const p=plans(state([m()],[g('a','2026-10-31',{learningDays:[0,1,2,3,4],daysOff:['2026-10-27']})]))[0];
 assert.equal(p.availableDays,4);assert.equal(p.requiredDaily,25);assert.equal(p.todayAllowed,false);assert.equal(p.amount,0);
});
test('no available day, today exam, elapsed deadline never divide by zero',()=>{
 for(const goal of [g('a',today),g('a','2026-10-20'),g('a','2026-10-30',{learningDays:[]})]){const p=plans(state([m()],[goal]))[0];assert.equal(p.noTime,true);assert.equal(p.requiredDaily,null);assert.equal(p.amount,goal.learningDays.length?null:0);}
});
test('active shared exam releases automatic pause, direct pause/archive excluded from tasks',()=>{
 let s=state([m()],[g('old','2026-10-30',{status:'paused'}),g('new','2026-11-01')]);assert.equal(plans(s)[0].isActive,true);
 s.exams=E.update(s.exams,{type:'material-status',id:'m',status:'paused'});assert.equal(plans(s)[0].amount,0);
 s=D.update(s,{type:'archive',id:'m',archived:true},E);assert.deepEqual(plans(s),[]);
});
test('progress edits/deletions recalculate derived quotas without changing plan/manual exam fields',()=>{
 const s=state([m()],[g('a','2026-10-30',{focusMode:'manual',focusDate:'2026-10-26'})]);
 const progressed=D.update(s,{type:'record',id:'m',record:record('r',today,20),today},E);assert.equal(plans(progressed)[0].requiredDaily,20);assert.equal(plans(progressed)[0].amount,0);
 const removed=D.update(progressed,{type:'delete-record',id:'m',recordId:'r'},E);assert.equal(plans(removed)[0].requiredDaily,20);assert.equal(removed.exams.goals[0].focusDate,'2026-10-26');
});
for(const [span,window] of [[0,0],[1,0],[6,0],[7,7],[13,7],[14,14],[27,14],[28,28],[60,28]])test(`actual material record span ${span} days selects ${window}-day window`,()=>{
 const material=m('m',{records:span?[record('first',P.shift(today,1-span),10)]:[]});const f=plans(state([material],[g('a','2029-01-01')]))[0].forecast;
 assert.equal(f.span,span);assert.equal(f.window,window);if(span<7)assert.equal(f.date,null);
});
test('averages include days without study and do not use exam preparation duration',()=>{
 const material=m('m',{records:[record('first','2026-10-19',10),record('second','2026-10-25',20,1)]});
 const p=plans(state([material],[g('a','2030-01-01')]))[0];assert.equal(p.forecast.window,7);assert.equal(p.forecast.speed,20/7);assert.equal(p.forecast.date,'2026-11-22');
});
test('latest window excludes older amounts and reviews, including overlapping review ranges',()=>{
 const material=m('m',{records:[record('first','2026-10-12',10),record('now',today,24,1)],reviews:[{id:'review',date:today,start:1,end:100,total:100,unit:'페이지',sequence:2}]});
 const f=plans(state([material]))[0].forecast;assert.equal(f.window,14);assert.equal(f.recentAmount,24);
 const old=m('m',{records:[record('first','2026-09-01',10),record('now',today,38,1)]});assert.equal(plans(state([old]))[0].forecast.recentAmount,28);
});
test('no recent progress means no completion estimate, independent of required quota',()=>{
 const p=plans(state([m('m',{records:[record('old','2026-08-01',50)]})],[g('a','2026-10-30')]))[0];assert.equal(p.forecast.reason,'no-recent-study');assert.equal(p.forecast.date,null);assert.equal(p.requiredDaily,10);
});
test('historical rounds count for material lifetime and speed, partial reviews never establish lifetime',()=>{
 const material=m('m',{round:2,roundHistory:[{round:1,total:100,unit:'페이지',completedDate:'2026-10-01',records:[record('history','2026-10-01',100)]}],records:[record('current',today,28,1)]});
 const p=plans(state([material]))[0];assert.equal(p.remaining,72);assert.equal(p.forecast.span,25);assert.equal(p.forecast.window,14);assert.equal(p.forecast.recentAmount,28);
 const onlyReview=m('m',{reviews:[{id:'v',date:'2026-08-01',start:1,end:100,total:100,unit:'페이지',sequence:0}]});assert.equal(plans(state([onlyReview]))[0].forecast.span,0);
});
test('history of a different unit is not added to current-unit average',()=>{
 const material=m('m',{round:2,roundHistory:[{round:1,total:100,unit:'문제',completedDate:'2026-10-01',records:[record('history','2026-10-01',100)]}],records:[record('current',today,28,1)]});assert.equal(plans(state([material]))[0].forecast.recentAmount,28);
});
test('manual target persists through progress and backup; today done is subtracted from the automatic day-start quota too',()=>{
 let s=D.update(state([m()],[g('a','2026-10-30')]),{type:'plan',id:'m',amount:10},E);assert.equal(plans(s)[0].amount,10);assert.equal(plans(s)[0].manualShortfall,50);
 s=D.update(s,{type:'record',id:'m',record:record('r',today,6),today},E);assert.equal(plans(s)[0].amount,4);assert.equal(s.study.materials[0].manualDailyAmount,10);
 assert.deepEqual(D.restore(D.backup(s,E),state(),E),s);
 s=D.update(s,{type:'plan',id:'m',amount:null},E);assert.equal(plans(s)[0].manualDailyAmount,null);assert.equal(plans(s)[0].amount,14);
});
test('invalid manual amounts rejected, completion yields zero without fictitious estimate',()=>{
 for(const amount of [0,-1,1.2,'10'])assert.throws(()=>D.update(state(),{type:'plan',id:'m',amount},E));
 const p=plans(state([m('m',{records:[record('done',today,100)]})],[g('a','2026-10-30')]))[0];assert.equal(p.amount,0);assert.equal(p.forecast.reason,'completed');
});
test('calendar arithmetic handles leap days, years, huge horizons and duplicate rest dates',()=>{
 assert.equal(P.availableDays('2028-02-28','2028-03-01',null),3);assert.equal(P.shift('2026-12-31',1),'2027-01-01');
 const goal=g('a','',{learningDays:[0,1,2,3,4,5,6],daysOff:['2026-10-25','2026-10-25']});assert.equal(P.availableDays(today,'2026-10-29',goal),4);
 assert.equal(P.availableDays(today,'9999-12-31',null),P.diff('9999-12-31',today)+1);
});
test('plans and estimates never mutate source study history, raw evaluations or exam schedules',()=>{
 const s=state([m('m',{records:[{...record('r','2026-10-01',10),understanding:'어려움',custom:{keep:1}}]})],[g('a','2026-10-30',{daysOff:['2026-10-28'],focusMode:'manual',focusDate:'2026-10-27'})]);const before=JSON.stringify(s);plans(s);plans(s);assert.equal(JSON.stringify(s),before);
});
test('same-day progress uses deltas, not sum of positions; mean never counts duplicate days as extra time',()=>{
 const material=m('m',{records:[record('first','2026-10-19',10),record('second',today,20,1),record('third',today,30,2)]});const p=plans(state([material]))[0];assert.equal(p.forecast.recentAmount,30);assert.equal(p.forecast.speed,30/7);assert.equal(p.remaining,70);
});
test('unrepresentable finish date yields explicit no-estimate result instead of crashing',()=>{
 const material=m('m',{total:Number.MAX_SAFE_INTEGER,records:[record('first','2026-10-19',1)]});const p=plans(state([material]))[0];assert.equal(p.forecast.reason,'out-of-range');assert.equal(p.forecast.date,null);
});

test('earlier material target remains binding; future preparing exam wins over an expired goal',()=>{
 const p=plans(state([m('m',{targetDate:'2026-10-26'})],[g('future','2026-10-30'),g('expired','2026-10-01')]))[0];
 assert.equal(p.goalId,'future');assert.equal(p.deadline,'2026-10-26');assert.equal(p.amount,50);
});
test('burden includes idle eligible days, excludes rest days, and starts exactly at 1.5',()=>{
 const material=m('m',{total:1000,records:[record('r','2026-09-28',40)]});
 const goal=g('exam','2026-12-01',{learningDays:[0,1,2,3,4],daysOff:['2026-10-01']});
 const h=P.habit(material,today,D,goal);assert.equal(h.window,28);assert.equal(h.days,19);assert.equal(h.amount,40);assert.equal(h.speed,40/19);
 const common={goalDate:'2026-12-01',isActive:true,remaining:120,manualDailyAmount:null};
 assert.equal(P.notice({...common,burdenRatio:1.499}), '');assert.match(P.notice({...common,burdenRatio:1.5}),/다소 부담/);assert.match(P.notice({...common,burdenRatio:2}),/다소 부담/);
 assert.equal(P.notice({...common,burdenRatio:null}), '');assert.equal(P.notice({...common,burdenRatio:2,goalDate:null}), '');assert.equal(P.notice({...common,burdenRatio:2,remaining:0}), '');
});
test('habit requires real matching-unit history and a positive recent speed',()=>{
 const insufficient=P.habit(m('m',{records:[record('r',today,10)]}),today,D,g('a','2026-11-01'));assert.equal(insufficient.speed,null);
 const zero=P.habit(m('m',{records:[record('r','2026-08-01',40)]}),today,D,g('a','2026-11-01'));assert.equal(zero.speed,null);
 const rest=P.habit(m('m',{records:[record('r','2026-09-28',40)]}),today,D,g('a','2026-11-01',{learningDays:[]}));assert.equal(rest.speed,null);
});
test('manual notice uses actual remaining capacity and never overwrites the manual amount',()=>{
 let s=D.update(state([m()],[g('exam','2026-10-30')]),{type:'plan',id:'m',amount:10},E),p=plans(s)[0];
 assert.match(P.notice(p),/設定|설정한/);assert.equal(p.manualDailyAmount,10);
 s=D.update(s,{type:'plan',id:'m',amount:20},E);p=plans(s)[0];assert.equal(P.notice(p),'');assert.equal(p.amount,20);
});
test('burden and forecasts stay independent from quota increases and same-day completion',()=>{
 const s=state([m('m',{total:1000,records:[record('old','2026-09-28',28)]})],[g('exam','2026-10-30')]);
 const before=JSON.stringify(s),p=plans(s)[0];assert.equal(p.habit.speed,1);assert.ok(p.burdenRatio>1.5);assert.match(P.notice(p),/다소 부담/);
 const noExam=state(s.study.materials);assert.equal(plans(noExam)[0].forecast.date,p.forecast.date);assert.equal(JSON.stringify(s),before);
});
