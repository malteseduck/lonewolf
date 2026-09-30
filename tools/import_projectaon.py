"""Turn a downloaded Project Aon book into the engine's book format.

    python tools/fetch_projectaon.py 01fftd
    python tools/import_projectaon.py 01fftd

Writes data/projectaon/<book>/book.js and refreshes data/projectaon/index.js, which loads every
imported book. Both are git-ignored: they contain the books' text.

The parse is heuristic. What it understands: paragraphs, illustrations, choices, "Kai/Magnakai
Discipline of X" gates, rank gates, Random Number ranges, combat stat lines, evasion, Mindblast
immunity, COMBAT SKILL adjustments, forced Meals, dead ends. Item pick-ups and other special rules
stay as text for the player to apply by hand.
"""
import glob, html, json, os, re, sys

BOOKS = {  # code: (number, series, title)
    '01fftd': (1, 'kai', 'Flight from the Dark'), '02fotw': (2, 'kai', 'Fire on the Water'),
    '03tcok': (3, 'kai', 'The Caverns of Kalte'), '04tcod': (4, 'kai', 'The Chasm of Doom'),
    '05sots': (5, 'kai', 'Shadow on the Sand'), '06tkot': (6, 'magnakai', 'The Kingdoms of Terror'),
    '07cd': (7, 'magnakai', 'Castle Death'), '08tjoh': (8, 'magnakai', 'The Jungle of Horrors'),
    '09tcof': (9, 'magnakai', 'The Cauldron of Fear'), '10tdot': (10, 'magnakai', 'The Dungeons of Torgar'),
    '11tpot': (11, 'magnakai', 'The Prisoners of Time'), '12tmod': (12, 'magnakai', 'The Masters of Darkness'),
}
DISC = {'camouflage': 'camouflage', 'hunting': 'hunting', 'sixth sense': 'sixthSense', 'tracking': 'tracking', 'healing': 'healing',
        'weaponskill': 'weaponskill', 'mindshield': 'mindshield', 'mindblast': 'mindblast', 'animal kinship': 'animalKinship',
        'mind over matter': 'mindOverMatter',
        'weaponmastery': 'weaponmastery', 'animal control': 'animalControl', 'curing': 'curing', 'invisibility': 'invisibility',
        'huntmastery': 'huntmastery', 'pathsmanship': 'pathsmanship', 'psi-surge': 'psiSurge', 'psi-screen': 'psiScreen',
        'nexus': 'nexus', 'divination': 'divination'}
RANKS = {  # rank name: how many disciplines of the series it takes
    'novice': 1, 'intuite': 2, 'doan': 3, 'acolyte': 4, 'initiate': 5, 'aspirant': 6, 'guardian': 7, 'warmarn': 8, 'savant': 9, 'master': 10,
    'kai master superior': 3, 'primate': 4, 'tutelary': 5, 'principalin': 6, 'mentora': 7, 'scion-kai': 8, 'archmaster': 9, 'kai grand master': 10}
# Plates for enemies pictured in a section other than the one where they are fought. Checked by eye.
PLATE_FIXES = {'01fftd': {'kraan': 'ill3.png', 'vordak': 'ill3.png', 'giak': 'ill4.png', 'doomwolf': 'ill4.png', 'gourgaz': 'ill7.png'}}
WORDS = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5}

book = sys.argv[1] if len(sys.argv) > 1 else '01fftd'
number, series, title = BOOKS.get(book, (0, 'kai', book))
top = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'projectaon')
src = os.path.join(top, book)


def plain(s):
    s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).replace(' ', ' ').strip()


