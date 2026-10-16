/* Lone Wolf prototype: rules + book runner. No DOM in here. */
(function () {
  const LW = (window.LW = window.LW || {});

  LW.rand10 = () => Math.floor(Math.random() * 10);

  /* ---------- Combat Results Table ----------
     Columns: combat ratio <=-11, -10/-9, ... 0 ... +9/+10, >=+11.
     Each cell is "enemy loss/Lone Wolf loss"; K = killed outright.
     Checked cell by cell against the table printed in Book 1 (the same in Books 1-12), 2026-10-02. */
  const CRT_ROWS = {
    1: '0/K 0/K 0/8 0/6 1/6 2/5 3/5 4/5 5/4 6/4 7/4 8/3 9/3',
    2: '0/K 0/8 0/7 1/6 2/5 3/5 4/4 5/4 6/3 7/3 8/3 9/3 10/2',
    3: '0/8 0/7 1/6 2/5 3/5 4/4 5/4 6/3 7/3 8/3 9/2 10/2 11/2',
    4: '0/8 1/7 2/6 3/5 4/4 5/4 6/3 7/3 8/2 9/2 10/2 11/2 12/2',
    5: '1/7 2/6 3/5 4/4 5/4 6/3 7/2 8/2 9/2 10/2 11/2 12/2 14/1',
    6: '2/6 3/6 4/5 5/4 6/3 7/2 8/2 9/2 10/2 11/1 12/1 14/1 16/1',
    7: '3/5 4/5 5/4 6/3 7/2 8/2 9/1 10/1 11/1 12/0 14/0 16/0 18/0',
    8: '4/4 5/4 6/3 7/2 8/1 9/1 10/0 11/0 12/0 14/0 16/0 18/0 K/0',
    9: '5/3 6/3 7/2 8/0 9/0 10/0 11/0 12/0 14/0 16/0 18/0 K/0 K/0',
    0: '6/0 7/0 8/0 9/0 10/0 11/0 12/0 14/0 16/0 18/0 K/0 K/0 K/0',
  };
  LW.CRT = {};
  for (const r in CRT_ROWS) {
    LW.CRT[r] = CRT_ROWS[r].split(' ').map((cell) =>
      cell.split('/').map((v) => (v === 'K' ? Infinity : +v))
    );
  }
  LW.crtColumn = (cr) =>
    cr <= -11 ? 0 : cr >= 11 ? 12 : cr < 0 ? 6 - Math.ceil(-cr / 2) : 6 + Math.ceil(cr / 2);
  LW.combatRound = (ratio, roll) => {
    const [enemy, hero] = LW.CRT[roll][LW.crtColumn(ratio)];
    return { enemy, hero };
  };

  /* ---------- Kai Disciplines ---------- */
  LW.DISCIPLINES = {
    camouflage: { name: 'Camouflage', blurb: 'Hide in plain country and pass unnoticed.' },
    hunting: { name: 'Hunting', blurb: 'Live off the land. You never need a Meal in the wild.' },
    sixthSense: { name: 'Sixth Sense', blurb: 'Feel danger before it shows itself.' },
    tracking: { name: 'Tracking', blurb: 'Read trails and find the right path.' },
    healing: { name: 'Healing', blurb: 'Regain 1 ENDURANCE in every section without a fight.' },
    weaponskill: { name: 'Weaponskill', blurb: '+2 COMBAT SKILL when you carry your mastered weapon.' },
    mindshield: { name: 'Mindshield', blurb: 'Enemy mind attacks cannot weaken you.' },
    mindblast: { name: 'Mindblast', blurb: '+2 COMBAT SKILL against any foe with a mind to strike.' },
    animalKinship: { name: 'Animal Kinship', blurb: 'Speak with beasts and guess their intent.' },
    mindOverMatter: { name: 'Mind Over Matter', blurb: 'Move small objects by will alone.' },
  };

  /* ---------- Items ---------- */
  LW.ITEMS = {
    dagger: { name: 'Dagger', kind: 'weapon' },
    spear: { name: 'Spear', kind: 'weapon' },
    mace: { name: 'Mace', kind: 'weapon' },
    shortSword: { name: 'Short Sword', kind: 'weapon' },
    warhammer: { name: 'Warhammer', kind: 'weapon' },
    sword: { name: 'Sword', kind: 'weapon' },
    axe: { name: 'Axe', kind: 'weapon' },
    quarterstaff: { name: 'Quarterstaff', kind: 'weapon' },
    broadsword: { name: 'Broadsword', kind: 'weapon' },
    potion: { name: 'Laumspur Potion', kind: 'backpack', heal: 4 },
    map: { name: 'Map of Sommerlund', kind: 'special' },
    helmet: { name: 'Helmet', kind: 'special', ep: 2 },
    chainmail: { name: 'Chainmail Waistcoat', kind: 'special', ep: 4 },
    // what the books' starting kits offer (docs/reference/rules-books.md, "Book addenda")
    shield: { name: 'Shield', kind: 'special', fightCs: 2, glyph: 'viking-shield', about: '+2 COMBAT SKILL in a fight.' },
    leatherWaistcoat: { name: 'Padded Leather Waistcoat', kind: 'special', ep: 2, glyph: 'leather-vest' },
    lantern: { name: 'Lantern', kind: 'backpack', glyph: 'lantern-flame', about: 'It lights itself.' },
    fireseed: { name: 'Fireseed', kind: 'special', glyph: 'fire-bomb', about: 'Bursts into flame when thrown against something hard.' },
    rope: { name: 'Rope', kind: 'backpack', glyph: 'rope-coil' },
    tinderbox: { name: 'Tinderbox', kind: 'backpack', glyph: 'flint-spark' },
    alether: { name: 'Potion of Alether', kind: 'backpack', glyph: 'standing-potion', boost: 2, about: 'Swallow it just before a fight: +2 COMBAT SKILL for that fight.' },
    badge: { name: 'Badge of Rank', kind: 'special', glyph: 'medal' },
    mapKalte: { name: 'Map of Kalte', kind: 'special', glyph: 'treasure-map' },
    mapSouthlands: { name: 'Map of the Southlands', kind: 'special', glyph: 'treasure-map' },
    mapVassagonia: { name: 'Map of Vassagonia', kind: 'special', glyph: 'treasure-map' },
    mapStornlands: { name: 'Map of the Stornlands', kind: 'special', glyph: 'treasure-map' },
    mapMagi: { name: 'Map of the Magi\u2019s Land', kind: 'special', glyph: 'treasure-map' },
    mapDanarg: { name: 'Map of the Danarg', kind: 'special', glyph: 'treasure-map' },
    mapAnari: { name: 'Map of Anari', kind: 'special', glyph: 'treasure-map' },
    mapGhatan: { name: 'Map of Ghatan', kind: 'special', glyph: 'treasure-map' },
    mapDarklands: { name: 'Map of the Darklands', kind: 'special', glyph: 'treasure-map' },
    mapRuel: { name: 'Map of Ruel', kind: 'special', glyph: 'treasure-map' },
  };
  /* Items typed in by hand are stored as 'pack:Name' or 'spec:Name'. */
  /* Lasting conditions a section puts on him (hero.marks: id -> true, or the book number for one that
     lasts this adventure only): {name, cs (in every fight), noShield, ep (each section he passes), until
     (an item, or a list of them, whose use ends it)}; or a flag (flag: true: a name only, "having been to
     Ragadorn", not listed among his conditions). Item tables add theirs (MARKS). */
  LW.MARKS = {};
  /* Coins other than Gold Crowns (hero.coins): Book 9's Lune, Book 12's Kika */
  LW.COINS = { lune: 'Lune', kika: 'Kika' };
  /* The flags an item table's sections (top-level mark / unmark) leave on a hero who walked this trail of
     section ids, in order: for an adventure saved before a flag existed (main.js, backfillFlags) */
  LW.flagsFrom = (sections, trail) => {
    const on = new Set(), flag = (m) => LW.MARKS[m] && LW.MARKS[m].flag;
    for (const id of trail) {
      const x = sections[id];
      if (!x) continue;
      [].concat(x.mark || []).filter(flag).forEach((m) => on.add(m));
      [].concat(x.unmark || []).forEach((m) => on.delete(m));
    }
    return [...on];
  };
  LW.curedBy = (m, id) => [].concat(LW.MARKS[m].until || []).includes(id);
  LW.marksOf = (hero) => Object.keys(hero.marks || {}).filter((m) => LW.MARKS[m] && !LW.MARKS[m].flag && (hero.marks[m] === true || hero.marks[m] === LW.bookNumber));
  LW.itemName = (id) => (LW.ITEMS[id] ? LW.ITEMS[id].name : id.replace(/^\w+:/, ''));
  LW.itemKind = (id) => (LW.ITEMS[id] ? LW.ITEMS[id].kind : id.startsWith('spec:') ? 'special' : 'backpack');
  LW.WEAPONS = Object.keys(LW.ITEMS).filter((k) => LW.ITEMS[k].kind === 'weapon');
  LW.MAX_WEAPONS = 2;
  LW.MAX_BACKPACK = 8;
  /* 8 Backpack Items, Meals included; 10 in the Grand Master series (the books' rules) */
  LW.backpackMax = (hero) => (hero && hero.series === 'grandmaster' ? 10 : LW.MAX_BACKPACK);
  LW.MAX_ARROWS = 6; // a Quiver's load
  /* the book being played (main.js sets it): the Special Item limit depends on it */
  LW.bookNumber = 0;
  /* At most 12 Special Items. The books set it from Book 8; the owner holds every book to it (ADR 0029). */
  LW.specialLimit = () => 12;
  /* A book's own items (name, kind, and optionally heal, ep, glyph, about) join the list. */
  LW.addItems = (items, marks) => {
    Object.assign(LW.ITEMS, items);
    Object.assign(LW.MARKS, marks || {});
    LW.WEAPONS = Object.keys(LW.ITEMS).filter((k) => LW.ITEMS[k].kind === 'weapon');
  };
  /* A book's hand-made item table (items-<code>.js: SECTIONS) laid over its imported sections, once
     (docs/reference/book-format.md, "Item tables"). */
  LW.applyItems = (b, t) => {
    if (!t || b.itemsApplied) return;
    b.itemsApplied = true;
    for (const [id, x] of Object.entries(t.SECTIONS)) {
      const sec = b.sections[id];
      if (!sec) continue;
      const { need, fight, bowShot, ranges, ...rest } = x;
      Object.assign(sec, rest);
      // a bow shot: the ranges are for the total, so the importer could not read them; given here per choice.
      // ranges: the same for a draw the importer misread (a total with something added the page now adds)
      if (bowShot) sec.bowShot = true;
      if (bowShot || ranges) { sec.rnt = 'auto'; for (const [to, r] of Object.entries(bowShot || ranges)) sec.choices.filter((c) => c.to === to).forEach((c) => { c.range = r; }); }
      if (fight && sec.combat) {
        const { mindforce, undead, drain, ...f } = fight; // these three belong to each enemy
        Object.assign(sec.combat, f);
        sec.combat.enemies.forEach((e) => Object.assign(e, mindforce && { mindforce }, undead && { undead }, drain && { drain }));
      }
      // a gate the importer set wrongly is cleared with null; an any-of gate replaces the importer's, which read one alternative as the whole
      for (const [to, n] of Object.entries(need || {})) sec.choices.filter((c) => c.to === to).forEach((c) => { if (n === null) delete c.need; else c.need = n.any ? n : Object.assign({}, c.need, n); });
    }
  };
  /* The item a typed name is (the Sommerswerd), with its kind and powers; the ids in `first` (the open
     book's own) are tried first, where two books share a name. */
  LW.itemByName = (name, first = []) => {
    const n = name.toLowerCase();
    return [...first, ...Object.keys(LW.ITEMS)].find((id) => (LW.ITEMS[id].name || '').toLowerCase() === n) || null;
  };
  const listOf = (hero, id) => ({ weapon: hero.weapons, backpack: hero.backpack, special: hero.special }[LW.itemKind(id)]);
  LW.hasItem = (hero, id) => (id === 'meal' ? hero.meals > 0 : listOf(hero, id).includes(id));
  LW.counted = (hero) => hero.special.filter((s) => !(LW.ITEMS[s] || {}).free).length;
  /* the Arrows a Quiver has room for, less what rides in it in their place */
  LW.quiverRoom = (hero) => LW.MAX_ARROWS - hero.special.filter((s) => (LW.ITEMS[s] || {}).arrow).length;
  /* Put an item where it belongs. Returns why it does not fit, or null. hero.noPack: the Backpack
     itself is lost, so nothing that goes in it can be carried until another is found. */
  LW.putItem = (hero, id) => {
    const kind = id === 'meal' ? 'backpack' : LW.itemKind(id);
    if (kind === 'weapon' && hero.weapons.length >= LW.MAX_WEAPONS) return 'You can carry only two weapons. Drop one first.';
    if (kind === 'backpack' && hero.noPack) return 'You have no Backpack to carry it in.';
    if (kind === 'backpack' && hero.backpack.length + hero.meals >= LW.backpackMax(hero)) return 'Your backpack is full.';
    const it = LW.ITEMS[id] || {};
    // it.free: a Special Item the text keeps out of the limit; it.arrow: it rides in the Quiver in an Arrow's place
    if (kind === 'special' && !it.free && LW.counted(hero) >= LW.specialLimit(hero)) return 'You can carry at most 12 Special Items. Drop one first.';
    if (it.arrow && !hero.special.includes('quiver')) return 'It goes in a Quiver, and you have none.';
    if (it.arrow && (hero.arrows || 0) >= LW.quiverRoom(hero)) return 'Your Quiver is full: drop an Arrow first.';
    if (it.doses) (hero.doses = hero.doses || {})[id] = it.doses;
    if (id === 'meal') hero.meals += 1;
    else listOf(hero, id).push(id);
    if (id !== 'meal' && !(hero.had = hero.had || []).includes(id)) hero.had.push(id); // for "if you have ever been given"
    const ep = kind === 'special' && LW.ITEMS[id] && LW.ITEMS[id].ep;
    if (ep) { hero.ep += ep; hero.epMax += ep; }
    return null;
  };
  /* Take one away, with any Endurance it gave. Returns whether he had it. */
  LW.dropItem = (hero, id) => {
    if (id === 'meal') { if (!hero.meals) return false; hero.meals -= 1; return true; }
    const list = listOf(hero, id), i = list.indexOf(id);
    if (i < 0) return false;
    list.splice(i, 1);
    const ep = list === hero.special && LW.ITEMS[id] && LW.ITEMS[id].ep;
    if (ep) { hero.epMax -= ep; hero.ep = Math.min(hero.ep, hero.epMax); }
    if (hero.doses && !list.includes(id)) delete hero.doses[id];
    return true;
  };

  /* One use of an item: a dose of one that has several (item.doses, counted in hero.doses), else the item */
  LW.useUp = (hero, id) => {
    const left = hero.doses && hero.doses[id];
    if (left > 1) { hero.doses[id] = left - 1; return; }
    LW.dropItem(hero, id);
  };

  /* Weaponskill's weapon, by Random Number, as the Kai books' table has it (the Sword twice, no Bow) */
  LW.WEAPONSKILL_TABLE = ['dagger', 'spear', 'mace', 'shortSword', 'warhammer', 'sword', 'axe', 'sword', 'quarterstaff', 'broadsword'];
  LW.makeHero = ({ csRoll, epRoll, disciplines, bonusItem }) => {
    const hero = {
      name: 'Lone Wolf',
      cs: 10 + csRoll,
      ep: 20 + epRoll,
      epMax: 20 + epRoll,
      disciplines: disciplines.slice(),
      weaponskill: null,
      weapons: ['axe'],
      backpack: [],
      special: ['map'],
      meals: 1,
      flagsRead: true, // flags are tracked from the start: the backfill for older saves (main.js) is not for him
      gold: LW.rand10(),
    };
    if (hero.disciplines.includes('weaponskill')) {
      hero.weaponskill = LW.WEAPONSKILL_TABLE[LW.rand10()];
    }
    if (bonusItem) {
      // the one extra thing found in the ruins, by Random Number
      const found = ['broadsword', 'sword', 'helmet', 'meals', 'chainmail', 'mace', 'potion', 'quarterstaff', 'spear', 'gold'][LW.rand10()];
      if (found === 'meals') hero.meals += 2;
      else if (found === 'gold') hero.gold += 12;
      else if (LW.ITEMS[found].kind === 'weapon') hero.weapons.push(found);
      else if (found === 'potion') hero.backpack.push(found);
      else { hero.special.push(found); hero.ep += LW.ITEMS[found].ep; hero.epMax += LW.ITEMS[found].ep; }
      hero.found = found;
    }
    return hero;
  };

  LW.has = (hero, disc) => hero.disciplines.includes(disc);
  /* Series rules (rules-series.js) replace these; each returns the discipline's name, or false. */
  LW.heals = (hero) => LW.has(hero, 'healing') && 'Healing';
  LW.hunts = (hero) => LW.has(hero, 'hunting') && 'Hunting';
  LW.huntNote = () => ''; // a caveat said after the Meal is spared
  LW.rankCount = (hero) => hero.disciplines.length;
  /* An imported condition, {disc: id | [ids] (any of them; all with every), rank, circle: [names] (all), ep: [lo, hi] (his Endurance now), item: id | [ids] (any held)}:
     whether he meets it, and what it reads as. The functions are looked up late: rules-series.js replaces them. */
  /* Item tables add (docs/reference/book-format.md, "Conditions"): items (all held), weapon (a weapon of
     these kinds held; true: any), wield (the weapon he fights with is of these kinds; true: armed),
     mastery (Weaponskill or Weaponmastery in that weapon), skilled (his skill counts for the weapon in
     hand), meals / arrows / packItems / gold (at least that many), mark (hero.marks), any (one of these
     conditions), not (he must not meet it). ctx.weapon: the weapon in hand, where a fight knows it. */
  const kindsOf = (w) => (LW.ITEMS[w] && LW.ITEMS[w].weapon) || [w];
  LW.weaponsHeld = (hero) => [...hero.weapons, ...hero.special.filter((s) => LW.ITEMS[s] && LW.ITEMS[s].weapon)];
  LW.inHand = (hero, ctx = {}) => ('weapon' in ctx ? ctx.weapon : LW.armedWith ? LW.armedWith(hero) : hero.weapons[0] || null);
  LW.skilledWith = (hero, w) => !!w && kindsOf(w).some((k) => (hero.series === 'magnakai' ? LW.has(hero, 'weaponmastery') && (hero.mastery || []).includes(k) : hero.weaponskill === k));
  LW.meets = (hero, c, ctx = {}) => {
    const ds = c.disc ? [].concat(c.disc) : [];
    if (ds.length && !(c.every ? ds.every((d) => LW.has(hero, d)) : ds.some((d) => LW.has(hero, d)))) return false;
    if (c.rank && LW.rankCount(hero) < c.rank) return false;
    if (c.item && ![].concat(c.item).some((i) => LW.hasItem(hero, i))) return false;
    if (c.items && !c.items.every((i) => LW.hasItem(hero, i))) return false;
    if (c.ep && (hero.ep < c.ep[0] || hero.ep > c.ep[1])) return false;
    if (c.weapon && !LW.weaponsHeld(hero).some((w) => c.weapon === true || kindsOf(w).some((k) => c.weapon.includes(k)))) return false;
    if (c.wield) { const w = LW.inHand(hero, ctx); if (!w || (c.wield !== true && !kindsOf(w).some((k) => c.wield.includes(k)))) return false; }
    if (c.mastery && !LW.skilledWith(hero, c.mastery)) return false;
    if (c.skilled && !LW.skilledWith(hero, LW.inHand(hero, ctx))) return false;
    if (c.meals && hero.meals < c.meals) return false;
    if (c.arrows && (hero.arrows || 0) < c.arrows) return false;
    if (c.packItems && hero.backpack.length < c.packItems) return false;
    if (c.gold && hero.gold < c.gold) return false;
    if (c.mark && !(hero.marks || {})[c.mark]) return false;
    if (c.any && !c.any.some((x) => LW.meets(hero, x, ctx))) return false;
    if (c.not && LW.meets(hero, c.not, ctx)) return false;
    const circles = c.circle && LW.circlesOf ? LW.circlesOf(hero).map((x) => x.name) : [];
    return !(c.circle && !c.circle.every((n) => circles.includes(n)));
  };
  const kindName = (k) => (LW.ITEMS[k] ? LW.ITEMS[k].name : k);
  LW.condName = (c) => [c.disc && [].concat(c.disc).map((d) => (LW.DISCIPLINES[d] || { name: d }).name).join(c.every ? ' and ' : ' or '),
    c.rank && 'your rank', c.circle && c.circle.join(' and '), c.item && [].concat(c.item).map(LW.itemName).join(' or '), c.items && c.items.map(LW.itemName).join(' and '),
    c.ep && 'your Endurance', c.each && 'your Magnakai Disciplines', c.weapon && (c.weapon === true ? 'a weapon' : c.weapon.map(kindName).join(' or ')),
    c.wield && (c.wield === true ? 'a weapon in hand' : c.wield.map(kindName).join(' or ') + ' in hand'), c.mastery && `skill with the ${kindName(c.mastery)}`,
    c.skilled && 'skill with your weapon', c.meals && `${c.meals} Meals`, c.arrows && `${c.arrows} Arrows`, c.packItems && `${c.packItems} Backpack Items`,
    c.gold && `${c.gold} Gold Crowns`, c.mark && (LW.MARKS[c.mark] ? LW.MARKS[c.mark].name : c.mark), c.any && c.any.map(LW.condName).join(', or '), c.not && `not ${LW.condName(c.not)}`].filter(Boolean).join(', ');

  /* COMBAT SKILL with every modifier spelled out, so the UI can show its working. */
  LW.heroCS = (hero, ctx = {}) => {
    const parts = [{ label: 'Base', n: hero.cs }];
    
    if (!hero.weapons.length) {
      parts.push({ label: 'Unarmed', n: -4 });
    } else if (hero.weaponskill && hero.weapons.includes(hero.weaponskill)) {
      parts.push({ label: 'Weaponskill', n: 2 });
    }
    // the Sommerswerd fights one-handed (rules-books.md, Book 2), so a Shield still counts beside it
    if (hero.weapons.includes('shield') || hero.backpack.includes('shield') || hero.special.includes('shield'))
      parts.push({ label: 'Shield', n: 2 });

    if (ctx.mindblast) parts.push({ label: 'Mindblast', n: 2 });
    if (ctx.enemy && ctx.enemy.mindforce && !LW.has(hero, 'mindshield'))
      parts.push({ label: 'Mind attack', n: -ctx.enemy.mindforce });
    if (ctx.csMod) parts.push({ label: ctx.csNote || 'Circumstance', n: ctx.csMod });
    
    return { total: parts.reduce((t, p) => t + p.n, 0), parts };
  };

  /* ---------- Book runner ---------- */
  class Game {
    constructor(book, saveKey) {
      this.book = book;
      this.saveKey = saveKey;
      this.s = null;
      this.history = []; // JSON snapshots, one per step, for rewinding
      this.keep = Infinity; // how many of them to keep
    }
    get hero() { return this.s.hero; }
    get section() { return this.book.sections[this.s.at]; }
    get dead() { return this.s.hero.ep <= 0; }
    /* the adventure has ended short of the quest: he is dead, or at a death or failed ending */
    get lost() { return this.dead || this.section.end === 'death' || this.section.end === 'failed'; }

    start(hero) {
      this.s = { hero, at: null, looted: {}, fought: {}, trail: [], events: [] };
      this.history = [];
      this.go(this.book.start, null);
    }

    go(id, via) {
      if (this.s.at !== null) this.history.push(JSON.stringify(this.s));
      this.trim();
      const sec = this.book.sections[id];
      const hero = this.s.hero;
      const events = [];
      this.s.at = id;
      this.s.rolled = null;
      this.s.trail.push({ id, via });

      if (sec.ep === 'full') { if (hero.ep < hero.epMax) { hero.ep = hero.epMax; events.push('Your ENDURANCE is restored in full.'); } }
      else if (sec.ep) {
        hero.ep = Math.min(hero.epMax, hero.ep + sec.ep);
        events.push(sec.ep < 0 ? `You lose ${-sec.ep} ENDURANCE.` : `You regain ${sec.ep} ENDURANCE.`);
      }
      const had = LW.marksOf(hero); // a condition set here costs nothing until the next section
      if (sec.stake && this.s.stakes) delete this.s.stakes[sec.stake.key || id]; // asked again on a return
      // a game of chance starts afresh on every visit; its token is given on the first only
      if (sec.game) this.s.game = null;
      // what the section gives and takes away, once only (before any Meal, so food found here can be eaten)
      if (!this.s.looted[id + ':arrive']) { this.s.looted[id + ':arrive'] = true; this.arrive(sec, events); }
      if (sec.lose && sec.lose.meal && hero.meals > 0) {
        hero.meals -= 1;
        events.push('A Meal is lost from your pack.');
      }
      // meal: true, or the number of Meals the text asks for; mealCost: one may be bought here instead of going hungry
      for (let m = 0; m < (sec.meal === true ? 1 : sec.meal || 0); m++) {
        if (LW.hunts(hero) && !sec.noHunt) { events.push(`${LW.hunts(hero)}: you catch what you need and keep your Meals.${LW.huntNote(hero)}`); break; }
        else if (hero.meals > 0) { hero.meals -= 1; this.s.ateAt = this.s.trail.length; events.push('You eat a Meal.'); }
        else if (hero.backpack.some((b) => LW.ITEMS[b] && LW.ITEMS[b].meal)) {
          const food = hero.backpack.find((b) => LW.ITEMS[b] && LW.ITEMS[b].meal), heal = LW.ITEMS[food].heal || 0;
          LW.dropItem(hero, food); hero.ep = Math.min(hero.epMax, hero.ep + heal); this.s.ateAt = this.s.trail.length;
          events.push(`You eat the ${LW.itemName(food)} as a Meal${heal ? ` and regain ${heal} ENDURANCE` : ''}.`);
        }
        else if (sec.mealCost && hero.gold >= sec.mealCost) { hero.gold -= sec.mealCost; this.s.ateAt = this.s.trail.length; events.push(`You buy a meal here for ${sec.mealCost} Gold Crown${sec.mealCost > 1 ? 's' : ''} and eat it.`); }
        else { hero.ep -= 3; events.push('You have nothing to eat. You lose 3 ENDURANCE.'); }
      }
      // a lasting condition that costs Endurance in every section he passes (LW.MARKS[id].ep)
      for (const m of LW.marksOf(hero).filter((x) => had.includes(x))) if (LW.MARKS[m].ep && hero.ep > 0) { hero.ep = Math.max(0, hero.ep + LW.MARKS[m].ep); events.push(`${LW.MARKS[m].name}: you lose ${-LW.MARKS[m].ep} ENDURANCE.`); }
      if (!sec.combat && LW.heals(hero) && hero.ep > 0 && hero.ep < hero.epMax) {
        hero.ep += 1;
        events.push(`${LW.heals(hero)}: you regain 1 ENDURANCE.`);
      }
      this.s.events = events;
      this.save();
    }

    /* sec.take: losses the text states outright. sec.give: things he is handed or pockets without a
       choice, taken now (anything that does not fit stays on the page to take later). sec.todo:
       what the text leaves to the player, shown as a reminder. */
    arrive(sec, events) {
      const hero = this.s.hero;
      this.effects(sec, events);
      for (const w of sec.when || []) if (this.holds(w)) this.effects(w, events);
      (sec.give || []).forEach((g, i) => {
        const err = this.takeLoot('give' + i), label = err && this.loot().find((l) => l.i === 'give' + i).label;
        if (err) events.push(`${label[0].toUpperCase() + label.slice(1)}: left here for now. ${err}`);
      });
      if (sec.note && !(hero.notes = hero.notes || []).includes(sec.note)) { hero.notes.push(sec.note); events.push(`Noted on your Action Chart: ${sec.note}.`); }
      if (sec.todo) events.push('By hand: ' + sec.todo);
    }
    /* a `when` entry's conditions: if, unless (Conditions), ate (a Meal eaten here or in the section before) */
    holds(w) {
      const hero = this.s.hero, ate = this.s.ateAt != null && this.s.ateAt >= this.s.trail.length - 1;
      // came: only when he came from one of these sections (an effect the text writes on a choice)
      return (!w.if || LW.meets(hero, w.if)) && (!w.unless || !LW.meets(hero, w.unless)) && (w.ate == null || w.ate === ate) && (!w.came || w.came.includes(this.came()));
    }
    /* What a section, or one of its `when` entries, does on arrival: cs (for good), ep (a `when`'s
       Endurance; a section's own is applied on every arrival in go()), healLost (a share of what the
       last fight cost), take, back (a stash given back), mark / unmark (lasting conditions). */
    effects(x, events) {
      const hero = this.s.hero;
      if (x.cs) { hero.cs += x.cs; events.push(`Your COMBAT SKILL is ${x.cs < 0 ? 'reduced' : 'raised'} by ${Math.abs(x.cs)} for good.`); }
      if (x !== this.section && x.ep === 'full') { if (hero.ep < hero.epMax) { hero.ep = hero.epMax; events.push('Your ENDURANCE is restored in full.'); } }
      else if (x !== this.section && x.ep) this.hurt(x.ep, events);
      if (x.epMax) { hero.epMax += x.epMax; hero.ep = Math.min(hero.ep, hero.epMax); events.push(`Your ENDURANCE is ${x.epMax < 0 ? 'reduced' : 'raised'} by ${Math.abs(x.epMax)} for good.`); }
      if (x.healLost) { const n = Math.min(hero.epMax - hero.ep, Math.floor((hero.lastLoss || 0) * x.healLost)); if (n > 0) { hero.ep += n; events.push(`You regain ${n} of the ENDURANCE the fight cost you.`); } hero.lastLoss = 0; }
      this.lose(x.take, events);
      for (const b of x.back || []) this.unstash(b, events);
      for (const m of [].concat(x.mark || [])) {
        const def = LW.MARKS[m] || {};
        (hero.marks = hero.marks || {})[m] = def.book ? LW.bookNumber : true;
        if (def.name) events.push(`${def.name}${def.about ? `: ${def.about}` : '.'}`);
      }
      for (const m of [].concat(x.unmark || [])) if (hero.marks && hero.marks[m]) { delete hero.marks[m]; if (LW.MARKS[m]) events.push(`${LW.MARKS[m].name}: no longer.`); }
      for (const [k, v] of Object.entries(x.settle || {})) this.settle(k, v, events);
    }
    hurt(n, events) {
      const hero = this.s.hero;
      hero.ep = Math.max(0, Math.min(hero.epMax, hero.ep + n));
      events.push(n < 0 ? `You lose ${-n} ENDURANCE.` : `You regain ${n} ENDURANCE.`);
    }
    /* the lists a loss can be chosen from or counted in, as the Action Chart shows them (Meals first) */
    listed(from) {
      const hero = this.s.hero;
      if (from === 'backpack') return [...Array(hero.meals).fill('meal'), ...hero.backpack];
      if (from === 'packItems') return hero.backpack.slice(); // Backpack Items, not Meals
      if (from === 'weapon') return LW.weaponsHeld(hero);
      if (from === 'gold') return Array(hero.gold).fill('gold');
      return hero[from === 'special' ? 'special' : 'weapons'].slice();
    }
    /* one thing gone: an item (or 'meal', or 'gold' for a Gold Crown), kept in hero.stash[key] if given */
    drop(id, stash, events) {
      const hero = this.s.hero;
      if (id === 'gold') { if (!hero.gold) return false; hero.gold -= 1; }
      else if (!LW.dropItem(hero, id)) return false;
      if (stash) { const st = ((hero.stash = hero.stash || {})[stash] = hero.stash[stash] || { items: [], gold: 0 }); if (id === 'gold') st.gold += 1; else st.items.push(id); }
      if (events) events.push(id === 'meal' ? 'A Meal is gone.' : id === 'gold' ? 'A Gold Crown is gone.' : `The ${LW.itemName(id)} is gone.`);
      return true;
    }
    lose(take, events) {
      const hero = this.s.hero, name = LW.itemName;
      const half = (n, t) => (t.round === 'up' ? Math.ceil(n / 2) : Math.floor(n / 2));
      for (const t of take || []) {
        const st = t.stash, all = (list) => { list.slice().forEach((x) => this.drop(x, st)); };
        // pick: n of these lists (backpack, packItems, special, weapon, gold) for the player to choose;
        // all of them when he has no more than n, and `else` when he has none
        if (t.pick) {
          const from = [].concat(t.pick), have = from.flatMap((f) => this.listed(f)), n = t.n || 1;
          if (!have.length) this.lose(t.else, events);
          else if (have.length <= n) { have.forEach((x) => this.drop(x, st, events)); }
          else { (this.s.picks = this.s.picks || []).push({ from, n, stash: st }); events.push(`Choose ${n > 1 ? `${n} things` : 'one thing'} to lose, below.`); }
        }
        // at: positions in a list (1 = first), as the Action Chart shows it; last: the last one when the list
        // is shorter; min: fewer than that in the list and `else` is lost instead
        else if (t.at) {
          const list = this.listed(t.from || 'backpack'), short = !list.length || (t.min && list.length < t.min);
          if (short) { this.lose(t.else, events); continue; }
          const at = [...new Set(t.at.map((p) => (p <= list.length ? p - 1 : t.last ? list.length - 1 : -1)).filter((i) => i >= 0))];
          at.forEach((i) => this.drop(list[i], st, events));
        }
        // dose: one use of an item that has several (LW.useUp), not the whole of it
        else if (t.item && t.dose) { const id = [].concat(t.item).find((i) => LW.hasItem(hero, i)); if (id) { LW.useUp(hero, id); events.push(`A dose of the ${name(id)} is used.`); } }
        else if (t.item) { const id = [].concat(t.item).find((i) => LW.hasItem(hero, i)); if (id) this.drop(id, st, events); }
        else if (t.coin) {
          const have = (hero.coins || {})[t.coin] || 0, n = t.n === 'all' ? have : t.n === 'half' ? half(have, t) : Math.min(have, t.n);
          if (n) { hero.coins[t.coin] -= n; events.push(`You lose ${n} ${LW.COINS[t.coin]}.`); }
        }
        else if (t.gold != null) {
          const n = t.gold === 'all' ? hero.gold : t.gold === 'half' ? half(hero.gold, t) : Math.min(hero.gold, t.gold);
          if (n) { hero.gold -= n; if (st) this.stashGold(st, n); events.push(`You lose ${n} Gold Crowns.`); }
        }
        else if (t.meals != null) {
          const n = t.meals === 'all' ? hero.meals : t.meals === 'half' ? half(hero.meals, t) : Math.min(hero.meals, t.meals);
          if (n) { for (let i = 0; i < n; i++) this.drop('meal', st); events.push(`You lose ${n} Meal${n > 1 ? 's' : ''}.`); }
        }
        else if (t.weapons === 'all') { if (hero.weapons.length) { all(hero.weapons); events.push('Your weapons are gone.'); } if (t.special) { const ws = hero.special.filter((s) => LW.ITEMS[s] && LW.ITEMS[s].weapon); if (ws.length) { all(ws); events.push('Your weapon-like Special Items are gone too.'); } } }
        else if (t.arrows != null) { const n = t.arrows === 'all' ? hero.arrows || 0 : Math.min(hero.arrows || 0, t.arrows); if (n) { hero.arrows -= n; events.push(`You lose ${n} Arrow${n > 1 ? 's' : ''}.`); } }
        else if (t.special === 'all') { if (hero.special.length) { all(hero.special); events.push('Your Special Items are gone.'); } }
        // the weapon he used: the one in his hand (LW.inHand), or the one he fought with last
        else if (t.weapons === 'used') { const w = hero.lastWeapon && LW.weaponsHeld(hero).includes(hero.lastWeapon) ? hero.lastWeapon : LW.inHand(hero); if (w) this.drop(w, st, events); }
        // one weapon: his only one; of two, his choice. special: a weapon-like Special Item is lost when he has no other
        else if (t.weapons === 'one') {
          const ws = hero.weapons.length ? hero.weapons : t.special ? LW.weaponsHeld(hero) : [];
          if (ws.length === 1) this.drop(ws[0], st, events);
          else if (ws.length > 1) { (this.s.picks = this.s.picks || []).push({ from: [hero.weapons.length ? 'weapons' : 'weapon'], n: 1, stash: st }); events.push('Choose the weapon you lose, below.'); }
        }
        else if (t.backpack) {
          if (hero.backpack.length || hero.meals) events.push(t.backpack === 'all' ? 'Your Backpack and all in it are gone.' : 'Everything in your Backpack is gone.');
          else if (t.backpack === 'all' && !hero.noPack) events.push('Your Backpack is gone.');
          if (st) this.listed('backpack').forEach((x) => this.drop(x, st));
          if (st && t.backpack === 'all' && !hero.noPack) hero.stash[st].pack = true;
          hero.backpack = []; hero.meals = 0;
          if (t.backpack === 'all') hero.noPack = true;
        }
      }
    }
    stashGold(key, n) { const hero = this.s.hero, st = ((hero.stash = hero.stash || {})[key] = hero.stash[key] || { items: [], gold: 0 }); st.gold += n; }
    /* What was taken into hero.stash[key] comes back: b is the key, or {stash, only: [kinds]} (weapon,
       backpack, special, gold) for part of it. What will not fit stays on the page to take. */
    unstash(b, events) {
      const hero = this.s.hero, key = b.stash || b, st = hero.stash && hero.stash[key];
      if (!st) return;
      const kind = (id) => (id === 'meal' ? 'backpack' : LW.itemKind(id)), ok = (k) => !b.only || b.only.includes(k);
      if (st.pack && ok('backpack')) { hero.noPack = false; delete st.pack; } // the Backpack itself first, so its things fit
      const back = st.items.filter((id) => ok(kind(id))), left = [];
      for (const id of back) if (LW.putItem(hero, id)) left.push(id);
      if (ok('gold') && st.gold) { hero.gold = Math.min(50, hero.gold + st.gold); st.gold = 0; }
      st.items = st.items.filter((id) => !ok(kind(id))).concat(left);
      if (back.length) events.push(`What was taken from you is given back${left.length ? `, but for what will not fit: ${left.map(LW.itemName).join(', ')}` : ''}.`);
      if (!st.items.length && !st.gold && !st.pack) delete hero.stash[key];
    }
    /* one of the losses he chooses (s.picks), from the medallions the page shows */
    pickLoss(id) {
      const p = (this.s.picks || [])[0];
      if (!p || !this.pickable().includes(id)) return false;
      this.drop(id, p.stash, this.s.events);
      if (--p.n <= 0 || !this.pickable().length) {
        this.s.picks.shift();
        // an exchange: what was given is gone, and what it was given for is now taken
        if (p.loot != null) { this.s.looted[this.s.at + ':' + p.loot + ':swapped'] = true; const err = this.takeLoot(p.loot); if (err) this.s.events.push(err); }
      }
      this.save();
      return true;
    }
    /* what the first pending loss can be chosen from */
    pickable() {
      const p = (this.s.picks || [])[0];
      return !p ? [] : p.ids ? p.ids.filter((x) => LW.hasItem(this.s.hero, x)) : p.from.flatMap((f) => this.listed(f));
    }
    /* A stake or a gift of gold (sec.stake: {key, min, max, coin, spend}): with spend it is paid now,
       otherwise kept in s.stakes until a later section settles it ({settle: {key: by}}: by times the
       stake won, or lost when negative). */
    setStake(n) {
      const st = this.section.stake, hero = this.s.hero, coin = st.coin, have = coin ? (hero.coins || {})[coin] || 0 : hero.gold;
      const max = Math.min(have, st.max == null ? Infinity : st.max);
      if (n < (st.min || 0) || n > max) return `Stake between ${st.min || 0} and ${max}.`;
      const key = st.key || this.s.at;
      if (st.spend) { if (coin) hero.coins[coin] -= n; else hero.gold -= n; this.s.events.push(n ? `You hand over ${n} ${coin ? LW.COINS[coin] : 'Gold Crowns'}.` : 'You give nothing.'); }
      (this.s.stakes = this.s.stakes || {})[key] = { n, coin, paid: !!st.spend };
      this.save();
      return null;
    }
    settle(key, by, events) {
      const hero = this.s.hero, st = (this.s.stakes || {})[key];
      if (!st) return;
      const n = Math.round(st.n * by), was = st.coin ? (hero.coins || {})[st.coin] || 0 : hero.gold;
      let now = Math.max(0, was + n); if (!st.coin) now = Math.min(50, now);
      if (st.coin) (hero.coins = hero.coins || {})[st.coin] = now; else hero.gold = now;
      const what = st.coin ? LW.COINS[st.coin] : 'Gold Crowns';
      events.push(now >= was ? `You win ${now - was} ${what}.` : `You lose ${was - now} ${what}.`);
      delete this.s.stakes[key];
    }
    /* sec.sell: {id: price}: what a trader here buys. Returns why not, or null. */
    sell(id) {
      const price = (this.section.sell || {})[id], hero = this.s.hero;
      if (price == null || !LW.hasItem(hero, id)) return 'He does not buy that.';
      if (hero.gold + price > 50) return 'Your Belt Pouch has no room for the price.';
      LW.dropItem(hero, id); hero.gold += price;
      this.s.events.push(`You sell the ${LW.itemName(id)} for ${price} Gold Crown${price > 1 ? 's' : ''}.`);
      this.save();
      return null;
    }

    /* A game of chance played over several throws (sec.game: {kind, stake, win, near, vs, foes, bets,
       cap, token, coin, rate, broke, done, quit}). kind 'wheel': a number bet on, paid `win` a Crown
       when it falls, `near` when a neighbour does (0 sits between 9 and 1); 'dice': two numbers each
       against `foes` other players, two noughts winning outright; 'higher': the number drawn against
       a second plus `vs`. `stake` is fixed, or {min, max} set with bet(). A win gives the stake back
       and `win` times it; a level throw gives the stake back; a loss keeps it. `cap`: no more won at
       this table; `token`: Crowns to play with here only, given once; `coin`/`rate`: paid in that coin,
       `rate` to the Crown, when he has a stake's worth. s.game is the game in hand, from arrival. */
    get game() {
      const g = this.section.game, at = this.s.at;
      if (!g) return null;
      if (!this.s.game || this.s.game.at !== at) {
        const t = this.s.tokens = this.s.tokens || {};
        if (t[at] == null) t[at] = g.token || 0;
        this.s.game = { at, bets: 0, won: 0, log: [], bet: null };
      }
      return this.s.game;
    }
    /* what a stake of n is paid from: the other coin when he has n's worth of it, else token and gold;
       `most` is the largest stake it holds, in Crowns */
    gamePurse(n) {
      const g = this.section.game, hero = this.s.hero, coins = g.coin ? (hero.coins || {})[g.coin] || 0 : 0;
      if (g.coin && coins >= n * g.rate) return { coin: g.coin, rate: g.rate, most: Math.floor(coins / g.rate) };
      return { rate: 1, most: hero.gold + this.s.tokens[this.s.at] };
    }
    get gameMin() { const g = this.section.game; return typeof g.stake === 'number' ? g.stake : g.stake.min || 1; }
    /* he can stake no more: the game's ways on for a lost purse open, the others shut */
    get gameBroke() { return !!this.game && !this.game.bet && this.gamePurse(this.gameMin).most < this.gameMin; }
    /* why a bet (forBet) or a throw cannot be made now, or null */
    gameWhy(forBet) {
      const g = this.section.game, st = this.game, fixed = typeof g.stake === 'number';
      if (st.bets >= (g.bets || Infinity)) return 'No more bets.';
      if (forBet && st.bet) return 'Throw for the bet you have down first.';
      if (!forBet && !fixed && !st.bet) return 'Place your bet first.';
      if (this.gameBroke) return fixed ? 'You cannot place the stake.' : 'You have nothing to stake.';
      return null;
    }
    bet(n, pick) {
      const g = this.section.game, st = this.game, why = this.gameWhy(true);
      if (why) return why;
      const max = Math.min(g.stake.max == null ? Infinity : g.stake.max, this.gamePurse(n).most);
      if (!(n >= (g.stake.min || 1) && n <= max)) return `Stake between ${g.stake.min || 1} and ${max}.`;
      if (g.kind === 'wheel' && !(pick >= 0 && pick <= 9)) return 'Choose a number from 0 to 9.';
      st.bet = this.ante(n, pick);
      this.save();
      return null;
    }
    /* the stake put down: from the token first, then the purse */
    ante(n, pick) {
      const hero = this.s.hero, p = this.gamePurse(n);
      if (p.coin) { hero.coins[p.coin] -= n * p.rate; return { n, pick, coin: p.coin, rate: p.rate }; }
      const tk = this.s.tokens, token = Math.min(tk[this.s.at], n);
      tk[this.s.at] -= token; hero.gold -= n - token;
      return { n, pick, token, rate: 1 };
    }
    play(n) {
      const g = this.section.game, st = this.game, hero = this.s.hero, fixed = typeof g.stake === 'number';
      const why = this.gameWhy(false);
      if (why) return why;
      const bet = fixed ? this.ante(g.stake) : st.bet, r = LW.rand10;
      this.s.rolled = n; this.s.drawn = n; this.s.shot = null;
      let by = -1, line; // by: times the stake won, 0 level, -1 lost
      if (g.kind === 'wheel') {
        const off = Math.min((n - bet.pick + 10) % 10, (bet.pick - n + 10) % 10);
        by = off === 0 ? g.win : off === 1 ? g.near : -1;
        line = `${bet.n} on ${bet.pick}, the ball falls on ${n}`;
      } else if (g.kind === 'dice') {
        const two = () => [r(), r()], mine = [n, r()], foes = Array.from({ length: g.foes || 1 }, two);
        const sum = (d) => d[0] + d[1], zero = (d) => !d[0] && !d[1], best = Math.max(...foes.map(sum));
        by = zero(mine) ? (foes.some(zero) ? 0 : g.win) : foes.some(zero) ? -1 : sum(mine) > best ? g.win : sum(mine) < best ? -1 : 0;
        const said = (d) => `${d.join(' and ')} (${zero(d) ? 'two noughts' : sum(d)})`;
        line = `You throw ${said(mine)}, they throw ${foes.map(said).join(', ')}`;
      } else {
        const m = r() + (g.vs || 0);
        by = n > m ? g.win : n < m ? -1 : 0;
        line = `${bet.n} staked, ${n} against ${m}`;
      }
      // the stake back on a win or a level throw, and what is won on top, short of the table's limit
      let won = by > 0 ? bet.n * by : 0;
      if (g.cap != null) won = Math.max(0, Math.min(won, g.cap - st.won));
      st.won += won;
      const what = bet.coin ? LW.COINS[bet.coin] : 'Gold Crowns';
      if (by >= 0) {
        if (bet.coin) hero.coins[bet.coin] += (bet.n + won) * bet.rate;
        else { this.s.tokens[this.s.at] += bet.token; hero.gold = Math.min(50, hero.gold + bet.n - bet.token + won); }
      }
      st.log.push(`${line}: ${by > 0 ? (won ? `you win ${won * bet.rate} ${what}` : 'you win, but the table pays no more') : by ? `you lose ${bet.n * bet.rate} ${what}` : 'level, the stake back'}.`);
      st.bet = null; st.bets += 1;
      this.save();
      return null;
    }

    /* Combat blocks the way on until it is won. */
    get combatPending() {
      const sec = this.section;
      return !!sec.combat && !this.s.fought[this.s.at];
    }
    wonCombat() { this.s.fought[this.s.at] = true; this.save(); }
    /* a fight stopped by hand where the text gives no such end: not won, and no choice opens (only the
       by-hand turn box); fighting it after all clears it */
    breakOff() { (this.s.broken = this.s.broken || {})[this.s.at] = true; this.save(); }
    get brokenOff() { return !!(this.s.broken && this.s.broken[this.s.at]); }

    choices() {
      const sec = this.section;
      const hero = this.s.hero;
      if (this.dead || sec.end) return [];
      if (this.combatPending) return [];
      if (sec.combat && sec.combat.to) return [{ text: 'Continue', to: sec.combat.to, enabled: true }];
      const fought = !!sec.combat, rolled = this.s.rolled, came = this.came(), game = this.game && sec.game, broke = this.gameBroke;
      // a loss he must choose, or a stake he must set, comes first
      const first = (this.s.picks || []).length ? 'Choose what you lose first' : sec.stake && !(this.s.stakes || {})[sec.stake.key || this.s.at] ? (sec.stake.spend ? 'Give what you will first' : 'Set your stake first') : '';
      return (sec.choices || []).filter((c) => !(fought && c.evade)).map((c) => {
        let enabled = !first, why = first;
        // a choice with no range is open without the draw: in a bow shot, not shooting; elsewhere, the
        // way taken instead of drawing ("If you have Sixth Sense, ...; otherwise pick a number")
        if (sec.rnt === 'auto' && c.range) {
          if (rolled == null) { enabled = false; why = 'Spin the medallion first'; }
          else if (rolled < c.range[0] || rolled > c.range[1]) { enabled = false; why = `You drew ${rolled}`; }
        }
        if (c.need && (c.need.disc || c.need.circle) && !LW.meets(hero, { disc: c.need.disc, every: c.need.every, circle: c.need.circle })) {
          enabled = false; why = `Needs ${LW.condName({ disc: c.need.disc, every: c.need.every, circle: c.need.circle })}`;
        }
        if (c.need && c.need.any && !c.need.any.some((x) => LW.meets(hero, x))) { enabled = false; why = `Needs ${c.need.any.map(LW.condName).join(', or ')}`; }
        if (c.need && c.need.ep && !LW.meets(hero, { ep: c.need.ep })) { enabled = false; why = `Your ENDURANCE is ${hero.ep}`; }
        if (c.need && c.need.rank && LW.rankCount(hero) < c.need.rank) { enabled = false; why = 'Needs a higher rank'; }
        // need.item: one id, or a list of which any will do; ever: having once been given it is enough
        const ids = c.need && c.need.item ? [].concat(c.need.item) : [], held = ids.filter((i) => LW.hasItem(hero, i) || (c.need.ever && (hero.had || []).includes(i)));
        if (ids.length && !c.need.not && !held.length) { enabled = false; why = `Needs ${ids.map(LW.itemName).join(' or ')}`; }
        if (ids.length && c.need.not && held.length) { enabled = false; why = `You have the ${LW.itemName(held[0])}`; }
        // orAll: the price, or all he has if that is less
        if (c.need && c.need.gold && !c.need.orAll && hero.gold < c.need.gold) { enabled = false; why = `Needs ${c.need.gold} Gold Crowns`; }
        if (c.need && c.need.coin && ((hero.coins || {})[c.need.coin] || 0) < (c.need.n || 1)) { enabled = false; why = `Needs ${c.need.n || 1} ${LW.COINS[c.need.coin]}`; }
        // came: open only when he came from one of these sections
        if (c.need && c.need.came && !c.need.came.includes(came)) { enabled = false; why = 'Not the way you came'; }
        // a game of chance: its ways on by how it stands (a bet down, the purse lost, every bet made)
        if (game) {
          const done = game.bets && this.game.bets >= game.bets;
          if (this.game.bet) { enabled = false; why = 'Throw for your bet first'; }
          else if (broke ? game.broke && c.to !== game.broke : c.to === game.broke) { enabled = false; why = broke ? 'You have nothing left to stake' : 'You still have something to stake'; }
          else if (!broke && c.to === game.done && !done) { enabled = false; why = `Not before all ${game.bets} bets`; }
          else if (!broke && c.to === game.quit && done) { enabled = false; why = 'You have made every bet'; }
        }
        return Object.assign({}, c, { enabled, why });
      });
    }
    /* the section he came here from */
    came() { const t = this.s.trail; return t.length > 1 ? t[t.length - 2].id : null; }

    /* For a choice with a random table: returns where the roll leads. */
    resolveRandom(choice, roll) {
      let mod = 0; const notes = [];
      for (const m of choice.random.mod || []) {
        if (LW.has(this.s.hero, m.disc)) { mod += m.plus; notes.push(`${LW.DISCIPLINES[m.disc].name} +${m.plus}`); }
      }
      const total = roll + mod;
      const row = choice.random.table.find(([upTo]) => total <= upTo) || choice.random.table[choice.random.table.length - 1];
      return { roll, mod, total, notes, to: row[1] };
    }

    choose(choice, to) {
      const hero = this.s.hero;
      if (choice.need && choice.need.item && choice.need.spend) [].concat(choice.need.item).some((i) => LW.dropItem(hero, i)); // the first he has
      if (choice.need && choice.need.gold && choice.need.spend) hero.gold -= Math.min(hero.gold, choice.need.gold);
      if (choice.need && choice.need.coin && choice.need.spend) hero.coins[choice.need.coin] -= choice.need.n || 1;
      this.go(to || choice.to, choice.text);
    }

    /* What can be taken here: the section's gifts (sec.give, taken on arrival if they fit) and its
       finds (sec.loot). Each is {gold: n} | {meal: n} | {item: id} | {pack: true} (a Backpack), and
       may carry or: a name shared by finds of which only pick (default 1) may be taken, or cost: a
       price in Gold Crowns (a shop: bought as often as he likes). i is 'give0' or 0. */
    loot() {
      const sec = this.section, all = [...(sec.give || []).map((l, n) => [l, 'give' + n]), ...(sec.loot || []).map((l, n) => [l, n])];
      const got = (i) => !!this.s.looted[this.s.at + ':' + i];
      return all.map(([l, i]) => {
        const label = l.item ? LW.itemName(l.item) : l.coin ? `${l.n} ${LW.COINS[l.coin]}` : l.gold ? `${l.gold} Gold Crowns` : l.meal ? (l.meal > 1 ? `${l.meal} Meals` : 'a Meal') : l.pack ? 'a Backpack' : l.arrows ? `${l.arrows} Arrow${l.arrows > 1 ? 's' : ''}` : '';
        const share = l.or && all.filter(([m, j]) => j !== i && m.or === l.or && got(j)).length >= (l.pick || 1);
        return { i, label, taken: got(i), closed: share, cost: l.cost, coin: l.item && l.coin, swap: l.for, pick: l.pick, item: l.item || (l.coin ? 'coin' : l.meal ? 'meal' : l.gold ? 'gold' : l.arrows ? 'arrows' : 'pack') };
      });
    }
    /* Returns an error string when it cannot be taken. */
    takeLoot(i) {
      const sec = this.section, l = String(i).startsWith('give') ? sec.give[+String(i).slice(4)] : sec.loot[i];
      const hero = this.s.hero, key = this.s.at + ':' + i;
      if (!l || this.s.looted[key]) return null;
      if (l.or && this.loot().find((o) => o.i === i).closed) return l.pick > 1 ? `You may take only ${l.pick} of these.` : 'You may take only one of these.';
      // a price in another coin: {item, cost, coin}; coins found: {coin, n}
      const purse = l.item && l.coin ? (hero.coins || {})[l.coin] || 0 : hero.gold, coinName = l.item && l.coin ? LW.COINS[l.coin] : 'Gold Crowns';
      // orAll: the price, or all he has if that is less
      if (l.cost && purse < l.cost && !l.orAll) return `It costs ${l.cost} ${coinName}.`;
      if (l.cost && l.pack && !hero.noPack) return 'You have a Backpack already.';
      // for: it is his only in exchange for one of these (an item id list, or 'weapon': any weapon of his)
      const swap = l.for && !this.s.looted[key + ':swapped'] && (l.for === 'weapon' ? hero.weapons.slice() : l.for.filter((x) => LW.hasItem(hero, x)));
      if (swap && !swap.length) return l.for === 'weapon' ? 'It is yours only in exchange for a weapon of yours.' : `It is yours only in exchange for the ${l.for.map(LW.itemName).join(' or ')}.`;
      // of several he could give, he chooses (pickLoss), and then it is his
      if (swap && swap.length > 1) { (this.s.picks = this.s.picks || []).push({ ids: swap, n: 1, loot: i }); this.s.events.push('Choose what you give in exchange, below.'); this.save(); return null; }
      if (swap) LW.dropItem(hero, swap[0]);
      delete this.s.looted[key + ':swapped'];
      if (!l.item && l.coin) { (hero.coins = hero.coins || {})[l.coin] = (hero.coins[l.coin] || 0) + l.n; }
      else if (l.gold) hero.gold = Math.min(50, hero.gold + l.gold);
      else if (l.pack) hero.noPack = false;
      else if (l.arrows) {
        if (!hero.special.includes('quiver')) return 'You need a Quiver to carry Arrows.';
        if ((hero.arrows || 0) >= LW.MAX_ARROWS) return 'Your Quiver is full.';
        hero.arrows = Math.min(LW.MAX_ARROWS, (hero.arrows || 0) + l.arrows);
      }
      else if (l.meal) {
        if (hero.noPack) return 'You have no Backpack to carry it in.';
        const room = LW.backpackMax(hero) - hero.backpack.length - hero.meals;
        if (room < l.meal) return room ? `Your backpack has room for only ${room}.` : 'Your backpack is full.';
        hero.meals += l.meal;
      } else { const err = LW.putItem(hero, l.item); if (err) { if (swap) LW.putItem(hero, swap[0]); return err; } }
      if (l.cost && l.coin) { hero.coins[l.coin] -= l.cost; this.save(); return null; }
      if (l.cost) { hero.gold -= Math.min(hero.gold, l.cost); this.save(); return null; } // a shop's goods stay on sale
      this.s.looted[key] = true;
      this.save();
      return null;
    }
    /* sec.rolls: what the number drawn here does to him, where the text says so outright: ep, gold
       won (gold), and what is lost (take). sec.bowShot: the draw is a shot, which spends an Arrow and
       has his skill with the bow added (LW.bowShot); s.rolled is then the total, s.drawn the number. */
    shot() { return this.section.bowShot && LW.bowShot ? LW.bowShot(this.s.hero) : null; }
    /* sec.rntMod: what the text adds to the number for a discipline, rank or Lore-circle he has */
    bonuses() {
      const hero = this.s.hero, times = (m) => (m.each ? Math.max(0, (LW.owned ? LW.owned(hero, m.each) : []).length - (m.over || 0)) : 1); // each: per Magnakai Discipline, over the first `over`
      // vsCS: the draw is measured against his COMBAT SKILL, which is taken off the total
      return (this.section.rntMod || []).filter((m) => LW.meets(hero, m) && times(m)).map((m) => (m.vsCS ? { label: 'Your Combat Skill', n: -LW.heroCS(hero).total } : { label: m.label || LW.condName(m) || 'Added', n: m.plus * times(m) }));
    }
    setRolled(n) {
      if (this.game) return this.play(n);
      const shot = this.shot();
      if (shot && shot.why) return shot.why;
      if (shot) this.s.hero.arrows -= 1;
      const parts = [...(shot ? shot.parts : []), ...this.bonuses()];
      // draws: the text asks for several numbers added; the page draws the others
      for (let k = 1; k < (this.section.draws || 1); k++) { const m = LW.rand10(); parts.push({ label: 'and', n: m }); }
      this.s.shot = parts.length ? parts : null;
      this.s.drawn = n;
      this.s.rolled = n + parts.reduce((t, p) => t + p.n, 0);
      n = this.s.rolled;
      const hero = this.s.hero, r = (this.section.rolls || []).find((x) => n >= x.range[0] && n <= x.range[1]);
      if (r && !this.s.looted[this.s.at + ':rolled']) {
        this.s.looted[this.s.at + ':rolled'] = true;
        // ep: 'drawn' loses the number drawn (0 counts as 10); sec.lessen: [{n, if, min}] makes a loss smaller for what he has
        let ep = r.ep === 'drawn' ? -(this.s.drawn || 10) : r.ep;
        for (const l of this.section.lessen || []) if (ep < 0 && (!l.if || LW.meets(hero, l.if))) ep = Math.min(0, -Math.max(l.min || 0, -ep - l.n));
        if (r.ep) { hero.ep = Math.max(0, Math.min(hero.epMax, hero.ep + ep)); this.s.events.push(ep < 0 ? `You lose ${-ep} ENDURANCE.` : ep ? `You regain ${ep} ENDURANCE.` : 'You lose nothing.'); }
        if (r.dead) { hero.ep = 0; this.s.events.push('It is the end of you.'); }
        if (r.mark) this.effects({ mark: r.mark }, this.s.events);
        if (r.gold) { const was = hero.gold; hero.gold = Math.max(0, Math.min(50, hero.gold + r.gold)); this.s.events.push(r.gold > 0 ? `You win ${hero.gold - was} Gold Crowns.` : `You lose ${was - hero.gold} Gold Crowns.`); }
        this.lose(r.take, this.s.events);
      }
      this.save();
      return null;
    }
    /* By-hand bookkeeping, for rules the importer leaves as text. */
    addItem(id) {
      const err = LW.putItem(this.s.hero, id);
      if (!err) this.save();
      return err;
    }
    removeItem(id) { LW.dropItem(this.s.hero, id); this.save(); }
    adjust(field, by) {
      const hero = this.s.hero;
      if (field === 'cs') hero.cs = Math.max(0, hero.cs + by);
      if (field === 'ep') hero.ep = Math.max(0, Math.min(hero.epMax, hero.ep + by));
      if (field === 'gold') hero.gold = Math.max(0, Math.min(50, hero.gold + by));
      if (field === 'arrows') hero.arrows = Math.max(0, Math.min(LW.quiverRoom(hero), (hero.arrows || 0) + by));
      if (LW.COINS[field]) (hero.coins = hero.coins || {})[field] = Math.max(0, (hero.coins[field] || 0) + by);
      this.save();
    }
    dropWeapon(id) {
      const w = this.s.hero.weapons;
      w.splice(w.indexOf(id), 1);
      this.save();
    }
    /* Drink or eat anything that heals (Laumspur Potion, the herb). */
    usePotion(id = 'potion') {
      const hero = this.s.hero, heal = LW.ITEMS[id] && LW.ITEMS[id].heal;
      const cures = LW.marksOf(hero).filter((m) => LW.curedBy(m, id));
      if (!heal || !hero.backpack.includes(id) || (hero.ep >= hero.epMax && !cures.length)) return false;
      LW.useUp(hero, id);
      hero.ep = Math.min(hero.epMax, hero.ep + heal);
      cures.forEach((m) => { delete hero.marks[m]; this.s.events.push(`${LW.MARKS[m].name}: cured.`); });
      this.save();
      return true;
    }

    /* Go back to how things stood on arriving at trail step n. */
    rewind(n) {
      if (n >= this.history.length) return;
      this.s = JSON.parse(this.history[n]);
      this.history.length = n;
      this.save();
    }
    /* Go back k steps along the trail, to where that section's choice was made, as things stood
       when it was made. Its Random Number may be drawn again, or a death could not be undone. */
    back(k) {
      const n = this.history.length - k;
      if (k < 1 || n < 0) return;
      this.rewind(n);
      this.s.rolled = null; this.s.events = [];
      this.save();
    }
    /* how far back() can go: the section k steps back, for k = 1 up */
    backs() { const t = this.s.trail; return this.history.map((_, i) => ({ k: i + 1, id: t[t.length - 2 - i].id })); }
    trim() { if (this.history.length > this.keep) this.history.splice(0, this.history.length - this.keep); }

    save() {
      try { localStorage.setItem(this.saveKey, JSON.stringify({ s: this.s, history: this.history })); } catch (e) { /* no storage: play on */ }
    }
    load() {
      try {
        const raw = JSON.parse(localStorage.getItem(this.saveKey));
        if (raw && raw.s && this.book.sections[raw.s.at]) { this.s = raw.s; this.history = raw.history || []; this.trim(); return true; }
      } catch (e) { /* fall through */ }
      return false;
    }
    clear() { try { localStorage.removeItem(this.saveKey); } catch (e) { /* nothing to clear */ } }
  }
  LW.Game = Game;
})();
