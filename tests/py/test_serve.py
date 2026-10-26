"""tools/serve.py, main functionality only: the backups API, the map labels API, the local-only guard,
--release mode, the offline list, the admin jobs, the map editor. Every path constant is pointed at
tmp_path. No server is started: the handler's do_GET/do_POST are called on an instance built without a
socket (see make/ask), and the job runner's subprocess is replaced by a fake that is instant."""
import email.message
import io
import json
import os
import sys
import threading
import time
import types

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


def make(method, path, body=b'', headers=None, addr='127.0.0.1', length=None, directory=None):
    """A Handler with no socket behind it: the request is in rfile/headers, and the response is
    recorded (status, headers, body) instead of written. `length` overrides the Content-Length
    header (a request that claims a body it does not send)."""
    if directory is None:  # as main() gives it to the handler
        directory = (serve.release_dir() or '') if serve.RELEASE else serve.ROOT
    if not isinstance(body, bytes):
        body = json.dumps(body).encode()
    hdrs = email.message.Message()
    for k, v in (headers or {}).items():
        hdrs[k] = v
    if 'Content-Length' not in hdrs:
        hdrs['Content-Length'] = str(len(body) if length is None else length)
    h = object.__new__(serve.Handler)
    h.path, h.command, h.requestline = path, method, f'{method} {path} HTTP/1.1'
    h.headers, h.rfile, h.wfile = hdrs, io.BytesIO(body), io.BytesIO()
    h.client_address = (addr, 50000)
    h.request_version, h.close_connection, h.directory = 'HTTP/1.1', False, directory
    h.status, h.sent = None, {}
    h.send_response = lambda code, message=None: setattr(h, 'status', code)
    h.send_header = lambda k, v: h.sent.__setitem__(k, v)
    h.end_headers = lambda: None
    h.log_message = lambda *a, **k: None
    return h


def ask(method, path, body=b'', headers=None, **kw):
    """Run the request; returns the handler, with .status, .sent (headers), .out (body bytes)."""
    h = make(method, path, body, headers, **kw)
    getattr(h, 'do_' + method)()
    h.out = h.wfile.getvalue()
    return h


def jsend(method, path, obj=None, **kw):
    h = ask(method, path, b'' if obj is None else obj, **kw)
    return h.status, json.loads(h.out)


def book(root, code='01fftd', head='{"number": 1, "title": "Flight"}'):
    write(str(root / 'data' / 'projectaon' / code / 'book.js'), head)
    return root / 'data' / 'projectaon' / code


# ---------------------------------------------------------------- small helpers

def test_name_pattern_accepts_plain_json_names_only():
    assert serve.NAME.match('lone wolf 2026-10-11.json')
    for bad in ['a.txt', 'a/b.json', 'a\\b.json', '.json', 'a.json' + chr(10)]:
        assert not serve.NAME.match(bad), repr(bad)


def test_labels_ok_wants_a_list_of_text_and_four_number_boxes():
    good = {'text': 'Anon', 'box': [1, 2.5, 3, 4]}
    assert serve._labels_ok([]) and serve._labels_ok([good])
    assert not serve._labels_ok(good)
    assert not serve._labels_ok([{'text': 'x', 'box': [1, 2, 3]}])
    assert not serve._labels_ok([{'box': [1, 2, 3, 4]}])


def test_exec_runs_a_real_command_and_merges_stderr(root):
    rc, out = serve._exec([sys.executable, '-c', 'import sys; print("hello"); sys.stderr.write("oops"); sys.exit(3)'], 20)
    assert rc == 3 and 'hello' in out and 'oops' in out


# ---------------------------------------------------------------- backups

def test_backup_saves_and_reads_back_byte_exact(root):
    raw = '{"name": "Loup Solitaire éè ☃"}'.encode('utf-8')
    assert jsend('POST', '/api/backups/lone%20wolf.json', raw) == (200, {'saved': 'backups/lone wolf.json'})
    assert (root / 'backups' / 'lone wolf.json').read_bytes() == raw
    h = ask('GET', '/api/backups/lone%20wolf.json')
    assert h.status == 200 and h.out == raw and h.sent['Content-Type'] == 'application/json; charset=utf-8'


