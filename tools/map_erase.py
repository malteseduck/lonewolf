"""Erase labels from the faithful map before Gemini repaints it, so it cannot misspell them.

Run (from the project root):
  uv run --project tools python tools/map_erase.py <map-2k.png> <maps/<book>/labels.json> <out.jpg>

Every label marked "retype": true in the list is erased: each near-black shape lying mostly inside its
box is filled in from the colour around it. Lines running out of the box (roads, coasts, the scale
bar) and outlines next to a colour fill (trees, rivers, mountains) stay, and so does a letter
joined to one; a label marked "clip": true has every stroke in its box erased instead (letters
joined to the scale bar, a tower, a road); "joined": true also erases letters joined to a line running
out of the box (a river, mountain, flagpole) and the line's ink inside the box, except river
outlines and coasts (Book 4: Holmgard, Cloeasia; a name at sea is all taken, Book 5: Bisutan).
Except with clip, only the ink along the name's line of letters goes (one strip per "lines" entry,
sized from the name's letter count and its box): mountain peaks, tree tops and symbols in the box
beside the letters stay, as on a slanted name in its level box (Book 6). "keep": [[x0, y0, x1, y1]]
(or [x0, y0, x1, y1, degrees], turned round its centre) protects anything inside those boxes (Book 1:
a ship inside a strait's name; ink lying among the letters themselves). Check the result: Gemini may letter a fragment. Asking Gemini to leave labels out did not work (Book 1, round
5: it kept 22 of 23), so it is given a picture without them. The fill is rough where a label touched
a tree or a coastline, but Gemini repaints all of it. The erased labels are lettered afterwards.
Saved as JPEG (quality 92): Gemini refused the 4.4 MB PNG once.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

PAD = 4   # px past a label's box: the hand-drawn boxes run tight
BLOB = 9     # px: ink this thick is a tree, not a letter stroke
NEAR = 31    # px: ink is what is darker than the median of this window round it
# A map lettered bolder than BOLDER px (Book 7: 7.4; Books 1-6 and 12: 3.8 to 5.5) scales both by
# its stroke: its letters' junctions outgrew BLOB and stayed as trees, and its letters packed a
# NEAR window so dark that their cores did not count as ink and were smeared instead of taken.
BOLDER = 6
BOLD_BLOB, BOLD_NEAR = 2.4, 7
# the line of letters (LabelInk.along_letters)
MIN_INK = 40  # px: less ink than this and there is no line to find
WIDE = 0.8    # a letter's width with its spacing, for its height
DENSE = 0.06  # ink per px of strip a line of letters is expected to beat (keeps it off a lone corner)
EDGE = 0.3    # the line grows while a row across it holds this share of its ink ...
GAP = 2       # ... stepping over gaps this many px wide (between a letter's strokes)
SLACK = 0.12  # the line's height is grown by this share each way for anything ...
REACH = 0.8   # ... and by this share for a shape lying in the box and mostly in the line


class LabelInk:
    """Which of the scan's pixels belong to a label. map_letter.py measures labels with it too."""

    def __init__(self, im, labels=None):
        g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
        lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.int16)
        chroma = np.hypot(lab[..., 1] - 128, lab[..., 2] - 128)

        def letters(near):  # near-black, colourless, not hugging a colour fill
            self.dark = cv2.medianBlur(g, near).astype(np.int16) - g
            ink = ((self.dark > 30) & (chroma < 24)).astype(np.uint8)
            # tree, river and mountain outlines hug a solid colour fill: keep ink next to one
            fill = cv2.morphologyEx(((self.dark > 30) & (chroma > 18)).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
            return ink & (cv2.dilate(fill, np.ones((7, 7), np.uint8)) == 0).astype(np.uint8)

        ink, size = letters(NEAR), BLOB
        stroke = self.stroke(ink, labels)
        if stroke > BOLDER:
            ink, size = letters(round(BOLD_NEAR * stroke) | 1), round(BOLD_BLOB * stroke) | 1
        # the scan's trees are near-black blobs; letters are thin strokes. Keep anything thick.
        blob = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size, size)))
        ink &= (cv2.dilate(blob, np.ones((5, 5), np.uint8)) == 0).astype(np.uint8)
        # the map's straight grid lines join letters crossing them into one long shape: cut them out
        lines = cv2.morphologyEx(ink, cv2.MORPH_OPEN, np.ones((1, 61), np.uint8)) | cv2.morphologyEx(ink, cv2.MORPH_OPEN, np.ones((61, 1), np.uint8))
        ink &= (cv2.dilate(lines, np.ones((3, 3), np.uint8)) == 0).astype(np.uint8)
        self.n, self.cc = cv2.connectedComponents(ink, connectivity=8)
        self.total = np.bincount(self.cc.ravel(), minlength=self.n)
        # for "joined": within 3 px of blue paint (the paper is too colourful for plain chroma)
        self.near_water = cv2.dilate((lab[..., 2] < 112).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
        # a river outline or coast has land beside it as well; letters out at sea have only water
        land = cv2.morphologyEx(((lab[..., 2] >= 112) & (self.dark < 15)).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        self.shore = self.near_water & (cv2.dilate(land, np.ones((11, 11), np.uint8)) > 0)

    @staticmethod
    def stroke(ink, labels):
        """The map's letter stroke (px): the median over the place names of the thickest strokes
        in each box (BOLDER)."""
        if not labels:
            return 0
        dt = cv2.distanceTransform(ink, cv2.DIST_L2, 3)
        w = []
        for lab_ in labels:
            if not lab_.get('retype') or 'box' not in lab_:
                continue
            x0, y0, x1, y1 = (max(int(v), 0) for v in lab_['box'])
            s = dt[y0:y1, x0:x1]
            if (s > 0).sum() >= MIN_INK:
                w.append(2 * np.percentile(s[s > 0], 95))
        return float(np.median(w)) if w else 0

    def box(self, lab_):
        x0, y0, x1, y1 = lab_['box']
        return max(x0 - PAD, 0), max(y0 - PAD, 0), x1 + PAD, y1 + PAD

    def mask(self, lab_):
        """The label's ink inside its padded box (box-sized boolean array)."""
        x0, y0, x1, y1 = self.box(lab_)
        sub = self.cc[y0:y1, x0:x1]
        within = np.bincount(sub.ravel(), minlength=self.n)
        # a letter lies inside the box; a road, coast or the scale bar runs out of it and stays
        take = (within >= 0.6 * self.total) & (self.total > 0)
        take[0] = False
        # clip: everything darker than the paint in the box, faint ghosts included (Gemini letters a ghost)
        m = take[sub] if not lab_.get('clip') else self.dark[y0:y1, x0:x1] > 18
        if lab_.get('joined') and not lab_.get('clip'):
            # letters touching a line (river, mountain, flagpole) join it into one shape running out
            # of the box: take that shape's ink inside the (unpadded) box too, except river outlines
            part = (within > 0) & ~take
            part[0] = False
            bx0, by0, bx1, by1 = (v - o for v, o in zip(lab_['box'], (x0, y0, x0, y0)))
            inner = np.zeros(m.shape, bool)
            inner[max(by0, 0):by1, max(bx0, 0):bx1] = True
            m = m | (part[sub] & inner & ~self.shore[y0:y1, x0:x1])
        if not lab_.get('clip'):  # only the ink along the letters: the peaks, trees and symbols beside them stay
            words = lab_.get('lines') or [lab_.get('text', '')]
            bx0, by0, bx1, by1 = lab_['box']
            m = self.along_letters(m, take[sub], (bx1 - bx0, by1 - by0), max(len(t.replace(' ', '')) for t in words), len(words))
        m = m | self.enclosed(m, self.dark[y0:y1, x0:x1] > 30)
        if lab_.get('keep'):  # a ship inside the label's box; a fifth number turns the box (degrees, clockwise)
            kept = np.zeros(m.shape, np.uint8)
            for k in lab_['keep']:
                kx0, ky0, kx1, ky1 = k[:4]
                rect = (((kx0 + kx1) / 2 - x0, (ky0 + ky1) / 2 - y0), (kx1 - kx0, ky1 - ky0), k[4] if len(k) > 4 else 0)
                cv2.fillPoly(kept, [np.round(cv2.boxPoints(rect)).astype(np.int32)], 1)
            m = m & ~kept.astype(bool)
        return m

    @staticmethod
    def along_letters(m, whole, size, chars, lines=1):
        """Only the ink along the name's line(s) of letters, so the mountain peaks, tree tops, roads and
        symbols in the box beside them stay. The box is drawn round the name: at each angle its
        <chars> letters across the box's length give their height. The line is the strip of that
        height at the angle holding the most ink (less DENSE of its area), grown while the ink goes
        on; a name over <lines> lines scores them all at once, then the others are the fullest
        strips of the same height near that angle. A shape lying in the box (<whole>) and mostly in
        a strip is taken out to REACH of its height each way (capitals, tails); anything else only
        inside a strip, grown by SLACK."""
        if m.sum() < MIN_INK or chars < 2:
            return m
        h, w = m.shape
        bw, bh = size
        yy, xx = np.mgrid[0:h, 0:w]
        n, cc = cv2.connectedComponents(m.astype(np.uint8), connectivity=8)
        npx = np.maximum(np.bincount(cc[m], minlength=n), 1)

        def mostly(inside):  # the shapes lying mostly inside
            f = np.bincount(cc[inside & m], minlength=n) >= 0.5 * npx
            f[0] = False
            return f[cc]

        def across(deg):  # each pixel's distance across a line at <deg> (whole px from 0)
            t = np.radians(deg)
            a = xx * -np.sin(t) + yy * np.cos(t)
            return np.round(a - a.min()).astype(int)

        def fullest(a, ink, width, dense=0.0):  # the strip <width> px wide holding the most ink
            c = np.concatenate([[0], np.cumsum(np.bincount(a[ink], minlength=a.max() + 1))])
            if len(c) <= width:
                return None
            score = (c[width:] - c[:-width]).astype(float)
            if dense:
                ca = np.concatenate([[0], np.cumsum(np.bincount(a.ravel()))])
                score -= dense * (ca[width:] - ca[:-width])
            i = int(np.argmax(score))
            return score[i], i, i + width - 1

        best = None
        for deg in range(0, 180, 2):
            t = np.radians(deg)
            tall = max(3, round((abs(bw * np.cos(t)) + abs(bh * np.sin(t))) / (WIDE * chars + 1)))
            a = across(deg)
            got = fullest(a, m, int(tall * (1 + 1.3 * (lines - 1))), DENSE)
            if got and (best is None or got[0] > best[0]):
                best = (got[0], deg, a, got[1], got[2], tall)
        _, deg0, a, lo, hi, tall = best
        if lines > 1:  # the first line: the fullest strip of one line's height among them
            _, lo, hi = fullest(a, m & (a >= lo) & (a <= hi), tall)
        # grow it while a row across holds EDGE of the strip's ink, stepping over gaps of up to GAP px
        rows = np.bincount(a[m], minlength=a.max() + 1)
        floor = EDGE * rows[lo:hi + 1].mean()
        while lo > 0 and (rows[max(0, lo - GAP):lo] >= floor).any():
            lo -= 1
        while hi < len(rows) - 1 and (rows[hi + 1:hi + 1 + GAP] >= floor).any():
            hi += 1
        tall = hi + 1 - lo
        strips = [(a, lo, hi)]
        rest = m
        for _ in range(lines - 1):
            near = (a >= lo - SLACK * tall) & (a <= hi + SLACK * tall)
            rest = rest & ~near & ~mostly(near)
            best = None
            for deg in range(deg0 - 10, deg0 + 11, 2):
                a = across(deg)
                got = fullest(a, rest, tall)
                if got and (best is None or got[0] > best[0]):
                    best = (got[0], a, got[1], got[2])
            if best is None or best[0] < MIN_INK:
                break
            _, a, lo, hi = best
            strips.append((a, lo, hi))
        band = np.zeros(m.shape, bool)
        reach = np.zeros(m.shape, bool)
        for a, lo, hi in strips:
            band |= (a >= lo - SLACK * tall) & (a <= hi + SLACK * tall)
            reach |= (a >= lo - REACH * tall) & (a <= hi + REACH * tall)
        return m & (band | (mostly(band) & mostly(whole) & reach))

    @staticmethod
    def enclosed(m, dark):
        """Small dark specks the taken ink rings round: a thick stroke junction (an A's apex) reads
        as a tree and stays, and the inpaint smears it into a blot."""
        md = cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        left = (dark & ~md).astype(np.uint8)
        n, cc, st, _ = cv2.connectedComponentsWithStats(left, connectivity=8)
        out = np.zeros(m.shape, bool)
        h, w = m.shape
        for c in range(1, n):
            x, y, bw, bh, area = st[c]
            if area > 150 or x == 0 or y == 0 or x + bw == w or y + bh == h:
                continue
            blob = cc == c
            ring = cv2.dilate(blob.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool) & ~blob & ~left.astype(bool)
            if (md & ring).sum() >= 0.5 * ring.sum():
                out |= cv2.dilate(blob.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        return out


def main():
    src, labels, out = sys.argv[1:4]
    im = cv2.imdecode(np.fromfile(src, np.uint8), cv2.IMREAD_COLOR)
    labels = json.loads(Path(labels).read_text(encoding='utf-8'))
    li = LabelInk(im, labels)
    mask = np.zeros(im.shape[:2], np.uint8)
    n = 0
    for lab_ in labels:
        if not lab_.get('retype'):
            continue
        x0, y0, x1, y1 = li.box(lab_)
        mask[y0:y1, x0:x1] |= li.mask(lab_).astype(np.uint8) * 255
        n += 1
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))  # and the soft edge round each stroke
    res = cv2.inpaint(im, mask, 7, cv2.INPAINT_TELEA)
    cv2.imencode('.jpg', res, [cv2.IMWRITE_JPEG_QUALITY, 92])[1].tofile(out)
    print(f'erased {n} labels, {int((mask > 0).sum())} px')


if __name__ == '__main__':
    main()
