"""PaddleOCR's reading of a map, for map_labels.py: each label's box, slant and wording.

Run by map_labels.py in its own venv, tools/.venv-paddle (Python 3.12: PaddlePaddle has no build for
the main venv's 3.14). Set up with (the GPU build, CUDA 12.6; plain `paddlepaddle` is the CPU one):
  uv venv --system-certs --python 3.12 tools/.venv-paddle
  uv pip install --system-certs --python tools/.venv-paddle/Scripts/python.exe paddlepaddle-gpu==3.3.1 --index-url https://www.paddlepaddle.org.cn/packages/stable/cu126/ --extra-index-url https://pypi.org/simple --index-strategy unsafe-best-match
  uv pip install --system-certs --python tools/.venv-paddle/Scripts/python.exe paddleocr truststore
  tools/.venv-paddle/Scripts/python.exe tools/map_ocr_paddle.py <image> <out.json>

Writes [{"text", "box": [x0, y0, x1, y1], "slant", "conf"}], "slant" the line's in degrees (y down,
-90 to 90), which map_letter.py's measure takes where the ink is a little off it. The map is read turned to each of TURNS, at its own size and at twice it, and
the best read of each place kept: a slanted name along a river is read when turned level, and
small names only at twice the size. On Book 6 (2026-10-19) it found 57 of the owner's 62 labels,
51 worded right, where one level pass with default thresholds found 51 (46 right); Book 7 gave
60 reads where that pass gave 45. What it still misses is hand lettering slanted over mountains or
trees. About a minute a map on the GPU (an RTX 2060), most of it the passes at twice the size; the models (PP-OCR, about 100 MB) download to
~/.paddlex on the first run.
"""
import json
import math
import os
import sys

import cv2
import numpy as np

TURNS = (0, 30, -30, 60, -60, 90)  # degrees anticlockwise; Paddle reads within about 15 of level
SCALES = (1, 2)
MIN_CONF = 0.7  # under it the reads on Books 6 and 7 were mostly ornament and trees
EDGE = 80       # px: a short read on end this near the map's edge is the frame's ornament (Book 7)


def turn(shape, deg, scale):
    """The affine turning an image of <shape> by <deg> and scaling it, onto a canvas holding all of it."""
    h, w = shape[:2]
    m = cv2.getRotationMatrix2D((w / 2, h / 2), deg, scale)
    c, s = abs(m[0, 0]), abs(m[0, 1])
    size = int(round(h * s + w * c)), int(round(h * c + w * s))
    m[0, 2] += size[0] / 2 - w / 2
    m[1, 2] += size[1] / 2 - h / 2
    return m, size


def back(poly, m):
    """A polygon read on the turned image, in the map's own pixels."""
    p = np.asarray(poly, np.float64)
    return np.c_[p, np.ones(len(p))] @ cv2.invertAffineTransform(m).T


def slant(quad):
    """The slant of a read's top edge, degrees, y down, folded into -90..90 (map_letter.py picks the
    reading direction itself)."""
    v = quad[1] - quad[0]
    a = math.degrees(math.atan2(v[1], v[0]))
    return (a + 90) % 180 - 90


def noise(r, size):
    """A tree pair read as "TT", or the frame's ornament read on end by the edge. Neither dropped a
    label on Books 3-6 and 12's checked lists; on Book 7 they took 6 reads the owner had to delete."""
    al = [ch for ch in r['text'] if ch.isalnum()]
    if len(al) > 3:
        return False
    if len(set(al)) == 1:
        return True
    q = r['quad']
    edge = min(q[:, 0].min(), q[:, 1].min(), size[0] - q[:, 0].max(), size[1] - q[:, 1].max()) if size else EDGE
    return edge < EDGE and abs(slant(q)) > 60


def merge(reads, size=None):
    """The best read of each place: by confidence times letters, dropping any whose quad lies over
    half inside a better one (the same name read at another turn or size). <size>: the map's (w, h)."""
    def area(q):
        return abs(cv2.contourArea(np.float32(q)))
    kept = []
    for r in sorted(reads, key=lambda r: -r['conf'] * sum(ch.isalnum() for ch in r['text'])):
        if r['conf'] < MIN_CONF or sum(ch.isalnum() for ch in r['text']) < 2 or noise(r, size):
            continue
        if not any(cv2.intersectConvexConvex(np.float32(r['quad']), np.float32(k['quad']))[0]
                   > 0.5 * max(min(area(r['quad']), area(k['quad'])), 1) for k in kept):
            kept.append(r)
    return [{'text': r['text'], 'box': [int(v) for v in (*r['quad'].min(0).round(), *r['quad'].max(0).round())],
             'slant': round(slant(r['quad']), 1), 'conf': r['conf']} for r in kept]


def main():
    import truststore
    truststore.inject_into_ssl()  # this PC's TLS, for the first model download
    os.environ.setdefault('PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK', 'True')
    from paddleocr import PaddleOCR

    img, out = sys.argv[1], sys.argv[2]
    im = cv2.imdecode(np.fromfile(img, np.uint8), cv2.IMREAD_COLOR)
    # enable_mkldnn off: Paddle 3.3's oneDNN path fails on Windows ("ConvertPirAttribute2RuntimeAttribute").
    # Low detection thresholds: the defaults dropped faint and hand-lettered names (Book 6: 4 more found).
    # Unclip at its default 1.5: 2.0 found no more names and gave boxes 1.3 times the owner's (Book 6).
    ocr = PaddleOCR(use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=True,
                    text_det_limit_side_len=8192, text_det_limit_type='max', enable_mkldnn=False,
                    text_det_thresh=0.2, text_det_box_thresh=0.4, text_det_unclip_ratio=1.5)
    reads = []
    for scale in SCALES:
        for deg in TURNS:
            m, size = turn(im.shape, deg, scale)
            turned = cv2.warpAffine(im, m, size, flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))
            for r in ocr.predict(turned):
                for poly, text, score in zip(r['rec_polys'], r['rec_texts'], r['rec_scores']):
                    reads.append({'text': text.upper().strip(), 'quad': back(poly, m), 'conf': round(float(score), 2)})
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(merge(reads, (im.shape[1], im.shape[0])), f)


if __name__ == '__main__':
    main()
