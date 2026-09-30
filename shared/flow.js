/* The two player actions that need a widget: taking a choice (maybe via the
   Random Number Table) and fighting. Both resolve once the game state has moved. */
(function () {
  const LW = (window.LW = window.LW || {});

  async function pick(game, choice) {
    let to = choice.to;
    if (choice.random) {
      const mods = (choice.random.mod || []).filter((m) => LW.has(game.hero, m.disc))
        .map((m) => `${LW.DISCIPLINES[m.disc].name} adds ${m.plus}`);
      const roll = await LW.UI.pickRandom({ note: mods.length ? `Point at a square. ${mods.join('. ')}.` : 'Point at a square.' });
      const r = game.resolveRandom(choice, roll);
      to = r.to;
      LW.UI.toast(r.mod ? `You picked ${r.roll}, +${r.mod} makes ${r.total}.` : `You picked ${r.roll}.`);
    }
    game.choose(choice, to);
    LW.sfx('page');
  }

  /* Returns 'win' | 'evade' | 'dead'. */
  async function fight(game) {
    const sec = game.section, c = sec.combat;
    const res = await LW.Battle.run({
      hero: game.hero, enemies: c.enemies, scene: sec.scene,
      evade: c.evade, csMod: c.csMod, csNote: c.csNote,
    });
    if (res.outcome === 'win') game.wonCombat();
    else if (res.outcome === 'evade') game.go(c.evade.to, 'You break away from the fight');
    else game.save();
    return res.outcome;
  }

  LW.Flow = { pick, fight };
})();
