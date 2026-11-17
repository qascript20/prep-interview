import {Sandbox} from 'e2b';
export const executionReady=env=>env.PILOT_EXECUTION_ENABLED==='true'&&!!env.E2B_API_KEY&&!!env.E2B_TEMPLATE_ID&&!!env.PILOT_PROCESSING_REGION&&env.PILOT_PROCESSING_REGION!=='Not configured';
export async function runIsolated(env,files,inputs,onCreated=async()=>{},SandboxAPI=Sandbox){
  if(!executionReady(env))throw new Error('Hosted execution has not passed setup and release gates.');
  let sandbox;
  try{
    sandbox=await SandboxAPI.create(env.E2B_TEMPLATE_ID,{apiKey:env.E2B_API_KEY,timeoutMs:30000,requestTimeoutMs:5000,allowInternetAccess:false});
    await onCreated(sandbox.sandboxId);
    await sandbox.files.write('/opt/prepspace/job.json',JSON.stringify({files,inputs}),{user:'root',requestTimeoutMs:5000});
    const result=await sandbox.commands.run('/usr/bin/python3 /opt/prepspace/runner.py',{user:'root',timeoutMs:23000,requestTimeoutMs:25000});
    if(result.stdout.length>800000)throw new Error('Sandbox response exceeds the bounded result size.');
    const executions=JSON.parse(result.stdout);
    if(!Array.isArray(executions)||executions.length>20||executions.some(r=>!['completed','compile_error','runtime_error','timeout','output_limit','infrastructure_error'].includes(r.status)||typeof r.stdout!=='string'||typeof r.stderr!=='string'||r.stdout.length+r.stderr.length>131072))throw new Error('Invalid sandbox result.');
    return executions;
  }finally{if(sandbox)await sandbox.kill().catch(()=>{});}
}
export async function killSandbox(env,id){if(id&&env.E2B_API_KEY)await Sandbox.kill(id,{apiKey:env.E2B_API_KEY,requestTimeoutMs:5000}).catch(()=>{});}
