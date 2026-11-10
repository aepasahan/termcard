/**
 * JSON Schema for card.config.json, built from the same lists the validator uses (themes,
 * templates, card options, menu items, limits), so editors can offer autocompletion and
 * inline errors. Published at https://termcard.dev/schema.json and in the npm package as
 * termcard/schema/card.schema.json. `npm run schema` rewrites the file; a test keeps it in sync.
 */

import { LANG_CODE, PHONE, NAME_LIMIT, TEXT_LIMIT, DESCRIPTION_LIMIT, ICON_SETS } from './schema.js';
import { themes, THEME_ROLES } from './themes.js';
import { templates, CARD_OPTIONS, MENU_ACTIONS } from './templates.js';
import { BUILT_IN_LANGUAGES } from '../i18n/index.js';

export const SCHEMA_URL = 'https://termcard.dev/schema.json';

const pattern = (regex) => regex.source;
const langCode = { type: 'string', pattern: pattern(LANG_CODE), examples: BUILT_IN_LANGUAGES };
const text = (max, description) => ({ type: 'string', minLength: 1, maxLength: max, description });
const localized = (max, description) => ({
  description: `${description} Plain text, or one text per language: { "en": "…", "tr": "…" }.`,
  anyOf: [
    { type: 'string', minLength: 1, maxLength: max },
    { type: 'object', propertyNames: { pattern: pattern(LANG_CODE) }, additionalProperties: { type: 'string', minLength: 1, maxLength: max } },
  ],
});
const webUrl = (description) => ({ type: 'string', format: 'uri', pattern: '^https?://', maxLength: 2048, description });
const color = { anyOf: [{ type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }, { const: 'default' }] };

export function buildJsonSchema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: SCHEMA_URL,
    title: 'Termcard card configuration',
    description: 'card.config.json for a Termcard business card (npx <name>). Guide: https://github.com/aepasahan/termcard/blob/main/docs/configuration.md',
    type: 'object',
    required: ['name'],
    additionalProperties: false,
    properties: {
      $schema: { type: 'string', description: 'URL of this schema, for editor support.' },
      name: text(NAME_LIMIT, 'Full name. Required.'),
      title: localized(TEXT_LIMIT, 'Role, shown under the name.'),
      tagline: localized(TEXT_LIMIT, 'Company, @handle or slogan, shown in the accent color.'),
      description: localized(DESCRIPTION_LIMIT, 'A few sentences about you, wrapped to the card width.'),
      organization: text(TEXT_LIMIT, 'Company name, used in the vCard.'),
      email: { type: 'string', format: 'email', maxLength: 254, pattern: "^[A-Za-z0-9.!$'*+=^_`{|}~-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$", description: 'Enables "Get in touch" and "Copy email".' },
      phone: { type: 'string', pattern: pattern(PHONE), description: 'Digits, spaces and + ( ) - . only.' },
      website: webUrl('Your website.'),
      location: localized(TEXT_LIMIT, 'Shown at the bottom of the card, e.g. "Berlin · Germany".'),
      links: {
        type: 'array',
        description: 'Profile links. Well-known services (LinkedIn, GitHub, X, …) get their label and id automatically.',
        items: {
          anyOf: [
            webUrl('Profile URL.'),
            {
              type: 'object',
              required: ['url'],
              additionalProperties: false,
              properties: {
                url: webUrl('Profile URL.'),
                label: text(40, 'Label shown on the card.'),
                id: { type: 'string', pattern: '^[A-Za-z0-9-]+$', maxLength: 40, description: 'Used in card.fields and menu items (link:<id>).' },
                icon: { type: 'string', maxLength: 8, description: 'A single symbol, at most 2 columns wide.' },
              },
            },
          ],
        },
      },
      language: {
        description: 'Languages the card supports. A code alone means a single-language card.',
        anyOf: [
          langCode,
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              default: { anyOf: [{ const: 'auto' }, langCode], default: 'auto', description: '"auto" uses the visitor\'s system language.' },
              available: { type: 'array', minItems: 1, items: langCode, default: ['en'] },
            },
          },
        ],
      },
      strings: {
        type: 'object',
        description: 'Your own interface texts per language, e.g. { "en": { "action.contact": "Start a project" } }.',
        propertyNames: { pattern: pattern(LANG_CODE) },
        additionalProperties: { type: 'object', additionalProperties: { type: 'string', maxLength: 200 } },
      },
      template: { enum: Object.keys(templates), default: 'classic' },
      theme: {
        description: 'A seasonal theme, or one with your own colors.',
        anyOf: [
          { enum: Object.keys(themes) },
          {
            type: 'object',
            additionalProperties: false,
            properties: { preset: { enum: Object.keys(themes) }, ...Object.fromEntries(THEME_ROLES.map((r) => [r, color])) },
          },
        ],
      },
      icons: { enum: ICON_SETS, default: 'none' },
      card: {
        description: 'false shows only the menu; an object fine-tunes the template.',
        anyOf: [
          { type: 'boolean' },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              ...Object.fromEntries(Object.entries(CARD_OPTIONS).map(([k, values]) => [k, { enum: values }])),
              splitName: { type: 'boolean' },
              accentRule: { type: 'boolean' },
              labels: { type: 'boolean' },
              padding: { type: 'integer', minimum: 0, maximum: 8 },
              width: { anyOf: [{ const: 'auto' }, { type: 'integer', minimum: 20, maximum: 120 }] },
              fields: { type: 'array', items: { type: 'string' }, description: 'website, email, phone, link ids and location, in display order.' },
            },
          },
        ],
      },
      menu: {
        description: 'false hides the menu; items sets which entries appear and in what order.',
        anyOf: [
          { type: 'boolean' },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              items: {
                type: 'array',
                minItems: 1,
                items: {
                  anyOf: [
                    { enum: MENU_ACTIONS },
                    { type: 'string', pattern: '^link:[A-Za-z0-9-]+$' },
                    {
                      type: 'object',
                      required: ['label', 'url'],
                      additionalProperties: false,
                      properties: { label: localized(TEXT_LIMIT, 'Menu label.'), url: webUrl('Opened when chosen.'), hint: localized(TEXT_LIMIT, 'Shown under the menu.') },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
      mcp: { type: 'boolean', default: true, description: 'Let AI assistants read the card through MCP.' },
    },
  };
}

export const jsonSchemaText = () => `${JSON.stringify(buildJsonSchema(), null, 2)}\n`;
