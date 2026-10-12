import { describe, it, expect, beforeEach } from 'vitest';
import { loadShared } from './helpers.js';

let LW;
beforeEach(() => { LW = loadShared('core.js'); });

describe('the Combat Results Table', () => {
  it('has a row for every Random Number, each of 13 columns', () => {
    for (let r = 0; r <= 9; r++) expect(LW.CRT[r]).toHaveLength(13);
  });

  it('reads the combat ratio into its column, two points a column, clamped at 11', () => {
    expect(LW.crtColumn(0)).toBe(6);
    expect(LW.crtColumn(1)).toBe(7);
    expect(LW.crtColumn(2)).toBe(7);
    expect(LW.crtColumn(-1)).toBe(5);
    expect(LW.crtColumn(-2)).toBe(5);
    expect(LW.crtColumn(-11)).toBe(0);
    expect(LW.crtColumn(-40)).toBe(0);
    expect(LW.crtColumn(11)).toBe(12);
    expect(LW.crtColumn(40)).toBe(12);
  });

  it('gives K (killed outright) as Infinity', () => {
    expect(LW.combatRound(-11, 1)).toEqual({ enemy: 0, hero: Infinity });
    expect(LW.combatRound(11, 0)).toEqual({ enemy: Infinity, hero: 0 });
  });

  it('gives an even fight its middle cell', () => {
    expect(LW.combatRound(0, 5)).toEqual({ enemy: 7, hero: 2 });
  });
});
