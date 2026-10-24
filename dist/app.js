'use strict';

// Study records remain UI fixtures. Exam preview state uses a separate key; never write 1.0 storage.
const $ = (id) => document.getElementById(id);
const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const demoToday = new Date(2026, 9, 24);
const dateValue = '2026-10-24';
const demoMaterials = [
  {id:'network',name:'컴퓨터 네트워크',type:'교재',typeKey:'book',current:128,total:320,unit:'페이지',round:1,plant:'sapling',category:'school',goal:'정보처리기사',due:'11월 21일',days:28,difficulty:'보통',note:'네트워크 계층과 전송 계층을 비교하며 정리하기.'},
  {id:'toeic',name:'토익 RC 문제집',type:'문제집',typeKey:'workbook',current:80,total:300,unit:'페이지',round:1,plant:'daisy',category:'exam',goal:'토익 900점',due:'12월 6일',days:43,difficulty:'어려움',note:'Part 7 지문 구조를 먼저 파악하고 읽기.'},
  {id:'history',name:'한국사 기본 강의',type:'인터넷 강의',typeKey:'lecture',current:20,total:40,unit:'강',round:2,plant:'tree',category:'exam',goal:'한국사능력검정',due:'미정',days:null,difficulty:'쉬움',note:''}
];
// The archive and badge share the same preview list; persistent archive storage is not connected.
const demoArchivedMaterials = [{name:'자료구조 기초',round:1}];
const demoGoals = [
  {id:'engineer',name:'정보처리기사',date:'2026.11.21 (토)',days:28,importance:'중요',color:'clay',progress:40,status:'active',icon:'notes',materials:['컴퓨터 네트워크'],note:'필기 시험 준비'},
  {id:'english',name:'토익 900점',date:'2026.12.06 (일)',days:43,importance:'보통',color:'cream',progress:27,status:'active',icon:'target',materials:['토익 RC 문제집'],note:'RC와 LC 차근차근'},
  {id:'korean-history',name:'한국사능력검정',date:'시험일 미정',days:null,importance:'일시 중단',color:'neutral',progress:50,status:'paused',icon:'book',materials:['한국사 기본 강의'],note:'다음 시험 일정 확인 후 재개'}
];
const demoRecords = [
  {date:'10월 23일 (금)',from:109,to:128,amount:19,understanding:'보통'},
  {date:'10월 21일 (수)',from:85,to:109,amount:24,understanding:'어려움'},
  {date:'10월 19일 (월)',from:60,to:85,amount:25,understanding:'보통'},
  {date:'10월 17일 (토)',from:40,to:60,amount:20,understanding:'쉬움'}
];
const demoReviewPlans = [{materialId:'toeic',start:31,end:50,status:'복습 예정'},{materialId:'network',start:61,end:80,status:'복습 지연'},{materialId:'network',goalId:'engineer',start:81,end:100,status:'시험 전 복습'}];
const examAPI = ExamManagement;
const initialExamState = {
  app:'chagok-preview-exams',version:2,priorityGoalId:null,
  goals:demoGoals.map(g=>({...g,date:g.days===null?'':g.id==='engineer'?'2026-11-21':'2026-12-06',
    materialIds:demoMaterials.filter(m=>g.materials.includes(m.name)).map(m=>m.id),
    learningDays:[0,1,2,3,4,5],focusMode:'auto',focusDate:'',continuedMaterialIds:[]})),
  materialSettings:Object.fromEntries(demoMaterials.map(m=>[m.id,{manualStatus:'active',autoPausedBy:[]}]))
};
let examLoad;
try {examLoad=examAPI.load(window.localStorage,initialExamState);}
catch {examLoad={state:examAPI.reconcile(initialExamState),writable:false,error:'브라우저 저장소를 사용할 수 없어 시험 변경을 중단했어요.'};}
let examState=examLoad.state;
let goalFilter='all';
let materialFilter='all';
const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const ddayLabel=days=>days===null?'':days===0?'D-Day':days>0?`D−${days}`:`D+${Math.abs(days)}`;
const examDateLabel=date=>date?new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).format(new Date(date+'T12:00:00')):'시험일 미정';
function materialExamInfo(m) {
  const goals=examAPI.orderedGoals(examState).filter(g=>g.materialIds.includes(m.id)&&g.status!=='archived');
  const g=goals.find(g=>g.status==='active')||goals[0];
  return {...m,goal:g?.name||'독립 학습',days:g?examAPI.dayDifference(g.date,localToday()):null,due:g?examDateLabel(g.date):'미정'};
}
function commitExam(action,message) {
  if(!examLoad.writable){notify(examLoad.error);return false;}
  try {
    const next=examAPI.update(examState,action);
    examAPI.save(window.localStorage,next);
    examState=next;
  } catch {notify('저장하지 못했어요. 기존 시험과 학습 기록은 그대로 유지됩니다.');return false;}
  renderGoals(goalFilter);renderMaterials(materialFilter);renderToday();renderExamSummary();renderReviewSummary();
  notify(message);return true;
}
function activeReviewPlans(){return demoReviewPlans.filter(plan=>examAPI.materialStatus(examState,plan.materialId)==='active'&&(!plan.goalId||examState.goals.some(g=>g.id===plan.goalId&&g.status==='active')));}
function renderReviewSummary(){const count=activeReviewPlans().length;$('review-range-count').textContent=count?`${count}개 범위`:'복습할 범위가 없어요';}
function renderExamSummary(){
  const g=examState.goals.filter(g=>g.status==='active'&&g.date&&examAPI.dayDifference(g.date,localToday())>=0).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const card=document.querySelector('.exam-summary');
  card.innerHTML=`<span class="summary-icon terracotta">${icon('calendar')}</span><span><small>가장 가까운 시험</small><strong>${g?escapeHTML(g.name):'예정된 시험이 없어요'}</strong><span class="summary-sub">${g?examDateLabel(g.date):'시험 날짜를 등록해 보세요'}</span></span>${g?`<b class="d-day">${ddayLabel(examAPI.dayDifference(g.date,localToday()))}</b>`:''}`;
}
let selectedMaterial = demoMaterials[0];
let currentView = 'home';
let calendarMonth = 9;
let calendarYear = 2026;
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
  if (!['home','goals','stats','more','detail'].includes(view)) view = 'home';
  if (dialog.open) dialog.close();
  currentView = view;
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
  const aliases = {daisy:'flower',sprout:'flower',flower:'flower',seed:'tree',sapling:'tree',tree:'tree',cactus:'cactus',mushroom:'mushroom'};
  const family = aliases[material.plant] || 'tree';
  const ratio = material.total > 0 ? Math.max(0,Math.min(1,material.current/material.total)) : 0;
  const completed = material.round > 1 || ratio >= 1;
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
  return `<article class="material-card" data-category="${material.category}">
    <div class="material-card-top"><div class="material-meta"><span class="badge sage">${icon(material.typeKey === 'lecture' ? 'screen' : 'book')}${material.type}</span><span class="badge cream">${escapeHTML(material.goal)}</span>${status==='paused'?'<span class="badge neutral">일시 중단</span>':material.days!==null ? `<span class="badge clay">${ddayLabel(material.days)}</span>` : '<span class="badge neutral">시험일 미정</span>'}</div><button class="icon-button card-menu" data-dialog="material-menu" data-material="${material.id}" aria-label="${material.name} 관리">${icon('more')}</button></div>
    <div class="material-main">${plantMarkup(material)}<div class="material-info"><button class="card-title" data-detail="${material.id}">${material.name}</button><div class="quantity"><b>${material.current}</b><span>/</span><span>${material.total}<span class="material-unit">${material.unit}</span></span></div><span class="round-label">${material.round}회독</span></div></div>
    <div class="material-progress">${progressMarkup(percent)}</div>
    <div class="card-primary-actions"><button class="button secondary" data-dialog="record" data-material="${material.id}">${icon('edit')}진도 기록</button><button class="button secondary" data-dialog="review" data-material="${material.id}">${icon('repeat')}복습</button></div>

  </article>`;
}

