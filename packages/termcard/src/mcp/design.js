/**
 * MCP tools for designing a card in a conversation:
 * learn the options → draft a config → preview until valid → check the name → export it.
 * No file system access: these run in the local and the remote server. The local server adds
 * create_card_project (./project.js). Publishing is never done here.
 */

import { normalizeConfig, ConfigError, DESCRIPTION_LIMIT, ICON_SETS, TEXT_LIMIT } from '../config/schema.js';
import { templates, DEFAULT_TEMPLATE, MENU_ACTIONS, DEFAULT_MENU } from '../config/templates.js';
import { themes, THEME_DESCRIPTIONS, DEFAULT_THEME } from '../config/themes.js';
import { BUILT_IN_LANGUAGES, createTranslator, languageName, textDirection } from '../i18n/index.js';
import { layoutCard } from '../render/card.js';
import { toPlain } from '../render/format.js';
import { buildMenu } from '../tui/actions.js';
import { validatePackageName } from '../project/names.js';
import { checkAvailability } from '../project/registry.js';
import { ToolError } from './protocol.js';

const GUIDE = 'https://github.com/aepasahan/termcard/blob/main/docs/configuration.md';

const OPTIONS = {
  required: ['name'],
  fields: {
    name: `Full name (max 80 characters). Required.`,
    title: 'Role, shown under the name. Text or { "en": "…", "tr": "…" }.',
    tagline: 'Company, @handle or slogan, shown in the accent color. Localizable.',
    description: `A few sentences about the person, max ${DESCRIPTION_LIMIT} characters. Localizable.`,
    organization: 'Company name, used in the vCard.',
    email: 'Email address. Enables "Get in touch".',
    phone: 'Phone number: digits, spaces and + ( ) - .',
    website: 'https://… URL.',
    location: 'e.g. "Berlin · Germany". Localizable.',
    links: 'Array of profile URLs (LinkedIn, GitHub, X, Behance, …) or { "url", "label"?, "icon"? }.',
    language: '{ "default": "auto" | code, "available": [codes] }.',
    template: Object.keys(templates).join(' | '),
    theme: `Theme name (default "${DEFAULT_THEME}").`,
    icons: ICON_SETS.join(' | '),
    card: 'false for a menu-only card, or { "border", "fields", … } to fine-tune.',
    menu: 'false for no menu, or { "items": [...] }.',
    mcp: 'true (default) lets AI assistants read the card; false opts out.',
  },
  limits: { text: TEXT_LIMIT, description: DESCRIPTION_LIMIT, name: 80 },
  templates: { default: DEFAULT_TEMPLATE, choices: { classic: 'letter-spaced name, roomy', compact: 'denser, for long names', minimal: 'no frame, no labels' } },
  themes: Object.keys(themes).map((id) => ({ id, season: THEME_DESCRIPTIONS[id], accent: themes[id].accent })),
  iconSets: { none: 'text only (default)', symbols: 'simple symbols, works everywhere', emoji: 'colorful, modern terminals', nerd: 'brand icons, needs a Nerd Font' },
  languages: BUILT_IN_LANGUAGES.map((code) => ({ code, name: languageName(code), direction: textDirection(code) })),
  menuItems: { default: DEFAULT_MENU, available: [...MENU_ACTIONS, 'link:<id>', '{ "label", "url" }'] },
  example: {
    name: 'Jane Doe',
    title: 'Product Designer',
    email: 'jane@example.com',
    website: 'https://jane.example.com',
    links: ['https://www.linkedin.com/in/janedoe', 'https://github.com/janedoe'],
    language: { default: 'auto', available: ['en', 'de'] },
    theme: 'frost',
    icons: 'symbols',
  },
  guide: GUIDE,
};

const configSchema = { type: 'object', description: 'The card configuration (card.config.json). Call list_card_options for the fields.' };

/** Validates a config, returning { config } or { problems }. */
export function validate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { problems: ['config must be an object'] };
  try {
    return { config: normalizeConfig(raw) };
  } catch (error) {
    if (error instanceof ConfigError) return { problems: error.problems };
    throw error;
  }
}

function render(config, language) {
  const lang = config.language.available.includes(language) ? language : config.language.available[0];
  const card = toPlain(layoutCard(config, lang));
  const menu = config.menu.enabled ? buildMenu(config, lang, createTranslator(lang, config.strings)).map((e) => `  ${e.icon ? `${e.icon} ` : ''}${e.label}`) : [];
  return { language: lang, text: [card, ...(menu.length ? ['', ...menu] : [])].join('\n') };
}

