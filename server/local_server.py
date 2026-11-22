#!/usr/bin/env python3
"""Loopback-only PrepSpace server with bounded, macOS-sandboxed Java/Python runs.
Not a multi-tenant/public code execution service. It fails closed without sandbox-exec.
"""
import argparse,errno,json,os,re,resource,shutil,signal,subprocess,sys,tempfile,threading,time,uuid
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlsplit,unquote
import posixpath

ROOT=Path(__file__).resolve().parents[1]
from interview_studio import load_environment
load_environment(ROOT/'.env')
DIST=ROOT/'dist' if (ROOT/'dist/index.html').is_file() else ROOT
SANDBOX=Path('/usr/bin/sandbox-exec')
PYTHON=Path(sys.executable).resolve()
JAVA=Path(shutil.which('java') or '/missing/java').resolve()
JAVAC=Path(shutil.which('javac') or '/missing/javac').resolve()
JDK=JAVA.parent.parent
if sys.platform=='darwin' and str(JAVA)=='/usr/bin/java':
    try:
        discovered=Path(subprocess.check_output(['/usr/libexec/java_home'],stderr=subprocess.DEVNULL,text=True).strip())
        JAVA=discovered/'bin/java';JAVAC=discovered/'bin/javac';JDK=discovered
    except (OSError,subprocess.SubprocessError):pass
PYTHON_ROOT=Path(sys.base_prefix).resolve()
MAX_CODE=128*1024
MAX_INPUT=64*1024
MAX_OUTPUT=64*1024
SEMAPHORE=threading.BoundedSemaphore(2)
JOBS={}
CANCELLED={}
JOB_LOCK=threading.Lock()
READY=False

def quote(value):return json.dumps(str(value))
def profile(work,compile_phase=False):
    # Runtime files remain readable; personal directories and other temporary jobs do not.
    private=['/Users','/Volumes','/private/tmp','/tmp','/private/var/folders','/var/folders','/Library/Keychains','/Library/Application Support','/private/etc/ssh','/etc/ssh']
    rule='(deny file-read-data (require-all (require-any '+' '.join('(subpath '+quote(p)+')' for p in private)+') (require-not (subpath '+quote(JDK)+')) (require-not (subpath '+quote(PYTHON_ROOT)+')) (require-not (subpath '+quote(work)+'))))'
    writes=['(literal '+quote(work/'stdout.txt')+')','(literal '+quote(work/'stderr.txt')+')','(literal "/dev/null")']
    if compile_phase:writes.append('(subpath '+quote(work/'classes')+')')
    write='(deny file-write* (require-all '+' '.join('(require-not '+w+')' for w in writes)+'))'
    return '(version 1)\n(allow default)\n(deny network*)\n(deny process-fork)\n'+rule+'\n'+write+'\n'

def kill_job(job):
    job['cancelled'].set()
    with JOB_LOCK:proc=job.get('process')
    if proc and proc.poll() is None:
        try:os.killpg(proc.pid,signal.SIGKILL)
        except ProcessLookupError:pass

