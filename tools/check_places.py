"""Check a book's map places (places-<book>.js) against its imported sections.

    python tools/check_places.py 01fftd

Also run at the end of every import by tools/import_projectaon.py. Prints what is wrong, and
the longest jumps between places the story moves between, which are the ones worth a look.
It checks only what is certain from the files; whether a place fits its passage is a matter
of reading (docs/reference/map-places.md, step 2 and step 6).
"""
import json, math, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# what the map can draw for a place (places-01fftd.js says so too): buildings.js, or drawn by maps.js
SYMBOLS = {'house', 'tower', 'keep', 'temple', 'obelisk', 'bridge', 'castle', 'monastery',
           'stream', 'hill', 'tree', 'wood', 'lake', 'marsh', 'ship'}
ENTRY = re.compile(r'''(\w+):\s*\[\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*,\s*('(\w+)'|null)\s*,\s*(-?[\d.]+|null)\s*,\s*(-?[\d.]+|null)\s*\]''')
AT_ENTRY = re.compile(r'(\w+):\s*\[([\d,\s]*)\]')
LEG_ENTRY = re.compile(r"(\w+):\s*\{[^{}]*?view:\s*\[([^\]]*)\][^{}]*?places:\s*\[([^\]]*)\]")


def block(src, name):
    """the text of `export const NAME = { ... };`"""
    m = re.search(r'export const ' + name + r'\s*=\s*\{(.*?)\n\};', src, re.S)
    return m.group(1) if m else None


def read_places(book):
    """{key: [name, symbol, x, y]}, {key: [section numbers]} from places-<book>.js, or None"""
    path = os.path.join(ROOT, f'places-{book}.js')
    if not os.path.exists(path):
        return None, None
    src = open(path, encoding='utf-8').read()
    places = {m.group(1): [m.group(2)[1:-1], m.group(4), None if m.group(5) == 'null' else float(m.group(5)),
                           None if m.group(6) == 'null' else float(m.group(6))] for m in ENTRY.finditer(block(src, 'PLACES') or '')}
    at = {m.group(1): [int(n) for n in re.findall(r'\d+', m.group(2))] for m in AT_ENTRY.finditer(block(src, 'AT') or '')}
    known = re.search(r'export const KNOWN\s*=\s*\[(.*?)\]', src, re.S)
    at['__known__'] = re.findall(r"'(\w+)'", known.group(1)) if known else None
    # a journey across much of the map is shown in legs, each a view of its own: {leg: (view, [places])}
    at['__legs__'] = {m.group(1): ([float(v) for v in m.group(2).split(',')], re.findall(r"'(\w+)'", m.group(3)))
                      for m in LEG_ENTRY.finditer(block(src, 'LEGS') or '')} or None
    return places, at


def outs(sec):
    """the sections a section can lead to: its choices, random outcomes, and a fight's ways out"""
    tos = []
    for c in sec.get('choices', []):
        tos += [r[1] for r in c['random']['table']] if c.get('random') else [c['to']]
    combat = sec.get('combat', {})
    tos += [t for t in (combat.get('to'), (combat.get('evade') or {}).get('to')) if t]
    return [str(t) for t in tos]


