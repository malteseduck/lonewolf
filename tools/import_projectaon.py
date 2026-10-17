"""Turn a downloaded Project Aon book into the engine's book format.

    python tools/fetch_projectaon.py 01fftd
    python tools/import_projectaon.py 01fftd

Writes data/projectaon/<book>/book.js and refreshes data/projectaon/index.js, which loads every
imported book. Both are git-ignored: they contain the books' text. The report it prints is also
written as data/projectaon/<book>/import-report.json (counts and ids only), which
tools/reimport_all.py compares from one import to the next.

The parse is heuristic. What it understands: paragraphs, illustrations, choices, discipline,
rank and Lore-circle gates, Random Number ranges and the discipline/rank/Lore-circle bonuses added
to them, puzzles, combat stat lines, evasion, Mindblast immunity, COMBAT SKILL adjustments (with a
discipline condition), mind drain, forced Meals, dead ends. Anything else stays as text for the
player to apply by hand. See docs/reference/importer.md.
"""
import glob, html, json, os, re, sys

BOOKS = {  # code: (number, series, title)
    '01fftd': (1, 'kai', 'Flight from the Dark'), '02fotw': (2, 'kai', 'Fire on the Water'),
    '03tcok': (3, 'kai', 'The Caverns of Kalte'), '04tcod': (4, 'kai', 'The Chasm of Doom'),
    '05sots': (5, 'kai', 'Shadow on the Sand'), '06tkot': (6, 'magnakai', 'The Kingdoms of Terror'),
    '07cd': (7, 'magnakai', 'Castle Death'), '08tjoh': (8, 'magnakai', 'The Jungle of Horrors'),
    '09tcof': (9, 'magnakai', 'The Cauldron of Fear'), '10tdot': (10, 'magnakai', 'The Dungeons of Torgar'),
    '11tpot': (11, 'magnakai', 'The Prisoners of Time'), '12tmod': (12, 'magnakai', 'The Masters of Darkness'),
    '13tplor': (13, 'grandmaster', 'The Plague Lords of Ruel'),
}
DISC = {'camouflage': 'camouflage', 'hunting': 'hunting', 'sixth sense': 'sixthSense', 'tracking': 'tracking', 'healing': 'healing',
        'weaponskill': 'weaponskill', 'mindshield': 'mindshield', 'mindblast': 'mindblast', 'animal kinship': 'animalKinship',
        'mind over matter': 'mindOverMatter',
        'weaponmastery': 'weaponmastery', 'animal control': 'animalControl', 'curing': 'curing', 'invisibility': 'invisibility',
        'huntmastery': 'huntmastery', 'pathsmanship': 'pathsmanship', 'psi-surge': 'psiSurge', 'psi-screen': 'psiScreen',
        'nexus': 'nexus', 'divination': 'divination',
        'grand weaponmastery': 'grandWeaponmastery', 'animal mastery': 'animalMastery', 'deliverance': 'deliverance', 'assimilance': 'assimilance',
        'grand huntmastery': 'grandHuntmastery', 'grand pathsmanship': 'grandPathsmanship', 'kai-surge': 'kaiSurge', 'kai-screen': 'kaiScreen',
        'grand nexus': 'grandNexus', 'telegnosis': 'telegnosis', 'magi-magic': 'magiMagic', 'kai-alchemy': 'kaiAlchemy'}
RANKS = {  # rank name: how many disciplines of the series it takes
    'novice': 1, 'intuite': 2, 'doan': 3, 'acolyte': 4, 'initiate': 5, 'aspirant': 6, 'guardian': 7, 'warmarn': 8, 'savant': 9, 'master': 10,
    'kai master': 1, 'kai master senior': 2, 'kai master superior': 3, 'primate': 4, 'tutelary': 5, 'principalin': 6, 'mentora': 7,
    'scion-kai': 8, 'archmaster': 9, 'kai grand master': 10,
    'kai grand master senior': 1, 'kai grand master superior': 2, 'kai grand sentinel': 3, 'kai grand defender': 4, 'kai grand guardian': 5,
    'sun knight': 6, 'sun lord': 7, 'sun thane': 8, 'grand thane': 9, 'grand crown': 10, 'sun prince': 11, 'kai supreme master': 12}
