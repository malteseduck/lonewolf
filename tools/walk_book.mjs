/* Walk a book with the engine: every section the stand-in characters can reach, every way on tried.

     node tools/walk_book.mjs 07cd [--json]

   Step 6's script (ADR 0036, docs/reference/dashboard.md). The engine (shared/core.js,
   rules-series.js, fight.js) plays the imported book with its item table laid over it, in Node, for
   two stand-ins: a master (every discipline of the series and those before, every weapon mastered,
   a Bow where the kit has one, the flags of the earlier books' tables, the earlier books completed)
   and a novice (a new character, his disciplines and kit drawn). From each section it tries every
   choice open, every Random Number 0-9 where one is drawn, each fight to its end and its evasion, a
   game of chance played out; it takes what is free to take, and a gate on Endurance is tried at an
   Endurance that opens it. The stand-ins set out from every section at full Endurance (so the walk
   reaches what a lucky player would), and a section is walked again only when one arrives with
   other things (items, marks, coins), at most a few times. The draws are seeded: two runs agree.

   It lists, by section id: crashes (the engine threw), gates that never opened for either stand-in
   (with the engine's reason), sections reached with no way on, fights that went on past 100 rounds,
   fights every stand-in lost, and sections linked but never reached. Sections no link leads to
   (puzzle answers, turns by hand) are listed apart, as information. --json also writes walk.json
   beside the book, which tools/book_status.py shows at step 6. Ids, counts and the engine's own
   words only, never the book's text. */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_ROUNDS = 100, VISITS = 6, MAX_STATES = 40000;
let stamp = 0;

/* a seeded generator (mulberry32), for LW.rand10 and Math.random while the walk runs */
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* every section a link names: choices, and the ways a fight, its stop or its evasion lead */
export function links(sec) {
  const c = sec.combat || {}, out = (sec.choices || []).map((x) => x.to);
  out.push(c.to, c.wounded, c.won && c.won.to, c.won && c.won.else, ...[].concat(c.evade || []).map((e) => e && e.to),
    ...[].concat(c.stop || []).flatMap((s) => [s.to, ...Object.values(s.by || {})]), c.lose, c.points && c.points.lose);
  return [...new Set(out.filter(Boolean).map(String))];
}

/* Walk one book under `root`; returns the report. json: also writes walk.json beside the book. */
export async function walkBook({ root = ROOT, book = '01fftd', json = false, seed = 1 } = {}) {
  const dir = path.join(root, 'data', 'projectaon', book);
  if (!fs.existsSync(path.join(dir, 'book.js'))) return { code: 1, text: `no data/projectaon/${book}/book.js: import the book first` };
  const run = (f) => vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
  globalThis.window = globalThis; globalThis.LW = { BOOKS: {} };
  for (const f of ['core.js', 'rules-series.js', 'fight.js']) run(path.join(root, 'shared', f));
  run(path.join(dir, 'book.js'));
  const LW = globalThis.LW, B = LW.BOOKS[book], series = B.series || 'kai', S = LW.SERIES[series];
  if (!S) return { code: 0, text: `Book ${B.number} is ${series}: the engine has no ${series} rules yet (ADR 0036), so it cannot be walked`, waits: true };

  // every book's items are known (as in the page); this book's table laid over its sections
  const tables = {};
  const itemsDir = path.join(root, 'items');
  for (const f of fs.existsSync(itemsDir) ? fs.readdirSync(itemsDir).filter((f) => /^items-\w+\.js$/.test(f)) : []) {
    const t = await import(pathToFileURL(path.join(itemsDir, f)).href + `?v=${++stamp}`);
    tables[f.slice(6, -3)] = t; LW.addItems(t.ITEMS, t.MARKS);
  }
  LW.applyItems(B, tables[book]);
  LW.bookNumber = B.number || 0;

  const rand = seeded(seed), oldRandom = Math.random;
  Math.random = rand; LW.rand10 = () => Math.floor(rand() * 10);
  try {
    const walkers = [standIn(LW, B, 'master', tables), standIn(LW, B, 'novice', tables)].map((hero) => walk(LW, B, hero));
    return report(LW, B, book, walkers, json, dir, obtainable(LW, B, tables));
  } finally { Math.random = oldRandom; }
}

/* whether a draw can make the total a range asks for: the number 0-9 (each one more drawn adds 0-9) and
   whatever the text and his Bow could add or take away. A draw against his COMBAT SKILL is not judged. */
