"""plates_file.py beyond anchored/slug/_fits (those are in test_plates_file.py): the file layout, the
lookups, the stand-in picker and put(), all pointed at a temporary project tree. Enemy names and
pictures are made up."""
import json
import os

import pytest

import plates_file as pf

CODE = '02fotw'
WEBP = b'RIFF\x00\x00\x00\x00WEBPVP8 ' + b'\x00' * 8


def book(*enemies):
    """A book dict with one section holding these enemies: names, or (name, art)."""
    es = [{'name': e} if isinstance(e, str) else {'name': e[0], 'art': e[1]} for e in enemies]
    return {'sections': {'1': {'combat': {'enemies': es}}, '2': {'text': []}}}


@pytest.fixture
def tree(tmp_path, monkeypatch):
    monkeypatch.setattr(pf, 'ROOT', str(tmp_path))
    monkeypatch.setattr(pf, 'PLATES', str(tmp_path / 'assets' / 'plates' / 'plates.json'))
    (tmp_path / 'assets' / 'plates').mkdir(parents=True)

    class T:
        root = tmp_path

        def save(self, plates, **head):
            (tmp_path / 'assets' / 'plates' / 'plates.json').write_text(json.dumps({**head, 'plates': plates}), encoding='utf-8')

        def plates(self):
            return json.loads((tmp_path / 'assets' / 'plates' / 'plates.json').read_text(encoding='utf-8'))['plates']

        def file(self, rel, data=b'x'):
            f = tmp_path.joinpath(*rel.split('/'))
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_bytes(data)
            return f

        def exists(self, rel):
            return tmp_path.joinpath(*rel.split('/')).exists()
    t = T()
    t.save([])
    return t


# ---- layout ----


def test_save_and_load_round_trip(tree):
    data = {'note': 'x', 'plates': [{'match': 'a', 'src': 'b', 'crop': [0.1, 0.2, 0.5, 0.5]}]}
    pf.save_plates(data)
    assert pf.load_plates() == data
    assert not os.path.exists(pf.PLATES + '.part')
    assert b'\r' not in open(pf.PLATES, 'rb').read()      # unix newlines, so a change is a one-line diff


# ---- lookups ----


def test_current_a_plain_entry_fills_in_but_does_not_beat_the_books_picture():
    plates = [{'match': 'giak', 'src': 'lib/giak.webp'}, {'match': 'rat', 'src': 'lib/rat.webp'}]
    b = book(('Giak', 'ill1.png'), 'Rat')
    assert pf.current(plates, CODE, b, 'Giak') == ('data/projectaon/02fotw/ill1.png', None)
    assert pf.current(plates, CODE, b, 'Rat') == ('lib/rat.webp', plates[1])


def test_current_an_over_entry_beats_the_books_picture():
    plates = [{'match': 'giak', 'src': 'lib/giak.webp'}, {'match': 'giak', 'src': 'mine.webp', 'over': True}]
    assert pf.current(plates, CODE, book(('Giak', 'ill1.png')), 'Giak') == ('mine.webp', plates[1])


# ---- stand_in_ok ----


# ---- standins ----
BIG = b'x' * (pf.MIN_BYTES + 1)


def test_standins_carry_what_each_picture_is_from_the_index(tree):
    tree.file('data/projectaon/02fotw/ill1.png', BIG)
    tree.file('art/plates/02fotw/eel.webp', BIG)
    tree.file('data/projectaon/ill-index.json', json.dumps({
        '02fotw/ill1.png': {'shows': 'a rat', 'about': 'the rat king', 'near': [], 'fight': []},
        'art/plates/02fotw/eel.webp': {'book': None, 'shows': '', 'about': 'stand-in for the eel', 'near': [], 'fight': []},
    }).encode())
    got = {o['src']: o for o in pf.standins()}
    assert got['data/projectaon/02fotw/ill1.png']['about'] == 'the rat king'
    assert got['data/projectaon/02fotw/ill1.png']['shows'] == 'a rat'
    assert got['art/plates/02fotw/eel.webp']['about'] == 'stand-in for the eel'


# ---- put ----
def test_put_unknown_enemy(tree):
    with pytest.raises(ValueError, match='no enemy of that name'):
        pf.put(CODE, book('Rat'), 'Eel', image=WEBP)


def test_put_saves_a_new_picture_as_the_top_entry(tree):
    tree.save([{'match': 'rat', 'src': 'lib/rat.webp'}])
    entry, msg = pf.put(CODE, book('Rat Chief', 'Rat'), 'Rat Chief', image=WEBP)
    assert msg == 'saved'
    assert entry == {'match': '^rat chief$', 'book': CODE, 'src': 'art/plates/02fotw/rat-chief.webp'}
    assert tree.plates()[0] == entry and tree.plates()[1] == {'match': 'rat', 'src': 'lib/rat.webp'}
    assert (tree.root / 'art' / 'plates' / CODE / 'rat-chief.webp').read_bytes() == WEBP
    assert not tree.exists('art/plates/02fotw/rat-chief.webp.part')


