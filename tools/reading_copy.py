"""Write an imported book out as plain text to read through when writing its item table.

    python tools/reading_copy.py 02fotw

Writes data/projectaon/<book>/reading.txt (git-ignored, like the rest of the book): each section
as `#id -> where it leads [fight: enemy]`, then its text. Step 1 of docs/reference/items.md.
It holds the book's text, so it stays in data/projectaon/ and is never quoted elsewhere.
"""
import json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def outs(sec):
    """the sections a section can lead to: its choices, random outcomes, and a fight's ways out"""
    tos = []
    for c in sec.get('choices', []):
        tos += [r[1] for r in c['random']['table']] if c.get('random') else [c['to']]
    combat = sec.get('combat', {})
    tos += [t for t in (combat.get('to'), (combat.get('evade') or {}).get('to')) if t]
    return [str(t) for t in tos]


book = sys.argv[1] if len(sys.argv) > 1 else '01fftd'
src = os.path.join(ROOT, 'data', 'projectaon', book)
js = open(os.path.join(src, 'book.js'), encoding='utf-8').read()
sections = json.loads(js[js.index('|| {}, ') + 7:js.rindex(');')])[book]['sections']
with open(os.path.join(src, 'reading.txt'), 'w', encoding='utf-8') as f:
    for k in sorted(sections, key=int):
        s = sections[k]
        fight = ', '.join(e['name'] for e in s.get('combat', {}).get('enemies', []))
        f.write(f"#{k} -> {','.join(dict.fromkeys(outs(s))) or s.get('end', '-')}{f' [fight: {fight}]' if fight else ''}\n")
        f.write('\n'.join(s.get('text', [])) + '\n\n')
print(f'wrote {os.path.join(src, "reading.txt")}: {len(sections)} sections')
