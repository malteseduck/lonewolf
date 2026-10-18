"""Step 7's draft (ADRs 0008, 0036): a picture for each enemy of a book that has none, written to
assets/plates/plates.json for the owner to judge on the picture sheet.

    python tools/plates_draft.py <code>            # writes the entries, prints what it chose
    python tools/plates_draft.py <code> --dry      # prints only
    python tools/plates_draft.py <code> --compare  # a book already done: drafts it afresh without
                                                   # its own entries and says how often it agrees

Where a picture comes from, first that applies (ADR 0008; docs/reference/items.md, Fight pictures):

1. the fight's own picture: the importer gave it already, so such an enemy is not drafted;
2. the same creature in this book: another enemy of the same kind with a picture now (whole or
   cropped, as it is shown), or an illustration whose note (`shows`, ill-index.json) names it;
3. the same creature in another book, likewise, the nearest book first;
   Failing a name, a picture of this book with no fight of its own one or two links before the
   fight (how Books 6-8 found most of theirs): a guess, so after another book's same creature;
4. a stand-in from the library (assets/plates/) or the owner's pictures (art/plates/), by a word of
   the name in the file's name, the one this book uses least.

"The same kind" is read from the names alone: numbers, a note in brackets and a group word ("pack",
"patrol") left out, plurals made singular, then one name held in the other ("Vazhag" in "Fat
Vazhag"). A plain human (a guard, a swordsman: ADR 0008) is matched only in this book, then by a
stand-in, then by exactly the same name in another book, and a lone word such as "guard" never
matches a longer name. What cannot be matched is left with none and listed: the sheet's Stand-in...
is the owner's.

Each entry is written as the owner's would be (the enemy's name, escaped and anchored, `book` set,
at the top) with `draft` saying where it came from, so the sheet labels it the script's pick, and
Adjust or Remove there makes it the owner's or takes it out. Names and file names only are
printed, never the books' prose.
"""
import json
import os
import re
import sys

import plates_file as pf

GROUP = {'pack', 'patrol', 'scout', 'horde', 'band', 'squad', 'troop', 'garrison', 'swarm', 'brood', 'escort', 'group'}
STOP = {'the', 'a', 'an', 'and', 'with', 'one'}
IRREGULAR = {'drakkarim': 'drakkar', 'wolves': 'wolf', 'elves': 'elf', 'dwarves': 'dwarf', 'liganim': 'ligan',
             'nadziranim': 'nadziran', 'thieves': 'thief'}
# a plain human's last word (ADR 0008): such a name is a kind of person, not one creature
HUMAN = {'guard', 'soldier', 'warrior', 'mercenary', 'sentry', 'captain', 'sergeant', 'knight', 'officer', 'leader',
         'robber', 'thug', 'bandit', 'thief', 'brigand', 'cutthroat', 'footpad', 'rogue', 'pickpocket', 'swordsman',
         'swordswoman', 'horseman', 'rider', 'archer', 'bowman', 'spearman', 'priest', 'monk', 'acolyte', 'defender',
         'man', 'woman', 'villager', 'peasant', 'sailor', 'pirate', 'partisan', 'bodyguard', 'trooper', 'marine',
         'gaoler', 'jailer', 'watchman', 'innkeeper', 'merchant', 'noble', 'courtier', 'servant', 'slave'}
# words a stand-in's file may be named by instead
STANDIN_WORDS = {'soldier': 'guard', 'sentry': 'guard', 'sergeant': 'guard', 'captain': 'guard', 'warrior': 'guard',
                 'mercenary': 'guard', 'watchman': 'guard', 'officer': 'guard', 'robber': 'rogue', 'bandit': 'rogue',
                 'thug': 'rogue', 'brigand': 'rogue', 'cutthroat': 'rogue', 'footpad': 'rogue', 'pickpocket': 'rogue',
                 'partisan': 'villager', 'peasant': 'villager', 'pirate': 'sailor', 'dog': 'hound', 'demon': 'demon',
                 'zombie': 'zombie', 'swordswoman': 'swordswoman'}
IMG = re.compile(r'\.(png|jpe?g|webp)$', re.I)


def word(w):
    if w in IRREGULAR:
        return IRREGULAR[w]
    if w.endswith('men') and len(w) > 4:
        return w[:-3] + 'man'
    if w.endswith('ies') and len(w) > 4:
        return w[:-3] + 'y'
    if w.endswith('s') and not w.endswith('ss') and len(w) > 3:
        return w[:-1]
    return w


def words(text):
    return tuple(word(w) for w in re.split(r"[^\w']+", (text or '').lower()) if w and not w.isdigit() and w not in STOP and w != '_')


def kind(name):
    """The name as a tuple of words, without numbers, notes in brackets or group words."""
    ws = words(re.sub(r'\([^)]*\)?', ' ', name or ''))
    return tuple(w for w in ws if w not in GROUP) or ws


def head(k):
    """The words naming what it is: "Monks of the Sword" are monks."""
    return k[:k.index('of')] if 'of' in k[1:] else k


def plain(k):
    return bool(head(k)) and head(k)[-1] in HUMAN


