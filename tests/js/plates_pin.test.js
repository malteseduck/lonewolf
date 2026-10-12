/* tools/plates_pin.mjs runs on import and takes its ROOT from its own location, so these tests copy it
   (unchanged) with platepick.js into a temporary project tree that holds a stand-in plates.json and a
   stand-in book.js, and run it there as a child process. Pins are written into that tree only. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './helpers.js';
import { nameKey } from '../../platepick.js';

let tmp;
const w = (rel, text) => { const f = path.join(tmp, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const read = (rel) => fs.readFileSync(path.join(tmp, rel), 'utf8');
const PLATES = (extra = []) => JSON.stringify({ plates: [...extra, { match: '^giak', src: 'assets/plates/giak.png' }] });
const BOOK = `LW.BOOKS['t1'] = { id: 't1', assets: 'data/projectaon/t1/', sections: {
  '1': { combat: { enemies: [{ name: 'Giak' }, { name: 'Zombie', art: 'z.png' }] } },
  '2': { choices: [] },
  '3': { combat: { enemies: [{ name: 'Giak' }] } }
} };`;
const PIN_FILE = 'assets/plates/approved/t1.json';

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lw-plates-pin-'));
  fs.mkdirSync(path.join(tmp, 'tools'));
  fs.copyFileSync(path.join(ROOT, 'tools', 'plates_pin.mjs'), path.join(tmp, 'tools', 'plates_pin.mjs'));
  fs.copyFileSync(path.join(ROOT, 'platepick.js'), path.join(tmp, 'platepick.js'));
  w('assets/plates/plates.json', PLATES());
  w('data/projectaon/t1/book.js', BOOK);
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

const run = (...args) => {
  const r = spawnSync(process.execPath, [path.join(tmp, 'tools', 'plates_pin.mjs'), ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout.trim(), lines: r.stdout.trim().split('\n'), stderr: r.stderr };
};
const pins = () => JSON.parse(read(PIN_FILE));

describe('usage', () => {
  it('prints the usage and exits 2 with no book', () => {
    const r = run();
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/^usage: node tools\/plates_pin\.mjs/);
  });
});

describe('comparing', () => {
  it('says there are no approved pictures when there is no pin file, exit 0', () => {
    const r = run('t1');
    expect(r.code).toBe(0);
    expect(r.out).toBe('t1: no approved pictures (step 6 not marked done), or not imported');
  });
  it('says the same for a book that is not imported', () => {
    expect(run('nope').out).toMatch(/no approved pictures/);
  });
});

describe('--approve', () => {
  it('pins what every fight picks now, one per enemy, keyed section/number', () => {
    const r = run('t1', '--approve');
    expect(r.stderr).toBe('');
    expect(r.out).toBe('t1: 3 fights pinned');
    const p = pins();
    expect(Object.keys(p.pins)).toEqual(['1/0', '1/1', '3/0']);
    expect(p.pins['1/0']).toEqual({ name: nameKey('Giak'), plate: { src: 'assets/plates/giak.png' } });
    expect(p.pins['1/1']).toEqual({ name: nameKey('Zombie'), plate: { src: 'data/projectaon/t1/z.png' } });
    expect(p.approved).toBe(new Date().toISOString().slice(0, 10));
    expect(p._readme).toMatch(/approved/);
  });

  it('writes one pin per line, so a change shows plainly in git', () => {
    run('t1', '--approve');
    const lines = read(PIN_FILE).split('\n').filter((l) => l.startsWith('  "'));
    expect(lines).toHaveLength(3);
    expect(read(PIN_FILE).endsWith('}\n')).toBe(true);
  });

  it('stores null for a fight that shows the drawn emblem', () => {
    w('data/projectaon/t1/book.js', `LW.BOOKS['t1'] = { id: 't1', sections: { '1': { combat: { enemies: [{ name: 'Zombie' }] } } } };`);
    run('t1', '--approve');
    expect(pins().pins['1/0'].plate).toBeNull();
  });

  it('says a book that is not imported cannot be approved, exit 1', () => {
    const r = run('nope', '--approve');
    expect(r.code).toBe(1);
    expect(r.out).toBe('nope: not imported');
  });

  it('says "1 fight" in the singular', () => {
    w('data/projectaon/t1/book.js', `LW.BOOKS['t1'] = { id: 't1', sections: { '1': { combat: { enemies: [{ name: 'Giak' }] } } } };`);
    expect(run('t1', '--approve').out).toBe('t1: 1 fight pinned');
  });
});

describe('comparing after approval', () => {
  beforeEach(() => { run('t1', '--approve'); });

  it('finds nothing changed when nothing has', () => {
    const r = run('t1');
    expect(r.lines[0]).toMatch(/^t1: 3 fights, approved \d{4}-\d\d-\d\d; 0 would change, 0 have no pin, 0 pins for fights no longer there$/);
    expect(r.lines).toHaveLength(1);
  });

  it('lists a fight whose picture would change, by key', () => {
    w('assets/plates/plates.json', PLATES([{ match: '^giak', src: 'assets/plates/new.png', over: true }]));
    const r = run('t1');
    expect(r.lines[0]).toMatch(/2 would change, 0 have no pin/);
    expect(r.lines).toContain('  1/0: assets/plates/giak.png -> assets/plates/new.png');
    expect(r.lines).toContain('  3/0: assets/plates/giak.png -> assets/plates/new.png');
  });

  it('names the emblem when a picture appears or goes', () => {
    w('assets/plates/plates.json', JSON.stringify({ plates: [] }));
    const r = run('t1');
    expect(r.lines).toContain('  1/0: assets/plates/giak.png -> emblem');
  });

  it('lists a fight with no pin, and a pin whose fight holds another enemy', () => {
    w('data/projectaon/t1/book.js', BOOK.replace("'3': { combat: { enemies: [{ name: 'Giak' }] } }", "'3': { combat: { enemies: [{ name: 'Wolf' }, { name: 'Giak' }] } }"));
    const r = run('t1');
    expect(r.lines[0]).toMatch(/0 would change, 2 have no pin/);
    expect(r.lines).toContain('  3/0: no pin (shows emblem)');
    expect(r.lines).toContain('  3/1: no pin (shows assets/plates/giak.png)');
  });

  it('counts pins for fights that are no longer there', () => {
    w('data/projectaon/t1/book.js', `LW.BOOKS['t1'] = { id: 't1', sections: { '1': { combat: { enemies: [{ name: 'Giak' }, { name: 'Zombie', art: 'z.png' }] } } } };`);
    expect(run('t1').lines[0]).toMatch(/1 pins for fights no longer there/);
  });
});

describe('--approve-name', () => {
  it('re-pins only that enemy, whatever the case of the name, and keeps the approval date', () => {
    run('t1', '--approve');
    const before = pins();
    w(PIN_FILE, read(PIN_FILE).replace(/"approved": "[^"]+"/, '"approved": "2020-01-01"'));
    w('assets/plates/plates.json', PLATES([{ match: '^giak', src: 'assets/plates/new.png', over: true }]));
    const r = run('t1', '--approve-name', 'GIAK');
    expect(r.out).toBe('t1: 2 fights pinned (one enemy)');
    const after = pins();
    expect(after.approved).toBe('2020-01-01');
    expect(after.pins['1/0'].plate.src).toBe('assets/plates/new.png');
    expect(after.pins['3/0'].plate.src).toBe('assets/plates/new.png');
    expect(after.pins['1/1']).toEqual(before.pins['1/1']);
  });

  it('has nothing to re-pin before the first approval', () => {
    const r = run('t1', '--approve-name', 'Giak');
    expect(r.out).toBe('t1: no approved pictures yet; nothing to re-pin');
    expect(fs.existsSync(path.join(tmp, PIN_FILE))).toBe(false);
  });

  it('reads the book code whichever side of the option it stands', () => {
    run('t1', '--approve');
    expect(run('--approve-name', 'Zombie', 't1').out).toBe('t1: 1 fight pinned (one enemy)');
  });

  it('pins nothing for a name no fight has', () => {
    run('t1', '--approve');
    expect(run('t1', '--approve-name', 'Dragon').out).toBe('t1: 0 fights pinned (one enemy)');
  });
});

describe('--all', () => {
  it('prints a line per pinned book', () => {
    run('t1', '--approve');
    expect(run('--all').out).toBe('t1: 0 changed, 0 unpinned');
  });
  it('prints the differences as JSON for tools/book_status.py', () => {
    run('t1', '--approve');
    w('assets/plates/plates.json', PLATES([{ match: '^giak', src: 'assets/plates/new.png', over: true }]));
    const j = JSON.parse(run('--all', '--json').out);
    expect(Object.keys(j)).toEqual(['t1']);
    expect(j.t1.book).toBe('t1');
    expect(j.t1.fights).toBe(3);
    expect(j.t1.changed).toEqual([
      { key: '1/0', was: 'assets/plates/giak.png', now: 'assets/plates/new.png' },
      { key: '3/0', was: 'assets/plates/giak.png', now: 'assets/plates/new.png' },
    ]);
    expect(j.t1.unpinned).toEqual([]);
    expect(j.t1.gone).toEqual([]);
  });
  it('gives an empty object when nothing is pinned or the pinned book is not imported', () => {
    expect(JSON.parse(run('--all', '--json').out)).toEqual({});
    run('t1', '--approve');
    fs.rmSync(path.join(tmp, 'data'), { recursive: true });
    expect(JSON.parse(run('--all', '--json').out)).toEqual({});
  });
});
