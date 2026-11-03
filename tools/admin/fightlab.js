/* The fight list's simulator (fightlist.html; docs/reference/dashboard.md): every fight of the books, and
   trials of one on the real LW.Fight, many times over, under the engine's rules or trial ones. A trial rule
   is laid over the engine only while a trial runs (withRules) and taken off again: nothing here changes how
   the player fights. A rule worth keeping goes into the engine as a ruling. No DOM, so Vitest can run it. */

const MAX_ROUNDS = 100;

/* The trial rules, each at the value that leaves the engine as it is. swordCs null: the item's own. */
export const BASE_RULES = {
  ratioCap: 10,     // ruling R1: the most the Combat Ratio counts for; 99 is no cap
  swordCs: null,    // the Sommerswerd's COMBAT SKILL
  swordGrow: 0,     // more for each book past Book 2
  swordMax: 8,      // the most it grows to
  unleashRounds: 0, // its first rounds in a fight at unleashCs
  unleashCs: 8,
  undead: 'always', // its doubling against the undead: always, unleashed, never
  skillBy: 0,       // added to what Weaponskill, Weaponmastery and Grand Weaponmastery give
  mindBy: 0,        // added to what Mindblast, Psi-surge and Kai-surge give
  foeCs: 0,         // added to every foe's COMBAT SKILL
  foeEp: 100,       // every foe's ENDURANCE, in percent
  heroLoss: 100,    // what the table takes from him, in percent
  foeLoss: 100,     // what the table takes from a foe, in percent
  killAs: null,     // the table's outright death of him as a wound of this much; null: a death
};
/* From docs/reference/sommerswerd-options.md, its numbers first guesses. A trial fight is alone, so the
   charges of "Unleash" are not counted: every fight has its full rounds. */
export const PRESETS = [
  { id: 'books', name: 'The engine as it is', rules: {} },
  { id: 'nocap', name: 'No cap on the Combat Ratio', rules: { ratioCap: 99 } },
  { id: 'unleash', name: 'Sommerswerd: unleashed, +3 otherwise', rules: { swordCs: 3, unleashRounds: 3, unleashCs: 8, undead: 'unleashed' } },
  { id: 'awaken', name: 'Sommerswerd: awakening, +3 growing', rules: { swordCs: 3, swordGrow: 1, swordMax: 8 } },
  { id: 'both', name: 'Sommerswerd: unleashed and awakening', rules: { swordCs: 3, swordGrow: 1, swordMax: 8, unleashRounds: 3, unleashCs: 8, undead: 'unleashed' } },
].map((p) => Object.assign(p, { rules: Object.assign({}, BASE_RULES, p.rules) }));

/* the names of the rules that differ from the engine's */
export const rulesChanged = (rules) => Object.keys(BASE_RULES).filter((k) => rules[k] !== undefined && rules[k] !== BASE_RULES[k]);

/* Every fight, one row each, by book and section. */
export function listFights(books) {
  const rows = [];
  for (const b of [...books].sort((x, y) => x.number - y.number)) {
    const ids = Object.keys(b.sections).filter((id) => (b.sections[id].combat?.enemies || []).length).sort((x, y) => (+x || 0) - (+y || 0));
    for (const id of ids) {
      const c = b.sections[id].combat;
      rows.push({ key: `${b.id}/${id}`, code: b.id, number: b.number, id, kind: c.kind || (c.mind ? 'mind' : c.points ? 'contest' : 'fight'),
        foes: c.enemies.map((e, i) => ({ name: e.name, cs: e.cs, ep: e.ep, at: i, undead: !!e.undead, immune: e.immune, mindforce: e.mindforce, drain: e.drain, art: e.art })) });
    }
  }
  return rows;
}

const SKILLS = new Set(['Weaponskill', 'Weaponmastery', 'Grand Weaponmastery']);
const MINDS = new Set(['Mindblast', 'Psi-surge', 'Kai-surge']);
/* the Sommerswerd's always-on bonus under these rules, in a book of this number */
const swordNow = (r, it, number) => {
  const base = r.swordCs == null ? it.cs : r.swordCs, grown = base + r.swordGrow * Math.max(0, number - 2);
  return r.swordGrow ? Math.min(Math.max(base, r.swordMax), grown) : grown;
};

