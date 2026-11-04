"""tools/about_check.py: our descriptions are committed, so none may repeat a book's own wording (ADR 0042)."""
import json

import pytest

import about_check as ac


@pytest.fixture
def tree(tmp_path, monkeypatch):
    pa = tmp_path / 'data' / 'projectaon'
    about = tmp_path / 'about'
    pa.mkdir(parents=True)
    about.mkdir()
    monkeypatch.setattr(ac, 'PA', str(pa))
    monkeypatch.setattr(ac, 'ABOUT_DIR', str(about))

    class T:
        def book(self, code, text):
            (pa / code).mkdir(exist_ok=True)
            (pa / code / 'sect1.htm').write_text(f'<html><p>{text}</p></html>', encoding='utf-8')

        def write(self, name, d):
            (about / name).write_text(json.dumps(d), encoding='utf-8')
    return T()


def test_a_description_in_our_own_words_passes(tree):
    tree.book('01xx', 'The grey wolf sat by the old stone bridge and waited for the rain to stop.')
    tree.write('ill-about.json', {'01xx/ill1.png': 'A wolf waiting under a bridge in the rain (section 1)'})
    tree.write('foe-about.json', {'01xx': {'Wolf': 'A grey wolf'}})
    tree.write('ill-notes.json', {})
    assert ac.copied() == []


def test_a_run_of_the_books_words_is_caught_whatever_its_case_and_markup(tree):
    tree.book('01xx', 'The grey wolf sat by the <i>old stone bridge</i> and waited for the rain to stop.')
    tree.write('ill-about.json', {})
    tree.write('foe-about.json', {'01xx': {'Wolf': 'It Sat By The Old Stone Bridge And Waited, a wolf'}})
    tree.write('ill-notes.json', {'01xx/ill2.png': 'a wolf'})
    got = ac.copied()
    assert [(g['file'], g['key']) for g in got] == [('foe-about.json', '01xx/Wolf')]
    assert ac.main([]) == 1


def test_a_book_not_on_disk_is_skipped_not_failed(tree):
    tree.write('ill-about.json', {'09zz/ill1.png': 'anything at all, eight words or more of it here'})
    tree.write('foe-about.json', {})
    tree.write('ill-notes.json', {})
    assert ac.copied() == [] and ac.main([]) == 0


# ---- foe-scene.json: each enemy kind's setting and figure count, for its image prompt (ADR 0008, 2026-11-03)

BOOK = ('The grey wolf sat by the old stone bridge and waited for the rain to stop. '
        'Far to the west, the walls of Holmgard rose above the forest. Ask Banedon if you dare.')


def scened(tree, scene, foes=None):
    tree.book('01xx', BOOK)
    tree.write('ill-about.json', {})
    tree.write('ill-notes.json', {})
    tree.write('foe-about.json', {'01xx': foes if foes is not None else {'Wolf': 'A wolf', '3 Bandits': 'Robbers'}})
    tree.write('foe-scene.json', scene)


def test_a_setting_and_count_for_every_kind_pass(tree):
    scened(tree, {'01xx': {'Wolf': {'setting': 'a wet riverbank under a low bridge', 'figures': 1},
                           '3 Bandits': {'setting': 'a forest road at dusk', 'figures': 3}}})
    assert ac.scene_problems() == [] and ac.main([]) == 0


def test_a_kind_with_no_scene_is_listed(tree):
    scened(tree, {'01xx': {'Wolf': {'setting': 'a forest road at dusk', 'figures': 1}}})
    assert ac.scene_problems() == ['01xx/3 Bandits: no setting and figures in foe-scene.json']
    assert ac.main([]) == 1


def test_a_missing_or_non_positive_count_is_refused(tree):
    scened(tree, {'01xx': {'Wolf': {'setting': 'a forest road at dusk'},
                           '3 Bandits': {'setting': 'a forest road at dusk', 'figures': 0}}})
    got = ac.scene_problems()
    assert len(got) == 2 and all('figures' in g for g in got)


def test_a_colour_in_the_setting_is_refused(tree):
    scened(tree, {'01xx': {'Wolf': {'setting': 'a blue-grey cave', 'figures': 1},
                           '3 Bandits': {'setting': 'a forest road at dusk', 'figures': 3}}})
    got = ac.scene_problems()
    assert len(got) == 1 and got[0].startswith('01xx/Wolf') and 'colour' in got[0]


def test_eight_of_the_books_words_in_a_row_are_refused(tree):
    scened(tree, {'01xx': {'Wolf': {'setting': 'sat by the old stone bridge and waited for', 'figures': 1},
                           '3 Bandits': {'setting': 'a forest road at dusk', 'figures': 3}}})
    got = ac.scene_problems()
    assert len(got) == 1 and "book's words" in got[0]


def test_a_place_or_person_by_name_is_refused_even_in_lower_case(tree):
    scened(tree, {'01xx': {'Wolf': {'setting': 'the walls of holmgard', 'figures': 1},
                           '3 Bandits': {'setting': 'a road where Lone Wolf waits', 'figures': 3}}})
    got = ac.scene_problems()
    assert len(got) == 2 and all('name' in g for g in got)
    # a word the book only capitalises at a sentence's start is no name ("Far", "Ask")
    scened(tree, {'01xx': {'Wolf': {'setting': 'far out on a moor', 'figures': 1},
                           '3 Bandits': {'setting': 'a forest road at dusk', 'figures': 3}}})
    assert ac.scene_problems() == []


def test_a_scene_for_a_name_not_in_foe_about_is_refused(tree):
    scened(tree, {'01xx': {'Wolf': {'setting': 'a cave', 'figures': 1}, 'Bandits': {'setting': 'a road', 'figures': 3},
                           '3 Bandits': {'setting': 'a road', 'figures': 3}}})
    assert ac.scene_problems() == ['01xx/Bandits: not an enemy in foe-about.json (use its name there)']


def test_a_setting_that_puts_a_figure_in_the_place_is_refused(tree):
    # the picture is the enemy alone: a crowd, a horse or a body in the setting gets drawn too
    scened(tree, {'01xx': {'Wolf': {'setting': 'a smoky tavern, a ring of onlookers', 'figures': 1},
                           '3 Bandits': {'setting': 'a forest road, a halted wagon and horses, fallen leaves', 'figures': 3}}})
    got = ac.scene_problems()
    assert len(got) == 2 and all('figure' in g for g in got)
    assert 'onlookers' in got[0] and 'horses' in got[1]