function renderMaterials(filter = 'all') {
  materialFilter=filter;
  const items = demoMaterials.filter((item) => filter === 'all' || item.category === filter);
  $('material-grid').innerHTML = items.map(materialCard).join('');
  $('filter-empty').hidden = items.length !== 0;
}

function renderHomeWelcome() {
  const today = new Date();
  const time = $('home-date');
  time.dateTime = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  time.textContent = new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(today);
  // Adapt the existing dated UI fixtures without modifying records or persistence.
  const dates = demoRecords.map(record => {
    const match = /^(\d+)월 (\d+)일/.exec(record.date);
    return match ? `${demoToday.getFullYear()}-${match[1].padStart(2,'0')}-${match[2].padStart(2,'0')}` : record.date;
  });
  const streak = countStudyStreak(dates, today);
  $('home-streak').textContent = streak.count
    ? `${streak.count}일 연속으로 공부하고 있어요.`
    : '오늘의 첫 학습을 기록해 보세요.';
}

function renderToday() {
  const order=examAPI.orderedGoals(examState).filter(g=>g.status==='active').flatMap(g=>g.materialIds);
  // UI recommendation fixtures; smart quantity calculation remains a later stage.
  const tasks=[{id:'network',amount:20},{id:'toeic',amount:15},{id:'history',amount:2}]
    .filter(task=>examAPI.materialStatus(examState,task.id)==='active')
    .sort((a,b)=>(order.indexOf(a.id)<0?Infinity:order.indexOf(a.id))-(order.indexOf(b.id)<0?Infinity:order.indexOf(b.id)));
  $('today-list').innerHTML=tasks.map(task=>{const m=demoMaterials.find(m=>m.id===task.id);return `<div class="today-task"><span class="task-icon">${icon('book')}</span><span class="task-copy"><strong>${escapeHTML(m.name)}</strong><small><span class="task-kind">권장 학습</span>${task.amount}${escapeHTML(m.unit)}</small></span><button class="text-link" data-dialog="record" data-material="${m.id}">진도 기록${icon('chevron')}</button></div>`;}).join('')||'<p class="field-help">진행 중인 학습 자료가 없어요.</p>';

}

