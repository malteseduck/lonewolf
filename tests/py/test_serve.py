"""tools/serve.py: the static server, the backups API, the map editor's and dashboard's APIs, the
offline list. Every path constant is pointed at tmp_path; the server is started on an ephemeral port
in a thread (never 8765 or 8766)."""
import http.client
import json
import os
import sys
import threading
import time
from functools import partial
from http.server import ThreadingHTTPServer

import pytest

import serve

PNG = b'\x89PNG\r\n\x1a\n' + b'0' * 20


def write(path, text='', mode='w'):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if isinstance(text, bytes):
        mode = 'wb'
    with open(path, mode, **({} if mode == 'wb' else {'encoding': 'utf-8'})) as f:
        f.write(text)
    return path


@pytest.fixture
def root(tmp_path, monkeypatch):
    r = tmp_path / 'site'
    r.mkdir()
    monkeypatch.setattr(serve, 'ROOT', str(r))
    monkeypatch.setattr(serve, 'BACKUPS', str(r / 'backups'))
    monkeypatch.setattr(serve, 'MAPS', str(r / 'maps'))
    monkeypatch.setattr(serve, 'RELEASES', str(r / 'release'))
    monkeypatch.setattr(serve, 'RELEASE', False)
    monkeypatch.setattr(serve, '_hashes', {})
    monkeypatch.setattr(serve, '_jobs', {})
    return r


