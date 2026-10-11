/* Rules that differ between series (Kai, Magnakai), and the character who walks from book to book.
   Load after core.js and ui.js. The numbers are the books' own (docs/reference/rules-books.md,
   checked against the rules pages 2026-10-02). */
(function () {
  const LW = window.LW;

  for (const id in LW.DISCIPLINES) LW.DISCIPLINES[id].series = 'kai';
  Object.assign(LW.DISCIPLINES, {
    weaponmastery: { series: 'magnakai', name: 'Weaponmastery', blurb: '+3 COMBAT SKILL with any weapon you have mastered.' },
    animalControl: { series: 'magnakai', name: 'Animal Control', blurb: 'Command beasts and turn them aside.' },
    curing: { series: 'magnakai', name: 'Curing', blurb: 'Regain 1 ENDURANCE in every section without a fight.' },
    invisibility: { series: 'magnakai', name: 'Invisibility', blurb: 'Mask your body, your scent and your sound.' },
    huntmastery: { series: 'magnakai', name: 'Huntmastery', blurb: 'Never need a Meal. Keener eyes, quicker feet.' },
    pathsmanship: { series: 'magnakai', name: 'Pathsmanship', blurb: 'Read any track, tongue or sign on the road.' },
    psiSurge: { series: 'magnakai', name: 'Psi-surge', blurb: '+4 COMBAT SKILL for 2 ENDURANCE a round, or a free Mindblast for +2.' },
    psiScreen: { series: 'magnakai', name: 'Psi-screen', blurb: 'Enemy mind attacks cannot weaken you.' },
    nexus: { series: 'magnakai', name: 'Nexus', blurb: 'Move objects by will. Endure heat and cold.' },
    divination: { series: 'magnakai', name: 'Divination', blurb: 'Sense danger and the thoughts of those nearby.' },
  });
  // the Bow shoots only where the text allows; hand to hand it is no weapon at all (ranged)
  Object.assign(LW.ITEMS, { bow: { name: 'Bow', kind: 'weapon', ranged: true }, quiver: { name: 'Quiver', kind: 'special', about: 'Holds six Arrows.' } });
  LW.WEAPONS = Object.keys(LW.ITEMS).filter((k) => LW.ITEMS[k].kind === 'weapon');

  const ids = (series) => Object.keys(LW.DISCIPLINES).filter((d) => LW.DISCIPLINES[d].series === series);
  LW.SERIES = {
    kai: { name: 'Kai', list: ids('kai'), first: 5, field: 'disciplines',
      ranks: ['', 'Novice', 'Intuite', 'Doan', 'Acolyte', 'Initiate', 'Aspirant', 'Guardian', 'Warmarn', 'Savant', 'Master'] },
    magnakai: { name: 'Magnakai', list: ids('magnakai'), first: 3, field: 'magnakai',
      ranks: ['', 'Kai Master', 'Kai Master Senior', 'Kai Master Superior', 'Primate', 'Tutelary', 'Principalin', 'Mentora', 'Scion-kai', 'Archmaster', 'Kai Grand Master'] },
  };
  LW.CIRCLES = [
    { name: 'Circle of Fire', needs: ['weaponmastery', 'huntmastery'], cs: 1, ep: 2 },
    { name: 'Circle of Light', needs: ['animalControl', 'curing'], cs: 0, ep: 3 },
    { name: 'Circle of Solaris', needs: ['invisibility', 'huntmastery', 'pathsmanship'], cs: 1, ep: 3 },
    { name: 'Circle of the Spirit', needs: ['psiSurge', 'psiScreen', 'nexus', 'divination'], cs: 3, ep: 3 },
  ];

  const seriesOf = (hero) => LW.SERIES[hero.series] || LW.SERIES.kai;
  LW.owned = (hero, series) => hero[LW.SERIES[series || hero.series || 'kai'].field] || [];
  LW.has = (hero, d) => hero.disciplines.includes(d) || (hero.magnakai || []).includes(d);
  LW.rankOf = (hero) => seriesOf(hero).ranks[LW.owned(hero).length] || '';
  LW.rankCount = (hero) => LW.owned(hero).length;
  LW.circlesOf = (hero) => (hero.series === 'magnakai' ? LW.CIRCLES.filter((c) => c.needs.every((d) => LW.has(hero, d))) : []);
  /* hero.completed: the books (ids) he had completed when he set out on this one */
  LW.completedAll = (hero, from, to) => {
    const done = new Set((hero.completed || []).map((id) => parseInt(id, 10)));
    for (let n = from; n <= to; n++) if (!done.has(n)) return false;
    return true;
  };
  /* In a Magnakai book the Magnakai Disciplines do the work; the Kai ones are taken as read, except
     that one who played Books 1-5 keeps Healing's +1 (never added to Curing's) and Hunting's Meals
     (ADR 0018). The Magnakai books do not mark where Hunting fails, so it says so. */
  const kaiVeteran = (hero) => LW.completedAll(hero, 1, 5);
  LW.heals = (hero) => (hero.series === 'magnakai' ? (LW.has(hero, 'curing') && 'Curing') || (kaiVeteran(hero) && LW.has(hero, 'healing') && 'Healing') : LW.has(hero, 'healing') && 'Healing');
  LW.hunts = (hero) => (hero.series === 'magnakai' ? (LW.has(hero, 'huntmastery') && 'Huntmastery') || (kaiVeteran(hero) && LW.has(hero, 'hunting') && 'Hunting') : LW.has(hero, 'hunting') && 'Hunting');
  LW.huntNote = (hero) => (LW.hunts(hero) === 'Hunting' && hero.series === 'magnakai' ? ' Hunting fails in desert and wasteland: if this is such a place, eat a Meal by hand.' : '');
  LW.shielded = (hero) => (hero.series === 'magnakai' ? LW.has(hero, 'psiScreen') : LW.has(hero, 'mindshield'));
  /* Psi-surge's numbers: an Archmaster's are stronger and cheaper (Book 12) */
  LW.psi = (hero) => (LW.mkRank(hero) >= 9 && LW.has(hero, 'psiSurge') ? { surge: 6, cost: 1, floor: 4, blast: 3 } : { surge: 4, cost: 2, floor: 6, blast: 2 });
  /* 0 = no mind attack, 1 = Mindblast, 2 = Psi-surge */
  LW.mindPower = (hero) => (hero.series === 'magnakai' ? (LW.has(hero, 'psiSurge') ? 2 : 0) : LW.has(hero, 'mindblast') ? 1 : 0);

  /* Magnakai rank: the number of Magnakai Disciplines. From Book 7 the books improve some disciplines
     by rank (rules-books.md, "Improved Disciplines"); a carried character reaches each rank in the
     book that first prints its improvements, so rank alone decides. */
  LW.mkRank = (hero) => (hero.series === 'magnakai' ? (hero.magnakai || []).length : 0);
  const mastered = (hero) => hero.series === 'magnakai' && LW.has(hero, 'weaponmastery');
  /* What a weapon adds: its own bonus (item.cs, the Sommerswerd's 8) and his skill with it. A Special
     Item can be a weapon too; item.weapon lists the kinds it counts as for the skill. */
  const weaponParts = (hero, w) => {
    const it = LW.ITEMS[w] || {}, kinds = it.weapon || [w], parts = it.cs ? [{ label: it.name, n: it.cs }] : [];
    if (mastered(hero) && kinds.some((k) => (hero.mastery || []).includes(k))) parts.push({ label: 'Weaponmastery', n: LW.mkRank(hero) >= 8 ? 4 : 3 }); // Scion-kai: +4
    else if (hero.series !== 'magnakai' && hero.weaponskill && kinds.includes(hero.weaponskill)) parts.push({ label: 'Weaponskill', n: 2 });
    return parts;
  };
  /* The weapon he fights with: whichever gives most. ctx.with: 'none' when the text has him fight
     bare-handed, or an item id when only that weapon can harm the enemy. Null: unarmed. */
  LW.armedWith = (hero, ctx = {}) => {
    if (ctx.with === 'none') return null;
    // a Bow fights only where the text names it (ctx.with)
    const all = [...hero.weapons, ...hero.special.filter((s) => LW.ITEMS[s] && LW.ITEMS[s].weapon)].filter((w) => (ctx.with ? w === ctx.with : !(LW.ITEMS[w] || {}).ranged));
    const sum = (w) => weaponParts(hero, w).reduce((t, p) => t + p.n, 0);
    return all.reduce((best, w) => (best == null || sum(w) > sum(best) ? w : best), null);
  };
  LW.heroCS = (hero, ctx = {}) => {
    const parts = [{ label: 'Base', n: hero.cs }], w = LW.armedWith(hero, ctx);
    if (w) parts.push(...weaponParts(hero, w));
    // unarmed: -4; with Weaponmastery a Tutelary loses 2, a Scion-kai 1
    else parts.push({ label: ctx.with === 'none' ? 'Bare-handed' : 'Unarmed', n: !mastered(hero) ? -4 : LW.mkRank(hero) >= 8 ? -1 : LW.mkRank(hero) >= 5 ? -2 : -4 });
    // a Shield, carried, in any fight it can be used in
    const shield = hero.special.find((s) => LW.ITEMS[s] && LW.ITEMS[s].fightCs);
    if (shield && !ctx.noShield) parts.push({ label: LW.itemName(shield), n: LW.ITEMS[shield].fightCs });
    const circles = LW.circlesOf(hero).reduce((t, c) => t + c.cs, 0);
    if (circles) parts.push({ label: 'Lore-circles', n: circles });
    const psi = LW.psi(hero);
    if (ctx.psiSurge) parts.push({ label: 'Psi-surge', n: psi.surge });
    else if (ctx.mindblast) parts.push({ label: 'Mindblast', n: psi.blast });
    if (ctx.enemy && ctx.enemy.mindforce && !LW.shielded(hero)) parts.push({ label: 'Mind attack', n: -ctx.enemy.mindforce });
    if (ctx.csMod) parts.push({ label: ctx.csNote || 'Circumstance', n: ctx.csMod });
    return { total: parts.reduce((t, p) => t + p.n, 0), parts };
  };
  /* A bow shot (a section's bowShot): a Bow and an Arrow, and what is added to the Random Number:
     Weaponmastery with the Bow 3, and from Mentora (Book 10) 2 more; both only with the Bow mastered.
     A bow of a book's own may add its own (item.shot). {why} when he cannot shoot. */
  LW.bowShot = (hero) => {
    const bows = hero.weapons.filter((w) => (LW.ITEMS[w] || {}).ranged), shot = (w) => LW.ITEMS[w].shot || 0;
    if (!bows.length) return { why: 'You need a Bow to shoot.' };
    if (!(hero.arrows > 0)) return { why: 'You have no Arrows left.' };
    const bow = bows.reduce((a, b) => (shot(b) > shot(a) ? b : a)), parts = [];
    if (shot(bow)) parts.push({ label: LW.itemName(bow), n: shot(bow) });
    if (mastered(hero) && (LW.ITEMS[bow].weapon || [bow]).concat('bow').some((k) => (hero.mastery || []).includes(k))) {
      parts.push({ label: 'Weaponmastery with Bow', n: 3 });
      if (LW.mkRank(hero) >= 7) parts.push({ label: 'Mentora', n: 2 });
    }
    return { bow, parts, plus: parts.reduce((t, p) => t + p.n, 0) };
  };
  /* Curing at Archmaster (Book 12): once in a book (the books say once in 100 days), at 6 ENDURANCE or
     less in a fight, 20 back. hero.cured holds the book it was used in. */
  LW.canCure = (hero, bookId) => LW.mkRank(hero) >= 9 && LW.has(hero, 'curing') && hero.cured !== bookId;

  /* Lore-circle ENDURANCE is added once, when a circle is completed. */
  function settleCircles(hero) {
    const ep = LW.circlesOf(hero).reduce((t, c) => t + c.ep, 0), by = ep - (hero.circleEp || 0);
    hero.epMax += by; hero.ep += by; hero.circleEp = ep;
  }

  /* ---------- the character who is carried between books ---------- */
  LW.Character = {
    key: 'lw-character', // the player keeps one per adventure and points this at the open one
    load() { try { return JSON.parse(localStorage.getItem(this.key)); } catch (e) { return null; } },
    save(hero, book) {
      const old = this.load(), done = new Set((old && old.completed) || []); done.add(book.id);
      try { localStorage.setItem(this.key, JSON.stringify({ hero, from: book.id, fromTitle: book.title, completed: [...done] })); } catch (e) { /* not kept */ }
    },
    clear() { try { localStorage.removeItem(this.key); } catch (e) { /* nothing kept */ } },
  };

  /* ---------- a new character, or a returning one: the choices made before the book begins ----------
     carry = the saved record from LW.Character.load(), or null for a fresh character. This holds the
     choices and the rules; the player draws them on its pages (main.js, setupLeftHTML). */
  const anyOf = (set, pool, n) => { const left = pool.filter((p) => !set.has(p)); while (set.size < n && left.length) set.add(left.splice(Math.floor(Math.random() * left.length), 1)[0]); };
  LW.HeroSetup = function (book, carry) {
    const series = book.series || 'kai', S = LW.SERIES[series], kit = LW.KITS[book.number];
    const hero = carry ? JSON.parse(JSON.stringify(carry.hero)) : null;
    const owned = hero ? (hero[S.field] || []).slice() : [];
    const oldMastery = (hero && hero.mastery) || [], hadMastery = owned.includes('weaponmastery');
    return {
      book, carry, series, S, hero, owned, oldMastery,
      pick: Math.min(S.list.length - owned.length, owned.length ? 1 : S.first),
      picked: new Set(), weapons: new Set(),
      rolls: { cs: hero ? 0 : null, ep: hero ? 0 : null },
      kit: kit && !(hero && kit.newOnly) ? kit : null, // Book 11: a carried character sets out with what he has
      /* how many weapons Weaponmastery asks him to master now */
      need() { return Math.min(this.picked.has('weaponmastery') ? 3 : hadMastery ? 1 : 0, LW.WEAPONS.length - oldMastery.length); },
      canPick(id) { return !owned.includes(id) && (this.picked.has(id) || this.picked.size < this.pick); },
      toggle(id) {
        if (!this.canPick(id)) return;
        if (this.picked.has(id)) this.picked.delete(id); else this.picked.add(id);
        if (!this.need()) this.weapons.clear();
      },
      canWeapon(w) { return !oldMastery.includes(w) && (this.weapons.has(w) || this.weapons.size < this.need()); },
      toggleWeapon(w) { if (this.canWeapon(w)) { if (this.weapons.has(w)) this.weapons.delete(w); else this.weapons.add(w); } },
      roll(key, n = LW.rand10()) { if (this.rolls[key] == null) this.rolls[key] = n; return this.rolls[key]; },
      auto() {
        this.roll('cs'); this.roll('ep');
        anyOf(this.picked, S.list.filter((id) => !owned.includes(id)), this.pick);
        anyOf(this.weapons, LW.WEAPONS.filter((x) => !oldMastery.includes(x)), this.need());
      },
      ready() { return this.picked.size === this.pick && this.weapons.size === this.need() && this.rolls.cs != null && this.rolls.ep != null; },
      /* the hero these choices make, before the book's kit (KitSetup) and LW.readyHero */
      build() {
        let out = hero;
        if (!out) {
          // a fresh Magnakai character is already a Kai Master: all ten Kai Disciplines
          out = LW.makeHero({ csRoll: this.rolls.cs, epRoll: this.rolls.ep, disciplines: series === 'kai' ? [...this.picked] : LW.SERIES.kai.list.slice(), bonusItem: book.bonusItem });
          if (series !== 'kai') out.weaponskill = null;
          // makeHero gives Book 1's kit; a later book's own kit is all a new character has
          if (kit) Object.assign(out, { weapons: [], special: [], backpack: [], meals: 0, gold: 0 });
        }
        // the books carry over Weapons, Special Items and gold, not what was in the Backpack
        if (hero) { out.backpack = []; out.meals = 0; out.noPack = false; }
        out.series = series;
        out[S.field] = [...owned, ...this.picked];
        if (series === 'kai' && this.picked.has('weaponskill') && !out.weaponskill) out.weaponskill = LW.WEAPONSKILL_TABLE[LW.rand10()];
        out.mastery = [...oldMastery, ...this.weapons];
        out.completed = carry ? [...(carry.completed || [])] : []; // for rules that reward having played earlier books
        delete out.found;
        return out;
      },
    };
  };
  /* the last of setting out: Lore-circle Endurance, and full Endurance */
  LW.readyHero = (out) => { settleCircles(out); out.ep = out.epMax; return out; };

  /* ---------- each book's starting kit (rules-books.md, "Book addenda") ----------
     give: handed over (an item he already has is skipped). choose: how many of `from` he may take; an
     entry is an item id, {item, n} or {meal, n, name}. store: Special Items may be left at the Kai
     Monastery (Book 5 on); storeGold: gold over 50 too (Book 6 on). newOnly: a carried character gets
     none of it (Book 11). wear: clothing the engine does not track. Book 1's kit is makeHero's. */
  const later = ['sword', 'bow', 'quiver', 'rope', 'potion', 'lantern', 'mace', { meal: 3 }, 'dagger'];
  const magnakai = (map, more) => ({ give: [map], choose: 5, from: [...later, more], store: true, storeGold: true });
  LW.KITS = {
    2: { give: ['map', 'seal'], choose: 2, from: ['sword', 'shortSword', { meal: 2 }, 'chainmail', 'mace', 'potion', 'quarterstaff', 'spear', 'shield', 'broadsword'] },
    3: { give: ['mapKalte'], choose: 2, from: ['sword', 'shortSword', 'leatherWaistcoat', 'spear', 'mace', 'warhammer', 'axe', 'potion', 'quarterstaff', { meal: 1, name: 'Special Rations' }, 'broadsword'], wear: 'winter clothing' },
    4: { give: ['mapSouthlands', 'badge'], choose: 6, from: ['warhammer', 'dagger', { item: 'potion', n: 2 }, 'sword', 'spear', { meal: 5, name: 'five Special Rations' }, 'mace', 'chainmail', 'shield'] },
    5: { give: ['mapVassagonia'], choose: 4, from: ['dagger', 'potion', 'sword', 'spear', { meal: 2, name: 'two Special Rations' }, 'mace', 'shield'], store: true },
    6: { give: ['mapStornlands'], choose: 5, from: ['sword', 'potion', 'warhammer', 'bow', 'quiver', { meal: 4, name: 'four Special Rations' }, 'quarterstaff', 'leatherWaistcoat', 'rope', 'dagger', 'tinderbox', 'axe'], store: true, storeGold: true },
    7: magnakai('mapMagi', { item: 'fireseed', n: 3 }),
    8: magnakai('mapDanarg', { item: 'fireseed', n: 3 }),
    9: magnakai('mapAnari', { item: 'fireseed', n: 3 }),
    10: magnakai('mapGhatan', 'alether'),
    11: { give: [{ meal: 2 }], choose: 6, from: later, newOnly: true },
    12: { give: ['mapDarklands'], choose: 6, from: [...later.filter((x) => !x.meal), { meal: 4 }, 'quarterstaff', 'axe'], store: true, storeGold: true, wear: 'cold-weather clothing and a waterproof cape' },
  };
  const entry = (x) => (typeof x === 'string' ? { item: x, n: 1 } : Object.assign({ n: 1 }, x));
  const entryName = (x) => (x.meal ? x.name || (x.meal > 1 ? `${x.meal} Meals` : 'a Meal') : x.n > 1 ? `${x.n} × ${LW.itemName(x.item)}` : LW.itemName(x.item));

  /* The book's gold and kit, what he keeps of his weapons, and what he leaves at or takes from the
     Monastery: the choices after HeroSetup's. finish() changes hero in place. */
  LW.kitEntryName = entryName;
  LW.KitSetup = function (book, kit, hero) {
    const from = kit.from.map(entry), stored = hero.stored || [];
    const kinds = (x) => (x.meal ? 'backpack' : LW.itemKind(x.item));
    const count = (kind, list) => list.filter((x) => kinds(x) === kind).reduce((t, x) => t + (x.meal || x.n), 0);
    return {
      book, kit, hero, from, stored, limit: LW.specialLimit(hero),
      gifts: kit.give.map(entry).filter((g) => g.meal || !LW.hasItem(hero, g.item)),
      had: kit.give.map(entry).filter((g) => !g.meal && LW.hasItem(hero, g.item)),
      store: kit.store && stored.length + hero.special.length > 0,
      chosen: new Set(), dropW: new Set(), leave: new Set(), fetch: new Set(), draw: 0, roll: null,
      rollGold(n = LW.rand10()) { if (this.roll == null) this.roll = n; return this.roll; },
      /* the Belt Pouch after the book's 10 + the roll, what is over its 50, and the gold at the Monastery */
      gold() {
        const all = hero.gold + 10 + (this.roll || 0), purse = Math.min(50, all), over = all - purse;
        return { purse, over, bank: (hero.storedGold || 0) + (kit.storeGold ? over : 0) };
      },
      picks() { return [...this.chosen].map((i) => from[i]); },
      totals() {
        const p = this.picks();
        return {
          weapon: hero.weapons.length - this.dropW.size + count('weapon', p),
          backpack: count('backpack', [...this.gifts, ...p]),
          special: hero.special.length - this.leave.size + this.fetch.size + count('special', [...this.gifts, ...p]),
        };
      },
      problems() {
        const t = this.totals(), out = [];
        if (t.weapon > LW.MAX_WEAPONS) out.push('Two Weapons at most: leave one behind.');
        if (t.backpack > LW.MAX_BACKPACK) out.push('Eight Backpack Items at most, Meals included.');
        if (t.special > this.limit) out.push(`${this.limit} Special Items at most: leave some at the Monastery.`);
        return out;
      },
      // a Special Item he has (and is not leaving behind) is not offered twice, unless it comes several at a time
      held(i) { const x = from[i]; return !x.meal && x.n === 1 && kinds(x) === 'special' && hero.special.some((s, j) => s === x.item && !this.leave.has(j)); },
      canChoose(i) { return this.chosen.has(i) || (this.chosen.size < kit.choose && !this.held(i)); },
      flip(set, i) { if (set.has(i)) set.delete(i); else set.add(i); },
      choose(i) { if (this.canChoose(i)) this.flip(this.chosen, i); },
      canDraw(by) { const g = this.gold(); return by < 0 ? this.draw > 0 : this.roll != null && this.draw < g.bank && g.purse + this.draw < 50; },
      auto() {
        this.rollGold();
        const left = from.map((x, i) => i).filter((i) => !this.chosen.has(i) && !this.held(i));
        while (this.chosen.size < kit.choose && left.length) {
          const i = left.splice(Math.floor(Math.random() * left.length), 1)[0];
          this.chosen.add(i); if (this.problems().length) this.chosen.delete(i);
        }
      },
      ready() { return this.roll != null && !this.problems().length; },
      finish() {
        const g = this.gold(), picks = this.picks();
        [...this.dropW].sort((x, y) => y - x).forEach((i) => hero.weapons.splice(i, 1));
        const left = [...this.leave].map((i) => hero.special[i]), taken = [...this.fetch].map((i) => stored[i]);
        left.forEach((s) => LW.dropItem(hero, s));
        hero.stored = [...stored.filter((s, i) => !this.fetch.has(i)), ...left];
        if (!hero.stored.length) delete hero.stored;
        [...taken, ...[...this.gifts, ...picks].flatMap((x) => (x.meal ? [] : Array(x.n).fill(x.item)))].forEach((id) => {
          LW.putItem(hero, id);
          if (id === 'quiver') hero.arrows = LW.MAX_ARROWS; // a Quiver comes full
        });
        hero.meals += [...this.gifts, ...picks].reduce((t, x) => t + (x.meal || 0), 0);
        hero.gold = g.purse + this.draw;
        if (g.bank - this.draw) hero.storedGold = g.bank - this.draw; else delete hero.storedGold;
        return hero;
      },
    };
  };
})();
