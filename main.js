/* Lone Wolf: a flat book in the manner of Lone Wolf HD.
   Left page: the story. Right page: a panel (Kai Disciplines, inventory, map, or the fight).
   Plays the books imported by tools/import_projectaon.py. */
import * as Ink from './shared/ink.js';
import { drawCreature, setArt, setEmblem, newWound, drawHero, heroFromArt, portraitFromArt, drawFrame, drawSheet, drawBanner, drawCrest, gearSVG } from './plates.js';
import { MAPS, LASTLANDS, mapCanvas, loadStamps, stampsLoaded, printedCanvas, replicaModel, replicaCanvas, placeBook, along } from './maps.js';

import * as ITEMS_01 from './items-01fftd.js';
import * as ITEMS_02 from './items-02fotw.js';

const LW = window.LW;
const BOOKS = Object.assign({}, LW.BOOKS || {});

/* Each book's hand-made item table (items-<code>.js) is laid over its sections the first time the
   book is opened. Every book's items are known from the start, so a Lone Wolf carried on from one
   book still shows what he took from it. */
const ITEM_TABLES = { '01fftd': ITEMS_01, '02fotw': ITEMS_02 };
Object.values(ITEM_TABLES).forEach((t) => LW.addItems(t.ITEMS));
function applyItems(b) {
  const t = ITEM_TABLES[b.id];
  if (!t || b.itemsApplied) return;
  b.itemsApplied = true;
  for (const [id, x] of Object.entries(t.SECTIONS)) {
    const sec = b.sections[id];
    if (!sec) continue;
    const { need, fight, bowShot, ...rest } = x;
    Object.assign(sec, rest);
    // a bow shot: the ranges are for the total, so the importer could not read them; given here per choice
    if (bowShot) { sec.bowShot = true; sec.rnt = 'auto'; for (const [to, r] of Object.entries(bowShot)) sec.choices.filter((c) => c.to === to).forEach((c) => { c.range = r; }); }
    if (fight && sec.combat) {
      const { mindforce, undead, drain, ...f } = fight; // these three belong to each enemy
      Object.assign(sec.combat, f);
      sec.combat.enemies.forEach((e) => Object.assign(e, mindforce && { mindforce }, undead && { undead }, drain && { drain }));
    }
    // a gate the importer set wrongly is cleared with null
    for (const [to, n] of Object.entries(need || {})) sec.choices.filter((c) => c.to === to).forEach((c) => { if (n === null) delete c.need; else c.need = Object.assign({}, c.need, n); });
  }
}

/* ---------- adventures ----------
   Each adventure is a game of its own: a save for every book, and the Lone Wolf it carries between
   them. lw-adventures lists them, which one is open, and the last book each had open. */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* no storage: play on */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* nothing to remove */ } },
  keys() { try { return Object.keys(localStorage); } catch (e) { return []; } },
};
const saveKey = (a, id) => `lw-a${a}-save-${id}`, charKey = (a) => `lw-a${a}-character`;
function loadAdventures() {
  let a = null;
  try { a = JSON.parse(store.get('lw-adventures')); } catch (e) { /* made below */ }
  if (a && a.list) return a;
  // first run since there were adventures: the saves already made become the first one
  a = { list: [], at: null };
  const old = store.keys().filter((k) => k.startsWith('lw-save-')).map((k) => k.slice(8));
  if (old.length || store.get('lw-character')) {
    const move = (from, to) => { const v = store.get(from); if (v != null) { store.set(to, v); store.del(from); } };
    old.forEach((id) => move('lw-save-' + id, saveKey(1, id)));
    move('lw-character', charKey(1));
    a.list.push({ id: '1', book: store.get('lw-book') }); a.at = '1';
  }
  store.del('lw-book');
  store.set('lw-adventures', JSON.stringify(a));
  return a;
}
const adv = loadAdventures();
const keepAdventures = () => store.set('lw-adventures', JSON.stringify(adv));
const adventure = () => adv.list.find((a) => a.id === adv.at) || null;
function useAdventure(id) { adv.at = id; keepAdventures(); LW.Character.key = charKey(id); }
function newAdventure() { const id = String(Math.max(0, ...adv.list.map((a) => +a.id)) + 1); adv.list.push({ id, book: null }); useAdventure(id); }
function forgetAdventure(id) {
  store.keys().filter((k) => k.startsWith(`lw-a${id}-`)).forEach(store.del);
  adv.list = adv.list.filter((a) => a.id !== id);
  if (adv.at === id) adv.at = null;
  keepAdventures();
}
if (adventure()) useAdventure(adv.at);
const advName = (id) => `Adventure ${ROMAN[id - 1] || id}`;
const carriedBy = (a) => { try { return JSON.parse(store.get(charKey(a))); } catch (e) { return null; } };

let book = null, L = {}, game = null;
function useBook(id) {
  if (!adventure()) newAdventure();
  book = BOOKS[id]; placeBook(book); applyItems(book); L = book.locations || {};
  LW.bookNumber = book.number || 0; // the Special Item limit depends on it
  game = new LW.Game(book, saveKey(adv.at, id)); game.keep = REWIND;
  adventure().book = id; keepAdventures();
}
const asset = (f) => (book.assets || '') + f;
const saved = (id, a = adv.at) => { try { return JSON.parse(store.get(saveKey(a, id))); } catch (e) { return null; } };
const hasSave = (id, a) => !!(saved(id, a) || {}).s;

const { esc, el, wait } = LW.UI;
const $ = (s) => document.querySelector(s);
const pl = $('#pl'), pr = $('#pr'), bookEl = $('#book'), rtabs = $('#rtabs'), gear = $('#gear');
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- icons ---------- */
/* Drawn glyphs for the disciplines, from game-icons.net (assets/icons/README.txt), cut from the
   medallion's colour by a mask so they can glow like the HD ones */
const DISC_GLYPH = { camouflage: 'hood', hunting: 'high-shot', sixthSense: 'third-eye', tracking: 'footsteps', healing: 'herbs-bundle', weaponskill: 'broadsword', mindshield: 'eye-shield', mindblast: 'brainstorm', animalKinship: 'wolf-howl', mindOverMatter: 'magic-palm',
  weaponmastery: 'crossed-swords', animalControl: 'stag-head', curing: 'healing', invisibility: 'invisible', huntmastery: 'bowman', pathsmanship: 'footprint', psiSurge: 'psychic-waves', psiScreen: 'magic-shield', nexus: 'fire-shield', divination: 'crystal-ball' };
const glyph = (name) => `<span class="glyph" aria-hidden="true"><i style="--g:url(assets/icons/${name}.svg)"></i></span>`;
/* the HD map medallion's compass rose: eight points, each split into a lit and a shaded half */
const ROSE = (() => {
  const pt = (a, len, w) => `<g transform="rotate(${a})"><path class="lt" d="M0 0L0 ${-len}L${w} ${-w}Z"/><path class="dk" d="M0 0L0 ${-len}L${-w} ${-w}Z"/></g>`;
  const minor = [45, 135, 225, 315].map((a) => pt(a, 30, 6)).join(''), major = [0, 90, 180, 270].map((a) => pt(a, 47, 8.5)).join('');
  return `<svg class="rose" viewBox="-50 -50 100 100" aria-hidden="true"><circle class="ring" r="21"/>${minor}${major}<circle class="lt" r="3.2"/></svg>`;
})();
const TAB_ART = { kai: glyph('wolf-head'), pack: glyph('locked-chest'), map: ROSE };
/* items, drawn the same way; anything typed in by hand gets a pouch or a pendant by its kind */
const ITEM_GLYPH = { dagger: 'plain-dagger', spear: 'barbed-spear', mace: 'mace-head', shortSword: 'gladius', warhammer: 'warhammer', sword: 'pointy-sword', axe: 'battle-axe', quarterstaff: 'wizard-staff', broadsword: 'two-handed-sword',
  bow: 'pocket-bow', quiver: 'quiver', arrows: 'arrow-flights', potion: 'health-potion', meal: 'meal', map: 'treasure-map', helmet: 'visored-helm', chainmail: 'mail-shirt' };
const itemGlyph = (id) => glyph(ITEM_GLYPH[id] || (LW.ITEMS[id] && LW.ITEMS[id].glyph) || (id === 'gold' ? 'two-coins' : id === 'pack' ? 'backpack' : LW.itemKind(id) === 'special' ? 'gem-pendant' : LW.itemKind(id) === 'weapon' ? 'pointy-sword' : 'swap-bag'));

/* ---------- materials, drawn once ---------- */
const root = document.documentElement.style;
root.setProperty('--parch-l', `url(${Ink.parchment(900, 1300, false, true).toDataURL('image/jpeg', 0.86)})`);
root.setProperty('--parch-r', `linear-gradient(rgba(120,88,50,0.34), rgba(120,88,50,0.34)), url(${Ink.parchment(860, 1300, true, true).toDataURL('image/jpeg', 0.86)})`);
root.setProperty('--frame', `url(${drawFrame().toDataURL()})`);
root.setProperty('--grid-frame', `url(${drawFrame(1000, 470, { vine: false }).toDataURL()})`);
root.setProperty('--sheet-art', `url(${drawSheet().toDataURL()})`);
root.setProperty('--banner', `url(${drawBanner().toDataURL()})`);
root.setProperty('--crest', `url(${drawCrest().toDataURL()})`);
root.setProperty('--wood', `linear-gradient(rgba(10,7,6,0.55), rgba(10,7,6,0.55)), url(${Ink.leather(512).toDataURL('image/jpeg', 0.8)})`);
{
  const r = Ink.seeded(77), pts = [];
  const j = () => (r() * 1.3).toFixed(2);
  for (let i = 0; i <= 10; i++) pts.push(`${i * 10}% ${j()}%`);
  for (let i = 1; i <= 14; i++) pts.push(`${(100 - r() * 1.6).toFixed(2)}% ${(i * 100) / 14}%`);
  for (let i = 9; i >= 0; i--) pts.push(`${i * 10}% ${(100 - r() * 1.3).toFixed(2)}%`);
  for (let i = 13; i >= 1; i--) pts.push(`${j()}% ${(i * 100) / 14}%`);
  root.setProperty('--torn', `polygon(${pts.join(',')})`);
}
gear.innerHTML = gearSVG();
let portraitURL = null; // Lone Wolf's likeness over the Kai panel, if the owner has a picture of him (art/manifest.json "portrait")
/* Lone Wolf on the maps: the owner's picture of him cut out, toned sepia, over a pointer (art/manifest.json
   "hero": {src, crop}, or a file already cut out), else a painted stand-in */
let heroURL = drawHero().toDataURL();
const heroHTML = () => `<div class="pawn"><img src="${heroURL}" alt="Lone Wolf"></div>`;
/* move the figure; while it slides to a new spot it walks (a bob and a sway, in CSS) */
function place(tok, left, top) {
  if (tok.style.left && (tok.style.left !== left || tok.style.top !== top)) {
    tok.classList.add('walking'); clearTimeout(tok.walk); tok.walk = setTimeout(() => tok.classList.remove('walking'), 1000);
  }
  tok.style.left = left; tok.style.top = top;
}
const vignettes = {};
const vignette = (scene) => vignettes[scene] || (vignettes[scene] = Ink.inkScene(scene, 1000, 340).toDataURL());

