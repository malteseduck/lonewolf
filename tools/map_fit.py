"""Fit each lettered name's type over the scan's own letters: the place, angle and size at which the
type, as map_letter.py draws it, lies closest over the printed name's ink (ADR 0004, owner
2026-11-06: "almost exactly where the source map had it").

The measure (map_letter.geometry) gives a start; a pattern search then moves the centre, turns the
angle and scales the size while the two shapes come closer: the mean distance from each type pixel
to the nearest ink pixel, plus from each ink pixel to the nearest type pixel (each capped, so a
stray speck in the box cannot drag the name). map_letter.py, map_measure.py and the map editor's
preview all take the fit, unless the label is placed by hand ("set").

Run (from the project root), to score the fit against the owner's hand placements:
  uv run --project tools python tools/map_fit.py score <book> [<book> ...]
Prints, per book, how many hand-placed names the fit lands close to (within 3 px, 2 degrees and 6%
of size) and far off (over 5 px, 3 degrees or 10%), beside the same for the placement before the
fit (the measure, its size pulled to the map's usual one); counts only, never wordings.
"""
import json
import math
import sys
import weakref
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np

import map_letter
from map_erase import LabelInk

CAP = 3.0       # a distance counts up to this many strokes: further off is simply "missed"
PTS = 1500      # pixels of each shape scored (an even sample of the rest)
STEPS = (0.5, 4.0, 0.08)  # the search's first steps: strokes of offset, degrees, share of size
TURN = 0.02     # the cost, in strokes, of each degree turned off the measured angle
MIN_STEP = 0.02  # it stops when its steps have halved to this share of the first
GROW = (0.75, 1.33)  # the size stays within these times the measure's: on part of a name's ink it shrank onto it


def font_of(lab, hand, caps):
    return hand if any(ch.islower() for ch in lab['text']) else caps


@lru_cache(maxsize=4096)
def _type(lines, font, size, leading):
    """The type at <size> (quarter px), level: its pixels about the picture's centre (what place()
    sets at the label's centre), and the distance to it from every pixel of its picture."""
    img, _ = map_letter.render(list(lines), font, 0, 0, len(lines), leading=leading, size=size)
    m = np.asarray(img) > 127
    h, w = m.shape
    ys, xs = np.nonzero(m)
    pts = np.column_stack([xs - w / 2 + 0.5, ys - h / 2 + 0.5])
    if len(pts) > PTS:
        pts = pts[np.linspace(0, len(pts) - 1, PTS).astype(int)]
    dt = cv2.distanceTransform((~m).astype(np.uint8), cv2.DIST_L2, 3)
    return pts, dt


def _lookup(dt, pts, cap):
    """dt at <pts> (x, y in its own px), <cap> outside it."""
    h, w = dt.shape
    x = np.round(pts[:, 0]).astype(int)
    y = np.round(pts[:, 1]).astype(int)
    ok = (x >= 0) & (y >= 0) & (x < w) & (y < h)
    d = np.full(len(pts), cap, np.float64)
    d[ok] = np.minimum(dt[y[ok], x[ok]], cap)
    return d


class Target:
    """The scan's ink of one label, in its padded box's px, and the distance to it."""

    def __init__(self, scan_ink, lab):
        self.x0, self.y0, _, _ = scan_ink.box(lab)
        m = scan_ink.mask(lab)
        ys, xs = np.nonzero(m)
        self.n = len(xs)
        pts = np.column_stack([xs + 0.5, ys + 0.5])
        if len(pts) > PTS:
            pts = pts[np.linspace(0, len(pts) - 1, PTS).astype(int)]
        self.pts = pts  # box px
        self.dt = cv2.distanceTransform((~m).astype(np.uint8), cv2.DIST_L2, 3)
        dt_in = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 3)
        self.stroke = max(2 * float(np.median(dt_in[m])) if self.n else 2, 1.5)
        self.cap = CAP * self.stroke

    def cost(self, lines, font, leading, centre, ang, size):
        tpts, tdt = _type(lines, font, round(size * 4) / 4, leading)
        c, s = math.cos(ang), math.sin(ang)
        R = np.array([[c, -s], [s, c]])
        at = np.array(centre) - (self.x0, self.y0)
        # type -> scan: each type pixel's distance to the ink
        a = _lookup(self.dt, tpts @ R.T + at, self.cap).mean()
        # scan -> type: each ink pixel, turned back into the type's frame, to the type
        h, w = tdt.shape
        back = (self.pts - at) @ R + (w / 2, h / 2)
        b = _lookup(tdt, back, self.cap).mean()
        return a + b


