/** "language" (which languages the card speaks) and "strings" (own translations and overrides). */

import { BUILT_IN_LANGUAGES } from '../../i18n/index.js';
import { isObject, LANG_CODE } from '../checker.js';

export function normalizeStrings(c, raw) {
  if (raw === undefined) return {};
  if (!isObject(raw)) return c.fail('strings', 'must be an object of language → { key: text }'), {};
  const out = {};
  for (const [lang, table] of Object.entries(raw)) {
    if (!LANG_CODE.test(lang)) { c.fail(`strings.${lang}`, 'is not a valid language code'); continue; }
    if (!isObject(table)) { c.fail(`strings.${lang}`, 'must be an object of key → text'); continue; }
    out[lang.toLowerCase()] = Object.fromEntries(
      Object.entries(table).flatMap(([key, v]) => {
        const clean = c.text(`strings.${lang}.${key}`, v, { max: 200 });
        return clean ? [[key, clean]] : [];
      }),
    );
  }
  return out;
}

export function normalizeLanguage(c, raw, strings) {
  // "language": "de" is shorthand for a card that is only in German.
  const value = raw === undefined ? {} : typeof raw === 'string' ? { default: raw, available: [raw] } : raw;
  if (!isObject(value)) return c.fail('language', 'must be a language code or { default, available }'), { default: 'auto', available: ['en'] };
  c.unknownKeys('language', value, ['default', 'available']);

  const known = [...new Set([...BUILT_IN_LANGUAGES, ...Object.keys(strings)])];
  let available = value.available ?? ['en'];
  if (!Array.isArray(available) || !available.length) {
    c.fail('language.available', 'must be a non-empty array of language codes');
    available = ['en'];
  }
  available = available.map((l) => String(l).toLowerCase());
  for (const lang of available) {
    if (!known.includes(lang)) {
      c.fail('language.available', `"${lang}" has no built-in translation; add it under "strings.${lang}"`);
    }
  }
  const def = String(value.default ?? 'auto').toLowerCase();
  if (def !== 'auto' && !available.includes(def)) c.fail('language.default', 'must be "auto" or one of language.available');
  return { default: def, available: [...new Set(available)] };
}