/* ---------- state ---------- */
let mode = 'title';          // title | story | battle
let panel = 'kai';           // kai | pack | map
let sel = null;              // what the caption under a panel describes
let busy = false, gearTurn = 0, B = null, mapScan = false, mapShown = null;
let intro = false;           // the book's introduction is showing: 'new' before section 1 of a new game, 'again' when re-read from the shelf
let armed = null;            // steps back to the past place on the map whose "Go back here" is showing
const REWIND = 3;            // how many sections back a rewind reaches

const isDead = () => game.dead || game.section.end === 'death';
const destLoc = (c) => {
  if (!book.locations) return null;
  const here = game.section.loc, tos = c.random ? c.random.table.map((row) => row[1]) : [c.to];
  const locs = [...new Set(tos.map((t) => book.sections[t].loc))];
  // a road into another leg of the journey (another view of the map) stays on the page
  return locs.length === 1 && locs[0] !== here && L[locs[0]].map === L[here].map ? locs[0] : null;
};
/* the book's own page references mean nothing here */
const shown = (t) => {
  let s = t.replace(/[,;]?\s*(?:(?:now|then|and|so|please|by)\s+)*(?:turn(?:ing)?|go(?:ing)?) to \d+[.?!]?\s*$/i, '').trim(); // "..., turn to 12."
  s = s.replace(/\b(?:turn|go) to \d+ and /i, ''); // "..., turn to 12 and risk ..."
  s = s.replace(/^(?:turn|go) to \d+,?\s*(?:and\s+)?/i, '').trim(); // "Turn to 12 and take the south path."
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return /[a-z]{3,}/i.test(s.replace(/\b(?:now|then|and|so|please|you|may|must|can)\b/gi, '')) ? s.replace(/[,;:]+$/, '').replace(/([^.?!])$/, '$1.') : 'Continue'; // one full stop, or the question mark
};
const roads = () => game.choices().map((c, i) => ({ c, i, loc: destLoc(c) })).filter((r) => r.loc);

