/* Lone Wolf: a flat book in the manner of Lone Wolf HD.
   Left page: the story. Right page: a panel (Kai Disciplines, inventory, map, or the fight).
   Plays the books imported by tools/import_projectaon.py. */
import * as Ink from './shared/ink.js';
import { drawCreature, setArt, setEmblem, newWound, heroFromArt, portraitFromArt, drawFrame, drawSheet, drawBanner, drawCrest, gearSVG } from './plates.js';
import { printedCanvas } from './maps.js';

import * as ITEMS_01 from './items-01fftd.js';
import * as ITEMS_02 from './items-02fotw.js';
import * as ITEMS_03 from './items-03tcok.js';
import * as ITEMS_04 from './items-04tcod.js';
import * as ITEMS_05 from './items-05sots.js';
import * as ITEMS_06 from './items-06tkot.js';
import * as ITEMS_07 from './items-07cd.js';
import * as ITEMS_08 from './items-08tjoh.js';
import * as ITEMS_09 from './items-09tcof.js';
import * as ITEMS_10 from './items-10tdot.js';
import * as ITEMS_11 from './items-11tpot.js';
import * as ITEMS_12 from './items-12tmod.js';

const LW = window.LW;
const BOOKS = Object.assign({}, LW.BOOKS || {});

/* Each book's hand-made item table (items-<code>.js) is laid over its sections the first time the
   book is opened. Every book's items are known from the start, so a Lone Wolf carried on from one
   book still shows what he took from it. */
const ITEM_TABLES = {
  '01fftd': ITEMS_01, '02fotw': ITEMS_02, '03tcok': ITEMS_03, '04tcod': ITEMS_04, '05sots': ITEMS_05, '06tkot': ITEMS_06,
  '07cd': ITEMS_07, '08tjoh': ITEMS_08, '09tcof': ITEMS_09, '10tdot': ITEMS_10, '11tpot': ITEMS_11, '12tmod': ITEMS_12,
};
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
    // a gate the importer set wrongly is cleared with null; an any-of gate replaces the importer's, which read one alternative as the whole
    for (const [to, n] of Object.entries(need || {})) sec.choices.filter((c) => c.to === to).forEach((c) => { if (n === null) delete c.need; else c.need = n.any ? n : Object.assign({}, c.need, n); });
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
const advName = (id) => (adv.list.find((a) => a.id === id) || {}).name || `Adventure ${ROMAN[id - 1] || id}`;
/* backups: an adventure's whole state (its list entry and every lw-a<n>-* key) as JSON, named
   <name>.<yyyy>.<mm>.<dd>.<hh>.<mm>.json (local time, 24-hour). tools/serve.py keeps them in the project's backups/ folder (a page
   cannot write to disk by itself); served any other way, the file is downloaded instead. */
