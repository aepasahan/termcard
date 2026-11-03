import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMenu } from '../src/tui/actions.js';
import { createTranslator } from '../src/i18n/index.js';
import { openExternal } from '../src/system.js';
import { make } from './helpers.js';

const fakeSystem = ({ open = true, copy = true } = {}) => {
  const calls = [];
  return {
    calls,
    openExternal: async (target) => (calls.push(['open', target]), open),
    copyToClipboard: async (text) => (calls.push(['copy', text]), copy),
    writeTempFile: (name, content) => (calls.push(['write', name, content.slice(0, 11)]), `/tmp/x/${name}`),
  };
};

const menu = (config, sys, lang = 'en') => buildMenu(config, lang, createTranslator(lang, config.strings), sys);

test('default menu expands links and skips actions without data', () => {
  const labels = menu(make({ email: undefined, website: undefined }), fakeSystem()).map((e) => e.label);
  assert.deepEqual(labels, ['Save contact', 'View GitHub profile', 'View LinkedIn profile', 'Language', 'Exit']);
});

test('language entry only appears with more than one language', () => {
  const ids = menu(make({ language: { available: ['en'] } }), fakeSystem()).map((e) => e.id);
  assert.ok(!ids.includes('language'));
});

test('contact opens a localized mailto draft', async () => {
  const sys = fakeSystem();
  const entry = menu(make(), sys, 'tr').find((e) => e.id === 'contact');
  assert.deepEqual(await entry.run(), { ok: true, status: 'E-posta taslağı açıldı.' });
  assert.deepEqual(sys.calls, [['open', 'mailto:jane@example.com?subject=Merhaba']]);
});

test('save writes a vCard and opens it; failures report the path', async () => {
  const sys = fakeSystem({ open: false });
  const result = await menu(make(), sys).find((e) => e.id === 'save').run();
  assert.equal(sys.calls[0][0], 'write');
  assert.equal(sys.calls[0][1], 'jane-doe.vcf');
  assert.equal(result.ok, false);
  assert.match(result.status, /jane-doe\.vcf/);
});

test('custom menu items and explicit link items', async () => {
  const sys = fakeSystem();
  const entries = menu(make({ menu: { items: [{ label: { en: 'Book a call', tr: 'Görüşme planla' }, url: 'https://cal.com/jane' }, 'link:github'] } }), sys);
  assert.deepEqual(entries.map((e) => e.label), ['Book a call', 'View GitHub profile']);
  await entries[0].run();
  assert.deepEqual(sys.calls, [['open', 'https://cal.com/jane']]);
});

test('openExternal refuses anything that is not a web/mail/tel URL or absolute path', async () => {
  assert.equal(await openExternal('--version'), false);
  assert.equal(await openExternal('javascript:alert(1)'), false);
  assert.equal(await openExternal('relative/file.vcf'), false);
});
