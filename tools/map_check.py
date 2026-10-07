"""Check a repainted map against the faithful one: align it, then flag colour and shape changes.

Run (from the project root):
  uv run --no-project --python tools/.venv/Scripts/python.exe python tools/map_check.py <faithful> <repaint> <out_dir>

Writes <out_dir>/aligned.png (the repaint, warped onto the faithful map) and <out_dir>/flags.png
(red cells: a different hue; blue cells: outlines added or lost), and prints counts only.
The flags are for the owner's review, not automatic rejection: Gemini's "upgrades" (forest style,
richer colour) are allowed if the map stays close. Labels are checked separately, against the
label list (docs/reference/map-upscale.md).
"""
import sys
from pathlib import Path

import cv2
import numpy as np

CELL = 48          # flag grid, in px of the faithful map
HUE_FLAG = 25      # Lab a*b* distance of a cell's mean colour: a richer wash of the same colour stays under
SHAPE_FLAG = 0.03  # share of a cell's pixels on an outline with no partner within 10 px


def read(p):  # imdecode on fromfile so spaced paths work on Windows
    return cv2.imdecode(np.fromfile(str(p), np.uint8), cv2.IMREAD_COLOR)


def write(p, im):
    cv2.imencode(Path(p).suffix, im)[1].tofile(str(p))


def gray(im):
    return cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)


def edges(im, sigma):
    return cv2.Canny(cv2.GaussianBlur(gray(im), (0, 0), sigma), 30, 80)


def main():
    fa, rp, out = sys.argv[1:4]
    Path(out).mkdir(parents=True, exist_ok=True)
    O, G = read(fa), read(rp)
    H, W = O.shape[:2]
    G = cv2.resize(G, (W, H), interpolation=cv2.INTER_LANCZOS4)

    # one homography, found at half size. A local flow was tried and chased repainted areas
    # (a recoloured lake) hundreds of px off, so there is none.
    s = 0.5
    sift = cv2.SIFT_create(8000)
    ko, do = sift.detectAndCompute(cv2.resize(gray(O), None, fx=s, fy=s), None)
    kg, dg = sift.detectAndCompute(cv2.resize(gray(G), None, fx=s, fy=s), None)
    good = [m for m, n in cv2.BFMatcher().knnMatch(dg, do, k=2) if m.distance < 0.75 * n.distance]
    src = np.float32([kg[m.queryIdx].pt for m in good]) / s
    dst = np.float32([ko[m.trainIdx].pt for m in good]) / s
    Hm, inl = cv2.findHomography(src, dst, cv2.RANSAC, 4.0)
    A = cv2.warpPerspective(G, Hm, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    write(Path(out) / 'aligned.png', A)
    eo = edges(O, 2)
    dt = cv2.distanceTransform(255 - eo, cv2.DIST_L2, 3)
    err = float(np.minimum(dt[edges(A, 2) > 0], 20).mean())
    print(f'matches {len(good)}, inliers {int(inl.sum())}, edge error {err:.1f} px')

    gw, gh = W // CELL, H // CELL
    lab = lambda im: cv2.resize(cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32), (gw, gh), interpolation=cv2.INTER_AREA)
    lo, la = lab(O), lab(A)
    hue = np.sqrt(((lo[..., 1:] - la[..., 1:]) ** 2).sum(-1))  # hue/chroma only, not lightness
    e1, e2 = edges(O, 3), edges(A, 3)
    far1 = cv2.distanceTransform(255 - e1, cv2.DIST_L2, 3) > 10
    far2 = cv2.distanceTransform(255 - e2, cv2.DIST_L2, 3) > 10
    share = lambda m: cv2.resize(m.astype(np.float32), (gw, gh), interpolation=cv2.INTER_AREA)
    changed = share((e2 > 0) & far1) + share((e1 > 0) & far2)
    cflag, sflag = hue > HUE_FLAG, changed > SHAPE_FLAG

    ov = A.copy()
    for flag, col in ((cflag, (0, 0, 255)), (sflag, (255, 0, 0))):
        big = np.zeros((H, W), bool)
        big[:gh * CELL, :gw * CELL] = cv2.resize(flag.astype(np.uint8), (gw * CELL, gh * CELL), interpolation=cv2.INTER_NEAREST) > 0
        ov[big] = (0.55 * ov[big] + 0.45 * np.array(col)).astype(np.uint8)
    write(Path(out) / 'flags.png', ov)
    print(f'cells {hue.size}: colour {int(cflag.sum())}, shape {int(sflag.sum())}, both {int((cflag & sflag).sum())}')


if __name__ == '__main__':
    main()
