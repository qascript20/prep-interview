"""Loopback pilot persistence. Production identity is provided separately by Sites."""
import concurrent.futures, datetime as dt, hashlib, json, os, re, secrets, sqlite3, threading, time, uuid
from pathlib import Path
from http.cookies import SimpleCookie
from urllib.parse import urlsplit
from grading import catalogue, validate_files, grade, feedback

ROOT=Path(__file__).resolve().parents[1]
TERMINAL={'completed','incorrect_output','compile_error','runtime_error','timeout','output_limit','stopped','infrastructure_error'}

def now():return dt.datetime.now(dt.timezone.utc).isoformat(timespec='milliseconds')
class Pilot:
    def __init__(self, db_path, runner, cancel, semaphore):
        self.path=Path(db_path); self.path.parent.mkdir(parents=True,exist_ok=True);self.path.parent.chmod(0o700)
        if self.path.exists():self.path.chmod(0o600)
        self.lock=threading.RLock();self.runner=runner;self.cancel=cancel;self.semaphore=semaphore
        self.pool=concurrent.futures.ThreadPoolExecutor(max_workers=2,thread_name_prefix='pilot')
        with self.db() as db:
            db.executescript((ROOT/'server/schema.sql').read_text());self.path.chmod(0o600)
            db.execute("UPDATE pilot_attempts SET status='infrastructure_error', reserved_pence=0, result=?, updated_at=? WHERE status IN ('queued','running')",(json.dumps({'status':'infrastructure_error','cases':[],'passed':0,'total':0,'diagnostic':'The local server restarted before this run completed. Retry; your source is preserved.'}),now()))
    def db(self):
        db=sqlite3.connect(self.path,timeout=10);db.row_factory=sqlite3.Row;db.execute('PRAGMA journal_mode=WAL');return db
    def identity(self,handler):
        cookie=SimpleCookie()
        try:cookie.load(handler.headers.get('Cookie',''))
        except Exception:pass
        token=cookie.get('prepspace_local')
        value=token.value if token and re.fullmatch(r'[a-f0-9]{64}',token.value) else secrets.token_hex(32)
        handler.pilot_cookie='prepspace_local='+value+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000'
        user='local-'+hashlib.sha256(value.encode()).hexdigest()
        with self.db() as db:db.execute('INSERT OR IGNORE INTO pilot_members(user_id,joined_at) VALUES (?,?)',(user,now()))
        return user
    def quota(self,user):
        stamp=now();day=stamp[:10];month=stamp[:7]
        with self.db() as db:
            used=db.execute('SELECT count(*) FROM pilot_attempts WHERE user_id=? AND day=?',(user,day)).fetchone()[0]
            spent=db.execute('SELECT COALESCE(sum(reserved_pence+charged_pence),0) FROM pilot_attempts WHERE month=?',(month,)).fetchone()[0]
        return {'limit':20,'used':used,'remaining':max(0,20-used),'resetAt':(dt.datetime.now(dt.timezone.utc).replace(hour=0,minute=0,second=0,microsecond=0)+dt.timedelta(days=1)).isoformat(),'executionBudgetPence':6000,'accountedPence':spent,'accounting':'Conservative capacity accounting; local execution has no provider invoice.'}
    def record(self,row,include_source=False):
        if row is None:return None
        item=dict(row)
        for key in ('assistance','result'):item[key]=json.loads(item[key]) if item[key] else None
        if include_source:item['files']=json.loads(item['files'])
        else:item.pop('files',None)
        return item
    def evaluate(self,user,body):
        problems=catalogue();problem=problems.get(body.get('problemId'))
        if not problem or body.get('version')!=problem['version']:raise ValueError('Reload this versioned problem before checking it.')
        files=validate_files(body.get('files'));mode=body.get('mode','check')
        if mode not in ('check','samples'):raise ValueError('Unknown evaluation mode.')
        run_id=body.get('runId') or str(uuid.uuid4())
        if not re.fullmatch(r'[a-zA-Z0-9-]{1,100}',run_id):raise ValueError('Invalid run ID.')
        explanation=body.get('explanation','');assistance=body.get('assistance',{})
        if not isinstance(explanation,str) or len(explanation)>10000 or not isinstance(assistance,dict) or len(json.dumps(assistance))>2000:raise ValueError('Explanation or assistance record is too large.')
        stamp=now()
        with self.lock,self.db() as db:
            existing=db.execute('SELECT * FROM pilot_attempts WHERE id=?',(run_id,)).fetchone()
            if existing:
                if existing['user_id']!=user:return {'error':'Run not found.'},404
                return self.record(existing),200
            used=db.execute('SELECT count(*) FROM pilot_attempts WHERE user_id=? AND day=?',(user,stamp[:10])).fetchone()[0]
            queued=db.execute("SELECT count(*) FROM pilot_attempts WHERE status IN ('queued','running')").fetchone()[0]
            spent=db.execute('SELECT COALESCE(sum(reserved_pence+charged_pence),0) FROM pilot_attempts WHERE month=?',(stamp[:7],)).fetchone()[0]
            if db.execute('SELECT job_id FROM pilot_cancellations WHERE user_id=? AND job_id=?',(user,run_id)).fetchone():return {'id':run_id,'status':'stopped'},200
            if used>=20:return {'error':'Your 20 daily jobs are used. Drafts and downloads remain available.','quota':self.quota(user)},429
            if spent+5>6000:return {'error':'The pilot execution allocation is paused for this month. Your work remains available.'},429
            if queued>=30:return {'error':'The queue is full. Your draft is saved; retry shortly.'},429
            db.execute('INSERT INTO pilot_attempts(id,user_id,problem_id,problem_version,language,mode,status,files,assistance,explanation,created_at,updated_at,day,month,reserved_pence) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(run_id,user,problem['id'],problem['version'],'java',mode,'queued',json.dumps(files),json.dumps(assistance),explanation,stamp,stamp,stamp[:10],stamp[:7],5))
        self.pool.submit(self.work,run_id,problem,files,mode)
        return {'id':run_id,'status':'queued'},202
    def work(self,run_id,problem,files,mode):
        with self.semaphore:
            with self.db() as db:
                row=db.execute('SELECT cancelled FROM pilot_attempts WHERE id=?',(run_id,)).fetchone()
                if not row or row['cancelled']:return
                db.execute("UPDATE pilot_attempts SET status='running',started_at=?,updated_at=? WHERE id=?",(now(),now(),run_id))
            start=time.monotonic()
            try:
                tests=[t for t in problem['tests'] if mode!='samples' or t.get('sample')]
                inputs=[''] if problem['format']=='testing' else [t['input'] for t in tests]
                executions=self.runner(files,inputs,run_id)
                result=grade(problem,executions,mode=='samples')
            except Exception:
                result={'status':'infrastructure_error','cases':[],'passed':0,'total':0,'diagnostic':'The local execution service could not complete this job. Retry; the source is preserved.'}
            result['feedback']=feedback(result);result['durationMs']=round((time.monotonic()-start)*1000)
            with self.db() as db:
                row=db.execute('SELECT cancelled FROM pilot_attempts WHERE id=?',(run_id,)).fetchone()
                if not row:return
                if row['cancelled']:result={'status':'stopped','cases':[],'passed':0,'total':0,'diagnostic':'You stopped this run.'}
                db.execute('UPDATE pilot_attempts SET status=?,result=?,reserved_pence=0,charged_pence=0,updated_at=? WHERE id=?',(result['status'],json.dumps(result),now(),run_id))
    def get(self,user,path):
        if path=='/api/pilot/state':
            with self.db() as db: consent=db.execute('SELECT telemetry FROM pilot_members WHERE user_id=?',(user,)).fetchone()
            return {'workspaceKey':user,'telemetry':bool(consent['telemetry']) if consent else False,'mode':'local','member':True,'signedIn':False,'cloudSync':False,'executionReady':True,'quota':self.quota(user),'ai':{'enabled':False,'reason':'Expert benchmark and provider setup pending. Deterministic test feedback is available.'},'processingRegion':'This Mac; no source is sent to an execution provider.'},200
        if path=='/api/pilot/attempts':
            with self.db() as db:rows=db.execute('SELECT * FROM pilot_attempts WHERE user_id=? ORDER BY created_at DESC LIMIT 200',(user,)).fetchall()
            return {'attempts':[self.record(row) for row in rows]},200
        if path.startswith('/api/pilot/jobs/'):
            id=path.rsplit('/',1)[-1]
            with self.db() as db:row=db.execute('SELECT * FROM pilot_attempts WHERE id=? AND user_id=?',(id,user)).fetchone()
            return (self.record(row,include_source=True),200) if row else ({'error':'Run not found.'},404)
        if path=='/api/pilot/drafts':
            with self.db() as db:rows=db.execute('SELECT * FROM pilot_drafts WHERE user_id=?',(user,)).fetchall()
            return {'drafts':[{**dict(row),'files':json.loads(row['files'])} for row in rows]},200
        if path=='/api/pilot/plan':
            with self.db() as db:row=db.execute('SELECT document,revision FROM pilot_plans WHERE user_id=?',(user,)).fetchone()
            return {'document':json.loads(row['document']) if row else None,'revision':row['revision'] if row else 0},200
        if path=='/api/pilot/export':
            with self.db() as db:
                export={table:[dict(row) for row in db.execute('SELECT * FROM '+table+' WHERE user_id=?',(user,)).fetchall()] for table in ('pilot_drafts','pilot_attempts','pilot_plans','pilot_reports','pilot_events','studio_sessions','studio_plans')}
            return {'schemaVersion':1,'exportedAt':now(),'scope':'This local browser workspace','data':export},200
        return {'error':'Unknown pilot route.'},404
    def post(self,user,path,body):
        if path=='/api/pilot/consent':
            if type(body.get('enabled'))!=bool:raise ValueError('Expected a boolean consent value.')
            with self.db() as db:
                db.execute('UPDATE pilot_members SET telemetry=? WHERE user_id=?',(int(body['enabled']),user))
                if not body['enabled']:db.execute('DELETE FROM pilot_events WHERE user_id=?',(user,))
            return {'enabled':body['enabled']},200
        if path=='/api/pilot/events':
            kind=body.get('kind');attempt=body.get('attemptId')
            if kind not in ('result_viewed','session_completed','transfer_started'):raise ValueError('Unknown event type.')
            with self.db() as db:
                allowed=db.execute('SELECT telemetry FROM pilot_members WHERE user_id=?',(user,)).fetchone()
                if not allowed or not allowed['telemetry']:return {'recorded':False},200
                if attempt and not db.execute('SELECT id FROM pilot_attempts WHERE id=? AND user_id=?',(attempt,user)).fetchone():return {'error':'Attempt not found.'},404
                db.execute('INSERT INTO pilot_events VALUES (?,?,?,?,?)',(str(uuid.uuid4()),user,kind,attempt,now()))
            return {'recorded':True},201
        if path=='/api/pilot/evaluate':return self.evaluate(user,body)
        if path.startswith('/api/pilot/jobs/') and path.endswith('/cancel'):
            id=path.split('/')[-2]
            with self.db() as db:
                row=db.execute('SELECT * FROM pilot_attempts WHERE id=? AND user_id=?',(id,user)).fetchone()
                if not row:
                    if not re.fullmatch(r'[a-zA-Z0-9-]{1,100}',id):raise ValueError('Invalid run ID.')
                    db.execute('INSERT OR IGNORE INTO pilot_cancellations VALUES (?,?,?)',(user,id,now()))
                    return {'id':id,'status':'stopped'},200
                if row['status'] in TERMINAL:return self.record(row),200
                db.execute("UPDATE pilot_attempts SET cancelled=1,status='stopped',reserved_pence=0,updated_at=? WHERE id=? AND user_id=?",(now(),id,user))
            self.cancel(id);return {'id':id,'status':'stopped'},200
        if path=='/api/pilot/drafts':
            problem=catalogue().get(body.get('problemId'));files=validate_files(body.get('files'));revision=body.get('revision')
            if not problem or type(revision)!=int or revision<0:raise ValueError('Invalid draft revision.')
            with self.lock,self.db() as db:
                row=db.execute('SELECT revision,files FROM pilot_drafts WHERE user_id=? AND problem_id=? AND language=?',(user,problem['id'],'java')).fetchone()
                current=row['revision'] if row else 0
                if revision!=current:return {'error':'A newer saved draft exists. Both copies have been preserved.','revision':current,'files':json.loads(row['files']) if row else {}},409
                db.execute('INSERT INTO pilot_drafts VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,problem_id,language) DO UPDATE SET revision=excluded.revision,files=excluded.files,updated_at=excluded.updated_at',(user,problem['id'],'java',current+1,json.dumps(files),now()))
            return {'revision':current+1,'savedAt':now()},200
        if path=='/api/pilot/plan':
            document=body.get('document');revision=body.get('revision')
            if not isinstance(document,dict) or len(json.dumps(document))>20000 or type(revision)!=int:raise ValueError('Invalid preparation plan.')
            with self.lock,self.db() as db:
                row=db.execute('SELECT revision FROM pilot_plans WHERE user_id=?',(user,)).fetchone();current=row['revision'] if row else 0
                if revision!=current:return {'error':'A newer plan exists. Reload before saving.','revision':current},409
                db.execute('INSERT INTO pilot_plans VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET document=excluded.document,revision=excluded.revision,updated_at=excluded.updated_at',(user,json.dumps(document),current+1,now()))
            return {'revision':current+1},200
        if path=='/api/pilot/reports':
            problem=catalogue().get(body.get('problemId'));text=body.get('body','');kind=body.get('kind','content')
            if not problem or kind not in ('content','tests','accessibility','feedback') or not isinstance(text,str) or not 5<=len(text.strip())<=2000:raise ValueError('Choose an issue type and provide 5–2,000 characters.')
            id=str(uuid.uuid4())
            with self.db() as db:db.execute('INSERT INTO pilot_reports VALUES (?,?,?,?,?,?,?)',(id,user,problem['id'],problem['version'],kind,text.strip(),now()))
            return {'id':id,'status':'recorded','support':'Recorded locally for the site owner. No message was sent.'},201
        if path=='/api/pilot/ai-feedback':return {'error':'AI feedback is disabled until its expert benchmark and provider setup pass the release gate.'},503
        return {'error':'Unknown pilot route.'},404
    def delete(self,user):
        with self.db() as db:running=db.execute("SELECT id FROM pilot_attempts WHERE user_id=? AND status IN ('queued','running')",(user,)).fetchall()
        for row in running:self.cancel(row['id'])
        with self.lock,self.db() as db:
            db.execute('UPDATE studio_plans SET user_id=? WHERE user_id=?',('deleted-'+uuid.uuid4().hex,user))
            db.execute('UPDATE studio_sessions SET user_id=? WHERE user_id=?',('deleted-'+uuid.uuid4().hex,user))
            for table in ('pilot_drafts','pilot_attempts','pilot_plans','pilot_reports','pilot_events','pilot_cancellations','pilot_members'):db.execute('DELETE FROM '+table+' WHERE user_id=?',(user,))
        return {'deleted':True,'scope':'Local server workspace; use the browser clear button to remove device copies.'},200

_INSTANCE=None
_INSTANCE_LOCK=threading.Lock()

def instance():
    global _INSTANCE
    with _INSTANCE_LOCK:
        return _make_instance()

def _make_instance():
    global _INSTANCE
    if _INSTANCE is None:
        import local_server as local
        # When launched as a script, use the running module rather than importing a second job registry.
        import sys
        local=sys.modules.get('__main__') if hasattr(sys.modules.get('__main__'),'run_project') else local
        def cancel(id):
            with local.JOB_LOCK:
                job=local.JOBS.get(id);local.CANCELLED[id]=time.monotonic()
            if job:local.kill_job(job)
        _INSTANCE=Pilot(os.environ.get('PREPSPACE_LOCAL_DB',str(ROOT/'.runtime/pilot.sqlite3')),local.run_project,cancel,local.SEMAPHORE)
    return _INSTANCE

def handle_get(handler):
    path=urlsplit(handler.path).path
    if not path.startswith('/api/pilot/'):return False
    if path.startswith('/api/pilot/problems/') and path.endswith('/answer'):
        id=path.split('/')[-2];problem=catalogue().get(id)
        handler.json_response({'files':problem['solution'],'explanation':problem['explanation'],'version':problem['version']} if problem else {'error':'Problem not found.'},200 if problem else 404);return True
    pilot=instance();user=pilot.identity(handler)
    if path!='/api/pilot/state' and handler.headers.get('X-PrepSpace-Workspace') not in (None,user):handler.json_response({'error':'Your browser workspace changed. Reload before syncing private work.','code':'workspace_changed'},409);return True
    data,status=pilot.get(user,path);handler.json_response(data,status);return True

def handle_post(handler,body):
    path=urlsplit(handler.path).path
    if not path.startswith('/api/pilot/'):return False
    if path=='/api/pilot/project-download':
        import io,zipfile
        files=validate_files(body.get('files'));output=io.BytesIO()
        with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
            for name,source in files.items():archive.writestr(name,source)
            archive.writestr('README.txt','Java 17 project\nCompile: javac --release 17 *.java\nRun: java Main\nUse the documented problem inputs.\n')
        data=output.getvalue();handler.send_response(200);handler.send_header('Content-Type','application/zip');handler.send_header('Content-Length',str(len(data)));handler.end_headers();handler.wfile.write(data);return True
    pilot=instance();user=pilot.identity(handler)
    if handler.headers.get('X-PrepSpace-Workspace') not in (None,user):handler.json_response({'error':'Your browser workspace changed. Reload before syncing private work.','code':'workspace_changed'},409);return True
    data,status=pilot.post(user,path,body);handler.json_response(data,status);return True
