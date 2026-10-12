/* The fight: its set-up from the section's combat and the hero, each round, and how it ends.
   main.js draws it and animates between the steps (a round is roll, strike, suffer, then advance
   once the fallen foe has faded); the rules are all here (docs/reference/rules-engine.md, "Combat
   procedure"). Load after rules-series.js. */
(function () {
  const LW = window.LW;

  LW.ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  // the most the Combat Ratio counts for: the owner's house rule, so the Sommerswerd does not make
  // the early books' fights a walk (ADR 0023). The table's "+11 or more" column is never reached.
  LW.RATIO_CAP = 10;

  class Fight {
    constructor(game, bookId) {
      const sec = game.section, c = sec.combat, hero = game.hero;
      this.game = game; this.bookId = bookId; this.hero = hero; this.c = c;
      // the fight's own adjustment, unless he carries what the text says spares him it (a torch), or
      // it is the text's "unarmed" penalty and he has no weapon anyway (heroCS already counts that)
      const spared = (c.unless || []).length && c.unless.every((i) => LW.hasItem(hero, i));
      // Huntmastery: what a surprise attack or ambush costs (combat.ambush) is not lost
      const ambush = c.ambush && c.csMod < 0 && hero.series === 'magnakai' && LW.has(hero, 'huntmastery');
      // the text's own conditions: "if you have Animal Control, add 2" (csIf), "unless you have Mindshield, deduct 2" (csUnless)
      const missed = c.csIf && !LW.meets(hero, c.csIf), excused = c.csUnless && LW.meets(hero, c.csUnless);
      this.csMod = spared || ambush || missed || excused || (c.unarmed && !LW.armedWith(hero)) ? 0 : c.csMod;
      this.note = c.csIf ? LW.condName(c.csIf) : c.csNote; // a discipline's bonus is named after it
      // mind: 0 at rest, 1 Mindblast, 2 Psi-surge. power is the most this character can do.
      this.power = LW.mindPower(hero); this.mind = this.power ? 1 : 0;
      this.i = -1; this.foe = null; this.rounds = 0; this.log = []; this.over = null;
      this.weapon = LW.armedWith(hero, { with: c.with });
      this.bring();
      const log = this.log, csMod = this.csMod;
      if (this.foe.mindforce) log.push(LW.shielded(hero) ? 'Its will breaks against your Mindshield.' : `Its will presses on yours: Combat Skill less ${this.foe.mindforce}.`);
      if (csMod) log.push(`${this.note}: Combat Skill ${csMod > 0 ? 'plus' : 'less'} ${Math.abs(csMod)}.`);
      else if (spared) log.push(`Your ${c.unless.map(LW.itemName).join(' and ')} spare you the penalty.`);
      else if (ambush) log.push('Huntmastery: the ambush does not catch you off guard.');
      else if (excused && c.csMod) log.push(`${LW.condName(c.csUnless)}: you are spared the penalty.`);
      if (c.with === 'none') log.push('You fight bare-handed.');
      else if (c.with) log.push(this.weapon ? `Only your ${LW.itemName(c.with)} can harm it.` : `Only the ${LW.itemName(c.with)} can harm it, and you do not have it.`);
      if (this.weapon && LW.ITEMS[this.weapon] && LW.ITEMS[this.weapon].cs) log.push(`You fight with the ${LW.itemName(this.weapon)}.`);
    }

    /* the next foe of the section's list, a copy, so the book's own numbers stay as printed */
    bring() { this.i++; this.foe = Object.assign({}, this.c.enemies[this.i]); this.foe.max = this.foe.ep; }

    // immune: true, to every attack of the mind; 'mindblast', to Mindblast only (Psi-surge still tells);
    // 'psi', to Mindblast and Psi-surge (only a Grand Master's Kai-surge tells, which the engine lacks yet)
    static allDeaf(foe) { return foe.immune === true || foe.immune === 'psi'; }
    /* the foe no mind attack of his can touch: immune to all, or to Mindblast when that is all he has */
    deaf() { return Fight.allDeaf(this.foe) || (!!this.foe.immune && this.power === 1); }
    blasting() { return Fight.allDeaf(this.foe) || (this.foe.immune && this.mind === 1) ? 0 : this.mind; }
    cs() { return LW.heroCS(this.hero, { mindblast: this.blasting() === 1, psiSurge: this.blasting() === 2, enemy: this.foe, csMod: this.csMod, csNote: this.note, with: this.c.with }).total; }
    ratio() { return Math.min(LW.RATIO_CAP, this.cs() - this.foe.cs); }
    // evade.after: not before that many rounds; evade.within: only in the first rounds
    get evadeOpen() { const ev = this.c.evade; return !!ev && this.rounds >= ev.after && !(ev.within && this.rounds >= ev.within); }
    get evadeLate() { const ev = this.c.evade; return !!ev && !!ev.within && this.rounds >= ev.within; }

    /* Mindblast, Psi-surge, at rest, in turn */
    focus() {
      const hero = this.hero, foe = this.foe;
      if (this.deaf()) return void this.log.push(`${foe.name} is immune to ${foe.immune === true ? 'attacks of the mind' : foe.immune === 'psi' ? 'Mindblast and Psi-surge' : 'Mindblast'}.`);
      this.mind = (this.mind + 1) % (this.power + 1);
      if (this.mind === 2 && hero.ep <= LW.psi(hero).floor) { this.mind = 0; this.log.push('You are too weak to Psi-surge.'); }
      else this.log.push(['You let your mind rest.', foe.immune ? `You gather your will to a point: Mindblast, to which ${foe.name} is immune.` : 'You gather your will to a point: Mindblast.', `You loose the full Psi-surge. It will cost you ${LW.psi(hero).cost} Endurance a round.`][this.mind]);
    }
    /* an Archmaster's Curing: 20 back, once a book (LW.canCure) */
    cure() {
      const hero = this.hero, back = Math.min(20, hero.epMax - hero.ep);
      hero.ep += back; hero.cured = this.bookId;
      this.log.push(`Curing: you draw on your mastery and ${back} Endurance returns.`);
    }
    /* the house rule: Laumspur may be drunk mid-fight */
    drink() {
      const hero = this.hero;
      hero.backpack.splice(hero.backpack.indexOf('potion'), 1); hero.ep = Math.min(hero.epMax, hero.ep + 4);
      this.log.push('The Laumspur burns going down. 4 Endurance restored.');
    }

    /* A round begins with the Random Number drawn: the table's result at the ratio as it stands. */
    roll(n) {
      const res = LW.combatRound(this.ratio(), n);
      this.rounds++;
      return { n, res, tag: `${LW.ROMAN[this.rounds - 1] || this.rounds}. You drew ${n}.` };
    }
    /* Evading: only his loss counts, and the fight is over. */
    flee(o) {
      const hero = this.hero, loss = Math.min(o.res.hero, hero.ep);
      hero.ep -= loss; o.taken = loss;
      this.log.push(`${o.tag} You turn and run${loss ? `; it catches you for ${loss}` : ', untouched'}.`);
      this.over = hero.ep > 0 ? 'evade' : 'dead';
      return o;
    }
    /* His blow lands first: the foe's loss. */
    strike(o) {
      const foe = this.foe;
      // the text's own doubling (a blow meant to stun), or an undead foe struck with a blade that doubles against them
      const twice = this.c.double || (foe.undead && LW.ITEMS[this.weapon] && LW.ITEMS[this.weapon].undead);
      o.dealt = Math.min(o.res.enemy * (twice ? 2 : 1), foe.ep); o.taken = Math.min(o.res.hero, this.hero.ep);
      foe.ep -= o.dealt;
      return o;
    }
    /* Then his: the blow taken, the foe's mind attack, Psi-surge's cost. o.down: the foe has fallen
       and the fight goes on to advance(). */
    suffer(o) {
      const hero = this.hero, foe = this.foe, res = o.res, dealt = o.dealt, taken = o.taken;
      hero.ep -= taken;
      this.log.push(`${o.tag} ${res.enemy === Infinity ? 'A killing blow' : dealt ? `${foe.name} loses ${dealt}` : 'Your blow is turned'}; ${res.hero === Infinity ? 'but it finds the gap in your guard' : taken ? `you lose ${taken}` : 'you are untouched'}.`);
      if (foe.drain && hero.ep > 0) { // every round fought, the last one too
        if (LW.shielded(hero)) { if (this.rounds === 1) this.log.push('Its mind attack breaks against your shield.'); }
        else { hero.ep -= foe.drain; this.log.push(`Its mind attack costs you ${foe.drain} Endurance.`); }
      }
      if (this.blasting() === 2 && hero.ep > 0) {
        const psi = LW.psi(hero);
        hero.ep -= psi.cost; this.log.push(`The Psi-surge costs you ${psi.cost} Endurance.`);
        if (hero.ep <= psi.floor && hero.ep > 0) { this.mind = 1; this.log.push('Too weak to hold it, you fall back on Mindblast.'); }
      }
      if (hero.ep <= 0) this.over = 'dead';
      else if (foe.ep <= 0) o.down = true;
      return o;
    }
    /* A foe has fallen: the next takes its place (true), or the fight is won. */
    advance() {
      const was = this.foe;
      if (this.i + 1 < this.c.enemies.length) { this.bring(); this.log.push(`${was.name} falls. ${this.foe.name} takes its place.`); return true; }
      this.over = 'win';
      return false;
    }
    /* A whole round at once, as the page plays it without the pauses: 'fight' or 'evade'. */
    round(n, how = 'fight') {
      const o = this.roll(n);
      if (how === 'evade') return this.flee(o);
      this.suffer(this.strike(o));
      if (o.down) this.advance();
      return o;
    }
    /* The fight is over: the way on. */
    finish() {
      const g = this.game, c = this.c;
      if (this.over === 'win') { g.wonCombat(); if (c.to) g.go(c.to, 'The fight is won'); }
      else if (this.over === 'evade') g.go(c.evade.to, 'You break away from the fight');
      else g.save();
    }
  }
  LW.Fight = Fight;
})();
