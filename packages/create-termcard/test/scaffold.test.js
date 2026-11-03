import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProject, TargetNotEmptyError } from '../src/scaffold.js';

const termcardDir = fileURLToPath(new URL('../../termcard', import.meta.url));
const config = { name: 'Jane Doe', email: 'jane@example.com', links: ['https://github.com/jane'], language: { available: ['en', 'tr'] } };

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'create-termcard-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('creates a runnable card package', (t) => {
  const dir = join(tempDir(t), 'jane');
  const files = createProject({ dir, packageName: '@jane/card', config, termcardVersion: '0.1.0', workflow: true });
  assert.ok(files.includes('.github/workflows/publish.yml'));
  assert.ok(files.includes('.github/README.md'), 'owner notes live where GitHub shows them');

  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.bin, { card: 'bin/card.js' });
  assert.equal(pkg.dependencies.termcard, '^0.1.0');
  assert.deepEqual(pkg.files, ['bin', 'card.config.json'], 'only the card itself is published');
  assert.equal(pkg.license, 'SEE LICENSE IN LICENSE');
  assert.match(readFileSync(join(dir, 'LICENSE'), 'utf8'), /All rights reserved/);
  assert.match(readFileSync(join(dir, 'README.md'), 'utf8'), /npx @jane\/card/);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'card.config.json'), 'utf8')), config);

  // Simulate `npm install` by linking the local termcard package, then run the card.
  mkdirSync(join(dir, 'node_modules'));
  symlinkSync(termcardDir, join(dir, 'node_modules', 'termcard'), 'junction');
  const output = execFileSync(process.execPath, [join(dir, 'bin/card.js'), '--lang', 'tr'], { encoding: 'utf8' });
  assert.match(output, /J A N E/);
  assert.match(output, /E-posta/);
});

test('refuses to write into a non-empty folder', (t) => {
  const dir = tempDir(t);
  writeFileSync(join(dir, 'keep.txt'), 'mine');
  assert.throws(() => createProject({ dir, packageName: 'jane', config, termcardVersion: '0.1.0' }), TargetNotEmptyError);
  assert.equal(readFileSync(join(dir, 'keep.txt'), 'utf8'), 'mine');
});
