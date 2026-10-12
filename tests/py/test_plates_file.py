import re

import plates_file as pf


def test_anchored_matches_the_name_alone_whatever_its_case():
    pat = pf.anchored('Giak Officer')
    assert re.search(pat, 'giak officer', re.I)
    assert not re.search(pat, 'giak officer 2', re.I)


def test_slug_is_lower_case_words_joined_by_dashes():
    assert pf.slug('Giak Officer (2)') == 'giak-officer-2'
    assert pf.slug('!!!') == 'enemy'
    assert len(pf.slug('x' * 100)) == 60


