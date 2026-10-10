"""An index of every downloaded book's illustrations, for finding a fight picture without looking
through each book again (docs/reference/items.md, Fight pictures).

    python tools/ill_index.py            # writes data/projectaon/ill-index.json
    python tools/ill_index.py --missing  # also lists the pictures with no note yet

Read from the books' own section files, so books fetched but not imported are in it too. For each
`ill*.png`: its section, the fight there (enemy names), the sections it links to and from, the fights
within two links either way, and the plates.json entries that borrow it. `shows` is what the picture
shows, in our own words, kept by hand in data/projectaon/ill-notes.json ({"08tjoh/ill6.png": "..."})
and merged in here, so re-running never loses it. Both files are git-ignored with the books: they
describe Project Aon's pictures. Names and ids only, never the books' prose.
"""
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PA = os.path.join(ROOT, 'data', 'projectaon')
OUT = os.path.join(PA, 'ill-index.json')
NOTES = os.path.join(PA, 'ill-notes.json')
PLATES = os.path.join(ROOT, 'assets', 'plates', 'plates.json')
NEAR = 2  # links either way


def read_book(code):
    """{section: (links, enemies, ills)} from the book's sect*.htm."""
    out = {}
    d = os.path.join(PA, code)
    for fn in os.listdir(d):
        m = re.fullmatch(r'sect(\d+)\.htm', fn)
        if not m:
            continue
        with open(os.path.join(d, fn), encoding='utf-8', errors='replace') as f:
            t = f.read()
        links = sorted({int(x) for x in re.findall(r'href="sect(\d+)\.htm"', t)} - {int(m[1])})
        foes = [html.unescape(re.sub(r'<[^>]+>', '', x)).strip()
                for x in re.findall(r'<p class="combat">(.*?):\s*<span', t, re.S)]
        ills = sorted(set(re.findall(r'ill\d+\.png', t)), key=lambda n: int(n[3:-4]))
        out[int(m[1])] = (links, foes, ills)
    return out


def near(book, start, back):
    """Fights within NEAR links of start: [{section, enemies, steps}], forwards or (back) backwards."""
    edges = {}
    for s, (links, _, _) in book.items():
        for t in links:
            a, b = (t, s) if back else (s, t)
            edges.setdefault(a, []).append(b)
    seen, ring, hits = {start}, [start], []
    for step in range(1, NEAR + 1):
        nxt = []
        for s in ring:
            for t in edges.get(s, []):
                if t in seen:
                    continue
                seen.add(t)
                nxt.append(t)
                if book.get(t, ([], [], []))[1]:
                    hits.append({'section': t, 'enemies': book[t][1], 'steps': -step if back else step})
        ring = nxt
    return hits


def main():
    notes = {}
    if os.path.exists(NOTES):
        with open(NOTES, encoding='utf-8') as f:
            notes = json.load(f)
    with open(PLATES, encoding='utf-8') as f:
        plates = json.load(f)['plates']
    index = {}
    for code in sorted(os.listdir(PA)):
        if not os.path.isdir(os.path.join(PA, code)) or not re.match(r'\d\d', code):
            continue
        book = read_book(code)
        sources = {}
        for s, (links, _, _) in book.items():
            for t in links:
                sources.setdefault(t, []).append(s)
        for s in sorted(book):
            links, foes, ills = book[s]
            for ill in ills:
                key = f'{code}/{ill}'
                index[key] = {
                    'book': code, 'section': s, 'fight': foes, 'to': links, 'from': sorted(sources.get(s, [])),
                    'near': near(book, s, False) + near(book, s, True),
                    'used_by': [{k: e[k] for k in ('book', 'match') if k in e}
                                for e in plates if e.get('src') == f'data/projectaon/{key}'],
                    'shows': notes.get(key, ''),
                }
        # pictures outside the numbered sections (the title page and the like)
        for fn in sorted(os.listdir(os.path.join(PA, code))):
            key = f'{code}/{fn}'
            if re.fullmatch(r'ill\d+\.png', fn) and key not in index:
                index[key] = {'book': code, 'section': None, 'fight': [], 'to': [], 'from': [], 'near': [],
                              'used_by': [{k: e[k] for k in ('book', 'match') if k in e}
                                          for e in plates if e.get('src') == f'data/projectaon/{key}'],
                              'shows': notes.get(key, '')}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
    noted = sum(1 for v in index.values() if v['shows'])
    print(f'{len(index)} illustrations in {len({v["book"] for v in index.values()})} books, {noted} with a note')
    stale = sorted(set(notes) - set(index))
    if stale:
        print('notes for pictures not found:', ', '.join(stale))
    if '--missing' in sys.argv:
        print('no note:', ' '.join(k for k, v in index.items() if not v['shows']))


if __name__ == '__main__':
    main()
