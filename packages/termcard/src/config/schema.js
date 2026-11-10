/**
 * Config validation and normalization.
 *
 * `normalizeConfig(raw)` returns a fully resolved config (template + overrides
 * applied, defaults filled in, strings sanitized) or throws a `ConfigError`
 * listing every problem found. Renderers only ever see normalized configs.
 */

import { sanitize, slugify, displayWidth } from '../text.js';
import { themes, DEFAULT_THEME, THEME_ROLES } from './themes.js';
import { templates, DEFAULT_TEMPLATE, CARD_OPTIONS, DEFAULT_MENU, MENU_ACTIONS } from './templates.js';
import { identifyService } from './services.js';
import { BUILT_IN_LANGUAGES } from '../i18n/index.js';

export class ConfigError extends Error {
  constructor(problems) {
    super(`Invalid Termcard config:\n${problems.map((p) => `  • ${p}`).join('\n')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

const TOP_LEVEL_KEYS = [
  '$schema', 'name', 'title', 'tagline', 'description', 'organization', 'email', 'phone', 'website',
  'location', 'links', 'language', 'strings', 'template', 'theme', 'icons', 'card', 'menu', 'mcp',
];
const LANG_CODE = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i;
// Deliberately stricter than RFC 5322: no characters that change the meaning of a mailto: URL (? & # % /).
const EMAIL = /^[a-z0-9.!$'*+=^_`{|}~-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
const PHONE = /^\+?[0-9][0-9 ().-]{3,24}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const MAX_TEXT = 120;
export const DESCRIPTION_LIMIT = 280;
export const ICON_SETS = ['none', 'symbols', 'emoji', 'nerd'];

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

export const isEmail = (value) => value.length <= 254 && EMAIL.test(value);
export const TEXT_LIMIT = MAX_TEXT;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Collects problems instead of throwing at the first one, so users can fix everything at once. */
function createChecker() {
  const problems = [];
  const fail = (path, message) => {
    problems.push(`${path}: ${message}`);
  };

  const text = (path, value, { required = false, max = MAX_TEXT } = {}) => {
    if (value != null && typeof value !== 'string') return fail(path, 'must be a string');
    const clean = value == null ? '' : sanitize(value);
    if (!clean) return required ? fail(path, 'is required') : undefined;
    if (clean.length > max) return fail(path, `must be at most ${max} characters`);
    return clean;
  };

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

  const url = (path, value, { required = false } = {}) => {
    const raw = text(path, value, { required, max: 2048 });
    if (!raw) return undefined;
    const problem = urlProblem(raw);
    return problem ? fail(path, problem) : new URL(raw).href;
  };

  const oneOf = (path, value, allowed, fallback) => {
    if (value === undefined) return fallback;
    if (!allowed.includes(value)) return fail(path, `must be one of: ${allowed.join(', ')}`), fallback;
    return value;
  };

  const unknownKeys = (path, value, allowed) => {
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) fail(path ? `${path}.${key}` : key, 'is not a recognized option');
    }
  };

  return { problems, fail, text, localized, url, oneOf, unknownKeys };
}

function normalizeLinks(c, raw) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return c.fail('links', 'must be an array'), [];
  const seen = new Set();
  // Ids set by the author win; generated ids step around them.
  const explicitIds = new Set(raw.filter((e) => isObject(e) && typeof e.id === 'string').map((e) => e.id));
  return raw.flatMap((entry, i) => {
    const path = `links[${i}]`;
    if (typeof entry === 'string') entry = { url: entry };
    if (!isObject(entry)) return c.fail(path, 'must be a URL or { url, label?, id? }'), [];
    c.unknownKeys(path, entry, ['url', 'label', 'id', 'icon']);
    const href = c.url(`${path}.url`, entry.url, { required: true });
    if (!href) return [];
    const service = identifyService(href);
    const explicit = c.text(`${path}.id`, entry.id, { max: 40 });
    let id;
    if (explicit) {
      if (!/^[a-z0-9-]+$/i.test(explicit)) return c.fail(`${path}.id`, 'may only contain letters, digits and dashes'), [];
      if (seen.has(explicit)) return c.fail(`${path}.id`, `"${explicit}" is already used by another link`), [];
      id = explicit;
    } else {
      const auto = slugify(service.id) || 'link';
      id = auto;
      for (let n = 2; seen.has(id) || explicitIds.has(id); n++) id = `${auto}-${n}`;
    }
    seen.add(id);
    const icon = c.text(`${path}.icon`, entry.icon, { max: 8 });
    if (icon && displayWidth(icon) > 2) c.fail(`${path}.icon`, 'must be a single symbol (at most 2 columns wide)');
    return [{ id, label: c.text(`${path}.label`, entry.label, { max: 40 }) ?? service.label, url: href, service: service.id, ...(icon && { icon }) }];
  });
}

