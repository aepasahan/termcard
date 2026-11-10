/**
 * termcard — public API.
 *
 *   import { start } from 'termcard';
 *   start(new URL('../card.config.json', import.meta.url));
 */

export { start, run } from './run.js';
export { loadConfig } from './config/load.js';
export { normalizeConfig, ConfigError, isEmail, urlProblem, TEXT_LIMIT, DESCRIPTION_LIMIT, ICON_SETS } from './config/schema.js';
export { templates, DEFAULT_TEMPLATE } from './config/templates.js';
export { themes, THEME_DESCRIPTIONS, DEFAULT_THEME } from './config/themes.js';
export { BUILT_IN_LANGUAGES, detectLanguage, languageName, textDirection } from './i18n/index.js';
export { layoutCard, layoutHeader } from './render/card.js';
export { toAnsi, toPlain, toHtml } from './render/format.js';
export { colorDepth } from './render/color.js';
export { createVCard } from './vcard.js';
export { buildCard, UnsafeOutputError } from './build/index.js';
export { slugify } from './text.js';
export { buildJsonSchema, SCHEMA_URL } from './config/json-schema.js';
export { createProject, TargetNotEmptyError } from './project/scaffold.js';
export { validatePackageName, binName } from './project/names.js';
export { checkAvailability } from './project/registry.js';