def fit(scan_ink, lab, hand, caps, start, turn=True):
    """(centre [x, y], angle in radians, type size), all map-2k, fitted from <start> (the same three)
    over the label's ink; <start> itself where there is no ink to fit to. <turn> False keeps the
    angle (one given by hand, or stacked lines, set level)."""
    t = Target(scan_ink, lab)
    if t.n < 10:
        return start
    lines = tuple(lab.get('lines') or [lab['text']])
    font = font_of(lab, hand, caps)
    leading = lab.get('leading', 1)
    x, y = (float(v) for v in start[0])
    p = [x, y, math.degrees(start[1]), math.log(max(start[2], 6))]
    a0 = p[2]
    # in strokes; turning off the measured angle costs TURN a degree, so a name only turns for a real gain
    f = lambda q: (t.cost(lines, font, leading, (q[0], q[1]), math.radians(q[2]), math.exp(q[3])) / t.stroke
                   + TURN * abs(q[2] - a0))
    best = f(p)
    first = [STEPS[0] * t.stroke, STEPS[0] * t.stroke, STEPS[1], STEPS[2]]
    if not turn:
        first[2] = 0
    lo, hi = (math.log(max(start[2], 6) * g) for g in GROW)
    step = list(first)
    while step[3] > MIN_STEP * first[3]:
        moved = False
        for i in range(4):
            for sign in (1, -1):
                q = list(p)
                q[i] += sign * step[i]
                if not step[i] or not lo <= q[3] <= hi:
                    continue
                c = f(q)
                if c < best - 1e-9:
                    p, best, moved = q, c, True
                    break
        if not moved:
            step = [v / 2 for v in step]
    return np.array(p[:2]), math.radians(p[2]), math.exp(p[3])


def start(scan_ink, lab, hand, caps):
    """The measure's placement, before the fit: map_letter.geometry's centre and angle, the type size
    fitted to the ink's length (stacked lines: level, fitted to the box). None with no ink."""
    g = map_letter.geometry(scan_ink, lab)
    if g is None:
        return None
    centre, ang, length, thick = g
    lines = lab.get('lines') or [lab['text']]
    if lab.get('lines'):
        ang = math.radians(lab.get('angle', 0))
        length = (lab['box'][2] - lab['box'][0]) / map_letter.FILL * 0.95
        thick = lab['box'][3] - lab['box'][1]
    return centre, ang, map_letter.fit_size(lines, font_of(lab, hand, caps), length, thick, lab.get('leading', 1))


_placed = weakref.WeakKeyDictionary()  # LabelInk -> {label: placement}


def placement(scan_ink, lab, hand, caps):
    """start() fitted over the ink: (centre, angle, size), map-2k, nudge not added; None with no ink.
    An angle given by hand, or stacked lines, keep their angle. Kept per scan and label, as the
    Letter step places each name once a phase."""
    done = _placed.setdefault(scan_ink, {})
    key = (str(hand), str(caps), json.dumps({k: v for k, v in lab.items() if k not in ('ink', 'nudge')}, sort_keys=True))
    if key not in done:
        st = start(scan_ink, lab, hand, caps)
        done[key] = st and fit(scan_ink, lab, hand, caps, st, turn=not ('angle' in lab or lab.get('lines')))
    return done[key]


def fittable(lab):
    return bool((lab.get('retype') or lab.get('fix')) and not lab.get('spread') and not lab.get('height'))


def score(book):
    import map_review
    root = Path(__file__).resolve().parent.parent
    labels = json.loads((root / 'maps' / book / 'labels.json').read_text(encoding='utf-8'))
    scan = map_letter.read(root / 'data' / 'projectaon' / book / 'work' / 'map-2k.png')
    font = map_review.font_of(book)
    raw = [{k: v for k, v in lab.items() if k not in ('set', 'angle', 'nudge')} for lab in labels]
    scan_ink = LabelInk(scan, raw)
    common = map_letter.common_size(raw, scan_ink, font, font)
    rows = []
    for i, (lab, r) in enumerate(zip(labels, raw)):
        s = lab.get('set')
        if not s or not fittable(lab) or None in [*s.get('at', [None, None])[:2], s.get('size'), s.get('angle')]:
            continue
        st = start(scan_ink, r, font, font)
        if st is None:
            continue
        ft = placement(scan_ink, r, font, font)
        if common and not lab.get('lines') and st[2] <= map_letter.BIG * common:  # as map_letter set it before the fit
            st = (st[0], st[1], common * map_letter.SNAP * (st[2] / common) ** map_letter.PULL)
        def err(p):
            d = math.dist(p[0], s['at'])
            a = abs((math.degrees(p[1]) - s['angle'] + 180) % 360 - 180)
            z = abs(p[2] / s['size'] - 1)
            return d, a, z, d <= 3 and a <= 2 and z <= 0.06, d > 5 or a > 3 or z > 0.1
        rows.append((i, err(st), err(ft)))
    return rows


def main():
    if len(sys.argv) < 3 or sys.argv[1] != 'score':
        sys.exit(__doc__)
    tot = [0, 0, 0, 0, 0]
    for book in sys.argv[2:]:
        rows = score(book)
        m = sum(r[1][3] for r in rows)
        f = sum(r[2][3] for r in rows)
        mo = sum(r[1][4] for r in rows)
        fo = sum(r[2][4] for r in rows)
        md = lambda k, j: float(np.median([r[k][j] for r in rows])) if rows else 0
        print(f'{book}: {len(rows)} hand-placed; close: measure {m}, fit {f}; far off: measure {mo}, fit {fo}; median px {md(1, 0):.1f} -> {md(2, 0):.1f},'
              f' deg {md(1, 1):.1f} -> {md(2, 1):.1f}, size {md(1, 2):.1%} -> {md(2, 2):.1%}')
        tot = [tot[0] + len(rows), tot[1] + m, tot[2] + f, tot[3] + mo, tot[4] + fo]
    print(f'all: {tot[0]} hand-placed; close: measure {tot[1]}, fit {tot[2]}; far off: measure {tot[3]}, fit {tot[4]}')


if __name__ == '__main__':
    main()