CIRCLES = {'fire': 'Circle of Fire', 'light': 'Circle of Light', 'solaris': 'Circle of Solaris', 'spirit': 'Circle of the Spirit'}
# Plates for enemies pictured in a section other than the one where they are fought. Checked by eye.
PLATE_FIXES = {'01fftd': {'kraan': 'ill3.png', 'vordak': 'ill3.png', 'giak': 'ill4.png', 'doomwolf': 'ill4.png', 'gourgaz': 'ill7.png'}}
WORDS = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'first': 1}
OPEN = 99  # the far end of "5 or more" / "4 or less"

book = sys.argv[1] if len(sys.argv) > 1 else '01fftd'
number, series, title = BOOKS.get(book, (0, 'kai', book))
top = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'projectaon')
src = os.path.join(top, book)
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')  # enemy names carry accents; a Windows console would choke
except AttributeError:
    pass


def plain(s):
    s = re.sub(r'<sup>\s*<a href="#[^"]*foot"[^>]*>.*?</a>\s*</sup>', '', s, flags=re.S)  # Project Aon's footnote marks
    s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).replace(' ', ' ').strip()


def lines(s):
    """A paragraph or verse: one paragraph per line where the markup breaks it (<br>)."""
    return [t for t in (plain(x) for x in re.split(r'<br\s*/?>', s)) if t]


def sentences(text):
    return [s.strip() for s in re.split(r'(?<!i\.e\.)(?<!e\.g\.)(?<=[.!?])\s+', text) if s.strip()]  # "(i.e. you possess ...)"


def gm_names(s):
    """A Grand Master book's own ways of naming a discipline, made plain: "Grand Mastery of Nexus" is Grand Nexus."""
    return re.sub(r'\bGrand Mastery of Nexus\b', 'Grand Nexus', s)


def disc_list(s):
    """'Hunting', 'either Tracking or Sixth Sense', 'both Camouflage and Hunting' -> (ids, every) or None.
    'or' means any of them will do, 'and' that all are needed; every name must be a discipline."""
    s = re.sub(r'^(?:either|both)\s+(?:of\s+)?', '', s.strip())
    s = re.sub(r'\s*\(any weapon\)$', '', s)
    has_or, has_and = bool(re.search(r'\bor\b', s)), bool(re.search(r'\band\b', s))
    if has_or and has_and:
        return None
    names = [n.strip().lower() for n in re.split(r',\s*(?:or\s+|and\s+)?(?:of\s+)?|\s+(?:or|and)\s+(?:of\s+)?', s) if n.strip()]
    if not names or any(n not in DISC for n in names):
        return None
    return [DISC[n] for n in names], has_and and len(names) > 1


def condition(text):
    """The condition of an "If you ..." rule, when it is only disciplines, a rank and Lore-circles:
    {disc: [ids], every, rank, circle: [names]}. Anything else (items, Endurance, a weapon in hand) -> None."""
    out = {}
    if series == 'grandmaster' and re.search(r'\(with (?:a |the )?Bow\)', text):
        return None  # "Grand Weaponmastery (with Bow)": the Bow must be one of his weapons, which a condition cannot say
    text = re.sub(r'\s*\([^)]*\)?', '', text)  # "(you possess 8 Kai Disciplines)", or one cut short at its comma
    text = re.sub(r'\s+and therefore\b.*$', '', text)
    for clause in re.split(r',?\s+and\s+(?:if you\s+)?(?:also\s+)?(?=have\b|possess\b|completed\b|reached\b|attained\b)', text.strip()):
        clause = clause.strip()
        d = re.fullmatch(r'(?:have|possess)(?: and wish to use)? (?:either |both )?(?:of )?the (?:Kai |Magnakai )?Disciplines? (?:either |both )?(?:of )?(.+)', clause)
        if not d and series == 'grandmaster':
            d = re.fullmatch(r'(?:have|possess) (?:the )?(?:(?:Grand Master |Magnakai |Kai )?Disciplines? of |(?:Grand )?[Mm]astery of )?(.+)', gm_names(clause))
        r = re.fullmatch(r'(?:have )?(?:also )?(?:reached|attained) the (?:Kai |Magnakai )?[Rr]ank of ([A-Za-z -]+?)(?: or (?:higher|above|more))?(?: \([^)]*\))?', clause)
        c = re.fullmatch(r'(?:(?:have )?completed|possess) the (?:Magnakai )?Lore-circles? of (.+)', clause)
        e = re.fullmatch(r'your (?:current )?ENDURANCE(?: points?)?(?: point)? (?:total|score) is (?:now )?(.+)', clause)
        if e and 'ep' not in out:  # his Endurance as he draws: "less than 10", "20 or more"
            x = e.group(1)
            m = (re.fullmatch(r'(?:less|lower|fewer) than (\d+)|below (\d+)|under (\d+)', x), re.fullmatch(r'(?:greater|more|higher) than (\d+)|above (\d+)|over (\d+)', x),
                 re.fullmatch(r'(\d+) or (?:more|higher|above|greater)', x), re.fullmatch(r'(\d+) or (?:less|lower|below|fewer)', x))
            if m[0]:
                out['ep'] = [-OPEN, int(next(g for g in m[0].groups() if g)) - 1]
            elif m[1]:
                out['ep'] = [int(next(g for g in m[1].groups() if g)) + 1, OPEN]
            elif m[2]:
                out['ep'] = [int(m[2].group(1)), OPEN]
            elif m[3]:
                out['ep'] = [-OPEN, int(m[3].group(1))]
            else:
                return None
        elif d and 'disc' not in out:
            got = disc_list(d.group(1))
            if not got:
                return None
            out['disc'], every = got
            if every:
                out['every'] = True
        elif r and r.group(1).strip().lower() in RANKS and 'rank' not in out:
            out['rank'] = RANKS[r.group(1).strip().lower()]
        elif c and 'circle' not in out:
            names = [n.strip().lower() for n in re.split(r',\s*(?:and\s+)?|\s+and\s+', re.sub(r'\bthe Lore-circle of\b', '', c.group(1))) if n.strip()]
            names = [re.sub(r'^the\s+', '', n) for n in names]
            if not names or any(n not in CIRCLES for n in names):
                return None
            out['circle'] = [CIRCLES[n] for n in names]
        else:
            return None
    return out or None


