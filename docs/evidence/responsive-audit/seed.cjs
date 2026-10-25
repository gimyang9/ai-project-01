const D=require('../../../dist/study-data.js'),E=require('../../../dist/exam-management.js');
let s=D.envelope(D.emptyStudy(),D.emptyExams());
const update=a=>{s=D.update(s,{today:'2026-10-26',...a},E)};
const names=['토익 RC 문제집','컴퓨터 네트워크 핵심 개념 정리와 실전 문제 풀이 · 개정판 학습 자료','VeryLongMaterialNameWithoutSpaces'.repeat(3),'토익 RC 강의','정보처리기사 필기 기출문제','영어 단어장'];
for(let i=0;i<18;i++){const id='m'+i;update({type:'material',material:{id,name:names[i%6]+(i>5?' '+i:''),type:i%3===0?'lecture':'book',unit:i%3===0?'강':'페이지',total:i%3===0?25:300,targetDate:i%2?'2026-11-12':''}});
 for(let n=0;n<4;n++)update({type:'record',id,record:{id:'r'+i+'-'+n,date:['2026-09-01','2026-09-14','2026-10-10','2026-10-25'][n],position:(n+1)*(i%3===0?3:40),understanding:n%2?'보통':'어려움'}});
 update({type:'review',id,record:{id:'v'+i,date:'2026-10-20',start:1,end:8,understanding:'어려움'}});
 if(i>=6)update({type:'archive',id,archived:true});
}
for(let i=0;i<5;i++){s.exams=E.update(s.exams,{type:'upsert',goal:{id:'g'+i,name:i===1?'정보처리기사 실기 · 컴퓨터 네트워크 및 데이터베이스 핵심 개념 최종 실전 시험 대비 과정':'정보처리기사 '+(i+1),date:i===2?'':'2026-11-'+(10+i),status:i===3?'paused':i===4?'archived':'active',note:'테스트 메모',materialIds:['m0','m1','m2','m3','m4','m5'],learningDays:[0,1,2,3,4,5,6],daysOff:[],focusMode:'auto',focusDate:'',continuedMaterialIds:[]}});}
module.exports=D.validate(s,E);