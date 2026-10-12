// shared/book-demo.js: the demo book (original placeholder prose). Its shape is what the importer targets, so
// these tests check it is a sound, playable book: every link lands, every place and picture exists, there is
// a way to the end, and the Game runs through it.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared } from './helpers.js';

let LW, book;
beforeEach(() => {
  LW = loadShared('core.js', 'rules-series.js', 'book-demo.js');
  book = LW.BOOK_DEMO;
});

const SCENES = ['ruins', 'forest', 'hill', 'river', 'road', 'night', 'bridge', 'city']; // shared/art.js
const SPRITES = ['kraan', 'giak', 'vordak'];
const ids = () => Object.keys(book.sections);
/* every section id a section can lead to */
function exits(sec) {
  const out = [];
  for (const c of sec.choices || []) {
    if (c.to) out.push(c.to);
    if (c.random) c.random.table.forEach(([, to]) => out.push(to));
  }
  if (sec.combat) {
    if (sec.combat.to) out.push(sec.combat.to);
    if (sec.combat.evade) out.push(sec.combat.evade.to);
  }
  return out;
}

describe('the demo book', () => {
  it('has a title, a subtitle and a start section that exists', () => {
    expect(book.title).toBeTruthy();
    expect(book.subtitle).toBeTruthy();
    expect(book.sections[book.start]).toBeDefined();
  });
  it('gives every section text, a place on the map and a known picture', () => {
    for (const id of ids()) {
      const s = book.sections[id];
      expect(Array.isArray(s.text), id).toBe(true);
      expect(s.text.length, id).toBeGreaterThan(0);
      expect(s.text.every((t) => typeof t === 'string' && t.length > 20), id).toBe(true);
      expect(book.locations[s.loc], `${id} loc`).toBeDefined();
      expect(SCENES, `${id} scene`).toContain(s.scene);
    }
  });
  it('gives every place a name and map coordinates, none reused', () => {
    const seen = new Set();
    for (const [k, l] of Object.entries(book.locations)) {
      expect(l.name, k).toBeTruthy();
      expect(Number.isFinite(l.x) && Number.isFinite(l.y), k).toBe(true);
      const at = l.x + ',' + l.y;
      expect(seen.has(at), k).toBe(false);
      seen.add(at);
    }
  });
  it('uses every place at least once', () => {
    const used = new Set(ids().map((id) => book.sections[id].loc));
    for (const k of Object.keys(book.locations)) expect(used.has(k), k).toBe(true);
  });
  it('leads every choice, random result, fight exit and evasion to a section that exists', () => {
    for (const id of ids()) for (const to of exits(book.sections[id])) expect(book.sections[to], `${id} -> ${to}`).toBeDefined();
  });
  it('gives every section a way on, or an ending', () => {
    for (const id of ids()) {
      const s = book.sections[id];
      expect(s.end || exits(s).length > 0, id).toBeTruthy();
    }
  });
  it('has exactly one ending, a victory', () => {
    const ends = ids().filter((id) => book.sections[id].end);
    expect(ends).toHaveLength(1);
    expect(book.sections[ends[0]].end).toBe('victory');
  });
  it('can reach every section from the start, and the ending from every section', () => {
    const next = Object.fromEntries(ids().map((id) => [id, exits(book.sections[id])]));
    const from = (start) => { const seen = new Set([start]), todo = [start]; while (todo.length) for (const n of next[todo.pop()]) if (!seen.has(n)) { seen.add(n); todo.push(n); } return seen; };
    expect([...from(book.start)].sort()).toEqual(ids().sort());
    const end = ids().find((id) => book.sections[id].end);
    for (const id of ids()) expect(from(id).has(end), id).toBe(true);
  });
  it('has fights with named foes, known sprites and scores', () => {
    for (const id of ids()) {
      const c = book.sections[id].combat;
      if (!c) continue;
      expect(c.enemies.length, id).toBeGreaterThan(0);
      for (const e of c.enemies) {
        expect(e.name, id).toBeTruthy();
        expect(e.cs, id).toBeGreaterThan(0);
        expect(e.ep, id).toBeGreaterThan(0);
        expect(SPRITES, id).toContain(e.sprite);
      }
      expect(c.to || c.evade || book.sections[id].choices, `${id} leaves the fight`).toBeTruthy();
      if (c.csMod) expect(c.csNote, id).toBeTruthy();
    }
  });
  it('covers every random table up to 9 and has a mod that names a real discipline', () => {
    for (const id of ids()) for (const c of book.sections[id].choices || []) {
      if (!c.random) continue;
      const rows = c.random.table;
      expect(rows[rows.length - 1][0], id).toBeGreaterThanOrEqual(9);
      expect(rows.map((r) => r[0])).toEqual([...rows.map((r) => r[0])].sort((a, b) => a - b));
      for (const m of c.random.mod || []) expect(LW.DISCIPLINES[m.disc], id).toBeDefined();
    }
  });
  it('asks only for disciplines and items that exist', () => {
    for (const id of ids()) for (const c of book.sections[id].choices || []) {
      if (!c.need) continue;
      if (c.need.disc) expect(LW.DISCIPLINES[c.need.disc], `${id} ${c.need.disc}`).toBeDefined();
      if (c.need.item) expect(LW.ITEMS[c.need.item], `${id} ${c.need.item}`).toBeDefined();
    }
    for (const id of ids()) for (const l of book.sections[id].loot || []) if (l.item) expect(LW.ITEMS[l.item], id).toBeDefined();
  });
  it('quotes no Project Aon text (the file says so, and the prose is its own)', () => {
    expect(JSON.stringify(book).toLowerCase()).not.toContain('project aon');
  });
});

