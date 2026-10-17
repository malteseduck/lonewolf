"""Step 3's leftover scan (ADR 0036): the sections of an imported book whose text still looks like a
choice gate, a Random Number draw or a combat rule that the importer left as text, by id.

    python tools/phrasings_scan.py <code>          # prints the figures and ids
    python tools/phrasings_scan.py <code> --json   # also writes data/projectaon/<code>/phrasings.json

It runs the importer's own readers (gate, span, number_rules, cs_rule, condition, loaded from
tools/import_projectaon.py without running its import) over the text book.js holds, which is the
text they saw, so it can say why each one was left. Each leftover is one of two lists:

- **look**: it names a discipline, rank or Lore-circle (what the importer reads) or has the shape of
  a line it reads, yet was not read. Each is for the agent or the owner to judge against the page:
  a phrasing the importer could learn, or one it rightly leaves.
- **design**: left on purpose (importer.md, "What it does not read"): a negative gate, a gate on an
  item or gold, a draw that counts gold or Endurance, a bonus from an item or weapon, a COMBAT SKILL
  change for some rounds or from a weapon. These are the item table's (step 5) or the player's.

The step is the owner's mark once every "look" has been judged (none left, or each one a phrasing
rightly left: say which in the report). Counts and section ids only, never the books' text.
"""
import ast
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'projectaon')
IMPORTER = os.path.join(ROOT, 'tools', 'import_projectaon.py')

# what each kind of leftover means, in the order they are printed
KINDS = {
    'gate': 'a choice gated on a discipline, rank or Lore-circle, left open',
    'gate-negative': 'a gate on not having something (left open by design)',
    'gate-item': 'a gate on an item, gold or anything else (the item table\'s)',
    'rn-unlinked': 'speaks of the Random Number Table but has no draw',
    'rn-ranges': 'a draw whose ranges do not cover each total exactly once',
    'rn-choice': 'a draw with a choice that is neither a range nor taken before drawing',
    'rn-bonus': 'a draw whose bonus names a discipline, rank, Lore-circle or his ENDURANCE, not read',
    'rn-other': 'a draw changed by an item, weapon, wound or "0 = 10" (the item table\'s)',
    'rn-counts': 'a draw with no ranges: the number counts gold, Endurance or a game (by design)',
    'combat-line': 'an enemy\'s COMBAT SKILL and ENDURANCE line not read as a fight',
    'cs': 'a COMBAT SKILL change on a discipline, rank or Lore-circle, not read',
    'cs-other': 'a COMBAT SKILL change for some rounds, from a weapon or item, or one of two (by design)',
    'evade': 'speaks of evading in a fight with no evasion read',
    'immune': 'speaks of immunity in a fight with no immune foe',
    'drain': 'speaks of a mind attack every round with no drain read',
}
# a discipline tied to a weapon or item he must carry: the item table's, like any item
ITEMISH = re.compile(r'\b(?:carrying|carry|wield\w*)\b|\b(?:Weaponmastery|Weaponskill)\s*(?:\(|with\b|in\b)|\bwith (?:a |the )?Bow\b|\bGold\b')
# his Endurance: the importer reads it in a draw's bonus, not in a gate or a COMBAT SKILL change
ENDURANCE = re.compile(r'\bENDURANCE\b')
# evasion offered as a way out, not a dive "to evade its heat" nor "too late to evade"
OFFERED = re.compile(r'\b(?:may|can|could|wish to|decide to|choose to) evade\b|\bevade (?:the |this )?(?:combat|fight)\b|\bevasion\b', re.I)
LOOK = ('gate', 'rn-unlinked', 'rn-ranges', 'rn-choice', 'rn-bonus', 'combat-line', 'cs', 'evade', 'immune', 'drain')


def importer(series):
    """The importer's readers and tables, from its source: its constants, imports and functions only,
    so nothing is imported or written. `series` is the module global its readers consult."""
    tree = ast.parse(open(IMPORTER, encoding='utf-8').read())
    keep = [n for n in tree.body if isinstance(n, (ast.Import, ast.ImportFrom, ast.FunctionDef))
            or (isinstance(n, ast.Assign) and all(isinstance(t, ast.Name) and t.id.isupper() for t in n.targets))]
    ns = {'series': series}
    exec(compile(ast.Module(body=keep, type_ignores=[]), IMPORTER, 'exec'), ns)
    return ns


def load_book(code, path=None):
    js = open(path or os.path.join(DATA, code, 'book.js'), encoding='utf-8').read()
    return json.loads(js[js.index('|| {}, ') + 7:js.rindex(');')])[code]


