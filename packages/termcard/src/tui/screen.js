/**
 * Redraws a block of lines in place below whatever is already on screen,
 * instead of clearing the terminal (which leaves empty space in some terminals).
 * Heights are counted in screen rows, so lines that wrap are handled correctly.
 */

import { displayWidth, stripAnsi } from '../text.js';

/** Number of screen rows `lines` occupy in a terminal `columns` wide. */
export function rowsFor(lines, columns) {
  if (!columns) return lines.length;
  return lines.reduce((rows, line) => rows + Math.max(1, Math.ceil(displayWidth(stripAnsi(line)) / columns)), 0);
}

export class Screen {
  constructor(stream) {
    this.stream = stream;
    this.height = 0;
  }

  rows(lines) {
    return rowsFor(lines, this.stream.columns);
  }

  /** Writes lines below the current block without replacing it (e.g. the card). */
  print(lines) {
    this.stream.write(`${lines.join('\n')}\n`);
    return this.rows(lines);
  }

  /** Replaces the previously painted block with `lines`. */
  paint(lines) {
    const up = this.height ? `\x1b[${this.height}A` : '';
    this.stream.write(`${up}\r\x1b[J${lines.join('\n')}\n`);
    this.height = this.rows(lines);
  }

  /** Erases the painted block plus `extra` rows above it (or the whole screen if they scrolled away). */
  clear(extra = 0) {
    const total = this.height + extra;
    if (!total) return;
    const visible = !this.stream.rows || total < this.stream.rows;
    this.stream.write(visible ? `\x1b[${total}A\r\x1b[J` : '\x1b[2J\x1b[H');
    this.height = 0;
  }

  hideCursor() {
    this.stream.write('\x1b[?25l');
  }

  showCursor() {
    this.stream.write('\x1b[?25h');
  }
}
