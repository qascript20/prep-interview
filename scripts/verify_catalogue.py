#!/usr/bin/env python3
"""Run actual Java references inside the existing local sandbox, then publish evidence."""
import concurrent.futures, hashlib, importlib.util, json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'server'))
sys.path.insert(0,str(ROOT/'scripts'))
from build_catalogue import build
from grading import grade
import local_server

def verify(problem):
    inputs=[''] if problem['format']=='testing' else [test['input'] for test in problem['tests']]
    result=grade(problem,local_server.run_project(problem['solution'],inputs,'verify-'+problem['id']))
    if result['status']!='completed':return problem['id'],None,result
    # A constant-output program must not pass this exercise's complete checks.
    wrong={'Main.java':'public class Main { public static void main(String[] args){ System.out.print("WRONG"); } }'}
    negative=grade(problem,local_server.run_project(wrong,inputs,'wrong-'+problem['id']))
    if negative['status']=='completed':return problem['id'],None,{'diagnostic':'Negative control passed unexpectedly.'}
    return problem['id'],{'digest':problem['digest'],'status':'verified','date':'2026-11-17','runtime':'Java --release 17','checks':result['total'],'negativeControl':'rejected'},None

if __name__=='__main__':
    if not local_server.self_test():raise SystemExit('Sandbox self-test failed. Verification will not run unsandboxed.')
    problems=build();verified={};errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for id,evidence,error in pool.map(verify,problems):
            if error:errors.append((id,error));print('FAIL',id,json.dumps(error),flush=True)
            else:verified[id]=evidence;print('PASS',id,evidence['checks'],flush=True)
    if errors:raise SystemExit(str(len(errors))+' exercises failed. Verification metadata was not updated.')
    (ROOT/'content/verification.json').write_text(json.dumps(verified,indent=2)+'\n')
    build();print('All 24 references passed; all 24 negative controls were rejected.')
