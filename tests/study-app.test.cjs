// Application wiring smoke tests with a minimal DOM adapter, not browser/layout QA.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const D=require('../dist/study-data.js');
function boot(entries={}){
 const map=new Map(Object.entries(entries)),elements=new Map();
 function element(id){if(!elements.has(id))elements.set(id,{id,value:'',textContent:'',innerHTML:'',hidden:false,dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(){},focus(){},querySelector(){return element(id+' child');},querySelectorAll(){return [];},showModal(){this.open=true;},close(){this.open=false;},scrollTop:0});return elements.get(id);}
 const document={getElementById:element,querySelector:element,querySelectorAll:()=>[],addEventListener(){},activeElement:null};
 const context=vm.createContext({document,console,Date,Intl,crypto,location:{hash:''},history:{replaceState(){}},setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},addEventListener(){},scrollTo(){}});
 context.window=context;
 for(const name of ['streak.js','exam-management.js','study-data.js','learning-plan.js','app.js'])vm.runInContext(fs.readFileSync('dist/'+name,'utf8'),context,{filename:name});
 return {map,element,run:code=>vm.runInContext(code,context),context};
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
 assert.match(a.element('today-list').innerHTML,/오늘 권장 20페이지/);assert.match(a.element('today-list').innerHTML,/추정할 기록이 부족/);
 a.run("commitStudy({type:'record',id:'m',record:{id:'r',date:'2026-10-19',position:20},today:'2026-10-25'},'ok')");
 assert.match(a.element('today-list').innerHTML,/최근 7일 평균/);assert.match(a.element('today-list').innerHTML,/오늘 권장 16페이지/);
 a.run("openDialog('study-plan','m')");assert.match(a.element('dialog-content').innerHTML,/data-study-form="plan"/);
 a.element('manual-daily-amount').value='5';submit(a,'plan','m');assert.match(a.element('today-list').innerHTML,/직접 정한 오늘 분량 5페이지/);
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
