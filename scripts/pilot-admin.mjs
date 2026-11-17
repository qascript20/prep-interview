#!/usr/bin/env node
// The admin token is read from process memory; never pass it as a command-line argument.
const [action,url]=process.argv.slice(2),token=process.env.PILOT_ADMIN_TOKEN;
if(!['invite','metrics','reports'].includes(action)||!url||!token||token.length<32)throw new Error('Usage: PILOT_ADMIN_TOKEN=<set securely in your environment> node scripts/pilot-admin.mjs invite|metrics|reports https://your-site');
const target=new URL('/api/pilot/admin/'+({invite:'invites',metrics:'metrics',reports:'reports'}[action]),url);
if(target.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(target.hostname))throw new Error('Use HTTPS for a hosted site.');
const response=await fetch(target,{method:action==='invite'?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(action==='invite'?{body:'{}'}:{})});
if(!response.ok)throw new Error('Admin request failed with HTTP '+response.status);
const result=await response.json();console.log(JSON.stringify(result,null,2));
