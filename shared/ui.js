/* Widgets both prototypes share: sound, Random Number Table, character creation, Action Chart. */
(function () {
  const LW = (window.LW = window.LW || {});

  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Sound: a few square-wave blips ---------- */
  let ac = null;
  LW.sound = { on: true };
  try { LW.sound.on = localStorage.getItem('lw-sound') !== 'off'; } catch (e) { /* default on */ }
  LW.setSound = (on) => {
    LW.sound.on = on;
    try { localStorage.setItem('lw-sound', on ? 'on' : 'off'); } catch (e) { /* not remembered */ }
  };
  const SFX = {
    select: [[660, 0.05]],
    roll: [[420, 0.03]],
    hit: [[200, 0.07, 'sawtooth'], [130, 0.1, 'sawtooth']],
    hurt: [[95, 0.2, 'sawtooth']],
    heal: [[520, 0.08, 'triangle'], [780, 0.14, 'triangle']],
    page: [[240, 0.04, 'triangle']],
    win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.28]],
    lose: [[330, 0.2], [262, 0.2], [196, 0.45]],
    battle: [[196, 0.08], [233, 0.08], [277, 0.08], [330, 0.2]],
  };
  LW.sfx = (name) => {
    if (!LW.sound.on || !SFX[name]) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      let t = ac.currentTime;
      for (const [freq, dur, type] of SFX[name]) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'square'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
        t += dur;
      }
    } catch (e) { /* audio unavailable */ }
  };

  function overlay(cls) {
    const back = el('div', 'lwo');
    const panel = el('div', 'lwo-panel ' + (cls || ''));
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    back.appendChild(panel);
    document.body.appendChild(back);
    return { back, panel, close() { back.remove(); } };
  }

  /* ---------- Random Number Table: point at a hidden square ---------- */
  function pickRandom({ title = 'Random Number Table', note = 'Point at a square.' } = {}) {
    return new Promise((resolve) => {
      const o = overlay('lwo-rnt');
      o.panel.innerHTML = `<h2>${esc(title)}</h2><p class="lwo-note">${esc(note)}</p><div class="rnt"></div>`;
      const grid = o.panel.querySelector('.rnt');
      let done = false;
      for (let i = 0; i < 100; i++) {
        const b = el('button', 'rnt-cell');
        b.type = 'button'; b.setAttribute('aria-label', 'Pick this square');
        b.addEventListener('click', async () => {
          if (done) return;
          done = true;
          const n = LW.rand10();
          b.textContent = n; b.classList.add('picked'); grid.classList.add('done');
          LW.sfx('select');
          await wait(850);
          o.close(); resolve(n);
        });
        grid.appendChild(b);
      }
      grid.children[44].focus();
    });
  }

  /* ---------- Character creation ---------- */
  function createHero(book) {
    return new Promise((resolve) => {
      const o = overlay('lwo-hero');
      const picked = new Set();
      const rolls = { cs: null, ep: null };
      o.panel.innerHTML = `
        <p class="lwo-eyebrow">${esc(book.title)}</p>
        <h2>Your Action Chart</h2>
        <p class="lwo-note">Roll your two scores, then choose the five Kai Disciplines you mastered before the monastery fell.</p>
        <div class="hero-rolls">
          <button type="button" class="hero-roll" data-roll="cs"><span>Combat Skill</span><b>10 + ?</b></button>
          <button type="button" class="hero-roll" data-roll="ep"><span>Endurance</span><b>20 + ?</b></button>
        </div>
        <div class="hero-discs"></div>
        <div class="lwo-actions">
          <span class="hero-count" aria-live="polite"></span>
          <button type="button" class="lwo-btn ghost" data-act="auto">Choose for me</button>
          <button type="button" class="lwo-btn" data-act="go" disabled>Begin</button>
        </div>`;
      const discs = o.panel.querySelector('.hero-discs');
      for (const id in LW.DISCIPLINES) {
        const d = LW.DISCIPLINES[id];
        const b = el('button', 'hero-disc', `<b>${esc(d.name)}</b><span>${esc(d.blurb)}</span>`);
        b.type = 'button'; b.dataset.id = id; b.setAttribute('aria-pressed', 'false');
        discs.appendChild(b);
      }
      const count = o.panel.querySelector('.hero-count');
      const go = o.panel.querySelector('[data-act=go]');
      const refresh = () => {
        discs.querySelectorAll('.hero-disc').forEach((b) => {
          const on = picked.has(b.dataset.id);
          b.setAttribute('aria-pressed', on);
          b.disabled = !on && picked.size >= 5;
        });
        count.textContent = `${picked.size} of 5 disciplines`;
        go.disabled = !(picked.size === 5 && rolls.cs != null && rolls.ep != null);
      };
      const roll = async (btn, quick) => {
        const key = btn.dataset.roll, base = key === 'cs' ? 10 : 20, out = btn.querySelector('b');
        if (rolls[key] != null) return;
        const n = LW.rand10();
        rolls[key] = n;
        if (!quick) for (let i = 0; i < 9; i++) { out.textContent = `${base} + ${LW.rand10()}`; LW.sfx('roll'); await wait(45); }
        out.textContent = `${base + n}`; btn.classList.add('rolled'); btn.disabled = true;
        refresh();
      };
      o.panel.addEventListener('click', (e) => {
        const r = e.target.closest('.hero-roll'); if (r) return void roll(r);
        const d = e.target.closest('.hero-disc');
        if (d) { picked.has(d.dataset.id) ? picked.delete(d.dataset.id) : picked.size < 5 && picked.add(d.dataset.id); LW.sfx('select'); return refresh(); }
        const a = e.target.closest('[data-act]'); if (!a) return;
        if (a.dataset.act === 'auto') {
          o.panel.querySelectorAll('.hero-roll').forEach((b) => roll(b, true));
          const ids = Object.keys(LW.DISCIPLINES);
          while (picked.size < 5) picked.add(ids[Math.floor(Math.random() * ids.length)]);
          refresh();
        }
        if (a.dataset.act === 'go') {
          const hero = LW.makeHero({ csRoll: rolls.cs, epRoll: rolls.ep, disciplines: [...picked], bonusItem: book.bonusItem });
          o.close(); resolve(hero);
        }
      });
      refresh();
    });
  }

  /* ---------- Action Chart ---------- */
  function chartHTML(game) {
    const h = game.hero;
    const cs = LW.heroCS(h);
    const mods = cs.parts.slice(1).map((p) => `${p.n > 0 ? '+' : ''}${p.n} ${esc(p.label)}`).join(', ');
    const pct = Math.max(0, Math.round((h.ep / h.epMax) * 100));
    const li = (s) => `<li>${s}</li>`;
    const potionCount = h.backpack.filter((i) => i === 'potion').length;
    const pack = [];
    if (h.meals) pack.push(li(`Meal${h.meals > 1 ? ' ×' + h.meals : ''}`));
    if (potionCount) pack.push(li(`Laumspur Potion${potionCount > 1 ? ' ×' + potionCount : ''} <button type="button" class="chart-btn" data-act="potion" ${h.ep >= h.epMax ? 'disabled' : ''}>Drink +4</button>`));
    return `
      <div class="chart-stats">
        <div class="chart-stat"><span class="k">Combat Skill</span><span class="v">${cs.total}</span><span class="n">${mods || '&nbsp;'}</span></div>
        <div class="chart-stat"><span class="k">Endurance</span><span class="v">${Math.max(0, h.ep)}<small>/${h.epMax}</small></span><span class="chart-bar"><i style="width:${pct}%"></i></span></div>
        <div class="chart-stat"><span class="k">Gold Crowns</span><span class="v">${h.gold}</span><span class="n">belt pouch, 50 max</span></div>
      </div>
      <h3>Kai Disciplines</h3>
      <ul class="chart-list discs">${h.disciplines.map((d) => li(`<b>${esc(LW.DISCIPLINES[d].name)}</b>${d === 'weaponskill' ? ` <i>(${esc(LW.ITEMS[h.weaponskill].name)})</i>` : ''}`)).join('')}</ul>
      <h3>Weapons <small>${h.weapons.length}/2</small></h3>
      <ul class="chart-list">${h.weapons.map((w) => li(`${esc(LW.ITEMS[w].name)} <button type="button" class="chart-btn" data-act="drop" data-id="${w}">Drop</button>`)).join('') || li('<i>None: −4 Combat Skill</i>')}</ul>
      <h3>Backpack <small>${h.backpack.length + h.meals}/8</small></h3>
      <ul class="chart-list">${pack.join('') || li('<i>Empty</i>')}</ul>
      <h3>Special Items</h3>
      <ul class="chart-list">${h.special.map((s) => li(esc(LW.ITEMS[s].name))).join('')}</ul>`;
  }
  function bindChart(node, game, onChange) {
    node.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b || !node.contains(b)) return;
      if (b.dataset.act === 'potion' && game.usePotion()) { LW.sfx('heal'); onChange(); }
      if (b.dataset.act === 'drop') { game.dropWeapon(b.dataset.id); onChange(); }
    });
  }

  let toastTimer = null;
  function toast(msg) {
    let t = document.querySelector('.lw-toast');
    if (!t) { t = el('div', 'lw-toast'); t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  LW.UI = { el, wait, esc, pickRandom, createHero, chartHTML, bindChart, toast };
})();