/* Lays the rules over the engine while fn runs, then takes them off, whatever happens. */
function withRules(LW, rules, number, fn) {
  const r = Object.assign({}, BASE_RULES, rules), it = LW.ITEMS.sommerswerd;
  const saved = { RATIO_CAP: LW.RATIO_CAP, combatRound: LW.combatRound, heroCS: LW.heroCS, sword: it && { cs: it.cs, undead: it.undead } };
  try {
    LW.RATIO_CAP = r.ratioCap;
    if (it) { it.cs = swordNow(r, it, number); if (r.undead !== 'always') delete it.undead; }
    if (r.heroLoss !== 100 || r.foeLoss !== 100 || r.killAs != null) {
      const round = saved.combatRound, scale = (n, pct) => (n === Infinity ? n : Math.floor((n * pct) / 100));
      LW.combatRound = (ratio, roll) => {
        const o = round(ratio, roll);
        return { enemy: scale(o.enemy, r.foeLoss), hero: o.hero === Infinity && r.killAs != null ? scale(r.killAs, r.heroLoss) : scale(o.hero, r.heroLoss) };
      };
    }
    if (r.skillBy || r.mindBy) {
      const cs = saved.heroCS;
      LW.heroCS = (hero, ctx) => {
        const o = cs(hero, ctx);
        const parts = o.parts.map((p) => (SKILLS.has(p.label) ? { ...p, n: p.n + r.skillBy } : MINDS.has(p.label) ? { ...p, n: p.n + r.mindBy } : p));
        return { total: parts.reduce((t, p) => t + p.n, 0), parts };
      };
    }
    return fn(r, it);
  } finally {
    LW.RATIO_CAP = saved.RATIO_CAP; LW.combatRound = saved.combatRound; LW.heroCS = saved.heroCS;
    if (it) { it.cs = saved.sword.cs; if (saved.sword.undead === undefined) delete it.undead; else it.undead = saved.sword.undead; }
  }
}

/* a seeded generator (mulberry32): the same trial number deals the same numbers under either set of rules */
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* The fight set up on the real engine, at this section with a copy of the hero; none of the book's own numbers change. */
function setUp(LW, book, id, hero, r, it) {
  const g = new LW.Game(book, 'fightlab'); g.save = () => {}; g.keep = 0;
  g.s = { hero: JSON.parse(JSON.stringify(hero)), at: id, looted: {}, fought: {}, trail: [{ id }], events: [], rolled: null };
  const f = new LW.Fight(g, book.id);
  for (const foe of f.foes) { foe.cs += r.foeCs; if (r.foeEp !== 100) { foe.ep = Math.max(1, Math.round((foe.ep * r.foeEp) / 100)); foe.max = foe.ep; } }
  // the first rounds at full power: a change for those rounds, as the books' own are, while the blade is in hand
  if (r.unleashRounds && it && f.weapon === 'sommerswerd') {
    const plus = r.unleashCs - it.cs;
    if (plus) f.c = Object.assign({}, f.c, { rounds: [...(f.c.rounds || []), { upTo: r.unleashRounds, csMod: plus, note: 'Unleashed' }] });
  }
  return f;
}

/* What he does between rounds: his mind's attack as the tactic says, a draught, his Curing. */
function ready(LW, f, t) {
  const hero = f.hero, psi = LW.psi(hero);
  let want = t.mind === 'rest' ? 0 : t.mind === 'blast' ? Math.min(1, f.power) : f.power;
  if (want === 2 && hero.ep <= psi.floor) want = 1;
  f.mind = want;
  while (t.drinkAt > 0 && hero.ep <= t.drinkAt && hero.ep < hero.epMax && hero.backpack.includes('potion')) f.drink();
  if (t.cure !== false && LW.canCure(hero, f.bookId) && hero.ep <= LW.cureOf(hero).at) f.cure();
}

