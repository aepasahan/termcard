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

const isWide = (cp) =>
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
