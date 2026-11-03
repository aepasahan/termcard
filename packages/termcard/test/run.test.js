import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/index.js';
import { make, sink } from './helpers.js';

const io = (argv) => ({ argv, env: {}, stdin: { isTTY: false }, stdout: sink(), stderr: sink() });

test('non-interactive output prints the card without escape codes', async () => {
  const options = io([]);
  assert.equal(await run(make(), options), 0);
  assert.match(options.stdout.output, /J A N E/);
  assert.ok(!options.stdout.output.includes('\x1b'));
});

test('--lang, --json and --vcard', async () => {
  const tr = io(['--lang', 'tr']);
  await run(make(), tr);
  assert.match(tr.stdout.output, /E-posta/);

  const json = io(['--json']);
  await run(make(), json);
  assert.equal(JSON.parse(json.stdout.output).name, 'Jane Doe');

  const vcard = io(['--vcard']);
  await run(make(), vcard);
  assert.match(vcard.stdout.output, /^BEGIN:VCARD/);
});

test('unknown flags exit with code 2 and show usage', async () => {
  const options = io(['--nope']);
  assert.equal(await run(make(), options), 2);
  assert.match(options.stderr.output, /Usage:/);
});

test('a menu whose items all lack data falls back to the plain card', async () => {
  const options = { argv: [], env: {}, stdin: { isTTY: true, setRawMode() { throw new Error('should not go interactive'); } }, stdout: sink({ isTTY: true }), stderr: sink() };
  assert.equal(await run(make({ email: undefined, menu: { items: ['contact', 'copy-email'] } }), options), 0);
  assert.match(options.stdout.output, /J A N E/);
});
