// Application wiring smoke tests with a minimal DOM adapter, not browser/layout QA.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const D=require('../dist/study-data.js');
function boot(entries={},options={}){
 const windowListeners=new Map();
 const map=new Map(Object.entries(entries)),elements=new Map();
 function element(id){if(!elements.has(id))elements.set(id,{id,style:{},value:'',textContent:'',innerHTML:'',hidden:false,dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(){},focus(){},querySelector(){return element(id+' child');},querySelectorAll(){return [];},showModal(){this.open=true;},close(){this.open=false;},scrollTop:0});return elements.get(id);}
 const document={getElementById:element,querySelector:element,querySelectorAll:()=>[],addEventListener(){},activeElement:null};
 const context=vm.createContext({document,console,Date:options.Date||Date,Intl,crypto,location:{hash:''},history:{replaceState(){}},setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},addEventListener(type,fn){windowListeners.set(type,fn);},scrollTo(){}});
 context.window=context;
 for(const name of ['streak.js','exam-management.js','study-data.js','learning-plan.js','review-plan.js','study-stats.js','storage-guard.js','app.js'])vm.runInContext(fs.readFileSync('dist/'+name,'utf8'),context,{filename:name});
 return {map,element,dispatchWindow:type=>windowListeners.get(type)?.(),run:code=>vm.runInContext(code,context),context};
}
const submit=(app,mode,id='',record='')=>app.run(`submitStudyForm({preventDefault(){},target:{dataset:{studyForm:${JSON.stringify(mode)},material:${JSON.stringify(id)},record:${JSON.stringify(record)}},querySelector(){return null;},querySelectorAll(){return [];}}})`);
test('real app initialises empty, shows registration/settings dialogs and persists form submissions on reload',()=>{
 const a=boot();assert.match(a.element('today-list').innerHTML,/등록/);
 a.run("openDialog('material')");assert.match(a.element('dialog-content').innerHTML,/data-study-form="material"/);
 for(const [id,value] of Object.entries({'material-name':'연결 검사','material-type':'other','custom-unit':'묶음','material-total':'20','material-due':'2026-11-01'}))a.element(id).value=value;
 submit(a,'material');let saved=JSON.parse(a.map.get(D.KEY)),m=saved.study.materials[0];assert.equal(m.name,'연결 검사');assert.equal(m.unit,'묶음');assert.match(a.element('material-grid').innerHTML,/연결 검사/);
 a.run(`openDialog('record',${JSON.stringify(m.id)})`);assert.equal(a.element('study-position').value,'');
 a.element('study-date').value='2026-10-01';a.element('study-position').value='10';submit(a,'record',m.id);
 a.element('review-date').value='2026-10-02';a.element('review-from').value='2';a.element('review-to').value='8';submit(a,'review',m.id);
 a.element('material-note').value='메모 저장';submit(a,'memo',m.id);
 saved=JSON.parse(a.map.get(D.KEY));assert.equal(saved.study.materials[0].records[0].position,10);assert.equal(saved.study.materials[0].reviews.length,1);assert.equal(saved.study.materials[0].note,'메모 저장');
 const b=boot(Object.fromEntries(a.map));assert.match(b.element('material-grid').innerHTML,/연결 검사/);assert.match(b.element('material-grid').innerHTML,/>10</);
 b.run(`openDetail(${JSON.stringify(m.id)})`);assert.match(b.element('detail-tab-content').innerHTML,/2026-10-01/);assert.match(b.element('detail-tab-content').innerHTML,/data-edit-entry/);
 b.run("openDialog('settings')");assert.match(b.element('dialog-content').innerHTML,/data-backup/);assert.match(b.element('dialog-content').innerHTML,/restore-file/);
});
test('app archive badge, unarchive, delete confirmation, and reset use live storage',()=>{
 const a=boot();a.run("commitStudy({type:'material',material:{id:'m',name:'보관할 자료',type:'book',unit:'페이지',total:10}},'ok')");
 a.run("handleStudyButton({dataset:{archiveMaterial:'m'},hasAttribute(){return false;}})");assert.equal(a.element('archive-count').textContent,1);assert.doesNotMatch(a.element('material-grid').innerHTML,/보관할 자료/);
 a.run("openDialog('archive')");assert.match(a.element('dialog-content').innerHTML,/data-unarchive-material="m"/);
 a.run("handleStudyButton({dataset:{unarchiveMaterial:'m'},hasAttribute(){return false;}})");assert.equal(a.element('archive-count').textContent,0);
 a.run("openDialog('delete-material','m')");assert.match(a.element('dialog-content').innerHTML,/data-study-form="delete"/);submit(a,'delete','m');assert.equal(JSON.parse(a.map.get(D.KEY)).study.materials.length,0);
 submit(a,'reset');assert.equal(JSON.parse(a.map.get(D.KEY)).exams.goals.length,0);
});
test('blocked initial load surfaces error; explicit reset preserves unreadable data before recovery',()=>{
 const a=boot({[D.KEY]:'invalid-json'});assert.match(a.element('toast').textContent,/변경을 중단/);
 a.run("commitStudy({type:'material',material:{id:'m',name:'실패',type:'book',unit:'페이지',total:10}},'ok')");assert.equal(a.map.get(D.KEY),'invalid-json');
 submit(a,'reset');assert.equal(JSON.parse(a.map.get(D.KEY+'.before-recovery.0')).v2,'invalid-json');assert.equal(JSON.parse(a.map.get(D.KEY)).study.materials.length,0);
});
test('failed real-app save retains visible and in-memory state',()=>{
 const a=boot();const before=a.element('material-grid').innerHTML;
 a.context.localStorage.setItem=()=>{throw Error('quota');};
 a.run("commitStudy({type:'material',material:{id:'m',name:'실패',type:'book',unit:'페이지',total:10}},'ok')");assert.equal(a.element('material-grid').innerHTML,before);assert.equal(a.run('dataState.study.materials.length'),0);
});
test('file restore stages data for confirmation and commits only after submission',async()=>{
 const a=boot();a.run("commitStudy({type:'material',material:{id:'m',name:'백업 자료',type:'book',unit:'페이지',total:10}},'ok')");
 const backup=a.run('JSON.stringify(studyAPI.backup(dataState,examAPI))');submit(a,'reset');
 a.context.fixtureBackup=backup;
 await a.run("readRestore({files:[{text:async()=>fixtureBackup}],value:'selected'})");
 assert.equal(JSON.parse(a.map.get(D.KEY)).study.materials.length,0);assert.match(a.element('dialog-content').innerHTML,/data-study-form="restore"/);
 submit(a,'restore');assert.equal(JSON.parse(a.map.get(D.KEY)).study.materials[0].name,'백업 자료');
});
test('resit UI stages only original linked materials and commits selected ids with days off',()=>{
 const a=boot();
 a.run("commitStudy({type:'material',material:{id:'m',name:'기록 유지',type:'book',unit:'페이지',total:10}},'ok')");
 a.run("commitStudy({type:'record',id:'m',record:{id:'r',date:'2026-10-01',position:5},today:'2026-10-25'},'ok')");
 a.run("commitExam({type:'upsert',goal:{id:'old',name:'이전 시험',date:'',status:'archived',note:'보존 메모',materialIds:['m'],continuedMaterialIds:[],learningDays:[0,1],focusMode:'auto',focusDate:''}},'ok')");
 const studyBefore=JSON.parse(a.map.get(D.KEY)).study;
 a.run("openExamDialog('resit','old')");assert.match(a.element('dialog-content').innerHTML,/다시|함께 사용/);assert.match(a.element('dialog-content').innerHTML,/data-exam-form="resit"/);
 for(const [id,value] of Object.entries({'goal-name':'재응시','goal-date':'2026-12-01','focus-mode':'auto','focus-date':'','exam-days-off':'2026-11-01,\n2026-11-08'}))a.element(id).value=value;
 a.run(`submitExamForm({preventDefault(){},target:{dataset:{goal:'old',examForm:'resit'},querySelectorAll(selector){return selector.includes('goal-material')?[{value:'m'}]:[{value:'0'},{value:'1'}];}}})`);
 const state=JSON.parse(a.map.get(D.KEY));assert.equal(state.exams.goals.length,2);assert.equal(state.exams.goals[0].status,'archived');assert.equal(state.exams.goals[1].sourceGoalId,'old');assert.deepEqual(state.exams.goals[1].daysOff,['2026-11-01','2026-11-08']);assert.deepEqual(state.study,studyBefore);
});
test('approved plans render quota and adaptive estimate; manual form persists and survives reload',()=>{
 const a=boot();a.run("Date=class extends Date{constructor(...args){super(...(args.length?args:['2026-10-25T12:00:00']));}}");
 a.run("commitStudy({type:'material',material:{id:'m',name:'추천 자료',type:'book',unit:'페이지',total:100}},'ok')");
 a.run("commitExam({type:'upsert',goal:{id:'g',name:'시험',date:'2026-10-30',status:'active',note:'',materialIds:['m'],continuedMaterialIds:[],learningDays:[0,1,2,3,4,5,6],focusMode:'auto',focusDate:''}},'ok')");
 assert.match(a.element('today-list').innerHTML,/오늘 권장 20페이지/);assert.doesNotMatch(a.element('today-list').innerHTML,/추정할 기록이 부족/);
 a.run("commitStudy({type:'record',id:'m',record:{id:'r',date:'2026-10-19',position:20},today:'2026-10-25'},'ok')");
 assert.doesNotMatch(a.element('today-list').innerHTML,/최근 7일 평균/);assert.match(a.element('today-list').innerHTML,/오늘 권장 16페이지/);
 a.run("openDialog('study-plan','m')");assert.match(a.element('dialog-content').innerHTML,/data-study-form="plan"/);
 a.element('manual-daily-amount').value='5';submit(a,'plan','m');assert.match(a.element('today-list').innerHTML,/오늘 직접 설정 5페이지/);
 a.run("openDetail('m');renderDetailTab('basic')");assert.match(a.element('detail-tab-content').innerHTML,/최근 7일 평균/);
 a.run("renderGoals()");assert.match(a.element('goal-grid').innerHTML,/학습 계획/);
 const b=boot(Object.fromEntries(a.map));assert.equal(b.run('dataState.study.materials[0].manualDailyAmount'),5);
});
test('failed manual-plan save keeps original plan; clearing it restores automatic quota',()=>{
 const a=boot();a.run("commitStudy({type:'material',material:{id:'m',name:'수동 계획',type:'book',unit:'페이지',total:100}},'ok')");
 a.run("commitStudy({type:'plan',id:'m',amount:7},'ok')");const raw=a.map.get(D.KEY),setter=a.context.localStorage.setItem;
 a.context.localStorage.setItem=()=>{throw Error('quota');};a.element('manual-daily-amount').value='99';submit(a,'plan','m');assert.equal(a.map.get(D.KEY),raw);assert.equal(a.run('dataState.study.materials[0].manualDailyAmount'),7);
 a.context.localStorage.setItem=setter;a.element('manual-daily-amount').value='';submit(a,'plan','m');assert.equal(a.run('dataState.study.materials[0].manualDailyAmount'),null);
});
test('compact plan modal keeps stored unit/value, removes long explanation, and limits styling to this modal',()=>{
 const a=boot();a.run("commitStudy({type:'material',material:{id:'m',name:'실제 단위',type:'other',unit:'묶음',total:100}},'ok');commitStudy({type:'plan',id:'m',amount:15},'ok')");
 const raw=a.map.get(D.KEY),classes=new Set();a.element('app-dialog').classList={add:n=>classes.add(n),remove:(...names)=>names.forEach(n=>classes.delete(n)),toggle:(n,on)=>on?classes.add(n):classes.delete(n)};
 a.run("openDialog('study-plan','m')");const content=a.element('dialog-content').innerHTML;
 assert.match(content,/하루 학습량 <small>\(선택사항\)/);assert.match(content,/class="plan-amount"/);assert.match(content,/>묶음<\/span>/);assert.match(content,/value="15"/);assert.match(content,/비워 두면 자동 추천을 사용해요\./);assert.doesNotMatch(content,/7·14·28|최근 .*일 평균|남은 분량과 가능한 날/);
 const status=content.match(/<div class="plan-status">([\s\S]*?)<\/div>/)[1];assert.ok((status.match(/<p[ >]/g)||[]).length<=2);assert.equal(classes.has('study-plan-dialog'),true);assert.equal(a.map.get(D.KEY),raw);
 a.run("openDialog('memo','m')");assert.equal(classes.has('study-plan-dialog'),false);
 a.run("openDialog('study-plan','m');presentExamDialog('시험 메모','<p>예시</p>')");assert.equal(classes.has('study-plan-dialog'),false);
});
test('modal status keeps rest independent, prioritises actionable warnings, and never mutates calculations',()=>{
 const a=boot();const base={remaining:100,isActive:true,todayAllowed:true,manualDailyAmount:null,amount:20,deadline:'2026-11-20',noTime:false,overdue:false,manualShortfall:0,expectedLate:false,forecast:{reason:'insufficient'}};
 const cases=[
  [{...base,todayAllowed:false,deadline:null},'오늘은 쉬는 날','목표일 미정'],
  [base,'오늘 권장 20페이지','예상일을 추정할 기록이 부족해요.'],
  [{...base,isActive:false,noTime:true},'학습 중단 중','재개 후 권장량을 확인해 주세요.'],
  [{...base,manualDailyAmount:10,amount:10,manualShortfall:30},'직접 정한 오늘 분량 10페이지','직접 정한 분량으로는 기한까지 30페이지 부족해요.'],
  [{...base,remaining:0},'이번 회독 완료','']
 ];
 for(const [fixture,primary,secondary] of cases){const before=JSON.stringify(fixture);a.context.statusFixture=fixture;const shown=a.run("compactPlanStatus(statusFixture,'페이지')");assert.equal(shown.primary,primary);assert.equal(shown.secondary,secondary);assert.equal(JSON.stringify(fixture),before);}
});

