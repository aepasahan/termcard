import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, ConfigError } from '../src/index.js';
import { base, make } from './helpers.js';

const problems = (raw) => {
  try {
    normalizeConfig(raw);
  } catch (error) {
    assert.ok(error instanceof ConfigError);
    return error.problems;
  }
  assert.fail('expected a ConfigError');
};

test('a name alone is a valid config with defaults applied', () => {
  const config = normalizeConfig({ name: 'Jane' });
  assert.equal(config.template, 'classic');
  assert.deepEqual(config.language, { default: 'auto', available: ['en'] });
  assert.equal(config.menu.enabled, true);
  assert.equal(config.theme.accent, '#d7af5f');
  assert.ok(Object.isFrozen(config));
});

test('reports every problem at once with its path', () => {
  const list = problems({ email: 'nope', website: 'ftp://x.org', unknown: 1, card: { border: 'wavy' } });
  assert.ok(list.includes('name: is required'));
  assert.ok(list.includes('email: is not a valid email address'));
  assert.ok(list.includes('website: must start with https:// or http://'));
  assert.ok(list.includes('unknown: is not a recognized option'));
  assert.ok(list.some((p) => p.startsWith('card.border:')));
});

test('rejects non-web URL schemes and embedded credentials', () => {
  assert.ok(problems({ name: 'A', website: 'javascript:alert(1)' })[0].startsWith('website:'));
  assert.ok(problems({ name: 'A', links: ['https://user:pw@example.com'] })[0].includes('credentials'));
  assert.ok(problems({ name: 'A', menu: { items: [{ label: 'x', url: 'file:///etc/passwd' }] } }).length);
});

test('strips terminal escape sequences and bidi overrides from text', () => {
  const config = normalizeConfig({ name: 'Jane\u001b[31m Doe‮', tagline: 'a\u0007b' });
  assert.equal(config.name, 'Jane[31m Doe');
  assert.equal(config.tagline, 'ab');
});

test('identifies known services and keeps link ids unique', () => {
  const config = make({ links: ['https://github.com/a', 'https://github.com/b', { url: 'https://blog.example.org', label: 'Blog' }] });
  assert.deepEqual(config.links.map((l) => [l.id, l.label]), [['github', 'GitHub'], ['github-2', 'GitHub'], ['example', 'Blog']]);
});

test('card.fields controls what is shown and rejects unknown fields', () => {
  assert.deepEqual(make({ card: { fields: ['email', 'github'] } }).card.fields, ['email', 'github']);
  assert.ok(problems({ ...base, card: { fields: ['phone'] } })[0].includes('unknown field "phone"'));
});

test('template presets can be overridden option by option', () => {
  const config = make({ template: 'minimal', card: { border: 'double', labels: true } });
  assert.equal(config.card.border, 'double');
  assert.equal(config.card.labels, true);
  assert.equal(config.card.nameStyle, 'plain');
});

test('menu: false disables it; items are validated', () => {
  assert.equal(make({ menu: false }).menu.enabled, false);
  assert.deepEqual(make({ menu: { items: ['link:github', 'exit'] } }).menu.items, ['link:github', 'exit']);
  assert.ok(problems({ ...base, menu: { items: ['link:nope'] } }).length);
});

test('languages: custom languages need strings, default must be available', () => {
  assert.ok(problems({ name: 'A', language: { available: ['ja'] } })[0].includes('strings.ja'));
  assert.doesNotThrow(() => normalizeConfig({ name: 'A', language: { available: ['ja'] }, strings: { ja: { 'action.exit': '終了' } } }));
  assert.ok(problems({ name: 'A', language: { default: 'de', available: ['en'] } }).length);
});

test('theme accepts presets and hex overrides only', () => {
  assert.equal(make({ theme: 'ocean' }).theme.accent, '#5fafd7');
  assert.equal(make({ theme: { preset: 'mono', accent: '#FF0000' } }).theme.accent, '#ff0000');
  assert.ok(problems({ name: 'A', theme: { accent: 'red' } }).length);
});

test('a name of only spaces or control characters is rejected', () => {
  assert.ok(problems({ name: '   ' }).includes('name: is required'));
  assert.ok(problems({ name: '\u001b\u0007' }).includes('name: is required'));
});

test('emails that would alter a mailto: link are rejected', () => {
  for (const email of ['a?body=x@x.com', 'a&cc=b@x.com', 'a%0A@x.com', 'a/b@x.com', 'a#b@x.com']) {
    assert.ok(problems({ name: 'A', email }).includes('email: is not a valid email address'), email);
  }
  assert.equal(make({ email: 'first.last+tag@sub.example.co' }).email, 'first.last+tag@sub.example.co');
});

test('language shorthand and case-insensitive codes', () => {
  assert.deepEqual(normalizeConfig({ name: 'A', language: 'de' }).language, { default: 'de', available: ['de'] });
  assert.deepEqual(normalizeConfig({ name: 'A', language: { default: 'DE', available: ['de'] } }).language, { default: 'de', available: ['de'] });
});

test('an empty menu is rejected', () => {
  assert.ok(problems({ name: 'A', menu: { items: [] } })[0].startsWith('menu.items:'));
});

test('explicit link ids are never renamed; generated ids avoid them', () => {
  const config = make({ links: ['https://github.com/a', { url: 'https://example.org', id: 'github-2' }, 'https://github.com/b'] });
  assert.deepEqual(config.links.map((l) => l.id), ['github', 'github-2', 'github-3']);
  assert.ok(problems({ name: 'A', links: [{ url: 'https://a.org', id: 'x' }, { url: 'https://b.org', id: 'x' }] })[0].includes('already used'));
});

test('unusual hosts still get a usable generated id', () => {
  const ids = make({ links: ['https://[::1]/', 'https://my_site.example/'] }).links.map((l) => l.id);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
});
