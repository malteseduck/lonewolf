/* tools/admin/plateprompt.js, the image-generator prompt the proposal sheet copies: a fight picture is an ink
   drawing, so the description it carries names no colour (the owner, 2026-10-26). */
import { describe, it, expect } from 'vitest';
import { platePrompt, uncolour, COLOURS, savedFor, countOf, sceneFor, lookOf, whatOf } from '../../tools/admin/plateprompt.js';

describe('platePrompt', () => {
  it('describes the subject with every colour word taken out', () => {
    const p = platePrompt('Mire Toad', 'a huge black toad with pale green eyes, a blue-grey hide and fiery-red spines, beside a golden chest');
    expect(p).toContain('a huge toad with pale eyes, a hide and fiery spines, beside a chest');
    for (const c of COLOURS) expect(p.split('Black-and-white')[0].toLowerCase()).not.toMatch(new RegExp(`\\b${c}\\b`));
  });
  it('keeps names and the ink medium', () => {
    const p = platePrompt('Black Hawk', 'a Kai master in a grey cloak');
    expect(p).toMatch(/^An illustration of Black Hawk: a Kai master in a cloak\./);
    expect(p).toContain('Black-and-white pen-and-ink illustration');
  });
  it('describes the style without naming an artist (ADR 0042)', () => {
    const p = platePrompt('X', 'a beast');
    expect(p).not.toMatch(/Chalk|in the style of [A-Z]/);
    expect(p).toContain('dense cross-hatching');
  });
  it('keeps a beast\'s own posture and stands a man-beast on two legs', () => {
    const p = platePrompt('X', 'a man-beast');
    expect(p).toMatch(/a beast stays on all fours, coiled or in flight as described, never made humanoid/);
    expect(p).toMatch(/part man or humanoid stands on two legs/);
  });
  it('draws no other figure, whatever person its description names', () => {
    const p = platePrompt('X', 'it slams the hero into the mud at the bridge');
    expect(p).toMatch(/No other figure is drawn/);
  });
  it('draws one figure for a single enemy and exactly as many as a group has (the owner, 2026-11-03)', () => {
    expect(platePrompt('X', 'a troll')).toMatch(/Exactly one figure/);
    expect(platePrompt('X', 'a troll')).not.toMatch(/group/);
    const g = platePrompt('Looters', 'ragged thieves', { figures: 4 });
    expect(g).toMatch(/A group of exactly 4 figures, every one seen/);
    expect(g).not.toMatch(/one figure|single/i);
    expect(platePrompt('6 Gaolers', 'gaolers')).toMatch(/exactly 6 figures/);  // a count in the name, when none is given
  });
  it('sets the enemy in a simple, lightly drawn setting (the owner, 2026-11-03)', () => {
    const p = platePrompt('X', 'a troll', { setting: 'a dim stone cell with straw on the floor' });
    expect(p).toMatch(/simple setting behind it: a dim stone cell with straw on the floor/);
    expect(p).toMatch(/lighter, sparser lines/);
    expect(p).not.toMatch(/no scenery|Plain white background/);
    expect(platePrompt('X', 'a troll', { setting: 'a black cave' })).toContain('setting behind it: a cave');
    expect(platePrompt('X', 'a troll')).toMatch(/simple setting behind it, suited to the description/);
    expect(platePrompt('Y', 'bandits', { figures: 3 })).toMatch(/behind them/);
  });
  it('asks the generator to follow the attached references only when told to', () => {
    expect(platePrompt('X', 'a beast', { refs: true })).toContain('attached reference images');
    expect(platePrompt('X', 'a beast')).not.toContain('attached reference images');
  });
});

