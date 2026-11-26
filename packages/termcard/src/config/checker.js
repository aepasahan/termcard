/**
 * Building blocks for config validation.
 *
 * A checker collects problems instead of throwing at the first one, so authors can fix
 * everything in one go. Every string that passes through it is sanitized (control and
 * bidirectional-override characters removed) and length-limited before any renderer sees it.
 */

import { sanitize, displayWidth } from '../text.js';

export class ConfigError extends Error {
  constructor(problems) {
    super(`Invalid Termcard config:\n${problems.map((p) => `  • ${p}`).join('\n')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

export const LANG_CODE = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i;
// Deliberately stricter than RFC 5322: no characters that change the meaning of a mailto: URL (? & # % /).
const EMAIL = /^[a-z0-9.!$'*+=^_`{|}~-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
export const PHONE = /^\+?[0-9][0-9 ().-]{3,24}$/;
export const HEX = /^#[0-9a-f]{6}$/i;
export const TEXT_LIMIT = 120;
export const NAME_LIMIT = 80;
export const DESCRIPTION_LIMIT = 280;

export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const isEmail = (value) => value.length <= 254 && EMAIL.test(value);

/** Why a string is not an acceptable link, or undefined if it is. */
export function urlProblem(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return 'must be a full URL, e.g. https://example.com';
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) return 'must start with https:// or http://';
  if (parsed.username || parsed.password) return 'must not contain credentials';
  return undefined;
}

export function createChecker() {
  const problems = [];
  const fail = (path, message) => {
    problems.push(`${path}: ${message}`);
  };

  const text = (path, value, { required = false, max = TEXT_LIMIT } = {}) => {
    if (value != null && typeof value !== 'string') return fail(path, 'must be a string');
    const clean = value == null ? '' : sanitize(value);
    if (!clean) return required ? fail(path, 'is required') : undefined;
    if (clean.length > max) return fail(path, `must be at most ${max} characters`);
    return clean;
  };

  /** A string, or an object of language code → string. */
  const localized = (path, value, options) => {
    if (value == null || typeof value === 'string') return text(path, value, options);
    if (!isObject(value)) return fail(path, 'must be a string or an object of language → text');
    const out = {};
    for (const [lang, entry] of Object.entries(value)) {
      if (!LANG_CODE.test(lang)) fail(`${path}.${lang}`, 'is not a valid language code');
      else {
        const clean = text(`${path}.${lang}`, entry, options);
        if (clean) out[lang.toLowerCase()] = clean;
      }
    }
    return Object.keys(out).length ? out : undefined;
  };

  /** An http(s) URL without credentials, normalized. */
  const url = (path, value, { required = false } = {}) => {
    const raw = text(path, value, { required, max: 2048 });
    if (!raw) return undefined;
    const problem = urlProblem(raw);
    return problem ? fail(path, problem) : new URL(raw).href;
  };

  /** A single symbol (icon), at most two terminal columns wide. */
  const symbol = (path, value) => {
    const icon = text(path, value, { max: 8 });
    if (icon && displayWidth(icon) > 2) return fail(path, 'must be a single symbol (at most 2 columns wide)'), undefined;
    return icon;
  };

  const oneOf = (path, value, allowed, fallback) => {
    if (value === undefined) return fallback;
    if (!allowed.includes(value)) return fail(path, `must be one of: ${allowed.join(', ')}`), fallback;
    return value;
  };

  const integer = (path, value, { min, max, fallback }) => {
    if (value === undefined) return fallback;
    if (Number.isInteger(value) && value >= min && value <= max) return value;
    return fail(path, `must be an integer between ${min} and ${max}`), fallback;
  };

  const boolean = (path, value, fallback) => {
    if (value === undefined) return fallback;
    if (typeof value === 'boolean') return value;
    return fail(path, 'must be true or false'), fallback;
  };

  /** An array, or undefined (absent). Reports anything else. */
  const list = (path, value, { max } = {}) => {
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) return fail(path, 'must be an array'), undefined;
    if (max !== undefined && value.length > max) return fail(path, `must have at most ${max} entries`), value.slice(0, max);
    return value;
  };

  const unknownKeys = (path, value, allowed) => {
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) fail(path ? `${path}.${key}` : key, 'is not a recognized option');
    }
  };

  return { problems, fail, text, localized, url, symbol, oneOf, integer, boolean, list, unknownKeys };
}
