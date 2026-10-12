"""Where every book stands in the import: worked out from the files on disk, plus the steps no file
can show, which are kept in docs/book-status.json (committed).

    python tools/book_status.py                      one line per book
    python tools/book_status.py --json               everything, as JSON (what /api/admin/status serves)
    python tools/book_status.py show <book>          one book's steps, each with its evidence
    python tools/book_status.py done <book> <step>   mark a step done (see below)
    python tools/book_status.py undo <book> <step>   take a hand mark back
    python tools/book_status.py checklist            rewrite the table in docs/book-checklist.md

<book> is a code (03tcok) or a number (3). <step> is the checklist's number, 1-8.

Steps 3 and 7 are judgements, so `done` records them (with today's date) in book-status.json;
step 4 is too, once its "Book N" heading is in docs/reference/rules-books.md, and step 6 (the owner's
look at the picture sheet) once every enemy has a picture. The other steps are read
from the files, so `done` checks them instead (step 5 runs check_items.mjs first) and exits 1, saying
why, if they are not done. Either way the checklist table is rewritten. Agents finishing a step run
this; the dashboard (tools/admin/) does the same through serve.py.

Prints counts and ids only, never the books' text. See docs/reference/dashboard.md.
"""
import datetime
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'projectaon')
STATUS = os.path.join(ROOT, 'docs', 'book-status.json')
CHECKLIST = os.path.join(ROOT, 'docs', 'book-checklist.md')
IMPORTER = os.path.join(ROOT, 'tools', 'import_projectaon.py')
PINS = os.path.join(ROOT, 'assets', 'plates', 'approved')  # the fight pictures approved at step 6 (tools/plates_pin.mjs)

# Codes as Project Aon's /en/xhtml/lw/ listing names the folders (read 2026-10-08)
CATALOGUE = [
    ('01fftd', 'Flight from the Dark'), ('02fotw', 'Fire on the Water'), ('03tcok', 'The Caverns of Kalte'),
    ('04tcod', 'The Chasm of Doom'), ('05sots', 'Shadow on the Sand'), ('06tkot', 'The Kingdoms of Terror'),
    ('07cd', 'Castle Death'), ('08tjoh', 'The Jungle of Horrors'), ('09tcof', 'The Cauldron of Fear'),
    ('10tdot', 'The Dungeons of Torgar'), ('11tpot', 'The Prisoners of Time'), ('12tmod', 'The Masters of Darkness'),
    ('13tplor', 'The Plague Lords of Ruel'), ('14tcok', 'The Captives of Kaag'), ('15tdc', 'The Darke Crusade'),
    ('16tlov', 'The Legacy of Vashna'), ('17tdoi', 'The Deathlord of Ixia'), ('18dotd', 'Dawn of the Dragons'),
    ('19wb', "Wolf's Bane"), ('20tcon', 'The Curse of Naar'),
]
SERIES = lambda n: 'kai' if n <= 5 else 'magnakai' if n <= 12 else 'grand master'

# The checklist's steps, in its words (the descriptions under the table say where each is done)
STEPS = {
    1: ('fetch', 'Downloaded'),
    2: ('import', 'Imported; report clean (no broken links, no section without a way on)'),
    3: ('phrasings', "Importer reads the book's own phrasings (gates, Random Number, combat)"),
    4: ('rules', 'Rules addendum written, Engine column true'),
    5: ('items', 'Item table (`items-<code>.js`): read, `check_items.mjs` clean, registered'),
    6: ('pictures', 'Every enemy has a fight picture (importer: "0 with none"), shown to the owner on one sheet, changes made'),
    7: ('testplay', 'Played through with test characters; misreadings and item gaps fixed'),
    8: ('map', 'Printed map repainted, labels checked, `map-4k.webp` made and shown in the player'),
}
HAND = {3, 4, 6, 7}  # judgements: recorded in book-status.json (4 and 6 also need their files)
GROUPS = [('Getting the book', 1), ('Items and fights', 5), ('Play', 7), ('Pictures', 8)]


def mtime(path):
    try:
        return int(os.stat(path).st_mtime * 1000)
    except OSError:
        return None