@pytest.mark.parametrize('name', ['..%2Fx.json', 'a%5Cb.json', '.hidden.json', 'a.txt', 'a%00.json'])
def test_backup_post_refuses_unsafe_names(root, name):
    assert jsend('POST', '/api/backups/' + name, {'x': 1}) == (400, {'error': 'not a backup file name'})
    assert not (root / 'x.json').exists()
    assert not (root / 'backups').exists() or os.listdir(root / 'backups') == []


def test_backup_post_must_be_json_and_non_empty(root):
    assert jsend('POST', '/api/backups/a.json', b'not json{') == (400, {'error': 'not JSON'})
    assert jsend('POST', '/api/backups/a.json', b'') == (413, {'error': 'empty or too large'})
    assert not (root / 'backups' / 'a.json').exists()


def test_backup_list_is_newest_first_and_hides_non_backups(root):
    for name in ('one.json', 'two.json', 'three.json'):
        jsend('POST', '/api/backups/' + name, {'n': name})
    now = time.time()
    for name, age in (('one.json', 300), ('two.json', 100), ('three.json', 200)):
        os.utime(root / 'backups' / name, (now - age, now - age))
    write(str(root / 'backups' / 'notes.txt'), 'x')
    write(str(root / 'backups' / 'one.json.bak'), 'x')
    (root / 'backups' / 'dir.json').mkdir()
    assert [b['name'] for b in jsend('GET', '/api/backups')[1]] == ['two.json', 'three.json', 'one.json']


# ---------------------------------------------------------------- _drain

def test_a_refused_post_reads_its_body_and_keeps_the_connection(root):
    body = b'{"x": 1}'
    for path in ('/api/backups/bad.txt', '/nothing', '/api/maplabels/nope'):
        h = ask('POST', path, body)
        assert h.status in (400, 404) and h.rfile.tell() == len(body) and not h.close_connection, path


def test_an_over_limit_length_closes_the_connection_without_reading(root):
    h = make('POST', '/x', b'abc', length=serve.MAX + 1)
    h._drain()
    assert h.rfile.tell() == 0 and h.close_connection
    h = make('POST', '/api/backups/bad.txt', b'{"x": 1}', length=serve.MAX + 1)
    h.do_POST()
    assert h.status == 400 and h.rfile.tell() == 0 and h.close_connection


# ---------------------------------------------------------------- map labels

def test_maplabels_round_trip(root):
    book(root)
    assert jsend('GET', '/api/maplabels/01fftd')[0] == 404
    labels = [{'text': 'Holmgard', 'box': [1, 2, 3, 4], 'kind': 'town'}]
    assert jsend('POST', '/api/maplabels/01fftd', labels) == (200, {'saved': 1})
    jsend('POST', '/api/maplabels/01fftd', [{'text': 'new', 'box': [0, 0, 1, 1]}])
    d = root / 'maps' / '01fftd'
    assert json.loads((d / 'labels.json.bak').read_text()) == labels  # the previous file is kept
    h = ask('GET', '/api/maplabels/01fftd')
    assert h.status == 200 and json.loads(h.out)[0]['text'] == 'new'


def test_maplabels_post_refusal(root):
    book(root)
    st, got = jsend('POST', '/api/maplabels/01fftd', [{'text': 'x'}])
    assert st == 400 and 'text (string) and box (4 numbers)' in got['error']
    assert jsend('POST', '/api/maplabels/nope', [])[0] == 400
    assert not (root / 'maps' / '01fftd' / 'labels.json').exists()


# ---------------------------------------------------------------- local-only guard

