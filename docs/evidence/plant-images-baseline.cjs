// Reproduce existing date-sensitive app tests against HEAD sources, without changing the checkout.
const fs=require('fs'),path=require('path'),cp=require('child_process'),read=fs.readFileSync;
const originals=new Map(['app.js','study-data.js','learning-plan.js'].map(name=>[path.resolve('dist',name),cp.execFileSync('git',['show','HEAD:dist/'+name])]));
fs.readFileSync=function(file,options){const bytes=typeof file==='string'&&originals.get(path.resolve(file));if(bytes)return typeof options==='string'||options?.encoding?bytes.toString(typeof options==='string'?options:options.encoding):Buffer.from(bytes);return read.apply(this,arguments);};
