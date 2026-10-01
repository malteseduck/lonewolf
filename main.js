/* Lone Wolf: a flat book in the manner of Lone Wolf HD.
   Left page: the story. Right page: a panel (Kai Disciplines, inventory, map, or the fight).
   Plays the built-in demo chapter, or a full book imported by tools/import_projectaon.py. */
import * as Ink from './shared/ink.js';
import { drawCreature, setArt, newWound, drawFigure, drawHero, heroFromArt, drawFrame, gearSVG } from './plates.js';
import { MAPS, LASTLANDS, mapCanvas, loadStamps, stampsLoaded, printedCanvas, replicaModel, replicaCanvas, placeBook, along } from './maps.js';

const LW = window.LW;
const BOOKS = Object.assign({ demo: LW.BOOK_DEMO }, LW.BOOKS || {});
let book = LW.BOOK_DEMO, L = book.locations || {}, game = new LW.Game(book, 'lw-save');
function useBook(id) {
  book = BOOKS[id] || LW.BOOK_DEMO; placeBook(book); L = book.locations || {};
  game = new LW.Game(book, id === 'demo' ? 'lw-save' : 'lw-save-' + id);
  try { localStorage.setItem('lw-book', id); } catch (e) { /* not remembered */ }
}
const asset = (f) => (book.assets || '') + f;
const hasSave = (id) => { try { return !!localStorage.getItem(id === 'demo' ? 'lw-save' : 'lw-save-' + id); } catch (e) { return false; } };