def test_map_and_admin_apis_are_refused_from_other_machines(root, monkeypatch):
    book(root)
    monkeypatch.setattr(serve, 'LOCAL', ('10.0.0.1',))
    for method, path in [('GET', '/api/map/books'), ('POST', '/api/map/01fftd/run/import')]:
        st, got = jsend(method, path)
        assert st == 403 and got == {'error': 'the map editor runs from this machine only'}, path
    for method, path in [('GET', '/api/admin/status'), ('GET', '/api/admin/setup'), ('POST', '/api/admin/run/release')]:
        st, got = jsend(method, path)
        assert st == 403 and got == {'error': 'the dashboard runs from this machine only'}, path
    assert serve._jobs == {} and not (root / 'maps').exists()


# ---------------------------------------------------------------- --release mode and release_dir

@pytest.fixture
def rel(root, monkeypatch):
    d = root / 'release' / 'r1'
    write(str(d / 'index.html'), '<script src="main.js"></script>')
    write(str(d / 'main.js'), 'x')
    write(str(root / 'release' / 'CURRENT'), '{"dir": "r1"}')
    write(str(root / 'index.html'), 'WORKING COPY')
    monkeypatch.setattr(serve, 'RELEASE', True)
    return d


def test_release_serves_the_released_files_not_the_working_copy(rel):
    h = ask('GET', '/index.html')
    assert h.status == 200 and b'script src' in h.out and b'WORKING COPY' not in h.out
    assert set(jsend('GET', '/api/offline')[1]['files']) == {'index.html', 'main.js'}
    assert jsend('POST', '/api/backups/x.json', {'a': 1})[0] == 200  # backups stay


def test_release_has_no_map_or_admin_api(rel, root):
    book(root)
    for path in ('/api/map/books', '/api/admin/status', '/api/maplabels/01fftd'):
        assert jsend('GET', path) == (404, {'error': 'not in a release'}), path
    assert jsend('POST', '/api/admin/run/release', [])[0] == 404
    assert not (root / 'maps').exists()


def test_release_with_nothing_released_answers_503(root, monkeypatch):
    monkeypatch.setattr(serve, 'RELEASE', True)
    assert jsend('GET', '/index.html') == (503, {'error': 'nothing released yet: run python tools/release.py'})


def test_release_dir_reads_current_and_is_none_for_a_bad_one(root):
    assert serve.release_dir() is None
    os.makedirs(root / 'release' / 'x')
    for text in ('not json', '{}', '[]', '{"dir": null}'):
        write(str(root / 'release' / 'CURRENT'), text)
        assert serve.release_dir() is None, text
    write(str(root / 'release' / 'CURRENT'), '{"dir": "x"}')
    assert serve.release_dir() == os.path.join(str(root / 'release'), 'x')


# ---------------------------------------------------------------- offline_list

def test_offline_list_names_the_files_the_page_uses_and_reports_a_missing_one(tmp_path):
    s = tmp_path / 'pub'
    write(str(s / 'index.html'), '<link rel="stylesheet" href="style.css"><script src="main.js"></script>')
    write(str(s / 'style.css'), 'a{background:url(img/bg.png)}')
    write(str(s / 'img/bg.png'), 'x')
    write(str(s / 'main.js'), 'import "./side.js"; import "./gone.js"; fetch("data/x.json");')
    write(str(s / 'side.js'), 'x')
    write(str(s / 'data/x.json'), '{}')
    write(str(s / 'unused.js'), 'x')
    got = serve.offline_list(str(s))
    assert set(got['files']) == {'index.html', 'style.css', 'img/bg.png', 'main.js', 'side.js', 'data/x.json'}
    assert got['missing'] == ['gone.js']
    assert len(got['version']) == 16 and all(len(h) == 16 for h in got['files'].values())


def test_offline_list_carries_a_books_upscaled_fight_pictures(tmp_path):
    s = tmp_path / 'pub'
    write(str(s / 'index.html'), '<script src="main.js"></script>')
    write(str(s / 'main.js'), 'fetch(`assets/plates/upscaled/${id}.json`)')  # a path the walk cannot follow
    write(str(s / 'assets/plates/upscaled/02fotw.json'), json.dumps({'srcs': ['art/plates/02fotw/giak.webp', 'data/projectaon/02fotw/ill5.png']}))
    write(str(s / 'art/plates/02fotw/giak-2x.webp'), 'x')
    write(str(s / 'data/projectaon/02fotw/ill5-2x.webp'), 'x')
    got = serve.offline_list(str(s))
    assert {'assets/plates/upscaled/02fotw.json', 'art/plates/02fotw/giak-2x.webp', 'data/projectaon/02fotw/ill5-2x.webp'} <= set(got['files'])
    assert got['missing'] == []


