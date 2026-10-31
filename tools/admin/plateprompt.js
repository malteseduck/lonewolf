/* A prompt for an AI image generator: an enemy as the books' own artist might have inked it, tall like the
   fight panel, on plain paper so inkPlate() can take it as it is. The proposal sheet's (what: the agent's
   description, else the enemy's foe-about entry; ADR 0008).
   No person's words ("portrait", "fighting stance", "three-quarter length"): they stood beasts up as humanoids;
   but "beast" alone put a man-beast on all fours, and a figure the description named got drawn (the owner, 2026-10-30).
   No colour either: a fight picture is an ink drawing, and a colour named pulls the generator towards paint
   (the owner, 2026-10-26). The style is described, never an artist named: the repository is public (ADR 0042). */

// colour words, lower case so a name ("Black Hawk") is kept; tools/plates_proposals.py reads this list too
export const COLOURS = ['red', 'green', 'blue', 'bluish', 'yellow', 'orange', 'purple', 'violet', 'pink', 'brown', 'black', 'white', 'whitish',
  'grey', 'gray', 'gold', 'golden', 'silver', 'crimson', 'scarlet', 'amber', 'ruby', 'emerald', 'azure', 'indigo', 'turquoise', 'tawny',
  'russet', 'ochre', 'ivory', 'ebony', 'sable', 'vermilion', 'maroon', 'beige', 'khaki', 'blond', 'blonde', 'auburn', 'jade', 'sapphire'];
const C = `(?:${COLOURS.join('|')})(?:dish|ish|y)?`;

/* The text with every colour word taken out: "blue-grey" and "fiery-red" lose their colour half, then the word
   alone goes, and the commas and spaces it leaves are tidied. */
export function uncolour(text) {
  return String(text || '')
    .replace(new RegExp(`\\b${C}-(?=[a-z])`, 'g'), '')
    .replace(new RegExp(`(?<=[a-z])-${C}\\b`, 'g'), '')
    .replace(new RegExp(`\\b${C}\\b,?\\s*`, 'g'), '')
    .replace(/\s+([,.;:])/g, '$1').replace(/,(\s*,)+/g, ',').replace(/\s{2,}/g, ' ').trim();
}

export function platePrompt(name, what, { refs = false } = {}) {
  const said = uncolour(what);
  return `An illustration of ${name}${said ? `: ${said.replace(/\.\s*$/, '')}` : ''}. `
    + (refs ? 'Use the attached reference images, if any, for what the subject looks like (its shape, features and gear), '
      + 'but draw it anew in the style below: do not copy their composition, framing or linework. ' : '')
    + 'Black-and-white pen-and-ink illustration with the look of a 1980s fantasy gamebook plate: '
    + 'confident, slightly rough linework, dense cross-hatching and stippling for shade, '
    + 'detailed textures of hide, scales, fur, cloth and armour. A single subject, seen whole, menacing and about to attack, true to the description: '
    + 'a beast stays on all fours, coiled or in flight as described, never made humanoid or standing upright; '
    + 'a creature described as part man or humanoid stands on two legs as a man does. '
    + 'Draw the subject alone: any place or other figure named above is not drawn. '
    + 'Filling a tall frame (2:3). Plain white background, no scenery, no colour, no grey wash, no text, no border.';
}
