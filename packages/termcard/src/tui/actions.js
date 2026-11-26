/**
 * Menu entries. Each entry is { id, icon, label, hint, run }, where `run` resolves to
 * an outcome: { status, ok } | { view } | { quit: true }.
 * Entries whose data is missing (e.g. "contact" without an email) are skipped.
 *
 * This module has no Node-only imports (the web builder uses it for previews);
 * operating-system access is passed in as `sys` (see ../system.js).
 */

import { localize, slugify } from '../text.js';
import { createVCard } from '../vcard.js';
import { iconFor } from '../render/icons.js';
import { encodeQr } from '../render/qr.js';

// Small codes fit a terminal window and scan easily; past this size the contact is shortened.
const COMFORTABLE_QR_VERSION = 6;

/**
 * The QR codes a card can show: the contact (the vCard without notes and profiles, or, when that
 * makes a large code, just name, organization, phone, email and website) and the website.
 * Codes that do not fit in a QR code at all are left out.
 */
export function cardQrCodes(config, lang) {
  const contact =
    encodeQr(createVCard(config, lang, { compact: true }), { maxVersion: COMFORTABLE_QR_VERSION }) ??
    encodeQr(createVCard(config, lang, { minimal: true }));
  const website = config.website && encodeQr(config.website);
  return [contact && { kind: 'contact', code: contact }, website && { kind: 'website', code: website }].filter(Boolean);
}

/** A search link for an address on a map; opened only when the visitor picks it. */
export const mapsUrl = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const unavailable = async () => false;
const offline = { openExternal: unavailable, copyToClipboard: unavailable, writeTempFile: () => { throw new Error('unavailable'); } };

const host = (url) => new URL(url).host.replace(/^www\./, '');

