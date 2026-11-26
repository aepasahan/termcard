/**
 * "logo": a small piece of text art shown at the top of the card, in the accent color.
 * Leading spaces are kept so the art stays aligned; everything else is sanitized like any text.
 */

import { sanitizeLine, displayWidth } from '../../text.js';

export const LOGO_LINES = 8;
export const LOGO_WIDTH = 40;

export function normalizeLogo(c, raw) {
  if (raw === undefined) return undefined;
  const lines = typeof raw === 'string' ? raw.split(/\r?\n/) : raw;
  if (!Array.isArray(lines) || lines.some((l) => typeof l !== 'string')) {
    return c.fail('logo', 'must be text or an array of lines'), undefined;
  }
  if (lines.length > LOGO_LINES) return c.fail('logo', `must be at most ${LOGO_LINES} lines`), undefined;
  const clean = lines.map(sanitizeLine);
  clean.forEach((line, i) => {
    if (displayWidth(line) > LOGO_WIDTH) c.fail(`logo[${i}]`, `must be at most ${LOGO_WIDTH} columns wide`);
  });
  // Blank lines at the edges would only add space.
  while (clean.length && !clean[0].trim()) clean.shift();
  while (clean.length && !clean.at(-1).trim()) clean.pop();
  return clean.length ? clean : undefined;
}
