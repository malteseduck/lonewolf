/* Menu-driven battle screen in the old console-RPG manner, run on the gamebook's own
   combat rules: each round is one Random Number looked up against the combat ratio. */
(function () {
  const LW = (window.LW = window.LW || {});
  const { el, wait, esc } = LW.UI;
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const article = (name) => (/^[aeiou]/i.test(name) ? 'An' : 'A');

  /* The screen wipe from the 1993 Turbo Pascal version: four arms sweep round from the centre. */
  async function wipe(cv) {
    const w = (cv.width = window.innerWidth), h = (cv.height = window.innerHeight);
    const ctx = cv.getContext('2d');
    const R = Math.hypot(w, h);
    ctx.fillStyle = '#000';
    if (still()) { ctx.fillRect(0, 0, w, h); return; }
    const t0 = performance.now(), dur = 620;
    await new Promise((done) => {
      (function frame(now) {
        const k = Math.min(1, (now - t0) / dur);
        for (let arm = 0; arm < 4; arm++) {
          const a0 = (arm * Math.PI) / 2;
          ctx.beginPath(); ctx.moveTo(w / 2, h / 2);
          ctx.arc(w / 2, h / 2, R, a0 - (k * Math.PI) / 2 - 0.02, a0 + 0.02);
          ctx.closePath(); ctx.fill();
        }
        k < 1 ? requestAnimationFrame(frame) : done();
      })(t0);
    });
  }

  async function run(opts) {
    const hero = opts.hero;
    const prevFocus = document.activeElement;
    const root = el('div', 'lwb');
    root.innerHTML = `
      <canvas class="lwb-wipe"></canvas>
      <div class="lwb-screen" hidden>
        <div class="lwb-hud lwb-win">
          <span class="lwb-name">Lone Wolf</span>
          <span>EP <b data-h="ep"></b></span>
          <span>CS <b data-h="cs"></b></span>
          <span>Ratio <b data-h="ratio"></b></span>
        </div>
        <div class="lwb-field">
          <div class="lwb-die lwb-win" hidden></div>
          <div class="lwb-sprite"></div>
          <div class="lwb-plate lwb-win"><span data-f="name"></span><span class="lwb-bar"><i></i></span><span data-f="ep"></span></div>
        </div>
        <div class="lwb-low">
          <div class="lwb-cmd lwb-win" role="menu" aria-label="Commands"></div>
          <div class="lwb-msg lwb-win" aria-live="polite"></div>
        </div>
      </div>`;
    document.body.appendChild(root);
    const $ = (s) => root.querySelector(s);
    const screen = $('.lwb-screen'), field = $('.lwb-field'), spriteBox = $('.lwb-sprite');
    const cmd = $('.lwb-cmd'), msg = $('.lwb-msg'), die = $('.lwb-die');

    LW.sfx('battle');
    await wipe($('.lwb-wipe'));
    field.style.backgroundImage = `url(${LW.Art.scene(opts.scene).toDataURL()})`;
    screen.hidden = false;
    $('.lwb-wipe').classList.add('gone');

    /* --- text window: types out, click or key to hurry --- */
    let hurry = null;
    root.addEventListener('pointerdown', (e) => { if (!e.target.closest('button') && hurry) hurry(); });
    root.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && hurry && !cmd.children.length) { e.preventDefault(); hurry(); }
    });
    async function say(text, hold = 750) {
      msg.textContent = '';
      let fast = still();
      hurry = () => { fast = true; };
      for (const ch of text) { msg.textContent += ch; if (!fast) await wait(14); }
      await Promise.race([wait(hold), new Promise((r) => { hurry = r; })]);
      hurry = null;
    }

    /* --- command window --- */
    function menu(items) {
      return new Promise((res) => {
        cmd.innerHTML = '';
        items.forEach((it) => {
          const b = el('button', 'lwb-opt', esc(it.label));
          b.type = 'button'; b.disabled = !!it.disabled; b.setAttribute('role', 'menuitem');
          b.addEventListener('click', () => { LW.sfx('select'); cmd.innerHTML = ''; res(it.id); });
          cmd.appendChild(b);
        });
        const live = [...cmd.querySelectorAll('button:not(:disabled)')];
        cmd.onkeydown = (e) => {
          const i = live.indexOf(document.activeElement);
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); live[(i + 1) % live.length].focus(); }
          if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); live[(i - 1 + live.length) % live.length].focus(); }
        };
        live[0].focus();
      });
    }

    async function roll() {
      const n = LW.rand10();
      die.hidden = false;
      if (!still()) for (let i = 0; i < 9; i++) { die.textContent = LW.rand10(); LW.sfx('roll'); await wait(45); }
      die.textContent = n;
      await wait(260);
      return n;
    }

    let foe = null, mind = LW.has(hero, 'mindblast'), rounds = 0;
    const blasting = () => mind && !foe.immune;
    const ratio = () => LW.heroCS(hero, { mindblast: blasting(), enemy: foe, csMod: opts.csMod, csNote: opts.csNote }).total - foe.cs;
    function hud() {
      const r = ratio();
      $('[data-h=ep]').textContent = `${Math.max(0, hero.ep)}/${hero.epMax}`;
      $('[data-h=cs]').textContent = r + foe.cs;
      $('[data-h=ratio]').textContent = (r > 0 ? '+' : '') + r;
      $('[data-f=name]').textContent = `${foe.name}  CS ${foe.cs}`;
      $('[data-f=ep]').textContent = `EP ${Math.max(0, foe.ep)}`;
      $('.lwb-bar i').style.width = Math.max(0, (foe.ep / foe.max) * 100) + '%';
      root.classList.toggle('low', hero.ep <= hero.epMax / 4);
    }
    const flash = async (node, cls, ms) => { node.classList.add(cls); await wait(ms); node.classList.remove(cls); };

    async function finish(outcome, line) {
      LW.sfx(outcome === 'dead' ? 'lose' : outcome === 'win' ? 'win' : 'select');
      await say(line, 1300);
      root.classList.add('out');
      await wait(still() ? 0 : 350);
      root.remove();
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      return { outcome, rounds };
    }

    for (let i = 0; i < opts.enemies.length; i++) {
      foe = Object.assign({}, opts.enemies[i]); foe.max = foe.ep;
      spriteBox.innerHTML = ''; spriteBox.className = 'lwb-sprite';
      spriteBox.appendChild(LW.Art.sprite(foe.sprite));
      hud();
      await say(i ? `${article(foe.name)} ${foe.name} takes its place!` : `${article(foe.name)} ${foe.name} attacks!`);
      if (foe.mindforce) {
        await say(LW.has(hero, 'mindshield')
          ? 'Its mind-attack breaks against your Mindshield.'
          : `Its mind-attack gnaws at your will. Combat Skill −${foe.mindforce}.`, 1100);
      }
      if (i === 0 && opts.csMod) await say(`${opts.csNote}: Combat Skill ${opts.csMod > 0 ? '+' : '−'}${Math.abs(opts.csMod)}.`, 1000);

      while (foe.ep > 0 && hero.ep > 0) {
        hud();
        msg.textContent = 'Command?';
        const evadeOpen = opts.evade && rounds >= opts.evade.after;
        const hasPotion = hero.backpack.includes('potion');
        const items = [{ id: 'fight', label: 'Fight' }];
        if (LW.has(hero, 'mindblast')) items.push({ id: 'mind', label: `Mindblast: ${blasting() ? 'on' : 'off'}` });
        items.push({ id: 'item', label: 'Laumspur', disabled: !hasPotion || hero.ep >= hero.epMax });
        items.push({ id: 'evade', label: opts.evade && !evadeOpen ? `Evade (round ${opts.evade.after + 1})` : 'Evade', disabled: !evadeOpen });
        const act = await menu(items);

        if (act === 'mind') {
          if (foe.immune) { await say(`The ${foe.name} has no mind you can reach.`); continue; }
          mind = !mind; hud();
          await say(mind ? 'You gather your will into a point. Combat Skill +2.' : 'You let the Mindblast fade.');
          continue;
        }
        if (act === 'item') {
          hero.backpack.splice(hero.backpack.indexOf('potion'), 1);
          hero.ep = Math.min(hero.epMax, hero.ep + LW.ITEMS.potion.heal);
          LW.sfx('heal'); hud();
          await say('You swallow the Laumspur. 4 Endurance restored.');
          continue;
        }

        const n = await roll();
        const res = LW.combatRound(ratio(), n);
        rounds++;

        if (act === 'evade') {
          const loss = Math.min(res.hero, hero.ep);
          hero.ep -= loss; hud();
          if (loss) { LW.sfx('hurt'); flash(root, 'shake', 320); }
          await say(loss ? `You break away. The ${foe.name} catches you for ${loss} as you turn.` : 'You break away untouched.');
          die.hidden = true;
          if (hero.ep <= 0) break;
          return finish('evade', 'You escape the fight.');
        }

        const dealt = Math.min(res.enemy, foe.ep), taken = Math.min(res.hero, hero.ep);
        foe.ep -= dealt; hud();
        if (dealt) { LW.sfx('hit'); flash(spriteBox, 'struck', 360); }
        await say(res.enemy === Infinity ? `A killing blow! The ${foe.name} drops where it stands.`
          : dealt ? `You strike! The ${foe.name} loses ${dealt} Endurance.` : `You strike, but the ${foe.name} turns the blow.`);
        if (foe.ep > 0 || taken) {
          hero.ep -= taken; hud();
          if (taken) { LW.sfx('hurt'); flash(root, 'shake', 320); }
          await say(res.hero === Infinity ? `The ${foe.name} finds the gap in your guard. It is a mortal wound.`
            : taken ? `The ${foe.name} hits back. You lose ${taken} Endurance.` : `The ${foe.name} lunges and misses.`);
        }
        die.hidden = true;
      }
      if (hero.ep <= 0) return finish('dead', 'Your life and your quest end here.');
      spriteBox.classList.add('slain');
      await say(`The ${foe.name} is slain.`, 900);
    }
    return finish('win', 'You have won the fight.');
  }

  LW.Battle = { run };
})();
