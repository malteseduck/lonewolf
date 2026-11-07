"""Measure each lettered label's ink on the scan, as map_letter.py does, and keep it in the label list
so the map editor's preview starts from what map_letter.py will set.

Run (from the project root):
  uv run --project tools python tools/map_measure.py <map-2k.png> <maps/<book>/labels.json> [--hand FONT] [--caps FONT]

Writes "ink": {"at": [x, y] (centre), "angle" (degrees, y down, the reading direction), "length",
"thick" (px on map-2k), "box" (the box it was measured in), "from_box": true where the ink spanned
too little of the box and the box was taken instead (map_letter.from_box), "fit": {"at", "angle",
"size"} where the type goes, fitted over the ink by map_fit.py as the Letter step fits it (no nudge;
a hand "angle" kept)} into every "retype" or "fix" label. The rest ignores any "angle" set by hand,
so the editor can show both. map_letter.py does not read "ink": it
measures again, so a box moved since is never set from a stale measure (the editor flags those).
"""
import argparse
import json
import math
from pathlib import Path

import map_fit
import map_letter
from map_letter import from_box, geometry, read
from map_erase import LabelInk


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('faithful')
    ap.add_argument('labels')
    ap.add_argument('--hand', default='Cabin.ttf|SemiBold')  # maps/<book>/font.txt's, as map_letter.py takes them
    ap.add_argument('--caps', default='Cabin.ttf|SemiBold')
    a = ap.parse_args()
    hand, caps = map_letter.FONTS / a.hand, map_letter.FONTS / a.caps
    path = Path(a.labels)
    labels = json.loads(path.read_text(encoding='utf-8'))
    scan_ink = LabelInk(read(a.faithful), labels)
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
        if from_box(scan_ink, raw):  # too little ink to go by: the editor marks it to be checked
            lab['ink']['from_box'] = True
        if map_fit.fittable(lab):
            fc, fa, fs = map_fit.placement(scan_ink, lab, hand, caps)
            lab['ink']['fit'] = {'at': [round(float(fc[0]), 1), round(float(fc[1]), 1)],
                                 'angle': round(math.degrees(fa), 2), 'size': round(float(fs), 2)}
        n += 1
    path.write_text(json.dumps(labels, indent=1), encoding='utf-8')
    print(f'{path}: measured {n} of {len(labels)} labels')


if __name__ == '__main__':
    main()