# ---------------------------------------------------------------- admin jobs (a fake stands in for the subprocess)

@pytest.fixture
def idle(monkeypatch):
    """No job running before or after; waits for any a test started. (Asks for monkeypatch so it
    is torn down before the patches are undone.)"""
    yield
    assert serve._job_lock.acquire(timeout=10), 'a job is still holding the lock'
    serve._job_lock.release()


def wait_done(job):
    """The job runner lets go of the lock last, so getting it means the job has finished."""
    assert serve._job_lock.acquire(timeout=10), 'job did not finish'
    serve._job_lock.release()
    assert job['state'] != 'running'
    return job


@pytest.fixture
def procs(idle, monkeypatch):
    """subprocess.Popen replaced as the job runner sees it. ctl.results maps a command's first word
    to (output lines, exit code); the default is no output, exit 0. ctl.gate (clear it to hold
    every process open until the test sets it), ctl.hang (stay open until killed)."""
    ctl = types.SimpleNamespace(results={}, gate=threading.Event(), hang=False, argvs=[])
    ctl.gate.set()

    class Proc:
        def __init__(self, argv, **kw):
            ctl.argvs.append(argv)
            self.lines, self.code = ctl.results.get(argv[0], ([], 0))
            self.killed, self.returncode = threading.Event(), None
            self.stdout = self._read()

        def _read(self):
            for line in self.lines:
                yield (line + '\n').encode()
            (self.killed if ctl.hang else ctl.gate).wait(10)

        def kill(self):
            self.killed.set()

        def wait(self):
            self.returncode = -9 if self.killed.is_set() else self.code
            return self.returncode
    monkeypatch.setattr(serve.subprocess, 'Popen', Proc)
    yield ctl
    ctl.gate.set()


def stage(monkeypatch, name, cmds=(('run',),), timeout=30, **spec):
    monkeypatch.setitem(serve.ADMIN_STAGES, name, {'title': 'Test', 'book': False, 'timeout': timeout,
                                                   'cmds': lambda c: [list(a) for a in cmds], **spec})


