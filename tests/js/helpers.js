/* Loading the player's code into a test.

   shared/*.js (but ink.js) are classic scripts that hang functions on a global LW, as the page loads
   them with <script>. loadShared() runs them, in the page's order, in this test's global scope and
   returns that LW. Each call starts from an empty LW, so tests do not leak into one another. */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadShared(...files) {
  globalThis.window = globalThis;
  globalThis.LW = { BOOKS: {} };
  for (const f of files.length ? files : ['core.js', 'rules-series.js']) {
    const file = path.join(ROOT, 'shared', f);
    vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
  }
  return globalThis.LW;
}

/* A dice that gives these Random Numbers in turn (LW.rand10), for fights and draws. */
export function dice(LW, ...rolls) {
  let i = 0;
  LW.rand10 = () => {
    if (i >= rolls.length) throw new Error(`dice: only ${rolls.length} rolls given`);
    return rolls[i++];
  };
}