def scan(book):
    """{kind: [section ids]} of what the importer left as text in this book."""
    imp = importer(book.get('series', 'kai'))
    # a word the importer's conditions are made of: a discipline, a rank, a Lore-circle
    names = sorted(list(imp['DISC']) + list(imp['RANKS']), key=len, reverse=True)
    vocab = re.compile(r'\b(?:%s)\b|\bDisciplines?\b|\brank\b|Lore-circle|\bMastery of\b' % '|'.join(re.escape(n) for n in names), re.I)
    out = {k: [] for k in KINDS}
    for sid, sec in book['sections'].items():
        whole = ' '.join(sec['text'])
        found = set()
        # gates: "If you have / possess ..." up to the first comma or "turn to", not read
        for c in sec['choices']:
            head = re.split(r',|\s+turn to\b', c['text'], maxsplit=1)[0]
            if 'need' in c or c.get('evade') or not re.match(r"If you (?:do not |don't )?(?:have|possess|are carrying|carry|reached|attained|completed|wish to use)\b", head):
                continue
            if re.search(r"\b(?:not|neither|nor|yet to)\b|n't\b", head, re.I):
                found.add('gate-negative')
            elif sec.get('rnt') and re.search(r'\b(?:number|total|score|pick)', c['text']):
                continue  # a draw's range on a condition: the draw's to judge
            elif vocab.search(head) and not ITEMISH.search(head) and not ENDURANCE.search(head):
                found.add('gate')
            else:
                found.add('gate-item')
        # the Random Number
        if not sec.get('rnt'):
            if re.search(r'Random Number Table|pick a number', whole + ' '.join(c['text'] for c in sec['choices']), re.I):
                found.add('rn-unlinked')
        elif sec['rnt'] == 'free':
            found.add(free_reason(imp, sec, whole, vocab))
        # combat
        for p in sec['text']:
            if re.search(r'COMBAT\s*SKILL\s*\d+\s*ENDURANCE\s*(?:\([^)]*\)\s*)?\d+', p):
                found.add('combat-line')
        fight = sec.get('combat')
        if fight:
            if 'csMod' not in fight:
                cs = [s for s in imp['sentences'](whole) if 'COMBAT SKILL' in s and re.search(r'(?:to|from) your COMBAT SKILL|your COMBAT SKILL by', s)
                      and re.search(r'\b(?:add|increase|deduct|subtract|reduce)\b\D{0,40}\d', s, re.I)]
                if cs:
                    plain = len(cs) == 1 and not re.search(r'\bround|instead of|\bpower\b|weapon|\bwield', cs[0])
                    found.add('cs' if plain and vocab.search(cs[0]) and not ITEMISH.search(cs[0]) and not ENDURANCE.search(cs[0]) else 'cs-other')
            # a way out offered, not "you cannot evade" nor "even when attempting to evade" (a choice after the fight)
            said = [s for s in imp['sentences'](whole + ' ' + ' '.join(c['text'] for c in sec['choices'])) if re.search(r'\bevade\b|\bevasion\b', s, re.I)]
            if 'evade' not in fight and any(OFFERED.search(s) and not re.search(r"\b(?:not|cannot|unable|no|impossible|too late)\b|n't\b|\beven (?:when|if)\b", s, re.I) for s in said):
                found.add('evade')
            if re.search(r'\bimmune to\b', whole, re.I) and not any(e.get('immune') for e in fight['enemies']):
                found.add('immune')
            if re.search(r'(?:Mindshield|Psi-screen|Kai-screen)[^.]*ENDURANCE[^.]*\b(?:every|each) round', whole) and not any(e.get('drain') for e in fight['enemies']):
                found.add('drain')
        for k in found:
            out[k].append(sid)
    for k in out:
        out[k].sort(key=int)
    return out


def free_reason(imp, sec, whole, vocab):
    """Why a draw was left free, as the importer decides it (import_projectaon.py, the 'random.htm' branch)."""
    ranges = [imp['span'](c['text']) for c in sec['choices']]
    if not any(ranges):
        return 'rn-counts'
    mods = imp['number_rules'](whole)
    if mods is None:
        # the first sentence that changes the number and is not read: on a discipline, or on anything else
        for s in imp['sentences'](whole):
            if re.search(r'\b(?:add|deduct|subtract)\b', s, re.I) and imp['number_rules'](s) is None:
                return 'rn-bonus' if (vocab.search(s) or ENDURANCE.search(s)) and not ITEMISH.search(s) and not re.search(r'\b(?:Bow|weapon)\b', s) else 'rn-other'
        return 'rn-other'
    before = all(r or (re.match(r'If\b[^,]{0,30}?\byou (?:have|possess|are carrying|wish to use)\b', c['text'])
                       and not re.search(r'\b(?:number|total|score|pick)', c['text'])) for c, r in zip(sec['choices'], ranges))
    if not before:
        return 'rn-choice'
    return 'rn-ranges'


def report(code, out):
    look = sorted({int(s) for k in LOOK for s in out[k]})
    lines = [f"{code}: {len(look)} section{'s' * (len(look) != 1)} to look at" + (f" ({', '.join(map(str, look))})" if look else '')]
    for k, what in KINDS.items():
        if out[k]:
            ids = out[k] if k in LOOK else out[k][:12] + (['...'] if len(out[k]) > 12 else [])
            lines.append(f"  {'look' if k in LOOK else 'design':6} {k:13} {len(out[k]):3}  {what}: {', '.join(ids)}")
    return '\n'.join(lines)


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    if not args:
        print(__doc__)
        return 2
    code = args[0]
    try:
        book = load_book(code)
    except OSError:
        print(f'{code}: no book.js (import it first)')
        return 1
    out = scan(book)
    print(report(code, out))
    if '--json' in argv:
        look = sorted({int(s) for k in LOOK for s in out[k]})
        data = {'book': code, 'look': look, 'kinds': {k: v for k, v in out.items() if v}, 'lookKinds': list(LOOK)}
        with open(os.path.join(DATA, code, 'phrasings.json'), 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=1)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
