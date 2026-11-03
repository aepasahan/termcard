/** vCard 3.0 (RFC 2426) export of the card's contact details. */

import { localize } from './text.js';

// Escape per RFC 2426 §5: backslash, comma, semicolon and newlines.
const esc = (value) => String(value).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\;').replace(/\r?\n/g, '\\n');

export function createVCard(config, lang) {
  const words = config.name.split(/\s+/);
  const family = words.length > 1 ? words.at(-1) : '';
  const given = words.length > 1 ? words.slice(0, -1).join(' ') : words[0];
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(family)};${esc(given)};;;`,
    `FN:${esc(config.name)}`,
    config.organization && `ORG:${esc(config.organization)}`,
    config.title && `TITLE:${esc(localize(config.title, lang))}`,
    config.email && `EMAIL;TYPE=INTERNET:${esc(config.email)}`,
    config.phone && `TEL;TYPE=CELL:${esc(config.phone)}`,
    config.website && `URL:${esc(config.website)}`,
    ...config.links.map((l) => `X-SOCIALPROFILE;TYPE=${esc(l.id)}:${esc(l.url)}`),
    config.about && `NOTE:${esc(localize(config.about, lang))}`,
    'END:VCARD',
    '',
  ];
  return lines.filter((l) => l !== undefined && l !== false && l !== null).join('\r\n');
}
