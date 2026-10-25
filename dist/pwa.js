/* Relative registration supports GitHub Pages project subdirectories. */
(function(){
 if(!('serviceWorker' in navigator)||!['https:','http:'].includes(location.protocol)||!window.isSecureContext)return;
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register(new URL('service-worker.js',document.baseURI),{scope:'./',updateViaCache:'none'}).then(registration=>{
   registration.addEventListener('updatefound',()=>{
    const worker=registration.installing;
    if(worker)worker.addEventListener('statechange',()=>{
     if(worker.state==='installed'&&navigator.serviceWorker.controller&&typeof notify==='function')notify('업데이트가 준비됐어요. 기록을 저장하고 앱을 완전히 닫았다가 다시 열어 주세요.');
    });
   });
  }).catch(error=>console.warn('Offline app shell unavailable:',error.message));
 });
})();
