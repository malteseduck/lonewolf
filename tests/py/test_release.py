"""tools/release.py with no real git and no subprocess: release.git is replaced by FakeGit, which
holds stand-in commits and answers the calls release.py makes. release.ROOT and release.RELEASES
point into tmp_path, so the real repository and its release/ are never touched."""
import io
import json
import os
import sys
import tarfile

import pytest

import release

PAGE = '<script src="main.js"></script><script src="data/projectaon/index.js"></script>'
BASE = {
    'index.html': PAGE, 'main.js': 'v1', 'sw.js': 'sw', 'README.md': 'not needed offline',
    'docs/guide.md': 'not needed offline', 'assets/icons/key.svg': '<svg/>',
}


class FakeGit:
    """commits: list of (sha, subject, {path: text}); the last is HEAD. ignored: paths git ignores."""

    def __init__(self):
        self.commits = []
        self.ignored = {'data/projectaon/index.js'}
        self.dirty = []
        self.pushed = None  # the commit origin/main is at

    def commit(self, subject, **changes):
        files = dict(self.commits[-1][2]) if self.commits else {}
        files.update(changes)
        sha = f'abc{len(self.commits):04d}'
        self.commits.append((sha, subject, files))
        return sha

    def find(self, ref):
        if ref == 'HEAD':
            return self.commits[-1]
        return next((c for c in self.commits if c[0] == ref), None)

    def tar(self, files):
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode='w') as t:
            for rel, text in files.items():
                b = text.encode()
                ti = tarfile.TarInfo(rel)
                ti.size = len(b)
                t.addfile(ti, io.BytesIO(b))
        return buf.getvalue()

    def __call__(self, *args, data=None, ok=(0,)):
        cmd = args[0]
        if cmd == 'log':
            c = self.find(args[-1])
            if args[2] == '--format=%s':
                return c[1].encode() + b'\n'
            return f'{c[0]}\0{c[1]}\n'.encode()
        if cmd == 'rev-parse':
            c = self.find(args[-1].split('^{commit}')[0])
            if c is None:
                sys.exit(f'git {" ".join(args)} failed: unknown revision')
            return c[0].encode() + b'\n'
        if cmd == 'archive':
            return self.tar(self.find(args[-1])[2])
        if cmd == 'check-ignore':
            names = data.decode().split('\0')
            assert 1 in ok  # git exits 1 when none are ignored
            return '\0'.join(n for n in names if n in self.ignored).encode()
        if cmd == 'status':
            assert '--untracked-files=no' in args
            return ''.join(f' M {d}\n' for d in self.dirty).encode()
        raise AssertionError(f'unexpected git call {args}')

    def run(self, argv, **kw):
        """subprocess.run, which status() uses for rev-list (it must read the return code)."""
        assert argv[:3] == ['git', 'rev-list', '--count']
        old = argv[3].split('..')[0]
        if argv[3] == 'origin/main..main':  # what GitHub lacks: main is HEAD here
            old = self.pushed
        shas = [c[0] for c in self.commits]
        if old not in shas:
            return type('P', (), {'returncode': 128, 'stdout': b''})()
        return type('P', (), {'returncode': 0, 'stdout': str(len(shas) - 1 - shas.index(old)).encode() + b'\n'})()


@pytest.fixture
def env(tmp_path, monkeypatch):
    root = tmp_path / 'root'
    (root / 'data' / 'projectaon').mkdir(parents=True)
    (root / 'data' / 'projectaon' / 'index.js').write_text('idx')  # git-ignored: brought from disk
    fake = FakeGit()
    fake.commit('first commit', **BASE)
    monkeypatch.setattr(release, 'ROOT', str(root))
    monkeypatch.setattr(release, 'RELEASES', str(root / 'release'))
    monkeypatch.setattr(release, 'git', fake)
    monkeypatch.setattr(release.subprocess, 'run', fake.run)
    # one distinct timestamp per call, so releases in the same second do not collide
    n = [0]
    real = release.time.strftime

    def strftime(fmt, *a):
        if '%S' in fmt:
            n[0] += 1
            return f'20260101-0000{n[0]:02d}'
        return real(fmt, *a)
    monkeypatch.setattr(release.time, 'strftime', strftime)
    fake.root = str(root)
    fake.first = fake.commits[0][0]
    return fake


