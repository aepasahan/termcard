import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCard, UnsafeOutputError } from '../src/index.js';
import { make } from './helpers.js';

test('build writes every format per language plus web page and integrations', (t) => {
  const outDir = mkdtempSync(join(tmpdir(), 'termcard-test-'));
  t.after(() => rmSync(outDir, { recursive: true, force: true }));

  const files = buildCard(make({ tagline: '</script><script>alert(1)</script>' }), { outDir, packageName: 'jane' });
  for (const name of ['card.en.ansi', 'card.tr.txt', 'contact.tr.vcf', 'index.html', 'integrations/cloudflare-worker.js']) {
    assert.ok(files.includes(name), name);
  }

  const html = readFileSync(join(outDir, 'index.html'), 'utf8');
  assert.equal((html.match(/<script>/g) ?? []).length, 1, 'user content must not open a script tag');
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /npx jane/);

  const worker = readFileSync(join(outDir, 'integrations/cloudflare-worker.js'), 'utf8');
  assert.match(worker, /cdn\.jsdelivr\.net\/npm\/jane@latest\/dist/);
});

test('build never empties a folder it did not create', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'termcard-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'card.config.json'), '{}');
  assert.throws(() => buildCard(make(), { outDir: dir }), UnsafeOutputError);
  assert.ok(existsSync(join(dir, 'card.config.json')));

  const out = join(dir, 'dist');
  buildCard(make(), { outDir: out });
  writeFileSync(join(out, 'stale.txt'), 'old');
  buildCard(make(), { outDir: out }); // a previous build may be replaced
  assert.ok(!existsSync(join(out, 'stale.txt')));
});
