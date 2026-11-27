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
    this.alternate = null; // the main screen's block height while the alternate screen is shown
  }

  rows(lines) {
    return rowsFor(lines, this.stream.columns);
  }

  /** Writes lines below the current block without replacing it (e.g. the card). */
  print(lines) {
    this.stream.write(`${lines.join('\n')}\n`);
    return this.rows(lines);
  }

  /**
   * Replaces the previously painted block with `lines`. A block taller than the window has
   * partly scrolled away and cannot be reached with the cursor, so the window is redrawn instead.
   */
  paint(lines) {
    const unreachable = this.alternate !== null || (this.stream.rows && this.height >= this.stream.rows);
    const start = unreachable ? '\x1b[H\x1b[2J' : `${this.height ? `\x1b[${this.height}A` : ''}\r\x1b[J`;
    this.stream.write(`${start}${lines.join('\n')}\n`);
    this.height = this.rows(lines);
  }

  /**
   * Shows a full-window view (a QR code) on the terminal's alternate screen, like `less` or an
   * editor does, so it never scrolls the card away; leaving restores the card and menu untouched.
   */
  enterAlternate() {
    if (this.alternate !== null) return;
    this.alternate = this.height;
    this.stream.write('\x1b[?1049h\x1b[H\x1b[2J');
    this.height = 0;
  }

  leaveAlternate() {
    if (this.alternate === null) return;
    this.stream.write('\x1b[?1049l');
    this.height = this.alternate;
    this.alternate = null;
  }

  /** Erases the painted block plus `extra` rows above it (or the whole screen if they scrolled away). */
  clear(extra = 0) {
    this.leaveAlternate();
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
