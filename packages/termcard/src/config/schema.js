/**
 * Config validation and normalization.
 *
 * `normalizeConfig(raw)` returns a fully resolved, frozen config (template + overrides applied,
 * defaults filled in, strings sanitized) or throws a `ConfigError` listing every problem found.
 * Renderers only ever see normalized configs.
 *
 * Each part of the config is checked by its own module in ./fields; the shared building blocks
 * (sanitizing text, URLs, limits) live in ./checker.js.
 */

import { createChecker, isObject, isEmail, PHONE, ConfigError, NAME_LIMIT, DESCRIPTION_LIMIT } from './checker.js';
import { templates, DEFAULT_TEMPLATE } from './templates.js';
import { normalizeLinks } from './fields/links.js';
import { normalizeLanguage, normalizeStrings } from './fields/language.js';
import { normalizeTheme } from './fields/theme.js';
import { normalizeCard } from './fields/card.js';
import { normalizeMenu } from './fields/menu.js';
import { normalizeLogo } from './fields/logo.js';

// Re-exported: the public API and the JSON Schema use these from here.
export { ConfigError, LANG_CODE, PHONE, TEXT_LIMIT, NAME_LIMIT, DESCRIPTION_LIMIT, isEmail, urlProblem } from './checker.js';
export { LOGO_LINES, LOGO_WIDTH } from './fields/logo.js';

export const TOP_LEVEL_KEYS = [
  '$schema', 'type', 'name', 'title', 'tagline', 'description', 'organization', 'email', 'phone', 'website',
  'address', 'hours', 'location', 'links', 'logo', 'language', 'strings', 'template', 'theme', 'icons', 'card', 'menu', 'mcp', 'credit',
];
export const ICON_SETS = ['none', 'symbols', 'emoji', 'nerd'];
// A card introduces a person (default) or an organization: a company, studio, team or project.
export const CARD_TYPES = ['person', 'organization'];
export const ADDRESS_LIMIT = 80;
export const HOURS_LIMIT = 60;

export function normalizeConfig(raw) {
  if (!isObject(raw)) throw new ConfigError(['config must be a JSON object']);
  const c = createChecker();
  c.unknownKeys('', raw, TOP_LEVEL_KEYS);

  const config = {
    type: c.oneOf('type', raw.type, CARD_TYPES, 'person'),
    name: c.text('name', raw.name, { required: true, max: NAME_LIMIT }),
    title: c.localized('title', raw.title),
    tagline: c.localized('tagline', raw.tagline),
    description: c.localized('description', raw.description, { max: DESCRIPTION_LIMIT }),
    organization: c.text('organization', raw.organization),
    email: c.text('email', raw.email, { max: 254 }),
    phone: c.text('phone', raw.phone, { max: 30 }),
    website: c.url('website', raw.website),
    address: c.localized('address', raw.address, { max: ADDRESS_LIMIT }),
    hours: c.localized('hours', raw.hours, { max: HOURS_LIMIT }),
    location: c.localized('location', raw.location),
    links: normalizeLinks(c, raw.links),
    logo: normalizeLogo(c, raw.logo),
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
  // A small "Made with Termcard" line under the card. New cards turn it on; anyone can turn it off.
  config.credit = c.oneOf('credit', raw.credit, [true, false], false);

  // Fields the card can show, in their default order.
  const fieldIds = [
    ...(config.website ? ['website'] : []),
    ...(config.email ? ['email'] : []),
    ...(config.phone ? ['phone'] : []),
    ...config.links.map((l) => l.id),
    ...(config.address ? ['address'] : []),
    ...(config.hours ? ['hours'] : []),
    ...(config.location ? ['location'] : []),
  ];
  config.card = normalizeCard(c, raw.card, config.template, fieldIds, config.type);
  config.menu = normalizeMenu(c, raw.menu, config.links.map((l) => l.id));
  if (!config.card.enabled && !config.menu.enabled) c.fail('card', 'cannot be false while the menu is off too');

  if (c.problems.length) throw new ConfigError(c.problems);
  return Object.freeze(config);
}
