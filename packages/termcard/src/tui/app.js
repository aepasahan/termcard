/**
 * Interactive card: the card itself plus a keyboard-driven menu below it.
 *
 * Below the card sits a stack of views. The main menu is always at the bottom; choosing an
 * entry may open another view on top (the language picker, a section's list, a QR code), and
 * esc / ← / backspace goes back one view. Every view is the same shape:
 *   { title?, lines?, entries: [{ icon?, label, hint, run? }], index }
 * (a list's `text`, such as an address, is wrapped into `lines`)
 * so a new kind of screen needs a view builder here, not a new code path through the keys.
 */

import readline from 'node:readline';
import { createTranslator, languageName } from '../i18n/index.js';
import { layoutCard, layoutHeader } from '../render/card.js';
import { toAnsi, createPainter } from '../render/format.js';
import { CREDIT_TEXT } from '../render/credit.js';
import { qrLines } from '../render/qr.js';
import { displayWidth, stripAnsi, wrap } from '../text.js';
import { buildMenu } from './actions.js';
import * as system from '../system.js';
import { Screen } from './screen.js';

export function runInteractive(config, { lang: initialLang, depth, stdin, stdout }) {
  const paint = createPainter(config.theme, depth);
  const screen = new Screen(stdout);
  const state = { lang: initialLang, stack: [], status: null };
  let card = [];
  let cardRows = 0;
  let t;

  const view = () => state.stack.at(-1);

  const load = () => {
    t = createTranslator(state.lang, config.strings);
    const top = config.card.enabled ? layoutCard(config, state.lang) : layoutHeader(config, state.lang);
    card = ['', ...toAnsi(top, config.theme, depth).split('\n')];
  };

  const mainView = (index = 0) => ({ kind: 'main', entries: buildMenu(config, state.lang, t, system), index });
  const backEntry = () => ({ label: t('action.back'), hint: t('hint.back'), back: true });

  /** Builds a view from what a menu entry asked to open. */
  const openView = (spec) => {
    if (spec.kind === 'language') {
      return {
        kind: 'language',
        entries: [
          ...config.language.available.map((code) => ({
            label: `${languageName(code, config.strings)}${code === state.lang ? `  ${paint('accent', '✓')}` : ''}`,
            hint: '',
            code,
          })),
          backEntry(),
        ],
        index: Math.max(0, config.language.available.indexOf(state.lang)),
      };
    }
    if (spec.kind === 'list') {
      // A list may open with a paragraph (an address), wrapped to the terminal.
      const width = Math.min(60, (stdout.columns || 80) - 6);
      const lines = spec.text ? wrap(spec.text, width).map((line) => paint('strong', line)) : [];
      return { kind: 'list', title: spec.title, lines, entries: [...spec.items, backEntry()], index: 0 };
    }
    if (spec.kind === 'qr') return { kind: 'qr', title: spec.title, lines: qrLines({ modules: spec.modules }, { depth }), entries: [backEntry()], index: 0, hint: spec.hint };
    throw new Error(`Unknown view: ${spec.kind}`);
  };

  const ruleWidth = () => Math.max(40, ...card.map((l) => displayWidth(stripAnsi(l)) - 2));

  /** Keeps a line of plain text within the terminal width so it never wraps. */
  const fit = (text) => {
    const max = (stdout.columns || 80) - 4;
    if (displayWidth(text) <= max) return text;
    let out = '';
    for (const ch of text) {
      if (displayWidth(out + ch) > max - 1) break;
      out += ch;
    }
    return `${out}…`;
  };

  const menuLines = () => {
    const { entries, index, title, lines = [], hint } = view();
    const current = entries[index];
    const iconWidth = Math.max(0, ...entries.map((e) => displayWidth(e.icon ?? '')));
    const keys = [['↑↓', t('keys.navigate')], ['enter', t('keys.select')], ...(state.stack.length > 1 ? [['esc', t('keys.back')]] : []), ['q', t('keys.quit')]]
      .map(([key, word]) => `${paint('muted', key)} ${paint('faint', word)}`)
      .join(paint('faint', '   ·   '));
    const status = state.status
      ? `${paint(state.status.ok ? 'accent' : 'muted', state.status.ok ? '✓' : '•')} ${paint('muted', fit(state.status.text))}`
      : paint('faint', fit((current?.back && hint) || current?.hint || ''));
    return [
      '',
      ...(title ? [`  ${paint('accent', fit(title))}`, ''] : []),
      ...lines.map((line) => `  ${line}`),
      ...(lines.length ? [''] : []),
      ...entries.map((e, i) => {
        const glyph = iconWidth ? paint('accent', (e.icon ?? '') + ' '.repeat(iconWidth - displayWidth(e.icon ?? '') + 1)) : '';
        return i === index ? `  ${paint('accent', '›')} ${glyph}${paint('strong', e.label)}` : `    ${glyph}${paint('muted', e.label)}`;
      }),
      '',
      `  ${paint('faint', '─'.repeat(ruleWidth()))}`,
      `  ${status}`,
      `  ${keys}`,
      ...(config.credit ? [`  ${paint('faint', CREDIT_TEXT)}`] : []),
    ];
  };

  const render = () => screen.paint(menuLines());

  const back = () => {
    if (state.stack.length > 1) state.stack.pop();
    state.status = null;
  };

  /** Switches language and redraws the card in place (or from the top if it no longer fits). */
  const switchLanguage = (code) => {
    screen.clear(cardRows);
    state.lang = code;
    load();
    const main = mainView();
    main.index = Math.max(0, main.entries.findIndex((e) => e.id === 'language'));
    state.stack = [main];
    state.status = { ok: true, text: t('status.language') };
    cardRows = screen.print(card);
    render();
  };

  return new Promise((resolve) => {
    let busy = false;
    let closed = false;

    const cleanup = () => {
      stdin.off('keypress', onKey);
      if (stdin.isTTY) stdin.setRawMode(false);
      stdin.pause();
      screen.showCursor();
    };
    const quit = () => {
      if (closed) return;
      closed = true;
      screen.clear();
      stdout.write('\n');
      cleanup();
      resolve();
    };

    const select = async () => {
      const current = view();
      const entry = current.entries[current.index];
      if (entry.back) return back(), render();
      if (entry.code) {
        if (entry.code !== state.lang) return switchLanguage(entry.code);
        return back(), render();
      }
      if (!entry.run) return;
      busy = true;
      const outcome = await entry.run();
      busy = false;
      if (closed) return;
      if (outcome.quit) return quit();
      if (outcome.view) {
        state.stack.push(openView(outcome.view));
        state.status = null;
        return render();
      }
      state.status = { ok: outcome.ok, text: outcome.status };
      render();
    };

    async function onKey(str, key = {}) {
      if ((key.ctrl && key.name === 'c') || key.name === 'q') return quit();
      if (busy) return;
      const current = view();
      const count = current.entries.length;
      if (key.name === 'escape' || key.name === 'backspace' || key.name === 'left') {
        if (state.stack.length === 1) return key.name === 'escape' ? quit() : undefined;
        back();
        return render();
      }
      if (key.name === 'up' || key.name === 'k') current.index = (current.index - 1 + count) % count;
      else if (key.name === 'down' || key.name === 'j' || key.name === 'tab') current.index = (current.index + 1) % count;
      else if (/^[1-9]$/.test(str ?? '') && Number(str) <= count) current.index = Number(str) - 1;
      else if (key.name === 'return' || key.name === 'space' || key.name === 'right') return select();
      else return;
      state.status = null;
      render();
    }

    load();
    state.stack = [mainView()];
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    screen.hideCursor();
    process.once('exit', () => screen.showCursor());
    cardRows = screen.print(card);
    render();
    stdin.on('keypress', onKey);
  });
}
