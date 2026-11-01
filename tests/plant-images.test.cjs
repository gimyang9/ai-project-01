const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../dist/study-data.js'),E=require('../dist/exam-management.js');
const base=()=>D.envelope(D.emptyStudy(),D.emptyExams());
const add=(state,id,extra={})=>D.update(state,{type:'material',material:{id,name:id,type:'book',unit:'pages',total:100,...extra}},E);
const raw=(family,current=0)=>({id:'old',name:'Old',total:100,round:1,current,records:[{id:'r',date:'2026-10-01',sequence:0,position:current}],reviews:[],roundHistory:[],growthState:{family,completed:false}});

test('new registration uses all eight species deterministically and backups retain the assignment',()=>{
 let state=base();for(const id of 'abcdefgh')state=add(state,id);
 assert.deepEqual(new Set(state.study.materials.map(m=>m.growthState.family)),new Set(D.plantSpecies));
 const restored=D.restore(D.backup(state,E),base(),E);assert.deepEqual(restored,state);
 let repeated=base();for(const id of 'abcdefgh')repeated=add(repeated,id);
 assert.deepEqual(repeated.study.materials.map(m=>m.growthState),state.study.materials.map(m=>m.growthState));
});

test('colliding IDs use unused species first, then keep counts balanced without reassigning older plants',()=>{
 let state=base();const counts=()=>D.plantSpecies.map(species=>state.study.materials.filter(m=>m.growthState.family===species).length);
 const ids=['a','i','q','y','A','I','Q','Y',...Array.from({length:72},(_,i)=>'extra-'+i)];
 for(const id of ids){const previous=structuredClone(state);state=add(state,id);assert.deepEqual(state.study.materials.slice(0,-1),previous.study.materials);assert.ok(Math.max(...counts())-Math.min(...counts())<=1);}
 assert.equal(new Set(state.study.materials.slice(0,8).map(m=>m.growthState.family)).size,8);
});

test('legacy aliases and archived assignments count as their displayed species; a missing species wins',()=>{
 let state=base();for(const family of D.plantSpecies.filter(s=>s!=='sunflower'))state=add(state,'old-'+family,{growthState:{family,completed:true,ledger:['keep']}});
 const daisy=state.study.materials.find(m=>m.growthState.family==='daisy');daisy.growthState.family='flower';
 const oak=state.study.materials.find(m=>m.growthState.family==='oak');delete oak.growthState;oak.plant='sapling';
 const hydrangea=state.study.materials.find(m=>m.growthState.family==='hydrangea');hydrangea.growthState.family='mushroom';
 state=D.update(state,{type:'archive',id:'old-cactus',archived:true},E);
 const previous=structuredClone(state);state=add(state,'new');assert.equal(state.study.materials.at(-1).growthState.family,'sunflower');assert.deepEqual(state.study.materials.slice(0,-1),previous.study.materials);
});

test('skewed counts select the least-used species; editing and backup restoration never rebalance',()=>{
 let state=base();for(const family of D.plantSpecies)state=add(state,'first-'+family,{growthState:{family,completed:false}});
 for(const family of D.plantSpecies.filter(s=>s!=='cherry'))state=add(state,'second-'+family,{growthState:{family,completed:false}});
 state=add(state,'least');assert.equal(state.study.materials.at(-1).growthState.family,'cherry');
 const original=structuredClone(state);state=add(state,'first-gerbera',{name:'Renamed'});
 assert.deepEqual(state.study.materials.map(m=>m.growthState),original.study.materials.map(m=>m.growthState));
 assert.deepEqual(D.restore(D.backup(state,E),base(),E),state);
});

test('deleting a material makes its unused species available without changing surviving assignments',()=>{
 let state=base();for(const id of 'abcdefgh')state=add(state,id);
 const removed=state.study.materials[0];state=D.update(state,{type:'delete',id:removed.id},E);
 const survivors=structuredClone(state.study.materials);state=add(state,'replacement');
 assert.equal(state.study.materials.at(-1).growthState.family,removed.growthState.family);assert.deepEqual(state.study.materials.slice(0,-1),survivors);
});

