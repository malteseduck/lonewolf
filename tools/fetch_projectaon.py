"""Download a Project Aon book (section pages + illustrations) for personal use.

    python tools/fetch_projectaon.py 01fftd

Files land in data/projectaon/<book>/. Project Aon's licence forbids redistributing
them, so that folder must stay on this machine (it is git-ignored).
"""
import os, re, sys, time, urllib.request

book = sys.argv[1] if len(sys.argv) > 1 else '01fftd'
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

images = {'map.png'}
pages = ['license.htm', 'tssf.htm', 'map.htm']
for n in range(1, 500):  # stop at the first section that is not there
    if not get(f'sect{n}.htm', quiet=True):
        break
    pages.append(f'sect{n}.htm')
for page in pages:
    html = get(page).decode('utf-8', 'replace')
    body = html[html.find('<article'):html.find('</article')]
    images.update(re.findall(r'<img[^>]+src="([^"]+\.(?:png|jpg|gif))"', body))
for img in sorted(images):
    get(img)
files = os.listdir(out)
print(len([f for f in files if f.startswith('sect')]), 'sections,', len([f for f in files if f.endswith(('.png', '.jpg', '.gif'))]), 'images,',
      round(sum(os.path.getsize(os.path.join(out, f)) for f in files) / 1e6, 1), 'MB')
