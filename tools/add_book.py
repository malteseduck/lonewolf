"""Add a book the importer does not know to its BOOKS table, from the catalogue (D7, ADR 0036).

    python tools/add_book.py <book>      <book> is a code (14tcok) or a number (14)

The number, series and title come from book_status.CATALOGUE and SERIES, which is all the entry
holds: the importer's discipline and rank names already cover the three series. It writes
tools/import_projectaon.py only, and imports nothing (that is the owner's go-ahead, as ever).
Refuses a book already there or not in the catalogue. Exits 1 on a refusal.
"""
import os
import re
import sys

import book_status

IMPORTER = book_status.IMPORTER
TABLE = re.compile(r'^BOOKS = \{.*?\n\}', re.M | re.S)


def add(book):
    """(ok, message): the entry written, or why not."""
    found = book_status.find(book)
    if not found:
        return False, f'{book} is not in the catalogue'
    code, title, n = found
    with open(IMPORTER, encoding='utf-8', newline='') as f:
        src = f.read()
    m = TABLE.search(src)
    if not m:
        return False, f'no BOOKS table in {os.path.basename(IMPORTER)}'
    if code in re.findall(r"'(\w+)': \(\d+, ", m.group(0)):
        return False, f'{code} is already in the importer'
    nl = '\r\n' if '\r\n' in src else '\n'
    line = f'    {code!r}: ({n}, {book_status.SERIES(n).replace(" ", "")!r}, {title!r}),{nl}'
    # Before the first line holding a higher number, so the table stays in number order; else last.
    at = m.end() - 1  # the closing brace, at the start of its line
    pos = m.start() + m.group(0).index('\n') + 1
    for row in m.group(0).splitlines(keepends=True)[1:]:
        first = re.search(r"'\w+': \((\d+), ", row)
        if first and int(first.group(1)) > n:
            at = pos
            break
        pos += len(row)
    src = src[:at] + line + src[at:]
    tmp = IMPORTER + '.part'
    with open(tmp, 'w', encoding='utf-8', newline='') as f:
        f.write(src)
    os.replace(tmp, IMPORTER)
    return True, f'{code}: added to the importer as Book {n}, {book_status.SERIES(n)}'


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    ok, msg = add(sys.argv[1])
    print(msg)
    sys.exit(0 if ok else 1)
