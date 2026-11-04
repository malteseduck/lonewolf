/* A prompt for an AI image generator: an enemy as the books' own artist might have inked it, tall like the
   fight panel, in a simple setting drawn lighter than the enemy, as the books' plates are (the owner, 2026-11-03:
   the enemy alone on white looked plain). The proposal sheet's (what: the agent's description, else the enemy's
   foe-about entry; figures: how many it shows, else a number the name starts with, else one; setting: the kind of
   place, our own words; ADR 0008). A group is counted outright: "a single subject" drew one of six henchmen.
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

export function platePrompt(name, what, { refs = false, figures, setting = '' } = {}) {
  const said = uncolour(what), n = Number(figures) || Number(String(name).match(/^\d+/)?.[0]) || 1;
  const it = n > 1 ? 'them' : 'it', where = uncolour(setting).replace(/\.\s*$/, '');
  return `An illustration of ${name}${said ? `: ${said.replace(/\.\s*$/, '')}` : ''}. `
    + (refs ? 'Use the attached reference images, if any, for what the subject looks like (its shape, features and gear), '
      + 'but draw it anew in the style below: do not copy their composition, framing or linework. ' : '')
    + 'Black-and-white pen-and-ink illustration with the look of a 1980s fantasy gamebook plate: '
    + 'confident, slightly rough linework, dense cross-hatching and stippling for shade, '
    + 'detailed textures of hide, scales, fur, cloth and armour. '
    + (n > 1 ? `A group of exactly ${n} figures, every one seen, close together in the foreground, menacing and about to attack, each true to the description: `
      : 'Exactly one figure, seen whole, menacing and about to attack, true to the description: ')
    + 'a beast stays on all fours, coiled or in flight as described, never made humanoid or standing upright; '
    + 'a creature described as part man or humanoid stands on two legs as a man does. '
    + `No other figure is drawn, whoever the description names. `
    + `A simple setting behind ${it}${where ? `: ${where}` : ', suited to the description'}; `
    + `a few telling details in lighter, sparser lines, so that ${n > 1 ? 'they stand' : 'it stands'} out against it. `
    + 'Filling a tall frame (2:3). White paper, no colour, no grey wash, no text, no border.';
}

/* An enemy's name without its numbers and notes in brackets ("2 Ruel Giganite", "Plague Hound (wounded)"). */
const kindOf = (name) => String(name).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/\b\d+\b/g, ' ').replace(/\s+/g, ' ').trim();

/* The picture sheet's Prompt button (the owner, 2026-11-03): an enemy's latest proposal row with a prompt,
   from its book's plate-proposals.done.json and plate-proposals.json, oldest first (the open file last),
   so the button gives the description, count and setting the proposal sheet would; null if none. */
export function savedFor(files, name) {
  const rows = files.flatMap((f) => (f?.rounds || [f]).flatMap((r) => r?.enemies || [])).filter((e) => e.prompt);
  const k = kindOf(name);
  return rows.findLast((e) => e.name === name) || rows.findLast((e) => kindOf(e.name) === k) || null;
}

/* An enemy's stored setting and count (about/foe-scene.json, {book: {name: {setting, figures}}}, written at
   step 7 for every kind; the owner, 2026-11-03): its own name first, else its plain kind's; null if none. */
export function sceneFor(scenes, code, name) {
  const mine = scenes?.[code] || {};
  if (mine[name]) return mine[name];
  const k = kindOf(name);
  return Object.entries(mine).find(([n]) => kindOf(n) === k)?.[1] || null;
}

/* How many figures the picture shows: the saved count, else the stored one (sceneFor), else the number the name starts with, else one for
   a name in the singular; null for a plural-looking one ("Ambushers", but also "Gildas"), which the owner says. */
export function countOf(name, saved, scene) {
  const n = Number(saved?.figures) || Number(scene?.figures) || Number(String(name).match(/^\d+/)?.[0]);
  if (n) return n;
  return /[^su]s$/.test(kindOf(name)) ? null : 1;
}
