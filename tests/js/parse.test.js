/* Every script of ours parses, including those no other test loads (sw.js); not the historical
   prototypes or the shared files only they use (ADR 0002). An ES module
   is compiled as one (vm.SourceTextModule, which needs --experimental-vm-modules: vitest.config.mjs),
   so a const declared twice is caught, as a classic-script parse would miss it. */
import { describe, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { ROOT } from './helpers.js';

const SKIP = new Set(['data', 'art', 'node_modules', 'backups', '.git', '.venv', '.venv-paddle', '.vitest', 'release', 'realesrgan', '.claude', 'tests', 'prototypes']);
const HISTORICAL = new Set(['shared/art.js', 'shared/battle.js', 'shared/flow.js', 'shared/book-demo.js']);
const MODULE = /^\s*(?:import\s[\s\S]*?from\s|import\s*['"(]|export\s)/m;

function scripts(dir = ROOT) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (SKIP.has(e.name) ? [] : scripts(path.join(dir, e.name)))
      : /\.m?js$/.test(e.name) ? [path.join(dir, e.name)] : []);
}

describe('every script parses', () => {
  for (const file of scripts()) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (HISTORICAL.has(rel)) continue;
    it(rel, () => {
      const src = fs.readFileSync(file, 'utf8');
      if (file.endsWith('.mjs') || MODULE.test(src)) new vm.SourceTextModule(src, { identifier: rel });
      else new vm.Script(src, { filename: rel });
    });
  }
});