def test_admin_stage_table_has_every_stage_with_the_right_gates():
    assert set(serve.ADMIN_STAGES) == {'fetch', 'fetch-rules', 'import', 'reading', 'items-draft', 'check-items', 'approve-pictures', 'pictures-draft', 'phrasings-scan', 'rules-diff', 'walk', 'add-book', 'map-style',
                                       'ills', 'fights-up', 'check', 'release',
                                       'setup-venv', 'setup-npm', 'setup-realesrgan', 'setup-ocr', 'setup-art'}
    gated = {k for k, v in serve.ADMIN_STAGES.items() if v.get('gated')}
    # upscaling fetches nothing; setup's downloads of files are gated, its package installs not
    assert gated == {'fetch', 'fetch-rules', 'import', 'approve-pictures', 'release', 'setup-realesrgan', 'setup-ocr', 'setup-art'}
    # the release runs the offline check first, and stops if it fails; once released, main goes to GitHub (ruling R25)
    assert serve.ADMIN_STAGES['release']['cmds']('') == [serve.PY + ['tools/offline_check.py'], serve.PY + ['tools/release.py'],
                                                         ['git', 'push', 'origin', 'main']]
    assert serve.ADMIN_STAGES['setup-art']['cmds']('') == [serve.PY + ['tools/art_sources.py', 'fetch']]  # Pillow converts
    # setup runs before tools/.venv exists, so not through PY
    assert serve.ADMIN_STAGES['setup-ocr']['cmds']('') == [['uv', 'run', '--no-project', 'python', 'tools/setup.py', 'install', 'ocr']]
    assert serve.ADMIN_STAGES['ills']['cmds']('02fotw') == [serve.PY + ['tools/ill_upscale.py', '02fotw']]
    # the item table's draft: written only where there is no table yet (tools/items_draft.mjs), so not gated
    assert serve.ADMIN_STAGES['items-draft']['cmds']('02fotw') == [['node', 'tools/items_draft.mjs', '02fotw']]
    # step 7's draft: the illustration index afresh, then the picks (tools/plates_draft.py), not gated
    assert serve.ADMIN_STAGES['pictures-draft']['cmds']('02fotw') == [serve.PY + ['tools/ill_index.py'], serve.PY + ['tools/plates_draft.py', '02fotw']]
    # step 3's scan: reads book.js, writes phrasings.json beside it (tools/phrasings_scan.py), not gated
    assert serve.ADMIN_STAGES['phrasings-scan']['cmds']('02fotw') == [serve.PY + ['tools/phrasings_scan.py', '02fotw', '--json']]
    assert serve.ADMIN_STAGES['rules-diff']['cmds']('02fotw') == [serve.PY + ['tools/rules_diff.py', '02fotw', '--json']]
    # step 6's walk: reads book.js and the item table, writes walk.json beside the book (tools/walk_book.mjs), not gated
    assert serve.ADMIN_STAGES['add-book']['cmds']('14tcok') == [serve.PY + ['tools/add_book.py', '14tcok']]
    assert serve.ADMIN_STAGES['walk']['cmds']('02fotw') == [['node', 'tools/walk_book.mjs', '02fotw', '--json']]
    assert serve.ADMIN_STAGES['fights-up']['cmds']('02fotw') == [serve.PY + ['tools/ill_upscale.py', '--fights', '02fotw']]
    for spec in serve.ADMIN_STAGES.values():
        assert spec['timeout'] > 0 and spec['title']
        assert all(isinstance(a, str) for argv in spec['cmds']('01fftd') for a in argv)
    assert serve.ADMIN_STAGES['check']['cmds']('') == [serve.PY + ['tools/check_all.py']]


def test_admin_start_refusals(root, idle):
    assert serve.admin_start('nope', '', None) == (None, 'unknown stage', 404)
    assert serve.admin_start('fetch', 'zz', 'zz') == (None, 'not a book in the catalogue', 404)
    for confirm in (None, '', 'yes', True):
        assert serve.admin_start('fetch', '01fftd', confirm) == (None, "this step needs the owner's confirmation", 428)
    assert serve.admin_start('release', '', None)[2] == 428
    assert serve._jobs == {} and not serve._job_lock.locked()


def test_admin_start_is_busy_while_a_job_runs(root, procs, monkeypatch):
    stage(monkeypatch, 'slow')
    procs.gate.clear()  # the process stays open until the test lets it go
    job, _, _ = serve.admin_start('slow', '', None)
    assert serve.admin_start('slow', '', None) == (None, 'busy: Test is running', 409)
    procs.gate.set()
    wait_done(job)


def test_admin_job_runs_commands_in_order_and_keeps_output(root, procs, monkeypatch):
    stage(monkeypatch, 'tst', cmds=[('a',), ('b',)])
    procs.results.update(a=(['one', 'two'], 0), b=(['three'], 0))
    job, err, code = serve.admin_start('tst', '', None)
    assert err is None and code == 0
    wait_done(job)
    assert job['state'] == 'done' and job['code'] == 0
    assert job['lines'] == ['$ a', 'one', 'two', '$ b', 'three']
    assert serve._job[0] is None


def test_admin_job_failure_stops_the_chain(root, procs, monkeypatch):
    stage(monkeypatch, 'tst', cmds=[('a',), ('b',)])
    procs.results.update(a=(['bad'], 3), b=(['never'], 0))
    job, _, _ = serve.admin_start('tst', '', None)
    wait_done(job)
    assert job['state'] == 'failed' and job['code'] == 3 and job['lines'][-1] == '[exit 3]'
    assert procs.argvs == [['a']]