def test_put_a_new_picture_drops_the_old_ones_upscaled_copy(tree):
    # the player shows the -2x copy of a listed picture: left behind, it shows the picture replaced
    tree.file('art/plates/02fotw/rat.webp', b'old')
    tree.file('art/plates/02fotw/rat-2x.webp', b'old2x')
    tree.file('assets/plates/upscaled/02fotw.json', json.dumps({'_readme': 'r', 'srcs': ['art/plates/02fotw/rat.webp', 'lib/eel.webp']}).encode())
    pf.put(CODE, book('Rat'), 'Rat', image=WEBP)
    assert not tree.exists('art/plates/02fotw/rat-2x.webp')
    listed = json.loads((tree.root / 'assets' / 'plates' / 'upscaled' / '02fotw.json').read_text(encoding='utf-8'))
    assert listed == {'_readme': 'r', 'srcs': ['lib/eel.webp']}


def test_put_rejects_a_picture_that_is_not_webp(tree):
    for bad in (b'', b'RIFF\x00\x00\x00\x00WAVEfmt ', b'\x89PNG\r\n\x1a\n' + b'0' * 20):
        with pytest.raises(ValueError, match='must be WebP'):
            pf.put(CODE, book('Rat'), 'Rat', image=bad)
    assert tree.plates() == []


def test_put_without_an_image_keeps_the_picture_it_has(tree):
    tree.save([{'match': '^rat$', 'book': CODE, 'src': 'art/plates/02fotw/rat.webp'}])
    entry, _ = pf.put(CODE, book('Rat'), 'Rat', crop=[0.25, 0.25, 0.5, 0.5])
    assert entry == {'match': '^rat$', 'book': CODE, 'src': 'art/plates/02fotw/rat.webp', 'crop': [0.25, 0.25, 0.5, 0.5]}


@pytest.mark.parametrize('crop,expect', [
    ([0.1, 0.2, 0.5, 0.5], [0.1, 0.2, 0.5, 0.5]),
    ([0, 0, 1, 1], None),                                   # the whole picture is no crop
    ([0.0, 0.0, 1.0, 1.0], None),
    ([0.5, 0, 1, 1], [0.5, 0, 0.5, 1]),                     # the rectangle is trimmed to the picture
    ([-1, -1, 0.5, 0.5], [0, 0, 0.5, 0.5]),
    ([0.123456, 0.2, 0.3, 0.3], [0.1235, 0.2, 0.3, 0.3]),   # four decimals
    ([0, 0, 0.5, 1], [0, 0, 0.5, 1]),                       # whole numbers stay ints, not 0.0
    ([2, 0, 1, 1], None),                                   # clamps to x=1, w=0: too small
])
def test_put_crop(tree, crop, expect):
    if expect is None and crop in ([2, 0, 1, 1],):
        with pytest.raises(ValueError, match='crop too small'):
            pf.put(CODE, book('Rat'), 'Rat', image=WEBP, crop=crop)
        return
    entry, _ = pf.put(CODE, book('Rat'), 'Rat', image=WEBP, crop=crop)
    assert entry.get('crop') == expect
    if expect:
        assert [type(v) for v in entry['crop']] == [type(v) for v in expect]


def test_put_flip_is_kept_only_when_set(tree):
    entry, _ = pf.put(CODE, book('Rat'), 'Rat', image=WEBP, flip=True)
    assert entry['flip'] is True
    assert tree.plates()[0]['flip'] is True
    entry, _ = pf.put(CODE, book('Rat'), 'Rat')                  # saved again unflipped
    assert 'flip' not in entry


@pytest.mark.parametrize('levels', [[200, 10], [10, 10], [-1, 100], [0, 256], [1], [1, 2, 3], 'ab', [0, 'x']])
def test_put_levels_must_be_black_below_white_within_0_255(tree, levels):
    with pytest.raises(ValueError, match='levels must be'):
        pf.put(CODE, book('Rat'), 'Rat', image=WEBP, levels=levels)


def test_put_remove_takes_the_entry_its_file_and_its_link(tree):
    import art_sources
    own = tree.file('art/plates/02fotw/rat.webp')
    art_sources.record('art/plates/02fotw/rat.webp', 'https://example.org/rat.png')
    tree.save([{'match': 'z', 'src': 'z'}, {'match': '^rat$', 'book': CODE, 'src': 'art/plates/02fotw/rat.webp'}])
    assert pf.put(CODE, book('Rat'), 'Rat', remove=True) == (None, 'removed')
    assert tree.plates() == [{'match': 'z', 'src': 'z'}] and not own.exists()
    assert art_sources.load() == {}  # deleted on purpose: nothing to fetch again


