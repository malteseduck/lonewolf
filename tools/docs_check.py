"""The docs kept true to each other (spec principle 8): the decision records, their index, the
citations of them across the repository, the paths the agents' docs and the READMEs name, every
asset credited in its folder's README.txt, and AGENTS.md's shape (ruling R21). Lists each problem; the repo-maintenance skill runs it before reading for drift.

    python tools/docs_check.py        exit 1 if anything is wrong
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADR = os.path.join('docs', 'adr')
# Not ours to check, or git-ignored and absent on a fresh checkout. release/ holds old snapshots.
SKIP_DIRS = {'.git', 'node_modules', 'data', 'art', 'backups', 'release', 'prototypes', '.claude',
             '.venv', '.venv-paddle', '.vitest', 'realesrgan', '__pycache__'}
TEXT = ('.md', '.js', '.mjs', '.py', '.html', '.css', '.txt', '.json')
IGNORED = ('data/', 'art/', 'backups/', 'node_modules/', 'release/')  # may be absent: not checked
AGENTS_SECTIONS = ('How to run', 'How to test', 'Hard rules', 'Maintaining the repository')
DATE = re.compile(r'\b20\d\d-\d\d-\d\d\b')
# Asset folders whose README.txt credits each file, and what in them is not an asset
CREDITS = {'assets/icons': set(), 'assets/plates': {'approved', 'upscaled', 'plates.json'},
           'assets/hero': set(), 'assets/app': set(), 'tools/fonts': set()}
READMES = ['README.md', 'docs/showcase/README.md']  # their named paths are checked like the docs'


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as fh:
        return fh.read()


def adr_files():
    """{number: file name} of the ADRs."""
    out = {}
    for f in os.listdir(os.path.join(ROOT, ADR)):
        m = re.match(r'(\d{4})-.+\.md$', f)
        if m:
            out[m.group(1)] = f
    return out


def ruling_ids(text):
    """Every ruling id in rulings.md, in order, duplicates kept."""
    return re.findall(r'^\| (R\d+) \|', text, re.M)


def check_rulings(problems):
    ids = ruling_ids(read(os.path.join(ADR, 'rulings.md')))
    seen = set()
    for r in ids:
        if r in seen:
            problems.append(f'rulings.md: {r} is used twice')
        seen.add(r)
    index = read(os.path.join(ADR, 'README.md'))
    listed = set()
    line = re.sub(r'next free id is R\d+', '', index.split('### Rulings', 1)[-1])
    for a, b in re.findall(r'R(\d+)(?:-R(\d+))?', line):
        listed.update(f'R{n}' for n in range(int(a), int(b or a) + 1))
    for r in sorted(seen - listed, key=lambda r: int(r[1:])):
        problems.append(f'adr/README.md: the Rulings line does not list {r}')
    if seen:
        nxt = f'R{max(int(r[1:]) for r in seen) + 1}'
        m = re.search(r'next free id is (R\d+)', index)
        if m and m.group(1) != nxt:
            problems.append(f'adr/README.md: says the next free id is {m.group(1)}, it is {nxt}')
    return seen


def check_adrs(problems):
    files = adr_files()
    index = read(os.path.join(ADR, 'README.md'))
    rows = {m.group(1): (m.group(2), m.group(3).strip())
            for m in re.finditer(r'^\| \[(\d{4})\]\(([^)]+)\) \|.*\| *([0-9-]*) *\|$', index, re.M)}
    for n, f in files.items():
        if n not in rows:
            problems.append(f'adr/README.md: ADR {n} is not in the index')
            continue
        link, amended = rows[n]
        if link != f:
            problems.append(f'adr/README.md: ADR {n} links {link}, the file is {f}')
        text = read(os.path.join(ADR, f))
        m = re.search(r'^- Amended: (.+)$', text, re.M)
        own = m.group(1).strip() if m else ''
        if own != amended:
            problems.append(f'{f}: Amended is "{own}", the index says "{amended}"')
        changes = text.split('## Changes', 1)
        dates = re.findall(r'^- (20\d\d-\d\d-\d\d)', changes[1], re.M) if len(changes) > 1 else []
        if dates and max(dates) != own:
            problems.append(f'{f}: its latest change is {max(dates)}, Amended says "{own}"')
        if dates != sorted(dates):
            problems.append(f'{f}: its Changes are not in date order')
    for n in rows:
        if n not in files:
            problems.append(f'adr/README.md: lists ADR {n}, which has no file')
    return set(files)


def repo_texts():
    for dirpath, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in names:
            if name.endswith(TEXT):
                yield os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, '/')


def check_citations(problems, rulings, adrs):
    """Every "ADR NNNN" and "ruling(s) Rn, Rm" names a record that exists."""
    for rel in repo_texts():
        try:
            text = read(rel)
        except UnicodeDecodeError:
            continue
        for n in set(re.findall(r'\bADRs? (\d{4})\b', text)):
            if n not in adrs:
                problems.append(f'{rel}: cites ADR {n}, which does not exist')
        for group in re.findall(r'\brulings? (R\d+(?:(?:, | and |, and )R\d+)*)', text):
            for r in re.findall(r'R\d+', group):
                if r not in rulings:
                    problems.append(f'{rel}: cites ruling {r}, which does not exist')


def named_paths(text):
    """Repository paths a doc names in backticks: with a slash, no placeholder, not a URL or route."""
    for p in re.findall(r'`([^`\s]+)`', text):
        p = p.split(':')[0].rstrip('.,')
        if '/' not in p or re.search(r'[<>*{}$?=()]', p) or p.startswith(('/', 'http', 'api/', '.')):
            continue
        if re.match(r'^[\w.-]+(/[\w.-]+)+/?$', p):
            yield p


def check_paths(problems):
    docs = (['AGENTS.md', 'docs/spec.md'] + [r for r in READMES if os.path.exists(os.path.join(ROOT, r))]
            + [f'{ADR}/{f}'.replace(os.sep, '/') for f in sorted(os.listdir(os.path.join(ROOT, ADR)))])
    for rel in docs:
        text = read(rel)
        if re.search(r'/\d{4}-[^/]+\.md$', rel):  # Context and Changes are history: what was, not what is
            text = ''.join(re.findall(r'^## (?:Decision|Consequences)\n(.*?)(?=^## |\Z)', text, re.M | re.S))
        for p in set(named_paths(text)):
            if p.startswith(IGNORED):
                continue
            here = os.path.join(ROOT, os.path.dirname(rel), p)  # a README's links are relative to it
            if not os.path.exists(os.path.join(ROOT, p)) and not os.path.exists(here):
                problems.append(f'{rel}: names `{p}`, which does not exist')


def credited(rel, text):
    """A file is credited when its README names it: by path, name or stem; a -2x copy by its original;
    a font of a family by the family and its weight ("DarklandHand-Thin, -Light")."""
    name = rel.rsplit('/', 1)[-1]
    stem = re.sub(r'-2x$', '', name.rsplit('.', 1)[0])
    if rel in text or name in text or re.search(rf'(?<![\w-]){re.escape(stem)}(?![\w])', text):
        return True
    family, _, weight = stem.partition('-')
    return bool(weight) and family in text and f'-{weight}' in text


def check_credits(problems):
    """Every asset in a folder with a README is credited there (AGENTS.md: free to redistribute, the
    source noted)."""
    for folder, skip in CREDITS.items():
        readme = f'{folder}/README.txt'
        if not os.path.exists(os.path.join(ROOT, readme)):
            continue
        text = read(readme)
        for dirpath, dirs, names in os.walk(os.path.join(ROOT, folder)):
            dirs[:] = [d for d in dirs if d not in skip]
            for n in names:
                rel = os.path.relpath(os.path.join(dirpath, n), os.path.join(ROOT, folder)).replace(os.sep, '/')
                if n in skip or n == 'README.txt' or n.startswith('OFL-'):
                    continue
                if not credited(rel, text):
                    problems.append(f'{readme}: does not credit {rel}')


def check_agents(problems):
    """AGENTS.md: the sections every agent needs, and no state (ruling R21)."""
    text = read('AGENTS.md')
    heads = re.findall(r'^## (.+)$', text, re.M)
    for s in AGENTS_SECTIONS:
        if not any(h.startswith(s) for h in heads):
            problems.append(f'AGENTS.md: no "## {s}" section')
    for d in sorted(set(DATE.findall(text))):
        problems.append(f'AGENTS.md: holds a date ({d}); state belongs in the docs it points to')


def main(argv):
    problems = []
    rulings = check_rulings(problems)
    adrs = check_adrs(problems)
    check_citations(problems, rulings, adrs)
    check_paths(problems)
    check_credits(problems)
    check_agents(problems)
    for p in problems:
        print(p)
    print(f'{len(problems)} problem(s)' if problems else 'docs consistent')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
