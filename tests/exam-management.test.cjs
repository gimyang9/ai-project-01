const {test}=require('node:test');const assert=require('node:assert/strict');const E=require('../dist/exam-management.js');
const goal=(id,materialIds,status='active')=>({id,name:id,date:'',status,note:'',materialIds,learningDays:[0,1,2,3,4],focusMode:'auto',focusDate:'',importance:'legacy',continuedMaterialIds:[]});
const setting=(manualStatus='active')=>({manualStatus,autoPausedBy:[]});
const base=()=>({app:'chagok-preview-exams',version:2,priorityGoalId:null,goals:[goal('a',['one','shared','independent','manual']),goal('b',['shared'])],materialSettings:{one:setting(),shared:setting(),independent:setting('active'),manual:setting('paused')}});
const status=(s,id,value,continuedMaterialIds=[])=>E.update(s,{type:'status',id,status:value,continuedMaterialIds});
test('only one priority; switch and release',()=>{let s=E.update(base(),{type:'priority',id:'a'});s=E.update(s,{type:'priority',id:'b'});assert.equal(s.priorityGoalId,'b');s=E.update(s,{type:'priority',id:'b'});assert.equal(s.priorityGoalId,null)});
test('pause selections protect chosen, shared-active and manually paused materials',()=>{const s=status(base(),'a','paused',['independent']);assert.equal(E.materialStatus(s,'one'),'paused');assert.equal(E.materialStatus(s,'shared'),'active');assert.equal(E.materialStatus(s,'independent'),'active');assert.equal(E.materialStatus(s,'manual'),'paused')});
test('both exams paused, restarting either restores shared only',()=>{let s=status(status(base(),'a','paused'),'b','paused');assert.equal(E.materialStatus(s,'shared'),'paused');s=status(s,'b','active');assert.equal(E.materialStatus(s,'shared'),'active');assert.equal(E.materialStatus(s,'one'),'paused');assert.equal(E.materialStatus(s,'manual'),'paused')});
test('manual pause during auto pause stays paused after resume',()=>{let s=status(base(),'a','paused');s=E.update(s,{type:'material-status',id:'one',status:'paused'});s=status(s,'a','active');assert.equal(E.materialStatus(s,'one'),'paused')});
test('archive preserves priority setting without pinning inactive exams or deleting history',()=>{let s=base();s.goals[0].note='memo';s.goals[0].history=[{id:'old'}];s=E.update(s,{type:'priority',id:'a'});s=status(s,'a','archived');assert.equal(s.priorityGoalId,'a');assert.equal(E.orderedGoals(s)[0].id,'b');assert.equal(s.goals[0].note,'memo');assert.deepEqual(s.goals[0].history,[{id:'old'}]);assert.equal(s.goals[0].importance,'legacy');assert.equal(E.materialStatus(s,'one'),'paused')});
test('deleting paused goal releases automatic pause; material settings remain',()=>{const s=E.update(status(base(),'a','paused'),{type:'delete',id:'a'});assert.equal(E.materialStatus(s,'one'),'active');assert.equal(E.materialStatus(s,'manual'),'paused');assert.ok(s.materialSettings.one)});
test('no date, D-Day, today and elapsed exam dates',()=>{assert.equal(E.dayDifference('','2026-10-24'),null);assert.equal(E.dayDifference('2026-10-24','2026-10-24'),0);assert.equal(E.dayDifference('2026-10-25','2026-10-24'),1);assert.equal(E.dayDifference('2026-10-23','2026-10-24'),-1)});
test('edit preserves legacy fields and manual schedule',()=>{let s=base();s.goals[0].focusMode='manual';s.goals[0].focusDate='2026-11-01';s=E.update(s,{type:'upsert',goal:{id:'a',name:'edited',date:'2026-11-20'}});assert.equal(s.goals[0].focusDate,'2026-11-01');assert.equal(s.goals[0].importance,'legacy')});
test('save/read round trip; isolated key',()=>{const map=new Map([['study-progress-data-v1','untouched']]);const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};const s=E.update(base(),{type:'memo',id:'a',note:'<script>ordinary text</script>'});E.save(storage,s);assert.deepEqual(E.load(storage,base()).state,s);assert.equal(map.get('study-progress-data-v1'),'untouched')});
test('corrupt/future store is not overwritten',()=>{for(const raw of ['{bad',JSON.stringify({...base(),version:99})]){const storage={getItem:()=>raw,setItem:()=>assert.fail()};const result=E.load(storage,base());assert.equal(result.writable,false);assert.ok(result.error)}});
test('storage failure throws before caller commits state',()=>{const original=base();const snapshot=JSON.stringify(original);assert.throws(()=>E.save({getItem:()=>null,setItem:()=>{throw Error('quota')}},E.update(original,{type:'priority',id:'a'})));assert.equal(JSON.stringify(original),snapshot)});
test('invalid dates, duplicate ids and manual date missing rejected',()=>{for(const mutate of [s=>s.goals[0].date='2026-02-30',s=>s.goals.push(s.goals[0]),s=>s.goals[0].focusMode='manual']){const s=base();mutate(s);assert.throws(()=>E.validate(s))}});
test('priority orders recommendation without duplicating shared ids',()=>{const s=E.update(base(),{type:'priority',id:'b'});assert.equal(E.orderedGoals(s)[0].id,'b');const ids=[...new Set(E.orderedGoals(s).flatMap(g=>g.materialIds))];assert.equal(ids.filter(id=>id==='shared').length,1)});

