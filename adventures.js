/* Adventures and their backups, as kept in storage (docs/reference/architecture.md, Storage). Each
   adventure is a game of its own: a save for every book, and the Lone Wolf it carries between them.
   lw-adventures lists them, which one is open, and the last book each had open. `store` is
   localStorage behind try/catch (main.js); nothing here touches the page. */

export const saveKey = (a, id) => `lw-a${a}-save-${id}`, charKey = (a) => `lw-a${a}-character`;

export function loadAdventures(store) {
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
/* a new adventure takes the highest id plus one */
export const nextId = (list) => String(Math.max(0, ...list.map((a) => +a.id)) + 1);
/* forgetting an adventure removes every lw-a<n>-* key */
export const forgetKeys = (store, id) => store.keys().filter((k) => k.startsWith(`lw-a${id}-`)).forEach(store.del);

/* backups: an adventure's whole state (its list entry and every lw-a<n>-* key) as JSON, named
   <name>.<yyyy>.<mm>.<dd>.<hh>.<mm>.json (local time, 24-hour). tools/serve.py keeps them in the project's backups/ folder (a page
   cannot write to disk by itself); served any other way, the file is downloaded instead. */
export function backupOf(store, list, id, now = new Date()) {
  const a = list.find((x) => x.id === id), keys = {};
  store.keys().filter((k) => k.startsWith(`lw-a${id}-`)).sort().forEach((k) => { const v = store.get(k); try { keys[k] = JSON.parse(v); } catch (e) { keys[k] = v; } });
  return { kind: 'lone-wolf adventure backup', version: 1, made: now.toISOString(), adventure: { ...a }, keys };
}
/* label: the adventure's name, or "Adventure II" */
export function backupName(label, id, d = new Date()) {
  const two = (n) => String(n).padStart(2, '0');
  const name = label.replace(/[\\/:*?"<>|\x00-\x1f]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '') || `adventure ${id}`;
  return `${name}.${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())}.${two(d.getHours())}.${two(d.getMinutes())}.json`;
}
/* backups made with the PC out of reach wait here (lw-pending-backups: [{name, text}]) and are sent
   when it is next in reach; a newer one of the same name replaces the one waiting */
export const pending = (store) => { try { return JSON.parse(store.get('lw-pending-backups')) || []; } catch (e) { return []; } };
export const keepPending = (store, list) => (list.length ? store.set('lw-pending-backups', JSON.stringify(list)) : store.del('lw-pending-backups'));

/* A backup file read back: refused unless it is a version-1 backup holding one adventure's keys. */
export function parseBackup(text, file) {
  let b = null;
  try { b = JSON.parse(text); } catch (e) { /* told below */ }
  if (!b || b.kind !== 'lone-wolf adventure backup' || b.version !== 1 || !b.adventure || !b.keys || typeof b.keys !== 'object') throw new Error(`${file} is not an adventure backup`);
  const from = `lw-a${b.adventure.id}-`;
  if (Object.keys(b.keys).some((k) => !k.startsWith(from))) throw new Error(`${file} holds keys of another adventure`);
  return { file, b, from };
}
/* Adventure a's keys replaced by the backup's, renumbered to a's id; its last book (if that book is
   in `books`) and its name come from the backup. The caller keeps the list. */
export function putBackup(store, a, { b, from }, books) {
  forgetKeys(store, a.id);
  Object.entries(b.keys).forEach(([k, v]) => store.set(`lw-a${a.id}-` + k.slice(from.length), typeof v === 'string' ? v : JSON.stringify(v)));
  a.book = b.adventure.book && books[b.adventure.book] ? b.adventure.book : null;
  if (b.adventure.name) a.name = String(b.adventure.name).slice(0, 40);
}