function normalizeLanguage(c, raw, strings) {
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

function normalizeStrings(c, raw) {
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

function normalizeTheme(c, raw) {
  if (raw === undefined) return { ...themes[DEFAULT_THEME] };
  const value = typeof raw === 'string' ? { preset: raw } : raw;
  if (!isObject(value)) return c.fail('theme', 'must be a preset name or an object'), { ...themes[DEFAULT_THEME] };
  c.unknownKeys('theme', value, ['preset', ...THEME_ROLES]);
  const preset = c.oneOf('theme.preset', value.preset, Object.keys(themes), DEFAULT_THEME);
  const theme = { ...themes[preset] };
  for (const role of THEME_ROLES) {
    if (value[role] === undefined) continue;
    if (typeof value[role] === 'string' && HEX.test(value[role])) theme[role] = value[role].toLowerCase();
    else if (value[role] === 'default') theme[role] = 'default';
    else c.fail(`theme.${role}`, 'must be a hex color like "#d7af5f" or "default" (the terminal\'s own color)');
  }
  return theme;
}

function normalizeCard(c, raw, template, fieldIds) {
  // "card": false shows only the menu (with a one-line header).
  if (raw === false) return { ...templates[template], enabled: false, fields: fieldIds };
  const value = raw === undefined || raw === true ? {} : raw;
  if (!isObject(value)) return c.fail('card', 'must be false or an object'), { ...templates[template], enabled: true, fields: fieldIds };
  const options = Object.keys(templates.classic);
  c.unknownKeys('card', value, [...options, 'fields']);

  const card = { ...templates[template], enabled: true };
  for (const [key, allowed] of Object.entries(CARD_OPTIONS)) card[key] = c.oneOf(`card.${key}`, value[key], allowed, card[key]);
  for (const key of ['splitName', 'accentRule', 'labels']) {
    if (value[key] === undefined) continue;
    if (typeof value[key] === 'boolean') card[key] = value[key];
    else c.fail(`card.${key}`, 'must be true or false');
  }
  if (value.padding !== undefined) {
    if (Number.isInteger(value.padding) && value.padding >= 0 && value.padding <= 8) card.padding = value.padding;
    else c.fail('card.padding', 'must be an integer between 0 and 8');
  }
  if (value.width !== undefined) {
    if (value.width === 'auto' || (Number.isInteger(value.width) && value.width >= 20 && value.width <= 120)) card.width = value.width;
    else c.fail('card.width', 'must be "auto" or an integer between 20 and 120');
  }

  card.fields = fieldIds;
  if (value.fields !== undefined) {
    if (!Array.isArray(value.fields)) c.fail('card.fields', 'must be an array');
    else {
      card.fields = value.fields.filter((f) => {
        if (fieldIds.includes(f)) return true;
        c.fail('card.fields', `unknown field "${f}" (available: ${fieldIds.join(', ') || 'none'})`);
        return false;
      });
    }
  }
  return card;
}

function normalizeMenu(c, raw, linkIds) {
  if (raw === false) return { enabled: false, items: [] };
  const value = raw === undefined || raw === true ? {} : raw;
  if (!isObject(value)) return c.fail('menu', 'must be false or { items }'), { enabled: true, items: DEFAULT_MENU };
  c.unknownKeys('menu', value, ['items']);
  if (value.items === undefined) return { enabled: true, items: DEFAULT_MENU };
  if (!Array.isArray(value.items)) return c.fail('menu.items', 'must be an array'), { enabled: true, items: DEFAULT_MENU };

  const items = value.items.flatMap((item, i) => {
    const path = `menu.items[${i}]`;
    if (typeof item === 'string') {
      if (MENU_ACTIONS.includes(item)) return [item];
      const link = item.startsWith('link:') && item.slice(5);
      if (link && linkIds.includes(link)) return [item];
      c.fail(path, `unknown item "${item}" (use ${MENU_ACTIONS.join(', ')} or link:<id>)`);
      return [];
    }
    if (!isObject(item)) return c.fail(path, 'must be an action name or { label, url, hint? }'), [];
    c.unknownKeys(path, item, ['label', 'url', 'hint']);
    const label = c.localized(`${path}.label`, item.label);
    const href = c.url(`${path}.url`, item.url, { required: true });
    if (!label) c.fail(`${path}.label`, 'is required');
    return label && href ? [{ label, url: href, hint: c.localized(`${path}.hint`, item.hint) }] : [];
  });
  if (!items.length) c.fail('menu.items', 'must contain at least one item (or set "menu": false)');
  return { enabled: true, items };
}

export function normalizeConfig(raw) {
  if (!isObject(raw)) throw new ConfigError(['config must be a JSON object']);
  const c = createChecker();
  c.unknownKeys('', raw, TOP_LEVEL_KEYS);

  const config = {
    name: c.text('name', raw.name, { required: true, max: 80 }),
    title: c.localized('title', raw.title),
    tagline: c.localized('tagline', raw.tagline),
    description: c.localized('description', raw.description, { max: DESCRIPTION_LIMIT }),
    organization: c.text('organization', raw.organization),
    email: c.text('email', raw.email, { max: 254 }),
    phone: c.text('phone', raw.phone, { max: 30 }),
    website: c.url('website', raw.website),
    location: c.localized('location', raw.location),
    links: normalizeLinks(c, raw.links),
  };
  if (config.email && !isEmail(config.email)) c.fail('email', 'is not a valid email address');
  if (config.phone && !PHONE.test(config.phone)) c.fail('phone', 'may only contain digits, spaces, + ( ) - .');

  config.strings = normalizeStrings(c, raw.strings);
  config.language = normalizeLanguage(c, raw.language, config.strings);
  config.template = c.oneOf('template', raw.template, Object.keys(templates), DEFAULT_TEMPLATE);
  config.theme = normalizeTheme(c, raw.theme);
  config.icons = c.oneOf('icons', raw.icons, ICON_SETS, 'none');
  // AI assistants may read the card through MCP unless the owner turns it off.
  config.mcp = c.oneOf('mcp', raw.mcp, [true, false], true);

  const fieldIds = [
    ...(config.website ? ['website'] : []),
    ...(config.email ? ['email'] : []),
    ...(config.phone ? ['phone'] : []),
    ...config.links.map((l) => l.id),
    ...(config.location ? ['location'] : []),
  ];
  config.card = normalizeCard(c, raw.card, config.template, fieldIds);
  config.menu = normalizeMenu(c, raw.menu, config.links.map((l) => l.id));
  if (!config.card.enabled && !config.menu.enabled) c.fail('card', 'cannot be false while the menu is off too');

  if (c.problems.length) throw new ConfigError(c.problems);
  return Object.freeze(config);
}
