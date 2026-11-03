// @vitest-environment jsdom
// shared/core.js: other coins share the Belt Pouch with the Gold Crowns (ADR 0047): 50 Crowns' worth in
// all, each coin by its rate; a price in a coin is paid in that coin, or in Crowns where the table gives
// that too (alt). Stand-in book and hero.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared } from './helpers.js';

let LW;
beforeEach(() => {
  LW = loadShared('core.js', 'rules-series.js');
  localStorage.clear();
});

const mkHero = (over = {}) => Object.assign({
  name: 'Lone Wolf', cs: 15, ep: 20, epMax: 25, disciplines: [], weapons: ['axe'], backpack: [], special: [], meals: 0, gold: 10,
}, over);
function play(sections, hero = mkHero()) {
  const book = { start: '1', sections: Object.assign({ 1: { text: ['x'], choices: [{ text: 'go', to: '2' }] }, 2: { text: ['y'] } }, sections) };
  const g = new LW.Game(book, 'test-save');
  g.start(hero);
  return g;
}

describe('the pouch', () => {
  it('counts every coin at its rate, rounded down for the figure', () => {
    const h = mkHero({ gold: 12, coins: { lune: 6, ren: 10, noble: 3 } });
    expect(LW.purseWorth(h)).toBe(12 + 1.5 + 1 + 3);
    expect(LW.purseShown(h)).toBe(17);
  });
  it('holds 50 Crowns\' worth in all: a gain past it is cut at the cap', () => {
    const h = mkHero({ gold: 40, coins: { lune: 20 } }); // 45 worth: room for 5 Crowns or 20 Lune
    expect(LW.gainCoin(h, null, 9)).toBe(5);
    expect(h.gold).toBe(45);
    expect(LW.gainCoin(h, 'lune', 9)).toBe(0);
    h.gold = 40;
    expect(LW.gainCoin(h, 'lune', 30)).toBe(20);
    expect(h.coins.lune).toBe(40);
    expect(LW.gainCoin(h, 'lune', -50)).toBe(-40);
  });
  it('a find of coins in the text is cut at the cap too', () => {
    const g = play({ 2: { text: ['y'], loot: [{ coin: 'noble', n: 30 }] } }, mkHero({ gold: 30 }));
    g.go('2');
    expect(g.takeLoot(0)).toBeNull();
    expect(g.s.hero.coins.noble).toBe(20);
  });
});

describe('paying', () => {
  it('a price in one coin is paid in it, or in Crowns where the table gives them (alt)', () => {
    const sec = { text: ['y'], choices: [{ text: 'pay', to: '3', need: { coin: 'noble', n: 4, alt: 4, spend: true } }], loot: [{ item: 'rope', cost: 6, coin: 'lune', alt: 2 }] };
    const g = play({ 2: sec, 3: { text: ['z'] } }, mkHero({ gold: 5, coins: { noble: 1, lune: 2 } }));
    g.go('2');
    expect(g.choices()[0].enabled).toBe(true);
    expect(g.takeLoot(0)).toBeNull(); // 6 Lune short: 2 Crowns
    expect([g.s.hero.gold, g.s.hero.coins.lune]).toEqual([3, 2]);
    expect(g.choices()[0].enabled).toBe(false); // 1 Noble short of 4, and 3 Crowns short of 4
    g.s.hero.gold = 6;
    g.choose(g.choices()[0]);
    expect([g.s.at, g.s.hero.gold, g.s.hero.coins.noble]).toEqual(['3', 2, 1]);
  });
  it('without alt, only the named coin pays', () => {
    const sec = { text: ['y'], choices: [{ text: 'pay', to: '3', need: { coin: 'lune', n: 4, spend: true } }] };
    const g = play({ 2: sec, 3: { text: ['z'] } }, mkHero({ gold: 40, coins: { lune: 3 } }));
    g.go('2');
    expect(g.choices()[0].enabled).toBe(false);
  });
});

describe('more ways with coins', () => {
  it('a gate on so many of a coin, or fewer (not)', () => {
    const h = mkHero({ coins: { noble: 1 } });
    expect(LW.meets(h, { coins: { noble: 2 } })).toBe(false);
    expect(LW.meets(h, { not: { coins: { noble: 2 } } })).toBe(true);
    expect(LW.condName({ not: { coins: { noble: 2 } } })).toBe('fewer than 2 Nobles');
  });
  it('a draw wins coins; Arrows are bought in a coin; a trader pays in his (sellCoin)', () => {
    const g = play({ 2: { text: ['y'], loot: [{ arrows: 6, cost: 2, coin: 'noble' }], sell: { rope: 3 }, sellCoin: 'noble' } }, mkHero({ special: ['quiver'], backpack: ['rope'], coins: { noble: 2 } }));
    g.go('2');
    expect(g.loot()[0]).toMatchObject({ label: '6 Arrows', cost: 2, coin: 'noble' });
    expect(g.takeLoot(0)).toBeNull();
    expect([g.s.hero.arrows, g.s.hero.coins.noble]).toEqual([6, 0]);
    expect(g.sell('rope')).toBeNull();
    expect(g.s.hero.coins.noble).toBe(3);
    expect(LW.coinCount(1, 'noble')).toBe('1 Noble');
    expect([LW.coinCount(1, 'torq'), LW.COIN_RATE.torq]).toEqual(['1 Torq', 4]);
  });
});

describe('taken and given back', () => {
  it('a purse lost (purse: all) takes every coin, and a stash gives them back', () => {
    const sec = { text: ['y'], take: [{ purse: 'all', stash: 'gaol' }], choices: [{ text: 'go', to: '3' }] };
    const g = play({ 2: sec, 3: { text: ['z'], back: ['gaol'] } }, mkHero({ gold: 7, coins: { noble: 5 } }));
    g.go('2');
    expect([g.s.hero.gold, g.s.hero.coins.noble]).toEqual([0, 0]);
    g.go('3');
    expect([g.s.hero.gold, g.s.hero.coins.noble]).toEqual([7, 5]);
  });
});
