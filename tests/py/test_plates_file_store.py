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
def test_entry_puts_the_known_keys_first_in_order_then_the_rest():
    e = {'zzz': 1, 'src': 'a.webp', 'over': True, 'match': 'x', 'extra': [1, 2], 'book': '02fotw', 'levels': [1, 2], 'crop': [0, 0, 1, 1]}
    assert pf._entry(e) == ('{ "match": "x", "book": "02fotw", "src": "a.webp", "crop": [0, 0, 1, 1], "levels": [1, 2], '
                            '"over": true, "zzz": 1, "extra": [1, 2] }')


def test_entry_keeps_non_ascii_text():
    assert pf._entry({'match': 'grünn'}) == '{ "match": "grünn" }'


def test_dump_plates_is_one_entry_per_line_after_the_other_keys():
    data = {'version': 2, 'note': 'hi', 'plates': [{'match': 'a', 'src': 'x'}, {'match': 'b', 'src': 'y'}]}
    text = pf.dump_plates(data)
    assert text == ('{\n  "version": 2,\n  "note": "hi",\n  "plates": [\n'
                    '    { "match": "a", "src": "x" },\n    { "match": "b", "src": "y" }\n  ]\n}\n')
    assert json.loads(text) == data


def test_dump_plates_with_no_entries_is_valid_json():
    assert json.loads(pf.dump_plates({'plates': []})) == {'plates': []}


def test_save_and_load_round_trip(tree):
    data = {'note': 'x', 'plates': [{'match': 'a', 'src': 'b', 'crop': [0.1, 0.2, 0.5, 0.5]}]}
    pf.save_plates(data)
    assert pf.load_plates() == data
    assert not os.path.exists(pf.PLATES + '.part')
    assert b'\r' not in open(pf.PLATES, 'rb').read()      # unix newlines, so a change is a one-line diff


# ---- lookups ----
def test_book_art_finds_the_books_own_picture(tree):
    b = book(('Giak', 'ill1.png'), 'Rat')
    assert pf.book_art(b, 'Giak') == 'ill1.png'
    assert pf.book_art(b, 'Rat') is None and pf.book_art(b, 'Nobody') is None


def test_book_art_takes_the_first_section_that_has_one():
    b = {'sections': {'1': {'combat': {'enemies': [{'name': 'Rat'}]}},
                      '2': {'combat': {'enemies': [{'name': 'Rat', 'art': 'ill2.png'}]}},
                      '3': {'combat': {'enemies': [{'name': 'Rat', 'art': 'ill3.png'}]}}}}
    assert pf.book_art(b, 'Rat') == 'ill2.png'


def test_enemy_names_is_the_set_of_every_enemy():
    assert pf.enemy_names(book('Rat', ('Giak', 'a.png'))) == {'Rat', 'Giak'}
    assert pf.enemy_names({'sections': {}}) == set()


def test_current_book_picture_when_no_entry_fits():
    assert pf.current([], CODE, book(('Giak', 'ill1.png')), 'Giak') == ('data/projectaon/02fotw/ill1.png', None)
    assert pf.current([], CODE, book('Rat'), 'Rat') == (None, None)


def test_current_a_plain_entry_fills_in_but_does_not_beat_the_books_picture():
    plates = [{'match': 'giak', 'src': 'lib/giak.webp'}, {'match': 'rat', 'src': 'lib/rat.webp'}]
    b = book(('Giak', 'ill1.png'), 'Rat')
    assert pf.current(plates, CODE, b, 'Giak') == ('data/projectaon/02fotw/ill1.png', None)
    assert pf.current(plates, CODE, b, 'Rat') == ('lib/rat.webp', plates[1])


def test_current_an_over_entry_beats_the_books_picture():
    plates = [{'match': 'giak', 'src': 'lib/giak.webp'}, {'match': 'giak', 'src': 'mine.webp', 'over': True}]
    assert pf.current(plates, CODE, book(('Giak', 'ill1.png')), 'Giak') == ('mine.webp', plates[1])


