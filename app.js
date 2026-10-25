'use strict';

// Stage 2: persistent study records and exam state share one atomic envelope.
const $ = (id) => document.getElementById(id);
const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const studyAPI=StudyData;
const examAPI=ExamManagement;
let studyLoad;
try {studyLoad=studyAPI.load(window.localStorage,examAPI);}
catch {studyLoad={state:studyAPI.envelope(studyAPI.emptyStudy(),studyAPI.emptyExams()),writable:false,error:'브라우저 저장소를 사용할 수 없어요.'};}
let dataState=studyLoad.state;
let examState=dataState.exams;
let demoMaterials=dataState.study.materials.filter(m=>!m.archived).map(studyAPI.project);
let demoArchivedMaterials=dataState.study.materials.filter(m=>m.archived).map(studyAPI.project);

let pendingRestore=null;
function refreshData(){
  examState=dataState.exams;
  demoMaterials=dataState.study.materials.filter(m=>!m.archived).map(studyAPI.project);
  demoArchivedMaterials=dataState.study.materials.filter(m=>m.archived).map(studyAPI.project);
  $('archive-count').textContent=demoArchivedMaterials.length;
  $('archive-count').setAttribute('aria-label',`보관 자료 ${demoArchivedMaterials.length}개`);
  renderMaterials(materialFilter);renderGoals(goalFilter);renderToday();renderHomeWelcome();renderReviewSummary();renderExamSummary();renderStorageNote();renderStats(statsPeriod);renderCalendar();
}
function renderStorageNote(){
  const note=document.querySelector('.preview-note');
  if(storageConflict){note.textContent=storageConflictMessage;return;}
  note.textContent=studyLoad.writable?'자료·학습 기록·시험은 이 브라우저에 저장됩니다.':studyLoad.error+' 설정에서 백업 파일을 복원할 수 있어요.';
}

const storageConflictMessage='다른 창에서 데이터가 변경되어 저장을 중단했어요. 현재 입력은 유지됩니다. 새로고침하면 미저장 입력이 사라지니 먼저 복사해 주세요.';
let storageConflict=false,saveGuard=null;
try{saveGuard=StorageGuard.create(window.localStorage,studyAPI.KEY,(['https:','http:'].includes(location.protocol)?window.navigator?.locks:undefined));}catch{}
function reportStorageConflict(){
 storageConflict=true;
 $('storage-conflict-notice').textContent=storageConflictMessage;$('storage-conflict-notice').hidden=false;
 renderStorageNote();notify(storageConflictMessage);
}
window.addEventListener('storage',event=>{if(saveGuard?.observe(event))reportStorageConflict();});
function finishCommit(result,onSuccess){
 if(result&&typeof result.then==='function')return result.then(ok=>{if(ok)onSuccess();return ok;});
 if(result)onSuccess();return result;
}
function persistData(next,message,recovery=false){
 if(storageConflict){reportStorageConflict();return false;}
 if(!studyLoad.writable&&!recovery){notify(studyLoad.error);return false;}
 const failure=error=>{
  if(error.code==='CHAGOK_CONFLICT')reportStorageConflict();
  else notify(error.code==='CHAGOK_SAVE_BUSY'?'다른 저장 작업이 진행 중이에요. 잠시 후 다시 저장해 주세요.':error.message||'저장하지 못했어요. 기존 데이터는 유지됩니다.');
  return false;
 };
 try{
  if(!saveGuard)saveGuard=StorageGuard.create(window.localStorage,studyAPI.KEY,(['https:','http:'].includes(location.protocol)?window.navigator?.locks:undefined));
  const result=saveGuard.run(()=>{
   const prepared=recovery?next:ReviewPlan.stabilize(dataState,next,localToday(),studyAPI,examAPI,LearningPlan);
   return recovery&&!studyLoad.writable?studyAPI.recover(window.localStorage,prepared,examAPI):studyAPI.save(window.localStorage,prepared,examAPI);
  });
  const success=saved=>{dataState=saved;studyLoad.writable=true;studyLoad.error=null;refreshData();notify(message);return true;};
  return result&&typeof result.then==='function'?result.then(success,failure):success(result);
 }catch(error){return failure(error);}
}

function commitStudy(action,message){
  if(!studyLoad.writable){notify(studyLoad.error);return false;}
  try{return persistData(studyAPI.update(dataState,action,examAPI),message);}
  catch(error){notify(error.message);return false;}
}
let goalFilter='all';
let materialFilter='all';
const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const ddayLabel=days=>days===null?'':days===0?'D-Day':days>0?`D−${days}`:`D+${Math.abs(days)}`;
const examDateLabel=date=>date?new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).format(new Date(date+'T12:00:00')):'시험일 미정';
function materialExamInfo(m) {
  const goals=examAPI.orderedGoals(examState).filter(g=>g.materialIds.includes(m.id)&&g.status!=='archived');
  const g=goals.find(g=>g.status==='active')||goals[0];
  return {...m,goal:g?.name||'독립 학습',days:g?examAPI.dayDifference(g.date,localToday()):null,due:m.targetDate||'미정'};
}
function commitExam(action,message) {
  if(!studyLoad.writable){notify(studyLoad.error);return false;}
  try{return persistData({...dataState,exams:examAPI.update(examState,action)},message);}
  catch(error){notify(error.message);return false;}
}

let reviewCache=null;
function currentReviews(){
  const today=localToday();
  if(!reviewCache||reviewCache.state!==dataState||reviewCache.today!==today)reviewCache={state:dataState,today,value:ReviewPlan.build(dataState,today,studyAPI,examAPI,LearningPlan)};
  return reviewCache.value;
}
function activeReviewPlans(){return currentReviews().today;}
function renderReviewSummary(){$('review-range-count').textContent=activeReviewPlans().length?`${activeReviewPlans().length}개 범위`:'오늘은 복습이 없어요';}
function reviewFocusText(plan,unit){
  if(!plan)return '';
  if(plan.reason==='no-study')return '현재 회독에서 공부한 범위가 없어 집중 복습을 기다리고 있어요.';
  if(plan.reason==='no-recent-review')return '최근 복습량이 없어 속도를 추정하지 않아요. 하루 복습량을 직접 정할 수 있어요.';
  if(plan.reason==='no-days')return '복습 가능한 날이 없어 시작일을 계산할 수 없어요.';
  if(plan.reason==='invalid-start')return '집중 복습 시작일을 시험 전 날짜로 확인해 주세요.';
  if(!plan.speed.amount)return '복습 속도를 계산할 기록이 없어요.';
  const label=plan.speed.reason==='initial'?'초기 추정':plan.speed.reason==='manual'?'직접 설정':'최근 기록 기준';
  return `${plan.completedAmount&&plan.remaining===0?'기존 집중 범위 완료 · ':''}${plan.repeatRecommendedAmount?'새 복습 '+plan.repeatRecommendedAmount+unit+' · ':''}${label} 하루 ${Math.round(plan.speed.amount*100)/100}${unit} · 시작 ${plan.startDate}${plan.effectiveStart!==plan.startDate?' (오늘부터)':''}${plan.shortfall?' · 시험 전 '+plan.shortfall+unit+' 부족 예상':''}`;
}
function reviewRow(plan,material,upcoming=false){
  const date=plan.dueDate||'';
  const labels=upcoming?['복습 예정']:plan.sources.includes('focus')&&plan.status==='복습 지연'?['복습 지연','시험 전 복습']:[plan.status];
  return `<article class="review-plan-item"><h3>${escapeHTML(material.name)}</h3><p>${plan.start}–${plan.end}${escapeHTML(material.unit)}${date?' · '+escapeHTML(date):''}${plan.manual?' · 직접 지정':''}</p><div class="review-plan-actions">${plan.newTarget?'<span class="badge cream">새 복습 대상</span>':''}${labels.map(label=>`<span class="badge ${label==='복습 지연'?'clay':'sage'}">${label}</span>`).join('')}<button class="text-link" data-dialog="review" data-material="${escapeHTML(material.id)}" data-review-start="${plan.start}" data-review-end="${plan.end}">복습 기록${icon('chevron')}</button><button class="subtle-button" data-dialog="review-date" data-material="${escapeHTML(material.id)}" data-review-start="${plan.start}" data-review-end="${plan.end}" data-review-due="${escapeHTML(date)}">날짜 변경</button></div></article>`;
}
function reviewListMarkup(){
  const snapshot=currentReviews(),today=localToday();
  const rows=snapshot.today.map(plan=>reviewRow(plan,demoMaterials.find(m=>m.id===plan.materialId))).join('');
  const upcoming=snapshot.materials.flatMap(plan=>plan.segments.filter(r=>r.dueDate&&r.dueDate>today).map(r=>({...r,materialId:plan.id}))).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.start-b.start);
  const focus=snapshot.materials.filter(p=>p.focus).map(p=>{const m=demoMaterials.find(m=>m.id===p.id);return `<article class="review-focus-note"><h3>${escapeHTML(m.name)} · 시험 전 복습</h3><p>${escapeHTML(reviewFocusText(p.focus,m.unit))}</p><button class="subtle-button" data-dialog="review-settings" data-material="${escapeHTML(m.id)}">복습 계획</button></article>`;}).join('');
  return (rows||'<p class="dialog-intro">오늘 예정된 복습이 없어요.</p>')+focus+(upcoming.length?`<details class="review-upcoming"><summary>앞으로의 복습 일정</summary>${upcoming.map(p=>reviewRow(p,demoMaterials.find(m=>m.id===p.materialId),true)).join('')}</details>`:'')+'<p class="field-help">추천은 학습 기록을 바탕으로 한 추정이에요. 자료 관리의 복습 계획에서 분량을 직접 정할 수 있어요.</p>';
}

