/* tools/admin/plateprompt.js, the image-generator prompt both picture sheets copy: a fight picture is an ink
   drawing, so the description it carries names no colour (the owner, 2026-10-26). */
import { describe, it, expect } from 'vitest';
import { platePrompt, uncolour, COLOURS } from '../../tools/admin/plateprompt.js';

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
  it('asks the generator to follow the attached references only when told to', () => {
    expect(platePrompt('X', 'a beast', { refs: true })).toContain('attached reference images');
    expect(platePrompt('X', 'a beast')).not.toContain('attached reference images');
  });
});

describe('uncolour', () => {
  it('drops colour words, their -ish forms and a colour joined to another word', () => {
    expect(uncolour('reddish fur, a white-hot blade, red-eyed and crimson-scaled')).toBe('fur, a hot blade, eyed and scaled');
  });
});