def person(k, creatures):
    """A plain human: a person's word last, and no creature named before it ("Giak Officer" is a Giak)."""
    return plain(k) and not any(held(c, head(k)[:-1]) for c in creatures)


def held(a, b):
    """a's words, in order, within b's."""
    return any(b[i:i + len(a)] == a for i in range(len(b) - len(a) + 1))


def same_kind(k, c):
    """'exact', 'held' or None: whether two kinds name the same creature."""
    if not k or not c:
        return None
    if k == c:
        return 'exact'
    short, long_ = (k, c) if len(k) <= len(c) else (c, k)
    if sum(map(len, short)) < 3 or plain(short):  # "guard" is no more "town guard" than "giak guard"
        return None
    return 'held' if held(short, long_) else None


def book_no(code):
    return int(code[:2]) if code[:2].isdigit() else 0


def data_dir():
    return os.path.join(pf.ROOT, 'data', 'projectaon')


def load_book(code):
    p = os.path.join(data_dir(), code, 'book.js')
    with open(p, encoding='utf-8') as f:
        t = f.read()
    return json.loads(t[t.index('|| {}, ') + 7:t.rindex(');')])[code]


def imported():
    d = data_dir()
    return sorted(c for c in os.listdir(d) if os.path.isfile(os.path.join(d, c, 'book.js'))) if os.path.isdir(d) else []


