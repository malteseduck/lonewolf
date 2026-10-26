/* tools/admin/prompts.js, pictureFor(): the picture sheet's Prompt button copies an agent prompt for one enemy's
   proposals, the step 7 prompt narrowed to that enemy (the owner, 2026-10-26). */
import { describe, it, expect } from 'vitest';
import { PROMPTS, pictureFor } from '../../tools/admin/prompts.js';

const b = { n: 9, title: 'Stand-in', code: '09sb', series: 'magnakai' };
const foe = { name: 'Bog Wyrm', secs: ['12', '140'], from: 'the book\'s ill3' };

describe('pictureFor', () => {
  const p = pictureFor(b, foe);
  it('asks for proposals for that enemy alone, on the proposal sheet', () => {
    expect(p).toContain('"Bog Wyrm"');
    expect(p).toContain('sections 12, 140');
    expect(p).toContain('the book\'s ill3');
    expect(p).toContain('data/projectaon/09sb/plate-proposals.json');
    expect(p).toContain('python tools/plates_proposals.py check 09sb');
    expect(p).toContain('"Open proposals"');
    expect(p).toMatch(/every other enemy/);
  });
  it('keeps a round in progress and leaves the pick and the step to the owner', () => {
    expect(p).toMatch(/keep any other rows/i);
    expect(p).not.toContain('book_status.py done');
    expect(p).toMatch(/do not change plates\.json/i);
  });
  it('shares the search order and the description with the whole-book prompt', () => {
    const all = PROMPTS.pictures({ ...b, imp: { bare: 2, kinds: 20 } });
    for (const s of ['Follow docs/reference/items.md, "Fight pictures"', 'Never a colour', 'plates_proposals.py gather 09sb']) {
      expect(p).toContain(s);
      expect(all).toContain(s);
    }
  });
});