describe('playing the demo book through the Game', () => {
  const hero = (over = {}) => Object.assign({
    name: 'Lone Wolf', cs: 15, ep: 20, epMax: 20, disciplines: [], weaponskill: null, weapons: ['axe'], backpack: [], special: ['map'], meals: 1, gold: 5,
  }, over);
  const game = (h) => { const g = new LW.Game(book, 'demo-test'); g.start(h || hero()); return g; };
  const take = (g, text) => g.choices().find((c) => c.text.startsWith(text));

  it('opens at the start with three ways, the Sixth Sense one closed without the discipline', () => {
    const g = game();
    expect(g.s.at).toBe(book.start);
    const cs = g.choices();
    expect(cs).toHaveLength(3);
    expect(cs[0].enabled).toBe(false);
    expect(cs[0].why).toBe('Needs Sixth Sense');
    expect(cs[1].enabled && cs[2].enabled).toBe(true);
    expect(game(hero({ disciplines: ['sixthSense'] })).choices()[0].enabled).toBe(true);
  });
  it('lets him pick up the finds on the hill', () => {
    const g = game();
    g.go('4');
    expect(g.loot().map((l) => l.label)).toEqual(['Laumspur Potion', '6 Gold Crowns', 'a Meal']);
    g.loot().forEach((l) => expect(g.takeLoot(l.i)).toBeNull());
    expect(g.hero.backpack).toEqual(['potion']);
    expect(g.hero.gold).toBe(11);
    expect(g.hero.meals).toBe(2);
  });
  it('blocks the way on at the Kraan until it is beaten, then continues to the wagon', () => {
    const g = game();
    g.go('5');
    expect(g.combatPending).toBe(true);
    expect(g.choices()).toEqual([]);
    g.wonCombat();
    expect(g.choices()).toEqual([{ text: 'Continue', to: '7', enabled: true }]);
  });
  it('costs a Meal at the night camp, and 3 ENDURANCE for want of one', () => {
    const g = game(hero({ meals: 0 }));
    g.go('14');
    expect(g.hero.ep).toBe(17);
    const fed = game();
    fed.go('14');
    expect(fed.hero.meals).toBe(0);
    expect(fed.hero.ep).toBe(20);
  });
  it('lets Hunting spare the Meal at the camp', () => {
    const g = game(hero({ disciplines: ['hunting'] }));
    g.go('14');
    expect(g.hero.meals).toBe(1);
  });
  it('hurts and robs him in the river, once', () => {
    const g = game(hero({ meals: 2 }));
    g.go('11a');
    expect(g.hero.ep).toBe(17);
    expect(g.hero.meals).toBe(1);
  });
  it('lets him spend the potion, or use Healing, to help the ranger', () => {
    const g = game(hero({ backpack: ['potion'] }));
    g.go('12');
    const give = take(g, 'Give him your Laumspur Potion');
    expect(give.enabled).toBe(true);
    expect(take(g, 'Lay your hands').enabled).toBe(false);
    g.choose(give);
    expect(g.hero.backpack).toEqual([]);
    expect(g.s.at).toBe('13');
    const healer = game(hero({ disciplines: ['healing'] }));
    healer.go('12');
    expect(take(healer, 'Lay your hands').enabled).toBe(true);
    expect(take(healer, 'Give him').enabled).toBe(false);
  });
  it('sends the swimmer to the shallows or the far bank by the Random Number', () => {
    const g = game();
    g.go('8');
    const swim = take(g, 'Go downstream');
    expect(g.resolveRandom(swim, 1).to).toBe('11a');
    expect(g.resolveRandom(swim, 2).to).toBe('11a');
    expect(g.resolveRandom(swim, 3).to).toBe('11b');
  });
  it('gives Camouflage +2 on the creep under the bridge', () => {
    const plain = game(), sneaky = game(hero({ disciplines: ['camouflage'] }));
    const creep = (g) => take(g, 'Creep through the reeds');
    plain.go('15'); sneaky.go('15');
    expect(plain.resolveRandom(creep(plain), 3).to).toBe('16s'); // 3 <= 3
    expect(sneaky.resolveRandom(creep(sneaky), 1).to).toBe('16s'); // 1 + 2 = 3
    expect(sneaky.resolveRandom(creep(sneaky), 2).to).toBe('17'); // 2 + 2 = 4
  });
  it('can be played from the start to the ending', () => {
    const g = game(hero({ disciplines: ['tracking'] }));
    g.choose(take(g, 'Take the south path'));
    g.choose(take(g, 'Stand in the open'));
    expect(g.s.at).toBe('5');
    g.wonCombat();
    g.choose(g.choices()[0]);
    g.choose(take(g, 'Follow the wagon ruts'));
    g.choose(take(g, 'Look for another way across'));
    expect(g.s.at).toBe('10');
    g.choose(take(g, 'Strike east'));
    g.choose(take(g, 'Tell him you cannot stay'));
    g.choose(take(g, 'Go on to the bridge'));
    g.choose(take(g, 'Walk out and challenge'));
    g.wonCombat();
    g.choose(g.choices()[0]);
    expect(g.s.at).toBe('17');
    expect(g.section.end).toBe('victory');
    expect(g.choices()).toEqual([]);
  });
});
