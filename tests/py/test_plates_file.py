import re

import plates_file as pf


def test_anchored_matches_the_name_alone_whatever_its_case():
    pat = pf.anchored('Giak Officer')
    assert re.search(pat, 'giak officer', re.I)
    assert not re.search(pat, 'giak officer 2', re.I)


def test_anchored_escapes_regex_syntax_but_not_spaces():
    assert pf.anchored('Kraan (2)') == r'^kraan \(2\)$'
    assert pf.anchored('a.b/c') == r'^a\.b\/c$'


def test_slug_is_lower_case_words_joined_by_dashes():
    assert pf.slug('Giak Officer (2)') == 'giak-officer-2'
    assert pf.slug('!!!') == 'enemy'
    assert len(pf.slug('x' * 100)) == 60


def test_fits_honours_the_book_limit_and_survives_a_bad_pattern():
    assert pf._fits({'match': 'giak'}, '01fftd', 'Giak Officer')
    assert not pf._fits({'match': 'giak', 'book': '02fotw'}, '01fftd', 'Giak')
    assert not pf._fits({'match': '('}, '01fftd', 'Giak')