export function buildMenu(config, lang, t, sys = offline) {
  const icon = (key, link) => iconFor(config.icons, key, link);
  const done = (ok, key, value) => ({ ok, status: t(key, { value }) });
  const browse = (url) => async () =>
    (await sys.openExternal(url)) ? done(true, 'status.browser') : done(false, 'status.browserFailed', url);
  const copy = (value) => async () =>
    (await sys.copyToClipboard(value)) ? done(true, 'status.copied') : done(false, 'status.copyFailed', value);

  const factories = {
    contact: () =>
      config.email && {
        icon: icon('email'),
        label: t('action.contact'),
        hint: t('hint.contact'),
        run: async () =>
          (await sys.openExternal(`mailto:${config.email}?subject=${encodeURIComponent(t('mail.subject'))}`))
            ? done(true, 'status.contact')
            : done(false, 'status.contactFailed', config.email),
      },
    save: () => ({
      icon: icon('save'),
      label: t('action.save'),
      hint: t('hint.save'),
      run: async () => {
        let file;
        try {
          file = sys.writeTempFile(`${slugify(config.name) || 'contact'}.vcf`, createVCard(config, lang));
        } catch {
          return done(false, 'status.saveError');
        }
        return (await sys.openExternal(file)) ? done(true, 'status.save') : done(false, 'status.saveFailed', file);
      },
    }),
    website: () =>
      config.website && {
        icon: icon('website'),
        label: t('action.website'),
        hint: t('hint.website', { host: host(config.website) }),
        run: browse(config.website),
      },
    qr: () => {
      const codes = cardQrCodes(config, lang);
      if (!codes.length) return null;
      const label = (qr) => t(qr.kind === 'contact' ? 'action.qrContact' : 'action.qrWebsite');
      const hint = (qr) => (qr.kind === 'contact' ? t('hint.qr') : t('hint.qrWebsite', { host: host(config.website) }));
      const show = (qr) => async () => ({ view: { kind: 'qr', title: `${t('action.qr')} · ${label(qr)}`, modules: qr.code.modules, hint: hint(qr) } });
      // One code opens straight away; with both, the visitor picks which one to scan.
      if (codes.length === 1) return { icon: icon('qr'), label: t('action.qr'), hint: hint(codes[0]), run: show(codes[0]) };
      return {
        icon: icon('qr'),
        label: t('action.qr'),
        hint: t('hint.qrChoice'),
        run: async () => ({ view: { kind: 'list', title: t('action.qr'), items: codes.map((qr) => ({ label: label(qr), hint: hint(qr), run: show(qr) })) } }),
      };
    },
    address: () => {
      if (!config.address) return null;
      const address = localize(config.address, lang);
      return {
        icon: icon('address'),
        label: t('action.address'),
        hint: address,
        run: async () => ({
          view: {
            kind: 'list',
            title: t('label.address'),
            text: address,
            items: [
              { label: t('action.maps'), hint: t('hint.maps'), run: browse(mapsUrl(address)) },
              { label: t('action.copyAddress'), hint: t('hint.copyAddress'), run: copy(address) },
            ],
          },
        }),
      };
    },
    'copy-email': () => config.email && { icon: icon('email'), label: t('action.copyEmail'), hint: t('hint.copyEmail'), run: copy(config.email) },
    'copy-phone': () => config.phone && { icon: icon('phone'), label: t('action.copyPhone'), hint: t('hint.copyPhone'), run: copy(config.phone) },
    language: () =>
      config.language.available.length > 1 && {
        icon: icon('language'),
        label: t('action.language'),
        hint: t('hint.language'),
        run: async () => ({ view: { kind: 'language' } }),
      },
    exit: () => ({ icon: icon('exit'), label: t('action.exit'), hint: t('hint.exit'), run: async () => ({ quit: true }) }),
  };

  const linkEntry = (link) => ({
    id: `link:${link.id}`,
    icon: icon('link', link),
    label: t('action.link', { label: link.label }),
    hint: t('hint.link', { label: link.label, host: host(link.url) }),
    run: browse(link.url),
  });

  // Each section opens a list view; its entries open their URL, if they have one.
  const sectionEntry = (section, i) => {
    const title = localize(section.title, lang);
    return {
      id: `section:${i}`,
      icon: section.icon ?? config.menu.icons?.sections ?? icon('section'),
      label: title,
      hint: t('hint.section'),
      run: async () => ({
        view: {
          kind: 'list',
          title,
          items: section.items.map((item) => ({
            label: localize(item.label, lang),
            hint: localize(item.description, lang) || (item.url ? t('hint.link', { host: host(item.url) }) : ''),
            ...(item.url && { run: browse(item.url) }),
          })),
        },
      }),
    };
  };

  return config.menu.items.flatMap((item) => {
    if (typeof item === 'object') {
      return [{ id: `custom:${item.url}`, icon: item.icon ?? icon('link'), label: localize(item.label, lang), hint: localize(item.hint, lang) || t('hint.link', { host: host(item.url) }), run: browse(item.url) }];
    }
    if (item === 'links') {
      // Several profiles can sit behind one entry, so the menu stays short.
      if (config.menu.links !== 'list' || config.links.length < 2) return config.links.map(linkEntry);
      return [{
        id: 'links',
        icon: config.menu.icons?.links ?? icon('link'),
        label: t('action.links'),
        hint: config.links.map((l) => l.label).join(' · '),
        run: async () => ({
          view: { kind: 'list', title: t('action.links'), items: config.links.map((l) => ({ icon: icon('link', l), label: l.label, hint: t('hint.link', { host: host(l.url) }), run: browse(l.url) })) },
        }),
      }];
    }
    if (item === 'sections') return config.sections.map(sectionEntry);
    if (item.startsWith('link:')) return config.links.filter((l) => l.id === item.slice(5)).map(linkEntry);
    const entry = factories[item]?.();
    // The owner can pick the symbol for any built-in entry ("menu": { "icons": { … } }).
    const own = config.menu.icons?.[item];
    return entry ? [{ id: item, ...entry, ...(own && { icon: own }) }] : [];
  });
}