function backupOf(id) {
  const a = adv.list.find((x) => x.id === id), keys = {};
  store.keys().filter((k) => k.startsWith(`lw-a${id}-`)).sort().forEach((k) => { const v = store.get(k); try { keys[k] = JSON.parse(v); } catch (e) { keys[k] = v; } });
  return { kind: 'lone-wolf adventure backup', version: 1, made: new Date().toISOString(), adventure: { ...a }, keys };
}
function backupName(id) {
  const d = new Date(), two = (n) => String(n).padStart(2, '0');
  const name = advName(id).replace(/[\\/:*?"<>|\x00-\x1f]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '') || `adventure ${id}`;
  return `${name}.${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())}.${two(d.getHours())}.${two(d.getMinutes())}.json`;
}
// a call to the PC, given up after a while: over Tailscale a PC that is off can leave a request hanging
function api(path, opts = {}, ms = 8000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  return fetch(path, { cache: 'no-store', ...opts, signal: ctl.signal }).finally(() => clearTimeout(t));
}
const postBackup = (name, text) => api(`api/backups/${encodeURIComponent(name)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text }, 20000);
/* backups made with the PC out of reach wait here (lw-pending-backups: [{name, text}]) and are sent
   when it is next in reach; a newer one of the same name replaces the one waiting */
const pending = () => { try { return JSON.parse(store.get('lw-pending-backups')) || []; } catch (e) { return []; } };
const keepPending = (list) => (list.length ? store.set('lw-pending-backups', JSON.stringify(list)) : store.del('lw-pending-backups'));
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
  const name = backupName(id), text = JSON.stringify(backupOf(id), null, 2);
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
function parseBackup(text, file) {
  let b = null;
  try { b = JSON.parse(text); } catch (e) { /* told below */ }
  if (!b || b.kind !== 'lone-wolf adventure backup' || b.version !== 1 || !b.adventure || !b.keys || typeof b.keys !== 'object') throw new Error(`${file} is not an adventure backup`);
  const from = `lw-a${b.adventure.id}-`;
  if (Object.keys(b.keys).some((k) => !k.startsWith(from))) throw new Error(`${file} holds keys of another adventure`);
  return { file, b, from };
}
function putBackup(a, { b, from }) {
  store.keys().filter((k) => k.startsWith(`lw-a${a.id}-`)).forEach(store.del);
  Object.entries(b.keys).forEach(([k, v]) => store.set(`lw-a${a.id}-` + k.slice(from.length), typeof v === 'string' ? v : JSON.stringify(v)));
  a.book = b.adventure.book && BOOKS[b.adventure.book] ? b.adventure.book : null;
  if (b.adventure.name) a.name = String(b.adventure.name).slice(0, 40);
  keepAdventures();
}
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
/* Lone Wolf's figure behind the inventory's slots: the owner's picture of him cut out, toned sepia
   (art/manifest.json "hero": {src, crop}, or a file already cut out). Without one, none shows. */
let dollURL = null;
const vignettes = {};
const vignette = (scene) => vignettes[scene] || (vignettes[scene] = Ink.inkScene(scene, 1000, 340).toDataURL());

/* ---------- state ---------- */
let mode = 'title';          // title | story | battle
let panel = 'kai';           // kai | pack | map
let sel = null;              // what the caption under a panel describes
let busy = false, gearTurn = 0, B = null;
let intro = false;           // the book's introduction is showing: 'new' before section 1 of a new game, 'again' when re-read from the shelf
const REWIND = 3;            // how many sections back a rewind reaches

const isDead = () => game.dead || game.section.end === 'death' || game.section.end === 'failed'; // failed: the book's own ending short of death
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
      angle = Math.floor(from / 360) * 360 - 1080 - n * 36;
      hub.textContent = ''; ring.querySelectorAll('.hit').forEach((s) => s.classList.remove('hit'));
      hub.classList.add('shuffle');
      const ticks = setInterval(() => { hub.textContent = LW.rand10(); }, 70); // the face shuffles while the bezel turns
      anim = ring.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${angle}deg)` }], { duration: still ? 1 : 1500, easing: 'cubic-bezier(0.15, 0.6, 0.2, 1)', fill: 'forwards' });
      await anim.finished.catch(() => {});
      clearInterval(ticks); anim = null; hub.classList.remove('shuffle');
      mark(n);
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
    <div class="frontis">${portraitURL ? `<img src="${portraitURL}" alt="">` : ''}</div>
    <p class="motto">The monastery burns. The Kai are gone.<br>One remains.</p>
    ${band('The Kai', 1, 5)}${band('The Magnakai', 6, 12)}
  </div>`;
}
/* the right page of the title spread: every adventure, or the books of the one chosen (shelf) */
let shelf = false, forgetting = null, renaming = null, restoring = null;
const roman = (n) => `<span class="roman">${ROMAN[n - 1] || n}</span>`;
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
    h += `<div class="finis dead"><h2>Your adventure ends here</h2><p>${!game.dead && sec.end === 'failed' ? 'Your mission has failed.' : 'The last of the Kai has fallen.'}${bk.length ? ' Yet you may turn back a page or two.' : ''}</p>${
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
    const local = game.choices().map((c, i) => ({ c, i }));
    if (local.length) h += `<ul class="choices">${local.map(({ c, i }) => `<li><button type="button" class="choice" data-choice="${i}" ${c.enabled ? '' : 'disabled'}><span>${esc(shown(c.text))}${
      c.enabled ? (c.need && (c.need.disc || c.need.circle) ? `<em>${esc(LW.condName({ disc: c.need.disc, every: c.need.every, circle: c.need.circle }))}</em>` : c.need && c.need.any ? `<em>${esc(c.need.any.map(LW.condName).join(', or '))}</em>` : c.random ? '<em>Random Number</em>' : '') : `<em>${esc(c.why)}</em>`}</span></button></li>`).join('')}</ul>`;
    // a puzzle's answer is a section number, which the book leaves the reader to turn to
    if (sec.puzzle) h += `<div class="puzzle"><label>Turn to section <input id="puzzleto" inputmode="numeric" autocomplete="off" aria-label="Section number"></label><button type="button" class="inkbtn" data-puzzle>turn</button></div>`;
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
  const plus = (game.s.shot || []).map((p) => `, ${p.n < 0 ? '−' : '+'}${Math.abs(p.n)} ${p.label}`).join(''), drawn = game.s.drawn != null ? game.s.drawn : game.s.rolled;
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
    <div class="ledgers"><section>${ruled('Attributes')}${row('Combat Skill', `${stepper('cs')} ${cs.total}`)}${row('Endurance', `${stepper('ep')} ${Math.max(0, h.ep)}/${h.epMax}`)}${row('Meals', h.meals)}${row('Rank', esc(LW.rankOf(h) || 'Kai Lord'), true)}${
      series === 'magnakai' ? row('Lore-circles', circles.length ? esc(circles.map((c) => c.name.replace('Circle of ', '').replace('the ', '')).join(', ')) : 'none', true) : ''}</section>
      <section>${ruled('Combat Skill')}${cs.parts.map((p, i) => row(esc(p.label), i ? signed(p.n) : p.n)).join('')}
      ${ruled('Endurance')}${row('Base', h.epMax - epParts.reduce((t, p) => t + p.n, 0))}${epParts.map((p) => row(p.label, signed(p.n))).join('')}</section></div>
    <div class="discs">${rows.map((r) => `<div class="drow">${r.map(disc).join(`<span class="linkwrap">${bar}</span>`)}</div>`).join('')}</div>
    <div class="caption">${captionHTML()}</div>`;
}
/* Inventory, after the HD equipment sheet: his figure faint behind a paper doll of slots (helmet
   between two shoulder slots, weapons either side of the chest, two at the belt; Special Items fill
   the shoulder and belt slots), a row of five more for further Special Items under a flourish,
   then the Backpack as a grid of tiles beside its own medallion */
const flourish = '<div class="flourish" aria-hidden="true"><svg viewBox="0 0 240 16" preserveAspectRatio="xMidYMid meet">'
  + '<path d="M110 8H44C34 8 30 13 24 12.5 18 12 17.5 5.5 22.5 4.5 26.5 3.8 28 8 25 9 23 9.6 21.8 8 22.8 7M130 8h66c10 0 14 5 20 4.5 6-.5 6.5-7 1.5-8-4-.7-5.5 3.5-2.5 4.5 2 .6 3.2-1 2.2-2"/>'
  + '<path d="M78 8c3-4.5 9-5.5 13-3.5-4 .8-7 2.2-9 3.5M162 8c-3-4.5-9-5.5-13-3.5 4 .8 7 2.2 9 3.5M58 8c2 2.6 6 3.2 9 2-3-.4-5.5-1-7-2M182 8c-2 2.6-6 3.2-9 2 3-.4 5.5-1 7-2"/>'
  + '<path class="gem" d="M120 3l5 5-5 5-5-5z"/></svg></div>';
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
  const slot = (kind, id, extra = '') => `<button type="button" class="disc item ${on(kind, id)} ${extra}" data-sel="${kind}|${esc(id)}" aria-label="${esc(LW.itemName(id))}">${itemGlyph(id)}</button>`;
  const empty = (label) => `<span class="disc empty"${label ? ` title="${label}"` : ''}></span>`;
  const worn = (id) => (h.special.includes(id) ? slot('special', id) : empty(esc(LW.itemName(id))));
  const skilled = (w) => h.weaponskill === w || (h.series === 'magnakai' && LW.has(h, 'weaponmastery') && (h.mastery || []).includes(w));
  const weapon = (w) => (w ? slot('weapon', w, skilled(w) ? 'lit' : '') : empty('Weapon'));
  const others = h.special.filter((s) => s !== 'helmet' && s !== 'chainmail').map((s) => slot('special', s));
  const around = others.slice(0, 4), rest = others.slice(4);
  while (around.length < 4) around.push(empty('Special Item'));
  while (rest.length < 5 || rest.length % 5) rest.push(empty('Special Item'));
  for (let i = 0; i < h.meals; i++) cells.push(`<button type="button" class="disc item ${on('meal', 'meal')}" data-sel="meal|meal" aria-label="Meal">${itemGlyph('meal')}</button>`);
  h.backpack.forEach((b) => cells.push(slot('pack', b)));
  while (cells.length < LW.MAX_BACKPACK) cells.push(empty());
  const kit = adding ? pickerHTML() : `<div class="kit">${dollURL ? `<img src="${dollURL}" alt="">` : ''}
      <div class="doll"><span class="sh l">${around[0]}</span><span class="head">${worn('helmet')}</span><span class="sh r">${around[1]}</span>
        <span class="wl">${weapon(h.weapons[0])}</span><span class="body">${worn('chainmail')}</span><span class="wr">${weapon(h.weapons[1])}</span>
        <span class="belt">${around[2]}${around[3]}</span></div>
      ${flourish}<div class="specials">${rest.join('')}</div></div>`;
  return `${kit}
    ${ruled(h.noPack ? 'Backpack <small>lost: find another to carry anything</small>' : `Backpack <small>${h.backpack.length + h.meals} of ${LW.MAX_BACKPACK}</small>`)}
    <div class="bag"><span class="disc lit">${glyph('knapsack')}</span><div class="pack">${cells.map((c) => `<div class="cell">${c}</div>`).join('')}${packLattice(4, Math.ceil(cells.length / 4))}</div></div>
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

/* the current book's printed map, or null until it has loaded (the panel redraws then) */
const printed = {};
function printedMap() {
  const url = asset(book.map);
  if (!printed[url]) { const im = (printed[url] = new Image()); im.onload = () => { if (panel === 'map') renderRight(); }; im.src = url; }
  return printed[url].complete && printed[url].naturalWidth ? printed[url] : null;
}
const scans = {};
const scanOf = (img) => (scans[img.src] = scans[img.src] || printedCanvas(img, [0, 0, img.naturalWidth, img.naturalHeight], img.naturalWidth * 2, img.naturalHeight * 2));

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
  rtabs.innerHTML = tabs.map(([id, label]) => `<button type="button" class="med" role="tab" aria-selected="${panel === id}" aria-label="${label}" data-panel="${id}">${TAB_ART[id]}</button>`).join('')
    + `<button type="button" class="med home" data-home aria-label="Back to the title page" title="Back to the title page">${glyph('return-arrow')}</button>`; // the HD return medallion: start over, or pick another book
  if (mode === 'title') { pr.innerHTML = titleRightHTML(); return; }
  if (!game.s) return; // a new game is being set up (a map image that arrives meanwhile asks for a redraw)
  const h = game.hero, cs = B ? B.cs() : LW.heroCS(h).total;
  const place = mode === 'battle' ? 'Combat' : book.title;
  const head = `<div class="headrow"><div class="place">${esc(place)}</div>
    <div class="gauges">${gauges(cs, h)}</div></div>`;
  pr.innerHTML = head + '<div class="panel" id="panel"></div>';
  const host = $('#panel');
  if (mode === 'battle') host.append(B.node);
  else if (panel === 'map') {
    const img = book.map && printedMap();
    host.innerHTML = `<div class="mapview scrolly" role="img" aria-label="The map printed in the book"></div><p class="maphint">${book.map ? 'The map printed in the book. Drag to look around.' : 'This book has no map.'}</p>`;
    if (img) host.firstChild.append(scanOf(img));
  } else host.innerHTML = panel === 'kai' ? kaiHTML() : packHTML();
}
function render() {
  // reaching the end of a real book keeps the character for the next one
  if (mode === 'story' && game.section.end === 'victory' && !game.dead) LW.Character.save(game.hero, book);
  renderLeft(); renderRight();
}

