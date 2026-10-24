/* Persistent study data. Legacy keys are read only; one v2 envelope commits study and exams atomically. */
(function(root){
  'use strict';
  const KEY='chagok-v2-data-v1', LEGACY_KEY='study-progress-data-v1';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const labels={book:'교재',workbook:'문제집',lecture:'인터넷 강의',vocabulary:'단어 학습',other:'기타'};
  const text=v=>typeof v==='string'&&v.trim().length>0;
  const integer=v=>Number.isSafeInteger(v)&&v>=0;
  const positive=v=>integer(v)&&v>0;
  const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number(v.slice(0,4))>=1000&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
  function check(ok,message='저장 데이터 형식을 확인해 주세요.'){if(!ok)throw Error(message);}
  function sorted(records){return [...records].sort((a,b)=>a.date.localeCompare(b.date)||a.sequence-b.sequence);}
  function calculate(records,total){
    let previous=0;
    return sorted(records).map(r=>{check(integer(r.position)&&r.position<=total&&r.position>=previous,'날짜·순서별 현재 위치가 줄어들거나 전체 분량을 넘을 수 없어요.');const value={...r,amount:r.position-previous};previous=r.position;return value;});
  }
  function validateStudy(input){
    const value=clone(input);check(value&&value.version===1&&Array.isArray(value.materials));
    check(value.app===undefined||value.app==='study-progress');
    const ids=new Set();let max=-1;
    const identify=v=>{check(v&&text(v.id)&&!ids.has(v.id));ids.add(v.id);};
    const record=r=>{identify(r);check(date(r.date)&&integer(r.sequence));max=Math.max(max,r.sequence);if(r.understanding!==undefined)check(['','쉬움','보통','어려움'].includes(r.understanding));};
    for(const m of value.materials){
      identify(m);check(text(m.name)&&Object.hasOwn(labels,m.type)&&text(m.unit)&&positive(m.total)&&positive(m.round));
      check(m.note===undefined||typeof m.note==='string');check(m.targetDate===undefined||m.targetDate===''||date(m.targetDate));
      check(m.archived===undefined||typeof m.archived==='boolean');
      check(Array.isArray(m.records)&&Array.isArray(m.reviews)&&Array.isArray(m.roundHistory)&&m.roundHistory.length===m.round-1);
      m.records.forEach(record);calculate(m.records,m.total);
      m.roundHistory.forEach((h,i)=>{check(h.round===i+1&&positive(h.total)&&text(h.unit)&&date(h.completedDate)&&Array.isArray(h.records));h.records.forEach(record);check(calculate(h.records,h.total).at(-1)?.position===h.total);});
      m.reviews.forEach(r=>{record(r);check(positive(r.total)&&text(r.unit)&&positive(r.start)&&positive(r.end)&&r.start<=r.end&&r.end<=r.total);});
    }
    check(value.recordSequence===undefined||integer(value.recordSequence));
    value.recordSequence=Math.max(value.recordSequence||0,max+1);return value;
  }
  const emptyStudy=()=>({version:1,materials:[],recordSequence:0});
  const emptyExams=()=>({app:'chagok-preview-exams',version:2,goals:[],priorityGoalId:null,materialSettings:{}});
  function normalize(study,exams,api){
    const state=api.reconcile(exams);
    for(const m of study.materials){
      if(!Object.hasOwn(state.materialSettings,m.id))Object.defineProperty(state.materialSettings,m.id,{value:{manualStatus:m.archived?'archived':'active',autoPausedBy:[]},enumerable:true,writable:true,configurable:true});
      if(m.archived)state.materialSettings[m.id].manualStatus='archived';
    }
    return api.reconcile(state);
  }
  function validate(input,api){
    check(input?.app==='chagok-v2'&&input.version===1);
    const result=clone(input);result.study=validateStudy(result.study);result.exams=normalize(result.study,api.validate(result.exams),api);return result;
  }
  const envelope=(study,exams)=>({app:'chagok-v2',version:1,study,exams});
  function load(storage,api){
    try{
      const raw=storage.getItem(KEY);
      if(raw!==null)return {state:validate(JSON.parse(raw),api),writable:true,migrated:false};
      const legacyRaw=storage.getItem(LEGACY_KEY),examRaw=storage.getItem(api.KEY);
      const study=legacyRaw===null?emptyStudy():validateStudy(JSON.parse(legacyRaw));
      const exams=examRaw===null?emptyExams():api.upgrade(JSON.parse(examRaw));
      const next=validate(envelope(study,exams),api);
      // Commit only after every source validates; originals remain byte-for-byte unchanged.
      storage.setItem(KEY,JSON.stringify(next));
      return {state:next,writable:true,migrated:legacyRaw!==null};
    }catch(error){return {state:envelope(emptyStudy(),emptyExams()),writable:false,error:'저장 데이터를 읽거나 전환하지 못했어요. 기존 데이터 보호를 위해 변경을 중단했습니다.',detail:error.message};}
  }
  function save(storage,state,api){const safe=validate(state,api);storage.setItem(KEY,JSON.stringify(safe));return safe;}
  function recover(storage,state,api){
    const safe=validate(state,api);
    // Explicit restore/reset recovery: preserve unreadable/future sources before replacing v2.
    const original={v2:storage.getItem(KEY),legacy:storage.getItem(LEGACY_KEY),exams:storage.getItem(api.KEY)};
    let index=0;while(storage.getItem(KEY+'.before-recovery.'+index)!==null)index++;
    storage.setItem(KEY+'.before-recovery.'+index,JSON.stringify(original));
    return save(storage,safe,api);
  }
  function project(m){const records=calculate(m.records,m.total);return {...m,typeKey:m.type,type:labels[m.type],current:records.at(-1)?.position||0,records,note:m.note||'',category:m.category||'exam',plant:m.plant||'tree',targetDate:m.targetDate||''};}
  function update(input,action,api){
    const next=validate(input,api),s=next.study;let m=s.materials.find(m=>m.id===action.id);
    if(action.type==='material'){
      const draft=clone(action.material);check(text(draft.id));m=s.materials.find(m=>m.id===draft.id);
      if(m){check(draft.unit===m.unit||(!m.records.length&&!m.reviews.length&&!m.roundHistory.length),'기록이 있는 자료의 단위는 바꿀 수 없어요. 기존 범위와 단위를 보존합니다.');Object.assign(m,draft);}
      else {m={...draft,round:1,records:[],reviews:[],roundHistory:[],note:'',archived:false};s.materials.push(m);}
      if(action.goalIds){check(Array.isArray(action.goalIds)&&action.goalIds.every(id=>next.exams.goals.some(g=>g.id===id)));for(const g of next.exams.goals)g.materialIds=[...g.materialIds.filter(id=>id!==m.id),...(action.goalIds.includes(g.id)?[m.id]:[])];}
    }else{
      check(m,'자료를 찾을 수 없어요.');
      if(action.type==='note')m.note=action.note;
      else if(action.type==='archive'){
        const settings=next.exams.materialSettings[m.id];
        if(action.archived&&!m.archived)m.beforeArchiveStatus=settings.manualStatus;
        m.archived=action.archived;settings.manualStatus=action.archived?'archived':m.beforeArchiveStatus==='paused'?'paused':'active';
      }
      else if(action.type==='delete'){
        s.materials=s.materials.filter(item=>item.id!==m.id);delete next.exams.materialSettings[m.id];
        for(const g of next.exams.goals){g.materialIds=g.materialIds.filter(id=>id!==m.id);g.continuedMaterialIds=g.continuedMaterialIds.filter(id=>id!==m.id);}
      }else if(action.type==='next-round'){
        check(project(m).current===m.total,'전체 진도를 완료한 뒤 다음 회독을 시작할 수 있어요.');
        m.roundHistory.push({round:m.round,total:m.total,unit:m.unit,completedDate:sorted(m.records).at(-1).date,records:clone(m.records)});m.round++;m.records=[];
      }else if(['record','review','delete-record','delete-review'].includes(action.type)){
        const review=action.type.includes('review'),list=review?'reviews':'records';
        if(action.type.startsWith('delete-')){check(m[list].some(r=>r.id===action.recordId),'기록을 찾을 수 없어요.');m[list]=m[list].filter(r=>r.id!==action.recordId);}
        else{
          const draft=clone(action.record),existing=m[list].find(r=>r.id===draft.id);
          check(date(draft.date)&&draft.date<=(action.today||new Date().toISOString().slice(0,10)),'오늘 또는 이전 날짜를 입력해 주세요.');
          const r={...existing,...draft,sequence:existing?.sequence??s.recordSequence++,createdAt:existing?.createdAt||new Date().toISOString()};
          if(review){r.total=existing?.total??m.total;r.unit=existing?.unit??m.unit;}
          else{r.unit=existing?.unit??m.unit;r.total=existing?.total??m.total;}
          if(existing)m[list]=m[list].map(item=>item.id===r.id?r:item);else m[list].push(r);
        }
        if(!review){m.records=calculate(m.records,m.total);m.current=m.records.at(-1)?.position||0;}
      }else throw Error('지원하지 않는 작업이에요.');
    }
    return validate(next,api);
  }
  function backup(state,api){return {app:'chagok-v2',backupVersion:1,createdAt:new Date().toISOString(),data:validate(state,api)};}
  function restore(input,current,api){
    if(input?.app==='chagok-v2'){check(input.backupVersion===1&&typeof input.createdAt==='string'&&!Number.isNaN(Date.parse(input.createdAt)));return validate(input.data,api);}
    check(input?.app==='study-progress');let study;
    if(input.backupVersion===1){check(typeof input.createdAt==='string'&&!Number.isNaN(Date.parse(input.createdAt)));study=validateStudy(input.data);}
    else {check(input.backupVersion===undefined&&typeof input.exportedAt==='string'&&!Number.isNaN(Date.parse(input.exportedAt)));study=validateStudy(input);}
    // Legacy files have no exams: retain current exam data explicitly, with original IDs.
    return validate({...current,study},api);
  }
  const api={KEY,LEGACY_KEY,labels,date,calculate,sorted,validateStudy,validate,emptyStudy,emptyExams,envelope,load,save,recover,project,update,backup,restore};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudyData=api;
})(typeof window==='undefined'?this:window);
