// @vitest-environment jsdom
// shared/core.js: games of chance played over several throws (sec.game): a bet, the throw on the
// medallion, the payout, and the ways on that open by how the game stands.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared, dice } from './helpers.js';

let LW;
beforeEach(() => {
  LW = loadShared('core.js', 'rules-series.js');
  localStorage.clear();
});

const mkHero = (over = {}) => Object.assign({
  name: 'Lone Wolf', cs: 15, ep: 20, epMax: 25, disciplines: [], weaponskill: null, series: 'kai',
  weapons: ['sword'], backpack: [], special: [], meals: 0, gold: 10,
}, over);
/* section 1 leads to 2, the game; 2's choices lead on to 3 and 4 (and 5) */
function at2(sec2, hero = mkHero()) {
  const book = { id: 'test', start: '1', sections: {
    1: { text: ['a'], choices: [{ text: 'on', to: '2' }] },
    2: Object.assign({ text: ['b'], rnt: 'free', choices: [{ text: 'x', to: '3' }, { text: 'y', to: '4' }, { text: 'z', to: '5' }] }, sec2),
    3: { text: ['c'], choices: [{ text: 'back', to: '2' }] }, 4: { text: ['d'], choices: [] }, 5: { text: ['e'], choices: [] },
  } };
  const g = new LW.Game(book, 'test-save');
  g.start(hero);
  g.choose(g.choices()[0]);
  return g;
}
const open = (g) => g.choices().filter((c) => c.enabled).map((c) => c.to);

describe('Cartwheel: a number and a stake, paid by how near the ball falls', () => {
  const wheel = { kind: 'wheel', stake: { min: 1 }, win: 8, near: 5, cap: 40, token: 1, broke: '3' };
  it('the number itself pays 8 a Crown, either neighbour 5 (0 sits between 9 and 1), else the stake is lost', () => {
    const g = at2({ game: wheel }, mkHero({ gold: 10 }));
    expect(g.play(5)).toMatch(/bet first/i);
    expect(g.bet(3, 5)).toBeNull();             // the token's Crown first, then 2 of his
    expect([g.hero.gold, open(g)]).toEqual([8, []]); // a bet down waits for its throw
    g.play(5);                                   // the stake back, and 24 won
    expect(g.hero.gold).toBe(34);
    g.bet(1, 9); g.play(0);                      // the token back, and 5 won
    expect(g.hero.gold).toBe(39);
    g.bet(2, 4); g.play(8);                      // the token and a Crown lost
    expect(g.hero.gold).toBe(38);
    expect(g.s.game.log).toHaveLength(3);
  });
  it('wins no more than the table allows, and the token is given once only', () => {
    const g = at2({ game: wheel }, mkHero({ gold: 10 }));
    g.bet(5, 2); g.play(2);                      // 40 won, the cap
    expect(g.hero.gold).toBe(50);
    g.bet(1, 2); g.play(2);
    expect(g.hero.gold).toBe(50);                // nothing more on this table
    const h = at2({ game: wheel }, mkHero({ gold: 0 }));
    h.bet(1, 3); h.play(7);                       // the token lost
    expect(open(h)).toEqual(['3']);              // nothing left to stake: only the way for a lost purse
    h.choose(h.choices()[0]); h.choose(h.choices()[0]); // to 3 and back to the table
    expect(h.bet(1, 3)).toMatch(/nothing to stake/i);
  });
  it('with Crowns left, the way for a lost purse stays shut', () => {
    const g = at2({ game: wheel });
    expect(open(g)).toEqual(['4', '5']);
  });
});

describe('Portholes: two numbers each against two other players, a fixed stake a throw', () => {
  const holes = { kind: 'dice', stake: 3, win: 2, foes: 2 };
  it('beats both: wins twice the stake; beaten: loses it; level with the best: nothing', () => {
    const g = at2({ game: holes }, mkHero({ gold: 10 }));
    dice(LW, 4, 3, 2, 1, 5, 9, 9, 7, 1, 1, 1, 1);
    g.play(5);                                   // 5+4 against 3+2 and 1+5
    expect(g.hero.gold).toBe(16);
    g.play(0);                                   // 0+9 against 9+7 and 1+1
    expect(g.hero.gold).toBe(13);
    dice(LW, 0, 1, 1, 2, 0);
    g.play(2);                                   // 2+0 against 1+1 and 2+0
    expect(g.hero.gold).toBe(13);
  });
  it('two noughts win at once, for him or against him', () => {
    const g = at2({ game: holes }, mkHero({ gold: 10 }));
    dice(LW, 0, 9, 9, 9, 9);
    g.play(0);
    expect(g.hero.gold).toBe(16);
    dice(LW, 9, 0, 0, 1, 1);
    g.play(9);
    expect(g.hero.gold).toBe(13);
  });
  it('he must stop when he cannot place the stake', () => {
    const g = at2({ game: holes }, mkHero({ gold: 2 }));
    expect(g.play(5)).toMatch(/cannot place/i);
    expect(g.hero.gold).toBe(2);
  });
  it('paid in Lune, 4 to the Crown, when he has a stake of them', () => {
    const g = at2({ game: Object.assign({ coin: 'lune', rate: 4 }, holes) }, mkHero({ gold: 0, coins: { lune: 12 } }));
    dice(LW, 9, 0, 1, 0, 1);
    g.play(9);
    expect([g.hero.coins.lune, g.hero.gold]).toEqual([36, 0]);
  });
});

describe('a bet on the higher number, a few times at most', () => {
  const higher = { kind: 'higher', stake: { min: 1, max: 10 }, win: 2, vs: 3, bets: 3, broke: '5', done: '4', quit: '3' };
  it('the first number above the second plus 3 wins twice the stake, below it loses it', () => {
    const g = at2({ game: higher }, mkHero({ gold: 10 }));
    expect(g.bet(11)).toMatch(/between 1 and 10/);
    g.bet(4); dice(LW, 2); g.play(8);            // 8 against 2+3
    expect(g.hero.gold).toBe(18);
    g.bet(5); dice(LW, 6); g.play(1);            // 1 against 6+3
    expect(g.hero.gold).toBe(13);
    g.bet(2); dice(LW, 4); g.play(7);            // level: nothing
    expect(g.hero.gold).toBe(13);
  });
  it('quitting is open before the last bet, the way for all three after it, and a lost purse has its own', () => {
    const g = at2({ game: higher }, mkHero({ gold: 10 }));
    expect(open(g)).toEqual(['3']);
    for (let i = 0; i < 3; i++) { g.bet(1); dice(LW, 0); g.play(9); }
    expect(open(g)).toEqual(['4']);
    expect(g.bet(1)).toMatch(/no more bets/i);
    const h = at2({ game: higher }, mkHero({ gold: 3 }));
    h.bet(3); dice(LW, 9); h.play(0);
    expect(open(h)).toEqual(['5']);
  });
});
