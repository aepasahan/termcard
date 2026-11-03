import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../src/', import.meta.url));

/** Follows relative imports from a module and returns every file reached. */
function moduleGraph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const code = readFileSync(entry, 'utf8');
  for (const [, spec] of code.matchAll(/^(?:import|export)[^'"]*from\s+'([^']+)'/gm)) {
    if (spec.startsWith('.')) moduleGraph(resolve(dirname(entry), spec), seen);
  }
  return seen;
}

test('the browser entry never reaches Node.js built-ins', () => {
  for (const file of moduleGraph(join(src, 'browser.js'))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /from\s+'node:/, file);
  }
});

test('menu labels can be built without system access (web previews)', async () => {
  const { normalizeConfig, buildMenu, createTranslator } = await import('../src/browser.js');
  const config = normalizeConfig({ name: 'A', email: 'a@b.co', icons: 'symbols' });
  const entries = buildMenu(config, 'en', createTranslator('en'));
  assert.deepEqual(entries.map((e) => [e.icon, e.label]).slice(0, 2), [['✉', 'Get in touch'], ['+', 'Save contact']]);
  assert.equal((await entries[0].run()).ok, false);
});
