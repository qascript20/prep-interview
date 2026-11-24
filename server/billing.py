"""Local subscription persistence; card details are handled exclusively by Stripe."""
import datetime as dt,hashlib,hmac,json,os,re,shutil,subprocess,time
from pathlib import Path
from urllib.parse import urlsplit,unquote
import posixpath
ROOT=Path(__file__).resolve().parents[1]
KEYS={'STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_PRICE_ID','PUBLIC_BASE_URL','BILLING_ENABLED'}
def stamp():return dt.datetime.now(dt.timezone.utc).isoformat()
def settings(env):
    origin=env.get('PUBLIC_BASE_URL','');url=urlsplit(origin)
    valid_origin=url.scheme=='https' or url.scheme=='http' and url.hostname in ('127.0.0.1','localhost')
    local=url.scheme=='http'
    enabled=(not local or env.get('STRIPE_SECRET_KEY','').startswith('sk_test_')) and env.get('BILLING_ENABLED')=='true' and bool(re.fullmatch(r'sk_(test|live)_.+',env.get('STRIPE_SECRET_KEY',''))) and bool(re.fullmatch(r'price_[A-Za-z0-9]+',env.get('STRIPE_PRICE_ID',''))) and bool(env.get('STRIPE_WEBHOOK_SECRET')) and valid_origin and not url.username and not url.password
    return {'enabled':bool(enabled),'name':'PrepSpace Unlimited','amount':999,'currency':'gbp','interval':'month','intervalCount':1,'testMode':env.get('STRIPE_SECRET_KEY','').startswith('sk_test_')}
def active(row):return bool(row) and row['status']=='active' and row['period_end']>time.time()
def details(body):
    name=body.get('fullName','').strip() if isinstance(body.get('fullName'),str) else '';email=body.get('email','').strip().lower() if isinstance(body.get('email'),str) else ''
    if not 2<=len(name)<=120 or re.search(r'[\x00-\x1f]',name) or len(email)>254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email):raise ValueError('Enter your full name and a valid email address.')
    if body.get('consent') is not True:raise ValueError('Confirm the monthly subscription price before continuing.')
    if not isinstance(body.get('requestId'),str) or not re.fullmatch(r'[a-zA-Z0-9-]{16,80}',body['requestId']):raise ValueError('Start a new checkout request.')
    return {'fullName':name,'email':email,'requestId':body['requestId']}
