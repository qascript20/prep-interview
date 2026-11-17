"""Trusted, deterministic evaluation; candidate output never supplies its own grade."""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, ROUND_HALF_EVEN
import json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def catalogue():
    return {item['id']:item for item in json.loads((ROOT/'content/catalogue.json').read_text())}

def normalize(value):
    return value.replace('\r\n','\n').rstrip('\n')

def validate_files(files):
    if not isinstance(files,dict) or not 1<=len(files)<=12 or 'Main.java' not in files:
        raise ValueError('Supply Main.java and at most 11 other Java files.')
    for name,source in files.items():
        if not re.fullmatch(r'[A-Za-z_$][A-Za-z0-9_$]*\.java',name):
            raise ValueError('Use Java filenames without paths.')
        if not isinstance(source,str) or re.search(r'^\s*package\s',source,re.M):
            raise ValueError('Java sources must be strings without package declarations.')
    if sum(len(source.encode()) for source in files.values())>128*1024:
        raise ValueError('The project exceeds 128 KiB.')
    return files

def validation(value, fault=None):
    f=value.split('|')
    if len(f)!=3: raise ValueError('Use symbol|quantity|price.')
    symbol,q,p=f[0],int(f[1]),None if f[2]=='~' else Decimal(f[2])
    if not -(2**63)<=q<2**63 or p is not None and (not p.is_finite() or len(f[2])>32): raise ValueError('Value outside the contract.')
    errors=[]
    if (symbol=='~' and fault!='missing-symbol') or (not symbol.strip() and fault!='blank-symbol'): errors.append('Symbol is required')
    if (q==0 and fault!='zero-quantity') or (q<0 and fault!='negative-quantity'): errors.append('Quantity must be positive')
    if (p is None and fault!='missing-price') or (p is not None and (p<0 or p==0 and fault!='zero-price')): errors.append('Price must be positive')
    return ';'.join(errors) or 'OK'

def missing(value,fault=None):
    f=value.split('|')
    if len(f)!=2: raise ValueError('Use expected|actual.')
    def ids(s):
        values=[] if s=='-' else s.split(',')
        if len(values)!=len(set(values)) or any(not x.strip() or '=' in x for x in values): raise ValueError('IDs must be unique and nonblank.')
        return values
    a,b=ids(f[0]),ids(f[1])
    if fault=='reverse-direction': a,b=b,a
    result=[x for x in a if x not in b]
    if fault=='sorted-output':result.sort()
    if fault=='case-insensitive':result=[x for x in a if x.lower() not in {y.lower() for y in b}]
    if fault=='empty-actual' and not b:result=[]
    if fault=='drop-final':result=result[:-1]
    return ','.join(result) or '-'

def retry(value,fault=None):
    f=value.split('|')
    if len(f)!=2:raise ValueError('Use maxAttempts|statuses.')
    max_attempts=int(f[0]);codes=[int(x) for x in f[1].split(',')]
    if not 1<=max_attempts<=10 or len(codes)<max_attempts or any(not 100<=c<=599 for c in codes):raise ValueError('Retry case outside the documented bounds.')
    limit=max_attempts+(fault=='extra-attempt');attempts=0;last=0
    for code in codes:
        if attempts>=limit:break
        last=code;attempts+=1
        again=code==429 or 500<=code<=599
        if fault=='retry-4xx':again=400<=code<=599
        if fault=='ignore-429' and code==429:again=False
        if fault=='ignore-5xx' and code>=500:again=False
        if fault=='single-attempt':again=False
        if not again:break
    return str(attempts)+':'+str(last)

def money(value,fault=None):
    f=value.split('|')
    if len(f)!=2:raise ValueError('Use quantity|price.')
    q=int(f[0]);p=Decimal(f[1])
    if not -1000000<=q<=1000000 or not p.is_finite() or abs(p)>1000000 or p.as_tuple().exponent < -6:raise ValueError('Notional case outside the documented bounds.')
    if q<0 or q==0 and fault!='zero-quantity' or p==0 or p<0 and fault!='negative-price':return 'ERROR'
    value=(p.quantize(Decimal('.01'),rounding=ROUND_HALF_UP)*q if fault=='round-price-first' else p+q if fault=='addition' else p*q)
    return format(value.quantize(Decimal('.01'),rounding=ROUND_HALF_EVEN if fault=='half-even' else ROUND_HALF_UP),'.2f')

