import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowsFor } from '../src/tui/screen.js';

test('wrapped lines count as several screen rows', () => {
  assert.equal(rowsFor(['abc', '', 'x'.repeat(25)], 10), 1 + 1 + 3);
  assert.equal(rowsFor(['\x1b[1mabcdefghij\x1b[0m'], 10), 1, 'escape codes take no space');
  assert.equal(rowsFor(['a', 'b'], undefined), 2);
});

test('a full-window view uses the alternate screen and leaves the card untouched', async () => {
  const { Screen } = await import('../src/tui/screen.js');
  const out = [];
  const stream = { columns: 80, rows: 24, write: (s) => out.push(s) };
  const screen = new Screen(stream);
  screen.paint(['menu', 'entries']);
  screen.enterAlternate();
  screen.paint(Array.from({ length: 40 }, () => 'qr'));
  assert.ok(out.at(-2).startsWith('\x1b[?1049h'), 'switches to the alternate screen');
  assert.ok(out.at(-1).startsWith('\x1b[H\x1b[2J'), 'draws from the top of the window');
  screen.leaveAlternate();
  assert.equal(out.at(-1), '\x1b[?1049l');
  screen.paint(['menu']);
  assert.ok(out.at(-1).startsWith('\x1b[2A\r\x1b[J'), 'repaints the menu where it was');
});

test('a block taller than the window is redrawn instead of erased with the cursor', async () => {
  const { Screen } = await import('../src/tui/screen.js');
  const out = [];
  const screen = new Screen({ columns: 80, rows: 10, write: (s) => out.push(s) });
  screen.paint(Array.from({ length: 12 }, () => 'x'));
  screen.paint(['short']);
  assert.ok(out.at(-1).startsWith('\x1b[H\x1b[2J'), out.at(-1));
});
