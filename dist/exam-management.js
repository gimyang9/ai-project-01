/* Exam management is isolated from study records and legacy storage. */
(function(root){
  'use strict';
  const KEY='chagok-v2-preview-exams-v1';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const validDate=value=>value==='' || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0,4))>=1000 && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value);
  function validate(value){
    if(!value || value.app!=='chagok-preview-exams' || ![1,2].includes(value.version) || !Array.isArray(value.goals) || !value.materialSettings || typeof value.materialSettings!=='object' || Array.isArray(value.materialSettings)) throw Error('지원하지 않는 시험 저장 형식이에요.');
    const ids=new Set();
    for(const g of value.goals){
      if(!g || typeof g.id!=='string' || !g.id || ids.has(g.id) || typeof g.name!=='string' || !g.name.trim() || !validDate(g.date) || !['active','paused','archived'].includes(g.status) || typeof g.note!=='string' || !Array.isArray(g.materialIds) || !g.materialIds.every(id=>typeof id==='string') || new Set(g.materialIds).size!==g.materialIds.length || !Array.isArray(g.learningDays) || !g.learningDays.every(day=>Number.isInteger(day)&&day>=0&&day<=6) || !['auto','manual'].includes(g.focusMode) || !validDate(g.focusDate) || (g.focusMode==='manual'&&!g.focusDate)) throw Error('시험 데이터 구조를 확인해 주세요.');
      if(value.version===2&&(!Array.isArray(g.continuedMaterialIds)||!g.continuedMaterialIds.every(id=>typeof id==='string')||new Set(g.continuedMaterialIds).size!==g.continuedMaterialIds.length))throw Error('학습 유지 선택을 확인해 주세요.');
      if(g.daysOff!==undefined&&(!Array.isArray(g.daysOff)||!g.daysOff.every(d=>d!==''&&validDate(d))||new Set(g.daysOff).size!==g.daysOff.length))throw Error('쉬는 날짜를 확인해 주세요.');
      ids.add(g.id);
    }
    for(const m of Object.values(value.materialSettings)) if(!m || !['active','paused','archived'].includes(m.manualStatus) || (value.version===1&&typeof m.independent!=='boolean') || !Array.isArray(m.autoPausedBy) || !m.autoPausedBy.every(id=>typeof id==='string')) throw Error('자료 상태를 확인해 주세요.');
    if(value.priorityGoalId!==null && !value.goals.some(g=>g.id===value.priorityGoalId&&g.status==='active')) throw Error('우선 시험 상태를 확인해 주세요.');
    return copy(value);
  }
  function upgrade(value){
    const state=validate(value);
    if(state.version===2)return state;
    // Preserve old current behavior. These are per-exam snapshots, never future defaults.
    for(const g of state.goals)g.continuedMaterialIds=g.status==='archived'?[...g.materialIds]:g.status==='paused'?g.materialIds.filter(id=>state.materialSettings[id]?.independent):[];
    for(const m of Object.values(state.materialSettings)){
      m.legacyIndependent=m.independent;
      delete m.independent;
    }
    state.version=2;
    return validate(state);
  }
  function reconcile(value){
    const state=upgrade(value);
    for(const g of state.goals){
      g.continuedMaterialIds=g.status==='active'?[]:g.continuedMaterialIds.filter(id=>g.materialIds.includes(id));
      for(const id of g.materialIds)if(!Object.hasOwn(state.materialSettings,id))Object.defineProperty(state.materialSettings,id,{value:{manualStatus:'active',autoPausedBy:[]},enumerable:true,writable:true,configurable:true});
    }
    for(const [id,m] of Object.entries(state.materialSettings)){
      const linked=state.goals.filter(g=>g.materialIds.includes(id));
      const hasActive=linked.some(g=>g.status==='active');
      const kept=linked.some(g=>g.status!=='active'&&g.continuedMaterialIds.includes(id));
      m.autoPausedBy=m.manualStatus==='active'&&!hasActive&&!kept ? linked.filter(g=>g.status!=='active').map(g=>g.id) : [];
    }
    if(!state.goals.some(g=>g.id===state.priorityGoalId&&g.status==='active')) state.priorityGoalId=null;
    return state;
  }
  const materialStatus=(state,id)=>{const m=state.materialSettings[id];return !m?'active':m.manualStatus!=='active'?m.manualStatus:m.autoPausedBy.length?'paused':'active';};
  function update(state,action){
    const next=reconcile(state);const g=next.goals.find(item=>item.id===action.id);
    if(action.type==='upsert'){
      const draft=copy(action.goal); const existing=next.goals.findIndex(item=>item.id===draft.id);
      if(existing<0&&!draft.continuedMaterialIds)draft.continuedMaterialIds=[];
      if(existing<0)next.goals.push(draft);else next.goals[existing]={...next.goals[existing],...draft};
    }else if(action.type==='material-status'){
      if(!next.materialSettings[action.id])throw Error('자료를 찾을 수 없어요.');
      next.materialSettings[action.id].manualStatus=action.status;
    }else{
      if(!g)throw Error('시험을 찾을 수 없어요.');
      if(action.type==='resit'){
        const draft=copy(action.goal);
        if(!draft||next.goals.some(item=>item.id===draft.id)||!Array.isArray(draft.materialIds)||!draft.materialIds.every(id=>g.materialIds.includes(id)))throw Error('재응시 자료와 새 시험을 확인해 주세요.');
        next.goals.push({...draft,status:'active',sourceGoalId:g.id,continuedMaterialIds:[]});
      }else if(action.type==='priority'){
        if(g.status!=='active')throw Error('진행 중인 시험만 우선 지정할 수 있어요.');
        next.priorityGoalId=next.priorityGoalId===g.id?null:g.id;
      }else if(action.type==='status'){
        g.status=action.status;
        const kept=action.continuedMaterialIds??[];
        if(!Array.isArray(kept)||!kept.every(id=>g.materialIds.includes(id)))throw Error('연결된 자료만 선택할 수 있어요.');
        g.continuedMaterialIds=g.status==='active'?[]:[...new Set(kept)];
      }
      else if(action.type==='memo')g.note=action.note;
      else if(action.type==='delete')next.goals=next.goals.filter(item=>item.id!==g.id);
      else throw Error('지원하지 않는 작업이에요.');
    }
    if(!next.goals.some(g=>g.id===next.priorityGoalId&&g.status==='active'))next.priorityGoalId=null;
    return validate(reconcile(next));
  }
  function load(storage,initial){
    try{const raw=storage.getItem(KEY);return {state:raw===null?validate(reconcile(initial)):validate(reconcile(validate(JSON.parse(raw)))),writable:true,error:null};}
    catch(error){return {state:validate(reconcile(initial)),writable:false,error:'저장된 시험을 읽을 수 없어 변경을 중단했어요. 기존 데이터는 유지됩니다.'};}
  }
  function save(storage,state){
    const safe=validate(reconcile(state));
    const raw=storage.getItem(KEY);
    if(raw!==null){
      const previous=validate(JSON.parse(raw));
      if(previous.version===1&&storage.getItem(KEY+'.before-choice-v2')===null)storage.setItem(KEY+'.before-choice-v2',raw);
    }
    storage.setItem(KEY,JSON.stringify(safe));return safe;
  }
  function dayDifference(date,today){if(!date)return null;return Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);}
  function orderedGoals(state){return [...state.goals].sort((a,b)=>(b.id===state.priorityGoalId)-(a.id===state.priorityGoalId)||['active','paused','archived'].indexOf(a.status)-['active','paused','archived'].indexOf(b.status)||(a.date||'9999-12-31').localeCompare(b.date||'9999-12-31')||a.id.localeCompare(b.id));}
  const api={KEY,validate,upgrade,reconcile,materialStatus,update,load,save,dayDifference,orderedGoals};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ExamManagement=api;
})(typeof window==='undefined'?this:window);