def test_current_first_fitting_entry_wins_and_book_limits_apply():
    plates = [{'match': 'rat', 'book': '05sots', 'src': 'other.webp'}, {'match': 'rat', 'src': 'first.webp'}, {'match': 'rat', 'src': 'second.webp'}]
    assert pf.current(plates, CODE, book('Rat'), 'Rat')[0] == 'first.webp'


# ---- stand_in_ok ----
@pytest.mark.parametrize('src,ok', [
    ('assets/plates/a.webp', True), ('art/plates/x/b.PNG', True), ('data/projectaon/01xx/ill1.jpg', True),
    ('data/reference/c.jpeg', True),
    ('assets/plates/missing.webp', False),               # no such file
    ('assets/plates/a.txt', False),                      # not an image type
    ('other/a.webp', False),                             # not under assets/, art/ or data/
    ('assets/../art/plates/x/b.PNG', False),             # parent step
    ('/assets/plates/a.webp', False),
    ('assets\\plates\\a.webp', False),
    ('assets/plates', False),
    ('', False), (None, False), (5, False), (['assets/plates/a.webp'], False),
])
def test_stand_in_ok(tree, src, ok):
    for rel in ('assets/plates/a.webp', 'art/plates/x/b.PNG', 'data/projectaon/01xx/ill1.jpg', 'data/reference/c.jpeg', 'assets/plates/a.txt', 'other/a.webp'):
        tree.file(rel)
    assert pf.stand_in_ok(src) is ok


# ---- standins ----
BIG = b'x' * (pf.MIN_BYTES + 1)


def test_standins_groups_sizes_and_skips(tree):
    tree.file('assets/plates/lib.webp', BIG)
    tree.file('assets/plates/sub/deep.png', BIG)
    tree.file('assets/plates/small.png', b'x' * (pf.MIN_BYTES - 1))        # an icon or fragment
    tree.file('assets/plates/readme.txt', BIG)
    tree.file('art/plates/02fotw/mine.webp', BIG)
    tree.file('art/borrowed.jpg', BIG)
    tree.file('art/reference/map-symbols/frag.png', BIG)                   # skipped folders, at any depth
    tree.file('art/work/tmp.png', BIG)
    tree.file('data/reference/fan.png', BIG)
    tree.file('data/projectaon/01xx/ill1.png', b'tiny')                   # a book's pictures are kept whatever their size
    tree.file('data/projectaon/01xx/map.png', BIG)                       # only ill*.png
    tree.file('data/projectaon/01xx/ill2.PNG', b'tiny')
    tree.file('data/projectaon/loose.png', BIG)                          # not in a book folder
    got = {o['src']: o for o in pf.standins()}
    assert set(got) == {
        'assets/plates/lib.webp', 'assets/plates/sub/deep.png', 'art/plates/02fotw/mine.webp', 'art/borrowed.jpg',
        'data/reference/fan.png', 'data/projectaon/01xx/ill1.png', 'data/projectaon/01xx/ill2.PNG'}
    assert got['assets/plates/lib.webp'] == {'src': 'assets/plates/lib.webp', 'group': 'library', 'size': len(BIG)}
    assert got['art/plates/02fotw/mine.webp']['group'] == 'yours'            # art/plates is walked twice: the first group wins
    assert got['art/borrowed.jpg']['group'] == 'art' and got['data/reference/fan.png']['group'] == 'art'
    assert got['data/projectaon/01xx/ill1.png'] == {'src': 'data/projectaon/01xx/ill1.png', 'group': 'book 01xx', 'size': 4}


def test_standins_with_no_folders_is_empty(tree):
    assert pf.standins() == []