def test_admin_jobs_kept_are_the_last_ten(root, procs, monkeypatch):
    stage(monkeypatch, 'q')
    ids = []
    for _ in range(12):
        job, _, _ = serve.admin_start('q', '', None)
        wait_done(job)
        ids.append(job['id'])
    assert sorted(serve._jobs) == ids[-10:]


def test_admin_job_timeout_kills_it(root, procs, monkeypatch):
    stage(monkeypatch, 'tst', timeout=0.05)
    procs.hang = True  # open until the timer kills it
    job, _, _ = serve.admin_start('tst', '', None)
    wait_done(job)
    assert job['state'] == 'failed' and job['lines'][-1].endswith('(timed out)')


def test_admin_run_route_starts_a_job_and_serves_its_lines(root, procs, monkeypatch):
    stage(monkeypatch, 'tst')
    procs.results['run'] = (['alpha', 'beta'], 0)
    st, got = jsend('POST', '/api/admin/run/tst')
    assert st == 200 and got['stage'] == 'tst'
    wait_done(serve._jobs[got['id']])
    st, got = jsend('GET', f"/api/admin/jobs/{got['id']}")
    assert st == 200 and got['state'] == 'done' and got['lines'][1:] == ['alpha', 'beta']


# ---------------------------------------------------------------- map editor

def test_map_books_and_state(root):
    d = book(root)
    write(str(d / 'map.png'), 'abc')
    write(str(d / 'work' / 'map-2k.png'), 'x')
    write(str(d / 'work' / 'map-gemini-2.png'), 'x')
    write(str(root / 'maps' / '01fftd' / 'labels.json'), '[]')
    assert jsend('GET', '/api/map/books') == (200, [{'code': '01fftd', 'number': 1, 'title': 'Flight', 'stage': 'gemini'}])
    st, got = jsend('GET', '/api/map/01fftd/state')
    assert st == 200 and got['rounds'] == [2] and got['files']['map.png']['size'] == 3 and 'labels.json' in got['files']
    assert jsend('GET', '/api/map/nope/state') == (404, {'error': 'not a book folder'})
    assert got['styleDraft'] is False
    write(str(root / 'maps' / '01fftd' / 'style.txt'), '# DRAFT by tools/map_labels.py style: ...\nRepaint')
    assert jsend('GET', '/api/map/01fftd/state')[1]['styleDraft'] is True


def test_map_retype_step_needs_a_label_list(root):
    book(root)
    assert serve.map_commands('retype', '01fftd', {}) == (None, 'no labels.json yet', 404)
    write(str(root / 'maps' / '01fftd' / 'labels.json'), '[]')
    assert serve.map_commands('retype', '01fftd', {})[0] == [serve.PY + ['tools/map_labels.py', 'retype', 'maps/01fftd/labels.json']]


def test_map_names_step_checks_the_list_into_work(root):
    book(root)
    assert serve.map_commands('names', '01fftd', {}) == (None, 'no labels.json yet', 404)
    write(str(root / 'maps' / '01fftd' / 'labels.json'), '[]')
    assert serve.map_commands('names', '01fftd', {})[0] == [serve.PY + [
        'tools/map_names.py', 'maps/01fftd/labels.json', 'data/projectaon/01fftd/work/map-names.json']]


def test_map_commands_builds_a_step_and_refuses_a_bad_one(root):
    d = book(root)
    cmds, err, code = serve.map_commands('upscale', '01fftd', {})
    assert err is None and code == 0
    assert cmds == [serve.PY + ['tools/map_upscale.py', 'data/projectaon/01fftd/map.png',
                                'data/projectaon/01fftd/work/map-2k.png', '--width', '2048']]
    assert os.path.isdir(d / 'work')
    assert serve.map_commands('nope', '01fftd', {}) == (None, 'unknown step', 404)
    assert serve.map_commands('prompt', '01fftd', {}) == (None, 'round must be a small integer', 400)


def post_image(path, body, kind='image/png'):
    return jsend('POST', path, body, headers={'Content-Type': kind} if kind else None)


