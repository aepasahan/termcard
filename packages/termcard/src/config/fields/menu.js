/** "menu": which entries the interactive menu shows, in what order, and their icons. */

import { isObject } from '../checker.js';
import { DEFAULT_MENU, MENU_ACTIONS } from '../templates.js';

const ICON_KEYS = MENU_ACTIONS.filter((a) => a !== 'links');

function normalizeIcons(c, raw) {
  // "icons": { "contact": "✉", "save": "★" } picks the symbol for built-in menu entries.
  const icons = {};
  if (raw === undefined) return icons;
  if (!isObject(raw)) return c.fail('menu.icons', 'must be an object like { "contact": "✉" }'), icons;
  for (const [key, v] of Object.entries(raw)) {
    if (!ICON_KEYS.includes(key)) { c.fail(`menu.icons.${key}`, `unknown entry (use ${ICON_KEYS.join(', ')})`); continue; }
    const icon = c.symbol(`menu.icons.${key}`, v);
    if (icon) icons[key] = icon;
  }
  return icons;
}

function normalizeItem(c, item, path, linkIds) {
  if (typeof item === 'string') {
    if (MENU_ACTIONS.includes(item)) return [item];
    const link = item.startsWith('link:') && item.slice(5);
    if (link && linkIds.includes(link)) return [item];
    c.fail(path, `unknown item "${item}" (use ${MENU_ACTIONS.join(', ')} or link:<id>)`);
    return [];
  }
  // A custom entry that opens a URL.
  if (!isObject(item)) return c.fail(path, 'must be an action name or { label, url, hint? }'), [];
  c.unknownKeys(path, item, ['label', 'url', 'hint', 'icon']);
  const label = c.localized(`${path}.label`, item.label);
  const href = c.url(`${path}.url`, item.url, { required: true });
  if (!label) c.fail(`${path}.label`, 'is required');
  const icon = c.symbol(`${path}.icon`, item.icon);
  return label && href ? [{ label, url: href, hint: c.localized(`${path}.hint`, item.hint), ...(icon && { icon }) }] : [];
}

export function normalizeMenu(c, raw, linkIds) {
  if (raw === false) return { enabled: false, items: [], icons: {} };
  const value = raw === undefined || raw === true ? {} : raw;
  if (!isObject(value)) return c.fail('menu', 'must be false or { items, icons }'), { enabled: true, items: DEFAULT_MENU, icons: {} };
  c.unknownKeys('menu', value, ['items', 'icons']);
  const icons = normalizeIcons(c, value.icons);
  if (value.items === undefined) return { enabled: true, items: DEFAULT_MENU, icons };
  if (!Array.isArray(value.items)) return c.fail('menu.items', 'must be an array'), { enabled: true, items: DEFAULT_MENU, icons };

  const items = value.items.flatMap((item, i) => normalizeItem(c, item, `menu.items[${i}]`, linkIds));
  if (!items.length) c.fail('menu.items', 'must contain at least one item (or set "menu": false)');
  return { enabled: true, items, icons };
}
