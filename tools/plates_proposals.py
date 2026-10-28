"""Step 7's proposals (ruling R27): the pictures the agent offers the owner for each enemy whose picture
it changes, chooses or cannot settle, shown with their context on the proposal sheet
(tools/admin/proposals.html, the dashboard's "Open proposals" at step 7), where the owner picks one.

    python tools/plates_proposals.py check <code>   # what the sheet could not show; exit 1 if any
    python tools/plates_proposals.py gather <code> "<enemy>" [--also=word,word] [--text]
        # everything a proposal needs, in one go: its fights, its picture now, the foe-about entries,
        # pictures and plates.json entries of its kind in every book, the sections naming it (or the
        # --also words: "stranger", "the serpent") and those around its fights, what was settled before;
        # --text adds those sections' text, for the agent's own reading

The file is data/projectaon/<code>/plate-proposals.json (git-ignored with the book; the sheet reads the
book's text from book.js itself, so the file holds names, ids, paths and our own words only):

    {"made": "2026-10-26", "enemies": [
      {"name": "Iron Gate",                 the enemy's name exactly as in book.js
       "note": "...",                       why these candidates, in our own words
       "sections": [251],                   sections to quote beside those it is fought or named in
       "words": ["portal", "door"],         words that find it in the text where its name is not used
       "describe": {"251": ["lead-lined iron"]},   in each section, phrases (exact, any case) of the sentences
                                            that describe it: the sheet highlights each whole sentence
       "candidates": [
         {"src": "assets/plates/x.jpg", "crop": [x, y, w, h], "why": "..."},   a picture on disk
         {"web": "<thumbnail address>", "page": "<its page>", "licence": "CC0", "why": "..."}
       ],
       "pick": 0,                           the agent's choice (index into candidates), or none
       "prompt": "...",                     every detail the book (and the wiki) gives of what it looks like,
                                            but no colour (an ink drawing: tone and texture instead),
                                            and the moment it is fought, for the sheet's image-generator prompt
                                            (our own words: it is sent to the generator; never 8 of the book's
                                            in a row)
       "refs": ["data/projectaon/19wb/small6.png"]}   pictures worth attaching to the generator beside the
                                            candidates (any that show it or its surroundings, small ones too)
    ]}

The owner settles each row on the sheet, which writes it here: "decided": {"how": "chosen", "src": ...,
"on": date} after Use this, {"how": "kept", "on": date} for Keep as is; Reopen takes it out. Finish moves
the file into plate-proposals.done.json beside it ({"rounds": [... each with "finished": date]}), which the
next round reads so as not to propose again what the owner has settled.

What the enemy shows now is not listed: the sheet puts it first itself. An enemy left with no picture
(a creature no book draws) is listed with no candidates and its prompt.
"""
import datetime
import json
import os
import re
import sys

import about_check
import plates_draft as pd
import plates_file as pf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def path(code):
    return os.path.join(ROOT, 'data', 'projectaon', code, 'plate-proposals.json')


def colours():
    """The colour words the sheets strip from a prompt, read from tools/admin/plateprompt.js's COLOURS (one list)."""
    with open(os.path.join(ROOT, 'tools', 'admin', 'plateprompt.js'), encoding='utf-8') as f:
        js = f.read()
    return re.findall(r"'([a-z]+)'", re.search(r'COLOURS = \[(.*?)\]', js, re.S).group(1))


def load(code):
    with open(path(code), encoding='utf-8') as f:
        return json.load(f)


def _save(file, data):
    with open(file + '.part', 'w', encoding='utf-8') as f:
        f.write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    os.replace(file + '.part', file)


def open_rows(code):
    """How many rows wait for the owner (none decided); 0 with no file."""
    return sum('decided' not in e for e in load(code).get('enemies', [])) if os.path.isfile(path(code)) else 0