def execute(command,work,job,phase,timeout=7):
    if job['cancelled'].is_set():return {'status':'stopped','stdout':'','stderr':'Stopped.','exitCode':None}
    policy=work/('compile.sb' if phase=='compile' else 'run.sb');policy.write_text(profile(work,phase=='compile'))
    (work/'limits_exec.py').write_text((ROOT/'server/limits_exec.py').read_text())
    with (work/'stdin.txt').open('rb') as stdin,(work/'stdout.txt').open('wb') as stdout,(work/'stderr.txt').open('wb') as stderr:
        proc=subprocess.Popen([str(SANDBOX),'-f',str(policy),str(PYTHON),'-I','-S','-B',str(work/'limits_exec.py'),*map(str,command)],cwd=str(work),stdin=stdin,stdout=stdout,stderr=stderr,start_new_session=True,close_fds=True,env={'PATH':'/usr/bin:/bin','LANG':'en_US.UTF-8','TMPDIR':str(work)})
        with JOB_LOCK:job['process']=proc
        if job['cancelled'].is_set():kill_job(job)
        deadline=time.monotonic()+timeout;status=None
        while proc.poll() is None:
            if job['cancelled'].is_set():status='stopped';kill_job(job);break
            if time.monotonic()>deadline:status='timeout';kill_job(job);break
            if sum(p.stat().st_size for p in [work/'stdout.txt',work/'stderr.txt'] if p.exists())>MAX_OUTPUT:status='output_limit';kill_job(job);break
            time.sleep(.025)
        proc.wait(timeout=2)
    with JOB_LOCK:job['process']=None
    out=(work/'stdout.txt').read_bytes()[:MAX_OUTPUT].decode('utf-8','replace');err=(work/'stderr.txt').read_bytes()[:MAX_OUTPUT].decode('utf-8','replace')
    status=status or ('stopped' if job['cancelled'].is_set() else 'completed' if proc.returncode==0 else 'compile_error' if phase=='compile' else 'runtime_error')
    if proc.returncode in [-signal.SIGXCPU,-signal.SIGKILL] and status=='runtime_error':status='timeout'
    if status=='timeout':err+='\nExecution time limit exceeded.'
    if status=='output_limit' or proc.returncode==-signal.SIGXFSZ:status='output_limit';err+='\nOutput limit exceeded.'
    return {'status':status,'stdout':out,'stderr':err,'exitCode':proc.returncode,'phase':phase}

def run_code(language,code,input_text,run_id):
    start=time.monotonic();job={'cancelled':threading.Event(),'process':None}
    with JOB_LOCK:
        if run_id in JOBS:raise ValueError('This run ID is already active.')
        JOBS[run_id]=job
        if CANCELLED.pop(run_id,None) is not None:job['cancelled'].set()
    try:
        with tempfile.TemporaryDirectory(prefix='prepspace-run-',dir='/private/tmp') as directory:
            work=Path(directory);(work/'classes').mkdir();(work/'stdin.txt').write_text(input_text)
            if language=='python':
                file=work/'main.py';file.write_text(code)
                syntax_check="import sys; compile(open(sys.argv[1], encoding='utf-8').read(), sys.argv[1], 'exec')"
                result=execute([PYTHON,'-I','-S','-B','-c',syntax_check,file],work,job,'compile')
                if result['status']=='completed':result=execute([PYTHON,'-I','-S','-B',file],work,job,'run')
            else:
                match=re.search(r'\bpublic\s+(?:(?:final|abstract)\s+)?(?:class|record|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)',code)
                name=match.group(1) if match else 'Main'
                package=re.search(r'^\s*package\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*;',code,re.M)
                main=(package.group(1)+'.' if package else '')+name
                file=work/(name+'.java');file.write_text(code)
                result=execute([JAVAC,'-J-Xmx192m','-J-XX:-UsePerfData','-J-XX:ActiveProcessorCount=2','-proc:none','--release','17','-d',work/'classes',file],work,job,'compile',10)
                if result['status']=='completed':
                    result=execute([JAVA,'-Xint','-Xms16m','-Xmx128m','-Xss256k','-XX:MaxMetaspaceSize=96m','-XX:MaxDirectMemorySize=32m','-XX:ActiveProcessorCount=2','-XX:-UsePerfData','-XX:+DisableAttachMechanism','-XX:ErrorFile=/dev/null','-Djava.io.tmpdir='+str(work),'-cp',work/'classes',main],work,job,'run')
            result['durationMs']=round((time.monotonic()-start)*1000)
            # Temporary absolute paths are irrelevant in the website diagnostics.
            for field in ['stdout','stderr']:result[field]=result[field].replace(str(work)+'/','')
            return result
    finally:
        with JOB_LOCK:JOBS.pop(run_id,None)

