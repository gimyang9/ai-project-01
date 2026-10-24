/* Pure derived plans: never rewrite original study, review, exam or manual settings. */
(function(root){
  'use strict';
  const DAY=86400000;
  const epoch=date=>Math.floor(Date.parse(date+'T00:00:00Z')/DAY);
  const diff=(a,b)=>epoch(a)-epoch(b);
  function shift(date,days){
    const time=(epoch(date)+days)*DAY;
    if(!Number.isFinite(time)||time>Date.parse('9999-12-31T00:00:00Z')||time<Date.parse('1000-01-01T00:00:00Z'))return null;
    return new Date(time).toISOString().slice(0,10);
  }
  const weekday=date=>(new Date(date+'T00:00:00Z').getUTCDay()+6)%7;
  const allowed=(date,goal)=>!goal||(goal.learningDays.includes(weekday(date))&&!(goal.daysOff||[]).includes(date));
  function availableDays(start,end,goal){
    if(!end||end<start)return 0;
    const length=diff(end,start)+1;
    if(!goal)return length;
    const days=[...new Set(goal.learningDays)];let count=Math.floor(length/7)*days.length;
    for(let i=0;i<length%7;i++)if(days.includes((weekday(start)+i)%7))count++;
    for(const day of new Set(goal.daysOff||[]))if(day>=start&&day<=end&&days.includes(weekday(day)))count--;
    return Math.max(0,count);
  }
  function studyRows(material,study){
    const rows=study.calculate(material.records,material.total).map(r=>({...r,unit:r.unit||material.unit}));
    for(const round of material.roundHistory)rows.push(...study.calculate(round.records,round.total).map(r=>({...r,unit:r.unit||round.unit})));
    return rows;
  }
  function estimate(material,today,study){
    const remaining=Math.max(0,material.total-study.project(material).current);
    const rows=studyRows(material,study).filter(r=>r.date<=today);
    const first=rows.map(r=>r.date).sort()[0]||null;
    const span=first?diff(today,first)+1:0;
    const window=span>=28?28:span>=14?14:span>=7?7:0;
    const result={span,window,firstDate:first,recentAmount:0,speed:null,date:null,reason:remaining===0?'completed':'insufficient'};
    if(remaining===0){result.date=today;return result;}
    if(!window)return result;
    const from=shift(today,1-window);
    result.recentAmount=rows.filter(r=>r.date>=from&&r.unit===material.unit).reduce((sum,r)=>sum+r.amount,0);
    result.speed=result.recentAmount/window;
    if(result.recentAmount<=0){result.reason='no-recent-study';return result;}
    const days=Math.ceil(remaining/result.speed);
    result.date=shift(today,days);result.reason=result.date?'estimated':'out-of-range';
    return result;
  }
  function build(state,today,study,exam){
    if(!study.date(today))throw Error('계산 기준 날짜를 확인해 주세요.');
    const ordered=exam.orderedGoals(state.exams).filter(g=>g.status==='active');
    const rank=new Map();ordered.forEach((g,i)=>g.materialIds.forEach(id=>{if(!rank.has(id))rank.set(id,i);}));
    return state.study.materials.filter(m=>!m.archived).map(material=>{
      const m=study.project(material),linked=ordered.filter(g=>g.materialIds.includes(m.id));
      const dated=linked.filter(g=>g.date).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
      const goal=dated[0]||linked[0]||null;
      const target=m.targetDate||'';
      const end=target||(goal?.date?shift(goal.date,-1):null);
      const remaining=Math.max(0,m.total-m.current),days=availableDays(today,end,goal);
      const isActive=exam.materialStatus(state.exams,m.id)==='active';
      const todayAllowed=allowed(today,goal);
      const required=remaining&&days?Math.ceil(remaining/days):null;
      const manual=Number.isSafeInteger(m.manualDailyAmount)&&m.manualDailyAmount>0?m.manualDailyAmount:null;
      const todayDone=study.calculate(material.records,material.total).filter(r=>r.date===today).reduce((sum,r)=>sum+r.amount,0);
      const amount=!isActive||!remaining||!todayAllowed?0:manual?Math.min(remaining,Math.max(0,manual-todayDone)):required;
      const forecast=estimate(material,today,study);
      return {id:m.id,remaining,goalId:goal?.id||null,goalName:goal?.name||'',deadline:end,deadlineSource:target?'material':goal?.date?'exam':null,availableDays:days,todayAllowed,isActive,requiredDaily:required,manualDailyAmount:manual,todayDone,amount,rank:rank.get(m.id)??Infinity,forecast,
        noTime:!!remaining&&!!end&&days===0,
        overdue:!!remaining&&!!end&&end<today,
        manualShortfall:manual&&end?Math.max(0,remaining-Math.max(0,days*manual-(todayAllowed?Math.min(todayDone,manual):0))):0,
        expectedLate:!!forecast.date&&!!end&&forecast.date>end};
    }).sort((a,b)=>a.rank-b.rank||(a.deadline||'9999-12-31').localeCompare(b.deadline||'9999-12-31')||a.id.localeCompare(b.id));
  }
  const api={shift,diff,weekday,allowed,availableDays,studyRows,estimate,build};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LearningPlan=api;
})(typeof window==='undefined'?this:window);
