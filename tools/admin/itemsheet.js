/* The item sheet's reading of the item tables (tools/admin/items.html): which items a book has, where its
   sections use each, and which items share an icon. Pure: the page loads the tables and the engine. */

// the fields of an item table's sections that name an item (docs/reference/book-format.md)
const FIELDS = ['item', 'items', 'weapon', 'wield', 'lend', 'keep'];
// a section's top-level field, as the sheet says it
export const HOW = { loot: 'offered', give: 'given', take: 'taken', need: 'needed for a choice', fight: 'in a fight', when: 'tested', sell: 'sold', stake: 'staked', bowShot: 'bow shot', game: 'game' };

/* {item id: {top-level field: [section ids]}} for every item a table's sections name. */
export function uses(sections) {
  const out = {};
  const add = (id, how, sid) => {
    if (typeof id !== 'string') return;
    const by = (out[id] ||= {}), list = (by[how] ||= []);
    if (!list.includes(sid)) list.push(sid);
  };
  const walk = (v, how, sid) => {
    if (Array.isArray(v)) return v.forEach((x) => walk(x, how, sid));
    if (!v || typeof v !== 'object') return;
    for (const f of FIELDS) [].concat(v[f] ?? []).forEach((id) => add(id, how, sid));
    for (const x of Object.values(v)) walk(x, how, sid);
  };
  for (const [sid, sec] of Object.entries(sections || {})) {
    for (const [how, v] of Object.entries(sec || {})) {
      if (how === 'sell') Object.keys(v || {}).forEach((id) => add(id, how, sid));
      else walk(v, how, sid);
    }
  }
  return out;
}

/* The cards of one book: its own items first, in the table's order, then the items from elsewhere its
   sections name (the engine's, another book's). tables: {code: {ITEMS, SECTIONS}}; items: LW.ITEMS;
   glyphOf(id): the icon the player shows; named(id): whether one is chosen for it, not its kind's default. */
export function cards(code, tables, items, glyphOf, named) {
  const own = tables[code]?.ITEMS || {}, used = uses(tables[code]?.SECTIONS);
  const all = Object.fromEntries(Object.entries(tables).map(([c, t]) => [c, uses(t.SECTIONS)]));
  const homeOf = (id) => (id in own ? code : Object.keys(tables).find((c) => id in (tables[c].ITEMS || {})) || (id in items ? 'engine' : null));
  const ids = [...Object.keys(own), ...Object.keys(used).filter((id) => !(id in own)).sort()];
  return ids.map((id) => ({
    id, item: own[id] || items[id] || null, home: homeOf(id), glyph: glyphOf(id), named: named(id), used: used[id] || {},
    // the other books whose tables have it or name it
    books: Object.keys(tables).filter((c) => c !== code && (id in (tables[c].ITEMS || {}) || id in all[c])),
  }));
}

/* {glyph: [item ids]} over every item the engine and the tables know. */
export function glyphUsers(ids, glyphOf) {
  const out = {};
  for (const id of ids) (out[glyphOf(id)] ||= []).push(id);
  return out;
}