describe('savedFor (the picture sheet\'s Prompt button)', () => {
  const done = { rounds: [
    { enemies: [{ name: 'Looters', prompt: 'old words' }, { name: 'Troll', note: 'no prompt here' }] },
    { enemies: [{ name: 'Looters', prompt: 'newer words', figures: 4, setting: 'a ruined hall' }] }] };
  const open = { enemies: [{ name: 'Gaoler', prompt: 'a gaoler' }] };
  it('takes the latest round\'s row with a prompt, the open file last', () => {
    expect(savedFor([done, open], 'Looters')).toMatchObject({ prompt: 'newer words', figures: 4 });
    expect(savedFor([done, { enemies: [{ name: 'Looters', prompt: 'newest' }] }], 'Looters').prompt).toBe('newest');
  });
  it('finds a name\'s variant by its plain kind, and nothing for a row with no prompt', () => {
    expect(savedFor([open], '2 Gaoler').prompt).toBe('a gaoler');
    expect(savedFor([done], 'Troll')).toBeNull();
    expect(savedFor([null, undefined], 'Troll')).toBeNull();
  });
});

describe('countOf', () => {
  it('takes the saved count, else the number the name starts with, else one for a plain name', () => {
    expect(countOf('Looters', { figures: 4 })).toBe(4);
    expect(countOf('6 Wrok\'s Henchmen')).toBe(6);
    expect(countOf('Kalkoth 1')).toBe(1);
    expect(countOf('Cave Troll')).toBe(1);
  });
  it('leaves a name that may be a group to the owner (null)', () => {
    expect(countOf('Eldenoran Ambushers')).toBeNull();
    expect(countOf('Hunting Dogs (wounded)')).toBeNull();
    expect(countOf('Bandit Boss')).toBe(1);
  });
});

describe('sceneFor (about/foe-scene.json, for enemies with no proposal row: the owner, 2026-11-03)', () => {
  const scenes = { '09sb': { 'Ruel Giganite': { setting: 'a gorge', figures: 1 }, Looters: { setting: 'a warehouse', figures: 5 } } };
  it("gives the enemy's stored setting and count, its own name first, else its plain kind", () => {
    expect(sceneFor(scenes, '09sb', 'Looters')).toEqual({ setting: 'a warehouse', figures: 5 });
    expect(sceneFor(scenes, '09sb', '2 Ruel Giganite')).toEqual({ setting: 'a gorge', figures: 1 });
    expect(sceneFor(scenes, '09sb', 'Troll')).toBeNull();
    expect(sceneFor(null, '09sb', 'Looters')).toBeNull();
  });
  it("lets the stored count stand behind a proposal row's, so the owner is asked only when none is stored", () => {
    expect(countOf('Looters', null, { figures: 5 })).toBe(5);
    expect(countOf('Looters', { figures: 4 }, { figures: 5 })).toBe(4);
    expect(countOf('Looters', { prompt: 'x' }, null)).toBeNull();
  });
});

describe('uncolour', () => {
  it('drops colour words, their -ish forms and a colour joined to another word', () => {
    expect(uncolour('reddish fur, a white-hot blade, red-eyed and crimson-scaled')).toBe('fur, a hot blade, eyed and scaled');
  });
});

describe('lookOf (a foe-about entry as a description to draw: the owner, 2026-11-03)', () => {
  it('drops the bracket saying where it is met and fought, and the wiki note, keeping the look', () => {
    expect(lookOf('A huge scaly serpent with bat wings, lunging. (Bursts from a statue: sections 100 and 133)'))
      .toBe('A huge scaly serpent with bat wings, lunging.');
    expect(lookOf('A slimy grub with tentacles (section 170). Six-legged, with a stinger tail (wiki)'))
      .toBe('A slimy grub with tentacles. Six-legged, with a stinger tail');
  });
  it('keeps a bracket that only describes', () => {
    expect(lookOf('A troll (huge, warty) with a club')).toBe('A troll (huge, warty) with a club');
  });
});

describe('whatOf (what the Prompt button describes: the owner, 2026-11-03)', () => {
  it("takes the proposal row's prompt, else the kind's stored one, else its foe-about entry without its brackets", () => {
    expect(whatOf({ prompt: 'row words' }, { prompt: 'stored words' }, 'about (section 3)')).toBe('row words');
    expect(whatOf(null, { prompt: 'stored words' }, 'about (section 3)')).toBe('stored words');
    expect(whatOf({ note: 'no prompt' }, { setting: 'a bog' }, 'A bog wyrm (section 3)')).toBe('A bog wyrm');
    expect(whatOf(null, null, '')).toBe('');
  });
});