def gate(text):
    """A choice open only to a hero with a discipline, rank or Lore-circle (need), or None.
    Negative phrasings ("if you do not have", "have yet to") are left open."""
    head = re.split(r',|\s+turn to\b', text, maxsplit=1)[0]
    if re.search(r"\b(?:not|neither|nor|yet to)\b|n't\b", head, re.I):
        return None
    # the whole condition, when it is only disciplines, a rank and Lore-circles ("... and have reached the rank of Primate")
    whole = re.fullmatch(r'If you (.+)', head.strip())
    got = whole and condition(whole.group(1))
    if got:
        if len(got.get('disc', [])) == 1:
            got['disc'] = got['disc'][0]
        return got
    if re.search(r'\bor (?:if you )?(?:have|possess|reached|attained)\b', head):
        # a discipline or a rank: any one will do. Every part must parse, or the choice stays open
        m = re.match(r'If you (.+)', head.strip())
        parts = re.split(r',?\s+or\s+(?:if you\s+)?(?=(?:have|possess|reached|attained|completed)\b)', m.group(1)) if m else []
        got = [condition(p) for p in parts]
        if len(parts) > 1 and all(got):
            for g in got:
                if len(g.get('disc', [])) == 1:
                    g['disc'] = g['disc'][0]
            return {'any': got}
        return None
    d = re.search(r'If you (?:have|possess|wish to use|wish to demonstrate)[^.;]*?(?:Kai|Magnakai) Disciplines? (?:either |both )?(?:of )?((?:either |both )?[A-Za-z -]+?(?:\s*\(any weapon\))?)(?:,| to| on| you| turn| in order|\.| \(|$)', head + '.')
    if not d and series == 'grandmaster' and not re.search(r'\(with (?:a |the )?Bow\)', head):
        d = re.search(r'If you (?:have|possess) (?:the )?(?:(?:Grand Master |Magnakai |Kai )?Disciplines? of |(?:Grand )?[Mm]astery of )?([A-Za-z -]+?)(?:,| to| on| you| turn|\.| \(|$)', gm_names(head) + '.')
    if d:
        got = disc_list(d.group(1))
        if not got:  # "of Hunting and wish to ...": the list stops at the first word that is not a discipline
            got = disc_list(re.split(r'\s+(?:and|or)\s+(?!(?:of\s+)?(?:%s)\b)' % '|'.join(re.escape(k) for k in DISC), d.group(1), maxsplit=1, flags=re.I)[0])
        if got:
            ids, every = got
            need = {'disc': ids[0] if len(ids) == 1 else ids}
            if every:
                need['every'] = True
            return need
    k = re.search(r'(?:reached|attained) the (?:Kai |Magnakai )?rank of ([A-Za-z -]+?)(?: or (?:higher|above|more))?(?:,|\.| you| \(|$)', head + '.')
    if k and k.group(1).strip().lower() in RANKS:
        return {'rank': RANKS[k.group(1).strip().lower()]}
    c = re.fullmatch(r'If you have completed (the Lore-circles? of .+)', head.strip())
    if c:
        got = condition('completed ' + c.group(1))
        if got and list(got) == ['circle']:
            return got
    return None


