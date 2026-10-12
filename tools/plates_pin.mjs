/* Pins of approved fight pictures (assets/plates/approved/<book>.json), and what would change.

     node tools/plates_pin.mjs 04tcod                 what each fight shows against what was approved
     node tools/plates_pin.mjs 04tcod --approve       pin what each fight picks now (step 6 marked done)
     node tools/plates_pin.mjs 04tcod --approve-name "<enemy>"   re-pin that enemy's fights only (the sheet)
     node tools/plates_pin.mjs --all --json           every pinned book's differences, as JSON (tools/book_status.py)

   Once a book's fight pictures are approved, the player shows the pinned picture whatever plates.json or
   a re-import would now pick; a difference waits for the owner's approval (docs/reference/dashboard.md).
   Prints section ids, enemy numbers and file paths, never the book's text. */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { compilePlates, choosePlate, nameKey, pinKey, samePlate } = await import(pathToFileURL(path.join(ROOT, 'platepick.js')).href);
const README = 'The fight pictures the owner approved for this book (step 6 marked done): the player shows these whatever '
  + 'plates.json or a re-import would now pick. Keyed by section/enemy number; name is a hash of the enemy\'s name, so a pin '
  + 'is not used for another enemy; plate is {src, crop?, levels?, flip?} or null for the drawn emblem. Written by tools/plates_pin.mjs; '
  + 'see docs/reference/interface.md, Art pipeline.';

const require = createRequire(import.meta.url);
const dirOf = (root) => path.join(root, 'assets', 'plates', 'approved');
const pinFile = (root, code) => path.join(dirOf(root), `${code}.json`);
const readPins = (root, code) => { try { return JSON.parse(fs.readFileSync(pinFile(root, code), 'utf8')); } catch { return null; } };
const platesOf = (root) => compilePlates(JSON.parse(fs.readFileSync(path.join(root, 'assets', 'plates', 'plates.json'), 'utf8')).plates);

// book.js hangs the book on the global LW; start from a bare one and drop the cached copy, so each call reads its own root
function load(root, code) {
  const js = path.join(root, 'data', 'projectaon', code, 'book.js');
  if (!fs.existsSync(js)) return null;
  globalThis.window = globalThis; globalThis.LW = { BOOKS: {} }; globalThis.document = { write() {} };
  delete require.cache[require.resolve(js)];
  require(js);
  return LW.BOOKS[code];
}
/* every fight's enemy: {key, foe, now} */
const fights = (book, plates) => Object.entries(book.sections).flatMap(([id, s]) =>
  (s.combat?.enemies || []).map((foe, i) => ({ key: pinKey(id, i), foe, now: choosePlate(foe, book, plates) })));

/* what differs from the pins: changed (another picture now), unpinned (a fight with no pin), gone (a pin with no fight);
   null when the book has no pins or is not imported */
export function comparePins({ root = ROOT, book: code, plates = platesOf(root) }) {
  const book = load(root, code), pinned = readPins(root, code);
  if (!book || !pinned) return null;
  const pins = pinned.pins || {}, all = fights(book, plates), keys = new Set(all.map((f) => f.key));
  const changed = [], unpinned = [];
  for (const f of all) {
    const pin = pins[f.key];
    if (!pin || pin.name !== nameKey(f.foe.name)) unpinned.push({ key: f.key, now: f.now?.src || null });
    else if (!samePlate(pin.plate, f.now)) changed.push({ key: f.key, was: pin.plate?.src || null, now: f.now?.src || null });
  }
  return { book: code, approved: pinned.approved, fights: all.length, changed, unpinned, gone: Object.keys(pins).filter((k) => !keys.has(k)) };
}

/* the text the command line prints for a comparison (or why there is none) */
export function compareText(code, r) {
  if (!r) return `${code}: no approved pictures (step 6 not marked done), or not imported`;
  return [`${code}: ${r.fights} fights, approved ${r.approved}; ${r.changed.length} would change, ${r.unpinned.length} have no pin, ${r.gone.length} pins for fights no longer there`,
    ...r.changed.map((c) => `  ${c.key}: ${c.was || 'emblem'} -> ${c.now || 'emblem'}`),
    ...r.unpinned.map((u) => `  ${u.key}: no pin (shows ${u.now || 'emblem'})`)].join('\n');
}

/* every pinned book's comparison, by code; books not imported are left out */
export function compareAll({ root = ROOT } = {}) {
  const dir = dirOf(root), plates = platesOf(root);
  const codes = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : [];
  return Object.fromEntries(codes.map((c) => [c, comparePins({ root, book: c, plates })]).filter(([, r]) => r));
}

/* pin what each fight picks now (all of them, or only the enemy called onlyName); writes the pin file under root.
   Returns {code, text}: code 1 when the book is not imported. */
export function approvePins({ root = ROOT, book: code, onlyName }) {
  const book = load(root, code);
  if (!book) return { code: 1, text: `${code}: not imported` };
  const old = readPins(root, code), pins = onlyName && old ? { ...old.pins } : {};
  let n = 0;
  for (const f of fights(book, platesOf(root))) {
    if (onlyName && f.foe.name.toLowerCase() !== onlyName.toLowerCase()) continue;
    pins[f.key] = { name: nameKey(f.foe.name), plate: f.now }; n++;
  }
  if (onlyName && !old) return { code: 0, text: `${code}: no approved pictures yet; nothing to re-pin` };
  fs.mkdirSync(dirOf(root), { recursive: true });
  const out = { _readme: README, approved: onlyName ? old.approved : new Date().toISOString().slice(0, 10), pins };
  // one pin per line, so a change shows plainly in git
  const body = Object.entries(out.pins).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n');
  fs.writeFileSync(pinFile(root, code), `{\n "_readme": ${JSON.stringify(README)},\n "approved": ${JSON.stringify(out.approved)},\n "pins": {\n${body}\n }\n}\n`);
  return { code: 0, text: `${code}: ${n} fight${n === 1 ? '' : 's'} pinned${onlyName ? ' (one enemy)' : ''}` };
}

// the command line, only when run directly (the tests import the functions)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), nameAt = args.indexOf('--approve-name');
  const code = args.find((a, i) => !a.startsWith('--') && !(nameAt >= 0 && i === nameAt + 1));
  if (args.includes('--all')) {
    const out = compareAll();
    console.log(args.includes('--json') ? JSON.stringify(out) : Object.values(out).map((r) => `${r.book}: ${r.changed.length} changed, ${r.unpinned.length} unpinned`).join('\n'));
  } else if (!code) {
    console.log('usage: node tools/plates_pin.mjs <book> [--approve | --approve-name <enemy>] | --all [--json]');
    process.exit(2);
  } else if (args.includes('--approve') || nameAt >= 0) {
    const r = approvePins({ book: code, onlyName: nameAt >= 0 && !args.includes('--approve') ? (args[nameAt + 1] || '') : undefined });
    console.log(r.text);
    process.exit(r.code);
  } else {
    console.log(compareText(code, comparePins({ book: code })));
  }
}
