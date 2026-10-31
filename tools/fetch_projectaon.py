"""Download a Project Aon book (section pages, its rules pages, illustrations) for personal use.

    python tools/fetch_projectaon.py 01fftd
    python tools/fetch_projectaon.py 01fftd --rules    # only the rules pages, for a book already here

Files land in data/projectaon/<book>/. Project Aon's licence forbids redistributing
them, so that folder must stay on this machine (it is git-ignored).
"""
import io, os, re, sys, time, urllib.request, zipfile

book = next((a for a in sys.argv[1:] if not a.startswith('-')), '01fftd')
# the book's own rules, read for docs/reference/rules-books.md: those of its pages that a book has
RULES = ['gamerulz.htm', 'discplnz.htm', 'equipmnt.htm', 'cmbtrulz.htm', 'levels.htm', 'lorecrcl.htm', 'imprvdsc.htm',
         'kaiwisdm.htm', 'crsumary.htm', 'crtable.htm', 'random.htm', 'errata.htm', 'footnotz.htm', 'kainame.htm']
base = f'https://www.projectaon.org/en/xhtml/lw/{book}/'
out = os.path.join(os.path.dirname(__file__), '..', 'data', 'projectaon', book)
os.makedirs(out, exist_ok=True)

def fetch(name, quiet=False):
    req = urllib.request.Request(base + name, headers={'User-Agent': 'Mozilla/5.0 (personal reader)'})
    for attempt in range(3):
        try:
            data = urllib.request.urlopen(req, timeout=30).read()
            time.sleep(0.15)
            return data
        except Exception as e:
            err = e
            time.sleep(1.5)
    if not quiet:
        print('FAILED', name, err)
    return b''

def open_zip():
    """The book's own zip beside its pages, far quicker than asking for each: its files by name, the
    folder's only, or None if it has no zip or none holding the book. Only what get() asks for is kept."""
    try:
        z = zipfile.ZipFile(io.BytesIO(fetch(f'{book}.zip', quiet=True)))
    except zipfile.BadZipFile:
        return None
    at = f'en/xhtml/lw/{book}/'
    files = {i.filename[len(at):]: i for i in z.infolist() if i.filename.startswith(at) and '/' not in i.filename[len(at):]}
    if 'sect1.htm' not in files:
        return None
    print(f'from {book}.zip')
    return lambda name: z.read(files[name]) if name in files else None

book_zip = False  # not asked for yet: a book already here needs none

def get(name, quiet=False):
    global book_zip
    path = os.path.join(out, name)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return open(path, 'rb').read()
    if book_zip is False:
        book_zip = open_zip()
    data = book_zip(name) if book_zip else None
    # the zip settles what is only asked after (a section past the last, a rules page the book lacks)
    if data is None and book_zip and quiet:
        return b''
    data = fetch(name, quiet) if data is None else data
    if data:
        open(path, 'wb').write(data)
    return data

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