NUM = r'([−+]?\d{1,2})'


def as_int(s):
    return int(s.replace('−', '-').replace('+', ''))


def span(text):
    """The Random Number total a choice is for: "0–4", "−2–+3", "5 or more", "below 7", "is 0"."""
    if re.search(r'ENDURANCE|COMBAT SKILL', text) or not re.search(r'\b(?:number|total|score|figure|pick(?:ed)?|is)\b', text):
        return None
    r = re.search(r'(?<!\d)' + NUM + r'\s*[–-]\s*' + NUM + r'(?!\d)', text)
    if r:
        return [as_int(r.group(1)), as_int(r.group(2))]
    r = re.search(r'(?<!\d)' + NUM + r' or (?:more|higher|over|above|greater)\b', text)
    if r:
        return [as_int(r.group(1)), OPEN]
    r = re.search(r'(?<!\d)' + NUM + r' or (?:less|lower|below|fewer|under)\b', text)
    if r:
        return [-OPEN, as_int(r.group(1))]
    r = re.search(r'\b(?:below|less than|lower than|under) ' + NUM + r'(?!\d)', text)
    if r:
        return [-OPEN, as_int(r.group(1)) - 1]
    r = re.search(r'\b(?:above|more than|greater than|higher than) ' + NUM + r'(?!\d)', text)
    if r:
        return [as_int(r.group(1)) + 1, OPEN]
    r = re.search(r'(?:pick(?:ed)?|number|is|it is)\D{0,24}\b(\d)\b(?!\s*[–-])', text)
    if r:
        return [int(r.group(1))] * 2
    return None


def number_rules(whole):
    """The bonuses the text adds to the Random Number: [{plus, disc|rank|circle...}], or None when
    the number is changed in any way that cannot be read for certain (Endurance, items, "0 = 10")."""
    if re.search(r'0\s*=\s*10', whole):
        return None
    mods = []
    # a list of rules after a lead-in ending in a colon (Book 13's 116): each rule is a sentence of its own
    for s in sentences(re.sub(r':\s+(?=If\b)', '. ', re.sub(r'\s*\(for example[^)]*\)', '', whole))):
        if not re.search(r'\b(?:add|deduct|subtract)\b', s, re.I):
            continue
        if not (re.search(r'\b(?:number|total|score|figure)\b', s) or re.search(r'\b(?:add|deduct|subtract)\b\D{0,20}\d', s, re.I)):
            continue
        if re.search(r'COMBAT SKILL|ENDURANCE points? (?:from|to) your', s):
            continue
        both = re.match(r'\(?If you (?:have|possess) both\b.*?\b(?:only add|add only) (\d+)', s)
        if both and any(m['plus'] == int(both.group(1)) and len(m.get('disc', [])) > 1 and not m.get('every') for m in mods):
            continue  # "if you have both, you may only add 3": the any-of rule already says so
        # "add 1 for every Magnakai Discipline you possess (above your initial three)"
        each = re.search(r'\bfor every Magnakai Discipline\b', s, re.I) and re.search(r'\badd (\d+)\b', s, re.I)
        if each and not re.search(r'\b(?:if|unless)\b', s, re.I):
            over = 3 if re.search(r'\b(?:above|in excess of)\b', s) else 0
            mods.append({'plus': int(each.group(1)), 'each': 'magnakai', 'over': over})
            continue
        # "Pick a number from the Random Number Table and add 3 to the number you have chosen" (Book 13's 124)
        plain_add = re.fullmatch(r'(?:Pick a number from the Random Number Table and )?(add|deduct|subtract) (\d+) (?:to|from) the number you have (?:chosen|picked)\.?', s, re.I)
        if plain_add:
            mods.append({'plus': int(plain_add.group(2)) * (1 if plain_add.group(1).lower() == 'add' else -1)})
            continue
        # "add 3 (if you possess both of these Grand Master Disciplines, add 7)" (Book 13's 245): both
        # together make the larger sum, read as an all-of rule for the difference
        both = re.search(r'\s*\(if you (?:have|possess) both\b[^)]*?,? add (\d+)\)', s, re.I)
        if both:
            s = s[:both.start()] + s[both.end():]
        m = re.match(r'(?:However, |Also, )?[Ii]f (you .+?|your .+?),? (?:then )?(?:you may (?:also )?)?(add|deduct|subtract) (?:another |a further |an additional |an extra )?(\d+)(?: points?)?(?: (?:to|from) (?:the|this|your) (?:total |final )?(?:number|total|score|figure)\b.*)?\.?$', s)
        if not m:
            return None
        cond = condition(re.sub(r'^you ', '', m.group(1)))
        if not cond:
            return None
        mods.append(dict(cond, plus=int(m.group(3)) * (1 if m.group(2) == 'add' else -1)))
        if both:
            if len(cond.get('disc', [])) < 2 or cond.get('every') or m.group(2) != 'add' or int(both.group(1)) <= int(m.group(3)):
                return None
            mods.append({'disc': cond['disc'], 'every': True, 'plus': int(both.group(1)) - int(m.group(3))})
    return mods


