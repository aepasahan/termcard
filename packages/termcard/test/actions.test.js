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

test('vCard file name is transliterated', async () => {
  const sys = fakeSystem();
  await menu(make({ name: 'Ahmet Erkan Paşahan' }), sys).find((e) => e.id === 'save').run();
  assert.equal(sys.calls[0][1], 'ahmet-erkan-pasahan.vcf');
});

test('openExternal refuses anything that is not a web/mail/tel URL or absolute path', async () => {
  assert.equal(await openExternal('--version'), false);
  assert.equal(await openExternal('javascript:alert(1)'), false);
  assert.equal(await openExternal('relative/file.vcf'), false);
});

test('sections become menu entries that open their list', async () => {
  const { normalizeConfig } = await import('../src/index.js');
  const config = normalizeConfig({
    name: 'Acme', type: 'organization', email: 'hi@acme.example',
    sections: [
      { title: { en: 'Products', tr: 'Ürünler' }, items: [{ label: 'Cloud', description: 'Hosting', url: 'https://acme.example/cloud' }, 'Consulting'] },
      { title: 'Open roles', icon: '★', items: ['Designer'] },
    ],
  });
  const entries = buildMenu(config, 'tr', createTranslator('tr'));
  const products = entries.find((e) => e.id === 'section:0');
  assert.equal(products.label, 'Ürünler');
  assert.equal(entries.find((e) => e.id === 'section:1').icon, '★');
  const { view } = await products.run();
  assert.equal(view.kind, 'list');
  assert.deepEqual(view.items.map((i) => [i.label, i.hint, typeof i.run]), [['Cloud', 'Hosting', 'function'], ['Consulting', '', 'undefined']]);
  // Organizations lead with contact, save, the QR code, website and their sections.
  assert.deepEqual(entries.map((e) => e.id).slice(0, 5), ['contact', 'save', 'qr', 'section:0', 'section:1']);
});

test('sections are validated, limited and sanitized', async () => {
  const { normalizeConfig } = await import('../src/index.js');
  const bad = (sections) => () => normalizeConfig({ name: 'X', sections });
  assert.throws(bad(Array(7).fill({ title: 'A', items: ['x'] })), /sections: must have at most 6 entries/);
  assert.throws(bad([{ title: 'A', items: Array(13).fill('x') }]), /sections\[0\]\.items: must have at most 12 entries/);
  assert.throws(bad([{ title: 'A', items: [] }]), /must list at least one entry/);
  assert.throws(bad([{ items: ['x'] }]), /sections\[0\]\.title: is required/);
  assert.throws(bad([{ title: 'A', items: [{ label: 'x', url: 'javascript:alert(1)' }] }]), /must start with https:\/\/ or http:\/\//);
  assert.equal(normalizeConfig({ name: 'X', sections: [{ title: 'A\u001b[2J', items: ['b‮'] }] }).sections[0].title, 'A[2J');
  assert.deepEqual(normalizeConfig({ name: 'X' }).sections, []);
});