ORACLES={'validation':validation,'missing':missing,'retry':retry,'money':money}

def mutation_grade(problem, output):
    lines=[line for line in output.splitlines() if line.strip()]
    if not 1<=len(lines)<=50:
        return {'status':'incorrect_output','cases':[], 'passed':0,'total':len(problem['mutants']),'diagnostic':'Emit between 1 and 50 input => expected case declarations.'}
    assertions=[];invalid=[];oracle=ORACLES[problem['oracle']]
    for n,line in enumerate(lines):
        try:
            if len(line)>4096 or '=>' not in line:raise ValueError('Use input => expected.')
            input_text,expected=line.split('=>',1);input_text=input_text.strip();expected=expected.strip()
            actual=oracle(input_text)
            if expected!=actual:invalid.append({'name':'Assertion '+str(n+1),'category':'test-validity','input':input_text,'expected':actual,'actual':expected,'passed':False})
            assertions.append((input_text,expected))
        except (ValueError,InvalidOperation,OverflowError) as error:
            invalid.append({'name':'Assertion '+str(n+1),'category':'test-validity','passed':False,'diagnostic':str(error)})
    if invalid:return {'status':'incorrect_output','cases':invalid,'passed':0,'total':len(problem['mutants']),'diagnostic':'Fix the invalid assertions before measuring fault detection.'}
    results=[]
    for fault in problem['mutants']:
        witness=next((i for i,e in assertions if oracle(i,fault)!=e),None)
        results.append({'name':fault,'category':'fault-detection','passed':witness is not None,'input':witness,'expected':'Detected','actual':'Detected' if witness is not None else 'Survived'})
    passed=sum(c['passed'] for c in results)
    return {'status':'completed' if passed==len(results) else 'incorrect_output','cases':results,'passed':passed,'total':len(results),'assertions':len(assertions),'diagnostic':'All assertions are valid. '+str(passed)+' of '+str(len(results))+' seeded faulty behaviours detected.'}

def grade(problem, executions, sample_only=False):
    if not executions:return {'status':'infrastructure_error','cases':[],'passed':0,'total':0,'diagnostic':'No execution results were returned. Retry this run.'}
    terminal=next((run for run in executions if run.get('status')!='completed'),None)
    if terminal:return {'status':terminal.get('status','infrastructure_error'),'cases':[],'passed':0,'total':0,'diagnostic':terminal.get('stderr',''),'stdout':terminal.get('stdout','')}
    if problem['format']=='testing':return mutation_grade(problem,executions[0].get('stdout',''))
    tests=[test for test in problem['tests'] if not sample_only or test.get('sample')]
    if len(executions)!=len(tests):return {'status':'infrastructure_error','cases':[],'passed':0,'total':0,'diagnostic':'The runner returned an incomplete result set. Retry this run.'}
    cases=[]
    for test,execution in zip(tests,executions):
        actual=normalize(execution.get('stdout',''));expected=normalize(test['expected'])
        cases.append({**test,'actual':actual,'passed':actual==expected})
    passed=sum(case['passed'] for case in cases)
    return {'status':'completed' if passed==len(cases) else 'incorrect_output','cases':cases,'passed':passed,'total':len(cases),'diagnostic':str(passed)+' of '+str(len(cases))+' documented-contract checks passed.'}

def feedback(result):
    factual=[]
    if result['status']=='infrastructure_error':factual.append('This attempt has no correctness result because execution infrastructure failed. Your code is preserved.')
    elif result['total']:
        factual.append(str(result['passed'])+' of '+str(result['total'])+' checks passed in this run.')
        failures={case.get('category','normal') for case in result['cases'] if not case.get('passed')}
        if failures:factual.append('Inspect the failing '+', '.join(sorted(failures))+' checks and compare expected with actual results.')
    else:factual.append('Resolve the execution diagnostic before drawing conclusions about correctness.')
    return {'kind':'deterministic','observations':factual,'selfReview':['Explain why your collection and arithmetic choices satisfy the contract.','Describe tests you would add and the production failure modes they address.','Explain complexity, concurrency limits and any domain assumptions.'],'limitations':'Functional checks cover the documented cases. Design, communication, immutability and race freedom are not automatically certified.'}
