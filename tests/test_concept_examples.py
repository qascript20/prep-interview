"""Run the published Python concept examples against their published outputs."""
import html
import json
from pathlib import Path
import re
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ConceptExamples(unittest.TestCase):
    def test_python_concept_examples(self):
        source = """
import fs from 'node:fs';import vm from 'node:vm';
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync('dist/language-data.js','utf8'),context);
console.log(JSON.stringify(Object.entries(context.window.LANGUAGE_CONTENT.python).filter(([id])=>id.startsWith('1-'))));
"""
        result = subprocess.run(['node', '--input-type=module', '-e', source], cwd=ROOT, text=True, capture_output=True, check=True)
        examples = json.loads(result.stdout)
        self.assertEqual(len(examples), 10)
        for lesson_id, lesson in examples:
            with self.subTest(lesson=lesson_id):
                body = lesson['html']
                code = html.unescape(re.search(r'<pre><code>(.*?)</code></pre>', body, re.S).group(1))
                output = re.search(r'<p><strong>Output</strong></p>(.*?)<p><strong>Why this happens', body, re.S).group(1)
                output = re.sub(r'<br\s*/?>', '\n', output)
                expected = html.unescape(re.sub(r'<[^>]+>', '', output)).strip()
                execution = subprocess.run([sys.executable, '-I', '-B', '-c', code], text=True, capture_output=True, timeout=10)
                self.assertEqual(execution.returncode, 0, execution.stderr)
                self.assertEqual(execution.stdout.strip(), expected)


if __name__ == '__main__':
    unittest.main()
