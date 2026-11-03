/** Turns laid-out card lines into terminal (ANSI), plain text or HTML output. */

import { foreground } from './color.js';

const ROLE_COLOR = { name: 'text', text: 'text', muted: 'muted', faint: 'faint', accent: 'accent' };

/** Returns a function that paints text in a theme role, or leaves it plain at depth 0. */
export function createPainter(theme, depth) {
  return (role, text) => {
    if (!depth || !role) return text;
    const color = theme[ROLE_COLOR[role] ?? 'text'];
    const codes = [
      ...(role === 'name' || role === 'strong' ? ['1'] : []),
      ...(color && color !== 'default' ? [foreground(color, depth)] : []),
    ];
    return codes.length ? `\x1b[${codes.join(';')}m${text}\x1b[0m` : text;
  };
}

export function toAnsi(lines, theme, depth = 256) {
  const paint = createPainter(theme, depth);
  return lines.map((line) => line.map((s) => paint(s.role, s.text)).join('').trimEnd()).join('\n');
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