class Billing:
    def __init__(self,pilot,env=None,provider=None):self.pilot=pilot;self.env=os.environ if env is None else env;self.provider=provider or self.operation
    def operation(self,body):
        node=shutil.which('node')
        if not node:raise RuntimeError('Node is unavailable.')
        env={k:v for k,v in self.env.items() if k in KEYS};env['PATH']=os.environ.get('PATH','/usr/bin:/bin')
        result=subprocess.run([node,str(ROOT/'hosted/billing-cli.mjs')],input=json.dumps(body),text=True,capture_output=True,cwd=ROOT,env=env,timeout=40)
        if result.returncode or len(result.stdout)>30000:raise RuntimeError('Stripe is unavailable.')
        return json.loads(result.stdout)
    def subscribed(self,user):
        with self.pilot.db() as db:return active(db.execute('SELECT * FROM billing_subscriptions WHERE user_id=?',(user,)).fetchone())
    def save(self,user,value):
        with self.pilot.db() as db:
            db.execute('INSERT INTO billing_subscriptions VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET customer_id=excluded.customer_id,subscription_id=excluded.subscription_id,status=excluded.status,period_end=excluded.period_end,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=excluded.updated_at',(user,value['customerId'],value['subscriptionId'],value['status'] if value['active'] or value['status']!='active' else 'inactive',value['periodEnd'],int(value['cancelAtPeriodEnd']),stamp()))
    def status(self,user):
        cfg=settings(self.env)
        with self.pilot.db() as db:row=db.execute('SELECT * FROM billing_subscriptions WHERE user_id=?',(user,)).fetchone()
        if row and cfg['enabled'] and time.time()-dt.datetime.fromisoformat(row['updated_at']).timestamp()>300:
            try:
                self.save(user,self.provider({'operation':'subscription','subscriptionId':row['subscription_id']}))
                with self.pilot.db() as db:row=db.execute('SELECT * FROM billing_subscriptions WHERE user_id=?',(user,)).fetchone()
            except Exception:pass
        return {**cfg,'enabled':cfg['enabled'] and bool(self.env.get('GEMINI_API_KEY')) and self.env.get('GEMINI_STUDIO_ENABLED')=='true','signedIn':True,'active':active(row),'cancelAtPeriodEnd':bool(row['cancel_at_period_end']) if row else False,'periodEnd':row['period_end'] if row else None}
    def fulfill(self,checkout,user=None):
        if not isinstance(checkout,str) or not re.fullmatch(r'cs_(test|live)_[A-Za-z0-9]+',checkout):raise ValueError('Invalid checkout session.')
        with self.pilot.db() as db:order=db.execute('SELECT * FROM billing_orders WHERE checkout_id=?'+(' AND user_id=?' if user else ''),(checkout,user) if user else (checkout,)).fetchone()
        if not order or order['user_id'].startswith('deleted-'):raise ValueError('Checkout session not found.')
        value=self.provider({'operation':'retrieve','checkoutId':checkout})
        if not value.get('paid'):return {'active':False,'pending':True}
        if value.get('orderId')!=order['id'] or value.get('customerId')!=order['customer_id']:raise ValueError('Checkout ownership could not be verified.')
        self.save(order['user_id'],value)
        with self.pilot.db() as db:db.execute("UPDATE billing_orders SET status='paid' WHERE id=?",(order['id'],))
        return {'active':value['active']}
    def post(self,user,path,body):
        if path=='/api/billing/confirm':
            try:return self.fulfill(body.get('checkoutId'),user),200
            except Exception:return {'error':'Payment could not be verified. Your access has not been changed.'},409
        if path=='/api/billing/portal':
            with self.pilot.db() as db:row=db.execute('SELECT customer_id FROM billing_subscriptions WHERE user_id=?',(user,)).fetchone()
            if not row:return {'error':'No subscription is linked to this account.'},404
            try:return self.provider({'operation':'portal','customerId':row['customer_id']}),200
            except Exception:return {'error':'The billing portal is unavailable. Please try again.'},503
        if path!='/api/billing/checkout':return {'error':'Unknown billing route.'},404
        if not settings(self.env)['enabled']:return {'error':'Stripe checkout is not configured yet. No payment has been taken.'},503
        if not self.env.get('GEMINI_API_KEY') or self.env.get('GEMINI_STUDIO_ENABLED')!='true':return {'error':'The AI interview service is not configured. Checkout is paused.'},503
        if self.subscribed(user):return {'error':'Your subscription is already active.'},409
        try:d=details(body)
        except ValueError as error:return {'error':str(error)},400
        with self.pilot.db() as db:opened=db.execute("SELECT checkout_id FROM billing_orders WHERE user_id=? AND status='open' AND created_at>? ORDER BY created_at DESC LIMIT 1",(user,(dt.datetime.now(dt.timezone.utc)-dt.timedelta(minutes=35)).isoformat())).fetchone()
        if opened:
            try:
                previous=self.provider({'operation':'retrieve','checkoutId':opened['checkout_id']})
                if previous.get('paid'):self.fulfill(opened['checkout_id'],user);return {'error':'Payment is already confirmed. Refresh your subscription status.'},409
                if previous.get('checkoutStatus')=='open' and previous.get('url'):return {'url':previous['url']},200
                if previous.get('checkoutStatus')!='expired':return {'error':'Your previous payment is pending verification. Please do not start another subscription.'},409
                with self.pilot.db() as db:db.execute("UPDATE billing_orders SET status='expired' WHERE checkout_id=? AND user_id=?",(opened['checkout_id'],user))
            except Exception:return {'error':'We could not verify your previous checkout. Please retry before starting another payment.'},503
        with self.pilot.lock,self.pilot.db() as db:
            db.execute('BEGIN IMMEDIATE')
            since=(dt.datetime.now(dt.timezone.utc)-dt.timedelta(hours=1)).isoformat()
            if db.execute('SELECT count(*) FROM billing_orders WHERE user_id=? AND created_at>?',(user,since)).fetchone()[0]>=3:return {'error':'Too many checkout requests. Try again later.'},429
            pending_since=(dt.datetime.now(dt.timezone.utc)-dt.timedelta(minutes=35)).isoformat()
            if db.execute("SELECT id FROM billing_orders WHERE user_id=? AND status IN ('creating','open') AND created_at>?",(user,pending_since)).fetchone():return {'error':'A checkout request is already in progress. Please wait before trying again.'},409
            if db.execute('SELECT id FROM billing_orders WHERE id=?',(d['requestId'],)).fetchone():return {'error':'This checkout request is already in progress. Refresh its status.'},409
            db.execute("INSERT INTO billing_orders(id,user_id,full_name,email,status,created_at) VALUES (?,?,?,?,'creating',?)",(d['requestId'],user,d['fullName'],d['email'],stamp()))
        try:
            value=self.provider({'operation':'create',**d})
            with self.pilot.db() as db:db.execute("UPDATE billing_orders SET checkout_id=?,customer_id=?,status='open' WHERE id=? AND user_id=?",(value['checkoutId'],value['customerId'],d['requestId'],user))
            return {'url':value['url']},200
        except Exception:
            with self.pilot.db() as db:db.execute("UPDATE billing_orders SET status='failed' WHERE id=?",(d['requestId'],))
            return {'error':'Secure checkout could not start. No access was granted.'},502
    def webhook(self,raw,signature):
        try:
            fields=signature.split(',');timestamp=next(field[2:] for field in fields if field.startswith('t='));signatures=[field[3:] for field in fields if field.startswith('v1=')]
            secret=self.env.get('STRIPE_WEBHOOK_SECRET','')
            if not secret or not timestamp.isdigit() or abs(time.time()-int(timestamp))>300:raise ValueError()
            expected=hmac.new(secret.encode(),timestamp.encode()+b'.'+raw,hashlib.sha256).hexdigest()
            if not any(hmac.compare_digest(expected,value) for value in signatures):raise ValueError()
            event=json.loads(raw)
        except Exception:return {'error':'Invalid Stripe signature.'},400
        try:
            if event['type']=='checkout.session.completed':self.fulfill(event['data']['object']['id'])
            if event['type'] in ('customer.subscription.updated','customer.subscription.deleted'):
                id=event['data']['object']['id']
                with self.pilot.db() as db:row=db.execute('SELECT user_id FROM billing_subscriptions WHERE subscription_id=?',(id,)).fetchone()
                if row and not row['user_id'].startswith('deleted-'):self.save(row['user_id'],self.provider({'operation':'subscription','subscriptionId':id}))
            return {'received':True},200
        except Exception:return {'error':'Billing event could not be processed. Retry delivery.'},503
