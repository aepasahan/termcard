import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutCard, layoutHeader, toAnsi, toPlain, toHtml, createVCard } from '../src/index.js';
import { hexTo256, colorDepth } from '../src/render/color.js';
import { displayWidth } from '../src/text.js';
import { make } from './helpers.js';

const widths = (text) => text.split('\n').map(displayWidth);

const LONG = 'Designing calm, accessible interfaces and design systems for teams that care about craft.';

for (const template of ['classic', 'compact', 'minimal']) {
  for (const border of ['rounded', 'square', 'double', 'heavy']) {
    for (const icons of ['none', 'symbols', 'emoji', 'nerd']) {
      test(`${template}/${border}/${icons}: every framed line has the same width`, () => {
        const plain = toPlain(layoutCard(make({ template, icons, description: LONG, card: { border } }), 'en'));
        assert.equal(new Set(widths(plain)).size, 1, plain);
      });
    }
  }
}

test('long descriptions wrap inside the card', () => {
  const lines = toPlain(layoutCard(make({ description: LONG }), 'en')).split('\n');
  assert.ok(lines.filter((l) => /Designing|design systems|craft/.test(l)).length >= 2);
  assert.ok(lines.every((l) => displayWidth(l) === displayWidth(lines[0])));
});

test('icons appear before each row and the location; links can override theirs', () => {
  const plain = toPlain(layoutCard(make({ icons: 'symbols', links: [{ url: 'https://github.com/jane', icon: '★' }] }), 'en'));
  assert.match(plain, /✉ Email/);
  assert.match(plain, /★ GitHub/);
  assert.match(plain, /◎ Berlin/);
});

test('card: false prints the minimal layout when no menu can be shown', () => {
  const plain = toPlain(layoutCard(make({ card: false }), 'en'));
  assert.ok(!plain.includes('╭'));
  assert.match(plain, /Jane Doe/);
});

test('header for menu-only mode shows name, tagline and description', () => {
  const plain = toPlain(layoutHeader(make({ description: 'Short bio.' }), 'en'));
  assert.match(plain, /Jane Doe {2}· {2}@studio/);
  assert.match(plain, /Short bio\./);
});

test('classic template splits and letter-spaces the name', () => {
  const plain = toPlain(layoutCard(make(), 'en'));
  assert.match(plain, /J A N E\s+│/);
  assert.match(plain, /D O E\s+│/);
});

test('uppercasing is locale-aware (Turkish dotted İ)', () => {
  const plain = toPlain(layoutCard(make({ name: 'İlkim Işık', language: { available: ['tr'] } }), 'tr'));
  assert.match(plain, /İ L K İ M/);
  assert.match(plain, /I Ş I K/);
});

test('wide characters keep the frame aligned', () => {
  const plain = toPlain(layoutCard(make({ name: '山田 太郎', tagline: '🚀 shipping ☕', template: 'compact' }), 'en'));
  assert.equal(new Set(widths(plain)).size, 1, plain);
});

test('localized fields follow the language', () => {
  assert.match(toPlain(layoutCard(make(), 'tr')), /Tasarımcı[\s\S]*E-posta[\s\S]*Almanya/);
  assert.match(toPlain(layoutCard(make(), 'en')), /Designer[\s\S]*Email[\s\S]*Germany/);
});

test('ANSI output without color equals plain text', () => {
  const lines = layoutCard(make(), 'en');
  assert.equal(toAnsi(lines, make().theme, 0), toPlain(lines));
  assert.match(toAnsi(lines, make().theme, 256), /\x1b\[38;5;179m@studio/);
  assert.match(toAnsi(lines, make().theme, 256), /\x1b\[1mJ A N E\x1b\[0m/, 'text uses the terminal color');
  assert.match(toAnsi(lines, make().theme, 16777216), /\x1b\[38;2;215;175;95m/);
});

test('HTML output escapes user content and drops the text frame', () => {
  const html = toHtml(layoutCard(make({ name: '<img src=x onerror=alert(1)>' }), 'en'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('╭'));
  assert.match(html, /<a href="https:\/\/jane\.dev\/" target="_blank" rel="noopener noreferrer">/);
});

test('hex → xterm-256 mapping', () => {
  assert.equal(hexTo256('#d7af5f'), 179);
  assert.equal(hexTo256('#585858'), 240);
  assert.equal(hexTo256('#000000'), 16);
});

test('color depth honors NO_COLOR, FORCE_COLOR and TTY', () => {
  const tty = { isTTY: true };
  assert.equal(colorDepth(tty, { NO_COLOR: '1' }), 0);
  assert.equal(colorDepth({ isTTY: false }, {}), 0);
  assert.equal(colorDepth({ isTTY: false }, { FORCE_COLOR: '1' }), 256);
  assert.equal(colorDepth(tty, { COLORTERM: 'truecolor' }), 16777216);
  assert.equal(colorDepth(tty, { TERM: 'dumb' }), 0);
});

test('vCard escapes special characters', () => {
  const vcard = createVCard(make({ name: 'Jane Doe', organization: 'A, B; C' }), 'en');
  assert.match(vcard, /^BEGIN:VCARD\r\nVERSION:3\.0\r\nN:Doe;Jane;;;\r\n/);
  assert.ok(vcard.includes('ORG:A\\, B\\; C\r\n'), vcard);
  assert.ok(createVCard(make({ name: 'Ann;Lee Doe' }), 'en').includes('N:Doe;Ann\\;Lee;;;\r\n'));
  assert.match(vcard, /TITLE:Designer/);
  assert.match(vcard, /X-SOCIALPROFILE;TYPE=github:https:\/\/github\.com\/jane/);
});

test('names in scripts without case are not letter-spaced', () => {
  const arabic = toPlain(layoutCard(make({ name: 'محمد علي', language: { available: ['ar'] } }), 'ar'));
  assert.match(arabic, /محمد/);
  assert.doesNotMatch(arabic, /م ح م د/);
  assert.match(toPlain(layoutCard(make({ name: 'Иван Петров' }), 'en')), /И В А Н/);
});

test('Arabic diacritics and CJK text keep the frame aligned', () => {
  for (const [lang, tagline] of [['ar', 'مَرْحَبًا بِكُمْ'], ['zh', '设计师与开发者'], ['ja', 'デザイナー']]) {
    const plain = toPlain(layoutCard(make({ tagline, language: { available: [lang] } }), lang));
    assert.equal(new Set(widths(plain)).size, 1, plain);
  }
});

test('Turkish names keep their dotted İ in every language of a Turkish card', () => {
  const config = make({ name: 'Elif Yılmaz', language: { available: ['en', 'tr'] } });
  assert.match(toPlain(layoutCard(config, 'en')), /E L İ F/);
  assert.match(toPlain(layoutCard(make({ name: 'Elif Smith', language: { available: ['en'] } }), 'en')), /E L I F/);
});

test('the accent rule only appears under a tagline', () => {
  const rule = /│\s+───\s+│/; // the short accent line inside the frame, not the border
  assert.doesNotMatch(toPlain(layoutCard(make({ tagline: undefined }), 'en')), rule);
  assert.match(toPlain(layoutCard(make(), 'en')), rule);
});
