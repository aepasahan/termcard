/** "card": the template's layout options, overridable one by one, and which fields to show. */

import { isObject } from '../checker.js';
import { templates, CARD_OPTIONS } from '../templates.js';

export function normalizeCard(c, raw, template, fieldIds) {
  // "card": false shows only the menu (with a one-line header).
  if (raw === false) return { ...templates[template], enabled: false, fields: fieldIds };
  const value = raw === undefined || raw === true ? {} : raw;
  if (!isObject(value)) return c.fail('card', 'must be false or an object'), { ...templates[template], enabled: true, fields: fieldIds };
  c.unknownKeys('card', value, [...Object.keys(templates.classic), 'fields', 'letterSpacing']);

  const card = { ...templates[template], enabled: true };
  for (const [key, allowed] of Object.entries(CARD_OPTIONS)) card[key] = c.oneOf(`card.${key}`, value[key], allowed, card[key]);
  for (const key of ['splitName', 'accentRule', 'labels']) card[key] = c.boolean(`card.${key}`, value[key], card[key]);
  card.padding = c.integer('card.padding', value.padding, { min: 0, max: 8, fallback: card.padding });
  card.letterSpacing = c.integer('card.letterSpacing', value.letterSpacing, { min: 0, max: 3, fallback: card.letterSpacing });
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
