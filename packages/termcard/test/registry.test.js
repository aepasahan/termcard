import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAvailability } from '../src/project/registry.js';

const respond = (status) => async (url) => {
  respond.lastUrl = url;
  return { status, ok: status >= 200 && status < 300 };
};

test('maps registry responses to availability', async () => {
  assert.equal(await checkAvailability('jane', respond(404)), 'available');
  assert.equal(await checkAvailability('jane', respond(200)), 'taken');
  assert.equal(await checkAvailability('jane', respond(503)), 'unknown');
  assert.equal(await checkAvailability('jane', async () => { throw new Error('offline'); }), 'unknown');
});

test('only the encoded package name is sent', async () => {
  await checkAvailability('@jane/card', respond(404));
  assert.equal(respond.lastUrl, 'https://registry.npmjs.org/@jane%2fcard');
});
