import { describe, it, expect } from 'vitest';
import { shown } from '../../choicetext.js';

describe('shown: a choice label without the page reference', () => {
  it('drops the turn-to', () => {
    expect(shown('If you wish to open the door, turn to 12.')).toBe('If you wish to open the door.');
    expect(shown('Turn to 12 and take the south path.')).toBe('Take the south path.');
  });

  it('says Continue when nothing is left', () => {
    expect(shown('Turn to 12.')).toBe('Continue');
    expect(shown('Now turn to 12.')).toBe('Continue');
  });

  it('keeps a Random Number range, which has no long word', () => {
    expect(shown('If it is 2–7, turn to 15.')).toBe('If it is 2–7.');
    expect(shown('If it is 0, turn to 15.')).toBe('If it is 0.');
  });
});