def test_standins_adds_shows_and_near_from_the_illustration_index(tree):
    tree.file('data/projectaon/01xx/ill1.png', b'x')
    tree.file('data/projectaon/01xx/ill2.png', b'x')
    idx = {'01xx/ill1.png': {'shows': 'a thing', 'fight': ['Rat'], 'near': [{'enemies': ['Rat', 'Bat']}, {'enemies': ['Owl', 'Bat']}]},
           '01xx/ill9.png': {'shows': 'not on disk', 'fight': [], 'near': []}}
    tree.file('data/projectaon/ill-index.json', json.dumps(idx).encode())
    got = {o['src']: o for o in pf.standins()}
    one, two = got['data/projectaon/01xx/ill1.png'], got['data/projectaon/01xx/ill2.png']
    assert one['shows'] == 'a thing' and one['near'] == ['Bat', 'Owl']      # sorted; the fight's own enemy left out
    assert 'shows' not in two and 'near' not in two
    assert 'data/projectaon/01xx/ill9.png' not in got


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


def test_put_file_is_laid_out_one_entry_per_line(tree):
    pf.put(CODE, book('Rat'), 'Rat', image=WEBP)
    lines = (tree.root / 'assets' / 'plates' / 'plates.json').read_text(encoding='utf-8').splitlines()
    assert lines[-3].startswith('    { "match": "^rat$", "book": "02fotw"')


def test_put_rejects_a_picture_that_is_not_webp(tree):
    for bad in (b'', b'RIFF\x00\x00\x00\x00WAVEfmt ', b'\x89PNG\r\n\x1a\n' + b'0' * 20):
        with pytest.raises(ValueError, match='must be WebP'):
            pf.put(CODE, book('Rat'), 'Rat', image=bad)
    assert tree.plates() == []


def test_put_over_only_where_it_is_needed(tree):
    b = book(('Giak', 'ill1.png'), 'Rat', 'Bat')
    assert pf.put(CODE, b, 'Giak', image=WEBP)[0]['over'] is True       # the book has its own picture
    assert 'over' not in pf.put(CODE, b, 'Rat', image=WEBP)[0]
    tree.save([{'match': 'bat', 'src': 'lib/bat.webp', 'over': True}])
    assert pf.put(CODE, b, 'Bat', image=WEBP)[0]['over'] is True       # an over entry would otherwise win
    tree.save([{'match': 'bat', 'book': '05sots', 'src': 'lib/bat.webp', 'over': True}])
    assert 'over' not in pf.put(CODE, b, 'Bat', image=WEBP)[0]         # that one is for another book


def test_put_replacing_my_entry_keeps_its_place(tree):
    tree.save([{'match': 'a', 'src': 'a'}, {'match': '^rat$', 'book': CODE, 'src': 'art/plates/02fotw/rat.webp'}, {'match': 'z', 'src': 'z'}])
    pf.put(CODE, book('Rat'), 'Rat', image=WEBP)
    plates = tree.plates()
    assert [p['match'] for p in plates] == ['a', '^rat$', 'z']
    assert plates[1]['src'] == 'art/plates/02fotw/rat.webp'


def test_put_without_an_image_keeps_the_picture_it_has(tree):
    tree.save([{'match': '^rat$', 'book': CODE, 'src': 'art/plates/02fotw/rat.webp'}])
    entry, _ = pf.put(CODE, book('Rat'), 'Rat', crop=[0.25, 0.25, 0.5, 0.5])
    assert entry == {'match': '^rat$', 'book': CODE, 'src': 'art/plates/02fotw/rat.webp', 'crop': [0.25, 0.25, 0.5, 0.5]}


def test_put_without_an_image_starts_from_what_the_player_shows_now(tree):
    tree.save([{'match': 'rat', 'src': 'assets/plates/rat.webp'}])
    entry, _ = pf.put(CODE, book('Rat', ('Giak', 'ill1.png')), 'Rat', levels=[10, 200])
    assert entry['src'] == 'assets/plates/rat.webp' and entry['levels'] == [10, 200]
    entry, _ = pf.put(CODE, book('Rat', ('Giak', 'ill1.png')), 'Giak', crop=[0, 0, 0.5, 0.5])
    assert entry['src'] == 'data/projectaon/02fotw/ill1.png' and entry['over'] is True


