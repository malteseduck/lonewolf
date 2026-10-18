"""An index of every downloaded book's illustrations, for finding a fight picture without looking
through each book again (docs/reference/items.md, Fight pictures).

    python tools/ill_index.py            # writes data/projectaon/ill-index.json
    python tools/ill_index.py --missing  # also lists the pictures with no note yet

Read from the books' own section files, so books fetched but not imported are in it too. For each
`ill*.png`: its section, the fight there (enemy names), the fights an imported book gives it in other
sections (fought_at, from book.js), the sections it links to and from, the fights
within two links either way, and the plates.json entries that borrow it. `shows` is what the picture
shows, in our own words, kept by hand in data/projectaon/ill-notes.json ({"08tjoh/ill6.png": "..."})
and merged in here, so re-running never loses it. `about` is what the picture is: who or what, at
which moment, as the book has it (the wiki where the book does not say); kept by hand the same way in
data/projectaon/ill-about.json. Every picture a plates.json entry uses from outside the books (a
stand-in in art/ or assets/plates/) has an entry too, keyed by its path, with `book` None and its
`about` saying what it stands for. `foes` holds what each enemy is, by the book, whatever picture
stands in for it ({book: {name: text}}, kept by hand in foe-about.json): the picture sheet shows that,
the illustration sheet a picture's `about`. All these files are git-ignored with the books: they
describe Project Aon's pictures and enemies, in our own words. Names and ids only, never the books' prose.
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
ABOUT = os.path.join(PA, 'ill-about.json')
FOE_ABOUT = os.path.join(PA, 'foe-about.json')
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
        ills = sorted(set(re.findall(r'(?:ill|small)\d+\.png', t)), key=lambda n: (n[0] == 's', int(re.sub(r'\D', '', n))))
        out[int(m[1])] = (links, foes, ills)
    return out


def fought_at(code):
    """{ill: [{section, enemies}]}: the fights the imported book.js gives a picture from another section
    (the importer's PLATE_FIXES and name match), which the section pages alone do not show."""
    p = os.path.join(PA, code, 'book.js')
    if not os.path.exists(p):
        return {}
    with open(p, encoding='utf-8') as f:
        t = f.read()
    head = '.BOOKS || {}, '  # book.js is one Object.assign(window.LW.BOOKS || {}, <JSON>);
    sections = json.loads(t[t.index(head) + len(head):t.rindex(')')])[code]['sections']
    out = {}
    for s, sec in sorted(sections.items(), key=lambda kv: int(kv[0])):
        here = re.sub(r'(-2x)?\.\w+$', '', sec.get('img', {}).get('file', ''))  # its own picture, maybe as the 2x copy
        arts = {}
        for e in sec.get('combat', {}).get('enemies', []):
            if e.get('art') and re.sub(r'\.\w+$', '', e['art']) != here:
                arts.setdefault(e['art'], []).append(e['name'])
        for art, names in arts.items():
            out.setdefault(art, []).append({'section': int(s), 'enemies': names})
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


def _load(path):
    if not os.path.exists(path):
        return {}
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def main():
    notes, about = _load(NOTES), _load(ABOUT)
    with open(PLATES, encoding='utf-8') as f:
        plates = json.load(f)['plates']
    index = {}
    for code in sorted(os.listdir(PA)):
        if not os.path.isdir(os.path.join(PA, code)) or not re.match(r'\d\d', code):
            continue
        book = read_book(code)
        elsewhere = fought_at(code)
        sources = {}
        for s, (links, _, _) in book.items():
            for t in links:
                sources.setdefault(t, []).append(s)
        for s in sorted(book):
            links, foes, ills = book[s]
            for ill in ills:
                key = f'{code}/{ill}'
                index[key] = {
                    'book': code, 'section': s, 'fight': foes, 'fought_at': elsewhere.get(ill, []),
                    'to': links, 'from': sorted(sources.get(s, [])),
                    'near': near(book, s, False) + near(book, s, True),
                    'used_by': [{k: e[k] for k in ('book', 'match') if k in e}
                                for e in plates if e.get('src') == f'data/projectaon/{key}'],
                    'shows': notes.get(key, ''),
                }
                if ill.startswith('small'):  # described like the rest, but too low to make a fight picture
                    index[key]['small'] = True
        # pictures outside the numbered sections (the title page and the like)
        for fn in sorted(os.listdir(os.path.join(PA, code))):
            key = f'{code}/{fn}'
            if re.fullmatch(r'(ill|small)\d+\.png', fn) and key not in index:
                index[key] = {'book': code, 'section': None, 'fight': [], 'fought_at': elsewhere.get(fn, []),
                              'to': [], 'from': [], 'near': [],
                              'used_by': [{k: e[k] for k in ('book', 'match') if k in e}
                                          for e in plates if e.get('src') == f'data/projectaon/{key}'],
                              'shows': notes.get(key, ''), **({'small': True} if fn.startswith('small') else {})}
    ills = len(index)
    # the stand-ins fights use from outside the books, keyed by their path
    outside = lambda src: index.setdefault(src, {'book': None, 'section': None, 'fight': [], 'fought_at': [], 'to': [],
                                                 'from': [], 'near': [], 'used_by': [], 'shows': notes.get(src, '')})
    for e in plates:
        src = e.get('src', '')
        if src and not src.startswith('data/projectaon/'):
            outside(src)['used_by'].append({k: e[k] for k in ('book', 'match') if k in e})
    for key, v in index.items():
        v['about'] = about.get(key, '')
    foes = {c: names for c, names in _load(FOE_ABOUT).items() if names}
    with open(OUT, 'w', encoding='utf-8') as f:
        # what each enemy is, by the book, whatever picture stands in for it: the picture sheet's text
        json.dump({**index, **({'foes': foes} if foes else {})}, f, ensure_ascii=False, indent=1)
    books = [v for v in index.values() if v['book']]
    noted = sum(1 for v in books if v['shows'])
    print(f'{ills} illustrations in {len({v["book"] for v in books})} books, {noted} with a note')
    told = sum(1 for v in index.values() if v['about'])
    print(f'{len(index) - ills} other picture{"s" if len(index) - ills != 1 else ""} used by fights; '
          f'{told} of {len(index)} say what they are')
    stale = sorted((set(notes) | set(about)) - set(index))
    if stale:
        print('notes for pictures not found:', ', '.join(stale))
    if '--missing' in sys.argv:
        print('no note:', ' '.join(k for k, v in index.items() if v['book'] and not v['shows']))
        print('not said what it is:', ' '.join(k for k, v in index.items() if not v['about']))


if __name__ == '__main__':
    main()
