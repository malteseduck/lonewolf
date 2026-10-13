/* Check a book's item table (items-<book>.js) against its imported sections.

     node tools/check_items.mjs 01fftd [--json]

   --json also writes data/projectaon/<book>/check-items.json (errors, counts, left-out ids), which
   tools/book_status.py reads for the checklist's step 5.

   Step 5 of docs/reference/items.md. Prints what is wrong: sections or choices that do not exist,
   item ids nobody defines, icons missing from assets/icons/, fields the engine does not know. Then
   the counts, and the sections tools/item_sections.py listed that the table leaves out (most are
   scenery; the list is there to be sure each was read). Ids and counts only, never text. */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let stamp = 0; // a new query per edit, so a table edited between calls is read again
const loaded = new Map(); // path + text -> module, so an unchanged table is not parsed twice

/* Check one book under `root`; returns {code, text, errors, counts, leftOut, items, sections}. No printing, no exit:
   the command line below does that. With json, also writes check-items.json beside the book. */
export async function checkItems({ root = ROOT, book = '01fftd', json = false } = {}) {
  const file = path.join(root, 'items', `items-${book}.js`);
  if (!fs.existsSync(file)) return { code: 0, text: `no items-${book}.js yet: the book's items are all by hand (docs/reference/items.md)`, missing: true };

  // the engine's own items, then the book's; loaded afresh so each call sees its own root
  const load = (f) => { const p = path.join(root, f); delete require.cache[require.resolve(p)]; require(p); };
  const bad = [];
  globalThis.window = globalThis; globalThis.LW = { BOOKS: {} }; globalThis.document = { write() {} };
  load('shared/core.js');
  Object.assign(LW.ITEMS, { bow: { name: 'Bow', kind: 'weapon', ranged: true }, quiver: { name: 'Quiver', kind: 'special' } }); // rules-series.js
  load(`data/projectaon/${book}/book.js`);
  const imp = (f) => {
    const key = JSON.stringify([f, fs.readFileSync(f, 'utf8')]);
    if (!loaded.has(key)) loaded.set(key, import(pathToFileURL(f).href + `?v=${++stamp}`));
    return loaded.get(key);
  };
  const T = await imp(file), B = LW.BOOKS[book];
  // every book's items are known in the page (an item from Book 1 can gate a choice in Book 2)
  for (const f of fs.readdirSync(path.join(root, 'items')).filter((f) => /^items-\w+\.js$/.test(f))) { const t = await imp(path.join(root, 'items', f)); LW.addItems(t.ITEMS, t.MARKS); }
  const FIELDS = new Set(['give', 'loot', 'take', 'ep', 'cs', 'rolls', 'meal', 'noHunt', 'todo', 'need', 'fight', 'bowShot', 'rntMod',
    'when', 'mark', 'unmark', 'rnt', 'note', 'stake', 'settle', 'sell', 'back', 'mealCost', 'lessen', 'ranges', 'draws', 'healLost', 'epMax', 'game']);
  const FIGHT = new Set(['csMod', 'csIf', 'csUnless', 'csNote', 'mindforce', 'unless', 'unarmed', 'undead', 'drain', 'with', 'double', 'ambush', 'evade',
    'rounds', 'stop', 'won', 'wounded', 'noEvade', 'noShield', 'noUnarmed', 'weaponCs', 'plain', 'only', 'barred', 'lend', 'mind', 'keep', 'healLost', 'restore', 'noBoost', 'to', 'points', 'lose', 'byHand']);
  const WHEN = new Set(['if', 'unless', 'ate', 'came', 'ep', 'epMax', 'cs', 'healLost', 'take', 'back', 'mark', 'unmark', 'settle']);
  const ROUND = new Set(['from', 'upTo', 'fromFoe', 'if', 'unless', 'ambush', 'mind', 'csMod', 'note', 'unarmed', 'heroLoss', 'foeLoss', 'heroPlus', 'heroEach', 'foeEach', 'psi', 'barred']);
  const STOP = new Set(['after', 'wound', 'foeAt', 'drawn', 'to', 'by', 'if']);
  const known = (id) => id === 'meal' || !!LW.ITEMS[id];
  for (const [k, it] of Object.entries(T.ITEMS)) {
    if (!['weapon', 'backpack', 'special'].includes(it.kind)) bad.push(`item ${k}: kind must be weapon, backpack or special`);
    if (it.glyph && !fs.existsSync(path.join(root, 'assets', 'icons', it.glyph + '.svg'))) bad.push(`item ${k}: no icon assets/icons/${it.glyph}.svg`);
  }
  const things = (list, where) => (list || []).forEach((l) => {
    if (l.item && !known(l.item)) bad.push(`${where}: unknown item ${l.item}`);
    if (!l.item && l.gold == null && l.meal == null && !l.pack && !l.arrows && !l.coin) bad.push(`${where}: give/loot entry with nothing in it`);
    if (l.coin && !LW.COINS[l.coin]) bad.push(`${where}: unknown coin ${l.coin}`);
  });
  const losses = (list, where) => (list || []).forEach((t) => {
    if (t.item && !Array.isArray(t.item) && !known(t.item)) bad.push(`${where}: unknown item ${t.item}`);
    if (t.weapons && !['all', 'one', 'used'].includes(t.weapons)) bad.push(`${where}: weapons must be 'all', 'one' or 'used'`);
    if (t.coin && !LW.COINS[t.coin]) bad.push(`${where}: unknown coin ${t.coin}`);
    [].concat(t.item || []).forEach((i) => { if (Array.isArray(t.item) && !known(i)) bad.push(`${where}: unknown item ${i}`); });
    if (t.else) losses(t.else, `${where} else`);
    if (t.backpack && !['all', 'items'].includes(t.backpack)) bad.push(`${where}: backpack must be 'all' or 'items'`);
    if (t.special && t.special !== 'all' && !(t.special === true && t.weapons)) bad.push(`${where}: special must be 'all'`);
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
    (x.when || []).forEach((w, i) => { Object.keys(w).filter((f) => !WHEN.has(f)).forEach((f) => bad.push(`${id} when[${i}]: unknown field ${f}`)); losses(w.take, `${id} when[${i}]`); });
    ((x.fight && x.fight.rounds) || []).forEach((r, i) => Object.keys(r).filter((f) => !ROUND.has(f)).forEach((f) => bad.push(`${id} fight rounds[${i}]: unknown field ${f}`)));
    [].concat((x.fight && x.fight.stop) || []).forEach((r) => Object.keys(r).filter((f) => !STOP.has(f)).forEach((f) => bad.push(`${id} fight stop: unknown field ${f}`)));
    // a way on named by the fight, the stake's outcome, a game's state or a range must be one of the section's choices
    const ways = [x.fight && x.fight.to, x.fight && x.fight.wounded, x.fight && x.fight.won && x.fight.won.to, x.fight && x.fight.won && x.fight.won.else,
      ...[].concat((x.fight && x.fight.stop) || []).flatMap((s) => [s.to, ...Object.values(s.by || {})]), ...Object.keys(x.ranges || {}), ...[].concat((x.fight && x.fight.evade) || []).map((e) => e.to),
      ...(x.game ? [x.game.broke, x.game.done, x.game.quit] : [])].filter(Boolean);
    ways.forEach((to) => { if (!(sec.choices || []).some((c) => c.to === to)) bad.push(`${id}: leads to ${to}, which is not one of its choices`); });
    [].concat(x.mark || [], x.unmark || [], ...(x.when || []).map((w) => [].concat(w.mark || [], w.unmark || []))).forEach((m) => { if (!/^\w+$/.test(m)) bad.push(`${id}: bad mark id ${m}`); });
    Object.keys(x.sell || {}).forEach((i) => { if (!known(i)) bad.push(`${id} sell: unknown item ${i}`); });
    if (x.fight && x.fight.with && x.fight.with !== 'none' && !(LW.ITEMS[x.fight.with] && (LW.ITEMS[x.fight.with].kind === 'weapon' || LW.ITEMS[x.fight.with].weapon))) bad.push(`${id} fight: with ${x.fight.with}, which is not a weapon`);
    (x.loot || []).forEach((l) => { if (l.pick && !l.or) bad.push(`${id} loot: pick without or`); });
    if (x.game && !['wheel', 'dice', 'higher'].includes(x.game.kind)) bad.push(`${id} game: kind must be wheel, dice or higher`);
    if (x.game && !sec.rnt) bad.push(`${id}: game, but the section draws no Random Number`);
    if (x.game && x.game.coin && !LW.COINS[x.game.coin]) bad.push(`${id} game: unknown coin ${x.game.coin}`);
    if ('rnt' in x && x.rnt !== null) bad.push(`${id}: rnt may only be null (no Random Number here)`);
    if (x.ep != null && x.ep !== 'full' && typeof x.ep !== 'number') bad.push(`${id}: ep must be a number or 'full'`);
    for (const [to, n] of Object.entries(x.need || {})) {
      if (!(sec.choices || []).some((c) => c.to === to)) bad.push(`${id}: need for a choice to ${to}, which it does not have`);
      [].concat(n && n.item || []).forEach((i) => { if (!known(i)) bad.push(`${id}: need for unknown item ${i}`); });
      ((n && n.any) || []).forEach((m) => [].concat(m.item || []).forEach((i) => { if (!known(i)) bad.push(`${id}: need for unknown item ${i}`); }));
    }
  }
  const lines = [bad.length ? bad.join('\n') : 'no errors'];
  const n = (f) => Object.values(T.SECTIONS).filter((x) => x[f]).length;
  lines.push(`${Object.keys(T.ITEMS).length} book items; ${Object.keys(T.SECTIONS).length} sections: give ${n('give')}, loot ${n('loot')}, take ${n('take')}, ep ${n('ep')}, rolls ${n('rolls')}, need ${n('need')}, fight ${n('fight')}, todo ${n('todo')}`);

  // sections the scan flagged that the table does not mention
  const reading = path.join(root, 'data', 'projectaon', book, 'items-reading.txt');
  let listed = null;
  if (fs.existsSync(reading)) {
    listed = [...fs.readFileSync(reading, 'utf8').matchAll(/^#(\d+) /gm)].map((m) => m[1]).filter((id) => !T.SECTIONS[id]);
    lines.push(`${listed.length} flagged sections left out (read, and judged to need nothing):\n${listed.join(' ')}`);
  }
  const counts = Object.fromEntries(['give', 'loot', 'take', 'ep', 'rolls', 'need', 'fight', 'todo'].map((f) => [f, n(f)]));
  const out = { book, errors: bad, items: Object.keys(T.ITEMS).length, sections: Object.keys(T.SECTIONS).length, counts, leftOut: listed };
  // json: also leave the result beside the book, for tools/book_status.py (step 5 of the checklist)
  if (json) {
    fs.writeFileSync(path.join(root, 'data', 'projectaon', book, 'check-items.json'), JSON.stringify(out, null, 1));
    lines.push(`wrote data/projectaon/${book}/check-items.json`);
  }
  return { ...out, code: 0, text: lines.join('\n') };
}

// the command line, only when run directly (the tests import the function)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const r = await checkItems({ book: process.argv[2] || '01fftd', json: process.argv.includes('--json') });
  console.log(r.text);
  process.exit(r.code);
}
