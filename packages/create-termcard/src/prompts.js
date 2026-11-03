/**
 * Minimal, dependency-free terminal prompts: text, confirm, select, multiselect.
 * Ctrl+C at any prompt rejects with a `CancelledError`.
 */

import readline from 'node:readline';

export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelledError';
  }
}

const c = (code) => (text) => (process.stdout.isTTY && !('NO_COLOR' in process.env) ? `\x1b[${code}m${text}\x1b[0m` : text);
export const style = { accent: c('38;5;179'), muted: c('38;5;245'), faint: c('38;5;240'), bold: c('1'), red: c('38;5;174') };

const io = { input: process.stdin, output: process.stdout };

/** Free-text question. `validate` returns an error message or undefined. */
export function text({ message, initial = '', hint = '', validate = () => undefined }) {
  return new Promise((resolve, reject) => {
    const ask = () => {
      const rl = readline.createInterface({ ...io, terminal: true });
      let answered = false;
      rl.on('SIGINT', () => { rl.close(); reject(new CancelledError()); });
      rl.on('close', () => { if (!answered) reject(new CancelledError()); });
      const suffix = initial ? style.faint(` (${initial})`) : hint ? style.faint(` (${hint})`) : '';
      rl.question(`${style.accent('?')} ${style.bold(message)}${suffix} `, (answer) => {
        answered = true;
        rl.close();
        const value = answer.trim() || initial;
        const error = validate(value);
        if (error) {
          process.stdout.write(`  ${style.red(error)}\n`);
          return ask();
        }
        resolve(value);
      });
    };
    ask();
  });
}

export async function confirm({ message, initial = true }) {
  const answer = await text({ message, hint: initial ? 'Y/n' : 'y/N', validate: (v) => (v && !/^(y|yes|n|no)$/i.test(v) ? 'Please answer y or n' : undefined) });
  return answer ? /^y/i.test(answer) : initial;
}

/** Arrow-key list. Each choice: { label, value, hint? }. */
export function select({ message, choices, initial = 0, multiple = false, selected = [] }) {
  const { input, output } = io;
  let index = initial;
  const picked = new Set(selected);
  let height = 0;

  const draw = (done = false) => {
    const lines = [`${style.accent(done ? '✓' : '?')} ${style.bold(message)}${multiple && !done ? style.faint('  space to toggle, enter to confirm') : ''}`];
    if (done) {
      const value = multiple ? choices.filter((ch) => picked.has(ch.value)).map((ch) => ch.label).join(', ') : choices[index].label;
      lines[0] += ` ${style.muted(value)}`;
    } else {
      for (const [i, ch] of choices.entries()) {
        const mark = multiple ? (picked.has(ch.value) ? style.accent('◉ ') : style.faint('◯ ')) : '';
        const label = i === index ? `${style.accent('›')} ${mark}${style.bold(ch.label)}` : `  ${mark}${style.muted(ch.label)}`;
        lines.push(`  ${label}${ch.hint && i === index ? style.faint(`  ${ch.hint}`) : ''}`);
      }
    }
    output.write(`${height ? `\x1b[${height}A` : ''}\r\x1b[J${lines.join('\n')}\n`);
    height = lines.length;
  };

  return new Promise((resolve, reject) => {
    readline.emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    output.write('\x1b[?25l');

    const finish = (fn) => {
      input.off('keypress', onKey);
      input.setRawMode(false);
      input.pause();
      output.write('\x1b[?25h');
      fn();
    };
    function onKey(str, key = {}) {
      if (key.ctrl && key.name === 'c') return finish(() => reject(new CancelledError()));
      if (key.name === 'up' || key.name === 'k') index = (index - 1 + choices.length) % choices.length;
      else if (key.name === 'down' || key.name === 'j' || key.name === 'tab') index = (index + 1) % choices.length;
      else if (multiple && key.name === 'space') {
        const v = choices[index].value;
        if (picked.has(v)) picked.delete(v);
        else picked.add(v);
      } else if (key.name === 'return') {
        if (multiple && !picked.size) picked.add(choices[index].value);
        draw(true);
        return finish(() => resolve(multiple ? choices.filter((ch) => picked.has(ch.value)).map((ch) => ch.value) : choices[index].value));
      }
      draw();
    }
    draw();
    input.on('keypress', onKey);
  });
}

export const multiselect = (options) => select({ ...options, multiple: true });