def read(path):
    try:
        with open(path, encoding='utf-8', errors='replace') as f:
            return f.read()
    except OSError:
        return ''


def day(ms):
    return datetime.datetime.fromtimestamp(ms / 1000).strftime('%Y-%m-%d %H:%M') if ms else None


def find(book):
    """A catalogue entry (code, title, number) from a code or a number."""
    for i, (code, title) in enumerate(CATALOGUE):
        if book in (code, str(i + 1), f'{i + 1:02d}'):
            return code, title, i + 1
    return None


def importer_books():
    """The codes tools/import_projectaon.py knows (its BOOKS table)."""
    return set(re.findall(r"'(\w+)': \(\d+, '", read(IMPORTER)))


def load_hand():
    try:
        with open(STATUS, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return {'books': {}}


def save_hand(data):
    tmp = STATUS + '.part'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(json.dumps(data, indent=1, sort_keys=True) + '\n')
    os.replace(tmp, STATUS)


# ---- figures from book.js, as the importer's report prints them (counts and ids only) ----
_cache = {}


def load_book(code, js_path=None):
    """A book's data from its book.js (the JSON inside the script)."""
    js = read(js_path or os.path.join(DATA, code, 'book.js'))
    return json.loads(js[js.index('|| {}, ') + 7:js.rindex(');')])[code]


def import_stats(code, js_path, plates_path):
    key = (code, mtime(js_path), mtime(plates_path))
    if key in _cache:
        return _cache[key]
    book = load_book(code, js_path)
    secs = book['sections']
    try:
        library = json.loads(read(plates_path))['plates']
    except (ValueError, KeyError):
        library = []
    foes = {}
    for s in secs.values():
        for e in s.get('combat', {}).get('enemies', []):
            foes[e['name']] = foes.get(e['name']) or bool(e.get('art'))

    def matches(p, name):
        try:
            return p.get('book', code) == code and re.search(p['match'], name, re.I)
        except re.error:
            return False
    bare = [n for n, art in foes.items() if not art and not any(matches(p, n) for p in library)]
    out = {
        'sections': len(secs), 'fights': sum('combat' in s for s in secs.values()),
        'rnt': sum(bool(s.get('rnt')) for s in secs.values()),
        'broken': sum(1 for s in secs.values() for c in s['choices'] if c['to'] not in secs),
        'noway': sum(1 for s in secs.values() if not s['choices'] and 'end' not in s and 'puzzle' not in s),
        'kinds': len(foes), 'bare': len(bare), 'map': book.get('map'),
    }
    _cache.clear()
    _cache[key] = out
    return out


_pin_cache = {}


def pin_report():
    """Each book with approved fight pictures, against what plates.json and its book.js would show now:
    {code: {approved, fights, changed: [{key, was, now}], unpinned: [...], gone: [...]}} (tools/plates_pin.mjs --all)."""
    files = sorted(glob.glob(os.path.join(PINS, '*.json')))
    if not files:
        return {}
    codes = [os.path.basename(f)[:-5] for f in files]
    key = tuple(mtime(f) for f in files) + tuple(mtime(os.path.join(DATA, c, 'book.js')) for c in codes) + (
        tuple(codes), mtime(os.path.join(ROOT, 'assets', 'plates', 'plates.json')), mtime(os.path.join(ROOT, 'platepick.js')))
    if key not in _pin_cache:
        p = subprocess.run(['node', os.path.join('tools', 'plates_pin.mjs'), '--all', '--json'], cwd=ROOT, capture_output=True, text=True, timeout=120)
        try:
            out = json.loads(p.stdout)
        except ValueError:
            out = {}
        _pin_cache.clear()
        _pin_cache[key] = out
    return _pin_cache[key]


def map_stage(code, d, imp):
    w = os.path.join(d, 'work')
    own = os.path.join(ROOT, 'maps', code)
    has = lambda *p: os.path.isfile(os.path.join(*p))
    rounds = [f for f in os.listdir(w) if re.fullmatch(r'map-gemini-[1-9]\d*\.(png|jpg|webp)', f)] if os.path.isdir(w) else []
    if has(d, 'map-4k.webp'):
        return 'done'
    if rounds:
        return 'gemini'
    if has(w, 'map-2k-lettered.jpg'):
        return 'lettered'
    if has(own, 'labels-checked.txt'):
        return 'labels checked'
    if has(own, 'labels.json'):
        return 'labels'
    if has(w, 'map-2k.png'):
        return 'started'
    return 'not started' if has(d, 'map.png') else 'no map'


def book_status(code, title, n, hand=None, main_js=None, rules_md=None, known=None):
    hand = load_hand() if hand is None else hand
    main_js = read(os.path.join(ROOT, 'main.js')) if main_js is None else main_js
    rules_md = read(os.path.join(ROOT, 'docs', 'reference', 'rules-books.md')) if rules_md is None else rules_md
    known = importer_books() if known is None else known
    series = SERIES(n)
    d = os.path.join(DATA, code)
    marks = hand.get('books', {}).get(code, {})
    b = {'code': code, 'title': title, 'n': n, 'series': series, 'folder': os.path.isdir(d), 'known': code in known,
         'marks': marks}
    sect = glob.glob(os.path.join(d, 'sect*.htm'))
    js_path = os.path.join(d, 'book.js')
    # imported: when the importer last ran (it rewrites import-report.json every time, book.js only when
    # its content changes), against which the importer and the source pages are compared
    t = {'bookjs': mtime(js_path), 'imported': mtime(os.path.join(d, 'import-report.json')) or mtime(js_path), 'importer': mtime(IMPORTER), 'map4k': mtime(os.path.join(d, 'map-4k.webp')),
         'sources': max((mtime(p) for p in glob.glob(os.path.join(d, '*.htm'))), default=None),
         'reading': mtime(os.path.join(d, 'reading.txt')), 'itemsReading': mtime(os.path.join(d, 'items-reading.txt'))}
    b['times'] = t
    b['sectFiles'] = len(sect)
    b['rulesPage'] = os.path.isfile(os.path.join(d, 'gamerulz.htm'))
    imp = None
    if t['bookjs']:
        try:
            imp = import_stats(code, js_path, os.path.join(ROOT, 'assets', 'plates', 'plates.json'))
        except (ValueError, KeyError) as e:
            b['impError'] = str(e)
    b['imp'] = imp
    # why the import is out of date, if it is
    stale = []
    if imp:
        if t['importer'] and t['importer'] > t['imported']:
            stale.append('the importer changed since')
        if t['sources'] and t['sources'] > t['imported']:
            stale.append('a source page is newer')
        if t['map4k'] and imp.get('map') != 'map-4k.webp':
            stale.append('map-4k.webp is not named yet')
    b['stale'] = stale
    b['rulesHeading'] = bool(re.search(rf'^### Book {n},', rules_md, re.M))
    reg = re.search(r'const ITEM_TABLES = \{([\s\S]*?)\};', main_js)
    items_js = os.path.join(ROOT, f'items-{code}.js')
    check = None
    try:
        with open(os.path.join(d, 'check-items.json'), encoding='utf-8') as f:
            check = json.load(f)
    except (OSError, ValueError):
        pass
    b['items'] = {'exists': os.path.isfile(items_js), 'todos': len(re.findall(r'\btodo:', read(items_js))) if os.path.isfile(items_js) else None,
                  'registered': bool(reg and f"'{code}':" in reg.group(1)), 'check': check,
                  'checkTime': mtime(os.path.join(d, 'check-items.json')), 'time': mtime(items_js)}
    b['mapStage'] = map_stage(code, d, imp) if b['folder'] else None

    st = {}
    hand_mark = lambda step: marks.get(str(step))
    def handed(step, ev):
        m = hand_mark(step)
        return {'state': 'done' if m else 'todo', 'ev': f'{ev}. Marked done {m}' if m else ev, 'src': 'hand'}

    # 1 download
    if sect and b['rulesPage']:
        st['fetch'] = {'state': 'done', 'ev': f'{len(sect)} section pages and the rules pages on disk', 'src': 'disk'}
    elif sect:
        st['fetch'] = {'state': 'warn', 'ev': f'{len(sect)} section pages; rules pages missing (fetch again with --rules)', 'src': 'disk'}
    else:
        st['fetch'] = {'state': 'todo', 'ev': 'Not downloaded (about 400 files, about 4 MB). Needs your go-ahead', 'src': 'disk'}
    # 2 import
    if not b['known']:
        st['import'] = {'state': 'na', 'ev': 'The importer does not know this book yet', 'src': 'disk'}
    elif not imp:
        st['import'] = {'state': 'todo', 'ev': b.get('impError') and f"book.js unreadable: {b['impError']}" or 'No book.js', 'src': 'disk'}
    else:
        clean = not imp['broken'] and not imp['noway']
        ev = f"{imp['sections']} sections, {imp['fights']} fights; {imp['broken']} broken links, {imp['noway']} with no way on. Imported {day(t['imported'])}"
        st['import'] = {'state': 'bad' if not clean else 'warn' if stale else 'done', 'src': 'disk',
                        'ev': ev + ('. Out of date: ' + '; '.join(stale) if stale else '')}
    # 3 phrasings, 4 rules
    st['phrasings'] = handed(3, 'Judged by reading the sections against the importer') if imp else {'state': 'todo', 'ev': 'After import', 'src': 'hand'}
    r = handed(4, 'Addendum in rules-books.md' if b['rulesHeading'] else 'No addendum in rules-books.md')
    if b['rulesHeading'] and r['state'] != 'done':
        r = {**r, 'state': 'warn', 'ev': 'Addendum written in rules-books.md; not marked checked'}
    elif not b['rulesHeading'] and r['state'] == 'done':
        r = {**r, 'state': 'warn', 'ev': 'Marked done, but there is no "Book N" heading in rules-books.md'}
    st['rules'] = r
    # the reading copy is made from book.js: stale once the book is imported again
    if not imp:
        st['reading'] = {'state': 'todo', 'ev': 'After import', 'src': 'disk'}
    elif not t['reading'] or not t['itemsReading']:
        st['reading'] = {'state': 'todo', 'ev': 'reading.txt and items-reading.txt not both made', 'src': 'disk'}
    elif t['reading'] < t['bookjs'] or t['itemsReading'] < t['reading']:
        st['reading'] = {'state': 'warn', 'ev': f"Older than book.js (made {day(t['reading'])}): make it again before reading", 'src': 'disk'}
    else:
        st['reading'] = {'state': 'done', 'ev': f"Made {day(t['reading'])}", 'src': 'disk'}
    # 5 item table
    it = b['items']
    if not it['exists']:
        st['items'] = {'state': 'todo', 'ev': f'No items-{code}.js', 'src': 'disk'}
    elif not it['registered']:
        st['items'] = {'state': 'warn', 'ev': f'items-{code}.js is not in main.js ITEM_TABLES', 'src': 'disk'}
    elif not check:
        st['items'] = {'state': 'warn', 'ev': f"{it['todos']} todos; check_items.mjs not run yet (Check items)", 'src': 'disk', 'num': it['todos']}
    elif check.get('errors'):
        st['items'] = {'state': 'bad', 'ev': f"check_items.mjs: {len(check['errors'])} errors", 'src': 'disk', 'num': len(check['errors'])}
    elif it['checkTime'] < max(it['time'] or 0, t['bookjs'] or 0):
        st['items'] = {'state': 'warn', 'ev': f"{it['todos']} todos; the table or book changed since the last check (Check items)", 'src': 'disk', 'num': it['todos']}
    else:
        st['items'] = {'state': 'done', 'ev': f"Registered, check clean; {it['todos']} todo entries left to the player", 'src': 'disk', 'num': it['todos']}
    # 6 fight pictures: every enemy has one (from the files), then the owner's look at the sheet (a mark)
    m6 = hand_mark(6)
    if not imp:
        st['pictures'] = {'state': 'todo', 'ev': 'After import', 'src': 'disk'}
    elif imp['bare']:
        ev = f"{imp['bare']} of {imp['kinds']} kinds of enemy have no picture"
        st['pictures'] = {'state': 'warn' if m6 else 'todo', 'src': 'disk', 'num': imp['bare'],
                          'ev': f'Marked done {m6}, but {ev[0].lower()}{ev[1:]}' if m6 else ev}
    elif m6 and not os.path.isfile(os.path.join(PINS, code + '.json')):
        b['pins'] = {'waiting': imp['fights'], 'approved': m6, 'sections': ['all']}
        st['pictures'] = {'state': 'warn', 'src': 'disk',
                          'ev': f"Marked done {m6}, but the approved pictures are not kept yet: Approve picture changes to keep them"}
    elif m6 and (pin_report().get(code) or {}).get('changed', []) + (pin_report().get(code) or {}).get('unpinned', []):
        pr = pin_report()[code]
        diff = pr['changed'] + pr['unpinned']
        secs = sorted({d['key'].split('/')[0] for d in diff}, key=lambda s: int(s) if s.isdigit() else 0)
        b['pins'] = {'waiting': len(diff), 'approved': pr.get('approved'), 'sections': secs}
        st['pictures'] = {'state': 'warn', 'src': 'disk', 'num': len(diff),
                          'ev': f"{len(diff)} fight{'s' if len(diff) > 1 else ''} would show another picture than you approved on {pr.get('approved')} (sections {', '.join(secs[:12])}{'...' if len(secs) > 12 else ''}); the player keeps the approved ones until you approve"}
    elif m6:
        st['pictures'] = {'state': 'done', 'ev': f"All {imp['kinds']} kinds of enemy have a picture; sheet looked at, marked done {m6}; those pictures are kept", 'src': 'hand'}
    else:
        st['pictures'] = {'state': 'warn', 'ev': f"All {imp['kinds']} kinds of enemy have a picture; waiting for your look at the sheet", 'src': 'disk'}
    st['testplay'] = handed(7, 'Every gate, fight and draw tried with test characters')
    # 8 map
    ms = b['mapStage']
    if not ms:
        st['map'] = {'state': 'todo', 'ev': 'After download', 'src': 'disk'}
    elif ms == 'no map':
        st['map'] = {'state': 'na', 'ev': 'No printed map', 'src': 'disk'}
    elif ms == 'done':
        shown = imp and imp.get('map') == 'map-4k.webp'
        st['map'] = {'state': 'done' if shown else 'warn', 'src': 'disk',
                     'ev': 'map-4k.webp made and shown in the player' if shown else 'map-4k.webp made; re-import to show it'}
    else:
        st['map'] = {'state': 'todo', 'ev': f'Map: {ms}', 'src': 'disk', 'num': ms}
    if series == 'grand master':  # no rules in the engine: only the download means anything yet
        for k, v in st.items():
            if k != 'fetch' and v['state'] in ('todo', 'warn'):
                st[k] = {**v, 'state': 'na'}
    b['stages'] = st
    return b


def all_status():
    hand, main_js = load_hand(), read(os.path.join(ROOT, 'main.js'))
    rules_md, known = read(os.path.join(ROOT, 'docs', 'reference', 'rules-books.md')), importer_books()
    return {'books': [book_status(c, t, i + 1, hand, main_js, rules_md, known) for i, (c, t) in enumerate(CATALOGUE)],
            'steps': {n: {'id': s[0], 'label': s[1], 'hand': n in HAND} for n, s in STEPS.items()}}


# ---- the checklist's table, generated ----
BEGIN = '<!-- status table: written by tools/book_status.py from the files and docs/book-status.json; do not edit by hand -->'
END = '<!-- end of status table -->'
MARK = {'done': '✅', 'todo': '⬜', 'na': '➖', 'warn': '⚠️', 'bad': '❌'}


def checklist_table(books):
    shown = [b for b in books if b['n'] <= 12 or b['folder']]
    lines = ['| Step | ' + ' | '.join(str(b['n']) for b in shown) + ' |', '|---|' + '---|' * len(shown)]
    starts = {s: g for g, s in GROUPS}
    for n, (sid, label) in STEPS.items():
        if n in starts:
            lines.append(f'| **{starts[n]}** |' + ' |' * len(shown))
        lines.append(f'| {n}. {label} | ' + ' | '.join(MARK[b['stages'][sid]['state']] for b in shown) + ' |')
    return '\n'.join(lines)


def write_checklist(books=None):
    books = books or all_status()['books']
    md = read(CHECKLIST)
    if BEGIN not in md or END not in md:
        sys.exit(f'{CHECKLIST} has no generated-table markers')
    head, rest = md.split(BEGIN, 1)
    _, tail = rest.split(END, 1)
    new = head + BEGIN + '\n' + checklist_table(books) + '\n' + END + tail
    if new != md:
        with open(CHECKLIST, 'w', encoding='utf-8', newline='\n') as f:
            f.write(new)


# ---- marking ----
def mark(code, step, undo=False, run_checks=True):
    """(ok, message). Hand steps are recorded; the others are checked from the files."""
    hit = find(code)
    if not hit:
        return False, f'unknown book {code}'
    code, title, n = hit
    if step not in STEPS:
        return False, f'step must be 1-{max(STEPS)}'
    sid = STEPS[step][0]
    if step in HAND:
        b = book_status(code, title, n)
        if not undo and step == 4 and not b['rulesHeading']:
            return False, f'step 4: write "### Book {n}, {title}" in docs/reference/rules-books.md first'
        if not undo and step == 6 and b['stages']['pictures']['state'] == 'todo':
            return False, f"Book {n} step 6 is NOT done (read from the files): {b['stages']['pictures']['ev']}"
        data = load_hand()
        marks = data.setdefault('books', {}).setdefault(code, {})
        if undo:
            marks.pop(str(step), None)
        else:
            marks[str(step)] = datetime.date.today().isoformat()
        save_hand(data)
        if step == 6:  # approved fight pictures are kept as they are now, and let go when unmarked
            if undo:
                if os.path.isfile(os.path.join(PINS, code + '.json')):
                    os.remove(os.path.join(PINS, code + '.json'))
            else:
                subprocess.run(['node', os.path.join('tools', 'plates_pin.mjs'), code, '--approve'], cwd=ROOT, capture_output=True, timeout=120)
        write_checklist()
        return True, f"Book {n} step {step} ({STEPS[step][1].split(';')[0]}): {'unmarked' if undo else 'marked done'}"
    if undo:
        return False, f'step {step} is read from the files: change the files, not the mark'
    if step == 5 and run_checks and os.path.isfile(os.path.join(ROOT, f'items-{code}.js')) and os.path.isdir(os.path.join(DATA, code)):
        subprocess.run(['node', os.path.join('tools', 'check_items.mjs'), code, '--json'], cwd=ROOT, capture_output=True)
    b = book_status(code, title, n)
    write_checklist()
    s = b['stages'][sid]
    return s['state'] == 'done', f"Book {n} step {step} is {'done' if s['state'] == 'done' else 'NOT done'} (read from the files): {s['ev']}"


def main(argv):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        pass
    if argv[:1] == ['--json']:
        print(json.dumps(all_status()))
        return 0
    if argv[:1] in (['done'], ['undo']) and len(argv) == 3 and argv[2].isdigit():
        ok, msg = mark(argv[1], int(argv[2]), undo=argv[0] == 'undo')
        print(msg)
        return 0 if ok else 1
    if argv[:1] == ['checklist']:
        write_checklist()
        print(f'wrote the table in {os.path.relpath(CHECKLIST, ROOT)}')
        return 0
    if argv[:1] == ['show'] and len(argv) == 2:
        hit = find(argv[1])
        if not hit:
            print(f'unknown book {argv[1]}')
            return 1
        b = book_status(*hit)
        print(f"Book {b['n']}, {b['title']} ({b['code']}, {b['series']})")
        for n, (sid, label) in STEPS.items():
            s = b['stages'][sid]
            print(f"  {n:2d}. {s['state']:5s} {label.split(';')[0][:48]:48s} {s['ev']}")
        s = b['stages']['reading']
        print(f"      {s['state']:5s} {'Reading copy':48s} {s['ev']}")
        return 0
    if argv:
        print(__doc__)
        return 2
    for b in all_status()['books']:
        if b['n'] > 12 and not b['folder']:
            continue
        cells = ' '.join(MARK[b['stages'][sid]['state']] for sid, _ in STEPS.values())
        print(f"{b['n']:2d} {b['code']:8s} {cells}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
