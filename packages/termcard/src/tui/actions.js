/**
 * Menu entries. Each entry is { label, hint, run }, where `run` resolves to
 * an outcome: { status, ok } | { view } | { quit: true }.
 * Entries whose data is missing (e.g. "contact" without an email) are skipped.
 */

import { localize } from '../text.js';
import { createVCard } from '../vcard.js';
import { openExternal, copyToClipboard, writeTempFile } from '../system.js';

const host = (url) => new URL(url).host.replace(/^www\./, '');
const slug = (name) => name.normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'contact';

export function buildMenu(config, lang, t, sys = { openExternal, copyToClipboard, writeTempFile }) {
  const done = (ok, key, value) => ({ ok, status: t(key, { value }) });
  const browse = (url) => async () =>
    (await sys.openExternal(url)) ? done(true, 'status.browser') : done(false, 'status.browserFailed', url);
  const copy = (value) => async () =>
    (await sys.copyToClipboard(value)) ? done(true, 'status.copied') : done(false, 'status.copyFailed', value);

  const factories = {
    contact: () =>
      config.email && {
        label: t('action.contact'),
        hint: t('hint.contact'),
        run: async () =>
          (await sys.openExternal(`mailto:${config.email}?subject=${encodeURIComponent(t('mail.subject'))}`))
            ? done(true, 'status.contact')
            : done(false, 'status.contactFailed', config.email),
      },
    save: () => ({
      label: t('action.save'),
      hint: t('hint.save'),
      run: async () => {
        let file;
        try {
          file = sys.writeTempFile(`${slug(config.name)}.vcf`, createVCard(config, lang));
        } catch {
          return done(false, 'status.saveError');
        }
        return (await sys.openExternal(file)) ? done(true, 'status.save') : done(false, 'status.saveFailed', file);
      },
    }),
    website: () =>
      config.website && {
        label: t('action.website'),
        hint: t('hint.website', { host: host(config.website) }),
        run: browse(config.website),
      },
    'copy-email': () => config.email && { label: t('action.copyEmail'), hint: t('hint.copyEmail'), run: copy(config.email) },
    'copy-phone': () => config.phone && { label: t('action.copyPhone'), hint: t('hint.copyPhone'), run: copy(config.phone) },
    language: () =>
      config.language.available.length > 1 && {
        label: t('action.language'),
        hint: t('hint.language'),
        run: async () => ({ view: 'language' }),
      },
    exit: () => ({ label: t('action.exit'), hint: t('hint.exit'), run: async () => ({ quit: true }) }),
  };

  const linkEntry = (link) => ({
    id: `link:${link.id}`,
    label: t('action.link', { label: link.label }),
    hint: t('hint.link', { label: link.label, host: host(link.url) }),
    run: browse(link.url),
  });

  return config.menu.items.flatMap((item) => {
    if (typeof item === 'object') {
      return [{ id: `custom:${item.url}`, label: localize(item.label, lang), hint: localize(item.hint, lang) || t('hint.link', { host: host(item.url) }), run: browse(item.url) }];
    }
    if (item === 'links') return config.links.map(linkEntry);
    if (item.startsWith('link:')) return config.links.filter((l) => l.id === item.slice(5)).map(linkEntry);
    const entry = factories[item]?.();
    return entry ? [{ id: item, ...entry }] : [];
  });
}
