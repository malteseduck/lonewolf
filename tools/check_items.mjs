/* Check a book's item table (items-<book>.js) against its imported sections.

     node tools/check_items.mjs 01fftd

   Step 5 of docs/reference/items.md. Prints what is wrong: sections or choices that do not exist,
   item ids nobody defines, icons missing from assets/icons/, fields the engine does not know. Then
   the counts, and the sections tools/item_sections.py listed that the table leaves out (most are
   scenery; the list is there to be sure each was read). Ids and counts only, never text. */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const book = process.argv[2] || '01fftd';
const file = path.join(ROOT, `items-${book}.js`);
if (!fs.existsSync(file)) { console.log(`no items-${book}.js yet: the book's items are all by hand (docs/reference/items.md)`); process.exit(0); }

// the engine's own items, then the book's
const require = createRequire(import.meta.url);
globalThis.window = globalThis; globalThis.LW = { BOOKS: {} }; globalThis.document = { write() {} };
require(path.join(ROOT, 'shared', 'core.js'));
Object.assign(LW.ITEMS, { bow: { name: 'Bow', kind: 'weapon', ranged: true }, quiver: { name: 'Quiver', kind: 'special' } }); // rules-series.js
require(path.join(ROOT, 'data', 'projectaon', book, 'book.js'));
const T = await import(pathToFileURL(file).href), B = LW.BOOKS[book], bad = [];
// every book's items are known in the page (an item from Book 1 can gate a choice in Book 2)
for (const f of fs.readdirSync(ROOT).filter((f) => /^items-\w+\.js$/.test(f))) LW.addItems((await import(pathToFileURL(path.join(ROOT, f)).href)).ITEMS);

const FIELDS = new Set(['give', 'loot', 'take', 'ep', 'cs', 'rolls', 'meal', 'noHunt', 'todo', 'need', 'fight', 'bowShot']);
const FIGHT = new Set(['csMod', 'csNote', 'mindforce', 'unless', 'unarmed', 'undead', 'drain', 'with', 'double', 'ambush']);
const known = (id) => id === 'meal' || !!LW.ITEMS[id];
for (const [k, it] of Object.entries(T.ITEMS)) {
  if (!['weapon', 'backpack', 'special'].includes(it.kind)) bad.push(`item ${k}: kind must be weapon, backpack or special`);
  if (it.glyph && !fs.existsSync(path.join(ROOT, 'assets', 'icons', it.glyph + '.svg'))) bad.push(`item ${k}: no icon assets/icons/${it.glyph}.svg`);
}
const things = (list, where) => (list || []).forEach((l) => {
  if (l.item && !known(l.item)) bad.push(`${where}: unknown item ${l.item}`);
  if (!l.item && l.gold == null && l.meal == null && !l.pack && !l.arrows) bad.push(`${where}: give/loot entry with nothing in it`);
});
const losses = (list, where) => (list || []).forEach((t) => {
  if (t.item && !known(t.item)) bad.push(`${where}: unknown item ${t.item}`);
  if (t.weapons && !['all', 'one'].includes(t.weapons)) bad.push(`${where}: weapons must be 'all' or 'one'`);
  if (t.backpack && !['all', 'items'].includes(t.backpack)) bad.push(`${where}: backpack must be 'all' or 'items'`);
  if (t.special && t.special !== 'all') bad.push(`${where}: special must be 'all'`);
});
for (const [id, x] of Object.entries(T.SECTIONS)) {
  const sec = B.sections[id];
  if (!sec) { bad.push(`section ${id} does not exist`); continue; }
  Object.keys(x).filter((f) => !FIELDS.has(f)).forEach((f) => bad.push(`${id}: unknown field ${f}`));
  things(x.give, `${id} give`); things(x.loot, `${id} loot`); losses(x.take, `${id} take`);
  (x.rolls || []).forEach((r, i) => { if (!sec.rnt) bad.push(`${id}: rolls, but the section draws no Random Number`); losses(r.take, `${id} rolls[${i}]`); });
  if (x.fight && !sec.combat) bad.push(`${id}: fight, but the section has no combat`);
  Object.keys(x.fight || {}).filter((f) => !FIGHT.has(f)).forEach((f) => bad.push(`${id} fight: unknown field ${f}`));
  if (x.fight && x.fight.ambush && !(x.fight.csMod < 0 || sec.combat.csMod < 0)) bad.push(`${id} fight: ambush, but no COMBAT SKILL lost`);
  if (x.bowShot) {
    if (!sec.rnt) bad.push(`${id}: bowShot, but the section draws no Random Number`);
    for (const [to, r] of Object.entries(x.bowShot)) {
      if (!(sec.choices || []).some((c) => c.to === to)) bad.push(`${id}: bowShot range for a choice to ${to}, which it does not have`);
      if (!Array.isArray(r) || r.length !== 2 || r[0] > r[1]) bad.push(`${id}: bowShot range for ${to} must be [lo, hi]`);
    }
  }
  (x.fight && x.fight.unless || []).forEach((i) => { if (!known(i)) bad.push(`${id} fight: unknown item ${i}`); });
  if (x.fight && x.fight.with && x.fight.with !== 'none' && !(LW.ITEMS[x.fight.with] && (LW.ITEMS[x.fight.with].kind === 'weapon' || LW.ITEMS[x.fight.with].weapon))) bad.push(`${id} fight: with ${x.fight.with}, which is not a weapon`);
  (x.loot || []).forEach((l) => { if (l.pick && !l.or) bad.push(`${id} loot: pick without or`); });
  if (x.ep != null && x.ep !== 'full' && typeof x.ep !== 'number') bad.push(`${id}: ep must be a number or 'full'`);
  for (const [to, n] of Object.entries(x.need || {})) {
    if (!(sec.choices || []).some((c) => c.to === to)) bad.push(`${id}: need for a choice to ${to}, which it does not have`);
    [].concat(n && n.item || []).forEach((i) => { if (!known(i)) bad.push(`${id}: need for unknown item ${i}`); });
  }
}
console.log(bad.length ? bad.join('\n') : 'no errors');
const n = (f) => Object.values(T.SECTIONS).filter((x) => x[f]).length;
console.log(`${Object.keys(T.ITEMS).length} book items; ${Object.keys(T.SECTIONS).length} sections: give ${n('give')}, loot ${n('loot')}, take ${n('take')}, ep ${n('ep')}, rolls ${n('rolls')}, need ${n('need')}, fight ${n('fight')}, todo ${n('todo')}`);

// sections the scan flagged that the table does not mention
const reading = path.join(ROOT, 'data', 'projectaon', book, 'items-reading.txt');
if (fs.existsSync(reading)) {
  const listed = [...fs.readFileSync(reading, 'utf8').matchAll(/^#(\d+) /gm)].map((m) => m[1]).filter((id) => !T.SECTIONS[id]);
  console.log(`${listed.length} flagged sections left out (read, and judged to need nothing):\n${listed.join(' ')}`);
}