def reach(mods):
    """The lowest and highest totals the bonuses can make of a number 0-9."""
    def most(m, sign):
        n = m['plus'] * (10 - m['over'] if 'each' in m else 1)
        if list(m) == ['plus']:
            return n  # no condition: it always applies
        return n if n * sign > 0 else 0
    return sum(most(m, -1) for m in mods), 9 + sum(most(m, 1) for m in mods)


def cs_rule(whole):
    """The fight's COMBAT SKILL adjustment the text states for the whole fight: (n, csIf, csUnless),
    the conditions being disciplines, a rank and Lore-circles. One limited to some rounds, or with any
    other condition, is left to the text; so is a section with two."""
    found = []
    for s in sentences(whole):
        if 'COMBAT SKILL' not in s:
            continue
        m = (re.search(r'\b(add|increase)\b(?: your COMBAT SKILL by)? (?:an additional |a further |an extra )?(\d+)(?: points?)?(?: to your COMBAT SKILL)?', s, re.I)
             or re.search(r'\b(deduct|subtract|reduce)\b(?: your COMBAT SKILL by)? (\d+)(?: points?)?(?: from your COMBAT SKILL)?', s, re.I))
        if not m or not re.search(r'(?:to|from) your COMBAT SKILL|your COMBAT SKILL by', s):
            continue
        # some rounds only; in place of a bonus the engine gives ("instead of the normal 2"); or a weapon's
        # or item's power, which its own bonus may already count (not the foes' weapons given as the
        # reason: Book 13's 86)
        if re.search(r'\bround|instead of|\bpower\b|weapon|\bwield', re.sub(r"\benem(?:y|ies)['’]s? weapons?", '', s)):
            return None
        n = int(m.group(2)) * (1 if m.group(1).lower() in ('add', 'increase') else -1)
        # the condition ends at a comma, or with none at "you may" ("If you have X you may add 2")
        u = re.search(r'\b[Uu]nless you ((?:have|possess) .+?)(?:,| you (?:may|can|must)\b|\.?$)', s)
        i = re.search(r'\b[Ii]f you (.+?)(?:,| you (?:may|can|must)\b)', s)
        cond = condition(u.group(1)) if u else condition(i.group(1)) if i else None
        if (u or i) and (not cond or set(cond) - {'disc', 'every', 'rank', 'circle'}):
            return None
        if not (u or i) and re.search(r'\b(?:if|unless|when|while|whenever|should)\b', s, re.I):
            return None
        found.append((n, cond if i else None, cond if u else None))
    return found[0] if len(found) == 1 else None


