"""Fetch glyphs from game-icons.net into assets/icons/, ready to use as masks.

    python tools/fetch_icons.py lorc/key delapouite/soap

Each argument is author/name, as in https://github.com/game-icons/icons. The black square behind
the glyph and its white fill are removed, as for the rest of the set. Licence CC BY 3.0: add each
new name under its author in assets/icons/README.txt. Downloading icons for a new purpose needs
the owner's go-ahead (CLAUDE.md). To find a name, search https://game-icons.net, or try likely
names with this tool: a missing one prints "not found".
"""
import os, re, sys, urllib.error, urllib.request

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'icons')
for arg in sys.argv[1:]:
    url = f'https://raw.githubusercontent.com/game-icons/icons/master/{arg}.svg'
    try:
        svg = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'lone-wolf-personal'}), timeout=30).read().decode()
    except urllib.error.HTTPError:
        print('not found', arg)
        continue
    svg = re.sub(r'<path d="M0 0h512v512H0z"\s*/>', '', svg).replace(' fill="#fff"', '')
    name = arg.split('/')[-1]
    with open(os.path.join(OUT, name + '.svg'), 'w', encoding='utf-8') as f:
        f.write(svg)
    print('wrote', f'assets/icons/{name}.svg')
