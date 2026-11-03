import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutCard, toAnsi, toPlain, toHtml, createVCard } from '../src/index.js';
import { hexTo256, colorDepth } from '../src/render/color.js';
import { displayWidth } from '../src/text.js';
import { make } from './helpers.js';

const widths = (text) => text.split('\n').map(displayWidth);

for (const template of ['classic', 'compact', 'minimal']) {
  for (const border of ['rounded', 'square', 'double', 'heavy']) {
    test(`${template}/${border}: every framed line has the same width`, () => {
      const plain = toPlain(layoutCard(make({ template, card: { border } }), 'en'));
      assert.equal(new Set(widths(plain)).size, 1, plain);
    });
  }
}

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
