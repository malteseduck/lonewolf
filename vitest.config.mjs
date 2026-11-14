// Unit tests for the JavaScript (ADR 0022): tests/js/, run with `npm test`. Node by default; a test file
// that needs a DOM says so with a `// @vitest-environment jsdom` first line.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/js/**/*.test.{js,mjs}'],
    environment: 'node',
    // worker threads start far faster than processes on Windows; each file still gets its own fresh
    // globals (LW, window) and modules, and writes only to its own mkdtemp folder, so files cannot meet
    pool: 'threads',
    isolate: true,
    execArgv: ['--experimental-vm-modules', '--no-warnings'],  // parse.test.js compiles ES modules
  },
});