def run_project(files,inputs,run_id):
    """Compile once; compare every process result in the trusted host, never in Java."""
    from grading import validate_files
    validate_files(files)
    job={'cancelled':threading.Event(),'process':None}
    with JOB_LOCK:
        if run_id in JOBS:raise ValueError('This run ID is already active.')
        JOBS[run_id]=job
        if CANCELLED.pop(run_id,None) is not None:job['cancelled'].set()
    try:
        with tempfile.TemporaryDirectory(prefix='prepspace-project-',dir='/private/tmp') as directory:
            work=Path(directory);(work/'classes').mkdir();(work/'stdin.txt').write_text('')
            for name,source in files.items():(work/name).write_text(source)
            compiled=execute([JAVAC,'-J-Xmx192m','-J-XX:-UsePerfData','-J-XX:ActiveProcessorCount=2','-proc:none','--release','17','-d',work/'classes',*[work/name for name in files]],work,job,'compile',10)
            if compiled['status']!='completed':return [compiled]
            results=[];deadline=time.monotonic()+25
            for text in inputs:
                if time.monotonic()>deadline:return [{'status':'timeout','stdout':'','stderr':'The complete check exceeded its execution budget.'}]
                (work/'stdin.txt').write_text(text)
                result=execute([JAVA,'-Xint','-Xms16m','-Xmx128m','-Xss256k','-XX:MaxMetaspaceSize=96m','-XX:MaxDirectMemorySize=32m','-XX:ActiveProcessorCount=2','-XX:-UsePerfData','-XX:+DisableAttachMechanism','-XX:ErrorFile=/dev/null','-Djava.io.tmpdir='+str(work),'-cp',work/'classes','Main'],work,job,'run',min(7,max(.1,deadline-time.monotonic())))
                for field in ('stdout','stderr'):result[field]=result[field].replace(str(work)+'/','')
                results.append(result)
                if result['status']!='completed':break
            return results
    finally:
        with JOB_LOCK:JOBS.pop(run_id,None)

def self_test():
    if sys.platform!='darwin' or not SANDBOX.is_file() or not PYTHON.is_file():return False
    # Try only our own sentinel, not a real user file.
    with tempfile.TemporaryDirectory(prefix='prepspace-guard-',dir='/private/tmp') as d:
        sentinel=Path(d)/'private.txt';sentinel.write_text('sandbox-test')
        source='''import errno,socket,subprocess,sys
try:
 open(SENTINEL).read()
 raise AssertionError("Private file was readable")
except PermissionError: pass
try:
 socket.socket().connect(("127.0.0.1",9))
 raise AssertionError("Network was available")
except OSError as error:
 assert error.errno in (errno.EPERM,errno.EACCES),str(error)
try:
 subprocess.run([sys.executable,"-c","print(1)"],check=True)
 raise AssertionError("Subprocess was available")
except PermissionError: pass
print("SANDBOX_OK")
'''.replace('SENTINEL',repr(str(sentinel)))
        result=run_code('python',source,'','probe-'+uuid.uuid4().hex)
        return result['status']=='completed' and result['stdout'].strip()=='SANDBOX_OK'