function play(LW, f, r, it, t) {
  const hero = f.hero;
  if (f.noStrike) { if (f.evadeOpen) f.round(LW.rand10(), 'evade'); else f.end('broken'); return; }
  while (!f.over && f.rounds < MAX_ROUNDS) {
    ready(LW, f, t);
    if (it && r.undead === 'unleashed') { if (f.rounds < r.unleashRounds) it.undead = 2; else delete it.undead; }
    if (t.evadeAt > 0 && hero.ep <= t.evadeAt && f.evadeOpen) f.round(LW.rand10(), 'evade');
    else f.round(LW.rand10());
  }
}

const TACTICS = { mind: 'full', drinkAt: 0, evadeAt: 0, cure: true };

/* n trials of a section's fight. Returns the counts by how each ended (win, dead, evade, stop, long: past
   MAX_ROUNDS), the means of rounds, ENDURANCE lost and left, and his score and ratio in the first round. */
export function trial(LW, book, id, hero, { n = 500, seed = 1, rules = {}, tactics = {} } = {}) {
  const t = Object.assign({}, TACTICS, tactics), out = { n, win: 0, dead: 0, evade: 0, stop: 0, long: 0, rounds: 0, lost: 0, left: 0 };
  const { rand10 } = LW, was = LW.bookNumber;
  LW.bookNumber = book.number;
  try {
    return withRules(LW, rules, book.number, (r, it) => {
      let survived = 0;
      for (let i = 0; i < n; i++) {
        const rand = seeded(seed * 1000003 + i);
        LW.rand10 = () => Math.floor(rand() * 10);
        const f = setUp(LW, book, id, hero, r, it);
        if (i === 0) {
          ready(LW, f, t);
          const parts = f.parts();
          Object.assign(out, { cs: parts.total, parts: parts.parts, ratio: f.ratio(), uncapped: parts.total - f.foe.cs, weapon: f.weapon, foeCs: f.foe.cs,
            // he has weapons, and this fight's own rules let him use none of them
            barred: !f.weapon && !f.c.mind && f.c.with !== 'none' && [...f.hero.weapons, ...f.hero.special].some((w) => (LW.ITEMS[w] || {}).kind === 'weapon' || (LW.ITEMS[w] || {}).weapon) });
        }
        const start = f.hero.ep;
        play(LW, f, r, it, t);
        if (!f.over) out.long++;
        else if (f.over === 'win') out.win++;
        else if (f.over === 'dead') out.dead++;
        else if (f.over === 'evade') out.evade++;
        else out.stop++;
        out.rounds += f.rounds;
        const lost = Math.max(0, start - f.hero.ep);
        out.lost += lost;
        if (f.over !== 'dead') { out.left += f.hero.ep; survived++; }
      }
      out.rounds /= n; out.lost /= n; out.left = survived ? out.left / survived : 0;
      return out;
    });
  } finally { LW.rand10 = rand10; LW.bookNumber = was; }
}

/* One fight played, with the engine's own log, to read through. */
export function oneFight(LW, book, id, hero, { seed = 1, rules = {}, tactics = {} } = {}) {
  const t = Object.assign({}, TACTICS, tactics), { rand10 } = LW, was = LW.bookNumber;
  LW.bookNumber = book.number;
  try {
    return withRules(LW, rules, book.number, (r, it) => {
      const rand = seeded(seed);
      LW.rand10 = () => Math.floor(rand() * 10);
      const f = setUp(LW, book, id, hero, r, it);
      play(LW, f, r, it, t);
      return { over: f.over || 'long', rounds: f.rounds, ep: f.hero.ep, log: f.log };
    });
  } finally { LW.rand10 = rand10; LW.bookNumber = was; }
}

/* The disciplines a stand-in takes first, those that tell in a fight before the rest. */
const WANTS = {
  kai: ['weaponskill', 'mindblast', 'mindshield', 'healing', 'hunting'],
  magnakai: ['weaponmastery', 'psiSurge', 'psiScreen', 'curing', 'huntmastery'],
  grandmaster: ['grandWeaponmastery', 'kaiSurge', 'kaiScreen', 'deliverance', 'grandHuntmastery'],
  neworder: ['grandWeaponmastery', 'kaiSurge', 'kaiScreen', 'deliverance', 'curing'],
};
/* A hero for a book, to compare fights by: novice, a new one at the middle of his rolls with the series' first
   Disciplines; typical, one more for each book of the series so far; master, every Discipline and top rolls.
   He has a sword, and what asks for more is set on the fight's own window. opts.sword: the Sommerswerd,
   found in Book 2 and left behind by the New Order (ADR 0047). */
