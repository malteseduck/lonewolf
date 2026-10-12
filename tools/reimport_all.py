"""Re-import every imported book and say, per book, whether its report got better, worse or stayed.

    python tools/reimport_all.py [book ...]       (default: every book with a book.js the importer knows)

Run after changing tools/import_projectaon.py (docs/book-checklist.md, step 3). For each book it takes
the figures before (book.js, and import-report.json where there is one), runs the importer, and
compares them after. Worse: more broken links, more sections with no way on, more enemies with no
picture, fewer sections. Anything else that moved is listed as changed, to be looked at. Counts only.
Where book.js changed (the importer leaves it alone otherwise), or the reading copy or the item check
is older than it, it then makes the reading copy again (reading_copy.py, item_sections.py) and re-runs
check_items.mjs --json, so those steps do not go out of date for nothing; an item check with errors
after the import counts as worse.
Exits 1 if any book got worse or an import failed.

It rewrites book.js for books already imported, so the dashboard asks before running it.
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from book_status import DATA, ROOT, find, import_stats, importer_books  # noqa: E402

PLATES = os.path.join(ROOT, 'assets', 'plates', 'plates.json')
WORSE_UP = ('broken', 'noway', 'bare', 'broken_links', 'no_way_on', 'with_none')  # higher is worse
WORSE_DOWN = ('sections',)


def figures(code):
    d = os.path.join(DATA, code)
    out = {}
    try:
        out.update(import_stats(code, os.path.join(d, 'book.js'), PLATES))
    except (OSError, ValueError, KeyError):
        return None
    try:
        with open(os.path.join(d, 'import-report.json'), encoding='utf-8') as f:
            rep = json.load(f)
        for k, v in rep.items():
            if isinstance(v, list):
                v = len(v)
            if isinstance(v, dict):
                for kk, vv in v.items():
                    out[f'{k}.{kk}'] = vv
            elif isinstance(v, (int, float)):
                out[k] = v
    except (OSError, ValueError):
        pass
    return out


def run(*cmd):
    p = subprocess.run(list(cmd), cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                       env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
    return p.returncode, p.stdout.decode('utf-8', 'replace').strip().splitlines()


def stale(code):
    """Is the reading copy or the item check older than what it is made from? (as tools/book_status.py judges)"""
    t = lambda *p: os.path.getmtime(os.path.join(*p)) if os.path.isfile(os.path.join(*p)) else None
    d = os.path.join(DATA, code)
    js, reading, listed = t(d, 'book.js'), t(d, 'reading.txt'), t(d, 'items-reading.txt')
    if js and (not reading or reading < js or not listed or listed < reading):
        return True
    items, check = t(ROOT, 'items', f'items-{code}.js'), t(d, 'check-items.json')
    return bool(items and (not check or check < max(items, js or 0)))


def refresh(code):
    """book.js changed: make what is made from it again. Returns problems, as short lines."""
    bad = []
    for script in ('reading_copy.py', 'item_sections.py'):
        rc, out = run(sys.executable, os.path.join('tools', script), code)
        if rc:
            bad.append(f'{script} failed ({rc})')
    if os.path.isfile(os.path.join(ROOT, 'items', f'items-{code}.js')):
        rc, out = run('node', os.path.join('tools', 'check_items.mjs'), code, '--json')
        try:
            with open(os.path.join(DATA, code, 'check-items.json'), encoding='utf-8') as f:
                errors = len(json.load(f).get('errors') or [])
        except (OSError, ValueError):
            errors = None
        if errors is None:
            bad.append(f'check_items.mjs gave no result ({rc})')
        elif errors:
            bad.append(f'item check: {errors} errors (node tools/check_items.mjs {code})')
    return bad


def main(argv):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        pass
    known = importer_books()
    codes = [find(a)[0] for a in argv if find(a)] if argv else sorted(
        c for c in known if os.path.isfile(os.path.join(DATA, c, 'book.js')))
    bad = 0
    for code in codes:
        if code not in known:
            print(f'{code}: the importer does not know this book; skipped')
            continue
        before = figures(code) or {}
        js = os.path.join(DATA, code, 'book.js')
        js_was = os.path.getmtime(js) if os.path.isfile(js) else None
        p = subprocess.run([sys.executable, os.path.join('tools', 'import_projectaon.py'), code], cwd=ROOT,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
        if p.returncode:
            bad += 1
            tail = p.stdout.decode('utf-8', 'replace').strip().splitlines()[-3:]
            print(f'{code}: IMPORT FAILED ({p.returncode})', *tail, sep='\n  ')
            continue
        after = figures(code) or {}
        worse, changed = [], []
        touched = os.path.isfile(js) and (os.path.getmtime(js) != js_was or stale(code))
        if touched:
            worse += refresh(code)
        for k in sorted(set(before) | set(after)):
            a, b = before.get(k), after.get(k)
            if a == b or k == 'map' or a is None:
                continue
            if b is None:
                changed.append(f'{k} gone')
                continue
            line = f'{k} {a} -> {b}'
            if (k in WORSE_UP and b > a) or (k in WORSE_DOWN and b < a):
                worse.append(line)
            else:
                changed.append(line)
        if worse:
            bad += 1
            print(f'{code}: WORSE: ' + '; '.join(worse) + ('; also ' + '; '.join(changed) if changed else ''))
        elif not before:
            print(f'{code}: imported (no earlier figures to compare)')
        elif changed:
            print(f'{code}: changed: ' + '; '.join(changed))
        else:
            print(f'{code}: same')
        if touched and not worse:
            print('  reading copy made again, item check re-run')
    print(f'{len(codes)} books re-imported; {bad} worse or failed')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