numbers = sorted(int(re.search(r'sect(\d+)\.htm$', f).group(1)) for f in glob.glob(os.path.join(src, 'sect*.htm')))
sections, pictured = {}, []
for n in numbers:
    page = open(os.path.join(src, f'sect{n}.htm'), encoding='utf-8', errors='replace').read()
    main = page[page.find('<div class="maintext'):page.find('<p id="page-navigation"')]
    sec = {'text': [], 'choices': []}
    enemies, lost, target = [], False, None
    # a list (what is on offer, what a body carries) is a paragraph per item; a signpost, one line;
    # verse set as lines with no paragraph of its own, a paragraph per line
    for m in re.finditer(r'<p(?: class="(\w+)")?>(.*?)</p>|<img[^>]+src="([^"]+)"|<div class="signpost">(.*?)</div>|<li>(.*?)</li>|<blockquote[^>]*>((?:(?!<p[ >]).)*?)</blockquote>', main, re.S):
        cls, body, img = m.group(1), m.group(2), m.group(3)
        if m.group(4) is not None or m.group(5) is not None:
            sec['text'].append(('' if m.group(4) is not None else '– ') + plain(m.group(4) or m.group(5)))
        elif m.group(6) is not None:
            sec['text'].extend(lines(m.group(6)))
        elif img:
            sec['img'] = {'file': img, 'full': img.startswith('ill'), 'at': len(sec['text'])}
        elif cls == 'combat':
            # a door fought as an enemy: "ENDURANCE (RESISTANCE points) 35". "(TARGET points)": a contest
            # scored in points on each side that leaves his Endurance alone (the combat's `points`)
            c = re.match(r'(.+?):\s*COMBAT\s*SKILL\s*(\d+)\s*ENDURANCE\s*(?:\(\s*(RESISTANCE|TARGET) points\s*\)\s*)?(\d+)', plain(body))
            if c:
                enemies.append({'name': c.group(1).strip(), 'cs': int(c.group(2)), 'ep': int(c.group(4))})
                if c.group(3) == 'TARGET':
                    target = int(c.group(4))
        elif cls == 'choice' and re.search(r'href="sect\d+\.htm"', body):
            text = plain(body)
            for to in re.findall(r'href="sect(\d+)\.htm"', body):
                ch = {'text': text, 'to': to}
                need = gate(text)
                if need:
                    ch['need'] = need
                r = span(text)
                if r:
                    ch['range'] = r
                # a door's "cease 'combat' at any time"; not "if you lose any, even when attempting to evade"
                if re.search(r'\bevade\b|\bcease [‘\'"]?combat\b', text, re.I) and not re.search(r'\beven (?:when|if)\b[^.,]*\bevad', text, re.I):
                    ch['evade'] = True
                sec['choices'].append(ch)
        else:
            # a "choice" with no way on (the book's own ending without a death), a puzzle, a paragraph
            sec['text'].extend(lines(body))
            if cls == 'deadend':
                sec['end'] = 'death'
            elif cls == 'choice':
                lost = True
            elif cls == 'puzzle':
                sec['puzzle'] = True  # its answer is a section number: the page offers "turn to"
    whole = ' '.join(sec['text'])
    if n == numbers[-1]:
        sec['end'] = 'victory'
    if lost and not sec['choices'] and 'end' not in sec and 'puzzle' not in sec:
        sec['end'] = 'failed'
    if 'random.htm' in main:
        ranged = [c for c in sec['choices'] if 'range' in c]
        # a choice taken before the draw ("If you have Sixth Sense, ...; otherwise pick a number") may stand beside the ranges
        before = all('range' in c or (re.match(r'If\b[^,]{0,30}?\byou (?:have|possess|are carrying|wish to use)\b', c['text'])
                                      and not re.search(r'\b(?:number|total|score|pick)', c['text'])) for c in sec['choices'])
        mods = number_rules(whole)
        lo, hi = reach(mods or [])
        hits = [sum(c['range'][0] <= t <= c['range'][1] for c in ranged) for t in range(lo, hi + 1)]
        if ranged and before and mods is not None and all(h == 1 for h in hits):
            sec['rnt'] = 'auto'
            if mods:
                sec['rntMod'] = mods
        else:
            sec['rnt'] = 'free'
            for c in sec['choices']:
                c.pop('range', None)
    else:
        for c in sec['choices']:
            c.pop('range', None)
    if enemies:
        combat = {'enemies': enemies}
        if target:
            combat['points'] = {'n': target}
        # the sentence that grants immunity; when it names some of the enemies, only they are immune
        said = next((x for x in re.split(r'(?<=\.)\s+', whole) if re.search(r'immune to (?:Mindblast|Psi-surge|all psychic attacks)', x, re.I)), '')
        named = [e for e in enemies if re.sub(r'\s+\d+$', '', e['name']).lower() in said.lower()]
        for e in enemies:
            if named and e not in named:
                continue
            if re.search(r'immune to Mindblast[\s,(]*but not (?:to )?Psi-surge', whole):
                e['immune'] = 'mindblast'  # Psi-surge still works
            elif re.search(r'immune to Mindblast and Psi-surge(?:[\s,(]*but not (?:to )?|; only (?:the Grand Mastery of )?)Kai-surge', whole):
                e['immune'] = 'psi'  # Kai-surge still works
            elif said:
                e['immune'] = True
        cs = cs_rule(whole)
        if cs:
            n_, if_, unless_ = cs
            combat.update(csMod=n_, csNote='As the text says')
            if if_:
                combat['csIf'] = if_
            if unless_:
                combat['csUnless'] = unless_
        # a mind attack that costs Endurance every round unless he is shielded (Mindshield, or Psi-screen in a Magnakai book)
        shield = 'Psi-screen' if series == 'magnakai' else 'Mindshield'
        dr = re.search(r'[Uu]nless you (?:have|possess) the (?:Kai |Magnakai )?Discipline of ' + shield + r', (?:you must )?(?:deduct|lose) (\d+) ENDURANCE points? (?:at the (?:beginning|start|end) of |for |in )?(?:every|each) round', whole)
        if dr:
            for e in enemies:
                e['drain'] = int(dr.group(1))
        # the way out offered as such ("you may evade"), before one that only mentions evading
        evs = [c for c in sec['choices'] if c.get('evade')]
        ev = next((c for c in evs if re.search(r'\b(?:may|can|wish to|decide to|choose to) evade\b', c['text'], re.I)), evs[0] if evs else None)
        if ev:
            t = ev['text'] + ' ' + whole
            a = re.search(r'after (?:the )?(?:first )?(\w+) rounds?', t, re.I)  # "after two rounds", "After the first round"
            u = re.search(r'evade[^.]*until the (?:beginning|start) of the (second|third|fourth|fifth) round', t)
            after = 0
            if a:
                after = WORDS.get(a.group(1).lower(), int(a.group(1)) if a.group(1).isdigit() else 0)
            elif u:
                after = ['second', 'third', 'fourth', 'fifth'].index(u.group(1)) + 1
            combat['evade'] = {'after': after, 'to': ev['to']}
            if not a and re.search(r'evade[^.]*\b(?:in|during) the first round\b|only evade in the first round', t):
                combat['evade']['within'] = 1  # "in the first round of combat only"
        for e in enemies:
            low = e['name'].lower()
            e['sprite'] = next((k for k in ('kraan', 'giak', 'vordak') if k in low), 'emblem')
            if sec.get('img', {}).get('full'):
                e['art'] = sec['img']['file']
        sec['combat'] = combat
    if re.search(r'must (?:also )?(?:now )?eat a Meal|[Uu]nless you eat a Meal now', whole):
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

