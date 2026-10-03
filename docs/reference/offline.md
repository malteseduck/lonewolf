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
4. **On the PC**, start the player's server as usual (`python tools/serve.py`), then in a terminal:

   ```
   tailscale serve --bg 8765
   ```

   It prints the address, like `https://yourpc.your-tailnet.ts.net/`. Tailscale keeps serving it
   (HTTPS, its own certificate) across restarts; it only forwards to the local server, so
   `serve.py` must be running for the iPad to reach the PC. Only your own Tailscale devices can
   open it. `tailscale serve status` shows it; `tailscale serve --https=443 off` stops it.
5. **On the iPad, in Chrome** (or Safari): open that address. The bar at the foot of the page says
   "Saving for offline n / 631", then "Ready offline" (about 42 MB).
6. **Add it to the Home Screen**: Chrome's share button (top right), "Add to Home Screen". Play from
   that icon from now on. The icon's app has its own storage, apart from Chrome's tabs: bring a game
   over with backup (in the tab) and restore (in the app). iPadOS clears website data unused for a
   week, but not a Home Screen app's.

## In use

- **No connection**: the icon opens the saved copy. The foot of the page says "Offline: playing the
  saved copy". Everything plays: all books, pictures, maps.
- **Backup with no connection**: the backup is kept on the iPad ("Backup kept here") and sent to the
  PC's `backups/` the next time the app opens with the PC in reach ("1 waiting backup sent to the
  PC").
- **Restore**: lists the PC's backups when it is in reach. With no connection it offers a file
  instead (one saved in the iPad's Files, for instance).
- **Updates**: each time the app opens (or comes back to the front) with the PC in reach, it asks the
  PC what changed and downloads just that, in the background. Then "Update ready: reload" appears at
  the foot of the page: touch it (or simply open the app next time) and the new version takes over.
  A page already running never changes under you.

## How it works

- `tools/serve.py` lists every file the player loads at `GET /api/offline`, with a hash of each
  (`OFFLINE_FILES`, `OFFLINE_DIRS`, less `OFFLINE_SKIP_*`: Project Aon's section pages, the
  prototypes, docs, tools and `art/reference/` stay behind). `version` is a hash of the whole list.
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
  worker's messages in `#offline` in the bar at the foot (`offlineSay` in `main.js`).
- The service worker is registered only over HTTPS (as Tailscale serves it) or when the address
  has `?offline`, so working on the PC at `http://localhost:8765/` is never served stale files. To
  try the offline copy on the PC, open `http://127.0.0.1:8765/?offline` (a different origin from
  `localhost`, with its own saves); unregister it afterwards (browser devtools, Application,
  Service workers), or that origin keeps serving its copy.
- Fonts are in `assets/fonts/` (from Google Fonts, SIL Open Font License), so nothing comes from
  outside the PC.
- The Home Screen icon is `assets/app/` and `manifest.webmanifest`.

## Without Tailscale

The "lan" server (`--bind 0.0.0.0`, plain HTTP on the home network) still plays and backs up from
the iPad while connected, but cannot keep an offline copy: browsers allow service workers only over
HTTPS.