const { esc, el, wait } = LW.UI;
const $ = (s) => document.querySelector(s);
const pl = $('#pl'), pr = $('#pr'), bookEl = $('#book'), rtabs = $('#rtabs'), gear = $('#gear');
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- icons (24x24) ---------- */
const ICON = {
  hood: '<path d="M12 2c5 0 8 4 8 9v11h-4v-8a4 4 0 0 0-8 0v8H4V11c0-5 3-9 8-9z"/>',
  chest: '<path fill-rule="evenodd" d="M3 9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10H3zm2 2.500V17h14v-5.500h-5.500V14h-3v-2.500z"/>',
  compass: '<path fill-rule="evenodd" d="M12 1l2.600 8.400L23 12l-8.400 2.600L12 23l-2.600-8.400L1 12l8.400-2.600zm0 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/><path d="M5 5l4 2.500L7.500 9zM19 5l-2.500 4L15 7.500zM5 19l2.500-4L9 16.500zM19 19l-4-2.500 1.500-1.500z"/>',
  sword: '<path d="M12 1l2 3.500V14h3v2h-3.600v4.500L12 23l-1.400-2.500V16H7v-2h3V4.500z"/>',
  swords: '<path d="M3 2l3 .6 9.200 9.200 1.600-1.600 1.500 1.500-1.700 1.700 3.400 3.400-2.200 2.200-3.400-3.400-1.700 1.700-1.500-1.500 1.600-1.600L3.600 5z"/><path d="M21 2l-3 .6-5.200 5.200 2.400 2.400L20.400 5zM9.800 12.200l-2 2-1.700-1.700-1.500 1.500 1.700 1.700L2.900 19.100l2.200 2.200 3.400-3.400 1.700 1.700 1.500-1.500-1.600-1.600 2-2z"/>',
  axe: '<path d="M10.500 2h2.500v20h-2.500zM13 4c5 .500 7 3 7 6s-2 5.500-7 6zM10.500 6C7 6.500 5 8 5 10s2 3.500 5.500 4z"/>',
  burst: '<path d="M12 1l2.500 7L21 5l-3.500 6.500L23 14l-6.500 1L18 22l-6-4-6 4 1.500-7L1 14l5.500-2.500L3 5l6.500 3z"/>',
  flask: '<path d="M9 2h6v2h-1v5l5 9a3 3 0 0 1-2.600 4.500H7.600A3 3 0 0 1 5 18l5-9V4H9z"/>',
  bowl: '<path d="M2 11h20a10 10 0 0 1-6.500 9.400V22h-7v-1.600A10 10 0 0 1 2 11zM8 3c2 2-1 3 1 6H7C5.500 6 8 5 8 3zm5 0c2 2-1 3 1 6h-2c-1.500-3 1-4 1-6z"/>',
  scroll: '<path fill-rule="evenodd" d="M4 4h13a3 3 0 0 1 3 3v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm3 4v1.800h9V8zm0 4v1.800h9V12zm0 4v1.800h6V16z"/>',
  sack: '<path d="M9 2h6l-1.500 3.500C18 7 20 11 20 15c0 4-3 7-8 7s-8-3-8-7c0-4 2-8 6.500-9.500z"/>',
  helm: '<path d="M12 2c5 0 9 4 9 10v8h-6v-7h-2v7H4v-8c0-6 3-10 8-10z"/>',
  coins: '<ellipse cx="9" cy="8" rx="7" ry="3.500"/><path d="M2 11c0 2 3 3.500 7 3.500s7-1.500 7-3.500v3c0 2-3 3.500-7 3.500S2 16 2 14z"/><path d="M8 19.500c1 1.500 3.500 2.500 7 2.500 4 0 7-1.500 7-3.500v-3c0 1.700-2.300 3.100-5.500 3.400-.8 1-2.900 1.800-5.500 2z"/>',
  flee: '<path d="M3 11h11.500l-3.800-3.800L12.500 5.500 19.500 12.500l-7 7-1.800-1.700L14.500 14H3z"/><path d="M20 4h2v17h-2z"/>',
  eye: '<path fill-rule="evenodd" d="M1 12c3-5.500 7-8 11-8s8 2.500 11 8c-3 5.500-7 8-11 8S4 17.500 1 12zm11-4.500a4.500 4.500 0 1 0 0 9 4.500 4.500 0 0 0 0-9z"/><circle cx="12" cy="12" r="2"/>',
  arrow: '<path d="M21 3l-1 7-2.200-2.200L6 19.600V22H3v-3h2.400L17.200 7.200 15 5z"/>',
  foot: '<ellipse cx="9" cy="14" rx="4.500" ry="7"/><circle cx="6" cy="4" r="1.800"/><circle cx="10" cy="3" r="1.800"/><circle cx="14" cy="4.500" r="1.800"/><ellipse cx="18" cy="16" rx="2.500" ry="4.500"/>',
  leaf: '<path fill-rule="evenodd" d="M12 2c4 5 7 8.500 7 12a7 7 0 1 1-14 0c0-3.500 3-7 7-12zm-1 9v2.500H8.500v2H11V18h2v-2.500h2.500v-2H13V11z"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.500 9-8 11-4.500-2-8-6-8-11V5z"/>',
  paw: '<ellipse cx="12" cy="16" rx="5.500" ry="4.500"/><ellipse cx="5" cy="10" rx="2.200" ry="3"/><ellipse cx="9.500" cy="6" rx="2.200" ry="3"/><ellipse cx="14.500" cy="6" rx="2.200" ry="3"/><ellipse cx="19" cy="10" rx="2.200" ry="3"/>',
  stones: '<path d="M12 2l4 5-4 5-4-5zM5 12l3 4-3 4-3-4zM19 12l3 4-3 4-3-4zM12 15l2.500 3.500L12 22l-2.500-3.500z"/>',
};
const DISC_ICON = { weaponmastery: 'swords', animalControl: 'paw', curing: 'leaf', invisibility: 'hood', huntmastery: 'arrow', pathsmanship: 'foot', psiSurge: 'burst', psiScreen: 'shield', nexus: 'stones', divination: 'eye', camouflage: 'hood', hunting: 'arrow', sixthSense: 'eye', tracking: 'foot', healing: 'leaf', weaponskill: 'sword', mindshield: 'shield', mindblast: 'burst', animalKinship: 'paw', mindOverMatter: 'stones' };
const ITEM_ICON = { axe: 'axe', potion: 'flask', meal: 'bowl', map: 'scroll', helmet: 'helm', chainmail: 'shield' };
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ICON.sword}</svg>`;
const itemIcon = (id) => icon(ITEM_ICON[id] || (LW.itemKind(id) === 'weapon' ? 'sword' : LW.itemKind(id) === 'special' ? 'scroll' : 'sack'));

/* ---------- materials, drawn once ---------- */
const root = document.documentElement.style;
root.setProperty('--parch-l', `url(${Ink.parchment(900, 1300, false, true).toDataURL('image/jpeg', 0.86)})`);
root.setProperty('--parch-r', `linear-gradient(rgba(120,88,50,0.34), rgba(120,88,50,0.34)), url(${Ink.parchment(860, 1300, true, true).toDataURL('image/jpeg', 0.86)})`);
root.setProperty('--frame', `url(${drawFrame().toDataURL()})`);
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
const figureURL = drawFigure().toDataURL();
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

const isDead = () => game.dead || game.section.end === 'death';
const destLoc = (c) => {
  if (!book.locations) return null;
  const here = game.section.loc, tos = c.random ? c.random.table.map((row) => row[1]) : [c.to];
  const locs = [...new Set(tos.map((t) => book.sections[t].loc))];
  return locs.length === 1 && locs[0] !== here ? locs[0] : null;
};
/* the book's own page references mean nothing here */
const shown = (t) => {
  const s = t.replace(/[,;]?\s*(?:(?:now|then|and|so|please)\s+)*turn(?:ing)? to \d+\.?\s*$/i, '').trim();
  return /[a-z]{3,}/i.test(s.replace(/\b(?:now|then|and|so|please|you|may|must|can)\b/gi, '')) ? s.replace(/[,;:]$/, '') + '.' : 'Continue';
};
const roads = () => game.choices().map((c, i) => ({ c, i, loc: destLoc(c) })).filter((r) => r.loc);

/* ---------- the medallion of fate ---------- */
function makeDial(onIdleClick) {
  const d = el('button', 'dial');
  d.type = 'button'; d.setAttribute('aria-label', 'Random Number');
  d.innerHTML = `<div class="dial-ring">${Array.from({ length: 10 }, (_, i) => `<span style="transform:rotate(${i * 36}deg) translateY(-2.950em)">${i}</span>`).join('')}</div><div class="dial-hub"></div><div class="dial-pin"></div>`;
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
      const ticks = setInterval(() => LW.sfx('roll'), 70);
      anim = ring.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${angle}deg)` }], { duration: still ? 1 : 1500, easing: 'cubic-bezier(0.15, 0.6, 0.2, 1)', fill: 'forwards' });
      await anim.finished.catch(() => {});
      clearInterval(ticks); anim = null;
      mark(n); LW.sfx('select');
      await wait(350);
      return n;
    },
  };
}