test('home today-list shows concise remaining/state only for all requested plan cases',()=>{
 const a=boot();
 const base={id:'sample',remaining:25,isActive:true,todayAllowed:true,manualDailyAmount:null,amount:null,deadline:null,noTime:false,overdue:false,manualShortfall:0,expectedLate:false,forecast:{reason:'insufficient'}};
 const cases=[
  [base,'남은 25강 · 목표일 미정'],
  [{...base,deadline:'2026-11-20',amount:5},'남은 25강 · 오늘 권장 5강'],
  [{...base,manualDailyAmount:10,amount:6},'남은 25강 · 오늘 직접 설정 6강'],
  [{...base,todayAllowed:false,amount:0},'남은 25강 · 오늘은 쉬는 날'],
  [{...base,deadline:'2026-11-20',amount:5,forecast:{reason:'no-recent-study',window:14}},'남은 25강 · 오늘 권장 5강'],
  [{...base,noTime:true,overdue:true},'남은 25강 · 학습 가능일 없음 · 기한 초과'],
  [{...base,noTime:true},'남은 25강 · 학습 가능일 없음']
 ];
 const raw=a.map.get(D.KEY);
 for(const [plan,expected] of cases){
  const before=JSON.stringify(plan);a.context.homeFixture=[plan];
  a.run("demoMaterials=[{id:'sample',name:'아주 긴 자료명 <안전한 표시>',unit:'강'}];currentPlans=()=>homeFixture;renderToday()");
  const html=a.element('today-list').innerHTML;
  assert.ok(html.includes(expected));assert.equal((html.match(/<small/g)||[]).length,1);
  assert.doesNotMatch(html,/추정할 기록|최근 14일|예상 완료|목표일을 정하면 권장량/);
  assert.match(html,/data-dialog="record" data-material="sample"/);
  assert.match(html,/&lt;안전한 표시&gt;/);assert.equal(JSON.stringify(plan),before);
 }
 assert.equal(a.map.get(D.KEY),raw);
 a.context.homeFixture=[{...base,remaining:0,amount:0}];a.run('renderToday()');
 assert.doesNotMatch(a.element('today-list').innerHTML,/data-material="sample"/);
 assert.match(a.element('today-list').innerHTML,/오늘 진행할 학습이 없어요/);
});

