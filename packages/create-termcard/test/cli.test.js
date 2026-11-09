import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../bin/create-termcard.js', import.meta.url));

test('creates a card from an existing config without questions', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'create-termcard-cli-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'card.config.json'), JSON.stringify({ name: 'Jane Doe', email: 'jane@example.com' }));

  const output = execFileSync(process.execPath, [bin, 'card', '--config', 'card.config.json', '--name', 'janedoe', '--offline'], { cwd: dir, encoding: 'utf8' });
  assert.match(output, /Created card\//);
  const pkg = JSON.parse(readFileSync(join(dir, 'card', 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'janedoe');
  assert.match(pkg.dependencies.termcard, /^\^\d+\.\d+\.\d+$/);
});

test('reports an invalid config clearly', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'create-termcard-cli-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'card.config.json'), JSON.stringify({ email: 'nope' }));
  try {
    execFileSync(process.execPath, [bin, '--config', 'card.config.json'], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
    assert.fail('expected a non-zero exit');
  } catch (error) {
    assert.equal(error.status, 1);
    assert.match(error.stderr, /name: is required/);
  }
});
