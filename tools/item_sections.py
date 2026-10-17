"""Find the sections of a book that may give, take or need items, and write them out to read.

    python tools/item_sections.py 01fftd

Step 2 of docs/reference/items.md. Scans the downloaded section pages for item, gold, Meal and
Endurance wording, in the text or in the choices (where the gates are), and writes those sections,
from the reading copy and with their choice lines, to data/projectaon/<book>/items-reading.txt
(git-ignored: it is the book's text). Prints the count and the section numbers only. Run tools/reading_copy.py first.

The scan casts wide on purpose: most hits turn out to be scenery. It is a reading list, not a
judgement; what each section does is decided by reading it.
"""
import glob, html, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
KEY = re.compile(r'Action Chart|Special Item|Backpack|Gold Crown|Crowns|Meal|weapon|ENDURANCE|COMBAT SKILL|erase|'
                 r'lose your|you lose|you find|you take|pick up|take the|keep the|keep this|mark it|stolen|'
                 r'Laumspur|Potion|Sword|Dagger|Mace|Axe|Spear|Quarterstaff|Warhammer|Broadsword|Helmet|Chainmail|'
                 r'Map|Key|Pendant|Gem|Scroll|Bow|Arrow|Quiver|Rope|Torch|'
                 # general signs (ADR 0036): a gate on anything carried, not a discipline's or a rank's; gold however
                 # it is named; food; a fight's rule for some rounds
                 r'\bif you (?:still |already |now )?(?:do not |don\'t )?(?:have|possess|carry|hold|own|are (?:still |already |now )?(?:carrying|holding|wearing))'
                 r'(?: not)?\s+(?:a|an|the|some|any|no|one|both|either|this|these|that|those|it|them)\b'
                 r'(?!\s+(?:(?:of )?(?:these|those) )?(?:Kai |Magnakai |Grand Master )?(?:Disciplines?|skills?|abilit(?:y|ies)|rank|Lore-circle|Mastery)\b)|'
                 r'\bif you (?:wish|want|decide|choose) to (?:use|give|offer|pay|buy|sell|trade|swap|exchange|show|drink|eat|throw|wear)\b|'
                 r'\bgold\b|\beat\b|\bfood\b|'
                 r'\brounds? of combat\b|\b(?:first|second|third|next|last|two|three|four|five|\d+) (?:combat )?rounds?\b', re.I)

book = sys.argv[1] if len(sys.argv) > 1 else '01fftd'
src = os.path.join(ROOT, 'data', 'projectaon', book)
hits, choices = [], {}
for f in glob.glob(os.path.join(src, 'sect*.htm')):
    t = open(f, encoding='utf-8', errors='replace').read()
    body = t[t.find('<article'):t.find('</article')]
    n = int(re.search(r'sect(\d+)', f).group(1))
    paras = [(m.group(1), html.unescape(re.sub(r'<[^>]+>', '', m.group(2)))) for m in re.finditer(r'<p(?: class="(\w+)")?>(.*?)</p>', body, re.S)]
    # the gates ("If you have a Golden Key...") are in the choice lines, which the reading copy leaves out
    choices[n] = [p for c, p in paras if c == 'choice']
    if any(KEY.search(p) for c, p in paras if c != 'combat'):
        hits.append(n)
hits.sort()

reading = os.path.join(src, 'reading.txt')
if not os.path.exists(reading):
    sys.exit(f'no {reading}: run python tools/reading_copy.py {book} first')
parts = {int(m.group(1)): p for p in re.split(r'(?m)^(?=#\d+ )', open(reading, encoding='utf-8').read()) if (m := re.match(r'#(\d+) ', p))}
out = os.path.join(src, 'items-reading.txt')
with open(out, 'w', encoding='utf-8') as f:
    f.write(''.join(parts[n].rstrip('\n') + '\n' + ''.join(f'  > {c}\n' for c in choices.get(n, [])) + '\n' for n in hits if n in parts))
print(f'{len(hits)} sections to read, written to {out}:')
print(' '.join(map(str, hits)))
