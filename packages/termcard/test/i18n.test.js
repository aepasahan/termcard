import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectLanguage, languageFromHeader, createTranslator, BUILT_IN_LANGUAGES } from '../src/i18n/index.js';

const lang = { default: 'auto', available: ['en', 'tr', 'de'] };

test('flag beats environment, environment beats default', () => {
  assert.equal(detectLanguage(lang, { flag: 'de', env: { LANG: 'tr_TR.UTF-8' } }), 'de');
  assert.equal(detectLanguage(lang, { env: { TERMCARD_LANG: 'de', LANG: 'tr_TR.UTF-8' } }), 'de');
  assert.equal(detectLanguage(lang, { env: { LANG: 'tr_TR.UTF-8' } }), 'tr');
  assert.equal(detectLanguage(lang, { env: { LC_ALL: 'de_AT.UTF-8', LANG: 'tr_TR' } }), 'de');
});

test('falls back to English, or to the first available language', () => {
  assert.equal(detectLanguage(lang, { env: { LANG: 'C', LC_ALL: 'POSIX' } }), detectLanguage(lang, { env: {} }));
  assert.equal(detectLanguage({ default: 'auto', available: ['tr'] }, { env: { LANG: 'ja_JP' } }), 'tr');
  assert.equal(detectLanguage({ default: 'tr', available: ['en', 'tr'] }, { env: { LANG: 'en_US' } }), 'tr');
});

test('unknown flag values are ignored', () => {
  assert.equal(detectLanguage(lang, { flag: 'xx', env: { LANG: 'de_DE' } }), 'de');
});

test('Accept-Language parsing', () => {
  assert.equal(languageFromHeader('tr-TR,tr;q=0.9,en;q=0.8', ['en', 'tr']), 'tr');
  assert.equal(languageFromHeader('ja,fr;q=0.5', ['en', 'fr']), 'fr');
  assert.equal(languageFromHeader('', ['en', 'tr']), 'en');
});

test('translator: card overrides, then locale, then English', () => {
  const t = createTranslator('tr', { tr: { 'action.exit': 'Kapat' }, en: { 'custom.key': 'Custom' } });
  assert.equal(t('action.exit'), 'Kapat');
  assert.equal(t('action.save'), 'Rehbere ekle');
  assert.equal(t('custom.key'), 'Custom');
  assert.equal(t('action.link', { label: 'GitHub' }), 'GitHub profilini görüntüle');
});

test('every built-in locale has exactly the same keys', async () => {
  const tables = await Promise.all(BUILT_IN_LANGUAGES.map(async (l) => (await import(`../src/i18n/locales/${l}.js`)).default));
  const reference = Object.keys(tables[0]).sort();
  for (const [i, table] of tables.entries()) assert.deepEqual(Object.keys(table).sort(), reference, BUILT_IN_LANGUAGES[i]);
});

test('fourteen built-in languages, with right-to-left scripts marked', async () => {
  const { textDirection } = await import('../src/i18n/index.js');
  assert.equal(BUILT_IN_LANGUAGES.length, 14);
  for (const lang of ['ar', 'ur']) assert.equal(textDirection(lang), 'rtl');
  for (const lang of ['en', 'zh', 'hi', 'ja', 'ru']) assert.equal(textDirection(lang), 'ltr');
  assert.equal(textDirection('he', {}), 'rtl', 'custom RTL languages work too');
  assert.equal(textDirection('xx', { xx: { 'meta.dir': 'rtl' } }), 'rtl');
});

test('system locales map to the new languages', () => {
  const all = { default: 'auto', available: BUILT_IN_LANGUAGES };
  assert.equal(detectLanguage(all, { env: { LANG: 'zh_CN.UTF-8' } }), 'zh');
  assert.equal(detectLanguage(all, { env: { LANG: 'ar_SA.UTF-8' } }), 'ar');
  assert.equal(detectLanguage(all, { env: { LANG: 'pt_BR.UTF-8' } }), 'pt');
});
