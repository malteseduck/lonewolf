"""Measure each lettered label's ink on the scan, as map_letter.py does, and keep it in the label list
so the map editor's preview starts from what map_letter.py will set.

Run (from the project root):
  uv run --no-project --python tools/.venv/Scripts/python.exe python tools/map_measure.py <map-2k.png> <maps/<book>/labels.json>

Writes "ink": {"at": [x, y] (centre), "angle" (degrees, y down, the reading direction), "length",
"thick" (px on map-2k), "box" (the box it was measured in)} into every "retype" or "fix" label. It
ignores any "angle" set by hand, so the editor can show both. map_letter.py does not read "ink": it
measures again, so a box moved since is never set from a stale measure (the editor flags those).
"""
import argparse
import json
import math
from pathlib import Path

from map_letter import geometry, read
from map_erase import LabelInk


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('faithful')
    ap.add_argument('labels')
    a = ap.parse_args()
    path = Path(a.labels)
    labels = json.loads(path.read_text(encoding='utf-8'))
    scan_ink = LabelInk(read(a.faithful))
    n = 0
    for lab in labels:
        if not (lab.get('retype') or lab.get('fix')):
            lab.pop('ink', None)
            continue
        raw = {k: v for k, v in lab.items() if k != 'angle'}
        if scan_ink.mask(raw).sum() < 2:  # no ink in the box to measure
            lab.pop('ink', None)
            continue
        c, ang, length, thick = geometry(scan_ink, raw)
        lab['ink'] = {'at': [round(float(c[0]), 1), round(float(c[1]), 1)],
                      'angle': round(math.degrees(ang), 2),
                      'length': round(float(length), 1), 'thick': round(float(thick), 1),
                      'box': list(lab['box'])}
        n += 1
    path.write_text(json.dumps(labels, indent=1), encoding='utf-8')
    print(f'{path}: measured {n} of {len(labels)} labels')


if __name__ == '__main__':
    main()
