// adventures.js: adventures and their backups in storage, on a stand-in store.
import { describe, it, expect } from 'vitest';
import * as Adv from '../../adventures.js';

/* the page's store (localStorage behind try/catch), on a Map */
function mkStore(init = {}) {
  const m = new Map(Object.entries(init));
  return { m, get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, v), del: (k) => m.delete(k), keys: () => [...m.keys()] };
}

describe('the list of adventures', () => {
  it('starts empty, and is kept', () => {
    const store = mkStore();
    expect(Adv.loadAdventures(store)).toEqual({ list: [], at: null });
    expect(JSON.parse(store.get('lw-adventures'))).toEqual({ list: [], at: null });
  });
  it('makes the saves from before adventures the first one', () => {
    const store = mkStore({ 'lw-save-01fftd': '{"s":1}', 'lw-character': '{"hero":1}', 'lw-book': '01fftd' });
    expect(Adv.loadAdventures(store)).toEqual({ list: [{ id: '1', book: '01fftd' }], at: '1' });
    expect(store.keys().sort()).toEqual(['lw-a1-character', 'lw-a1-save-01fftd', 'lw-adventures']);
    expect(store.get('lw-a1-save-01fftd')).toBe('{"s":1}');
  });
  it('a new one takes the highest id plus one; forgetting one removes its keys only', () => {
    expect(Adv.nextId([])).toBe('1');
    expect(Adv.nextId([{ id: '1' }, { id: '3' }])).toBe('4');
    const store = mkStore({ 'lw-a1-save-x': '1', 'lw-a1-character': '2', 'lw-a11-save-x': '3' });
    Adv.forgetKeys(store, '1');
    expect(store.keys()).toEqual(['lw-a11-save-x']);
  });
});

describe('a backup', () => {
  const store = () => mkStore({ 'lw-a2-save-01fftd': '{"s":{"at":"7"}}', 'lw-a2-character': '{"hero":{"ep":20}}', 'lw-a2-note': 'plain text', 'lw-a3-save-01fftd': '{}' });
  const list = [{ id: '2', book: '01fftd', name: 'Sommerlund' }, { id: '3', book: null }];
  it('holds one adventure\'s every key, parsed where it can be, and is named by it and the time', () => {
    const b = Adv.backupOf(store(), list, '2', new Date('2026-10-11T08:05:00Z'));
    expect(b).toMatchObject({ kind: 'lone-wolf adventure backup', version: 1, made: '2026-10-11T08:05:00.000Z', adventure: list[0] });
    expect(b.keys).toEqual({ 'lw-a2-character': { hero: { ep: 20 } }, 'lw-a2-note': 'plain text', 'lw-a2-save-01fftd': { s: { at: '7' } } });
    expect(Adv.backupName('Sommerlund', '2', new Date(2026, 9, 11, 8, 5))).toBe('Sommerlund.2026.10.11.08.05.json');
    expect(Adv.backupName('a/b: "c"?', '2', new Date(2026, 0, 2, 3, 4))).toBe('a b c.2026.01.02.03.04.json');
    expect(Adv.backupName('...', '5', new Date(2026, 0, 2, 3, 4))).toBe('adventure 5.2026.01.02.03.04.json');
  });
  it('restored over another adventure, takes its place under that adventure\'s id', () => {
    const s = store(), text = JSON.stringify(Adv.backupOf(s, list, '2'));
    const got = Adv.parseBackup(text, 'f.json'), into = { id: '3', book: null };
    Adv.putBackup(s, into, got, { '01fftd': {} });
    expect(s.keys().filter((k) => k.startsWith('lw-a3-')).sort()).toEqual(['lw-a3-character', 'lw-a3-note', 'lw-a3-save-01fftd']);
    expect([s.get('lw-a3-save-01fftd'), s.get('lw-a3-note')]).toEqual(['{"s":{"at":"7"}}', 'plain text']);
    expect(into).toEqual({ id: '3', book: '01fftd', name: 'Sommerlund' });
    Adv.putBackup(s, into, got, {}); // a book not on this device is not opened
    expect(into.book).toBe(null);
  });
  it('is refused when it is not a backup, or holds another adventure\'s keys', () => {
    expect(() => Adv.parseBackup('not json', 'a.json')).toThrow('a.json is not an adventure backup');
    expect(() => Adv.parseBackup(JSON.stringify({ kind: 'lone-wolf adventure backup', version: 2, adventure: {}, keys: {} }), 'b.json')).toThrow('not an adventure backup');
    const mixed = { kind: 'lone-wolf adventure backup', version: 1, adventure: { id: '2' }, keys: { 'lw-a2-x': 1, 'lw-a3-x': 1 } };
    expect(() => Adv.parseBackup(JSON.stringify(mixed), 'c.json')).toThrow('c.json holds keys of another adventure');
  });
  it('made with the PC out of reach waits in the store until sent', () => {
    const s = mkStore();
    expect(Adv.pending(s)).toEqual([]);
    Adv.keepPending(s, [{ name: 'n', text: 't' }]);
    expect(Adv.pending(s)).toEqual([{ name: 'n', text: 't' }]);
    Adv.keepPending(s, []);
    expect(s.keys()).toEqual([]);
  });
});