test('home manual target completion and short warnings preserve original detailed labels',()=>{
 const a=boot();const plan={remaining:30,isActive:true,todayAllowed:true,manualDailyAmount:10,amount:0,deadline:'2026-11-20',noTime:false,overdue:false,manualShortfall:0,expectedLate:false,forecast:{reason:'no-recent-study',window:14}};
 a.context.homeFixture=plan;
 assert.equal(a.run("homePlanLabel(homeFixture,'페이지')"),'오늘 설정한 분량 완료');
 assert.match(a.run('forecastLabel(homeFixture)'),/최근 14일 학습량이 0/);
 a.context.homeFixture={...plan,amount:4,manualShortfall:12};
 assert.equal(a.run("homePlanLabel(homeFixture,'페이지')"),'오늘 직접 설정 4페이지 · 기한 내 12페이지 부족');
 assert.match(a.run("planWarning(homeFixture,'페이지')"),/직접 정한 분량으로는/);
});

test('material heading and filters reflect live unarchived data across changes and reload',()=>{
 const a=boot();
 const counts=()=>['material-count','material-count-all','material-count-school','material-count-exam'].map(id=>Number(a.element(id).textContent));
 assert.deepEqual(counts(),[0,0,0,0]);
 a.run("commitStudy({type:'material',material:{id:'school',name:'전공',type:'book',unit:'페이지',total:10,category:'school'}},'ok');commitStudy({type:'material',material:{id:'exam',name:'시험',type:'book',unit:'페이지',total:10,category:'exam'}},'ok')");
 assert.deepEqual(counts(),[2,2,1,1]);
 a.run("renderMaterials('school')");assert.deepEqual(counts(),[2,2,1,1]);
 a.run("commitStudy({type:'archive',id:'school',archived:true},'ok')");assert.deepEqual(counts(),[1,1,0,1]);
 assert.match(a.element('filter-empty child').textContent,/분류/);
 const b=boot(Object.fromEntries(a.map));assert.equal(Number(b.element('material-count').textContent),1);
 a.run("commitStudy({type:'archive',id:'school',archived:false},'ok')");assert.deepEqual(counts(),[2,2,1,1]);
 a.run("commitStudy({type:'delete',id:'exam'},'ok')");assert.deepEqual(counts(),[1,1,1,0]);
 submit(a,'reset');assert.deepEqual(counts(),[0,0,0,0]);
});