/**
 * @param {{ fetch?: typeof fetch, finish?: 'create_card_project' | 'export_card_config' }} options
 *   finish: the tool the create_card prompt ends with.
 */
export function createDesignTools({ fetch, finish = 'export_card_config' } = {}) {
  const tools = [
    {
      name: 'list_card_options',
      title: 'List card options',
      description: 'Explains what a Termcard card can contain — fields, limits, templates, color themes, icon sets, languages and menu items — with an example config. Call this before drafting a card.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: async () => OPTIONS,
    },
    {
      name: 'preview_card',
      title: 'Preview a card',
      description: 'Validates a card config and returns a text preview of the card and its menu, or the list of problems to fix. Use it after every change and show the preview to the user.',
      inputSchema: {
        type: 'object',
        properties: { config: configSchema, language: { type: 'string', description: 'Optional language code for the preview.' } },
        required: ['config'],
        additionalProperties: false,
      },
      run: async ({ config, language }) => {
        const { config: normalized, problems } = validate(config);
        if (problems) return { valid: false, problems };
        const { language: lang, text } = render(normalized, language);
        return { valid: true, language: lang, preview: text };
      },
    },
    {
      name: 'check_name',
      title: 'Check a card name',
      description: 'Checks whether a name can be used as the card\'s npm package (people will run `npx <name>`) and whether it is still free on npm.',
      inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Proposed npm package name, e.g. "janedoe".' } }, required: ['name'], additionalProperties: false },
      annotations: { openWorldHint: true },
      run: async ({ name }) => {
        const problem = validatePackageName(typeof name === 'string' ? name : '');
        if (problem) return { name, valid: false, problem };
        const status = await checkAvailability(name, fetch);
        return {
          name,
          valid: true,
          available: status === 'available' ? true : status === 'taken' ? false : null,
          command: `npx ${name}`,
          ...(status === 'unknown' && { note: 'npm could not be reached; availability will be checked when publishing.' }),
          ...(status === 'available' && { note: 'npm may still refuse names that look very similar to existing packages.' }),
        };
      },
    },
    {
      name: 'export_card_config',
      title: 'Export the card config',
      description: 'Returns the finished card.config.json for the user to save, with the commands that turn it into a published card. Use it where files cannot be written for the user (for example in a web chat).',
      inputSchema: {
        type: 'object',
        properties: {
          config: configSchema,
          packageName: { type: 'string', description: 'Optional npm package name, checked with check_name.' },
        },
        required: ['config'],
        additionalProperties: false,
      },
      run: async ({ config, packageName }) => {
        const { problems } = validate(config);
        if (problems) throw new ToolError(`The card config has problems:\n- ${problems.join('\n- ')}`);
        const name = typeof packageName === 'string' && !validatePackageName(packageName) ? packageName : '<name>';
        return {
          fileName: 'card.config.json',
          content: `${JSON.stringify(config, null, 2)}\n`,
          nextSteps: [
            'Save the content as card.config.json in an empty folder',
            `npm create termcard@latest -- --config card.config.json --name ${name}`,
            `cd ${name.replace(/^@[^/]+\//, '')} && npm publish --access public`,
            `Share it: npx ${name}`,
          ],
          note: 'Nothing was published. The user publishes the card themselves.',
        };
      },
    },
  ];

  const prompts = [
    {
      name: 'create_card',
      title: 'Create my terminal business card',
      description: 'Guides you through creating your own Termcard business card in this conversation.',
      arguments: [],
      get: () => ({
        description: 'Create a Termcard business card',
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Help me create my terminal business card with Termcard.',
              '1. Call list_card_options to learn what a card can contain.',
              '2. Ask me, a few questions at a time, for my name, role, a short description, contact details, profile links and languages. Everything except my name is optional; don\'t invent details.',
              '3. Draft card.config.json and call preview_card; show me the preview and fix any problems. Offer a template, a color theme and icons, and preview again after changes.',
              '4. Suggest a short package name and call check_name until we find a free one.',
              finish === 'create_card_project'
                ? '5. Before writing anything, confirm the details, the name and the folder with me, then call create_card_project.'
                : '5. Confirm the details and the name with me, then call export_card_config and give me the file and the commands.',
              '6. Tell me how to publish it myself with npm. Don\'t publish anything for me.',
            ].join('\n'),
          },
        }],
      }),
    },
  ];

  return { tools, prompts };
}
