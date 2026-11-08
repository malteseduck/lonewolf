"""Lighten Book 1's round 8 for the example pair shown to Gemini (ADR 0004).

    python tools/map_example.py <before.jpg> <round-8.jpg> <out.jpg>

Round 8 is a third darker than its scan, and Gemini copied that tone onto Books 6-9 (owner, 2026-11-08:
"more shading, not darker overall", but not washed out). So the mid-tones are lifted toward the scan's
while the ink and deep shadows stay put, and colour is kept at full strength. Writes nothing when the
output is newer than both inputs. Round 8 itself is untouched.
"""
import os
import sys

import cv2
import numpy as np

FRAC = 0.85  # of the scan's median: a shade darker than the scan, as a richer painting is
QUALITY = 92


def lighten(im, scan_grey):
    """im: BGR repaint; scan_grey: its scan in grey. Returns the repaint lifted, never darkened."""
    lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32)
    L = lab[..., 0] / 255
    target = np.median(scan_grey) / 255 * FRAC
    med = float(np.clip(np.median(L), 1e-3, 0.999))
    g = min(1.0, np.log(target) / np.log(med)) if 0 < target < 1 else 1.0
    lifted = L ** g
    # the shadows and ink keep their depth: a lift there is what washes a picture out
    w = np.clip((L - 0.06) / 0.3, 0, 1)
    w = w * w * (3 - 2 * w)
    L2 = L + (lifted - L) * w
    k = np.clip((L2 + 0.05) / (L + 0.05), 1, 1.6) ** 0.6  # chroma rises with the light, or it greys
    lab[..., 0] = L2 * 255
    lab[..., 1:] = 128 + (lab[..., 1:] - 128) * k[..., None]
    return cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)


def read(path, flag=cv2.IMREAD_COLOR):
    return cv2.imdecode(np.fromfile(path, np.uint8), flag)


def make(before, after, out):
    """True if it wrote out."""
    if os.path.isfile(out) and os.path.getmtime(out) >= max(os.path.getmtime(before), os.path.getmtime(after)):
        return False
    res = lighten(read(after), read(before, cv2.IMREAD_GRAYSCALE))
    ok, buf = cv2.imencode('.jpg', res, [cv2.IMWRITE_JPEG_QUALITY, QUALITY])
    buf.tofile(out)
    return True


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    print('written' if make(*sys.argv[1:]) else 'up to date')
