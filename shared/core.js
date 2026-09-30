/* Lone Wolf prototype: rules + book runner. No DOM in here. */
(function () {
  const LW = (window.LW = window.LW || {});

  LW.rand10 = () => Math.floor(Math.random() * 10);

  /* ---------- Combat Results Table ----------
     Columns: combat ratio <=-11, -10/-9, ... 0 ... +9/+10, >=+11.
     Each cell is "enemy loss/Lone Wolf loss"; K = killed outright.
     Typed in from memory: check against the book when the importer lands. */
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
  };
  /* Items typed in by hand are stored as 'pack:Name' or 'spec:Name'. */
  LW.itemName = (id) => (LW.ITEMS[id] ? LW.ITEMS[id].name : id.replace(/^\w+:/, ''));
  LW.itemKind = (id) => (LW.ITEMS[id] ? LW.ITEMS[id].kind : id.startsWith('spec:') ? 'special' : 'backpack');
  LW.WEAPONS = Object.keys(LW.ITEMS).filter((k) => LW.ITEMS[k].kind === 'weapon');
  LW.MAX_WEAPONS = 2;
  LW.MAX_BACKPACK = 8;

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
      hero.weaponskill = LW.WEAPONS[Math.floor(Math.random() * LW.WEAPONS.length)];
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

  /* COMBAT SKILL with every modifier spelled out, so the UI can show its working. */
  LW.heroCS = (hero, ctx = {}) => {
    const parts = [{ label: 'Base', n: hero.cs }];
    if (!hero.weapons.length) parts.push({ label: 'Unarmed', n: -4 });
    else if (hero.weaponskill && hero.weapons.includes(hero.weaponskill))
      parts.push({ label: 'Weaponskill', n: 2 });
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
      const sec = this.book.sections[id];
      const hero = this.s.hero;
      const events = [];
      this.s.at = id;
      this.s.rolled = null;
      this.s.trail.push({ id, via });

      if (sec.ep) {
        hero.ep = Math.min(hero.epMax, hero.ep + sec.ep);
        events.push(sec.ep < 0 ? `You lose ${-sec.ep} ENDURANCE.` : `You regain ${sec.ep} ENDURANCE.`);
      }
      if (sec.lose && sec.lose.meal && hero.meals > 0) {
        hero.meals -= 1;
        events.push('A Meal is lost from your pack.');
      }
      if (sec.meal) {
        if (LW.hunts(hero)) events.push(`${LW.hunts(hero)}: you catch what you need and keep your Meals.`);
        else if (hero.meals > 0) { hero.meals -= 1; events.push('You eat a Meal.'); }
        else { hero.ep -= 3; events.push('You have nothing to eat. You lose 3 ENDURANCE.'); }
      }
      if (!sec.combat && LW.heals(hero) && hero.ep > 0 && hero.ep < hero.epMax) {
        hero.ep += 1;
        events.push(`${LW.heals(hero)}: you regain 1 ENDURANCE.`);
      }
      this.s.events = events;
      this.save();
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
        if (sec.rnt === 'auto') {
          if (rolled == null) { enabled = false; why = 'Spin the medallion first'; }
          else if (c.range && (rolled < c.range[0] || rolled > c.range[1])) { enabled = false; why = `You drew ${rolled}`; }
        }
        if (c.need && c.need.disc && !LW.has(hero, c.need.disc)) {
          enabled = false; why = `Needs ${LW.DISCIPLINES[c.need.disc].name}`;
        }
        if (c.need && c.need.rank && LW.rankCount(hero) < c.need.rank) { enabled = false; why = 'Needs a higher rank'; }
        if (c.need && c.need.item && !hero.backpack.includes(c.need.item)) {
          enabled = false; why = `Needs ${LW.ITEMS[c.need.item].name}`;
        }
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
      if (choice.need && choice.need.item && choice.need.spend) {
        hero.backpack.splice(hero.backpack.indexOf(choice.need.item), 1);
      }
      this.go(to || choice.to, choice.text);
    }

    loot() {
      const sec = this.section;
      return (sec.loot || []).map((l, i) => {
        const taken = !!this.s.looted[this.s.at + ':' + i];
        const label = l.gold ? `${l.gold} Gold Crowns` : l.meal ? (l.meal > 1 ? `${l.meal} Meals` : 'a Meal') : LW.ITEMS[l.item].name;
        return { i, label, taken };
      });
    }
    /* Returns an error string when the item will not fit. */
    takeLoot(i) {
      const l = this.section.loot[i];
      const hero = this.s.hero;
      if (l.gold) hero.gold = Math.min(50, hero.gold + l.gold);
      else if (l.meal) hero.meals += l.meal;
      else {
        const item = LW.ITEMS[l.item];
        if (item.kind === 'weapon') {
          if (hero.weapons.length >= LW.MAX_WEAPONS) return 'You can carry only two weapons. Drop one first.';
          hero.weapons.push(l.item);
        } else if (item.kind === 'backpack') {
          if (hero.backpack.length + hero.meals >= LW.MAX_BACKPACK) return 'Your backpack is full.';
          hero.backpack.push(l.item);
        } else hero.special.push(l.item);
      }
      this.s.looted[this.s.at + ':' + i] = true;
      this.save();
      return null;
    }
    setRolled(n) { this.s.rolled = n; this.save(); }
    /* By-hand bookkeeping, for rules the importer leaves as text. */
    addItem(id) {
      const hero = this.s.hero, kind = LW.itemKind(id);
      if (id === 'meal') { if (hero.backpack.length + hero.meals >= LW.MAX_BACKPACK) return 'Your backpack is full.'; hero.meals += 1; }
      else if (kind === 'weapon') { if (hero.weapons.length >= LW.MAX_WEAPONS) return 'You can carry only two weapons. Drop one first.'; hero.weapons.push(id); }
      else if (kind === 'backpack') { if (hero.backpack.length + hero.meals >= LW.MAX_BACKPACK) return 'Your backpack is full.'; hero.backpack.push(id); }
      else { hero.special.push(id); const ep = LW.ITEMS[id] && LW.ITEMS[id].ep; if (ep) { hero.ep += ep; hero.epMax += ep; } }
      this.save(); return null;
    }
    removeItem(id) {
      const hero = this.s.hero;
      if (id === 'meal') hero.meals = Math.max(0, hero.meals - 1);
      else for (const list of [hero.weapons, hero.backpack, hero.special]) {
        const i = list.indexOf(id);
        if (i >= 0) { list.splice(i, 1); const ep = list === hero.special && LW.ITEMS[id] && LW.ITEMS[id].ep; if (ep) { hero.epMax -= ep; hero.ep = Math.min(hero.ep, hero.epMax); } break; }
      }
      this.save();
    }
    adjust(field, by) {
      const hero = this.s.hero;
      if (field === 'ep') hero.ep = Math.max(0, Math.min(hero.epMax, hero.ep + by));
      if (field === 'gold') hero.gold = Math.max(0, Math.min(50, hero.gold + by));
      this.save();
    }
    dropWeapon(id) {
      const w = this.s.hero.weapons;
      w.splice(w.indexOf(id), 1);
      this.save();
    }
    usePotion() {
      const hero = this.s.hero;
      const i = hero.backpack.indexOf('potion');
      if (i < 0 || hero.ep >= hero.epMax) return false;
      hero.backpack.splice(i, 1);
      hero.ep = Math.min(hero.epMax, hero.ep + LW.ITEMS.potion.heal);
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

    save() {
      try { localStorage.setItem(this.saveKey, JSON.stringify({ s: this.s, history: this.history })); } catch (e) { /* no storage: play on */ }
    }
    load() {
      try {
        const raw = JSON.parse(localStorage.getItem(this.saveKey));
        if (raw && raw.s && this.book.sections[raw.s.at]) { this.s = raw.s; this.history = raw.history || []; return true; }
      } catch (e) { /* fall through */ }
      return false;
    }
    clear() { try { localStorage.removeItem(this.saveKey); } catch (e) { /* nothing to clear */ } }
  }
  LW.Game = Game;
})();
