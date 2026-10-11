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
const DIR = path.join(ROOT, 'assets', 'plates', 'approved');
const README = 'The fight pictures the owner approved for this book (step 6 marked done): the player shows these whatever '
  + 'plates.json or a re-import would now pick. Keyed by section/enemy number; name is a hash of the enemy\'s name, so a pin '
  + 'is not used for another enemy; plate is {src, crop?, levels?} or null for the drawn emblem. Written by tools/plates_pin.mjs; '
  + 'see docs/reference/interface.md, Art pipeline.';

const require = createRequire(import.meta.url);
globalThis.window = globalThis; globalThis.LW = { BOOKS: {} }; globalThis.document = { write() {} };
const plates = compilePlates(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'plates', 'plates.json'), 'utf8')).plates);
const pinFile = (code) => path.join(DIR, `${code}.json`);
const readPins = (code) => { try { return JSON.parse(fs.readFileSync(pinFile(code), 'utf8')); } catch { return null; } };

function load(code) {
  const js = path.join(ROOT, 'data', 'projectaon', code, 'book.js');
  if (!fs.existsSync(js)) return null;
  require(js);
  return LW.BOOKS[code];
}
/* every fight's enemy: {key, foe, now} */
const fights = (book) => Object.entries(book.sections).flatMap(([id, s]) =>
  (s.combat?.enemies || []).map((foe, i) => ({ key: pinKey(id, i), foe, now: choosePlate(foe, book, plates) })));

/* what differs from the pins: changed (another picture now), unpinned (a fight with no pin), gone (a pin with no fight) */
function compare(code) {
  const book = load(code), pinned = readPins(code);
  if (!book || !pinned) return null;
  const pins = pinned.pins || {}, all = fights(book), keys = new Set(all.map((f) => f.key));
  const changed = [], unpinned = [];
  for (const f of all) {
    const pin = pins[f.key];
    if (!pin || pin.name !== nameKey(f.foe.name)) unpinned.push({ key: f.key, now: f.now?.src || null });
    else if (!samePlate(pin.plate, f.now)) changed.push({ key: f.key, was: pin.plate?.src || null, now: f.now?.src || null });
  }
  return { book: code, approved: pinned.approved, fights: all.length, changed, unpinned, gone: Object.keys(pins).filter((k) => !keys.has(k)) };
}

function approve(code, onlyName) {
  const book = load(code);
  if (!book) { console.log(`${code}: not imported`); process.exit(1); }
  const old = readPins(code), pins = onlyName && old ? { ...old.pins } : {};
  let n = 0;
  for (const f of fights(book)) {
    if (onlyName && f.foe.name.toLowerCase() !== onlyName.toLowerCase()) continue;
    pins[f.key] = { name: nameKey(f.foe.name), plate: f.now }; n++;
  }
  if (onlyName && !old) { console.log(`${code}: no approved pictures yet; nothing to re-pin`); return; }
  fs.mkdirSync(DIR, { recursive: true });
  const out = { _readme: README, approved: onlyName ? old.approved : new Date().toISOString().slice(0, 10), pins };
  // one pin per line, so a change shows plainly in git
  const body = Object.entries(out.pins).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n');
  fs.writeFileSync(pinFile(code), `{\n "_readme": ${JSON.stringify(README)},\n "approved": ${JSON.stringify(out.approved)},\n "pins": {\n${body}\n }\n}\n`);
  console.log(`${code}: ${n} fight${n === 1 ? '' : 's'} pinned${onlyName ? ' (one enemy)' : ''}`);
}

const args = process.argv.slice(2), nameAt = args.indexOf('--approve-name');
const code = args.find((a, i) => !a.startsWith('--') && !(nameAt >= 0 && i === nameAt + 1));
if (args.includes('--all')) {
  const codes = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : [];
  const out = Object.fromEntries(codes.map((c) => [c, compare(c)]).filter(([, r]) => r));
  console.log(args.includes('--json') ? JSON.stringify(out) : Object.values(out).map((r) => `${r.book}: ${r.changed.length} changed, ${r.unpinned.length} unpinned`).join('\n'));
} else if (!code) {
  console.log('usage: node tools/plates_pin.mjs <book> [--approve | --approve-name <enemy>] | --all [--json]');
  process.exit(2);
} else if (args.includes('--approve')) {
  approve(code);
} else if (nameAt >= 0) {
  approve(code, args[nameAt + 1] || '');
} else {
  const r = compare(code);
  if (!r) { console.log(`${code}: no approved pictures (step 6 not marked done), or not imported`); process.exit(0); }
  console.log(`${code}: ${r.fights} fights, approved ${r.approved}; ${r.changed.length} would change, ${r.unpinned.length} have no pin, ${r.gone.length} pins for fights no longer there`);
  for (const c of r.changed) console.log(`  ${c.key}: ${c.was || 'emblem'} -> ${c.now || 'emblem'}`);
  for (const u of r.unpinned) console.log(`  ${u.key}: no pin (shows ${u.now || 'emblem'})`);
}