def decide(code, name, how, src=None, today=None):
    """The owner's decision on one row: 'chosen' (the picture saved, src), 'kept' (left as it is), or None to reopen it."""
    if how not in ('chosen', 'kept', None):
        raise ValueError(f'not a decision: {how!r}')
    if not os.path.isfile(path(code)):
        raise ValueError(f'no proposals for {code}')
    data = load(code)
    row = next((e for e in data.get('enemies', []) if e.get('name') == name), None)
    if row is None:
        raise ValueError(f'{name!r} is not proposed for {code}')
    row.pop('decided', None)
    if how:
        row['decided'] = {'how': how, **({'src': src} if src else {}), 'on': today or datetime.date.today().isoformat()}
    _save(path(code), data)
    return row


def done_path(code):
    return os.path.join(ROOT, 'data', 'projectaon', code, 'plate-proposals.done.json')


def done(code):
    """Every finished round: {"rounds": [...]}."""
    if not os.path.isfile(done_path(code)):
        return {'rounds': []}
    with open(done_path(code), encoding='utf-8') as f:
        return json.load(f)


def finish(code, today=None):
    """The round finished: added to the done file, the proposal file gone (so the dashboard's button goes).
    Returns how many rows it had."""
    if not os.path.isfile(path(code)):
        raise ValueError(f'no proposals for {code}')
    data, past = load(code), done(code)
    past['rounds'].append({**data, 'finished': today or datetime.date.today().isoformat()})
    _save(done_path(code), past)
    os.remove(path(code))
    return len(data.get('enemies', []))


def _book(code):
    with open(os.path.join(ROOT, 'data', 'projectaon', code, 'book.js'), encoding='utf-8') as f:
        js = f.read()
    return json.loads(js[js.index('|| {}, ') + 7:js.rindex(');')])[code]


def problems(code):
    """What would leave a card wrong or empty on the sheet, one line each; [] if none."""
    if not os.path.isfile(path(code)):
        return [f'no data/projectaon/{code}/plate-proposals.json']
    data, book = load(code), _book(code)
    said = about_check.runs(about_check.words(' '.join(p for s in book['sections'].values() for p in s.get('text', []))))
    names = {e['name'] for s in book['sections'].values() for e in s.get('combat', {}).get('enemies', [])}
    out = []
    # a colour word, its -ish/-dish/-y forms, alone or joined by a hyphen; lower case, so names are kept
    hue = None
    for e in data.get('enemies', []):
        n = e.get('name', '')
        if n not in names:
            out.append(f'{n!r}: not an enemy of {code} (use the name exactly as book.js has it)')
        for s in e.get('sections', []):
            if str(s) not in book['sections']:
                out.append(f'{n}: no section {s}')
        cands = e.get('candidates', [])
        for i, c in enumerate(cands):
            if 'src' in c:
                if not os.path.isfile(os.path.join(ROOT, *c['src'].split('/'))):
                    out.append(f'{n}: candidate {i}, {c["src"]} is not on disk')
            elif 'web' in c:
                if not str(c['web']).startswith('https://'):
                    out.append(f'{n}: candidate {i}, its thumbnail must be an https address')
                if not str(c.get('page', '')).startswith('https://'):
                    out.append(f'{n}: candidate {i} needs the https page it comes from (its link, ADR 0038)')
            else:
                out.append(f'{n}: candidate {i} has neither src nor web')
        for sid, phrases in (e.get('describe') or {}).items():
            if sid not in book['sections']:
                out.append(f'{n}: no section {sid}')
                continue
            text = ' '.join(book['sections'][sid].get('text', [])).lower()
            out += [f'{n}: section {sid} has no {ph!r} to highlight' for ph in phrases if ph.lower() not in text]
        for r in e.get('refs', []):
            if not os.path.isfile(os.path.join(ROOT, *str(r).split('/'))):
                out.append(f'{n}: reference {r} is not on disk')
        prompt = e.get('prompt')
        if prompt is not None and not isinstance(prompt, str):
            out.append(f'{n}: its prompt must be text')
        elif prompt and about_check.runs(about_check.words(prompt)) & said:
            out.append(f"{n}: its prompt repeats {about_check.RUN} or more of the book's words in a row: reword it")
        if isinstance(prompt, str) and prompt:
            hue = hue or re.compile(r'(?<![A-Za-z])((?:%s)(?:dish|ish|y)?)(?![a-z])' % '|'.join(colours()))
            if hue.findall(prompt):
                out.append(f"{n}: its prompt names a colour ({', '.join(hue.findall(prompt))}): an ink drawing has none, describe it in tone and texture")
        pick = e.get('pick')
        if pick is not None and not (isinstance(pick, int) and 0 <= pick < len(cands)):
            out.append(f'{n}: pick {pick} is not one of its {len(cands)} candidates')
    return out


