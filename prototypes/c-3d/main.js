/* Lone Wolf, prototype C: a lit 3D book on a table, and first-person 3D combat.
   Rules and book data come from ../shared; everything visual here is procedural. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as Ink from '../../shared/ink.js';

const LW = window.LW;
const book = LW.BOOK_DEMO;
const game = new LW.Game(book, 'lw-proto-3d');
const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ======================= Sound: noise and low sines, no blips ======================= */
let actx = null, drone = null;
function ac() { return (actx = actx || new (window.AudioContext || window.webkitAudioContext)()); }
function noise(dur, type, f0, f1, vol, q = 0.8) {
  const a = ac(), n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
  src.buffer = buf; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination); src.start();
}
function sine(f0, f1, dur, vol, delay = 0) {
  const a = ac(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime + delay;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
const SOUNDS = {
  select: () => noise(0.05, 'bandpass', 2600, 1800, 0.05),
  roll: () => noise(0.03, 'bandpass', 1800, 1400, 0.03),
  page: () => { noise(0.35, 'highpass', 1200, 5200, 0.07); noise(0.12, 'bandpass', 500, 900, 0.04); },
  swing: () => noise(0.24, 'bandpass', 350, 2600, 0.2, 1.4),
  hit: () => { sine(140, 50, 0.22, 0.5); noise(0.14, 'lowpass', 2400, 300, 0.3); },
  hurt: () => { sine(80, 34, 0.5, 0.7); noise(0.25, 'lowpass', 900, 120, 0.35); },
  heal: () => { sine(330, 495, 0.6, 0.08); sine(495, 660, 0.7, 0.05, 0.12); },
  battle: () => { sine(55, 38, 1.6, 0.6); noise(1.2, 'lowpass', 200, 1200, 0.12); },
  win: () => [110, 165, 220, 277].forEach((f, i) => sine(f, f, 2.2, 0.12, i * 0.12)),
  lose: () => { sine(110, 41, 2.6, 0.4); sine(116, 43, 2.6, 0.25); },
};
LW.sfx = (name) => { if (LW.sound.on && SOUNDS[name]) try { SOUNDS[name](); } catch (e) { /* no audio */ } };
function setDrone() {
  try {
    if (!LW.sound.on) { if (drone) drone.gain.gain.setTargetAtTime(0.0001, ac().currentTime, 0.3); return; }
    if (!drone) {
      const a = ac(), g = a.createGain(), f = a.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 220; g.gain.value = 0.0001;
      [55, 55.6, 82.2].forEach((hz) => { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(); });
      f.connect(g).connect(a.destination); drone = { gain: g };
    }
    drone.gain.gain.setTargetAtTime(0.035, ac().currentTime, 1.5);
  } catch (e) { /* no audio */ }
}
window.addEventListener('pointerdown', setDrone, { once: true });

/* ======================= Renderer and post ======================= */
const renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const tex = (cv, repeat) => {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
};
const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, o));
const metal = (color, rough = 0.35) => std({ color, metalness: 1, roughness: rough, envMap, envMapIntensity: 0.55 });
const glowTex = tex(Ink.glow(128));

const FilmShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, hurt: { value: 0 }, dark: { value: 0.22 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform float hurt; uniform float dark; varying vec2 vUv;
    float rnd(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float v = smoothstep(0.92, 0.28, length((vUv - 0.5) * vec2(1.0, 1.12)));
      c.rgb *= mix(dark, 1.0, v);
      c.rgb += vec3(0.55, 0.02, 0.0) * hurt * (1.0 - v * 0.75);
      c.rgb += (rnd(vUv * vec2(1613.0, 907.0) + fract(time) * 61.0) - 0.5) * 0.028;
      gl_FragColor = c;
    }`,
};

/* ======================= Tweens ======================= */
const tweens = new Set();
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
function tween(ms, fn, ease = easeInOut) {
  if (still) ms = Math.min(ms, 1);
  return new Promise((res) => {
    const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / ms); fn(ease(k)); if (k >= 1) { tweens.delete(step); res(); } };
    tweens.add(step);
  });
}
const fadeEl = $('#fade');
const fade = (to, ms = 650) => { const from = +fadeEl.style.opacity || 0; return tween(ms, (k) => { fadeEl.style.opacity = from + (to - from) * k; }); };

/* ======================= The table ======================= */
const table = new THREE.Scene();
table.background = new THREE.Color('#050403');
table.fog = new THREE.FogExp2('#050403', 0.075);
const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
const camHome = new THREE.Vector3(), camAim = new THREE.Vector3(0, 0.15, -0.12), camOffset = new THREE.Vector3();

{
  const top = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), std({ map: tex(Ink.wood(), 5), roughness: 0.62 }));
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; table.add(top);
  table.add(new THREE.HemisphereLight('#44506a', '#120a05', 0.35));
  const fill = new THREE.DirectionalLight('#9fb0d0', 0.22); fill.position.set(1, 6, 5); table.add(fill);
  // a lantern somewhere overhead, so the page stays readable
  const lantern = new THREE.SpotLight('#ffc98a', 38, 14, 0.62, 0.8, 1.6); lantern.position.set(0.3, 5.2, 2.2); lantern.target.position.set(0, 0, 0.1);
  table.add(lantern, lantern.target);
}

const candles = [];
function addCandle(x, z, height, power, shadow) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const holder = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.34, 0], [0.36, 0.04], [0.16, 0.07], [0.13, 0.16], [0.2, 0.2], [0.2, 0.24], [0, 0.24]].map(([a, b]) => new THREE.Vector2(a, b)), 28), metal('#8a6a2c', 0.42));
  holder.castShadow = true; g.add(holder);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, height, 20), std({ color: '#d8ccaa', roughness: 0.55, emissive: '#5a2a08', emissiveIntensity: 0.35 }));
  wax.position.y = 0.24 + height / 2; wax.castShadow = true; g.add(wax);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffc070', blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  flame.position.y = 0.24 + height + 0.13; flame.scale.set(0.34, 0.6, 1); g.add(flame);
  const light = new THREE.PointLight('#ffb060', power, 16, 1.7);
  light.position.y = flame.position.y + 0.05;
  if (shadow) { light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -0.003; light.shadow.radius = 5; }
  g.add(light); table.add(g);
  candles.push({ light, flame, power, seed: Math.random() * 100, baseY: flame.position.y });
}
addCandle(-1.75, -2.2, 1.0, 22, true);
addCandle(1.95, -2.05, 0.62, 14, false);

function makeSword() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  [[0, 0], [0.085, 0.03], [0.07, 1.95], [0, 2.2], [-0.07, 1.95], [-0.085, 0.03]].forEach(([a, b], i) => (i ? s.lineTo(a, b) : s.moveTo(a, b)));
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.03, bevelSegments: 2 }), metal('#a9adb3', 0.28));
  blade.position.z = -0.006; blade.castShadow = true;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.09), metal('#6d5a30', 0.45)); guard.castShadow = true;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.42, 12), std({ color: '#1d120b', roughness: 0.9 })); grip.position.y = -0.24;
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), metal('#6d5a30', 0.45)); pommel.position.y = -0.48;
  g.add(blade, guard, grip, pommel);
  return g;
}
{
  const sword = makeSword();
  sword.rotation.set(-Math.PI / 2, 0, 0.32); sword.position.set(2.75, 0.05, 1.5); table.add(sword);
}
const coinGroup = new THREE.Group(); table.add(coinGroup);
function layCoins(n) {
  coinGroup.clear();
  const r = Ink.seeded(5), geo = new THREE.CylinderGeometry(0.085, 0.085, 0.014, 18), m = metal('#b8913a', 0.38);
  for (let i = 0; i < Math.min(n, 30); i++) {
    const c = new THREE.Mesh(geo, m), stack = i % 5, pile = Math.floor(i / 5);
    c.position.set(-2.95 + pile * 0.21 + (r() - 0.5) * 0.02, 0.008 + stack * 0.015, 1.15 + (pile % 2) * 0.17 + (r() - 0.5) * 0.02);
    c.rotation.y = r() * 6; c.castShadow = true; coinGroup.add(c);
  }
}

// dust in the candlelight
const dust = (() => {
  const n = 110, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 5; pos[i * 3 + 1] = 0.4 + Math.random() * 2.6; pos[i * 3 + 2] = -2.6 + Math.random() * 3.4; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffcf98', size: 0.013, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending }));
  table.add(p); return p;
})();

/* ======================= The book ======================= */
const PAGE_W = 2, PAGE_D = 2.8, BLOCK_T = 0.2, COVER_T = 0.06;
const profile = (d) => COVER_T + BLOCK_T * (0.22 + 0.78 * Math.sin(Math.min(1, d / 0.55) * Math.PI / 2));
const PW = 1200, PH = 1680;
const cvL = Ink.canvas(PW, PH), cvR = Ink.canvas(PW, PH), cvFront = Ink.canvas(PW, PH), cvBack = Ink.canvas(PW, PH);
const txL = tex(cvL), txR = tex(cvR), txFront = tex(cvFront), txBack = tex(cvBack);
txBack.wrapS = THREE.RepeatWrapping; txBack.repeat.x = -1; txBack.offset.x = 1;
const parchR = Ink.parchment(PW, PH, false), parchL = Ink.parchment(PW, PH, true);

function pageGeo(side) {
  const g = new THREE.PlaneGeometry(PAGE_W, PAGE_D, 36, 1);
  g.rotateX(-Math.PI / 2); g.translate(side * PAGE_W / 2, 0, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, profile(Math.abs(p.getX(i))) + 0.004);
  g.computeVertexNormals();
  return g;
}
const bookGroup = new THREE.Group(); table.add(bookGroup);
const pageL = new THREE.Mesh(pageGeo(-1), std({ map: txL, roughness: 0.92 }));
const pageR = new THREE.Mesh(pageGeo(1), std({ map: txR, roughness: 0.92 }));
pageL.receiveShadow = pageR.receiveShadow = true;
{
  const cover = new THREE.Mesh(new THREE.BoxGeometry(PAGE_W * 2 + 0.34, COVER_T, PAGE_D + 0.2), std({ map: tex(Ink.leather()), bumpMap: tex(Ink.leather()), bumpScale: 0.6, roughness: 0.6 }));
  cover.position.y = COVER_T / 2; cover.castShadow = cover.receiveShadow = true;
  const s = new THREE.Shape(); s.moveTo(0, COVER_T);
  for (let i = 0; i <= 24; i++) { const d = (i / 24) * PAGE_W; s.lineTo(d, profile(d)); }
  s.lineTo(PAGE_W, COVER_T);
  const blockGeo = new THREE.ExtrudeGeometry(s, { depth: PAGE_D, bevelEnabled: false }); blockGeo.translate(0, 0, -PAGE_D / 2);
  const edgeMat = std({ color: '#b9aa82', roughness: 1 });
  const blockR = new THREE.Mesh(blockGeo, edgeMat), blockL = new THREE.Mesh(blockGeo, edgeMat);
  blockL.scale.x = -1; blockR.castShadow = blockL.castShadow = true;
  const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 1.1), std({ color: '#6e1712', side: THREE.DoubleSide, roughness: 0.7 }));
  ribbon.rotation.x = -Math.PI / 2; ribbon.position.set(0.05, 0.012, PAGE_D / 2 + 0.5); ribbon.rotation.z = 0.12;
  bookGroup.add(cover, blockR, blockL, pageL, pageR, ribbon);
  bookGroup.rotation.y = -0.015;
}

// the turning leaf
const leafGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_D, 28, 1);
leafGeo.rotateX(-Math.PI / 2); leafGeo.translate(PAGE_W / 2, 0, 0);
const leafBase = leafGeo.attributes.position.array.slice();
const leaf = new THREE.Group();
leaf.add(new THREE.Mesh(leafGeo, std({ map: txFront, roughness: 0.92, side: THREE.FrontSide })));
leaf.add(new THREE.Mesh(leafGeo, std({ map: txBack, roughness: 0.92, side: THREE.BackSide })));
leaf.children.forEach((m) => { m.castShadow = true; });
leaf.visible = false; bookGroup.add(leaf);
function bendLeaf(t) {
  const p = leafGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x0 = leafBase[i * 3], u = x0 / PAGE_W;
    const th = Math.PI * easeInOut(Math.min(1, Math.max(0, t * 1.45 - 0.45 * (1 - u))));
    p.setX(i, x0 * Math.cos(th));
    p.setY(i, profile(x0) * Math.abs(Math.cos(th)) + x0 * Math.sin(th) * 0.8 + 0.008);
  }
  p.needsUpdate = true; leafGeo.computeVertexNormals();
}

/* ======================= Drawing the pages ======================= */
const C = { ink: '#2a2018', dim: '#75664c', red: '#7d1d14', green: '#31503a', faint: 'rgba(42,32,24,0.28)' };
const F = (px, style = '') => `${style} ${px}px "IM Fell English", Georgia, serif`;
const FSC = (px) => `${px}px "IM Fell English SC", Georgia, serif`;
const spaced = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; };

function wrap(ctx, text, widthAt) {
  const sp = ctx.measureText(' ').width, lines = [];
  let cur = [], curW = 0;
  for (const word of text.split(/\s+/)) {
    const ww = ctx.measureText(word).width;
    if (cur.length && curW + sp + ww > widthAt(lines.length)) { lines.push({ words: cur, w: curW }); cur = [word]; curW = ww; }
    else { curW += (cur.length ? sp : 0) + ww; cur.push(word); }
  }
  if (cur.length) lines.push({ words: cur, w: curW, last: true });
  return lines;
}
/* Draws wrapped text; returns the y below it. opts: size, lh, style, color, justify, dropCap, dry */
function para(ctx, text, x, y, w, o = {}) {
  const size = o.size || 43, lh = o.lh || 59;
  let capW = 0;
  if (o.dropCap) {
    ctx.font = F(124);
    capW = ctx.measureText(text[0]).width + 12;
    if (!o.dry) { ctx.fillStyle = C.red; ctx.fillText(text[0], x - 4, y + lh + 2); }
    text = text.slice(1);
  }
  ctx.font = F(size, o.style || ''); ctx.fillStyle = o.color || C.ink;
  const indent = (i) => (i < 2 ? capW : 0);
  const lines = wrap(ctx, text, (i) => w - indent(i));
  let maxW = 0;
  lines.forEach((ln, i) => {
    const lx = x + indent(i), avail = w - indent(i);
    maxW = Math.max(maxW, ln.w + indent(i));
    if (o.dry) return;
    if (o.justify && !ln.last && ln.words.length > 1) {
      const wordsW = ln.words.reduce((t, wd) => t + ctx.measureText(wd).width, 0);
      const gap = (avail - wordsW) / (ln.words.length - 1);
      let cx = lx;
      ln.words.forEach((wd) => { ctx.fillText(wd, cx, y + i * lh); cx += ctx.measureText(wd).width + gap; });
    } else ctx.fillText(ln.words.join(' '), lx, y + i * lh);
    if (o.underline) { ctx.fillRect(lx, y + i * lh + 8, ln.w, 2); }
  });
  return { y: y + lines.length * lh, w: maxW, lines: lines.length };
}
const rule = (ctx, x0, x1, y, col = C.faint) => { ctx.fillStyle = col; ctx.fillRect(x0, y, x1 - x0, 2); };

let regions = { L: [], R: [] }, hover = null, pageNote = '', rollShown = null, titleMode = true;

/* A clickable line of ink. */
function link(ctx, list, key, act, text, x, y, w, o = {}) {
  const hot = hover === key && !o.disabled;
  const r = para(ctx, text, x, y, w, Object.assign({ size: 41, lh: 53 }, o, { color: o.disabled ? C.dim : hot ? C.red : o.color || C.ink, underline: hot }));
  if (!o.dry && !o.disabled) list.push({ key, act, x: x - 50, y: y - 42, w: r.w + 70, h: r.lines * (o.lh || 53) + 12 });
  return r.y;
}

function drawRight(ctx, list) {
  ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(parchR, 0, 0);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; spaced(ctx, 0);
  const x0 = 150, x1 = PW - 105, W = x1 - x0, mid = (x0 + x1) / 2;
  if (titleMode) {
    ctx.textAlign = 'center'; ctx.fillStyle = C.dim; ctx.font = FSC(34); spaced(ctx, 8); ctx.fillText('LONE WOLF', mid, 520); spaced(ctx, 0);
    ctx.fillStyle = C.red; ctx.font = F(104); ctx.fillText('Flight', mid, 690); ctx.fillText('from the Dark', mid, 810);
    rule(ctx, mid - 160, mid + 160, 870);
    ctx.fillStyle = C.dim; ctx.font = F(36, 'italic'); ctx.fillText('a demonstration chapter', mid, 940);
    ctx.textAlign = 'left'; return;
  }
  const sec = game.section, id = game.s.at;
  ctx.textAlign = 'center'; ctx.fillStyle = C.red; ctx.font = FSC(88); ctx.fillText(id, mid, 205);
  const nw = ctx.measureText(id).width / 2 + 34;
  rule(ctx, mid - nw - 150, mid - nw, 178); rule(ctx, mid + nw, mid + nw + 150, 178);
  ctx.textAlign = 'left';

  let y = 320;
  sec.text.forEach((p, i) => { y = para(ctx, p, x0, y, W, { justify: true, dropCap: i === 0 }).y + 24; });
  if (game.s.events.length) { y += 6; game.s.events.forEach((e) => { y = para(ctx, e, x0, y, W, { size: 35, lh: 48, style: 'italic', color: C.green }).y; }); y += 20; }

  const loot = game.loot();
  if (loot.length && !game.dead) {
    y += 14; ctx.fillStyle = C.dim; ctx.font = FSC(27); spaced(ctx, 3); ctx.fillText('YOU MAY TAKE', x0, y); spaced(ctx, 0); y += 54;
    loot.forEach((l) => { y = link(ctx, list, 'loot' + l.i, { type: 'loot', i: l.i }, l.taken ? `${l.label} (taken)` : l.label, x0 + 40, y, W - 40, { disabled: l.taken, style: 'italic' }); });
    if (pageNote) y = para(ctx, pageNote, x0, y + 6, W, { size: 33, lh: 46, style: 'italic', color: C.red }).y;
  }

  const bottom = PH - 190;
  if (game.dead) {
    ctx.textAlign = 'center'; ctx.fillStyle = C.red; ctx.font = F(62); ctx.fillText('Your adventure ends here', mid, bottom - 150);
    ctx.textAlign = 'left'; rule(ctx, mid - 160, mid + 160, bottom - 110);
    link(ctx, list, 'new', { type: 'new' }, 'Begin again', mid - 100, bottom - 40, W);
  } else if (game.combatPending) {
    y = Math.max(y + 30, bottom - 260 - sec.combat.enemies.length * 52);
    rule(ctx, x0, x1, y - 50);
    ctx.fillStyle = C.dim; ctx.font = FSC(27); spaced(ctx, 3); ctx.fillText('YOU MUST FIGHT', x0, y); spaced(ctx, 0); y += 58;
    sec.combat.enemies.forEach((f) => {
      ctx.fillStyle = C.ink; ctx.font = F(40); ctx.fillText(f.name, x0, y);
      ctx.textAlign = 'right'; ctx.font = F(33, 'italic'); ctx.fillStyle = C.dim; ctx.fillText(`Combat Skill ${f.cs}   Endurance ${f.ep}`, x1, y); ctx.textAlign = 'left';
      y += 52;
    });
    y += 46;
    ctx.font = F(54); const tw = ctx.measureText('Draw your weapon').width;
    link(ctx, list, 'fight', { type: 'fight' }, 'Draw your weapon', mid - tw / 2, y, W, { size: 54, lh: 60, color: C.red });
  } else if (sec.end) {
    ctx.textAlign = 'center'; ctx.fillStyle = C.ink; ctx.font = F(58); ctx.fillText('Here the demo ends', mid, bottom - 150);
    ctx.textAlign = 'left'; rule(ctx, mid - 160, mid + 160, bottom - 110);
    link(ctx, list, 'new', { type: 'new' }, 'Play again', mid - 90, bottom - 40, W);
  } else {
    const ch = game.choices();
    const label = (c) => c.text + (c.enabled ? (c.need && c.need.disc ? `  (${LW.DISCIPLINES[c.need.disc].name})` : '') : `  (${c.why.toLowerCase()})`);
    const heights = ch.map((c, i) => link(ctx, null, 'c' + i, null, label(c), x0 + 44, 0, W - 44, { dry: true, disabled: true }) + 18);
    let cy = Math.max(y + 60, bottom - heights.reduce((a, b) => a + b, 0) + 40);
    rule(ctx, x0, x1, cy - 66); rule(ctx, x0, x1, cy - 60);
    ch.forEach((c, i) => {
      ctx.fillStyle = c.enabled ? C.red : C.faint;
      ctx.beginPath(); ctx.moveTo(x0 + 4, cy - 12); ctx.lineTo(x0 + 14, cy - 22); ctx.lineTo(x0 + 24, cy - 12); ctx.lineTo(x0 + 14, cy - 2); ctx.fill();
      cy = link(ctx, list, 'c' + i, { type: 'choice', i }, label(c), x0 + 44, cy, W - 44, { disabled: !c.enabled }) + 18;
    });
  }
  if (rollShown != null) {
    ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mid, PH - 100, 48, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = C.red; ctx.font = F(66); ctx.fillText(rollShown, mid, PH - 78);
    ctx.fillStyle = C.dim; ctx.font = FSC(24); spaced(ctx, 3); ctx.fillText('RANDOM NUMBER', mid - 210, PH - 90); spaced(ctx, 0); ctx.textAlign = 'left';
  }
}

const plateCache = {};
function drawLeft(ctx, list) {
  ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(parchL, 0, 0);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; spaced(ctx, 0);
  const x0 = 105, x1 = PW - 150, W = x1 - x0, mid = (x0 + x1) / 2;
  const scene = titleMode ? 'ruins' : game.section.scene;
  const plate = plateCache[scene] || (plateCache[scene] = Ink.inkScene(scene, W + 40, 660));
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(plate, x0 - 20, 110); ctx.globalCompositeOperation = 'source-over';
  if (titleMode) return;
  const h = game.hero;
  ctx.textAlign = 'center'; ctx.fillStyle = C.dim; ctx.font = FSC(30); spaced(ctx, 5);
  ctx.fillText(book.locations[game.section.loc].name.toUpperCase(), mid, 830); spaced(ctx, 0); ctx.textAlign = 'left';
  rule(ctx, x0, x1, 880);

  const cs = LW.heroCS(h), col = W / 3;
  const stat = (i, k, v, note) => {
    const sx = x0 + i * col;
    ctx.fillStyle = C.dim; ctx.font = FSC(25); spaced(ctx, 3); ctx.fillText(k, sx, 940); spaced(ctx, 0);
    ctx.fillStyle = i === 1 && h.ep <= h.epMax / 3 ? C.red : C.ink; ctx.font = F(74); ctx.fillText(v, sx, 1018);
    if (note) { ctx.fillStyle = C.dim; ctx.font = F(28, 'italic'); ctx.fillText(note, sx, 1058); }
  };
  stat(0, 'COMBAT SKILL', cs.total, cs.parts.slice(1).map((p) => `${p.n > 0 ? '+' : ''}${p.n} ${p.label}`).join(', '));
  stat(1, 'ENDURANCE', `${Math.max(0, h.ep)}`, `of ${h.epMax}`);
  stat(2, 'GOLD CROWNS', h.gold, '');
  ctx.fillStyle = C.faint; ctx.fillRect(x0 + col + 110, 990, col - 150, 8);
  ctx.fillStyle = C.red; ctx.fillRect(x0 + col + 110, 990, (col - 150) * Math.max(0, h.ep / h.epMax), 8);

  let y = 1130;
  const head = (t, hx, hy) => { ctx.fillStyle = C.dim; ctx.font = FSC(25); spaced(ctx, 3); ctx.fillText(t, hx, hy); spaced(ctx, 0); rule(ctx, hx, hx + (hx === x0 ? W : W / 2 - 30), hy + 14); };
  head('KAI DISCIPLINES', x0, y); y += 66;
  ctx.fillStyle = C.ink; ctx.font = F(35);
  h.disciplines.forEach((d, i) => {
    const name = LW.DISCIPLINES[d].name + (d === 'weaponskill' ? ` (${LW.ITEMS[h.weaponskill].name})` : '');
    ctx.fillText(name, x0 + (i % 2) * (W / 2), y + Math.floor(i / 2) * 48);
  });
  y += Math.ceil(h.disciplines.length / 2) * 48 + 36;
  head('WEAPONS', x0, y); head('BACKPACK', x0 + W / 2, y); y += 64;
  ctx.fillStyle = C.ink; ctx.font = F(35);
  (h.weapons.length ? h.weapons.map((w) => LW.ITEMS[w].name) : ['None']).forEach((w, i) => ctx.fillText(w, x0, y + i * 46));
  let by = y;
  if (h.meals) { ctx.fillText(h.meals > 1 ? `Meals, ${h.meals}` : 'Meal', x0 + W / 2, by); by += 46; }
  const potions = h.backpack.filter((b) => b === 'potion').length;
  if (potions) {
    const can = h.ep < h.epMax && !game.dead;
    link(ctx, list, 'potion', { type: 'potion' }, `Laumspur${potions > 1 ? ', ' + potions : ''}${can ? '  (drink)' : ''}`, x0 + W / 2, by, W / 2, { size: 35, lh: 46, disabled: !can, color: C.ink });
    if (!can) { ctx.fillStyle = C.ink; ctx.font = F(35); ctx.fillText(`Laumspur${potions > 1 ? ', ' + potions : ''}`, x0 + W / 2, by); }
  } else if (!h.meals) { ctx.fillStyle = C.dim; ctx.font = F(35, 'italic'); ctx.fillText('Empty', x0 + W / 2, by); }
}

function redraw(which = 'LR') {
  if (which.includes('R')) { regions.R = []; drawRight(cvR.getContext('2d'), regions.R); txR.needsUpdate = true; }
  if (which.includes('L')) { regions.L = []; drawLeft(cvL.getContext('2d'), regions.L); txL.needsUpdate = true; }
  if (!titleMode) layCoins(game.hero.gold);
}

async function turnPage() {
  cvFront.getContext('2d').drawImage(cvR, 0, 0); txFront.needsUpdate = true;
  hover = null; pageNote = ''; rollShown = null;
  drawLeft(cvBack.getContext('2d'), []); txBack.needsUpdate = true;
  redraw('R');
  bendLeaf(0); leaf.visible = true;
  LW.sfx('page');
  await tween(950, bendLeaf, (k) => k);
  redraw('L');
  leaf.visible = false;
}

/* ======================= Pointer: ray to page to ink ======================= */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let busy = true, mode = 'book';
function regionAt(ev) {
  ptr.set((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const hit = ray.intersectObjects([pageL, pageR])[0];
  if (!hit) return null;
  const px = hit.uv.x * PW, py = (1 - hit.uv.y) * PH, side = hit.object === pageL ? 'L' : 'R';
  const r = regions[side].find((g) => px >= g.x && px <= g.x + g.w && py >= g.y && py <= g.y + g.h);
  return r ? Object.assign({ side }, r) : null;
}
const glEl = $('#gl');
glEl.addEventListener('pointermove', (ev) => {
  camOffset.set(((ev.clientX / window.innerWidth) - 0.5) * 0.22, 0, ((ev.clientY / window.innerHeight) - 0.5) * 0.14);
  if (busy || mode !== 'book') return;
  const r = regionAt(ev), key = r ? r.key : null;
  glEl.style.cursor = r ? 'pointer' : 'default';
  if (key !== hover) { hover = key; redraw(); }
});
glEl.addEventListener('click', (ev) => { if (busy || mode !== 'book') return; const r = regionAt(ev); if (r) act(r.act); });

async function act(a) {
  busy = true; glEl.style.cursor = 'default';
  try {
    if (a.type === 'loot') {
      pageNote = game.takeLoot(a.i) || ''; if (!pageNote) LW.sfx('select'); redraw();
    } else if (a.type === 'potion') {
      if (game.usePotion()) { LW.sfx('heal'); redraw(); }
    } else if (a.type === 'choice') {
      const c = game.choices()[a.i]; let to = c.to;
      if (c.random) {
        const n = LW.rand10();
        for (let i = 0; i < 12; i++) { rollShown = LW.rand10(); redraw('R'); LW.sfx('roll'); await wait(60); }
        rollShown = n; redraw('R'); await wait(900);
        to = game.resolveRandom(c, n).to;
      }
      game.choose(c, to);
      await turnPage();
    } else if (a.type === 'fight') {
      await battle();
    } else if (a.type === 'new') {
      await newGame();
    }
  } finally { busy = false; }
}

async function newGame() {
  busy = true;
  game.clear(); titleMode = true; hover = null; redraw();
  const hero = await LW.UI.createHero(book);
  game.start(hero); titleMode = false;
  await turnPage();
  busy = false;
}

/* ======================= The battlefield ======================= */
const field = new THREE.Scene();
const bcam = new THREE.PerspectiveCamera(58, 1, 0.05, 80);
bcam.position.set(0, 1.62, 0); field.add(bcam);
const env = new THREE.Group(); field.add(env);
const torch = new THREE.PointLight('#ffa860', 5, 7, 2); torch.position.set(-0.9, -0.2, 0.2); bcam.add(torch);
const moon = new THREE.DirectionalLight('#9fb8e0', 2.6); moon.position.set(-4, 7, -12); field.add(moon);
field.add(new THREE.HemisphereLight('#5a6c88', '#14100c', 1.1));
// pale haze behind the enemy so it reads as a shape first
const haze = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(Ink.glow(128, 'rgba(255,255,255,0.9)')), color: '#8fa3b0', transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
haze.position.set(0, 2.2, -13); haze.scale.set(15, 11, 1); field.add(haze);
const hand = makeSword(); hand.scale.setScalar(0.5);
hand.traverse((o) => { if (o.material && o.material.metalness) { o.material = o.material.clone(); o.material.roughness = 0.55; o.material.metalness = 0.6; o.material.envMapIntensity = 0.12; o.material.color.multiplyScalar(0.6); } });
const HAND_POS = new THREE.Vector3(0.36, -0.52, -0.72), HAND_ROT = new THREE.Euler(-0.35, 0.2, -0.42);
hand.position.copy(HAND_POS); hand.rotation.copy(HAND_ROT); bcam.add(hand);
const slash = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.16), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
field.add(slash);
const embers = (() => {
  const n = 220, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 14; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = -1.5 - Math.random() * 13; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ff8a3a', map: glowTex, size: 0.06, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  field.add(p); return p;
})();

const ENVS = {
  forest: { fog: '#18231f', density: 0.07, ground: '20,22,15', trees: 70 },
  river: { fog: '#1a2730', density: 0.06, ground: '12,18,22', trees: 22, wet: true },
  bridge: { fog: '#20222b', density: 0.065, ground: '30,30,32', trees: 0, walls: true },
};
function buildEnv(kind) {
  const e = ENVS[kind] || ENVS.forest, r = Ink.seeded(kind.length * 97);
  env.clear();
  field.background = new THREE.Color(e.fog); field.fog = new THREE.FogExp2(e.fog, e.density);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), std({ map: tex(Ink.ground(512, e.ground), 14), roughness: e.wet ? 0.25 : 0.95 }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; env.add(g);
  const bark = std({ color: '#241d15', roughness: 1 });
  for (let i = 0; i < e.trees; i++) {
    const rad = 0.14 + r() * 0.34, x = (r() - 0.5) * 30, z = -1 - r() * 26;
    if (Math.abs(x) < 1.6 && z > -9) continue;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.7, rad, 16, 9), bark);
    t.position.set(x, 8, z); t.rotation.set((r() - 0.5) * 0.08, 0, (r() - 0.5) * 0.08); env.add(t);
  }
  if (e.walls) {
    const stone = std({ color: '#3b3b40', roughness: 0.95 });
    [-2.7, 2.7].forEach((x) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 60), stone); wall.position.set(x, 0.5, -20); env.add(wall);
      for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.9), stone); m.position.set(x, 1.2, -1 - i * 2.2); env.add(m); }
    });
    [-3.4, 3.4].forEach((x) => { const tw = new THREE.Mesh(new THREE.BoxGeometry(2.4, 14, 2.4), stone); tw.position.set(x, 7, -13); env.add(tw); });
  }
}

/* --- creatures, built from primitives and kept in the dark --- */
const eyeMat = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
const part = (geo, m, x, y, z, parent) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
const FOES = {
  vordak() {
    const g = new THREE.Group(), robe = std({ color: '#2a0709', roughness: 0.85, side: THREE.DoubleSide }), dark = std({ color: '#120304', roughness: 1 });
    const pts = [[0.02, 1.72], [0.2, 1.68], [0.33, 1.5], [0.36, 1.2], [0.42, 0.7], [0.6, 0.12], [0.66, 0]].map(([a, b]) => new THREE.Vector2(a, b));
    part(new THREE.LatheGeometry(pts, 28), robe, 0, 0, 0, g);
    const hood = part(new THREE.SphereGeometry(0.27, 24, 18), dark, 0, 1.8, -0.02, g); hood.scale.set(1, 1.18, 1.12);
    part(new THREE.SphereGeometry(0.2, 18, 14), new THREE.MeshBasicMaterial({ color: '#000' }), 0, 1.77, 0.13, g);
    const eyes = [part(new THREE.SphereGeometry(0.022, 8, 8), eyeMat('#9dff6a'), -0.065, 1.79, 0.3, g), part(new THREE.SphereGeometry(0.022, 8, 8), eyeMat('#9dff6a'), 0.065, 1.79, 0.3, g)];
    const armL = part(new THREE.CylinderGeometry(0.09, 0.14, 0.75, 10), robe, -0.42, 1.2, 0.18, g); armL.rotation.set(-0.7, 0, 0.35);
    const armR = part(new THREE.CylinderGeometry(0.09, 0.14, 0.75, 10), robe, 0.42, 1.25, 0.2, g); armR.rotation.set(-0.9, 0, -0.35);
    const bone = std({ color: '#8a826c', roughness: 0.7 });
    part(new THREE.BoxGeometry(0.08, 0.1, 0.05), bone, -0.52, 0.98, 0.42, g);
    part(new THREE.BoxGeometry(0.08, 0.1, 0.05), bone, 0.52, 1.05, 0.5, g);
    const mace = new THREE.Group(); mace.position.set(0.52, 1.05, 0.5); mace.rotation.set(0.25, 0, -0.2); g.add(mace);
    part(new THREE.CylinderGeometry(0.022, 0.022, 1.1, 8), metal('#2b2b30', 0.6), 0, 0.4, 0, mace);
    part(new THREE.IcosahedronGeometry(0.13, 0), metal('#3a3a40', 0.5), 0, 1.0, 0, mace);
    return { g, eyes, update(t) { g.position.y = 0.12 + Math.sin(t * 1.3) * 0.05; g.rotation.y = Math.sin(t * 0.6) * 0.08; mace.rotation.z = -0.2 + Math.sin(t * 0.9) * 0.06; } };
  },
  giak() {
    const g = new THREE.Group(), skin = std({ color: '#262d1c', roughness: 0.75 }), hide = std({ color: '#15100c', roughness: 0.9 }), iron = metal('#3a3c40', 0.5);
    const body = new THREE.Group(); g.add(body);
    const torso = part(new THREE.CapsuleGeometry(0.27, 0.34, 6, 14), hide, 0, 0.92, 0, body); torso.scale.set(1.2, 1, 0.9);
    part(new THREE.SphereGeometry(0.2, 18, 14), skin, 0, 1.43, 0.05, body);
    part(new THREE.SphereGeometry(0.215, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), iron, 0, 1.46, 0.04, body);
    part(new THREE.ConeGeometry(0.035, 0.16, 8), iron, 0, 1.74, 0.04, body);
    [-1, 1].forEach((s) => {
      const ear = part(new THREE.ConeGeometry(0.05, 0.24, 6), skin, s * 0.25, 1.46, 0.02, body); ear.rotation.z = -s * 1.2;
      const fang = part(new THREE.ConeGeometry(0.014, 0.06, 5), std({ color: '#d8d0b8' }), s * 0.05, 1.33, 0.22, body); fang.rotation.x = Math.PI;
      part(new THREE.CapsuleGeometry(0.095, 0.32, 4, 8), hide, s * 0.15, 0.32, 0, body);
      part(new THREE.BoxGeometry(0.16, 0.08, 0.3), hide, s * 0.15, 0.04, 0.06, body);
    });
    const eyes = [-1, 1].map((s) => part(new THREE.SphereGeometry(0.026, 8, 8), eyeMat('#ffc83a'), s * 0.075, 1.42, 0.22, body));
    const armR = part(new THREE.CapsuleGeometry(0.075, 0.4, 4, 8), skin, 0.42, 1.0, 0.12, body); armR.rotation.set(-0.5, 0, -0.25);
    const armL = part(new THREE.CapsuleGeometry(0.075, 0.4, 4, 8), skin, -0.42, 1.0, 0.14, body); armL.rotation.set(-0.7, 0, 0.3);
    const shield = part(new THREE.CylinderGeometry(0.33, 0.33, 0.04, 22), iron, -0.46, 0.95, 0.34, body); shield.rotation.set(Math.PI / 2 - 0.15, 0, 0.1);
    part(new THREE.SphereGeometry(0.07, 10, 8), iron, -0.46, 0.95, 0.38, body);
    const spear = new THREE.Group(); spear.position.set(0.5, 0.9, 0.3); spear.rotation.set(0.12, 0, -0.06); body.add(spear);
    part(new THREE.CylinderGeometry(0.02, 0.02, 2.1, 8), std({ color: '#2a1c10' }), 0, 0.35, 0, spear);
    part(new THREE.ConeGeometry(0.055, 0.3, 8), metal('#8a8d92', 0.4), 0, 1.55, 0, spear);
    body.rotation.x = 0.16; g.scale.setScalar(0.92);
    return { g, eyes, update(t) { body.position.y = Math.sin(t * 2.1) * 0.015; body.rotation.z = Math.sin(t * 1.1) * 0.035; spear.rotation.x = 0.12 + Math.sin(t * 1.7) * 0.04; } };
  },
  kraan() {
    const g = new THREE.Group(), hide = std({ color: '#100c14', roughness: 0.75 }), skin = std({ color: '#17111c', roughness: 0.8, side: THREE.DoubleSide }), bone = std({ color: '#6f664e', roughness: 0.6 });
    const body = new THREE.Group(); body.position.y = 1.7; g.add(body);
    const trunk = part(new THREE.SphereGeometry(0.3, 18, 14), hide, 0, 0, 0, body); trunk.scale.set(0.8, 1.7, 0.8);
    const hump = part(new THREE.SphereGeometry(0.3, 16, 12), hide, 0, 0.36, -0.06, body); hump.scale.set(1.35, 0.7, 0.9);
    const head = new THREE.Group(); head.position.set(0, 0.62, 0.2); head.rotation.x = 0.5; body.add(head);
    const skull = part(new THREE.SphereGeometry(0.13, 14, 10), hide, 0, 0, 0, head); skull.scale.set(0.9, 1, 1.5);
    const beak = part(new THREE.ConeGeometry(0.075, 0.5, 6), bone, 0, -0.06, 0.34, head); beak.rotation.x = Math.PI / 2 + 0.35;
    [-1, 1].forEach((s) => { const horn = part(new THREE.ConeGeometry(0.035, 0.42, 5), hide, s * 0.09, 0.16, -0.2, head); horn.rotation.set(-1.0, 0, -s * 0.35); });
    const eyes = [-1, 1].map((s) => part(new THREE.SphereGeometry(0.02, 8, 8), eyeMat('#ff3a1e'), s * 0.075, 0.03, 0.15, head));
    const ws = new THREE.Shape();
    [[0, 0.1], [0.9, 0.75], [1.7, 0.85], [2.5, 0.35], [2.05, 0.05], [1.85, 0.3], [1.45, -0.4], [1.2, 0.05], [0.8, -0.6], [0.5, -0.1], [0.15, -0.55], [0, -0.35]].forEach(([a, b], i) => (i ? ws.lineTo(a, b) : ws.moveTo(a, b)));
    const wgeo = new THREE.ShapeGeometry(ws);
    const wings = [-1, 1].map((s) => {
      const piv = new THREE.Group(); piv.position.set(s * 0.2, 0.3, -0.05); body.add(piv);
      const w = part(wgeo, skin, 0, 0, 0, piv); w.scale.x = s;
      const a1 = part(new THREE.CylinderGeometry(0.03, 0.05, 1.12, 6), hide, s * 0.45, 0.43, 0.01, piv); a1.rotation.z = -s * 0.94;
      const a2 = part(new THREE.CylinderGeometry(0.015, 0.03, 1.66, 6), hide, s * 1.7, 0.56, 0.01, piv); a2.rotation.z = -s * 1.815;
      const claw = part(new THREE.ConeGeometry(0.03, 0.22, 5), bone, s * 0.92, 0.88, 0.01, piv); claw.rotation.z = -s * 0.3;
      return { piv, s };
    });
    [-1, 1].forEach((s) => {
      const leg = part(new THREE.CylinderGeometry(0.03, 0.05, 0.55, 6), hide, s * 0.13, -0.66, 0.06, body); leg.rotation.x = -0.25;
      [-0.3, 0, 0.3].forEach((a) => { const claw = part(new THREE.ConeGeometry(0.022, 0.2, 5), bone, s * 0.13 + a * 0.2, -1.0, 0.16, body); claw.rotation.set(Math.PI - 0.5, 0, a); });
    });
    const tail = part(new THREE.ConeGeometry(0.08, 0.9, 6), hide, 0, -0.75, -0.2, body); tail.rotation.x = Math.PI + 0.35;
    return { g, eyes, update(t) {
      const f = Math.sin(t * 4.2);
      wings.forEach(({ piv, s }) => { piv.rotation.z = s * (0.15 + f * 0.4); piv.rotation.y = -s * 0.3; });
      body.position.y = 1.72 - f * 0.12; body.rotation.x = 0.2 + Math.sin(t * 1.1) * 0.05; head.rotation.y = Math.sin(t * 0.9) * 0.25;
    } };
  },
};

/* --- HUD --- */
const hud = { root: $('#hud'), foeName: $('.foe-name'), foeBar: $('.foe .bar i'), foeStats: $('.foe-stats'), me: $('.me'), meBar: $('.me .bar i'), meStats: $('.me-stats'), log: $('.log'), cmds: $('.cmds'), roll: $('.roll'), dmg: $('.dmg') };
let skipSay = null;
hud.root.addEventListener('pointerdown', () => skipSay && skipSay());
glEl.addEventListener('pointerdown', () => mode === 'battle' && skipSay && skipSay());
async function say(text, hold = 1150) {
  hud.log.textContent = text;
  await Promise.race([wait(hold), new Promise((r) => { skipSay = r; })]);
  skipSay = null;
}
function command(items) {
  return new Promise((res) => {
    hud.cmds.innerHTML = '';
    items.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cmd'; b.disabled = !!it.disabled;
      b.innerHTML = LW.UI.esc(it.label) + (it.note ? `<small>${LW.UI.esc(it.note)}</small>` : '');
      b.addEventListener('click', () => { LW.sfx('select'); hud.cmds.innerHTML = ''; res(it.id); });
      hud.cmds.appendChild(b);
    });
    hud.cmds.querySelector('button:not(:disabled)').focus();
  });
}
async function showRoll() {
  const n = LW.rand10();
  hud.roll.classList.add('show');
  if (!still) for (let i = 0; i < 10; i++) { hud.roll.innerHTML = `${LW.rand10()}<small>Random Number</small>`; LW.sfx('roll'); await wait(50); }
  hud.roll.innerHTML = `${n}<small>Random Number</small>`;
  await wait(420);
  hud.roll.classList.remove('show');
  return n;
}
const popDmg = (n) => { hud.dmg.textContent = n; hud.dmg.classList.remove('pop'); void hud.dmg.offsetWidth; hud.dmg.classList.add('pop'); };

let foeRig = null, shake = 0, hurt = 0;
const FOE_Z = -3.9;

async function battle() {
  const sec = game.section, c = sec.combat, hero = game.hero;
  LW.sfx('battle');
  const from = cam.position.clone(), into = new THREE.Vector3(-1, 1.7, 0.7);
  diving = true;
  await Promise.all([fade(1, 800), tween(800, (k) => { cam.position.lerpVectors(from, into, k); cam.lookAt(-1, 0.2, -0.4); })]);
  buildEnv(sec.scene === 'river' ? 'river' : sec.scene === 'bridge' ? 'bridge' : 'forest');
  mode = 'battle'; hud.root.hidden = false; hud.log.textContent = ''; hud.cmds.innerHTML = '';
  bloom.strength = 0.85;

  let foe = null, mind = LW.has(hero, 'mindblast'), rounds = 0, outcome = 'win';
  const blasting = () => mind && !foe.immune;
  const ratio = () => LW.heroCS(hero, { mindblast: blasting(), enemy: foe, csMod: c.csMod, csNote: c.csNote }).total - foe.cs;
  const refresh = () => {
    const r = ratio();
    hud.foeName.textContent = foe.name;
    hud.foeBar.style.width = Math.max(0, (foe.ep / foe.max) * 100) + '%';
    hud.foeStats.textContent = `Combat Skill ${foe.cs}  ·  Endurance ${Math.max(0, foe.ep)}`;
    hud.meBar.style.width = Math.max(0, (hero.ep / hero.epMax) * 100) + '%';
    hud.me.classList.toggle('low', hero.ep <= hero.epMax / 3);
    hud.meStats.textContent = `Endurance ${Math.max(0, hero.ep)} of ${hero.epMax}  ·  Combat Skill ${r + foe.cs}  ·  Ratio ${r > 0 ? '+' : ''}${r}`;
  };
  const swing = async () => {
    LW.sfx('swing');
    await tween(150, (k) => { hand.position.set(0.36 - k * 0.75, -0.52 + Math.sin(k * Math.PI) * 0.3, -0.72 - Math.sin(k * Math.PI) * 0.35); hand.rotation.set(-0.35 - k * 0.5, 0.2, -0.42 + k * 2.1); }, easeOut);
    tween(420, (k) => { hand.position.lerpVectors(new THREE.Vector3(-0.39, -0.52, -0.72), HAND_POS, k); hand.rotation.set(-0.85 + k * 0.5, 0.2, 1.68 - k * 2.1); });
  };
  const strikeFx = (n) => {
    LW.sfx('hit'); popDmg(n);
    slash.position.set(0, foe.sprite === 'kraan' ? 1.9 : 1.25, FOE_Z + 0.7); slash.rotation.z = (Math.random() - 0.5) * 1.6;
    tween(260, (k) => { slash.material.opacity = (1 - k) * 0.95; slash.scale.set(0.4 + k * 0.9, 1 + k, 1); }, easeOut);
    tween(380, (k) => { foeRig.g.position.z = FOE_Z - Math.sin(k * Math.PI) * 0.55; foeRig.g.rotation.x = -Math.sin(k * Math.PI) * 0.16; });
  };
  const lunge = async (n) => {
    await tween(240, (k) => { foeRig.g.position.z = FOE_Z + k * 1.9; }, (k) => k * k);
    if (n) { LW.sfx('hurt'); shake = 1; hurt = 1; }
    await tween(420, (k) => { foeRig.g.position.z = FOE_Z + 1.9 * (1 - k); }, easeOut);
  };

  for (let i = 0; i < c.enemies.length && outcome === 'win'; i++) {
    foe = Object.assign({}, c.enemies[i]); foe.max = foe.ep;
    if (foeRig) field.remove(foeRig.g);
    foeRig = (FOES[foe.sprite] || FOES.giak)(); foeRig.g.position.set(0, 0, -11); field.add(foeRig.g);
    refresh();
    if (i === 0) await fade(0, 900);
    tween(1500, (k) => { foeRig.g.position.z = -11 + (FOE_Z + 11) * k; }, easeOut);
    await say(i ? `Another comes on: the ${foe.name}.` : `Out of the dark: ${/^[aeiou]/i.test(foe.name) ? 'an' : 'a'} ${foe.name}.`, 1600);
    if (foe.mindforce) await say(LW.has(hero, 'mindshield') ? 'Its will breaks against your Mindshield.' : `Its will presses on yours. Combat Skill −${foe.mindforce}.`, 1500);
    if (i === 0 && c.csMod) await say(`${c.csNote}: Combat Skill ${c.csMod > 0 ? '+' : '−'}${Math.abs(c.csMod)}.`, 1400);

    while (foe.ep > 0 && hero.ep > 0) {
      refresh(); hud.log.textContent = '';
      const evadeOpen = c.evade && rounds >= c.evade.after, hasPotion = hero.backpack.includes('potion');
      const items = [{ id: 'fight', label: 'Strike' }];
      if (LW.has(hero, 'mindblast')) items.push({ id: 'mind', label: 'Mindblast', note: blasting() ? 'focused, +2' : 'at rest' });
      if (hasPotion) items.push({ id: 'item', label: 'Laumspur', note: '+4 Endurance', disabled: hero.ep >= hero.epMax });
      if (c.evade) items.push({ id: 'evade', label: 'Evade', note: evadeOpen ? 'take one blow' : `after round ${c.evade.after}`, disabled: !evadeOpen });
      const a = await command(items);
      if (a === 'mind') { if (foe.immune) { await say(`The ${foe.name} has no mind you can reach.`); continue; } mind = !mind; refresh(); await say(mind ? 'You gather your will to a point.' : 'You let the Mindblast fade.', 800); continue; }
      if (a === 'item') { hero.backpack.splice(hero.backpack.indexOf('potion'), 1); hero.ep = Math.min(hero.epMax, hero.ep + 4); LW.sfx('heal'); refresh(); await say('The Laumspur burns going down. 4 Endurance restored.'); continue; }

      const n = await showRoll(), res = LW.combatRound(ratio(), n);
      rounds++;
      if (a === 'evade') {
        const loss = Math.min(res.hero, hero.ep);
        await lunge(loss); hero.ep -= loss; refresh();
        await say(loss ? `You turn and run. It catches you for ${loss}.` : 'You turn and run, untouched.');
        if (hero.ep > 0) outcome = 'evade';
        break;
      }
      const dealt = Math.min(res.enemy, foe.ep), taken = Math.min(res.hero, hero.ep);
      await swing();
      foe.ep -= dealt; refresh();
      if (dealt) strikeFx(dealt);
      await say(res.enemy === Infinity ? 'A killing blow.' : dealt ? `Your blow lands. The ${foe.name} loses ${dealt}.` : `The ${foe.name} turns your blow aside.`);
      if (foe.ep > 0 || taken) {
        await lunge(taken); hero.ep -= taken; refresh();
        await say(res.hero === Infinity ? 'It finds the gap in your guard. The wound is mortal.' : taken ? `The ${foe.name} strikes back. You lose ${taken}.` : `The ${foe.name} lunges and misses.`);
      }
    }
    if (hero.ep <= 0) { outcome = 'dead'; break; }
    if (outcome === 'evade') break;
    foeRig.dead = true;
    tween(1100, (k) => { foeRig.g.rotation.x = -k * 1.35; foeRig.g.position.y = -k * 0.5; foeRig.eyes.forEach((e) => { e.scale.setScalar(1 - k); }); }, easeOut);
    await say(`The ${foe.name} falls.`, 1300);
  }

  LW.sfx(outcome === 'dead' ? 'lose' : outcome === 'win' ? 'win' : 'select');
  await say(outcome === 'dead' ? 'Your life and your quest end here.' : outcome === 'win' ? 'The way is clear.' : 'You are away.', 1800);
  await fade(1, 800);
  field.remove(foeRig.g); foeRig = null;
  mode = 'book'; hud.root.hidden = true; bloom.strength = 0.4; diving = false;
  if (outcome === 'win') { game.wonCombat(); redraw(); }
  else if (outcome === 'dead') { game.save(); redraw(); }
  await fade(0, 800);
  if (outcome === 'evade') { game.go(c.evade.to, 'You break away from the fight'); await turnPage(); }
}

/* ======================= Frame loop ======================= */
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(table, cam);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.6, 0.9);
const film = new ShaderPass(FilmShader);
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(film); composer.addPass(new OutputPass());

let diving = false;
function resize() {
  const w = window.innerWidth, h = window.innerHeight, aspect = w / h;
  renderer.setSize(w, h, false); composer.setSize(w, h); composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  cam.aspect = bcam.aspect = aspect;
  bcam.fov = aspect < 1 ? 74 : 58;
  cam.updateProjectionMatrix(); bcam.updateProjectionMatrix();
  // pull back until the open book fits
  const half = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const d = Math.max(3.7 / 2 / half, 4.62 / 2 / (half * aspect));
  camHome.copy(camAim).add(new THREE.Vector3(0, 0.9, 0.44).normalize().multiplyScalar(d));
}
window.addEventListener('resize', resize);

const clock = new THREE.Clock();
function frame(now) {
  requestAnimationFrame(frame);
  const t = clock.getElapsedTime();
  [...tweens].forEach((fn) => fn(now));
  film.uniforms.time.value = t;
  hurt *= 0.93; shake *= 0.88; film.uniforms.hurt.value = hurt;

  if (mode === 'book') {
    if (!diving) {
      cam.position.set(camHome.x + camOffset.x + Math.sin(t * 0.21) * 0.03, camHome.y + Math.sin(t * 0.17) * 0.02, camHome.z + camOffset.z);
      cam.lookAt(camAim);
    }
    candles.forEach((c) => {
      const f = 0.86 + Math.sin(t * 11 + c.seed) * 0.05 + Math.sin(t * 23.7 + c.seed * 2) * 0.04 + Math.sin(t * 3.1 + c.seed) * 0.05;
      c.light.intensity = c.power * f;
      c.flame.scale.set(0.34 * (0.92 + f * 0.1), 0.6 * f, 1);
      c.flame.position.x = Math.sin(t * 7 + c.seed) * 0.008;
    });
    const dp = dust.geometry.attributes.position;
    for (let i = 0; i < dp.count; i++) { let y = dp.getY(i) + 0.0012; if (y > 3) y = 0.4; dp.setY(i, y); dp.setX(i, dp.getX(i) + Math.sin(t * 0.4 + i) * 0.0006); }
    dp.needsUpdate = true;
    film.uniforms.dark.value = 0.2;
    renderPass.scene = table; renderPass.camera = cam;
  } else {
    bcam.position.set(Math.sin(t * 0.7) * 0.025 + (Math.random() - 0.5) * shake * 0.22, 1.62 + Math.sin(t * 1.4) * 0.018 + (Math.random() - 0.5) * shake * 0.18, 0);
    bcam.rotation.set(-0.02 + (Math.random() - 0.5) * shake * 0.05, camOffset.x * -0.25, (Math.random() - 0.5) * shake * 0.04);
    torch.intensity = 5 * (0.85 + Math.sin(t * 13) * 0.07 + Math.sin(t * 5.3) * 0.08);
    if (foeRig) { foeRig.update(t); const p = 1 + Math.sin(t * 3) * 0.12; if (!foeRig.dead) foeRig.eyes.forEach((e) => e.scale.setScalar(p)); }
    const ep = embers.geometry.attributes.position;
    for (let i = 0; i < ep.count; i++) { let y = ep.getY(i) + 0.006; if (y > 6) y = 0; ep.setY(i, y); ep.setX(i, ep.getX(i) + Math.sin(t + i) * 0.002); }
    ep.needsUpdate = true;
    film.uniforms.dark.value = 0.3;
    renderPass.scene = field; renderPass.camera = bcam;
  }
  composer.render();
}

/* ======================= Boot ======================= */
const soundBtn = $('#btn-sound');
const soundLabel = () => { soundBtn.textContent = LW.sound.on ? 'Sound on' : 'Sound off'; };
soundBtn.addEventListener('click', () => { LW.setSound(!LW.sound.on); soundLabel(); setDrone(); });
$('#btn-new').addEventListener('click', () => { if (mode === 'book' && !busy) newGame(); });
soundLabel();

Promise.all(['39px "IM Fell English"', 'italic 39px "IM Fell English"', '39px "IM Fell English SC"'].map((f) => document.fonts.load(f))).catch(() => {}).then(async () => {
  resize();
  const resumed = game.load();
  titleMode = !resumed;
  redraw();
  requestAnimationFrame(frame);
  $('#loading').classList.add('gone');
  if (resumed) busy = false; else await newGame();
});
