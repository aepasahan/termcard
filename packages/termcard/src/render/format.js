/** Turns laid-out card lines into terminal (ANSI), plain text or HTML output. */

import { foreground, background } from './color.js';
import { displayWidth } from '../text.js';

const mix = (a, b, t) => {
  const [x, y] = [a, b].map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

const ROLE_COLOR = { name: 'text', text: 'text', muted: 'muted', faint: 'faint', accent: 'accent' };

/** Returns a function that paints text in a theme role, or leaves it plain at depth 0. */
export function createPainter(theme, depth) {
  // filled: false, or the background color to paint behind the text
  return (role, text, filled = false) => {
    if (!depth || (!role && !filled)) return text;
    const color = role && theme[ROLE_COLOR[role] ?? 'text'];
    const codes = [
      ...(role === 'name' || role === 'strong' ? ['1'] : []),
      ...(color && color !== 'default' ? [foreground(color, depth)] : []),
      ...(filled ? [background(filled === true ? theme.background : filled, depth)] : []),
    ];
    return codes.length ? `\x1b[${codes.join(';')}m${text}\x1b[0m` : text;
  };
}

export function toAnsi(lines, theme, depth = 256) {
  const paint = createPainter(theme, depth);
  const fill = depth > 0 && theme.background && theme.background !== 'default';
  const gradient = fill && Array.isArray(theme.background);
  return lines.map((line) => {
    // With a card background, everything from the left border to the right border is filled.
    const border = (s) => s.frame && s.text.trim();
    const first = fill ? line.findIndex(border) : -1;
    const last = fill ? line.findLastIndex(border) : -1;
    if (first === -1) return line.map((s) => paint(s.role, s.text)).join('').trimEnd();
    if (!gradient) return line.map((s, i) => paint(s.role, s.text, i >= first && i <= last)).join('').trimEnd();
    // A gradient changes color across the box, so characters are painted column by column,
    // grouping neighbours that end up with the same color.
    const width = line.slice(first, last + 1).reduce((n, s) => n + displayWidth(s.text), 0);
    let column = 0;
    return line.map((s, i) => {
      if (i < first || i > last) return paint(s.role, s.text);
      let out = '';
      let run = '';
      let runColor = null;
      for (const ch of s.text) {
        const t = width > 1 ? Math.min(1, column / (width - 1)) : 0;
        const bg = mix(theme.background[0], theme.background[1], t);
        const code = background(bg, depth);
        if (runColor !== null && code !== runColor.code) { out += paint(s.role, run, runColor.bg); run = ''; }
        if (run === '') runColor = { code, bg };
        run += ch;
        column += displayWidth(ch);
      }
      return out + (run ? paint(s.role, run, runColor.bg) : '');
    }).join('').trimEnd();
  }).join('\n');
}

export const toPlain = (lines) => lines.map((line) => line.map((s) => s.text).join('').trimEnd()).join('\n');

export const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** HTML for the web page. Frame segments are dropped — CSS draws the border. */
export function toHtml(lines) {
  const content = lines.map((line) => line.filter((s) => !s.frame)).filter((line, i, all) => line.length || (i > 0 && i < all.length - 1));
  return content
    .map((line) =>
      line
        .map((s) => {
          const inner = s.role ? `<span class="${s.role}">${escapeHtml(s.text)}</span>` : escapeHtml(s.text);
          if (!s.href) return inner;
          const external = /^https?:/.test(s.href) ? ' target="_blank" rel="noopener noreferrer"' : '';
          return `<a href="${escapeHtml(s.href)}"${external}>${inner}</a>`;
        })
        .join('')
        .trimEnd(),
    )
    .join('\n');
}