def gather(code, name, also=()):
    """What a proposal for one enemy needs, from every file, so the agent does not look for it each time:
    where it is fought (and other enemies of its kind in the book), what it shows now, the foe-about
    entries, illustration-index pictures and plates.json entries of its kind in every book (this book's
    first, then the nearest), the sections naming it or `also`'s words, those leading into and out of its
    fights, and what the owner settled for it before. Ids, paths and our own words only."""
    book = _book(code)
    secs = book['sections']
    if name not in pf.enemy_names(book):
        raise ValueError(f'{name!r} is not an enemy of {code}')
    k = pd.kind(name)
    terms = [t for t in dict.fromkeys([k, pd.head(k)[-1:]] + [pd.words(a) for a in also]) if t]
    fights = [sid for sid, s in secs.items() if any(e['name'] == name for e in s.get('combat', {}).get('enemies', []))]
    kin = {}
    for sid, s in secs.items():
        for e in s.get('combat', {}).get('enemies', []):
            if e['name'] != name and pd.same_kind(k, pd.kind(e['name'])):
                kin.setdefault(e['name'], []).append(sid)
    with open(os.path.join(ROOT, 'assets', 'plates', 'plates.json'), encoding='utf-8') as f:
        plates = json.load(f)['plates']
    try:
        with open(os.path.join(ROOT, 'about', 'foe-about.json'), encoding='utf-8') as f:
            foes = json.load(f)
    except OSError:
        foes = {}
    about = {f'{c}: {n}': t for c, rows in foes.items() for n, t in rows.items() if pd.same_kind(k, pd.kind(n))}
    mine = pd.book_no(code)
    pictures = []
    for key, row in pd.load_index().items():
        if not isinstance(row, dict) or 'about' not in row:
            continue
        foes_there = list(row.get('fight') or []) + [n for f in row.get('fought_at') or [] for n in f.get('enemies', [])]
        seen = pd.words(f"{row.get('shows', '')} {row.get('about', '')}")
        if not (any(pd.same_kind(k, pd.kind(n)) for n in foes_there) or any(pd.held(t, seen) for t in terms)):
            continue
        b = row.get('book')
        pictures.append({'src': key if key.startswith(('assets/', 'art/', 'data/')) else f'data/projectaon/{key}',
                         'fight': row.get('fight') or [], 'fought_at': [f['section'] for f in row.get('fought_at') or []],
                         'small': bool(row.get('small')), 'about': row.get('about') or row.get('shows') or '',
                         'order': (b != code, abs(pd.book_no(b) - mine) if b else 99)})
    pictures.sort(key=lambda p: p.pop('order'))
    words_of = lambda m: pd.words(re.sub(r'[^a-z ]+', ' ', m['match'].lower()))
    entries = [p for p in plates if re.search(p['match'], name, re.I) or any(pd.held(t, words_of(p)) for t in terms)]
    named = {}
    for sid, s in secs.items():
        if sid in fights:
            continue
        ws = pd.words(' '.join(s.get('text', [])))
        hit = [' '.join(t) for t in terms if pd.held(t, ws)]
        if hit:
            named[sid] = hit
    to = lambda s: [c['to'] for c in s.get('choices', []) if c.get('to')]
    into = [sid for sid, s in secs.items() if sid not in fights and set(to(s)) & set(fights)]
    after = list(dict.fromkeys(t for sid in fights for t in to(secs[sid]) if t not in fights))
    settled = [f"{r['decided']['on']} {r['decided']['how']}" + (f" {r['decided']['src']}" if r['decided'].get('src') else '')
               for rnd in done(code)['rounds'] for r in rnd.get('enemies', []) if r.get('name') == name and r.get('decided')]
    return {'fights': fights, 'kin': kin, 'now': pf.current(plates, code, book, name)[0], 'about': about,
            'pictures': pictures, 'plates': entries, 'named': named, 'into': into, 'after': after, 'settled': settled,
            'terms': [' '.join(t) for t in terms], 'proposed': os.path.isfile(path(code)) and any(
                e.get('name') == name for e in load(code).get('enemies', []))}


