"""Upscale a book's illustrations 2x, each saved as WebP beside its original (ADR 0031).

Run (from the project root):
  uv run --project tools python tools/ill_upscale.py <book> [--force]
  uv run --project tools python tools/ill_upscale.py --fights <book>

<book> is a code (02fotw) or a number (2). Every ill*.png and small*.png in data/projectaon/<code>/
goes through realesrgan-x4plus (tools/realesrgan/, git-ignored) once, is reduced LANCZOS to exactly
twice its size and saved as <name>-2x.webp, lossy at quality 80 (Book 2's ill1: 64 KB as PNG, about
200 KB at 2x; quality 90 looked no different). One already newer than its original is skipped
unless --force. The importer names the -2x.webp in book.js once it is there (a re-import).
Prints file names and sizes only.

--fights does the same for every picture the book's fights can show (checklist step 7's Upscale):
what plates.json and the book pick for each enemy now, and the pictures approved for its fights. Each
copy goes beside its picture, wherever that is (data/, art/, assets/plates/), and the pictures with a
copy are listed in assets/plates/upscaled/<code>.json, from which the player and the picture sheet show
the copy. plates.json and the approved pictures keep naming the originals; a crop, in fractions, fits both.
"""
import os
import re
import subprocess
import sys
import tempfile
import time

from book_status import find, load_book

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'projectaon')
HERE = os.path.join(ROOT, 'tools', 'realesrgan')
QUALITY = 80
ILL = re.compile(r'(?:ill|small)\d+\.png')


def upscale(src, out, tmp):
    """src at 4x by Real-ESRGAN, then LANCZOS to exactly 2x, as WebP at out."""
    from PIL import Image  # here, not above: serve.py imports this module for listing() without Pillow
    x4 = os.path.join(tmp, 'x4.png')
    subprocess.run([os.path.join(HERE, 'realesrgan-ncnn-vulkan.exe'), '-i', src, '-o', x4,
                    '-n', 'realesrgan-x4plus', '-m', os.path.join(HERE, 'models')], check=True, capture_output=True)
    w, h = Image.open(src).size
    im = Image.open(x4)
    if im.mode in ('RGBA', 'LA', 'P'):  # a transparent ground is paper: white under it
        im = im.convert('RGBA')
        ground = Image.new('RGBA', im.size, 'white')
        ground.alpha_composite(im)
        im = ground
    im.convert('RGB').resize((w * 2, h * 2), Image.LANCZOS).save(out + '.part', 'WEBP', quality=QUALITY, method=6)
    os.replace(out + '.part', out)


def names(d):
    """The book's illustrations in d, ill* then small*, by number."""
    return sorted((f for f in os.listdir(d) if ILL.fullmatch(f)), key=lambda f: (f[0], int(re.sub(r'\D', '', f))))


def listing(book):
    """For the dashboard's illustration sheet: [{name, bytes, big, bigBytes, sections}] (big: the
    -2x.webp beside it, or None; sections: those book.js shows it in, by either name), or None if the
    book is not downloaded. File names, sizes and section ids only."""
    hit = find(book)
    d = hit and os.path.join(DATA, hit[0])
    if not d or not os.path.isdir(d):
        return None
    shown = {}
    try:
        secs = load_book(hit[0], os.path.join(d, 'book.js'))['sections']
    except (ValueError, KeyError):
        secs = {}
    for sid, s in secs.items():
        if s.get('img'):
            shown.setdefault(s['img']['file'].replace('-2x.webp', '.png'), []).append(sid)
    out = []
    for f in names(d):
        big = f[:-4] + '-2x.webp'
        has = os.path.isfile(os.path.join(d, big))
        out.append({'name': f, 'bytes': os.path.getsize(os.path.join(d, f)), 'big': big if has else None,
                    'bigBytes': os.path.getsize(os.path.join(d, big)) if has else None,
                    'sections': sorted(shown.get(f, []), key=lambda s: int(s) if s.isdigit() else 0)})
    return out


