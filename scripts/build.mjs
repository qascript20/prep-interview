import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {readdir,cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
execFileSync('python3',['scripts/build_catalogue.py'],{stdio:'inherit'});
await writeFile('dist/flow-options.js',"'use strict';\nwindow.INTERVIEW_OPTIONS="+JSON.stringify(JSON.parse(await readFile('content/interview-studio.json','utf8')))+';\n');
await build({entryPoints:['studio/gemini-client.mjs'],outfile:'dist/studio-gemini-client.js',bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'external'});
let index=await readFile('dist/index.html','utf8');
for(const file of await readdir('dist',{withFileTypes:true}))if(file.isFile()&&/\.(?:js|css)$/.test(file.name)){
  const hash=createHash('sha256').update(await readFile('dist/'+file.name)).digest('hex').slice(0,10);
  const escaped=file.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  index=index.replace(new RegExp('((?:src|href)="'+escaped+')(?:\\?v=[^"]*)?(?=")','g'),(_match,prefix)=>prefix+'?v='+hash);
}
await writeFile('dist/index.html',index);
let library=await readFile('dist/library.html','utf8');
for(const file of await readdir('dist',{withFileTypes:true}))if(file.isFile()&&/\.(?:js|css)$/.test(file.name)){const hash=createHash('sha256').update(await readFile('dist/'+file.name)).digest('hex').slice(0,10),escaped=file.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');library=library.replace(new RegExp('((?:src|href)="'+escaped+')(?:\\?v=[^"]*)?(?=")','g'),(_m,prefix)=>prefix+'?v='+hash);}
await writeFile('dist/library.html',library);
await mkdir('dist/client',{recursive:true});
for(const file of await readdir('dist',{withFileTypes:true}))if(!['client','server','.openai'].includes(file.name))await cp('dist/'+file.name,'dist/client/'+file.name,{recursive:true});
await build({entryPoints:['hosted/worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',conditions:['workerd','worker','browser'],external:['node:*'],minify:true,legalComments:'external'});
await mkdir('dist/.openai',{recursive:true});
const original=JSON.parse(await readFile('.openai/hosting.json','utf8'));
const hosted={project_id:original.project_id,d1:'DB',r2:null};
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
await writeFile('dist/.openai/hosting.json',JSON.stringify(hosted,null,2)+'\n');
console.log('Built Worker + client assets. Hosted configuration is prepared; the Site remains unpublished. See docs/OPERATIONS.md before deployment.');
