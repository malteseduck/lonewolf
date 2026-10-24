"""tools/art_sources.py, main paths (ADR 0038): links recorded and listed, what a fresh checkout can fetch
again, a page link followed to its picture, and the gated fetch writing the picture back. ROOT is a
temporary tree; the network is a stand-in function."""
import io
import json

import pytest
from PIL import Image

import art_sources as asrc


def png(w=40, h=20):
    b = io.BytesIO()
    Image.new('RGB', (w, h), (200, 180, 150)).save(b, 'PNG')
    return b.getvalue()


@pytest.fixture
def root(tmp_path, monkeypatch):
    monkeypatch.setattr(asrc, 'ROOT', str(tmp_path))

    class T:
        def file(self, rel, data=b'x'):
            f = tmp_path.joinpath(*rel.split('/'))
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_bytes(data)
            return f

        def path(self, rel):
            return str(tmp_path.joinpath(*rel.split('/')))

        def exists(self, rel):
            return tmp_path.joinpath(*rel.split('/')).exists()
    return T()


def test_pictures_leave_out_reference_upscales_and_notes(root):
    for rel in ('art/plates/02fotw/giak.webp', 'art/portrait.png', 'art/reference/map.png', 'art/plates/02fotw/giak-2x.webp',
                'art/plates/SOURCES.txt', 'art/manifest.json', 'art/trial/index.html'):
        root.file(rel)
    assert asrc.pictures() == ['art/plates/02fotw/giak.webp', 'art/portrait.png']


def test_record_keeps_a_link_or_none_and_the_list_is_one_entry_a_line(root):
    root.file('art/plates/02fotw/giak.webp')
    root.file('art/me.png')
    asrc.record('art/plates/02fotw/giak.webp', 'https://example.org/giak.jpg', today='2026-10-16')
    asrc.record('art/me.png', None)
    assert asrc.load() == {'art/me.png': {'url': None},
                           'art/plates/02fotw/giak.webp': {'url': 'https://example.org/giak.jpg', 'fetched': '2026-10-16'}}
    text = open(asrc.list_path(), encoding='utf-8').read()
    assert text.count('\n    "art/') == 2 and '\r' not in text
    asrc.forget('art/me.png')
    assert list(asrc.load()) == ['art/plates/02fotw/giak.webp']


@pytest.mark.parametrize('rel, url', [('art/reference/x.png', None), ('assets/x.png', None), ('art/../x.png', None),
                                      ('art/x.txt', None), ('art/x.png', 'file:///c:/x.png'), ('art/x.png', 'javascript:x')])
def test_record_refuses_what_is_not_a_picture_of_art_or_not_a_web_link(root, rel, url):
    with pytest.raises(ValueError):
        asrc.record(rel, url)


def test_summary_counts_what_a_fresh_checkout_can_fetch_again(root):
    root.file('art/a.png')
    root.file('art/b.png')
    root.file('art/c.png')
    asrc.record('art/a.png', 'https://example.org/a.png')
    asrc.record('art/b.png', None)
    asrc.record('art/gone.png', 'https://example.org/gone.png')  # in the list, not on disk: fetchable
    asrc.record('art/lost.png', None)                             # not on disk, no link: only a copy brings it back
    s = asrc.summary()
    assert (s['present'], s['linked'], s['nolink']) == (3, 1, 1)
    assert s['unasked'] == ['art/c.png'] and s['missing'] == ['art/gone.png'] and s['lost'] == ['art/lost.png']


def test_a_page_link_is_followed_to_its_picture(root):
    page = b'<html><head><meta content="https://img.example.org/big.png?x=1&amp;y=2" property="og:image"></head></html>'
    seen = []

    def fetch(url):
        seen.append(url)
        return (page, 'text/html') if url.startswith('https://example.org') else (png(), 'image/png')
    assert asrc.get_picture('https://example.org/pin/1', fetch=fetch)[:4] == b'\x89PNG'
    assert seen == ['https://example.org/pin/1', 'https://img.example.org/big.png?x=1&y=2']
    with pytest.raises(ValueError):
        asrc.get_picture('https://example.org/none', fetch=lambda u: (b'<html>no picture</html>', 'text/html'))
    with pytest.raises(ValueError):
        asrc.get_picture('ftp://example.org/a.png', fetch=fetch)


