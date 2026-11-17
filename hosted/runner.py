#!/usr/bin/env python3
"""E2B template entry point. Root orchestration; candidate children run as UID 10001."""
import json, os, resource, signal, subprocess, time
from pathlib import Path
BASE=Path('/opt/prepspace');WORK=Path('/work');LIMIT=65536

def child_limits():
    os.setgid(10001);os.setuid(10001)
    resource.setrlimit(resource.RLIMIT_CPU,(18,18))
    resource.setrlimit(resource.RLIMIT_FSIZE,(LIMIT,LIMIT))
    resource.setrlimit(resource.RLIMIT_NOFILE,(128,128))
    resource.setrlimit(resource.RLIMIT_NPROC,(64,64))
    resource.setrlimit(resource.RLIMIT_CORE,(0,0))

def execute(command,text,phase,timeout):
    stdin=BASE/'stdin';stdout=BASE/'stdout';stderr=BASE/'stderr';stdin.write_text(text)
    status=None
    with stdin.open('rb') as i,stdout.open('wb') as o,stderr.open('wb') as e:
        process=subprocess.Popen(command,stdin=i,stdout=o,stderr=e,cwd=WORK,env={'PATH':'/opt/java/openjdk/bin:/usr/bin:/bin','LANG':'C.UTF-8','HOME':'/work'},preexec_fn=child_limits,start_new_session=True)
        deadline=time.monotonic()+timeout
        try:
            while process.poll() is None:
                if time.monotonic()>deadline:status='timeout';break
                if stdout.stat().st_size+stderr.stat().st_size>LIMIT:status='output_limit';break
                time.sleep(.02)
        finally:
            try:os.killpg(process.pid,signal.SIGKILL)
            except ProcessLookupError:pass
            process.wait()
    out=stdout.read_bytes()[:LIMIT].decode('utf-8','replace');err=stderr.read_bytes()[:LIMIT].decode('utf-8','replace')
    if stdout.stat().st_size+stderr.stat().st_size>=LIMIT:status='output_limit'
    return {'status':status or ('completed' if process.returncode==0 else 'compile_error' if phase=='compile' else 'runtime_error'),'stdout':out,'stderr':err,'exitCode':process.returncode}

def main():
    payload=json.loads((BASE/'job.json').read_text());WORK.mkdir(exist_ok=True);os.chown(WORK,10001,10001)
    files=payload['files']
    for name,source in files.items():(WORK/name).write_text(source)
    start=time.monotonic()
    compiled=execute(['javac','-J-Xmx192m','-J-XX:ActiveProcessorCount=2','-J-XX:-UsePerfData','--release','17','-proc:none',*files.keys()],'','compile',8)
    if compiled['status']!='completed':return [compiled]
    results=[]
    for input_text in payload['inputs']:
        remaining=20-(time.monotonic()-start)
        if remaining<=0:return [{'status':'timeout','stdout':'','stderr':'Complete check time limit exceeded.'}]
        result=execute(['java','-Xms16m','-Xmx128m','-Xss256k','-XX:MaxMetaspaceSize=96m','-XX:MaxDirectMemorySize=32m','-XX:ActiveProcessorCount=2','-XX:-UsePerfData','-XX:+DisableAttachMechanism','-XX:ErrorFile=/dev/null','-cp','/work','Main'],input_text,'run',min(4,remaining))
        results.append(result)
        if result['status']!='completed':break
    return results

if __name__=='__main__':
    try:print(json.dumps(main()))
    except Exception:print(json.dumps([{'status':'infrastructure_error','stdout':'','stderr':'Sandbox orchestration failed.'}]))