function drawable(sec, to) {
  const c = (sec.choices || []).find((x) => x.to === to), mods = sec.rntMod || [];
  if (!c || !c.range || mods.some((m) => m.vsCS)) return true;
  const per = (m) => m.plus * (m.each ? 10 : 1), more = 9 * ((sec.draws || 1) - 1);
  const lo = mods.reduce((t, m) => t + Math.min(0, per(m)), 0), hi = 9 + more + mods.reduce((t, m) => t + Math.max(0, per(m)), 0) + (sec.bowShot ? 8 : 0);
  return c.range[1] >= lo && c.range[0] <= hi;
}

/* Every item he could hold in this book: what its table and kit give, and the Weapons and Special Items
   the earlier books' tables and kits give (carried over; Backpack Items are not). */
function obtainable(LW, B, tables) {
  const ids = new Set(['meal']), kitIds = (k) => (k ? [...(k.give || []), ...(k.from || [])].map((x) => (typeof x === 'string' ? x : x.item)).filter(Boolean) : []);
  const given = (t) => Object.values(t.SECTIONS || {}).flatMap((x) => [...(x.give || []), ...(x.loot || [])].map((l) => l.item).filter(Boolean));
  for (const [c, t] of Object.entries(tables)) {
    const n = parseInt(c, 10);
    if (n === B.number) given(t).forEach((x) => ids.add(x));
    else if (n < B.number) [...given(t), ...kitIds(LW.KITS[n])].filter((x) => LW.itemKind(x) !== 'backpack').forEach((x) => ids.add(x));
  }
  kitIds(LW.KITS[B.number]).forEach((x) => ids.add(x));
  if (B.number === 1) ['axe', 'map', 'broadsword', 'sword', 'helmet', 'chainmail', 'mace', 'potion', 'quarterstaff', 'spear'].forEach((x) => ids.add(x)); // makeHero's kit and bonus
  return ids;
}

/* The stand-in characters (see the top of the file). */
function standIn(LW, B, who, tables) {
  const series = B.series || 'kai', S = LW.SERIES[series], h = LW.HeroSetup(B, null);
  if (who === 'master') {
    h.rolls = { cs: 9, ep: 9 };
    h.picked = new Set(S.list);
    if (series !== 'kai') h.weapons = new Set(LW.WEAPONS);
  } else h.auto();
  const hero = h.build();
  if (who === 'master') {
    if (series === 'kai') hero.weaponskill = 'sword';
    hero.completed = Object.keys(tables).filter((c) => parseInt(c, 10) < B.number);
    // the flags the earlier books' tables can leave him (visited a place, fought a foe)
    for (const [c, t] of Object.entries(tables)) if (parseInt(c, 10) < B.number) for (const [m, d] of Object.entries(t.MARKS || {})) if (d.flag) (hero.marks = hero.marks || {})[m] = true;
  }
  if (h.kit) {
    const k = LW.KitSetup(B, h.kit, hero);
    k.rollGold(who === 'master' ? 9 : undefined);
    if (who === 'master') for (const want of ['bow', 'quiver', 'sword']) { const i = k.from.findIndex((x) => x.item === want); if (i >= 0) k.choose(i); }
    k.auto();
    k.finish();
  }
  if (who === 'master') {
    // the Special Items of earlier books that this book's table names and does not give itself (a pendant from Book 1)
    const mine = tables[B.id], text = mine ? JSON.stringify(mine.SECTIONS) : '';
    for (const [c, t] of Object.entries(tables)) if (parseInt(c, 10) < B.number) for (const [id, it] of Object.entries(t.ITEMS || {})) {
      if (it.kind !== 'special' || !text.includes(`"${id}"`) || (mine.ITEMS || {})[id]) continue;
      const given = Object.values(mine.SECTIONS).some((x) => [...(x.give || []), ...(x.loot || [])].some((l) => l.item === id));
      if (!given && !LW.hasItem(hero, id)) LW.putItem(hero, id);
    }
    hero.gold = 50;
  }
  LW.readyHero(hero);
  hero.who = who;
  return hero;
}

/* One stand-in's walk: a queue of states (the game's `s`, as JSON), each section walked again only for
   a new signature. Returns what it found. */
