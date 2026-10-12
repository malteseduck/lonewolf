/* Which picture a fight shows. One place for the rule, used by main.js, the picture sheet
   (tools/admin/fights.html) and tools/plates_pin.mjs:

   - a pin: the picture the owner approved for that fight, kept in assets/plates/approved/<book>.json
     when the book's fight pictures were marked done (docs/reference/interface.md, Art pipeline);
   - else a plates.json entry marked over (the owner's choice, even over the section's own);
   - else the section's own illustration;
   - else the first plates.json entry that matches (one with a book is for that book only);
   - else none: the drawn emblem.

   A plate is {src, crop?, levels?, flip?} with src relative to the project root, or null for the emblem. */

/* plates.json's entries with their match compiled */
export const compilePlates = (list) => (list || []).map((p) => Object.assign({ re: new RegExp(p.match, 'i') }, p));

/* what plates.json and the book pick now, ignoring pins */
export function choosePlate(foe, book, plates) {
  const fits = (p) => (!p.book || p.book === book.id) && p.re.test(foe.name);
  const lib = plates.find((p) => p.over && fits(p)) || (!foe.art && plates.find(fits));
  if (lib && (lib.over || !foe.art)) return Object.assign({ src: lib.src }, lib.crop && { crop: lib.crop }, lib.levels && { levels: lib.levels }, lib.flip && { flip: true });
  return foe.art ? { src: (book.assets || '') + foe.art } : null;
}

/* a pin is kept against a short hash of the enemy's name, not the name (no book text in the repository),
   so a pin whose fight now holds another enemy is not used */
export function nameKey(name) {
  let h = 0x811c9dc5;
  for (const c of String(name).toLowerCase()) h = Math.imul(h ^ c.codePointAt(0), 0x01000193) >>> 0;
  return h.toString(36);
}
export const pinKey = (sectionId, i) => `${sectionId}/${i}`;

/* the plate shown: the pin when there is one for this enemy, else what is picked now */
export function pickPlate(foe, book, plates, pins, key) {
  const pin = pins && pins[key];
  return pin && pin.name === nameKey(foe.name) ? pin.plate : choosePlate(foe, book, plates);
}

export const samePlate = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);

/* What the picture sheet asks the owner about (ADR 0020), once a book's pictures are approved: 'same';
   'changed' (was: the approved picture, now: the one that would replace it); or 'new', a fight with no
   approved picture yet (a re-import that adds a fight, a foe renamed). */
export function pinState(foe, book, plates, pins, key) {
  if (!pins) return { state: 'same' };
  const pin = pins[key], now = choosePlate(foe, book, plates);
  if (!pin || pin.name !== nameKey(foe.name)) return { state: 'new', now };
  return samePlate(pin.plate, now) ? { state: 'same' } : { state: 'changed', was: pin.plate, now };
}