def put(env, rel, text='x'):
    p = os.path.join(env.root, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(text)


def run(monkeypatch, *args):
    monkeypatch.setattr(sys, 'argv', ['release.py', *args])
    return release.main()


def current(env):
    with open(os.path.join(env.root, 'release', 'CURRENT'), encoding='utf-8') as f:
        return json.load(f)


def read(env, rel):
    with open(os.path.join(env.root, 'release', current(env)['dir'], rel), encoding='utf-8') as f:
        return f.read()


def released_files(env):
    d = os.path.join(env.root, 'release', current(env)['dir'])
    return {os.path.relpath(os.path.join(t, n), d).replace(os.sep, '/') for t, _, ns in os.walk(d) for n in ns}


def test_release_copies_exactly_the_offline_files_plus_sw(env, monkeypatch, capsys):
    assert run(monkeypatch) == 0
    info = current(env)
    assert released_files(env) == {'index.html', 'main.js', 'sw.js', 'assets/icons/key.svg', 'data/projectaon/index.js'}
    assert info['commit'] == env.first and info['subject'] == 'first commit'
    assert info['dir'].endswith('-' + env.first) and info['files'] == 4  # sw.js is extra to the list
    assert info['bytes'] == sum(os.path.getsize(os.path.join(env.root, 'release', info['dir'], f))
                                for f in ('index.html', 'main.js', 'assets/icons/key.svg', 'data/projectaon/index.js'))
    assert len(info['version']) == 16
    out = capsys.readouterr().out
    assert f'Released {env.first} "first commit": 4 files' in out and info['version'] in out
    assert 'The iPad fetches it at its next sync' in out
    assert not os.path.exists(os.path.join(env.root, 'release', '.building'))
    assert not os.path.exists(os.path.join(env.root, 'release', 'CURRENT.part'))












def test_the_same_files_again_are_not_released_and_it_says_so(env, monkeypatch, capsys):
    run(monkeypatch)
    before = current(env)
    env.commit('docs only', **{'docs/guide.md': 'changed, but not needed offline'})
    capsys.readouterr()
    assert run(monkeypatch) == 0
    assert current(env) == before
    assert [e.name for e in os.scandir(os.path.join(env.root, 'release')) if e.is_dir()] == [before['dir']]
    assert capsys.readouterr().out.startswith(f'Nothing to release: the iPad already has exactly these files ({before["dir"]}).')


def test_a_changed_file_changes_the_version(env, monkeypatch):
    run(monkeypatch)
    v1 = current(env)['version']
    env.commit('v2', **{'main.js': 'a longer v2'})
    run(monkeypatch)
    assert current(env)['version'] != v1


def test_only_the_last_two_releases_are_kept(env, monkeypatch):
    names = []
    for i in range(3):
        env.commit(f'c{i}', **{'main.js': f'v{i}'})
        run(monkeypatch)
        names.append(current(env)['dir'])
    dirs = sorted(e.name for e in os.scandir(os.path.join(env.root, 'release')) if e.is_dir())
    assert dirs == sorted(names[-2:])
    assert os.path.isfile(os.path.join(env.root, 'release', 'CURRENT'))


def test_a_missing_file_stops_the_release_and_leaves_no_trace(env, monkeypatch):
    env.commit('dangling', **{'index.html': '<script src="main.js"></script><script src="gone.js"></script>'})
    with pytest.raises(SystemExit) as e:
        run(monkeypatch)
    msg = str(e.value)
    assert msg.startswith('Not released.') and '  missing: gone.js' in msg and 'Commit them first' not in msg
    rel = os.path.join(env.root, 'release')
    assert not os.path.exists(os.path.join(rel, 'CURRENT'))
    assert [e.name for e in os.scandir(rel)] == []  # the .building folder is gone


def test_a_file_on_disk_that_is_not_committed_nor_ignored_stops_the_release(env, monkeypatch):
    # the page also names a git-ignored book file, so check-ignore finds one ignored and one not
    env.commit('names new.js', **{'index.html': PAGE.replace('<script src="main.js">', '<script src="main.js"></script><script src="new.js">')})
    put(env, 'new.js', 'not committed')
    with pytest.raises(SystemExit) as e:
        run(monkeypatch)
    msg = str(e.value)
    assert f'  not in {env.commits[-1][0]}: new.js' in msg and msg.endswith('Commit them first.')
    assert 'data/projectaon/index.js' not in msg
    assert not os.path.exists(os.path.join(env.root, 'release', 'CURRENT'))


def test_the_stray_file_is_named_even_when_nothing_borrowed_is_ignored(env, monkeypatch):
    env.commit('names new.js', **{'index.html': '<script src="main.js"></script><script src="new.js"></script>'})
    put(env, 'new.js', 'not committed')
    with pytest.raises(SystemExit) as e:
        run(monkeypatch)
    assert 'new.js' in str(e.value) and str(e.value).endswith('Commit them first.')


def test_a_failed_release_keeps_the_previous_one(env, monkeypatch):
    run(monkeypatch)
    before = current(env)
    env.commit('bad', **{'index.html': '<script src="gone.js"></script>'})
    with pytest.raises(SystemExit):
        run(monkeypatch)
    assert current(env) == before and os.path.isdir(os.path.join(env.root, 'release', before['dir']))










def test_status_counts_commits_since_and_dirty_files(env, monkeypatch):
    run(monkeypatch)
    assert release.status()['commits_since'] == 0
    second = env.commit('second', **{'main.js': 'v2'})
    env.dirty = ['README.md']
    st = release.status()
    assert st['commits_since'] == 1 and st['dirty'] == 1
    assert st['head'] == {'commit': second, 'subject': 'second'}
    assert st['current']['commit'] == env.first


def test_status_counts_the_commits_github_lacks(env):
    assert release.status()['unpushed'] is None  # no origin/main known
    env.pushed = env.commits[-1][0]
    env.commit('second', **{'main.js': 'v2'})
    assert release.status()['unpushed'] == 1




