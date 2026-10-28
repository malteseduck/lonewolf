# Tools and the dashboard

Rules for work on the importer, the checkers and the dashboard. The root `AGENTS.md` applies as well
(every run through uv, ADR 0037). `docs/reference/importer.md` is the importer,
`docs/reference/dashboard.md` the dashboard, its jobs and endpoints.

- **After changing the importer**, re-run `tools/import_projectaon.py <book>` (the page loads the
  generated `book.js`), then `tools/check_all.py`.
- **A tool prints counts and ids, never the book's text**, and writes what it makes from the book
  under `data/projectaon/`.
- **A new tool or dashboard job** gets its tests in `tests/py/` (or `tests/` for Node), with stand-in
  data, and its line in `docs/reference/architecture.md` and the reference doc of its area.
- **Dashboard pages** (`admin/`): every colour comes from the custom properties at the top of
  `admin/admin.css`. Never use `window.prompt`: the owner runs the dashboard in the desktop app's
  browser pane, where it shows nothing; ask with an in-page `<dialog>`, as `ask()` in
  `admin/fights.html` does.
- A Python package is added with `uv add --project tools <name>`; this PC's TLS needs `--system-certs`.
