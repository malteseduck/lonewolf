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
            (pa / code).mkdir()
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
