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
    'copy-email': () => config.email && { icon: icon('email'), label: t('action.copyEmail'), hint: t('hint.copyEmail'), run: copy(config.email) },
    'copy-phone': () => config.phone && { icon: icon('phone'), label: t('action.copyPhone'), hint: t('hint.copyPhone'), run: copy(config.phone) },
    language: () =>
      config.language.available.length > 1 && {
        icon: icon('language'),
        label: t('action.language'),
        hint: t('hint.language'),
        run: async () => ({ view: 'language' }),
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

  return config.menu.items.flatMap((item) => {
    if (typeof item === 'object') {
      return [{ id: `custom:${item.url}`, icon: icon('link'), label: localize(item.label, lang), hint: localize(item.hint, lang) || t('hint.link', { host: host(item.url) }), run: browse(item.url) }];
    }
    if (item === 'links') return config.links.map(linkEntry);
    if (item.startsWith('link:')) return config.links.filter((l) => l.id === item.slice(5)).map(linkEntry);
    const entry = factories[item]?.();
    return entry ? [{ id: item, ...entry }] : [];
  });
}
