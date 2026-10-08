"""PaddleOCR's reading of a map, for map_labels.py: each label's box and wording.

Run by map_labels.py in its own venv, tools/.venv-paddle (Python 3.12: PaddlePaddle has no build for
the main venv's 3.14). Set up with:
  uv venv --system-certs --python 3.12 tools/.venv-paddle
  uv pip install --system-certs --python tools/.venv-paddle/Scripts/python.exe paddlepaddle paddleocr truststore
  tools/.venv-paddle/Scripts/python.exe tools/map_ocr_paddle.py <image> <out.json>

Writes [{"text", "box": [x0, y0, x1, y1], "conf"}]. The models (PP-OCR, about 100 MB) download
to ~/.paddlex on the first run. On Book 4 (2026-10-07) it read about 55 of 62 labels right,
slanted ones included, where EasyOCR read about 30. About a minute a map on the CPU.
"""
import json
import os
import sys

import truststore

truststore.inject_into_ssl()  # this PC's TLS, for the first model download
os.environ.setdefault('PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK', 'True')
from paddleocr import PaddleOCR  # noqa: E402

img, out = sys.argv[1], sys.argv[2]
# enable_mkldnn off: Paddle 3.3's oneDNN path fails on Windows ("ConvertPirAttribute2RuntimeAttribute")
ocr = PaddleOCR(use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=True,
                text_det_limit_side_len=2048, text_det_limit_type='max', enable_mkldnn=False)
reads = []
for r in ocr.predict(img):
    for poly, text, score in zip(r['rec_polys'], r['rec_texts'], r['rec_scores']):
        xs, ys = [int(p[0]) for p in poly], [int(p[1]) for p in poly]
        reads.append({'text': text.upper().strip(), 'box': [min(xs), min(ys), max(xs), max(ys)],
                      'conf': round(float(score), 2)})
with open(out, 'w', encoding='utf-8') as f:
    json.dump(reads, f)
