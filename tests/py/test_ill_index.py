"""tools/ill_index.py, pointed at a temporary data/ and assets/ tree of made-up section pages."""
import json
import sys

import pytest

import ill_index as ii


def sect(links=(), foes=(), ills=(), extra=''):
    body = ''.join(f'<p class="choice">Go <a href="sect{n}.htm">{n}</a>.</p>' for n in links)
    body += ''.join(f'<p class="combat">{f}: <span>COMBAT SKILL</span> 5 <span>ENDURANCE</span> 5</p>' for f in foes)
    body += ''.join(f'<img src="{i}"/>' for i in ills)
    return f'<html><article>{body}{extra}</article></html>'


@pytest.fixture
def tree(tmp_path, monkeypatch):
    pa = tmp_path / 'data' / 'projectaon'
    pa.mkdir(parents=True)
    plates = tmp_path / 'assets' / 'plates'
    plates.mkdir(parents=True)
    (plates / 'plates.json').write_text(json.dumps({'plates': []}), encoding='utf-8')
    monkeypatch.setattr(ii, 'ROOT', str(tmp_path))
    monkeypatch.setattr(ii, 'PA', str(pa))
    monkeypatch.setattr(ii, 'OUT', str(pa / 'ill-index.json'))
    monkeypatch.setattr(ii, 'NOTES', str(pa / 'ill-notes.json'))
    monkeypatch.setattr(ii, 'PLATES', str(plates / 'plates.json'))

    class T:
        root = tmp_path

        def book(self, code, pages):
            d = pa / code
            d.mkdir(exist_ok=True)
            for n, html in pages.items():
                (d / f'sect{n}.htm').write_text(html, encoding='utf-8')
            return d

        def plates(self, entries):
            (plates / 'plates.json').write_text(json.dumps({'plates': entries}), encoding='utf-8')

        def notes(self, d):
            (pa / 'ill-notes.json').write_text(json.dumps(d), encoding='utf-8')

        def run(self, *flags):
            monkeypatch.setattr(sys, 'argv', ['ill_index.py', *flags])
            ii.main()
            return json.loads((pa / 'ill-index.json').read_text(encoding='utf-8'))
    return T()


# ---- read_book ----
def test_read_book_finds_links_fights_and_pictures_per_section(tree):
    tree.book('01xx', {
        3: sect(links=[5, 4, 5, 3], foes=['Giak', 'Doom &amp; Gloom'], ills=['ill10.png', 'ill2.png', 'ill2.png', 'map.png']),
        12: sect(), })
    got = ii.read_book('01xx')
    assert set(got) == {3, 12}
    links, foes, ills = got[3]
    assert links == [4, 5]                      # sorted, unique, not itself
    assert foes == ['Giak', 'Doom & Gloom']     # entities decoded
    assert ills == ['ill2.png', 'ill10.png']    # numeric order, unique, only ill*.png
    assert got[12] == ([], [], [])


# ---- near ----
def chain():
    # 1 -> 2 -> 3 -> 4 -> 5, fights at 2, 3, 4 and 5; 5 -> 1 closes a loop
    return {1: ([2], [], []), 2: ([3], ['Two'], []), 3: ([4], ['Three'], []), 4: ([5], ['Four'], []), 5: ([1], ['Five'], [])}


def test_near_forwards_reaches_two_links(tree):
    hits = ii.near(chain(), 1, False)
    assert hits == [{'section': 2, 'enemies': ['Two'], 'steps': 1}, {'section': 3, 'enemies': ['Three'], 'steps': 2}]


# ---- main ----
def test_main_builds_the_index_entry_for_each_picture(tree, capsys):
    tree.book('01xx', {
        1: sect(links=[2, 3]),
        2: sect(links=[3], foes=['Giak'], ills=['ill1.png']),
        3: sect(links=[1], foes=['Rat']),
    })
    idx = tree.run()
    assert list(idx) == ['01xx/ill1.png']
    e = idx['01xx/ill1.png']
    assert e['book'] == '01xx' and e['section'] == 2
    assert e['fight'] == ['Giak'] and e['to'] == [3] and e['from'] == [1]
    assert {(n['section'], n['steps']) for n in e['near']} == {(3, 1), (3, -2)}   # 3 is one step on, and two steps back (3 -> 1 -> 2)
    assert e['used_by'] == [] and e['shows'] == ''
    assert capsys.readouterr().out.strip() == '1 illustrations in 1 books, 0 with a note'


def test_main_merges_the_notes_and_reports_stale_ones(tree, capsys):
    tree.book('01xx', {1: sect(ills=['ill1.png']), 2: sect(ills=['ill2.png'])})
    tree.notes({'01xx/ill1.png': 'a drawn thing', '01xx/ill9.png': 'gone'})
    idx = tree.run('--missing')
    assert idx['01xx/ill1.png']['shows'] == 'a drawn thing' and idx['01xx/ill2.png']['shows'] == ''
    out = capsys.readouterr().out.splitlines()
    assert out[0] == '2 illustrations in 1 books, 1 with a note'
    assert out[1] == 'notes for pictures not found: 01xx/ill9.png'
    assert out[2] == 'no note: 01xx/ill2.png'


