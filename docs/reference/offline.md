# Playing offline (iPad) and the PC as home base

The player can live on the iPad as a Home Screen app and play with no connection. When the iPad can
reach the PC it fetches whatever changed (code, books, art) and sends any backups made while away.

## Setting it up (once)

The offline copy needs HTTPS, and an address that never changes (the iPad keeps its copy and its
saves under that address). Tailscale gives both.

1. **On the PC**: install Tailscale (https://tailscale.com/download/windows) and sign in.
2. **On the iPad**: install Tailscale from the App Store and sign in with the same account. Leave
   it connected (it can stay on in the background).
3. **In the Tailscale admin console** (https://login.tailscale.com/admin/dns): turn on
   **MagicDNS** and **HTTPS Certificates**.
4. **On the PC**, make a release and start the release server (see Releasing, below), then in a
   terminal:

   ```
   tailscale serve --bg 8765
   ```

   It prints the address, like `https://yourpc.your-tailnet.ts.net/`. Tailscale keeps serving it
   (HTTPS, its own certificate) across restarts; it only forwards to the local server, so
   the release server must be running for the iPad to reach the PC. Only your own Tailscale devices can
   open it. `tailscale serve status` shows it; `tailscale serve --https=443 off` stops it.
5. **On the iPad, in Chrome** (or Safari): open that address. The top right corner of the page says
   "Saving for offline n / 647", then "Ready offline" (about 44 MB).
6. **Add it to the Home Screen**: Chrome's share button (top right), "Add to Home Screen". Play from
   that icon from now on. The icon's app has its own storage, apart from Chrome's tabs: bring a game
   over with backup (in the tab) and restore (in the app). iPadOS clears website data unused for a
   week, but not a Home Screen app's.

## In use

- **No connection**: the icon opens the saved copy. The top right corner says "Offline: playing the
  saved copy". Everything plays: all books, pictures, maps.
- **Backup with no connection**: the backup is kept on the iPad ("Backup kept here") and sent to the
  PC's `backups/` the next time the app opens with the PC in reach ("1 waiting backup sent to the
  PC").
- **Restore**: lists the PC's backups when it is in reach. With no connection it offers a file
  instead (one saved in the iPad's Files, for instance).
- **Updates**: each time the app opens (or comes back to the front) with the PC in reach, it asks the
  PC what changed and downloads just that, in the background. Then "Update ready: reload" appears at
  the top right: touch it (or simply open the app next time) and the new version takes over.
  A page already running never changes under you.

## Releasing

The iPad gets only what has been released, never the working copy, so half-finished work stays on
the PC. Two servers run side by side:

| Server | Command | Serves |
|---|---|---|
| release (always on) | `python tools/serve.py --release` (port 8765) | the last release, to the iPad through Tailscale |
| work (when editing) | `python tools/serve.py` (port 8766) | the working copy at http://localhost:8766/ |

To release: commit, then `python tools/release.py` (or `python tools/release.py <commit>`). It
copies into `release/<date>-<commit>/` (git-ignored) the files `GET /api/offline` lists, plus
`sw.js`: the code from the commit (uncommitted changes are left out, and it says how many), the
books and art from disk as they are (they are git-ignored, so never in a commit). A file the page
needs that is neither committed nor ignored stops the release. `release/CURRENT` names the folder;
the release server reads it at each request, so no restart is needed, and the iPad fetches the
difference at its next sync. The last two releases are kept: `release.py <older commit>` puts one
back.

The release server answers the files of the release and the backups API (the same `backups/` as the
work server), nothing else: no map or admin API, no docs or tools. Backups from the iPad land in
`backups/` either way.

The release server starts with Windows from a shortcut in the Startup folder (Win+R,
`shell:startup`), "Lone Wolf release server": `C:\Python314\pythonw.exe tools\serve.py --release`,
started in the project folder. pythonw has no window; it logs to `release/server.log`. To stop it,
end `pythonw.exe` in Task Manager; to start it again, open the shortcut. The release server's own
code is `tools/serve.py` from the working copy, read when it starts.

## How it works

- `tools/serve.py` lists every file the player loads at `GET /api/offline`, with a hash of each.
  It is an allow-list, never whole folders, found by following references from `index.html`:
  `<script src>` and `<link href>` (stylesheet, manifest, apple-touch-icon), the web manifest's
  icons, static `import ... from` (relative to the module), `fetch('a literal path')`, CSS `url()`
  (`fonts.css` brings the woff2), and the `<script>` tags `data/projectaon/index.js` writes, which
  bring each `book.js`; a `book.js` brings the images it names (pictures and its one map), and
  `assets/plates/plates.json`, `art/manifest.json` and `assets/plates/approved/*.json` (added to the
  walk, as main.js builds their paths) the pictures they name. Paths built at
  runtime cannot be followed, so `OFFLINE_DIRS` keeps `assets/icons/*.svg` whole (main.js builds
  `assets/icons/${name}.svg`); a new file loaded that way needs a rule there. Map work files
  (`data/projectaon/<code>/work/`), section pages, prototypes, docs and tools stay on the PC.
  `version` is a hash of the whole list. The answer also has `missing`: files something names that
  are not on disk (sw.js ignores it).
- `python tools/offline_check.py` prints the same list without a server: file count and size, size
  per group (each book on its own), the 10 largest files and anything missing (exit code 1 if so).
  Run it after adding a file the page loads, or moving one (or press "Offline check" in the import
  dashboard). `--json` prints the same as one JSON object.
- `sw.js` (the service worker) keeps the files in a Cache named `lw-files-<version>` and answers
  every request for them from it; `api/` and `sw.js` itself always go to the network. Its state
  (`active`, `staged`) is kept in the `lw-offline-state` cache.
- A sync fetches the list (8 s timeout). If the version is new it fills a new cache: a file whose
  hash is unchanged is copied from the active cache, the rest downloaded (6 at a time, each tried 4
  times). An interrupted sync leaves its partial cache, and the next one carries on from it. When
  complete, the new cache is `staged`; the next page load (a navigation) makes it `active` and
  deletes the old one. On the very first sync it becomes `active` at once.
- Syncs start at every page load (the service worker itself, so a broken page cannot stop its own
  fix), when the page comes to the front, and when the device comes back online. The page shows the
  worker's messages in `#offline` at the top right (`offlineSay` in `main.js`).
- The service worker is registered only over HTTPS (as Tailscale serves it) or when the address
  has `?offline`, so working on the PC at `http://localhost:8766/` is never served stale files. To
  try the offline copy on the PC, open `http://127.0.0.1:8766/?offline` (a different origin from
  `localhost`, with its own saves); unregister it afterwards (browser devtools, Application,
  Service workers), or that origin keeps serving its copy.
- Fonts are in `assets/fonts/` (from Google Fonts, SIL Open Font License), so nothing comes from
  outside the PC.
- The Home Screen icon is `assets/app/` and `manifest.webmanifest`.

## Without Tailscale

The "lan" server (`--bind 0.0.0.0`, plain HTTP on the home network) still plays and backs up from
the iPad while connected, but cannot keep an offline copy: browsers allow service workers only over
HTTPS.
