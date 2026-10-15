/* Draft a book's item table (items/items-<book>.js) from what its text says with certainty.

     node tools/items_draft.mjs 13tplor

   Step 5's script (ADR 0036, docs/reference/items.md). It reads the imported sections (book.js) a
   sentence at a time and fills in only the plain readings: Gold Crowns, Meals and items with a known
   id found or offered, items lost, Endurance lost or restored on arrival, and the choices gated on a
   known item or on paying Gold Crowns. A sentence that says any of these under a condition, or names
   an item no table knows, is not guessed: its section gets a `todo` naming what to read there. The
   agent's prompt (and the owner) refine the draft from there.

   With no items-<book>.js yet, the draft is written there. With one, it is never touched: the draft
   goes to data/projectaon/<book>/items-draft.js instead, and is compared with the table section by
   section (how many of its readings the hand-made table agrees with), which is how the rules here
   were tuned on Books 1-12. Prints counts and section ids only, never text. */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export const HEADER = '// DRAFT by tools/items_draft.mjs';

const WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50 };
const NUM = `(\\d+|${Object.keys(WORDS).join('|')})`;
const COUNT = `(\\d+|${Object.keys(WORDS).filter((w) => !/^an?$/.test(w)).join('|')})`; // "lose a" is no number
const num = (s) => (/^\d+$/.test(s) ? +s : WORDS[s.toLowerCase()]);

// a sentence that holds only under a condition, or over time, is not read
const COND = /\b(if|unless|otherwise|instead|whether|either|until|when|whenever|each|every|per|round|rounds|before|after|later|next time|Random Number|chance|should|would|could|might|will|must have)\b/i;
// "If you wish to keep it" is an offer, not a condition
const OFFER_IF = /\b(?:if|should) you (?:wish|want|decide|choose|would like|wish instead) to\b/gi;
const OFFER = /\b(may|wish|want|choose|decide|would like|are free to|can take|can keep)\b/i;
const GIVE = /\b(pocket|you find|you discover|you are given|you receive|hands? you|gives? you|presents? you|you collect|you now (?:have|possess)|you take|you pick up|you put|you place|you slip|you tuck)\b/i;
const CHART = /\b(Action Chart|Special Items?|Backpack Items?|Weapons? List|Belt Pouch|record|mark (?:it|this|them|these)|note (?:it|this)|add (?:it|this|them|these))\b/i;
const LOSE_ITEM = /\b(erase|you lose|is lost|are lost|is stolen|are stolen|has been stolen|have been stolen|confiscate[sd]?|is destroyed|shatters?|snaps?)\b/i;
const PAY = /\b(pay|paid|payment|give|hand over|offer|spend|cost|costs|price|charge|charges|fee|bet|wager|stake|bribe|buy|purchase|sell|sold|worth|lose|lost|stolen|take your|takes your)\b/i;

const EP_LOSE = new RegExp(`\\b(?:(?:lose|loses|deduct|subtract|take away|takes away|costs? you)\\s+${COUNT}\\s+ENDURANCE|reduce your ENDURANCE(?: score| total| points)? by (?:a further |another )?${COUNT}\\b)`, 'i');
const EP_GAIN = new RegExp(`\\b(?:restore|restores|regain|gain|add|recover|heals?)\\s+${COUNT}\\s+ENDURANCE`, 'i');
const EP_FULL = /\b(?:restore|restores|restored|regain|recover)\b.*\b(?:all (?:of )?(?:your |the )?(?:lost )?ENDURANCE|ENDURANCE[^.]*\b(?:original|maximum|initial|full)\b)/i;
const GOLD = new RegExp(`\\b${NUM}\\s+Gold Crowns?\\b`, 'g');
// a section that sells, or lists wares with prices: what is bought there is a judgement
const SHOP = /\b(buy|buys|purchase|sell|sells|price|prices|for sale|wares)\b|\(\s*\d+ Gold Crowns?\s*\)/i;
const MEALS = new RegExp(`\\b(?:food|provisions|rations)?[^.]*?\\b${NUM}\\s+Meals?\\b`, 'i');

