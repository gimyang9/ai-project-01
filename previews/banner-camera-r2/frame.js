if(new URLSearchParams(location.search).get('mode')==='proposal'){
 document.body.classList.add('proposed');
 document.getElementById('proposal-style').disabled=false;
}
document.querySelector('#today-list').innerHTML='<div class="today-task"><div class="task-copy"><strong>토익 RC 문제집</strong><small>남은120페이지 · 오늘 권장15페이지</small></div></div><div class="today-task"><div class="task-copy"><strong>컴퓨터 네트워크</strong><small>남은70페이지 · 오늘은 쉬는 날</small></div></div>';
document.querySelector('#home-streak').textContent='오늘도 작은 공부를 기록해요.';
document.querySelectorAll('button,a').forEach(e=>e.addEventListener('click',ev=>ev.preventDefault()));
