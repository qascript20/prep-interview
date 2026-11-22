import {generatePlan,validatePlan} from './preparation-planner.mjs';
// Trusted local bridge. Secrets arrive in the child environment, never argv.
import {mintStudioToken,validateStudioSelection} from './interview-studio.mjs';
let input='';
for await(const chunk of process.stdin){input+=chunk;if(input.length>8192)process.exit(2);}
try{
  const body=JSON.parse(input);const result=body.operation==='plan'?await generatePlan(process.env,validatePlan(body)):await mintStudioToken(process.env,validateStudioSelection(body));
  process.stdout.write(JSON.stringify(result));
}catch{process.stderr.write('Gemini session provisioning failed.\n');process.exitCode=1;}