function walk(LW, B, hero) {
  const g = new LW.Game(B, 'walk'); g.keep = 0; g.save = () => {};
  g.start(JSON.parse(JSON.stringify(hero)));
  const out = { who: hero.who, reached: new Set(), states: 0, cut: false, crashes: [], choices: new Map(), stuck: new Map(), long: new Set(),
    fights: new Map(), deaths: 0 };
  const seen = new Map(), queue = [JSON.stringify(g.s)];
  // sections where the way he came matters (need.came, when.came): the section before is part of the signature
  const byCame = new Set(Object.entries(B.sections).filter(([, s]) => JSON.stringify(s).includes('"came"')).map(([id]) => id));
  // only what the book tests splits a section's walks: the items and marks its sections name outside what they hand over
  const named = new Set();
  for (const s of Object.values(B.sections)) { const { give, loot, text, choices, ...rest } = s; JSON.stringify([rest, (choices || []).map((c) => c.need)]).replace(/"(\w+)"/g, (m, w) => named.add(w)); }
  const sig = () => {
    const h = g.s.hero, items = [...new Set([...h.weapons, ...h.backpack, ...h.special, ...(h.had || [])].filter((i) => named.has(i)))].sort().join(',');
    return [items, Object.keys(h.marks || {}).filter((m) => named.has(m)).sort(), Object.entries(h.coins || {}).filter(([, n]) => n > 0).map(([c]) => c), h.noPack ? 'nopack' : '',
      Object.keys(h.stash || {}).sort(), Object.keys(g.s.kept || {}).sort(), byCame.has(g.s.at) ? g.came() : ''].join('|');
  };
  const put = (s) => { queue.push(typeof s === 'string' ? s : JSON.stringify(s)); };
  const at = () => g.s.at;
  let from = null; // the section being walked: a crash on the way out of it is its own
  const crash = (e, where) => out.crashes.push({ id: from, who: hero.who, where, error: String(e && e.message || e).split('\n')[0] });

  while (queue.length) {
    if (out.states >= MAX_STATES) { out.cut = true; break; }
    g.s = JSON.parse(queue.shift());
    const id = at(), key = sig(), mine = seen.get(id) || new Set();
    if (mine.has(key) || mine.size >= VISITS) continue;
    mine.add(key); seen.set(id, mine); out.states++;
    out.reached.add(id);
    from = id;
    try { section(); } catch (e) { crash(e, 'section'); }
  }
  return out;

  /* a gate's needs met by the walker: the item put in (forced past the limits), the items it must not have
     taken away, the gold or coins made up. Returns the ids lent ('' for gold, coins or items taken away). */
  function lend(need) {
    const h = g.hero, out = [];
    const give = (id) => {
      out.push(id);
      if (id === 'meal') return void (h.meals += 1);
      if (LW.putItem(h, id)) { const k = LW.itemKind(id); h[k === 'weapon' ? 'weapons' : k === 'special' ? 'special' : 'backpack'].push(id); h.noPack = false; }
    };
    const ids = need.item ? [].concat(need.item) : [];
    if (ids.length && need.not) { ids.forEach((x) => { for (let n = 0; n < 9 && LW.dropItem(h, x); n++); }); out.push(''); }
    else if (ids.length && !ids.some((x) => LW.hasItem(h, x))) give(ids[0]);
    if (need.gold && h.gold < need.gold) { h.gold = Math.min(50, need.gold); out.push(''); }
    if (need.coin) { (h.coins = h.coins || {})[need.coin] = Math.max(h.coins[need.coin] || 0, need.n || 1); out.push(''); }
    // any: the first member that can be met by items: held (item: the first, items: all), or under not, every
    // item it names put away (and the Meals, for a count of them; the gold, for an amount)
    if (need.any && !need.any.some((m) => LW.meets(h, m))) {
      const items = (m) => [...[].concat(m.item || []).slice(0, 1), ...(m.items || [])];
      const named = (c) => (!c || typeof c !== 'object' ? [] : [...[].concat(c.item || [], c.items || []), ...Object.values(c).flatMap(named)]);
      const m = need.any.find((x) => items(x).length || x.not);
      if (m && m.not) {
        named(m.not).forEach((x) => { for (let n = 0; n < 9 && LW.dropItem(h, x); n++); });
        if (JSON.stringify(m.not).includes('"meals"')) h.meals = 0;
        if (m.not.gold) h.gold = Math.min(h.gold, m.not.gold - 1); // "if you have no Gold Crowns": the purse emptied
        out.push('');
      }
      else if (m) items(m).filter((x) => !LW.hasItem(h, x)).forEach(give);
    }
    return out.length ? out : null;
  }

  // take what is free (and the master buys what he lacks), set a stake, choose the losses asked for
  function settle() {
    const sec = g.section;
    for (let n = 0; n < 20 && (g.s.picks || []).length; n++) { const p = g.pickable(); if (!p.length) { g.s.picks.shift(); continue; } g.pickLoss(hero.who === 'master' ? p[p.length - 1] : p[0]); }
    if (sec.stake && !(g.s.stakes || {})[sec.stake.key || g.s.at]) g.setStake(sec.stake.min || 0);
    const list = g.loot(), order = hero.who === 'novice' ? list.slice().reverse() : list;
    for (const l of order) {
      if (l.taken || l.closed) continue;
      if (l.cost && (hero.who !== 'master' || (l.item && LW.hasItem(g.hero, l.item)) || l.item === 'meal')) continue;
      g.takeLoot(l.i);
      for (let n = 0; n < 5 && (g.s.picks || []).length; n++) { const p = g.pickable(); if (!p.length) break; g.pickLoss(p[0]); }
    }
  }

  function section() {
    const sec = g.section, id = at();
    if (g.lost) { out.deaths += g.dead ? 1 : 0; return; }
    if (sec.end) return;
    settle();
    if (g.dead) { out.deaths++; return; }
    if (g.combatPending) return fight();
    ways(JSON.stringify(g.s));
  }

  /* the fight to its end, fresh, and its evasion where it has one: each outcome walked on */
  function fight() {
    const id = at(), before = JSON.stringify(g.s), c = g.section.combat, f0 = out.fights.get(id) || { won: 0, lost: 0 };
    out.fights.set(id, f0);
    const went = new Set(); // where the fights played here led
    const on = () => { went.add(at()); if (at() !== id) put(g.s); else ways(JSON.stringify(g.s)); };
    // evade: the index of the evasion to take, as soon as it opens; 'lose': a contest lost at once
    const play = (evade) => {
      g.s = JSON.parse(before);
      g.hero.ep = g.hero.epMax;
      const f = new LW.Fight(g, B.id);
      if (evade === 'lose') { f.end('dead'); f.finish(); return on(); } // a contest lost leads on (c.lose)
      while (!f.over && f.rounds < MAX_ROUNDS) {
        if (evade != null && (f.evades()[evade] || {}).open) { f.round(LW.rand10(), 'evade', evade); break; }
        f.round(LW.rand10());
      }
      if (!f.over) {
        if (evade != null) return true;
        if (c.byHand) f.stopHere(); // the text ends it some way the engine cannot see: the player stops it
        else { out.long.add(id); return true; }
      }
      if (f.over === 'dead') { if (evade == null) f0.lost++; out.deaths++; return false; }
      if (evade == null) f0.won++;
      f.finish();
      on();
      return true;
    };
    // up to three tries, each with the dice running on: a fight counts as lost only if he loses all three
    try { for (let n = 0; n < 3 && !play(null); n++); } catch (e) { crash(e, 'fight'); }
    if (!c.noEvade) [].concat(c.evade || []).forEach((e, i) => { try { play(i); } catch (x) { crash(x, 'evasion'); } });
    if (c.lose || (c.points && c.points.lose)) try { play('lose'); } catch (e) { crash(e, 'contest lost'); }
    // the fight's other outcomes (wounded or not, a win in so many rounds, a stop's ways), and a win where
    // none came, made by hand: the dice decide those, and the walk goes on past a fight he could not win
    try {
      const c2 = Object.assign({}, c, { evade: null, lose: null, points: null });
      const ends = links({ combat: c2 }).filter((t) => !went.has(t));
      if (!f0.won && !c.to) ends.push(null);
      for (const to of ends) { g.s = JSON.parse(before); g.hero.ep = g.hero.epMax; g.wonCombat(); if (to) { g.go(to, 'forced'); put(g.s); } else ways(JSON.stringify(g.s)); }
    } catch (e) { crash(e, 'outcome'); }
  }

  /* every choice from this state: for each Random Number where one is drawn, after a game played out */
  function ways(state) {
    const sec = g.section, id = at(), branches = [];
    const draws = sec.rnt && (sec.rnt === 'auto' || (sec.rolls || []).length || sec.bowShot);
    if (sec.game) {
      branches.push(state);
      g.s = JSON.parse(state);
      for (let n = 0; n < 30 && !g.gameBroke && !(sec.game.bets && g.game.bets >= sec.game.bets); n++) {
        const fixed = typeof sec.game.stake === 'number';
        if (!fixed && g.bet(g.gameMin, LW.rand10())) break;
        if (g.play(LW.rand10())) break;
      }
      branches.push(JSON.stringify(g.s));
    } else if (draws) {
      for (let n = 0; n < 10; n++) {
        g.s = JSON.parse(state);
        g.setRolled(n);
        branches.push(JSON.stringify(g.s));
      }
    } else branches.push(state);
    // a range no number drawn opened (his bonuses carry the total past it): tried at its own number
    if (draws && sec.rnt === 'auto') {
      const opened = new Set();
      for (const b of branches) { g.s = JSON.parse(b); if (!g.dead) g.choices().forEach((c, i) => { if (c.enabled) opened.add(i); }); }
      (sec.choices || []).forEach((c, i) => {
        if (!c.range || opened.has(i)) return;
        g.s = JSON.parse(branches[0]);
        g.s.rolled = c.range[0]; g.s.forced = i;
        branches.push(JSON.stringify(g.s));
      });
    }
    let moved = false;
    const why = new Set();
    for (const b of branches) {
      g.s = JSON.parse(b);
      if (g.dead) { out.deaths++; continue; }
      const cs = g.choices();
      cs.forEach((c, i) => {
        const k = `${id}:${i}`, rec = out.choices.get(k) || { id, i, to: c.to, open: false, why: new Set() };
        out.choices.set(k, rec);
        const forced = g.s.forced;
        let open = c.enabled, lent = forced === i && open ? ['#drawn'] : null;
        if (forced != null && forced !== i) return; // that branch is for its own range only
        if (!open && c.need && c.need.ep) { // tried at an Endurance that opens it
          g.s = JSON.parse(b);
          g.hero.ep = Math.max(1, Math.min(g.hero.epMax, c.need.ep[0]));
          open = (g.choices()[i] || {}).enabled;
        }
        if (!open && c.need) { // tried with what it asks for lent (or, for "if you have no...", taken away)
          g.s = JSON.parse(b);
          lent = lend(c.need);
          open = (g.choices()[i] || {}).enabled;
        }
        if (!open) { rec.why.add(c.why); why.add(c.why); g.s = JSON.parse(b); return; }
        if (lent) { rec.why.add(c.why); (rec.lent = rec.lent || new Set()); lent.forEach((x) => rec.lent.add(x)); } else rec.open = true;
        moved = true;
        try {
          const real = g.choices()[i];
          g.hero.ep = g.hero.epMax; // sets out from every section at full Endurance
          delete g.s.forced;
          g.choose(real);
          put(g.s);
        } catch (e) { crash(e, `choice to ${c.to}`); }
        g.s = JSON.parse(b);
      });
    }
    if (!moved && !sec.puzzle && !(sec.combat && sec.combat.to)) out.stuck.set(id, [...why].filter(Boolean));
  }
}

