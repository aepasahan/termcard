/** Interactive card: the card itself plus a keyboard-driven menu below it. */

import readline from 'node:readline';
import { createTranslator, languageName } from '../i18n/index.js';
import { layoutCard, layoutHeader } from '../render/card.js';
import { toAnsi, createPainter } from '../render/format.js';
import { displayWidth, stripAnsi } from '../text.js';
import { buildMenu } from './actions.js';
import * as system from '../system.js';
import { Screen } from './screen.js';

export function runInteractive(config, { lang: initialLang, depth, stdin, stdout }) {
  const paint = createPainter(config.theme, depth);
  const screen = new Screen(stdout);
  const state = { lang: initialLang, view: 'main', index: 0, status: null };
  let card = [];
  let cardRows = 0;
  let t;
  let menu;

  const load = () => {
    t = createTranslator(state.lang, config.strings);
    menu = buildMenu(config, state.lang, t, system);
    const top = config.card.enabled ? layoutCard(config, state.lang) : layoutHeader(config, state.lang);
    card = ['', ...toAnsi(top, config.theme, depth).split('\n')];
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

  const entries = () =>
    state.view === 'language'
      ? [
          ...config.language.available.map((code) => ({
            label: `${languageName(code, config.strings)}${code === state.lang ? `  ${paint('accent', '✓')}` : ''}`,
            hint: '',
            code,
          })),
          { label: t('action.back'), hint: t('hint.back'), back: true },
        ]
      : menu;

  const menuLines = () => {
    const list = entries();
    const current = list[state.index];
    const iconWidth = Math.max(0, ...list.map((e) => displayWidth(e.icon ?? '')));
    const keys = [['↑↓', t('keys.navigate')], ['enter', t('keys.select')], ...(state.view === 'language' ? [['esc', t('keys.back')]] : []), ['q', t('keys.quit')]]
      .map(([key, word]) => `${paint('muted', key)} ${paint('faint', word)}`)
      .join(paint('faint', '   ·   '));
    const status = state.status
      ? `${paint(state.status.ok ? 'accent' : 'muted', state.status.ok ? '✓' : '•')} ${paint('muted', fit(state.status.text))}`
      : paint('faint', fit(current?.hint ?? ''));
    return [
      '',
      ...list.map((e, i) => {
        const glyph = iconWidth ? paint('accent', (e.icon ?? '') + ' '.repeat(iconWidth - displayWidth(e.icon ?? '') + 1)) : '';
        return i === state.index ? `  ${paint('accent', '›')} ${glyph}${paint('strong', e.label)}` : `    ${glyph}${paint('muted', e.label)}`;
      }),
      '',
      `  ${paint('faint', '─'.repeat(ruleWidth()))}`,
      `  ${status}`,
      `  ${keys}`,
    ];
  };

  const render = () => screen.paint(menuLines());

  /** Switches language and redraws the card in place (or from the top if it no longer fits). */
  const switchLanguage = (code) => {
    screen.clear(cardRows);
    state.lang = code;
    load();
    showMain({ ok: true, text: t('status.language') });
    cardRows = screen.print(card);
    render();
  };

  const showMain = (status = null) => {
    state.view = 'main';
    state.index = Math.max(0, menu.findIndex((e) => e.id === 'language'));
    state.status = status;
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
      const entry = entries()[state.index];
      if (state.view === 'language') {
        if (entry.code && entry.code !== state.lang) return switchLanguage(entry.code);
        showMain();
        return render();
      }
      busy = true;
      const outcome = await entry.run();
      busy = false;
      if (closed) return;
      if (outcome.quit) return quit();
      if (outcome.view) {
        state.view = outcome.view;
        state.index = Math.max(0, config.language.available.indexOf(state.lang));
        state.status = null;
        return render();
      }
      state.status = { ok: outcome.ok, text: outcome.status };
      render();
    };

    async function onKey(str, key = {}) {
      if ((key.ctrl && key.name === 'c') || key.name === 'q') return quit();
      if (busy) return;
      const count = entries().length;
      if (key.name === 'escape' || key.name === 'backspace' || key.name === 'left') {
        if (state.view === 'main') return key.name === 'escape' ? quit() : undefined;
        showMain();
        return render();
      }
      if (key.name === 'up' || key.name === 'k') state.index = (state.index - 1 + count) % count;
      else if (key.name === 'down' || key.name === 'j' || key.name === 'tab') state.index = (state.index + 1) % count;
      else if (/^[1-9]$/.test(str ?? '') && Number(str) <= count) state.index = Number(str) - 1;
      else if (key.name === 'return' || key.name === 'space' || key.name === 'right') return select();
      else return;
      state.status = null;
      render();
    }

    load();
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