const legacy=()=>{const s=base();s.version=1;for(const g of s.goals)delete g.continuedMaterialIds;for(const [id,m] of Object.entries(s.materialSettings))m.independent=id==='independent';return s;};

test('days off round-trip with schedules and memo; invalid and duplicate dates rejected',()=>{
 const s=E.update(base(),{type:'upsert',goal:{id:'a',daysOff:['2026-11-01','2026-11-08']}});
 assert.deepEqual(E.reconcile(s).goals[0].daysOff,['2026-11-01','2026-11-08']);
 for(const daysOff of [['2026-02-30'],[''],['2026-11-01','2026-11-01'],'2026-11-01'])assert.throws(()=>E.update(s,{type:'upsert',goal:{id:'a',daysOff}}));
 assert.equal(s.goals[0].importance,'legacy');
});
test('resit creates separate exam with selected original ids and leaves original archived exam unchanged',()=>{
 let s=status(base(),'a','archived');const original=structuredClone(s.goals[0]);
 s=E.update(s,{type:'resit',id:'a',goal:{...goal('new',['one','manual']),date:'2026-12-01',daysOff:[]}});
 assert.deepEqual(s.goals[0],original);assert.equal(s.goals.at(-1).sourceGoalId,'a');assert.equal(s.goals.at(-1).status,'active');
 assert.equal(E.materialStatus(s,'one'),'active');assert.equal(E.materialStatus(s,'manual'),'paused');
 assert.equal(s.goals[0].materialIds.length,4);assert.deepEqual(s.goals.at(-1).materialIds,['one','manual']);
});
test('resit rejects reused exam id, missing source and material not linked to source',()=>{
 for(const action of [{id:'a',goal:goal('a',['one'])},{id:'missing',goal:goal('new',[])},{id:'a',goal:goal('new',['not-linked'])}])assert.throws(()=>E.update(base(),{type:'resit',...action}));
});
test('new pause defaults keep none, including previously flagged legacy materials',()=>{const s=E.update(E.upgrade(legacy()),{type:'status',id:'a',status:'paused'});assert.equal(E.materialStatus(s,'independent'),'paused');assert.equal('independent' in s.materialSettings.independent,false)});
test('legacy paused/archive states migrated without changing records or current availability',()=>{const raw=legacy();raw.goals[0].status='paused';raw.goals[0].history=[{id:'record',position:20}];const before=JSON.stringify(raw);const s=E.reconcile(raw);assert.equal(s.version,2);assert.equal(E.materialStatus(s,'independent'),'active');assert.equal(E.materialStatus(s,'one'),'paused');assert.deepEqual(s.goals[0].history,raw.goals[0].history);assert.equal(JSON.stringify(raw),before);raw.goals[0].status='archived';assert.equal(E.materialStatus(E.reconcile(raw),'one'),'active')});
test('legacy raw JSON preserved once before first v2 write',()=>{const raw=JSON.stringify(legacy());const map=new Map([[E.KEY,raw],['study-progress-data-v1','original']]);const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};const loaded=E.load(storage,base());assert.equal(map.get(E.KEY),raw);E.save(storage,loaded.state);assert.equal(map.get(E.KEY+'.before-choice-v2'),raw);assert.equal(JSON.parse(map.get(E.KEY)).version,2);assert.equal(map.get('study-progress-data-v1'),'original')});
test('failed preservation write prevents migration overwrite',()=>{const raw=JSON.stringify(legacy());let current=raw;const storage={getItem:k=>k===E.KEY?current:null,setItem:(k,v)=>{if(k!==E.KEY)throw Error('quota');current=v}};assert.throws(()=>E.save(storage,E.upgrade(legacy())));assert.equal(current,raw)});
test('checking manually paused material never resumes it',()=>{let s=status(base(),'a','paused',['manual']);assert.equal(E.materialStatus(s,'manual'),'paused');s=status(s,'a','active');assert.equal(E.materialStatus(s,'manual'),'paused')});
test('choice is per exam; another pause does not erase it',()=>{let s=status(base(),'a','paused',['shared']);s=status(s,'b','paused');assert.equal(E.materialStatus(s,'shared'),'active');s=status(s,'a','active');assert.equal(E.materialStatus(s,'shared'),'active');assert.deepEqual(s.goals[1].continuedMaterialIds,[])});
test('repeated pause/resume starts with fresh selections and no accumulating reasons',()=>{let s=base();for(let i=0;i<3;i++){s=status(s,'a','paused',['one']);assert.equal(E.materialStatus(s,'one'),'active');s=status(s,'a','active');assert.deepEqual(s.goals[0].continuedMaterialIds,[]);s=status(s,'a','paused');assert.equal(E.materialStatus(s,'one'),'paused');assert.deepEqual(s.materialSettings.one.autoPausedBy,['a']);s=status(s,'a','active')}});
test('link changes while paused recompute against current active exams',()=>{let s=status(base(),'a','paused');s=E.update(s,{type:'upsert',goal:{id:'b',materialIds:['shared','one']}});assert.equal(E.materialStatus(s,'one'),'active');s=E.update(s,{type:'upsert',goal:{id:'b',materialIds:[]}});assert.equal(E.materialStatus(s,'one'),'paused')});
test('unlink removes stale selection; reattached material is not silently kept',()=>{let s=status(base(),'a','paused',['one']);s=E.update(s,{type:'upsert',goal:{id:'a',materialIds:['shared']}});assert.deepEqual(s.goals[0].continuedMaterialIds,[]);assert.equal(E.materialStatus(s,'one'),'active');s=E.update(s,{type:'upsert',goal:{id:'a',materialIds:['shared','one']}});assert.equal(E.materialStatus(s,'one'),'paused')});
test('new material linked to inactive exam defaults paused; active exam resumes it',()=>{let s=status(base(),'a','paused');s=E.update(s,{type:'upsert',goal:{id:'a',materialIds:['one','new']}});assert.equal(E.materialStatus(s,'new'),'paused');s=E.update(s,{type:'upsert',goal:{id:'b',materialIds:['new']}});assert.equal(E.materialStatus(s,'new'),'active')});
test('archive supports per-material keep; resume restores automatic states only',()=>{let s=status(base(),'a','archived',['one']);assert.equal(E.materialStatus(s,'one'),'active');assert.equal(E.materialStatus(s,'independent'),'paused');s=status(s,'a','active');assert.equal(E.materialStatus(s,'independent'),'active');assert.equal(E.materialStatus(s,'manual'),'paused')});
test('unlinked exams pause/resume without affecting any material',()=>{let s=base();s.goals.push(goal('empty',[]));const before=JSON.stringify(s.materialSettings);s=status(s,'empty','paused');assert.equal(JSON.stringify(s.materialSettings),before);s=status(s,'empty','active');assert.equal(JSON.stringify(s.materialSettings),before)});
test('unlinked choice is rejected; JSON round trip retains per-exam selections',()=>{assert.throws(()=>status(base(),'a','paused',['missing']));const s=status(base(),'a','paused',['one']);const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};E.save(storage,s);assert.deepEqual(E.load(storage,base()).state,s)});