test('all forty real images map to the shared card/detail renderer, without sprites or cropping',()=>{
 const source=fs.readFileSync('dist/app.js','utf8'),start=source.indexOf('function plantStage('),end=source.indexOf('function materialCard(',start);
 const render=vm.runInNewContext(source.slice(start,end)+';plantMarkup',{studyAPI:D,escapeHTML:s=>s});
 for(const family of D.plantSpecies)for(const [stage,current] of [0,20,40,80,100].entries()){
  const m=raw(family,current),path=`assets/plants/${family}-${stage+1}.png`;
  assert.equal(D.plantImage(m,stage),path);
  for(const extra of ['', 'detail-plant'])assert.ok(render(m,extra).includes(`background-image:url('${path}')`));
  for(const prefix of ['', 'dist/']){
   const png=fs.readFileSync(prefix+path);assert.equal(png.readUInt32BE(16),384);assert.equal(png.readUInt32BE(20),384);assert.equal(png[25],6,'RGBA transparency');
   assert.deepEqual(png,fs.readFileSync('dist/'+path));
   assert.ok(fs.readFileSync(prefix+'service-worker.js','utf8').includes(path));
  }
 }
 for(const prefix of ['', 'dist/']){
  const css=fs.readFileSync(prefix+'style.css','utf8');assert.doesNotMatch(css,/url\(['"]?assets\/plants(?:-five-stages|-growth-v2)?\.png/);
  assert.match(css,/background-size:contain;background-position:center;background-repeat:no-repeat;clip-path:none/);
 }
});

test('legacy assignments, unassigned hash fallback, originals and unknown collection metadata survive',()=>{
 for(const [family,species] of Object.entries({flower:'daisy',tree:'oak',cactus:'cactus',mushroom:'hydrangea'})){
  let state=add(base(),'old');const m=state.study.materials[0];m.growthState={family,completed:true,collectionLedger:['original']};
  m.note='keep';state.collection={items:['saved-entry']};state.preferences={keep:true};
  const before=JSON.stringify(state),storage=new Map([[D.KEY,before]]),adapter={getItem:k=>storage.get(k),setItem(){throw Error('must not write on load');}};
  const loaded=D.load(adapter,E);assert.equal(loaded.writable,true);assert.equal(storage.get(D.KEY),before);assert.deepEqual(loaded.state,state);
  assert.equal(D.plantImage(D.project(m),4),`assets/plants/${species}-5.png`);
  const next=D.update(state,{type:'note',id:'old',note:'updated'},E);
  assert.deepEqual(next.study.materials[0].growthState,m.growthState);assert.deepEqual(next.collection,state.collection);assert.deepEqual(next.preferences,state.preferences);
  assert.deepEqual(D.restore(D.backup(state,E),base(),E),state);
 }
 const m=raw('tree');delete m.growthState;delete m.plant;
 let hash=0;for(const c of m.id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
 assert.equal(D.growth(m).family,['flower','tree','cactus','mushroom'][hash%4]);
 for(const [plant,family] of Object.entries({seed:'tree',sapling:'tree',sprout:'flower',daisy:'flower'}))assert.equal(D.growth({...m,plant}).family,family);
});

test('learning, partial review, completion, next round, archive and restore preserve plant assignment and originals',()=>{
 let state=add(base(),'history'),family=state.study.materials[0].growthState.family;
 const action=a=>{state=D.update(state,{today:'2026-11-01',...a},E);};
 action({type:'record',id:'history',record:{id:'r',date:'2026-10-01',position:100,understanding:'보통'}});
 const records=structuredClone(state.study.materials[0].records);
 action({type:'review',id:'history',record:{id:'v',date:'2026-10-02',start:1,end:20,understanding:'쉬움'}});
 const reviews=structuredClone(state.study.materials[0].reviews);
 action({type:'next-round',id:'history'});action({type:'archive',id:'history',archived:true});action({type:'archive',id:'history',archived:false});
 const m=state.study.materials[0];assert.equal(m.round,2);assert.deepEqual(m.roundHistory[0].records,records);assert.deepEqual(m.reviews,reviews);
 assert.deepEqual(m.growthState,{family,completed:true});assert.ok(D.plantImage(m,4).endsWith('-5.png'));
 assert.deepEqual(D.restore(D.backup(state,E),base(),E),state);
});
