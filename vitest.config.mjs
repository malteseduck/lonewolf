// Unit tests for the JavaScript (ADR 0022): tests/js/, run with `npm test`. Node by default; a test file
// that needs a DOM says so with a `// @vitest-environment jsdom` first line.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/js/**/*.test.{js,mjs}'],
    environment: 'node',
  },
});