/* the left page lifts away and the gear turns a notch */
async function turn(update) {
  const old = pl.cloneNode(true);
  old.removeAttribute('id'); old.classList.add('turning');
  old.style.width = pl.offsetWidth + 'px'; old.style.height = pl.offsetHeight + 'px';
  pl.parentNode.appendChild(old);
  update();
  gearTurn -= 22.5; gear.style.transform = `rotate(${gearTurn}deg)`;
  if (!still) await old.animate([{ transform: 'rotateY(0deg)', opacity: 1, filter: 'brightness(1)' }, { transform: 'rotateY(-82deg)', opacity: 1, filter: 'brightness(0.55)', offset: 0.8 }, { transform: 'rotateY(-90deg)', opacity: 0, filter: 'brightness(0.4)' }], { duration: 750, easing: 'ease-in' }).finished.catch(() => {});
  old.remove();
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
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const tween = (ms, fn) => new Promise((res) => { if (still) { fn(1); return res(); } const t0 = performance.now(); (function step(now) { const k = Math.min(1, (now - t0) / ms); fn(k); k < 1 ? requestAnimationFrame(step) : res(); })(t0); });

async function startBattle() {
  const sec = game.section, c = sec.combat, hero = game.hero;
  // the fight's own adjustment, unless he carries what the text says spares him it (a torch), or
  // it is the text's "unarmed" penalty and he has no weapon anyway (heroCS already counts that)
  const spared = (c.unless || []).length && c.unless.every((i) => LW.hasItem(hero, i));
  // Huntmastery: what a surprise attack or ambush costs (combat.ambush) is not lost
  const ambush = c.ambush && c.csMod < 0 && hero.series === 'magnakai' && LW.has(hero, 'huntmastery');
  // the text's own conditions: "if you have Animal Control, add 2" (csIf), "unless you have Mindshield, deduct 2" (csUnless)
  const missed = c.csIf && !LW.meets(hero, c.csIf), excused = c.csUnless && LW.meets(hero, c.csUnless);
  const csMod = spared || ambush || missed || excused || (c.unarmed && !LW.armedWith(hero)) ? 0 : c.csMod;
  const note = c.csIf ? LW.condName(c.csIf) : c.csNote; // a discipline's bonus is named after it
  const node = el('div', 'fight');
  node.innerHTML = `<canvas width="600" height="800"></canvas><div class="foebar"><span data-b="name"></span><div class="bar"><i></i></div><small data-b="stats"></small></div><div class="cmds" data-b="cmds"></div>`;
  const dial = makeDial();
  // mind: 0 at rest, 1 Mindblast, 2 Psi-surge. power is the most this character can do.
  B = { c, i: -1, foe: null, img: null, power: LW.mindPower(hero), mind: LW.mindPower(hero) ? 1 : 0, rounds: 0, log: [], over: null, lock: false, scene: sec.scene, node, dial,
    fx: { lunge: 0, hit: 0, dead: 0, wounds: [] },
    // immune: true, to every attack of the mind; 'mindblast', to Mindblast only (Psi-surge still tells)
    blasting() { return this.foe.immune === true || (this.foe.immune && this.mind === 1) ? 0 : this.mind; },
    cs() { return LW.heroCS(hero, { mindblast: this.blasting() === 1, psiSurge: this.blasting() === 2, enemy: this.foe, csMod, csNote: note, with: c.with }).total; },
    weapon: LW.armedWith(hero, { with: c.with }),
    ratio() {
      const rawRatio = this.cs() - this.foe.cs;
      // Hard cap the maximum advantage to prevent complete trivialization
      return Math.min(10, rawRatio);
    } };
  nextFoe();
  if (B.foe.mindforce) B.log.push(LW.shielded(hero) ? 'Its will breaks against your Mindshield.' : `Its will presses on yours: Combat Skill less ${B.foe.mindforce}.`);
  if (csMod) B.log.push(`${note}: Combat Skill ${csMod > 0 ? 'plus' : 'less'} ${Math.abs(csMod)}.`);
  else if (spared) B.log.push(`Your ${c.unless.map(LW.itemName).join(' and ')} spare you the penalty.`);
  else if (ambush) B.log.push('Huntmastery: the ambush does not catch you off guard.');
  else if (excused && c.csMod) B.log.push(`${LW.condName(c.csUnless)}: you are spared the penalty.`);
  if (c.with === 'none') B.log.push('You fight bare-handed.');
  else if (c.with) B.log.push(B.weapon ? `Only your ${LW.itemName(c.with)} can harm it.` : `Only the ${LW.itemName(c.with)} can harm it, and you do not have it.`);
  if (B.weapon && LW.ITEMS[B.weapon] && LW.ITEMS[B.weapon].cs) B.log.push(`You fight with the ${LW.itemName(B.weapon)}.`);
  mode = 'battle';
  await turn(render);
  updateBattle();
  const cv = node.querySelector('canvas');
  B.fit = () => {
    const r = node.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(200, Math.round(r.width * dpr)); cv.height = Math.max(200, Math.round(r.height * dpr));
    // the picture keeps above the controls, wherever the layout puts them
    const tops = [...B.node.querySelectorAll('[data-cmd], .dial')].map((n) => n.getBoundingClientRect().top).filter((y) => y > r.top);
    B.floor = tops.length && r.height ? Math.min(0.83, (Math.min(...tops) - r.top) / r.height) : 0.83;
  };
  B.fit();
  (function loop() {
    if (!B || B.node !== node) return;
    B.fx.hit *= 0.86; B.fx.wounds.forEach((w) => { w.k += 0.14; });
    drawCreature(cv, B.foe.sprite, B.scene, 0.4, B.fx, B.img, B.floor); // a still plate: only wounds and the lunge move
    requestAnimationFrame(loop);
  })();
}
/* the foe no mind attack of his can touch: immune to all, or to Mindblast when that is all he has */
const deaf = (foe) => foe.immune === true || (!!foe.immune && B.power === 1);
function nextFoe() {
  B.i++; B.foe = Object.assign({}, B.c.enemies[B.i]); B.foe.max = B.foe.ep;
  B.fx.dead = 0; B.fx.wounds = []; B.img = null;
  // the section's own illustration, else one from the plate library (an entry with a book is for that book only), else the drawn emblem;
  // a library entry marked over is the owner's choice and wins even over the section's own
  const foe = B.foe, fits = (p) => (!p.book || p.book === book.id) && p.re.test(foe.name);
  const lib = PLATES.find((p) => p.over && fits(p)) || (!foe.art && PLATES.find(fits)), src = lib && (lib.over || !foe.art) ? lib.src : foe.art ? asset(foe.art) : null;
  if (src) { const im = new Image(); im.crop = lib && lib.crop; im.levels = lib && lib.levels; im.onload = () => { if (B && B.foe === foe) B.img = im; }; im.src = src; }
}
/* assets/plates/plates.json: pictures for enemies the book does not picture */
let PLATES = [];
fetch('assets/plates/plates.json').then((r) => r.json()).then((j) => { PLATES = j.plates.map((p) => Object.assign({ re: new RegExp(p.match, 'i') }, p)); }).catch(() => {});
function updateBattle() {
  const hero = game.hero, foe = B.foe, q = (k) => B.node.querySelector(`[data-b=${k}]`), r = B.ratio();
  q('name').textContent = foe.name;
  B.node.querySelector('.bar i').style.width = Math.max(0, (foe.ep / foe.max) * 100) + '%';
  q('stats').textContent = `CS ${foe.cs} · EP ${Math.max(0, foe.ep)} · Ratio ${r > 0 ? '+' : ''}${r}`;
  const ev = B.c.evade, evadeOpen = ev && B.rounds >= ev.after && !(ev.within && B.rounds >= ev.within), locked = B.lock || B.over; // within: only in the first rounds
  const med = (id, ic, label, note, off, extra = '') => `<div class="medcap"><button type="button" class="med ${extra}" data-cmd="${id}" ${locked || off ? 'disabled' : ''} aria-label="${label}">${ic}</button>${label}<small>${note}</small></div>`;
  const n = hero.backpack.filter((b) => b === 'potion').length, psi = LW.psi(hero);
  const left = med('fight', B.weapon ? itemGlyph(B.weapon) : glyph('crossed-swords'), 'Strike', 'spin to attack')
    + (B.power ? med('mind', glyph(B.power === 2 ? 'psychic-waves' : 'brainstorm'), B.power === 2 ? 'Psi-surge' : 'Mindblast', deaf(foe) ? 'no effect' : foe.immune && B.mind === 1 ? 'as Mindblast: no effect' : ['at rest', B.power === 2 ? `as Mindblast, +${psi.blast}` : 'focused, +2', `+${psi.surge}, costs ${psi.cost} a round`][B.mind], false, B.blasting() ? 'lit' : '') : '');
  const right = (n ? med('item', itemGlyph('potion'), 'Laumspur', `${n} left`, hero.ep >= hero.epMax) : '')
    + (LW.canCure(hero, book.id) ? med('cure', glyph('healing'), 'Curing', hero.ep <= 6 ? '20 back, once a book' : 'at 6 or less', hero.ep > 6) : '')
    + (ev ? med('evade', glyph('run'), 'Evade', evadeOpen ? 'take one blow' : ev.within && B.rounds >= ev.within ? 'too late' : `after round ${ev.after}`, !evadeOpen) : '');
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
  if (n) { bookEl.classList.remove('hurt'); void bookEl.offsetWidth; bookEl.classList.add('hurt'); setTimeout(() => bookEl.classList.remove('hurt'), 420); }
  await tween(320, (k) => { B.fx.lunge = 1 - k; });
}
async function battleAct(id) {
  if (!B || B.lock || B.over) return;
  const hero = game.hero, foe = B.foe;
  B.lock = true; updateBattle();
  if (id === 'mind') {
    if (deaf(foe)) B.log.push(`${foe.name} is immune to ${foe.immune === true ? 'attacks of the mind' : 'Mindblast'}.`);
    else {
      B.mind = (B.mind + 1) % (B.power + 1);
      if (B.mind === 2 && hero.ep <= LW.psi(hero).floor) { B.mind = 0; B.log.push('You are too weak to Psi-surge.'); }
      else B.log.push(['You let your mind rest.', foe.immune ? `You gather your will to a point: Mindblast, to which ${foe.name} is immune.` : 'You gather your will to a point: Mindblast.', `You loose the full Psi-surge. It will cost you ${LW.psi(hero).cost} Endurance a round.`][B.mind]);
    }
  } else if (id === 'cure') {
    const back = Math.min(20, hero.epMax - hero.ep);
    hero.ep += back; hero.cured = book.id;
    B.log.push(`Curing: you draw on your mastery and ${back} Endurance returns.`);
  } else if (id === 'item') {
    hero.backpack.splice(hero.backpack.indexOf('potion'), 1); hero.ep = Math.min(hero.epMax, hero.ep + 4);
    B.log.push('The Laumspur burns going down. 4 Endurance restored.');
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
      await wait(still ? 0 : 140);
      if (dealt) { B.fx.wounds.push(newWound()); B.fx.hit = 1; }
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
  if (mode === 'title' && !('rename' in d)) renaming = null;
  if (mode === 'title' && !('restorego' in d || 'restoredisk' in d)) restoring = null;
  if (d.back) return void guard(() => goBack(+d.back));
  if (d.book) guard(() => begin(d.book, 'fresh' in d, 'anew' in d, 'tssf' in d));
  else if (d.adv) {
    useAdventure(d.adv);
    const b = adventure().book, alive = b && BOOKS[b] && hasSave(b) && saved(b).s.hero.ep > 0; // a fallen one goes to the books, to start over
    if (alive) guard(() => begin(b)); else { shelf = true; render(); }
  }
  else if ('restore' in d) openRestore(d.restore);
  else if ('restorego' in d) restoreGo();
  else if ('restoredisk' in d) restoreFromDisk();
  else if ('restorecancel' in d) { renderRight(); } // restoring was cleared above
  else if ('advnew' in d) { newAdventure(); shelf = true; render(); }
  else if ('shelf' in d) { if (d.shelf) useAdventure(d.shelf); shelf = !!d.shelf; render(); }
  else if (d.backup) backupAdventure(d.backup);
  else if ('rename' in d) { renaming = d.rename || null; renderRight(); const box = $('#advname'); if (box) { box.focus(); box.select(); } }
  else if ('forget' in d) { if ('sure' in d) forgetAdventure(d.forget); forgetting = 'sure' in d ? null : d.forget || null; renderRight(); }
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
  else if ('fight' in d) guard(startBattle);
  else if ('endbattle' in d) guard(endBattle);
  else if ('new' in d || 'home' in d) { toTitle('new' in d); }
});
/* a puzzle answered: the section the reader worked out, if the book has one */
function turnTo() {
  const box = $('#puzzleto'), to = box && box.value.trim();
  if (!to) return;
  if (!/^\d+$/.test(to) || !book.sections[to]) return void LW.UI.toast(`There is no section ${to}.`);
  guard(async () => { game.choose({ text: 'Turn to the section you worked out' }, to); sel = null; await turn(render); });
}
bookEl.addEventListener('keydown', (e) => { if (e.target.id === 'puzzleto' && e.key === 'Enter') turnTo(); });
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
function knownItem(name) {
  const n = name.toLowerCase(), own = ITEM_TABLES[book.id] ? Object.keys(ITEM_TABLES[book.id].ITEMS) : [];
  return [...own, ...Object.keys(LW.ITEMS)].find((id) => (LW.ITEMS[id].name || '').toLowerCase() === n) || null;
}
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
/* drag the printed map around */
let drag = null;
pr.addEventListener('pointerdown', (e) => {
  const v = e.target.closest('.mapview.scrolly');
  if (v && !e.target.closest('button')) { drag = { v, x: e.clientX, y: e.clientY, l: v.scrollLeft, t: v.scrollTop }; e.preventDefault(); }
});
window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.v.scrollLeft = drag.l - (e.clientX - drag.x); drag.v.scrollTop = drag.t - (e.clientY - drag.y);
});
window.addEventListener('pointerup', () => { drag = null; });

