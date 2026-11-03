/**
 * Redraws a block of lines in place below whatever is already on screen,
 * instead of clearing the terminal (which leaves empty space in some terminals).
 */
export class Screen {
  constructor(stream) {
    this.stream = stream;
    this.height = 0;
  }

  /** Replaces the previously painted block with `lines`. */
  paint(lines) {
    const up = this.height ? `\x1b[${this.height}A` : '';
    this.stream.write(`${up}\r\x1b[J${lines.join('\n')}\n`);
    this.height = lines.length;
  }

  clear() {
    if (this.height) this.stream.write(`\x1b[${this.height}A\r\x1b[J`);
    this.height = 0;
  }

  /** Whether `extra` more lines can be redrawn without scrolling out of view. */
  fits(extra) {
    return !this.stream.rows || this.height + extra < this.stream.rows;
  }

  hideCursor() {
    this.stream.write('\x1b[?25l');
  }

  showCursor() {
    this.stream.write('\x1b[?25h');
  }
}
