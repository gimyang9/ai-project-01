/* One modest, date-relative virtual study history. Never reads browser storage. */
(function(root){
'use strict';
function create(today,D,E,L){
 let state=D.envelope(D.emptyStudy(),D.emptyExams());
 const day=n=>L.shift(today,n),apply=a=>{state=D.update(state,{today,...a},E);};
 const specs=[['wood-book','컴퓨터 네트워크','book','페이지',240,120],['past-paper','정보처리기사 기출','workbook','문제',120,120],['lecture','토익 RC 강의','lecture','강',40,24],['english','영어 독해','book','페이지',160,60],['paused','한국사 개념 정리','workbook','문제',100,36],['finished','기초 문법 완주','book','페이지',80,80],['algorithm','알고리즘 연습','workbook','문제',90,48]];
 for(const [id,name,type,unit,total,current]of specs){
  apply({type:'material',material:{id,name,type,unit,total}});
  if(id==='wood-book'){
   for(let i=1;i<=6;i++)apply({type:'record',id,record:{id:id+'-old-'+i,date:day(-170+i*8),position:i*40,understanding:['쉬움','보통','어려움'][i%3]}});
   apply({type:'next-round',id});
  }
  for(let i=1;i<=12;i++)apply({type:'record',id,record:{id:id+'-r-'+i,date:day(-144+i*11),position:Math.floor(current*i/12),understanding:['보통','쉬움','어려움'][i%3]}});
  for(let i=0;i<5;i++)apply({type:'review',id,record:{id:id+'-v-'+i,date:day(-58+i*13),start:1+i,end:Math.min(current,Math.max(6,Math.floor(current/4))+i),understanding:['쉬움','보통','어려움'][i%3]}});
 }
 apply({type:'archive',id:'finished',archived:true});
 apply({type:'record',id:'algorithm',record:{id:'today-study',date:today,position:52,understanding:'보통'}});
 apply({type:'review',id:'wood-book',record:{id:'recent-review',date:day(-1),start:1,end:12,understanding:'어려움'}});
 apply({type:'review-date',id:'lecture',start:1,end:4,date:day(3)});
 const goals=[
  {id:'near-exam',name:'정보처리기사 필기',date:day(5),status:'active',materialIds:['wood-book','past-paper','algorithm']},
  {id:'english-exam',name:'토익 정기시험',date:day(30),status:'active',materialIds:['lecture','english']},
  {id:'paused-exam',name:'한국사능력검정',date:day(45),status:'paused',materialIds:['paused']}
 ];
 for(const g of goals)state.exams=E.update(state.exams,{type:'upsert',goal:{note:'',learningDays:[0,1,2,3,4,5],daysOff:[day(2)],focusMode:'auto',focusDate:'',continuedMaterialIds:[],...g}});
 return D.validate(state,E);
}
const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VirtualStudyData=api;
})(typeof window==='undefined'?this:window);