/* toShelf: back to this adventure's books (after a death or an ending) rather than the list of adventures */
function toTitle(toShelf) { B = null; mode = 'title'; intro = false; shelf = !!toShelf; forgetting = restoring = null; render(); }
/* fresh = ignore this book's save. anew = roll a new character even though one is being carried.
   reread = open a saved game on the introduction. */
async function begin(id, fresh, anew, reread) {
  useBook(id);
  intro = false;
  if (!fresh && !anew && game.load()) { mode = 'story'; panel = 'kai'; sel = null; if (reread && book.intro && book.intro.length) intro = 'again'; return turn(render); }
  game.clear();
  const kept = LW.Character.load(), carry = !anew && kept && !kept.completed.includes(id) ? kept : null;
  const hero = await LW.UI.chooseCharacter(book, carry);
  game.start(hero); mode = 'story'; panel = 'kai'; sel = null; intro = book.intro && book.intro.length ? 'new' : false;
  await turn(render);
  if (hero.found) LW.UI.toast(`In the ruins you also find: ${hero.found === 'meals' ? 'two Meals' : hero.found === 'gold' ? '12 Gold Crowns' : LW.itemName(hero.found)}.`);
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
  if (m.hero) {
    const im = new Image();
    im.onload = () => {
      dollURL = m.hero.crop ? heroFromArt(im, m.hero.crop, m.hero.outline, true).toDataURL() : im.src;
      if (mode === 'story' && panel === 'pack') renderRight();
    };
    im.src = 'art/' + (m.hero.src || m.hero);
  }
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
  if (last && BOOKS[last] && hasSave(last)) { useBook(last); if (game.load()) mode = 'story'; }
  render();
});
