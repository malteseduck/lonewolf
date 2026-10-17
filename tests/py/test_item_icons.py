"""tools/item_icons.py, the item sheet's icons: the credits read from and added to assets/icons/README.txt,
an item's glyph rewritten in the file that defines it (its book's item table, or itemglyphs.js for the
engine's own), and an icon fetched from game-icons.net into assets/icons/. Stand-in files in tmp_path;
the network is replaced by a fake."""
import os

import pytest

import item_icons

README = """Glyphs for the inventory

From game-icons.net.

  by Lorc (https://lorcblog.blogspot.com):
    key, scroll-unfurled,
    and for Book 13 (fetched 2026-10-17): jigsaw-box
  by Delapouite (https://delapouite.com):
    meal, rope-coil
  by Skoll:
    footsteps, gladius

Which glyph stands for what is DISC_GLYPH and TAB_ART in main.js, ITEM_GLYPH in itemglyphs.js.
"""

TABLE = """/* Book 9's items (it's ours) */
export const ITEMS = {
  // a comment with a brace { and a quote '
  goldKey9: { name: 'Gold Key', kind: 'special', glyph: 'key' },
  scroll9: { name: 'Scroll', kind: 'backpack',
    about: 'A note {in braces}, it says.' },
  bare9: { name: 'Bare' },
};

export const SECTIONS = {
  12: { loot: [{ item: 'goldKey9' }] },
};
"""

GLYPHS = """export const ITEM_GLYPH = {
  dagger: 'plain-dagger',
  meal: 'meal',
};

export const glyphName = (LW, id) => ITEM_GLYPH[id];
"""

CORE = """  LW.ITEMS = {
    dagger: { name: 'Dagger', kind: 'weapon' },
    rope: { name: 'Rope', kind: 'backpack', glyph: 'rope-coil' },
  };
"""

SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M0 0h512v512H0z"/><path fill="#fff" d="M1 1h9"/></svg>'


def put(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)


def read(path):
    with open(path, encoding='utf-8', newline='') as f:
        return f.read()


@pytest.fixture
def root(tmp_path, monkeypatch):
    monkeypatch.setattr(item_icons, 'ROOT', str(tmp_path))
    put(str(tmp_path / 'assets' / 'icons' / 'README.txt'), README)
    for n in ('key', 'scroll-unfurled', 'jigsaw-box', 'meal', 'rope-coil', 'footsteps', 'gladius', 'plain-dagger'):
        put(str(tmp_path / 'assets' / 'icons' / f'{n}.svg'), '<svg/>')
    put(str(tmp_path / 'items' / 'items-09tcof.js'), TABLE)
    put(str(tmp_path / 'itemglyphs.js'), GLYPHS)
    put(str(tmp_path / 'shared' / 'core.js'), CORE)
    return tmp_path


def test_credits_read_every_author_block(root):
    c = item_icons.credits(read(str(root / 'assets' / 'icons' / 'README.txt')))
    assert c == {'key': 'lorc', 'scroll-unfurled': 'lorc', 'jigsaw-box': 'lorc', 'meal': 'delapouite',
                 'rope-coil': 'delapouite', 'footsteps': 'skoll', 'gladius': 'skoll'}


def test_credit_adds_to_an_author_or_a_new_one_once():
    t = item_icons.credit(README, 'lorc', 'ring')
    t = item_icons.credit(t, 'lorc', 'crown')
    t = item_icons.credit(t, 'caro-asercion', 'mason-jar')
    assert item_icons.credit(t, 'lorc', 'ring') == t
    c = item_icons.credits(t)
    assert c['ring'] == c['crown'] == c['key'] == 'lorc' and c['mason-jar'] == 'caro-asercion' and c['gladius'] == 'skoll'
    assert '  by Caro Asercion:\n' in t and t.rstrip().endswith('ITEM_GLYPH in itemglyphs.js.')


def test_local_lists_the_icons_with_their_authors(root):
    got = {i['name']: i['author'] for i in item_icons.local()}
    assert got['key'] == 'lorc' and got['plain-dagger'] is None and 'README' not in ''.join(got)


def test_a_book_item_glyph_is_replaced_or_added_in_its_table(root):
    f = str(root / 'items' / 'items-09tcof.js')
    assert item_icons.set_glyph('goldKey9', 'jigsaw-box') == {'file': 'items/items-09tcof.js', 'was': 'key'}
    assert "goldKey9: { name: 'Gold Key', kind: 'special', glyph: 'jigsaw-box' }," in read(f)
    assert item_icons.set_glyph('scroll9', 'key')['was'] is None
    assert "scroll9: { name: 'Scroll', kind: 'backpack', glyph: 'key',\n    about: 'A note {in braces}, it says.' }," in read(f)
    item_icons.set_glyph('bare9', 'meal')
    assert "bare9: { glyph: 'meal', name: 'Bare' }," in read(f)
    assert read(f).count('\n') == TABLE.count('\n')  # nothing else moved