def upscale_one(rel):
    """One picture, rel from the project root, to <stem>-2x.webp beside it. Returns the copy's rel, or
    None if rel is not a picture that can be upscaled (missing, outside assets/ art/ data/, an upscale)."""
    parts = rel.replace('\\', '/').split('/')
    stem, ext = os.path.splitext(parts[-1])
    if '..' in parts or parts[0] not in ('assets', 'art', 'data') or ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp') or stem.endswith('-2x'):
        return None
    src = os.path.join(ROOT, *parts)
    if not os.path.isfile(src):
        return None
    out_rel = '/'.join(parts[:-1] + [stem + '-2x.webp'])
    out = os.path.join(ROOT, *out_rel.split('/'))
    if not (os.path.isfile(out) and os.path.getmtime(out) >= os.path.getmtime(src)):
        with tempfile.TemporaryDirectory() as tmp:
            upscale(src, out, tmp)
    return out_rel


def fight_srcs(code):
    """Every picture the book's fights can show: what each enemy gets now (plates_file.current, as the
    player picks it) and each approved picture (assets/plates/approved/<code>.json), sorted."""
    import json
    import plates_file
    book = load_book(code, os.path.join(DATA, code, 'book.js'))
    plates = plates_file.load_plates()['plates']
    srcs = {plates_file.current(plates, code, book, n)[0] for n in plates_file.enemy_names(book)}
    try:
        with open(os.path.join(ROOT, 'assets', 'plates', 'approved', code + '.json'), encoding='utf-8') as f:
            srcs |= {(pin.get('plate') or {}).get('src') for pin in json.load(f).get('pins', {}).values() if pin}
    except (OSError, ValueError):
        pass
    return sorted(s for s in srcs if s)


def fights(code):
    """Upscale the book's fight pictures and list those with a copy in assets/plates/upscaled/<code>.json."""
    import json
    srcs = fight_srcs(code)
    made = []
    for src in srcs:
        t = time.time()
        out = upscale_one(src)
        print(f'{src} -> {out}, {time.time() - t:.1f} s' if out else f'{src}: not a picture that can be upscaled', flush=True)
        if out:
            made.append(src)
    d = os.path.join(ROOT, 'assets', 'plates', 'upscaled')
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, code + '.part'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps({'_readme': 'The fight pictures of this book with a Real-ESRGAN 2x copy beside them, '
                            '<name>-2x.webp, which the player and the picture sheet show instead (platepick.js '
                            'upscaledSrc). Written by tools/ill_upscale.py --fights; see ADR 0031.', 'srcs': made}, indent=1) + '\n')
    os.replace(os.path.join(d, code + '.part'), os.path.join(d, code + '.json'))
    print(f'{code}: {len(made)} fight pictures upscaled' + (f', {len(srcs) - len(made)} could not be' if len(made) < len(srcs) else '')
          + f'; listed in assets/plates/upscaled/{code}.json')
    return 0


def main(argv):
    if argv[:1] == ['--fights'] and len(argv) == 2:
        hit = find(argv[1])
        if not hit or not os.path.isfile(os.path.join(DATA, hit[0], 'book.js')):
            print(f'{argv[1]}: not an imported book')
            return 1
        return fights(hit[0])
    force = '--force' in argv
    args = [a for a in argv if a != '--force']
    hit = find(args[0]) if len(args) == 1 else None
    if not hit:
        print(__doc__ if len(args) != 1 else f'unknown book {args[0]}')
        return 1
    code = hit[0]
    d = os.path.join(DATA, code)
    if not os.path.isdir(d):
        print(f'{code}: not downloaded')
        return 1
    done = skipped = 0
    before = after = 0
    with tempfile.TemporaryDirectory() as tmp:
        for f in names(d):
            src, out = os.path.join(d, f), os.path.join(d, f[:-4] + '-2x.webp')
            if not force and os.path.isfile(out) and os.path.getmtime(out) >= os.path.getmtime(src):
                skipped += 1
                continue
            t = time.time()
            upscale(src, out, tmp)
            done += 1
            before, after = before + os.path.getsize(src), after + os.path.getsize(out)
            print(f'{f} -> {os.path.basename(out)}: {os.path.getsize(out) // 1024} KB, {time.time() - t:.1f} s', flush=True)
    print(f'{code}: {done} upscaled ({before // 1024} KB of originals -> {after // 1024} KB), {skipped} already done, {len(names(d))} in all')
    if done:
        print('Re-import the book to show them in the player.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
