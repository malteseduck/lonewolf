/* Lone Wolf: a flat book in the manner of Lone Wolf HD.
   Left page: the story. Right page: a panel (Kai Disciplines, inventory, or the fight); the map is a modal.
   Plays the books imported by tools/import_projectaon.py. */
import * as Ink from './shared/ink.js';
import { drawCreature, setArt, setEmblem, newWound, portraitFromArt, drawFrame, drawBanner, drawCrest, gearSVG } from './plates.js';
import { printedCanvas } from './maps.js';
import { compilePlates, pickPlate, pinKey, upscaledSrc } from './platepick.js';
import * as Adv from './adventures.js';

import * as ITEMS_01 from './items/items-01fftd.js';
import * as ITEMS_02 from './items/items-02fotw.js';
import * as ITEMS_03 from './items/items-03tcok.js';
import * as ITEMS_04 from './items/items-04tcod.js';
import * as ITEMS_05 from './items/items-05sots.js';
import * as ITEMS_06 from './items/items-06tkot.js';
import * as ITEMS_07 from './items/items-07cd.js';
import * as ITEMS_08 from './items/items-08tjoh.js';
import * as ITEMS_09 from './items/items-09tcof.js';
import * as ITEMS_10 from './items/items-10tdot.js';
import * as ITEMS_11 from './items/items-11tpot.js';
import * as ITEMS_12 from './items/items-12tmod.js';
import * as ITEMS_13 from './items/items-13tplor.js';

const LW = window.LW;
const ROMAN = LW.ROMAN;
const BOOKS = Object.assign({}, LW.BOOKS || {});

/* Each book's hand-made item table (items-<code>.js) is laid over its sections the first time the
   book is opened. Every book's items are known from the start, so a Lone Wolf carried on from one
   book still shows what he took from it. */
const ITEM_TABLES = {
  '01fftd': ITEMS_01, '02fotw': ITEMS_02, '03tcok': ITEMS_03, '04tcod': ITEMS_04, '05sots': ITEMS_05, '06tkot': ITEMS_06,
  '07cd': ITEMS_07, '08tjoh': ITEMS_08, '09tcof': ITEMS_09, '10tdot': ITEMS_10, '11tpot': ITEMS_11, '12tmod': ITEMS_12,
  '13tplor': ITEMS_13,
};
Object.values(ITEM_TABLES).forEach((t) => LW.addItems(t.ITEMS, t.MARKS));
const applyItems = (b) => LW.applyItems(b, ITEM_TABLES[b.id]);

/* ---------- adventures (adventures.js) ---------- */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* no storage: play on */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* nothing to remove */ } },
  keys() { try { return Object.keys(localStorage); } catch (e) { return []; } },
};
const { saveKey, charKey } = Adv;
const adv = Adv.loadAdventures(store);
const keepAdventures = () => store.set('lw-adventures', JSON.stringify(adv));
const adventure = () => adv.list.find((a) => a.id === adv.at) || null;
function useAdventure(id) { adv.at = id; keepAdventures(); LW.Character.key = charKey(id); }
function newAdventure() { const id = Adv.nextId(adv.list); adv.list.push({ id, book: null }); useAdventure(id); }
function forgetAdventure(id) {
  Adv.forgetKeys(store, id);
  adv.list = adv.list.filter((a) => a.id !== id);
  if (adv.at === id) adv.at = null;
  keepAdventures();
}
if (adventure()) useAdventure(adv.at);
const advName = (id) => (adv.list.find((a) => a.id === id) || {}).name || `Adventure ${ROMAN[id - 1] || id}`;
// a call to the PC, given up after a while: over Tailscale a PC that is off can leave a request hanging
function api(path, opts = {}, ms = 8000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  return fetch(path, { cache: 'no-store', ...opts, signal: ctl.signal }).finally(() => clearTimeout(t));
}
const postBackup = (name, text) => api(`api/backups/${encodeURIComponent(name)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text }, 20000);
const pending = () => Adv.pending(store), keepPending = (list) => Adv.keepPending(store, list);
let flushing = false;
async function flushBackups() {
  if (flushing || !pending().length) return;
  flushing = true;
  let sent = 0;
  try {
    for (const b of pending()) {
      const r = await postBackup(b.name, b.text).catch(() => null);
      if (!r || !r.ok) break;
      keepPending(pending().filter((x) => x.name !== b.name || x.text !== b.text)); sent++;
    }
  } finally { flushing = false; }
  if (sent) LW.UI.toast(`${sent} waiting backup${sent > 1 ? 's' : ''} sent to the PC`);
}
async function backupAdventure(id) {
  const name = Adv.backupName(advName(id), id), text = JSON.stringify(Adv.backupOf(store, adv.list, id), null, 2);
  let r = null;
  try { r = await postBackup(name, text); } catch (e) { /* out of reach */ }
  if (r && r.ok) { return void LW.UI.toast(`Backed up to backups/${name}`); }
  if (r && r.status !== 404 && r.status !== 405 && r.status !== 501) return void LW.UI.toast(`The backup failed: ${((await r.json().catch(() => ({}))).error) || r.status}`);
  if (!r) { // the PC is out of reach: keep it here until it is back
    keepPending([...pending().filter((x) => x.name !== name), { name, text }]);
    return void LW.UI.toast(`Backup kept here: it goes to the PC when it is in reach`);
  }
  const a = el('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  LW.UI.toast(`Downloaded ${name} (tools/serve.py would keep it in backups/)`);
}

/* restoring: "restore" lists the backups on the plaque to choose from (or "other file" for one kept
   elsewhere). An adventure's own restore replaces its state; the one under "A new adventure" makes
   the backup a new adventure, so nothing kept is overwritten. `restoring` is {id ('' for a new one),
   files (the backups listed, or null), chosen (a file read from disk, waiting to be confirmed)}. */
const { parseBackup } = Adv;
function putBackup(a, got) { Adv.putBackup(store, a, got, BOOKS); keepAdventures(); }
const restoreFailed = (e) => LW.UI.toast(`Nothing restored: ${(e && e.message) || e}`);
async function openRestore(id) {
  let files = null;
  try { const r = await api('api/backups', {}, 5000); if (r.ok) files = (await r.json()).map((f) => f.name); } catch (e) { /* out of reach, or not served by tools/serve.py */ }
  if (files && files.length) { restoring = { id, files, chosen: null }; return void renderRight(); }
  restoring = { id, files: null, chosen: null };
  restoreFromDisk();
}
function restoreFromDisk() {
  const i = el('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = async () => {
    const f = i.files[0]; if (!f || !restoring) return;
    try { restoring.chosen = parseBackup(await f.text(), f.name); renderRight(); } catch (e) { restoring = null; restoreFailed(e); renderRight(); }
  };
  i.click();
}
async function restoreGo() {
  const r = restoring; if (!r) return;
  try {
    let got = r.chosen;
    if (!got) {
      const name = ($('#restorefile') || {}).value; if (!name) return;
      const res = await api(`api/backups/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`${name} could not be read`);
      got = parseBackup(await res.text(), name);
    }
    restoring = null;
    if (r.id) { const a = adv.list.find((x) => x.id === r.id); if (!a) return void renderRight(); putBackup(a, got); }
    else { newAdventure(); putBackup(adventure(), got); }
    render();
    LW.UI.toast(`Restored ${got.file} ${r.id ? 'to' : 'as'} ${advName(r.id || adv.at)}`);
  } catch (e) { restoring = null; restoreFailed(e); renderRight(); }
}
function restoreRow(id) {
  const r = restoring, go = id ? 'replace it' : 'restore it';
  if (r.chosen) return `<span>${id ? 'Replace it with' : 'Restore'} ${esc(r.chosen.file)}?</span><button type="button" class="inkbtn" data-restorego>${go}</button><button type="button" class="inkbtn" data-restorecancel>keep it</button>`;
  return `<select id="restorefile" class="restorefile" aria-label="Backup to restore">${r.files.map((f) => `<option>${esc(f)}</option>`).join('')}</select>
    <button type="button" class="inkbtn" data-restorego>${go}</button><button type="button" class="inkbtn" data-restoredisk>other file</button><button type="button" class="inkbtn" data-restorecancel>cancel</button>`;
}
const carriedBy = (a) => { try { return JSON.parse(store.get(charKey(a))); } catch (e) { return null; } };

let book = null, game = null;
function useBook(id) {
  if (!adventure()) newAdventure();
  book = BOOKS[id]; applyItems(book);
  LW.bookNumber = book.number || 0; // the Special Item limit depends on it
  game = new LW.Game(book, saveKey(adv.at, id)); game.keep = REWIND;
  loadPins(id);
  adventure().book = id; keepAdventures();
}
const asset = (f) => (book.assets || '') + f;
const saved = (id, a = adv.at) => { try { return JSON.parse(store.get(saveKey(a, id))); } catch (e) { return null; } };
const hasSave = (id, a) => !!(saved(id, a) || {}).s;
/* Flags an earlier book leaves for a later one (visited Ragadorn, fought an Elix) came on 2026-10-12, after
   some adventures were played: for a hero saved before then (no flagsRead; LW.makeHero sets it), read them
   once from this adventure's saves of the earlier books, only where the trail passed the section that sets
   one (LW.flagsFrom), never for having finished a book. Returns whether it ran. */
function backfillFlags(hero) {
  if (hero.flagsRead) return false;
  hero.flagsRead = true;
  for (const [id, t] of Object.entries(ITEM_TABLES)) {
    const sv = BOOKS[id] && BOOKS[id].number < book.number && saved(id);
    if (!sv || !sv.s) continue;
    for (const f of LW.flagsFrom(t.SECTIONS, sv.s.trail.map((x) => x.id))) (hero.marks = hero.marks || {})[f] = hero.marks[f] || true;
  }
  return true;
}

const { esc, el, wait } = LW.UI;
const $ = (s) => document.querySelector(s);
const pl = $('#pl'), pr = $('#pr'), bookEl = $('#book'), rtabs = $('#rtabs'), gear = $('#gear');
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- icons ---------- */
/* Drawn glyphs for the disciplines, from game-icons.net (assets/icons/README.txt), cut from the
   medallion's colour by a mask so they can glow like the HD ones */
const DISC_GLYPH = { camouflage: 'hood', hunting: 'high-shot', sixthSense: 'third-eye', tracking: 'footsteps', healing: 'herbs-bundle', weaponskill: 'broadsword', mindshield: 'eye-shield', mindblast: 'brainstorm', animalKinship: 'wolf-howl', mindOverMatter: 'magic-palm',
  weaponmastery: 'crossed-swords', animalControl: 'stag-head', curing: 'healing', invisibility: 'invisible', huntmastery: 'bowman', pathsmanship: 'footprint', psiSurge: 'psychic-waves', psiScreen: 'magic-shield', nexus: 'fire-shield', divination: 'crystal-ball',
  // the Grand Master ones, each near its Magnakai counterpart's (only one series' grid shows at a time)
  grandWeaponmastery: 'shining-sword', animalMastery: 'stag-head', deliverance: 'healing', assimilance: 'domino-mask', grandHuntmastery: 'bowman', grandPathsmanship: 'footprint',
  kaiSurge: 'psychic-waves', kaiScreen: 'magic-shield', grandNexus: 'fire-shield', telegnosis: 'crystal-ball', magiMagic: 'magic-palm', kaiAlchemy: 'round-bottom-flask' };
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
const itemGlyph = (id) => glyph(ITEM_GLYPH[id] || (LW.ITEMS[id] && LW.ITEMS[id].glyph) || (id === 'gold' || id === 'coin' ? 'two-coins' : id === 'pack' ? 'backpack' : LW.itemKind(id) === 'special' ? 'gem-pendant' : LW.itemKind(id) === 'weapon' ? 'pointy-sword' : 'swap-bag'));

/* The seal buttons' plate, of a piece with the medallions: a bronze bezel round a dark enamel field,
   a bronze lozenge pin at each end. Drawn 400 x 100 (given as its size, so border-image slices count
   in these units); .seal lays it on with border-image, the ends (60 each side) kept whole and only
   the straight run between them stretched, so it holds any label. Colours from :root. */
