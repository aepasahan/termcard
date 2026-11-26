/**
 * "sections": lists the card's menu can open, such as Products, Projects, Talks or Open roles.
 *
 *   "sections": [{ "title": "Products", "items": [{ "label": "Cloud", "description": "…", "url": "https://…" }] }]
 *
 * Titles, labels and descriptions are localizable and sanitized like any text; URLs must be
 * http(s) without credentials. The counts are capped so a card can never flood a terminal.
 */

import { isObject } from '../checker.js';

export const SECTION_LIMITS = { sections: 6, items: 12, title: 40, label: 60, description: 120 };

function normalizeItem(c, raw, path) {
  if (typeof raw === 'string') raw = { label: raw };
  if (!isObject(raw)) return c.fail(path, 'must be text or { label, description?, url? }'), [];
  c.unknownKeys(path, raw, ['label', 'description', 'url']);
  const label = c.localized(`${path}.label`, raw.label, { max: SECTION_LIMITS.label, required: true });
  const description = c.localized(`${path}.description`, raw.description, { max: SECTION_LIMITS.description });
  const url = c.url(`${path}.url`, raw.url);
  return label ? [{ label, ...(description && { description }), ...(url && { url }) }] : [];
}

export function normalizeSections(c, raw) {
  const sections = c.list('sections', raw, { max: SECTION_LIMITS.sections });
  if (!sections) return [];
  return sections.flatMap((section, i) => {
    const path = `sections[${i}]`;
    if (!isObject(section)) return c.fail(path, 'must be { title, items }'), [];
    c.unknownKeys(path, section, ['title', 'items', 'icon']);
    const title = c.localized(`${path}.title`, section.title, { max: SECTION_LIMITS.title, required: true });
    const icon = c.symbol(`${path}.icon`, section.icon);
    const rawItems = c.list(`${path}.items`, section.items, { max: SECTION_LIMITS.items });
    if (!rawItems?.length) return c.fail(`${path}.items`, 'must list at least one entry'), [];
    const items = rawItems.flatMap((item, j) => normalizeItem(c, item, `${path}.items[${j}]`));
    return title && items.length ? [{ title, items, ...(icon && { icon }) }] : [];
  });
}