def load_index():
    try:
        with open(os.path.join(data_dir(), 'ill-index.json'), encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def plate_of(src, entry):
    p = {'src': src}
    for k in ('crop', 'levels', 'flip'):
        if entry and entry.get(k):
            p[k] = entry[k]
    return p


def pictured(code, book, plates):
    """[(name, plate)] for each enemy of the book with a picture now, as the player shows it. Another
    draft is not a source: nobody has looked at it yet."""
    out = []
    for name in sorted(pf.enemy_names(book)):
        src, entry = pf.current(plates, code, book, name)
        # nor a broad library entry ("soldier|guard|..."): a stand-in for many kinds, not this one
        if src and not (entry and (entry.get('draft') or not entry.get('book') and '|' in entry['match'])):
            out.append((name, plate_of(src, entry)))
    return out


def sources(plates, books, index):
    """Every picture a creature of this book could take: dicts of book, kind, plate, how ('fight': an
    enemy pictured with it; 'shows': an illustration's note, its words; 'near': a picture with no fight
    of its own a link or two from fights, near being [(steps, kind)])."""
    out = []
    for c, b in books.items():
        for name, plate in pictured(c, b, plates):
            out.append({'book': c, 'kind': kind(name), 'plate': plate, 'how': 'fight'})
    for key, v in index.items():
        if key == 'foes' or v.get('small') or v.get('book', '') is None:  # enemies' notes; too low for a plate; a stand-in
            continue
        c = v.get('book') or key.split('/')[0]
        src = f'data/projectaon/{key}'
        if c not in books:  # fetched, not imported: its own fights are known from the index alone
            for name in v.get('fight', []):
                out.append({'book': c, 'kind': kind(name), 'plate': {'src': src}, 'how': 'fight'})
        if v.get('shows'):
            out.append({'book': c, 'words': words(v['shows']), 'plate': {'src': src}, 'how': 'shows'})
        if not v.get('fight') and v.get('near'):
            out.append({'book': c, 'plate': {'src': src}, 'how': 'near',
                        'near': [(n['steps'], kind(e)) for n in v['near'] for e in n['enemies']]})
    return [s for s in out if os.path.isfile(os.path.join(pf.ROOT, *s['plate']['src'].split('/')))]


def match(k, s, human, here):
    """'exact', 'held' or a step count (near), or None."""
    if s['how'] == 'fight':
        return same_kind(k, s['kind'])
    if s['how'] == 'near':  # the fight's own enemy, met a link or two after the picture
        steps = [st for st, e in s['near'] if e == k and st > 0]
        return min(steps) if steps else None
    # a note names the creature: all its words, in order; a person by their last word, in this book only
    if sum(map(len, k)) < 3:
        return None
    if human:
        return 'held' if here and held(head(k)[-1:], s['words']) else None
    return 'held' if held(k, s['words']) else None


def standin_files():
    """[(src, words)] of the library's and the owner's own pictures (not their 2x copies, nor the
    pictures saved for one enemy of a book under art/plates/<code>/)."""
    out = []
    for rel in ('assets/plates', 'art/plates'):
        d = os.path.join(pf.ROOT, *rel.split('/'))
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if IMG.search(fn) and not re.search(r'-2x\.\w+$', fn) and os.path.isfile(os.path.join(d, fn)):
                out.append((f'{rel}/{fn}', {word(w) for w in re.split(r'[^a-z]+', fn.lower()[:fn.rindex('.')]) if w}))
    return out


def standin(k, files, used):
    want = {w for w in k} | {STANDIN_WORDS[w] for w in k if w in STANDIN_WORDS}
    hits = [src for src, ws in files if want & ws]
    return min(hits, key=lambda s: (used.get(s, 0), hits.index(s))) if hits else None


def draft(code, plates=None, index=None, others=None):
    """[(name, plate or None, why)] for each enemy of the book with no picture, in name order. plates:
    plates.json's list (default: the file's); others: {code: book} of the other books to borrow from
    (default: every imported book)."""
    plates = pf.load_plates()['plates'] if plates is None else plates
    index = load_index() if index is None else index
    book = load_book(code)
    books = {c: load_book(c) for c in imported() if c != code} if others is None else dict(others)
    books[code] = book
    bare = sorted(n for n in pf.enemy_names(book) if not pf.current(plates, code, book, n)[0])
    pool = sources(plates, books, index)
    creatures = {s['kind'] for s in pool if s['how'] == 'fight' and not plain(s['kind'])}
    files = standin_files()
    used = {}
    for _, p in pictured(code, book, plates):
        used[p['src']] = used.get(p['src'], 0) + 1
    n0 = book_no(code)
    out = []
    for name in bare:
        k = kind(name)
        human = person(k, creatures)
        here, there, near = [], [], []
        for s in pool:
            other = s['book'] != code
            m = match(k, s, human, not other)
            if m is None:
                continue
            if s['how'] == 'near':
                if not other:
                    near.append((m, s, m))
            elif not other:
                here.append(((s['how'] == 'shows', m != 'exact', -len(s.get('kind', ()))), s))
            elif not human or m == 'exact':  # another book's plain human only by the very same name
                there.append(((s['how'] == 'shows', m != 'exact', abs(book_no(s['book']) - n0), book_no(s['book'])), s))
        for hs in (here, there, near):
            hs.sort(key=lambda h: h[0])
        sub = standin(head(k), files, used)
        # the order of ADR 0008; a person's stand-in ranks with another book's (ADR 0008), a guess from
        # the links last of the pictures
        pick = why = None
        if here:
            pick, why = here[0][1]['plate'], here[0][1].get('why', 'this book')
        elif human and sub:
            pick, why = {'src': sub}, 'stand-in'
        elif there:
            pick, why = there[0][1]['plate'], f"Book {book_no(there[0][1]['book'])}"
        elif near:
            st = near[0][2]
            pick, why = near[0][1]['plate'], f"this book, a picture {st} link{'s' if st > 1 else ''} before the fight"
        elif sub:
            pick, why = {'src': sub}, 'stand-in'
        if pick:
            used[pick['src']] = used.get(pick['src'], 0) + 1
            # the next enemy of the same kind takes the same picture
            pool.append({'book': code, 'kind': k, 'plate': pick, 'how': 'fight', 'why': why})
        out.append((name, pick, why))
    return out


def write(code, picks):
    data = pf.load_plates()
    new = []
    for name, plate, why in picks:
        if plate:
            new.append({'match': pf.anchored(name), 'book': code, **plate, 'draft': why})
    data['plates'] = new + data['plates']
    pf.save_plates(data)
    return len(new)


def compare(code):
    """Draft a book whose pictures are set, without its own plates.json entries, against what it shows."""
    plates = pf.load_plates()['plates']
    book = load_book(code)
    mine = [p for p in plates if p.get('book') != code]
    picks = draft(code, plates=mine)
    agree, differ, none = [], [], []
    for name, plate, why in picks:
        src, entry = pf.current(plates, code, book, name)
        if not plate:
            none.append(name)
        elif src == plate['src']:  # the same picture, if not the same crop
            agree.append(name)
        else:
            differ.append((name, why, plate['src'], src))
    return picks, agree, differ, none


def main(argv):
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')  # enemy names carry accents
    args = [a for a in argv if not a.startswith('--')]
    if len(args) != 1:
        print(__doc__.split('\n\n')[1])
        return 2
    code = args[0]
    if not os.path.isfile(os.path.join(data_dir(), code, 'book.js')):
        print(f'{code}: not imported (no book.js)')
        return 1
    if '--compare' in argv:
        picks, agree, differ, none = compare(code)
        print(f'{code}: {len(picks)} enemies pictured by its own plates.json entries; drafted afresh: '
              f'{len(agree)} the same picture, {len(differ)} another, {len(none)} none')
        for name, why, got, had in differ:
            print(f'  {name}: {why} {got} (set: {had})')
        if none:
            print('  none: ' + ', '.join(none))
        return 0
    picks = draft(code)
    if not picks:
        print(f'{code}: every enemy has a picture already; nothing to draft')
        return 0
    for name, plate, why in picks:
        if plate:
            print(f'  {name}: {why}, {plate["src"]}' + (' (cropped)' if plate.get('crop') else ''))
    left = [n for n, p, _ in picks if not p]
    n = sum(1 for _, p, _ in picks if p)
    if '--dry' not in argv:
        write(code, picks)
    print(f'{code}: {n} of {len(picks)} enemies with no picture given one' + (' (not written: --dry)' if '--dry' in argv else
          ', written to assets/plates/plates.json as the script\'s picks: judge them on the picture sheet'))
    if left:
        print(f'  {len(left)} left with none (Stand-in... on the sheet): ' + ', '.join(left))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
