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


def test_read_book_ignores_files_that_are_not_sections(tree):
    d = tree.book('01xx', {1: sect()})
    (d / 'tssf.htm').write_text('x', encoding='utf-8')
    (d / 'sect1.htm.bak').write_text('x', encoding='utf-8')
    (d / 'sectx.htm').write_text('x', encoding='utf-8')
    assert set(ii.read_book('01xx')) == {1}


def test_read_book_takes_the_combat_name_up_to_the_colon(tree):
    tree.book('01xx', {1: '<p class="combat">Lord: Vashna: <span>COMBAT SKILL</span> 5</p>'})
    assert ii.read_book('01xx')[1][1] == ['Lord: Vashna']   # lazy match stops at the colon before the span


# ---- near ----
def chain():
    # 1 -> 2 -> 3 -> 4 -> 5, fights at 2, 3, 4 and 5; 5 -> 1 closes a loop
    return {1: ([2], [], []), 2: ([3], ['Two'], []), 3: ([4], ['Three'], []), 4: ([5], ['Four'], []), 5: ([1], ['Five'], [])}


def test_near_forwards_reaches_two_links(tree):
    hits = ii.near(chain(), 1, False)
    assert hits == [{'section': 2, 'enemies': ['Two'], 'steps': 1}, {'section': 3, 'enemies': ['Three'], 'steps': 2}]


def test_near_backwards_has_negative_steps(tree):
    hits = ii.near(chain(), 4, True)
    assert hits == [{'section': 3, 'enemies': ['Three'], 'steps': -1}, {'section': 2, 'enemies': ['Two'], 'steps': -2}]


def test_near_skips_places_with_no_fight_and_counts_steps_through_them(tree):
    book = {1: ([2], [], []), 2: ([3], [], []), 3: ([], ['Far'], [])}
    assert ii.near(book, 1, False) == [{'section': 3, 'enemies': ['Far'], 'steps': 2}]
    assert ii.near({1: ([2], [], []), 2: ([3], [], []), 3: ([4], [], []), 4: ([], ['Too far'], [])}, 1, False) == []


def test_near_does_not_loop_or_report_the_start_again(tree):
    book = {1: ([2], ['Home'], []), 2: ([1], ['Two'], [])}
    assert ii.near(book, 1, False) == [{'section': 2, 'enemies': ['Two'], 'steps': 1}]


def test_near_tolerates_links_to_sections_that_are_not_in_the_book(tree):
    assert ii.near({1: ([99], [], [])}, 1, False) == []


def test_near_lists_each_section_once_when_reached_two_ways(tree):
    book = {1: ([2, 3], [], []), 2: ([4], [], []), 3: ([4], [], []), 4: ([], ['Four'], [])}
    assert ii.near(book, 1, False) == [{'section': 4, 'enemies': ['Four'], 'steps': 2}]


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


def test_main_near_combines_both_directions(tree):
    tree.book('01xx', {1: sect(links=[2], foes=['Before']), 2: sect(links=[3], ills=['ill1.png']), 3: sect(foes=['After'])})
    near = tree.run()['01xx/ill1.png']['near']
    assert near == [{'section': 3, 'enemies': ['After'], 'steps': 1}, {'section': 1, 'enemies': ['Before'], 'steps': -1}]


def test_main_merges_the_notes_and_reports_stale_ones(tree, capsys):
    tree.book('01xx', {1: sect(ills=['ill1.png']), 2: sect(ills=['ill2.png'])})
    tree.notes({'01xx/ill1.png': 'a drawn thing', '01xx/ill9.png': 'gone'})
    idx = tree.run('--missing')
    assert idx['01xx/ill1.png']['shows'] == 'a drawn thing' and idx['01xx/ill2.png']['shows'] == ''
    out = capsys.readouterr().out.splitlines()
    assert out[0] == '2 illustrations in 1 books, 1 with a note'
    assert out[1] == 'notes for pictures not found: 01xx/ill9.png'
    assert out[2] == 'no note: 01xx/ill2.png'


def test_main_missing_flag_is_off_by_default(tree, capsys):
    tree.book('01xx', {1: sect(ills=['ill1.png'])})
    tree.run()
    assert 'no note' not in capsys.readouterr().out


def test_main_lists_the_plate_entries_that_borrow_a_picture(tree):
    tree.book('01xx', {1: sect(ills=['ill1.png'])})
    tree.plates([
        {'match': 'giak', 'src': 'data/projectaon/01xx/ill1.png'},
        {'match': '^rat$', 'book': '01xx', 'src': 'data/projectaon/01xx/ill1.png', 'crop': [0, 0, 1, 1]},
        {'match': 'bat', 'src': 'data/projectaon/01xx/ill2.png'},
        {'match': 'other', 'src': 'art/plates/x.webp'}])
    assert tree.run()['01xx/ill1.png']['used_by'] == [{'match': 'giak'}, {'book': '01xx', 'match': '^rat$'}]


def test_main_adds_pictures_found_only_on_disk_with_no_section(tree):
    d = tree.book('01xx', {1: sect(ills=['ill1.png'])})
    (d / 'ill0.png').write_bytes(b'x')
    (d / 'ill1.png').write_bytes(b'x')
    (d / 'map.png').write_bytes(b'x')
    (d / 'illx.png').write_bytes(b'x')
    tree.plates([{'match': 'title', 'src': 'data/projectaon/01xx/ill0.png'}])
    tree.notes({'01xx/ill0.png': 'the title page'})
    idx = tree.run()
    assert sorted(idx) == ['01xx/ill0.png', '01xx/ill1.png']
    assert idx['01xx/ill0.png'] == {'book': '01xx', 'section': None, 'fight': [], 'to': [], 'from': [], 'near': [],
                                    'used_by': [{'match': 'title'}], 'shows': 'the title page'}
    assert idx['01xx/ill1.png']['section'] == 1     # not replaced by the disk scan


def test_main_only_reads_folders_that_look_like_books(tree):
    tree.book('01xx', {1: sect(ills=['ill1.png'])})
    tree.book('work', {1: sect(ills=['ill5.png'])})
    tree.book('x1', {1: sect(ills=['ill6.png'])})
    assert list(tree.run()) == ['01xx/ill1.png']


def test_main_counts_books_and_notes_over_several_books(tree, capsys):
    tree.book('01xx', {1: sect(ills=['ill1.png'])})
    tree.book('02yy', {1: sect(ills=['ill1.png', 'ill2.png'])})
    tree.notes({'02yy/ill2.png': 'x'})
    idx = tree.run()
    assert list(idx) == ['01xx/ill1.png', '02yy/ill1.png', '02yy/ill2.png']     # books in name order
    assert capsys.readouterr().out.strip() == '3 illustrations in 2 books, 1 with a note'


def test_main_sections_sharing_a_picture_each_get_an_entry_key_once(tree):
    # the same file name in two sections of one book is one key; the later (higher) section wins
    tree.book('01xx', {1: sect(ills=['ill1.png']), 2: sect(ills=['ill1.png'])})
    idx = tree.run()
    assert list(idx) == ['01xx/ill1.png'] and idx['01xx/ill1.png']['section'] == 2


def test_main_writes_utf8_json_unescaped(tree):
    tree.book('01xx', {1: sect(foes=['Grünn'], ills=['ill1.png'])})
    tree.run()
    raw = (tree.root / 'data' / 'projectaon' / 'ill-index.json').read_text(encoding='utf-8')
    assert 'Grünn' in raw