function renderExamSummary(){
  const g=examState.goals.filter(g=>g.status==='active'&&g.date&&examAPI.dayDifference(g.date,localToday())>=0).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const card=document.querySelector('.exam-summary');
  card.innerHTML=`<span class="summary-icon terracotta">${icon('calendar')}</span><span><small>가장 가까운 시험</small><strong>${g?escapeHTML(g.name):'예정된 시험이 없어요'}</strong><span class="summary-sub">${g?examDateLabel(g.date):'시험 날짜를 등록해 보세요'}</span></span>${g?`<b class="d-day">${ddayLabel(examAPI.dayDifference(g.date,localToday()))}</b>`:''}`;
}
let selectedMaterial = demoMaterials[0] || null;
let currentView = 'home';
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let toastTimer;
let dialogReturnFocus;
const dialog = $('app-dialog');

function notify(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3800);
}

function showView(view, focus = false) {
  refreshForDayChange();
  if (!['home','goals','stats','more','detail'].includes(view)) view = 'home';
  if (dialog.open) dialog.close();
  currentView = view;
  if(view==='stats'){renderStats(statsPeriod);renderCalendar();}
  document.querySelectorAll('.view').forEach((section) => section.hidden = section.id !== `view-${view}`);
  document.querySelectorAll('.nav-item').forEach((button) => {
    const active = button.dataset.view === (view === 'detail' ? 'home' : view);
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  if (view !== 'detail' && location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
  window.scrollTo({top:0,behavior:'instant'});
  if (focus) $('main').focus({preventScroll:true});
}

function progressMarkup(percent, label = '현재 진행률') {
  return `<div class="progress-caption"><span>${label}</span><strong>${percent}%</strong></div><div class="progress-track" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><div class="progress-fill" style="width:${percent}%"></div></div>`;
}


function plantClass(material) {
  const growth=studyAPI.growth(material),family=growth.family;
  const ratio = material.total > 0 ? Math.max(0,Math.min(1,material.current/material.total)) : 0;
  const completed = growth.completed;
  const stage = completed ? 4 : ratio <= .1 ? 0 : ratio <= .3 ? 1 : ratio <= .6 ? 2 : 3;
  return `growth-${family} stage-${stage}`;
}
function plantMarkup(material, extra = '') {
  return `<div class="plant-sprite ${plantClass(material)} ${extra}" role="img" aria-label="${escapeHTML(material.name)}의 성장 식물"></div>`;
}

function materialCard(material) {
  material=materialExamInfo(material);
  const status=examAPI.materialStatus(examState,material.id);
  const percent = Math.round(material.current / material.total * 100);
  return `<article class="material-card" data-category="${escapeHTML(material.category)}">
    <div class="material-card-top"><div class="material-meta"><span class="badge sage">${icon(material.typeKey === 'lecture' ? 'screen' : 'book')}${escapeHTML(material.type)}</span><span class="badge cream">${escapeHTML(material.goal)}</span>${status==='paused'?'<span class="badge neutral">일시 중단</span>':material.days!==null ? `<span class="badge clay">${ddayLabel(material.days)}</span>` : '<span class="badge neutral">시험일 미정</span>'}</div><button class="icon-button card-menu" data-dialog="material-menu" data-material="${escapeHTML(material.id)}" aria-label="${escapeHTML(material.name)} 관리">${icon('more')}</button></div>
    <div class="material-main">${plantMarkup(material)}<div class="material-info"><button class="card-title" data-detail="${escapeHTML(material.id)}">${escapeHTML(material.name)}</button><div class="quantity"><b>${material.current}</b><span>/</span><span>${material.total}<span class="material-unit">${escapeHTML(material.unit)}</span></span></div><span class="round-label">${material.round}회독</span></div></div>
    <div class="material-progress">${progressMarkup(percent)}</div>
    <div class="card-primary-actions"><button class="button secondary" data-dialog="record" data-material="${escapeHTML(material.id)}">${icon('edit')}진도 기록</button><button class="button secondary" data-dialog="review" data-material="${escapeHTML(material.id)}">${icon('repeat')}복습</button></div>

  </article>`;
}

function renderMaterials(filter = 'all') {
  materialFilter=filter;
  $('material-count').textContent=demoMaterials.length;
  for(const category of ['all','school','exam']){
    $('material-count-'+category).textContent=demoMaterials.filter(m=>category==='all'||m.category===category).length;
  }
  const items = demoMaterials.filter((item) => filter === 'all' || item.category === filter);
  $('material-grid').innerHTML = items.map(materialCard).join('');
  $('filter-empty').hidden = items.length !== 0;
  $('filter-empty').querySelector('h3').textContent=demoMaterials.length?'이 분류에 해당하는 자료가 없어요':'아직 등록된 자료가 없어요';
  $('filter-empty').querySelector('p').textContent=demoMaterials.length?'다른 분류를 선택해 보세요.':'첫 학습 자료를 추가해 보세요.';
}

function renderHomeWelcome() {
  const today = new Date();
  const time = $('home-date');
  time.dateTime = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  time.textContent = new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(today);
  const dates=dataState.study.materials.flatMap(m=>[...m.records,...m.reviews,...m.roundHistory.flatMap(h=>h.records)]).map(r=>r.date);
  const streak = countStudyStreak(dates, today);
  $('home-streak').textContent = streak.count
    ? `${streak.count}일 연속으로 공부하고 있어요.`
    : '오늘의 첫 학습을 기록해 보세요.';
}

function renderToday() {
  const tasks=currentPlans().filter(p=>p.isActive&&p.remaining>0);
  $('today-list').innerHTML=tasks.map(p=>{
    const m=demoMaterials.find(m=>m.id===p.id);
    const warning=p.noTime||p.manualShortfall>0||p.expectedLate;
    return `<div class="today-task today-task-compact"><span class="task-icon">${icon('book')}</span><span class="task-copy"><strong>${escapeHTML(m.name)}</strong><small class="${warning?'today-plan-warning':''}">남은 ${p.remaining}${escapeHTML(m.unit)} · ${escapeHTML(homePlanLabel(p,m.unit))}</small></span><button class="text-link" data-dialog="record" data-material="${escapeHTML(m.id)}">진도 기록${icon('chevron')}</button></div>`;
  }).join('')||`<p class="field-help">${demoMaterials.length?'오늘 진행할 학습이 없어요.':'학습 자료를 등록하고 공부한 진도를 기록해 보세요.'}</p>`;
}

// Home-only wording. Original calculation and detailed plan labels stay unchanged.
function homePlanLabel(p,unit){
  if(!p.remaining)return '이번 회독 완료';
  if(!p.isActive)return '학습 중단 중';
  let label;
  if(!p.todayAllowed)label='오늘은 쉬는 날';
  else if(p.manualDailyAmount)label=p.amount>0?`오늘 직접 설정 ${p.amount}${unit}`:'오늘 설정한 분량 완료';
  else if(p.noTime)label='학습 가능일 없음';
  else if(p.amount!==null&&Number.isFinite(p.amount))label=`오늘 권장 ${p.amount}${unit}`;
  else label='목표일 미정';
  const warning=p.overdue?'기한 초과':p.noTime?'학습 가능일 없음':p.manualShortfall>0?`기한 내 ${p.manualShortfall}${unit} 부족`:p.expectedLate?'완료 지연 예상':'';
  return warning&&warning!==label?`${label} · ${warning}`:label;
}

function currentPlans(){return LearningPlan.build(dataState,localToday(),studyAPI,examAPI);}
function dailyPlanLabel(p,unit){
  if(!p.remaining)return '이번 회독 완료';
  if(!p.isActive)return '학습 중단 중';
  if(!p.todayAllowed)return '오늘은 쉬는 날';
  if(p.manualDailyAmount)return p.amount?`직접 정한 오늘 분량 ${p.amount}${unit}`:'오늘 정한 분량 완료';
  if(p.noTime)return '학습 가능한 날이 없어요';
  if(p.amount===null)return '목표일을 정하면 권장량을 안내해요';
  return `오늘 권장 ${p.amount}${unit}`;
}
function forecastLabel(p){
  if(!p.isActive)return '학습 재개 후 예상일을 확인해 주세요.';
  const f=p.forecast;
  if(f.reason==='completed')return '이번 회독 완료';
  if(f.reason==='insufficient')return '추정할 기록이 부족해요 (학습 기록 기간 7일 미만)';
  if(f.reason==='no-recent-study')return `최근 ${f.window}일 학습량이 0이라 예상일을 계산하지 않아요.`;
  if(f.reason==='out-of-range')return '예상 완료일이 계산 가능한 범위를 넘어요.';
  return `예상 완료 ${f.date} · 최근 ${f.window}일 평균 기준`;
}
function planWarning(p,unit){
  if(p.noTime)return p.overdue?'목표 기한이 지났어요. 날짜나 학습 가능일을 확인해 주세요.':'기한까지 학습 가능한 날이 없어요.';
  if(p.manualShortfall)return `직접 정한 분량으로는 기한까지 ${p.manualShortfall}${unit} 부족해요.`;
  if(p.expectedLate)return '현재 학습 속도라면 목표 기한보다 늦어질 수 있어요.';
  return '';
}
function planMarkup(p,m,action=true){
  return `<div class="learning-plan"><p><strong>${escapeHTML(dailyPlanLabel(p,m.unit))}</strong></p><p>${escapeHTML(forecastLabel(p))}</p>${p.deadline?`<p>학습 기준일 ${p.deadline} · 남은 학습 가능일 ${p.availableDays}일${p.goalName?` · ${escapeHTML(p.goalName)} 일정`:''}</p>`:'<p>목표일 미정 · 자동 권장량은 기한을 정하면 안내해요.</p>'}${planWarning(p,m.unit)?`<p class="plan-warning">${escapeHTML(planWarning(p,m.unit))}</p>`:''}${action?`<button class="subtle-button" data-dialog="study-plan" data-material="${escapeHTML(m.id)}">학습 계획</button>`:''}</div>`;
}

// Modal-only presentation: use existing derived plan values without changing policy.
function compactPlanStatus(p,unit){
  let primary=dailyPlanLabel(p,unit),secondary='',warning=false;
  if(!p.remaining)return {primary,secondary,warning};
  if(!p.isActive)return {primary,secondary:'재개 후 권장량을 확인해 주세요.',warning};
  const notice=planWarning(p,unit);
  if(notice){secondary=notice;warning=true;}
  else if(!p.deadline){
    if(p.todayAllowed&&!p.manualDailyAmount){primary='목표일 미정';secondary='목표일을 정하면 자동 추천을 안내해요.';}
    else secondary='목표일 미정';
  }else if(p.forecast.reason==='insufficient')secondary='예상일을 추정할 기록이 부족해요.';
  else if(p.forecast.reason==='no-recent-study')secondary='최근 학습량이 없어 예상일을 안내하지 않아요.';
  else if(p.forecast.reason==='out-of-range')secondary='예상 완료일을 계산할 수 있는 범위를 넘었어요.';
  else if(p.forecast.reason==='estimated')secondary=`예상 완료 ${p.forecast.date}`;
  return {primary,secondary,warning};
}

function renderGoals(filter = 'all') {
  const plans=currentPlans();
  goalFilter=filter;
  const goals=examAPI.orderedGoals(examState).filter(g=>filter==='all'||g.status===(filter==='done'?'archived':filter));
  document.querySelectorAll('[data-goal-filter]').forEach(button=>{
    const type=button.dataset.goalFilter;
    const count=examState.goals.filter(g=>type==='all'||g.status===(type==='done'?'archived':type)).length;
    button.querySelector('span').textContent=count;
  });
  $('goal-grid').innerHTML=goals.map(g=>{
    const linked=g.materialIds.map(id=>demoMaterials.find(m=>m.id===id)).filter(Boolean);
    const progress=linked.length?Math.round(linked.reduce((sum,m)=>sum+m.current/m.total,0)/linked.length*100):0;
    const days=examAPI.dayDifference(g.date,localToday());
    return `<article class="goal-card ${g.status==='paused'?'paused':''}"><div class="goal-top"><span class="goal-symbol">${icon(['notes','target','book'].includes(g.icon)?g.icon:'target')}</span><div class="goal-status">${g.id===examState.priorityGoalId?'<span class="badge sage">우선 시험</span>':''}${g.status==='paused'?'<span class="badge neutral">일시 중단</span>':g.status==='archived'?'<span class="badge neutral">보관</span>':''}<button class="icon-button exam-menu-button" data-exam-dialog="menu" data-goal="${escapeHTML(g.id)}" aria-label="${escapeHTML(g.name)} 관리">${icon('more')}</button></div></div><h2>${escapeHTML(g.name)}</h2><p class="goal-date">${icon('calendar')}${examDateLabel(g.date)}${days===null?'':`<b>${ddayLabel(days)}</b>`}</p><div>${progressMarkup(progress,'연결 자료 진행률')}</div><button class="linked-toggle" data-linked="${escapeHTML(g.id)}" aria-expanded="false" aria-controls="linked-${escapeHTML(g.id)}">연결된 자료 ${linked.length}개${icon('chevron')}</button><ul class="linked-materials" id="linked-${escapeHTML(g.id)}" hidden>${linked.map(m=>{const p=plans.find(p=>p.id===m.id);return `<li><strong>${escapeHTML(m.name)}</strong>${g.status==='active'&&p?planMarkup(p,m):''}</li>`;}).join('')}</ul></article>`;
  }).join('');
  $('goal-empty').hidden=goals.length!==0;
  $('goal-empty').querySelector('h3').textContent=filter==='all'?'등록된 시험이 없어요':filter==='done'?'보관한 시험이 없어요':filter==='paused'?'일시 중단한 시험이 없어요':'진행 중인 시험이 없어요';
  $('goal-empty').querySelector('p').textContent='시험 추가 버튼에서 시험을 등록할 수 있어요.';
}


let statsPeriod='week',statsGroup='exam';
const statsColors=['#627c50','#c3a35b','#b98067','#8c9e79','#a39bba','#7ba09c','#ba9079','#8b9155'];
function renderStats(period='week'){
  statsPeriod=period;
  const today=localToday(),data=StudyStats.summarize(dataState,today,period,studyAPI,LearningPlan);
  $('stats-summary').innerHTML=[['학습 기록',data.study,'건'],['복습 기록',data.review,'건'],['기록한 날',data.days,'일']].map(([label,value,unit])=>`<div class="stat-tile"><small>${label}</small><strong>${value}<span>${unit}</span></strong></div>`).join('');
  $('chart-period').textContent=data.start+' – '+data.end;
  const max=Math.max(1,...data.bins.flatMap(b=>[b.study,b.review]))*1.2;
  $('bar-chart').innerHTML=data.bins.map(b=>`<div class="bar-column"><div class="bar-pair"><div class="bar${b.study?'':' empty'}" style="height:${b.study/max*100}%" title="학습 ${b.study}건"></div><div class="bar review${b.review?'':' empty'}" style="height:${b.review/max*100}%" title="복습 ${b.review}건"></div></div><small>${b.label}</small></div>`).join('');
  $('bar-chart').setAttribute('aria-label',data.bins.map(b=>`${b.label}: 학습 ${b.study}건, 복습 ${b.review}건`).join(', '));
  const shares=statsGroup==='exam'?data.exams:data.materials;let position=0;
  const gradient=shares.map((g,i)=>{const start=position;position+=g.percent;return `${statsColors[i%statsColors.length]} ${start}% ${position}%`;}).join(',');
  $('stats-donut').style.background=shares.length?`conic-gradient(${gradient})`:'#ebe4d5';
  $('stats-donut').setAttribute('aria-label',shares.length?shares.map(g=>g.name+' '+Math.round(g.percent*10)/10+'%').join(', '):'이 기간의 학습 기록이 없어요.');
  $('stats-group-count').textContent=shares.length;
  $('stats-group-label').textContent=statsGroup==='exam'?'시험 / 독립':'자료';
  $('stats-proportions').innerHTML=shares.map((g,i)=>`<li><i class="legend-dot" style="background:${statsColors[i%statsColors.length]}"></i><span>${escapeHTML(g.name)}</span><b>${Math.round(g.percent*10)/10}%</b></li>`).join('')||'<li>이 기간의 학습 기록이 없어요.</li>';
  const week=StudyStats.summarize(dataState,today,'week',studyAPI,LearningPlan);
  const volume=kind=>week.units.filter(g=>g.kind===kind).map(g=>g.amount+escapeHTML(g.unit)).join(' · ');
  $('weekly-summary').innerHTML=`<p>${week.start} – ${today}</p><strong>이번 주 ${week.days}일 기록했어요.</strong><p>학습 ${week.study}건 · 복습 ${week.review}건</p>${volume('study')?'<p>학습량 '+volume('study')+'</p>':''}${volume('review')?'<p>복습량 '+volume('review')+'</p>':''}`;
  const plans=currentPlans();
  $('stats-forecast').innerHTML=plans.map(p=>{const m=demoMaterials.find(m=>m.id===p.id),f=p.forecast;return `<article class="stats-forecast-item"><h3>${escapeHTML(m.name)}</h3><p>${p.isActive&&f.reason==='estimated'&&f.window&&f.speed!==null?`최근 ${f.window}일 평균 ${Math.round(f.speed*100)/100}${escapeHTML(m.unit)}/일 · `:''}${escapeHTML(f.reason==='estimated'&&p.isActive?'예상 완료 '+f.date:forecastLabel(p))}</p></article>`;}).join('')||'<p class="field-help">자료와 학습 기록을 등록하면 속도를 확인할 수 있어요.</p>';
}
function calendarData(){return StudyStats.calendar(dataState,localToday(),studyAPI,currentReviews());}
function renderCalendar(){
  const first=`${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}-01`,today=localToday(),dates=calendarData();
  $('calendar-title').textContent=`${calendarYear}년 ${calendarMonth+1}월`;
  const offset=new Date(first+'T12:00:00').getDay(),count=new Date(calendarYear,calendarMonth+1,0).getDate();
  $('calendar-grid').innerHTML='<span class="blank" aria-hidden="true"></span>'.repeat(offset)+Array.from({length:count},(_,i)=>{
    const day=i+1,date=first.slice(0,8)+String(day).padStart(2,'0'),entry=dates[date],done=entry?.records.length||0,scheduled=entry?.scheduled.length||0,focus=entry?.focus.length||0;
    return `<button class="${done?'level-'+Math.min(3,done):''} ${date===today?'today':''}" data-day="${day}" aria-label="${date}, 완료 기록 ${done}건, 예정 범위 ${scheduled}개, 집중 복습 시작 ${focus}개" ${date===today?'aria-current="date"':''}>${day}<span class="calendar-marks" aria-hidden="true">${scheduled?'<i class="calendar-scheduled '+(date<today?'overdue':'')+'"></i>':''}${focus?'<i class="calendar-focus"></i>':''}</span></button>`;
  }).join('');
}
function showCalendarDay(date){
  const entry=calendarData()[date]||{records:[],scheduled:[],focus:[]},material=id=>dataState.study.materials.find(m=>m.id===id);
  const records=entry.records.map(r=>`<article class="review-plan-item"><h3>${escapeHTML(r.name)}</h3><p>${r.kind==='study'?'학습':'복습'} · ${r.start}–${r.end}${escapeHTML(r.unit)}${r.kind==='study'?' · '+r.round+'회독':''}</p>${r.understanding?'<span class="badge sage">'+escapeHTML(r.understanding)+'</span>':''}</article>`).join('')||'<p class="field-help">이날 완료한 기록이 없어요.</p>';
  const upcoming=entry.scheduled.map(p=>{const m=material(p.materialId);return `<article class="review-plan-item"><h3>${escapeHTML(m.name)}</h3><p>${p.start}–${p.end}${escapeHTML(m.unit)} · ${date<localToday()?'복습 지연':'복습 예정'}${p.manual?' · 직접 지정':''}</p><button class="text-link" data-dialog="review" data-material="${escapeHTML(m.id)}" data-review-start="${p.start}" data-review-end="${p.end}">복습 기록${icon('chevron')}</button></article>`;}).join('');
  const focus=entry.focus.map(p=>`<article class="review-plan-item"><h3>${escapeHTML(material(p.materialId).name)}</h3><p>시험 전 집중 복습 시작 · ${escapeHTML(p.goalName)}</p></article>`).join('');
  presentExamDialog(date+' 기록과 일정','<h3 class="calendar-section-title">완료 기록</h3>'+records+(upcoming?'<h3 class="calendar-section-title">현재 복습 일정</h3>'+upcoming:'')+focus);
}

function openDetail(id) {
  if(!demoMaterials.some(m=>m.id===id))return;
  selectedMaterial = materialExamInfo(demoMaterials.find((item) => item.id === id) || demoMaterials[0]);
  const m = selectedMaterial;
  $('view-detail').innerHTML = `<div class="detail-page-top"><button class="icon-button" data-view="home" aria-label="학습 자료 목록으로 돌아가기">${icon('back')}</button><h1 id="detail-heading">${escapeHTML(m.name)}</h1><button class="icon-button" data-dialog="material-menu" data-material="${escapeHTML(m.id)}" aria-label="자료 관리 메뉴">${icon('more')}</button></div><div class="detail-grid"><section class="panel detail-summary">${plantMarkup(m,'detail-plant')}<div class="material-meta"><span class="badge sage">${m.type}</span><span class="badge cream">${escapeHTML(m.goal)}</span>${m.days!==null ? `<span class="badge clay">${ddayLabel(m.days)}</span>` : ''}</div><div class="quantity"><b>${m.current}</b><span>/</span><span>${m.total}<span class="material-unit">${escapeHTML(m.unit)}</span></span></div><span class="round-label">${m.round}회독</span><div class="material-progress">${progressMarkup(Math.round(m.current/m.total*100))}</div><div class="card-primary-actions"><button class="button primary" data-dialog="record" data-material="${escapeHTML(m.id)}">${icon('edit')}진도 기록</button><button class="button secondary" data-dialog="review" data-material="${escapeHTML(m.id)}">${icon('repeat')}복습</button></div><div class="card-secondary-actions"><button class="subtle-button" data-dialog="memo" data-material="${escapeHTML(m.id)}">메모</button><button class="subtle-button" data-dialog="material" data-material="${escapeHTML(m.id)}" data-edit>수정</button></div></section><section class="panel"><div class="segmented detail-tabs" aria-label="자료 상세 보기"><button class="active" data-detail-tab="study" aria-pressed="true">학습 기록</button><button data-detail-tab="review" aria-pressed="false">복습 기록</button><button data-detail-tab="basic" aria-pressed="false">기본 정보</button></div><div id="detail-tab-content"></div></section></div>`;
  renderDetailTab('study');
  showView('detail',true);
}

function renderDetailTab(tab) {
  const m = selectedMaterial;
  if (tab === 'basic') {
    const plan=currentPlans().find(p=>p.id===m.id);
    $('detail-tab-content').innerHTML = `<ul class="basic-list">${[['자료 이름',m.name],['학습 유형',m.type],['전체 분량',`${m.total} ${escapeHTML(m.unit)}`],['현재 회독',`${m.round}회독`],['연결 시험',m.goal],['목표 완료일',m.due]].map(([label,value])=>`<li><span>${label}</span><strong>${escapeHTML(value)}</strong></li>`).join('')}</ul>${plan?planMarkup(plan,m):''}`;
  } else {
    const source=dataState.study.materials.find(item=>item.id===m.id);
    const review=tab==='review';
    const rows=review?studyAPI.sorted(source.reviews):studyAPI.calculate(source.records,source.total);
    const row=(r,unit,editable=true)=>`<article class="record-row"><div class="record-row-top"><time>${escapeHTML(r.date)}</time>${editable?`<button class="subtle-button" data-edit-entry="${review?'review':'record'}" data-record="${escapeHTML(r.id)}" data-material="${escapeHTML(m.id)}">수정</button><button class="subtle-button" data-delete-entry="${review?'review':'record'}" data-record="${escapeHTML(r.id)}" data-material="${escapeHTML(m.id)}">삭제</button>`:''}</div><div class="record-row-data">${review?`<span>${r.start}–${r.end}${escapeHTML(r.unit)}</span>`:`<span><small>학습량</small><strong>+${r.amount}${escapeHTML(unit)}</strong></span><span><small>현재 위치</small>${r.position}${escapeHTML(unit)}</span>`}</div>${r.understanding?`<span class="badge sage">${escapeHTML(r.understanding)}</span>`:''}</article>`;
    $('detail-tab-content').innerHTML=rows.slice().reverse().map(r=>row(r,m.unit)).join('')||'<p class="field-help">기록이 없어요.</p>';
    if(!review)$('detail-tab-content').innerHTML+=source.roundHistory.slice().reverse().map(h=>`<h3>${h.round}회독 · ${escapeHTML(h.completedDate)}</h3>${studyAPI.calculate(h.records,h.total).reverse().map(r=>row(r,h.unit,false)).join('')}`).join('');
  }
}

function dialogFooter(action = '기록', danger = false) {
  return `<div class="dialog-actions"><button class="button cream" type="button" data-close>취소</button><button class="button ${danger ? 'cream' : 'primary'}" type="submit">${action}</button></div>`;
}

function understanding() {
  return `<div class="form-field"><span class="field-label">이해도<small>(선택사항)</small></span><div class="choice-row" data-choice-group="understanding"><button class="choice-button" type="button" aria-pressed="false">쉬움</button><button class="choice-button" type="button" aria-pressed="false">보통</button><button class="choice-button" type="button" aria-pressed="false">어려움</button></div></div>`;
}

function openDialog(type, materialId, editing = false) {
  const m = demoMaterials.find((item)=>item.id===materialId) || selectedMaterial || {id:'',name:'',note:'',typeKey:'book',unit:'페이지',total:1};
  selectedMaterial = m;
  let title = '';
  let content = '';
  if(type==='goal') return openExamDialog('edit');
  if (type === 'next-round') {
    title='다음 회독을 시작할까요?';content=`<p class="dialog-intro">이전 회독의 날짜·단위·기록은 그대로 보관하고 새 회독의 진도를 0부터 시작해요.</p><form data-study-form="next-round" data-material="${escapeHTML(m.id)}">${dialogFooter('다음 회독 시작')}</form>`;
  } else if (type === 'study-plan') {
    const p=currentPlans().find(p=>p.id===m.id);if(!p)return;
    const status=compactPlanStatus(p,m.unit);
    title='학습 계획';
    content=`<p class="dialog-material-name">${escapeHTML(m.name)}</p><div class="plan-status"><p><strong>${escapeHTML(status.primary)}</strong></p>${status.secondary?`<p class="${status.warning?'plan-status-warning':''}">${escapeHTML(status.secondary)}</p>`:''}</div><form data-study-form="plan" data-material="${escapeHTML(m.id)}"><div class="form-field"><label for="manual-daily-amount">하루 학습량 <small>(선택사항)</small></label><div class="plan-amount"><input id="manual-daily-amount" type="number" min="1" step="1" inputmode="numeric" value="${m.manualDailyAmount||''}"><span>${escapeHTML(m.unit)}</span></div><p class="field-help">비워 두면 자동 추천을 사용해요.</p></div>${dialogFooter('저장')}</form>`;
  } else if (type === 'record') {
    title = '진도 기록';
    content = `<p class="dialog-material-name">${escapeHTML(m.name)}</p><form data-study-form="record" data-material="${escapeHTML(m.id)}"><div class="form-field"><label for="study-date">공부 날짜</label><input id="study-date" type="date" value="${localToday()}" max="${localToday()}" required></div><div class="form-field"><label for="study-position">현재 위치</label><div class="input-unit"><input id="study-position" type="number" min="0" max="${m.total}" step="1" inputmode="numeric" required><span>/ ${m.total} ${escapeHTML(m.unit)}</span></div><p class="field-help">이전 위치 ${m.current}${escapeHTML(m.unit)} · 공부량은 이전 기록과 비교해 계산해요.</p></div>${understanding()}${dialogFooter()}</form>`;
  } else if (type === 'review') {
    title = '복습 기록';
    content = `<p class="dialog-material-name">${escapeHTML(m.name)}</p><form data-study-form="review" data-material="${escapeHTML(m.id)}"><div class="form-field"><label for="review-date">복습 날짜</label><input id="review-date" type="date" value="${localToday()}" max="${localToday()}" required></div><div class="form-row"><div class="form-field"><label for="review-from">시작 위치</label><div class="input-unit"><input id="review-from" type="number" min="1" max="${m.total}" inputmode="numeric" required><span>${escapeHTML(m.unit)}</span></div></div><div class="form-field"><label for="review-to">끝 위치</label><div class="input-unit"><input id="review-to" type="number" min="1" max="${m.total}" inputmode="numeric" required><span>${escapeHTML(m.unit)}</span></div></div></div>${understanding()}<p class="field-help">복습 기록은 전체 진도와 회독을 바꾸지 않아요.</p>${dialogFooter()}</form>`;
  } else if (type === 'material') {
    title = editing ? '학습 자료 수정' : '학습 자료 추가';
    content = `<form data-study-form="material" data-material="${editing?escapeHTML(m.id):''}"><div class="form-field"><label for="material-name">자료 이름</label><input id="material-name" maxlength="100" ${editing ? `value="${escapeHTML(m.name)}"` : 'placeholder="예: 컴퓨터 네트워크"'} required></div><div class="form-field"><label for="material-type">학습 유형</label><select id="material-type" required>${[['book','교재'],['workbook','문제집'],['lecture','인터넷 강의'],['vocabulary','단어 학습'],['other','기타']].map(([key,label])=>`<option value="${key}" ${key===(editing?m.typeKey:'book')?'selected':''}>${label}</option>`).join('')}</select></div><div class="form-field" id="unit-picker-field"><label for="material-unit">학습 단위</label><select id="material-unit"></select></div><div class="form-field" id="custom-unit-field" hidden><label for="custom-unit">학습 단위</label><input id="custom-unit" maxlength="20" placeholder="예: 세트"></div><div class="form-field"><label for="material-total">전체 학습 분량</label><div class="input-unit"><input id="material-total" type="number" min="1" step="1" inputmode="numeric" ${editing ? `value="${m.total}"` : 'placeholder="예: 300"'} required><span id="total-unit">${editing ? m.unit : '페이지'}</span></div></div><div class="form-field"><span class="field-label">연결할 시험 <small>(선택사항)</small></span><div class="checkbox-list">${examState.goals.map((g)=>`<label><input type="checkbox" name="material-goal" value="${escapeHTML(g.id)}" ${editing&&g.materialIds.includes(m.id)?'checked':''}>${escapeHTML(g.name)}</label>`).join('')}</div><p class="field-help">연결하지 않으면 독립 자료로 관리해요. 여러 시험에 연결할 수 있어요.</p></div><div class="form-field"><label for="material-due">목표 완료일 <small>(선택사항)</small></label><input id="material-due" type="date" value="${editing?escapeHTML(m.targetDate||''):''}"></div><p class="field-help">식물은 학습 진도에 맞춰 표시해요.</p>${dialogFooter(editing?'저장':'추가')}</form>`;
  } else if (type === 'memo') {
    title = '메모';
    content = `<p class="dialog-material-name">${escapeHTML(m.name)}</p><form data-study-form="memo" data-material="${escapeHTML(m.id)}"><div class="form-field"><label for="material-note">학습 메모 <small>(선택사항)</small></label><textarea id="material-note" rows="6" placeholder="필요할 때 꺼내 볼 메모를 남겨요.">${escapeHTML(m.note)}</textarea></div>${dialogFooter('저장')}</form>`;
  } else if (type === 'review-plan') {
    title='오늘의 복습';content=reviewListMarkup();
  } else if(type==='review-settings'){
    title='복습 계획';
    const source=dataState.study.materials.find(item=>item.id===m.id),plan=currentReviews().materials.find(p=>p.id===m.id);
    content=`<p class="dialog-material-name">${escapeHTML(m.name)}</p>${plan?.focus?`<div class="plan-status"><p>${escapeHTML(reviewFocusText(plan.focus,m.unit))}</p></div>`:''}<form data-study-form="review-settings" data-material="${escapeHTML(m.id)}"><div class="form-field"><label for="manual-review-amount">하루 복습량 <small>(선택사항)</small></label><div class="review-amount"><input id="manual-review-amount" type="number" min="1" step="1" inputmode="numeric" value="${source.reviewSettings?.dailyAmount||''}"><span>${escapeHTML(m.unit)}</span></div><p class="field-help">비워 두면 기록에 따른 자동 추정을 사용해요.</p></div>${dialogFooter('저장')}</form><button class="subtle-button" data-dialog="review-date" data-material="${escapeHTML(m.id)}">범위별 복습 날짜 정하기</button><p class="field-help">집중 복습 시작일은 연결 시험 수정에서 직접 정할 수 있어요.</p>`;
  } else if(type==='review-date'){
    title='복습 날짜 변경';
    content=`<p class="dialog-material-name">${escapeHTML(m.name)}</p><form data-study-form="review-date" data-material="${escapeHTML(m.id)}"><div class="form-row"><div class="form-field"><label for="review-schedule-start">시작 위치</label><input id="review-schedule-start" type="number" min="1" max="${m.total}" step="1" inputmode="numeric" required></div><div class="form-field"><label for="review-schedule-end">끝 위치</label><input id="review-schedule-end" type="number" min="1" max="${m.total}" step="1" inputmode="numeric" required></div></div><div class="form-field"><label for="review-schedule-date">복습 날짜 <small>(선택사항)</small></label><input id="review-schedule-date" type="date"><p class="field-help">비워 두면 이 범위의 자동 복습 날짜로 돌아가요.</p></div>${dialogFooter('저장')}</form>`;
  } else if (type === 'settings') {
    title = '설정';
    content = `<section class="settings-block"><h3>학습 데이터 백업</h3><button class="button secondary" data-backup>백업 파일 저장</button></section><section class="settings-block"><h3>학습 데이터 복원</h3><input id="restore-file" type="file" accept="application/json,.json" hidden><button class="button secondary" data-restore>백업 파일 선택</button></section><button class="reset-button" data-dialog="reset">초기화</button>`;
  } else if (type === 'reset') {
    title = '학습 데이터를 초기화할까요?';
    content = `<p class="dialog-intro">2.0 학습 자료·기록·메모·시험을 모두 초기화합니다. 필요한 데이터는 먼저 백업해 주세요. 보존된 1.0 원본 저장값은 유지됩니다.${studyLoad.writable?'':' 읽지 못한 저장값은 별도 보존한 뒤 초기화합니다.'}</p><form data-study-form="reset">${dialogFooter('초기화',true)}</form>`;
  } else if (type === 'delete-material') {
    title = '자료를 삭제할까요?';
    content = `<p class="dialog-intro">‘${escapeHTML(m.name)}’ 자료와 연결된 기록이 삭제됩니다.</p><form data-study-form="delete" data-material="${escapeHTML(m.id)}">${dialogFooter('삭제',true)}</form>`;
  } else if (type === 'material-menu') {
    title = '학습 자료 관리';
    content = `<div class="more-list"><button data-dialog="study-plan" data-material="${escapeHTML(m.id)}">${icon('calendar')}<span>학습 계획</span></button><button data-dialog="review-settings" data-material="${escapeHTML(m.id)}">${icon('repeat')}<span>복습 계획</span></button><button data-dialog="memo" data-material="${escapeHTML(m.id)}">${icon('notes')}<span>메모</span></button><button data-dialog="material" data-material="${escapeHTML(m.id)}" data-edit>${icon('edit')}<span>자료 수정</span></button>${m.current===m.total?`<button data-dialog="next-round" data-material="${escapeHTML(m.id)}">${icon('repeat')}<span>다음 회독 시작</span></button>`:''}<button data-archive-material="${escapeHTML(m.id)}">${icon('archive')}<span>학습 완료 및 보관</span></button><button data-material-status="${examState.materialSettings[m.id].manualStatus==='paused'?'active':'paused'}" data-material="${escapeHTML(m.id)}">${icon('repeat')}<span>${examState.materialSettings[m.id].manualStatus==='paused'?'다시 시작하기':'학습 일시 중단'}</span></button><button class="muted-danger" data-dialog="delete-material" data-material="${escapeHTML(m.id)}">${icon('trash')}<span>자료 삭제</span></button></div>`;
  } else if (type === 'archive') {
    title = '보관한 학습 자료';
    content = demoArchivedMaterials.map(material => `<div class="material-main">${plantMarkup(material)}<div><h3>${escapeHTML(material.name)}</h3><p class="field-help">${material.round}회독 완료 · 보관 중</p><button class="text-link" data-unarchive-material="${escapeHTML(material.id)}">다시 꺼내기${icon('chevron')}</button></div></div>`).join('') || '<p class="field-help">보관한 자료가 없어요.</p>';
  }
  if (!title) return;
  dialog.classList.remove('exam-choice-dialog','exam-pause-dialog');
  dialog.classList.toggle('study-plan-dialog',type==='study-plan');
  const alreadyOpen = dialog.open;
  if (!alreadyOpen) dialogReturnFocus = document.activeElement;
  $('dialog-title').textContent = title;
  $('dialog-content').innerHTML = content;
  if (type === 'material') {
    updateMaterialType(editing ? m.typeKey : 'book',editing ? m.unit : '페이지');
    if (editing && m.typeKey === 'other') {$('custom-unit').value=m.unit;$('total-unit').textContent=m.unit;}
  }
  if (!alreadyOpen) dialog.showModal();
  dialog.scrollTop = 0;
  // Keep the mobile keyboard closed until the user taps an input.
  dialog.querySelector('[data-close]').focus({preventScroll:true});
}

function presentExamDialog(title,content) {
  dialog.classList.remove('study-plan-dialog');
  if(!dialog.open)dialogReturnFocus=document.activeElement;
  dialog.classList.toggle('exam-choice-dialog',content.includes('data-exam-choices'));
  dialog.classList.toggle('exam-pause-dialog',content.includes('data-pause-layout'));
  $('dialog-title').textContent=title;
  $('dialog-content').innerHTML=content;
  if(!dialog.open)dialog.showModal();
  dialog.scrollTop=0;
  dialog.querySelector('[data-close]').focus({preventScroll:true});
}
function openExamDialog(type,id,status) {
  const g=examState.goals.find(g=>g.id===id);
  if(type!=='edit'&&!g)return;
  const safeId=g?escapeHTML(g.id):'';
  if(type==='menu') {
    presentExamDialog('시험 관리',`<p class="dialog-material-name">${escapeHTML(g.name)}</p><div class="more-list"><button data-exam-dialog="memo" data-goal="${safeId}">${icon('notes')}<span>메모</span></button><button data-exam-dialog="edit" data-goal="${safeId}">${icon('edit')}<span>시험 수정</span></button>${g.status==='active'?`<button data-exam-priority="${safeId}">${icon('target')}<span>${examState.priorityGoalId===g.id?'우선 시험 해제':'우선 시험 지정'}</span></button>`:''}<button data-exam-dialog="status" data-goal="${safeId}" data-status="${g.status==='archived'?'active':'archived'}">${icon('archive')}<span>${g.status==='archived'?'보관 해제하고 다시 시작하기':'시험 완료 및 보관'}</span></button>${g.status!=='archived'?`<button data-exam-dialog="status" data-goal="${safeId}" data-status="${g.status==='paused'?'active':'paused'}">${icon('repeat')}<span>${g.status==='paused'?'다시 시작하기':'학습 일시 중단'}</span></button>`:''}<button data-exam-dialog="resit" data-goal="${safeId}">${icon('repeat')}<span>다시 준비하기</span></button><button class="muted-danger" data-exam-dialog="delete" data-goal="${safeId}">${icon('trash')}<span>시험 삭제</span></button></div>`);
  }else if(type==='memo') {
    presentExamDialog('시험 메모',`<p class="dialog-material-name">${escapeHTML(g.name)}</p><form data-exam-form="memo" data-goal="${safeId}"><div class="form-field"><label for="exam-note">메모 <small>(선택사항)</small></label><textarea id="exam-note" rows="6">${escapeHTML(g.note)}</textarea></div>${dialogFooter('저장')}</form>`);
  }else if(type==='edit'||type==='resit') {
    const draft=type==='resit'?{...g,name:g.name+' · 재응시',date:'',daysOff:[],focusMode:'auto',focusDate:''}:g||{name:'',date:'',materialIds:[],learningDays:[0,1,2,3,4,5],daysOff:[],focusMode:'auto',focusDate:''};
    presentExamDialog(type==='resit'?'다시 준비하기':g?'시험 수정':'시험 추가',`<form data-exam-form="${type==='resit'?'resit':'edit'}" data-goal="${safeId}">${type==='resit'?'<p class="field-help">선택한 기존 자료와 기록을 함께 사용합니다. 원래 시험과 자료의 직접 중단·보관 상태는 유지해요.</p>':''}<div class="form-field"><label for="goal-name">시험 이름</label><input id="goal-name" value="${escapeHTML(draft.name)}" maxlength="100" placeholder="예: 정보처리기사 필기" required></div><div class="form-field"><label for="goal-date">시험 날짜 <small>(선택사항)</small></label><input id="goal-date" type="date" value="${draft.date}"></div><div class="form-field"><span class="field-label">연결할 학습 자료 <small>(선택사항)</small></span><div class="checkbox-list">${dataState.study.materials.map(studyAPI.project).filter(m=>type!=='resit'||g.materialIds.includes(m.id)).map(m=>`<label><input type="checkbox" name="goal-material" value="${escapeHTML(m.id)}" ${draft.materialIds.includes(m.id)?'checked':''}>${escapeHTML(m.name)}</label>`).join('')}</div></div><hr class="form-divider"><div class="form-field"><span class="field-label">학습 가능한 요일</span><div class="weekday-options">${['월','화','수','목','금','토','일'].map((day,i)=>`<label><input type="checkbox" name="learning-day" value="${i}" ${draft.learningDays.includes(i)?'checked':''} aria-label="${day}요일 학습 가능"><span>${day}</span></label>`).join('')}</div></div><div class="form-field"><label for="exam-days-off">쉬는 날짜 <small>(선택사항)</small></label><textarea id="exam-days-off" rows="2" placeholder="2026-11-01, 2026-11-08">${escapeHTML((draft.daysOff||[]).join(', '))}</textarea><p class="field-help">YYYY-MM-DD 형식으로 쉼표나 줄바꿈으로 구분해 주세요.</p></div><div class="form-field"><label for="focus-mode">시험 전 집중 복습</label><select id="focus-mode"><option value="auto" ${draft.focusMode==='auto'?'selected':''}>학습 기록에 맞춰 자동 추천</option><option value="manual" ${draft.focusMode==='manual'?'selected':''}>직접 시작일 설정</option></select><p class="field-help">실제 복습 속도와 학습 가능일로 추천해요. 직접 설정한 시작일을 우선해요.</p></div><div class="form-field" id="focus-date-field" ${draft.focusMode==='manual'?'':'hidden'}><label for="focus-date">집중 복습 시작일</label><input id="focus-date" type="date" value="${draft.focusDate}" ${draft.focusMode==='manual'?'required':''}></div>${dialogFooter(g?'저장':'추가')}</form>`);
  }else if(type==='status'&&(status==='paused'||status==='archived')) {
    const linked=g.materialIds.map(id=>demoMaterials.find(m=>m.id===id)).filter(Boolean);
    const isPause=status==='paused';
    const title=isPause?'시험 일시 중단':'시험 마무리';
    const description=linked.length?(isPause?'시험을 중단한 뒤에도 계속 공부할 자료를 선택해 주세요.':'시험을 마무리한 뒤에도 계속 공부할 자료를 선택해 주세요.'):(isPause?'연결된 학습 자료가 없어요. 시험을 일시 중단할까요?':'연결된 학습 자료가 없어요. 시험을 마무리하고 보관할까요?');
    presentExamDialog(title,`<form data-exam-form="status" data-exam-choices ${isPause?'data-pause-layout':''} data-goal="${safeId}" data-status="${status}">${isPause?'':`<p class="dialog-material-name">${escapeHTML(g.name)}</p>`}<p class="dialog-intro">${isPause?escapeHTML(g.name)+' ':''}${description}</p>${linked.length?`<fieldset class="exam-choice-group"><legend>학습을 계속할 자료</legend><div class="checkbox-list exam-choice-list" tabindex="0" aria-label="학습을 계속할 자료 목록">${linked.map(m=>{
      const otherActive=examState.goals.some(other=>other.id!==g.id&&other.status==='active'&&other.materialIds.includes(m.id));
      const manuallyPaused=examState.materialSettings[m.id]?.manualStatus==='paused';
      return `<label><input type="checkbox" name="continue-material" value="${escapeHTML(m.id)}"><span>${escapeHTML(m.name)}${manuallyPaused?'<small>직접 중단한 상태는 유지돼요.</small>':otherActive?'<small>다른 진행 중인 시험에 연결되어 있어요.</small>':''}</span></label>`;
    }).join('')}</div></fieldset><div class="exam-choice-help">${isPause?'<p>선택하지 않은 자료는 시험과 함께 일시 중단돼요. 다른 활성 시험에 연결된 자료는 계속 유지됩니다.</p>':'<p>선택한 자료는 학습·복습 추천이 유지됩니다. 선택하지 않은 자료는 해당 시험과 함께 일시 중단됩니다.</p><p>다른 활성 시험에도 연결된 자료는 계속 활성 상태로 유지됩니다. 직접 중단한 자료는 선택해도 자동으로 재개되지 않습니다.</p><p>마무리한 시험의 시험 전 집중 복습 추천은 중단됩니다.</p>'}</div>`:''}${dialogFooter(isPause?'일시 중단하기':'마무리하고 보관하기')}</form>`);
  }else if(type==='status'||type==='delete') {
    const action=type==='delete'?{type:'delete',id:g.id}:{type:'status',id:g.id,status};
    let next;
    try {next=examAPI.update(examState,action);}catch{return;}
    const paused=demoMaterials.filter(m=>examAPI.materialStatus(examState,m.id)==='active'&&examAPI.materialStatus(next,m.id)==='paused');
    const resumed=demoMaterials.filter(m=>examAPI.materialStatus(examState,m.id)==='paused'&&examAPI.materialStatus(next,m.id)==='active');
    const name=type==='delete'?'삭제':'다시 시작';
    const impact=(list,text)=>list.length?`<p class="exam-status-note">${text}</p><ul class="exam-impact">${list.map(m=>`<li>${escapeHTML(m.name)}</li>`).join('')}</ul>`:'';
    presentExamDialog(type==='delete'?'시험을 삭제할까요?':`시험을 ${name}할까요?`,`<p class="dialog-material-name">${escapeHTML(g.name)}</p><p class="dialog-intro">${type==='delete'?'시험과 연결 정보, 시험 메모가 삭제돼요. 학습 자료와 학습·복습 기록은 유지됩니다.':'이 시험의 학습 추천을 다시 시작해요. 직접 중단한 자료는 자동으로 재개하지 않습니다.'}</p>${impact(paused,'함께 일시 중단되는 자료')}${impact(resumed,'자동 중단을 해제하는 자료')}<form data-exam-form="${type}" data-goal="${safeId}" data-status="${status||''}">${dialogFooter(name,type==='delete')}</form>`);
  }
}
function submitExamForm(event) {
  event.preventDefault();
  const form=event.target;
  const id=form.dataset.goal;
  const mode=form.dataset.examForm;
  let action;
  if(mode==='edit'||mode==='resit') {
    const name=$('goal-name').value.trim();
    if(!name){$('goal-name').setCustomValidity('시험 이름을 입력해 주세요.');$('goal-name').reportValidity();$('goal-name').addEventListener('input',()=> $('goal-name').setCustomValidity(''),{once:true});return;}
    const existing=mode==='resit'?null:examState.goals.find(g=>g.id===id);
    action={type:mode==='resit'?'resit':'upsert',id,goal:{...(existing||{id:'exam-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join(''),status:'active',note:'',icon:'target'}),name,date:$('goal-date').value,
      materialIds:Array.from(form.querySelectorAll('[name="goal-material"]:checked'),el=>el.value),
      learningDays:Array.from(form.querySelectorAll('[name="learning-day"]:checked'),el=>Number(el.value)),
      focusMode:$('focus-mode').value,focusDate:$('focus-date').value,daysOff:[...new Set(($('exam-days-off')?.value||'').split(/[\s,]+/).filter(Boolean))]}};
  }else if(mode==='memo')action={type:'memo',id,note:$('exam-note').value};
  else if(mode==='delete')action={type:'delete',id};
  else if(mode==='status')action={type:'status',id,status:form.dataset.status,continuedMaterialIds:Array.from(form.querySelectorAll('[name="continue-material"]:checked'),el=>el.value)};
  else return;
  finishCommit(commitExam(action,mode==='delete'?'시험을 삭제했어요. 학습 기록은 유지됩니다.':'시험 변경 사항을 저장했어요.'),()=>dialog.close());
}

function updateMaterialType(type, selectedUnit) {
  const unitMap = {book:['페이지','챕터'],workbook:['페이지','문제'],lecture:['강','챕터'],vocabulary:['단어','Day'],other:[]};
  const units = [...unitMap[type]];
  if(selectedUnit && !units.includes(selectedUnit))units.push(selectedUnit);
  $('unit-picker-field').hidden = type === 'other';
  $('custom-unit-field').hidden = type !== 'other';
  $('custom-unit').required = type === 'other';
  $('material-unit').required = type !== 'other';
  $('material-unit').innerHTML = units.map((unit)=>`<option ${unit===selectedUnit?'selected':''}>${unit}</option>`).join('');
  $('total-unit').textContent = type === 'other' ? $('custom-unit').value || '단위' : $('material-unit').value;
}

function selectInGroup(button, selector) {
  button.parentElement.querySelectorAll(selector).forEach((item)=>{
    const active = item === button;
    item.classList.toggle('active',active);
    item.setAttribute('aria-pressed',String(active));
  });
}

function submitStudyForm(event){
  event.preventDefault();
  const form=event.target,mode=form.dataset.studyForm,id=form.dataset.material;
  const m=dataState.study.materials.find(m=>m.id===id);
  const understandingValue=form.querySelector('[data-choice-group="understanding"] .active')?.textContent||'';
  let action;
  if(mode==='material'){
    const type=$('material-type').value;
    const material={id:id||crypto.randomUUID(),name:$('material-name').value.trim(),type,unit:type==='other'?$('custom-unit').value.trim():$('material-unit').value,total:Number($('material-total').value),targetDate:$('material-due').value};
    action={type:'material',material,goalIds:Array.from(form.querySelectorAll('[name="material-goal"]:checked'),el=>el.value)};
  }else if(mode==='memo')action={type:'note',id,note:$('material-note').value};
  else if(mode==='plan')action={type:'plan',id,amount:$('manual-daily-amount').value.trim()?Number($('manual-daily-amount').value):null};
  else if(mode==='review-settings')action={type:'review-settings',id,amount:$('manual-review-amount').value.trim()?Number($('manual-review-amount').value):null};
  else if(mode==='review-date')action={type:'review-date',id,start:Number($('review-schedule-start').value),end:Number($('review-schedule-end').value),date:$('review-schedule-date').value,today:localToday()};
  else if(mode==='record'||mode==='review'){
    const record={id:form.dataset.record||crypto.randomUUID(),date:$(mode==='record'?'study-date':'review-date').value,understanding:understandingValue};
    if(mode==='record')record.position=Number($('study-position').value);
    else {record.start=Number($('review-from').value);record.end=Number($('review-to').value);}
    action={type:mode,id,record,today:localToday()};
  }else if(mode==='delete')action={type:'delete',id};
  else if(mode==='next-round')action={type:'next-round',id};
  else if(mode==='delete-record'||mode==='delete-review')action={type:mode,id,recordId:form.dataset.record};
  else if(mode==='restore'){
    if(pendingRestore)finishCommit(persistData(pendingRestore,'백업 데이터를 복원했어요.',true),()=>{pendingRestore=null;dialog.close();showView('home');});
    return;
  }else if(mode==='reset'){
    finishCommit(persistData(studyAPI.envelope(studyAPI.emptyStudy(),studyAPI.emptyExams()),'학습 자료·기록·시험을 초기화했어요.',true),()=>{dialog.close();showView('home');});
    return;
  }else return;
  return finishCommit(commitStudy(action,'저장했어요.'),()=>{
    dialog.close();
    if(currentView==='detail'){
      if(['delete'].includes(mode))showView('home');
      else {openDetail(id);if(mode.includes('review'))renderDetailTab('review');else if(mode==='plan')renderDetailTab('basic');}
    }
  });
}

function handleStudyButton(button){
  if(button.dataset.reviewStart){
    openDialog(button.dataset.dialog,button.dataset.material);
    if(button.dataset.dialog==='review'){
      $('review-from').value=button.dataset.reviewStart;$('review-to').value=button.dataset.reviewEnd;
    }else{
      $('review-schedule-start').value=button.dataset.reviewStart;$('review-schedule-end').value=button.dataset.reviewEnd;
      $('review-schedule-date').value=button.dataset.reviewDue||'';
    }
    return true;
  }
  if(button.hasAttribute('data-backup')){
    if(!studyLoad.writable){notify(studyLoad.error);return true;}
    try{
      const backup=studyAPI.backup(dataState,examAPI),url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download=`chagok-backup-${localToday()}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('자료·기록·시험 백업을 내려받습니다.');
    }catch(error){notify(error.message);}
    return true;
  }
  if(button.hasAttribute('data-restore')){$('restore-file').click();return true;}
  if(button.dataset.archiveMaterial||button.dataset.unarchiveMaterial){
    const id=button.dataset.archiveMaterial||button.dataset.unarchiveMaterial;
    finishCommit(commitStudy({type:'archive',id,archived:!!button.dataset.archiveMaterial},button.dataset.archiveMaterial?'자료와 이력을 보관했어요.':'자료를 다시 꺼냈어요.'),()=>{dialog.close();if(currentView==='detail')showView('home');});
    return true;
  }
  if(button.dataset.editEntry){
    const mode=button.dataset.editEntry,id=button.dataset.material;
    const m=dataState.study.materials.find(m=>m.id===id),r=m?.[mode==='record'?'records':'reviews'].find(r=>r.id===button.dataset.record);
    if(!r)return true;
    openDialog(mode,id);
    const form=dialog.querySelector('[data-study-form]');form.dataset.record=r.id;
    $(mode==='record'?'study-date':'review-date').value=r.date;
    if(mode==='record')$('study-position').value=r.position;
    else{
      $('review-from').value=r.start;$('review-to').value=r.end;
      $('review-from').max=r.total;$('review-to').max=r.total;
      for(const el of form.querySelectorAll('.input-unit span'))el.textContent=r.unit;
    }
    for(const b of form.querySelectorAll('.choice-button')){const active=b.textContent===r.understanding;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
    $('dialog-title').textContent=mode==='record'?'진도 기록 수정':'복습 기록 수정';return true;
  }
  if(button.dataset.deleteEntry){
    const mode=button.dataset.deleteEntry;
    presentExamDialog('기록을 삭제할까요?',`<p class="dialog-intro">선택한 기록을 삭제합니다.${mode==='record'?' 남은 기록으로 진도를 다시 계산해요.':' 전체 진도와 회독은 유지해요.'}</p><form data-study-form="delete-${mode}" data-material="${escapeHTML(button.dataset.material)}" data-record="${escapeHTML(button.dataset.record)}">${dialogFooter('삭제',true)}</form>`);return true;
  }
  return false;
}

async function readRestore(input){
  const file=input.files[0];input.value='';if(!file)return;
  try{
    const backup=JSON.parse(await file.text());pendingRestore=studyAPI.restore(backup,dataState,examAPI);
    presentExamDialog('백업 데이터를 복원할까요?',`<p class="dialog-intro">학습 자료 ${pendingRestore.study.materials.length}개와 기록·메모를 백업 내용으로 교체합니다. ${backup.app==='study-progress'?(studyLoad.writable?'1.0 백업에는 시험이 없어 현재 시험은 유지합니다.':'1.0 백업에는 시험이 없어 복원 후 시험 목록은 비어 있습니다.'):'시험과 자료 상태도 백업 내용으로 교체합니다.'} ${studyLoad.writable?'필요한 현재 데이터는 먼저 백업해 주세요.':'읽지 못한 기존 저장값은 별도 보존한 뒤 복원합니다.'}</p><form data-study-form="restore">${dialogFooter('복원',true)}</form>`);
  }catch(error){pendingRestore=null;notify('백업 형식이나 기록이 올바르지 않아요. 현재 데이터는 변경하지 않았습니다.');}
}

document.addEventListener('click',(event)=>{
  const button = event.target.closest('button');
  if (!button) return;
  if(handleStudyButton(button))return;
  if (button.dataset.examDialog) return openExamDialog(button.dataset.examDialog,button.dataset.goal,button.dataset.status);
  if (button.dataset.examPriority) {finishCommit(commitExam({type:'priority',id:button.dataset.examPriority},'우선 시험 설정을 저장했어요.'),()=>dialog.close());return;}
  if (button.dataset.materialStatus) {finishCommit(commitExam({type:'material-status',id:button.dataset.material,status:button.dataset.materialStatus},'자료 상태를 저장했어요.'),()=>dialog.close());return;}

  if (button.dataset.view) return showView(button.dataset.view,true);
  if (button.hasAttribute('data-close')) return dialog.close();
  if (button.dataset.detail) return openDetail(button.dataset.detail);
  if (button.dataset.dialog) return openDialog(button.dataset.dialog,button.dataset.material,button.hasAttribute('data-edit'));
  if (button.dataset.previewAction) return notify(`${button.dataset.previewAction} 기능은 다음 단계에서 연결해요. 실제 데이터는 변경되지 않았어요.`);
  if (button.dataset.filter) {selectInGroup(button,'[data-filter]');return renderMaterials(button.dataset.filter);}
  if (button.dataset.goalFilter) {selectInGroup(button,'[data-goal-filter]');return renderGoals(button.dataset.goalFilter);}
  if (button.dataset.period) {selectInGroup(button,'[data-period]');return renderStats(button.dataset.period);}
  if (button.dataset.linked) {
    const list = $(`linked-${button.dataset.linked}`);
    list.hidden = !list.hidden;
    return button.setAttribute('aria-expanded',String(!list.hidden));
  }
  if (button.dataset.calendar) {
    const date = new Date(calendarYear,calendarMonth+Number(button.dataset.calendar),1);
    if(date.getFullYear()<1000||date.getFullYear()>9999)return;calendarYear=date.getFullYear();calendarMonth=date.getMonth();return renderCalendar();
  }
  if (button.dataset.day) return showCalendarDay(calendarYear+'-'+String(calendarMonth+1).padStart(2,'0')+'-'+String(button.dataset.day).padStart(2,'0'));
  if (button.dataset.detailTab) {selectInGroup(button,'[data-detail-tab]');return renderDetailTab(button.dataset.detailTab);}
  if (button.closest('[data-choice-group]')) selectInGroup(button,'.choice-button');
});

document.addEventListener('change',(event)=>{
  const target=event.target;
  if(target.id==='stats-group'){statsGroup=target.value;renderStats(statsPeriod);return;}
  if(target.id==='restore-file'){readRestore(target);return;}
  if (target.id==='material-type') updateMaterialType(target.value);
  if (target.id==='focus-mode') {
    $('focus-date-field').hidden=target.value!=='manual';
    $('focus-date').required=target.value==='manual';
  }
  if (target.id==='material-unit') $('total-unit').textContent=target.value;
});
document.addEventListener('input',(event)=>{
  if(event.target.id==='custom-unit') $('total-unit').textContent=event.target.value.trim()||'단위';
});
document.addEventListener('submit',(event)=>{
  if(event.target.matches('[data-exam-form]')) return submitExamForm(event);
  if(event.target.matches('[data-study-form]')) return submitStudyForm(event);
});
dialog.addEventListener('click',(event)=>{
  if(event.target!==dialog) return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom) dialog.close();
});
dialog.addEventListener('close',()=>{
  if(dialogReturnFocus?.isConnected) dialogReturnFocus.focus({preventScroll:true});
});
window.addEventListener('hashchange',()=>showView(location.hash.slice(1),true));


let displayedDay=localToday(),dayRefreshTimer;
function refreshForDayChange(){
 const today=localToday();if(today===displayedDay)return false;
 displayedDay=today;reviewCache=null;
 renderHomeWelcome();renderToday();renderReviewSummary();renderExamSummary();
 renderMaterials(materialFilter);renderGoals(goalFilter);renderStats(statsPeriod);renderCalendar();
 return true;
}
function scheduleDayRefresh(){
 clearTimeout(dayRefreshTimer);
 const now=new Date(),next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
 const delay=Math.max(1000,Math.min(2147483647,next.getTime()-now.getTime()+50));
 dayRefreshTimer=setTimeout(()=>{refreshForDayChange();scheduleDayRefresh();},delay);
}
window.addEventListener('focus',()=>{refreshForDayChange();scheduleDayRefresh();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){refreshForDayChange();scheduleDayRefresh();}});
scheduleDayRefresh();

$('archive-count').textContent=demoArchivedMaterials.length;
$('archive-count').setAttribute('aria-label',`보관 자료 ${demoArchivedMaterials.length}개`);
renderReviewSummary();renderExamSummary();
renderHomeWelcome();renderMaterials();renderToday();renderGoals();renderStats();renderCalendar();
renderStorageNote();
showView(location.hash.slice(1)||'home');
if(studyLoad.error)notify(studyLoad.error);
else if(studyLoad.migrated)notify('1.0 자료와 기록을 가져왔어요. 기존 저장 데이터는 그대로 보존했습니다.');