function renderGoals(filter = 'all') {
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
    return `<article class="goal-card ${g.status==='paused'?'paused':''}"><div class="goal-top"><span class="goal-symbol">${icon(['notes','target','book'].includes(g.icon)?g.icon:'target')}</span><div class="goal-status">${g.id===examState.priorityGoalId?'<span class="badge sage">우선 시험</span>':''}${g.status==='paused'?'<span class="badge neutral">일시 중단</span>':g.status==='archived'?'<span class="badge neutral">보관</span>':''}<button class="icon-button exam-menu-button" data-exam-dialog="menu" data-goal="${escapeHTML(g.id)}" aria-label="${escapeHTML(g.name)} 관리">${icon('more')}</button></div></div><h2>${escapeHTML(g.name)}</h2><p class="goal-date">${icon('calendar')}${examDateLabel(g.date)}${days===null?'':`<b>${ddayLabel(days)}</b>`}</p><div>${progressMarkup(progress,'연결 자료 진행률')}</div><button class="linked-toggle" data-linked="${escapeHTML(g.id)}" aria-expanded="false" aria-controls="linked-${escapeHTML(g.id)}">연결된 자료 ${linked.length}개${icon('chevron')}</button><ul class="linked-materials" id="linked-${escapeHTML(g.id)}" hidden>${linked.map(m=>`<li>${escapeHTML(m.name)}</li>`).join('')}</ul></article>`;
  }).join('');
  $('goal-empty').hidden=goals.length!==0;
  $('goal-empty').querySelector('h3').textContent=filter==='all'?'등록된 시험이 없어요':filter==='done'?'보관한 시험이 없어요':filter==='paused'?'일시 중단한 시험이 없어요':'진행 중인 시험이 없어요';
  $('goal-empty').querySelector('p').textContent='시험 추가 버튼에서 시험을 등록할 수 있어요.';
}

const periods = {
  week:{study:12,review:5,days:5,range:'10월 18일 – 10월 24일',labels:['일','월','화','수','목','금','토'],values:[0,3,0,2,2,3,2],reviews:[0,1,0,1,1,1,1]},
  month:{study:43,review:17,days:18,range:'2026년 10월',labels:['1주','2주','3주','4주'],values:[8,12,10,13],reviews:[3,5,4,5]},
  quarter:{study:118,review:39,days:51,range:'2026년 8월 – 10월',labels:['8월','9월','10월'],values:[31,44,43],reviews:[8,14,17]},
  half:{study:226,review:67,days:99,range:'2026년 5월 – 10월',labels:['5월','6월','7월','8월','9월','10월'],values:[32,36,40,31,44,43],reviews:[6,10,12,8,14,17]}
};

function renderStats(period = 'week') {
  const data = periods[period];
  $('stats-summary').innerHTML = [['학습 기록',data.study,'건'],['복습 기록',data.review,'건'],['기록한 날',data.days,'일']].map(([label,value,unit]) => `<div class="stat-tile"><small>${label}</small><strong>${value}<span>${unit}</span></strong></div>`).join('');
  $('chart-period').textContent = data.range;
  const max = Math.max(...data.values,...data.reviews) * 1.2;
  $('bar-chart').innerHTML = data.labels.map((label,i) => `<div class="bar-column"><div class="bar-pair"><div class="bar" style="height:${data.values[i]/max*100}%" title="학습 ${data.values[i]}건"></div><div class="bar review" style="height:${data.reviews[i]/max*100}%" title="복습 ${data.reviews[i]}건"></div></div><small>${label}</small></div>`).join('');
  $('bar-chart').setAttribute('aria-label',data.labels.map((label,i) => `${label}: 학습 ${data.values[i]}건, 복습 ${data.reviews[i]}건`).join(', '));
}

