import { describe, it, expect } from 'vitest';
import { compilePlates, choosePlate, nameKey, pinKey, pickPlate, samePlate, pinState, upscaledSrc } from '../../platepick.js';

const book = { id: '04tcod', assets: 'data/projectaon/04tcod/' };
const lib = compilePlates([
  { match: '^giak', src: 'art/giak.png', crop: [0, 0, 1, 0.9] },
  { match: 'drakkar', src: 'art/drakkar.png', over: true, levels: [10, 200] },
  { match: 'wolf', src: 'art/wolf-book5.png', book: '05sots' },
  { match: 'kraan', src: 'art/kraan.png', flip: true },
]);

describe('compilePlates', () => {
  it('compiles each match to a case-insensitive RegExp and keeps the other fields', () => {
    expect(lib[0].re).toBeInstanceOf(RegExp);
    expect(lib[0].re.test('GIAK scout')).toBe(true);
    expect(lib[0].src).toBe('art/giak.png');
  });
  it('accepts a missing list', () => {
    expect(compilePlates(undefined)).toEqual([]);
    expect(compilePlates(null)).toEqual([]);
  });
});

describe('choosePlate', () => {
  it('uses the section illustration over a plain library match', () => {
    expect(choosePlate({ name: 'Giak', art: 'ill1.png' }, book, lib)).toEqual({ src: 'data/projectaon/04tcod/ill1.png' });
  });
  it('uses the library when the foe has no illustration, with crop and levels only when set', () => {
    expect(choosePlate({ name: 'Giak' }, book, lib)).toEqual({ src: 'art/giak.png', crop: [0, 0, 1, 0.9] });
    expect(choosePlate({ name: 'Drakkar' }, book, lib)).toEqual({ src: 'art/drakkar.png', levels: [10, 200] });
    expect(choosePlate({ name: 'Kraan' }, book, lib)).toEqual({ src: 'art/kraan.png', flip: true });
  });
  it('lets an entry marked over win against the section illustration', () => {
    expect(choosePlate({ name: 'Drakkar', art: 'ill.png' }, book, lib).src).toBe('art/drakkar.png');
  });
  it('limits an entry with a book to that book', () => {
    expect(choosePlate({ name: 'Wolf' }, book, lib)).toBeNull();
    expect(choosePlate({ name: 'Wolf' }, { id: '05sots' }, lib).src).toBe('art/wolf-book5.png');
  });
  it('gives null (the emblem) when nothing matches', () => {
    expect(choosePlate({ name: 'Zombie' }, book, lib)).toBeNull();
  });
  it('works without book.assets', () => {
    expect(choosePlate({ name: 'Zombie', art: 'z.png' }, { id: 'x' }, lib)).toEqual({ src: 'z.png' });
  });
  it('takes the first matching entry', () => {
    const two = compilePlates([{ match: 'a', src: '1' }, { match: 'a', src: '2' }]);
    expect(choosePlate({ name: 'a' }, book, two).src).toBe('1');
  });
});

describe('nameKey and pinKey', () => {
  it('is stable, case-insensitive and base 36', () => {
    expect(nameKey('Giak')).toBe(nameKey('GIAK'));
    expect(nameKey('Giak')).toMatch(/^[0-9a-z]+$/);
    expect(nameKey('Giak')).not.toBe(nameKey('Doomwolf'));
  });
  it('hashes the empty name to the FNV offset basis', () => {
    expect(nameKey('')).toBe((0x811c9dc5).toString(36));
  });
  it('handles non-string input and astral characters', () => {
    expect(nameKey(12)).toBe(nameKey('12'));
    expect(() => nameKey('\u{1F43A}')).not.toThrow();
  });
  it('joins section and enemy number', () => {
    expect(pinKey('17', 2)).toBe('17/2');
  });
});

describe('pickPlate', () => {
  const foe = { name: 'Giak' };
  const pins = { '17/0': { name: nameKey('Giak'), plate: { src: 'pinned.png' } }, '18/0': { name: nameKey('Other'), plate: { src: 'x.png' } } };
  it('uses the pin for the same enemy, even over what is picked now', () => {
    expect(pickPlate(foe, book, lib, pins, '17/0')).toEqual({ src: 'pinned.png' });
  });
  it('honours a pin of null (the emblem)', () => {
    expect(pickPlate(foe, book, lib, { k: { name: nameKey('Giak'), plate: null } }, 'k')).toBeNull();
  });
  it('ignores a pin made for another enemy', () => {
    expect(pickPlate(foe, book, lib, pins, '18/0')).toEqual(choosePlate(foe, book, lib));
  });
  it('falls back with no pins, no pin for the key', () => {
    expect(pickPlate(foe, book, lib, undefined, '17/0')).toEqual(choosePlate(foe, book, lib));
    expect(pickPlate(foe, book, lib, pins, '99/0')).toEqual(choosePlate(foe, book, lib));
  });
});

describe('samePlate', () => {
  it('compares by content and treats undefined as null', () => {
    expect(samePlate({ src: 'a' }, { src: 'a' })).toBe(true);
    expect(samePlate({ src: 'a' }, { src: 'b' })).toBe(false);
    expect(samePlate(null, undefined)).toBe(true);
    expect(samePlate(null, { src: 'a' })).toBe(false);
  });
});

describe('pinState: what the owner has to look at on the picture sheet', () => {
  const pins = { '7/0': { name: nameKey('Giak'), plate: { src: 'art/old-giak.png' } }, '8/0': { name: nameKey('Kraan'), plate: { src: 'art/kraan.png', flip: true } } };
  it('a fight whose picture is as approved needs nothing', () => {
    expect(pinState({ name: 'Kraan' }, book, lib, pins, '8/0')).toEqual({ state: 'same' });
  });
  it('a changed picture waits, with the approved one to compare', () => {
    expect(pinState({ name: 'Giak' }, book, lib, pins, '7/0')).toEqual({ state: 'changed', was: { src: 'art/old-giak.png' }, now: { src: 'art/giak.png', crop: [0, 0, 1, 0.9] } });
  });
  it('a fight with no approved picture yet (a new one, or a re-import that added it) waits too', () => {
    expect(pinState({ name: 'Drakkar' }, book, lib, pins, '9/0')).toEqual({ state: 'new', now: { src: 'art/drakkar.png', levels: [10, 200] } });
  });
  it('before any approval nothing waits', () => {
    expect(pinState({ name: 'Drakkar' }, book, lib, null, '9/0')).toEqual({ state: 'same' });
  });
});

describe('upscaledSrc: a fight picture shown as its 2x copy once step 7 has made it', () => {
  const list = ['data/projectaon/02fotw/ill5.png', 'art/plates/02fotw/giak.webp'];
  it('names the -2x.webp beside a picture on the book\'s list, any other unchanged', () => {
    expect(upscaledSrc('data/projectaon/02fotw/ill5.png', list)).toBe('data/projectaon/02fotw/ill5-2x.webp');
    expect(upscaledSrc('art/plates/02fotw/giak.webp', list)).toBe('art/plates/02fotw/giak-2x.webp');
    expect(upscaledSrc('assets/plates/troll.png', list)).toBe('assets/plates/troll.png');
    expect(upscaledSrc('data/projectaon/02fotw/ill5.png', null)).toBe('data/projectaon/02fotw/ill5.png');
  });
});
