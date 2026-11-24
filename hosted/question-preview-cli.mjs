import {DatabaseSync} from 'node:sqlite';
import {questionRoute,questionStatus} from './question-preview.mjs';
process.stdin.setEncoding('utf8');let raw='';
for await(const chunk of process.stdin){raw+=chunk;if(raw.length>4500000)process.exit(2);}
let native;
try{
  const input=JSON.parse(raw);if(!process.env.PREPSPACE_PREVIEW_DB||typeof input.user!=='string')throw new Error('Missing local context.');
  native=new DatabaseSync(process.env.PREPSPACE_PREVIEW_DB);native.exec('PRAGMA busy_timeout=5000');
  const DB={prepare(query){return {args:[],bind(...args){this.args=args;return this;},async first(){return native.prepare(query).get(...this.args)||null;},async run(){const value=native.prepare(query).run(...this.args);return {meta:{changes:Number(value.changes)}};}};}};
  const env={...process.env,DB};
  if(input.path==='/api/studio/status')process.stdout.write(JSON.stringify({status:200,data:await questionStatus(env,input.user)}));
  else{const response=await questionRoute(input.path,env,input.user,input.body||{});process.stdout.write(JSON.stringify({status:response.status,data:await response.json()}));}
}catch{process.stderr.write('Question interview request failed.\n');process.exitCode=1;}
finally{native?.close();}
