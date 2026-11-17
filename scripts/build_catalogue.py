#!/usr/bin/env python3
"""Build public contracts separately from server-only reference answers and tests."""
import hashlib, importlib.util, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('catalogue', ROOT/'content/catalogue.py')
catalogue = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalogue)

def build():
    problems = catalogue.problems()
    verification_path = ROOT/'content/verification.json'
    verification = json.loads(verification_path.read_text()) if verification_path.exists() else {}
    public = []
    for problem in problems:
        digest = hashlib.sha256(json.dumps({key:value for key,value in problem.items() if key!='digest'}, sort_keys=True).encode()).hexdigest()
        problem['digest'] = digest
        item = {key:value for key,value in problem.items() if key not in ('solution', 'tests', 'explanation', 'mutants')}
        item['verification'] = verification.get(problem['id'], {}) if verification.get(problem['id'], {}).get('digest') == digest else {'status':'pending'}
        item['testCount'] = len(problem['tests']) if problem['format'] != 'testing' else len(problem['mutants'])
        item['sampleTests'] = [test for test in problem['tests'] if test.get('sample')]
        item['review'] = {'owner':'PrepSpace content team', 'updated':'2026-11-17', 'practitioner':'pending'}
        public.append(item)
    (ROOT/'content/catalogue.json').write_text(json.dumps(problems, indent=2)+'\n')
    (ROOT/'dist/pilot-catalogue.js').write_text("'use strict';\nwindow.PILOT_CATALOGUE = "+json.dumps(public, separators=(',',':'))+';\n')
    return problems

if __name__ == '__main__':
    result = build()
    print('Built %d public contracts; server-only solutions and tests are separate.' % len(result))
