"""Split reference sheets of hand-drawn map symbols into single symbols and
make numbered contact sheets for quick viewing.

Run (from the project root):
  python -m uv run --no-project --python tools/.venv/Scripts/python.exe python tools/split_symbols.py [in_dir] [out_dir] [--merge F]

Defaults: art/reference/map-symbols -> art/reference/map-symbols/_split.
Writes <out>/<stem>/<n>.png, <out>/<stem>_sheet[N].png and <out>/index.json.
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


def read_colour(path):
    # imdecode on fromfile so non-ASCII / spaced paths work on Windows
    img = cv2.imdecode(np.fromfile(str(path), np.uint8), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError("could not decode image")
    if img.ndim == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.shape[2] == 4:
        a = img[:, :, 3:4].astype(np.float32) / 255
        img = (img[:, :, :3] * a + 255 * (1 - a)).astype(np.uint8)
    return img


def find_boxes(img, merge):
    grey = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = grey.shape
    # Otsu: dark ink on light paper becomes foreground
    _, ink = cv2.threshold(grey, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
    if np.count_nonzero(ink) > ink.size / 2:  # light-on-dark sheet
        ink = 255 - ink
    # dilate so the strokes of one symbol join into a single component
    k = max(3, int(round(min(h, w) * 0.012 * merge)))
    merged = cv2.dilate(ink, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(merged, connectivity=8)
    out = []
    for i in range(1, n):
        x, y, bw, bh = stats[i, :4]
        # crop back to the ink actually inside the component
        m = (lab[y:y + bh, x:x + bw] == i) & (ink[y:y + bh, x:x + bw] > 0)
        ys, xs = np.nonzero(m)
        if len(xs) == 0:
            continue
        x0, x1, y0, y1 = x + xs.min(), x + xs.max() + 1, y + ys.min(), y + ys.max() + 1
        bw, bh = x1 - x0, y1 - y0
        if bw < 12 and bh < 12:
            continue
        if bw < 12 or bh < 12:
            continue
        if bw * bh > 0.25 * w * h:  # whole-panel blob
            continue
        texty = bh < 0.02 * h and bw / bh > 4
        out.append((int(x0), int(y0), int(bw), int(bh), bool(texty)))
    # reading order: rows by y (coarse bands), then x
    band = max(1, int(h * 0.02))
    out.sort(key=lambda b: (b[1] // band, b[0]))
    return out


def make_sheets(crops, out_dir, stem):
    cell_w, pad, label_h = 130, 8, 16
    cols = max(1, (1600 - pad) // (cell_w + pad))
    cells = []
    for n, c in crops:
        h, w = c.shape[:2]
        s = min(120 / max(h, w), 2.0)
        c = cv2.resize(c, (max(1, int(w * s)), max(1, int(h * s))), interpolation=cv2.INTER_AREA)
        cells.append((n, c))
    rows = [cells[i:i + cols] for i in range(0, len(cells), cols)]
    row_h = 120 + label_h + pad
    per_sheet = max(1, (2400 - pad) // row_h)
    names = []
    chunks = [rows[i:i + per_sheet] for i in range(0, len(rows), per_sheet)] or [[]]
    for si, chunk in enumerate(chunks, 1):
        sheet = np.full((pad + len(chunk) * row_h, pad + cols * (cell_w + pad), 3), 255, np.uint8)
        for r, row in enumerate(chunk):
            for ci, (n, c) in enumerate(row):
                ch, cw = c.shape[:2]
                x = pad + ci * (cell_w + pad) + (cell_w - cw) // 2
                y = pad + r * row_h + (120 - ch) // 2
                sheet[y:y + ch, x:x + cw] = c
                cv2.putText(sheet, str(n), (pad + ci * (cell_w + pad) + 2, pad + r * row_h + 120 + 12),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1, cv2.LINE_AA)
        name = f"{stem}_sheet.png" if len(chunks) == 1 else f"{stem}_sheet{si}.png"
        cv2.imencode(".png", sheet)[1].tofile(str(out_dir / name))
        names.append(name)
    return names


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("inp", nargs="?", default="art/reference/map-symbols")
    ap.add_argument("out", nargs="?", default="art/reference/map-symbols/_split")
    ap.add_argument("--merge", type=float, default=1.0, help="scale the stroke-merging kernel")
    a = ap.parse_args()
    inp, out = Path(a.inp), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    index = {}
    for p in sorted(inp.iterdir()):
        if p.suffix.lower() not in EXTS:
            continue
        try:
            img = read_colour(p)
            boxes = find_boxes(img, a.merge)
        except Exception as e:
            print(f"ERROR {p.name}: {e}", file=sys.stderr)
            continue
        H, W = img.shape[:2]
        d = out / p.stem
        d.mkdir(exist_ok=True)
        crops, entries = [], []
        for n, (x, y, w, h, t) in enumerate(boxes, 1):
            x0, y0, x1, y1 = max(0, x - 4), max(0, y - 4), min(W, x + w + 4), min(H, y + h + 4)
            c = img[y0:y1, x0:x1]
            cv2.imencode(".png", c)[1].tofile(str(d / f"{n}.png"))
            crops.append((n, c))
            entries.append({"n": n, "box": [x, y, w, h], "texty": t})
        index[p.stem] = entries
        sheets = make_sheets(crops, out, p.stem)
        print(f"{p.name}: {len(entries)} symbols, {sum(e['texty'] for e in entries)} texty; {', '.join(sheets)}")
    (out / "index.json").write_text(json.dumps(index), encoding="utf-8")


if __name__ == "__main__":
    main()