def test_a_standard_item_glyph_goes_to_itemglyphs(root):
    f = str(root / 'itemglyphs.js')
    assert item_icons.set_glyph('dagger', 'gladius') == {'file': 'itemglyphs.js', 'was': 'plain-dagger'}
    assert "  dagger: 'gladius',\n" in read(f)
    # rope's glyph is in shared/core.js: the list here wins over it, so the change is written here
    assert item_icons.set_glyph('rope', 'key') == {'file': 'itemglyphs.js', 'was': 'rope-coil'}
    assert read(f).startswith("export const ITEM_GLYPH = {\n  dagger: 'gladius',\n  meal: 'meal',\n  rope: 'key',\n};")


def test_set_glyph_refusals(root):
    with pytest.raises(ValueError, match='no icon'):
        item_icons.set_glyph('goldKey9', 'nothing-here')
    with pytest.raises(ValueError, match='no item'):
        item_icons.set_glyph('unknown9', 'key')
    with pytest.raises(ValueError):
        item_icons.set_glyph('goldKey9', '../key')


def test_fetch_strips_the_square_saves_and_credits(root, monkeypatch):
    got = []
    monkeypatch.setattr(item_icons, '_get', lambda url: got.append(url) or SVG.encode())
    assert item_icons.fetch('lorc/crown') == 'crown'
    svg = read(str(root / 'assets' / 'icons' / 'crown.svg'))
    assert 'M0 0h512v512H0z' not in svg and 'fill="#fff"' not in svg and 'M1 1h9' in svg
    assert item_icons.credits(read(str(root / 'assets' / 'icons' / 'README.txt')))['crown'] == 'lorc'
    assert got == ['https://raw.githubusercontent.com/game-icons/icons/master/lorc/crown.svg']
    # already here from the same author: kept; from another author: saved under its own name
    assert item_icons.fetch('lorc/crown') == 'crown' and len(got) == 1
    assert item_icons.fetch('delapouite/key') == 'key-delapouite'
    assert (root / 'assets' / 'icons' / 'key-delapouite.svg').exists()
    with pytest.raises(ValueError):
        item_icons.fetch('../etc/passwd')


def test_remote_list_is_fetched_once_and_kept(root, monkeypatch):
    tree = '{"tree": [{"path": "lorc/key.svg"}, {"path": "lorc"}, {"path": "license.txt"}, {"path": "delapouite/meal.svg"}]}'
    calls = []
    monkeypatch.setattr(item_icons, '_get', lambda url: calls.append(url) or tree.encode())
    assert item_icons.remote()['paths'] == ['delapouite/meal', 'lorc/key']
    assert item_icons.remote()['paths'] == ['delapouite/meal', 'lorc/key'] and len(calls) == 1
    item_icons.remote(refresh=True)
    assert len(calls) == 2


# ---------------------------------------------------------------- the icon sheet: glyphs.js

UI = """/* where each glyph is drawn */
export const DISC_GLYPH = {
  camouflage: 'hood',
  // a comment
  tracking: 'footsteps',
};

export const UI_GLYPH = {
  crest: 'key',
  home: 'key',
};

export const WHERE = {
  crest: ['Panels', 'the crest'],
};
"""


def test_a_player_glyph_is_replaced_in_glyphs_js_and_nothing_else_moves(root):
    f = str(root / 'glyphs.js')
    put(f, UI)
    assert item_icons.set_ui_glyph('UI_GLYPH', 'home', 'meal') == {'file': 'glyphs.js', 'was': 'key'}
    assert item_icons.set_ui_glyph('DISC_GLYPH', 'tracking', 'gladius')['was'] == 'footsteps'
    assert read(f) == UI.replace("home: 'key'", "home: 'meal'").replace("tracking: 'footsteps'", "tracking: 'gladius'")


def test_set_ui_glyph_refusals(root):
    put(str(root / 'glyphs.js'), UI)
    with pytest.raises(ValueError, match='no entry'):
        item_icons.set_ui_glyph('UI_GLYPH', 'camouflage', 'meal')  # in another list only
    with pytest.raises(ValueError, match='not a list'):
        item_icons.set_ui_glyph('WHERE', 'crest', 'meal')
    with pytest.raises(ValueError, match='no icon'):
        item_icons.set_ui_glyph('UI_GLYPH', 'home', 'nothing-here')
