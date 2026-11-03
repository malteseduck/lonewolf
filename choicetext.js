/* A choice's label: the book's own page references mean nothing here */
export const shown = (t) => {
  let s = t.replace(/[,;]?\s*(?:(?:now|then|and|so|please|by)\s+)*(?:turn(?:ing)?|go(?:ing)?) to \d+[.?!]?\s*$/i, '').trim(); // "..., turn to 12."
  s = s.replace(/\b(?:turn|go) to \d+ and /i, ''); // "..., turn to 12 and risk ..."
  s = s.replace(/^(?:turn|go) to \d+,?\s*(?:and\s+)?/i, '').trim(); // "Turn to 12 and take the south path."
  s = s.charAt(0).toUpperCase() + s.slice(1);
  // a Random Number range ("If it is 2–7") has no long word but says which way it is
  const said = /[a-z]{3,}/i.test(s.replace(/\b(?:now|then|and|so|please|you|may|must|can)\b/gi, '')) || /^if\b.*\d/i.test(s);
  return said ? s.replace(/[,;:]+$/, '').replace(/([^.?!])$/, '$1.') : 'Continue'; // one full stop, or the question mark
};
