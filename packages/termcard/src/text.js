/**
 * Text helpers shared by every renderer.
 * All user-provided strings pass through `sanitize` before they reach a terminal or HTML.
 */

// C0/C1 control characters (incl. ESC) and bidirectional override characters.
// Removing them prevents terminal escape injection and text-direction spoofing.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g;

export const sanitize = (value) => String(value).replace(UNSAFE, '').trim();

const isZeroWidth = (cp) =>
  (cp >= 0x0300 && cp <= 0x036f) || // combining diacritics
  (cp >= 0x200b && cp <= 0x200f) || // zero-width space/joiners
  (cp >= 0xfe00 && cp <= 0xfe0f); // variation selectors

// Symbols below U+1F300 that terminals draw two columns wide (emoji presentation).
const WIDE_SYMBOLS = [
  [0x231a, 0x231b], [0x23e9, 0x23ec], [0x23f0, 0x23f0], [0x23f3, 0x23f3], [0x25fd, 0x25fe],
  [0x2614, 0x2615], [0x2648, 0x2653], [0x267f, 0x267f], [0x2693, 0x2693], [0x26a1, 0x26a1],
  [0x26aa, 0x26ab], [0x26bd, 0x26be], [0x26c4, 0x26c5], [0x26ce, 0x26ce], [0x26d4, 0x26d4],
  [0x26ea, 0x26ea], [0x26f2, 0x26f3], [0x26f5, 0x26f5], [0x26fa, 0x26fa], [0x26fd, 0x26fd],
  [0x2705, 0x2705], [0x270a, 0x270b], [0x2728, 0x2728], [0x274c, 0x274c], [0x274e, 0x274e],
  [0x2753, 0x2755], [0x2757, 0x2757], [0x2795, 0x2797], [0x27b0, 0x27b0], [0x27bf, 0x27bf],
  [0x2b1b, 0x2b1c], [0x2b50, 0x2b50], [0x2b55, 0x2b55],
];

const isWide = (cp) =>
  WIDE_SYMBOLS.some(([from, to]) => cp >= from && cp <= to) ||
  (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
  (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) || // CJK … Yi
  (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul syllables
  (cp >= 0xf900 && cp <= 0xfaff) || // CJK compatibility ideographs
  (cp >= 0xfe30 && cp <= 0xfe4f) || // CJK compatibility forms
  (cp >= 0xff00 && cp <= 0xff60) || // fullwidth forms
  (cp >= 0xffe0 && cp <= 0xffe6) ||
  (cp >= 0x1f300 && cp <= 0x1faff) || // emoji & pictographs
  (cp >= 0x20000 && cp <= 0x3fffd); // CJK extensions

/** Number of terminal columns a string occupies (no escape sequences expected). */
export function displayWidth(text) {
  let width = 0;
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (isZeroWidth(cp)) continue;
    width += isWide(cp) ? 2 : 1;
  }
  return width;
}

/** Replaces `{key}` placeholders. Unknown keys are left untouched. */
export const format = (template, values = {}) =>
  template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));

/**
 * A localized value is either a plain string or an object keyed by language code.
 * Falls back to the given fallback language, then to the first available entry.
 */
export function localize(value, lang, fallback = 'en') {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value[fallback] ?? Object.values(value)[0] ?? '';
}

/** Locale-aware uppercase that keeps Turkish dotted/dotless i correct. */
export const upper = (text, lang) => text.toLocaleUpperCase(lang === 'tr' || lang === 'az' ? 'tr-TR' : undefined);

export const stripProtocol = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

const TRANSLITERATE = { ı: 'i', ß: 'ss', ø: 'o', æ: 'ae', œ: 'oe', ł: 'l', đ: 'd', þ: 'th' };

/** "Ahmet Erkan Paşahan" → "ahmet-erkan-pasahan" (lowercase ASCII, dashes). */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[ıßøæœłđþ]/g, (ch) => TRANSLITERATE[ch])
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/** Removes ANSI SGR sequences (used to measure already-painted lines). */
export const stripAnsi = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');

/** Word-wraps text to lines of at most `width` columns; overlong words are split. */
export function wrap(text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let rest = word;
    while (displayWidth(rest) > width) {
      let head = '';
      for (const ch of rest) {
        if (displayWidth(head + ch) > width) break;
        head += ch;
      }
      if (line) lines.push(line);
      lines.push(head);
      line = '';
      rest = rest.slice(head.length);
    }
    const candidate = line ? `${line} ${rest}` : rest;
    if (displayWidth(candidate) <= width) line = candidate;
    else {
      lines.push(line);
      line = rest;
    }
  }
  if (line) lines.push(line);
  return lines;
}