test('review UI shows merged ranges, prefills one completion, and stores only one history row',()=>{
 const a=boot();
 a.run("commitStudy({type:'material',material:{id:'m',name:'복습 UI',type:'book',unit:'페이지',total:100}},'ok')");
 a.run("commitStudy({type:'record',id:'m',record:{id:'r',date:'2026-10-01',position:60,understanding:'보통'},today:'2026-10-25'},'ok')");
 a.run("commitExam({type:'upsert',goal:{id:'g',name:'시험',date:'2026-11-10',status:'active',note:'',materialIds:['m'],learningDays:[0,1,2,3,4,5,6],daysOff:[],focusMode:'manual',focusDate:'2026-10-20',continuedMaterialIds:[]}},'ok')");
 a.run("openDialog('review-plan')");const html=a.element('dialog-content').innerHTML;
 assert.match(html,/복습 UI/);assert.match(html,/시험 전 복습/);assert.doesNotMatch(html,/successStreak|연속 성공/);
 const first=a.run('activeReviewPlans()[0]');
 a.run(`handleStudyButton({dataset:{dialog:'review',material:'m',reviewStart:'${first.start}',reviewEnd:'${first.end}'}})`);
 assert.equal(String(a.element('review-from').value),String(first.start));assert.equal(String(a.element('review-to').value),String(first.end));
 a.element('review-date').value='2026-10-25';submit(a,'review','m');
 const saved=JSON.parse(a.map.get(D.KEY));assert.equal(saved.study.materials[0].reviews.length,1);assert.equal(saved.study.materials[0].records.length,1);
 assert.ok(a.run('activeReviewPlans()').every(p=>p.start>first.end||p.end<first.start));
});
test('manual review quantity/date forms persist independently and survive app reload',()=>{
 const a=boot();a.run("commitStudy({type:'material',material:{id:'m',name:'범위',type:'book',unit:'페이지',total:100}},'ok')");
 a.run("commitStudy({type:'record',id:'m',record:{id:'r',date:'2026-10-01',position:40},today:'2026-10-25'},'ok')");
 a.run("openDialog('review-settings','m')");a.element('manual-review-amount').value='4';submit(a,'review-settings','m');
 a.run("openDialog('review-date','m')");a.element('review-schedule-start').value='1';a.element('review-schedule-end').value='10';a.element('review-schedule-date').value='2026-11-01';submit(a,'review-date','m');
 const saved=JSON.parse(a.map.get(D.KEY));assert.equal(saved.study.materials[0].reviewSettings.dailyAmount,4);assert.equal(saved.study.materials[0].reviewSettings.schedules[0].date,'2026-11-01');
 const b=boot(Object.fromEntries(a.map));b.run("openDialog('review-settings','m')");assert.match(b.element('dialog-content').innerHTML,/value="4"/);
 assert.equal(b.run("currentReviews().materials[0].segments[0].dueDate"),'2026-11-01');
 a.element('manual-review-amount').value='';submit(a,'review-settings','m');assert.equal(JSON.parse(a.map.get(D.KEY)).study.materials[0].reviewSettings.dailyAmount,null);
});

