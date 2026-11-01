const assert=require('node:assert/strict');
const snapshot=p=>p.evaluate('JSON.stringify({state:dataState,local:{...localStorage},session:{...sessionStorage}})');
async function ready(p){await p.wait("typeof commitStudy==='function'&&typeof LearningPlan!=='undefined'&&typeof LearningPlan.preview==='function'");}
async function input(p,value){await p.evaluate(`document.querySelector('#manual-daily-amount').value=${JSON.stringify(value)};document.querySelector('#manual-daily-amount').dispatchEvent(new Event('input',{bubbles:true}));`);}
async function setup(p){await ready(p);await p.evaluate(`(async()=>{for(const [id,name,total] of [['ui-m','긴이름_운영체제기본서_모바일줄바꿈과화면범위확인_학습자료',100],['ui-other','유지할 홈 자료',60]]){if(!await commitStudy({type:'material',material:{id,name,type:'book',unit:'페이지',total,targetDate:LearningPlan.shift(localToday(),9)}},'QA'))throw Error('Synthetic material rejected');}if(!await commitStudy({type:'record',id:'ui-m',record:{id:'ui-r',date:LearningPlan.shift(localToday(),-6),position:20}},'QA'))throw Error('Synthetic record rejected');})()`);}
const cases=[
 {id:'home-preserved',group:'home',async run(p,{width,height,capture}){
  await p.evaluate("dialog.open&&dialog.close();showView('home');renderToday()");const before=await snapshot(p);
  const rows=await p.evaluate("[...document.querySelectorAll('#today-list .today-task')].map(r=>({text:r.textContent,children:[...r.querySelector('.task-copy').children].map(x=>x.tagName),overflow:r.scrollWidth>r.clientWidth}))");
  assert.equal(rows.length,2,'Expected synthetic home rows');for(const r of rows){assert.deepEqual(r.children,['STRONG','B','SMALL']);assert.doesNotMatch(r.text,/예상 완료일|목표 완료일|계획한 학습량 기준/);assert.equal(r.overflow,false);}
  assert.equal(await p.evaluate('document.documentElement.scrollWidth>innerWidth'),false);assert.equal(await snapshot(p),before);
  let screenshot;if(capture){await p.evaluate("(async()=>{await document.fonts.ready;await new Promise(r=>setTimeout(r,250));})()");screenshot=await p.capture(`home-${width}-${height}`);}return {rows:rows.length,unchanged:true,screenshot};
 }},
 {id:'preview-cancel-focus',group:'plan',async run(p,{width,height,capture}){
  await p.evaluate("openDialog('study-plan','ui-m')");const before=await snapshot(p);const texts=[];
  for(const value of ['10','20']){await input(p,value);texts.push(await p.evaluate("document.querySelector('#plan-preview').textContent"));assert.equal(await snapshot(p),before);}assert.notEqual(texts[0],texts[1],'Preview did not react to input');
  await input(p,'0');assert.ok(await p.evaluate("document.querySelector('#plan-preview').textContent.includes('1 이상의 정수')"));await p.evaluate("document.querySelector('[data-study-form=plan]').requestSubmit()");assert.equal(await snapshot(p),before);assert.equal(await p.evaluate('dialog.open'),true);
  await input(p,'20');await p.evaluate("document.querySelector('#manual-daily-amount').focus()");await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await p.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.equal(await p.evaluate('dialog.contains(document.activeElement)'),true,'Focus escaped dialog');
  assert.equal(await p.evaluate('dialog.scrollWidth>dialog.clientWidth'),false);
  let screenshot;if(capture)screenshot=await p.capture(`preview-${width}-${height}`);
  await p.click('#app-dialog [data-close]');await p.wait('!dialog.open');assert.equal(await snapshot(p),before);return {inputReactive:true,cancelUnchanged:true,tabStaysInDialog:true,screenshot};
 }},
 {id:'save-reload-restore',group:'plan',async run(p){
  const originals=await p.evaluate("JSON.stringify({records:dataState.study.materials[0].records,rounds:dataState.study.materials[0].roundHistory,reviews:dataState.study.materials[0].reviews})");
  await p.evaluate("openDialog('study-plan','ui-m')");await input(p,'20');await p.click('[data-study-form=plan] [type=submit]');await p.wait('!dialog.open');assert.equal(await p.evaluate("dataState.study.materials.find(m=>m.id==='ui-m').manualDailyAmount"),20);
  await p.send('Page.reload');await ready(p);assert.equal(await p.evaluate("dataState.study.materials.find(m=>m.id==='ui-m').manualDailyAmount"),20);
  await p.evaluate("openDialog('study-plan','ui-m')");await input(p,'');await p.click('[data-study-form=plan] [type=submit]');await p.wait('!dialog.open');assert.equal(await p.evaluate("dataState.study.materials.find(m=>m.id==='ui-m').manualDailyAmount"),null);
  assert.equal(await p.evaluate("JSON.stringify({records:dataState.study.materials[0].records,rounds:dataState.study.materials[0].roundHistory,reviews:dataState.study.materials[0].reviews})"),originals);return {saved:true,reloaded:true,resetToAutomatic:true,originalHistoryUnchanged:true};
 }},
 {id:'stats-comparison',group:'stats',async run(p,{width,height,capture}){
  await p.evaluate("showView('stats');renderStats('month');document.querySelector('.speed-panel').scrollIntoView({block:'start',behavior:'instant'})");const before=await snapshot(p);
  const text=await p.evaluate("document.querySelector('#stats-forecast').textContent");for(const name of ['현재 속도 예상 완료일','계획상 예상 완료일','목표 완료일'])assert.ok(text.includes(name));assert.equal(await p.evaluate('document.documentElement.scrollWidth>innerWidth'),false);assert.equal(await snapshot(p),before);
  let screenshot;if(capture){await p.evaluate("(async()=>{await document.fonts.ready;await new Promise(r=>setTimeout(r,250));})()");screenshot=await p.capture(`stats-${width}-${height}`);}return {labelsDistinct:true,unchanged:true,screenshot};
 }}
];
module.exports={setup,cases};
