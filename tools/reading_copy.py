"""Write an imported book out as plain text to read through when placing it on the map.

    python tools/reading_copy.py 02fotw

Writes data/projectaon/<book>/reading.txt (git-ignored, like the rest of the book): each section
as `#id -> where it leads [fight: enemy]`, then its text. Step 2 of docs/reference/map-places.md.
It holds the book's text, so it stays in data/projectaon/ and is never quoted elsewhere.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_places import ROOT, outs

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
