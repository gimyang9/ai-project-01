/* Derived review schedules: original records, progress and rounds are never rewritten. */
(function(root){
  'use strict';
  const POLICY=Object.freeze({
    first:Object.freeze({'어려움':1,'보통':3,'쉬움':7}),
    multiplier:Object.freeze({'어려움':0.5,'보통':1.5,'쉬움':2}),
    minInterval:1,maxInterval:180,initialFraction:0.1,bufferFraction:0.2,minBuffer:1,maxBuffer:7
  });
  const amount=rows=>rows.reduce((n,r)=>n+r.end-r.start+1,0);
  function union(rows){
    const result=[];
    for(const r of rows.filter(r=>r.start<=r.end).map(r=>({start:r.start,end:r.end})).sort((a,b)=>a.start-b.start||a.end-b.end)){
      const last=result.at(-1);
      if(last&&r.start<=last.end+1)last.end=Math.max(last.end,r.end);else result.push(r);
    }
    return result;
  }
  function intersect(rows,start,end){return rows.map(r=>({start:Math.max(start,r.start),end:Math.min(end,r.end)})).filter(r=>r.start<=r.end);}
  function interval(previous,understanding){
    const label=understanding||'보통';
    const n=previous?previous*POLICY.multiplier[label]:POLICY.first[label];
    return Math.max(POLICY.minInterval,Math.min(POLICY.maxInterval,Math.round(n)));
  }
  // Re-split only touched ranges. Untouched segment values and original input remain intact.
  function overlay(rows,event,learning){
    const points=[...new Set([...rows.flatMap(r=>[r.start,r.end+1]),event.start,event.end+1])].sort((a,b)=>a-b);
    const next=[];
    for(let i=0;i<points.length-1;i++){
      const start=points[i],end=points[i+1]-1,old=rows.find(r=>r.start<=start&&r.end>=end);
      const touched=start>=event.start&&end<=event.end;
      if(!old&&!touched)continue;
      if(!touched){next.push({...old,start,end});continue;}
      const days=interval(old?.interval,event.understanding);
      next.push({start,end,interval:days,understanding:event.understanding||'',lastDate:event.date,lastRecordId:event.id,
        dueDate:learning.shift(event.date,days),lastReviewDate:event.kind==='review'?event.date:old?.lastReviewDate||null,
        successStreak:event.kind==='review'?(event.understanding==='어려움'?0:(old?.successStreak||0)+1):old?.successStreak||0});
    }
    return next;
  }
  function derive(material,today,study,learning){
    const events=[];let index=0;
    for(const round of [...material.roundHistory,{records:material.records,total:material.total,unit:material.unit}]){
      for(const r of study.calculate(round.records,round.total)){
        if(r.date<=today&&(r.unit||round.unit)===material.unit&&r.amount>0)
          events.push({...r,kind:'study',start:r.position-r.amount+1,end:Math.min(r.position,material.total),order:index++});
      }
    }
    for(const r of material.reviews)if(r.date<=today&&r.unit===material.unit)events.push({...r,kind:'review',end:Math.min(r.end,material.total),order:index++});
    events.sort((a,b)=>a.date.localeCompare(b.date)||a.sequence-b.sequence||(a.createdAt||'').localeCompare(b.createdAt||'')||a.order-b.order);
    let segments=[],learned=[];const reviews=[];
    for(const event of events){
      if(event.kind==='study'){
        if(event.start>event.end)continue;
        learned=union([...learned,event]);segments=overlay(segments,event,learning);
      }else{
        for(const range of intersect(learned,event.start,event.end)){
          const applied={...event,...range};reviews.push(applied);segments=overlay(segments,applied,learning);
        }
      }
    }
    // Manual dates persist separately; a real later review consumes them only for its own range.
    for(const schedule of material.reviewSettings?.schedules||[]){
      if(schedule.unit!==material.unit)continue;
      const points=[...new Set(segments.flatMap(r=>[r.start,r.end+1]).concat([schedule.start,schedule.end+1],reviews.flatMap(r=>[r.start,r.end+1])))].sort((a,b)=>a-b);
      const next=[];
      for(let i=0;i<points.length-1;i++){
        const start=points[i],end=points[i+1]-1,old=segments.find(r=>r.start<=start&&r.end>=end);if(!old)continue;
        const touched=start>=schedule.start&&end<=schedule.end;
        const consumed=reviews.some(r=>r.start<=start&&r.end>=end&&r.sequence>=schedule.afterSequence&&r.date>=schedule.setDate);
        next.push(touched&&!consumed?{...old,start,end,dueDate:schedule.date,manual:true}:{...old,start,end});
      }
      segments=next;
    }
    return {segments,reviews,learned};
  }
  function currentLearned(material,today,study){return study.calculate(material.records,material.total).filter(r=>r.date<=today).at(-1)?.position||0;}
  function shortage(rows,today,end,start,goal,daily,todayDone,learning){
    const begin=start&&start>today?start:today,groups=new Map();
    for(const r of rows){const release=r.manual&&r.dueDate>begin?r.dueDate:begin;groups.set(release,(groups.get(release)||0)+r.end-r.start+1);}
    let volume=0,missing=0;
    for(const release of [...groups.keys()].sort().reverse()){
      volume+=groups.get(release);
      const capacity=Math.max(0,Math.floor(learning.availableDays(release,end,goal)*daily-(release<=today&&learning.allowed(today,goal)?Math.min(todayDone,daily):0)));
      missing=Math.max(missing,volume-capacity);
    }
    return Math.max(0,missing);
  }
  function speed(material,today,derived,study,learning){
    const manual=material.reviewSettings?.dailyAmount;
    const first=derived.reviews.map(r=>r.date).sort()[0]||null,span=first?learning.diff(today,first)+1:0;
    const window=span>=28?28:span>=14?14:span>=7?7:0;
    const from=window?learning.shift(today,1-window):null;
    const days=new Map();
    for(const r of derived.reviews)if(from&&r.date>=from){if(!days.has(r.date))days.set(r.date,[]);days.get(r.date).push(r);}
    const recentAmount=[...days.values()].reduce((n,rows)=>n+amount(union(rows)),0);
    const learned=currentLearned(material,today,study);
    if(manual)return {amount:manual,reason:'manual',span,window,recentAmount};
    if(!window)return {amount:learned?Math.max(1,Math.ceil(learned*POLICY.initialFraction)):null,reason:learned?'initial':'no-study',span,window,recentAmount};
    return {amount:recentAmount?recentAmount/window:null,reason:recentAmount?'estimated':'no-recent-review',span,window,recentAmount};
  }
  function backwardStart(examDate,days,goal,learning){
    const end=learning.shift(examDate,-1),earliest='1000-01-01';
    if(!end||!days||learning.availableDays(earliest,end,goal)<days)return null;
    let lo=0,hi=learning.diff(end,earliest);
    while(lo<hi){const mid=Math.floor((lo+hi)/2);if(learning.availableDays(learning.shift(end,-mid),end,goal)>=days)hi=mid;else lo=mid+1;}
    return learning.shift(end,-lo);
  }
  function priority(a,b){return (b.understanding==='어려움')-(a.understanding==='어려움')||a.lastDate.localeCompare(b.lastDate)||a.start-b.start;}
  function pick(rows,limit){
    const result=[];let left=Math.max(0,limit);
    for(const r of [...rows].sort(priority)){if(!left)break;const n=Math.min(left,r.end-r.start+1);result.push({...r,end:r.start+n-1});left-=n;}
    return result;
  }
  function focus(material,derived,state,today,study,exam,learning){
    const goals=exam.orderedGoals(state.exams).filter(g=>g.status==='active'&&g.date&&g.date>=today&&g.materialIds.includes(material.id)).sort((a,b)=>a.date.localeCompare(b.date));
    const goal=goals[0];if(!goal)return null;
    const current=currentLearned(material,today,study),targets=derived.segments.flatMap(r=>intersect([r],1,current).map(range=>({...r,...range})));
    const total=amount(targets),rate=speed(material,today,derived,study,learning);
    const needed=total&&rate.amount?Math.ceil(total/rate.amount):0;
    const buffer=needed?Math.min(POLICY.maxBuffer,Math.max(POLICY.minBuffer,Math.ceil(needed*POLICY.bufferFraction))):0;
    const automaticStart=needed?backwardStart(goal.date,needed+buffer,goal,learning):null;
    const start=goal.focusMode==='manual'?goal.focusDate:automaticStart;
    const effectiveStart=start&&start<today?today:start;
    const remainingRows=targets.filter(r=>!start||!r.lastReviewDate||r.lastReviewDate<start);
    const remaining=amount(remainingRows),todayDone=amount(union(derived.reviews.filter(r=>r.date===today).flatMap(r=>intersect([r],1,current))));
    const end=learning.shift(goal.date,-1),daysLeft=learning.availableDays(today>start?today:start||today,end,goal);
    const todayAllowed=learning.allowed(today,goal),started=!!start&&today>=start&&today<goal.date;
    const daily=rate.amount?Math.ceil(rate.amount):0;
    const requested=started&&todayAllowed?Math.max(0,daily-todayDone):0;
    return {goalId:goal.id,goalName:goal.name,examDate:goal.date,startDate:start,automaticStart,effectiveStart,
      speed:rate,total,remaining,neededDays:needed,bufferDays:buffer,daysLeft,todayDone,todayAllowed,started,
      shortfall:rate.amount?shortage(remainingRows,today,end,start,goal,rate.amount,todayDone,learning):null,
      reason:!total?'no-study':!rate.amount?rate.reason:!start?'no-days':start>=goal.date?'invalid-start':'planned',
      recommendations:pick(remainingRows.filter(r=>!r.manual||r.dueDate<=today),requested)};
  }
  function mergedToday(normal,extra,materialId,today){
    const points=[...new Set([...normal,...extra].flatMap(r=>[r.start,r.end+1]))].sort((a,b)=>a-b),result=[];
    for(let i=0;i<points.length-1;i++){
      const start=points[i],end=points[i+1]-1,n=normal.find(r=>r.start<=start&&r.end>=end),f=extra.find(r=>r.start<=start&&r.end>=end);
      if(!n&&!f)continue;
      const sources=[...(n?['regular']:[]),...(f?['focus']:[])],status=n?.dueDate<today?'복습 지연':f?'시험 전 복습':'복습 예정';
      const r={...(n||f),materialId,start,end,sources,status};
      const last=result.at(-1);
      if(last&&last.end+1===start&&last.status===status&&last.sources.join()===sources.join()&&last.dueDate===r.dueDate&&last.understanding===r.understanding)last.end=end;
      else result.push(r);
    }
    return result;
  }
  function build(state,today,study,exam,learning){
    if(!study.date(today))throw Error('복습 계산 날짜를 확인해 주세요.');
    const materials=state.study.materials.filter(m=>!m.archived&&exam.materialStatus(state.exams,m.id)==='active').map(m=>{
      const derived=derive(m,today,study,learning),plan=focus(m,derived,state,today,study,exam,learning);
      const normal=derived.segments.filter(r=>r.dueDate&&r.dueDate<=today);
      return {id:m.id,segments:derived.segments,focus:plan,speed:speed(m,today,derived,study,learning),today:mergedToday(normal,plan?.recommendations||[],m.id,today)};
    });
    return {materials,today:materials.flatMap(m=>m.today).sort(priority)};
  }
  const api={POLICY,union,amount,interval,derive,speed,backwardStart,priority,pick,focus,mergedToday,build,currentLearned,shortage};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ReviewPlan=api;
})(typeof window==='undefined'?this:window);