def test_map_upload_saves_a_round_image(root):
    d = book(root)
    assert post_image('/api/map/01fftd/gemini/3', PNG) == (200, {'saved': 'map-gemini-3.png', 'size': len(PNG)})
    assert (d / 'work' / 'map-gemini-3.png').read_bytes() == PNG
    assert post_image('/api/map/01fftd/gemini/4', b'RIFF' + b'0' * 10, 'image/webp')[1]['saved'] == 'map-gemini-4.webp'


def test_map_upload_refuses_a_wrong_type(root):
    d = book(root)
    st, got = post_image('/api/map/01fftd/gemini/1', PNG, 'text/plain')
    assert st == 400 and 'Content-Type' in got['error']
    assert post_image('/api/map/01fftd/gemini/1', b'GIF89a-not-a-png') == (400, {'error': 'the bytes are not that image type'})
    assert not (d / 'work').exists() or os.listdir(d / 'work') == []


# ---------------------------------------------------------------- art sources (ADR 0038)

def test_picture_by_address_and_a_link_for_one_already_here(root, monkeypatch, tmp_path):
    import art_sources
    monkeypatch.setattr(art_sources, '_fetch', lambda url: (PNG, 'image/png') if url.endswith('.png') else (b'<html></html>', 'text/html'))
    st, got = jsend('POST', '/api/admin/picture-url', {'url': 'https://example.org/rat.png'})
    assert st == 200 and got['type'] == 'image/png' and got['data']
    st, got = jsend('POST', '/api/admin/picture-url', {'url': 'https://example.org/page'})
    assert st == 400 and 'neither a picture' in got['error']
    write(str(tmp_path / 'art' / 'plates' / 'rat.png'), PNG)
    st, got = jsend('POST', '/api/admin/art-link', {'src': 'art/plates/rat.png', 'url': 'https://example.org/rat.png'})
    assert st == 200 and art_sources.load()['art/plates/rat.png']['url'] == 'https://example.org/rat.png'
    st, got = jsend('POST', '/api/admin/art-link', {'src': 'art/plates/rat.png', 'url': None})
    assert st == 200 and art_sources.load()['art/plates/rat.png'] == {'url': None}
    st, _ = jsend('POST', '/api/admin/art-link', {'src': 'art/plates/none.png', 'url': None})
    assert st == 400  # only a picture that is here
    st, got = jsend('GET', '/api/admin/art-sources')
    assert st == 200 and [(p['src'], p['entry']) for p in got['pictures']] == [('art/plates/rat.png', {'url': None})]
    # made with an AI from a text prompt: moved into the committed library (ADR 0042)
    st, got = jsend('POST', '/api/admin/art-link', {'src': 'art/plates/rat.png', 'made': 'ai'})
    assert st == 200 and got['src'] == 'assets/plates/rat.png'
    assert (tmp_path / 'assets' / 'plates' / 'rat.png').exists() and 'art/plates/rat.png' not in art_sources.load()


# ---------------------------------------------------------------- the item sheet's icons