/* ---------- the medallion of fate ---------- */
function makeDial(onIdleClick) {
  const d = el('button', 'dial');
  d.type = 'button'; d.setAttribute('aria-label', 'Random Number');
  d.innerHTML = `<div class="dial-ring">${Array.from({ length: 10 }, (_, i) => `<span style="transform:rotate(${i * 36}deg) translateY(-4.200em)">${i}</span>`).join('')}</div><div class="dial-hub"></div><div class="dial-pin"></div>`;
  const ring = d.querySelector('.dial-ring'), hub = d.querySelector('.dial-hub');
  let angle = 0, anim = null;
  d.addEventListener('click', () => (anim ? anim.finish() : onIdleClick && onIdleClick()));
  const mark = (n) => { ring.querySelectorAll('.hit').forEach((s) => s.classList.remove('hit')); hub.textContent = n; ring.children[n].classList.add('hit'); };
  return {
    el: d,
    show(n) { angle = -n * 36; ring.style.transform = `rotate(${angle}deg)`; mark(n); },
    async spin() {
      const n = LW.rand10(), from = angle;
      angle = Math.floor(from / 360) * 360 - 1080 - n * 36;
      hub.textContent = ''; ring.querySelectorAll('.hit').forEach((s) => s.classList.remove('hit'));
      hub.classList.add('shuffle');
      const ticks = setInterval(() => { LW.sfx('roll'); hub.textContent = LW.rand10(); }, 70); // the face shuffles while the bezel turns
      anim = ring.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${angle}deg)` }], { duration: still ? 1 : 1500, easing: 'cubic-bezier(0.15, 0.6, 0.2, 1)', fill: 'forwards' });
      await anim.finished.catch(() => {});
      clearInterval(ticks); anim = null; hub.classList.remove('shuffle');
      mark(n); LW.sfx('select');
      await wait(350);
      return n;
    },
  };
}

/* ---------- left page ---------- */
function storyText(sec) {
  const pic = sec.img ? (sec.img.full ? `<img class="vignette full" src="${asset(sec.img.file)}" alt="">` : `<img class="vignette small" data-trim src="${asset(sec.img.file)}" alt="">`)
    : sec.scene ? `<img class="vignette" src="${vignette(sec.scene)}" alt="">` : '';
  const at = sec.img ? Math.min(sec.img.at, sec.text.length) : 1;
  return sec.text.map((p, i) => `${i === at ? pic : ''}<p class="${i ? '' : 'first'}">${esc(p)}</p>`).join('') + (at >= sec.text.length ? pic : '');
}
/* ---------- the title spread, after the HD title page ---------- */
/* the series as tools/import_projectaon.py knows it, so books not yet downloaded can show on the shelf */
const SERIES_TITLES = ['Flight from the Dark', 'Fire on the Water', 'The Caverns of Kalte', 'The Chasm of Doom', 'Shadow on the Sand', 'The Kingdoms of Terror',
  'Castle Death', 'The Jungle of Horrors', 'The Cauldron of Fear', 'The Dungeons of Torgar', 'The Prisoners of Time', 'The Masters of Darkness'];
const bookIds = () => Object.keys(BOOKS).sort((a, b) => (BOOKS[a].number || 0) - (BOOKS[b].number || 0));
const savedAt = (id) => (hasSave(id) ? saved(id).s.at : null);
/* engraved scrollwork either side of a row of medallions: a hairline that curls at each end, with leaves */
const SCROLL = `<svg class="scrollwork" viewBox="0 0 120 24" preserveAspectRatio="none" aria-hidden="true"><path d="M2 12.6C14 12.4 30 9.200 46 9.600 64 10 78 15 96 14.400 104 14.100 110 12.400 112 10.200 113.400 8.600 112.600 6.600 110.800 6.700 109 6.800 108.600 8.900 110 9.600 108.200 9 108.400 7.600 109.800 7.400 111.400 7.200 112.200 9 111.200 10.600 109 13.600 103 15.600 96 15.800 78 16.400 64 11.400 46 11 30 10.600 14 13.800 2 13.400Z"/><path d="M40 9.800C37 6.400 32 5.600 29.400 7.400 32.600 7.200 36 8 40 9.800ZM58 11.600C61.600 15 66.400 16 69.400 14.600 66 14.400 62.400 13.400 58 11.600ZM76 14.400C79 11.600 83.600 10.800 86.600 12 83.400 12.400 80 13.200 76 14.400Z"/></svg>`;
function titleLeftHTML() {
  const ids = bookIds(), byNum = {};
  ids.forEach((id) => { byNum[BOOKS[id].number] = id; });
  const numeral = (n) => {
    const id = byNum[n], name = `${n}. ${SERIES_TITLES[n - 1]}`;
    return id ? `<button type="button" class="med numeral ${hasSave(id) ? 'lit' : ''}" data-book="${id}" title="${esc(name)}" aria-label="${esc(name)}">${ROMAN[n - 1]}</button>`
      : `<span class="med numeral off" title="${esc(name)}, not downloaded">${ROMAN[n - 1]}</span>`;
  };
  const band = (label, from, to) => `<div class="band"><em>${label}</em><div>${SCROLL}${Array.from({ length: to - from + 1 }, (_, i) => numeral(from + i)).join('')}${SCROLL}</div></div>`;
  return `<div class="titlepage">
    <div class="maker">A solo adventure in Magnamund</div>
    <h1 class="mark"><span>Lone</span><span class="wolfmark">${glyph('wolf-head')}</span><span>Wolf</span></h1>
    <div class="frontis">${portraitURL ? `<img src="${portraitURL}" alt="">` : `<img src="${vignette('ruins')}" alt="">`}</div>
    <p class="motto">The monastery burns. The Kai are gone.<br>One remains.</p>
    ${band('The Kai', 1, 5)}${band('The Magnakai', 6, 12)}
  </div>`;
}
/* the right page of the title spread: every adventure, or the books of the one chosen (shelf) */
let shelf = false, forgetting = null;
const roman = (n) => `<span class="roman">${ROMAN[n - 1] || n}</span>`;
function titleRightHTML() { return shelf && adventure() ? shelfHTML() : adventuresHTML(); }
function adventuresHTML() {
  const plaque = (a) => {
    const b = a.book && BOOKS[a.book], sv = b && saved(a.book, a.id), kept = carriedBy(a.id), at = sv && sv.s && sv.s.at;
    const hero = at ? sv.s.hero : kept && kept.hero, rank = hero ? LW.rankOf(hero) || 'Kai Lord' : '';
    const where = at ? `${hero.ep > 0 ? 'Continue at' : 'Fell at'} section ${at}` : kept ? `Waits after ${kept.fromTitle}` : 'Choose a book';
    const more = forgetting === a.id
      ? `<span>Forget this adventure?</span><button type="button" class="inkbtn" data-forget="${a.id}" data-sure>forget it</button><button type="button" class="inkbtn" data-forget="">keep it</button>`
      : `<button type="button" class="inkbtn" data-shelf="${a.id}">the books</button><button type="button" class="inkbtn" data-forget="${a.id}">forget</button>`;
    return `<div class="plaq ${at ? 'going' : ''}"><button type="button" class="plaqmain" data-adv="${a.id}">
        <span class="med">${roman(+a.id)}</span><span class="plaqtext"><b>${esc(b ? b.title : advName(a.id))}</b><i>${esc((rank ? rank + '. ' : '') + where)}</i></span></button>
      <span class="plaqmore">${more}</span></div>`;
  };
  return `<div class="shelfpage">${ruled('Your adventures')}
    <div class="plaqs">${adv.list.map(plaque).join('')}
      <div class="plaq"><button type="button" class="plaqmain" data-advnew><span class="med">${glyph('wolf-head')}</span><span class="plaqtext"><b>A new adventure</b><i>Another game, with a Lone Wolf of its own</i></span></button></div></div></div>`;
}
function shelfHTML() {
  const kept = LW.Character.load(), can = (id) => kept && !kept.completed.includes(id);
  const plaque = (id) => {
    const at = savedAt(id), b = BOOKS[id];
    return `<div class="plaq ${at ? 'going' : ''}"><button type="button" class="plaqmain" data-book="${id}">
        <span class="med">${roman(b.number)}</span><span class="plaqtext"><b>${esc(b.title)}</b><i>${at ? `Continue at section ${esc(String(at))}` : `Book ${b.number} · begin`}</i></span></button>
      <span class="plaqmore">${at && b.intro && b.intro.length ? `<button type="button" class="inkbtn" data-book="${id}" data-tssf>the story so far</button>` : ''}${at ? `<button type="button" class="inkbtn" data-book="${id}" data-fresh>start over</button>` : ''}${can(id) ? `<button type="button" class="inkbtn" data-book="${id}" data-anew>new character</button>` : ''}</span></div>`;
  };
  const ids = bookIds();
  return `<div class="shelfpage">${ruled(`${advName(adv.at)} <button type="button" class="inkbtn" data-shelf="">all adventures</button>`)}
    ${kept ? `<p class="kept">Your Lone Wolf, ${esc(LW.rankOf(kept.hero) || 'Kai Lord')}, waits after <i>${esc(kept.fromTitle)}</i>. A book not yet finished begins with him.</p>` : '<p class="kept">Choose your book.</p>'}
    <div class="plaqs">${ids.map(plaque).join('')}</div>
    ${ids.length < 12 ? `<p class="kept">${12 - ids.length} more books wait on the shelf: tools/fetch_projectaon.py downloads them.</p>` : ''}</div>`;
}
function leftHTML() {
  if (mode === 'title') return titleLeftHTML();
  if (intro) return `<div class="badge"><div class="med" style="--s:3.300em">${glyph('wolf-head')}</div></div><div class="story"><div class="scroll" id="scroll">
      <span class="eyebrow lead">The story so far</span><div class="text">${book.intro.map((p, i) => `<p class="${i ? '' : 'first'}">${esc(p)}</p>`).join('')}</div></div>
      <div class="finis"><button type="button" class="seal" data-intro>${intro === 'again' ? `Back to section ${esc(game.s.at)}` : 'Begin'}</button></div></div>`;
  const sec = game.section, id = game.s.at;
  const badge = `<div class="badge"><div class="med" style="--s:3.300em"><span style="font:400 1em var(--title)">${esc(id)}</span></div></div>`;

  if (mode === 'battle') {
    const over = B.over && { win: ['The way is clear', 'Your enemy lies dead at your feet.'], evade: ['You are away', 'You leave the fight behind you.'], dead: ['Your adventure ends here', 'The last of the Kai falls.'] }[B.over];
    return `${badge}<div class="story"><div class="scroll" id="scroll">
        <div class="text"><p class="first">${esc(sec.text[0])}</p></div>
        <div class="block"><span class="eyebrow">The fight</span><ol class="rounds">${B.log.map((l) => `<li>${esc(l)}</li>`).join('') || '<li>Choose your action.</li>'}</ol></div>
      </div>
      ${over ? `<div class="finis ${B.over === 'dead' ? 'dead' : ''}"><h2>${over[0]}</h2><p>${over[1]}</p><button type="button" class="seal" data-endbattle>Turn the page</button></div>` : ''}</div>`;
  }

  let h = `${badge}<div class="story"><div class="scroll" id="scroll"><div class="text">${storyText(sec)}</div>`;
  if (game.s.events.length) h += `<ul class="events">${game.s.events.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`;
  const loot = game.loot();
  // what is found here: each a medallion to touch to take it; things handed over come already taken
  // a shop's goods are bought, as often as he likes; a "choose two" closes once two are taken
  const note = (l) => (l.taken ? 'yours' : l.closed ? (l.pick > 1 ? 'you have taken your share' : 'you took the other') : l.cost ? `buy it: ${l.cost} Gold Crown${l.cost > 1 ? 's' : ''}` : 'take it');
  if (loot.length && !isDead()) h += `<div class="block finds"><span class="eyebrow">${loot.every((l) => l.cost) ? 'For sale' : 'Found here'}</span>${loot.map((l) => `<button type="button" class="find ${l.taken ? 'got' : ''}" data-loot="${l.i}" ${l.taken || l.closed ? 'disabled' : ''}>
      <span class="med ${l.taken ? 'lit' : ''}">${itemGlyph(l.item)}</span><span>${esc(l.label)}<i>${note(l)}</i></span></button>`).join('')}</div>`;
  if (game.combatPending && !isDead()) h += `<div class="block"><span class="eyebrow">You must fight</span>${sec.combat.enemies.map((f) => `<div class="foeline"><span>${esc(f.name)}</span><i>Combat Skill ${f.cs}, Endurance ${f.ep}</i></div>`).join('')}</div>`;
  h += '</div><div class="dialslot" id="dialslot"></div>';

  if (isDead()) {
    const bk = game.backs();
    h += `<div class="finis dead"><h2>Your adventure ends here</h2><p>The last of the Kai has fallen.${bk.length ? ' Yet you may turn back a page or two.' : ''}</p>${
      bk.map(({ k, id }, i) => `<button type="button" class="${i ? 'inkbtn' : 'seal'}" data-back="${k}">${i ? 'or to' : 'Back to'} section ${esc(id)}</button>`).join('')}${
      bk.length ? '<button type="button" class="inkbtn" data-new>or begin again</button>' : '<button type="button" class="seal" data-new>Begin again</button>'}</div>`;
  }
  else if (game.combatPending) h += `<div class="compass"><div class="orn"><button type="button" class="med" data-fight aria-label="Begin the fight">${glyph('crossed-swords')}</button></div><span>Draw your weapon.</span></div>`;
  else if (sec.end) {
    const next = Object.keys(BOOKS).find((k) => BOOKS[k].number === book.number + 1);
    h += `<div class="finis"><h2>Your quest is fulfilled</h2><p>You came through in ${game.s.trail.length} sections. Your Lone Wolf is kept for the next book.</p>${
      next ? `<button type="button" class="seal" data-book="${next}" data-fresh>On to ${esc(BOOKS[next].title)}</button>` : '<button type="button" class="seal" data-new>Back to the title page</button>'}</div>`;
  }
  else {
    const ch = game.choices(), rd = roads();
    if (rd.length) h += `<div class="compass"><div class="orn"><button type="button" class="med" data-panel="map" aria-label="Open the map">${ROSE}</button></div><span>${rd.length === 1 ? 'A road lies open.' : `${rd.length} roads lie open.`} Choose on the map.</span></div>`;
    const local = ch.map((c, i) => ({ c, i })).filter(({ c }) => !destLoc(c));
    if (local.length) h += `<ul class="choices">${local.map(({ c, i }) => `<li><button type="button" class="choice" data-choice="${i}" ${c.enabled ? '' : 'disabled'}><span>${esc(shown(c.text))}${
      c.enabled ? (c.need && c.need.disc ? `<em>${esc(LW.DISCIPLINES[c.need.disc].name)}</em>` : c.random ? '<em>Random Number</em>' : '') : `<em>${esc(c.why)}</em>`}</span></button></li>`).join('')}</ul>`;
  }
  return h + '</div>';
}
/* Sections that call for a Random Number get the medallion on the page. */
function mountRnt() {
  const sec = mode === 'story' && game.section, slot = $('#dialslot');
  if (!sec || !sec.rnt || !slot || isDead() || game.combatPending) return;
  const note = el('p');
  const shot = game.shot();
  const dial = makeDial(async () => {
    if (busy || (sec.rnt === 'auto' && game.s.rolled != null)) return;
    if (shot && shot.why) return void LW.UI.toast(shot.why);
    busy = true;
    const n = await dial.spin();
    game.setRolled(n); busy = false;
    render(); // what the number did may show on either page
  });
  // a bow shot shows its sum: "You drew 4, +3 Weaponmastery with Bow: 7."
  const plus = (game.s.shot || []).map((p) => `, +${p.n} ${p.label}`).join(''), drawn = game.s.drawn != null ? game.s.drawn : game.s.rolled;
  if (game.s.rolled != null) { dial.show(drawn); note.textContent = plus ? `You drew ${drawn}${plus}: ${game.s.rolled}.` : `You drew ${drawn}.`; }
  else note.textContent = shot ? shot.why || `Touch the medallion to shoot. It spends an Arrow (${game.hero.arrows} left).` : 'Touch the medallion for your Random Number.';
  slot.append(dial.el, note);
}
function renderLeft() { pl.innerHTML = leftHTML(); mountRnt(); trimSmall(); }
/* The books' small pictures sit in a wide strip of blank paper, some filling less than half of it,
   which drawn at the column's width left the drawing tiny. Each is cut to its drawing (with a little
   paper round it) and shown at one height (CSS .vignette.small). Hidden until cut, so it does not jump. */
const trimmed = new Map();
function trimSmall() {
  pl.querySelectorAll('img[data-trim]').forEach((img) => {
    const src = img.getAttribute('src'), done = (url) => { img.src = url; img.removeAttribute('data-trim'); };
    if (trimmed.has(src)) return void trimmed.get(src).then(done);
    const p = new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        try {
          const w = im.naturalWidth, h = im.naturalHeight, c = Ink.canvas(w, h), x = c.getContext('2d');
          x.drawImage(im, 0, 0);
          const d = x.getImageData(0, 0, w, h).data;
          let l = w, t = h, r = -1, b = -1;
          for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
            const k = (y * w + i) * 4;
            if (d[k + 3] > 40 && d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11 < 200) { if (i < l) l = i; if (i > r) r = i; if (y < t) t = y; if (y > b) b = y; }
          }
          if (r < 0) return resolve(src);
          const m = Math.round(h * 0.03); l = Math.max(0, l - m); t = Math.max(0, t - m); r = Math.min(w - 1, r + m); b = Math.min(h - 1, b + m);
          const o = Ink.canvas(r - l + 1, b - t + 1); o.getContext('2d').drawImage(c, l, t, r - l + 1, b - t + 1, 0, 0, r - l + 1, b - t + 1);
          resolve(o.toDataURL());
        } catch (e) { resolve(src); }
      };
      im.onerror = () => resolve(src);
      im.src = src;
    });
    trimmed.set(src, p); p.then(done);
  });
}

/* ---------- right page ---------- */
function captionHTML() {
  const h = game.hero, id = sel && sel.id, drop = (word = 'Drop') => `<button type="button" class="seal" data-remove="${esc(id)}">${word}</button>`;
  if (sel && sel.kind === 'disc') {
    const d = LW.DISCIPLINES[id], extra = id === 'weaponskill' && h.weaponskill ? ` in ${esc(LW.itemName(h.weaponskill))}` : '';
    const mastered = id === 'weaponmastery' && (h.mastery || []).length ? ` Mastered: ${esc(h.mastery.map(LW.itemName).join(', '))}.` : '';
    return `<div><h3>${esc(d.name)}${extra}</h3><p>${esc(d.blurb)}${mastered}${LW.has(h, id) ? '' : ' <i>Not yet learned.</i>'}</p></div>`;
  }
  if (sel && sel.kind === 'weapon' && h.weapons.includes(id)) return `<div><h3>${esc(LW.itemName(id))}</h3><p>${h.weaponskill === id ? 'Your mastered weapon: +2 Combat Skill.' : 'A weapon. You may carry two.'}</p></div>${drop()}`;
  const it = LW.ITEMS[id] || {}, about = it.about ? ` ${esc(it.about)}` : '';
  if (sel && sel.kind === 'pack' && it.heal && h.backpack.includes(id)) return `<div><h3>${esc(it.name)}</h3><p>Restores ${it.heal} Endurance.${id === 'potion' ? '' : about}</p></div><button type="button" class="seal" data-drink="${esc(id)}" ${h.ep >= h.epMax ? 'disabled' : ''}>${id === 'potion' ? 'Drink' : 'Eat'}</button>${drop()}`;
  if (sel && sel.kind === 'pack' && h.backpack.includes(id)) return `<div><h3>${esc(LW.itemName(id))}</h3><p>A Backpack Item.${about}</p></div>${drop()}`;
  if (sel && sel.kind === 'meal' && h.meals) return `<div><h3>Meal</h3><p>Eaten when the story calls for it. Go hungry and you lose 3 Endurance.</p></div>${drop('Eat')}`;
  const arrows = id === 'quiver' ? ` ${h.arrows || 0} of ${LW.MAX_ARROWS} Arrows ${stepper('arrows')}` : '';
  if (sel && sel.kind === 'special' && h.special.includes(id)) return `<div><h3>${esc(LW.itemName(id))}</h3><p>A Special Item${it.ep ? `: +${it.ep} Endurance while you carry it` : ''}.${about}${arrows}</p></div>${drop()}`;
  // what is in safekeeping is shown when nothing is picked out
  const kept = [...(h.stored || []).map(LW.itemName), ...(h.storedGold ? [`${h.storedGold} Gold Crowns`] : [])];
  return `<div><p>${panel === 'kai' ? 'Touch a medallion to read what the discipline does.' : `Touch an item to see what it is for.${kept.length ? ` At the Kai Monastery, taken up or left at the start of a book: ${esc(kept.join(', '))}.` : ''}`}</p></div>`;
}
const stepper = (field) => `<span class="step"><button type="button" data-adj="${field}:-1" aria-label="Less">&minus;</button><button type="button" data-adj="${field}:1" aria-label="More">+</button></span>`;
/* a ruled heading with the HD sheet's swash: a hairline that curls back at its left end */
const ruled = (t) => `<h4 class="ruled">${t}<span class="swash"><svg viewBox="0 0 30 10" aria-hidden="true"><path d="M30 4.2C20 4.2 11 4.6 5.5 7.4 2.6 8.9.6 7.8 1.4 6.1 2.1 4.7 4.6 4.9 4.7 6.4 4.2 5.6 2.8 5.7 2.7 6.6 3.4 7.3 5 6.6 6.4 5.7 12 3.2 20 3.3 30 3.3Z"/></svg><i></i></span></h4>`;
/* Kai panel, after the HD character sheet: his likeness, two ruled ledgers, and every discipline of
   the series as a medallion in a framed grid, the ones he has learned lit */
function kaiHTML() {
  const h = game.hero, series = book.series || 'kai', circles = LW.circlesOf(h), cs = LW.heroCS(h);
  const row = (k, v, long) => `<div class="${long ? 'long' : ''}"><span>${k}</span><b>${v}</b></div>`, signed = (n) => (n > 0 ? '+' : '') + n;
  const epParts = h.special.filter((s) => LW.ITEMS[s] && LW.ITEMS[s].ep).map((s) => ({ label: esc(LW.itemName(s)), n: LW.ITEMS[s].ep }));
  if (h.circleEp) epParts.push({ label: 'Lore-circles', n: h.circleEp });
  const disc = (d) => `<button type="button" class="disc ${LW.has(h, d) ? 'lit' : ''} ${sel && sel.id === d ? 'sel' : ''}" data-sel="disc|${d}" aria-label="${esc(LW.DISCIPLINES[d].name)}${LW.has(h, d) ? '' : ', not learned'}">${glyph(DISC_GLYPH[d])}</button>`;
  const bar = '<svg class="link" viewBox="0 0 40 14" preserveAspectRatio="none" aria-hidden="true"><path class="band" d="M0 3.4h40v7.2H0z"/><path class="edge" d="M0 4h40M0 10h40M15 7c2.5-3.2 5-3.2 6.2 0s3.700 3.200 6.200 0" vector-effect="non-scaling-stroke"/></svg><span class="chev" aria-hidden="true"></span>';
  const list = LW.SERIES[series].list, rows = [];
  for (let i = 0; i < list.length; i += 5) rows.push(list.slice(i, i + 5));
  return `<div class="likeness">${portraitURL ? `<img src="${portraitURL}" alt="">` : ''}
      <div class="who"><span class="disc lit">${glyph('wolf-head')}</span><h3>Lone Wolf</h3></div></div>
    <div class="ledgers"><section>${ruled('Attributes')}${row('Combat Skill', cs.total)}${row('Endurance', `${stepper('ep')} ${Math.max(0, h.ep)}/${h.epMax}`)}${row('Meals', h.meals)}${row('Rank', esc(LW.rankOf(h) || 'Kai Lord'), true)}${
      series === 'magnakai' ? row('Lore-circles', circles.length ? esc(circles.map((c) => c.name.replace('Circle of ', '').replace('the ', '')).join(', ')) : 'none', true) : ''}</section>
      <section>${ruled('Combat Skill')}${cs.parts.map((p, i) => row(esc(p.label), i ? signed(p.n) : p.n)).join('')}
      ${ruled('Endurance')}${row('Base', h.epMax - epParts.reduce((t, p) => t + p.n, 0))}${epParts.map((p) => row(p.label, signed(p.n))).join('')}</section></div>
    <div class="discs">${rows.map((r) => `<div class="drow">${r.map(disc).join(`<span class="linkwrap">${bar}</span>`)}</div>`).join('')}</div>
    <div class="caption">${captionHTML()}</div>`;
}
/* Inventory, after the HD equipment sheet: his likeness faint behind the slots he wears (helmet
   above, weapons either side of the chest), the other Special Items in a row beneath, then the
   Backpack as a grid of tiles beside its own medallion */
function packHTML() {
  const h = game.hero, cells = [], on = (kind, id) => (sel && sel.kind === kind && sel.id === id ? 'sel' : '');
  const slot = (kind, id, extra = '') => `<button type="button" class="disc item ${on(kind, id)} ${extra}" data-sel="${kind}|${esc(id)}" aria-label="${esc(LW.itemName(id))}">${itemGlyph(id)}</button>`;
  const empty = (label) => `<span class="disc empty"${label ? ` title="${label}"` : ''}></span>`;
  const worn = (id) => (h.special.includes(id) ? slot('special', id) : empty(esc(LW.itemName(id))));
  const skilled = (w) => h.weaponskill === w || (h.series === 'magnakai' && LW.has(h, 'weaponmastery') && (h.mastery || []).includes(w));
  const weapon = (w) => (w ? slot('weapon', w, skilled(w) ? 'lit' : '') : empty('Weapon'));
  const others = h.special.filter((s) => s !== 'helmet' && s !== 'chainmail').map((s) => slot('special', s));
  while (others.length < 4) others.push(empty());
  for (let i = 0; i < h.meals; i++) cells.push(`<button type="button" class="disc item ${on('meal', 'meal')}" data-sel="meal|meal" aria-label="Meal">${itemGlyph('meal')}</button>`);
  h.backpack.forEach((b) => cells.push(slot('pack', b)));
  while (cells.length < LW.MAX_BACKPACK) cells.push(empty());
  const kit = adding ? pickerHTML() : `<div class="kit">${portraitURL ? `<img src="${portraitURL}" alt="">` : ''}
      <div class="worn"><span class="head">${worn('helmet')}</span>${weapon(h.weapons[0])}<span class="body">${worn('chainmail')}</span>${weapon(h.weapons[1])}</div>
      <div class="specials">${others.join('')}</div></div>`;
  return `${kit}
    ${ruled(h.noPack ? 'Backpack <small>lost: find another to carry anything</small>' : `Backpack <small>${h.backpack.length + h.meals} of ${LW.MAX_BACKPACK}</small>`)}
    <div class="bag"><span class="disc lit">${glyph('knapsack')}</span><div class="pack">${cells.map((c) => `<div class="cell">${c}</div>`).join('')}</div></div>
    <div class="ledger"><span class="purse">${glyph('two-coins')}<b>${h.gold}</b> Gold Crowns ${stepper('gold')}</span>
      ${adding ? '' : '<button type="button" class="inkbtn" data-adding="open">Add an item by hand</button>'}</div>
    ${adding ? '' : `<div class="caption">${captionHTML()}</div>`}`; // while picking, the picker's own line names things
}
/* Adding by hand: the items as medallions in place of the worn kit, so the Backpack below fills
   while you pick. "Something else" asks for a name on the line beneath. */
let adding = false, naming = null; // naming: 'pack' or 'spec' while a name is being typed
function pickerHTML() {
  const pick = (id) => `<button type="button" class="disc item" data-add="${id}" title="${esc(LW.itemName(id))}" aria-label="Add ${esc(LW.itemName(id))}">${itemGlyph(id)}</button>`;
  const other = (kind, g, label) => `<button type="button" class="disc item other ${naming === kind ? 'sel' : ''}" data-add="other:${kind}" title="${label}" aria-label="${label}">${glyph(g)}</button>`;
  const row = (name, discs) => `<div class="pickrow"><em>${name}</em><div>${discs}</div></div>`;
  return `<div class="picker">${ruled('Add an item <button type="button" class="inkbtn" data-adding="close">done</button>')}
    ${row('Weapons', LW.WEAPONS.map(pick).join(''))}
    ${row('Backpack', pick('meal') + pick('potion') + other('pack', 'swap-bag', 'Another Backpack Item'))}
    ${row('Special Items', pick('helmet') + pick('chainmail') + pick('map') + other('spec', 'gem-pendant', 'Another Special Item'))}
    ${ITEM_TABLES[book.id] ? row('This book', Object.keys(ITEM_TABLES[book.id].ITEMS).map(pick).join('')) : ''}
    ${naming ? `<input id="itemname" class="pickname" placeholder="Name it, then press Enter" aria-label="Item name" data-prefix="${naming}">` : '<p class="pickname">Touch an item to add it.</p>'}</div>`;
}

/* the travel map is built once and moved in and out of the panel */
const mapNode = el('div', 'mapview');
mapNode.innerHTML = `<div class="mapinner"><canvas width="2000" height="1400"></canvas>
  <svg class="lines" viewBox="0 0 1000 700" aria-hidden="true"><g class="ways"></g><polyline class="routeback"></polyline><polyline class="route"></polyline></svg>
  <div class="marks"></div>
  ${heroHTML()}</div>`;
/* A replica or town plan is laid out for 3200x2240 and shown 1.8 times the map's height: paint
   only as many pixels as that takes on this screen, in eighths so small resizes reuse a painting.
   Measured on the whole panel, not the map, whose height changes with the list of roads under it
   (which would repaint the leg at nearly every section). */
function paintScale() {
  const h = ($('#panel') || mapNode).clientHeight || 620, need = h * 1.8 * (10 / 7) * Math.min(2, devicePixelRatio || 1);
  return Math.min(1, Math.max(0.25, Math.ceil((need / 3200) * 8) / 8));
}
function showTerrain(id) {
  const out = paintScale(), key = id + '@' + out;
  if (mapShown === key) return;
  const world = MAPS[id].replica && worldMap();
  if (world === null) return void (mapShown = null); // painted once it has loaded or failed
  const cv = mapNode.querySelector('canvas'), x = cv.getContext('2d'), map = mapCanvas(id, MAPS[id].replica && lastlands(), world, out);
  x.clearRect(0, 0, cv.width, cv.height);
  // painted once the symbols arrive (the printed map's own onload redraws for the image). Asking
  // again when the symbols are already loaded would redraw at once and loop without end, freezing
  // the page before the image could ever load.
  if (!map) { mapShown = null; if (!stampsLoaded()) loadStamps().then(() => { if (panel === 'map') renderRight(); }); return; }
  if (cv.width !== map.width) { cv.width = map.width; cv.height = map.height; }
  x.drawImage(map, 0, 0); mapShown = key; shownOut = out;
  mapNode.classList.toggle('deep', !!(MAPS[id].replica || MAPS[id].city)); // a replica or a town plan is looked at closer, and pans both ways
}
/* While he reads, paint the legs his choices lead into, one at a time when the page is idle, so
   arriving in a new leg does not stop the page while it is drawn. */
let aheadTimer = 0, shownOut = null; // the size the map was last painted at
function paintAhead() {
  clearTimeout(aheadTimer);
  if (!book.locations || mode !== 'story' || !shownOut) return; // no map seen yet: nothing to guess a size from
  const here = L[game.section.loc] && L[game.section.loc].map, out = shownOut;
  const next = [...new Set((game.section.choices || []).map((c) => book.sections[c.to] && L[book.sections[c.to].loc]).filter(Boolean).map((l) => l.map))].filter((id) => id && id !== here && MAPS[id]);
  const step = () => {
    const id = next.shift();
    if (!id || !stampsLoaded()) return;
    const world = MAPS[id].replica && worldMap();
    // the printed map and the world map may still be on their way (a town plan needs neither): try again shortly
    if (world === null || (MAPS[id].replica && !lastlands())) { next.unshift(id); aheadTimer = setTimeout(idle, 1000); return; }
    mapCanvas(id, MAPS[id].replica && lastlands(), world, out);
    if (next.length) aheadTimer = setTimeout(idle, 400);
  };
  const idle = () => (window.requestIdleCallback ? requestIdleCallback(step, { timeout: 4000 }) : step());
  aheadTimer = setTimeout(idle, 1200); // after the page has turned
}
/* Book 1's printed map, which the Lastlands replica is read from: the image, null while it
   loads (the panel redraws then), or undefined if Book 1 is not imported */
function lastlands() {
  const b = BOOKS['01fftd'];
  if (!b) return undefined;
  const url = b.assets + b.map;
  if (!printed[url]) { const im = (printed[url] = new Image()); im.onload = () => { if (panel === 'map') renderRight(); }; im.src = url; }
  return printed[url].complete && printed[url].naturalWidth ? printed[url] : null;
}
/* An image the owner may or may not have (git-ignored): the image, null while loading, or false.
   Fetched whole before use: the local server sometimes drops a big file part-way. */
const optionals = {};
function optional(file) {
  if (!(file in optionals)) {
    optionals[file] = null;
    const get = (tries) => fetch(file).then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
      .then((b) => { const im = new Image(); im.src = URL.createObjectURL(b); return im.decode().then(() => im); })
      .catch((e) => (tries > 1 && e !== 404 ? get(tries - 1) : false));
    get(3).then((im) => { optionals[file] = im; if (panel === 'map') { mapShown = null; renderRight(); } });
  }
  return optionals[file];
}
/* the owner's reference world map, if they have one */
const worldMap = () => optional(LASTLANDS.world.file);
/* the current book's printed map, or null until it has loaded (the panel redraws then) */
const printed = {};
function printedMap() {
  const url = asset(book.map);
  if (!printed[url]) { const im = (printed[url] = new Image()); im.onload = () => { if (panel === 'map') renderRight(); }; im.src = url; }
  return printed[url].complete && printed[url].naturalWidth ? printed[url] : null;
}
const scans = {};
const scanOf = (img) => (scans[img.src] = scans[img.src] || printedCanvas(img, [0, 0, img.naturalWidth, img.naturalHeight], img.naturalWidth * 2, img.naturalHeight * 2));

/* The whole replica, repainted for whatever part is in view so it stays sharp at any zoom.
   zoomV is the view's left, top and width in the printed map's pixels; its height follows the box. */
let zoomV = null;
function drawZoom() {
  const box = $('.mapview.zoomable'), img = lastlands();
  if (!box || !img) return;
  if (!stampsLoaded()) return void loadStamps().then(() => { if (panel === 'map') renderRight(); });
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(box.clientWidth * dpr), H = Math.round(box.clientHeight * dpr), [fx, fy, fw, fh] = LASTLANDS.frame;
  const m = MAPS[book.id], here = book.locations && L[game.section.loc], at = here ? here.printed : along(m.trail, progress()).pop();
  if (!zoomV) { const w0 = fh * (W / H) * 0.5; zoomV = [at[0] - w0 / 2, at[1] - (w0 * H) / W / 2, w0]; }
  zoomV = fitView(zoomV, W / H);
  const w = zoomV[2], h = (w * H) / W;
  const cv = box.querySelector('canvas');
  clearTimeout(zoomLater); cv.style.transform = '';
  cv.width = W; cv.height = H;
  cv.getContext('2d').drawImage(replicaCanvas(replicaModel(img, worldMap() || undefined), [zoomV[0], zoomV[1], w, h], W, H, m.places && Object.values(m.wholePlaces || m.places), 1, { rivers: m.rivers }), 0, 0);
  drawnV = [zoomV[0], zoomV[1], w];
  const tok = box.querySelector('.pawn');
  tok.style.visibility = '';
  tok.style.left = ((at[0] - zoomV[0]) / w) * 100 + '%'; tok.style.top = ((at[1] - zoomV[1]) / h) * 100 + '%'; // repainted, not walked
}
/* a view kept within its zoom limits and on the map; ratio is the box's width over its height */
function fitView([x, y, w0], ratio) {
  const [fx, fy, fw, fh] = LASTLANDS.frame, w = Math.max(30, Math.min(fw, fh * ratio, w0)), h = w / ratio; // zoomed out, the frame's height fills the box
  const keep = (v, lo, span, size) => (size >= span ? lo + (span - size) / 2 : Math.max(lo, Math.min(lo + span - size, v)));
  return [keep(x, fx, fw, w), keep(y, fy, fh, h), w];
}
/* Zoom by f about a point given as fractions of the box: the spot under the pointer stays under
   it. A repaint takes a moment, so while the wheel turns the painted map is only scaled to match,
   and repainted once it stops. The limits apply at every tick, so a burst past them cannot leave
   the view somewhere the next repaint has to jump away from. */
let drawnV = null, zoomLater = 0;
function zoomBy(f, ax = 0.5, ay = 0.5) {
  const box = $('.mapview.zoomable');
  if (!box || !zoomV) return;
  const ratio = box.clientWidth / box.clientHeight, [x0, y0, w] = zoomV, h = w / ratio;
  const w1 = fitView([x0, y0, w / f], ratio)[2], px = x0 + w * ax, py = y0 + h * ay; // the spot under the pointer
  zoomV = fitView([px - w1 * ax, py - (w1 / ratio) * ay, w1], ratio);
  if (drawnV) {
    const p1 = box.clientWidth / zoomV[2], s = drawnV[2] / zoomV[2];
    const cv = box.querySelector('canvas');
    cv.style.transformOrigin = '0 0'; cv.style.transform = `translate(${(drawnV[0] - zoomV[0]) * p1}px, ${(drawnV[1] - zoomV[1]) * p1}px) scale(${s})`;
    box.querySelector('.pawn').style.visibility = 'hidden';
  }
  clearTimeout(zoomLater); zoomLater = setTimeout(drawZoom, 160);
}
const mapInner = mapNode.querySelector('.mapinner'), pawn = mapNode.querySelector('.pawn');
/* slide the map so a point of its 1000x700 grid sits as near the middle as the edges allow */
function panTo(gx, gy) {
  const vw = mapNode.clientWidth, vh = mapNode.clientHeight, W = mapInner.clientWidth || 1, H = mapInner.clientHeight || 1;
  const tx = Math.min(0, Math.max(vw - W, vw / 2 - (gx / 1000) * W)), ty = Math.min(0, Math.max(vh - H, vh / 2 - (gy / 700) * H));
  mapInner.style.transform = `translate(${tx}px, ${ty}px)`;
  return [tx, ty];
}
const pct = (p) => `left:${p.x / 10}%;top:${p.y / 7}%`;
/* whether the map may name a place: one he knows before he gets there, or one he has been to.
   Otherwise a road offered on the map says no more than the choice in the book does. */
const told = (k) => L[k].known !== false || game.s.trail.some((t) => book.sections[t.id].loc === k);
/* places passed in the last few sections, which the map lets him go back to: {loc: steps back to the nearest} */
function backPlaces() {
  const reach = {}, here = game.section.loc;
  if (mode === 'story') game.backs().forEach(({ k, id }) => { const l = book.sections[id].loc; if (l !== here && !(l in reach) && L[l].map === L[here].map) reach[l] = k; });
  return reach;
}
/* under the map: the places he may go back to, or, once one is touched, the question */
function backHTML() {
  const reach = backPlaces(), locs = Object.keys(reach);
  if (!locs.length) return '';
  const at = locs.find((l) => reach[l] === armed);
  if (at) return `<p class="maphint goback">Go back to ${esc(L[at].name)}, ${armed === 1 ? 'a section' : `${armed} sections`} ago, and choose again? <button type="button" class="seal" data-back="${armed}">Go back</button> <button type="button" class="inkbtn" data-arm="${armed}">stay</button></p>`;
  return `<p class="maphint goback">Go back to ${locs.map((l) => `<button type="button" class="inkbtn" data-arm="${reach[l]}">${esc(L[l].name)}</button>`).join(' or ')}</p>`;
}
function updateMap() {
  const here = game.section.loc, locs = [], rd = mode === 'story' && !isDead() ? roads() : [], leg = L[here].map;
  showTerrain(leg || (MAPS[book.id] ? book.id : 'demo')); // a book with places but no map of its own gets the old demo country
  // the way he came, as far as it lies on this leg's view
  game.s.trail.forEach((t) => { const k = book.sections[t.id].loc; if (locs[locs.length - 1] !== k && L[k].map === leg) locs.push(k); });
  const line = locs.map((k) => `${L[k].x},${L[k].y}`).join(' ');
  mapNode.querySelector('.route').setAttribute('points', line); mapNode.querySelector('.routeback').setAttribute('points', line);
  mapNode.querySelector('.ways').innerHTML = [...new Set(rd.map((r) => r.loc))].map((k) => `<line x1="${L[here].x}" y1="${L[here].y}" x2="${L[k].x}" y2="${L[k].y}"/>`).join('');
  const destLocs = new Set(rd.map((r) => r.loc));
  const reach = backPlaces();
  let h = '';
  for (const k in L) {
    if (destLocs.has(k) || L[k].map !== leg) continue;
    const named = MAPS[book.id] && MAPS[book.id].replica && LASTLANDS.places.some((p) => p[0] === L[k].name); // the map already prints it
    if (k in reach) h += `<div class="mk back ${armed === reach[k] ? 'armed' : ''}" style="${pct(L[k])}"><button type="button" data-arm="${reach[k]}" aria-label="${esc(L[k].name)}: go back here?"><i></i></button>${named ? '' : `<span>${esc(L[k].name)}</span>`}</div>`;
    else if (locs.includes(k) && k !== here) h += `<div class="mk" style="${pct(L[k])}"><i></i>${named ? '' : `<span>${esc(L[k].name)}</span>`}</div>`;
    else if (k === (MAPS[book.id] || {}).goalAt && k !== here) h += `<div class="mk goal" style="${pct(L[k])}"><i></i>${named ? '' : `<span>${esc(L[k].name)}</span>`}</div>`;
  }
  destLocs.forEach((k) => {
    const opts = rd.filter((r) => r.loc === k), r = opts.find((o) => o.c.enabled) || opts[0];
    h += `<button type="button" class="dest" style="${pct(L[k])}" data-choice="${r.i}" ${r.c.enabled ? '' : 'disabled'}><b>${told(k) ? esc(L[k].name) : ''}</b></button>`;
  });
  mapNode.querySelector('.marks').innerHTML = h;
  place(pawn, L[here].x / 10 + '%', L[here].y / 7 + '%');
  // keep the figure and the open roads in view
  // the middle of their spread, not their average: an average drifts towards the side with more roads and pushes a lone far one off
  // the figure stands above its spot: its head counts too
  const pts = [L[here], { x: L[here].x, y: L[here].y - 55 }, ...[...destLocs].map((k) => L[k])], xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  // a close view (a replica or a town plan) steps back when a road runs further than it shows, so
  // every ring stays in view; a margin keeps the rings and their names off the edge
  if (mapNode.classList.contains('deep')) {
    const span = (lo, hi) => hi - lo + 150, fit = Math.min(1, (mapNode.clientWidth / mapNode.clientHeight) * 700 / 1.8 / span(Math.min(...xs), Math.max(...xs)), 700 / 1.8 / span(Math.min(...ys), Math.max(...ys)));
    mapInner.style.height = fit < 1 ? `${Math.max(70, 180 * fit)}%` : '';
  } else mapInner.style.height = '';
  const [tx, ty] = panTo(cx, cy);
  // a name that would fall off the view's edge (a road's, or a place passed) is tucked back in; at the top, under its ring
  const vw = mapNode.clientWidth, vh = mapNode.clientHeight;
  mapNode.querySelectorAll('.dest, .mk').forEach((d) => {
    const b = d.querySelector('b, span');
    if (!b || !b.textContent) return;
    if (tx + d.offsetLeft < 0 || tx + d.offsetLeft > vw || ty + d.offsetTop < 0 || ty + d.offsetTop > vh) return; // a place out of view keeps its name with it
    const x0 = tx + d.offsetLeft - d.offsetWidth / 2 + b.offsetLeft, y0 = ty + d.offsetTop - d.offsetHeight / 2 + b.offsetTop; // .dest is centred by a transform
    const dx = Math.max(0, -x0) - Math.max(0, x0 + b.offsetWidth - vw), dy = y0 < 0 ? d.offsetHeight - b.offsetTop : y0 + b.offsetHeight > vh ? vh - y0 - b.offsetHeight : 0;
    if (dx || dy) b.style.transform = `translate(${dx}px, ${dy}px)`;
  });
}

/* A book without per-section places still gets a journey: the figure's distance along the road is
   how close the current section is, by the shortest chain of choices, to the book's last section. */
function progress() {
  if (!book._dist) {
    const S = book.sections, rev = {}, dist = {};
    for (const k in S) {
      const c = S[k].combat || {}, tos = (S[k].choices || []).flatMap((ch) => (ch.random ? ch.random.table.map((row) => row[1]) : [ch.to]));
      [...tos, c.to, c.evade && c.evade.to].filter(Boolean).forEach((t) => (rev[t] = rev[t] || []).push(k));
    }
    let edge = Object.keys(S).filter((k) => S[k].end === 'victory');
    edge.forEach((k) => { dist[k] = 0; });
    while (edge.length) { const next = []; edge.forEach((k) => (rev[k] || []).forEach((q) => { if (dist[q] == null) { dist[q] = dist[k] + 1; next.push(q); } })); edge = next; }
    book._dist = dist;
  }
  const trail = game.s.trail, whole = book._dist[book.start] || 1;
  for (let i = trail.length - 1; i >= 0; i--) { const d = book._dist[trail[i].id]; if (d != null) return 1 - d / whole; }
  return 0;
}
function updateJourney() {
  const m = MAPS[book.id];
  showTerrain(book.id);
  const walked = along(m.route, progress()), at = walked[walked.length - 1], goal = m.route[m.route.length - 1];
  const line = walked.map((p) => p.join(',')).join(' ');
  mapNode.querySelector('.route').setAttribute('points', line); mapNode.querySelector('.routeback').setAttribute('points', line);
  mapNode.querySelector('.ways').innerHTML = '';
  mapNode.querySelector('.marks').innerHTML = `<div class="mk ring" style="left:${goal[0] / 10}%;top:${goal[1] / 7}%"><i></i></div>`;
  place(pawn, at[0] / 10 + '%', at[1] / 7 + '%');
  panTo(at[0], at[1]);
}

/* Combat Skill, Endurance and gold at the head of the right page, after the HD gold counter: each
   a dark window in a bronze frame with its medallion at one end. Endurance carries a thread of red
   showing how much is left. */
function gauges(cs, h) {
  const ep = Math.max(0, h.ep), g = (id, art, label, v, extra = '') => `<span class="gauge ${id}" title="${label}" aria-label="${label} ${v.replace(/<[^>]+>/g, '')}"><span class="med">${art}</span><b>${v}</b>${extra}</span>`;
  return g('cs', glyph('crossed-swords'), 'Combat Skill', String(cs))
    + g('ep', glyph('heart-drop'), 'Endurance', `${ep}<small>/${h.epMax}</small>`, `<i class="thread"><i style="width:${Math.round((ep / h.epMax) * 100)}%"></i></i>`)
    + g('gold', glyph('two-coins'), 'Gold Crowns', String(h.gold));
}
function renderRight() {
  const tabs = [['kai', 'Kai Disciplines'], ['pack', 'Inventory'], ['map', 'Map']];
  rtabs.hidden = mode !== 'story';
  rtabs.innerHTML = tabs.map(([id, label]) => `<button type="button" class="med ${id === 'map' && panel !== 'map' && mode === 'story' && roads().length ? 'call' : ''}" role="tab" aria-selected="${panel === id}" aria-label="${label}" data-panel="${id}">${TAB_ART[id]}</button>`).join('')
    + `<button type="button" class="med home" data-home aria-label="Back to the title page" title="Back to the title page">${glyph('return-arrow')}</button>`; // the HD return medallion: start over, or pick another book
  if (mode === 'title') { pr.innerHTML = titleRightHTML(); return; }
  if (!game.s) return; // a new game is being set up (a map image that arrives meanwhile asks for a redraw)
  const h = game.hero, cs = B ? B.cs() : LW.heroCS(h).total;
  const place = mode === 'battle' ? 'Combat' : book.locations ? L[game.section.loc].name : book.title;
  const head = `<div class="headrow"><div class="place">${esc(place)}</div>
    <div class="gauges">${gauges(cs, h)}</div></div>`;
  pr.innerHTML = head + '<div class="panel" id="panel"></div>';
  const host = $('#panel');
  if (mode === 'battle') host.append(B.node);
  else if (panel === 'map' && mapScan && MAPS[book.id] && MAPS[book.id].replica) {
    host.innerHTML = `<div class="mapview zoomable" role="img" aria-label="Map of the Lastlands"><canvas></canvas>${heroHTML()}
      <div class="zoomctl"><button type="button" class="med" data-zoom="in" aria-label="Zoom in">+</button><button type="button" class="med" data-zoom="out" aria-label="Zoom out">&minus;</button></div></div>
      <p class="maphint">The Lastlands. Drag to look around; scroll or use the medallions to zoom. <button type="button" class="inkbtn" data-scan>Back to the road</button></p>`;
    drawZoom();
  } else if (panel === 'map' && !book.locations) {
    const m = MAPS[book.id];
    if (!m || mapScan) {
      const img = printedMap();
      host.innerHTML = '<div class="mapview scrolly" role="img" aria-label="Map of the Lastlands"></div><p class="maphint">The map printed in the book. Drag to look around.</p>';
      if (img) host.firstChild.append(scanOf(img));
    } else {
      const hint = el('p', 'maphint');
      host.append(mapNode, hint);
      hint.innerHTML = `Your road from ${esc(m.start)} to ${esc(m.goal)}. Your figure marks how far the story has carried you. <button type="button" class="inkbtn" data-scan>The whole map</button>`;
      updateJourney();
    }
  } else if (panel === 'map') {
    const hint = el('div'), whole = MAPS[book.id] && MAPS[book.id].replica ? ' <button type="button" class="inkbtn" data-scan>The whole map</button>' : '';
    host.append(mapNode, hint);
    // the hint first: it takes height from the map, and the map pans by its size
    const rd = mode === 'story' && !isDead() ? roads() : [];
    hint.innerHTML = (rd.length ? `<ul class="roads">${rd.map((r) => `<li><button type="button" class="choice" data-choice="${r.i}" ${r.c.enabled ? '' : 'disabled'}><span>${esc(shown(r.c.text))}<em>${esc(r.c.enabled ? (told(r.loc) ? L[r.loc].name : '') : r.c.why)}</em></span></button></li>`).join('')}</ul>${whole ? `<p class="maphint">${whole}</p>` : ''}`
      : `<p class="maphint">${isDead() ? 'Your road ends here.' : game.section.end ? 'Your journey is over.' : game.combatPending ? 'There is no leaving until the fight is settled.' : 'No road is open yet. The story continues in the book.'}${whole}</p>`) + backHTML();
    updateMap();
  } else host.innerHTML = panel === 'kai' ? kaiHTML() : packHTML();
}
function render() {
  // reaching the end of a real book keeps the character for the next one
  if (mode === 'story' && game.section.end === 'victory' && !game.dead) LW.Character.save(game.hero, book);
  renderLeft(); renderRight();
  if (mode === 'story') paintAhead();
}

/* the left page lifts away and the gear turns a notch */
async function turn(update) {
  const old = pl.cloneNode(true);
  old.removeAttribute('id'); old.classList.add('turning');
  old.style.width = pl.offsetWidth + 'px'; old.style.height = pl.offsetHeight + 'px';
  pl.parentNode.appendChild(old);
  update();
  LW.sfx('page');
  gearTurn -= 22.5; gear.style.transform = `rotate(${gearTurn}deg)`;
  if (!still) await old.animate([{ transform: 'rotateY(0deg)', opacity: 1, filter: 'brightness(1)' }, { transform: 'rotateY(-82deg)', opacity: 1, filter: 'brightness(0.55)', offset: 0.8 }, { transform: 'rotateY(-90deg)', opacity: 0, filter: 'brightness(0.4)' }], { duration: 750, easing: 'ease-in' }).finished.catch(() => {});
  old.remove();
}

/* ---------- story actions ---------- */
async function choose(i) {
  const c = game.choices()[i];
  if (!c || !c.enabled) return;
  let to = c.to;
  const travel = destLoc(c);
  if (c.random) {
    const slot = $('#dialslot'), dial = makeDial(), note = el('p');
    note.textContent = (c.random.mod || []).filter((m) => LW.has(game.hero, m.disc)).map((m) => `${LW.DISCIPLINES[m.disc].name} adds ${m.plus}.`).join(' ') || 'The medallion decides.';
    slot.append(dial.el, note);
    const r = game.resolveRandom(c, await dial.spin());
    note.textContent = r.mod ? `${r.roll}, and ${r.mod} more makes ${r.total}.` : `You drew ${r.roll}.`;
    to = r.to;
    await wait(900);
  }
  if (travel) {
    place(pawn, L[travel].x / 10 + '%', L[travel].y / 7 + '%');
    await wait(still ? 0 : 1050);
  }
  game.choose(c, to);
  sel = null;
  await turn(() => { if (panel === 'map' && book.locations && !roads().length) panel = 'kai'; render(); });
}
/* back k sections, to make that choice again */
async function goBack(k) {
  game.back(k);
  sel = null; armed = null; mode = 'story';
  LW.sfx('select');
  await turn(() => { if (panel === 'map' && !roads().length) panel = 'kai'; render(); });
}

/* ---------- combat, on the page ---------- */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const tween = (ms, fn) => new Promise((res) => { if (still) { fn(1); return res(); } const t0 = performance.now(); (function step(now) { const k = Math.min(1, (now - t0) / ms); fn(k); k < 1 ? requestAnimationFrame(step) : res(); })(t0); });

async function startBattle() {
  const sec = game.section, c = sec.combat, hero = game.hero;
  // the fight's own adjustment, unless he carries what the text says spares him it (a torch), or
  // it is the text's "unarmed" penalty and he has no weapon anyway (heroCS already counts that)
  const spared = (c.unless || []).length && c.unless.every((i) => LW.hasItem(hero, i));
  // Huntmastery: what a surprise attack or ambush costs (combat.ambush) is not lost
  const ambush = c.ambush && c.csMod < 0 && hero.series === 'magnakai' && LW.has(hero, 'huntmastery');
  const csMod = spared || ambush || (c.unarmed && !LW.armedWith(hero)) ? 0 : c.csMod;
  const node = el('div', 'fight');
  node.innerHTML = `<canvas width="600" height="800"></canvas><div class="foebar"><span data-b="name"></span><div class="bar"><i></i></div><small data-b="stats"></small></div><div class="cmds" data-b="cmds"></div>`;
  const dial = makeDial();
  // mind: 0 at rest, 1 Mindblast, 2 Psi-surge. power is the most this character can do.
  B = { c, i: -1, foe: null, img: null, power: LW.mindPower(hero), mind: LW.mindPower(hero) ? 1 : 0, rounds: 0, log: [], over: null, lock: false, scene: sec.scene, node, dial,
    fx: { lunge: 0, hit: 0, dead: 0, wounds: [] },
    blasting() { return this.foe.immune ? 0 : this.mind; },
    cs() { return LW.heroCS(hero, { mindblast: this.blasting() === 1, psiSurge: this.blasting() === 2, enemy: this.foe, csMod, csNote: c.csNote, with: c.with }).total; },
    weapon: LW.armedWith(hero, { with: c.with }),
    ratio() { return this.cs() - this.foe.cs; } };
  nextFoe();
  if (B.foe.mindforce) B.log.push(LW.shielded(hero) ? 'Its will breaks against your Mindshield.' : `Its will presses on yours: Combat Skill less ${B.foe.mindforce}.`);
  if (csMod) B.log.push(`${c.csNote}: Combat Skill ${csMod > 0 ? 'plus' : 'less'} ${Math.abs(csMod)}.`);
  else if (spared) B.log.push(`Your ${c.unless.map(LW.itemName).join(' and ')} spare you the penalty.`);
  else if (ambush) B.log.push('Huntmastery: the ambush does not catch you off guard.');
  if (c.with === 'none') B.log.push('You fight bare-handed.');
  else if (c.with) B.log.push(B.weapon ? `Only your ${LW.itemName(c.with)} can harm it.` : `Only the ${LW.itemName(c.with)} can harm it, and you do not have it.`);
  if (B.weapon && LW.ITEMS[B.weapon] && LW.ITEMS[B.weapon].cs) B.log.push(`You fight with the ${LW.itemName(B.weapon)}.`);
  mode = 'battle'; LW.sfx('battle');
  await turn(render);
  updateBattle();
  const cv = node.querySelector('canvas');
  B.fit = () => { const r = node.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(200, Math.round(r.width * dpr)); cv.height = Math.max(200, Math.round(r.height * dpr)); };
  B.fit();
  (function loop() {
    if (!B || B.node !== node) return;
    B.fx.hit *= 0.86; B.fx.wounds.forEach((w) => { w.k += 0.14; });
    drawCreature(cv, B.foe.sprite, B.scene, 0.4, B.fx, B.img); // a still plate: only wounds and the lunge move
    requestAnimationFrame(loop);
  })();
}
function nextFoe() {
  B.i++; B.foe = Object.assign({}, B.c.enemies[B.i]); B.foe.max = B.foe.ep;
  B.fx.dead = 0; B.fx.wounds = []; B.img = null;
  // the section's own illustration, else one from the plate library, else the drawn emblem
  const foe = B.foe, lib = !foe.art && PLATES.find((p) => p.re.test(foe.name)), src = foe.art ? asset(foe.art) : lib && lib.src;
  if (src) { const im = new Image(); im.crop = lib && lib.crop; im.onload = () => { if (B && B.foe === foe) B.img = im; }; im.src = src; }
}
/* assets/plates/plates.json: pictures for enemies the book does not picture */
let PLATES = [];
fetch('assets/plates/plates.json').then((r) => r.json()).then((j) => { PLATES = j.plates.map((p) => Object.assign({ re: new RegExp(p.match, 'i') }, p)); }).catch(() => {});
function updateBattle() {
  const hero = game.hero, foe = B.foe, q = (k) => B.node.querySelector(`[data-b=${k}]`), r = B.ratio();
  q('name').textContent = foe.name;
  B.node.querySelector('.bar i').style.width = Math.max(0, (foe.ep / foe.max) * 100) + '%';
  q('stats').textContent = `CS ${foe.cs} · EP ${Math.max(0, foe.ep)} · Ratio ${r > 0 ? '+' : ''}${r}`;
  const ev = B.c.evade, evadeOpen = ev && B.rounds >= ev.after, locked = B.lock || B.over;
  const med = (id, ic, label, note, off, extra = '') => `<div class="medcap"><button type="button" class="med ${extra}" data-cmd="${id}" ${locked || off ? 'disabled' : ''} aria-label="${label}">${ic}</button>${label}<small>${note}</small></div>`;
  const n = hero.backpack.filter((b) => b === 'potion').length, psi = LW.psi(hero);
  const left = med('fight', B.weapon ? itemGlyph(B.weapon) : glyph('crossed-swords'), 'Strike', 'spin to attack')
    + (B.power ? med('mind', glyph(B.power === 2 ? 'psychic-waves' : 'brainstorm'), B.power === 2 ? 'Psi-surge' : 'Mindblast', foe.immune ? 'no effect' : ['at rest', B.power === 2 ? `as Mindblast, +${psi.blast}` : 'focused, +2', `+${psi.surge}, costs ${psi.cost} a round`][B.blasting()], false, B.blasting() ? 'lit' : '') : '');
  const right = (n ? med('item', itemGlyph('potion'), 'Laumspur', `${n} left`, hero.ep >= hero.epMax) : '')
    + (LW.canCure(hero, book.id) ? med('cure', glyph('healing'), 'Curing', hero.ep <= 6 ? '20 back, once a book' : 'at 6 or less', hero.ep > 6) : '')
    + (ev ? med('evade', glyph('run'), 'Evade', evadeOpen ? 'take one blow' : `after round ${ev.after}`, !evadeOpen) : '');
  const cmds = q('cmds');
  cmds.innerHTML = left + '<span data-dial></span>' + right;
  cmds.querySelector('[data-dial]').replaceWith(B.dial.el);
  renderLeft();
  const sc = $('#scroll'); if (sc) sc.scrollTop = 1e6;
  const gq = pr.querySelector('.gauges');
  if (gq) gq.innerHTML = gauges(B.cs(), hero);
}
async function lunge(n) {
  await tween(200, (k) => { B.fx.lunge = k * k; });
  if (n) { LW.sfx('hurt'); bookEl.classList.remove('hurt'); void bookEl.offsetWidth; bookEl.classList.add('hurt'); setTimeout(() => bookEl.classList.remove('hurt'), 420); }
  await tween(320, (k) => { B.fx.lunge = 1 - k; });
}
async function battleAct(id) {
  if (!B || B.lock || B.over) return;
  const hero = game.hero, foe = B.foe;
  B.lock = true; updateBattle();
  if (id === 'mind') {
    if (foe.immune) B.log.push(`${foe.name} is immune to attacks of the mind.`);
    else {
      B.mind = (B.mind + 1) % (B.power + 1);
      if (B.mind === 2 && hero.ep <= LW.psi(hero).floor) { B.mind = 0; B.log.push('You are too weak to Psi-surge.'); }
      else B.log.push(['You let your mind rest.', 'You gather your will to a point: Mindblast.', `You loose the full Psi-surge. It will cost you ${LW.psi(hero).cost} Endurance a round.`][B.mind]);
    }
  } else if (id === 'cure') {
    const back = Math.min(20, hero.epMax - hero.ep);
    hero.ep += back; hero.cured = book.id;
    LW.sfx('heal'); B.log.push(`Curing: you draw on your mastery and ${back} Endurance returns.`);
  } else if (id === 'item') {
    hero.backpack.splice(hero.backpack.indexOf('potion'), 1); hero.ep = Math.min(hero.epMax, hero.ep + 4);
    LW.sfx('heal'); B.log.push('The Laumspur burns going down. 4 Endurance restored.');
  } else {
    const n = await B.dial.spin(), res = LW.combatRound(B.ratio(), n);
    B.rounds++;
    const tag = `${ROMAN[B.rounds - 1] || B.rounds}. You drew ${n}.`;
    if (id === 'evade') {
      const loss = Math.min(res.hero, hero.ep);
      await lunge(loss); hero.ep -= loss;
      B.log.push(`${tag} You turn and run${loss ? `; it catches you for ${loss}` : ', untouched'}.`);
      B.over = hero.ep > 0 ? 'evade' : 'dead';
    } else {
      // the text's own doubling (a blow meant to stun), or an undead foe struck with a blade that doubles against them
      const twice = B.c.double || (foe.undead && LW.ITEMS[B.weapon] && LW.ITEMS[B.weapon].undead);
      const dealt = Math.min(res.enemy * (twice ? 2 : 1), foe.ep), taken = Math.min(res.hero, hero.ep);
      LW.sfx('swing'); await wait(still ? 0 : 140);
      if (dealt) { B.fx.wounds.push(newWound()); B.fx.hit = 1; LW.sfx('hit'); }
      foe.ep -= dealt; updateBattle();
      await wait(still ? 0 : 480);
      if (foe.ep > 0 || taken) { await lunge(taken); hero.ep -= taken; }
      B.log.push(`${tag} ${res.enemy === Infinity ? 'A killing blow' : dealt ? `${foe.name} loses ${dealt}` : 'Your blow is turned'}; ${res.hero === Infinity ? 'but it finds the gap in your guard' : taken ? `you lose ${taken}` : 'you are untouched'}.`);
      if (foe.drain && hero.ep > 0) { // every round fought, the last one too
        if (LW.shielded(hero)) { if (B.rounds === 1) B.log.push('Its mind attack breaks against your shield.'); }
        else { hero.ep -= foe.drain; B.log.push(`Its mind attack costs you ${foe.drain} Endurance.`); }
      }
      if (B.blasting() === 2 && hero.ep > 0) {
        const psi = LW.psi(hero);
        hero.ep -= psi.cost; B.log.push(`The Psi-surge costs you ${psi.cost} Endurance.`);
        if (hero.ep <= psi.floor && hero.ep > 0) { B.mind = 1; B.log.push('Too weak to hold it, you fall back on Mindblast.'); }
      }
      if (hero.ep <= 0) B.over = 'dead';
      else if (foe.ep <= 0) {
        updateBattle();
        await tween(1000, (k) => { B.fx.dead = k; });
        if (B.i + 1 < B.c.enemies.length) { nextFoe(); B.log.push(`${foe.name} falls. ${B.foe.name} takes its place.`); }
        else B.over = 'win';
      }
    }
  }
  if (B.over) LW.sfx(B.over === 'dead' ? 'lose' : B.over === 'win' ? 'win' : 'select');
  B.lock = false; updateBattle();
}
async function endBattle() {
  const out = B.over, c = B.c;
  if (out === 'win') { game.wonCombat(); if (c.to) game.go(c.to, 'The fight is won'); }
  else if (out === 'evade') game.go(c.evade.to, 'You break away from the fight');
  else game.save();
  B = null; mode = 'story'; sel = null;
  await turn(render);
}

/* ---------- input ---------- */
async function guard(fn) { if (busy) return; busy = true; try { await fn(); } finally { busy = false; } }
bookEl.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.cmd) return void battleAct(d.cmd);
  if (busy) return;
  if (mode === 'title' && !('forget' in d)) forgetting = null;
  if (!('arm' in d)) armed = null;
  if (d.arm) { armed = armed === +d.arm ? null : +d.arm; LW.sfx('select'); return void renderRight(); }
  if (d.back) return void guard(() => goBack(+d.back));
  if (d.book) guard(() => begin(d.book, 'fresh' in d, 'anew' in d, 'tssf' in d));
  else if (d.adv) {
    useAdventure(d.adv);
    const b = adventure().book, alive = b && BOOKS[b] && hasSave(b) && saved(b).s.hero.ep > 0; // a fallen one goes to the books, to start over
    if (alive) guard(() => begin(b)); else { shelf = true; LW.sfx('select'); render(); }
  }
  else if ('advnew' in d) { newAdventure(); shelf = true; LW.sfx('select'); render(); }
  else if ('shelf' in d) { if (d.shelf) useAdventure(d.shelf); shelf = !!d.shelf; LW.sfx('select'); render(); }
  else if ('forget' in d) { if ('sure' in d) forgetAdventure(d.forget); forgetting = 'sure' in d ? null : d.forget || null; LW.sfx('select'); renderRight(); }
  else if (d.panel) { panel = d.panel; sel = null; adding = false; naming = null; LW.sfx('select'); render(); }
  else if (d.adding) { adding = d.adding === 'open'; naming = null; LW.sfx('select'); renderRight(); }
  else if (d.add) {
    if (!d.add.startsWith('other:')) return void addItem(d.add);
    naming = d.add.slice(6); renderRight(); $('#itemname').focus();
  }
  else if (d.sel) { const [kind, id] = d.sel.split('|'); sel = { kind, id }; LW.sfx('select'); renderRight(); }
  else if (d.adj) { const [field, by] = d.adj.split(':'); game.adjust(field, +by); render(); }
  else if (d.loot != null) { const err = game.takeLoot(/^\d+$/.test(d.loot) ? +d.loot : d.loot); if (err) LW.UI.toast(err); else LW.sfx('select'); render(); }
  else if ('drink' in d) { if (game.usePotion(d.drink || 'potion')) { LW.sfx('heal'); sel = null; render(); } }
  else if (d.remove) { game.removeItem(d.remove); sel = null; render(); }
  else if ('intro' in d) { intro = false; guard(() => turn(render)); }
  else if (d.choice != null) guard(() => choose(+d.choice));
  else if ('fight' in d) guard(startBattle);
  else if ('endbattle' in d) guard(endBattle);
  else if ('new' in d || 'home' in d) { LW.sfx('select'); toTitle('new' in d); }
  else if ('scan' in d) { mapScan = !mapScan; renderRight(); }
  else if (d.zoom) zoomBy(d.zoom === 'in' ? 1.5 : 1 / 1.5);
});
function addItem(id) { const err = game.addItem(id); if (err) LW.UI.toast(err); else LW.sfx('select'); render(); }
pr.addEventListener('keydown', (e) => {
  if (e.target.id !== 'itemname' || (e.key !== 'Enter' && e.key !== 'Escape')) return;
  const name = e.key === 'Enter' && e.target.value.trim().replace(/[|"<>]/g, ''), prefix = e.target.dataset.prefix;
  naming = null;
  if (name) addItem(`${prefix}:${name}`); else renderRight();
});
/* the picker names whatever the pointer is over */
pr.addEventListener('pointerover', (e) => {
  const t = e.target.closest('[data-add]'), line = pr.querySelector('p.pickname');
  if (t && line) line.textContent = t.title;
});
/* drag a map around: the printed one scrolls; the replica slides, then repaints where it stopped */
let drag = null;
pr.addEventListener('pointerdown', (e) => {
  const v = e.target.closest('.mapview.scrolly, .mapview.zoomable');
  if (v && !e.target.closest('button')) { drag = { v, x: e.clientX, y: e.clientY, l: v.scrollLeft, t: v.scrollTop }; e.preventDefault(); }
});
window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (drag.v.classList.contains('zoomable')) drag.v.querySelectorAll('canvas, .pawn').forEach((n) => { n.style.translate = `${dx}px ${dy}px`; });
  else { drag.v.scrollLeft = drag.l - dx; drag.v.scrollTop = drag.t - dy; }
});
window.addEventListener('pointerup', (e) => {
  if (drag && drag.v.classList.contains('zoomable') && zoomV) {
    const k = zoomV[2] / drag.v.clientWidth;
    zoomV = [zoomV[0] - (e.clientX - drag.x) * k, zoomV[1] - (e.clientY - drag.y) * k, zoomV[2]];
    drag.v.querySelectorAll('canvas, .pawn').forEach((n) => { n.style.translate = ''; });
    drawZoom();
  }
  drag = null;
});
pr.addEventListener('wheel', (e) => {
  const v = e.target.closest('.mapview.zoomable');
  if (!v || !zoomV) return;
  e.preventDefault();
  const b = v.getBoundingClientRect();
  zoomBy(e.deltaY < 0 ? 1.25 : 0.8, (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height);
}, { passive: false });
pr.addEventListener('pointerover', (e) => { const c = e.target.closest('.roads .choice'); pr.querySelectorAll('.dest').forEach((d) => d.classList.toggle('hot', !!c && d.dataset.choice === c.dataset.choice)); });

/* toShelf: back to this adventure's books (after a death or an ending) rather than the list of adventures */
function toTitle(toShelf) { B = null; mode = 'title'; intro = false; shelf = !!toShelf; forgetting = null; render(); }
/* fresh = ignore this book's save. anew = roll a new character even though one is being carried.
   reread = open a saved game on the introduction. */
async function begin(id, fresh, anew, reread) {
  useBook(id);
  intro = false;
  if (!fresh && !anew && game.load()) { mode = 'story'; panel = roads().length ? 'map' : 'kai'; sel = null; if (reread && book.intro && book.intro.length) intro = 'again'; return turn(render); }
  game.clear();
  const kept = LW.Character.load(), carry = !anew && kept && !kept.completed.includes(id) ? kept : null;
  const hero = await LW.UI.chooseCharacter(book, carry);
  game.start(hero); mode = 'story'; panel = 'kai'; sel = null; intro = book.intro && book.intro.length ? 'new' : false;
  await turn(render);
  if (hero.found) LW.UI.toast(`In the ruins you also find: ${hero.found === 'meals' ? 'two Meals' : hero.found === 'gold' ? '12 Gold Crowns' : LW.itemName(hero.found)}.`);
}
const soundBtn = $('#btn-sound');
const soundLabel = () => { soundBtn.textContent = LW.sound.on ? 'Sound on' : 'Sound off'; };
soundBtn.addEventListener('click', () => { LW.setSound(!LW.sound.on); soundLabel(); LW.drone(); });
$('#btn-new').addEventListener('click', () => { if (mode !== 'battle' && !busy) toTitle(); });
window.addEventListener('resize', () => { if (B && B.fit) B.fit(); if (mode === 'story' && panel === 'map') renderRight(); });
soundLabel();

/* the crossed swords drawn on the plate of a foe with no picture */
fetch('assets/icons/crossed-swords.svg').then((r) => r.text()).then((t) => {
  const d = [...t.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
  if (d) setEmblem(d);
}).catch(() => {});

/* optional illustrations dropped into art/ */
fetch('art/manifest.json').then((r) => r.json()).then((m) => {
  for (const kind in m.enemies || {}) { const im = new Image(); im.onload = () => setArt(kind, im); im.src = 'art/' + m.enemies[kind]; }
  if (m.hero) {
    const im = new Image();
    im.onload = () => {
      heroURL = m.hero.crop ? heroFromArt(im, m.hero.crop, m.hero.outline).toDataURL() : im.src;
      [...document.querySelectorAll('.pawn img'), mapNode.querySelector('.pawn img')].forEach((n) => { n.src = heroURL; }); // the map node may be out of the page
    };
    im.src = 'art/' + (m.hero.src || m.hero);
  }
  if (m.portrait) {
    const im = new Image();
    im.onload = () => { portraitURL = portraitFromArt(im, m.portrait.crop, m.portrait.fade).toDataURL(); if (mode === 'title') renderLeft(); else if (mode === 'story' && panel === 'kai') renderRight(); };
    im.src = 'art/' + m.portrait.src;
  }
}).catch(() => {});

window.__lw = { get game() { return game; }, render: () => render(), BOOKS, begin, get plates() { return PLATES; } }; // for poking at a section from the console

document.fonts.ready.then(() => {
  const last = adventure() && adventure().book;
  if (last && BOOKS[last] && hasSave(last)) { useBook(last); if (game.load()) { mode = 'story'; if (roads().length) panel = 'map'; } }
  render();
});