def test_put_with_nothing_to_start_from_asks_for_a_picture(tree):
    with pytest.raises(ValueError, match='no picture yet'):
        pf.put(CODE, book('Rat'), 'Rat')


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


@pytest.mark.parametrize('crop', [[0, 0, 0.01, 1], [0, 0, 1, 0.01], [0.99, 0, 0.5, 1]])
def test_put_crop_too_small(tree, crop):
    with pytest.raises(ValueError, match='crop too small'):
        pf.put(CODE, book('Rat'), 'Rat', image=WEBP, crop=crop)


@pytest.mark.parametrize('crop', ['x', [1, 2, 3], [1, 2, 3, 4, 5], [0, 0, 'a', 1], (0, 0, 1, 1), {}])
def test_put_crop_must_be_four_numbers(tree, crop):
    with pytest.raises(ValueError, match=r'crop must be \[x, y, w, h\]'):
        pf.put(CODE, book('Rat'), 'Rat', image=WEBP, crop=crop)


@pytest.mark.parametrize('levels', [[200, 10], [10, 10], [-1, 100], [0, 256], [1], [1, 2, 3], 'ab', [0, 'x']])
def test_put_levels_must_be_black_below_white_within_0_255(tree, levels):
    with pytest.raises(ValueError, match='levels must be'):
        pf.put(CODE, book('Rat'), 'Rat', image=WEBP, levels=levels)


def test_put_levels_are_stored_as_ints(tree):
    assert pf.put(CODE, book('Rat'), 'Rat', image=WEBP, levels=[10.0, 255])[0]['levels'] == [10, 255]
    assert pf.put(CODE, book('Rat'), 'Rat', image=WEBP, levels=[0, 255])[0]['levels'] == [0, 255]


def test_put_a_stand_in_picture(tree):
    tree.file('assets/plates/other.webp')
    entry, msg = pf.put(CODE, book('Rat'), 'Rat', src='assets/plates/other.webp')
    assert msg == 'saved' and entry == {'match': '^rat$', 'book': CODE, 'src': 'assets/plates/other.webp'}


def test_put_stand_in_checks(tree):
    with pytest.raises(ValueError, match='not both'):
        pf.put(CODE, book('Rat'), 'Rat', image=WEBP, src='assets/plates/other.webp')
    with pytest.raises(ValueError, match='stand-in is not a picture'):
        pf.put(CODE, book('Rat'), 'Rat', src='assets/plates/missing.webp')
    with pytest.raises(ValueError, match='stand-in is not a picture'):
        pf.put(CODE, book('Rat'), 'Rat', src='../outside.webp')
    assert tree.plates() == []


def test_put_stand_in_deletes_the_old_own_file_when_nothing_else_uses_it(tree):
    own = tree.file('art/plates/02fotw/rat.webp')
    tree.file('assets/plates/other.webp')
    tree.save([{'match': '^rat$', 'book': CODE, 'src': 'art/plates/02fotw/rat.webp'}])
    pf.put(CODE, book('Rat'), 'Rat', src='assets/plates/other.webp')
    assert not own.exists()


def test_put_stand_in_keeps_the_old_file_while_another_entry_uses_it(tree):
    own = tree.file('art/plates/02fotw/rat.webp')
    tree.file('assets/plates/other.webp')
    tree.save([{'match': '^rat$', 'book': CODE, 'src': 'art/plates/02fotw/rat.webp'},
               {'match': '^bat$', 'book': CODE, 'src': 'art/plates/02fotw/rat.webp'}])
    pf.put(CODE, book('Rat', 'Bat'), 'Rat', src='assets/plates/other.webp')
    assert own.exists()


