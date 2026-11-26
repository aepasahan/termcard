import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { removeCard, REMOVED_MESSAGE } from '../src/index.js';
import { cli } from '../src/cli.js';
import { sink } from './helpers.js';

/** A stand-in for the npm CLI: records calls and answers with the given exit codes. */
function fakeNpm(codes = {}) {
  const calls = [];
  const run = async (args) => (calls.push(args.join(' ')), codes[args[0]] ?? 0);
  return { run, calls };
}

const options = (extra) => ({ stdout: sink(), stderr: sink(), interactive: true, ...extra });

test('removing a card asks for its name, then unpublishes every version', async () => {
  const npm = fakeNpm();
  const io = options({ run: npm.run, ask: async () => 'jane' });
  assert.equal(await removeCard('jane', io), 0);
  assert.deepEqual(npm.calls, ['whoami', 'unpublish jane --force']);
  assert.match(io.stdout.output, /every version[\s\S]*not touched[\s\S]*✓ jane was removed/);
});

test('a wrong confirmation or a non-interactive run without --yes removes nothing', async () => {
  const npm = fakeNpm();
  assert.equal(await removeCard('jane', options({ run: npm.run, ask: async () => 'jan' })), 1);
  const quiet = options({ run: npm.run, interactive: false });
  assert.equal(await removeCard('jane', quiet), 1);
  assert.match(quiet.stderr.output, /--yes/);
  assert.deepEqual(npm.calls, []);
  assert.equal(await removeCard('Not Valid', options({ run: npm.run, yes: true })), 2);
});

test('when npm refuses to unpublish, the card is deprecated as removed', async () => {
  const npm = fakeNpm({ unpublish: 1 });
  const io = options({ run: npm.run, yes: true });
  assert.equal(await removeCard('jane', io), 0);
  assert.deepEqual(npm.calls, ['whoami', 'unpublish jane --force', `deprecate jane ${REMOVED_MESSAGE}`]);
  assert.match(io.stdout.output, /marked as removed[\s\S]*npmjs\.com\/support/);

  const failing = fakeNpm({ unpublish: 1, deprecate: 1 });
  assert.equal(await removeCard('jane', options({ run: failing.run, yes: true })), 1);
});

test('termcard remove reads the card name from package.json in the current folder', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'termcard-remove-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: '@studio/jane' }));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const npm = fakeNpm();
    const io = { stdout: sink(), stderr: sink(), npm: npm.run };
    assert.equal(await cli(['remove', '--yes'], io), 0);
    assert.deepEqual(npm.calls, ['whoami', 'unpublish @studio/jane --force']);
    const empty = mkdtempSync(join(tmpdir(), 'termcard-remove-'));
    process.chdir(empty);
    const none = { stdout: sink(), stderr: sink(), npm: npm.run };
    assert.equal(await cli(['remove'], none), 2);
    assert.match(none.stderr.output, /card's folder/);
  } finally {
    process.chdir(cwd);
  }
});

test('termcard demo opens a sample card', async () => {
  const io = { stdout: sink(), stderr: sink() };
  assert.equal(await cli(['demo', '--lang', 'de'], io), 0);
  assert.match(io.stdout.output, /A D A[\s\S]*Mathematikerin/);
});
