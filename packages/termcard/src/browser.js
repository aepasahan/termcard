/**
 * Browser-safe entry point (no Node.js built-ins): validation, layout and
 * HTML/plain rendering. Used by the web config builder.
 *
 *   import { normalizeConfig, layoutCard, toHtml } from 'termcard/browser';
 */

export { normalizeConfig, ConfigError, isEmail, urlProblem, TEXT_LIMIT, DESCRIPTION_LIMIT, ICON_SETS } from './config/schema.js';
export { templates, DEFAULT_TEMPLATE, CARD_OPTIONS } from './config/templates.js';
export { themes, THEME_DESCRIPTIONS, DEFAULT_THEME } from './config/themes.js';
export { BUILT_IN_LANGUAGES, createTranslator, detectLanguage, languageFromHeader, languageName } from './i18n/index.js';
export { layoutCard, layoutHeader } from './render/card.js';
export { toPlain, toHtml, escapeHtml } from './render/format.js';
export { webIconSet } from './render/icons.js';
export { buildMenu } from './tui/actions.js';
export { createVCard } from './vcard.js';
export { slugify } from './text.js';