export function standIn(LW, book, who = 'typical', opts = {}) {
  const series = book.series || 'kai', S = LW.SERIES[series];
  const list = [...new Set([...(WANTS[series] || []).filter((d) => S.list.includes(d)), ...S.list])];
  const past = Math.max(0, book.number - S.shelf.from);
  const count = who === 'master' ? list.length : who === 'typical' ? Math.min(list.length, S.first + past) : S.first;
  const roll = who === 'master' ? 9 : 5;
  const h = LW.makeHero({ csRoll: roll, epRoll: roll, disciplines: series === 'kai' ? list.slice(0, count) : LW.SERIES.kai.list.slice(), base: S.base });
  Object.assign(h, { series, weapons: ['sword'], special: [], backpack: [], meals: 0, gold: 0, completed: [], mastery: [], grandMastery: [] });
  h.weaponskill = series === 'kai' && h.disciplines.includes('weaponskill') ? 'sword' : null;
  if (series !== 'kai') h[S.field] = list.slice(0, count);
  if (S.arms && h[S.field].includes(S.arms.disc)) h[S.arms.field] = ['sword'];
  if (opts.sword && book.number >= 2 && series !== 'neworder' && LW.ITEMS.sommerswerd) h.special.push('sommerswerd');
  if (S.kaiWeapon) h.special.push((LW.KAI_WEAPONS.find((k) => k.kind === 'sword') || LW.KAI_WEAPONS[0]).id);
  return LW.readyHero(h);
}

/* A fight that takes only some weapons (combat.with, combat.only) is reached only with one, the sections before it
   seeing to that: a hero who cannot fight it is given the first it names. Kinds that are no item are left alone. */
export function equipFor(LW, hero, c) {
  const named = [...(c.with && c.with !== 'none' ? [c.with] : []), ...(c.only || [])].filter((id) => LW.ITEMS[id]);
  const ctx = { with: c.with, only: c.only, barred: c.barred, lend: c.lend, weaponCs: c.weaponCs };
  if (named.length && !c.mind && !LW.armedWith(hero, ctx)) LW.putItem(hero, named[0]);
  return hero;
}

/* A Discipline ticked or unticked on a hero already made: what came of it at setting out follows, as a new hero
   would have it. Weaponskill's weapon goes with it (the engine reads the weapon alone); scores earned by the
   count (a Lore-circle, a Grand Master Discipline past the first few) are settled again, his wounds kept. */
export function setDiscipline(LW, hero, field, id, on) {
  const list = hero[field] || [], lost = hero.epMax - hero.ep;
  hero[field] = on ? [...new Set([...list, id])] : list.filter((d) => d !== id);
  if (id === 'weaponskill') hero.weaponskill = on ? hero.weaponskill || 'sword' : null;
  LW.readyHero(hero);
  hero.ep = Math.max(1, hero.epMax - lost);
}

/* Every row under the engine's rules (a) and the trial's (b), a piece at a time so the page keeps drawing.
   books: by code. each(row, a, b) as each is done; pause() between pieces; stop() ends it early. */
export async function trialAll(LW, books, rows, { n = 200, who = 'typical', sword = false, rules = {}, tactics = {}, seed = 1, each, stop,
  pause = () => new Promise((ok) => setTimeout(ok)) } = {}) {
  const out = new Map();
  let last = Date.now();
  for (const row of rows) {
    if (stop && stop()) break;
    const book = books[row.code], hero = equipFor(LW, standIn(LW, book, who, { sword }), book.sections[row.id].combat), opts = { n, seed, tactics };
    // a fight that will not run (a table's field the simulator cannot set up) is left blank, not the end of the sweep
    let a = null, b = null;
    try { a = trial(LW, book, row.id, hero, opts); b = trial(LW, book, row.id, hero, { ...opts, rules }); }
    catch (e) { a = null; b = null; }
    if (a && b) { out.set(row.key, { a, b }); if (each) each(row, a, b); }
    if (Date.now() - last > 40) { await pause(); last = Date.now(); }
  }
  return out;
}