class Server(ThreadingHTTPServer):
    daemon_threads=True
    allow_reuse_address=True

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(DIST),**kwargs)
    def log_message(self,format,*args):
        # Log routes/status, never source, standard input or output.
        if len(args)>=2:sys.stdout.write('HTTP '+str(args[1])+' '+self.path.split('?')[0]+'\n');sys.stdout.flush()
    def end_headers(self):
        if getattr(self,'pilot_cookie',None):self.send_header('Set-Cookie',self.pilot_cookie)
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','same-origin')
        self.send_header('Cache-Control','no-store' if self.path.endswith(('.html','.js','.css')) or self.path.startswith('/api/') else 'max-age=3600')
        super().end_headers()
    def local_request(self):
        allowed={'127.0.0.1','localhost'}
        try:
            host=urlsplit('http://'+self.headers.get('Host','')).hostname
            origin=self.headers.get('Origin')
            return host in allowed and (not origin or origin in self.server.origins)
        except ValueError:return False
    def json_response(self,value,status=200):
        body=json.dumps(value).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    def do_GET(self):
        if not self.local_request():self.send_error(403);return
        path=posixpath.normpath(unquote(urlsplit(self.path).path))
        if path in ('/server','/.openai') or path.startswith(('/server/','/.openai/')):
            self.send_error(404);return
        from interview_studio import handle_get as studio_get
        if studio_get(self):return
        from pilot_api import handle_get
        if handle_get(self):return
        if self.path=='/api/runtimes':
            self.json_response({'local':True,'sandbox':READY,'python':READY,'java':READY and JAVA.is_file() and JAVAC.is_file(),'javaRelease':17,'limitSeconds':7});return
        super().do_GET()
    def do_POST(self):
        if not self.local_request() or not self.headers.get('Content-Type','').startswith('application/json'):self.json_response({'error':'Same-origin JSON requests only.'},403);return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<=0 or length>256*1024:raise ValueError('Request too large or empty.')
            body=json.loads(self.rfile.read(length))
            if not isinstance(body,dict):raise ValueError('Expected a JSON object.')
            from interview_studio import handle_post as studio_post
            if studio_post(self,body):return
            from pilot_api import handle_post
            if handle_post(self,body):return
            run_id=body.get('runId','')
            if not re.fullmatch(r'[A-Za-z0-9-]{1,64}',run_id):raise ValueError('Invalid run ID.')
            if self.path=='/api/cancel':
                with JOB_LOCK:
                    job=JOBS.get(run_id);CANCELLED[run_id]=time.monotonic()
                    for old in list(CANCELLED):
                        if time.monotonic()-CANCELLED[old]>60 or len(CANCELLED)>256:CANCELLED.pop(old,None)
                if job:kill_job(job)
                self.json_response({'cancelled':True});return
            if self.path!='/api/run':self.json_response({'error':'Unknown route.'},404);return
            if not READY:self.json_response({'error':'The local execution sandbox is unavailable.'},503);return
            language=body.get('language');code=body.get('code');input_text=body.get('input','')
            if language not in ['java','python']:raise ValueError('Unsupported local runtime.')
            if not isinstance(code,str) or not code.strip() or len(code.encode())>MAX_CODE:raise ValueError('Code must be between 1 and 128 KiB.')
            if not isinstance(input_text,str) or len(input_text.encode())>MAX_INPUT:raise ValueError('Standard input exceeds 64 KiB.')
            if language=='java' and (not JAVA.is_file() or not JAVAC.is_file()):self.json_response({'error':'JDK is not installed.'},503);return
            if not SEMAPHORE.acquire(blocking=False):self.json_response({'error':'Two runs are already active. Try again shortly.'},429);return
            try:result=run_code(language,code,input_text,run_id)
            finally:SEMAPHORE.release()
            self.json_response(result)
        except (ValueError,json.JSONDecodeError) as error:self.json_response({'error':str(error)},400)
        except (BrokenPipeError,ConnectionResetError):pass
        except Exception:self.json_response({'error':'The local run could not be completed.'},500)
    def do_DELETE(self):
        if not self.local_request() or self.path!='/api/pilot/account' or not self.headers.get('Content-Type','').startswith('application/json'):
            self.json_response({'error':'Same-origin account deletion only.'},403);return
        from pilot_api import instance
        pilot=instance();user=pilot.identity(self)
        if self.headers.get('X-PrepSpace-Workspace') not in (None,user):self.json_response({'error':'Your workspace changed. Reload before deleting data.','code':'workspace_changed'},409);return
        data,status=pilot.delete(user)
        self.pilot_cookie='prepspace_local=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
        self.json_response(data,status)

def main():
    global READY
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8796);parser.add_argument('--self-test',action='store_true');args=parser.parse_args()
    READY=self_test()
    if args.self_test:print(json.dumps({'sandbox':READY,'java':JAVA.is_file() and JAVAC.is_file(),'python':str(PYTHON)}));return 0 if READY else 1
    if not READY:raise SystemExit('Local execution sandbox self-test failed; no server was started.')
    server=Server(('127.0.0.1',args.port),Handler);server.origins={'http://127.0.0.1:'+str(args.port),'http://localhost:'+str(args.port)}
    print('PrepSpace local editor and compiler: http://127.0.0.1:'+str(args.port),flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:
        with JOB_LOCK:jobs=list(JOBS.values())
        for job in jobs:kill_job(job)
        server.server_close()
    return 0
if __name__=='__main__':raise SystemExit(main())
