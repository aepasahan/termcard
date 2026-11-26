/**
 * Card layout. Produces format-independent lines of segments:
 *   { text, role?, href?, frame? }
 * `role` maps to a theme color, `frame` marks border/padding that the HTML
 * renderer replaces with CSS. Formatters live in ./format.js.
 */

import { displayWidth, hasCase, localize, stripProtocol, upper, wrap } from '../text.js';
import { createTranslator } from '../i18n/index.js';
import { borders } from './borders.js';
import { iconFor } from './icons.js';
import { templates } from '../config/templates.js';

const INDENT = '  ';
const seg = (text, role, href) => ({ text, role, href });
const frame = (text, role) => ({ text, role, frame: true });
const widthOf = (segments) => segments.reduce((n, s) => n + displayWidth(s.text), 0);

function nameLines(name, { nameStyle, splitName, letterSpacing }, lang) {
  const words = name.split(/\s+/);
  const parts = splitName && words.length > 1 ? [words.slice(0, -1).join(' '), words.at(-1)] : [name];
  // "spaced" is uppercase with one space between letters; letterSpacing (0–3) overrides the gap.
  const gap = ' '.repeat(letterSpacing ?? (nameStyle === 'spaced' ? 1 : 0));
  return parts.map((part) => {
    // Scripts without case (Arabic, Devanagari, CJK, …) are shown as written: spacing would break them.
    if (!hasCase(part)) return part;
    const text = nameStyle === 'plain' ? part : upper(part, lang);
    return gap ? [...text].join(gap) : text;
  });
}

/** The contact rows the card shows, in the configured order. */
export function contactRows(config, t, iconSet = config.icons, lang = config.language.available[0]) {
  const rows = {
    website: config.website && { label: t('label.website'), value: stripProtocol(config.website), href: config.website, icon: iconFor(iconSet, 'website') },
    email: config.email && { label: t('label.email'), value: config.email, href: `mailto:${config.email}`, icon: iconFor(iconSet, 'email') },
    phone: config.phone && { label: t('label.phone'), value: config.phone, href: `tel:${config.phone.replace(/[^\d+]/g, '')}`, icon: iconFor(iconSet, 'phone') },
  };
  // Address and hours are plain text, not links.
  if (config.address) rows.address = { label: t('label.address'), value: localize(config.address, lang), icon: iconFor(iconSet, 'address'), wrap: true };
  if (config.hours) rows.hours = { label: t('label.hours'), value: localize(config.hours, lang), icon: iconFor(iconSet, 'hours'), wrap: true };
  for (const link of config.links) {
    rows[link.id] = { label: link.label, value: stripProtocol(link.url), href: link.url, icon: iconFor(iconSet, 'link', link) };
  }
  return config.card.fields.filter((f) => f !== 'location').map((f) => rows[f]).filter(Boolean);
}

/** Width that the description wraps to: the card's inner width, or a comfortable default. */
const descriptionWidth = (card, box) => (typeof card.width === 'number' && box ? card.width - 2 - card.padding * 2 : 46);

/** Options for `layoutCard`: { iconSet } overrides config.icons (the web page uses this). */
/** One-line header shown above the menu when the card itself is turned off. */
export function layoutHeader(config, lang) {
  const text = (value) => localize(value, lang);
  const first = [seg(config.name, 'name')];
  if (config.tagline) first.push(seg('  ·  ', 'faint'), seg(text(config.tagline), 'accent'));
  const lines = [first];
  if (config.title) lines.push([seg(text(config.title), 'muted')]);
  if (config.description) for (const line of wrap(text(config.description), 60)) lines.push([seg(line, 'muted')]);
  return lines.map((line) => [frame(INDENT), ...line]);
}

export function layoutCard(config, lang, { iconSet = config.icons } = {}) {
  // With "card": false the card is still printed where no menu can be shown (pipes, --card).
  const card = config.card.enabled ? config.card : { ...config.card, ...templates.minimal };
  const t = createTranslator(lang, config.strings);
  const text = (value) => localize(value, lang);
  const relaxed = card.spacing === 'relaxed';

  // Content sections; blank lines are inserted between them.
  const sections = [];
  if (config.logo) sections.push(config.logo.map((line) => [seg(line, 'accent')]));
  // A name is spelled the same in every language: if the card is in Turkish or Azerbaijani,
  // capitalize it with those rules everywhere (Elif → ELİF, not ELIF).
  const nameLocale = ['tr', 'az'].find((l) => config.language.available.includes(l)) ?? lang;
  const head = nameLines(config.name, card, nameLocale).map((n) => [seg(n, 'name')]);
  if (config.title) head.push([seg(text(config.title), 'muted')]);

  const brand = [];
  if (config.tagline) brand.push([seg(text(config.tagline), 'accent')]);
  if (card.accentRule && config.tagline) brand.push([seg('───', 'accent')]);
  if (config.description) {
    for (const line of wrap(text(config.description), descriptionWidth(card, borders[card.border]))) brand.push([seg(line, 'muted')]);
  }

  if (relaxed) sections.push(head, brand);
  else sections.push([...head, ...brand]);

  const rows = contactRows(config, t, iconSet, lang);
  const labelWidth = Math.max(0, ...rows.map((r) => displayWidth(r.label))) + 2;
  const iconWidth = Math.max(0, ...rows.map((r) => displayWidth(r.icon)), displayWidth(iconFor(iconSet, 'location')));
  const icon = (glyph) => (iconWidth ? [seg(glyph + ' '.repeat(iconWidth - displayWidth(glyph) + 1), 'accent')] : []);
  // Long plain-text values (an address) wrap; continuation lines line up under the value.
  const prefixWidth = (iconWidth ? iconWidth + 1 : 0) + (card.labels ? labelWidth : 0);
  // As wide as the other values already make the card, or the description width, if wider.
  const widest = Math.max(0, ...rows.filter((r) => !r.wrap).map((r) => displayWidth(r.value)));
  const valueWidth = Math.max(24, widest, descriptionWidth(card, borders[card.border]) - prefixWidth);
  sections.push(
    rows.flatMap((r) => {
      const [first, ...rest] = r.wrap ? wrap(r.value, valueWidth) : [r.value];
      return [
        [...icon(r.icon), ...(card.labels ? [seg(r.label + ' '.repeat(labelWidth - displayWidth(r.label)), 'muted')] : []), seg(first, 'text', r.href)],
        ...rest.map((line) => [seg(' '.repeat(prefixWidth)), seg(line, 'text')]),
      ];
    }),
  );

  const location =
    card.fields.includes('location') && config.location ? [...icon(iconFor(iconSet, 'location')), seg(text(config.location), 'muted')] : null;
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