# "The Story So Far", shown before section 1. Its last paragraph only points on to the game rules.
intro = []
tssf = os.path.join(src, 'tssf.htm')
if os.path.exists(tssf):
    page = open(tssf, encoding='utf-8', errors='replace').read()
    front = page[page.find('<div class="frontmatter">'):page.find('</article')]
    intro = [plain(p) for p in re.findall(r'<p[^>]*>(.*?)</p>', front, re.S) if 'href=' not in p and plain(p)]

# an illustration's 2x WebP beside it once tools/ill_upscale.py has made it (ADR 0033); a fight's plate
# (its 'art', set above) keeps the original, so the approved fight pictures do not move
for sec in sections.values():
    big = sec.get('img', {}).get('file', '')[:-4] + '-2x.webp'
    if 'img' in sec and os.path.exists(os.path.join(src, big)):
        sec['img']['file'] = big

# the upscaled map once it is done (docs/reference/map-upscale.md), else the scan as served
map_file = 'map-4k.webp' if os.path.exists(os.path.join(src, 'map-4k.webp')) else 'map.png'
out = {'id': book, 'number': number, 'series': series, 'title': title, 'subtitle': 'Project Aon edition, imported for personal use',
       'start': '1', 'assets': f'data/projectaon/{book}/', 'map': map_file, 'bonusItem': book == '01fftd', 'intro': intro, 'sections': sections}
def write_if_changed(path, text):
    """Leave the file alone when it already holds this text: the reading copy and the item check count
    as out of date once book.js is newer (tools/book_status.py), so a re-import that changes nothing
    must not touch it. Returns whether it was written."""
    try:
        with open(path, encoding='utf-8') as f:
            if f.read() == text:
                return False
    except OSError:
        pass
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    return True


write_if_changed(os.path.join(src, 'book.js'),
                 '(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, ' + json.dumps({book: out}, ensure_ascii=False) + ');\n')

have = sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(top, '*', 'book.js')))
write_if_changed(os.path.join(top, 'index.js'), '/* written by tools/import_projectaon.py: loads every imported book */\n'
                 + ''.join(f'document.write(\'<script src="data/projectaon/{b}/book.js"><\\/script>\');\n' for b in have))

