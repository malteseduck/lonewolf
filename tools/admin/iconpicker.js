/* The icon picker of the item and icon sheets (items.html, icons.html; ADR 0021): one of the icons in
   assets/icons/, or one from game-icons.net's whole set (fetched when saved). The page says what to do
   with the choice. Styles in icons.css. */

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const icon = (name, cls = 'bare') => `<span class="${cls}"><i style="--g:url(/assets/icons/${encodeURIComponent(name)}.svg)"></i></span>`;
const remoteIcon = (path) => `<span class="bare"><i style="--g:url(/api/admin/icons/preview?path=${encodeURIComponent(path)})"></i></span>`;

const $ = (s) => document.querySelector(s);
let dlg = null;
// opts: {title, now (its glyph), hint, local: [{name, author}], usedBy(glyph): [names], save(sel): '' or an error}
const ed = { opts: null, tab: 'local', sel: null, remote: null };

function build() {
  document.body.insertAdjacentHTML('beforeend', `<dialog id="ed">
  <div class="head">
    <h2 id="ed-title"></h2>
    <div class="pair"><figure id="ed-now"></figure><span>&rarr;</span><figure id="ed-new"></figure></div>
  </div>
  <div class="tabs" role="tablist">
    <button role="tab" data-tab="local" aria-selected="true">On this PC</button>
    <button role="tab" data-tab="remote" aria-selected="false">game-icons.net</button>
  </div>
  <div class="bar">
    <input type="search" id="ed-q" placeholder="Filter by name (key, jar, scroll...)" aria-label="Filter icons">
    <select id="ed-who" aria-label="Author"></select>
    <span class="count" id="ed-n"></span>
  </div>
  <div class="grid" id="ed-grid"></div>
  <menu>
    <span class="sp" id="ed-hint"></span>
    <span class="err" id="ed-err"></span>
    <button id="ed-cancel">Cancel</button>
    <button id="ed-save" disabled>Use this icon</button>
  </menu>
</dialog>`);
  dlg = $('#ed');
  document.querySelectorAll('#ed .tabs button').forEach((b) => { b.onclick = () => tab(b.dataset.tab); });
  $('#ed-q').addEventListener('input', () => ed.tab === 'remote' && !ed.remote ? null : grid());
  $('#ed-who').addEventListener('change', grid);
  $('#ed-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.it');
    if (!b) return;
    ed.sel = b.dataset.remote ? { remote: b.dataset.remote } : { name: b.dataset.name };
    document.querySelectorAll('#ed .it.sel').forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel');
    showNew();
  });
  $('#ed-grid').addEventListener('dblclick', (e) => { if (e.target.closest('.it') && !$('#ed-save').disabled) save(); });
  $('#ed-cancel').onclick = () => dlg.close();
  $('#ed-save').onclick = save;
}

export function pickIcon(opts) {
  if (!dlg) build();
  ed.opts = opts; ed.sel = null;
  $('#ed-title').textContent = opts.title;
  $('#ed-now').innerHTML = `${icon(opts.now)}<span>now: ${esc(opts.now)}</span>`;
  $('#ed-hint').textContent = opts.hint || '';
  $('#ed-err').textContent = '';
  $('#ed-q').value = '';
  showNew();
  tab(ed.tab);
  dlg.showModal();
  $('#ed-q').focus();
}
export const pickerOpen = () => !!dlg?.open;

function showNew() {
  const s = ed.sel;
  $('#ed-new').innerHTML = s ? `${s.remote ? remoteIcon(s.remote) : icon(s.name)}<span>${esc(s.remote || s.name)}</span>` : '<span class="bare"></span><span>pick one below</span>';
  $('#ed-save').disabled = !s || (!s.remote && s.name === ed.opts.now);
  $('#ed-save').textContent = s?.remote ? 'Fetch and use this icon' : 'Use this icon';
}
async function tab(t) {
  ed.tab = t;
  document.querySelectorAll('#ed .tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  let who;
  if (t === 'remote') {
    if (!ed.remote) {
      $('#ed-grid').textContent = 'Asking game-icons.net for its list...';
      const r = await fetch('/api/admin/icons/remote', { cache: 'no-store' }).catch(() => null);
      const j = r ? await r.json().catch(() => ({})) : {};
      if (!r || !r.ok) { $('#ed-grid').textContent = `No list: ${j.error || 'the server did not answer'}`; return; }
      ed.remote = j;
    }
    who = [...new Set(ed.remote.paths.map((p) => p.split('/')[0]))];
  } else who = [...new Set(ed.opts.local.map((i) => i.author).filter(Boolean))].sort();
  $('#ed-who').innerHTML = '<option value="">Every author</option>' + who.map((w) => `<option>${esc(w)}</option>`).join('');
  grid();
}
function grid() {
  const q = $('#ed-q').value.trim().toLowerCase(), who = $('#ed-who').value, { local, usedBy } = ed.opts;
  let hits, html;
  if (ed.tab === 'local') {
    // by name, or by what shows it (filter "jar" finds the icons the jars use)
    hits = local.filter((i) => (!who || i.author === who) && (!q || i.name.includes(q) || usedBy(i.name).some((n) => n.toLowerCase().includes(q))));
    html = hits.slice(0, 400).map((i) => {
      const users = usedBy(i.name), n = users.length;
      return `<button class="it ${ed.sel && !ed.sel.remote && ed.sel.name === i.name ? 'sel' : ''}" data-name="${esc(i.name)}" title="${esc(i.name + (n ? '\n' + users.join(', ') : ''))}">
        ${icon(i.name)}<span>${esc(i.name)}</span><span class="who">${n ? `${n} use${n > 1 ? 's' : ''}` : 'unused'}</span></button>`;
    }).join('');
  } else {
    const here = new Set(local.map((i) => `${i.author}/${i.name}`));
    hits = ed.remote.paths.filter((p) => (!who || p.startsWith(who + '/')) && (!q || p.split('/')[1].includes(q)));
    html = hits.slice(0, 240).map((p) => `<button class="it ${ed.sel?.remote === p ? 'sel' : ''}" data-remote="${esc(p)}" title="${esc(p)}">
        ${remoteIcon(p)}<span>${esc(p.split('/')[1])}</span><span class="${here.has(p) ? 'here' : 'who'}">${here.has(p) ? 'on this PC' : esc(p.split('/')[0])}</span></button>`).join('');
  }
  const cap = ed.tab === 'local' ? 400 : 240;
  $('#ed-n').textContent = `${hits.length} of ${ed.tab === 'local' ? local.length : ed.remote.paths.length}` + (ed.tab === 'remote' ? ` (list of ${ed.remote.fetched})` : '');
  $('#ed-grid').innerHTML = html + (hits.length > cap ? `<p class="count">${hits.length - cap} more: filter to narrow.</p>` : '') || '<p class="count">None.</p>';
}
async function save() {
  $('#ed-save').disabled = true;
  try {
    const err = await ed.opts.save(ed.sel);
    if (err) $('#ed-err').textContent = err;
    else dlg.close();
  } finally { showNew(); }
}
