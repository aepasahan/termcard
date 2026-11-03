/**
 * Internationalization: built-in locales, string lookup with per-card
 * overrides, and language detection from the user's environment.
 *
 * Terminals have no translation feature of their own, so the language is
 * chosen from (in order): --lang flag, TERMCARD_LANG, the POSIX locale
 * variables, the OS locale reported by Intl, then the card's default.
 */

import { format } from '../text.js';
import en from './locales/en.js';
import tr from './locales/tr.js';
import de from './locales/de.js';
import es from './locales/es.js';
import fr from './locales/fr.js';
import zh from './locales/zh.js';
import hi from './locales/hi.js';
import ar from './locales/ar.js';
import bn from './locales/bn.js';
import pt from './locales/pt.js';
import ru from './locales/ru.js';
import id from './locales/id.js';
import ur from './locales/ur.js';
import ja from './locales/ja.js';

// The most widely spoken languages, plus Turkish, German and French.
const LOCALES = { en, zh, hi, es, ar, fr, bn, pt, ru, id, ur, de, ja, tr };
export const BUILT_IN_LANGUAGES = Object.keys(LOCALES);

/** Returns a translator bound to one language, honoring the card's own string overrides. */
export function createTranslator(lang, overrides = {}) {
  const tables = [overrides[lang], LOCALES[lang], overrides.en, en].filter(Boolean);
  return (key, values) => {
    for (const table of tables) if (table[key] !== undefined) return format(table[key], values);
    return key;
  };
}

// Languages written right to left. A card can mark its own languages with "meta.dir": "rtl".
const RTL = new Set(['ar', 'ur', 'fa', 'he', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb']);

/** "rtl" or "ltr" for a language. */
export const textDirection = (lang, overrides = {}) =>
  overrides[lang]?.['meta.dir'] ?? (RTL.has(lang) ? 'rtl' : 'ltr');

/** Native display name of a language, e.g. "Türkçe". */
export const languageName = (lang, overrides = {}) =>
  overrides[lang]?.['meta.name'] ?? LOCALES[lang]?.['meta.name'] ?? lang.toUpperCase();

/** "tr_TR.UTF-8" → "tr", "pt-BR" → "pt". Returns undefined for C/POSIX or empty values. */
function baseLanguage(locale) {
  if (!locale || /^(C|POSIX)([._].*)?$/i.test(locale)) return undefined;
  return locale.split(/[_.@-]/)[0].toLowerCase() || undefined;
}

/**
 * Picks the language to show.
 * @param {{ default: string, available: string[] }} language normalized config.language
 * @param {{ flag?: string, env?: NodeJS.ProcessEnv }} context
 */
export function detectLanguage(language, { flag, env = {} } = {}) {
  const { available } = language;
  const pick = (code) => (code && available.includes(code) ? code : undefined);

  const explicit = pick(flag?.toLowerCase()) ?? pick(env.TERMCARD_LANG?.toLowerCase());
  if (explicit) return explicit;
  if (language.default !== 'auto') return language.default;

  const candidates = [env.LC_ALL, env.LC_MESSAGES, env.LANG, ...(env.LANGUAGE?.split(':') ?? [])];
  try {
    candidates.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // Intl unavailable (very old runtimes): ignore.
  }
  for (const candidate of candidates) {
    const found = pick(baseLanguage(candidate));
    if (found) return found;
  }
  return available.includes('en') ? 'en' : available[0];
}

/** Language from an HTTP Accept-Language header (used by the web/curl integrations). */
export function languageFromHeader(header = '', available = ['en']) {
  for (const part of header.split(',')) {
    const code = baseLanguage(part.split(';')[0].trim());
    if (code && available.includes(code)) return code;
  }
  return available.includes('en') ? 'en' : available[0];
}
