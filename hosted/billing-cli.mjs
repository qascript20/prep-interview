import {providerOperation} from './billing.mjs';
let raw='';for await(const chunk of process.stdin){raw+=chunk;if(raw.length>8192)process.exit(2);}
try{process.stdout.write(JSON.stringify(await providerOperation(process.env,JSON.parse(raw))));}catch{process.stderr.write('Stripe operation failed.\n');process.exitCode=1;}
