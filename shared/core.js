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
    alether: { name: 'Potion of Alether', kind: 'backpack', glyph: 'standing-potion', about: 'Drink before a fight: +2 COMBAT SKILL for that fight. Apply it by hand.' },
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
  };
  /* Items typed in by hand are stored as 'pack:Name' or 'spec:Name'. */
  LW.itemName = (id) => (LW.ITEMS[id] ? LW.ITEMS[id].name : id.replace(/^\w+:/, ''));
  LW.itemKind = (id) => (LW.ITEMS[id] ? LW.ITEMS[id].kind : id.startsWith('spec:') ? 'special' : 'backpack');
  LW.WEAPONS = Object.keys(LW.ITEMS).filter((k) => LW.ITEMS[k].kind === 'weapon');
  LW.MAX_WEAPONS = 2;
  LW.MAX_BACKPACK = 8;
  LW.MAX_ARROWS = 6; // a Quiver's load
  /* the book being played (main.js sets it): the Special Item limit depends on it */
  LW.bookNumber = 0;
  /* At most 12 Special Items from Book 8 on (the books' rules); no limit before. */
  LW.specialLimit = (hero) => (hero.series === 'magnakai' && LW.bookNumber >= 8 ? 12 : Infinity);
  /* A book's own items (name, kind, and optionally heal, ep, glyph, about) join the list. */
  LW.addItems = (items) => {
    Object.assign(LW.ITEMS, items);
    LW.WEAPONS = Object.keys(LW.ITEMS).filter((k) => LW.ITEMS[k].kind === 'weapon');
  };
  const listOf = (hero, id) => ({ weapon: hero.weapons, backpack: hero.backpack, special: hero.special }[LW.itemKind(id)]);
  LW.hasItem = (hero, id) => (id === 'meal' ? hero.meals > 0 : listOf(hero, id).includes(id));
  /* Put an item where it belongs. Returns why it does not fit, or null. hero.noPack: the Backpack
     itself is lost, so nothing that goes in it can be carried until another is found. */
  LW.putItem = (hero, id) => {
    const kind = id === 'meal' ? 'backpack' : LW.itemKind(id);
    if (kind === 'weapon' && hero.weapons.length >= LW.MAX_WEAPONS) return 'You can carry only two weapons. Drop one first.';
    if (kind === 'backpack' && hero.noPack) return 'You have no Backpack to carry it in.';
    if (kind === 'backpack' && hero.backpack.length + hero.meals >= LW.MAX_BACKPACK) return 'Your backpack is full.';
    if (kind === 'special' && hero.special.length >= LW.specialLimit(hero)) return 'You can carry at most 12 Special Items. Drop one first.';
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
    return true;
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
  LW.rankCount = (hero) => hero.disciplines.length;
  /* An imported condition, {disc: id | [ids] (any of them; all with every), rank, circle: [names] (all), ep: [lo, hi] (his Endurance now), item: id | [ids] (any held)}:
     whether he meets it, and what it reads as. The functions are looked up late: rules-series.js replaces them. */
  LW.meets = (hero, c) => {
    const ds = c.disc ? [].concat(c.disc) : [];
    if (ds.length && !(c.every ? ds.every((d) => LW.has(hero, d)) : ds.some((d) => LW.has(hero, d)))) return false;
    if (c.rank && LW.rankCount(hero) < c.rank) return false;
    if (c.item && ![].concat(c.item).some((i) => LW.hasItem(hero, i))) return false;
    if (c.ep && (hero.ep < c.ep[0] || hero.ep > c.ep[1])) return false;
    const circles = c.circle && LW.circlesOf ? LW.circlesOf(hero).map((x) => x.name) : [];
    return !(c.circle && !c.circle.every((n) => circles.includes(n)));
  };
  LW.condName = (c) => [c.disc && [].concat(c.disc).map((d) => (LW.DISCIPLINES[d] || { name: d }).name).join(c.every ? ' and ' : ' or '),
    c.rank && 'your rank', c.circle && c.circle.join(' and '), c.item && [].concat(c.item).map(LW.itemName).join(' or '), c.ep && 'your Endurance', c.each && 'your Magnakai Disciplines'].filter(Boolean).join(', ');

  /* COMBAT SKILL with every modifier spelled out, so the UI can show its working. */
  LW.heroCS = (hero, ctx = {}) => {
    const parts = [{ label: 'Base', n: hero.cs }];
    
    if (!hero.weapons.length) {
      parts.push({ label: 'Unarmed', n: -4 });
    } else if (hero.weaponskill && hero.weapons.includes(hero.weaponskill)) {
      parts.push({ label: 'Weaponskill', n: 2 });
    }
    
    // TWO-HANDED WEAPON RULE EXCLUSION
    const wieldsSommerswerd = hero.special.includes('sommerswerd');
    const hasShield = hero.weapons.includes('shield') || hero.backpack.includes('shield') || hero.special.includes('shield');
    
    if (wieldsSommerswerd && hasShield) {
      // The Sommerswerd forces two-handed use, completely rendering a shield useless for defense.
      parts.push({ label: 'Shield (Disabled by Sommerswerd)', n: 0 });
    } else if (hasShield) {
      // Standard shield handling if the legendary sword isn't active
      parts.push({ label: 'Shield', n: 2 });
    }

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
      // what the section gives and takes away, once only (before any Meal, so food found here can be eaten)
      if (!this.s.looted[id + ':arrive']) { this.s.looted[id + ':arrive'] = true; this.arrive(sec, events); }
      if (sec.lose && sec.lose.meal && hero.meals > 0) {
        hero.meals -= 1;
        events.push('A Meal is lost from your pack.');
      }
      if (sec.meal) {
        if (LW.hunts(hero) && !sec.noHunt) events.push(`${LW.hunts(hero)}: you catch what you need and keep your Meals.`);
        else if (hero.meals > 0) { hero.meals -= 1; events.push('You eat a Meal.'); }
        else if (hero.backpack.some((b) => LW.ITEMS[b] && LW.ITEMS[b].meal)) {
          const food = hero.backpack.find((b) => LW.ITEMS[b] && LW.ITEMS[b].meal), heal = LW.ITEMS[food].heal || 0;
          LW.dropItem(hero, food); hero.ep = Math.min(hero.epMax, hero.ep + heal);
          events.push(`You eat the ${LW.itemName(food)} as a Meal${heal ? ` and regain ${heal} ENDURANCE` : ''}.`);
        }
        else { hero.ep -= 3; events.push('You have nothing to eat. You lose 3 ENDURANCE.'); }
      }
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
      if (sec.cs) { hero.cs += sec.cs; events.push(`Your COMBAT SKILL is ${sec.cs < 0 ? 'reduced' : 'raised'} by ${Math.abs(sec.cs)} for good.`); }
      this.lose(sec.take, events);
      (sec.give || []).forEach((g, i) => {
        const err = this.takeLoot('give' + i), label = err && this.loot().find((l) => l.i === 'give' + i).label;
        if (err) events.push(`${label[0].toUpperCase() + label.slice(1)}: left here for now. ${err}`);
      });
      if (sec.todo) events.push('By hand: ' + sec.todo);
    }
    lose(take, events) {
      const hero = this.s.hero, name = LW.itemName;
      for (const t of take || []) {
        if (t.item) { if (LW.dropItem(hero, t.item)) events.push(`The ${name(t.item)} is gone.`); }
        else if (t.gold != null) { const n = t.gold === 'all' ? hero.gold : Math.min(hero.gold, t.gold); if (n) { hero.gold -= n; events.push(`You lose ${n} Gold Crowns.`); } }
        else if (t.weapons === 'all') { if (hero.weapons.length) { hero.weapons = []; events.push('Your weapons are gone.'); } }
        else if (t.arrows != null) { const n = t.arrows === 'all' ? hero.arrows || 0 : Math.min(hero.arrows || 0, t.arrows); if (n) { hero.arrows -= n; events.push(`You lose ${n} Arrow${n > 1 ? 's' : ''}.`); } }
        else if (t.special === 'all') { if (hero.special.length) { [...hero.special].forEach((x) => LW.dropItem(hero, x)); events.push('Your Special Items are gone.'); } }
        else if (t.weapons === 'one') {
          if (hero.weapons.length === 1) events.push(`Your ${name(hero.weapons.pop())} is lost.`);
          else if (hero.weapons.length > 1) events.push('By hand: one weapon of your choice is lost. Drop it in the inventory.');
        }
        else if (t.backpack) {
          if (hero.backpack.length || hero.meals) events.push(t.backpack === 'all' ? 'Your Backpack and all in it are gone.' : 'Everything in your Backpack is gone.');
          else if (t.backpack === 'all' && !hero.noPack) events.push('Your Backpack is gone.');
          hero.backpack = []; hero.meals = 0;
          if (t.backpack === 'all') hero.noPack = true;
        }
      }
    }

    /* Combat blocks the way on until it is won. */
    get combatPending() {
      const sec = this.section;
      return !!sec.combat && !this.s.fought[this.s.at];
    }
    wonCombat() { this.s.fought[this.s.at] = true; this.save(); }

    choices() {
      const sec = this.section;
      const hero = this.s.hero;
      if (this.dead || sec.end) return [];
      if (this.combatPending) return [];
      if (sec.combat && sec.combat.to) return [{ text: 'Continue', to: sec.combat.to, enabled: true }];
      const fought = !!sec.combat, rolled = this.s.rolled;
      return (sec.choices || []).filter((c) => !(fought && c.evade)).map((c) => {
        let enabled = true, why = '';
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
        if (c.need && c.need.gold && hero.gold < c.need.gold) { enabled = false; why = `Needs ${c.need.gold} Gold Crowns`; }
        return Object.assign({}, c, { enabled, why });
      });
    }

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
      if (choice.need && choice.need.gold && choice.need.spend) hero.gold -= choice.need.gold;
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
        const label = l.gold ? `${l.gold} Gold Crowns` : l.meal ? (l.meal > 1 ? `${l.meal} Meals` : 'a Meal') : l.pack ? 'a Backpack' : l.arrows ? `${l.arrows} Arrow${l.arrows > 1 ? 's' : ''}` : LW.itemName(l.item);
        const share = l.or && all.filter(([m, j]) => j !== i && m.or === l.or && got(j)).length >= (l.pick || 1);
        return { i, label, taken: got(i), closed: share, cost: l.cost, pick: l.pick, item: l.item || (l.meal ? 'meal' : l.gold ? 'gold' : l.arrows ? 'arrows' : 'pack') };
      });
    }
    /* Returns an error string when it cannot be taken. */
    takeLoot(i) {
      const sec = this.section, l = String(i).startsWith('give') ? sec.give[+String(i).slice(4)] : sec.loot[i];
      const hero = this.s.hero, key = this.s.at + ':' + i;
      if (!l || this.s.looted[key]) return null;
      if (l.or && this.loot().find((o) => o.i === i).closed) return l.pick > 1 ? `You may take only ${l.pick} of these.` : 'You may take only one of these.';
      if (l.cost && hero.gold < l.cost) return `It costs ${l.cost} Gold Crowns.`;
      if (l.cost && l.pack && !hero.noPack) return 'You have a Backpack already.';
      if (l.gold) hero.gold = Math.min(50, hero.gold + l.gold);
      else if (l.pack) hero.noPack = false;
      else if (l.arrows) {
        if (!hero.special.includes('quiver')) return 'You need a Quiver to carry Arrows.';
        if ((hero.arrows || 0) >= LW.MAX_ARROWS) return 'Your Quiver is full.';
        hero.arrows = Math.min(LW.MAX_ARROWS, (hero.arrows || 0) + l.arrows);
      }
      else if (l.meal) {
        if (hero.noPack) return 'You have no Backpack to carry it in.';
        const room = LW.MAX_BACKPACK - hero.backpack.length - hero.meals;
        if (room < l.meal) return room ? `Your backpack has room for only ${room}.` : 'Your backpack is full.';
        hero.meals += l.meal;
      } else { const err = LW.putItem(hero, l.item); if (err) return err; }
      if (l.cost) { hero.gold -= l.cost; this.save(); return null; } // a shop's goods stay on sale
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
      return (this.section.rntMod || []).filter((m) => LW.meets(hero, m) && times(m)).map((m) => ({ label: LW.condName(m), n: m.plus * times(m) }));
    }
    setRolled(n) {
      const shot = this.shot();
      if (shot && shot.why) return shot.why;
      if (shot) this.s.hero.arrows -= 1;
      const parts = [...(shot ? shot.parts : []), ...this.bonuses()];
      this.s.shot = parts.length ? parts : null;
      this.s.drawn = n;
      this.s.rolled = n + parts.reduce((t, p) => t + p.n, 0);
      n = this.s.rolled;
      const hero = this.s.hero, r = (this.section.rolls || []).find((x) => n >= x.range[0] && n <= x.range[1]);
      if (r && !this.s.looted[this.s.at + ':rolled']) {
        this.s.looted[this.s.at + ':rolled'] = true;
        if (r.ep) { hero.ep = Math.max(0, Math.min(hero.epMax, hero.ep + r.ep)); this.s.events.push(r.ep < 0 ? `You lose ${-r.ep} ENDURANCE.` : `You regain ${r.ep} ENDURANCE.`); }
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
      if (field === 'arrows') hero.arrows = Math.max(0, Math.min(LW.MAX_ARROWS, (hero.arrows || 0) + by));
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
      if (!heal || !hero.backpack.includes(id) || hero.ep >= hero.epMax) return false;
      LW.dropItem(hero, id);
      hero.ep = Math.min(hero.epMax, hero.ep + heal);
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