def test_put_stand_in_never_deletes_a_file_outside_the_owners_folder(tree):
    lib = tree.file('assets/plates/lib.webp')
    tree.file('assets/plates/other.webp')
    tree.save([{'match': '^rat$', 'book': CODE, 'src': 'assets/plates/lib.webp'}])
    pf.put(CODE, book('Rat'), 'Rat', src='assets/plates/other.webp')
    assert lib.exists()


def test_put_the_same_stand_in_again_keeps_its_own_file(tree):
    own = tree.file('art/plates/02fotw/rat.webp')
    tree.save([{'match': '^rat$', 'book': CODE, 'src': 'art/plates/02fotw/rat.webp'}])
    entry, _ = pf.put(CODE, book('Rat'), 'Rat', src='art/plates/02fotw/rat.webp')
    assert own.exists() and entry['src'] == 'art/plates/02fotw/rat.webp'


def test_put_remove_takes_the_entry_and_its_file(tree):
    own = tree.file('art/plates/02fotw/rat.webp')
    tree.save([{'match': 'z', 'src': 'z'}, {'match': '^rat$', 'book': CODE, 'src': 'art/plates/02fotw/rat.webp'}])
    assert pf.put(CODE, book('Rat'), 'Rat', remove=True) == (None, 'removed')
    assert tree.plates() == [{'match': 'z', 'src': 'z'}] and not own.exists()


def test_put_remove_keeps_a_file_another_entry_uses_or_that_is_not_the_owners(tree):
    shared = tree.file('art/plates/02fotw/shared.webp')
    lib = tree.file('assets/plates/lib.webp')
    tree.save([{'match': '^rat$', 'book': CODE, 'src': 'art/plates/02fotw/shared.webp'},
               {'match': '^bat$', 'book': CODE, 'src': 'art/plates/02fotw/shared.webp'},
               {'match': '^owl$', 'book': CODE, 'src': 'assets/plates/lib.webp'}])
    pf.put(CODE, book('Rat', 'Bat', 'Owl'), 'Rat', remove=True)
    pf.put(CODE, book('Rat', 'Bat', 'Owl'), 'Owl', remove=True)
    assert shared.exists() and lib.exists()


def test_put_remove_without_an_entry_of_mine(tree):
    tree.save([{'match': 'rat', 'src': 'lib.webp'}, {'match': '^rat$', 'book': '05sots', 'src': 'x'}])
    with pytest.raises(ValueError, match='no picture of yours'):
        pf.put(CODE, book('Rat'), 'Rat', remove=True)


def test_put_remove_tolerates_a_file_that_is_already_gone(tree):
    tree.save([{'match': '^rat$', 'book': CODE, 'src': 'art/plates/02fotw/rat.webp'}])
    assert pf.put(CODE, book('Rat'), 'Rat', remove=True) == (None, 'removed')


def test_put_other_books_entries_for_the_same_enemy_are_not_mine(tree):
    tree.save([{'match': '^rat$', 'book': '05sots', 'src': 'art/plates/05sots/rat.webp'}])
    pf.put(CODE, book('Rat'), 'Rat', image=WEBP)
    plates = tree.plates()
    assert len(plates) == 2 and plates[0]['book'] == CODE and plates[1]['book'] == '05sots'


def test_put_keeps_the_files_other_keys_when_saving(tree):
    tree.save([], version=3, note='kept')
    pf.put(CODE, book('Rat'), 'Rat', image=WEBP)
    data = json.loads((tree.root / 'assets' / 'plates' / 'plates.json').read_text(encoding='utf-8'))
    assert data['version'] == 3 and data['note'] == 'kept' and len(data['plates']) == 1


def test_put_the_entry_found_by_the_page_matches_the_name(tree):
    import re
    entry, _ = pf.put(CODE, book('Rat (2)'), 'Rat (2)', image=WEBP)
    assert re.search(entry['match'], 'rat (2)', re.I) and not re.search(entry['match'], 'rat (2) x', re.I)
