"""Find the names the OCR draft missed, by asking Claude Sonnet to look at the map (ADR 0004).

    uv run --project tools python tools/map_missed.py <map-2k.png> <maps/<book>/labels.json>

The map is cut into a few overlapping tiles with every listed label's box outlined in red and a
grid ruled every 100 px. One headless `claude -p` call (Sonnet, a one-line system prompt, no tools,
no project files) gets all the tiles and answers with the lettering it sees outside the red boxes:
its wording and a rough box in the tile's pixels. Each box is tightened to the ink there and added
to the list with `"found": "claude"`, for the owner to confirm in the map editor; one lying over
half inside a listed box is dropped. The list is copied to labels.json.bak first. Needs `claude`
on PATH and signed in (`claude auth login`). Prints counts and the tokens used, never wordings.
"""
import base64
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

from map_erase import LabelInk

TILE, OVERLAP = 1024, 128  # px: under Claude's ~1.15 megapixel cap, so its pixels are the tile's
MODEL = 'sonnet'
SYSTEM = 'You read the lettering on old printed maps and answer with JSON only.'
ASK = """These {n} images are overlapping tiles of one old printed fantasy map, numbered in order. Grey ticks and numbers along the top and left edges are tile pixels, every 100.
Red boxes outline lettering that is already listed: ignore everything inside them.
List every other piece of lettering on the map: place names, regions, seas, rivers, forests, hand-lettered or printed, at any angle, one entry per name (a name printed over two lines is one entry).
Do not list trees, mountains, hatching, the frame or other drawing, and do not guess at lettering you cannot see.
Answer only with a JSON list: [{{"tile": 1, "text": "THE WORDING AS PRINTED", "box": [x0, y0, x1, y1]}}], the box tight round the lettering in that tile's pixels. [] if there is none."""


def tiles(w, h, size=TILE, overlap=OVERLAP):
    """Tile rectangles [x0, y0, x1, y1] covering a w x h map, each at most size square."""
    def starts(n):
        if n <= size:
            return [0]
        k = int(np.ceil((n - overlap) / (size - overlap)))
        step = (n - size) / (k - 1)
        return [round(i * step) for i in range(k)]
    return [[x, y, min(x + size, w), min(y + size, h)] for y in starts(h) for x in starts(w)]