def start(directory):
    srv = ThreadingHTTPServer(('127.0.0.1', 0), partial(serve.Handler, directory=str(directory)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


@pytest.fixture
def port(root):
    srv = start(root)
    yield srv.server_address[1]
    srv.shutdown()
    srv.server_close()


def call(port, method, path, body=None, headers=None):
    c = http.client.HTTPConnection('127.0.0.1', port, timeout=15)
    try:
        c.request(method, path, body=body, headers=headers or {})
        r = c.getresponse()
        return r.status, r, r.read()
    finally:
        c.close()


def jcall(port, method, path, obj=None, headers=None):
    body = None if obj is None else json.dumps(obj).encode()
    st, r, data = call(port, method, path, body, headers)
    return st, json.loads(data)


def declared(port, method, path, length, headers=None):
    """A request that claims a body of `length` bytes and sends none (the server must answer without reading it)."""
    c = http.client.HTTPConnection('127.0.0.1', port, timeout=15)
    try:
        c.putrequest(method, path)
        c.putheader('Content-Length', str(length))
        for k, v in (headers or {}).items():
            c.putheader(k, v)
        c.endheaders()
        r = c.getresponse()
        return r.status, r.read()
    finally:
        c.close()


def book(root, code='01fftd', head='{"number": 1, "title": "Flight"}'):
    write(str(root / 'data' / 'projectaon' / code / 'book.js'), head)
    return root / 'data' / 'projectaon' / code


# ---------------------------------------------------------------- small helpers

def test_name_pattern_accepts_plain_json_names_only():
    ok = ['a.json', 'lone wolf 2026-10-11.json', 'é.json', 'x' * 120 + '.json']
    bad = ['a.txt', 'a.json.txt', '.json', 'a/b.json', 'a\\b.json', 'a:b.json', 'a*.json', 'a?.json',
           'a"b.json', 'a<b.json', 'a|b.json', 'a\x00.json', 'a\n.json', 'x' * 121 + '.json', '']
    for n in ok:
        assert serve.NAME.match(n), n
    for n in bad:
        assert not serve.NAME.match(n), repr(n)


@pytest.mark.xfail(strict=True, reason='serve.py:80 NAME ends in dollar, which also matches before a trailing newline')
def test_name_pattern_refuses_a_trailing_newline():
    assert not serve.NAME.match('a.json' + chr(10))


def test_labels_ok_wants_a_list_of_text_and_four_number_boxes():
    good = {'text': 'Anon', 'box': [1, 2.5, 3, 4]}
    assert serve._labels_ok([])
    assert serve._labels_ok([good, {**good, 'extra': 1}])
    assert not serve._labels_ok({'text': 'x', 'box': [1, 2, 3, 4]})
    assert not serve._labels_ok([{'box': [1, 2, 3, 4]}])
    assert not serve._labels_ok([{'text': 5, 'box': [1, 2, 3, 4]}])
    assert not serve._labels_ok([{'text': 'x', 'box': [1, 2, 3]}])
    assert not serve._labels_ok([{'text': 'x', 'box': [1, 2, 3, '4']}])
    assert not serve._labels_ok([{'text': 'x', 'box': [1, 2, 3, True]}])  # bool is not a number here
    assert not serve._labels_ok(['x'])


def test_tail_keeps_the_last_lines():
    text = '\n'.join(str(i) for i in range(10))
    assert serve._tail(text, 3) == '7\n8\n9'
    assert serve._tail('a\nb') == 'a\nb'
    assert serve._tail('') == ''


def test_exec_returns_code_and_output(root):
    rc, out = serve._exec([sys.executable, '-c', 'print("héllo"); import sys; sys.exit(3)'], 20)
    assert rc == 3 and out.strip() == 'héllo'


def test_exec_merges_stderr(root):
    rc, out = serve._exec([sys.executable, '-c', 'import sys; sys.stderr.write("oops")'], 20)
    assert rc == 0 and 'oops' in out


def test_exec_times_out(root):
    rc, out = serve._exec([sys.executable, '-c', 'import time; time.sleep(30)'], 0.5)
    assert rc == -1 and out.endswith('[timed out]')


def test_exec_reports_a_command_that_cannot_start(root):
    rc, out = serve._exec(['no-such-program-xyz'], 5)
    assert rc == -1 and out.startswith('could not start')


def test_hash_is_sha1_prefix_of_the_content(tmp_path):
    import hashlib
    p = tmp_path / 'f.txt'
    p.write_bytes(b'hello')
    assert serve._hash('f.txt', str(tmp_path)) == hashlib.sha1(b'hello').hexdigest()[:16]


def test_hash_changes_with_content_and_is_remembered_while_stat_is_unchanged(tmp_path, monkeypatch):
    monkeypatch.setattr(serve, '_hashes', {})
    p = tmp_path / 'f.txt'
    p.write_bytes(b'aaaa')
    first = serve._hash('f.txt', str(tmp_path))
    st = os.stat(p)
    p.write_bytes(b'bbbb')  # same size
    os.utime(p, ns=(st.st_atime_ns, st.st_mtime_ns))  # same time: the remembered hash is served
    assert serve._hash('f.txt', str(tmp_path)) == first
    os.utime(p, ns=(st.st_atime_ns, st.st_mtime_ns + 5_000_000_000))
    assert serve._hash('f.txt', str(tmp_path)) != first


def test_hash_of_a_missing_file_raises(tmp_path):
    with pytest.raises(OSError):
        serve._hash('nope', str(tmp_path))


def test_book_dir_needs_a_safe_name_and_an_existing_folder(root):
    book(root, '01fftd')
    assert serve._book_dir('01fftd') == str(root / 'data' / 'projectaon' / '01fftd')
    assert serve._book_dir('02fotw') is None  # not downloaded
    for bad in ['', '..', '../x', 'a/b', 'a b', 'x' * 41, '01fftd\\..']:
        assert serve._book_dir(bad) is None, bad


def test_labels_file_path_only_for_an_existing_book(root):
    book(root)
    assert serve._labels_file('01fftd') == os.path.join(str(root / 'maps'), '01fftd', 'labels.json')
    assert serve._labels_file('nope') is None


def test_work_makes_the_folder_only_when_asked(tmp_path):
    d = str(tmp_path / 'b')
    os.makedirs(d)
    w = serve._work(d)
    assert w == os.path.join(d, 'work') and not os.path.exists(w)
    serve._work(d, make=True)
    assert os.path.isdir(w)


def test_gemini_files_match_the_round_number_exactly(tmp_path):
    d = str(tmp_path)
    assert serve._gemini_files(d, 1) == []  # no work folder
    for n in ['map-gemini-1.png', 'map-gemini-1.jpg', 'map-gemini-12.png', 'map-gemini-1.gif', 'map-gemini-1-x4.png']:
        write(os.path.join(d, 'work', n), 'x')
    assert sorted(serve._gemini_files(d, 1)) == ['map-gemini-1.jpg', 'map-gemini-1.png']
    assert serve._gemini_files(d, 12) == ['map-gemini-12.png']


# ---------------------------------------------------------------- fonts

def test_fonts_default_when_no_font_file(root):
    assert serve._fonts('b') == serve.FONTS


def test_fonts_use_the_named_file_when_it_exists(root):
    write(str(root / 'maps' / 'b' / 'font.txt'), 'Fancy.ttf|Bold\nignored\n')
    assert serve._fonts('b') == serve.FONTS  # the font file is not in tools/fonts yet
    write(str(root / 'tools' / 'fonts' / 'Fancy.ttf'), 'x')
    assert serve._fonts('b') == ['--hand', 'Fancy.ttf|Bold', '--caps', 'Fancy.ttf|Bold']


def test_fonts_refuse_names_that_are_not_a_plain_font_file(root):
    write(str(root / 'tools' / 'fonts' / 'a.ttf'), 'x')
    for bad in ['../a.ttf', 'a.txt', 'a.ttf|', 'a.ttf|two words', '', 'sub/a.ttf']:
        write(str(root / 'maps' / 'b' / 'font.txt'), bad)
        assert serve._fonts('b') == serve.FONTS, bad


# ---------------------------------------------------------------- map_books / map_state

def test_map_books_stage_ladder(root):
    base = root / 'data' / 'projectaon'
    (base / 'a_nomap').mkdir(parents=True)
    write(str(base / 'b_notstarted' / 'map.png'), 'x')
    write(str(base / 'c_started' / 'map.png'), 'x')
    write(str(base / 'c_started' / 'work' / 'map-2k.png'), 'x')
    write(str(base / 'd_labels' / 'work' / 'map-2k.png'), 'x')
    write(str(root / 'maps' / 'd_labels' / 'labels.json'), '[]')
    write(str(base / 'e_lettered' / 'work' / 'map-2k-lettered.jpg'), 'x')
    write(str(root / 'maps' / 'e_lettered' / 'labels.json'), '[]')
    write(str(base / 'f_gemini' / 'work' / 'map-2k-lettered.jpg'), 'x')
    write(str(base / 'f_gemini' / 'work' / 'map-gemini-1.png'), 'x')
    write(str(base / 'g_done' / 'map-4k.webp'), 'x')
    write(str(base / 'g_done' / 'work' / 'map-gemini-3.png'), 'x')
    write(str(base / 'h_round0' / 'work' / 'map-gemini-0.png'), 'x')  # round 0 is not a round
    write(str(base / 'a_file.txt'), 'not a folder')
    got = {b['code']: b['stage'] for b in serve.map_books()}
    assert got == {'a_nomap': 'no map', 'b_notstarted': 'not started', 'c_started': 'started',
                   'd_labels': 'labels', 'e_lettered': 'lettered', 'f_gemini': 'gemini', 'g_done': 'done',
                   'h_round0': 'no map'}
    assert [b['code'] for b in serve.map_books()] == sorted(got)


def test_map_books_reads_number_and_title_from_the_head_of_book_js(root):
    book(root, '03tcok', '{"number": 3, "title": "The \\"Caverns\\" \\u00e9", "x": 1}')
    book(root, '04x', 'nothing here')
    got = {b['code']: b for b in serve.map_books()}
    assert got['03tcok']['number'] == 3 and got['03tcok']['title'] == 'The "Caverns" é'
    assert got['04x']['number'] is None and got['04x']['title'] is None


def test_map_state_lists_map_files_rounds_and_import_time(root):
    d = book(root)
    write(str(d / 'map.png'), 'abc')
    write(str(d / 'map-4k.webp'), 'abcd')
    write(str(d / 'other.txt'), 'x')
    write(str(d / 'work' / 'map-2k.png'), 'x')
    write(str(d / 'work' / 'map-gemini-2.png'), 'x')
    write(str(d / 'work' / 'map-gemini-10.webp'), 'x')
    write(str(d / 'work' / 'map-check-1' / 'aligned.png'), 'xy')
    write(str(d / 'work' / 'map-check-x' / 'no.png'), 'x')  # not a check folder
    write(str(d / 'work' / 'notmap.png'), 'x')
    write(str(root / 'maps' / '01fftd' / 'labels.json'), '[]')
    write(str(root / 'maps' / '01fftd' / 'other.txt'), 'x')
    st = serve.map_state(str(d))
    assert set(st['files']) == {'map.png', 'map-4k.webp', 'map-2k.png', 'map-gemini-2.png', 'map-gemini-10.webp',
                                'map-check-1/aligned.png', 'labels.json'}
    assert st['files']['map.png']['size'] == 3
    assert st['files']['map-check-1/aligned.png']['size'] == 2
    assert st['rounds'] == [2, 10]
    assert isinstance(st['book'], int)
    assert st['running'] is None


def test_map_state_without_work_or_book_js(root):
    d = root / 'data' / 'projectaon' / 'b'
    write(str(d / 'map.png'), 'x')
    st = serve.map_state(str(d))
    assert st['files'].keys() == {'map.png'} and st['rounds'] == [] and st['book'] is None


# ---------------------------------------------------------------- map_commands

def test_map_commands_upscale_and_folder_creation(root):
    d = book(root)
    cmds, err, code = serve.map_commands('upscale', '01fftd', {})
    assert err is None and code == 0
    assert cmds == [serve.PY + ['tools/map_upscale.py', 'data/projectaon/01fftd/map.png',
                                'data/projectaon/01fftd/work/map-2k.png', '--width', '2048']]
    assert os.path.isdir(d / 'work')


def test_map_commands_import_does_not_make_the_work_folder(root):
    d = book(root)
    cmds, err, code = serve.map_commands('import', '01fftd', {})
    assert cmds == [serve.PY + ['tools/import_projectaon.py', '01fftd']]
    assert not os.path.exists(d / 'work')


def test_map_commands_unknown_step(root):
    book(root)
    assert serve.map_commands('nope', '01fftd', {}) == (None, 'unknown step', 404)


def test_map_commands_round_must_be_a_small_integer(root):
    book(root)
    for step in ('prompt', 'check', 'finish'):
        for q in ({}, {'round': ['x']}, {'round': ['1234']}, {'round': ['-1']}, {'round': ['']}):
            assert serve.map_commands(step, '01fftd', q) == (None, 'round must be a small integer', 400)


def test_map_commands_simple_steps(root):
    book(root)
    wk = 'data/projectaon/01fftd/work'
    labels = 'maps/01fftd/labels.json'
    assert serve.map_commands('measure', '01fftd', {})[0] == [serve.PY + ['tools/map_measure.py', f'{wk}/map-2k.png', labels]]
    assert serve.map_commands('erase', '01fftd', {})[0] == [
        serve.PY + ['tools/map_erase.py', f'{wk}/map-2k.png', labels, f'{wk}/map-2k-erased.jpg']]
    assert serve.map_commands('letter', '01fftd', {})[0] == [
        serve.PY + ['tools/map_letter.py', f'{wk}/map-2k.png', labels, f'{wk}/map-2k-erased.jpg', '-',
                    f'{wk}/map-2k-lettered.jpg'] + serve.FONTS]
    assert serve.map_commands('prompt', '01fftd', {'round': ['2']})[0] == [
        serve.PY + ['tools/map_labels.py', 'prompt', labels, f'{wk}/map-prompt-2.txt', '--lettered']]


def test_map_commands_draft_refuses_to_overwrite_without_force(root):
    book(root)
    labels = write(str(root / 'maps' / '01fftd' / 'labels.json'), '[1]')
    assert serve.map_commands('draft', '01fftd', {}) == (
        None, 'labels.json exists; draft would overwrite it (force=1 to do so)', 409)
    assert serve.map_commands('draft', '01fftd', {'force': ['0']})[2] == 409
    cmds, err, code = serve.map_commands('draft', '01fftd', {'force': ['1']})
    assert err is None and cmds[0][len(serve.PY):][:2] == ['tools/map_labels.py', 'draft']
    with open(labels + '.bak', encoding='utf-8') as f:
        assert f.read() == '[1]'


def test_map_commands_draft_unchecks_the_list(root):
    book(root)
    checked = write(str(root / 'maps' / '01fftd' / 'labels-checked.txt'), 'x')
    cmds, err, _ = serve.map_commands('draft', '01fftd', {})
    assert err is None and not os.path.exists(checked)
    assert os.path.isdir(root / 'maps' / '01fftd')


def test_map_commands_check_and_finish_need_the_round_image(root):
    book(root)
    assert serve.map_commands('check', '01fftd', {'round': ['2']}) == (None, 'no map-gemini-2 image', 404)
    assert serve.map_commands('finish', '01fftd', {'round': ['2']})[2] == 404


def test_map_commands_check_runs_two_commands(root):
    d = book(root)
    write(str(d / 'work' / 'map-gemini-2.webp'), 'x')
    cmds, err, code = serve.map_commands('check', '01fftd', {'round': ['2']})
    wk = 'data/projectaon/01fftd/work'
    assert cmds == [
        serve.PY + ['tools/map_check.py', f'{wk}/map-2k.png', f'{wk}/map-gemini-2.webp', f'{wk}/map-check-2'],
        serve.PY + ['tools/map_labels.py', 'check', 'maps/01fftd/labels.json', f'{wk}/map-check-2/aligned.png',
                    f'{wk}/map-2k-lettered.jpg']]


def test_map_commands_finish_width_is_validated_and_multiplied_by_four(root):
    d = book(root)
    write(str(d / 'work' / 'map-gemini-1.png'), 'x')
    q = {'round': ['1'], 'width': ['abc']}
    assert serve.map_commands('finish', '01fftd', q) == (None, 'width must be an integer', 400)
    assert serve.map_commands('finish', '01fftd', {'round': ['1'], 'width': ['12']})[2] == 400
    cmds, err, _ = serve.map_commands('finish', '01fftd', {'round': ['1'], 'width': ['1000']})
    wk = 'data/projectaon/01fftd/work'
    assert cmds[0] == serve.PY + ['tools/map_upscale.py', f'{wk}/map-gemini-1.png', f'{wk}/map-gemini-1-x4.png',
                                  '--width', '4000']
    last = cmds[1]
    assert last[len(serve.PY):][:6] == ['tools/map_letter.py', f'{wk}/map-2k.png', 'maps/01fftd/labels.json',
                                       f'{wk}/map-gemini-1-x4.png', f'{wk}/map-check-1/H.json',
                                       'data/projectaon/01fftd/map-4k.webp']
    assert '--all' not in last and '--sheet' in last
    cmds, _, _ = serve.map_commands('finish', '01fftd', {'round': ['1'], 'width': ['1000'], 'all': ['1']})
    assert cmds[1][-1] == '--all'


def test_map_commands_finish_reads_the_image_width_when_not_given(root, monkeypatch):
    d = book(root)
    write(str(d / 'work' / 'map-gemini-1.png'), 'x')
    monkeypatch.setattr(serve, '_exec', lambda argv, t: (0, 'warning\n1500\n'))
    cmds, err, _ = serve.map_commands('finish', '01fftd', {'round': ['1']})
    assert cmds[0][-1] == '6000'
    monkeypatch.setattr(serve, '_exec', lambda argv, t: (1, 'Traceback\n'))
    assert serve.map_commands('finish', '01fftd', {'round': ['1']}) == (None, 'could not read the round image width', 500)
    monkeypatch.setattr(serve, '_exec', lambda argv, t: (1, ''))
    assert serve.map_commands('finish', '01fftd', {'round': ['1']})[2] == 500


# ---------------------------------------------------------------- offline_list

@pytest.fixture
def site(tmp_path):
    s = tmp_path / 'pub'
    w = lambda rel, text='x': write(str(s / rel), text)
    w('index.html', '''<!doctype html><link rel="stylesheet" href="style.css?v=3">
<link rel="manifest" href="app.webmanifest"><link rel="apple-touch-icon" href="icons/touch.png">
<link rel="icon" href="favicon.ico"><link rel="preload" href="skipped.js">
<script src="main.js"></script><script>inline()</script><SCRIPT SRC='shared/a.js'></SCRIPT>
<script src="https://cdn.example/x.js"></script><script src="//cdn.example/y.js"></script>''')
    w('style.css', 'a{background:url(img/bg.png)} b{background:url("img/q.png#frag")} c{background:url(data:image/png;base64,AAA)}'
                   ' d{background:url(http://x/y.png)}')
    w('app.webmanifest', json.dumps({'icons': [{'src': 'icons/i192.png'}, {'src': 'icons/i512.png'}]}))
    w('main.js', 'import {a} from "./mod.js";\nimport "./side.js";\nexport * from "./reex.js";\n'
                 'fetch("data/x.json"); fetch(`assets/icons/${n}.svg`); fetch("/api/offline"); fetch("api/thing");\n'
                 'import("./dyn.js");\nconst s="from ./notanimport.js";')
    w('mod.js', 'import x from "../escape.js"; import y from "./sub/deep.js";')
    w('sub/deep.js', 'import z from "../shared/b.js"; fetch("data/y.json")')
    w('shared/a.js'); w('shared/b.js'); w('side.js'); w('reex.js')
    w('data/x.json', '{}'); w('data/y.json', '{}')
    w('img/bg.png'); w('img/q.png'); w('icons/touch.png'); w('icons/i192.png'); w('icons/i512.png')
    w('assets/icons/key.svg'); w('assets/icons/Sword.SVG'); w('assets/icons/readme.txt'); w('assets/icons/sub/inner.svg')
    w('skipped.js'); w('favicon.ico'); w('sw.js'); w('notes.md')
    return s


def test_offline_list_follows_references_from_the_entry_page(site):
    got = serve.offline_list(str(site))
    assert set(got['files']) == {
        'index.html', 'style.css', 'app.webmanifest', 'icons/touch.png', 'main.js', 'shared/a.js',
        'img/bg.png', 'img/q.png', 'icons/i192.png', 'icons/i512.png',
        'mod.js', 'side.js', 'reex.js', 'data/x.json', 'sub/deep.js', 'shared/b.js', 'data/y.json',
        'assets/icons/key.svg', 'assets/icons/Sword.SVG'}
    assert got['missing'] == []  # a dynamic import() and a string that only looks like one are not followed


def test_offline_list_missing_files_are_named_but_not_listed(site):
    os.remove(site / 'side.js')
    got = serve.offline_list(str(site))
    assert 'side.js' in got['missing'] and 'side.js' not in got['files']
    assert 'index.html' in got['files']
    assert got['missing'] == sorted(got['missing'])


def test_offline_list_ignores_api_paths_urls_and_paths_leaving_the_root(site):
    got = serve.offline_list(str(site))
    for gone in ('api/offline', 'api/thing', 'escape.js', '../escape.js'):
        assert gone not in got['files'] and gone not in got['missing']
    assert not any(m.startswith('..') or m.startswith('api/') or '//' in m or ':' in m for m in got['missing'])


def test_offline_list_leaves_out_unreferenced_files(site):
    got = serve.offline_list(str(site))
    for f in ('sw.js', 'notes.md', 'skipped.js', 'favicon.ico', 'assets/icons/readme.txt', 'assets/icons/sub/inner.svg'):
        assert f not in got['files'], f


def test_offline_list_hashes_and_version(site):
    a = serve.offline_list(str(site))
    assert all(len(h) == 16 for h in a['files'].values())
    assert a['files']['data/x.json'] == serve._hash('data/x.json', str(site))
    assert serve.offline_list(str(site))['version'] == a['version']
    assert len(a['version']) == 16
    write(str(site / 'data' / 'x.json'), '{"changed": true}')
    b = serve.offline_list(str(site))
    assert b['version'] != a['version']
    assert b['files']['data/x.json'] != a['files']['data/x.json']
    assert {k: v for k, v in b['files'].items() if k != 'data/x.json'} == {k: v for k, v in a['files'].items() if k != 'data/x.json'}


def test_offline_list_version_changes_when_a_file_is_added(site):
    a = serve.offline_list(str(site))
    write(str(site / 'extra.js'), 'x')
    write(str(site / 'side.js'), 'import "./extra.js"')
    assert serve.offline_list(str(site))['version'] != a['version']


def test_offline_list_book_js_brings_the_images_it_names(site):
    write(str(site / 'index.html'), '<script src="data/projectaon/index.js"></script>')
    write(str(site / 'data/projectaon/index.js'), 'document.write(\'<script src="data/projectaon/01fftd/book.js"></script>\')')
    write(str(site / 'data/projectaon/01fftd/book.js'),
          'var B = {"a": "pic1.png", "b": "MAP.JPG", "c": "x.webp", "d": "has space.png", "e": "note.txt", "f": "sub/p.png"};'
          ' import z from "./notfollowed.js";')
    for n in ('pic1.png', 'MAP.JPG', 'x.webp'):
        write(str(site / 'data/projectaon/01fftd' / n), 'img')
    got = serve.offline_list(str(site))
    base = 'data/projectaon/01fftd/'
    assert {base + n for n in ('book.js', 'pic1.png', 'MAP.JPG', 'x.webp')} <= set(got['files'])
    # only quoted plain file names (no folders, no spaces) are taken, and book.js's imports are not followed
    assert not any(m.endswith(('note.txt', 'has space.png', 'sub/p.png', 'notfollowed.js')) for m in got['missing'])
    assert 'data/projectaon/index.js' in got['files']


def test_offline_list_plates_art_and_approved_pins(site):
    write(str(site / 'index.html'), '<script src="main.js"></script>')
    write(str(site / 'main.js'), '')
    write(str(site / 'assets/plates/plates.json'), json.dumps({'plates': [{'src': 'assets/plates/a.webp'}, {'src': ''}, {}]}))
    write(str(site / 'main.js'), 'fetch("assets/plates/plates.json"); fetch("art/manifest.json")')
    write(str(site / 'assets/plates/a.webp'), 'x')
    write(str(site / 'assets/plates/approved/01fftd.json'),
          json.dumps({'pins': {'giak': {'plate': {'src': 'assets/plates/p1.webp'}}, 'none': None, 'nop': {}}}))
    write(str(site / 'assets/plates/approved/readme.txt'), 'x')
    write(str(site / 'assets/plates/p1.webp'), 'x')
    write(str(site / 'art/manifest.json'), json.dumps({'enemies': {'kraan': 'e/kraan.webp', 'x': ''}, 'hero': {'src': 'h.webp'},
                                                      'portrait': 'p.webp'}))
    for n in ('e/kraan.webp', 'h.webp', 'p.webp'):
        write(str(site / 'art' / n), 'x')
    got = serve.offline_list(str(site))
    assert got['missing'] == []
    assert {'assets/plates/plates.json', 'assets/plates/a.webp', 'assets/plates/approved/01fftd.json',
            'assets/plates/p1.webp', 'art/manifest.json', 'art/e/kraan.webp', 'art/h.webp', 'art/p.webp'} <= set(got['files'])
    assert 'assets/plates/approved/readme.txt' not in got['files']


def test_offline_list_art_manifest_hero_may_be_a_plain_string_or_absent(site):
    write(str(site / 'index.html'), '<script src="main.js"></script>')
    write(str(site / 'main.js'), 'fetch("art/manifest.json")')
    write(str(site / 'art/manifest.json'), json.dumps({'hero': 'h.webp', 'portrait': None}))
    write(str(site / 'art/h.webp'), 'x')
    got = serve.offline_list(str(site))
    assert 'art/h.webp' in got['files'] and got['missing'] == []


def test_offline_list_survives_bad_json_and_a_cycle(site):
    write(str(site / 'index.html'), '<script src="main.js"></script>')
    write(str(site / 'main.js'), 'import "./b.js"; fetch("art/manifest.json"); fetch("app.webmanifest")')
    write(str(site / 'b.js'), 'import "./main.js"')
    write(str(site / 'art/manifest.json'), '{not json')
    write(str(site / 'app.webmanifest'), '[]'.replace('[]', '{"icons": [{}]}'))
    got = serve.offline_list(str(site))
    assert {'main.js', 'b.js', 'art/manifest.json'} <= set(got['files'])


def test_offline_list_without_an_entry_page_lists_nothing_but_the_icon_folder(tmp_path):
    write(str(tmp_path / 'assets/icons/k.svg'), 'x')
    got = serve.offline_list(str(tmp_path))
    assert got['missing'] == ['index.html']
    assert set(got['files']) == {'assets/icons/k.svg'}


def test_offline_list_fill_can_supply_a_file_from_elsewhere(site):
    write(str(site / 'index.html'), '<script src="data/projectaon/01fftd/book.js"></script>')
    asked = []

    def fill(rel):
        asked.append(rel)
        if rel == 'data/projectaon/01fftd/book.js':
            write(str(site / rel), '')
            return True
        return False
    got = serve.offline_list(str(site), fill)
    assert asked == ['data/projectaon/01fftd/book.js']
    assert 'data/projectaon/01fftd/book.js' in got['files'] and got['missing'] == []


def test_offline_list_plain_missing_with_fill_that_declines(site):
    os.remove(site / 'side.js')
    got = serve.offline_list(str(site), lambda rel: False)
    assert 'side.js' in got['missing']


def test_offline_list_css_urls_are_relative_to_the_stylesheet(site):
    write(str(site / 'index.html'), '<link rel="stylesheet" href="css/s.css">')
    write(str(site / 'css/s.css'), '@import url(other.css); a{background:url(../img/bg.png)} b{src:url(/img/q.png)}')
    write(str(site / 'css/other.css'), '')
    got = serve.offline_list(str(site))
    assert {'css/s.css', 'css/other.css', 'img/bg.png', 'img/q.png'} <= set(got['files'])


# ---------------------------------------------------------------- release_dir

def test_release_dir_reads_current(root):
    assert serve.release_dir() is None
    cur = root / 'release' / 'CURRENT'
    write(str(cur), '{"dir": "20261011-abc"}')
    assert serve.release_dir() is None  # the folder is not there
    os.makedirs(root / 'release' / '20261011-abc')
    assert serve.release_dir() == os.path.join(str(root / 'release'), '20261011-abc')


@pytest.mark.parametrize('text', [
    'not json', '{}',
    pytest.param('[]', marks=pytest.mark.xfail(strict=True, raises=TypeError, reason='serve.py:511 only catches OSError, ValueError, KeyError: a CURRENT holding a list raises TypeError')),
    pytest.param('{"dir": null}', marks=pytest.mark.xfail(strict=True, raises=TypeError, reason='serve.py:510 os.path.join(RELEASES, None) raises TypeError, not caught'))])
def test_release_dir_is_none_for_a_bad_current(root, text):
    write(str(root / 'release' / 'CURRENT'), text)
    os.makedirs(root / 'release' / 'x')
    assert serve.release_dir() is None


# ---------------------------------------------------------------- HTTP: static files

def test_http_is_version_1_1_and_keeps_the_connection_alive(root, port):
    write(str(root / 'a.txt'), 'hello')
    c = http.client.HTTPConnection('127.0.0.1', port, timeout=15)
    for _ in range(3):  # several requests down one connection
        c.request('GET', '/a.txt')
        r = c.getresponse()
        assert r.version == 11
        assert r.read() == b'hello'
        assert r.getheader('Content-Length') == '5'
    c.request('GET', '/api/backups')
    r = c.getresponse()
    assert r.status == 200 and r.getheader('Content-Length') is not None
    r.read()
    c.close()


def test_http_serves_a_large_file_whole(root, port):
    blob = bytes(range(256)) * 4096  # 1 MB, over the old 510 KB cut
    (root / 'big.bin').write_bytes(blob)
    for _ in range(2):
        st, r, data = call(port, 'GET', '/big.bin')
        assert st == 200 and data == blob


def test_http_static_files_must_be_revalidated_but_the_api_not_cached(root, port):
    write(str(root / 'a.js'), 'x')
    _, r, _ = call(port, 'GET', '/a.js')
    assert r.getheader('Cache-Control') == 'no-cache'
    _, r, _ = call(port, 'GET', '/api/backups')
    assert r.getheader('Cache-Control') == 'no-store'


def test_http_content_types(root, port):
    for name, kind in [('a.js', 'text/javascript'), ('a.mjs', 'text/javascript'), ('a.webmanifest', 'application/manifest+json'),
                       ('a.woff2', 'font/woff2'), ('a.html', 'text/html'), ('a.css', 'text/css'), ('a.svg', 'image/svg+xml')]:
        write(str(root / name), 'x')
        _, r, _ = call(port, 'GET', '/' + name)
        assert r.getheader('Content-Type').split(';')[0] == kind, name


def test_http_missing_file_is_404_and_unknown_api_falls_through_to_static(root, port):
    assert call(port, 'GET', '/nope.txt')[0] == 404
    assert call(port, 'GET', '/api/unknown')[0] == 404


def test_http_does_not_serve_outside_the_root(root, port, tmp_path):
    (tmp_path / 'secret.txt').write_text('top secret')
    for p in ('/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt'):
        st, _, data = call(port, 'GET', p)
        assert b'top secret' not in data, p


# ---------------------------------------------------------------- HTTP: backups

def test_backups_list_is_empty_and_creates_the_folder(root, port):
    st, got = jcall(port, 'GET', '/api/backups')
    assert (st, got) == (200, [])
    assert os.path.isdir(root / 'backups')
    assert jcall(port, 'GET', '/api/backups/')[1] == []


def test_backup_round_trip_and_listing_newest_first(root, port):
    st, got = jcall(port, 'POST', '/api/backups/one.json', {'a': 1})
    assert (st, got) == (200, {'saved': 'backups/one.json'})
    jcall(port, 'POST', '/api/backups/two.json', {'b': 2})
    jcall(port, 'POST', '/api/backups/three.json', [1])
    now = time.time()
    for name, age in (('one.json', 300), ('two.json', 100), ('three.json', 200)):
        os.utime(root / 'backups' / name, (now - age, now - age))
    st, lst = jcall(port, 'GET', '/api/backups')
    assert [b['name'] for b in lst] == ['two.json', 'three.json', 'one.json']
    one = [b for b in lst if b['name'] == 'one.json'][0]
    assert one['size'] == len(json.dumps({'a': 1})) and abs(one['made'] - (now - 300) * 1000) < 2000
    assert jcall(port, 'GET', '/api/backups/one.json') == (200, {'a': 1})


def test_backup_get_keeps_utf8_exactly(root, port):
    text = '{"name": "Loup Solitaire éè ☃"}'
    st, got = jcall(port, 'POST', '/api/backups/u.json', json.loads(text))
    on_disk = (root / 'backups' / 'u.json').read_bytes()
    st, r, data = call(port, 'GET', '/api/backups/u.json')
    assert data == on_disk and r.getheader('Content-Type') == 'application/json; charset=utf-8'
    assert int(r.getheader('Content-Length')) == len(data)


def test_backup_names_with_spaces_and_encoded_characters(root, port):
    st, got = jcall(port, 'POST', '/api/backups/lone%20wolf%201.json', {'x': 1})
    assert st == 200 and got == {'saved': 'backups/lone wolf 1.json'}
    assert (root / 'backups' / 'lone wolf 1.json').exists()
    assert jcall(port, 'GET', '/api/backups/lone%20wolf%201.json')[1] == {'x': 1}


def test_backup_list_hides_files_that_are_not_backups(root, port):
    write(str(root / 'backups' / 'good.json'), '{}')
    write(str(root / 'backups' / 'notes.txt'), 'x')
    write(str(root / 'backups' / 'good.json.bak'), 'x')
    (root / 'backups' / 'dir.json').mkdir()
    assert [b['name'] for b in jcall(port, 'GET', '/api/backups')[1]] == ['good.json']


@pytest.mark.parametrize('name', ['..%2Fx.json', '%2e%2e%2fx.json', 'a%5Cb.json', '.hidden.json', 'a.txt', 'a.json.exe', 'a%3Ab.json',
                                  'a%00.json', '.json'])
def test_backup_post_refuses_unsafe_names(root, port, name):
    st, got = jcall(port, 'POST', '/api/backups/' + name, {'x': 1})
    assert st == 400 and got == {'error': 'not a backup file name'}
    assert not (root / 'backups').exists() or os.listdir(root / 'backups') == []
    assert not (root / 'x.json').exists()


def test_backup_post_without_a_name(root, port):
    assert jcall(port, 'POST', '/api/backups/', {})[0] == 400


def test_backup_post_must_be_json_and_non_empty(root, port):
    st, r, data = call(port, 'POST', '/api/backups/a.json', b'not json{')
    assert st == 400 and json.loads(data) == {'error': 'not JSON'}
    st, r, data = call(port, 'POST', '/api/backups/a.json', b'\xff\xfe')
    assert st == 400
    st, r, data = call(port, 'POST', '/api/backups/a.json', b'')
    assert st == 413 and json.loads(data) == {'error': 'empty or too large'}
    assert not (root / 'backups' / 'a.json').exists()


def test_backup_post_over_five_megabytes_is_refused_unread(root, port):
    st, body = declared(port, 'POST', '/api/backups/big.json', serve.MAX + 1)
    assert st == 413 and json.loads(body) == {'error': 'empty or too large'}


def test_backup_post_exactly_at_the_limit_is_taken(root, port):
    pad = serve.MAX - len('["' + '"]')
    body = ('["' + 'x' * pad + '"]').encode()
    assert len(body) == serve.MAX
    st, _, _ = call(port, 'POST', '/api/backups/limit.json', body)
    assert st == 200 and (root / 'backups' / 'limit.json').stat().st_size == serve.MAX


def test_backup_post_overwrites_whole_and_leaves_no_part_file(root, port):
    jcall(port, 'POST', '/api/backups/a.json', {'v': 1})
    jcall(port, 'POST', '/api/backups/a.json', {'v': 2})
    assert json.loads((root / 'backups' / 'a.json').read_text()) == {'v': 2}
    assert os.listdir(root / 'backups') == ['a.json']


def test_backup_post_keeps_the_body_bytes_verbatim(root, port):
    raw = b'{"a":   1,\n "b": "\xc3\xa9"}'
    call(port, 'POST', '/api/backups/raw.json', raw)
    assert (root / 'backups' / 'raw.json').read_bytes() == raw


def test_backup_get_missing_or_unsafe_is_404(root, port):
    assert jcall(port, 'GET', '/api/backups/none.json') == (404, {'error': 'no such backup'})
    assert jcall(port, 'GET', '/api/backups/..%2Fsecret.json')[0] == 404
    write(str(root / 'secret.json'), '{}')
    assert jcall(port, 'GET', '/api/backups/..%2Fsecret.json')[0] == 404
    assert jcall(port, 'GET', '/api/backups/.hidden.json')[0] == 404


def test_post_to_other_paths_is_404(root, port):
    assert jcall(port, 'POST', '/nothing', {})[0] == 404
    assert jcall(port, 'POST', '/api/nothing', {})[0] == 404


def test_backups_with_a_query_string(root, port):
    jcall(port, 'POST', '/api/backups/q.json?x=1', {'q': 1})
    assert (root / 'backups' / 'q.json').exists()
    assert jcall(port, 'GET', '/api/backups/q.json?x=1')[1] == {'q': 1}
    assert len(jcall(port, 'GET', '/api/backups?x=1')[1]) == 1


# ---------------------------------------------------------------- HTTP: /api/offline

def test_api_offline_lists_the_working_copy(root, port):
    write(str(root / 'index.html'), '<script src="main.js"></script>')
    write(str(root / 'main.js'), 'x')
    st, got = jcall(port, 'GET', '/api/offline')
    assert st == 200
    assert set(got['files']) == {'index.html', 'main.js'} and got['missing'] == [] and len(got['version']) == 16
    assert got == serve.offline_list(str(root))


# ---------------------------------------------------------------- HTTP: map labels

def test_maplabels_get_and_post(root, port):
    book(root)
    assert jcall(port, 'GET', '/api/maplabels/01fftd')[0] == 404
    assert jcall(port, 'GET', '/api/maplabels/nope')[0] == 404
    labels = [{'text': 'Holmgard', 'box': [1, 2, 3, 4], 'kind': 'town'}]
    st, got = jcall(port, 'POST', '/api/maplabels/01fftd', labels)
    assert (st, got) == (200, {'saved': 1})
    f = root / 'maps' / '01fftd' / 'labels.json'
    assert json.loads(f.read_text(encoding='utf-8')) == labels
    assert f.read_text(encoding='utf-8') == json.dumps(labels, indent=1)  # as map_labels.py writes it
    assert not (root / 'maps' / '01fftd' / 'labels.json.bak').exists()  # nothing to back up the first time
    st, r, data = call(port, 'GET', '/api/maplabels/01fftd')
    assert st == 200 and json.loads(data) == labels and r.getheader('Cache-Control') == 'no-store'


def test_maplabels_post_keeps_the_old_file_as_bak(root, port):
    book(root)
    jcall(port, 'POST', '/api/maplabels/01fftd', [{'text': 'old', 'box': [0, 0, 1, 1]}])
    jcall(port, 'POST', '/api/maplabels/01fftd', [{'text': 'new', 'box': [0, 0, 1, 1]}])
    d = root / 'maps' / '01fftd'
    assert json.loads((d / 'labels.json.bak').read_text())[0]['text'] == 'old'
    assert json.loads((d / 'labels.json').read_text())[0]['text'] == 'new'
    assert sorted(os.listdir(d)) == ['labels.json', 'labels.json.bak']


def test_maplabels_post_refusals(root, port):
    book(root)
    assert jcall(port, 'POST', '/api/maplabels/nope', [])[0] == 400
    assert jcall(port, 'POST', '/api/maplabels/..%2F..', [])[0] == 400
    st, r, data = call(port, 'POST', '/api/maplabels/01fftd', b'{bad')
    assert st == 400 and json.loads(data) == {'error': 'not JSON'}
    st, got = jcall(port, 'POST', '/api/maplabels/01fftd', [{'text': 'x'}])
    assert st == 400 and 'text (string) and box (4 numbers)' in got['error']
    assert jcall(port, 'POST', '/api/maplabels/01fftd', {'text': 'x', 'box': [1, 2, 3, 4]})[0] == 400
    st, r, data = call(port, 'POST', '/api/maplabels/01fftd', b'')
    assert st == 413
    assert declared(port, 'POST', '/api/maplabels/01fftd', serve.MAX + 1)[0] == 413
    assert not (root / 'maps' / '01fftd' / 'labels.json').exists()


# ---------------------------------------------------------------- HTTP: map editor

def test_map_api_is_refused_from_other_machines(root, port, monkeypatch):
    book(root)
    monkeypatch.setattr(serve, 'LOCAL', ('10.0.0.1',))
    for method, path in [('GET', '/api/map/books'), ('GET', '/api/map/01fftd/state'), ('POST', '/api/map/01fftd/run/import'),
                         ('POST', '/api/map/01fftd/checked'), ('POST', '/api/map/01fftd/gemini/1')]:
        st, got = jcall(port, method, path)
        assert st == 403 and got == {'error': 'the map editor runs from this machine only'}, path
    assert not (root / 'maps').exists()


def test_map_api_books_and_state(root, port):
    d = book(root)
    write(str(d / 'map.png'), 'x')
    st, got = jcall(port, 'GET', '/api/map/books')
    assert st == 200 and got == [{'code': '01fftd', 'number': 1, 'title': 'Flight', 'stage': 'not started'}]
    st, got = jcall(port, 'GET', '/api/map/01fftd/state')
    assert st == 200 and 'map.png' in got['files'] and got['rounds'] == []


def test_map_api_unknown_book_or_route(root, port):
    book(root)
    assert jcall(port, 'GET', '/api/map/nope/state') == (404, {'error': 'not a book folder'})
    assert jcall(port, 'GET', '/api/map/') == (404, {'error': 'not a book folder'})
    assert jcall(port, 'GET', '/api/map/..%2F..%2Fetc/state')[0] == 404
    assert jcall(port, 'GET', '/api/map/01fftd/nothing') == (404, {'error': 'nothing here'})
    assert jcall(port, 'GET', '/api/map/01fftd/run/upscale')[0] == 404  # run is POST only
    assert jcall(port, 'POST', '/api/map/01fftd/state')[0] == 404
    assert jcall(port, 'POST', '/api/map/01fftd/gemini/abc')[0] == 404
    assert jcall(port, 'POST', '/api/map/01fftd/gemini/1234')[0] == 404


def test_map_checked_marks_and_unmarks(root, port):
    book(root)
    f = root / 'maps' / '01fftd' / 'labels-checked.txt'
    st, got = jcall(port, 'POST', '/api/map/01fftd/checked')
    assert st == 200 and f.exists() and 'labels-checked.txt' in got['files']
    assert len(f.read_text().strip()) == len('2026-10-11 12:00')
    st, got = jcall(port, 'POST', '/api/map/01fftd/checked?undo=1')
    assert st == 200 and not f.exists() and 'labels-checked.txt' not in got['files']
    assert jcall(port, 'POST', '/api/map/01fftd/checked?undo=1')[0] == 200  # nothing to remove: still fine


def test_map_run_runs_the_step_and_reports_code_and_output(root, port, monkeypatch):
    book(root)
    monkeypatch.setattr(serve, 'PY', [sys.executable, '-c', 'print("ran")'])
    st, got = jcall(port, 'POST', '/api/map/01fftd/run/upscale')
    assert (st, got) == (200, {'code': 0, 'out': 'ran'})
    assert serve._job[0] is None and not serve._job_lock.locked()


def test_map_run_stops_at_the_first_failing_command(root, port, monkeypatch):
    d = book(root)
    write(str(d / 'work' / 'map-gemini-1.png'), 'x')
    monkeypatch.setattr(serve, 'PY', [sys.executable, '-c', 'import sys; print("first"); sys.exit(4)'])
    st, got = jcall(port, 'POST', '/api/map/01fftd/run/check?round=1')
    assert st == 200 and got['code'] == 4 and got['out'].count('first') == 1
    assert not serve._job_lock.locked()


def test_map_run_errors(root, port, monkeypatch):
    book(root)
    assert jcall(port, 'POST', '/api/map/01fftd/run/bogus') == (404, {'error': 'unknown step'})
    assert jcall(port, 'POST', '/api/map/01fftd/run/prompt')[0] == 400
    assert jcall(port, 'POST', '/api/map/01fftd/run/check?round=3')[0] == 404
    monkeypatch.setattr(serve, 'PY', [sys.executable, '-c', 'print(1)'])
    serve._job_lock.acquire()
    serve._job[0] = 'something'
    try:
        st, got = jcall(port, 'POST', '/api/map/01fftd/run/upscale')
        assert st == 409 and got == {'error': 'busy: something is running'}
    finally:
        serve._job[0] = None
        serve._job_lock.release()


def test_map_run_letter_remembers_the_list_it_lettered_from(root, port, monkeypatch):
    d = book(root)
    write(str(root / 'maps' / '01fftd' / 'labels.json'), '[{"text":"a"}]')
    monkeypatch.setattr(serve, 'PY', [sys.executable, '-c', 'pass'])
    assert jcall(port, 'POST', '/api/map/01fftd/run/letter')[1]['code'] == 0
    assert (d / 'work' / 'map-labels-lettered.json').read_text() == '[{"text":"a"}]'
    os.remove(d / 'work' / 'map-labels-lettered.json')
    monkeypatch.setattr(serve, 'PY', [sys.executable, '-c', 'import sys; sys.exit(1)'])
    jcall(port, 'POST', '/api/map/01fftd/run/letter')
    assert not (d / 'work' / 'map-labels-lettered.json').exists()  # a failed step leaves it alone


def post_image(port, path, body, kind='image/png'):
    return jcall_raw(port, path, body, {'Content-Type': kind})


def jcall_raw(port, path, body, headers):
    st, r, data = call(port, 'POST', path, body, headers)
    return st, json.loads(data)


def test_map_upload_saves_a_round_image(root, port):
    d = book(root)
    st, got = post_image(port, '/api/map/01fftd/gemini/3', PNG)
    assert (st, got) == (200, {'saved': 'map-gemini-3.png', 'size': len(PNG)})
    assert (d / 'work' / 'map-gemini-3.png').read_bytes() == PNG
    assert os.listdir(d / 'work') == ['map-gemini-3.png']
    jpg = b'\xff\xd8\xff\xe0' + b'0' * 10
    assert post_image(port, '/api/map/01fftd/gemini/4', jpg, 'image/jpeg; q=1')[1]['saved'] == 'map-gemini-4.jpg'
    webp = b'RIFF' + b'0' * 10
    assert post_image(port, '/api/map/01fftd/gemini/5', webp, 'IMAGE/WEBP')[1]['saved'] == 'map-gemini-5.webp'


def test_map_upload_will_not_overwrite_without_force(root, port):
    d = book(root)
    post_image(port, '/api/map/01fftd/gemini/1', PNG)
    st, got = post_image(port, '/api/map/01fftd/gemini/1', PNG + b'more')
    assert st == 409 and got['error'] == 'map-gemini-1 exists' and got['have'] == ['map-gemini-1.png']
    assert (d / 'work' / 'map-gemini-1.png').read_bytes() == PNG
    webp = b'RIFF' + b'1' * 9
    st, got = post_image(port, '/api/map/01fftd/gemini/1?force=1', webp, 'image/webp')
    assert st == 200 and got['saved'] == 'map-gemini-1.webp'
    assert os.listdir(d / 'work') == ['map-gemini-1.webp']  # the old png is gone


def test_map_upload_refusals(root, port):
    d = book(root)
    st, got = post_image(port, '/api/map/01fftd/gemini/1', PNG, 'text/plain')
    assert st == 400 and 'Content-Type' in got['error']
    st, got = jcall_raw(port, '/api/map/01fftd/gemini/1', PNG, {})
    assert st == 400
    st, got = post_image(port, '/api/map/01fftd/gemini/1', b'GIF89a-not-a-png')
    assert st == 400 and got == {'error': 'the bytes are not that image type'}
    st, got = post_image(port, '/api/map/01fftd/gemini/1', b'')
    assert st == 413
    assert not any(n.startswith('map-gemini') for n in (os.listdir(d / 'work') if (d / 'work').exists() else []))
    c = http.client.HTTPConnection('127.0.0.1', port, timeout=15)
    c.putrequest('POST', '/api/map/01fftd/gemini/1')
    c.putheader('Content-Type', 'image/png')
    c.putheader('Content-Length', str(serve.MAP_MAX + 1))
    c.endheaders()
    r = c.getresponse()
    assert r.status == 413
    c.close()


def test_map_upload_leaves_no_part_file_and_keeps_the_connection_usable_after_a_refusal(root, port):
    d = book(root)
    c = http.client.HTTPConnection('127.0.0.1', port, timeout=15)
    c.request('POST', '/api/map/01fftd/gemini/1', body=PNG, headers={'Content-Type': 'text/plain'})
    r = c.getresponse()
    assert r.status == 400
    r.read()
    c.request('GET', '/api/map/books')  # the refused body was read, so the same connection still works
    assert c.getresponse().status == 200
    c.close()


# ---------------------------------------------------------------- admin stages

def test_admin_stage_table_is_closed_and_gated_where_it_must_be():
    assert set(serve.ADMIN_STAGES) == {'fetch', 'fetch-rules', 'import', 'reading', 'check-items', 'approve-pictures',
                                       'offline', 'syntax', 'reimport-all', 'release'}
    gated = {k for k, v in serve.ADMIN_STAGES.items() if v.get('gated')}
    assert gated == {'fetch', 'fetch-rules', 'import', 'approve-pictures', 'reimport-all', 'release'}
    for k, spec in serve.ADMIN_STAGES.items():
        assert spec['timeout'] > 0 and spec['title']
        for argv in spec['cmds']('01fftd'):
            assert isinstance(argv, list) and all(isinstance(a, str) for a in argv)


def test_admin_stage_commands():
    s = serve.ADMIN_STAGES
    assert s['fetch']['cmds']('01fftd') == [serve.PY + ['tools/fetch_projectaon.py', '01fftd']]
    assert s['fetch-rules']['cmds']('01fftd') == [serve.PY + ['tools/fetch_projectaon.py', '01fftd', '--rules']]
    assert s['import']['cmds']('01fftd') == [serve.PY + ['tools/import_projectaon.py', '01fftd']]
    assert s['reading']['cmds']('01fftd') == [serve.PY + ['tools/reading_copy.py', '01fftd'], serve.PY + ['tools/item_sections.py', '01fftd']]
    assert s['check-items']['cmds']('01fftd') == [['node', 'tools/check_items.mjs', '01fftd', '--json']]
    assert s['approve-pictures']['cmds']('01fftd') == [['node', 'tools/plates_pin.mjs', '01fftd', '--approve']]
    assert s['offline']['cmds']('') == [serve.PY + ['tools/offline_check.py']]
    assert s['syntax']['cmds']('') == [serve.PY + ['tools/syntax_check.py']]
    assert s['reimport-all']['cmds']('') == [serve.PY + ['tools/reimport_all.py']]
    assert s['release']['cmds']('') == [serve.PY + ['tools/release.py']]
    assert not s['offline']['book'] and not s['syntax']['book'] and not s['reimport-all']['book'] and not s['release']['book']


def test_job_view_hides_lines_but_slices_them():
    job = {'id': 1, 'state': 'running', 'lines': ['a', 'b', 'c']}
    assert serve._job_view(job) == {'id': 1, 'state': 'running', 'from': 0, 'lines': ['a', 'b', 'c'], 'total': 3}
    assert serve._job_view(job, 2) == {'id': 1, 'state': 'running', 'from': 2, 'lines': ['c'], 'total': 3}
    assert serve._job_view(job, 9)['lines'] == []


@pytest.fixture
def idle():
    """No job running before or after; waits for any a test started."""
    yield
    for _ in range(200):
        if not serve._job_lock.locked():
            return
        time.sleep(0.05)
    pytest.fail('a job is still holding the lock')


def wait_done(job, secs=20):
    end = time.time() + secs
    while time.time() < end:
        if job['state'] != 'running' and not serve._job_lock.locked():
            return job
        time.sleep(0.02)
    pytest.fail('job did not finish')


def stage(monkeypatch, name, code, extra=None, timeout=30, **spec):
    monkeypatch.setitem(serve.ADMIN_STAGES, name, {'title': 'Test', 'book': False, 'timeout': timeout,
                                                   'cmds': lambda c: [[sys.executable, '-c', code]], **spec})


def test_admin_start_unknown_stage_and_book(root, idle):
    assert serve.admin_start('nope', '', None) == (None, 'unknown stage', 404)
    assert serve.admin_start('fetch', '', None) == (None, 'not a book in the catalogue', 404)
    assert serve.admin_start('fetch', 'zz', 'zz') == (None, 'not a book in the catalogue', 404)
    assert serve.admin_start('fetch', '../x', None)[2] == 404


def test_admin_start_gated_stage_needs_the_matching_confirmation(root, idle):
    for confirm in (None, '', 'yes', '02fotw', True):
        assert serve.admin_start('fetch', '01fftd', confirm) == (None, "this step needs the owner's confirmation", 428)
    assert serve.admin_start('fetch', '1', '1')[2] == 428  # the confirmation is the code, not the number
    assert serve.admin_start('release', '', None)[2] == 428
    assert serve.admin_start('release', '', '01fftd')[2] == 428
    assert serve.admin_start('reimport-all', '', 'x')[2] == 428
    assert not serve._job_lock.locked() and serve._jobs == {}


def test_admin_start_folder_and_known_checks(root, idle, monkeypatch):
    import book_status
    assert serve.admin_start('reading', '01fftd', None) == (None, 'that book is not downloaded', 409)
    assert serve.admin_start('check-items', '1', None)[2] == 409
    monkeypatch.setattr(book_status, 'importer_books', lambda: set())
    assert serve.admin_start('import', '01fftd', '01fftd') == (None, 'the importer does not know that book', 409)
    assert serve.admin_start('import', '01fftd', None)[2] == 409  # known is checked before the gate
    assert serve._jobs == {}


def test_admin_start_resolves_a_number_to_the_code(root, idle, monkeypatch):
    stage(monkeypatch, 'tst', 'print("x")', book=True, cmds=lambda c: [[sys.executable, '-c', f'print({c!r})']])
    job, err, _ = serve.admin_start('tst', '3', None)
    wait_done(job)
    assert job['book'] == '03tcok' and job['title'] == '03tcok: Test' and 'tcok' in ''.join(job['lines'])


def test_admin_job_runs_commands_in_order_and_keeps_output(root, idle, monkeypatch):
    monkeypatch.setitem(serve.ADMIN_STAGES, 'tst', {'title': 'Two', 'book': False, 'timeout': 30, 'cmds': lambda c: [
        [sys.executable, '-c', 'print("one"); print("two")'], [sys.executable, '-c', 'print("three")']]})
    job, err, code = serve.admin_start('tst', '', None)
    assert err is None and code == 0 and job['state'] == 'running' and serve._job[0] == 'Two'
    wait_done(job)
    assert job['state'] == 'done' and job['code'] == 0 and job['ended'] >= job['started']
    lines = job['lines']
    assert lines[0].startswith('$ ') and lines[1:3] == ['one', 'two'] and lines[3].startswith('$ ') and lines[4] == 'three'
    assert serve._job[0] is None and serve._jobs[job['id']] is job


def test_admin_job_failure_stops_the_chain(root, idle, monkeypatch):
    monkeypatch.setitem(serve.ADMIN_STAGES, 'tst', {'title': 'F', 'book': False, 'timeout': 30, 'cmds': lambda c: [
        [sys.executable, '-c', 'import sys; sys.exit(3)'], [sys.executable, '-c', 'print("never")']]})
    job, _, _ = serve.admin_start('tst', '', None)
    wait_done(job)
    assert job['state'] == 'failed' and job['code'] == 3 and job['lines'][-1] == '[exit 3]'
    assert 'never' not in job['lines']


def test_admin_job_that_cannot_start_fails(root, idle, monkeypatch):
    monkeypatch.setitem(serve.ADMIN_STAGES, 'tst', {'title': 'X', 'book': False, 'timeout': 30, 'cmds': lambda c: [['no-such-program-xyz']]})
    job, _, _ = serve.admin_start('tst', '', None)
    wait_done(job)
    assert job['state'] == 'failed' and job['code'] == -1 and any(l.startswith('could not start') for l in job['lines'])


def test_admin_job_timeout_kills_it(root, idle, monkeypatch):
    stage(monkeypatch, 'tst', 'import time; time.sleep(60)', timeout=0.5)
    job, _, _ = serve.admin_start('tst', '', None)
    wait_done(job)
    assert job['state'] == 'failed' and job['lines'][-1].endswith('(timed out)')


def test_admin_job_busy_while_one_runs(root, idle, monkeypatch):
    stage(monkeypatch, 'slow', 'import time; time.sleep(1.5)')
    job, _, _ = serve.admin_start('slow', '', None)
    assert serve.admin_start('slow', '', None) == (None, 'busy: Test is running', 409)
    wait_done(job)
    job2, err, _ = serve.admin_start('slow', '', None)
    assert err is None and job2['id'] == job['id'] + 1
    wait_done(job2)


def test_admin_jobs_kept_are_the_last_ten(root, idle, monkeypatch):
    stage(monkeypatch, 'q', 'pass')
    ids = []
    for _ in range(12):
        job, _, _ = serve.admin_start('q', '', None)
        wait_done(job)
        ids.append(job['id'])
    assert sorted(serve._jobs) == ids[-10:]


def test_admin_job_output_is_capped(root, idle, monkeypatch):
    monkeypatch.setattr(serve, 'JOB_LINES', 50)
    stage(monkeypatch, 'q', 'print("\\n".join(str(i) for i in range(500)))')
    job, _, _ = serve.admin_start('q', '', None)
    wait_done(job)
    assert len(job['lines']) == 50 and job['state'] == 'done'


# ---------------------------------------------------------------- HTTP: admin

def test_admin_api_is_refused_from_other_machines(root, port, monkeypatch):
    monkeypatch.setattr(serve, 'LOCAL', ())
    for method, path in [('GET', '/api/admin/status'), ('GET', '/api/admin/jobs'), ('POST', '/api/admin/run/release'),
                         ('POST', '/api/admin/mark/01fftd/1'), ('POST', '/api/admin/plate'), ('GET', '/api/admin/standins')]:
        st, got = jcall(port, method, path)
        assert st == 403 and got == {'error': 'the dashboard runs from this machine only'}, path
    assert serve._jobs == {}


def test_admin_status_adds_the_running_job(root, port, monkeypatch):
    import book_status
    monkeypatch.setattr(book_status, 'all_status', lambda: {'books': [1, 2]})
    assert jcall(port, 'GET', '/api/admin/status') == (200, {'books': [1, 2], 'running': None})
    serve._job[0] = 'Syntax check'
    try:
        assert jcall(port, 'GET', '/api/admin/status')[1]['running'] == 'Syntax check'
    finally:
        serve._job[0] = None


def test_admin_release_status_route(root, port, monkeypatch):
    import release
    monkeypatch.setattr(release, 'status', lambda: {'current': {}, 'dirty': 0})
    assert jcall(port, 'GET', '/api/admin/release') == (200, {'current': {}, 'dirty': 0})


def test_admin_standins_route(root, port, monkeypatch):
    import plates_file
    monkeypatch.setattr(plates_file, 'standins', lambda: [{'src': 'a.webp', 'group': 'g', 'size': 1}])
    assert jcall(port, 'GET', '/api/admin/standins') == (200, [{'src': 'a.webp', 'group': 'g', 'size': 1}])


def test_admin_run_over_http_gated_and_unknown(root, port, idle):
    assert jcall(port, 'POST', '/api/admin/run/nope')[0] == 404
    assert jcall(port, 'POST', '/api/admin/run/fetch?book=01fftd') == (428, {'error': "this step needs the owner's confirmation"})
    assert jcall(port, 'POST', '/api/admin/run/fetch', {'confirm': '01fftd'})[0] == 404  # no ?book=
    assert jcall(port, 'POST', '/api/admin/run/release', {'confirm': '01fftd'})[0] == 428
    assert jcall(port, 'POST', '/api/admin/run/release')[0] == 428
    assert serve._jobs == {}  # a wrong or missing confirmation never starts a job


def test_admin_run_over_http_runs_a_job_and_serves_its_lines(root, port, idle, monkeypatch):
    stage(monkeypatch, 'tst', 'print("alpha"); print("beta")')
    st, got = jcall(port, 'POST', '/api/admin/run/tst')
    assert st == 200 and got['stage'] == 'tst' and got['from'] == 0 and got['state'] == 'running' and 'lines' in got
    jid = got['id']
    wait_done(serve._jobs[jid])
    st, got = jcall(port, 'GET', f'/api/admin/jobs/{jid}')
    assert st == 200 and got['state'] == 'done' and got['code'] == 0 and got['lines'][1:] == ['alpha', 'beta'] and got['total'] == 3
    st, got = jcall(port, 'GET', f'/api/admin/jobs/{jid}?from=2')
    assert got['from'] == 2 and got['lines'] == ['beta']
    assert jcall(port, 'GET', f'/api/admin/jobs/{jid}?from=abc')[1]['from'] == 0
    assert jcall(port, 'GET', '/api/admin/jobs/99999')[0] == 404
    assert jcall(port, 'GET', '/api/admin/jobs/abc')[0] == 404
    st, lst = jcall(port, 'GET', '/api/admin/jobs')
    assert st == 200 and [j['id'] for j in lst] == [jid] and 'lines' in lst[0] and lst[0]['from'] == lst[0]['total']


def test_admin_run_with_a_confirm_in_the_body_starts_a_gated_job(root, port, idle, monkeypatch):
    stage(monkeypatch, 'tst', 'print("ok")', gated=True)
    assert jcall(port, 'POST', '/api/admin/run/tst')[0] == 428
    assert jcall(port, 'POST', '/api/admin/run/tst', {'confirm': 'tst'})[0] == 428
    st, got = jcall(port, 'POST', '/api/admin/run/tst', {'confirm': 'all'})
    assert st == 200
    wait_done(serve._jobs[got['id']])


def test_admin_run_when_busy_over_http(root, port, idle, monkeypatch):
    stage(monkeypatch, 'slow', 'import time; time.sleep(1.5)')
    st, got = jcall(port, 'POST', '/api/admin/run/slow')
    assert st == 200
    st, busy = jcall(port, 'POST', '/api/admin/run/slow')
    assert st == 409 and busy['error'].startswith('busy')
    # the map editor's steps share the one lock
    book(root)
    assert jcall(port, 'POST', '/api/map/01fftd/run/import')[0] == 409
    wait_done(serve._jobs[got['id']])


def test_admin_post_body_rules(root, port):
    st, r, data = call(port, 'POST', '/api/admin/run/nope', b'{bad')
    assert st == 400 and json.loads(data) == {'error': 'not JSON'}
    assert call(port, 'POST', '/api/admin/run/nope', b'[1, 2]')[0] == 404  # a non-object body counts as empty
    st, body = declared(port, 'POST', '/api/admin/run/nope', 64 * 1024 + 1)
    assert st == 413 and json.loads(body) == {'error': 'too large'}
    st, body = declared(port, 'POST', '/api/admin/plate', 25 * 1024 * 1024 + 1)
    assert st == 413


def test_admin_unknown_route(root, port):
    assert jcall(port, 'GET', '/api/admin/nothing') == (404, {'error': 'nothing here'})
    assert jcall(port, 'GET', '/api/admin/')[0] == 404
    assert jcall(port, 'POST', '/api/admin/status')[0] == 404


def test_admin_mark_calls_book_status(root, port, monkeypatch):
    import book_status
    calls = []

    def fake(book, step, undo=False, run_checks=True):
        calls.append((book, step, undo, run_checks))
        return (step != 9), f'msg {step}'
    monkeypatch.setattr(book_status, 'mark', fake)
    assert jcall(port, 'POST', '/api/admin/mark/01fftd/4') == (200, {'ok': True, 'message': 'msg 4'})
    assert jcall(port, 'POST', '/api/admin/mark/01fftd/4?undo=1')[0] == 200
    assert jcall(port, 'POST', '/api/admin/mark/01fftd/9') == (409, {'ok': False, 'message': 'msg 9'})
    assert calls == [('01fftd', 4, False, False), ('01fftd', 4, True, False), ('01fftd', 9, False, False)]
    assert jcall(port, 'POST', '/api/admin/mark/01fftd/x')[0] == 404
    assert jcall(port, 'GET', '/api/admin/mark/01fftd/4')[0] == 404
    assert len(calls) == 3


def test_admin_plate_refuses_a_book_that_is_not_imported(root, port):
    assert jcall(port, 'POST', '/api/admin/plate', {'book': '01fftd', 'enemy': 'x'}) == (404, {'error': 'not an imported book'})
    assert jcall(port, 'POST', '/api/admin/plate', {'enemy': 'x'})[0] == 404
    assert jcall(port, 'POST', '/api/admin/plate', {'book': 'nope', 'enemy': 'x'})[0] == 404
    assert jcall(port, 'POST', '/api/admin/plate', {'book': '1', 'enemy': 'x'})[0] == 404  # catalogued, but no book.js


def test_admin_plate_bad_base64_is_a_400(root, port):
    book(root)
    st, got = jcall(port, 'POST', '/api/admin/plate', {'book': '01fftd', 'enemy': 'x', 'image': '!!not base64!!'})
    assert st == 400 and 'error' in got


def test_admin_plate_passes_the_request_to_plates_file(root, port, monkeypatch):
    import base64
    import book_status
    import plates_file
    book(root)
    seen = {}

    def put(code, bk, enemy, **kw):
        seen.update(code=code, bk=bk, enemy=enemy, **kw)
        return {'src': 'x'}, 'saved'
    monkeypatch.setattr(plates_file, 'put', put)
    monkeypatch.setattr(book_status, 'load_book', lambda c: {'loaded': c})
    img = base64.b64encode(b'RIFFxxxx').decode()
    st, got = jcall(port, 'POST', '/api/admin/plate', {'book': '1', 'enemy': 'Giak', 'image': img, 'crop': [1, 2], 'levels': [3], 'remove': 1})
    assert (st, got) == (200, {'entry': {'src': 'x'}, 'message': 'saved'})
    assert seen == {'code': '01fftd', 'bk': {'loaded': '01fftd'}, 'enemy': 'Giak', 'image': b'RIFFxxxx', 'crop': [1, 2],
                    'levels': [3], 'remove': True, 'src': None}


def test_admin_plate_value_errors_become_400(root, port, monkeypatch):
    import book_status
    import plates_file
    book(root)

    def put(*a, **k):
        raise ValueError('no such enemy')
    monkeypatch.setattr(plates_file, 'put', put)
    monkeypatch.setattr(book_status, 'load_book', lambda c: {})
    assert jcall(port, 'POST', '/api/admin/plate', {'book': '01fftd', 'enemy': 'x'}) == (400, {'error': 'no such enemy'})


def test_admin_plate_repins_an_approved_book(root, port, monkeypatch):
    import book_status
    import plates_file
    book(root)
    write(str(root / 'assets/plates/approved/01fftd.json'), '{}')
    monkeypatch.setattr(plates_file, 'put', lambda *a, **k: ({}, 'ok'))
    monkeypatch.setattr(book_status, 'load_book', lambda c: {})
    ran = []
    monkeypatch.setattr(serve.subprocess, 'run', lambda argv, **kw: ran.append((argv, kw)))
    assert jcall(port, 'POST', '/api/admin/plate', {'book': '01fftd', 'enemy': 'Giak'})[0] == 200
    assert len(ran) == 1
    assert ran[0][0] == ['node', os.path.join('tools', 'plates_pin.mjs'), '01fftd', '--approve-name', 'Giak']
    assert ran[0][1]['cwd'] == str(root)
    os.remove(root / 'assets/plates/approved/01fftd.json')
    jcall(port, 'POST', '/api/admin/plate', {'book': '01fftd', 'enemy': 'Giak'})
    assert len(ran) == 1  # a book not yet approved is not pinned


# ---------------------------------------------------------------- --release mode

@pytest.fixture
def rel(root, monkeypatch):
    d = root / 'release' / 'r1'
    write(str(d / 'index.html'), '<script src="main.js"></script>')
    write(str(d / 'main.js'), 'x')
    write(str(root / 'release' / 'CURRENT'), '{"dir": "r1"}')
    write(str(root / 'index.html'), 'WORKING COPY')
    monkeypatch.setattr(serve, 'RELEASE', True)
    return d


def start_release():
    handler = lambda *a, **kw: serve.Handler(*a, directory=serve.release_dir() or '', **kw)
    srv = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


@pytest.fixture
def rport(rel):
    srv = start_release()
    yield srv.server_address[1]
    srv.shutdown()
    srv.server_close()


def test_release_serves_the_released_files_not_the_working_copy(rel, rport):
    st, _, data = call(rport, 'GET', '/index.html')
    assert st == 200 and b'script src' in data and b'WORKING COPY' not in data
    assert call(rport, 'GET', '/sw.js')[0] == 404


def test_release_api_offline_lists_the_release(rel, rport):
    st, got = jcall(rport, 'GET', '/api/offline')
    assert st == 200 and set(got['files']) == {'index.html', 'main.js'}


def test_release_takes_over_a_new_release_without_a_restart(rel, rport, root):
    d2 = root / 'release' / 'r2'
    write(str(d2 / 'index.html'), 'second')
    write(str(root / 'release' / 'CURRENT'), '{"dir": "r2"}')
    assert call(rport, 'GET', '/index.html')[2] == b'second'
    assert set(jcall(rport, 'GET', '/api/offline')[1]['files']) == {'index.html'}


def test_release_has_no_map_admin_or_maplabels_api(rel, rport, root):
    book(root)
    for path in ('/api/map/books', '/api/admin/status', '/api/maplabels/01fftd', '/api/unknown'):
        assert jcall(rport, 'GET', path) == (404, {'error': 'not in a release'}), path
    for path in ('/api/map/01fftd/checked', '/api/admin/run/release', '/api/maplabels/01fftd', '/anything'):
        assert jcall(rport, 'POST', path, []) == (404, {'error': 'not in a release'}), path
    assert not (root / 'maps').exists()


def test_release_keeps_the_backups_api(rel, rport, root):
    assert jcall(rport, 'POST', '/api/backups/x.json', {'a': 1})[0] == 200
    assert (root / 'backups' / 'x.json').exists()
    assert jcall(rport, 'GET', '/api/backups/x.json')[1] == {'a': 1}
    assert [b['name'] for b in jcall(rport, 'GET', '/api/backups')[1]] == ['x.json']


def test_release_with_nothing_released_answers_503(root, monkeypatch):
    monkeypatch.setattr(serve, 'RELEASE', True)
    srv = start_release()
    try:
        p = srv.server_address[1]
        assert jcall(p, 'GET', '/index.html') == (503, {'error': 'nothing released yet: run python tools/release.py'})
        assert jcall(p, 'GET', '/api/offline') == (503, {'error': 'nothing released yet'})
        assert jcall(p, 'GET', '/api/backups')[0] == 200
    finally:
        srv.shutdown()
        srv.server_close()


@pytest.mark.xfail(strict=True, reason='serve.py do_POST (backups 400 at ~line 768, 404 at ~765/757) answers without reading the body '
                   'and without closing the connection: on HTTP/1.1 keep-alive the unread body is parsed as the next request line')
@pytest.mark.parametrize('path', ['/api/backups/bad.txt', '/nothing'])
def test_a_refused_post_does_not_poison_the_kept_alive_connection(root, port, path):
    c = http.client.HTTPConnection('127.0.0.1', port, timeout=15)
    try:
        c.request('POST', path, body=b'{"x": 1}')
        r = c.getresponse()
        r.read()
        assert r.status in (400, 404)
        c.request('GET', '/api/backups')
        r = c.getresponse()
        assert r.status == 200
    finally:
        c.close()