numbers = sorted(int(re.search(r'sect(\d+)\.htm$', f).group(1)) for f in glob.glob(os.path.join(src, 'sect*.htm')))
sections, pictured = {}, []
for n in numbers:
    page = open(os.path.join(src, f'sect{n}.htm'), encoding='utf-8', errors='replace').read()
    main = page[page.find('<div class="maintext'):page.find('<p id="page-navigation"')]
    sec = {'text': [], 'choices': []}
    enemies = []
    for m in re.finditer(r'<p(?: class="(\w+)")?>(.*?)</p>|<img[^>]+src="([^"]+)"', main, re.S):
        cls, body, img = m.group(1), m.group(2), m.group(3)
        if img:
            sec['img'] = {'file': img, 'full': img.startswith('ill'), 'at': len(sec['text'])}
        elif cls == 'combat':
            c = re.match(r'(.+?):\s*COMBAT\s*SKILL\s*(\d+)\s*ENDURANCE\s*(\d+)', plain(body))
            if c:
                enemies.append({'name': c.group(1).strip(), 'cs': int(c.group(2)), 'ep': int(c.group(3))})
        elif cls == 'choice':
            text = plain(body)
            for to in re.findall(r'href="sect(\d+)\.htm"', body):
                ch = {'text': text, 'to': to}
                d = re.search(r'If you (?:have|possess|wish to use)[^.;]*?(?:Kai|Magnakai) Discipline of ([A-Za-z -]+?)(?:,| and| to|\.| you|$)', text)
                if d and d.group(1).strip().lower() in DISC:
                    ch['need'] = {'disc': DISC[d.group(1).strip().lower()]}
                k = re.search(r'(?:reached|attained) the (?:Kai |Magnakai )?rank of ([A-Za-z -]+?)(?: or (?:higher|above|more))?(?:,|\.| you|$)', text)
                if k and k.group(1).strip().lower() in RANKS and 'not' not in text[:k.start()].lower():
                    ch['need'] = {'rank': RANKS[k.group(1).strip().lower()]}
                r = re.search(r'\b(\d)\s*[–-]\s*(\d)\b', text) or re.search(r'(?:pick(?:ed)?|number|is|it is)\D{0,24}\b(\d)\b(?!\s*[–-])', text)
                if r:
                    ch['range'] = [int(r.group(1)), int(r.group(r.lastindex))]
                if re.search(r'\bevade\b', text, re.I):
                    ch['evade'] = True
                sec['choices'].append(ch)
        else:
            sec['text'].append(plain(body))
            if cls == 'deadend':
                sec['end'] = 'death'
    whole = ' '.join(sec['text'])
    if n == numbers[-1]:
        sec['end'] = 'victory'
    if 'random.htm' in main:
        ranged = [c for c in sec['choices'] if 'range' in c]
        covered = {d for c in ranged for d in range(c['range'][0], c['range'][1] + 1)}
        adjusts = re.search(r'\b(add|deduct|subtract)\b[^.]{0,40}\b(number|figure|total)', whole, re.I) or re.search(r'\badd \d\b', whole)
        if ranged and len(ranged) == len(sec['choices']) and covered == set(range(10)) and not adjusts:
            sec['rnt'] = 'auto'
        else:
            sec['rnt'] = 'free'
            for c in sec['choices']:
                c.pop('range', None)
    else:
        for c in sec['choices']:
            c.pop('range', None)
    if enemies:
        combat = {'enemies': enemies}
        if re.search(r'immune to (?:Mindblast|Psi-surge)', whole, re.I):
            for e in enemies:
                e['immune'] = True
        m = re.search(r'[Dd]educt (\d+) points? from your COMBAT SKILL', whole)
        p = re.search(r'[Aa]dd (\d+) points? to your COMBAT SKILL', whole)
        if m:
            combat.update(csMod=-int(m.group(1)), csNote='As the text says')
        elif p:
            combat.update(csMod=int(p.group(1)), csNote='As the text says')
        ev = next((c for c in sec['choices'] if c.get('evade')), None)
        if ev:
            a = re.search(r'after (\w+) rounds?', ev['text'] + ' ' + whole)
            after = 0
            if a:
                after = WORDS.get(a.group(1).lower(), int(a.group(1)) if a.group(1).isdigit() else 0)
            combat['evade'] = {'after': after, 'to': ev['to']}
        for e in enemies:
            low = e['name'].lower()
            e['sprite'] = next((k for k in ('kraan', 'giak', 'vordak') if k in low), 'emblem')
            if sec.get('img', {}).get('full'):
                e['art'] = sec['img']['file']
        sec['combat'] = combat
    if re.search(r'must (?:now )?eat a Meal', whole):
        sec['meal'] = True
    sections[str(n)] = sec
    if sec.get('img', {}).get('full'):
        pictured.append((' '.join(e['name'].lower() for e in enemies), sec['img']['file']))

# enemies met elsewhere borrow the plate of a section where their kind is both fought and pictured
fixes = PLATE_FIXES.get(book, {})
def plate_for(name):
    kind = re.sub(r'\s*\d+$', '', name.lower()).strip()
    kind = kind[:-1] if kind.endswith('s') and len(kind) > 4 else kind
    for key, f in fixes.items():
        if key in kind:
            return f
    return next((f for text, f in pictured if len(kind) > 3 and kind in text), None)

for sec in sections.values():
    for e in sec.get('combat', {}).get('enemies', []):
        if 'art' not in e:
            art = plate_for(e['name'])
            if art:
                e['art'] = art

out = {'id': book, 'number': number, 'series': series, 'title': title, 'subtitle': 'Project Aon edition, imported for personal use',
       'start': '1', 'assets': f'data/projectaon/{book}/', 'map': 'map.png', 'bonusItem': book == '01fftd', 'sections': sections}
with open(os.path.join(src, 'book.js'), 'w', encoding='utf-8') as f:
    f.write('(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, ' + json.dumps({book: out}, ensure_ascii=False) + ');\n')

have = sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(top, '*', 'book.js')))
with open(os.path.join(top, 'index.js'), 'w', encoding='utf-8') as f:
    f.write('/* written by tools/import_projectaon.py: loads every imported book */\n')
    f.write(''.join(f'document.write(\'<script src="data/projectaon/{b}/book.js"><\\/script>\');\n' for b in have))

secs = sections.values()
print(f'{title} ({series}):', len(sections), 'sections;', sum('combat' in s for s in secs), 'with combat;',
      sum(s.get('rnt') == 'auto' for s in secs), 'auto random,', sum(s.get('rnt') == 'free' for s in secs), 'free random;',
      sum(any('disc' in c.get('need', {}) for c in s['choices']) for s in secs), 'with discipline gates;',
      sum(any('rank' in c.get('need', {}) for c in s['choices']) for s in secs), 'with rank gates;',
      sum('img' in s for s in secs), 'illustrated;', sum(s.get('end') == 'death' for s in secs), 'dead ends;', sum('meal' in s for s in secs), 'forced meals')
foes = {e['name']: e.get('art') for s in secs for e in s.get('combat', {}).get('enemies', [])}
print(len(foes), 'kinds of enemy,', sum(1 for a in foes.values() if a), 'with a plate')
broken = [(k, c['to']) for k, s in sections.items() for c in s['choices'] if c['to'] not in sections]
print('broken links:', broken, '| no way on and no ending:', [k for k, s in sections.items() if not s['choices'] and 'end' not in s])
print('books loaded by index.js:', have)
