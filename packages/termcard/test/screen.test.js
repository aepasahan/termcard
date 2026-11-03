import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowsFor } from '../src/tui/screen.js';

test('wrapped lines count as several screen rows', () => {
  assert.equal(rowsFor(['abc', '', 'x'.repeat(25)], 10), 1 + 1 + 3);
  assert.equal(rowsFor(['\x1b[1mabcdefghij\x1b[0m'], 10), 1, 'escape codes take no space');
  assert.equal(rowsFor(['a', 'b'], undefined), 2);
});
