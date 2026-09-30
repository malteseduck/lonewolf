/* Rules that differ between series (Kai, Magnakai), and the character who walks from book to book.
   Load after core.js and ui.js. The Magnakai numbers here are from memory: check them against
   the rules pages of the books before relying on them. */
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
  Object.assign(LW.ITEMS, { bow: { name: 'Bow', kind: 'weapon' }, quiver: { name: 'Quiver', kind: 'special' } });
  LW.WEAPONS = Object.keys(LW.ITEMS).filter((k) => LW.ITEMS[k].kind === 'weapon');

  const ids = (series) => Object.keys(LW.DISCIPLINES).filter((d) => LW.DISCIPLINES[d].series === series);
  LW.SERIES = {
    kai: { name: 'Kai', list: ids('kai'), first: 5, field: 'disciplines',
      ranks: ['', 'Novice', 'Intuite', 'Doan', 'Acolyte', 'Initiate', 'Aspirant', 'Guardian', 'Warmarn', 'Savant', 'Master'] },
    magnakai: { name: 'Magnakai', list: ids('magnakai'), first: 3, field: 'magnakai',
      ranks: ['', '', '', 'Kai Master Superior', 'Primate', 'Tutelary', 'Principalin', 'Mentora', 'Scion-kai', 'Archmaster', 'Kai Grand Master'] },
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
  /* 0 = no mind attack, 1 = Mindblast, 2 = Psi-surge */
  LW.mindPower = (hero) => (hero.series === 'magnakai' ? (LW.has(hero, 'psiSurge') ? 2 : 0) : LW.has(hero, 'mindblast') ? 1 : 0);

  LW.heroCS = (hero, ctx = {}) => {
    const parts = [{ label: 'Base', n: hero.cs }];
    if (!hero.weapons.length) parts.push({ label: 'Unarmed', n: -4 });
    else if (hero.series === 'magnakai' && LW.has(hero, 'weaponmastery') && hero.weapons.some((w) => (hero.mastery || []).includes(w))) parts.push({ label: 'Weaponmastery', n: 3 });
    else if (hero.series !== 'magnakai' && hero.weaponskill && hero.weapons.includes(hero.weaponskill)) parts.push({ label: 'Weaponskill', n: 2 });
    const circles = LW.circlesOf(hero).reduce((t, c) => t + c.cs, 0);
    if (circles) parts.push({ label: 'Lore-circles', n: circles });
    if (ctx.psiSurge) parts.push({ label: 'Psi-surge', n: 4 });
    else if (ctx.mindblast) parts.push({ label: 'Mindblast', n: 2 });
    if (ctx.enemy && ctx.enemy.mindforce && !LW.shielded(hero)) parts.push({ label: 'Mind attack', n: -ctx.enemy.mindforce });
    if (ctx.csMod) parts.push({ label: ctx.csNote || 'Circumstance', n: ctx.csMod });
    return { total: parts.reduce((t, p) => t + p.n, 0), parts };
  };
  /* Lore-circle ENDURANCE is added once, when a circle is completed. */
  function settleCircles(hero) {
    const ep = LW.circlesOf(hero).reduce((t, c) => t + c.ep, 0), by = ep - (hero.circleEp || 0);
    hero.epMax += by; hero.ep += by; hero.circleEp = ep;
  }

  /* ---------- the character who is carried between books ---------- */
  const KEY = 'lw-character';
  LW.Character = {
    load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
    save(hero, book) {
      const old = this.load(), done = new Set((old && old.completed) || []); done.add(book.id);
      try { localStorage.setItem(KEY, JSON.stringify({ hero, from: book.id, fromTitle: book.title, completed: [...done] })); } catch (e) { /* not kept */ }
    },
    clear() { try { localStorage.removeItem(KEY); } catch (e) { /* nothing kept */ } },
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
          ? `Carried on from ${esc(carry.fromTitle || 'the last book')}: your scores, disciplines, weapons, pack and gold. ${pick ? `Choose ${pick === 1 ? 'one new' : pick} ${S.name} Discipline${pick === 1 ? '' : 's'}.` : 'You have mastered every discipline of this series.'}`
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
        if (!quick) for (let i = 0; i < 9; i++) { out.textContent = `${base} + ${LW.rand10()}`; LW.sfx('roll'); await wait(45); }
        out.textContent = `${base + n}`; btn.classList.add('rolled'); btn.disabled = true; refresh();
      };
      const any = (set, pool, n) => { const left = pool.filter((p) => !set.has(p)); while (set.size < n && left.length) set.add(left.splice(Math.floor(Math.random() * left.length), 1)[0]); };
      panel.addEventListener('click', (e) => {
        const r = e.target.closest('.hero-roll'); if (r) return void roll(r);
        const d = e.target.closest('.hero-disc');
        if (d) { picked.has(d.dataset.id) ? picked.delete(d.dataset.id) : picked.size < pick && picked.add(d.dataset.id); LW.sfx('select'); return refresh(); }
        const w = e.target.closest('.hero-w');
        if (w) { weapons.has(w.dataset.w) ? weapons.delete(w.dataset.w) : weapons.add(w.dataset.w); LW.sfx('select'); return refresh(); }
        const a = e.target.closest('[data-act]'); if (!a) return;
        if (a.dataset.act === 'auto') {
          panel.querySelectorAll('.hero-roll:not(:disabled)').forEach((b) => roll(b, true));
          any(picked, S.list.filter((id) => !owned.includes(id)), pick);
          any(weapons, LW.WEAPONS.filter((x) => !oldMastery.includes(x)), Math.min(wantWeapons(), LW.WEAPONS.length - oldMastery.length));
          refresh();
        }
        if (a.dataset.act === 'go') {
          let out = hero;
          if (!out) {
            // a fresh Magnakai character is already a Kai Master: all ten Kai Disciplines
            out = LW.makeHero({ csRoll: rolls.cs, epRoll: rolls.ep, disciplines: series === 'kai' ? [...picked] : LW.SERIES.kai.list.slice(), bonusItem: book.bonusItem });
            if (series !== 'kai') { out.weaponskill = null; out.weapons = ['sword']; out.gold = 10 + LW.rand10(); out.simpleKit = true; }
          }
          out.series = series;
          out[S.field] = [...owned, ...picked];
          if (series === 'kai' && picked.has('weaponskill') && !out.weaponskill) out.weaponskill = LW.WEAPONS[Math.floor(Math.random() * LW.WEAPONS.length)];
          out.mastery = [...oldMastery, ...weapons];
          settleCircles(out);
          out.ep = out.epMax; delete out.found;
          back.remove(); resolve(out);
        }
      });
      refresh();
    });
  };
})();