// a shot of his own: he draws or fires an Arrow, or his Arrow strikes
const SHOT = /\byou\b[^.]*\b(?:draw|fire|loose|notch|nock|release)\b[^.]*\bArrow\b|\byour Arrow\b/i;
const sentences = (paras) => (paras || []).flatMap((p) => p.split(/(?<=[.!?:;])\s+(?=[A-Z‘“"'(])/));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* The items a draft may name: every name that one id has across the engine and the tables. A name
   two ids share (a Blanket, an Iron Key) stays out: which id a new book's would be is a judgement. */
export function itemNames(sources) {
  const by = new Map();
  for (const items of sources) for (const [id, it] of Object.entries(items || {})) {
    if (!it || !it.name) continue;
    const ids = by.get(it.name) || new Set();
    ids.add(id); by.set(it.name, ids);
  }
  // an id with a book's number (blanket9, skeletonKey7) is that book's own common thing: another
  // book's Skeleton Key is another key, so its name is no certain reading
  const names = [...by].filter(([, ids]) => ids.size === 1 && !/\d$/.test([...ids][0])).map(([name, ids]) => ({ name, id: [...ids][0] }));
  names.sort((a, b) => b.name.length - a.name.length); // the longest first: "Short Sword" before "Sword"
  const out = names.map((n) => ({ ...n, re: new RegExp(`\\b${esc(n.name).replace(/’/g, "['’]")}s?\\b`) }));
  // the standard weapons, which a gate asks for by kind (sources[0] is the engine's LW.ITEMS, then the Bow)
  out.weapons = new Set(sources.slice(0, 2).flatMap((items) => Object.keys(items).filter((id) => items[id].kind === 'weapon')));
  return out;
}

/* The known items named in a piece of text, the longest match winning where names overlap. A name
   inside a longer capitalised one is another thing: a Magic Spear is no Spear, a Red Pass no Pass. */
const PLAIN = /^(?:If|You|Your|The|A|An|This|That|These|Those|It|He|She|They|His|Her|Their|Its|One|Some|Any|And|Or|But|With|In|On|To|Of|For|Each|Both|Either|Neither|Now|Then|When|As)$/;
function named(text, names) {
  const found = [];
  let rest = text;
  for (const n of names) {
    const re = new RegExp(n.re.source, 'g');
    let ok = false;
    rest = rest.replace(re, (m, at) => {
      const before = rest.slice(0, at).match(/([A-Z][\w’'-]*)\s+$/), after = rest.slice(at + m.length);
      // a Jar of Laumspur is no Laumspur, nor a jar of concentrated Laumspur
      const head = rest.slice(0, at);
      if (/\b(?:in|into|inside|within|from|on)\s+(?:your|the|his|her|its)\s+$/i.test(head)) return m; // where a thing is kept, not the thing
      if (/[A-Z][\w’'-]*\s+of\s+(?:the\s+)?$/.test(head) || /\b(?:jar|bottle|vial|phial|flask|pouch|bag|sack|box|chest|case|bundle|pot)\s+of\s+(?:\w+\s+)?$/i.test(head)) return m;
      const start = before &&/(^|[.!?:;]\s+|[‘“"(]\s*)$/.test(rest.slice(0, at - before[0].length));
      if ((before && !start && !PLAIN.test(before[1])) || /^\s+(?:of\s+(?:the\s+)?)?[A-Z][a-z]/.test(after) && !/^\s+(?:If|You|Your|The)\b/.test(after)) return m;
      ok = true;
      return ' ';
    });
    if (ok) found.push(n.id);
  }
  return found;
}
// a capitalised name before "Special Item" / "Backpack Item" that no table knows
const unknownItem = (s, names) => /\b(Special Item|Backpack Item)\b/.test(s) && !named(s, names).length;

// handed over: the giving comes first and takes the thing as its object ("he hands you the Key"; not
// "the Key glows in your pocket", nor "you discover that the Quiver is empty")
function handed(s, ids, names) {
  const g = GIVE.exec(s), at = Math.min(...ids.map((id) => s.search(names.find((n) => n.id === id).re)));
  return g.index < at && !/\b(that|is|are|was|were|has|have|had)\b/.test(s.slice(g.index + g[0].length, at));
}

/* One section: {entry, todo: [what to read]}. */
export function draftSection(sec, names) {
  const e = {}, todo = new Set();
  const add = (f, x) => (e[f] = e[f] || []).push(x);
  // what is in brackets mostly describes a thing (a potion's "restores 3"), which does not happen here;
  // a wound is the exception ("(lose 2 ENDURANCE points)"). A paragraph that names a Discipline is
  // conditional throughout ("unless you have Mind Over Matter")
  const paras = (sec.text || []).map((p) => p.replace(/\(([^)]*)\)/g, (m, x) => (/\b(lose|deduct|erase|remember)\b/i.test(x) ? ` ${x.replace(/!/g, '')}. ` : ' ')));
  const ss = paras.flatMap((p, k) => sentences([p]).map((s) => ({ s, k })));
  const shop = paras.some((p) => SHOP.test(p));
  // a list of wares or finds ("– Sword"): which of them he takes, and at what price, is read by hand
  const LIST = /^\s*[–—-]\s/, list = paras.some((p) => LIST.test(p));
  let ep = 0, epFull = false, spent = 0;
  ss.forEach(({ s: raw, k }, i) => {
    const s = raw.replace(OFFER_IF, 'may');
    const next = ss[i + 1] && ss[i + 1].k === k ? ss[i + 1].s : '', prev = i && ss[i - 1].k === k ? ss[i - 1].s : '';
    const near = s + ' ' + next;
    if (LIST.test(raw)) { if (named(s, names).length || /Gold Crown|Meal/.test(s)) todo.add('items'); return; }
    // what someone says ("Ale is one Gold Crown") is no event
    const cond = COND.test(s) || /[‘“"]/.test(s) || /Discipline/.test(paras[k]) || (/[:;,]$/.test(prev.trim()) && COND.test(prev));
    const offer = OFFER.test(s) || (OFFER.test(next) && !COND.test(next.replace(OFFER_IF, 'may')));
    // Endurance on arrival; the Meal rule's "or lose 3" is the importer's
    const lose = s.match(EP_LOSE), gain = s.match(EP_GAIN), full = EP_FULL.test(s);
    if (lose || gain || full) {
      if (cond || /\bmeal/i.test(s) || sec.rnt || offer || (lose && gain)) todo.add('Endurance');
      else if (full) epFull = true;
      else ep += lose ? -num(lose[1] || lose[2]) : num(gain[1]);
    } else if (new RegExp(`${COUNT}\\s+ENDURANCE`, 'i').test(s) && !/\bmeal/i.test(s)) todo.add('Endurance');
    // Gold Crowns found or offered
    const golds = [...s.matchAll(GOLD)];
    if (golds.length) {
      if (golds.length > 1 || cond || shop || list || PAY.test(s) || /\bfor\s+$/i.test(s.slice(0, golds[0].index)) || named(s, names).length) todo.add('Gold Crowns');
      else if (offer) add('loot', { gold: num(golds[0][1]) });
      else if (GIVE.test(s) || /\b(pocket|Belt Pouch)\b/.test(near)) add('give', { gold: num(golds[0][1]) });
      else todo.add('Gold Crowns');
    }
    // Meals found or offered (not eaten: that is the importer's)
    const meals = s.match(MEALS);
    if (meals && !/\b(eat|eaten|eating)\b/i.test(s)) {
      // "enough for more than 10 Meals": how many he takes is his choice
      if (/\b(more than|up to|at least|as many)\b/i.test(s)) { todo.add('Meals'); meals.length = 0; }
    }
    if (meals && meals.length && !/\b(eat|eaten|eating)\b/i.test(s)) {
      // Meals found are his to take (a full Backpack may have no room): given only when handed over
      if (cond || shop || list || PAY.test(s)) todo.add('Meals');
      else if (/\b(you are given|hands? you|gives? you)\b/i.test(s)) add('give', { meal: num(meals[1]) });
      else if (offer || GIVE.test(s) || CHART.test(near)) add('loot', { meal: num(meals[1]) });
      else todo.add('Meals');
    }
    // Arrows, counted in the Quiver: spent where the text says to deduct one. A shot told without that
    // may have spent its Arrow a section earlier (the shot drawn there, its outcome told here), so it is
    // read by hand; a shot decided by a Random Number is the table's bowShot
    const arrows = s.match(new RegExp(`\\b${NUM}\\s+Arrows?\\b`, 'i')), shot = SHOT.test(s);
    if (arrows || shot) {
      if (sec.rnt) todo.add('a bow shot');
      else if (arrows && /\b(erase|deduct|remove)\b/i.test(s) && !cond && !offer) spent = Math.max(spent, num(arrows[1]));
      else if (shot || LOSE_ITEM.test(s) || offer || CHART.test(s)) todo.add('Arrows');
      return;
    }
    // whole kinds of things lost
    const all = /\ball (?:of )?your (Weapons|weapons|Backpack Items|Special Items)\b/.exec(s);
    if (all && LOSE_ITEM.test(s)) {
      if (cond || offer) todo.add('items lost');
      else add('take', all[1].toLowerCase() === 'weapons' ? { weapons: 'all' } : all[1] === 'Backpack Items' ? { backpack: 'items' } : { special: 'all' });
      return;
    }
    // items with a known id
    const ids = named(s, names);
    if (unknownItem(s, names)) todo.add('an item no table knows yet');
    if (!ids.length) { if (LOSE_ITEM.test(s) && CHART.test(s)) todo.add('items lost'); return; }
    if (LOSE_ITEM.test(s)) {
      // "erase this Sword": one particular sword, which may be another id (a Dval Sword)
      if (cond || offer || ids.length > 1 || /\b(this|that|these|those)\s+[A-Z]/.test(s)) todo.add('items lost');
      else add('take', { item: ids[0] });
    } else if (cond || shop || list || PAY.test(s) || /\b(or|one of|either)\b/.test(s)) {
      if (offer || GIVE.test(s) || CHART.test(near)) todo.add('items');
    } else if (offer && (CHART.test(near) || /\b(take|keep)\b/.test(near))) {
      ids.forEach((id) => add('loot', { item: id }));
    } else if (GIVE.test(s) && CHART.test(near) && handed(s, ids, names)) {
      ids.forEach((id) => add('give', { item: id }));
    } else if (CHART.test(s)) todo.add('items');
  });
  // the choice lines: Endurance written on one, and the gates
  const onChoice = [];
  for (const c of sec.choices || []) {
    const t = c.text || '';
    // "Restore 2 ENDURANCE points and turn to 80" is his on the way there: what the number drawn does, on
    // arrival here when it is the one way on, else placed on the section it leads to by draftBook
    const cl = t.match(EP_LOSE), cg = t.match(EP_GAIN), cf = EP_FULL.test(t);
    if (cl || cg || cf) {
      const n = cf ? 'full' : cl ? -num(cl[1] || cl[2]) : num(cg[1]);
      if (/\b(unless|otherwise|instead|each|every|round|meal)\b/i.test(t) || (cl && cg)) todo.add('Endurance');
      else if (c.range && n !== 'full') add('rolls', { range: c.range, ep: n });
      else if (c.range) todo.add('Endurance');
      else if (sec.choices.length === 1 && n === 'full') epFull = true;
      else if (sec.choices.length === 1) ep += n;
      else onChoice.push({ to: c.to, ep: n });
    }
    if (c.need ||/Discipline|Magnakai|Kai\b|Lore-circle/.test(t)) continue;
    const gold = [...t.matchAll(GOLD)];
    if (gold.length) {
      // paying the fee is a gate; not paying it ("if you cannot pay") is the way left open
      if (/\b(not|cannot|can't|unable|refuse|no)\b/i.test(t)) continue;
      if (gold.length === 1 && /\b(pay|give|offer|spend|hand over|bribe|buy|purchase|afford)\b/i.test(t)) (e.need = e.need || {})[c.to] = { gold: num(gold[0][1]), spend: true };
      else todo.add('a gate');
      continue;
    }
    const m = /\bIf you (do not have|do not possess|have no|possess no|have|possess|are carrying|carry|still have|still possess|are wearing|wear|hold)\b(.*?)(?:\bturn to\b|$)/.exec(t);
    if (!m) continue;
    const clause = m[2].replace(/,?\s*(?:and )?(?:you )?(?:wish|want|decide) to\b.*$/, '');
    const not = /no\b|not/.test(m[1]);
    // one item, or a list of single items any of which will do; "a Torch and Tinderbox", "neither... nor",
    // "not X but Y" are more than one condition
    const alts = clause.split(/,?\s+\bor\b\s+|,\s*/).map((a) => a.trim()).filter((a) => a && !/^(?:any|either)$/i.test(a));
    const ids = alts.map((a) => (/\b(and|but|neither|nor|mastery)\b/.test(a) ? [] : named(a, names)));
    if (!alts.length) continue;
    if (/\b(but|neither|nor)\b/.test(clause) || ids.some((x) => x.length !== 1)) {
      if (ids.some((x) => x.length) || /\b[A-Z][a-z]+/.test(clause) || /Special Item|Backpack/.test(clause)) todo.add('a gate');
      continue;
    }
    // a weapon is asked for by its kind, which a weapon-like item counts as (the Silver Bow is a Bow)
    const list = [...new Set(ids.flat())], kinds = list.filter((id) => names.weapons && names.weapons.has(id)), rest = list.filter((id) => !kinds.includes(id));
    const one = (x) => (x.length > 1 ? x : x[0]);
    let need = !kinds.length ? { item: one(rest) } : { any: [{ weapon: kinds }, ...(rest.length ? [{ item: one(rest) }] : [])] };
    if (not) need = kinds.length ? { any: [{ not: { any: need.any } }] } : { ...need, not: true };
    (e.need = e.need || {})[c.to] = need;
  }
  if (epFull) e.ep = 'full'; else if (ep) e.ep = ep;
  if (spent) add('take', { arrows: spent });
  return { entry: e, todo: [...todo], onChoice };
}

const TODO_ORDER = ['items', 'items lost', 'Arrows', 'a bow shot', 'an item no table knows yet', 'Gold Crowns', 'Meals', 'Endurance', 'a gate'];
const todoText = (list) => {
  const l = TODO_ORDER.filter((x) => list.includes(x));
  return (l.length > 1 ? l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1] : l[0]) + ': as the text says';
};

/* Every section of a book: {id: entry}, with the todos written in. Endurance written on a choice goes
   on the section it leads to: on arrival where nothing else leads there, else only when he came this way. */
export function draftBook(book, names) {
  const drafts = {}, from = {};
  for (const [id, sec] of Object.entries(book.sections)) {
    drafts[id] = draftSection(sec, names);
    for (const c of sec.choices || []) (from[c.to] = from[c.to] || new Set()).add(id);
  }
  for (const [id, d] of Object.entries(drafts)) for (const { to, ep } of d.onChoice) {
    const t = drafts[to];
    if (!t) continue;
    if (from[to].size > 1) (t.entry.when = t.entry.when || []).push({ came: [id], ep });
    else if (t.entry.ep == null) t.entry.ep = ep;
    else if (typeof ep === 'number' && typeof t.entry.ep === 'number') t.entry.ep += ep;
    else t.todo.push('Endurance');
  }
  const out = {};
  for (const [id, { entry, todo }] of Object.entries(drafts)) {
    if (todo.length) entry.todo = todoText([...new Set(todo)]);
    if (Object.keys(entry).length) out[id] = entry;
  }
  return out;
}

// JS source in the tables' own style: one line a section, keys bare
const js = (v) => Array.isArray(v) ? `[${v.map(js).join(', ')}]`
  : v && typeof v === 'object' ? `{ ${Object.entries(v).map(([k, x]) => `${/^[A-Za-z_]\w*$/.test(k) ? k : `'${k}'`}: ${js(x)}`).join(', ')} }`
    : typeof v === 'string' ? `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : String(v);
export function render(code, sections) {
  const ids = Object.keys(sections).sort((a, b) => a - b);
  const todos = ids.filter((id) => sections[id].todo).length;
  return `${HEADER} (${new Date().toLocaleDateString('sv')}): ${ids.length} sections, ${todos} with a todo.
/* Book ${code}'s items, drafted by script (ADR 0036): only the plain readings are filled in (Gold Crowns,
   Meals and known items found, offered or lost; Endurance on arrival; gates on a known item or a fee).
   Each todo names what the draft left to read in that section. Refine it by docs/reference/items.md:
   read every todo's section and the reading list (items-reading.txt), add the book's own items, the
   rolls, fights and the rest, then take out this header's first line. */
export const ITEMS = {};

export const SECTIONS = {
${ids.map((id) => `  ${id}: ${js(sections[id])},`).join('\n')}
};
`;
}

/* How far a draft agrees with a hand-made table, field by field: {field: {draft, agree}} plus the
   sections the draft filled in wrongly. A reading agrees when the table has the same value there
   (a give or loot entry: the same item, gold or meal in the table's give or loot). */
export function compare(draft, hand) {
  const key = (x) => (x.item ? `item:${[].concat(x.item)}` : x.gold != null ? `gold:${x.gold}` : x.meal != null ? 'meal' : JSON.stringify(x));
  const meals = (e) => ['give', 'loot'].reduce((n, f) => n + (e[f] || []).reduce((m, x) => m + (x.meal || 0), 0), 0);
  const stats = {}, wrong = {};
  const tally = (f, ok, id) => { const s = (stats[f] = stats[f] || { draft: 0, agree: 0 }); s.draft++; if (ok) s.agree++; else (wrong[f] = wrong[f] || []).push(id); };
  for (const [id, d] of Object.entries(draft)) {
    const h = hand[id] || {};
    // Meals agree on the total found (five Meals, or five of one each)
    const has = (fields, x) => x.meal != null ? meals(h) === meals(d) : fields.some((f) => (h[f] || []).some((y) => key(y) === key(x)));
    (d.give || []).forEach((x) => tally('give', has(['give', 'loot'], x), id));
    (d.loot || []).forEach((x) => tally('loot', has(['loot', 'give'], x), id));
    (d.take || []).forEach((x) => tally('take', has(['take'], x) || (h.when || []).some((w) => (w.take || []).some((y) => key(y) === key(x))), id));
    if (d.ep != null) tally('ep', h.ep === d.ep, id);
    (d.rolls || []).forEach((r) => tally('rolls', (h.rolls || []).some((x) => x.ep === r.ep && String(x.range) === String(r.range)), id));
    (d.when || []).forEach((w) => tally('ep', (h.when || []).some((v) => v.ep === w.ep && (v.came || []).includes(w.came[0])) || h.ep === w.ep, id));
    // a gate agrees on the same fee, or the same items or weapon kinds (one list within the other: the
    // tables name the Silver Bow beside the Bow in some books), held or not held
    const gate = (g, not = false) => {
      const ids = new Set([].concat(g.item || [], g.weapon || []));
      let neg = not !== !!g.not && !!g.not !== false ? true : not;
      for (const x of g.any || []) { const y = gate(x.not || x, !!x.not); y.ids.forEach((i) => ids.add(i)); neg = neg || y.neg; }
      if (g.not && typeof g.not === 'object') { const y = gate(g.not, true); y.ids.forEach((i) => ids.add(i)); neg = true; }
      return { ids, neg: neg || g.not === true, gold: g.gold || 0 };
    };
    const within = (a, b) => [...a].every((i) => b.has(i));
    for (const [to, n] of Object.entries(d.need || {})) {
      const g = h.need && h.need[to];
      const x = g && gate(g), y = gate(n);
      tally('need', !!g && x.gold === y.gold && x.neg === y.neg && (within(x.ids, y.ids) || within(y.ids, x.ids)), id);
    }
    if (d.todo) tally('todo', Object.keys(h).length > 0, id);
  }
  // what the table has that the draft neither filled in nor flagged
  const missed = Object.keys(hand).filter((id) => !draft[id]);
  return { stats, wrong, missed };
}

// the engine's items and every other book's table: what a new book's draft can name
async function knownItems(root, book) {
  globalThis.window = globalThis; globalThis.LW = { BOOKS: {} }; globalThis.document = { write() {} };
  const p = path.join(root, 'shared/core.js'); delete require.cache[require.resolve(p)]; require(p);
  const sources = [LW.ITEMS, { bow: { name: 'Bow', kind: 'weapon' }, quiver: { name: 'Quiver', kind: 'special' } }]; // rules-series.js
  const dir = path.join(root, 'items');
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^items-\w+\.js$/.test(f) && f !== `items-${book}.js`) : []) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    if (text.startsWith(HEADER)) continue; // another draft names nothing new
    sources.push((await import(pathToFileURL(path.join(dir, f)).href + `?t=${Date.now()}`)).ITEMS);
  }
  return sources;
}

/* Draft one book under `root`; returns {code, text, file, sections, compared?}. */
export async function draftItems({ root = ROOT, book }) {
  const bookJs = path.join(root, 'data', 'projectaon', book, 'book.js');
  if (!fs.existsSync(bookJs)) return { code: 1, text: `no data/projectaon/${book}/book.js: import the book first` };
  globalThis.window = globalThis; globalThis.LW = { BOOKS: {} };
  const sources = await knownItems(root, book);
  (0, eval)(fs.readFileSync(bookJs, 'utf8'));
  const B = LW.BOOKS[book];
  const sections = draftBook(B, itemNames(sources));
  const table = path.join(root, 'items', `items-${book}.js`);
  const hand = fs.existsSync(table) && !fs.readFileSync(table, 'utf8').startsWith(HEADER);
  const file = hand ? path.join(root, 'data', 'projectaon', book, 'items-draft.js') : table;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, render(book, sections));
  const ids = Object.keys(sections);
  const n = (f) => ids.filter((id) => sections[id][f]).length;
  const lines = [`${ids.length} sections: give ${n('give')}, loot ${n('loot')}, take ${n('take')}, ep ${n('ep')}, need ${n('need')}, todo ${n('todo')}`,
    `wrote ${path.relative(root, file).replace(/\\/g, '/')}`];
  let compared;
  if (hand) {
    const T = await import(pathToFileURL(table).href + `?t=${Date.now()}`);
    compared = compare(sections, T.SECTIONS);
    lines.push(`items-${book}.js exists and was left alone; the draft against it (readings the table agrees with):`);
    for (const [f, s] of Object.entries(compared.stats)) lines.push(`  ${f}: ${s.agree} of ${s.draft}${compared.wrong[f] ? `  (not in the table: ${compared.wrong[f].join(' ')})` : ''}`);
    lines.push(`  ${compared.missed.length} table sections the draft neither filled nor flagged: ${compared.missed.join(' ')}`);
  }
  return { code: 0, text: lines.join('\n'), file, sections, compared };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2]) { console.log('usage: node tools/items_draft.mjs <book code>'); process.exit(2); }
  const r = await draftItems({ book: process.argv[2] });
  console.log(r.text);
  process.exit(r.code);
}