function sealPlate() {
  const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const hi = v('--bronze-hi'), mid = v('--bronze'), lo = v('--bronze-lo'), en = v('--enamel'), dark = v('--enamel-lo');
  const stud = (x) => `<path d="M${x} 40L${x + 10} 50 ${x} 60 ${x - 10} 50Z" fill="url(#stud)" stroke="${dark}" stroke-width="1.8"/>`; // the lozenge pin of the dial and the discs
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100" preserveAspectRatio="none"><defs>
    <linearGradient id="rim" gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="0" y2="92"><stop offset="0" stop-color="${hi}"/><stop offset="0.22" stop-color="${mid}"/><stop offset="0.5" stop-color="${lo}"/><stop offset="0.78" stop-color="${mid}"/><stop offset="1" stop-color="${hi}"/></linearGradient>
    <linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="0.45" stop-color="${en}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
    <linearGradient id="stud" x1="0" y1="0" x2="1" y2="1"><stop offset="0.15" stop-color="${hi}"/><stop offset="0.85" stop-color="${lo}"/></linearGradient></defs>
    <rect x="6" y="8" width="388" height="84" rx="42" fill="url(#rim)" stroke="${dark}" stroke-width="3"/>
    <rect x="9.5" y="11.5" width="381" height="77" rx="38.5" fill="none" stroke="${hi}" stroke-width="1.2" opacity="0.3"/>
    <rect x="19" y="21" width="362" height="58" rx="29" fill="url(#field)" stroke="${dark}" stroke-width="2.4"/>
    <path d="M40 77.4H360" stroke="${hi}" stroke-width="1" opacity="0.18"/>
    ${stud(40)}${stud(360)}</svg>`;
}

/* ---------- materials, drawn once ---------- */
const root = document.documentElement.style;
root.setProperty('--parch-l', `url(${Ink.parchment(900, 1300, false, true).toDataURL('image/jpeg', 0.86)})`);
root.setProperty('--parch-r', `url(${Ink.parchment(900, 1300, true, true).toDataURL('image/jpeg', 0.86)})`); // the facing page: the same paper, mirrored
root.setProperty('--frame', `url(${drawFrame().toDataURL()})`);
root.setProperty('--grid-frame', `url(${drawFrame(1000, 470, { vine: false }).toDataURL()})`);
root.setProperty('--banner', `url(${drawBanner().toDataURL()})`);
root.setProperty('--crest', `url(${drawCrest().toDataURL()})`);
root.setProperty('--seal', `url("data:image/svg+xml,${encodeURIComponent(sealPlate())}")`);
root.setProperty('--wood', `linear-gradient(rgba(10,7,6,0.55), rgba(10,7,6,0.55)), url(${Ink.leather(512).toDataURL('image/jpeg', 0.8)})`);
gear.innerHTML = gearSVG();
let portraitURL = null; // Lone Wolf's likeness over the Kai panel, if the owner has a picture of him (art/manifest.json "portrait")
const vignettes = {};
const vignette = (scene) => vignettes[scene] || (vignettes[scene] = Ink.inkScene(scene, 1000, 340).toDataURL());

/* ---------- state ---------- */
let mode = 'title';          // title | setup (a new character, SU) | story | battle
let panel = 'kai';           // kai | pack (the map is a modal, `M`)
let sel = null;              // the medallion whose box is open on the right page
let busy = false, gearTurn = 0, B = null;
let intro = false;           // the book's introduction is showing: 'new' before section 1 of a new game, 'again' when re-read from the shelf
const REWIND = 3;            // how many sections back a rewind reaches

const isDead = () => game.lost;
/* the book's own page references mean nothing here */
const shown = (t) => {
  let s = t.replace(/[,;]?\s*(?:(?:now|then|and|so|please|by)\s+)*(?:turn(?:ing)?|go(?:ing)?) to \d+[.?!]?\s*$/i, '').trim(); // "..., turn to 12."
  s = s.replace(/\b(?:turn|go) to \d+ and /i, ''); // "..., turn to 12 and risk ..."
  s = s.replace(/^(?:turn|go) to \d+,?\s*(?:and\s+)?/i, '').trim(); // "Turn to 12 and take the south path."
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return /[a-z]{3,}/i.test(s.replace(/\b(?:now|then|and|so|please|you|may|must|can)\b/gi, '')) ? s.replace(/[,;:]+$/, '').replace(/([^.?!])$/, '$1.') : 'Continue'; // one full stop, or the question mark
};

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
      angle = Math.floor(from / 360) * 360 - 720 - n * 36;
      hub.textContent = ''; ring.querySelectorAll('.hit').forEach((s) => s.classList.remove('hit'));
      hub.classList.add('shuffle');
      const ticks = setInterval(() => { hub.textContent = LW.rand10(); }, 70); // the face shuffles while the bezel turns
      anim = ring.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${angle}deg)` }], { duration: still ? 1 : 800, easing: 'cubic-bezier(0.15, 0.6, 0.2, 1)', fill: 'forwards' });
      await anim.finished.catch(() => {});
      clearInterval(ticks); anim = null; hub.classList.remove('shuffle');
      mark(n);
      await wait(200);
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
  'Castle Death', 'The Jungle of Horrors', 'The Cauldron of Fear', 'The Dungeons of Torgar', 'The Prisoners of Time', 'The Masters of Darkness',
  'The Plague Lords of Ruel', 'The Captives of Kaag', 'The Darke Crusade', 'The Legacy of Vashna', 'The Deathlord of Ixia', 'Dawn of the Dragons', "Wolf's Bane", 'The Curse of Naar'];
/* the series by book number: a band of numerals each on the left page, a shelf each on the right */
const SHELVES = [{ key: 'kai', name: 'The Kai', from: 1, to: 5 }, { key: 'magnakai', name: 'The Magnakai', from: 6, to: 12 }, { key: 'grandmaster', name: 'The Grand Master', from: 13, to: 20 }];
const shelfOf = (n) => SHELVES.find((s) => n >= s.from && n <= s.to) || SHELVES[0];
const bookIds = () => Object.keys(BOOKS).sort((a, b) => (BOOKS[a].number || 0) - (BOOKS[b].number || 0));
const savedAt = (id) => (hasSave(id) ? saved(id).s.at : null);
/* engraved scrollwork either side of a row of medallions: a hairline that curls at each end, with leaves */
const SCROLL = `<svg class="scrollwork" viewBox="0 0 120 24" preserveAspectRatio="none" aria-hidden="true"><path d="M2 12.6C14 12.4 30 9.200 46 9.600 64 10 78 15 96 14.400 104 14.100 110 12.400 112 10.200 113.400 8.600 112.600 6.600 110.800 6.700 109 6.800 108.600 8.900 110 9.600 108.200 9 108.400 7.600 109.800 7.400 111.400 7.200 112.200 9 111.200 10.600 109 13.600 103 15.600 96 15.800 78 16.400 64 11.400 46 11 30 10.600 14 13.800 2 13.400Z"/><path d="M40 9.800C37 6.400 32 5.600 29.400 7.400 32.600 7.200 36 8 40 9.800ZM58 11.600C61.600 15 66.400 16 69.400 14.600 66 14.400 62.400 13.400 58 11.600ZM76 14.400C79 11.600 83.600 10.800 86.600 12 83.400 12.400 80 13.200 76 14.400Z"/></svg>`;
function titleLeftHTML() {
  const ids = bookIds(), byNum = {};
  ids.forEach((id) => { byNum[BOOKS[id].number] = id; });
  const numeral = (n) => {
    const id = byNum[n], name = `${n}. ${SERIES_TITLES[n - 1]}`;
    return id ? `<button type="button" class="med numeral ${hasSave(id) ? 'lit' : ''}" data-book="${id}" title="${esc(name)}" aria-label="${esc(name)}">${roman(n)}</button>`
      : `<span class="med numeral off" title="${esc(name)}, not downloaded">${roman(n)}</span>`;
  };
  const band = (label, from, to) => `<div class="band"><em>${label}</em><div>${SCROLL}${Array.from({ length: to - from + 1 }, (_, i) => numeral(from + i)).join('')}${SCROLL}</div></div>`;
  return `<div class="titlepage">
    <div class="maker">A solo adventure in Magnamund</div>
    <h1 class="mark"><span>Lone</span><span class="wolfmark">${glyph('wolf-head')}</span><span>Wolf</span></h1>
    <div class="frontis">${portraitURL ? `<img src="${portraitURL}" alt="">` : ''}</div>
    <div class="bands">${SHELVES.map((s) => band(s.name, s.from, s.to)).join('')}</div>
  </div>`;
}
/* the right page of the title spread: every adventure, or the books of the one chosen (shelf) */
let shelf = false, forgetting = null, renaming = null, restoring = null;
let shelfSeries = null;      // the series the shelf shows; null: the one the adventure is in
/* a numeral as large as the medallion's dark face allows: its ink measured in the title font, --f the size
   (per medallion width) at which the ink's corners touch the rim, --dx/--dy what centres the ink rather than the line box */