test('UI list order: active priority, upcoming, past, undated, paused, recent archive; names break ties',()=>{
 const make=(id,date,status='active',name=id)=>({...goal(id,[],status),date,name});
 const s=base();s.goals=[
 make('undated','','active'),make('past-old','2026-09-01'),make('future-far','2026-12-01'),
 make('paused-near','2026-11-01','paused'),make('arch-old','2026-01-01','archived'),
 make('priority','','active'),make('past-near','2026-10-25'),make('future-z','2026-10-28','active','하'),
 make('future-a','2026-10-28','active','가'),make('paused-far','2026-12-01','paused'),
 make('arch-new','2026-10-01','archived'),make('arch-none','','archived')];s.priorityGoalId='priority';
 const raw=JSON.stringify(s);
 assert.deepEqual(E.orderedGoals(s,'2026-10-26').map(g=>g.id),['priority','future-a','future-z','future-far','past-near','past-old','undated','paused-near','paused-far','arch-new','arch-old','arch-none']);
 assert.equal(JSON.stringify(s),raw);
 s.goals.find(g=>g.id==='priority').status='paused';
 assert.equal(E.orderedGoals(s,'2026-10-26')[0].id,'future-a');assert.equal(E.reconcile(s).priorityGoalId,'priority');
});
test('link management changes only relationships and derived reasons, preserving source metadata',()=>{
 let s=base();s.goals[0].note='memo';s.goals[0].history=[{id:'old-event'}];
 const before=structuredClone(s);s=E.update(s,{type:'link-materials',id:'a',materialIds:['shared','manual']});
 assert.deepEqual(s.goals[0].materialIds,['shared','manual']);assert.deepEqual(s.goals[1],before.goals[1]);assert.deepEqual(s.goals[0].history,before.goals[0].history);assert.equal(s.goals[0].note,'memo');assert.equal(s.materialSettings.manual.manualStatus,'paused');
 assert.throws(()=>E.update(s,{type:'link-materials',id:'a',materialIds:['shared','shared']}));
});