def test_fetch_missing_writes_each_picture_back_converted_as_before(root):
    root.file('art/here.png', png())
    asrc.record('art/here.png', 'https://example.org/here.png')
    asrc.record('art/plates/02fotw/giak.webp', 'https://example.org/giak.png')
    asrc.record('art/broken.png', 'https://example.org/broken.png')
    asrc.record('art/lost.png', None)
    got = []

    def fetch(url):
        got.append(url)
        if 'broken' in url:
            raise OSError('404')
        return png(4000, 1000), 'image/png'
    assert asrc.fetch_missing(fetch=fetch) == 1          # one failed: said, not fatal to the rest
    assert got == ['https://example.org/broken.png', 'https://example.org/giak.png']  # only the missing ones
    im = Image.open(io.BytesIO(open(asrc.ROOT + '/art/plates/02fotw/giak.webp', 'rb').read()))
    assert im.format == 'WEBP' and im.size == (2000, 500)  # as the picture sheet saves: 2000 px on its long side
    assert not root.exists('art/broken.png')
    assert asrc.summary()['missing'] == ['art/broken.png']


def test_a_picture_made_with_ai_moves_to_the_committed_library_and_every_mention_follows(root):
    # ADR 0042: made from a text prompt alone, it is ours, so it is committed rather than fetched again
    root.file('art/plates/10xx/orc.webp', b'pic')
    root.file('art/plates/10xx/orc-2x.webp', b'pic2')
    root.file('assets/plates/plates.json', b'{"plates": [{"match": "^orc$", "book": "10xx", "src": "art/plates/10xx/orc.webp"}]}')
    root.file('assets/plates/approved/10xx.json', b'{"pins": {"1/0": {"plate": {"src": "art/plates/10xx/orc.webp"}}}}')
    root.file('assets/plates/upscaled/10xx.json', b'{"srcs": ["art/plates/10xx/orc.webp", "art/plates/10xx/orcish.webp"]}')
    root.file('about/ill-about.json', b'{"art/plates/10xx/orc.webp": "an orc"}')
    root.file('assets/plates/README.txt', b'Fight plates.\n')
    asrc.record('art/plates/10xx/orc.webp', None)
    assert asrc.make_ai('art/plates/10xx/orc.webp', today='2026-10-24') == 'assets/plates/10xx/orc.webp'
    assert not root.exists('art/plates/10xx/orc.webp') and not root.exists('art/plates/10xx/orc-2x.webp')
    assert root.exists('assets/plates/10xx/orc.webp') and root.exists('assets/plates/10xx/orc-2x.webp')
    for rel in ('assets/plates/plates.json', 'assets/plates/approved/10xx.json', 'about/ill-about.json'):
        text = open(root.path(rel), encoding='utf-8').read()
        assert 'assets/plates/10xx/orc.webp' in text and 'art/plates/10xx/orc.webp' not in text
    assert 'art/plates/10xx/orcish.webp' in open(root.path('assets/plates/upscaled/10xx.json'), encoding='utf-8').read()
    assert 'art/plates/10xx/orc.webp' not in asrc.load()
    readme = open(root.path('assets/plates/README.txt'), encoding='utf-8').read()
    assert '10xx/orc.webp' in readme and 'AI' in readme


def test_made_with_ai_refuses_what_is_not_a_fight_picture_here_or_would_overwrite_one(root):
    root.file('art/me.png')
    root.file('art/plates/10xx/orc.webp')
    root.file('assets/plates/10xx/orc.webp')
    for rel in ('art/me.png', 'art/plates/10xx/none.webp', 'art/plates/10xx/orc.webp'):
        with pytest.raises(ValueError):
            asrc.make_ai(rel)
