/* Rules that differ between series (Kai, Magnakai), and the character who walks from book to book.
   Load after core.js and ui.js. The numbers are the books' own (docs/reference/rules-books.md,
   checked against the rules pages 2026-10-02). */
(function () {
  const LW = window.LW, { el, esc, wait } = LW.UI;

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
  /* In a Magnakai book the Magnakai Disciplines do the work; the Kai ones are taken as read. */
  LW.heals = (hero) => (hero.series === 'magnakai' ? LW.has(hero, 'curing') && 'Curing' : LW.has(hero, 'healing') && 'Healing');
  LW.hunts = (hero) => (hero.series === 'magnakai' ? LW.has(hero, 'huntmastery') && 'Huntmastery' : LW.has(hero, 'hunting') && 'Hunting');
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

  /* ---------- one dialog for a new character or a returning one ----------
     carry = the saved record from LW.Character.load(), or null for a fresh character. */
  LW.UI.chooseCharacter = function (book, carry) {
    const series = book.series || 'kai', S = LW.SERIES[series];
    const hero = carry ? JSON.parse(JSON.stringify(carry.hero)) : null;
    const owned = hero ? (hero[S.field] || []).slice() : [];
    const pick = Math.min(S.list.length - owned.length, owned.length ? 1 : S.first);
    const hadMastery = owned.includes('weaponmastery'), oldMastery = (hero && hero.mastery) || [];
    return new Promise((resolve) => {
      const back = el('div', 'lwo'), panel = el('div', 'lwo-panel lwo-hero');
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
      back.appendChild(panel); document.body.appendChild(back);
      const picked = new Set(), weapons = new Set(), rolls = { cs: hero ? 0 : null, ep: hero ? 0 : null };
      panel.innerHTML = `
        <p class="lwo-eyebrow">${esc(book.title)}</p>
        <h2>${hero ? 'Your Lone Wolf returns' : 'Your Action Chart'}</h2>
        <p class="lwo-note">${hero
          ? `Carried on from ${esc(carry.fromTitle || 'the last book')}: your scores, disciplines, weapons, Special Items and gold; the Backpack starts empty. ${pick ? `Choose ${pick === 1 ? 'one new' : pick} ${S.name} Discipline${pick === 1 ? '' : 's'}.` : 'You have mastered every discipline of this series.'}`
          : `Roll your two scores, then choose ${S.first} ${S.name} Disciplines.`}</p>
        <div class="hero-rolls">
          <button type="button" class="hero-roll" data-roll="cs" ${hero ? 'disabled' : ''}><span>Combat Skill</span><b>${hero ? hero.cs : '10 + ?'}</b></button>
          <button type="button" class="hero-roll" data-roll="ep" ${hero ? 'disabled' : ''}><span>Endurance</span><b>${hero ? hero.epMax : '20 + ?'}</b></button>
        </div>
        <div class="hero-discs"></div>
        <div class="hero-weapons" hidden><p class="lwo-note" style="margin:12px 0 6px"></p><div class="hero-wlist"></div></div>
        <div class="lwo-actions">
          <span class="hero-count" aria-live="polite"></span>
          <button type="button" class="lwo-btn ghost" data-act="auto">Choose for me</button>
          <button type="button" class="lwo-btn" data-act="go" disabled>Begin</button>
        </div>`;
      const discs = panel.querySelector('.hero-discs'), wbox = panel.querySelector('.hero-weapons'), wlist = panel.querySelector('.hero-wlist');
      S.list.forEach((id) => {
        const d = LW.DISCIPLINES[id], b = el('button', 'hero-disc', `<b>${esc(d.name)}</b><span>${esc(d.blurb)}</span>`);
        b.type = 'button'; b.dataset.id = id; discs.appendChild(b);
      });
      LW.WEAPONS.forEach((w) => { const b = el('button', 'lwo-btn ghost hero-w', esc(LW.itemName(w))); b.type = 'button'; b.dataset.w = w; b.style.cssText = 'padding:4px 10px;font-size:0.9rem;margin:0 6px 6px 0'; wlist.appendChild(b); });
      const count = panel.querySelector('.hero-count'), go = panel.querySelector('[data-act=go]');
      const wantWeapons = () => (picked.has('weaponmastery') ? 3 : hadMastery ? 1 : 0);
      const refresh = () => {
        discs.querySelectorAll('.hero-disc').forEach((b) => {
          const have = owned.includes(b.dataset.id), on = have || picked.has(b.dataset.id);
          b.setAttribute('aria-pressed', on); b.disabled = have || (!on && picked.size >= pick);
        });
        const need = Math.min(wantWeapons(), LW.WEAPONS.length - oldMastery.length);
        wbox.hidden = !need;
        wbox.querySelector('p').textContent = `Weaponmastery: choose ${need} weapon${need === 1 ? '' : 's'} to master.`;
        wlist.querySelectorAll('.hero-w').forEach((b) => {
          const had = oldMastery.includes(b.dataset.w), on = had || weapons.has(b.dataset.w);
          b.classList.toggle('ghost', !on); b.disabled = had || (!on && weapons.size >= need);
        });
        if (!need) weapons.clear();
        count.textContent = pick ? `${picked.size} of ${pick} chosen` : '';
        go.disabled = !(picked.size === pick && weapons.size === need && rolls.cs != null && rolls.ep != null);
      };
      const roll = async (btn, quick) => {
        const key = btn.dataset.roll, base = key === 'cs' ? 10 : 20, out = btn.querySelector('b');
        if (rolls[key] != null) return;
        const n = LW.rand10(); rolls[key] = n;
        if (!quick) for (let i = 0; i < 9; i++) { out.textContent = `${base} + ${LW.rand10()}`; await wait(45); }
        out.textContent = `${base + n}`; btn.classList.add('rolled'); btn.disabled = true; refresh();
      };
      const any = (set, pool, n) => { const left = pool.filter((p) => !set.has(p)); while (set.size < n && left.length) set.add(left.splice(Math.floor(Math.random() * left.length), 1)[0]); };
      panel.addEventListener('click', (e) => {
        const r = e.target.closest('.hero-roll'); if (r) return void roll(r);
        const d = e.target.closest('.hero-disc');
        if (d) { picked.has(d.dataset.id) ? picked.delete(d.dataset.id) : picked.size < pick && picked.add(d.dataset.id); return refresh(); }
        const w = e.target.closest('.hero-w');
        if (w) { weapons.has(w.dataset.w) ? weapons.delete(w.dataset.w) : weapons.add(w.dataset.w); return refresh(); }
        const a = e.target.closest('[data-act]'); if (!a) return;
        if (a.dataset.act === 'auto') {
          panel.querySelectorAll('.hero-roll:not(:disabled)').forEach((b) => roll(b, true));
          any(picked, S.list.filter((id) => !owned.includes(id)), pick);
          any(weapons, LW.WEAPONS.filter((x) => !oldMastery.includes(x)), Math.min(wantWeapons(), LW.WEAPONS.length - oldMastery.length));
          refresh();
        }
        if (a.dataset.act === 'go') {
          let out = hero;
          const kit = LW.KITS[book.number];
          if (!out) {
            // a fresh Magnakai character is already a Kai Master: all ten Kai Disciplines
            out = LW.makeHero({ csRoll: rolls.cs, epRoll: rolls.ep, disciplines: series === 'kai' ? [...picked] : LW.SERIES.kai.list.slice(), bonusItem: book.bonusItem });
            if (series !== 'kai') out.weaponskill = null;
            // makeHero gives Book 1's kit; a later book's own kit is all a new character has
            if (kit) Object.assign(out, { weapons: [], special: [], backpack: [], meals: 0, gold: 0 });
          }
          // the books carry over Weapons, Special Items and gold, not what was in the Backpack
          if (hero) { out.backpack = []; out.meals = 0; out.noPack = false; }
          out.series = series;
          out[S.field] = [...owned, ...picked];
          if (series === 'kai' && picked.has('weaponskill') && !out.weaponskill) out.weaponskill = LW.WEAPONSKILL_TABLE[LW.rand10()];
          out.mastery = [...oldMastery, ...weapons];
          delete out.found;
          const done = () => { settleCircles(out); out.ep = out.epMax; back.remove(); resolve(out); };
          // Book 11: a carried character sets out with what he has
          if (kit && !(hero && kit.newOnly)) { panel.remove(); kitStep(back, book, kit, out, !!hero).then(done); }
          else done();
        }
      });
      refresh();
    });
  };

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

  /* The second page of the character dialog: the book's gold and kit, what he keeps of his weapons,
     and what he leaves at or takes from the Monastery. Changes hero in place. */
  function kitStep(back, book, kit, hero, carried) {
    const limit = LW.specialLimit(hero), from = kit.from.map(entry);
    const gifts = kit.give.map(entry).filter((g) => g.meal || !LW.hasItem(hero, g.item));
    const had = kit.give.map(entry).filter((g) => !g.meal && LW.hasItem(hero, g.item));
    const roll = LW.rand10(), purse = Math.min(50, hero.gold + 10 + roll), over = hero.gold + 10 + roll - purse;
    const store = kit.store && (hero.stored || []).length + hero.special.length > 0, stored = hero.stored || [];
    const keepGold = kit.storeGold ? over : 0, bank = (hero.storedGold || 0) + keepGold;
    const chosen = new Set(), dropW = new Set(), leave = new Set(), fetch = new Set();
    let draw = 0;
    const kinds = (x) => (x.meal ? 'backpack' : LW.itemKind(x.item));
    const count = (kind, list) => list.filter((x) => kinds(x) === kind).reduce((t, x) => t + (x.meal || x.n), 0);
    const picks = () => [...chosen].map((i) => from[i]);
    const totals = () => ({
      weapon: hero.weapons.length - dropW.size + count('weapon', picks()),
      backpack: count('backpack', [...gifts, ...picks()]),
      special: hero.special.length - leave.size + fetch.size + count('special', [...gifts, ...picks()]),
    });
    const problems = () => {
      const t = totals(), out = [];
      if (t.weapon > LW.MAX_WEAPONS) out.push('Two Weapons at most: drop one.');
      if (t.backpack > LW.MAX_BACKPACK) out.push('Eight Backpack Items at most, Meals included.');
      if (t.special > limit) out.push(`${limit} Special Items at most: leave some at the Monastery.`);
      return out;
    };
    // a Special Item he has (and is not leaving behind) is not offered twice, unless it comes several at a time
    const held = (x) => !x.meal && x.n === 1 && kinds(x) === 'special' && hero.special.some((s, i) => s === x.item && !leave.has(i));

    const panel = el('div', 'lwo-panel lwo-hero');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    back.appendChild(panel);
    const chip = 'padding:4px 10px;font-size:0.9rem;margin:0 6px 6px 0', head = 'margin:12px 0 6px';
    const btn = (data, label, on, off) => `<button type="button" class="lwo-btn ${on ? '' : 'ghost'}" style="${chip}" ${data} aria-pressed="${!!on}" ${off ? 'disabled' : ''}>${esc(label)}</button>`;
    const and = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] || '');
    const draw1 = () => {
      const gift = and(gifts.map((g) => entryName(g)));
      const gold = `Gold Crowns: ${hero.gold} carried, and the book adds 10 + ${roll}.${over ? kit.storeGold ? ` ${over} over the Belt Pouch's 50 go to the Monastery.` : ` The Belt Pouch holds 50; ${over} are lost.` : ''}`;
      panel.innerHTML = `
        <p class="lwo-eyebrow">${esc(book.title)}</p>
        <h2>Your equipment</h2>
        <p class="lwo-note">${esc(gold)}${gift ? ` You are given ${esc(gift)}.` : ''}${had.length ? ` You have ${esc(and(had.map((g) => LW.itemName(g.item))))} already.` : ''}${kit.wear ? ` You wear ${esc(kit.wear)}.` : ''}</p>
        <p class="lwo-note" style="${head}">Choose up to ${kit.choose}:</p>
        <div>${from.map((x, i) => btn(`data-pick="${i}"`, entryName(x), chosen.has(i), !chosen.has(i) && (chosen.size >= kit.choose || held(x)))).join('')}</div>
        ${hero.weapons.length ? `<p class="lwo-note" style="${head}">Your Weapons: touch one to leave it behind.</p><div>${hero.weapons.map((w, i) => btn(`data-dropw="${i}"`, (dropW.has(i) ? 'Leave ' : 'Keep ') + LW.itemName(w), !dropW.has(i))).join('')}</div>` : ''}
        ${store ? `<p class="lwo-note" style="${head}">The Kai Monastery keeps Special Items safe, but they cannot be used there. Touch one to leave it or take it back.</p>
          <div>${hero.special.map((s, i) => btn(`data-leave="${i}"`, (leave.has(i) ? 'At the Monastery: ' : 'Carry ') + LW.itemName(s), !leave.has(i))).join('')}${stored.map((s, i) => btn(`data-fetch="${i}"`, (fetch.has(i) ? 'Carry ' : 'At the Monastery: ') + LW.itemName(s), fetch.has(i))).join('')}</div>` : ''}
        ${bank ? `<p class="lwo-note" style="${head}">Gold at the Monastery: ${bank - draw}. In your pouch: ${purse + draw}.
          <button type="button" class="lwo-btn ghost" style="${chip}" data-draw="-1" ${draw ? '' : 'disabled'}>Leave 1</button><button type="button" class="lwo-btn ghost" style="${chip}" data-draw="1" ${draw < bank && purse + draw < 50 ? '' : 'disabled'}>Take 1</button></p>` : ''}
        <div class="lwo-actions">
          <span class="hero-count" aria-live="polite">${esc(problems()[0] || `${chosen.size} of ${kit.choose} chosen`)}</span>
          <button type="button" class="lwo-btn ghost" data-kit="auto">Choose for me</button>
          <button type="button" class="lwo-btn" data-kit="go" ${problems().length ? 'disabled' : ''}>Begin</button>
        </div>`;
    };
    return new Promise((resolve) => {
      panel.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        const d = b.dataset, flip = (set, i) => (set.has(i) ? set.delete(i) : set.add(i));
        if (d.pick) flip(chosen, +d.pick);
        else if (d.dropw) flip(dropW, +d.dropw);
        else if (d.leave) flip(leave, +d.leave);
        else if (d.fetch) flip(fetch, +d.fetch);
        else if (d.draw) draw += +d.draw;
        else if (d.kit === 'auto') {
          const left = from.map((x, i) => i).filter((i) => !chosen.has(i) && !held(from[i]));
          while (chosen.size < kit.choose && left.length) {
            const i = left.splice(Math.floor(Math.random() * left.length), 1)[0];
            chosen.add(i); if (problems().length) chosen.delete(i);
          }
        } else if (d.kit === 'go') {
          [...dropW].sort((x, y) => y - x).forEach((i) => hero.weapons.splice(i, 1));
          const left = [...leave].map((i) => hero.special[i]), taken = [...fetch].map((i) => stored[i]);
          left.forEach((s) => LW.dropItem(hero, s));
          hero.stored = [...stored.filter((s, i) => !fetch.has(i)), ...left];
          if (!hero.stored.length) delete hero.stored;
          [...taken, ...[...gifts, ...picks()].flatMap((x) => (x.meal ? [] : Array(x.n).fill(x.item)))].forEach((id) => {
            LW.putItem(hero, id);
            if (id === 'quiver') hero.arrows = LW.MAX_ARROWS; // a Quiver comes full
          });
          hero.meals += [...gifts, ...picks()].reduce((t, x) => t + (x.meal || 0), 0);
          hero.gold = purse + draw;
          if (bank - draw) hero.storedGold = bank - draw; else delete hero.storedGold;
          panel.remove(); return resolve();
        } else return;
        draw1();
      });
      draw1();
    });
  }
})();