function renderCalendar() {
  $('calendar-title').textContent = `${calendarYear}년 ${calendarMonth + 1}월`;
  const offset = new Date(calendarYear,calendarMonth,1).getDay();
  const count = new Date(calendarYear,calendarMonth + 1,0).getDate();
  const marks = {1:1,3:2,5:1,7:3,9:1,10:2,12:3,14:2,15:1,17:2,19:4,21:3,22:3,23:4,24:3};
  $('calendar-grid').innerHTML = '<span class="blank" aria-hidden="true"></span>'.repeat(offset) + Array.from({length:count},(_,i) => {
    const day = i + 1;
    const current = calendarYear === 2026 && calendarMonth === 9;
    const recordCount = current ? marks[day] || 0 : 0;
    const level = Math.min(3,recordCount);
    const isToday = current && day === 24;
    return `<button class="${level ? `level-${level}` : ''} ${isToday ? 'today' : ''}" data-day="${day}" data-day-count="${recordCount}" aria-label="${calendarMonth + 1}월 ${day}일, 예시 기록 ${recordCount}건" ${isToday ? 'aria-current="date"' : ''}>${day}</button>`;
  }).join('');
}

function openDetail(id) {
  selectedMaterial = materialExamInfo(demoMaterials.find((item) => item.id === id) || demoMaterials[0]);
  const m = selectedMaterial;
  $('view-detail').innerHTML = `<div class="detail-page-top"><button class="icon-button" data-view="home" aria-label="학습 자료 목록으로 돌아가기">${icon('back')}</button><h1 id="detail-heading">${m.name}</h1><button class="icon-button" data-dialog="material-menu" data-material="${m.id}" aria-label="자료 관리 메뉴">${icon('more')}</button></div><div class="detail-grid"><section class="panel detail-summary">${plantMarkup(m,'detail-plant')}<div class="material-meta"><span class="badge sage">${m.type}</span><span class="badge cream">${escapeHTML(m.goal)}</span>${m.days!==null ? `<span class="badge clay">${ddayLabel(m.days)}</span>` : ''}</div><div class="quantity"><b>${m.current}</b><span>/</span><span>${m.total}<span class="material-unit">${m.unit}</span></span></div><span class="round-label">${m.round}회독</span><div class="material-progress">${progressMarkup(Math.round(m.current/m.total*100))}</div><div class="card-primary-actions"><button class="button primary" data-dialog="record" data-material="${m.id}">${icon('edit')}진도 기록</button><button class="button secondary" data-dialog="review" data-material="${m.id}">${icon('repeat')}복습</button></div><div class="card-secondary-actions"><button class="subtle-button" data-dialog="memo" data-material="${m.id}">메모</button><button class="subtle-button" data-dialog="material" data-material="${m.id}" data-edit>수정</button></div></section><section class="panel"><div class="segmented detail-tabs" aria-label="자료 상세 보기"><button class="active" data-detail-tab="study" aria-pressed="true">학습 기록</button><button data-detail-tab="review" aria-pressed="false">복습 기록</button><button data-detail-tab="basic" aria-pressed="false">기본 정보</button></div><div id="detail-tab-content"></div></section></div>`;
  renderDetailTab('study');
  showView('detail',true);
}

function renderDetailTab(tab) {
  const m = selectedMaterial;
  if (tab === 'basic') {
    $('detail-tab-content').innerHTML = `<ul class="basic-list">${[['자료 이름',m.name],['학습 유형',m.type],['전체 분량',`${m.total} ${m.unit}`],['현재 회독',`${m.round}회독`],['연결 시험',m.goal],['목표 완료일',m.due]].map(([label,value])=>`<li><span>${label}</span><strong>${escapeHTML(value)}</strong></li>`).join('')}</ul>`;
  } else if (tab === 'review') {
    $('detail-tab-content').innerHTML = [{date:'10월 22일 (목)',range:`1–30${m.unit}`,understanding:'보통'},{date:'10월 18일 (일)',range:`10–25${m.unit}`,understanding:'어려움'}].map((r)=>`<article class="record-row"><div class="record-row-top">${icon('repeat')}${r.date}<button class="subtle-button" data-preview-action="기록 수정">수정</button></div><div class="record-row-data"><span>${r.range}</span><span class="badge sage">${r.understanding}</span></div></article>`).join('');
  } else {
    const records = m.id === 'network' ? demoRecords : [{date:'10월 23일 (금)',from:m.typeKey==='lecture'?17:60,to:m.current,amount:m.typeKey==='lecture'?3:20,understanding:m.difficulty},{date:'10월 21일 (수)',from:m.typeKey==='lecture'?15:40,to:m.typeKey==='lecture'?17:60,amount:m.typeKey==='lecture'?2:20,understanding:'보통'}];
    $('detail-tab-content').innerHTML = records.map((r)=>`<article class="record-row"><div class="record-row-top">${icon('leaf')}${r.date}<button class="subtle-button" data-preview-action="기록 수정">수정</button></div><div class="record-row-data"><span><small>학습량</small><strong>+${r.amount}${m.unit}</strong></span><span><small>현재 위치</small>${r.to}${m.unit}</span></div><span class="badge ${r.understanding==='어려움'?'clay':'sage'}">${r.understanding}</span></article>`).join('');
  }
}

