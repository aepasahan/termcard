/** vCard 3.0 (RFC 2426) export of the card's contact details. */

import { localize } from './text.js';

// Escape per RFC 2426 §5: backslash, comma, semicolon and newlines.
const esc = (value) => String(value).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n');

/**
 * @param {{ compact?: boolean, minimal?: boolean }} options for QR codes, which hold little:
 *   compact leaves out the note, profile links and type labels; minimal keeps only the name, organization,
 *   phone, email and website.
 */
export function createVCard(config, lang, { compact = false, minimal = false } = {}) {
  if (minimal) compact = true;
  const organization = config.type === 'organization';
  const words = config.name.split(/\s+/);
  const family = words.length > 1 ? words.at(-1) : '';
  const given = words.length > 1 ? words.slice(0, -1).join(' ') : words[0];
  const address = !minimal && config.address && localize(config.address, lang);
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    // An organization has no personal name; address books show it as a company.
    organization ? 'N:;;;;' : `N:${esc(family)};${esc(given)};;;`,
    `FN:${esc(config.name)}`,
    organization ? `ORG:${esc(config.name)}` : config.organization && `ORG:${esc(config.organization)}`,
    organization && !compact && 'X-ABShowAs:COMPANY',
    // The whole address goes in the street part: Termcard does not split it into fields.
    address && `ADR${compact ? '' : ';TYPE=WORK'}:;;${esc(address)};;;;`,
    !minimal && config.title && `TITLE:${esc(localize(config.title, lang))}`,
    // QR codes hold little, so their vCards leave out the optional type labels.
    config.email && `EMAIL${compact ? '' : ';TYPE=INTERNET'}:${esc(config.email)}`,
    config.phone && `TEL${compact ? '' : `;TYPE=${organization ? 'WORK' : 'CELL'}`}:${esc(config.phone)}`,
    config.website && `URL:${esc(config.website)}`,
    ...(compact ? [] : config.links.map((l) => `X-SOCIALPROFILE;TYPE=${esc(l.id)}:${esc(l.url)}`)),
    !compact && config.description && `NOTE:${esc(localize(config.description, lang))}`,
    'END:VCARD',
    '',
  ];
  return lines.filter((l) => l !== undefined && l !== false && l !== null).join('\r\n');
}
