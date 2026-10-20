"""map_missed.py: tiling the map, reading Claude's answer, and adding what it found to the label
list, fitted to the ink. Claude is not called: a stand-in answers. Stand-in images only."""
import json
import sys

import cv2
import numpy as np

import map_missed

PAPER, INK = (190, 215, 232), (20, 20, 20)


def test_tiles_cover_the_map_within_claudes_size():
    rects = map_missed.tiles(2048, 1556)
    assert all(r[2] - r[0] <= map_missed.TILE and r[3] - r[1] <= map_missed.TILE for r in rects)
    cover = np.zeros((1556, 2048), bool)
    for x0, y0, x1, y1 in rects:
        cover[y0:y1, x0:x1] = True
    assert cover.all()
    assert map_missed.tiles(800, 600) == [[0, 0, 800, 600]]


def test_parse_takes_the_json_list_and_skips_malformed_entries():
    reply = 'Here they are:\n[{"tile": 1, "text": "HOLM", "box": [1, 2, 30, 12]}, {"tile": 2, "text": ""}, {"text": "X"}]'
    assert map_missed.parse(reply) == [{'tile': 1, 'text': 'HOLM', 'box': [1, 2, 30, 12]}]
    assert map_missed.parse('none') == [] and map_missed.parse('[not json]') == []


def test_main_adds_what_claude_found_fitted_to_the_ink_and_marked(tmp_path, monkeypatch, capsys):
    im = np.full((600, 900, 3), PAPER, np.uint8)
    cv2.putText(im, 'HOLM', (100, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, INK, 2)   # listed already
    cv2.putText(im, 'TORAN', (500, 400), cv2.FONT_HERSHEY_SIMPLEX, 0.8, INK, 2)  # missed by OCR
    cv2.imencode('.png', im)[1].tofile(str(tmp_path / 'map.png'))
    lab = tmp_path / 'labels.json'
    lab.write_text(json.dumps([{'text': 'HOLM', 'box': [95, 180, 180, 205], 'retype': True}]), encoding='utf-8')

    seen = {}
    def fake_ask(pictures):
        seen['n'] = len(pictures)
        # one tile; the missed name with a rough box, and the listed one again
        return ('[{"tile": 1, "text": "Toran", "box": [490, 375, 600, 410]},'
                ' {"tile": 1, "text": "HOLM", "box": [98, 182, 178, 204]}]', {'input_tokens': 900, 'output_tokens': 40})
    monkeypatch.setattr(map_missed, 'ask', fake_ask)
    monkeypatch.setattr(sys, 'argv', ['map_missed.py', str(tmp_path / 'map.png'), str(lab)])
    map_missed.main()

    labels = json.loads(lab.read_text(encoding='utf-8'))
    assert seen['n'] == 1 and len(labels) == 2
    new = labels[1]
    assert new['text'] == 'Toran'  # in its printed case and new['found'] == 'claude' and new['retype'] is True
    x0, y0, x1, y1 = new['box']
    assert 495 <= x0 <= 502 and 380 <= y0 <= 390 and 570 <= x1 <= 585 and 400 <= y1 <= 408  # the ink's, not Claude's
    assert (tmp_path / 'labels.json.bak').exists()
    out = capsys.readouterr().out
    assert '1 added' in out and '940 tokens' in out and 'Toran' not in out  # counts only, never wordings


def test_ask_runs_claude_lean_and_outside_the_project(monkeypatch):
    calls = {}
    class R:
        returncode, stderr = 0, ''
        stdout = json.dumps({'type': 'result', 'result': '[]', 'usage': {'input_tokens': 5}})
    def run(argv, **kw):
        calls.update(argv=argv, **kw)
        return R()
    reply, usage = map_missed.ask([np.zeros((10, 10, 3), np.uint8)], run=run)
    assert reply == '[]' and usage == {'input_tokens': 5}
    a = calls['argv']
    assert a[a.index('--model') + 1] == 'sonnet' and a[a.index('--tools') + 1] == ''
    assert 'lone-wolf' not in str(calls['cwd'])  # no CLAUDE.md or project settings loaded
    msg = json.loads(calls['input'])
    assert [c['type'] for c in msg['message']['content']] == ['image', 'text']
