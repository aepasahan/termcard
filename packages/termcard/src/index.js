/**
 * termcard — public API.
 *
 *   import { start } from 'termcard';
 *   start(new URL('../card.config.json', import.meta.url));
 */

export { start, run } from './run.js';
export { loadConfig } from './config/load.js';
export { normalizeConfig, ConfigError } from './config/schema.js';
export { templates, DEFAULT_TEMPLATE } from './config/templates.js';
export { themes, DEFAULT_THEME } from './config/themes.js';
export { BUILT_IN_LANGUAGES, detectLanguage, languageName } from './i18n/index.js';
export { layoutCard } from './render/card.js';
export { toAnsi, toPlain, toHtml } from './render/format.js';
export { colorDepth } from './render/color.js';
export { createVCard } from './vcard.js';
export { buildCard } from './build/index.js';