test('stats UI refreshes after writes and calendar shows actual names and scheduled ranges',()=>{
 const a=boot();assert.match(a.element('stats-summary').innerHTML,/>0<span>건/);assert.doesNotMatch(a.element('stats-proportions').innerHTML,/정보처리기사|45%/);
 a.run("commitStudy({type:'material',material:{id:'m',name:'실제 통계 자료',type:'book',unit:'페이지',total:100}},'ok')");
 a.run("commitStudy({type:'record',id:'m',record:{id:'r',date:localToday(),position:20},today:localToday()},'ok')");
 assert.match(a.element('stats-summary').innerHTML,/>1<span>건/);assert.match(a.element('stats-proportions').innerHTML,/100%/);
 a.run("showCalendarDay(localToday())");assert.match(a.element('dialog-content').innerHTML,/실제 통계 자료/);assert.match(a.element('dialog-content').innerHTML,/1–20페이지/);assert.doesNotMatch(a.element('dialog-content').innerHTML,/예시 기록/);
 a.run("commitStudy({type:'review-date',id:'m',start:1,end:10,date:'2026-11-01',today:localToday()},'ok');showCalendarDay('2026-11-01')");
 assert.match(a.element('dialog-content').innerHTML,/복습 예정/);assert.match(a.element('dialog-content').innerHTML,/이날 완료한 기록이 없어요/);
});
test('five plant stages retain first completion and render the stored family in archive',()=>{
 const a=boot();a.run("commitStudy({type:'material',material:{id:'m',name:'식물',type:'book',unit:'페이지',total:100}},'ok')");
 for(const [current,stage] of [[0,0],[10,0],[11,1],[30,1],[31,2],[60,2],[61,3],[99,3],[100,4]])assert.match(a.run(`plantClass({id:'p',type:'book',unit:'페이지',total:100,round:1,records:[{id:'r',date:'2026-10-01',position:${current},sequence:0}],roundHistory:[],reviews:[],current:${current},growthState:{family:'cactus',completed:false}})`),new RegExp('growth-cactus stage-'+stage));
 a.run("commitStudy({type:'record',id:'m',record:{id:'r',date:localToday(),position:100},today:localToday()},'ok')");
 const saved=JSON.parse(a.map.get(D.KEY)),family=saved.study.materials[0].growthState.family;
 a.run("commitStudy({type:'archive',id:'m',archived:true},'ok');openDialog('archive')");
 assert.match(a.element('dialog-content').innerHTML,new RegExp('growth-'+family+' stage-4'));
});

