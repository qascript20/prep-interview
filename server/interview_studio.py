"""Local interview allowances; provider calls use the shared trusted JS adapter."""
import datetime as dt,json,os,re,shutil,subprocess,uuid
from pathlib import Path
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[1]
CATALOGUE=json.loads((ROOT/'content/interview-studio.json').read_text())
KEYS={'STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_PRICE_ID','PUBLIC_BASE_URL','BILLING_ENABLED','GEMINI_API_KEY','GEMINI_STUDIO_ENABLED','GEMINI_LIVE_MODEL','GEMINI_STUDIO_WEEKLY_LIMIT','GEMINI_STUDIO_BUDGET_PENCE','GEMINI_STUDIO_RESERVATION_PENCE'}
def load_environment(path):
    """Read only declared server configuration values from the ignored local file; no eval."""
    if not Path(path).is_file():return
    for line in Path(path).read_text().splitlines():
        if not line.strip() or line.lstrip().startswith('#') or '=' not in line:continue
        key,value=line.split('=',1);key=key.strip();value=value.strip()
        if key not in KEYS:continue
        if len(value)>1 and value[0]==value[-1] and value[0] in ('"',"'"):value=value[1:-1]
        os.environ.setdefault(key,value)
def bounded(value,default,low,high):
    try:return min(high,max(low,int(value)))
    except (ValueError,TypeError):return default
def settings(env):
    configured=bool(env.get('GEMINI_API_KEY'))
    return {'configured':configured,'enabled':configured and env.get('GEMINI_STUDIO_ENABLED')=='true','model':env.get('GEMINI_LIVE_MODEL','gemini-3.8-live'),'weeklyLimit':1,'freeMinutes':5,'budgetPence':bounded(env.get('GEMINI_STUDIO_BUDGET_PENCE'),1500,0,1500),'reservationPence':bounded(env.get('GEMINI_STUDIO_RESERVATION_PENCE'),100,100,500)}
def validate(body):
    if not isinstance(body,dict):raise ValueError('Choose your interview settings.')
    body=dict(body)
    if isinstance(body.get('domain'),str):body['domain']=CATALOGUE.get('legacyDomainAliases',{}).get(body['domain'],body['domain'])
    if body.get('role') not in [x['id'] for x in CATALOGUE['roles']] or body.get('round') not in [x['id'] for x in CATALOGUE['rounds']]:raise ValueError('Choose a valid role and interview round.')
    for name in ('domain','language','level'):
        if body.get(name) not in CATALOGUE[name+'s']:raise ValueError('Choose valid interview settings.')
    if body.get('mode') not in ('text','voice'):raise ValueError('Choose valid interview duration and mode.')
    if not isinstance(body.get('focus',''),str) or len(body.get('focus',''))>400:raise ValueError('Choose a focus of at most 400 characters.')
    if not isinstance(body.get('company',''),str) or len(body.get('company',''))>120:raise ValueError('Enter a company of at most 120 characters.')
    if body.get('consent') is not True:raise ValueError('Confirm that your answers will be processed by Google Gemini.')
    if not isinstance(body.get('requestId'),str) or not re.fullmatch(r'[a-zA-Z0-9-]{16,80}',body['requestId']):raise ValueError('Choose a new interview session request.')
    return {**{key:body.get(key,'') for key in ('role','round','domain','language','level','mode','focus','company','consent','requestId')},'minutes':5}