def _print_gather(code, name, g, text):
    print(f"{name} ({code}): fought at {', '.join(g['fights'])}; now {g['now'] or 'no picture'}"
          + (f"; already in plate-proposals.json" if g['proposed'] else ''))
    for n, s in g['kin'].items():
        print(f"  same kind here: {n} at {', '.join(s)}")
    print('settled before: ' + ('; '.join(g['settled']) or 'never'))
    print(f"\nfoe-about ({len(g['about'])}):")
    for k, t in g['about'].items():
        print(f'  {k}: {t}')
    print(f"\npictures of its kind ({len(g['pictures'])}; this book first, then the nearest):")
    for p in g['pictures']:
        where = '; '.join(x for x in (f"fight {', '.join(p['fight'])}" if p['fight'] else '',
                                      f"fought at {', '.join(map(str, p['fought_at']))}" if p['fought_at'] else '',
                                      'small' if p['small'] else '') if x)
        print(f"  {p['src']}{f' [{where}]' if where else ''}: {p['about'][:200]}")
    print(f"\nplates.json entries ({len(g['plates'])}):")
    for p in g['plates']:
        extra = ''.join(f' {k}={json.dumps(p[k])}' for k in ('crop', 'levels', 'flip', 'over', 'draft') if k in p)
        print(f"  {p.get('book', 'any')} {p['match']} -> {p['src']}{extra}")
    print(f"\nsections naming it ({', '.join(g['terms'])}): "
          + (', '.join(f"{s} ({'/'.join(t)})" for s, t in g['named'].items()) or 'none'))
    print(f"leading into its fights: {', '.join(g['into']) or 'none'}; after them: {', '.join(g['after']) or 'none'}")
    if text:
        secs = _book(code)['sections']
        print('\n(for your reading only: never paste it into chat or files)')
        for sid in dict.fromkeys(g['into'] + g['fights'] + g['after'] + list(g['named'])):
            print(f'\n#{sid}\n' + '\n'.join(secs[sid].get('text', [])))


def main(argv):
    if len(argv) >= 3 and argv[0] == 'gather':
        also = next((a.split('=', 1)[1] for a in argv if a.startswith('--also=')), '')
        try:
            g = gather(argv[1], argv[2], [w.strip() for w in also.split(',') if w.strip()])
        except ValueError as e:
            print(e)
            return 1
        _print_gather(argv[1], argv[2], g, '--text' in argv)
        return 0
    if len(argv) != 2 or argv[0] != 'check':
        print(__doc__)
        return 2
    code = argv[1]
    found = problems(code)
    for p in found:
        print(p)
    if not found:
        d = load(code)
        print(f"{code}: {len(d['enemies'])} enemies, {sum(len(e.get('candidates', [])) for e in d['enemies'])} candidates: "
              'ready for the proposal sheet (step 7, "Open proposals")')
    return 1 if found else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
