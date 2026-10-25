/* Same-origin save serialization plus stale-snapshot detection. No data merging. */
(function(root){
 'use strict';
 function create(storage,key,locks){
  let baseline=storage.getItem(key),conflicted=false,busy=false;
  const error=code=>Object.assign(new Error(code),{code});
  function check(){if(conflicted||storage.getItem(key)!==baseline){conflicted=true;throw error('CHAGOK_CONFLICT');}}
  function observe(event){
   if(event.storageArea&&event.storageArea!==storage)return false;
   if((event.key===key||event.key===null)&&(storage.getItem(key)!==baseline||(event.key===key&&event.newValue!==undefined&&event.newValue!==baseline)))conflicted=true;
   return conflicted;
  }
  function run(write){
   check();if(busy)throw error('CHAGOK_SAVE_BUSY');busy=true;
   const perform=()=>{check();const value=write();baseline=storage.getItem(key);return value;};
   if(locks?.request){
    return locks.request('chagok-save:'+key,{mode:'exclusive',ifAvailable:true},lock=>{
     if(!lock)throw error('CHAGOK_SAVE_BUSY');return perform();
    }).finally(()=>{busy=false;});
   }
   try{return perform();}finally{busy=false;}
  }
  return {run,observe,get conflicted(){return conflicted;},get busy(){return busy;}};
 }
 const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StorageGuard=api;
})(typeof window==='undefined'?this:window);