class Studio:
    def __init__(self,pilot,env=None,mint=None):self.pilot=pilot;self.env=os.environ if env is None else env;self.mint=mint or self.provider
    def provider(self,body):
        command=shutil.which('node')
        if not command:raise RuntimeError('Node is unavailable.')
        env={key:value for key,value in self.env.items() if key.startswith('GEMINI_')}
        env['PATH']=os.environ.get('PATH','/usr/bin:/bin')
        result=subprocess.run([command,str(ROOT/'hosted/studio-token-cli.mjs')],input=json.dumps(body),capture_output=True,text=True,cwd=ROOT,env=env,timeout=32)
        if result.returncode!=0 or len(result.stdout)>40000:raise RuntimeError('Provider unavailable.')
        value=json.loads(result.stdout)
        if body.get('operation')!='plan' and (not isinstance(value.get('token'),str) or not value['token'].startswith('auth_tokens/')):raise RuntimeError('Incomplete provider result.')
        return value
    def status(self,user):
        cfg=settings(self.env);now=dt.datetime.now(dt.timezone.utc);stamp=now.isoformat();week=(now-dt.timedelta(days=7)).isoformat()
        with self.pilot.db() as db:
            used=db.execute('SELECT count(*) FROM studio_trials WHERE user_id=?',(user,)).fetchone()[0]
            spent=db.execute('SELECT (SELECT COALESCE(sum(reserved_pence),0) FROM studio_sessions WHERE month=? AND id IN (SELECT session_id FROM studio_trials))+(SELECT COALESCE(sum(reserved_pence),0) FROM studio_plans WHERE month=?)',(stamp[:7],stamp[:7])).fetchone()[0]
        from billing import Billing
        subscribed=Billing(self.pilot,self.env).subscribed(user)
        return {**cfg,'subscribed':subscribed,'eligible':True,'remaining':None if subscribed else max(0,cfg['weeklyLimit']-used),'capacityAvailable':subscribed or spent+cfg['reservationPence']<=cfg['budgetPence'],'provider':'Google Gemini','recording':'No audio or transcript is stored on this server.'}
    def plan(self,user,body):
        try:
            selection=validate({**body,'round':'technical','minutes':5,'mode':'text'})
            resources={item['id']:item for item in json.loads((ROOT/'content/preparation-resources.json').read_text())}
            ids=body.get('taskIds')
            if not isinstance(ids,list) or not 1<=len(ids)<=32 or any(not isinstance(id,str) for id in ids) or len(set(ids))!=len(ids) or any(id not in resources or selection['language'] not in resources[id]['languages'] for id in ids):raise ValueError('Choose available learning tasks for this language.')
        except (ValueError,TypeError) as error:return {'error':str(error)},400
        cfg=settings(self.env)
        if not cfg['enabled']:return {'error':'AI planning is not connected. Your curated track remains available.'},503
        stamp=dt.datetime.now(dt.timezone.utc).isoformat();week=(dt.datetime.now(dt.timezone.utc)-dt.timedelta(days=7)).isoformat()
        with self.pilot.lock,self.pilot.db() as db:
            db.execute('BEGIN IMMEDIATE')
            spent=db.execute('SELECT (SELECT COALESCE(sum(reserved_pence),0) FROM studio_sessions WHERE month=? AND id IN (SELECT session_id FROM studio_trials))+(SELECT COALESCE(sum(reserved_pence),0) FROM studio_plans WHERE month=?)',(stamp[:7],stamp[:7])).fetchone()[0]
            used=db.execute("SELECT count(*) FROM studio_plans WHERE user_id=? AND created_at>=? AND status!='failed'",(user,week)).fetchone()[0]
            if spent+10>cfg['budgetPence'] or used>=2 or db.execute('SELECT id FROM studio_plans WHERE id=?',(selection['requestId'],)).fetchone():return {'error':'AI planning allowance reached. Your curated track remains available.'},429
            db.execute('INSERT INTO studio_plans VALUES (?,?,?,?,?,?)',(selection['requestId'],user,stamp[:7],stamp,'pending',10))
        try:
            result=self.mint({**selection,'operation':'plan','taskIds':ids})
            with self.pilot.db() as db:db.execute("UPDATE studio_plans SET status='completed' WHERE id=?",(selection['requestId'],))
            return result,200
        except Exception:
            with self.pilot.db() as db:db.execute("UPDATE studio_plans SET status='failed' WHERE id=?",(selection['requestId'],))
            return {'error':'AI priorities could not be prepared. Your curated track is unchanged; retry later.'},502
    def post(self,user,path,body):
        if path=='/api/studio/plan':return self.plan(user,body)
        if path=='/api/studio/end':
            session=body.get('sessionId','')
            if not isinstance(session,str) or not re.fullmatch(r'[a-zA-Z0-9-]{16,80}',session):return {'error':'Invalid interview session.'},400
            stamp=dt.datetime.now(dt.timezone.utc).isoformat()
            with self.pilot.lock,self.pilot.db() as db:
                db.execute("INSERT OR IGNORE INTO studio_sessions VALUES (?,?,?,?,?,'cancelled',0)",(session,user,stamp[:7],stamp,stamp))
                changed=db.execute("UPDATE studio_sessions SET reserved_pence=CASE WHEN status='provisioning' THEN 0 ELSE reserved_pence END,status=CASE WHEN status='provisioning' THEN 'cancelled' WHEN status='issued' THEN 'ended' ELSE status END WHERE id=? AND user_id=?",(session,user)).rowcount
                db.execute("DELETE FROM studio_trials WHERE user_id=? AND session_id=? AND EXISTS(SELECT 1 FROM studio_sessions WHERE id=? AND status IN ('failed','cancelled'))",(user,session,session))
            return ({'ended':True},200) if changed else ({'error':'Interview session not found.'},404)
        if path!='/api/studio/session':return {'error':'Unknown interview route.'},404
        try:selection=validate(body)
        except ValueError as error:return {'error':str(error)},400
        from billing import Billing
        subscribed=Billing(self.pilot,self.env).subscribed(user)
        cfg=settings(self.env)
        if not cfg['enabled']:return {'error':'Interview Studio is not connected to Gemini yet.'},503
        now=dt.datetime.now(dt.timezone.utc);stamp=now.isoformat();week=(now-dt.timedelta(days=7)).isoformat();expires=(now+dt.timedelta(minutes=selection['minutes'])).isoformat();id=selection['requestId']
        with self.pilot.lock,self.pilot.db() as db:
            db.execute('BEGIN IMMEDIATE')
            spent=db.execute('SELECT (SELECT COALESCE(sum(reserved_pence),0) FROM studio_sessions WHERE month=? AND id IN (SELECT session_id FROM studio_trials))+(SELECT COALESCE(sum(reserved_pence),0) FROM studio_plans WHERE month=?)',(stamp[:7],stamp[:7])).fetchone()[0]
            recent=db.execute('SELECT count(*) FROM studio_sessions WHERE user_id=? AND created_at>?',(user,(now-dt.timedelta(minutes=1)).isoformat())).fetchone()[0]
            if recent>=5:return {'error':'Too many connection attempts. Please wait a minute and try again.'},429
            used=db.execute('SELECT count(*) FROM studio_trials WHERE user_id=?',(user,)).fetchone()[0]
            active=db.execute("SELECT id FROM studio_sessions WHERE user_id=? AND status IN ('provisioning','issued') AND expires_at>?",(user,stamp)).fetchone()
            if used and not subscribed:return {'error':'Your five-minute free interview has been used. Continue from the payment page.','code':'payment_required'},402
            if db.execute('SELECT id FROM studio_sessions WHERE id=?',(id,)).fetchone() or active or (not subscribed and spent+cfg['reservationPence']>cfg['budgetPence']):return {'error':'The interview allowance or capacity is unavailable, or another session is still active. End that session or try after its expiry.'},429
            if not subscribed:db.execute('INSERT INTO studio_trials VALUES (?,?,?)',(user,id,stamp))
            db.execute('INSERT INTO studio_sessions VALUES (?,?,?,?,?,?,?)',(id,user,stamp[:7],stamp,expires,'provisioning',cfg['reservationPence']))
        try:
            result=self.mint(selection)
            with self.pilot.db() as db:issued=db.execute("UPDATE studio_sessions SET status='issued' WHERE id=? AND user_id=? AND status='provisioning'",(id,user)).rowcount
            if not issued:
                with self.pilot.db() as db:db.execute('DELETE FROM studio_trials WHERE user_id=? AND session_id=?',(user,id))
                return {'error':'This interview was cancelled before connecting.'},409
            return {**result,'sessionId':id,'subscribed':subscribed},201
        except Exception:
            with self.pilot.db() as db:
                db.execute("UPDATE studio_sessions SET status='failed',reserved_pence=0 WHERE id=?",(id,))
                db.execute('DELETE FROM studio_trials WHERE user_id=? AND session_id=?',(user,id))
            return {'error':'Gemini could not start the interview. Check provider setup or retry. No practice answer was graded.'},502

def handle_get(handler):
    if urlsplit(handler.path).path!='/api/studio/status':return False
    from pilot_api import instance
    pilot=instance();user=pilot.identity(handler)
    handler.json_response(Studio(pilot).status(user));return True
def handle_post(handler,body):
    path=urlsplit(handler.path).path
    if not path.startswith('/api/studio/'):return False
    from pilot_api import instance
    pilot=instance();user=pilot.identity(handler)
    if handler.headers.get('X-PrepSpace-Workspace')!=user:handler.json_response({'error':'Your workspace changed. Reload before starting an interview.','code':'workspace_changed'},409);return True
    data,status=Studio(pilot).post(user,path,body);handler.json_response(data,status);return True
