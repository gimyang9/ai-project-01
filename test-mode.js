/* One tab-local test session. Real LocalStorage is never replaced by virtual data. */
(function(root){
'use strict';
const SLOT='chagok-virtual-session-v1',OLD='chagok-dev-context-v1';let active,busy=false,api;
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
function live(){let storage;try{storage=localStorage;}catch{}return {test:false,storage};}
function virtual(state){
 const bank=new Map([[StudyData.KEY,JSON.stringify(StudyData.validate(state,ExamManagement))]]);
 return {test:true,bank,storage:{getItem:k=>bank.get(k)??null,setItem:(k,v)=>{if(k!==StudyData.KEY&&!k.startsWith(StudyData.KEY+'.before-recovery.'))throw Error('테스트 저장 범위를 벗어났어요.');bank.set(k,String(v));}}};
}
function restore(){
 let raw;try{raw=sessionStorage.getItem(SLOT);}catch{return live();}
 if(!raw)return live();
 try{const p=JSON.parse(raw);if(p.version!==1)throw Error();return virtual(p.state);}
 catch{return {test:true,storage:{getItem(){throw Error('테스트 저장값을 읽지 못했어요. 설정에서 OFF로 돌아가 주세요.');},setItem(){throw Error('테스트 저장값을 확인해 주세요.');}}};}
}
active=restore();
function safe(){if(busy||api?.busy()||api?.pending()||document.querySelector('dialog[open] form'))throw Error('작성·저장·복원을 마친 뒤 전환해 주세요.');}
function change(on){
 safe();if(on===active.test)return;
 const next=on?virtual(VirtualStudyData.create(today(),StudyData,ExamManagement,LearningPlan)):live();
 // One atomic session key carries both mode and snapshot. Failure leaves current mode intact.
 if(on)sessionStorage.setItem(SLOT,JSON.stringify({version:1,state:JSON.parse(next.bank.get(StudyData.KEY))}));
 else sessionStorage.removeItem(SLOT);
 active=next;api.activate();update();
}
function commit(write){
 if(busy)throw Object.assign(Error('저장 중이에요.'),{code:'CHAGOK_SAVE_BUSY'});
 const context=active,before=context.test&&context.bank?new Map(context.bank):null;let asynchronous=false;busy=true;
 const finish=value=>{if(context.test){sessionStorage.setItem(SLOT,JSON.stringify({version:1,state:JSON.parse(context.storage.getItem(StudyData.KEY))}));}return value;};
 const fail=e=>{if(before){context.bank.clear();for(const [k,v]of before)context.bank.set(k,v);}throw e;};
 try{const result=write();if(result&&typeof result.then==='function'){asynchronous=true;return result.then(finish).catch(fail).finally(()=>{busy=false;});}return finish(result);}
 catch(e){return fail(e);}finally{if(!asynchronous)busy=false;}
}
function markup(){return '<section class="settings-block test-setting"><div class="test-setting-row"><h3>개발자 테스트</h3><div class="segmented test-switch" role="group" aria-label="개발자 테스트"><button type="button" data-test-mode="off">OFF</button><button type="button" data-test-mode="on">ON</button></div></div><p id="test-mode-status" role="status"></p></section>';}
function update(){
 for(const b of document.querySelectorAll('[data-test-mode]')){const selected=(b.dataset.testMode==='on')===active.test;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));}
 const status=document.getElementById('test-mode-status');if(status)status.textContent=active.test?'가상 테스트 데이터를 사용 중입니다.':'실제 학습 데이터를 사용 중입니다.';
}
const context={
 get storage(){return active.storage;},get locks(){return !active.test&&['http:','https:'].includes(location.protocol)?navigator.locks:undefined;},
 get transactional(){return active.test;},get test(){return active.test;},
 commit,settings:markup,updateSettings:update,
 exportBackup:backup=>active.test?{app:'chagok-dev-backup',fixtureVersion:1,backup}:backup,
 backupName:()=> (active.test?'TEST-':'chagok-backup-')+today()+'.json',
 importBackup:p=>{if(p.app==='chagok-dev-backup'&&active.test){if(p.fixtureVersion!==1)throw Error('지원하지 않는 테스트 백업입니다.');return p.backup;}return p;},
 ready:a=>{api=a;update();}
};
root.AppContext=context;
document.addEventListener('click',e=>{const b=e.target.closest('[data-test-mode]');if(!b)return;try{change(b.dataset.testMode==='on');}catch(error){api.notify(error.message);}});
document.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))update();},true);
// Retire only the explicitly named old developer database, selector and registrations.
try{sessionStorage.removeItem(OLD);}catch{}
try{const q=indexedDB.deleteDatabase('chagok-dev-test-v1');q.onerror=()=>{};q.onblocked=()=>{};}catch{}
if(navigator.serviceWorker?.getRegistrations)navigator.serviceWorker.getRegistrations().then(list=>{const urls=['dev/service-worker.js','dev-dist/dev/service-worker.js'].map(p=>new URL(p,document.baseURI).href);for(const r of list){const worker=r.active||r.waiting||r.installing;if(worker&&urls.includes(worker.scriptURL)){r.unregister();caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('chagok-v2-shell:'+encodeURIComponent(r.scope)+':')).map(k=>caches.delete(k))));}}}).catch(()=>{});
})(window);