/* what the walkers found, together: a gate is closed only if it never opened for either */
function report(LW, B, book, walkers, json, dir, found) {
  const ids = Object.keys(B.sections), linked = new Set([String(B.start)]);
  for (const s of Object.values(B.sections)) links(s).forEach((t) => linked.add(t));
  const reached = new Set(walkers.flatMap((w) => [...w.reached]));
  // what a link leads to from the start, whatever the gates: the rest is only past a section no link reaches
  const fromStart = new Set([String(B.start)]), todo = [String(B.start)];
  while (todo.length) for (const t of links(B.sections[todo.pop()] || {})) if (!fromStart.has(t)) { fromStart.add(t); todo.push(t); }
  const num = (a, b) => (parseInt(a, 10) - parseInt(b, 10)) || String(a).localeCompare(String(b));
  const closed = new Map();
  for (const w of walkers) for (const [k, r] of w.choices) {
    const c = closed.get(k) || { id: r.id, to: r.to, open: false, lent: new Set(), why: new Set() };
    c.open = c.open || r.open; r.why.forEach((x) => c.why.add(x)); (r.lent || []).forEach((x) => c.lent.add(x)); closed.set(k, c);
  }
  const fights = new Map();
  for (const w of walkers) for (const [id, f] of w.fights) { const t = fights.get(id) || { won: 0, lost: 0 }; t.won += f.won; t.lost += f.lost; fights.set(id, t); }
  // a section stuck for one stand-in but walked on by the other is the gate's business, not a dead end
  const onward = new Set(walkers.flatMap((w) => [...w.choices.values()].filter((r) => r.open).map((r) => r.id)));
  const r = {
    book, seed: 1,
    standIns: walkers.map((w) => ({ who: w.who, reached: w.reached.size, states: w.states, deaths: w.deaths, cut: w.cut })),
    sections: ids.length,
    crashes: walkers.flatMap((w) => w.crashes).filter((c, i, a) => a.findIndex((x) => x.id === c.id && x.error === c.error) === i).sort((a, b) => num(a.id, b.id)),
    closed: [...closed.values()].filter((c) => !c.open && !c.lent.size).map((c) => ({ id: c.id, to: c.to, why: [...c.why].filter(Boolean) })).sort((a, b) => num(a.id, b.id)),
    // opened only with the item lent: a matter for the look only when the item is found nowhere he could get it
    lent: [...closed.values()].filter((c) => !c.open && c.lent.size).map((c) => ({ id: c.id, to: c.to, why: [...c.why].filter(Boolean),
      missing: [...c.lent].filter((x) => x && (x === '#drawn' ? !drawable(B.sections[c.id], c.to) : !found.has(x))) })).sort((a, b) => num(a.id, b.id)),
    stuck: [...new Set(walkers.flatMap((w) => [...w.stuck.keys()]))].filter((id) => !onward.has(id)).sort(num)
      .map((id) => ({ id, why: [...new Set(walkers.flatMap((w) => w.stuck.get(id) || []))] })),
    long: [...new Set(walkers.flatMap((w) => [...w.long]))].sort(num),
    lostFights: [...fights].filter(([, f]) => f.lost && !f.won).map(([id]) => id).sort(num),
    unreached: ids.filter((id) => fromStart.has(id) && !reached.has(id)).sort(num),
    pastOrphans: ids.filter((id) => linked.has(id) && !fromStart.has(id)).sort(num),
    orphans: ids.filter((id) => !linked.has(id)).sort(num),
  };
  r.look = [...new Set([...r.crashes.map((c) => c.id), ...r.closed.map((c) => c.id), ...r.lent.filter((c) => c.missing.length).map((c) => c.id), ...r.stuck.map((s) => s.id), ...r.long, ...r.unreached])].sort(num);
  const lines = [
    ...r.standIns.map((s) => `${s.who}: reached ${s.reached} of ${r.sections} sections (${s.states} states walked, ${s.deaths} deaths)${s.cut ? `; cut short at ${MAX_STATES} states` : ''}`),
    `crashes: ${r.crashes.length}${r.crashes.map((c) => `\n  ${c.id} (${c.who}, ${c.where}): ${c.error}`).join('')}`,
    `gates never opened: ${r.closed.length}${r.closed.map((c) => `\n  ${c.id} -> ${c.to}: ${c.why.join('; ') || '?'}`).join('')}`,
    `gates opened only with what they ask for lent: ${r.lent.length}${r.lent.filter((c) => c.missing.length).map((c) => `
  ${c.id} -> ${c.to}: ${c.missing.map((x) => (x === '#drawn' ? 'a total no draw can make' : `${x}, given nowhere he could have it`)).join('; ')}`).join('')}`,
    `no way on: ${r.stuck.length}${r.stuck.map((s) => `\n  ${s.id}: ${s.why.join('; ') || 'no choices'}`).join('')}`,
    `fights past ${MAX_ROUNDS} rounds: ${r.long.length ? r.long.join(' ') : 'none'}`,
    `fights no stand-in won (three tries each; a hard fight, or he came unarmed): ${r.lostFights.length ? r.lostFights.join(' ') : 'none'}`,
    `linked but never reached: ${r.unreached.length ? r.unreached.join(' ') : 'none'}`,
    `no link leads here (puzzle answers, turns by hand): ${r.orphans.length ? r.orphans.join(' ') : 'none'}${r.pastOrphans.length ? `; only past those: ${r.pastOrphans.length}` : ''}`,
    `${r.look.length} sections to look at${r.look.length ? `: ${r.look.join(' ')}` : ''}`,
  ];
  if (json) {
    fs.writeFileSync(path.join(dir, 'walk.json'), JSON.stringify(r, null, 1));
    lines.push(`wrote data/projectaon/${book}/walk.json`);
  }
  return { ...r, code: 0, text: lines.join('\n') };
}

// the command line, only when run directly (the tests import the function)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const r = await walkBook({ book: process.argv[2] || '01fftd', json: process.argv.includes('--json') });
  console.log(r.text);
  process.exit(r.code);
}