PUBLIC_ASSETS={'/','/index.html','/styles.css','/public.css','/interview-studio.css','/flow-options.js','/studio-gemini-client.js','/studio-gemini-client.js.LEGAL.txt','/studio-audio.js','/studio-audio-worklet.js','/interview-studio.js','/checkout.js','/flow-app.js','/favicon.svg','/nova-avatar.svg','/nova-digital-interviewer.jpg','/robots.txt'}
def handle_get(handler):
    path=posixpath.normpath(unquote(urlsplit(handler.path).path));path=path[7:] if path.startswith('/client/') else path
    if path!='/api/billing/status' and (path.startswith('/api/') or path in PUBLIC_ASSETS):return False
    from pilot_api import instance
    pilot=instance();user=pilot.identity(handler);billing=Billing(pilot)
    if path=='/api/billing/status':handler.json_response(billing.status(user));return True
    if not billing.subscribed(user):
        if path=='/library.html':handler.send_response(303);handler.send_header('Location','/#/checkout');handler.end_headers()
        else:handler.json_response({'error':'A subscription is required for this resource.'},402)
        return True
    return False
def handle_post(handler,body):
    path=urlsplit(handler.path).path
    if not path.startswith('/api/billing/'):return False
    from pilot_api import instance
    pilot=instance();user=pilot.identity(handler)
    if handler.headers.get('X-PrepSpace-Workspace')!=user:handler.json_response({'error':'Your workspace changed. Reload before continuing.','code':'workspace_changed'},409);return True
    value,status=Billing(pilot).post(user,path,body);handler.json_response(value,status);return True
