/** "links": profile and other links, each with a stable id that menus and card.fields refer to. */

import { slugify } from '../../text.js';
import { isObject } from '../checker.js';
import { identifyService } from '../services.js';

export function normalizeLinks(c, raw) {
  const entries = c.list('links', raw);
  if (!entries) return [];
  const seen = new Set();
  // Ids set by the author win; generated ids step around them.
  const explicitIds = new Set(entries.filter((e) => isObject(e) && typeof e.id === 'string').map((e) => e.id));
  return entries.flatMap((entry, i) => {
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
    const icon = c.symbol(`${path}.icon`, entry.icon);
    return [{ id, label: c.text(`${path}.label`, entry.label, { max: 40 }) ?? service.label, url: href, service: service.id, ...(icon && { icon }) }];
  });
}
