/* The fight: its set-up from the section's combat and the hero, each round, and how it ends.
   main.js draws it and animates between the steps (a round is roll, strike, suffer, then advance
   once the fallen foe has faded); the rules are all here (docs/reference/rules-engine.md, "Combat
   procedure"). Load after rules-series.js. */
(function () {
  const LW = window.LW;

  LW.ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  // the most the Combat Ratio counts for: the owner's house rule, so the Sommerswerd does not make
  // the early books' fights a walk (ruling R1). The table's "+11 or more" column is never reached.
  LW.RATIO_CAP = 10;

  // a loss multiplied (doubled, halved, ignored): a killing blow stays one unless it is ignored; halves round down
  const times = (n, k) => (k === 1 ? n : k === 0 ? 0 : n === Infinity ? n : Math.floor(n * k));
  const word = (k) => ({ 2: 'doubled', 3: 'tripled', 0.5: 'halved' }[k] || `times ${k}`);
  /* what a round's change does, in our words, for the log */
  const describe = (p) => [p.unarmed && 'you fight bare-handed', p.csMod && `Combat Skill ${p.csMod > 0 ? 'plus' : 'less'} ${Math.abs(p.csMod)}`,
    p.heroLoss === 0 && 'your losses do not count', p.heroLoss && p.heroLoss !== 1 && `your losses ${word(p.heroLoss)}`,
    p.foeLoss === 0 && 'its losses do not count', p.foeLoss && p.foeLoss !== 1 && `its losses ${word(p.foeLoss)}`,
    p.heroPlus && `every wound costs you ${p.heroPlus} more`, p.heroEach && `you lose ${p.heroEach} Endurance every round`,
    p.foeEach && `it loses ${p.foeEach} more every round`, p.psi && `your mind's attack ${word(p.psi)}`,
    p.fatal && `every wound the dice deal draws again: ${p.fatal.join(' or ')} is death`, p.offMax && 'what you lose comes off your Endurance for good'].filter(Boolean).join(', ');

  /* combat.kind: what the fight is, for its words and the page's drawing only; the numbers are the same.
     An obstacle (a door broken down, Book 6's 156, Book 7's 214) is fought by the normal rules, his losses
     the effort; leaving it costs no blow and Mindblast does not touch it (rulings R23, R24). A contest
     (arm-wrestling, an archery final) and a fight of the mind are named as such. `line` words a round:
     what he did to it, what it cost him; Infinity is the table's outright result. combat.act: the
     Strike medallion's {label, note} for this fight (Batter, Heave). */
  const KINDS = {
    fight: { act: 'Strike', note: 'attack', ep: 'EP', wounds: true, lunge: true,
      win: ['The way is clear', 'Your enemy lies dead at your feet.'], away: ['You are away', 'You leave the fight behind you.'], won: 'The fight is won', left: 'You break away from the fight',
      line: (foe, d, t, kd, kt) => `${kd ? 'A killing blow' : d ? `${foe} loses ${d}` : 'Your blow is turned'}; ${kt ? 'but it finds the gap in your guard' : t ? `you lose ${t}` : 'you are untouched'}` },
    obstacle: { act: 'Force', note: 'put your strength to it', ep: 'Resistance', leave: 'Leave it', leaveNote: 'at no cost',
      win: ['The way is open', 'At last it gives way.'], away: ['You leave it be', 'You go on another way.'], won: 'It gives way', left: 'You leave it be',
      line: (foe, d, t, kd, kt) => `${kd ? `${foe} gives way at once` : d ? `${foe} gives ${d}` : `${foe} holds`}; ${kt ? 'but the effort is too much for you' : t ? `the effort costs you ${t}` : 'you keep your strength'}` },
    contest: { act: 'Contend', note: 'try your strength', ep: 'EP', lunge: true,
      win: ['The contest is yours', 'You have the better of it.'], away: ['You are away', 'You leave the contest.'], won: 'The contest is won', left: 'You leave the contest',
      line: (foe, d, t, kd, kt) => `${kd ? 'You carry it outright' : d ? `${foe} loses ${d}` : `${foe} holds`}; ${kt ? 'but you are beaten outright' : t ? `you lose ${t}` : 'you hold'}` },
    mind: { act: 'Will', note: 'press your mind', ep: 'EP', lunge: true,
      win: ['Your will prevails', 'Its mind gives way before yours.'], away: ['You are away', 'You draw your mind back.'], won: 'The fight is won', left: 'You break away from the fight',
      line: (foe, d, t, kd, kt) => `${kd ? 'Your will overwhelms it' : d ? `Your will costs ${foe} ${d}` : `${foe} withstands your will`}; ${kt ? 'but its will overwhelms yours' : t ? `its will costs you ${t}` : 'your mind holds'}` },
  };
  LW.FIGHT_KINDS = KINDS;

  class Fight {
    constructor(game, bookId) {
      const sec = game.section, hero = game.hero;
      let c = sec.combat;
      this.game = game; this.bookId = bookId; this.hero = hero; this.c = c;
      this.kind = c.kind || (c.mind ? 'mind' : c.points ? 'contest' : 'fight');
      this.words = Object.assign({}, KINDS[this.kind], c.act && c.act.label && { act: c.act.label }, c.act && c.act.note && { note: c.act.note }, c.points && { ep: 'Points' });
      // the fight's own adjustment, unless he carries what the text says spares him it (a torch), or
      // it is the text's "unarmed" penalty and he has no weapon anyway (heroCS already counts that)
      const spared = (c.unless || []).length && c.unless.every((i) => LW.hasItem(hero, i));
      // Huntmastery: what a surprise attack or ambush costs (combat.ambush) is not lost
      const ambush = c.ambush && c.csMod < 0 && this.huntmaster();
      // the text's own conditions: "if you have Animal Control, add 2" (csIf), "unless you have Mindshield, deduct 2" (csUnless)
      const missed = c.csIf && !LW.meets(hero, c.csIf), excused = c.csUnless && LW.meets(hero, c.csUnless);
      this.csMod = spared || ambush || missed || excused || (c.unarmed && !LW.armedWith(hero)) ? 0 : c.csMod;
      this.note = c.csIf ? LW.condName(c.csIf) : c.csNote; // a discipline's bonus is named after it
      // mind: 0 at rest, 1 Mindblast, 2 Psi-surge. power is the most this character can do (noMind: nothing here)
      this.power = c.mind || c.noMind ? 0 : LW.mindPower(hero); this.mind = this.power ? 1 : 0;
      // breath: rounds he lasts (the number drawn here, 0 as 10, with the section's bonuses; drawn now if
      // not yet), then `each` more lost every round after (Book 4's underwater fights)
      if (c.breath) {
        if (game.s.rolled == null) game.setRolled(LW.rand10());
        this.breath = (game.s.drawn || 10) + game.s.rolled - game.s.drawn;
        this.c = c = Object.assign({}, c, { rounds: [...(c.rounds || []), { from: this.breath + 1, heroEach: c.breath.each, note: 'Out of breath' }] });
      }
      this.i = -1; this.foe = null; this.rounds = 0; this.log = []; this.over = null; this.stopTo = null;
      this.lost = { hero: 0, foe: 0 }; this.tally = []; this.startEp = hero.ep; this.boosted = null;
      // points: a contest scored in target points ({n, lose}): they stand in for his Endurance while it lasts
      if (c.points) { this.saved = hero.ep; hero.ep = c.points.n; }
      this.ctx = { with: c.with, noShield: c.noShield, noUnarmed: c.noUnarmed && (c.noUnarmed === true || LW.meets(hero, c.noUnarmed)),
        weaponCs: c.weaponCs, plain: c.plain, only: c.only, barred: c.barred, lend: c.lend };
      this.weapon = c.mind ? null : LW.armedWith(hero, this.ctx);
      // noStrike: under this Condition he cannot fight it (Book 5's 162, a dead arm): only a way out is left
      this.noStrike = !!(c.noStrike && LW.meets(hero, c.noStrike));
      // keep: the foes' wounds are kept under this name, and a later fight with the same foes starts from them
      const kept = c.keep && (game.s.kept || {})[c.keep];
      // an obstacle has no mind: Mindblast cannot touch it, Psi-surge (which shakes things apart) can (ruling R24)
      const mindless = this.kind === 'obstacle' && { immune: 'mindblast' };
      this.foes = c.enemies.map((e, i) => Object.assign({}, mindless, e, { max: e.ep, at: i }, kept && kept[i] != null ? { ep: kept[i] } : {})).filter((e, i) => !kept || (i < kept.length && e.ep > 0));
      this.bring();
      const log = this.log, csMod = this.csMod;
      if (kept) log.push('These foes still carry the wounds you gave them.');
      if (this.breath) { const d = game.s.drawn, plus = game.s.rolled - d; log.push(`You drew ${d}${d ? '' : ' (10)'}${plus ? `, ${plus} added` : ''}: you can hold your breath for ${this.breath} rounds.`); }
      if (this.foe.mindforce) log.push(LW.shielded(hero) ? 'Its will breaks against your Mindshield.' : `Its will presses on yours: Combat Skill less ${this.foe.mindforce}.`);
      if (csMod) log.push(`${this.note}: Combat Skill ${csMod > 0 ? 'plus' : 'less'} ${Math.abs(csMod)}.`);
      else if (spared) log.push(`Your ${c.unless.map(LW.itemName).join(' and ')} spare you the penalty.`);
      else if (ambush) log.push('Huntmastery: the ambush does not catch you off guard.');
      else if (excused && c.csMod) log.push(`${LW.condName(c.csUnless)}: you are spared the penalty.`);
      if (c.noMind && LW.mindPower(hero)) log.push('No attack of the mind tells here.');
      if (mindless && this.power) log.push(`It has no mind: Mindblast cannot touch it${this.power === 2 ? `, but ${LW.psi(hero).name} can shake it apart` : ''}.`);
      if (c.mind) log.push('A fight of the mind: no weapon or armour counts.');
      else if (c.with === 'none' && mindless) log.push(this.ctx.noUnarmed ? 'Your bare hands only, and you lose nothing by it.' : 'Your bare hands only.');
      else if (c.with === 'none') log.push(this.ctx.noUnarmed ? 'You fight bare-handed, and lose nothing by it.' : 'You fight bare-handed.');
      else if (c.with) log.push(this.weapon ? `Only your ${LW.itemName(c.with)} can harm it.` : `Only the ${LW.itemName(c.with)} can harm it, and you do not have it.`);
      // the weapon of the first round: one out of reach then is not named (Book 12's 75)
      const first = this.inHand(1);
      if (first && LW.ITEMS[first] && (LW.ITEMS[first].cs || c.lend)) log.push(`You fight with the ${LW.itemName(first)}.`);
      this.changes(1);
    }

    huntmaster() { return LW.chose(this.hero, 'huntmastery'); }
    /* the next foe of the list, a copy, so the book's own numbers stay as printed */
    bring() { this.i++; this.foe = this.foes[this.i]; }

    /* c.rounds: what holds for some rounds only, or for the whole fight under a condition: [{from, upTo
       (round numbers, 1 first), fromFoe (the list's index), if, unless (Conditions), came (only when he came from one of
       these sections), ambush (Huntmastery
       spares it), mind (only while a mind attack is used; 2: only the full Psi-surge or Kai-surge), csMod, note, unarmed, heroLoss, foeLoss
       (multipliers: 0 ignores, 2 doubles, 0.5 halves), heroPlus (more for every wound), heroEach, foeEach
       (lost every round), psi (what the mind's attack adds is multiplied), fatal (numbers drawn again after a
       round the table would have wounded him in, whatever heroLoss makes of it, that kill him), behind (only if
       he had lost more than the foes by the end of that round), offMax (his losses lower his maximum too)}] */
    phases(round = this.rounds + 1) {
      const hero = this.hero, ctx = { weapon: this.weapon };
      return (this.c.rounds || []).filter((p) => (!p.from || round >= p.from) && (!p.upTo || round <= p.upTo) && (p.fromFoe == null || this.i >= p.fromFoe)
        && (!p.if || LW.meets(hero, p.if, ctx)) && !(p.unless && LW.meets(hero, p.unless, ctx)) && (!p.came || p.came.includes(this.game.came())) && !(p.ambush && this.huntmaster()) && (!p.mind || (p.mind === 2 ? this.blasting() === 2 : this.blasting()))
        && (!p.behind || (this.tally[p.behind - 1] && this.tally[p.behind - 1].hero > this.tally[p.behind - 1].foe)));
    }
    /* the changes that begin with this round, and those that end, for the log */
    changes(round) {
      const now = this.phases(round), was = round > 1 ? this.phases(round - 1) : [];
      for (const p of was.filter((x) => !now.includes(x) && describe(x))) this.log.push(`${p.note ? p.note + ': ' : ''}that is over.`);
      for (const p of now.filter((x) => !was.includes(x) && describe(x))) this.log.push(`${p.note ? p.note + ': ' : ''}${describe(p).replace(/^./, (m) => m.toUpperCase())}${p.upTo ? ` (to round ${LW.ROMAN[p.upTo - 1]})` : ''}.`);
    }
    product(key, round) { return this.phases(round).reduce((k, p) => (p[key] == null ? k : k * p[key]), 1); }
    sum(key, round) { return this.phases(round).reduce((t, p) => t + (p[key] || 0), 0); }

    // immune: true, to every attack of the mind; 'mindblast', to Mindblast only (Psi-surge still tells);
    // 'psi', to Mindblast and Psi-surge (only a Grand Master's Kai-surge tells)
    static allDeaf(foe, hero) { return foe.immune === true || (foe.immune === 'psi' && !LW.psi(hero).kai); }
    /* the foe no mind attack of his can touch: immune to all, or to Mindblast when that is all he has */
    deaf() { return Fight.allDeaf(this.foe, this.hero) || (!!this.foe.immune && this.power === 1); }
    blasting() { return Fight.allDeaf(this.foe, this.hero) || (this.foe.immune && this.mind === 1) ? 0 : this.mind; }
    /* his COMBAT SKILL, worked out (heroCS's {total, parts}) for a round, the next one by default */
    parts(round = this.rounds + 1) {
      const hero = this.hero, ph = this.phases(round), more = ph.filter((p) => p.csMod).map((p) => ({ label: p.note || 'This round', n: p.csMod }));
      if (this.boosted) more.push({ label: LW.itemName(this.boosted.id), n: this.boosted.n });
      // a fight of the mind (c.mind: {cs, each, over, items}): his base score, or the text's fixed one,
      // with what the text adds for each discipline past `over` and for items carried; nothing else
      const m = this.c.mind;
      if (m) {
        const p = [{ label: m.cs ? 'In this fight' : 'Base', n: m.cs || hero.cs }];
        const past = m.each ? Math.max(0, LW.owned(hero).length - (m.over || 0)) : 0;
        if (past) p.push({ label: 'Disciplines', n: past * m.each });
        for (const [id, n] of Object.entries(m.items || {})) if (LW.hasItem(hero, id)) p.push({ label: LW.itemName(id), n });
        p.push(...more);
        return { total: p.reduce((t, x) => t + x.n, 0), parts: p };
      }
      const bare = ph.some((p) => p.unarmed), psi = this.product('psi', round), barred = ph.flatMap((p) => p.barred || []);
      return LW.heroCS(hero, Object.assign({}, this.ctx, barred.length ? { barred: [...(this.ctx.barred || []), ...barred] } : {}, { with: bare ? 'none' : this.c.with, lend: bare ? null : this.ctx.lend, mindblast: this.blasting() === 1, psiSurge: this.blasting() === 2,
        psiTimes: psi, enemy: this.foe, csMod: this.csMod, csNote: this.note, more }));
    }
    cs(round) { return this.parts(round).total; }
    /* the weapon he fights with in this round: none in a fight of the mind or a bare-handed round */
    inHand(round = this.rounds + 1) {
      const ph = this.phases(round), barred = ph.flatMap((p) => p.barred || []);
      if (this.c.mind || ph.some((p) => p.unarmed)) return null;
      return LW.armedWith(this.hero, Object.assign({}, this.ctx, barred.length ? { barred: [...(this.ctx.barred || []), ...barred] } : {}));
    }
    ratio() { return Math.min(LW.RATIO_CAP, this.cs() - this.foe.cs); }
    // evade.after: not before that many rounds; evade.within: only in the first rounds; evade.if: only
    // with that (a Condition); evade.foeAt: only once the foe is down to that; evade.fromFoe: only from
    // that foe of the list on (0 first); evade.free: without the blow; evade.lose 'drawn': the number drawn
    // (0 as 10) is lost in its place (a climb past the foe). A list: several ways out, each its own.
    // c.noEvade: the text allows none, whatever the section's choices say. Leaving an obstacle is free (ruling R23)
    evades() {
      const leave = this.kind === 'obstacle';
      return this.c.noEvade ? [] : [].concat(this.c.evade || []).map((ev, i) => Object.assign({}, ev, leave && { free: true, label: ev.label || this.words.leave }, { i,
        open: (!ev.if || LW.meets(this.hero, ev.if)) && this.rounds >= (ev.after || 0) && !(ev.foeAt != null && this.foe && this.foe.ep > ev.foeAt) && !(ev.fromFoe != null && this.i < ev.fromFoe) && !(ev.within && this.rounds >= ev.within),
        late: !!ev.within && this.rounds >= ev.within }));
    }
    get evadeOpen() { return this.evades().some((e) => e.open); }
    get evadeLate() { const e = this.evades(); return !!e.length && e.every((x) => x.late); }

    /* Mindblast, Psi-surge (Kai-surge), at rest, in turn */
    focus() {
      const hero = this.hero, foe = this.foe, psi = LW.psi(hero);
      if (this.deaf() && this.kind === 'obstacle') return void this.log.push(`Mindblast cannot touch the ${foe.name}: it has no mind.`);
      if (this.deaf()) return void this.log.push(`${foe.name} is immune to ${foe.immune === true ? 'attacks of the mind' : foe.immune === 'psi' ? 'Mindblast and Psi-surge' : 'Mindblast'}.`);
      this.mind = (this.mind + 1) % (this.power + 1);
      if (this.mind === 2 && hero.ep <= psi.floor) { this.mind = 0; this.log.push(`You are too weak to ${psi.name}.`); }
      else this.log.push(['You let your mind rest.', foe.immune ? `You gather your will to a point: Mindblast, to which ${foe.name} is immune.` : 'You gather your will to a point: Mindblast.', `You loose the full ${psi.name}. It will cost you ${psi.cost} Endurance a round.`][this.mind]);
    }
    /* an Archmaster's Curing or a Grand Master's Deliverance: 20 back, once a book (LW.canCure) */
    cure() {
      const hero = this.hero, back = Math.min(20, hero.epMax - hero.ep);
      hero.ep += back; hero.cured = this.bookId;
      this.log.push(`${LW.cureOf(hero).name}: you draw on your mastery and ${back} Endurance returns.`);
    }
    /* the house rule: Laumspur may be drunk mid-fight; it ends a condition it cures (LW.MARKS[m].until) */
    drink() {
      const hero = this.hero;
      LW.useUp(hero, 'potion'); hero.ep = Math.min(hero.epMax, hero.ep + 4);
      this.log.push('The Laumspur burns going down. 4 Endurance restored.');
      LW.marksOf(hero).filter((m) => LW.curedBy(m, 'potion')).forEach((m) => { delete hero.marks[m]; this.log.push(`${LW.MARKS[m].name}: cured.`); });
    }
    /* What may be swallowed before the first round for this fight's sake (an item's boost: Alether,
       Adgana), unless the text forbids it (c.noBoost). */
    boosts() { return this.rounds || this.boosted || this.c.noBoost ? [] : [...new Set(this.hero.backpack.filter((b) => LW.ITEMS[b] && LW.ITEMS[b].boost))]; }
    boost(id) {
      const hero = this.hero, it = LW.ITEMS[id], used = it.addict && (hero.used || {})[it.addict.key];
      if (!this.boosts().includes(id)) return;
      LW.useUp(hero, id);
      this.boosted = { id, n: used && it.boostAgain ? it.boostAgain : it.boost };
      if (it.addict) (hero.used = hero.used || {})[it.addict.key] = (used || 0) + 1;
      this.log.push(`You swallow the ${it.name}: Combat Skill plus ${this.boosted.n} for this fight.`);
    }

    /* A round begins with the Random Number drawn: the table's result at the ratio as it stands. A stop
       rule on the number drawn (c.stop drawn) ends the fight before any blow. */
    roll(n) {
      if (this.rounds) this.changes(this.rounds + 1);
      const res = LW.combatRound(this.ratio(), n);
      this.rounds++;
      const o = { n, res, tag: `${LW.ROMAN[this.rounds - 1] || this.rounds}. You drew ${n}.`, ep: this.hero.ep };
      const s = this.stops().find((x) => x.drawn && x.drawn.includes(n));
      if (s) { this.log.push(`${o.tag} The fight ends there.`); this.end('stop', s.to); }
      return o;
    }
    /* Evading (by the evasion `which`, of the list): only his loss counts (none with evade.free), and the fight is over. */
    flee(o, which = this.evades().findIndex((e) => e.open)) {
      const hero = this.hero, ev = this.evades()[Math.max(0, which)]; this.evaded = ev;
      const loss = ev.lose === 'drawn' ? Math.min(o.n || 10, hero.ep) : ev.free ? 0 : Math.min(o.res.hero, hero.ep);
      hero.ep -= loss; o.taken = loss; this.lost.hero += loss;
      // a free way out with a name of its own (dispelling an illusion, slipping away unseen) says so, not that he runs
      if (this.kind === 'obstacle' && !ev.lose) this.log.push(`You leave the ${this.foe.name} as it is.`);
      else this.log.push(ev.lose === 'drawn' ? `${o.tag} ${ev.label || 'You get past'}: it costs you ${loss}.` : ev.free && ev.label ? `${o.tag} ${ev.label}: untouched.` : `${o.tag} You turn and run${loss ? `; it catches you for ${loss}` : ', untouched'}.`);
      this.end(hero.ep > 0 ? 'evade' : 'dead');
      return o;
    }
    /* His blow lands first: the foe's loss. */
    strike(o) {
      if (this.over) return o;
      const foe = this.foe, r = this.rounds;
      // the text's own doubling (a blow meant to stun), or an undead foe struck with a blade that doubles against them
      const twice = this.c.double || (foe.undead && LW.ITEMS[this.weapon] && LW.ITEMS[this.weapon].undead);
      const dealt = times(o.res.enemy * (twice ? 2 : 1), this.product('foeLoss', r)) + this.sum('foeEach', r);
      const taken = times(o.res.hero, this.product('heroLoss', r)), plus = taken > 0 ? this.sum('heroPlus', r) : 0;
      o.dealt = Math.min(dealt, foe.ep); o.taken = Math.min(taken + plus, this.hero.ep);
      foe.ep -= o.dealt; this.lost.foe += o.dealt;
      return o;
    }
    /* Then his: the blow taken, the foe's mind attack, a loss every round, Psi-surge's cost. o.down: the
       foe has fallen and the fight goes on to advance(). */
    suffer(o) {
      if (this.over) return o;
      const hero = this.hero, foe = this.foe, res = o.res, dealt = o.dealt, taken = o.taken;
      hero.ep -= taken;
      this.log.push(`${o.tag} ${this.words.line(foe.name, dealt, taken, res.enemy === Infinity && dealt, res.hero === Infinity && taken)}.`);
      const fatal = this.phases(this.rounds).flatMap((p) => p.fatal || []);
      if (fatal.length && res.hero > 0 && hero.ep > 0) {
        const n = LW.rand10();
        if (fatal.includes(n)) { hero.ep = 0; this.log.push(`You drew ${n} again: the wound is mortal.`); }
        else this.log.push(`You drew ${n} again: it does you no harm.`);
      }
      if (foe.drain && hero.ep > 0) { // every round fought, the last one too
        if (LW.shielded(hero)) { if (this.rounds === 1) this.log.push('Its mind attack breaks against your shield.'); }
        else { hero.ep -= foe.drain; this.log.push(`Its mind attack costs you ${foe.drain} Endurance.`); }
      }
      const each = this.sum('heroEach', this.rounds);
      if (each && hero.ep > 0) { hero.ep -= each; this.log.push(`It costs you ${each} Endurance more.`); }
      // a weapon that feeds on its wielder (Book 12's Helshezag): from round `from`, off his maximum too
      const w = this.inHand(this.rounds), cost = w && (LW.ITEMS[w] || {}).wieldCost;
      if (cost && this.rounds >= cost.from && hero.ep > 0) {
        hero.ep -= cost.ep; hero.epMax -= cost.ep; this.log.push(`The ${LW.itemName(w)} costs you ${cost.ep} Endurance for good.`);
      }
      if (this.blasting() === 2 && hero.ep > 0) {
        const psi = LW.psi(hero);
        hero.ep -= psi.cost; this.log.push(`The ${psi.name} costs you ${psi.cost} Endurance.`);
        if (hero.ep <= psi.floor && hero.ep > 0) { this.mind = 1; this.log.push('Too weak to hold it, you fall back on Mindblast.'); }
      }
      hero.ep = Math.max(0, hero.ep);
      this.lost.hero += o.ep - hero.ep;
      this.tally.push({ hero: this.lost.hero, foe: this.lost.foe });
      if (hero.ep <= 0) return this.end('dead'), o;
      if (o.ep > hero.ep && this.phases(this.rounds).some((p) => p.offMax)) {
        hero.epMax -= o.ep - hero.ep; this.log.push(`Your Endurance is ${o.ep - hero.ep} lower for good.`);
      }
      // the text's own end (c.stop): at his first wound, the foe down to so much, after so many rounds
      const last = foe.ep <= 0 && this.i + 1 >= this.foes.length, s = this.stops().find((x) => (x.wound && o.ep > hero.ep) || (x.foeAt != null && foe.ep > 0 && foe.ep <= x.foeAt) || (x.after && this.rounds >= x.after && !last));
      if (s) {
        // by: the way on follows who lost more (hero: he did; foe: it did; even)
        const to = s.by ? s.by[this.lost.hero > this.lost.foe ? 'hero' : this.lost.foe > this.lost.hero ? 'foe' : 'even'] : s.to;
        this.log.push(s.wound ? 'The fight ends at your first wound.' : s.foeAt != null ? `${foe.name} is down to ${Math.max(0, foe.ep)}: the fight ends there.` : `${this.rounds > 1 ? `After ${this.rounds} rounds` : 'After one round'} the fight ends.`);
        this.end('stop', to);
      }
      else if (foe.ep <= 0) o.down = true;
      return o;
    }
    // a stop rule may hold only under a condition (stop.if)
    stops() { return [].concat(this.c.stop || []).filter((s) => !s.if || LW.meets(this.hero, s.if)); }
    /* A foe has fallen: the next takes its place (true), or the fight is won. */
    advance() {
      const was = this.foe;
      if (this.i + 1 < this.foes.length) { this.bring(); this.log.push(`${was.name} falls. ${this.foe.name} takes its place.`); this.changes(this.rounds + 1); return true; }
      this.end('win');
      return false;
    }
    /* Stopped by hand. Where the item table says the text ends this fight some way the engine cannot see
       (c.byHand, why), it ends as the text's own stop does and the section's choices open. Anywhere else
       it wins nothing: 'broken', the fight unwon, and only the by-hand turn box left (the owner, 2026-10-12). */
    stopHere() {
      if (this.over) return;
      if (this.c.byHand) { this.log.push(`By hand: ${this.c.byHand}.`); this.end('stop'); }
      else { this.log.push('You stop the fight by hand. It is not won: turn to the section the text names.'); this.end('broken'); }
    }
    /* The fight is over (win, evade, stop, dead): what follows at once. c.restore: his Endurance as it
       was before (a contest); c.healLost: that share of what it cost him back; an addictive draught
       swallowed for it draws for addiction. */
    end(how, to = null) {
      const hero = this.hero, c = this.c;
      if (c.points) { const out = how === 'dead'; hero.ep = this.saved; if (out) { how = 'stop'; to = c.points.lose; this.log.push('Your points are spent: you have lost the contest.'); } }
      // c.lose: a contest, not a fight to the death: brought to 0 he has lost it, and goes there
      else if (how === 'dead' && c.lose) { how = 'stop'; to = c.lose; hero.ep = c.restore ? this.startEp : 1; this.log.push('You are beaten: the contest is lost.'); }
      this.over = how; this.stopTo = to;
      if (c.keep) (this.game.s.kept = this.game.s.kept || {})[c.keep] = this.foes.map((f) => Math.max(0, f.ep));
      if (how === 'dead' || how === 'broken') return;
      hero.lastLoss = this.lost.hero; hero.lastWeapon = this.weapon;
      if (c.restore && hero.ep !== this.startEp && !(c.lose && to === c.lose)) { hero.ep = Math.min(hero.epMax, this.startEp); this.log.push('The contest over, your Endurance is as it was.'); }
      if (c.healLost && !(c.lose && to === c.lose)) { // not for a contest lost
        const n = Math.min(hero.epMax - hero.ep, Math.floor(this.lost.hero * c.healLost));
        if (n > 0) { hero.ep += n; this.log.push(`You regain ${n} of the Endurance the fight cost you.`); }
      }
      const it = this.boosted && LW.ITEMS[this.boosted.id], a = it && it.addict;
      if (a) {
        const n = LW.rand10(), upTo = hero.used[a.key] > 1 && a.again != null ? a.again : a.upTo;
        if (n <= upTo) { hero.epMax += a.epMax; hero.ep = Math.min(hero.ep, hero.epMax); this.log.push(`You drew ${n}: the ${it.name} has its hold on you. Your Endurance is ${-a.epMax} lower for good.`); }
        else this.log.push(`You drew ${n}: the ${it.name} leaves no hold on you.`);
      }
    }
    /* A whole round at once, as the page plays it without the pauses: 'fight' or 'evade'. */
    round(n, how = 'fight', which) {
      if (how === 'fight' && this.noStrike) return null;
      const o = this.roll(n);
      if (this.over) return o;
      if (how === 'evade') return this.flee(o, which);
      this.suffer(this.strike(o));
      if (o.down) this.advance();
      return o;
    }
    /* Where the fight leads: c.wounded, once he has lost any Endurance in it (won or evaded); c.won
       {within, to, else}, by how many rounds a win took; else the section's own way. */
    way() {
      const c = this.c, hurt = c.wounded && this.lost.hero > 0 ? c.wounded : null;
      if (this.over === 'win') return hurt || (c.won ? (this.rounds <= c.won.within ? c.won.to : c.won.else) : c.to || null);
      if (this.over === 'evade') return hurt || this.evaded.to;
      if (this.over === 'stop') return this.stopTo;
      return null;
    }
    /* The fight is over: the way on. A fight broken off opens the section's choices as a win does. */
    finish() {
      const g = this.game, to = this.way();
      if (this.over === 'win' || this.over === 'stop') { g.wonCombat(); if (to) g.go(to, this.over === 'win' ? this.words.won : 'The fight is broken off'); }
      else if (this.over === 'evade') g.go(to, this.words.left);
      else if (this.over === 'broken') g.breakOff();
      else g.save();
    }
  }
  LW.Fight = Fight;
})();
