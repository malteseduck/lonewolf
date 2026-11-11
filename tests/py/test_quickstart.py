"""tools/quickstart.py, main paths: a fresh checkout gets the packages, then each book is downloaded and
imported; a book already imported is left alone; a book the importer does not know is refused; a failed
step stops that book only. No command is really run (run is a fake); the data folder is tmp_path."""
import os

import pytest

import quickstart as qs


class Fake:
    def __init__(self, data, fail=()):
        self.data, self.fail, self.calls = data, set(fail), []

    def __call__(self, argv):
        self.calls.append(argv)
        script = next((os.path.basename(a) for a in argv if str(a).endswith('.py')), ' '.join(argv))
        code = argv[-1]
        if (script, code) in self.fail or script in self.fail:
            return 1
        if script == 'import_projectaon.py':  # what a real import leaves: the playable book.js
            os.makedirs(os.path.join(self.data, code), exist_ok=True)
            open(os.path.join(self.data, code, 'book.js'), 'w').close()
        return 0

    def scripts(self):
        return [next((os.path.basename(a) for a in c if str(a).endswith('.py')), ' '.join(c)) for c in self.calls]


@pytest.fixture
def data(tmp_path, monkeypatch):
    monkeypatch.setattr(qs, 'DATA', str(tmp_path))
    monkeypatch.setattr(qs, 'known', lambda: {'01fftd', '02fotw', '03tcok'})
    return str(tmp_path)


def test_fresh_checkout_sets_up_then_fetches_and_imports_each_book(data):
    run = Fake(data)
    assert qs.main(['1', '02fotw'], run=run) == 0
    assert run.calls[0][:2] == ['uv', 'sync']  # the packages first
    assert run.scripts()[1:] == ['fetch_projectaon.py', 'import_projectaon.py'] * 2
    assert [c[-1] for c in run.calls[1:]] == ['01fftd', '01fftd', '02fotw', '02fotw']  # a number is taken for its code
    assert all(c[:3] == ['uv', 'run', '--project'] for c in run.calls[1:])  # through uv (ADR 0037)


def test_no_books_named_means_every_book_the_importer_knows(data):
    run = Fake(data)
    assert qs.main([], run=run) == 0
    assert [c[-1] for c in run.calls if 'import_projectaon.py' in str(c)] == ['01fftd', '02fotw', '03tcok']


def test_a_book_already_imported_is_not_downloaded_again(data):
    os.makedirs(os.path.join(data, '01fftd'))
    open(os.path.join(data, '01fftd', 'book.js'), 'w').close()
    run = Fake(data)
    assert qs.main(['01fftd', '02fotw', '--no-setup'], run=run) == 0
    assert [c[-1] for c in run.calls] == ['02fotw', '02fotw']  # no setup, and Book 1 untouched


def test_a_book_the_importer_does_not_know_is_refused_before_anything_runs(data):
    run = Fake(data)
    assert qs.main(['14tcok'], run=run) == 2
    assert run.calls == []
    assert qs.main(['nonsense'], run=run) == 2


def test_a_failed_download_skips_that_books_import_and_the_rest_go_on(data):
    run = Fake(data, fail={('fetch_projectaon.py', '01fftd')})
    assert qs.main(['01fftd', '02fotw', '--no-setup'], run=run) == 1
    assert [(s, c[-1]) for s, c in zip(run.scripts(), run.calls)] == [
        ('fetch_projectaon.py', '01fftd'), ('fetch_projectaon.py', '02fotw'), ('import_projectaon.py', '02fotw')]


def test_a_failed_setup_stops_before_any_download(data):
    run = Fake(data, fail={'uv sync --project tools'})  # the sync is the only call with no script
    assert qs.main(['01fftd'], run=run) == 1
    assert run.scripts() == ['uv sync --project tools']