function dialogFooter(action = '기록', danger = false) {
  return `<div class="dialog-actions"><button class="button cream" type="button" data-close>취소</button><button class="button ${danger ? 'cream' : 'primary'}" type="submit">${action}</button></div>`;
}

function understanding() {
  return `<div class="form-field"><span class="field-label">이해도<small>(선택사항)</small></span><div class="choice-row" data-choice-group="understanding"><button class="choice-button" type="button" aria-pressed="false">쉬움</button><button class="choice-button" type="button" aria-pressed="false">보통</button><button class="choice-button" type="button" aria-pressed="false">어려움</button></div></div>`;
}

function openDialog(type, materialId, editing = false) {
  const m = demoMaterials.find((item)=>item.id===materialId) || selectedMaterial;
  selectedMaterial = m;
  let title = '';
  let content = '';
  if(type==='goal') return openExamDialog('edit');
  if (type === 'record') {
    title = '진도 기록';
    content = `<p class="dialog-material-name">${m.name}</p><form data-preview-form><div class="form-field"><label for="study-date">공부 날짜</label><input id="study-date" type="date" value="${dateValue}" required></div><div class="form-field"><label for="study-position">현재 위치</label><div class="input-unit"><input id="study-position" type="number" min="0" max="${m.total}" step="1" inputmode="numeric" required><span>/ ${m.total} ${m.unit}</span></div><p class="field-help">이전 위치 ${m.current}${m.unit} · 공부량은 이전 기록과 비교해 계산해요.</p></div>${understanding()}${dialogFooter()}</form>`;
  } else if (type === 'review') {
    title = '복습 기록';
    content = `<p class="dialog-material-name">${m.name}</p><form data-preview-form><div class="form-field"><label for="review-date">복습 날짜</label><input id="review-date" type="date" value="${dateValue}" required></div><div class="form-row"><div class="form-field"><label for="review-from">시작 위치</label><div class="input-unit"><input id="review-from" type="number" min="1" max="${m.total}" inputmode="numeric" required><span>${m.unit}</span></div></div><div class="form-field"><label for="review-to">끝 위치</label><div class="input-unit"><input id="review-to" type="number" min="1" max="${m.total}" inputmode="numeric" required><span>${m.unit}</span></div></div></div>${understanding()}<p class="field-help">복습 기록은 전체 진도와 회독을 바꾸지 않아요.</p>${dialogFooter()}</form>`;
  } else if (type === 'material') {
    title = editing ? '학습 자료 수정' : '학습 자료 추가';
    content = `<form data-preview-form><div class="form-field"><label for="material-name">자료 이름</label><input id="material-name" maxlength="100" ${editing ? `value="${escapeHTML(m.name)}"` : 'placeholder="예: 컴퓨터 네트워크"'} required></div><div class="form-field"><label for="material-type">학습 유형</label><select id="material-type" required>${[['book','교재'],['workbook','문제집'],['lecture','인터넷 강의'],['vocabulary','단어 학습'],['other','기타']].map(([key,label])=>`<option value="${key}" ${key===(editing?m.typeKey:'book')?'selected':''}>${label}</option>`).join('')}</select></div><div class="form-field" id="unit-picker-field"><label for="material-unit">학습 단위</label><select id="material-unit"></select></div><div class="form-field" id="custom-unit-field" hidden><label for="custom-unit">학습 단위</label><input id="custom-unit" maxlength="20" placeholder="예: 세트"></div><div class="form-field"><label for="material-total">전체 학습 분량</label><div class="input-unit"><input id="material-total" type="number" min="1" step="1" inputmode="numeric" ${editing ? `value="${m.total}"` : 'placeholder="예: 300"'} required><span id="total-unit">${editing ? m.unit : '페이지'}</span></div></div><div class="form-field"><span class="field-label">연결할 시험 <small>(선택사항)</small></span><div class="checkbox-list">${examState.goals.map((g)=>`<label><input type="checkbox" name="material-goal" value="${escapeHTML(g.id)}" ${editing&&g.materialIds.includes(m.id)?'checked':''}>${escapeHTML(g.name)}</label>`).join('')}</div><p class="field-help">연결하지 않으면 독립 자료로 관리해요. 여러 시험에 연결할 수 있어요.</p></div><div class="form-field"><label for="material-due">목표 완료일 <small>(선택사항)</small></label><input id="material-due" type="date"></div><p class="field-help">식물은 자동으로 배정되고, 공부한 만큼 자라요.</p>${dialogFooter(editing?'저장':'추가')}</form>`;
  } else if (type === 'memo') {
    title = '메모';
    content = `<p class="dialog-material-name">${m.name}</p><form data-preview-form><div class="form-field"><label for="material-note">학습 메모 <small>(선택사항)</small></label><textarea id="material-note" rows="6" placeholder="필요할 때 꺼내 볼 메모를 남겨요.">${escapeHTML(m.note)}</textarea></div>${dialogFooter('저장')}</form>`;
  } else if (type === 'review-plan') {
    title = '오늘의 복습';
    content = activeReviewPlans().length ? activeReviewPlans().map(plan=>{
      const material=demoMaterials.find(item=>item.id===plan.materialId);
      return `<div class="review-plan-item"><h3>${escapeHTML(material.name)}</h3><p>${plan.start}–${plan.end}${escapeHTML(material.unit)}</p><span class="badge ${plan.status==='복습 지연'?'clay':'sage'}">${plan.status}</span><button class="text-link" style="float:right" data-dialog="review" data-material="${material.id}">복습 기록${icon('chevron')}</button></div>`;
    }).join('') : '<p class="dialog-intro">오늘 복습할 범위가 없어요.</p>';
  } else if (type === 'settings') {
    title = '설정';
    content = `<section class="settings-block"><h3>학습 데이터 백업</h3><button class="button secondary" data-preview-action="백업">백업 파일 저장</button></section><section class="settings-block"><h3>학습 데이터 복원</h3><button class="button secondary" data-preview-action="복원">백업 파일 선택</button></section><button class="reset-button" data-dialog="reset">초기화</button>`;
  } else if (type === 'reset') {
    title = '학습 데이터를 초기화할까요?';
    content = `<p class="dialog-intro">학습 자료와 기록이 모두 삭제되며 되돌릴 수 없어요.<br>필요한 데이터는 먼저 백업해 주세요.</p><form data-preview-form data-action="reset">${dialogFooter('초기화',true)}</form>`;
  } else if (type === 'delete-material') {
    title = '자료를 삭제할까요?';
    content = `<p class="dialog-intro">‘${m.name}’ 자료와 연결된 기록이 삭제됩니다.</p><form data-preview-form data-action="delete">${dialogFooter('삭제',true)}</form>`;
  } else if (type === 'material-menu') {
    title = '학습 자료 관리';
    content = `<div class="more-list"><button data-dialog="memo" data-material="${m.id}">${icon('notes')}<span>메모</span></button><button data-dialog="material" data-material="${m.id}" data-edit>${icon('edit')}<span>자료 수정</span></button><button data-preview-action="자료 보관">${icon('archive')}<span>학습을 마무리하고 보관하기</span></button><button data-material-status="${examState.materialSettings[m.id].manualStatus==='paused'?'active':'paused'}" data-material="${m.id}">${icon('repeat')}<span>${examState.materialSettings[m.id].manualStatus==='paused'?'다시 시작하기':'일시 중단으로 설정'}</span></button><button class="muted-danger" data-dialog="delete-material" data-material="${m.id}">${icon('trash')}<span>자료 삭제</span></button></div>`;
  } else if (type === 'archive') {
    title = '보관한 학습 자료';
    content = demoArchivedMaterials.map(material => `<div class="material-main"><div class="plant-sprite plant-flower" role="img" aria-label="보관된 완성 식물"></div><div><h3>${escapeHTML(material.name)}</h3><p class="field-help">${material.round}회독 완료 · 보관 중</p><button class="text-link" data-preview-action="자료 복원">다시 꺼내기${icon('chevron')}</button></div></div>`).join('') || '<p class="field-help">보관한 자료가 없어요.</p>';
  }
  if (!title) return;
  dialog.classList.remove('exam-choice-dialog','exam-pause-dialog');
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
    presentExamDialog('시험 관리',`<p class="dialog-material-name">${escapeHTML(g.name)}</p><div class="more-list"><button data-exam-dialog="memo" data-goal="${safeId}">${icon('notes')}<span>메모</span></button><button data-exam-dialog="edit" data-goal="${safeId}">${icon('edit')}<span>시험 수정</span></button>${g.status==='active'?`<button data-exam-priority="${safeId}">${icon('target')}<span>${examState.priorityGoalId===g.id?'우선 시험 해제':'우선 시험으로 설정'}</span></button>`:''}<button data-exam-dialog="status" data-goal="${safeId}" data-status="${g.status==='archived'?'active':'archived'}">${icon('archive')}<span>${g.status==='archived'?'보관 해제하고 다시 시작하기':'시험을 마무리하고 보관하기'}</span></button>${g.status!=='archived'?`<button data-exam-dialog="status" data-goal="${safeId}" data-status="${g.status==='paused'?'active':'paused'}">${icon('repeat')}<span>${g.status==='paused'?'다시 시작하기':'일시 중단으로 설정'}</span></button>`:''}<button class="muted-danger" data-exam-dialog="delete" data-goal="${safeId}">${icon('trash')}<span>시험 삭제</span></button></div>`);
  }else if(type==='memo') {
    presentExamDialog('시험 메모',`<p class="dialog-material-name">${escapeHTML(g.name)}</p><form data-exam-form="memo" data-goal="${safeId}"><div class="form-field"><label for="exam-note">메모 <small>(선택사항)</small></label><textarea id="exam-note" rows="6">${escapeHTML(g.note)}</textarea></div>${dialogFooter('저장')}</form>`);
  }else if(type==='edit') {
    const draft=g||{name:'',date:'',materialIds:[],learningDays:[0,1,2,3,4,5],focusMode:'auto',focusDate:''};
    presentExamDialog(g?'시험 수정':'시험 추가',`<form data-exam-form="edit" data-goal="${safeId}"><div class="form-field"><label for="goal-name">시험 이름</label><input id="goal-name" value="${escapeHTML(draft.name)}" maxlength="100" placeholder="예: 정보처리기사 필기" required></div><div class="form-field"><label for="goal-date">시험 날짜 <small>(선택사항)</small></label><input id="goal-date" type="date" value="${draft.date}"></div><div class="form-field"><span class="field-label">연결할 학습 자료 <small>(선택사항)</small></span><div class="checkbox-list">${demoMaterials.map(m=>`<label><input type="checkbox" name="goal-material" value="${m.id}" ${draft.materialIds.includes(m.id)?'checked':''}>${escapeHTML(m.name)}</label>`).join('')}</div></div><hr class="form-divider"><div class="form-field"><span class="field-label">학습 가능한 요일</span><div class="weekday-options">${['월','화','수','목','금','토','일'].map((day,i)=>`<label><input type="checkbox" name="learning-day" value="${i}" ${draft.learningDays.includes(i)?'checked':''} aria-label="${day}요일 학습 가능"><span>${day}</span></label>`).join('')}</div></div><div class="form-field"><label for="focus-mode">시험 전 집중 복습</label><select id="focus-mode"><option value="auto" ${draft.focusMode==='auto'?'selected':''}>학습 기록에 맞춰 자동 추천</option><option value="manual" ${draft.focusMode==='manual'?'selected':''}>직접 시작일 설정</option></select><p class="field-help">직접 설정한 일정은 유지해요. 자동 추천 계산은 아직 연결되지 않았어요.</p></div><div class="form-field" id="focus-date-field" ${draft.focusMode==='manual'?'':'hidden'}><label for="focus-date">집중 복습 시작일</label><input id="focus-date" type="date" value="${draft.focusDate}" ${draft.focusMode==='manual'?'required':''}></div>${dialogFooter(g?'저장':'추가')}</form>`);
  }else if(type==='status'&&(status==='paused'||status==='archived')) {
    const linked=g.materialIds.map(id=>demoMaterials.find(m=>m.id===id)).filter(Boolean);
    const isPause=status==='paused';
    const title=isPause?'시험 일시 중단':'시험 마무리';
    const description=linked.length?(isPause?'시험을 중단한 뒤에도 계속 공부할 자료를 선택해 주세요.':'시험을 마무리한 뒤에도 계속 공부할 자료를 선택해 주세요.'):(isPause?'연결된 학습 자료가 없어요. 시험을 일시 중단할까요?':'연결된 학습 자료가 없어요. 시험을 마무리하고 보관할까요?');
    presentExamDialog(title,`<form data-exam-form="status" data-exam-choices ${isPause?'data-pause-layout':''} data-goal="${safeId}" data-status="${status}">${isPause?'':`<p class="dialog-material-name">${escapeHTML(g.name)}</p>`}<p class="dialog-intro">${isPause?escapeHTML(g.name)+' ':''}${description}</p>${linked.length?`<fieldset class="exam-choice-group"><legend>학습을 계속할 자료</legend><div class="checkbox-list exam-choice-list" tabindex="0" aria-label="학습을 계속할 자료 목록">${linked.map(m=>{
      const otherActive=examState.goals.some(other=>other.id!==g.id&&other.status==='active'&&other.materialIds.includes(m.id));
      const manuallyPaused=examState.materialSettings[m.id]?.manualStatus==='paused';
      return `<label><input type="checkbox" name="continue-material" value="${m.id}"><span>${escapeHTML(m.name)}${manuallyPaused?'<small>직접 중단한 상태는 유지돼요.</small>':otherActive?'<small>다른 진행 중인 시험에 연결되어 있어요.</small>':''}</span></label>`;
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
  if(mode==='edit') {
    const name=$('goal-name').value.trim();
    if(!name){$('goal-name').setCustomValidity('시험 이름을 입력해 주세요.');$('goal-name').reportValidity();$('goal-name').addEventListener('input',()=> $('goal-name').setCustomValidity(''),{once:true});return;}
    const existing=examState.goals.find(g=>g.id===id);
    action={type:'upsert',goal:{...(existing||{id:'exam-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join(''),status:'active',note:'',icon:'target'}),name,date:$('goal-date').value,
      materialIds:Array.from(form.querySelectorAll('[name="goal-material"]:checked'),el=>el.value),
      learningDays:Array.from(form.querySelectorAll('[name="learning-day"]:checked'),el=>Number(el.value)),
      focusMode:$('focus-mode').value,focusDate:$('focus-date').value}};
  }else if(mode==='memo')action={type:'memo',id,note:$('exam-note').value};
  else if(mode==='delete')action={type:'delete',id};
  else if(mode==='status')action={type:'status',id,status:form.dataset.status,continuedMaterialIds:Array.from(form.querySelectorAll('[name="continue-material"]:checked'),el=>el.value)};
  else return;
  if(commitExam(action,mode==='delete'?'시험을 삭제했어요. 학습 기록은 유지됩니다.':'시험 변경 사항을 저장했어요.'))dialog.close();
}

function updateMaterialType(type, selectedUnit) {
  const unitMap = {book:['페이지','챕터'],workbook:['페이지','문제'],lecture:['강','챕터'],vocabulary:['단어','Day'],other:[]};
  const units = unitMap[type];
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

document.addEventListener('click',(event)=>{
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.examDialog) return openExamDialog(button.dataset.examDialog,button.dataset.goal,button.dataset.status);
  if (button.dataset.examPriority) {if(commitExam({type:'priority',id:button.dataset.examPriority},'우선 시험 설정을 저장했어요.')) dialog.close();return;}
  if (button.dataset.materialStatus) {if(commitExam({type:'material-status',id:button.dataset.material,status:button.dataset.materialStatus},'자료 상태를 저장했어요.'))dialog.close();return;}

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
    calendarYear=date.getFullYear();calendarMonth=date.getMonth();return renderCalendar();
  }
  if (button.dataset.day) {
    $('dialog-title').textContent=`${calendarMonth+1}월 ${button.dataset.day}일 기록`;
    const count=Number(button.dataset.dayCount);
    $('dialog-content').innerHTML=count ? `<p class="dialog-intro">화면 확인용 예시 기록 ${count}건입니다.</p>${Array.from({length:count},(_,i)=>`<div class="review-plan-item"><h3>${i%2?'토익 RC 문제집':'컴퓨터 네트워크'}</h3><p>${i%2?'복습 · 31–50페이지':'학습 기록 · 20페이지'}</p></div>`).join('')}` : '<div class="empty-panel"><h3>이날은 기록이 없어요</h3><p>다른 날짜의 기록을 확인해 보세요.</p></div>';
    dialogReturnFocus=button;dialog.showModal();return;
  }
  if (button.dataset.detailTab) {selectInGroup(button,'[data-detail-tab]');return renderDetailTab(button.dataset.detailTab);}
  if (button.closest('[data-choice-group]')) selectInGroup(button,'.choice-button');
});

document.addEventListener('change',(event)=>{
  const target=event.target;
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
  if (!event.target.matches('[data-preview-form]')) return;
  event.preventDefault();
  if ($('review-from') && Number($('review-from').value)>Number($('review-to').value)) {
    $('review-to').setCustomValidity('끝 위치는 시작 위치 이상으로 입력해 주세요.');
    $('review-to').reportValidity();
    $('review-to').addEventListener('input',()=> $('review-to').setCustomValidity(''),{once:true});
    return;
  }
  const destructive = ['reset','delete'].includes(event.target.dataset.action);
  dialog.close();
  notify(destructive?'화면 미리보기이므로 실제 데이터는 삭제하지 않았어요.':'입력 화면 확인을 마쳤어요. 실제 기록 저장은 다음 단계에서 연결해요.');
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

$('archive-count').textContent=demoArchivedMaterials.length;
$('archive-count').setAttribute('aria-label',`보관 자료 ${demoArchivedMaterials.length}개`);
renderReviewSummary();renderExamSummary();
renderHomeWelcome();renderMaterials();renderToday();renderGoals();renderStats();renderCalendar();
showView(location.hash.slice(1)||'home');
if(examLoad.error)notify(examLoad.error);
