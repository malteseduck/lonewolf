"""Check every script of the project parses: JavaScript with node --check, Python with py_compile.

    python tools/syntax_check.py

ES modules (any .js with an import or export statement) are copied to a .mjs name in a temporary
folder first: checked under their own name, node reads a root .js as CommonJS and misses a const
declared twice (AGENTS.md). Classic scripts (shared/, sw.js) are checked where they are. Skips
data/, art/, node_modules/, the venvs and backups/. Prints only the failures and a count; exits 1 on any.
"""
import os
import py_compile
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {'data', 'art', 'node_modules', 'backups', '.git', '.venv', '.venv-paddle', '__pycache__', 'realesrgan', '.claude'}
MODULE = re.compile(r'^\s*(?:import\s[\s\S]*?from\s|import\s*[\'"(]|export\s)', re.M)


def files():
    for top, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP]
        for n in names:
            if n.endswith(('.js', '.mjs', '.py')):
                yield os.path.join(top, n)


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        pass
    node = shutil.which('node')
    bad, n = [], 0
    with tempfile.TemporaryDirectory() as tmp:
        for i, path in enumerate(files()):
            rel = os.path.relpath(path, ROOT).replace('\\', '/')
            n += 1
            if path.endswith('.py'):
                try:
                    py_compile.compile(path, cfile=os.path.join(tmp, f'{i}.pyc'), doraise=True)
                except py_compile.PyCompileError as e:
                    bad.append(f'{rel}: {e.msg.strip().splitlines()[-1]}')
                continue
            if not node:
                bad.append(f'{rel}: node not found')
                continue
            target = path
            if path.endswith('.js'):
                with open(path, encoding='utf-8', errors='replace') as f:
                    if MODULE.search(f.read()):
                        target = os.path.join(tmp, f'{i}-{os.path.basename(path)[:-3]}.mjs')
                        shutil.copyfile(path, target)
            p = subprocess.run([node, '--check', target], capture_output=True, text=True, encoding='utf-8', errors='replace')
            if p.returncode:
                lines = [l for l in p.stderr.splitlines() if l.strip()]
                msg = next((l for l in lines if 'Error' in l), lines[-1] if lines else 'failed')
                where = lines[0].replace(target, rel) if lines else ''
                bad.append(f'{rel}: {msg.strip()} ({where.strip()})')
    for b in bad:
        print(b)
    print(f'{n} files checked, {len(bad)} failed')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
