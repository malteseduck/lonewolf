"""Our descriptions of the books' pictures and enemies (about/*.json) are committed (ADR 0042), so none
may repeat a book's own wording: this lists every entry that shares a run of RUN words with its book's
sections. Ids and counts only, never the matching text.

It also checks about/foe-scene.json ({book: {enemy name: {"setting": ..., "figures": n}}}), what the picture
sheet's image prompt draws each kind of enemy in (ADR 0008, the owner, 2026-11-03): every kind in
foe-about.json has one, "figures" a whole number of 1 or more, and "setting" the kind of place, short, in
our own words, with no colour (a fight picture is an ink drawing), nothing by its name, person or place,
as what is named gets drawn (any capitalised word, or a word the book only ever writes as a name), and no
one in it (a crowd, a guard, a horse): the place only, as the enemy is drawn alone.

    python tools/about_check.py        exit 1 if any entry does, or any scene is wrong

A book not downloaded is skipped (a fresh checkout has none); check_all.py runs this with the books here.
"""
import glob
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PA = os.path.join(ROOT, 'data', 'projectaon')
ABOUT_DIR = os.path.join(ROOT, 'about')
RUN = 8  # words in a row; shorter runs are names and stock phrases ("at the foot of the stairs")


def words(text):
    return re.findall(r"[a-z0-9']+", text.lower().replace('-', ' '))


def runs(ws):
    return {' '.join(ws[i:i + RUN]) for i in range(len(ws) - RUN + 1)}


def book_text(code, cache):
    """The book's sections as plain text, '' when it is not downloaded."""
    if code not in cache:
        text = ''
        for f in glob.glob(os.path.join(PA, code, 'sect*.htm')):
            with open(f, encoding='utf-8', errors='replace') as fh:
                text += ' ' + re.sub(r'<[^>]+>', ' ', fh.read())
        cache[code] = text
    return cache[code]


def book_runs(code, cache):
    key = ('runs', code)
    if key not in cache:
        text = book_text(code, cache)
        cache[key] = runs(words(text)) if text else None
    return cache[key]


def book_names(code, cache):
    """Words the book writes only as names: capitalised in mid-sentence and never in lower case
    ("Holmgard", "Banedon"); a word capitalised only at a sentence's start is not one."""
    key = ('names', code)
    if key not in cache:
        text, caps, lower = html.unescape(book_text(code, cache)), set(), set()  # "Holmgard&rsquo;s"
        for m in re.finditer(r"[A-Za-z][A-Za-z']*", text):
            w = m.group(0)
            if w[0].islower():
                lower.add(w.lower())
            elif re.search(r"[a-z,;]\s*$", text[max(0, m.start() - 3):m.start()]):
                caps.add(w.lower())
        cache[key] = caps - lower
    return cache[key]


def colours(root=ROOT):
    """The colour words the sheets strip from a prompt: tools/admin/plateprompt.js's COLOURS (one list)."""
    with open(os.path.join(root, 'tools', 'admin', 'plateprompt.js'), encoding='utf-8') as f:
        js = f.read()
    return re.findall(r"'([a-z]+)'", re.search(r'COLOURS = \[(.*?)\]', js, re.S).group(1))


def _load(name):
    try:
        with open(os.path.join(ABOUT_DIR, name), encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def entries():
    """(file, key, book code, text) for every description."""
    load = _load
    for code, names in load('foe-about.json').items():
        for name, text in names.items():
            yield 'foe-about.json', f'{code}/{name}', code, text
    for name in ('ill-about.json', 'ill-notes.json'):
        for key, text in load(name).items():
            yield name, key, key.split('/')[0], text


def copied():
    cache, out = {}, []
    for file, key, code, text in entries():
        book = book_runs(code, cache)
        n = len(runs(words(text)) & book) if book else 0
        if n:
            out.append({'file': file, 'key': key, 'runs': n})
    return out


# someone or something in the place: the image prompt draws the enemy alone, and what a setting names gets drawn
FIGURES = re.compile(r"\b(?:crew|enem(?:y|ies)|corpses?|bod(?:y|ies)|m[ae]n|wom[ae]n|soldiers?|people|crowds?|onlookers|"
                     r"spectators|patrons|villagers?|travell?ers?|sailors?|prisoners?|victims?|warriors?|guards?|riders?|"
                     r"figures?|creatures?|beasts?|horses?|hounds?|dogs?|war-dogs|wolves|leaders?|cultists|allies|companions?)\b", re.I)


def scene_problems():
    """What is wrong in foe-scene.json, one line per enemy (book/name: why); our words only, never the book's."""
    about, scenes, cache, out = _load('foe-about.json'), _load('foe-scene.json'), {}, []
    hue = re.compile(r'(?<![A-Za-z])((?:%s)(?:dish|ish|y)?)(?![a-z])' % '|'.join(colours()), re.I)
    for code in sorted(set(about) | set(scenes)):
        kinds, mine = about.get(code, {}), scenes.get(code, {})
        for name in kinds:
            if name not in mine:
                out.append(f'{code}/{name}: no setting and figures in foe-scene.json')
        for name, sc in mine.items():
            at, sc = f'{code}/{name}', sc if isinstance(sc, dict) else {}
            if name not in kinds:
                out.append(f'{at}: not an enemy in foe-about.json (use its name there)')
                continue
            n = sc.get('figures')
            if not (isinstance(n, int) and not isinstance(n, bool) and n >= 1):
                out.append(f'{at}: figures must be how many the picture shows, 1 or more')
            setting = sc.get('setting')
            if not (isinstance(setting, str) and setting.strip()):
                out.append(f'{at}: no setting (the kind of place it is fought in)')
                continue
            if hue.search(setting):
                out.append(f"{at}: its setting names a colour ({', '.join(hue.findall(setting))}): say it in tone and texture")
            book = book_runs(code, cache)
            if book and runs(words(setting)) & book:
                out.append(f"{at}: its setting repeats {RUN} or more of the book's words in a row: reword it")
            named = [w for w in re.findall(r"[A-Za-z][A-Za-z']*", setting)
                     if w[0].isupper() or w.lower() in book_names(code, cache)]
            figure = FIGURES.findall(setting)
            if figure:
                out.append(f"{at}: its setting has a figure in it ({', '.join(figure)}): the place only, the enemy is drawn alone")
            if named:
                out.append(f"{at}: its setting has a name ({', '.join(named)}): say the kind of place, in lower case, naming no one")
    return out


def main(argv):
    bad = copied()
    for b in bad:
        print(f"{b['file']} {b['key']}: {b['runs']} run(s) of {RUN} words from the book")
    print(f'{len(bad)} description(s) repeat the book\'s wording' if bad else 'no description repeats the book\'s wording')
    scene = scene_problems()
    for line in scene:
        print(line)
    print(f'{len(scene)} problem(s) in foe-scene.json' if scene else 'every enemy kind has a setting and figures')
    return 1 if bad or scene else 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')  # enemy names such as "Élite Death Knights" on a cp1252 console
    sys.exit(main(sys.argv[1:]))
