"""Re-import every imported book and say, per book, whether its report got better, worse or stayed.

    python tools/reimport_all.py [book ...]       (default: every book with a book.js the importer knows)

Run after changing tools/import_projectaon.py (docs/book-checklist.md, step 3). For each book it takes
the figures before (book.js, and import-report.json where there is one), runs the importer, and
compares them after. Worse: more broken links, more sections with no way on, more enemies with no
picture, fewer sections. Anything else that moved is listed as changed, to be looked at. Counts only.
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
        p = subprocess.run([sys.executable, os.path.join('tools', 'import_projectaon.py'), code], cwd=ROOT,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
        if p.returncode:
            bad += 1
            tail = p.stdout.decode('utf-8', 'replace').strip().splitlines()[-3:]
            print(f'{code}: IMPORT FAILED ({p.returncode})', *tail, sep='\n  ')
            continue
        after = figures(code) or {}
        worse, changed = [], []
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
        if not before:
            print(f'{code}: imported (no earlier figures to compare)')
        elif worse:
            bad += 1
            print(f'{code}: WORSE: ' + '; '.join(worse) + ('; also ' + '; '.join(changed) if changed else ''))
        elif changed:
            print(f'{code}: changed: ' + '; '.join(changed))
        else:
            print(f'{code}: same')
    print(f'{len(codes)} books re-imported; {bad} worse or failed')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
