/**
 * Card layout. Produces format-independent lines of segments:
 *   { text, role?, href?, frame? }
 * `role` maps to a theme color, `frame` marks border/padding that the HTML
 * renderer replaces with CSS. Formatters live in ./format.js.
 */

import { displayWidth, localize, stripProtocol, upper } from '../text.js';
import { createTranslator } from '../i18n/index.js';
import { borders } from './borders.js';

const INDENT = '  ';
const seg = (text, role, href) => ({ text, role, href });
const frame = (text, role) => ({ text, role, frame: true });
const widthOf = (segments) => segments.reduce((n, s) => n + displayWidth(s.text), 0);

function nameLines(name, { nameStyle, splitName }, lang) {
  const words = name.split(/\s+/);
  const parts = splitName && words.length > 1 ? [words.slice(0, -1).join(' '), words.at(-1)] : [name];
  return parts.map((part) => {
    if (nameStyle === 'spaced') return [...upper(part, lang)].join(' ');
    if (nameStyle === 'uppercase') return upper(part, lang);
    return part;
  });
}

/** The contact rows the card shows, in the configured order. */
export function contactRows(config, t) {
  const rows = {
    website: config.website && { label: t('label.website'), value: stripProtocol(config.website), href: config.website },
    email: config.email && { label: t('label.email'), value: config.email, href: `mailto:${config.email}` },
    phone: config.phone && { label: t('label.phone'), value: config.phone, href: `tel:${config.phone.replace(/[^\d+]/g, '')}` },
  };
  for (const link of config.links) rows[link.id] = { label: link.label, value: stripProtocol(link.url), href: link.url };
  return config.card.fields.filter((f) => f !== 'location').map((f) => rows[f]).filter(Boolean);
}

export function layoutCard(config, lang) {
  const { card } = config;
  const t = createTranslator(lang, config.strings);
  const text = (value) => localize(value, lang);
  const relaxed = card.spacing === 'relaxed';

  // Content sections; blank lines are inserted between them.
  const sections = [];
  const head = nameLines(config.name, card, lang).map((n) => [seg(n, 'name')]);
  if (config.title) head.push([seg(text(config.title), 'muted')]);

  const brand = [];
  if (config.tagline) brand.push([seg(text(config.tagline), 'accent')]);
  if (card.accentRule) brand.push([seg('───', 'accent')]);
  if (config.about) brand.push([seg(text(config.about), 'muted')]);

  if (relaxed) sections.push(head, brand);
  else sections.push([...head, ...brand]);

  const rows = contactRows(config, t);
  const labelWidth = Math.max(0, ...rows.map((r) => displayWidth(r.label))) + 2;
  sections.push(
    rows.map((r) =>
      card.labels
        ? [seg(r.label + ' '.repeat(labelWidth - displayWidth(r.label)), 'muted'), seg(r.value, 'text', r.href)]
        : [seg(r.value, 'text', r.href)],
    ),
  );

  const location = card.fields.includes('location') && config.location ? [seg(text(config.location), 'muted')] : null;
  const body = sections.filter((s) => s.length).flatMap((s, i) => (i ? [[], ...s] : s));
  if (location) body.push([], { right: card.locationAlign === 'right', segments: location });

  // Normalize to { segments, right } and compute the inner width.
  const content = body.map((l) => (Array.isArray(l) ? { segments: l, right: false } : l));
  const pad = card.padding;
  const box = borders[card.border];
  const contentWidth = Math.max(...content.map((l) => widthOf(l.segments)));
  const innerWidth = Math.max(contentWidth + pad * 2, card.width === 'auto' || !box ? 0 : card.width - 2);
  const usable = innerWidth - pad * 2;

  const place = ({ segments, right }) => {
    const fill = seg(' '.repeat(Math.max(0, usable - widthOf(segments))));
    return right ? [fill, ...segments] : [...segments, fill];
  };

  if (!box) {
    return content.map((l) => [frame(INDENT), ...(l.right ? place(l) : l.segments)]);
  }

  const row = (segments) => [frame(INDENT), frame(box.v, 'faint'), frame(' '.repeat(pad)), ...segments, frame(' '.repeat(pad)), frame(box.v, 'faint')];
  const blank = row([seg(' '.repeat(usable))]);
  return [
    [frame(INDENT), frame(box.tl + box.h.repeat(innerWidth) + box.tr, 'faint')],
    ...(relaxed ? [blank] : []),
    ...content.map((l) => row(place(l))),
    ...(relaxed ? [blank] : []),
    [frame(INDENT), frame(box.bl + box.h.repeat(innerWidth) + box.br, 'faint')],
  ];
}
