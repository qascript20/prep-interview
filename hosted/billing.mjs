const PLAN={name:'PrepSpace Unlimited',amount:999,currency:'gbp',interval:'month',intervalCount:1};
const now=()=>new Date().toISOString();
const sql=(db,query,...args)=>db.prepare(query).bind(...args);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
export function billingSettings(env){
  let origin=null;try{const url=new URL(env.PUBLIC_BASE_URL||'');if(!url.username&&!url.password&&(url.protocol==='https:'||url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))origin=url.origin;}catch{}
  const local=!!origin&&new URL(origin).protocol==='http:';
  const enabled=(!local||(env.STRIPE_SECRET_KEY||'').startsWith('sk_test_'))&&env.BILLING_ENABLED==='true'&&/^s[k]_((test)|(live))_/.test(env.STRIPE_SECRET_KEY||'')&&/^price_[A-Za-z0-9]+$/.test(env.STRIPE_PRICE_ID||'')&&!!env.STRIPE_WEBHOOK_SECRET&&!!origin;
  return {...PLAN,enabled,origin,testMode:(env.STRIPE_SECRET_KEY||'').startsWith('sk_test_')};
}
export function details(body){
  const fullName=typeof body?.fullName==='string'?body.fullName.trim():'',email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
  if(fullName.length<2||fullName.length>120||/[\x00-\x1f]/.test(fullName)||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter your full name and a valid email address.');
  if(body.consent!==true)throw new Error('Confirm the monthly subscription price before continuing.');
  if(typeof body.requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId))throw new Error('Start a new checkout request.');
  return {fullName,email,requestId:body.requestId};
}
export async function stripe(env,path,{method='GET',data,idempotencyKey,fetcher=fetch}={}){
  if(!env.STRIPE_SECRET_KEY)throw new Error('Stripe is not configured.');
  const response=await fetcher('https://api.stripe.com/v1/'+path,{method,headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Stripe-Version':'2026-11-18.endive',...(method==='POST'?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},...(data?{body:new URLSearchParams(data).toString()}:{}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Stripe could not complete this request.');return response.json();
}
export function validPrice(price,env){return price?.id===env.STRIPE_PRICE_ID&&price.active===true&&price.currency===PLAN.currency&&price.unit_amount===PLAN.amount&&price.recurring?.interval===PLAN.interval&&price.recurring?.interval_count===1&&price.livemode===!(env.STRIPE_SECRET_KEY||'').startsWith('sk_test_');}
export function subscriptionView(subscription,env){
  const item=subscription?.items?.data?.[0],price=item?.price,periodEnd=Number(item?.current_period_end||subscription?.current_period_end||0),customer=typeof subscription.customer==='string'?subscription.customer:subscription.customer?.id;
  if(subscription.items?.data?.length!==1||item.quantity!==1||!validPrice({...price,active:true},env)||typeof customer!=='string'||!/^cus_[A-Za-z0-9]+$/.test(customer)||!/^sub_[A-Za-z0-9]+$/.test(subscription.id||''))throw new Error('The subscription does not match the configured plan.');
  return {customerId:customer,subscriptionId:subscription.id,status:subscription.status,periodEnd,cancelAtPeriodEnd:subscription.cancel_at_period_end===true,active:subscription.status==='active'&&!subscription.pause_collection&&periodEnd>Date.now()/1000};
}
export async function providerOperation(env,input,transport=stripe){
  const cfg=billingSettings(env);if(!cfg.enabled)throw new Error('Stripe checkout is not configured.');
  if(input.operation==='create'){
    const d=details(input),price=await transport(env,'prices/'+env.STRIPE_PRICE_ID);if(!validPrice(price,env))throw new Error('Configure the £9.99 GBP monthly recurring price.');
    const customer=await transport(env,'customers',{method:'POST',idempotencyKey:'prepspace-customer-'+d.requestId,data:{name:d.fullName,email:d.email,'metadata[prepspace_order_id]':d.requestId}});
    const session=await transport(env,'checkout/sessions',{method:'POST',idempotencyKey:'prepspace-subscription-'+d.requestId,data:{mode:'subscription',customer:customer.id,'line_items[0][price]':env.STRIPE_PRICE_ID,'line_items[0][quantity]':'1','allowed_payment_method_types[0]':'card',success_url:cfg.origin+'/#/checkout?session_id={CHECKOUT_SESSION_ID}',cancel_url:cfg.origin+'/#/checkout?cancelled=1','metadata[order_id]':d.requestId,'subscription_data[metadata][order_id]':d.requestId,expires_at:String(Math.floor(Date.now()/1000)+1800)}});
    const url=new URL(session.url||'');if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||!/^cs_(test|live)_[A-Za-z0-9]+$/.test(session.id||''))throw new Error('Stripe checkout returned an invalid destination.');
    return {checkoutId:session.id,customerId:customer.id,url:session.url};
  }
  if(input.operation==='retrieve'){
    if(!/^cs_(test|live)_[A-Za-z0-9]+$/.test(input.checkoutId||''))throw new Error('Invalid checkout session.');
    const session=await transport(env,'checkout/sessions/'+input.checkoutId+'?expand[]=subscription.items.data.price');
    if(session.mode!=='subscription'||session.status!=='complete'||session.payment_status!=='paid'){let url=null;try{const target=new URL(session.url);if(target.protocol==='https:'&&target.hostname==='checkout.stripe.com')url=target.href;}catch{}return {paid:false,checkoutStatus:session.status,url};}
    const sub=typeof session.subscription==='object'?session.subscription:await transport(env,'subscriptions/'+session.subscription+'?expand[]=items.data.price');
    return {paid:true,orderId:session.metadata?.order_id,...subscriptionView(sub,env)};
  }
  if(input.operation==='subscription'){
    if(!/^sub_[A-Za-z0-9]+$/.test(input.subscriptionId||''))throw new Error('Invalid subscription.');
    return subscriptionView(await transport(env,'subscriptions/'+input.subscriptionId+'?expand[]=items.data.price'),env);
  }
  if(input.operation==='portal'){
    if(!/^cus_[A-Za-z0-9]+$/.test(input.customerId||''))throw new Error('Invalid billing account.');
    const result=await transport(env,'billing_portal/sessions',{method:'POST',data:{customer:input.customerId,return_url:cfg.origin+'/#/checkout'}}),url=new URL(result.url||'');
    if(url.protocol!=='https:'||url.hostname!=='billing.stripe.com')throw new Error('Stripe returned an invalid billing destination.');return {url:result.url};
  }
  throw new Error('Unknown billing operation.');
}
export const activeSubscription=row=>!!row&&row.status==='active'&&Number(row.period_end)>Date.now()/1000;
export async function hasSubscription(env,user){return !!user&&!!env.DB&&activeSubscription(await sql(env.DB,'SELECT * FROM billing_subscriptions WHERE user_id=?',user).first());}
async function saveSubscription(env,user,value){
  await sql(env.DB,'INSERT INTO billing_subscriptions(user_id,customer_id,subscription_id,status,period_end,cancel_at_period_end,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET customer_id=excluded.customer_id,subscription_id=excluded.subscription_id,status=excluded.status,period_end=excluded.period_end,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=excluded.updated_at',user,value.customerId,value.subscriptionId,value.active?value.status:value.status==='active'?'inactive':value.status,value.periodEnd,value.cancelAtPeriodEnd?1:0,now()).run();
  if(value.active)await sql(env.DB,'INSERT OR IGNORE INTO pilot_members(user_id,joined_at) VALUES (?,?)',user,now()).run();
}
export async function fulfill(env,checkoutId,owner=null,provider=providerOperation){
  const order=await sql(env.DB,'SELECT * FROM billing_orders WHERE checkout_id=?'+(owner?' AND user_id=?':''),checkoutId,...(owner?[owner]:[])).first();if(!order||order.user_id.startsWith('deleted-'))throw new Error('Checkout session not found.');
  const value=await provider(env,{operation:'retrieve',checkoutId});if(!value.paid)return {active:false,pending:true};
  if(value.orderId!==order.id||value.customerId!==order.customer_id)throw new Error('Checkout ownership could not be verified.');
  await saveSubscription(env,order.user_id,value);await sql(env.DB,"UPDATE billing_orders SET status='paid' WHERE id=?",order.id).run();return {active:value.active};
}
export async function verifySignature(raw,header,secret,clock=Date.now()){
  if(!secret||!header)return false;const pieces=header.split(','),timestamp=pieces.find(p=>p.startsWith('t='))?.slice(2),signatures=pieces.filter(p=>p.startsWith('v1=')).map(p=>p.slice(3));if(!/^\d+$/.test(timestamp||'')||Math.abs(clock/1000-Number(timestamp))>300)return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),expected=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+raw)));
  return signatures.some(signature=>{if(!/^[a-f0-9]{64}$/.test(signature))return false;let diff=0;for(let i=0;i<32;i++)diff|=expected[i]^parseInt(signature.slice(i*2,i*2+2),16);return diff===0;});
}
export async function webhook(env,raw,signature,provider=providerOperation){
  if(raw.length>262144||!await verifySignature(raw,signature,env.STRIPE_WEBHOOK_SECRET))return json({error:'Invalid Stripe signature.'},400);
  let event;try{event=JSON.parse(raw);}catch{return json({error:'Invalid event JSON.'},400);}
  try{
    if(event.type==='checkout.session.completed')await fulfill(env,event.data.object.id,null,provider);
    if(['customer.subscription.updated','customer.subscription.deleted'].includes(event.type)){const row=await sql(env.DB,'SELECT user_id FROM billing_subscriptions WHERE subscription_id=?',event.data.object.id).first();if(row&&!row.user_id.startsWith('deleted-'))await saveSubscription(env,row.user_id,await provider(env,{operation:'subscription',subscriptionId:event.data.object.id}));}
    return json({received:true});
  }catch{return json({error:'Billing event could not be processed. Retry delivery.'},503);}
}
export async function billingRoute(request,env,user,readBody,provider=providerOperation){
  const path=new URL(request.url).pathname,cfg=billingSettings(env);
  if(request.method==='GET'&&path==='/api/billing/status'){
    let row=user?await sql(env.DB,'SELECT * FROM billing_subscriptions WHERE user_id=?',user).first():null;
    if(row&&cfg.enabled&&Date.now()-Date.parse(row.updated_at)>300000)try{await saveSubscription(env,user,await provider(env,{operation:'subscription',subscriptionId:row.subscription_id}));row=await sql(env.DB,'SELECT * FROM billing_subscriptions WHERE user_id=?',user).first();}catch{}
    return json({...PLAN,enabled:cfg.enabled&&!!env.GEMINI_API_KEY&&env.GEMINI_STUDIO_ENABLED==='true',testMode:cfg.testMode,signedIn:!!user,active:activeSubscription(row),cancelAtPeriodEnd:!!row?.cancel_at_period_end,periodEnd:row?.period_end||null});
  }
  if(!user)return json({error:'Sign in before starting checkout.'},401);
  if(request.method!=='POST')return json({error:'Unknown billing route.'},404);
  const body=await readBody(request);
  if(path==='/api/billing/confirm'){try{return json(await fulfill(env,body.checkoutId,user,provider));}catch{return json({error:'Payment could not be verified. Your access has not been changed.'},409);}}
  if(path==='/api/billing/portal'){const row=await sql(env.DB,'SELECT customer_id FROM billing_subscriptions WHERE user_id=?',user).first();if(!row)return json({error:'No subscription is linked to this account.'},404);try{return json(await provider(env,{operation:'portal',customerId:row.customer_id}));}catch{return json({error:'The billing portal is unavailable. Please try again.'},503);}}
  if(path!=='/api/billing/checkout')return json({error:'Unknown billing route.'},404);
  if(!cfg.enabled)return json({error:'Stripe checkout is not configured yet. No payment has been taken.'},503);
  if(!env.GEMINI_API_KEY||env.GEMINI_STUDIO_ENABLED!=='true')return json({error:'The AI interview service is not configured. Checkout is paused.'},503);
  if(await hasSubscription(env,user))return json({error:'Your subscription is already active.'},409);
  let d;try{d=details(body);}catch(error){return json({error:error.message},400);}
  const open=await sql(env.DB,"SELECT checkout_id FROM billing_orders WHERE user_id=? AND status='open' AND created_at>? ORDER BY created_at DESC LIMIT 1",user,new Date(Date.now()-2100000).toISOString()).first();
  if(open)try{const previous=await provider(env,{operation:'retrieve',checkoutId:open.checkout_id});if(previous.paid){await fulfill(env,open.checkout_id,user,provider);return json({error:'Payment is already confirmed. Refresh your subscription status.'},409);}if(previous.checkoutStatus==='open'&&previous.url)return json({url:previous.url});if(previous.checkoutStatus!=='expired')return json({error:'Your previous payment is pending verification. Please do not start another subscription.'},409);await sql(env.DB,"UPDATE billing_orders SET status='expired' WHERE checkout_id=? AND user_id=?",open.checkout_id,user).run();}catch{return json({error:'We could not verify your previous checkout. Please retry before starting another payment.'},503);}
  const recent=await sql(env.DB,"SELECT count(*) AS n FROM billing_orders WHERE user_id=? AND created_at>?",user,new Date(Date.now()-3600000).toISOString()).first();if(recent.n>=3)return json({error:'Too many checkout requests. Try again later.'},429);
  const admitted=await sql(env.DB,"INSERT OR IGNORE INTO billing_orders(id,user_id,full_name,email,status,created_at) SELECT ?,?,?,?,'creating',? WHERE NOT EXISTS(SELECT 1 FROM billing_orders WHERE user_id=? AND status IN ('creating','open') AND created_at>?) RETURNING id",d.requestId,user,d.fullName,d.email,now(),user,new Date(Date.now()-2100000).toISOString()).first();if(!admitted)return json({error:'This checkout request is already in progress. Refresh its status.'},409);
  try{const value=await provider(env,{operation:'create',...d});await sql(env.DB,"UPDATE billing_orders SET checkout_id=?,customer_id=?,status='open' WHERE id=? AND user_id=?",value.checkoutId,value.customerId,d.requestId,user).run();return json({url:value.url});}
  catch{await sql(env.DB,"UPDATE billing_orders SET status='failed' WHERE id=?",d.requestId).run();return json({error:'Secure checkout could not start. No access was granted and no payment was taken by this website.'},502);}
}
const PUBLIC_ASSETS=new Set(['/','/index.html','/privacy.html','/privacy.css','/styles.css','/theme.css','/public.css','/interview-studio.css','/flow-options.js','/studio-gemini-client.js','/studio-gemini-client.js.LEGAL.txt','/studio-audio.js','/studio-audio-worklet.js','/interview-studio.js','/checkout.js','/flow-app.js','/company-search.js','/favicon.svg','/nova-avatar.svg','/nova-digital-interviewer.jpg','/robots.txt']);
export function protectedResource(path){try{path=new URL(decodeURIComponent(path),'https://prep.invalid').pathname.replace(/^\/client\//,'/');}catch{return true;}return !PUBLIC_ASSETS.has(path);}