/* ---------- left page ---------- */
function storyText(sec) {
  const pic = sec.img ? `<img class="vignette ${sec.img.full ? 'full' : ''}" src="${asset(sec.img.file)}" alt="">` : sec.scene ? `<img class="vignette" src="${vignette(sec.scene)}" alt="">` : '';
  const at = sec.img ? Math.min(sec.img.at, sec.text.length) : 1;
  return sec.text.map((p, i) => `${i === at ? pic : ''}<p class="${i ? '' : 'first'}">${esc(p)}</p>`).join('') + (at >= sec.text.length ? pic : '');
}
function leftHTML() {
  if (mode === 'title') {
    const kept = LW.Character.load(), can = (id) => kept && id !== 'demo' && !kept.completed.includes(id);
    const row = (id, label) => `<div class="shelf"><button type="button" class="seal" data-book="${id}">${hasSave(id) ? 'Continue: ' : ''}${esc(label)}</button>${
      hasSave(id) ? `<button type="button" class="inkbtn" data-book="${id}" data-fresh>start over</button>` : ''}${can(id) ? `<button type="button" class="inkbtn" data-book="${id}" data-anew>new character</button>` : ''}</div>`;
    const ids = Object.keys(BOOKS).filter((id) => id !== 'demo').sort((a, b) => (BOOKS[a].number || 0) - (BOOKS[b].number || 0));
    return `<div class="story" style="justify-content:center;align-items:center;text-align:center;gap:0.45em"><div class="scroll" style="flex:0 1 auto;align-items:center;gap:0.45em">
      <div class="eyebrow" style="width:auto">A solo adventure</div>
      <div style="font:400 3.400em/1.1 var(--title)">Lone Wolf</div>
      <img class="vignette" src="${vignette('ruins')}" alt="">
      ${kept ? `<div style="font-size:1.1em;color:var(--ink-dim)">Your Lone Wolf, ${esc(LW.rankOf(kept.hero) || 'Kai Lord')}, waits after ${esc(kept.fromTitle)}. A book you have not finished begins with that character.</div>` : ''}
      ${ids.map((id) => row(id, `${BOOKS[id].number}. ${BOOKS[id].title}`)).join('')}
      ${row('demo', 'Demo chapter, with map travel')}</div></div>`;
  }
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
  if (loot.length && !isDead()) h += `<div class="block"><span class="eyebrow">You may take</span>${loot.map((l) => `<button type="button" class="inkbtn" data-loot="${l.i}" ${l.taken ? 'disabled' : ''}>${esc(l.label)}${l.taken ? ' (taken)' : ''}</button>`).join('')}</div>`;
  if (game.combatPending && !isDead()) h += `<div class="block"><span class="eyebrow">You must fight</span>${sec.combat.enemies.map((f) => `<div class="foeline"><span>${esc(f.name)}</span><i>Combat Skill ${f.cs}, Endurance ${f.ep}</i></div>`).join('')}</div>`;
  h += '</div><div class="dialslot" id="dialslot"></div>';

  if (isDead()) h += `<div class="finis dead"><h2>Your adventure ends here</h2><p>The last of the Kai has fallen.</p><button type="button" class="seal" data-new>Begin again</button></div>`;
  else if (game.combatPending) h += `<div class="compass"><div class="orn"><button type="button" class="med" data-fight aria-label="Begin the fight">${icon('swords')}</button></div><span>Draw your weapon.</span></div>`;
  else if (sec.end) {
    const next = !book.locations && Object.keys(BOOKS).find((k) => BOOKS[k].number === book.number + 1);
    h += `<div class="finis"><h2>${book.locations ? 'Here the demo ends' : 'Your quest is fulfilled'}</h2><p>You came through in ${game.s.trail.length} sections.${book.locations ? '' : ' Your Lone Wolf is kept for the next book.'}</p>${
      next ? `<button type="button" class="seal" data-book="${next}" data-fresh>On to ${esc(BOOKS[next].title)}</button>` : '<button type="button" class="seal" data-new>Back to the title page</button>'}</div>`;
  }
  else {
    const ch = game.choices(), rd = roads();
    if (rd.length) h += `<div class="compass"><div class="orn"><button type="button" class="med" data-panel="map" aria-label="Open the map">${icon('compass')}</button></div><span>${rd.length === 1 ? 'A road lies open.' : `${rd.length} roads lie open.`} Choose on the map.</span></div>`;
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
  const dial = makeDial(async () => {
    if (busy || (sec.rnt === 'auto' && game.s.rolled != null)) return;
    busy = true;
    const n = await dial.spin();
    game.setRolled(n); busy = false;
    renderLeft();
  });
  if (game.s.rolled != null) { dial.show(game.s.rolled); note.textContent = `You drew ${game.s.rolled}.`; }
  else note.textContent = 'Touch the medallion for your Random Number.';
  slot.append(dial.el, note);
}
function renderLeft() { pl.innerHTML = leftHTML(); mountRnt(); }

/* ---------- right page ---------- */
const TREE = [[50, 15], [21, 40], [79, 40], [33, 70], [67, 70], [50, 88], [12, 66], [88, 66], [21, 15], [79, 15]];
function captionHTML() {
  const h = game.hero, id = sel && sel.id, drop = (word = 'Drop') => `<button type="button" class="seal" data-remove="${esc(id)}">${word}</button>`;
  if (sel && sel.kind === 'disc') {
    const d = LW.DISCIPLINES[id], extra = id === 'weaponskill' && h.weaponskill ? ` in ${esc(LW.itemName(h.weaponskill))}` : '';
    const mastered = id === 'weaponmastery' && (h.mastery || []).length ? ` Mastered: ${esc(h.mastery.map(LW.itemName).join(', '))}.` : '';
    return `<div><h3>${esc(d.name)}${extra}</h3><p>${esc(d.blurb)}${mastered}</p></div>`;
  }
  if (sel && sel.kind === 'weapon' && h.weapons.includes(id)) return `<div><h3>${esc(LW.itemName(id))}</h3><p>${h.weaponskill === id ? 'Your mastered weapon: +2 Combat Skill.' : 'A weapon. You may carry two.'}</p></div>${drop()}`;
  if (sel && sel.kind === 'pack' && id === 'potion' && h.backpack.includes(id)) return `<div><h3>Laumspur Potion</h3><p>Restores 4 Endurance.</p></div><button type="button" class="seal" data-drink ${h.ep >= h.epMax ? 'disabled' : ''}>Drink</button>${drop()}`;
  if (sel && sel.kind === 'pack' && h.backpack.includes(id)) return `<div><h3>${esc(LW.itemName(id))}</h3><p>A Backpack Item.</p></div>${drop()}`;
  if (sel && sel.kind === 'meal' && h.meals) return `<div><h3>Meal</h3><p>Eaten when the story calls for it. Go hungry and you lose 3 Endurance.</p></div>${drop('Eat')}`;
  if (sel && sel.kind === 'special' && h.special.includes(id)) return `<div><h3>${esc(LW.itemName(id))}</h3><p>A Special Item${LW.ITEMS[id] && LW.ITEMS[id].ep ? `: +${LW.ITEMS[id].ep} Endurance while you carry it` : ''}.</p></div>${drop()}`;
  return `<div><p>${panel === 'kai' ? 'Touch a medallion to read what the discipline does.' : 'Touch an item to see what it is for.'}</p></div>`;
}
const stepper = (field) => `<span class="step"><button type="button" data-adj="${field}:-1" aria-label="Less">&minus;</button><button type="button" data-adj="${field}:1" aria-label="More">+</button></span>`;
function kaiHTML() {
  const h = game.hero;
  const list = LW.owned(h, book.series || 'kai'), circles = LW.circlesOf(h);
  const meds = list.map((d, i) => `<button type="button" class="med lit ${sel && sel.id === d ? 'sel' : ''}" style="left:${TREE[i][0]}%;top:${TREE[i][1]}%" data-sel="disc|${d}" aria-label="${esc(LW.DISCIPLINES[d].name)}">${icon(DISC_ICON[d])}</button>`).join('');
  const links = list.map((d, i) => `<line x1="50" y1="46" x2="${TREE[i][0]}" y2="${TREE[i][1]}" vector-effect="non-scaling-stroke"/>`).join('');
  const cs = LW.heroCS(h), row = (k, v, wide) => `<div class="${wide ? 'wide' : ''}"><span>${k}</span><b>${v}</b></div>`;
  return `<div class="attrs"><h3>Lone Wolf</h3>${row('Combat Skill', cs.total)}${row('Endurance', `${Math.max(0, h.ep)} of ${h.epMax}${stepper('ep')}`)}${cs.parts.slice(1).map((p) => row(esc(p.label), (p.n > 0 ? '+' : '') + p.n)).join('')}${row('Meals', h.meals)}${row('Rank', esc(LW.rankOf(h) || 'Kai Lord'), true)}${
    book.series === 'magnakai' ? row('Circles held', circles.length ? esc(circles.map((c) => c.name.replace('Circle of ', '').replace('the ', '')).join(', ')) : 'none', true) : ''}</div>
    <div class="tree ${list.length > 6 ? 'many' : ''}"><img src="${figureURL}" alt=""><svg class="links" viewBox="0 0 100 100" preserveAspectRatio="none">${links}</svg>
    <div class="med hub" style="left:50%;top:46%">${icon('hood')}</div>${meds}</div><div class="caption">${captionHTML()}</div>`;
}
function packHTML() {
  const h = game.hero, cells = [], on = (kind, id) => (sel && sel.kind === kind && sel.id === id ? 'sel' : '');
  const med = (kind, id, extra = '') => `<button type="button" class="med ${on(kind, id)} ${extra}" data-sel="${kind}|${esc(id)}" aria-label="${esc(LW.itemName(id))}">${itemIcon(id)}</button>`;
  for (let i = 0; i < h.meals; i++) cells.push(`<button type="button" class="med ${on('meal', 'meal')}" data-sel="meal|meal" aria-label="Meal">${icon('bowl')}</button>`);
  h.backpack.forEach((b) => cells.push(med('pack', b)));
  while (cells.length < LW.MAX_BACKPACK) cells.push('<div class="med empty"></div>');
  const weapon = (w) => (w ? med('weapon', w, h.weaponskill === w ? 'lit' : '') : '<div class="med empty"></div>');
  return `<div class="gear-up"><div class="specials">${h.special.map((s) => med('special', s)).join('')}</div>
      ${weapon(h.weapons[0])}<img src="${figureURL}" alt="">${weapon(h.weapons[1])}</div>
    <h4><span>Backpack</span><span>${h.backpack.length + h.meals} of ${LW.MAX_BACKPACK}</span></h4>
    <div class="pack">${cells.map((c) => `<div class="cell">${c}</div>`).join('')}</div>
    <div class="ledger"><span>Gold Crowns ${stepper('gold')}</span>
      <select id="additem" aria-label="Add an item"><option value="">Add an item by hand</option><optgroup label="Weapons">${LW.WEAPONS.map((w) => `<option value="${w}">${esc(LW.itemName(w))}</option>`).join('')}</optgroup>
      <optgroup label="Backpack"><option value="meal">Meal</option><option value="potion">Laumspur Potion</option><option value="other:pack">Something else</option></optgroup>
      <optgroup label="Special Items"><option value="helmet">Helmet</option><option value="chainmail">Chainmail Waistcoat</option><option value="other:spec">Something else</option></optgroup></select></div>
    <div class="caption">${captionHTML()}</div>`;
}

/* the demo map is built once and moved in and out of the panel */
const mapNode = el('div', 'mapview');
mapNode.innerHTML = `<div class="mapinner"><canvas width="2000" height="1400"></canvas>
  <svg class="lines" viewBox="0 0 1000 700" aria-hidden="true"><g class="ways"></g><polyline class="routeback"></polyline><polyline class="route"></polyline></svg>
  <div class="marks"></div>
  ${heroHTML()}</div>`;
function showTerrain(id) {
  if (mapShown === id) return;
  const world = MAPS[id].replica && worldMap();
  if (world === null) return void (mapShown = null); // painted once the world map has loaded or failed
  const cv = mapNode.querySelector('canvas'), x = cv.getContext('2d'), map = mapCanvas(id, MAPS[id].replica && lastlands(), world);
  x.clearRect(0, 0, cv.width, cv.height);
  if (!map) return void ((mapShown = null), loadStamps().then(() => { if (panel === 'map') renderRight(); })); // painted once the symbols and image arrive
  if (cv.width !== map.width) { cv.width = map.width; cv.height = map.height; }
  x.drawImage(map, 0, 0); mapShown = id;
  mapNode.classList.toggle('deep', !!MAPS[id].replica); // a replica is looked at closer, and pans both ways
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
/* the owner's reference world map, if they have one: the image, null while loading, or false */
let world;
function worldMap() {
  if (world === undefined) {
    world = null;
    // fetched whole before use: the local server sometimes drops a big file part-way
    const get = (tries) => fetch(LASTLANDS.world.file).then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
      .then((b) => { const im = new Image(); im.src = URL.createObjectURL(b); return im.decode().then(() => im); })
      .catch((e) => (tries > 1 && e !== 404 ? get(tries - 1) : false));
    get(3).then((im) => { world = im; if (panel === 'map') { mapShown = null; renderRight(); } });
  }
  return world;
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

/* The whole replica, repainted for whatever part is in view so it stays sharp at any zoom.
   zoomV is the view's left, top and width in the printed map's pixels; its height follows the box. */
let zoomV = null;
function drawZoom() {
  const box = $('.mapview.zoomable'), img = lastlands();
  if (!box || !img) return;
  if (!stampsLoaded()) return void loadStamps().then(() => { if (panel === 'map') renderRight(); });
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(box.clientWidth * dpr), H = Math.round(box.clientHeight * dpr), [fx, fy, fw, fh] = LASTLANDS.frame;
  const m = MAPS[book.id], here = book.locations && m.places[game.section.loc], at = here ? [here[2], here[3]] : along(m.trail, progress()).pop();
  if (!zoomV) { const w0 = fh * (W / H) * 0.5; zoomV = [at[0] - w0 / 2, at[1] - (w0 * H) / W / 2, w0]; }
  const w = Math.max(30, Math.min(fw, (fh * W) / H, zoomV[2])), h = (w * H) / W; // zoomed out, the frame's height fills the box
  const keep = (v, lo, span, size) => (size >= span ? lo + (span - size) / 2 : Math.max(lo, Math.min(lo + span - size, v))); // stay on the map
  zoomV = [keep(zoomV[0], fx, fw, w), keep(zoomV[1], fy, fh, h), w];
  const cv = box.querySelector('canvas');
  cv.width = W; cv.height = H;
  cv.getContext('2d').drawImage(replicaCanvas(replicaModel(img, worldMap() || undefined), [zoomV[0], zoomV[1], w, h], W, H, m.places && Object.values(m.places)), 0, 0);
  const tok = box.querySelector('.pawn');
  tok.style.left = ((at[0] - zoomV[0]) / w) * 100 + '%'; tok.style.top = ((at[1] - zoomV[1]) / h) * 100 + '%'; // repainted, not walked
}
/* zoom by f about a point given as fractions of the box */
function zoomBy(f, ax = 0.5, ay = 0.5) {
  const box = $('.mapview.zoomable');
  if (!box || !zoomV) return;
  const [x0, y0, w] = zoomV, h = (w * box.clientHeight) / box.clientWidth;
  zoomV = [x0 + w * ax * (1 - 1 / f), y0 + h * ay * (1 - 1 / f), w / f];
  drawZoom();
}
const mapInner = mapNode.querySelector('.mapinner'), pawn = mapNode.querySelector('.pawn');
/* slide the map so a point of its 1000x700 grid sits as near the middle as the edges allow */
function panTo(gx, gy) {
  const vw = mapNode.clientWidth, vh = mapNode.clientHeight, W = mapInner.clientWidth || 1, H = mapInner.clientHeight || 1;
  const tx = Math.min(0, Math.max(vw - W, vw / 2 - (gx / 1000) * W)), ty = Math.min(0, Math.max(vh - H, vh / 2 - (gy / 700) * H));
  mapInner.style.transform = `translate(${tx}px, ${ty}px)`;
}
const pct = (p) => `left:${p.x / 10}%;top:${p.y / 7}%`;
function updateMap() {
  showTerrain(MAPS[book.id] ? book.id : 'demo');
  const here = game.section.loc, locs = [], rd = mode === 'story' && !isDead() ? roads() : [];
  game.s.trail.forEach((t) => { const k = book.sections[t.id].loc; if (locs[locs.length - 1] !== k) locs.push(k); });
  const line = locs.map((k) => `${L[k].x},${L[k].y}`).join(' ');
  mapNode.querySelector('.route').setAttribute('points', line); mapNode.querySelector('.routeback').setAttribute('points', line);
  mapNode.querySelector('.ways').innerHTML = [...new Set(rd.map((r) => r.loc))].map((k) => `<line x1="${L[here].x}" y1="${L[here].y}" x2="${L[k].x}" y2="${L[k].y}"/>`).join('');
  const destLocs = new Set(rd.map((r) => r.loc));
  let h = '';
  for (const k in L) {
    if (destLocs.has(k)) continue;
    const named = MAPS[book.id] && MAPS[book.id].replica && LASTLANDS.places.some((p) => p[0] === L[k].name); // the map already prints it
    if (locs.includes(k) && k !== here) h += `<div class="mk" style="${pct(L[k])}"><i></i>${named ? '' : `<span>${esc(L[k].name)}</span>`}</div>`;
    else if (k === 'holmgard' && k !== here) h += `<div class="mk goal" style="${pct(L[k])}"><i></i><span>${esc(L[k].name)}</span></div>`;
  }
  destLocs.forEach((k) => {
    const opts = rd.filter((r) => r.loc === k), r = opts.find((o) => o.c.enabled) || opts[0];
    h += `<button type="button" class="dest" style="${pct(L[k])}" data-choice="${r.i}" ${r.c.enabled ? '' : 'disabled'}><b>${esc(L[k].name)}</b></button>`;
  });
  mapNode.querySelector('.marks').innerHTML = h;
  place(pawn, L[here].x / 10 + '%', L[here].y / 7 + '%');
  // keep the figure and the open roads in view
  const pts = [L[here], ...[...destLocs].map((k) => L[k])], cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  panTo(cx, cy);
  return rd.length;
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

function renderRight() {
  const tabs = [['kai', 'hood', 'Kai Disciplines'], ['pack', 'chest', 'Inventory'], ['map', 'compass', 'Map']];
  rtabs.hidden = mode !== 'story';
  rtabs.innerHTML = tabs.map(([id, ic, label]) => `<button type="button" class="med ${id === 'map' && panel !== 'map' && mode === 'story' && roads().length ? 'call' : ''}" role="tab" aria-selected="${panel === id}" aria-label="${label}" data-panel="${id}">${icon(ic)}</button>`).join('');
  if (mode === 'title') { pr.innerHTML = ''; return; }
  const h = game.hero, cs = B ? B.cs() : LW.heroCS(h).total;
  const place = mode === 'battle' ? 'Combat' : book.locations ? L[game.section.loc].name : book.title;
  const head = `<div class="headrow"><div class="place">${esc(place)}</div>
    <div class="plaque"><span>CS <b>${cs}</b></span><span>EP <b>${Math.max(0, h.ep)}</b>/${h.epMax}</span><span>${icon('coins').replace('<svg', '<svg style="width:1.100em;height:1.100em;fill:#e2d09a;vertical-align:-0.150em"')} <b>${h.gold}</b></span></div></div>`;
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
      updateJourney();
      hint.innerHTML = `Your road from ${esc(m.start)} to ${esc(m.goal)}. Your figure marks how far the story has carried you. <button type="button" class="inkbtn" data-scan>The whole map</button>`;
    }
  } else if (panel === 'map') {
    const hint = el('div'), whole = MAPS[book.id] && MAPS[book.id].replica ? ' <button type="button" class="inkbtn" data-scan>The whole map</button>' : '';
    host.append(mapNode, hint);
    const n = updateMap();
    hint.innerHTML = n ? `<ul class="roads">${roads().map((r) => `<li><button type="button" class="choice" data-choice="${r.i}" ${r.c.enabled ? '' : 'disabled'}><span>${esc(shown(r.c.text))}<em>${esc(r.c.enabled ? L[r.loc].name : r.c.why)}</em></span></button></li>`).join('')}</ul>${whole ? `<p class="maphint">${whole}</p>` : ''}`
      : `<p class="maphint">${isDead() ? 'Your road ends here.' : game.combatPending ? 'There is no leaving until the fight is settled.' : 'No road is open yet. The story continues in the book.'}${whole}</p>`;
  } else host.innerHTML = panel === 'kai' ? kaiHTML() : packHTML();
}
function render() {
  // reaching the end of a real book keeps the character for the next one
  if (mode === 'story' && !book.locations && game.section.end === 'victory' && !game.dead) LW.Character.save(game.hero, book);
  renderLeft(); renderRight();
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

/* ---------- combat, on the page ---------- */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const tween = (ms, fn) => new Promise((res) => { if (still) { fn(1); return res(); } const t0 = performance.now(); (function step(now) { const k = Math.min(1, (now - t0) / ms); fn(k); k < 1 ? requestAnimationFrame(step) : res(); })(t0); });

async function startBattle() {
  const sec = game.section, c = sec.combat, hero = game.hero;
  const node = el('div', 'fight');
  node.innerHTML = `<canvas width="600" height="800"></canvas><div class="foebar"><span data-b="name"></span><div class="bar"><i></i></div><small data-b="stats"></small></div><div class="cmds" data-b="cmds"></div>`;
  const dial = makeDial();
  // mind: 0 at rest, 1 Mindblast, 2 Psi-surge. power is the most this character can do.
  B = { c, i: -1, foe: null, img: null, power: LW.mindPower(hero), mind: LW.mindPower(hero) ? 1 : 0, rounds: 0, log: [], over: null, lock: false, scene: sec.scene, node, dial,
    fx: { lunge: 0, hit: 0, dead: 0, wounds: [] },
    blasting() { return this.foe.immune ? 0 : this.mind; },
    cs() { return LW.heroCS(hero, { mindblast: this.blasting() === 1, psiSurge: this.blasting() === 2, enemy: this.foe, csMod: c.csMod, csNote: c.csNote }).total; },
    ratio() { return this.cs() - this.foe.cs; } };
  nextFoe();
  if (B.foe.mindforce) B.log.push(LW.shielded(hero) ? 'Its will breaks against your Mindshield.' : `Its will presses on yours: Combat Skill less ${B.foe.mindforce}.`);
  if (c.csMod) B.log.push(`${c.csNote}: Combat Skill ${c.csMod > 0 ? 'plus' : 'less'} ${Math.abs(c.csMod)}.`);
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
  if (B.foe.art) { const file = B.foe.art, im = new Image(); im.onload = () => { if (B && B.foe.art === file) B.img = im; }; im.src = asset(file); }
}
function updateBattle() {
  const hero = game.hero, foe = B.foe, q = (k) => B.node.querySelector(`[data-b=${k}]`), r = B.ratio();
  q('name').textContent = foe.name;
  B.node.querySelector('.bar i').style.width = Math.max(0, (foe.ep / foe.max) * 100) + '%';
  q('stats').textContent = `CS ${foe.cs} · EP ${Math.max(0, foe.ep)} · Ratio ${r > 0 ? '+' : ''}${r}`;
  const ev = B.c.evade, evadeOpen = ev && B.rounds >= ev.after, locked = B.lock || B.over;
  const med = (id, ic, label, note, off, extra = '') => `<div class="medcap"><button type="button" class="med ${extra}" data-cmd="${id}" ${locked || off ? 'disabled' : ''} aria-label="${label}">${icon(ic)}</button>${label}<small>${note}</small></div>`;
  const n = hero.backpack.filter((b) => b === 'potion').length;
  const left = med('fight', hero.weapons[0] === 'axe' && hero.weapons.length === 1 ? 'axe' : 'sword', 'Strike', 'spin to attack')
    + (B.power ? med('mind', 'burst', B.power === 2 ? 'Psi-surge' : 'Mindblast', foe.immune ? 'no effect' : ['at rest', B.power === 2 ? 'as Mindblast, +2' : 'focused, +2', '+4, costs 2 a round'][B.blasting()], false, B.blasting() ? 'lit' : '') : '');
  const right = (n ? med('item', 'flask', 'Laumspur', `${n} left`, hero.ep >= hero.epMax) : '')
    + (ev ? med('evade', 'flee', 'Evade', evadeOpen ? 'take one blow' : `after round ${ev.after}`, !evadeOpen) : '');
  const cmds = q('cmds');
  cmds.innerHTML = left + '<span data-dial></span>' + right;
  cmds.querySelector('[data-dial]').replaceWith(B.dial.el);
  renderLeft();
  const sc = $('#scroll'); if (sc) sc.scrollTop = 1e6;
  const pq = pr.querySelector('.plaque');
  if (pq) { pq.children[0].innerHTML = `CS <b>${B.cs()}</b>`; pq.children[1].innerHTML = `EP <b>${Math.max(0, hero.ep)}</b>/${hero.epMax}`; }
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
      if (B.mind === 2 && hero.ep <= 6) { B.mind = 0; B.log.push('You are too weak to Psi-surge.'); }
      else B.log.push(['You let your mind rest.', 'You gather your will to a point: Mindblast.', 'You loose the full Psi-surge. It will cost you 2 Endurance a round.'][B.mind]);
    }
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
      const dealt = Math.min(res.enemy, foe.ep), taken = Math.min(res.hero, hero.ep);
      LW.sfx('swing'); await wait(still ? 0 : 140);
      if (dealt) { B.fx.wounds.push(newWound()); B.fx.hit = 1; LW.sfx('hit'); }
      foe.ep -= dealt; updateBattle();
      await wait(still ? 0 : 480);
      if (foe.ep > 0 || taken) { await lunge(taken); hero.ep -= taken; }
      B.log.push(`${tag} ${res.enemy === Infinity ? 'A killing blow' : dealt ? `${foe.name} loses ${dealt}` : 'Your blow is turned'}; ${res.hero === Infinity ? 'but it finds the gap in your guard' : taken ? `you lose ${taken}` : 'you are untouched'}.`);
      if (B.blasting() === 2 && hero.ep > 0) {
        hero.ep -= 2; B.log.push('The Psi-surge costs you 2 Endurance.');
        if (hero.ep <= 6 && hero.ep > 0) { B.mind = 1; B.log.push('Too weak to hold it, you fall back on Mindblast.'); }
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
  if (d.book) guard(() => begin(d.book, 'fresh' in d, 'anew' in d));
  else if (d.panel) { panel = d.panel; sel = null; LW.sfx('select'); render(); }
  else if (d.sel) { const [kind, id] = d.sel.split('|'); sel = { kind, id }; LW.sfx('select'); renderRight(); }
  else if (d.adj) { const [field, by] = d.adj.split(':'); game.adjust(field, +by); render(); }
  else if (d.loot != null) { const err = game.takeLoot(+d.loot); if (err) LW.UI.toast(err); else LW.sfx('select'); render(); }
  else if ('drink' in d) { if (game.usePotion()) { LW.sfx('heal'); render(); } }
  else if (d.remove) { game.removeItem(d.remove); sel = null; render(); }
  else if (d.choice != null) guard(() => choose(+d.choice));
  else if ('fight' in d) guard(startBattle);
  else if ('endbattle' in d) guard(endBattle);
  else if ('new' in d) toTitle();
  else if ('scan' in d) { mapScan = !mapScan; renderRight(); }
  else if (d.zoom) zoomBy(d.zoom === 'in' ? 1.5 : 1 / 1.5);
});
function addItem(id) { const err = game.addItem(id); if (err) LW.UI.toast(err); else LW.sfx('select'); render(); }
pr.addEventListener('change', (e) => {
  if (e.target.id !== 'additem' || !e.target.value) return;
  const v = e.target.value;
  if (!v.startsWith('other:')) return addItem(v);
  const box = el('input'); box.id = 'itemname'; box.placeholder = 'Name it, then press Enter'; box.dataset.prefix = v.slice(6); box.setAttribute('aria-label', 'Item name');
  e.target.replaceWith(box); box.focus();
});
pr.addEventListener('keydown', (e) => {
  if (e.target.id !== 'itemname' || e.key !== 'Enter') return;
  const name = e.target.value.trim().replace(/[|"<>]/g, '');
  if (name) addItem(`${e.target.dataset.prefix}:${name}`); else render();
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

function toTitle() { B = null; mode = 'title'; render(); }
/* fresh = ignore this book's save. anew = roll a new character even though one is being carried. */
async function begin(id, fresh, anew) {
  useBook(id);
  if (!fresh && !anew && game.load()) { mode = 'story'; panel = roads().length ? 'map' : 'kai'; sel = null; return turn(render); }
  game.clear();
  const kept = LW.Character.load(), carry = !anew && kept && id !== 'demo' && !kept.completed.includes(id) ? kept : null;
  const hero = await LW.UI.chooseCharacter(book, carry);
  game.start(hero); mode = 'story'; panel = 'kai'; sel = null;
  await turn(render);
  if (hero.found) LW.UI.toast(`In the ruins you also find: ${hero.found === 'meals' ? 'two Meals' : hero.found === 'gold' ? '12 Gold Crowns' : LW.itemName(hero.found)}.`);
  else if (hero.simpleKit) LW.UI.toast('You start with a Sword, a Meal and some gold. Add the rest of the book\u2019s starting kit by hand.');
}
const soundBtn = $('#btn-sound');
const soundLabel = () => { soundBtn.textContent = LW.sound.on ? 'Sound on' : 'Sound off'; };
soundBtn.addEventListener('click', () => { LW.setSound(!LW.sound.on); soundLabel(); LW.drone(); });
$('#btn-new').addEventListener('click', () => { if (mode !== 'battle' && !busy) toTitle(); });
window.addEventListener('resize', () => { if (B && B.fit) B.fit(); if (mode === 'story' && panel === 'map') renderRight(); });
soundLabel();

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
}).catch(() => {});

window.__lw = { get game() { return game; }, render: () => render(), BOOKS, begin }; // for poking at a section from the console

document.fonts.ready.then(() => {
  let last = null;
  try { last = localStorage.getItem('lw-book'); } catch (e) { /* no memory */ }
  if (last && BOOKS[last] && hasSave(last)) { useBook(last); if (game.load()) { mode = 'story'; if (roads().length) panel = 'map'; } }
  render();
});
