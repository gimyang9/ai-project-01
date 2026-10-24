// Application wiring smoke tests with a minimal DOM adapter, not browser/layout QA.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const D=require('../dist/study-data.js');
function boot(entries={}){
 const map=new Map(Object.entries(entries)),elements=new Map();
 function element(id){if(!elements.has(id))elements.set(id,{id,value:'',textContent:'',innerHTML:'',hidden:false,dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(){},focus(){},querySelector(){return element(id+' child');},querySelectorAll(){return [];},showModal(){this.open=true;},close(){this.open=false;},scrollTop:0});return elements.get(id);}
 const document={getElementById:element,querySelector:element,querySelectorAll:()=>[],addEventListener(){},activeElement:null};
 const context=vm.createContext({document,console,Date,Intl,crypto,location:{hash:''},history:{replaceState(){}},setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},addEventListener(){},scrollTo(){}});
 context.window=context;
 for(const name of ['streak.js','exam-management.js','study-data.js','app.js'])vm.runInContext(fs.readFileSync('dist/'+name,'utf8'),context,{filename:name});
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
