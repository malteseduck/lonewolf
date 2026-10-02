"""Download a Project Aon book (section pages, its rules pages, illustrations) for personal use.

    python tools/fetch_projectaon.py 01fftd
    python tools/fetch_projectaon.py 01fftd --rules    # only the rules pages, for a book already here

Files land in data/projectaon/<book>/. Project Aon's licence forbids redistributing
them, so that folder must stay on this machine (it is git-ignored).
"""
import os, re, sys, time, urllib.request

book = next((a for a in sys.argv[1:] if not a.startswith('-')), '01fftd')
# the book's own rules, read for docs/reference/rules-books.md: those of its pages that a book has
RULES = ['gamerulz.htm', 'discplnz.htm', 'equipmnt.htm', 'cmbtrulz.htm', 'levels.htm', 'lorecrcl.htm', 'imprvdsc.htm',
         'kaiwisdm.htm', 'crsumary.htm', 'crtable.htm', 'random.htm', 'errata.htm', 'footnotz.htm']
base = f'https://www.projectaon.org/en/xhtml/lw/{book}/'
out = os.path.join(os.path.dirname(__file__), '..', 'data', 'projectaon', book)
os.makedirs(out, exist_ok=True)

def get(name, quiet=False):
    path = os.path.join(out, name)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return open(path, 'rb').read()
    req = urllib.request.Request(base + name, headers={'User-Agent': 'Mozilla/5.0 (personal reader)'})
    for attempt in range(3):
        try:
            data = urllib.request.urlopen(req, timeout=30).read()
            open(path, 'wb').write(data)
            time.sleep(0.15)
            return data
        except Exception as e:
            err = e
            time.sleep(1.5)
    if not quiet:
        print('FAILED', name, err)
    return b''

if '--rules' in sys.argv:
    got = [p for p in RULES if get(p, quiet=True)]
    print(f'{book}: {len(got)} rules pages:', ' '.join(got))
    sys.exit(0)
images = {'map.png'}
pages = ['license.htm', 'tssf.htm', 'map.htm'] + RULES
for n in range(1, 500):  # stop at the first section that is not there
    if not get(f'sect{n}.htm', quiet=True):
        break
    pages.append(f'sect{n}.htm')
for page in pages:
    html = get(page, quiet=page in RULES).decode('utf-8', 'replace')  # a Kai book has no Lore-circles page
    body = html[html.find('<article'):html.find('</article')]
    images.update(re.findall(r'<img[^>]+src="([^"]+\.(?:png|jpg|gif))"', body))
for img in sorted(images):
    get(img)
files = os.listdir(out)
print(len([f for f in files if f.startswith('sect')]), 'sections,', len([f for f in files if f.endswith(('.png', '.jpg', '.gif'))]), 'images,',
      round(sum(os.path.getsize(os.path.join(out, f)) for f in files) / 1e6, 1), 'MB')