const FACE = 0.79;           // the dark face's diameter, per medallion width (.med's background: 56% of a farthest-corner circle)
const inks = {};
function romanInk(r) {
  if (inks[r]) return inks[r];
  const c = romanInk.c || (romanInk.c = document.createElement('canvas').getContext('2d'));
  c.font = `100px ${getComputedStyle(document.documentElement).getPropertyValue('--title')}`;
  const m = c.measureText(r), w = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 100, h = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / 100;
  const baseline = 0.5 + (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 200; // in a box of line-height 1
  const ink = `--f:${(FACE / Math.hypot(w, h)).toFixed(3)};--dx:${((m.width / 100 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 100) / 2).toFixed(3)};--dy:${(0.5 - baseline + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 200).toFixed(3)}`;
  if (document.fonts.status === 'loaded') inks[r] = ink; // measured in a stand-in font otherwise
  return ink;
}
const roman = (n) => { const r = ROMAN[n - 1] || String(n); return `<span class="roman" style="${romanInk(r)}">${r}</span>`; };
function titleRightHTML() { return shelf && adventure() ? shelfHTML() : adventuresHTML(); }
function adventuresHTML() {
  const plaque = (a) => {
    const b = a.book && BOOKS[a.book], sv = b && saved(a.book, a.id), kept = carriedBy(a.id), at = sv && sv.s && sv.s.at;
    const hero = at ? sv.s.hero : kept && kept.hero, rank = hero ? LW.rankOf(hero) || 'Kai Lord' : '';
    const where = at ? `${hero.ep > 0 ? 'Continue at' : 'Fell at'} section ${at}` : kept ? `Waits after ${kept.fromTitle}` : 'Choose a book';
    const more = restoring && restoring.id === a.id && (restoring.files || restoring.chosen)
      ? restoreRow(a.id)
      : forgetting === a.id
      ? `<span>Forget this adventure?</span><button type="button" class="inkbtn" data-forget="${a.id}" data-sure>forget it</button><button type="button" class="inkbtn" data-forget="">keep it</button>`
      : renaming === a.id
      ? `<input id="advname" class="advname" maxlength="40" value="${esc(a.name || '')}" placeholder="Name it, then press Enter" aria-label="Adventure name" data-for="${a.id}">`
      : `<button type="button" class="inkbtn" data-shelf="${a.id}">books</button><button type="button" class="inkbtn" data-rename="${a.id}">rename</button><button type="button" class="inkbtn" data-backup="${a.id}">backup</button><button type="button" class="inkbtn" data-restore="${a.id}">restore</button><button type="button" class="inkbtn" data-forget="${a.id}">forget</button>`;
    return `<div class="plaq ${at ? 'going' : ''}"><button type="button" class="plaqmain" data-adv="${a.id}">
        <span class="med">${roman(+a.id)}</span><span class="plaqtext"><b>${esc(a.name || (b ? b.title : advName(a.id)))}</b><i>${esc((a.name && b ? b.title + '. ' : '') + (rank ? rank + '. ' : '') + where)}</i></span></button>
      <span class="plaqmore">${more}</span></div>`;
  };
  return `<div class="shelfpage">${ruled('Your adventures')}
    <div class="plaqs">${adv.list.map(plaque).join('')}
      <div class="plaq"><button type="button" class="plaqmain" data-advnew><span class="med">${glyph('wolf-head')}</span><span class="plaqtext"><b>A new adventure</b><i>Another game, with a Lone Wolf of its own</i></span></button>
        <span class="plaqmore">${restoring && !restoring.id && (restoring.files || restoring.chosen) ? restoreRow('') : '<button type="button" class="inkbtn" data-restore>restore</button>'}</span></div></div></div>`;
}
function shelfHTML() {
  const kept = LW.Character.load(), can = (id) => LW.Character.carries(kept, id);
  const plaque = (id) => {
    const at = savedAt(id), b = BOOKS[id];
    return `<div class="plaq ${at ? 'going' : ''}"><button type="button" class="plaqmain" data-book="${id}">
        <span class="med">${roman(b.number)}</span><span class="plaqtext"><b>${esc(b.title)}</b><i>${at ? `Continue at section ${esc(String(at))}` : `Book ${b.number} · begin`}</i></span></button>
      <span class="plaqmore">${at && b.intro && b.intro.length ? `<button type="button" class="inkbtn" data-book="${id}" data-tssf>the story so far</button>` : ''}${at ? `<button type="button" class="inkbtn" data-book="${id}" data-fresh>start over</button>` : ''}${can(id) ? `<button type="button" class="inkbtn" data-book="${id}" data-anew>new character</button>` : ''}</span></div>`;
  };
  // a book not yet downloaded keeps its place on the shelf, dim
  const missing = (n) => `<div class="plaq off"><div class="plaqmain"><span class="med">${roman(n)}</span><span class="plaqtext"><b>${esc(SERIES_TITLES[n - 1])}</b><i>Book ${n} · not downloaded</i></span></div></div>`;
  const byNum = {};
  bookIds().forEach((id) => { byNum[BOOKS[id].number] = id; });
  // open on the series of the book in play, or of the next one after what he has finished
  const cur = BOOKS[adventure().book], done = kept ? Math.max(0, ...kept.completed.map((id) => (BOOKS[id] ? BOOKS[id].number : 0))) : 0;
  const s = SHELVES.find((x) => x.key === shelfSeries) || shelfOf(cur ? cur.number : done + 1);
  const nums = Array.from({ length: s.to - s.from + 1 }, (_, i) => s.from + i);
  return `<div class="shelfpage">${ruled(`${advName(adv.at)} <button type="button" class="inkbtn" data-shelf="">all adventures</button>`)}
    ${kept ? `<p class="kept">Your Lone Wolf, ${esc(LW.rankOf(kept.hero) || 'Kai Lord')}, waits after <i>${esc(kept.fromTitle)}</i>. A book not yet finished begins with him.</p>` : ''}
    <div class="shelftabs" role="tablist">${SHELVES.map((x) => `<button type="button" class="inkbtn ${x === s ? 'on' : ''}" role="tab" aria-selected="${x === s}" data-series="${x.key}">${x.name}</button>`).join('')}</div>
    <div class="plaqs shelfrow">${nums.map((n) => (byNum[n] ? plaque(byNum[n]) : missing(n))).join('')}</div></div>`;
}
function leftHTML() {
  if (mode === 'title') return titleLeftHTML();
  if (mode === 'setup') return setupLeftHTML();
  if (intro) return `<div class="badge"><div class="med" style="--s:3.300em">${glyph('wolf-head')}</div></div><div class="story"><div class="scroll" id="scroll">
      <span class="eyebrow lead">The story so far</span><div class="text">${book.intro.map((p, i) => `<p class="${i ? '' : 'first'}">${esc(p)}</p>`).join('')}</div></div>
      <div class="finis"><button type="button" class="seal" data-intro>${intro === 'again' ? `Back to section ${esc(game.s.at)}` : 'Begin'}</button></div></div>`;
  const sec = game.section, id = game.s.at;
  const badge = `<div class="badge"><div class="med" style="--s:3.300em"><span style="font:400 1em var(--title)">${esc(id)}</span></div></div>`;

  if (mode === 'battle') {
    const over = B.over && { win: ['The way is clear', 'Your enemy lies dead at your feet.'], evade: ['You are away', 'You leave the fight behind you.'], stop: ['The fight ends', 'The fighting stops here.'], broken: ['Stopped by hand', 'The fight is not won. Turn to the section the text names.'], dead: ['Your adventure ends here', 'The last of the Kai falls.'] }[B.over];
    return `${badge}<div class="story"><div class="scroll" id="scroll">
        <div class="text"><p class="first">${esc(sec.text[0])}</p></div>
        <div class="block"><span class="eyebrow">The fight</span><ol class="rounds">${B.log.map((l) => `<li>${esc(l)}</li>`).join('') || '<li>Choose your action.</li>'}</ol>${
          // by hand, like the turn-to box: for an end the text gives that the page does not see
          // where the item table says the text ends the fight a way the page cannot see, its reason; else a
          // plain stop that wins nothing (Fight.stopHere)
          B.over ? '' : `<button type="button" class="inkbtn byhand" data-cmd="stop" ${B.lock ? 'disabled' : ''}>${B.c.byHand ? `By hand: ${esc(B.c.byHand)}` : 'By hand: stop the fight (it is not won)'}</button>`}</div>
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
  // a loss he chooses (game.s.picks): what he can lose, a medallion each
  const pickable = !isDead() ? game.pickable() : [];
  if (pickable.length) h += `<div class="block finds"><span class="eyebrow">${game.s.picks[0].loot != null ? 'Give in exchange' : `Choose what you lose${game.s.picks[0].n > 1 ? ` (${game.s.picks[0].n} more)` : ''}`}</span>${[...new Set(pickable)].map((id) => `<button type="button" class="find" data-pick="${esc(id)}">
      <span class="med">${itemGlyph(id === 'gold' ? 'gold' : id)}</span><span>${esc(id === 'meal' ? 'a Meal' : id === 'gold' ? 'a Gold Crown' : LW.itemName(id))}<i>lose it</i></span></button>`).join('')}</div>`;
  // a stake, or a gift of what he will (sec.stake), set before the way on opens
  const stake = sec.stake, staked = stake && (game.s.stakes || {})[stake.key || id];
  if (stake && !isDead()) h += `<div class="block"><span class="eyebrow">${stake.spend ? 'What you give' : 'Your stake'}</span>${staked ? `<p class="staked">${staked.n} ${esc(stake.coin ? LW.COINS[stake.coin] : 'Gold Crowns')}${stake.spend ? ' given' : ' staked'}.</p>` : `<div class="puzzle"><label>${stake.spend ? 'Give' : 'Stake'} <input id="stakeamt" inputmode="numeric" autocomplete="off" value="${stake.min || 0}" aria-label="Amount"> ${esc(stake.coin ? LW.COINS[stake.coin] : 'Gold Crowns')}</label><button type="button" class="inkbtn" data-stake>${stake.spend ? 'give' : 'stake'}</button></div>`}</div>`;
  // a game of chance (sec.game): the throws so far, the token, the table's limit, and a bet to place
  const gm = !isDead() && game.game, gs = sec.game;
  if (gm) {
    const token = (game.s.tokens || {})[id] || 0, left = [gs.bets && `bet ${Math.min(gm.bets + 1, gs.bets)} of ${gs.bets}`, token && `a token worth ${token} Gold Crown${token > 1 ? 's' : ''} to play with here`, gs.cap != null && `${gm.won} of the ${gs.cap} Gold Crowns this table pays won`].filter(Boolean);
    const form = typeof gs.stake !== 'number' && !gm.bet && !game.gameWhy(true) ? `<div class="puzzle"><label>Stake <input id="betamt" inputmode="numeric" autocomplete="off" value="${gs.stake.min || 1}" aria-label="Stake in Gold Crowns">${gs.kind === 'wheel' ? '' : ' Gold Crowns'}</label>${
      gs.kind === 'wheel' ? `<label>on <input id="betpick" inputmode="numeric" autocomplete="off" aria-label="Number from 0 to 9"></label>` : ''}<button type="button" class="inkbtn" data-bet>bet</button></div>` : '';
    h += `<div class="block"><span class="eyebrow">The game</span>${gm.log.length ? `<ol class="rounds">${gm.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>` : ''}${
      left.length ? `<p class="staked">${esc(left.join('; '))}.</p>` : ''}${gm.bet ? `<p class="staked">${gm.bet.n} staked${gm.bet.pick != null ? ` on ${gm.bet.pick}` : ''}.</p>` : form}</div>`;
  }
  // what a trader here buys (sec.sell), of what he has
  const wares = Object.keys(sec.sell || {}).filter((w) => LW.hasItem(game.hero, w));
  if (wares.length && !isDead()) h += `<div class="block finds"><span class="eyebrow">He will buy</span>${wares.map((w) => `<button type="button" class="find" data-sell="${esc(w)}">
      <span class="med">${itemGlyph(w)}</span><span>${esc(LW.itemName(w))}<i>sell it: ${sec.sell[w]} Gold Crown${sec.sell[w] > 1 ? 's' : ''}</i></span></button>`).join('')}</div>`;
  if (game.combatPending && !isDead()) h += `<div class="block"><span class="eyebrow">You must fight</span>${sec.combat.enemies.map((f) => `<div class="foeline"><span>${esc(f.name)}</span><i>Combat Skill ${f.cs}, Endurance ${f.ep}</i></div>`).join('')}</div>`;
  h += '</div><div class="dialslot" id="dialslot"></div>';

  if (isDead()) {
    const bk = game.backs();
    h += `<div class="finis dead"><h2>Your adventure ends here</h2><p>${!game.dead && sec.end === 'failed' ? 'Your mission has failed.' : 'The last of the Kai has fallen.'}${bk.length ? ' Yet you may turn back a page or two.' : ''}</p>${
      bk.map(({ k, id }, i) => `<button type="button" class="${i ? 'inkbtn' : 'seal'}" data-back="${k}">${i ? 'or to' : 'Back to'} section ${esc(id)}</button>`).join('')}${
      bk.length ? '<button type="button" class="inkbtn" data-new>or begin again</button>' : '<button type="button" class="seal" data-new>Begin again</button>'}</div>`;
  }
  // a fight stopped by hand and not won: only the by-hand turn box, or the fight after all
  else if (game.combatPending && game.brokenOff) h += `${turnBox('Turn to section', '')}<button type="button" class="inkbtn byhand" data-fight>or fight it after all</button>`;
  else if (game.combatPending) h += `<div class="compass"><div class="orn"><button type="button" class="med" data-fight aria-label="Begin the fight">${glyph('crossed-swords')}</button></div><span>Draw your weapon.</span></div>`;
  else if (sec.end) {
    const next = Object.keys(BOOKS).find((k) => BOOKS[k].number === book.number + 1);
    h += `<div class="finis"><h2>Your quest is fulfilled</h2><p>You came through in ${game.s.trail.length} sections. Your Lone Wolf is kept for the next book.</p>${
      next ? `<button type="button" class="seal" data-book="${next}" data-fresh>On to ${esc(BOOKS[next].title)}</button>` : '<button type="button" class="seal" data-new>Back to the title page</button>'}</div>`;
  }
  else {
    const local = game.choices().map((c, i) => ({ c, i }));
    if (local.length) h += `<ul class="choices">${local.map(({ c, i }) => `<li><button type="button" class="choice" data-choice="${i}" ${c.enabled ? '' : 'disabled'}><span>${esc(shown(c.text))}${
      c.enabled ? (c.need && (c.need.disc || c.need.circle) ? `<em>${esc(LW.condName({ disc: c.need.disc, every: c.need.every, circle: c.need.circle }))}</em>` : c.need && c.need.any ? `<em>${esc(c.need.any.map(LW.condName).join(', or '))}</em>` : c.random ? '<em>Random Number</em>' : '') : `<em>${esc(c.why)}</em>`}</span></button></li>`).join('')}</ul>`;
    // a puzzle's answer is a section number, which the book leaves the reader to turn to; elsewhere the same
    // box, smaller, is the by-hand way to any section, for a way on the page cannot see, folded into a faint link until touched
    h += sec.puzzle ? turnBox('Turn to section', '') : '<button type="button" class="inkbtn byhand" data-byhand>By hand: turn to a section…</button>';
  }
  return h + '</div>';
}
const turnBox = (label, cls) => `<div class="puzzle ${cls}"><label>${label} <input id="puzzleto" inputmode="numeric" autocomplete="off" aria-label="Section number"></label>${
  cls === 'byhand' ? '<button type="button" class="seal" data-puzzle>go</button>' : '<button type="button" class="inkbtn" data-puzzle>turn</button>'}</div>`;
/* Sections that call for a Random Number get the medallion on the page. */
function mountRnt() {
  const sec = mode === 'story' && game.section, slot = $('#dialslot');
  if (!sec || !sec.rnt || !slot || isDead() || game.combatPending) return;
  const note = el('p');
  const shot = game.shot();
  const dial = makeDial(async () => {
    if (busy || (sec.rnt === 'auto' && game.s.rolled != null)) return;
    if (shot && shot.why) return void LW.UI.toast(shot.why);
    if (game.game && game.gameWhy(false)) return void LW.UI.toast(game.gameWhy(false));
    busy = true;
    const n = await dial.spin();
    game.setRolled(n); busy = false;
    render(); // what the number did may show on either page
  });
  // a bow shot shows its sum: "You drew 4, +3 Weaponmastery with Bow: 7."
  const plus = (game.s.shot || []).map((p) => `, ${p.n < 0 ? '−' : '+'}${Math.abs(p.n)} ${p.label}`).join(''), drawn = game.s.drawn != null ? game.s.drawn : game.s.rolled;
  if (game.s.rolled != null) { dial.show(drawn); note.textContent = plus ? `You drew ${drawn}${plus}: ${game.s.rolled}.` : `You drew ${drawn}.`; }
  else note.textContent = shot ? shot.why || `Touch the medallion to shoot. It spends an Arrow (${game.hero.arrows} left).` : 'Touch the medallion for your Random Number.';
  // a game of chance: the medallion throws for the bet, over and over
  if (game.game) { const why = game.gameWhy(false), gs = sec.game; note.textContent = why || (typeof gs.stake === 'number' ? `Touch the medallion to throw: ${gs.stake} Gold Crowns a throw${gs.coin ? ` (or ${gs.stake * gs.rate} ${LW.COINS[gs.coin]})` : ''}.` : 'Touch the medallion to throw.'); }
  slot.append(dial.el, note);
}
function renderLeft() { pl.innerHTML = leftHTML(); mountRnt(); mountSetup(); trimSmall(); widenPlates(); }
/* Project Aon draws its plates one column wide (portrait) or across both columns (landscape); a
   landscape one at the portrait width came out cramped, so it spans the column (CSS .vignette.wide). */
function widenPlates() {
  pl.querySelectorAll('img.vignette.full').forEach((img) => {
    const fit = () => img.classList.toggle('wide', img.naturalWidth > img.naturalHeight);
    if (img.complete) fit(); else img.addEventListener('load', fit, { once: true });
  });
}
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
    const arms = { weaponmastery: h.mastery, grandWeaponmastery: h.grandMastery }[id] || [];
    const mastered = arms.length ? ` Mastered: ${esc(arms.map(LW.itemName).join(', '))}.` : '';
    return `<div><h3>${esc(d.name)}${extra}</h3><p>${esc(d.blurb)}${mastered}${LW.has(h, id) ? '' : ' <i>Not yet learned.</i>'}</p></div>`;
  }
  const it = LW.ITEMS[id] || {}, about = it.about ? ` ${esc(it.about)}` : '';
  // what a weapon (or a Special Item that fights as one) adds, said in its box only
  const parts = it.ranged || it.weapon || sel && sel.kind === 'weapon' ? LW.weaponBonus(h, id) : [];
  const adds = parts.length ? ` ${it.ranged ? 'To the number for a shot' : 'In a fight'}: ${parts.map((p) => `${esc(p.label)} +${p.n}`).join(', ')}.` : '';
  if (sel && sel.kind === 'weapon' && h.weapons.includes(id)) {
    // what it is: the item table's words, else the rules' for a bow or any weapon
    const what = it.about ? esc(it.about) : it.ranged ? 'Shoots only where the story allows, one Arrow from a Quiver a shot. No use hand to hand: with only a Bow, you fight unarmed.' : 'A weapon. You may carry two.';
    return `<div><h3>${esc(LW.itemName(id))}</h3><p>${what}${adds}</p></div>${drop()}`;
  }
  if (sel && sel.kind === 'pack' && it.heal && h.backpack.includes(id)) return `<div><h3>${esc(it.name)}</h3><p>Restores ${it.heal} Endurance.${id === 'potion' ? '' : about}</p></div><button type="button" class="seal" data-drink="${esc(id)}" ${h.ep >= h.epMax ? 'disabled' : ''}>${id === 'potion' ? 'Drink' : 'Eat'}</button>${drop()}`;
  if (sel && sel.kind === 'pack' && h.backpack.includes(id)) return `<div><h3>${esc(LW.itemName(id))}</h3><p>A Backpack Item.${about}</p></div>${drop()}`;
  if (sel && sel.kind === 'meal' && h.meals) return `<div><h3>Meal</h3><p>Eaten when the story calls for it. Go hungry and you lose 3 Endurance.</p></div>${drop('Eat')}`;
  const arrows = id === 'quiver' ? ` ${h.arrows || 0} of ${LW.MAX_ARROWS} Arrows ${stepper('arrows')}` : '';
  if (sel && sel.kind === 'special' && h.special.includes(id)) return `<div><h3>${esc(LW.itemName(id))}</h3><p>A Special Item${it.ep ? `: +${it.ep} Endurance while you carry it` : ''}.${about}${adds}${arrows}</p></div>${drop()}`;
  return '';
}
/* the box a touched medallion opens beside itself: below it, or above when the page runs out */
function placeTip() {
  const html = sel && captionHTML(), btn = html && pr.querySelector(`[data-sel="${CSS.escape(`${sel.kind}|${sel.id}`)}"]`);
  if (!btn) return;
  const tip = el('div', 'caption tip'); tip.innerHTML = html; pr.append(tip);
  const page = pr.getBoundingClientRect(), b = btn.getBoundingClientRect(), fs = parseFloat(getComputedStyle(pr).fontSize);
  const w = tip.offsetWidth, hgt = tip.offsetHeight, cx = b.left + b.width / 2 - page.left, margin = 2.6 * fs, gap = 0.7 * fs;
  const left = Math.max(margin, Math.min(page.width - margin - w, cx - w / 2));
  const below = b.bottom - page.top + gap, up = b.top - page.top - gap - hgt;
  const top = below + hgt <= page.height - margin || up < margin ? below : up;
  Object.assign(tip.style, { left: left + 'px', top: top + 'px' });
  tip.style.setProperty('--ax', cx - left + 'px');
  tip.classList.add(top === below ? 'down' : 'up');
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
  const list = LW.SERIES[series].list, rows = [], across = Math.ceil(list.length / 2); // two rows: five, or the Grand Master's six
  for (let i = 0; i < list.length; i += across) rows.push(list.slice(i, i + across));
  return `<div class="likeness">${portraitURL ? `<img src="${portraitURL}" alt="">` : ''}
      <div class="who"><span class="disc lit">${glyph('wolf-head')}</span><h3>Lone Wolf</h3></div></div>
    <div class="ledgers"><section>${ruled('Attributes')}${row('Combat Skill', `${stepper('cs')} ${cs.total}`)}${row('Endurance', `${stepper('ep')} ${Math.max(0, h.ep)}/${h.epMax}`)}${row('Meals', h.meals)}${row('Rank', esc(LW.rankOf(h) || 'Kai Lord'), true)}${
      series === 'magnakai' ? row('Lore-circles', circles.length ? esc(circles.map((c) => c.name.replace('Circle of ', '').replace('the ', '')).join(', ')) : 'none', true) : ''}</section>
      <section>${ruled('Combat Skill')}${cs.parts.map((p, i) => row(esc(p.label), i ? signed(p.n) : p.n)).join('')}
      ${ruled('Endurance')}${row('Base', h.epMax - epParts.reduce((t, p) => t + p.n, 0))}${epParts.map((p) => row(p.label, signed(p.n))).join('')}</section></div>
    <div class="discs ${across > 5 ? 'six' : ''}">${rows.map((r) => `<div class="drow">${r.map(disc).join(`<span class="linkwrap">${bar}</span>`)}</div>`).join('')}</div>`;
}
/* Inventory, a ledger like the Kai panel (ADR 0028): the two weapons named either side of the faint
   Kai crest, the Special Items as a named list (it scrolls within its place past what fits, so the
   page never shifts), the Backpack as a grid of tiles sized to the book's limit, then the purse */
/* The HD Backpack's ironwork, drawn over the grid: each tile a square with a scrolled curl in every
   corner, diamond studs where the squares meet, a double frame, and a sweep of scroll off each
   corner. In units of 100 a tile; stretched to the grid, the strokes keep their width. */
function packLattice(cols, rows) {
  const W = cols * 100, H = rows * 100, out = [];
  const corner = 'M9 31C9 17 17 9 31 9C37 9 39 14 35 16 32 17.5 30 15 32 13.5M9 31C9 37 14 39 16 35 17.5 32 15 30 13.5 32';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i * 100, y = j * 100;
    out.push(`<rect class="sq" x="${x + 4}" y="${y + 4}" width="92" height="92"/>`);
    for (const r of [0, 90, 180, 270]) out.push(`<path class="curl" transform="translate(${x} ${y}) rotate(${r} 50 50)" d="${corner}"/>`);
  }
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) if (i % cols || j % rows) out.push(`<path class="stud" d="M${i * 100} ${j * 100 - 7}l7 7-7 7-7-7z"/>`);
  const sweep = 'M0 0C-14 0-22-6-30-14-36-20-44-20-46-13-47.5-8-42-5-39-9';
  const ends = [[0, 0, 1, -1], [W, 0, -1, -1], [0, H, 1, 1], [W, H, -1, 1]].map(([x, y, sx, sy]) => `<path class="sweep" transform="translate(${x} ${y}) scale(${sx} ${-sy})" d="${sweep}"/>`);
  return `<svg class="lattice" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><rect class="frame" x="-3" y="-3" width="${W + 6}" height="${H + 6}"/><rect class="frame in" x="1" y="1" width="${W - 2}" height="${H - 2}"/>${out.join('')}${ends.join('')}</svg>`;
}
function packHTML() {
  const h = game.hero, cells = [], on = (kind, id) => (sel && sel.kind === kind && sel.id === id ? 'sel' : '');
  const kept = [...(h.stored || []).map(LW.itemName), ...(h.storedGold ? [`${h.storedGold} Gold Crowns`] : [])]; // in safekeeping
  const taken = Object.values(h.stash || {}).flatMap((st) => [...st.items.map((i) => (i === 'meal' ? 'a Meal' : LW.itemName(i))), ...(st.gold ? [`${st.gold} Gold Crowns`] : [])]);
  const ails = LW.marksOf(h).map((m) => LW.MARKS[m].name + (LW.MARKS[m].about ? `: ${LW.MARKS[m].about}` : ''));
  const slot = (kind, id, extra = '') => `<button type="button" class="disc item ${on(kind, id)} ${extra}" data-sel="${kind}|${esc(id)}" aria-label="${esc(LW.itemName(id))}">${itemGlyph(id)}</button>`;
  // lit when his skill counts with it (what it adds is in its box only). An empty hand shows a faint sword, not a bare ring
  const skilled = (w) => LW.weaponBonus(h, w).some((p) => /^(Grand )?Weapon/.test(p.label));
  const arm = (w) => `<div class="arm">${w ? slot('weapon', w, skilled(w) ? 'lit' : '') : `<span class="disc vacant">${itemGlyph('sword')}</span>`}
    <span class="name">${w ? esc(LW.itemName(w)) : 'No weapon'}</span></div>`;
  // the Quiver shows its Arrows (its room is less what rides in it in their place)
  const count = (s) => (s === 'quiver' ? ` <small>${h.arrows || 0} of ${LW.quiverRoom(h)}</small>` : '');
  // a name with a word too long for its column (Sommerswerd) set smaller, rather than broken mid-word
  const tight = (s) => (LW.itemName(s).split(/\s+/).some((w) => w.length > 10) ? ' class="tight"' : '');
  const specs = h.special.map((s) => `<li>${slot('special', s)}<span${tight(s)}>${esc(LW.itemName(s))}${count(s)}</span></li>`).join('');
  const room = LW.backpackMax(h), cols = Math.ceil(room / 2);
  for (let i = 0; i < h.meals; i++) cells.push(`<button type="button" class="disc item ${on('meal', 'meal')}" data-sel="meal|meal" aria-label="Meal">${itemGlyph('meal')}</button>`);
  h.backpack.forEach((b) => cells.push(slot('pack', b)));
  while (cells.length < room) cells.push('');
  const kit = adding ? pickerHTML() : `<div class="arms">${arm(h.weapons[0])}<span class="crestmark">${glyph('wolf-head')}</span>${arm(h.weapons[1])}</div>
    ${ruled(`Special Items <small>${LW.counted(h)} of ${LW.specialLimit(h)}</small>`)}
    <div class="specs">${specs ? `<ul>${specs}</ul>` : '<p class="none">None carried.</p>'}</div>`;
  return `${kit}
    ${ruled(h.noPack ? 'Backpack <small>lost: find another to carry anything</small>' : `Backpack <small>${h.backpack.length + h.meals} of ${room}</small>`)}
    <div class="pack" style="--cols:${cols}">${cells.map((c) => `<div class="cell">${c}</div>`).join('')}${packLattice(cols, Math.ceil(cells.length / cols))}</div>
    <div class="ledger"><span class="purse">${glyph('two-coins')}<b>${h.gold}</b> Gold Crowns ${stepper('gold')}</span>${
      Object.keys(LW.COINS).filter((c) => (h.coins || {})[c] != null).map((c) => `<span class="purse">${glyph('two-coins')}<b>${h.coins[c]}</b> ${esc(LW.COINS[c])} ${stepper(c)}</span>`).join('')}
      ${adding ? '' : '<button type="button" class="inkbtn addhand" data-adding="open">Add an item by hand</button>'}</div>
    ${kept.length && !adding ? `<p class="kept">At the Kai Monastery, taken up or left at the start of a book: ${esc(kept.join(', '))}.</p>` : ''}${
      // what was taken from him to be given back later (hero.stash), lasting conditions, and the notes the text asks for
      taken.length && !adding ? `<p class="kept">Taken from you, perhaps to be found again: ${esc(taken.join(', '))}.</p>` : ''}${
      ails.length && !adding ? `<p class="kept">${esc(ails.join('. '))}.</p>` : ''}${
      (h.notes || []).length && !adding ? `<p class="kept">Noted: ${esc(h.notes.join('; '))}.</p>` : ''}`;
}
/* Adding by hand: the items as medallions in place of the worn kit, so the Backpack below fills
   while you pick. "Something else" asks for a name on the line beneath. */
let adding = false, naming = null; // naming: 'pack' or 'spec' while a name is being typed
function pickerHTML() {
  const pick = (id) => `<button type="button" class="disc item" data-add="${id}" title="${esc(LW.itemName(id))}" aria-label="Add ${esc(LW.itemName(id))}">${itemGlyph(id)}</button>`;
  const other = (kind, g, label) => `<button type="button" class="disc item other ${naming === kind ? 'sel' : ''}" data-add="other:${kind}" title="${label}" aria-label="${label}">${glyph(g)}</button>`;
  const row = (name, discs) => `<div class="pickrow"><em>${name}</em><div>${discs}</div></div>`;
  const pastItems = [];
  const currentNum = book.number || 0;
  Object.entries(ITEM_TABLES).forEach(([id, table]) => {
    const tableBookNumber = BOOKS[id] ? BOOKS[id].number : 0;
    if (tableBookNumber > 0 && tableBookNumber < currentNum && table.ITEMS) {
      Object.keys(table.ITEMS).forEach((itemId) => {
        if (LW.itemKind(itemId) === 'special' && !pastItems.includes(itemId) && (!ITEM_TABLES[book.id] || !ITEM_TABLES[book.id].ITEMS[itemId])) {
          pastItems.push(itemId);
        }
      });
    }
  });

  return `<div class="picker">${ruled('Add an item <button type="button" class="inkbtn" data-adding="close">done</button>')}
    ${row('Weapons', LW.WEAPONS.map(pick).join(''))}
    ${row('Backpack', pick('meal') + pick('potion') + other('pack', 'swap-bag', 'Another Backpack Item'))}
    ${row('Special Items', pick('helmet') + pick('chainmail') + pick('map') + other('spec', 'gem-pendant', 'Another Special Item'))}
    ${pastItems.length ? `
      <details>
        <summary>View Special Items from Past Books</summary>
        <div style="padding-top: 10px;">
          ${row('Past Items', pastItems.map(pick).join(''))}
        </div>
      </details>
    ` : ''}
    ${naming ? `<input id="itemname" class="pickname" placeholder="Name it, then press Enter" aria-label="Item name" data-prefix="${naming}">` : '<p class="pickname">Touch an item to add it.</p>'}</div>`;
}

/* the current book's printed map, or null until it has loaded (an open map modal starts then) */
const printed = {};
function printedMap() {
  const url = asset(book.map);
  if (!printed[url]) { const im = (printed[url] = new Image()); im.onload = () => { if (M && M.ready) M.ready(); }; im.src = url; }
  return printed[url].complete && printed[url].naturalWidth ? printed[url] : null;
}
const scans = {};
// repainted at twice the scan's size for sharp ink, but no wider than SCAN_MAX: a 4K map doubled is
// 7680 px, past the iPad's canvas limit (about 16.7 million pixels)
const SCAN_MAX = 4096;
const scanOf = (img) => {
  const k = Math.min(2, SCAN_MAX / img.naturalWidth);
  return (scans[img.src] = scans[img.src] || printedCanvas(img, [0, 0, img.naturalWidth, img.naturalHeight], Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k)));
};

/* ---------- the map modal ----------
   The printed map over the whole window, in a parchment frame like the left page's. The map is
   laid out in image pixels and drawn at scale s (screen px per image px) by a CSS transform; the
   canvas is scanOf's, not repainted. s0 is the scale at which the whole map fits the view (the
   least allowed, and where it opens, with parchment round it); the pan is clamped so no edge
   comes inside the view, and the map is centred on an axis where it is smaller than the view. */
let M = null; // the open modal's state, or null
const MAP_ZOOM = 3; // most zoom over fit (owner, 2026-10-06): enough for the smallest labels of a 4K map
const CLOSE_X = `<svg class="rose" viewBox="-50 -50 100 100" aria-hidden="true"><g transform="rotate(45)"><path class="lt" d="M0 -40L9 -4L0 0Z"/><path class="dk" d="M0 -40L-9 -4L0 0Z"/><path class="lt" d="M0 40L-9 4L0 0Z"/><path class="dk" d="M0 40L9 4L0 0Z"/><path class="lt" d="M-40 0L-4 -9L0 0Z"/><path class="dk" d="M-40 0L-4 9L0 0Z"/><path class="lt" d="M40 0L4 9L0 0Z"/><path class="dk" d="M40 0L4 -9L0 0Z"/></g></svg>`;
function openMap() {
  if (M) return;
  const opener = document.activeElement;
  const el = document.createElement('div');
  el.className = 'mapmodal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'The map printed in the book');
  el.innerHTML = `<div class="mapframe"><div class="mapview">${book.map ? '' : '<p class="maphint">This book has no map.</p>'}</div><div class="mapborder"></div>
    ${book.map ? '<div class="mapzoom"><button type="button" class="med numeral" data-z="1" aria-label="Zoom in">+</button><button type="button" class="med numeral" data-z="-1" aria-label="Zoom out">&minus;</button></div>' : ''}
    <button type="button" class="med mapclose" aria-label="Close the map" title="Close (Esc)">${CLOSE_X}</button></div>`;
  document.body.append(el);
  const frame = el.firstElementChild, view = frame.firstElementChild, border = view.nextElementSibling;
  M = { el, view, s: 1, s0: 1, tx: 0, ty: 0, vw: 0, vh: 0, img: null, cv: null };
  const ptrs = new Map(), at = (e) => { const r = view.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  function fitFrame() { // the frame is drawn for this very size, so its band is never stretched
    const W = frame.clientWidth, H = frame.clientHeight, f = Math.min(0.7, Math.max(0.4, W / 2000));
    frame.style.setProperty('--inset', Math.round(66 * f) + 'px');
    border.style.backgroundImage = `url(${drawFrame(Math.round(W / f), Math.round(H / f)).toDataURL()})`;
    const r = view.getBoundingClientRect(); M.vw = r.width; M.vh = r.height;
  }
  function apply() {
    const { img, s, vw, vh } = M, w = img.naturalWidth * s, h = img.naturalHeight * s;
    M.tx = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, M.tx));
    M.ty = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, M.ty));
    M.cv.style.transform = `translate(${M.tx}px,${M.ty}px) scale(${s})`;
  }
  function zoomAt(p, ns) { // toward p, a point in the view
    ns = Math.min(M.s0 * MAP_ZOOM, Math.max(M.s0, ns));
    const k = ns / M.s; M.tx = p.x - (p.x - M.tx) * k; M.ty = p.y - (p.y - M.ty) * k; M.s = ns; apply();
  }
  M.ready = () => { // the image is here: show it whole
    const im = M.img = printedMap(); if (!im || M.cv) return;
    const cv = M.cv = scanOf(im);
    cv.style.cssText = `position:absolute;left:0;top:0;width:${im.naturalWidth}px;height:${im.naturalHeight}px;transform-origin:0 0;`;
    view.replaceChildren(cv);
    M.s0 = M.s = Math.min(M.vw / im.naturalWidth, M.vh / im.naturalHeight); M.tx = M.ty = 0; apply();
  };
  const onResize = () => { // keep the same centre and the same zoom over fit
    fitFrame(); if (!M.cv) return;
    const im = M.img, cx = (M.vw / 2 - M.tx) / M.s, cy = (M.vh / 2 - M.ty) / M.s, zoom = M.s / M.s0;
    M.s0 = Math.min(M.vw / im.naturalWidth, M.vh / im.naturalHeight); M.s = M.s0 * zoom;
    M.tx = M.vw / 2 - cx * M.s; M.ty = M.vh / 2 - cy * M.s; apply();
  };
  fitFrame(); if (book.map && printedMap()) M.ready();

  view.addEventListener('pointerdown', (e) => { if (!M.cv) return; view.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, at(e)); view.classList.add('drag'); e.preventDefault(); });
  view.addEventListener('pointermove', (e) => {
    const was = ptrs.get(e.pointerId); if (!was || !M.cv) return;
    const now = at(e), o = [...ptrs.entries()].find(([id]) => id !== e.pointerId);
    if (o) { // pinch: pan with the midpoint, zoom with the spread
      const q = o[1], d0 = Math.hypot(was.x - q.x, was.y - q.y) || 1, d1 = Math.hypot(now.x - q.x, now.y - q.y);
      const c0 = { x: (was.x + q.x) / 2, y: (was.y + q.y) / 2 }, c1 = { x: (now.x + q.x) / 2, y: (now.y + q.y) / 2 };
      M.tx += c1.x - c0.x; M.ty += c1.y - c0.y; zoomAt(c1, M.s * d1 / d0);
    } else { M.tx += now.x - was.x; M.ty += now.y - was.y; apply(); }
    ptrs.set(e.pointerId, now);
  });
  for (const t of ['pointerup', 'pointercancel']) view.addEventListener(t, (e) => { ptrs.delete(e.pointerId); if (!ptrs.size) view.classList.remove('drag'); });
  view.addEventListener('wheel', (e) => {
    e.preventDefault(); if (!M.cv) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    zoomAt(at(e), M.s * Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.01 : 0.0015)));
  }, { passive: false });
  const step = (dir) => { if (M.cv) zoomAt({ x: M.vw / 2, y: M.vh / 2 }, M.s * (dir > 0 ? 1.4 : 1 / 1.4)); };
  const keys = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeMap(); }
    else if (e.key === '+' || e.key === '=') step(1);
    else if (e.key === '-' || e.key === '_') step(-1);
  };
  window.addEventListener('keydown', keys, true);
  window.addEventListener('resize', onResize);
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('.mapclose')) closeMap();
    else { const z = e.target.closest('[data-z]'); if (z) step(+z.dataset.z); }
  });
  M.close = () => { window.removeEventListener('keydown', keys, true); window.removeEventListener('resize', onResize); el.remove(); M = null; if (opener && opener.focus && document.contains(opener)) opener.focus(); };
  frame.querySelector('.mapclose').focus();
}
function closeMap() { if (M) M.close(); }

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
  const tabs = [['kai', 'Kai Disciplines'], ['pack', 'Inventory'], ['map', 'Map']]; // Map opens the modal, not a panel
  rtabs.hidden = mode !== 'story';
  rtabs.innerHTML = tabs.map(([id, label]) => `<button type="button" class="med" role="tab" aria-selected="${panel === id}" aria-label="${label}" data-panel="${id}">${TAB_ART[id]}</button>`).join('')
    + `<button type="button" class="med home" data-home aria-label="Back to the title page" title="Back to the title page">${glyph('return-arrow')}</button>`; // the HD return medallion: start over, or pick another book
  if (mode === 'title') { pr.innerHTML = titleRightHTML(); return; }
  if (mode === 'setup') {
    // a choice redraws the page: keep the list where the reader had scrolled it
    const was = pr.querySelector('.supage'), top = was && was.dataset.step === SU.step ? was.scrollTop : 0;
    pr.innerHTML = setupRightHTML();
    const list = pr.querySelector('.supage');
    if (list) { list.dataset.step = SU.step; list.scrollTop = top; fadeEdges(list); }
    return;
  }
  if (!game.s) return;
  const h = game.hero, cs = B ? B.cs() : LW.heroCS(h).total;
  const place = mode === 'battle' ? 'Combat' : book.title;
  const head = `<div class="headrow"><div class="place">${esc(place)}</div>
    <div class="gauges">${gauges(cs, h)}</div></div>`;
  pr.innerHTML = head + '<div class="panel" id="panel"></div>';
  const host = $('#panel');
  if (mode === 'battle') host.append(B.node);
  else { host.innerHTML = panel === 'kai' ? kaiHTML() : packHTML(); placeTip(); }
}
function render() {
  // reaching the end of a real book keeps the character for the next one
  if (mode === 'story' && game.section.end === 'victory' && !game.dead) LW.Character.save(game.hero, book);
  renderLeft(); renderRight();
}

/* ---------- setting out: the Action Chart over both pages ----------
   Before a book begins: the two scores, each drawn on the Random Number medallion, and the
   disciplines (left page: the scores, and a slot for each discipline to choose; right: every
   discipline of the series, with what it does); then the book's kit (left: gold, what is given, and
   a slot for each thing to take; right: what may be taken, kept or left). LW.HeroSetup and
   LW.KitSetup (shared/rules-series.js) hold the rules. */
let SU = null; // { step: 'hero', h } or { step: 'kit', k }
const kitName = (x) => { const s = LW.kitEntryName(x); return s.charAt(0).toUpperCase() + s.slice(1); };
const KIND_WORD = { weapon: 'A Weapon', backpack: 'A Backpack Item', special: 'A Special Item' };
const kitArt = (x) => itemGlyph(x.meal ? 'meal' : x.item) + (x.meal > 1 || x.n > 1 ? `<span class="n">${x.meal || x.n}</span>` : '');
const kitAbout = (x) => {
  if (x.meal) return 'Meals, eaten when the story calls for it.';
  const it = LW.ITEMS[x.item] || {};
  return `${KIND_WORD[LW.itemKind(x.item)] || 'An item'}${it.ep ? `: +${it.ep} Endurance while carried` : ''}.${it.about ? ` ${it.about}` : ''}`;
};
const suFoot = (say, ready, goLabel) => `<div class="finis su-foot"><p aria-live="polite">${esc(say)}</p>
    <button type="button" class="seal" data-su="go" ${ready ? '' : 'disabled'}>${goLabel}</button>
    <span><button type="button" class="inkbtn" data-su="auto">choose for me</button><button type="button" class="inkbtn" data-su="shelf">back to the books</button></span></div>`;
/* A row of slots, one for each choice, strung on an engraved rail: a double rule ending each side in
   a lozenge and a pair of scrolls, a smaller lozenge between slots. The chosen are lit medallions
   (touch one to let it go); the rest are sockets cut into the page, a ticked double ring round a
   faint star. All drawn in ink (currentColor), sized off the row's em. */
const RAIL_END = '<svg class="su-end" viewBox="0 0 44 24" aria-hidden="true"><path d="M28 10.2h16v1.1H28zM28 12.7h16v1.1H28zM19 12l5-4.5 5 4.5-5 4.5zM22 12l2 2 2-2-2-2z" fill-rule="evenodd"/>'
  + '<path d="M19 12C14 12 12 8.5 9 6.8 6 5 3 6.5 3.6 9 4.2 11.2 7.2 10.8 7 8.8M19 12C14 12 12 15.5 9 17.2 6 19 3 17.5 3.6 15 4.2 12.8 7.2 13.2 7 15.2" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round"/>'
  + '<path d="M.5 12L11 11.1v1.8z"/></svg>';
const RAIL_LINK = '<i class="su-link" aria-hidden="true"><svg viewBox="0 0 10 10"><path d="M5 1.2L8.8 5 5 8.8 1.2 5zM5 3.4L6.6 5 5 6.6 3.4 5z" fill-rule="evenodd"/></svg></i>';
const SOCKET = (() => {
  let ticks = '';
  for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); ticks += `M${(c * 17.1).toFixed(2)} ${(s * 17.1).toFixed(2)}L${(c * 18.7).toFixed(2)} ${(s * 18.7).toFixed(2)}`; }
  return '<span class="su-socket" aria-hidden="true"><svg viewBox="-20 -20 40 40"><defs><radialGradient id="su-sunk" cx="0.5" cy="0.32" r="0.62">'
    + '<stop offset="0.55" stop-color="currentColor" stop-opacity="0"/><stop offset="1" stop-color="currentColor" stop-opacity="0.2"/></radialGradient></defs>'
    + '<circle r="16.6" fill="url(#su-sunk)" stroke="currentColor" stroke-width="0.6"/><circle r="19.3" fill="none" stroke="currentColor" stroke-width="0.9"/>'
    + `<path d="${ticks}" stroke="currentColor" stroke-width="0.55" opacity="0.7"/>`
    + '<path class="star" d="M0-7.5L1.5-1.5 7.5 0 1.5 1.5 0 7.5-1.5 1.5-7.5 0-1.5-1.5z" transform="rotate(45) scale(0.62)"/>'
    + '<path class="star" d="M0-7.5L1.5-1.5 7.5 0 1.5 1.5 0 7.5-1.5 1.5-7.5 0-1.5-1.5z"/></svg></span>';
})();
const suSlots = (label, filled, n) => {
  const out = filled.slice();
  while (out.length < n) out.push(SOCKET);
  return `<div class="su-slots">${ruled(label)}<div class="su-rail">${RAIL_END}${out.join(RAIL_LINK)}${RAIL_END}</div></div>`;
};
function setupLeftHTML() {
  const head = (title) => `<span class="eyebrow lead">${esc(book.title)}</span><h2 class="su-h">${title}</h2>`;
  if (SU.step === 'hero') {
    const h = SU.h, carried = !!h.hero, need = h.need(), kept = carried && h.carried();
    const score = (key, label, base) => {
      const n = h.rolls[key];
      return `<div class="su-score">${carried ? `<span class="med su-val">${kept[key]}</span>` : `<span class="dialslot" data-sudial="${key}"></span>`}<b>${label}</b><i>${
        carried ? 'carried on' : n == null ? `${base} + the number drawn` : `${base} + ${n} = <em>${base + n}</em>`}</i></div>`;
    };
    // into the Grand Master series the Backpack Items come too, and only the listed Special Items (rules-series.js, enterGrand)
    const gm = h.series === 'grandmaster', entering = gm && carried && h.hero.series !== 'grandmaster';
    const from = `Carried on from ${esc(h.carry ? h.carry.fromTitle || 'the last book' : '')}: your scores, disciplines, weapons`;
    const note = !carried ? 'Touch each medallion to draw your two scores.' : entering
      ? `${from}, Backpack Items and gold, but no Meals; only the ten Special Items the series allows. The Lore-circles’ Combat Skill is now in your score.`
      : gm ? `${from}, Special Items, Backpack Items and gold, but no Meals.`
      : `${from}, Special Items and gold. The Backpack starts empty.`;
    const say = h.rolls.cs == null || h.rolls.ep == null ? 'Draw both scores.' : h.picked.size < h.pick ? `Choose ${h.pick - h.picked.size} more on the facing page.`
      : h.weapons.size < need ? `Choose ${need - h.weapons.size} more weapon${need - h.weapons.size === 1 ? '' : 's'} to master.` : 'Your Action Chart is ready.';
    const chosen = [...h.picked].map((id) => `<button type="button" class="disc lit" data-supick="${id}" title="${esc(LW.DISCIPLINES[id].name)}" aria-label="Let ${esc(LW.DISCIPLINES[id].name)} go">${glyph(DISC_GLYPH[id])}</button>`);
    const mastered = [...h.weapons].map((w) => `<button type="button" class="disc item lit" data-suw="${w}" title="${esc(LW.itemName(w))}" aria-label="Let ${esc(LW.itemName(w))} go">${itemGlyph(w)}</button>`);
    return `<div class="setup">${head(carried ? 'Your Lone Wolf returns' : 'Your Action Chart')}<p class="su-note">${note}</p>
      <div class="su-scores">${score('cs', 'Combat Skill', h.S.base.cs)}${score('ep', 'Endurance', h.S.base.ep)}</div>
      ${h.pick ? suSlots(`${h.pick === 1 ? 'A new' : h.pick} ${h.S.name} Discipline${h.pick === 1 ? '' : 's'}`, chosen, h.pick) : `<p class="su-note">You have mastered every ${h.S.name} Discipline.</p>`}
      ${need ? suSlots(`${need} weapon${need === 1 ? '' : 's'} to master`, mastered, need) : ''}
      ${suFoot(say, h.ready(), h.kit ? 'On to your equipment' : 'Begin')}</div>`;
  }
  const k = SU.k, kit = k.kit, g = k.gold(), hero = k.hero;
  const gold = k.roll == null ? `${hero.gold} carried, and the book adds ${kit.gold || 10} + the number drawn.`
    : `${hero.gold} carried + ${kit.gold || 10} + ${k.roll}: <em>${g.purse}</em> in your Belt Pouch${g.over ? kit.storeGold ? `, and ${g.over} over its 50 go to the Monastery` : `; it holds 50, so ${g.over} are lost` : ''}.`;
  const given = [...k.gifts.map((x) => ({ x, note: 'given' })), ...k.had.map((x) => ({ x, note: 'yours already' }))];
  const say = k.roll == null ? 'Draw your gold.' : k.problems()[0] || (k.chosen.size < kit.choose ? `You may take ${kit.choose - k.chosen.size} more.` : 'Your equipment is ready.');
  const taken = [...k.chosen].map((i) => `<button type="button" class="disc item lit" data-sukit="${i}" title="${esc(kitName(k.from[i]))}" aria-label="Put back ${esc(kitName(k.from[i]))}">${kitArt(k.from[i])}</button>`);
  return `<div class="setup">${head('Your equipment')}
    <div class="su-gold"><span class="dialslot" data-sudial="gold"></span><div><b>Gold Crowns</b><p>${gold}</p>${g.bank && k.roll != null ? `<p>At the Monastery: ${g.bank - k.draw}. ${
      ''}<span class="step"><button type="button" data-sudraw="-1" aria-label="Leave one there" ${k.canDraw(-1) ? '' : 'disabled'}>&minus;</button><button type="button" data-sudraw="1" aria-label="Take one" ${k.canDraw(1) ? '' : 'disabled'}>+</button></span> In the pouch: ${g.purse + k.draw}.</p>` : ''}</div></div>
    ${given.length || kit.wear ? `<div class="block finds"><span class="eyebrow">The Kai give you</span>${given.map(({ x, note }) => `<span class="find got"><span class="med lit">${kitArt(x)}</span><span>${esc(kitName(x))}<i>${note}</i></span></span>`).join('')}${
      kit.wear ? `<span class="su-wear">You wear ${esc(kit.wear)}.</span>` : ''}</div>` : ''}
    ${suSlots(`Take up to ${kit.choose}`, taken, kit.choose)}
    ${suFoot(say, k.ready(), 'Begin')}</div>`;
}
/* a scrolling list fades out at each edge it can still be scrolled past (.fade-t, .fade-b) */
function fadeEdges(box) {
  const set = () => {
    box.classList.toggle('fade-t', box.scrollTop > 1);
    box.classList.toggle('fade-b', box.scrollTop + box.clientHeight < box.scrollHeight - 1);
  };
  box.addEventListener('scroll', set, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(set).observe(box); // the window resized, or the fonts came in
  set();
}
/* the facing page: every choice a row, its medallion, name and what it does, touched to take it or let it go */
const suItem = (data, art, name, about, on, note, off) => `<button type="button" class="suitem ${off ? 'off' : ''}" ${data} aria-pressed="${!!on}"><span class="disc ${on ? 'lit' : ''}">${art}</span><span><b>${esc(name)}${note ? ` <small>${note}</small>` : ''}</b>${about ? `<i>${esc(about)}</i>` : ''}</span></button>`;
function setupRightHTML() {
  if (SU.step === 'hero') {
    const h = SU.h, need = h.need();
    const disc = (id) => {
      const own = h.owned.includes(id), on = own || h.picked.has(id), d = LW.DISCIPLINES[id];
      const ws = id === 'weaponskill' && h.series === 'kai' && !own ? ' The weapon is drawn when you begin.' : '';
      return suItem(`data-supick="${id}" ${own ? 'disabled' : ''}`, glyph(DISC_GLYPH[id]), d.name, d.blurb + ws, on, own ? 'learned' : '', !on && !h.canPick(id));
    };
    const weapon = (w) => {
      const had = h.oldMastery.includes(w), on = had || h.weapons.has(w);
      return suItem(`data-suw="${w}" ${had ? 'disabled' : ''}`, itemGlyph(w), LW.itemName(w), '', on, had ? 'mastered' : '', !on && !h.canWeapon(w));
    };
    return `<div class="headrow"><div class="place">${esc(h.S.name)} Disciplines</div></div>
      <div class="supage"><div class="sulist">${h.S.list.map(disc).join('')}</div>
      ${need ? `${ruled(`${LW.DISCIPLINES[h.S.arms.disc].name} <small>choose ${need} weapon${need === 1 ? '' : 's'} to master</small>`)}<div class="sulist short">${LW.WEAPONS.map(weapon).join('')}</div>` : ''}</div>`;
  }
  const k = SU.k, hero = k.hero;
  const entry = (x, i) => suItem(`data-sukit="${i}"`, kitArt(x), kitName(x), kitAbout(x), k.chosen.has(i), k.held(i) ? 'yours already' : '', !k.chosen.has(i) && !k.canChoose(i));
  const weapons = hero.weapons.map((w, i) => suItem(`data-sudrop="${i}"`, itemGlyph(w), LW.itemName(w), k.dropW.has(i) ? 'Left behind.' : 'Kept. Touch to leave it behind.', !k.dropW.has(i)));
  const monastery = [...hero.special.map((s, i) => suItem(`data-suleave="${i}"`, itemGlyph(s), LW.itemName(s), k.leave.has(i) ? 'At the Monastery.' : 'Carried.', !k.leave.has(i))),
    ...k.stored.map((s, i) => suItem(`data-sufetch="${i}"`, itemGlyph(s), LW.itemName(s), k.fetch.has(i) ? 'Carried.' : 'At the Monastery.', k.fetch.has(i)))];
  return `<div class="headrow"><div class="place">The Kai Monastery</div></div>
    <div class="supage">${ruled(`Take up to ${k.kit.choose} <small>${k.chosen.size} taken</small>`)}<div class="sulist">${k.from.map(entry).join('')}</div>
    ${weapons.length ? `${ruled('Your Weapons')}<div class="sulist">${weapons.join('')}</div>` : ''}
    ${k.store && monastery.length ? `${ruled('Special Items <small>the Monastery keeps them safe, out of use</small>')}<div class="sulist">${monastery.join('')}</div>` : ''}</div>`;
}
/* Combat Skill, Endurance and the gold are drawn on the Random Number medallion */
function mountSetup() {
  if (mode !== 'setup') return;
  pl.querySelectorAll('[data-sudial]').forEach((slot) => {
    const key = slot.dataset.sudial, gold = key === 'gold', got = gold ? SU.k.roll : SU.h.rolls[key];
    const dial = makeDial(async () => {
      if (busy || got != null) return;
      busy = true;
      const n = await dial.spin();
      if (gold) SU.k.rollGold(n); else SU.h.roll(key, n);
      busy = false; render();
    });
    if (got != null) dial.show(got);
    slot.append(dial.el);
  });
}
function setupClick(d, t) {
  const h = SU.h, k = SU.k;
  if (d.su === 'shelf') { SU = null; return toTitle(true); }
  if (d.su === 'go') return void guard(setOut);
  if (d.su === 'auto') (h || k).auto();
  else if (d.supick) h.toggle(d.supick);
  else if (d.suw) h.toggleWeapon(d.suw);
  else if (d.sukit != null) k.choose(+d.sukit);
  else if (d.sudrop != null) k.flip(k.dropW, +d.sudrop);
  else if (d.suleave != null) k.flip(k.leave, +d.suleave);
  else if (d.sufetch != null) k.flip(k.fetch, +d.sufetch);
  else if (d.sudraw) { if (k.canDraw(+d.sudraw)) k.draw += +d.sudraw; }
  else return;
  render();
}
/* the Action Chart is done: on to the book's kit, or into the book */
async function setOut() {
  if (SU.step === 'hero' && SU.h.kit) {
    SU = { step: 'kit', k: LW.KitSetup(book, SU.h.kit, SU.h.build()) };
    return turn(render);
  }
  const hero = LW.readyHero(SU.step === 'kit' ? SU.k.finish() : SU.h.build());
  SU = null;
  if (!hero.flagsRead) backfillFlags(hero); // a character carried from a save made before the flags
  game.clear(); game.start(hero); mode = 'story'; panel = 'kai'; sel = null; intro = book.intro && book.intro.length ? 'new' : false;
  await turn(render);
}

/* A page turn, as in a book read left to right: the right-hand leaf lifts at the spine and falls
   over onto the left, the new story on its back. The old story stays under it until covered. On a
   phone the pages are stacked, so the story page only lifts away. */
const stacked = window.matchMedia('(max-width: 760px)');
const snap = (node, cls) => {
  const c = node.cloneNode(true);
  c.removeAttribute('id'); c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  c.className = cls; c.removeAttribute('aria-live');
  return c;
};
async function turn(update) {
  const spread = pl.parentNode;
  if (still || stacked.matches) {
    const old = snap(pl, pl.className + ' turning');
    old.style.width = pl.offsetWidth + 'px'; old.style.height = pl.offsetHeight + 'px';
    spread.appendChild(old);
    update();
    gearTurn -= 22.5; gear.style.transform = `rotate(${gearTurn}deg)`;
    if (!still) await old.animate([{ transform: 'rotateY(0deg)', opacity: 1, filter: 'brightness(1)' }, { transform: 'rotateY(-82deg)', opacity: 1, filter: 'brightness(0.55)', offset: 0.8 }, { transform: 'rotateY(-90deg)', opacity: 0, filter: 'brightness(0.4)' }], { duration: 750, easing: 'ease-in' }).finished.catch(() => {});
    old.remove();
    return;
  }
  const place = (n, box) => Object.assign(n.style, { left: box.offsetLeft + 'px', top: box.offsetTop + 'px', width: box.offsetWidth + 'px', height: box.offsetHeight + 'px' });
  const under = snap(pl, 'page left turning'), leaf = el('div', 'leaf'), front = snap(pr, 'page right');
  place(under, pl); place(leaf, pr.parentNode);
  front.append(el('i', 'dim'));
  leaf.append(front);
  spread.append(under, leaf);
  update();
  const back = snap(pl, 'page left');
  back.append(el('i', 'dim'));
  leaf.append(back);
  gearTurn -= 22.5; gear.style.transform = `rotate(${gearTurn}deg)`;
  const ms = 900, ease = 'cubic-bezier(0.45, 0.05, 0.4, 1)';
  const dims = leaf.querySelectorAll('.dim');
  dims[0].animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms / 2, easing: 'ease-in', fill: 'forwards' });
  dims[1].animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: ms, easing: ease, fill: 'forwards' });
  await leaf.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }], { duration: ms, easing: ease }).finished.catch(() => {});
  under.remove(); leaf.remove();
}

/* ---------- story actions ---------- */
async function choose(i) {
  const c = game.choices()[i];
  if (!c || !c.enabled) return;
  let to = c.to;
  if (c.random) {
    const slot = $('#dialslot'), dial = makeDial(), note = el('p');
    note.textContent = (c.random.mod || []).filter((m) => LW.has(game.hero, m.disc)).map((m) => `${LW.DISCIPLINES[m.disc].name} adds ${m.plus}.`).join(' ') || 'The medallion decides.';
    slot.append(dial.el, note);
    const r = game.resolveRandom(c, await dial.spin());
    note.textContent = r.mod ? `${r.roll}, and ${r.mod} more makes ${r.total}.` : `You drew ${r.roll}.`;
    to = r.to;
    await wait(900);
  }
  game.choose(c, to);
  sel = null;
  await turn(render);
}
/* back k sections, to make that choice again */
async function goBack(k) {
  game.back(k);
  sel = null; mode = 'story';
  await turn(render);
}

/* ---------- combat, on the page ---------- */
const tween = (ms, fn) => new Promise((res) => { if (still) { fn(1); return res(); } const t0 = performance.now(); (function step(now) { const k = Math.min(1, (now - t0) / ms); fn(k); k < 1 ? requestAnimationFrame(step) : res(); })(t0); });

async function startBattle() {
  if (game.s.broken) delete game.s.broken[game.s.at]; // fought after all
  const node = el('div', 'fight');
  node.innerHTML = `<canvas width="600" height="800"></canvas><div class="foebar"><span data-b="name"></span><div class="bar"><i></i></div><small data-b="stats"></small></div><div class="cmds" data-b="cmds"></div>`;
  // the fight's rules are LW.Fight's (shared/fight.js); the page adds its drawing state
  B = Object.assign(new LW.Fight(game, book.id), { lock: false, scene: game.section.scene, node, img: null, fx: { lunge: 0, hit: 0, dead: 0, wounds: [] } });
  showFoe();
  mode = 'battle';
  await turn(render);
  updateBattle();
  const cv = node.querySelector('canvas');
  B.fit = () => {
    const r = node.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(200, Math.round(r.width * dpr)); cv.height = Math.max(200, Math.round(r.height * dpr));
    // the picture keeps above the controls, wherever the layout puts them
    const tops = [...B.node.querySelectorAll('[data-cmd]')].map((n) => n.getBoundingClientRect().top).filter((y) => y > r.top);
    B.floor = tops.length && r.height ? Math.min(0.83, (Math.min(...tops) - r.top) / r.height) : 0.83;
    // and below the enemy's name and stats (their line, not the fade beneath it)
    const bars = [...B.node.querySelectorAll('.foebar > *')].map((n) => n.getBoundingClientRect().bottom);
    B.ceil = bars.length && r.height ? Math.max(0, Math.min(0.3, (Math.max(...bars) - r.top) / r.height)) : 0.03;
  };
  B.fit();
  (function loop() {
    if (!B || B.node !== node) return;
    B.fx.hit *= 0.86; B.fx.wounds.forEach((w) => { w.k += 0.14; });
    drawCreature(cv, B.foe.sprite, B.scene, 0.4, B.fx, B.img, B.floor, B.ceil); // a still plate: only wounds and the lunge move
    requestAnimationFrame(loop);
  })();
}
/* a new foe on the plate: its picture, unhurt */
function showFoe() {
  B.fx.dead = 0; B.fx.wounds = []; B.img = null;
  // the approved picture, else the plate library's or the section's own, else the drawn emblem (platepick.js)
  const foe = B.foe, plate = pickPlate(foe, book, PLATES, PINS[book.id], pinKey(game.s.at, B.foe.at));
  if (plate) { const im = new Image(); im.crop = plate.crop; im.levels = plate.levels; im.flip = plate.flip; im.onload = () => { if (B && B.foe === foe) B.img = im; }; im.src = upscaledSrc(plate.src, UPSCALED[book.id]); }
}
/* assets/plates/plates.json: pictures for enemies the book does not picture */
let PLATES = [];
fetch('assets/plates/plates.json').then((r) => r.json()).then((j) => { PLATES = compilePlates(j.plates); }).catch(() => {});
/* assets/plates/approved/<book>.json: the pictures the owner approved, kept whatever plates.json now picks;
   assets/plates/upscaled/<book>.json: those of its fight pictures shown from their 2x copy (ADR 0033) */
const PINS = {}, UPSCALED = {};
function loadPins(id) {
  if (id in PINS) return;
  PINS[id] = null; UPSCALED[id] = null;
  fetch(`assets/plates/approved/${id}.json`).then((r) => (r.ok ? r.json() : null)).then((j) => { PINS[id] = (j && j.pins) || null; }).catch(() => {});
  fetch(`assets/plates/upscaled/${id}.json`).then((r) => (r.ok ? r.json() : null)).then((j) => { UPSCALED[id] = (j && j.srcs) || null; }).catch(() => {});
}
function updateBattle() {
  const hero = game.hero, foe = B.foe, q = (k) => B.node.querySelector(`[data-b=${k}]`), r = B.ratio();
  q('name').textContent = foe.name;
  B.node.querySelector('.bar i').style.width = Math.max(0, (foe.ep / foe.max) * 100) + '%';
  q('stats').textContent = `CS ${foe.cs} · EP ${Math.max(0, foe.ep)} · Ratio ${r > 0 ? '+' : ''}${r}`;
  const locked = B.lock || B.over;
  const med = (id, ic, label, note, off, extra = '') => `<div class="medcap"><button type="button" class="med ${extra}" data-cmd="${id}" ${locked || off ? 'disabled' : ''} aria-label="${label}">${ic}</button>${label}<small>${note}</small></div>`;
  const n = hero.backpack.filter((b) => b === 'potion').length, psi = LW.psi(hero), cure = LW.cureOf(hero);
  const left = med('fight', B.weapon ? itemGlyph(B.weapon) : glyph('crossed-swords'), 'Strike', 'attack')
    + (B.power ? med('mind', glyph(B.power === 2 ? 'psychic-waves' : 'brainstorm'), B.power === 2 ? psi.name : 'Mindblast', B.deaf() ? 'no effect' : foe.immune && B.mind === 1 ? 'as Mindblast: no effect' : ['at rest', B.power === 2 ? `as Mindblast, +${psi.blast}` : 'focused, +2', `+${psi.surge}, costs ${psi.cost} a round`][B.mind], false, B.blasting() ? 'lit' : '') : '');
  const right = (n ? med('item', itemGlyph('potion'), 'Laumspur', `${n} left`, hero.ep >= hero.epMax) : '')
    + (LW.canCure(hero, book.id) ? med('cure', glyph('healing'), cure.name, hero.ep <= cure.at ? '20 back, once a book' : `at ${cure.at} or less`, hero.ep > cure.at) : '')
    + B.boosts().map((id) => med('boost:' + id, itemGlyph(id), esc(LW.itemName(id)), 'before you strike')).join('')
    // one medallion for each way out the text allows (B.evades()); a second one is named by its own label
    + B.evades().map((e) => med('evade:' + e.i, glyph(e.free ? 'invisible' : 'run'), e.label ? esc(e.label) : 'Evade', e.open ? (e.free ? 'untouched' : 'take one blow') : e.late ? 'too late' : e.if && !LW.meets(hero, e.if) ? `needs ${esc(LW.condName(e.if))}` : `after round ${e.after}`, !e.open)).join('');
  const cmds = q('cmds');
  cmds.innerHTML = left + right;
  renderLeft();
  const sc = $('#scroll'); if (sc) sc.scrollTop = 1e6;
  const gq = pr.querySelector('.gauges');
  if (gq) gq.innerHTML = gauges(B.cs(), hero);
}
async function lunge(n) {
  await tween(200, (k) => { B.fx.lunge = k * k; });
  if (n) { bookEl.classList.remove('hurt'); void bookEl.offsetWidth; bookEl.classList.add('hurt'); setTimeout(() => bookEl.classList.remove('hurt'), 420); }
  await tween(320, (k) => { B.fx.lunge = 1 - k; });
}
async function battleAct(id) {
  if (!B || B.lock || B.over) return;
  B.lock = true; updateBattle();
  if (id === 'mind') B.focus();
  else if (id === 'cure') B.cure();
  else if (id === 'item') B.drink();
  else if (id === 'stop') B.stopHere();
  else if (id.startsWith('boost:')) B.boost(id.slice(6));
  else {
    // the Random Number is drawn out of sight: the owner wants no medallion in a fight (ADR 0026)
    const o = B.roll(LW.rand10());
    if (B.over) { /* the number drawn ended the fight (c.stop drawn) */ }
    else if (id.startsWith('evade')) { B.flee(o, +id.split(':')[1] || 0); await lunge(o.taken); }
    else {
      B.strike(o);
      await wait(still ? 0 : 140);
      if (o.dealt) { B.fx.wounds.push(newWound()); B.fx.hit = 1; }
      updateBattle();
      await wait(still ? 0 : 480);
      const foeUp = B.foe.ep > 0;
      B.suffer(o); // his losses are drawn with the lunge, as they land
      if (foeUp || o.taken) await lunge(o.taken);
      if (o.down) {
        updateBattle();
        await tween(1000, (k) => { B.fx.dead = k; });
        if (B.advance()) showFoe();
      }
    }
  }
  B.lock = false; updateBattle();
}
async function endBattle() {
  B.finish();
  B = null; mode = 'story'; sel = null;
  await turn(render);
}

/* ---------- input ---------- */
async function guard(fn) { if (busy) return; busy = true; try { await fn(); } finally { busy = false; } }
bookEl.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  // a medallion's box closes on a touch anywhere outside it, or on the same medallion again
  if (sel && mode === 'story' && !e.target.closest('.tip') && !(t && t.dataset.sel && t.dataset.sel !== `${sel.kind}|${sel.id}`)) {
    const same = t && t.dataset.sel; sel = null; renderRight(); if (same || !t) return;
  }
  if (!t) return;
  const d = t.dataset;
  if (d.cmd) return void battleAct(d.cmd);
  if (busy) return;
  if (mode === 'title' && !('forget' in d)) forgetting = null;
  if (mode === 'title' && !('rename' in d)) renaming = null;
  if (mode === 'title' && !('restorego' in d || 'restoredisk' in d)) restoring = null;
  if (mode === 'setup') return void setupClick(d, t);
  if (d.back) return void guard(() => goBack(+d.back));
  if (d.book) guard(() => begin(d.book, 'fresh' in d, 'anew' in d, 'tssf' in d));
  else if (d.adv) {
    useAdventure(d.adv);
    const b = adventure().book, alive = b && BOOKS[b] && hasSave(b) && saved(b).s.hero.ep > 0; // a fallen one goes to the books, to start over
    if (alive) guard(() => begin(b)); else { shelf = true; shelfSeries = null; render(); }
  }
  else if ('restore' in d) openRestore(d.restore);
  else if ('restorego' in d) restoreGo();
  else if ('restoredisk' in d) restoreFromDisk();
  else if ('restorecancel' in d) { renderRight(); } // restoring was cleared above
  else if ('advnew' in d) { newAdventure(); shelf = true; shelfSeries = null; render(); }
  else if ('shelf' in d) { if (d.shelf) useAdventure(d.shelf); shelf = !!d.shelf; shelfSeries = null; render(); }
  else if (d.series) { shelfSeries = d.series; renderRight(); }
  else if (d.backup) backupAdventure(d.backup);
  else if ('rename' in d) { renaming = d.rename || null; renderRight(); const box = $('#advname'); if (box) { box.focus(); box.select(); } }
  else if ('forget' in d) { if ('sure' in d) forgetAdventure(d.forget); forgetting = 'sure' in d ? null : d.forget || null; renderRight(); }
  else if (d.panel === 'map') openMap();
  else if (d.panel) { panel = d.panel; sel = null; adding = false; naming = null; render(); }
  else if (d.adding) { adding = d.adding === 'open'; naming = null; renderRight(); }
  else if (d.add) {
    if (!d.add.startsWith('other:')) return void addItem(d.add);
    naming = d.add.slice(6); renderRight(); $('#itemname').focus();
  }
  else if (d.sel) { const [kind, id] = d.sel.split('|'); sel = { kind, id }; renderRight(); }
  else if (d.adj) { const [field, by] = d.adj.split(':'); game.adjust(field, +by); render(); }
  else if (d.loot != null) { const err = game.takeLoot(/^\d+$/.test(d.loot) ? +d.loot : d.loot); if (err) LW.UI.toast(err); render(); }
  else if ('drink' in d) { if (game.usePotion(d.drink || 'potion')) { sel = null; render(); } }
  else if (d.remove) { game.removeItem(d.remove); sel = null; render(); }
  else if ('intro' in d) { intro = false; guard(() => turn(render)); }
  else if (d.choice != null) guard(() => choose(+d.choice));
  else if ('puzzle' in d) turnTo();
  else if ('byhand' in d) { t.outerHTML = turnBox('By hand: turn to', 'byhand'); $('#puzzleto').focus(); }
  else if (d.pick) { if (game.pickLoss(d.pick)) render(); }
  else if ('stake' in d) { const box = $('#stakeamt'), err = game.setStake(parseInt(box && box.value, 10) || 0); if (err) LW.UI.toast(err); render(); }
  else if ('bet' in d) { const n = (s) => { const b = $(s); return b && b.value.trim() !== '' ? parseInt(b.value, 10) : NaN; }, err = game.bet(n('#betamt'), n('#betpick')); if (err) LW.UI.toast(err); render(); }
  else if (d.sell) { const err = game.sell(d.sell); if (err) LW.UI.toast(err); render(); }
  else if ('fight' in d) guard(startBattle);
  else if ('endbattle' in d) guard(endBattle);
  else if ('new' in d || 'home' in d) { toTitle('new' in d); }
});
/* a puzzle answered: the section the reader worked out, if the book has one */
function turnTo() {
  const box = $('#puzzleto'), to = box && box.value.trim();
  if (!to) return;
  if (!/^\d+$/.test(to) || !book.sections[to]) return void LW.UI.toast(`There is no section ${to}.`);
  guard(async () => { game.choose({ text: game.section.puzzle ? 'Turn to the section you worked out' : 'Turned to by hand' }, to); sel = null; await turn(render); });
}
bookEl.addEventListener('keydown', (e) => { if (e.target.id === 'puzzleto' && e.key === 'Enter') turnTo(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sel && mode === 'story' && !M) { sel = null; renderRight(); } });
// an adventure's name is the owner's own label: Enter keeps it (empty clears it), Escape leaves it as it was
bookEl.addEventListener('keydown', (e) => {
  if (e.target.id !== 'advname' || (e.key !== 'Enter' && e.key !== 'Escape')) return;
  const a = adv.list.find((x) => x.id === e.target.dataset.for);
  if (a && e.key === 'Enter') { const name = e.target.value.trim(); if (name) a.name = name; else delete a.name; keepAdventures(); }
  renaming = null; renderRight();
});
function addItem(id) { const err = game.addItem(id); if (err) LW.UI.toast(err); render(); }
/* a typed name that is a known item's (the Sommerswerd) adds that item, with its kind and powers;
   the open book's own items first, where two books share a name */
const knownItem = (name) => LW.itemByName(name, ITEM_TABLES[book.id] ? Object.keys(ITEM_TABLES[book.id].ITEMS) : []);
pr.addEventListener('keydown', (e) => {
  if (e.target.id !== 'itemname' || (e.key !== 'Enter' && e.key !== 'Escape')) return;
  const name = e.key === 'Enter' && e.target.value.trim().replace(/[|"<>]/g, ''), prefix = e.target.dataset.prefix;
  naming = null;
  if (name) addItem(knownItem(name) || `${prefix}:${name}`); else renderRight();
});
/* the picker names whatever the pointer is over */
pr.addEventListener('pointerover', (e) => {
  const t = e.target.closest('[data-add]'), line = pr.querySelector('p.pickname');
  if (t && line) line.textContent = t.title;
});
/* toShelf: back to this adventure's books (after a death or an ending) rather than the list of adventures */
function toTitle(toShelf) { B = null; mode = 'title'; intro = false; shelf = !!toShelf; shelfSeries = forgetting = restoring = null; render(); }
/* fresh = ignore this book's save. anew = roll a new character even though one is being carried.
   reread = open a saved game on the introduction. */
async function begin(id, fresh, anew, reread) {
  useBook(id);
  intro = false;
  if (!fresh && !anew && game.load()) { if (backfillFlags(game.hero)) game.save(); mode = 'story'; panel = 'kai'; sel = null; if (reread && book.intro && book.intro.length) intro = 'again'; return turn(render); }
  const kept = LW.Character.load(), carry = !anew && LW.Character.carries(kept, id) ? kept : null;
  SU = { step: 'hero', h: LW.HeroSetup(book, carry) }; // the save is cleared only when he sets out
  mode = 'setup'; sel = null;
  await turn(render);
}
window.addEventListener('resize', () => { if (B && B.fit) B.fit(); });

/* the crossed swords drawn on the plate of a foe with no picture */
fetch('assets/icons/crossed-swords.svg').then((r) => r.text()).then((t) => {
  const d = [...t.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
  if (d) setEmblem(d);
}).catch(() => {});

/* optional illustrations dropped into art/ */
const portraitDone = () => { if (mode === 'title') renderLeft(); else if (mode === 'story' && panel === 'kai') renderRight(); };
fetch('art/manifest.json').then((r) => r.json()).then((m) => {
  for (const kind in m.enemies || {}) { const im = new Image(); im.onload = () => setArt(kind, im); im.src = 'art/' + m.enemies[kind]; }
  if (m.portrait) {
    const im = new Image();
    im.onload = () => { portraitURL = portraitFromArt(im, m.portrait.crop, m.portrait.fade).toDataURL(); portraitDone(); };
    im.src = 'art/' + m.portrait.src;
  }
}).catch(() => {});

/* the offline copy (sw.js, docs/reference/offline.md): kept over https, as Tailscale serves it, or on
   any address given ?offline (to try it at home). The corner at the top right says how it stands. */
const offlineBtn = $('#offline');
function offlineSay(m) {
  const t = m.state === 'syncing' ? (m.total ? `Saving for offline ${m.done || 0} / ${m.total}` : 'Saving for offline')
    : m.state === 'update-ready' ? 'Update ready: reload'
    : m.state === 'ready' ? (m.reach === false ? 'Offline: playing the saved copy' : 'Ready offline')
    : m.failed ? 'Offline copy not finished: it carries on next time' : m.reach === false ? 'Offline: not saved yet' : '';
  offlineBtn.hidden = !t; offlineBtn.textContent = t;
  offlineBtn.classList.toggle('act', m.state === 'update-ready');
}
offlineBtn.addEventListener('click', () => { if (offlineBtn.classList.contains('act')) location.reload(); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || /[?&]offline\b/.test(location.search))) {
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (!e.data || e.data.lw !== 'offline') return;
    offlineSay(e.data);
    if (e.data.reach) flushBackups(); // the PC answered: send what waited
  });
  const ask = (what) => navigator.serviceWorker.ready.then((reg) => reg.active && reg.active.postMessage(what));
  navigator.serviceWorker.register('sw.js').then(() => ask('sync')).catch((e) => offlineSay({ failed: String(e) }));
  window.addEventListener('online', () => ask('sync'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') ask('sync'); });
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
} else flushBackups();
window.addEventListener('online', flushBackups);

window.__lw = { get game() { return game; }, render: () => render(), BOOKS, begin, get plates() { return PLATES; } }; // for poking at a section from the console

document.fonts.ready.then(() => {
  const last = adventure() && adventure().book;
  if (last && BOOKS[last] && hasSave(last)) { useBook(last); if (game.load()) { if (backfillFlags(game.hero)) game.save(); mode = 'story'; } }
  render();
});
