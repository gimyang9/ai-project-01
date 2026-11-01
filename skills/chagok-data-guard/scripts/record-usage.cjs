const fs=require('node:fs'),path=require('node:path');
const required=['id','date','skill','skill_source','task','todo_refs','actions','evidence','result','outcome','limitations'];
function record(entry,{root=process.cwd(),write=false}={}){
 root=fs.realpathSync(root);
 for(const key of required)if(!Object.hasOwn(entry,key))throw Error('Missing field: '+key);
 for(const key of ['todo_refs','actions','evidence','limitations'])if(!Array.isArray(entry[key])||!entry[key].every(v=>typeof v==='string'))throw Error('Expected string array: '+key);
 for(const key of ['id','date','skill','skill_source','task','result','outcome'])if(typeof entry[key]!=='string'||!entry[key].trim())throw Error('Expected nonempty text: '+key);
 if(!/^[A-Z][A-Z0-9-]*-\d+$/.test(entry.id)||!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(entry.date)||Number.isNaN(Date.parse(entry.date))||new Date(entry.date.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==entry.date.slice(0,10))throw Error('Invalid ID or date');
 if(!['passed','limited','failed'].includes(entry.result))throw Error('Invalid result');
 const source=fs.realpathSync(path.resolve(root,entry.skill_source));if(!source.startsWith(root+path.sep)||path.basename(source)!=='SKILL.md')throw Error('skill_source must be an existing workspace SKILL.md');
 const files=['docs/skill-usage-log.md','docs/skill-usage-log.jsonl'].map(f=>path.join(root,f));
 const original=files.map(f=>fs.readFileSync(f,'utf8'));
 const records=original[1].split(/\r?\n/).filter(s=>s.trim()).map(s=>JSON.parse(s));
 if(records.some(r=>r.id===entry.id)||new RegExp('^##\\s+'+entry.id+'\\b','m').test(original[0]))throw Error('Duplicate or partial existing ID: '+entry.id);
 const line=s=>s&&!s.endsWith('\n')?s+'\n':s;
 const json=JSON.stringify(entry),next=[line(original[0])+'\n## '+entry.id+'\n\n'+json+'\n',line(original[1])+json+'\n'];
 if(!write)return {status:'dry-run',id:entry.id,files:files.map(f=>path.relative(root,f))};
 const lock=path.join(root,'docs/.skill-usage.lock'),temps=files.map(f=>f+'.'+process.pid+'.tmp'),created=[];let fd,completed=0;
 try{
  fd=fs.openSync(lock,'wx');
  files.forEach((f,i)=>{if(fs.readFileSync(f,'utf8')!==original[i])throw Error('Log changed concurrently');fs.accessSync(f,fs.constants.W_OK);fs.writeFileSync(temps[i],next[i],{flag:'wx'});created.push(temps[i]);});
  files.forEach((f,i)=>{if(fs.readFileSync(f,'utf8')!==original[i])throw Error('Log changed concurrently');fs.renameSync(temps[i],f);completed++;});
  return {status:'written',id:entry.id,files:files.map(f=>path.relative(root,f))};
 }catch(error){
  for(let i=0;i<completed;i++)if(fs.readFileSync(files[i],'utf8')===next[i]){try{fs.writeFileSync(files[i],original[i]);}catch{error.message+='; rollback failed, inspect partial logs';}}
  throw error;
 }finally{for(const t of created)if(fs.existsSync(t))fs.unlinkSync(t);if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}
}
module.exports={record};
if(require.main===module){try{const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];const raw=args.includes('--entry-base64')?Buffer.from(get('--entry-base64'),'base64').toString('utf8'):fs.readFileSync(get('--entry'),'utf8');console.log(JSON.stringify(record(JSON.parse(raw),{root:args.includes('--root')?get('--root'):process.cwd(),write:args.includes('--write')})));}catch(e){console.error(e.message);process.exitCode=1;}}
