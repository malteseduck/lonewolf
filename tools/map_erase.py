"""Erase labels from the faithful map before Gemini repaints it, so it cannot misspell them.

Run (from the project root):
  uv run --no-project --python tools/.venv/Scripts/python.exe python tools/map_erase.py <map-2k.png> <maps/<book>/labels.json> <out.jpg>

Every label marked "retype": true in the list is erased: each near-black shape lying mostly inside its
box is filled in from the colour around it. Lines running out of the box (roads, coasts, the scale
bar) and outlines next to a colour fill (trees, rivers, mountains) stay, and so does a letter
joined to one; a label marked "clip": true has every stroke in its box erased instead (letters
joined to the scale bar, a tower, a road); "joined": true also erases letters joined to a line running
out of the box (a river, mountain, flagpole) and the line's ink inside the box, except river
outlines and coasts (Book 4: Holmgard, Cloeasia; a name at sea is all taken, Book 5: Bisutan). "keep": [[x0, y0, x1, y1]] protects anything inside
those boxes (Book 1: a ship inside a strait's name). Check the result: Gemini may letter a fragment. Asking Gemini to leave labels out did not work (Book 1, round
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
BLOB = 9  # px: ink this thick is a tree, not a letter stroke


class LabelInk:
    """Which of the scan's pixels belong to a label. map_letter.py measures labels with it too."""

    def __init__(self, im):
        g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
        self.dark = cv2.medianBlur(g, 31).astype(np.int16) - g
        lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.int16)
        chroma = np.hypot(lab[..., 1] - 128, lab[..., 2] - 128)
        ink = ((self.dark > 30) & (chroma < 24)).astype(np.uint8)
        # tree, river and mountain outlines hug a solid colour fill: keep ink next to one
        fill = cv2.morphologyEx(((self.dark > 30) & (chroma > 18)).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        ink &= (cv2.dilate(fill, np.ones((7, 7), np.uint8)) == 0).astype(np.uint8)
        # the scan's trees are near-black blobs; letters are thin strokes. Keep anything thick.
        blob = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (BLOB, BLOB)))
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
        m = m | self.enclosed(m, self.dark[y0:y1, x0:x1] > 30)
        for kx0, ky0, kx1, ky1 in lab_.get('keep', []):  # a ship inside the label's box
            m[max(ky0 - y0, 0):max(ky1 - y0, 0), max(kx0 - x0, 0):max(kx1 - x0, 0)] = False
        return m

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
    li = LabelInk(im)
    mask = np.zeros(im.shape[:2], np.uint8)
    n = 0
    for lab_ in json.loads(Path(labels).read_text(encoding='utf-8')):
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