def check(book, sections):
    """print the report; returns the number of problems (0 when there is no places file yet)"""
    places, at = read_places(book)
    print('\nmap places (docs/reference/map-places.md):')
    if places is None:
        print(f'  places-{book}.js does not exist: the book reads without travel on the map.')
        print(f'  To give it travel, follow docs/reference/map-places.md. {len(sections)} sections to place.')
        return 0
    problems = []
    known = at.pop('__known__', None)
    legs = at.pop('__legs__', None)
    leg_of = {}
    for leg, (view, keys) in (legs or {}).items():
        if len(view) != 4 or abs(view[2] / view[3] - 10 / 7) > 0.01:
            problems.append(f'leg {leg}: view must be [x, y, w, h] with w:h = 10:7')
        for k in keys:
            if k in leg_of:
                problems.append(f'{k} is in legs {leg_of[k]} and {leg}')
            leg_of[k] = leg
            if k not in places:
                problems.append(f'leg {leg} has {k}, which PLACES does not')
            elif None not in places[k][2:] and not (view[0] <= places[k][2] <= view[0] + view[2] and view[1] <= places[k][3] <= view[1] + view[3]):
                problems.append(f'{k} lies outside the view of its leg {leg}')
    if legs:
        problems += [f'{k} is in no leg' for k in places if k not in leg_of]
    if known is None:
        problems.append('no KNOWN list: say which places the printed map names (step 3)')
    else:
        problems += [f'KNOWN has {k}, which PLACES does not' for k in known if k not in places]
    where = {}
    for k, ids in at.items():
        if k not in places:
            problems.append(f'AT has {k}, which PLACES does not')
        for s in ids:
            s = str(s)
            if s in where:
                problems.append(f'section {s} is at both {where[s]} and {k}')
            where[s] = k
            if s not in sections:
                problems.append(f'section {s} (at {k}) is not in the book')
    missing = [s for s in sections if s not in where]
    if missing:
        problems.append(f'{len(missing)} sections have no place: {", ".join(sorted(missing, key=int)[:40])}{" ..." if len(missing) > 40 else ""}')
    for k, (name, sym, x, y) in places.items():
        if k not in at:
            problems.append(f'{k} ({name}) has no sections')
        if sym and sym not in SYMBOLS:
            problems.append(f'{k} has symbol {sym!r}; the map knows {", ".join(sorted(SYMBOLS))}')
        if x is None or y is None:
            problems.append(f'{k} ({name}) has no position yet: lay it out (tools/layout_places.js)')
    close = [(a, b) for a in places for b in places if a < b and None not in places[a][2:] and None not in places[b][2:]
             and math.dist(places[a][2:], places[b][2:]) < 3 and leg_of.get(a) == leg_of.get(b)]
    for a, b in close:
        problems.append(f'{a} and {b} are on top of each other ({places[a][2:]} / {places[b][2:]})')
    # moves between places, longest first: the layout keeps these short, so a long one is a place to review
    jumps = {}
    for s, sec in sections.items():
        for t in outs(sec):
            a, b = where.get(s), where.get(t)
            if a and b and a != b and None not in places[a][2:] and None not in places[b][2:] and leg_of.get(a) == leg_of.get(b):
                jumps[tuple(sorted((a, b)))] = math.dist(places[a][2:], places[b][2:])
    print(f'  {len(places)} places{f" in {len(legs)} legs" if legs else ""}, {len(where)} of {len(sections)} sections placed, {len(jumps)} routes between places')
    for p in problems:
        print('  PROBLEM:', p)
    if jumps:
        print('  longest routes (map pixels), worth a look on the map:',
              '; '.join(f'{a}-{b} {d:.0f}' for (a, b), d in sorted(jumps.items(), key=lambda j: -j[1])[:6]))
    maps = open(os.path.join(ROOT, 'maps.js'), encoding='utf-8').read()
    if f"'{book}':" not in maps or f'places-{book}.js' not in maps:
        print(f"  NOTE: maps.js does not use places-{book}.js yet (step 5: a MAPS['{book}'] entry and its import).")
    if not problems:
        print('  no problems found. Still to do by eye: the sweep in step 6.')
    return len(problems)


if __name__ == '__main__':
    book = sys.argv[1] if len(sys.argv) > 1 else '01fftd'
    js = open(os.path.join(ROOT, 'data', 'projectaon', book, 'book.js'), encoding='utf-8').read()
    data = json.loads(js[js.index('|| {}, ') + 7:js.rindex(');')])  # book.js: Object.assign(window.LW.BOOKS || {}, {...});
    sys.exit(1 if check(book, data[book]['sections']) else 0)