test('day rollover refreshes schedules without changing input, modal, filters or stored data',()=>{
 let clock='2026-10-26T12:00:00+09:00';class FixedDate extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return new Date(clock).getTime();}}
 const a=boot({}, {Date:FixedDate});
 a.run("commitStudy({type:'material',material:{id:'m',name:'Day',type:'book',unit:'pages',total:100,targetDate:'2026-10-30'}},'ok')");
 a.run("commitStudy({type:'record',id:'m',record:{id:'r',date:'2026-10-20',position:20},today:'2026-10-26'},'ok')");
 a.run("commitStudy({type:'review-date',id:'m',start:1,end:20,date:'2026-10-27',today:'2026-10-26'},'ok');renderStats('quarter');openDialog('memo','m')");
 a.element('material-note').value='unsaved input';const raw=a.map.get(D.KEY),dialog=a.element('app-dialog'),content=a.element('dialog-content').innerHTML;
 assert.match(a.element('home-date').textContent,/26/);assert.equal(a.run('activeReviewPlans().length'),0);
 clock='2026-10-27T12:00:00+09:00';a.dispatchWindow('focus');
 assert.match(a.element('home-date').textContent,/27/);assert.ok(a.run('activeReviewPlans().length')>0);assert.equal(dialog.open,true);assert.equal(a.element('material-note').value,'unsaved input');
 assert.equal(a.element('dialog-content').innerHTML,content);assert.equal(a.map.get(D.KEY),raw);assert.equal(a.run('statsPeriod'),'quarter');assert.equal(a.run('refreshForDayChange()'),false);
});