secs = sections.values()
print(f'{title} ({series}):', len(sections), 'sections;', sum('combat' in s for s in secs), 'with combat;',
      sum(s.get('rnt') == 'auto' for s in secs), 'auto random', f"({sum('rntMod' in s for s in secs)} with bonuses),",
      sum(s.get('rnt') == 'free' for s in secs), 'free random;',
      sum(any('disc' in c.get('need', {}) for c in s['choices']) for s in secs), 'with discipline gates;',
      sum(any('rank' in c.get('need', {}) for c in s['choices']) for s in secs), 'with rank gates;',
      sum(any('any' in c.get('need', {}) for c in s['choices']) for s in secs), 'with any-of gates;',
      sum(any('circle' in c.get('need', {}) for c in s['choices']) for s in secs), 'with Lore-circle gates;',
      sum('img' in s for s in secs), 'illustrated;', sum(s.get('end') == 'death' for s in secs), 'dead ends;',
      sum(s.get('end') == 'failed' for s in secs), 'failed endings;', sum('puzzle' in s for s in secs), 'puzzles;',
      sum('meal' in s for s in secs), 'forced meals;',
      len(intro), 'paragraphs of introduction' + ('' if intro else ' (none: is tssf.htm downloaded?)'))
fights = [s['combat'] for s in secs if 'combat' in s]
print('fights:', sum('csMod' in c for c in fights), 'with a COMBAT SKILL change', f"({sum('csIf' in c or 'csUnless' in c for c in fights)} on a discipline),",
      sum(any(e.get('immune') for e in c['enemies']) for c in fights), 'with a foe immune to the mind',
      f"({sum(any(e.get('immune') == 'mindblast' for e in c['enemies']) for c in fights)} to Mindblast only),",
      sum(any(e.get('drain') for e in c['enemies']) for c in fights), 'with a mind drain,', sum('evade' in c for c in fights), 'with evasion')
foes = {e['name']: e.get('art') for s in secs for e in s.get('combat', {}).get('enemies', [])}
# the rest are pictured at play time from assets/plates/plates.json, if an entry matches
library = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'plates', 'plates.json'), encoding='utf-8'))['plates']
borrowed = {n: next((p['src'] for p in library if p.get('book', book) == book and re.search(p['match'], n, re.I)), None) for n, a in foes.items() if not a}
bare = sorted(n for n, src in borrowed.items() if not src)
print(len(foes), 'kinds of enemy:', sum(1 for a in foes.values() if a), 'with a plate from the book,', len(borrowed) - len(bare), 'from the plate library,',
      len(bare), 'with none' + (': ' + ', '.join(bare) + ' (add them to assets/plates/plates.json)' if bare else ''))
broken = [(k, c['to']) for k, s in sections.items() for c in s['choices'] if c['to'] not in sections]
print('broken links:', broken, '| no way on and no ending:', [k for k, s in sections.items() if not s['choices'] and 'end' not in s and 'puzzle' not in s])
print('books loaded by index.js:', have)

# the same figures as JSON, counts and ids only, for tools/reimport_all.py to compare one import with the next
report = {
    'book': book, 'sections': len(sections), 'fights': len(fights), 'auto_random': sum(s.get('rnt') == 'auto' for s in secs),
    'free_random': sum(s.get('rnt') == 'free' for s in secs), 'random_bonuses': sum('rntMod' in s for s in secs),
    'gates': {k: sum(any(k in c.get('need', {}) for c in s['choices']) for s in secs) for k in ('disc', 'rank', 'any', 'circle')},
    'illustrated': sum('img' in s for s in secs), 'dead_ends': sum(s.get('end') == 'death' for s in secs),
    'failed_endings': sum(s.get('end') == 'failed' for s in secs), 'puzzles': sum('puzzle' in s for s in secs),
    'forced_meals': sum('meal' in s for s in secs), 'intro_paragraphs': len(intro),
    'fight_cs_changes': sum('csMod' in c for c in fights), 'fight_evasion': sum('evade' in c for c in fights),
    'enemy_kinds': len(foes), 'with_book_plate': sum(1 for a in foes.values() if a),
    'from_library': len(borrowed) - len(bare), 'with_none': len(bare),
    'broken_links': [list(x) for x in broken],
    'no_way_on': [k for k, s in sections.items() if not s['choices'] and 'end' not in s and 'puzzle' not in s],
    'map': map_file,
}
with open(os.path.join(src, 'import-report.json'), 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=1)
