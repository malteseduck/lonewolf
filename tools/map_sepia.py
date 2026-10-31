"""Bake a book's finished map into the sepia the player shows (ADR 0004).

    python tools/map_sepia.py <book folder> ...

map-4k.webp stays the colour master; this writes map-sepia.webp beside it, the same size. The importer
runs it when map-sepia.webp is missing or older, and book.js names it. Doing the repaint here saves
the iPad about a second or more on the first opening of a map, and maps.js keeps only the scan's
repaint, for a map not yet upscaled. The ink and the parchment are maps.js's and shared/ink.js's: a
change to how they look there may belong here too.
"""
import math
import os
import sys

import cv2
import numpy as np
from PIL import Image

DARK = np.array([38, 25, 14], np.float32)
LIGHT = np.array([236, 222, 186], np.float32)
RUBRIC = np.array([146, 40, 24], np.float32)
WARM = np.array([1, 0.94, 0.8], np.float32)
# Gemini's repaint is already aged on parchment with burnt edges, so it gets these lighter than the
# scan's in maps.js, or it comes out twice as dark (2026-10-21)
KEEP, LIFT, GRAIN, EDGE = 0.65, 0.03, 0.45, 0.3
QUALITY = 85  # the sepia's few hues: under the colour map's size at this quality


def seeded(seed):
    """shared/ink.js's seeded(): the same numbers, so the stains fall where they always did."""
    def imul(a, b):
        return (a * b) & 0xffffffff

    def r():
        nonlocal seed
        seed = (seed + 0x6d2b79f5) & 0xffffffff
        t = imul(seed ^ (seed >> 15), 1 | seed)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & 0xffffffff) ^ t
        return (t ^ (t >> 14)) / 4294967296
    return r


def ink(rgb):
    """maps.js's per-pixel ink on a float array of 0-255 RGB."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    water = np.clip((b - r - 25) / 110, 0, 1)
    red = np.clip((r - g - 60) / 90, 0, 1)
    v = np.clip(((0.3 * r + 0.55 * g + 0.15 * b) / 255 - water * 0.24 - 0.5) * 1.3 + 0.56 + LIFT, 0, 1)[..., None]
    o = DARK + (LIGHT - DARK) * v
    c = rgb * WARM * 0.92 + 6  # the map's own colour, warmed
    s = o + (c - o) * KEEP
    return s + (RUBRIC - s) * red[..., None] * 0.75


def _over(a, colour, alpha):
    a += (np.asarray(colour, np.float32) - a) * alpha


def _stroke(a, colour, alpha, draw, x0, y0, x1, y1):
    """A thin line drawn anti-aliased into a mask, then laid on at alpha, only where it falls."""
    h, w = a.shape[:2]
    x0, y0, x1, y1 = max(0, int(x0)), max(0, int(y0)), min(w, int(x1) + 1), min(h, int(y1) + 1)
    if x0 >= x1 or y0 >= y1:
        return
    m = np.zeros((y1 - y0, x1 - x0), np.uint8)
    draw(m, x0, y0)
    _over(a[y0:y1, x0:x1], colour, (m.astype(np.float32) / 255 * alpha)[..., None])


def parchment(w, h):
    """shared/ink.js's parchment(w, h, false, true), a loose sheet: stains, fibres, rings, burnt sides."""
    a = np.empty((h, w, 3), np.float32)
    a[:] = (0xd9, 0xcb, 0xa6)
    r = seeded(3)
    for _ in range(260):
        cx, cy, rad = r() * w, r() * h, 60 + r() * 260
        col, top = ((120, 88, 48), 0.05) if r() < 0.55 else ((255, 246, 222), 0.06)
        x0, y0, x1, y1 = max(0, int(cx - rad)), max(0, int(cy - rad)), min(w, int(cx + rad) + 1), min(h, int(cy + rad) + 1)
        if x0 >= x1 or y0 >= y1:
            continue
        ys, xs = np.ogrid[y0:y1, x0:x1]
        t = np.clip(np.hypot(xs + 0.5 - cx, ys + 0.5 - cy, dtype=np.float32) / rad, 0, 1)[..., None]
        # as a canvas gradient to rgba(0,0,0,0): the colour fades to black along with the alpha
        _over(a[y0:y1, x0:x1], np.asarray(col, np.float32) * (1 - t), top * (1 - t))
    for _ in range(1100):
        px, py, ang, ln = r() * w, r() * h, r() * math.pi, 6 + r() * 22
        alpha = 0.03 + r() * 0.05
        qx, qy = px + math.cos(ang) * ln, py + math.sin(ang) * ln

        def line(m, x0, y0, px=px, py=py, qx=qx, qy=qy):
            cv2.line(m, (round(px) - x0, round(py) - y0), (round(qx) - x0, round(qy) - y0), 255, 1, cv2.LINE_AA)
        _stroke(a, (90, 68, 38), alpha, line, min(px, qx) - 2, min(py, qy) - 2, max(px, qx) + 2, max(py, qy) + 2)
    for _ in range(5):
        width = 3 + r() * 6
        cx, cy, rx, ry, turn = r() * w, r() * h, 40 + r() * 90, 30 + r() * 70, r() * 3
        reach = max(rx, ry) + width

        def ring(m, x0, y0, cx=cx, cy=cy, rx=rx, ry=ry, turn=turn, width=width):
            cv2.ellipse(m, (round(cx) - x0, round(cy) - y0), (round(rx), round(ry)), math.degrees(turn), 0, 360, 255, round(width), cv2.LINE_AA)
        _stroke(a, (110, 78, 38), 0.06, ring, cx - reach, cy - reach, cx + reach, cy + reach)
    burnt = np.array([60, 38, 16], np.float32)
    for t in (np.arange(w, dtype=np.float32) + 0.5, w - np.arange(w, dtype=np.float32) - 0.5):
        t = np.clip(t / 150, 0, 1)[None, :, None]
        _over(a, burnt * (1 - t), 0.42 * (1 - t))
    for t in (np.arange(h, dtype=np.float32) + 0.5, h - np.arange(h, dtype=np.float32) - 0.5):
        t = np.clip(t / 150, 0, 1)[:, None, None]
        _over(a, burnt * (1 - t), 0.42 * (1 - t))
    return a


def sepia(rgb):
    """A map's uint8 RGB array as the player shows it."""
    h, w = rgb.shape[:2]
    a = ink(rgb.astype(np.float32))
    a += (a * parchment(w, h) / 255 - a) * GRAIN  # multiplied over, at the grain's strength
    ys, xs = np.ogrid[:h, :w]
    t = np.clip((np.hypot(xs + 0.5 - w / 2, ys + 0.5 - h / 2, dtype=np.float32) - h * 0.35) / (w * 0.68 - h * 0.35), 0, 1)
    _over(a, (40, 24, 10), (t * EDGE)[..., None])
    return np.clip(a + 0.5, 0, 255).astype(np.uint8)


def bake(src, out):
    with Image.open(src) as im:
        rgb = np.asarray(im.convert('RGB'))
    Image.fromarray(sepia(rgb)).save(out, quality=QUALITY, method=4)


def bake_book(folder):
    """Make the book's map-sepia.webp if it is missing or older than the map. Returns its name, or
    None for a book with no finished map."""
    src, out = os.path.join(folder, 'map-4k.webp'), os.path.join(folder, 'map-sepia.webp')
    if not os.path.exists(src):
        return None
    if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(src):
        bake(src, out)
    return 'map-sepia.webp'


if __name__ == '__main__':
    for folder in sys.argv[1:]:
        print(folder, bake_book(folder) or 'no map-4k.webp')