def draw_tile(im, rect, labels):
    """The tile's picture: listed boxes outlined in red, a 100 px grid of ticks along two edges."""
    x0, y0, x1, y1 = rect
    t = im[y0:y1, x0:x1].copy()
    for lab in labels:
        b = lab['box']
        cv2.rectangle(t, (b[0] - x0, b[1] - y0), (b[2] - x0, b[3] - y0), (0, 0, 230), 2)
    for v in range(100, max(t.shape[:2]), 100):
        cv2.line(t, (v, 0), (v, 10), (128, 128, 128), 1)
        cv2.putText(t, str(v), (v + 2, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (128, 128, 128), 1)
        cv2.line(t, (0, v), (10, v), (128, 128, 128), 1)
        cv2.putText(t, str(v), (12, v + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (128, 128, 128), 1)
    return t


def parse(reply):
    """The JSON list in Claude's answer, or [] when there is none."""
    m = re.search(r'\[.*\]', reply, re.S)
    if not m:
        return []
    try:
        found = json.loads(m.group(0))
    except json.JSONDecodeError:
        return []
    return [f for f in found if isinstance(f, dict) and isinstance(f.get('text'), str) and f['text'].strip()
            and isinstance(f.get('box'), list) and len(f['box']) == 4 and isinstance(f.get('tile'), int)]


def fit(box, ink, grow=0.25):
    """<box> tightened to the label ink there: the ink shapes lying mostly inside it, grown by
    <grow> (Claude's boxes are rough). The box itself where there are none."""
    x0, y0, x1, y1 = box
    gx, gy = (x1 - x0) * grow, (y1 - y0) * grow
    X0, Y0 = max(int(x0 - gx), 0), max(int(y0 - gy), 0)
    X1, Y1 = min(int(x1 + gx), ink.cc.shape[1]), min(int(y1 + gy), ink.cc.shape[0])
    cc = ink.cc[Y0:Y1, X0:X1]
    ids, n = np.unique(cc[cc > 0], return_counts=True)
    keep = ids[n > 0.5 * ink.total[ids]]
    if not len(keep):
        return [int(v) for v in box]
    ys, xs = np.nonzero(np.isin(cc, keep))
    return [int(X0 + xs.min()) - 3, int(Y0 + ys.min()) - 3, int(X0 + xs.max()) + 3, int(Y0 + ys.max()) + 3]


def inside(a, b):
    """The share of box a lying inside box b."""
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    return ix * iy / max((a[2] - a[0]) * (a[3] - a[1]), 1)


def place(found, rects, labels, ink):
    """Claude's finds as new labels in map px: fitted to the ink, one per place (a name seen on
    two tiles), none lying over half inside a listed box."""
    new = []
    for f in found:
        if not 1 <= f['tile'] <= len(rects):
            continue
        r = rects[f['tile'] - 1]
        b = [min(f['box'][0], f['box'][2]) + r[0], min(f['box'][1], f['box'][3]) + r[1],
             max(f['box'][0], f['box'][2]) + r[0], max(f['box'][1], f['box'][3]) + r[1]]
        b = fit(b, ink)
        if any(inside(b, lab['box']) > 0.5 or inside(lab['box'], b) > 0.5 for lab in labels + new):
            continue
        new.append({'text': f['text'].strip().upper(), 'box': b, 'retype': True, 'found': 'claude'})
    return new


def ask(pictures, run=subprocess.run):
    """Claude's answer and its usage, from one headless call with every tile attached."""
    content = [{'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/png',
                                            'data': base64.b64encode(cv2.imencode('.png', p)[1].tobytes()).decode()}}
               for p in pictures]
    content.append({'type': 'text', 'text': ASK.format(n=len(pictures))})
    msg = json.dumps({'type': 'user', 'message': {'role': 'user', 'content': content}})
    # outside the project, so no CLAUDE.md or project settings ride along; no tools, no saved session
    cwd = tempfile.gettempdir()
    r = run([shutil.which('claude') or 'claude', '-p', '--model', MODEL, '--input-format', 'stream-json',
             '--output-format', 'stream-json', '--verbose', '--system-prompt', SYSTEM, '--tools', '',
             '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence'],
            input=msg + '\n', capture_output=True, text=True, encoding='utf-8', cwd=cwd)
    for line in r.stdout.splitlines():
        try:
            j = json.loads(line)
        except json.JSONDecodeError:
            continue
        if j.get('type') == 'result':
            if j.get('is_error'):
                sys.exit(f"claude: {j.get('result', '')[:200]}")
            return j.get('result', ''), j.get('usage', {})
    sys.exit(f'claude gave no answer (exit {r.returncode}): {(r.stderr or r.stdout)[-300:]}'
             ' -- is it on PATH and signed in (claude auth login)?')


def main():
    img, lab_file = Path(sys.argv[1]), Path(sys.argv[2])
    im = cv2.imdecode(np.fromfile(str(img), np.uint8), cv2.IMREAD_COLOR)
    labels = json.loads(lab_file.read_text(encoding='utf-8'))
    rects = tiles(im.shape[1], im.shape[0])
    reply, usage = ask([draw_tile(im, r, labels) for r in rects])
    found = parse(reply)
    new = place(found, rects, labels, LabelInk(im))
    if new:
        shutil.copyfile(lab_file, str(lab_file) + '.bak')
        lab_file.write_text(json.dumps(labels + new, indent=1), encoding='utf-8')
    tokens = sum(usage.get(k, 0) for k in ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'))
    print(f'{len(rects)} tiles; Claude listed {len(found)}, {len(new)} added as new labels (marked found by Claude, '
          f'to check in the editor); {tokens} tokens')


if __name__ == '__main__':
    main()
