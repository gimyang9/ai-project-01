/* Rebuild before publishing; discover each root/dist shell's actual local assets. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const base=path.resolve(__dirname,'..');
const core=['index.html','style.css','app.js','streak.js','exam-management.js','study-data.js','learning-plan.js','review-plan.js','study-stats.js','storage-guard.js','pwa.js','manifest.webmanifest'];
const template=fs.readFileSync(path.join(__dirname,'service-worker-template.js'),'utf8');
for(const prefix of ['', 'dist']){
 const directory=path.join(base,prefix),files=new Set(core);
 const add=value=>{
  if(!value||/^(data:|https?:|#|\/\/)/i.test(value))return;
  const f=value.split(/[?#]/)[0].replace(/^\.\//,'');
  const resolved=path.resolve(directory,f);
  if(!resolved.startsWith(directory+path.sep)||!fs.existsSync(resolved)||!fs.statSync(resolved).isFile())throw Error('Missing/outside PWA asset: '+prefix+'/'+f);
  files.add(f.replaceAll('\\','/'));
 };
 const html=fs.readFileSync(path.join(directory,'index.html'),'utf8'),css=fs.readFileSync(path.join(directory,'style.css'),'utf8');
 for(const m of html.matchAll(/\b(src|href|srcset)=["']([^"']+)["']/g)){
  if(m[2].startsWith('data:'))continue;
  if(m[1]==='srcset')for(const source of m[2].split(','))add(source.trim().split(/\s+/)[0]);else add(m[2]);
 }
 for(const m of css.matchAll(/url\(\s*['"]?([^)'"]+)['"]?\s*\)/g))add(m[1].trim());
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.webmanifest'),'utf8'));for(const icon of manifest.icons)add(icon.src);
 const ordered=[...files].sort(),hash=crypto.createHash('sha256');
 for(const file of ordered){hash.update(file);hash.update(fs.readFileSync(path.join(directory,file)));}
 const revision=hash.digest('hex').slice(0,16);
 fs.writeFileSync(path.join(directory,'service-worker.js'),template.replace('__REVISION__',JSON.stringify(revision)).replace('__FILES__',JSON.stringify(ordered)));
 console.log((prefix||'root')+': '+revision+' ('+ordered.length+' shell files)');
}