def test_item_sheet_icons_listed_previewed_and_an_item_glyph_changed(root, monkeypatch):
    import item_icons
    monkeypatch.setattr(item_icons, 'ROOT', str(root))
    write(str(root / 'assets' / 'icons' / 'README.txt'), '  by Lorc (https://lorcblog.blogspot.com):\n    key\n')
    write(str(root / 'assets' / 'icons' / 'key.svg'), '<svg/>')
    write(str(root / 'items' / 'items-01fftd.js'), "export const ITEMS = {\n  gem1: { name: 'Gem', kind: 'special', glyph: 'key' },\n};\n")
    write(str(root / 'itemglyphs.js'), "export const ITEM_GLYPH = {\n  dagger: 'key',\n};\n")
    monkeypatch.setattr(item_icons, '_get', lambda url: b'<svg><path d="M0 0h512v512H0z"/><path fill="#fff" d="M1 1"/></svg>')
    assert jsend('GET', '/api/admin/icons') == (200, {'local': [{'name': 'key', 'author': 'lorc'}], 'tables': ['01fftd']})
    h = ask('GET', '/api/admin/icons/preview?path=lorc/crown')
    assert h.status == 200 and h.out == b'<svg><path d="M1 1"/></svg>'
    assert jsend('GET', '/api/admin/icons/preview?path=../x')[0] == 400
    st, got = jsend('POST', '/api/admin/item-glyph', {'item': 'gem1', 'remote': 'lorc/crown'})
    assert (st, got) == (200, {'file': 'items/items-01fftd.js', 'was': 'key', 'glyph': 'crown'})
    assert "glyph: 'crown'" in open(root / 'items' / 'items-01fftd.js', encoding='utf-8').read()
    assert jsend('POST', '/api/admin/item-glyph', {'item': 'gem1', 'glyph': 'missing'})[0] == 400
    assert jsend('POST', '/api/admin/item-glyph', {'item': 'gem1', 'glyph': 'key'}, addr='192.168.1.5')[0] == 403
    # the icon sheet: one of the player's own glyphs, in glyphs.js
    write(str(root / 'glyphs.js'), "export const UI_GLYPH = {\n  crest: 'key',\n};\n")
    st, got = jsend('POST', '/api/admin/ui-glyph', {'list': 'UI_GLYPH', 'key': 'crest', 'remote': 'lorc/crown'})
    assert (st, got) == (200, {'file': 'glyphs.js', 'was': 'key', 'glyph': 'crown'})
    assert jsend('POST', '/api/admin/ui-glyph', {'list': 'UI_GLYPH', 'key': 'nope', 'glyph': 'key'})[0] == 400
    assert jsend('POST', '/api/admin/ui-glyph', {'list': 'UI_GLYPH', 'key': 'crest', 'glyph': 'key'}, addr='192.168.1.5')[0] == 403


# ---------------------------------------------------------------- Lone Wolf's pictures, baked

WEBP = b'RIFF\x10\x00\x00\x00WEBPVP8 ' + b'0' * 8


def test_hero_saves_a_baked_picture_into_assets_hero(root):
    import base64
    st, got = jsend('POST', '/api/admin/hero', {'name': 'frontis', 'data': base64.b64encode(WEBP).decode()})
    assert st == 200 and got == {'saved': 'assets/hero/frontis.webp'}
    assert (root / 'assets' / 'hero' / 'frontis.webp').read_bytes() == WEBP


@pytest.mark.parametrize('name, data', [('lone-wolf', WEBP), ('../x', WEBP), ('likeness', PNG), ('likeness', b'')])
def test_hero_refuses_another_name_or_not_webp(root, name, data):
    import base64
    st, got = jsend('POST', '/api/admin/hero', {'name': name, 'data': base64.b64encode(data).decode()})
    assert st == 400 and 'error' in got
    assert not (root / 'assets').exists()


# ---------------------------------------------------------------- proposal sheet (ruling R23)

def test_proposals_route_records_a_decision_and_finishes_the_round(root, monkeypatch):
    import plates_proposals
    monkeypatch.setattr(plates_proposals, 'ROOT', str(root))
    d = root / 'data' / 'projectaon' / '05xx'
    d.mkdir(parents=True)
    (d / 'plate-proposals.json').write_text(json.dumps({'enemies': [{'name': 'Mire Toad', 'candidates': []}]}), encoding='utf-8')
    st, got = jsend('POST', '/api/admin/proposals', {'book': '05xx', 'enemy': 'Mire Toad', 'how': 'kept'})
    assert st == 200 and got['row']['decided']['how'] == 'kept' and got['open'] == 0
    st, got = jsend('POST', '/api/admin/proposals', {'book': '05xx', 'enemy': 'Nobody', 'how': 'kept'})
    assert st == 400
    st, got = jsend('POST', '/api/admin/proposals/finish', {'book': '05xx'})
    assert st == 200 and got['rows'] == 1 and (d / 'plate-proposals.done.json').exists()
    assert jsend('POST', '/api/admin/proposals/finish', {'book': '05xx'})[0] == 400
    assert jsend('POST', '/api/admin/proposals', {'book': '../x', 'enemy': 'Mire Toad', 'how': 'kept'})[0] == 400
