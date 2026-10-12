"""tools/release.py, run against a throwaway git repository in tmp_path: release.ROOT and
release.RELEASES are pointed there, so the real repository and its release/ are never touched."""
import json
import os
import subprocess
import sys

import pytest

import release


def sh(cwd, *args):
    return subprocess.run(['git', *args], cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()


def put(root, rel, text='x'):
    p = os.path.join(root, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(text)


def commit(root, msg):
    sh(root, 'add', '-A')
    sh(root, 'commit', '-q', '-m', msg)
    return sh(root, 'rev-parse', '--short', 'HEAD')


@pytest.fixture
def repo(tmp_path, monkeypatch):
    r = str(tmp_path / 'repo')
    os.makedirs(r)
    sh(r, 'init', '-q')
    sh(r, 'config', 'user.email', 't@example.com')
    sh(r, 'config', 'user.name', 'T')
    sh(r, 'config', 'commit.gpgsign', 'false')
    sh(r, 'config', 'core.autocrlf', 'false')
    put(r, '.gitignore', 'data/\nart/\nrelease/\n')
    put(r, 'index.html', '<script src="main.js"></script><script src="data/projectaon/index.js"></script>')
    put(r, 'main.js', 'v1')
    put(r, 'sw.js', 'sw')
    put(r, 'README.md', 'not needed offline')
    put(r, 'docs/guide.md', 'not needed offline')
    put(r, 'assets/icons/key.svg', '<svg/>')
    put(r, 'data/projectaon/index.js', 'idx')  # git-ignored: brought from disk
    first = commit(r, 'first commit')
    monkeypatch.setattr(release, 'ROOT', r)
    monkeypatch.setattr(release, 'RELEASES', os.path.join(r, 'release'))
    # one distinct timestamp per call, so releases in the same second do not collide
    n = [0]
    real = release.time.strftime

    def strftime(fmt, *a):
        if '%S' in fmt:
            n[0] += 1
            return f'20260101-0000{n[0]:02d}'
        return real(fmt, *a)
    monkeypatch.setattr(release.time, 'strftime', strftime)
    r_ = type('Repo', (), {})()
    r_.root, r_.first = r, first
    return r_


def run(monkeypatch, *args):
    monkeypatch.setattr(sys, 'argv', ['release.py', *args])
    return release.main()


def current(repo):
    with open(os.path.join(repo.root, 'release', 'CURRENT'), encoding='utf-8') as f:
        return json.load(f)


def released_files(repo, info=None):
    d = os.path.join(repo.root, 'release', (info or current(repo))['dir'])
    out = set()
    for top, _, names in os.walk(d):
        for n in names:
            out.add(os.path.relpath(os.path.join(top, n), d).replace(os.sep, '/'))
    return out


def test_release_copies_exactly_the_offline_files_plus_sw(repo, monkeypatch, capsys):
    assert run(monkeypatch) == 0
    info = current(repo)
    assert released_files(repo) == {'index.html', 'main.js', 'sw.js', 'assets/icons/key.svg', 'data/projectaon/index.js'}
    assert info['commit'] == repo.first and info['subject'] == 'first commit'
    assert info['dir'].endswith('-' + repo.first) and info['files'] == 4  # sw.js is extra to the list
    assert info['bytes'] == sum(os.path.getsize(os.path.join(repo.root, 'release', info['dir'], f))
                                for f in ('index.html', 'main.js', 'assets/icons/key.svg', 'data/projectaon/index.js'))
    assert len(info['version']) == 16
    out = capsys.readouterr().out
    assert f'Released {repo.first} "first commit": 4 files' in out and info['version'] in out
    assert 'The iPad fetches it at its next sync' in out
    assert not os.path.exists(os.path.join(repo.root, 'release', '.building'))
    assert not os.path.exists(os.path.join(repo.root, 'release', 'CURRENT.part'))


def test_release_version_matches_serve_offline_list_of_the_folder(repo, monkeypatch):
    import serve
    run(monkeypatch)
    info = current(repo)
    folder = os.path.join(repo.root, 'release', info['dir'])
    # the folder also holds sw.js, which is not in the list: the list over it is the same as the release's
    assert serve.offline_list(folder)['version'] == info['version']


def test_release_takes_the_code_from_the_commit_not_the_working_copy(repo, monkeypatch, capsys):
    put(repo.root, 'main.js', 'v2 uncommitted')
    put(repo.root, 'data/projectaon/index.js', 'idx-now')  # git-ignored files come as they are on disk
    run(monkeypatch)
    d = os.path.join(repo.root, 'release', current(repo)['dir'])
    assert open(os.path.join(d, 'main.js'), encoding='utf-8').read() == 'v1'
    assert open(os.path.join(d, 'data/projectaon/index.js'), encoding='utf-8').read() == 'idx-now'
    assert 'Not included: uncommitted changes to 1 file.' in capsys.readouterr().out


def test_release_says_files_plural(repo, monkeypatch, capsys):
    put(repo.root, 'main.js', 'a')
    put(repo.root, 'index.html', 'b <script src="main.js"></script>')
    run(monkeypatch)
    assert 'uncommitted changes to 2 files.' in capsys.readouterr().out


def test_release_of_an_older_commit_does_not_mention_uncommitted_changes(repo, monkeypatch, capsys):
    put(repo.root, 'main.js', 'v2')
    commit(repo.root, 'second')
    put(repo.root, 'main.js', 'dirty')
    run(monkeypatch, repo.first)
    d = os.path.join(repo.root, 'release', current(repo)['dir'])
    assert current(repo)['commit'] == repo.first
    assert open(os.path.join(d, 'main.js'), encoding='utf-8').read() == 'v1'
    assert 'Not included' not in capsys.readouterr().out


def test_a_second_release_of_the_same_files_says_the_ipad_has_them(repo, monkeypatch, capsys):
    run(monkeypatch)
    v1 = current(repo)['version']
    capsys.readouterr()
    put(repo.root, 'README.md', 'only a readme changed')
    commit(repo.root, 'readme')
    run(monkeypatch)
    assert current(repo)['version'] == v1
    assert 'The iPad already has exactly these files' in capsys.readouterr().out


def test_a_changed_file_changes_the_version(repo, monkeypatch):
    run(monkeypatch)
    v1 = current(repo)['version']
    put(repo.root, 'main.js', 'a longer v2')  # another size: git archive stamps files with the commit time
    commit(repo.root, 'v2')                    # (whole seconds), so a same-size edit in the same second would hash as before
    run(monkeypatch)
    assert current(repo)['version'] != v1


def test_only_the_last_two_releases_are_kept(repo, monkeypatch):
    names = []
    for i in range(4):
        put(repo.root, 'main.js', f'v{i}')
        commit(repo.root, f'c{i}')
        run(monkeypatch)
        names.append(current(repo)['dir'])
    dirs = sorted(e.name for e in os.scandir(os.path.join(repo.root, 'release')) if e.is_dir())
    assert dirs == sorted(names[-2:])
    assert os.path.isfile(os.path.join(repo.root, 'release', 'CURRENT'))


def test_a_missing_file_stops_the_release_and_leaves_no_trace(repo, monkeypatch):
    put(repo.root, 'index.html', '<script src="main.js"></script><script src="gone.js"></script>')
    commit(repo.root, 'dangling')
    with pytest.raises(SystemExit) as e:
        run(monkeypatch)
    msg = str(e.value)
    assert msg.startswith('Not released.') and '  missing: gone.js' in msg and 'Commit them first' not in msg
    rel = os.path.join(repo.root, 'release')
    assert not os.path.exists(os.path.join(rel, 'CURRENT'))
    assert [e.name for e in os.scandir(rel)] == []  # the .building folder is gone


def test_a_file_on_disk_that_is_not_committed_nor_ignored_stops_the_release(repo, monkeypatch):
    # the page also names a git-ignored book file, so check-ignore finds one ignored and one not (exit 0)
    put(repo.root, 'index.html', '<script src="main.js"></script><script src="new.js"></script>'
                                 '<script src="data/projectaon/index.js"></script>')
    commit(repo.root, 'names new.js')
    put(repo.root, 'new.js', 'not committed')
    with pytest.raises(SystemExit) as e:
        run(monkeypatch)
    msg = str(e.value)
    assert f'  not in {sh(repo.root, "rev-parse", "--short", "HEAD")}: new.js' in msg and msg.endswith('Commit them first.')
    assert 'data/projectaon/index.js' not in msg
    assert not os.path.exists(os.path.join(repo.root, 'release', 'CURRENT'))


@pytest.mark.xfail(strict=True, reason='release.py:84 git check-ignore exits 1 when none of the borrowed files is ignored, and git() '
                   'treats 1 as failure: the release is refused, but with "git check-ignore --stdin -z failed:" not the "not in <sha>" message')
def test_the_stray_file_is_named_even_when_nothing_borrowed_is_ignored(repo, monkeypatch):
    put(repo.root, 'index.html', '<script src="main.js"></script><script src="new.js"></script>')
    commit(repo.root, 'names new.js')
    put(repo.root, 'new.js', 'not committed')
    with pytest.raises(SystemExit) as e:
        run(monkeypatch)
    assert 'new.js' in str(e.value) and str(e.value).endswith('Commit them first.')


def test_a_failed_release_keeps_the_previous_one(repo, monkeypatch):
    run(monkeypatch)
    before = current(repo)
    put(repo.root, 'index.html', '<script src="gone.js"></script>')
    commit(repo.root, 'bad')
    with pytest.raises(SystemExit):
        run(monkeypatch)
    assert current(repo) == before and os.path.isdir(os.path.join(repo.root, 'release', before['dir']))


def test_an_unknown_commit_is_an_error(repo, monkeypatch):
    with pytest.raises(SystemExit) as e:
        run(monkeypatch, 'no-such-ref')
    assert str(e.value).startswith('git rev-parse')


def test_git_returns_stdout_and_exits_on_failure(repo):
    assert release.git('log', '-1', '--format=%s') == b'first commit\n'
    with pytest.raises(SystemExit) as e:
        release.git('log', 'no-such-ref')
    assert str(e.value).startswith('git log no-such-ref failed:')
    assert release.git('log', 'no-such-ref', ok=(0, 128)) == b''


def test_current_is_empty_without_a_release_or_with_garbage(repo):
    assert release.current() == {}
    os.makedirs(os.path.join(repo.root, 'release'))
    put(repo.root, 'release/CURRENT', 'garbage')
    assert release.current() == {}


def test_status_without_a_release(repo):
    st = release.status()
    assert st == {'current': {}, 'head': {'commit': repo.first, 'subject': 'first commit'}, 'commits_since': 0, 'dirty': 0}


def test_status_counts_commits_since_and_dirty_files(repo, monkeypatch):
    run(monkeypatch)
    assert release.status()['commits_since'] == 0
    put(repo.root, 'main.js', 'v2')
    second = commit(repo.root, 'second')
    put(repo.root, 'README.md', 'dirty')
    put(repo.root, 'untracked.txt', 'ignored by the count')
    st = release.status()
    assert st['commits_since'] == 1 and st['dirty'] == 1
    assert st['head'] == {'commit': second, 'subject': 'second'}
    assert st['current']['commit'] == repo.first


def test_status_commits_since_is_none_when_the_released_commit_is_unknown(repo):
    os.makedirs(os.path.join(repo.root, 'release'))
    put(repo.root, 'release/CURRENT', json.dumps({'commit': 'deadbee', 'dir': 'x'}))
    assert release.status()['commits_since'] is None


def test_status_flag_prints_json(repo, monkeypatch, capsys):
    assert run(monkeypatch, '--status') == 0
    assert json.loads(capsys.readouterr().out)['head']['commit'] == repo.first
    assert not os.path.exists(os.path.join(repo.root, 'release'))  # --status releases nothing
