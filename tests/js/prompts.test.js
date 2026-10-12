import { describe, it, expect } from 'vitest';
import { PROMPTS } from '../../tools/admin/prompts.js';

/* a book's status as admin.js holds it, with stand-in values */
const book = (o = {}) => ({
  n: 4, title: 'Stand-in Title', code: '04tcod', series: 'kai',
  imp: { sections: 350, fights: 40, rnt: 20, broken: 0, noway: 1, bare: 3, kinds: 25 },
  items: { exists: true, todos: 7, registered: true, check: null },
  rulesHeading: false,
  ...o,
});

const KEYS = ['phrasings', 'rules', 'items', 'itemsFix', 'pictures', 'testplay', 'mapStyle', 'mapRetype', 'newBook'];

describe('PROMPTS', () => {
  it('has a prompt for each stage that needs an agent', () => {
    expect(Object.keys(PROMPTS).sort()).toEqual([...KEYS].sort());
  });

  it.each(KEYS)('%s is a self-contained text naming the book and holding no undefined', (key) => {
    const t = PROMPTS[key](book());
    expect(typeof t).toBe('string');
    expect(t).toContain('C:\\Projects\\lone-wolf');
    expect(t).toContain('Book 4, Stand-in Title (04tcod, kai)');
    expect(t).not.toMatch(/undefined|\[object|NaN/);
  });

  it.each(KEYS)('%s carries the hard rule about book text', (key) => {
    expect(PROMPTS[key](book())).toMatch(/no Project Aon text|AGENTS\.md/);
  });

  it.each([
    ['phrasings', 3], ['rules', 4], ['items', 5], ['itemsFix', 5], ['testplay', 7],
  ])('%s ends by marking its own step %i', (key, step) => {
    expect(PROMPTS[key](book())).toContain(`python tools/book_status.py done 04tcod ${step}`);
  });

  it('leaves marking the fight pictures to the owner', () => {
    const t = PROMPTS.pictures(book());
    expect(t).not.toContain('book_status.py done');
    expect(t).toContain('do not mark it');
  });

  it('every prompt that edits ends by saying not to commit, except the map retype', () => {
    for (const k of KEYS.filter((k) => k !== 'mapRetype')) expect(PROMPTS[k](book())).toContain('Do not commit');
  });

  describe('phrasings', () => {
    it('quotes the import figures', () => {
      expect(PROMPTS.phrasings(book())).toContain('350 sections, 40 fights, 20 Random Number sections, 0 broken links, 1 with no way on');
    });
    it('says so when the book is not imported', () => {
      expect(PROMPTS.phrasings(book({ imp: null }))).toContain('not imported yet');
    });
  });

  describe('rules', () => {
    it('asks to write the addendum when there is none, and to check it when there is', () => {
      expect(PROMPTS.rules(book())).toContain('Write "Book 4, Stand-in Title"');
      expect(PROMPTS.rules(book({ rulesHeading: true }))).toContain('already has a "Book 4" addendum');
    });
  });

  describe('items', () => {
    it('names the existing table, its todo count and whether it is registered', () => {
      expect(PROMPTS.items(book())).toContain('items-04tcod.js exists (7 todo entries, registered in main.js)');
      expect(PROMPTS.items(book({ items: { exists: true, todos: 2, registered: false } }))).toContain('NOT yet registered');
    });
    it('asks for a new table when there is none', () => {
      expect(PROMPTS.items(book({ items: { exists: false } }))).toContain('There is no items-04tcod.js yet. Write it.');
    });
    it('mentions ambushes and bow shots only for a Magnakai book', () => {
      expect(PROMPTS.items(book())).not.toContain('ambushes');
      expect(PROMPTS.items(book({ series: 'magnakai' }))).toContain('mark ambushes and bow shots');
    });
    it('tells the agent to run the checker with --json for this book', () => {
      expect(PROMPTS.items(book())).toContain('node tools/check_items.mjs 04tcod --json');
    });
  });

  describe('itemsFix', () => {
    it('points at the checker for this book', () => {
      expect(PROMPTS.itemsFix(book())).toContain('node tools/check_items.mjs 04tcod reports errors');
    });
  });

  describe('pictures', () => {
    it('quotes how many kinds have no picture, or says it is unknown', () => {
      expect(PROMPTS.pictures(book())).toContain('3 of 25 kinds of enemy with no picture');
      expect(PROMPTS.pictures(book({ imp: null }))).toContain('an unknown number of enemies with no picture');
    });
    it('links the picture sheet for this book', () => {
      expect(PROMPTS.pictures(book())).toContain('fights.html?book=04tcod');
    });
  });

  describe('testplay', () => {
    it('uses 127.0.0.1 so the owner\'s saves are not touched', () => {
      expect(PROMPTS.testplay(book())).toContain('http://127.0.0.1:8766/');
    });
    it('mentions the todos only when a table has been counted', () => {
      expect(PROMPTS.testplay(book())).toContain('leaves 7 todos');
      expect(PROMPTS.testplay(book({ items: { exists: false, todos: null } }))).not.toContain('todos to the player');
    });
  });

  describe('map prompts', () => {
    it('mapStyle names the style file and the map image of the book', () => {
      const t = PROMPTS.mapStyle(book());
      expect(t).toContain('maps/04tcod/style.txt');
      expect(t).toContain('data/projectaon/04tcod/map.png');
    });
    it('mapRetype names the labels file and limits itself to the retype ticks', () => {
      const t = PROMPTS.mapRetype(book());
      expect(t).toContain('maps/04tcod/labels.json');
      expect(t).toContain('Change only the retype ticks');
    });
  });

  describe('newBook', () => {
    it('proposes the importer change and does not import', () => {
      expect(PROMPTS.newBook(book())).toContain('do not import until I say so');
    });
    it('asks for a rules read first for a Grand Master book', () => {
      expect(PROMPTS.newBook(book())).not.toContain('Grand Master rules');
      expect(PROMPTS.newBook(book({ series: 'grand master' }))).toContain('the engine has no Grand Master rules');
    });
  });
});
