import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutCard, layoutHeader, toAnsi, toPlain, toHtml, createVCard } from '../src/index.js';
import { hexTo256, colorDepth } from '../src/render/color.js';
import { normalizeConfig } from '../src/index.js';
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

test('letterSpacing sets the gap between the letters of the name', () => {
  assert.match(toPlain(layoutCard(make({ card: { letterSpacing: 2 } }), 'en')), /J {2}A {2}N {2}E/);
  assert.match(toPlain(layoutCard(make({ card: { nameStyle: 'plain', letterSpacing: 1 } }), 'en')), /J a n e/);
  assert.match(toPlain(layoutCard(make({ card: { letterSpacing: 0 } }), 'en')), /JANE/);
  assert.throws(() => normalizeConfig({ name: 'X', card: { letterSpacing: 4 } }), /letterSpacing/);
});

test('a card background fills the box, and default text becomes readable on it', () => {
  const config = make({ theme: { preset: 'frost', background: '#f4f1ea' } });
  assert.equal(config.theme.text, '#1c1c1c');
  const lines = toAnsi(layoutCard(config, 'en'), config.theme, 16777216).split('\n');
  assert.match(lines[0], /^ {2}\x1b\[[\d;]*48;2;244;241;234m╭/, 'the left margin stays unfilled');
  assert.ok(lines.slice(0, -1).every((l) => l.includes('48;2;244;241;234')));
  assert.equal(toAnsi(layoutCard(config, 'en'), config.theme, 0), toPlain(layoutCard(config, 'en')));
  assert.equal(make().theme.background, 'default');
});

test('a two-color background paints a gradient across the box', () => {
  const config = make({ theme: { preset: 'frost', background: ['#000000', '#ffffff'] } });
  const line = toAnsi(layoutCard(config, 'en'), config.theme, 16777216).split('\n')[1];
  assert.match(line, /48;2;0;0;0m/);
  assert.match(line, /48;2;255;255;255m/);
  assert.equal(toAnsi(layoutCard(config, 'en'), config.theme, 0), toPlain(layoutCard(config, 'en')));
  assert.throws(() => normalizeConfig({ name: 'X', theme: { background: ['#000000'] } }), /two hex colors/);
});

test('menu entries can have their own symbols', async () => {
  const { buildMenu } = await import('../src/tui/actions.js');
  const { createTranslator } = await import('../src/i18n/index.js');
  const config = make({ menu: { icons: { contact: '✦', exit: '←' }, items: ['contact', 'exit', { label: 'Blog', url: 'https://jane.dev/blog', icon: '¶' }] } });
  const entries = buildMenu(config, 'en', createTranslator('en'));
  assert.deepEqual(entries.map((e) => e.icon), ['✦', '←', '¶']);
  assert.throws(() => normalizeConfig({ name: 'X', menu: { icons: { nope: '✦' } } }), /menu\.icons\.nope/);
  assert.throws(() => normalizeConfig({ name: 'X', menu: { icons: { save: 'abc' } } }), /single symbol/);
});

test('an organization card keeps its name whole and shows its hours (the address is in the menu)', () => {
  const raw = { type: 'organization', name: 'Acme Labs', address: { en: '1 Main St, Berlin', tr: '1 Main St, Berlin' }, hours: { en: 'Mon–Fri 9–18', tr: 'Pzt–Cum 9–18' } };
  const org = make(raw);
  const plain = toPlain(layoutCard(org, 'en'));
  assert.match(plain, /Acme Labs/, 'not letter-spaced or split');
  assert.doesNotMatch(plain, /A C M E/);
  assert.doesNotMatch(plain, /Address/);
  assert.match(toPlain(layoutCard(make({ ...raw, card: { fields: ['address', 'hours'] } }), 'en')), /Address\s+1 Main St, Berlin/);
  assert.match(toPlain(layoutCard(make({ address: '1 Main St' }), 'en')), /Address\s+1 Main St/, 'people keep it on the card');
  assert.match(plain, /Hours\s+Mon–Fri 9–18/);
  assert.match(toPlain(layoutCard(org, 'tr')), /Çalışma saatleri\s+Pzt–Cum 9–18/);
  assert.equal(new Set(widths(plain)).size, 1, plain);
  // The author can still ask for the classic look.
  assert.match(toPlain(layoutCard(make({ type: 'organization', name: 'Acme Labs', card: { nameStyle: 'spaced' } }), 'en')), /A C M E {3}L A B S/);
});

test('an organization vCard is a company card with a work address', () => {
  const vcard = createVCard(make({ type: 'organization', name: 'Acme; Labs', organization: undefined, address: 'Main St 1, Berlin', phone: '+49 30 1234' }), 'en');
  assert.match(vcard, /\r\nN:;;;;\r\n/);
  assert.ok(vcard.includes('\r\nORG:Acme\\; Labs\r\n'), vcard);
  assert.match(vcard, /\r\nX-ABShowAs:COMPANY\r\n/);
  assert.ok(vcard.includes('\r\nADR;TYPE=WORK:;;Main St 1\\, Berlin;;;;\r\n'), vcard);
  assert.match(vcard, /\r\nTEL;TYPE=WORK:\+49 30 1234\r\n/);
  assert.doesNotMatch(createVCard(make(), 'en'), /X-ABShowAs|ADR/, 'people are unchanged');
});

test('type, address and hours are validated and sanitized', () => {
  assert.throws(() => normalizeConfig({ name: 'X', type: 'company' }), /type: must be one of: person, organization/);
  assert.throws(() => normalizeConfig({ name: 'X', address: 'a'.repeat(121) }), /address: must be at most 120/);
  assert.equal(normalizeConfig({ name: 'X', hours: '9–5\u001b[31m‮' }).hours, '9–5[31m');
  assert.equal(normalizeConfig({ name: 'X' }).type, 'person');
});

test('a logo sits at the top of the card, aligned, in the accent color', () => {
  const logo = ['  /\\  ', ' /  \\ ', '/____\\'];
  const config = make({ type: 'organization', name: 'Acme', logo });
  const lines = toPlain(layoutCard(config, 'en')).split('\n');
  const start = lines.findIndex((l) => l.includes('/\\'));
  assert.ok(start > 0 && start < lines.findIndex((l) => l.includes('Acme')), 'above the name');
  assert.equal(lines[start].indexOf('/\\') - lines[start + 2].indexOf('/____'), 2, 'leading spaces kept');
  assert.equal(new Set(widths(toPlain(layoutCard(config, 'en')))).size, 1);
  assert.match(toAnsi(layoutCard(config, 'en'), config.theme, 256), /\x1b\[38;5;\d+m {2}\/\\/);
});

test('logos are limited and sanitized', () => {
  assert.deepEqual(normalizeConfig({ name: 'X', logo: '\n  ab\u001b[2J\tc  \n\n' }).logo, ['  ab[2J  c']);
  assert.throws(() => normalizeConfig({ name: 'X', logo: Array(9).fill('x') }), /logo: must be at most 8 lines/);
  assert.throws(() => normalizeConfig({ name: 'X', logo: ['x'.repeat(41)] }), /logo\[0\]: must be at most 40 columns/);
  assert.throws(() => normalizeConfig({ name: 'X', logo: [1] }), /logo: must be text or an array of lines/);
});

test('QR codes match the reference encoder', async () => {
  const { encodeQr } = await import('../src/render/qr.js');
  // Version 1-L, mask 0, "termcard", as produced by python-qrcode (byte mode).
  const expected = [
    '111111100010101111111', '100000100000101000001', '101110101010001011101', '101110100000101011101',
    '101110100101101011101', '100000100111001000001', '111111101010101111111', '000000001010000000000',
  ];
  const qr = encodeQr('termcard', { mask: 0 });
  assert.equal(qr.version, 1);
  assert.deepEqual(qr.modules.slice(0, 8).map((r) => r.map((d) => (d ? 1 : 0)).join('')), expected);
  assert.equal(encodeQr('x'.repeat(300)), null, 'beyond version 10');
  assert.equal(encodeQr('x'.repeat(200)).version, 9);
});

test('QR codes: the contact (shortened when needed) and the website', async () => {
  const { cardQrCodes } = await import('../src/tui/actions.js');
  const kinds = (config) => cardQrCodes(config, 'en').map((q) => q.kind);
  assert.deepEqual(kinds(make()), ['contact', 'website']);
  // Too long for a full contact: the minimal one (name, phone, email, website) still fits.
  const long = { title: 'T'.repeat(120), organization: 'O'.repeat(120), address: 'A'.repeat(120) };
  assert.deepEqual(kinds(make(long)), ['contact', 'website']);
  const minimal = createVCard(make(long), 'en', { minimal: true });
  assert.doesNotMatch(minimal, /TITLE|ADR|NOTE|X-SOCIALPROFILE/);
  assert.match(minimal, /EMAIL/);
  const huge = { name: 'N'.repeat(80), organization: 'O'.repeat(120), email: `${'e'.repeat(60)}@example.com` };
  assert.deepEqual(kinds(make({ ...long, ...huge })), ['website']);
  assert.deepEqual(kinds(make({ ...long, ...huge, website: undefined })), []);
});

test('a long address wraps under its value and keeps the frame aligned', () => {
  const address = 'Mecidiyeköy Mah. Selahattin Pınar Aralığı Sk. Hüseyin Özer İş Merkezi No: 3 Kat:4, D: 8 Şişli-Istanbul, 34387';
  const plain = toPlain(layoutCard(make({ type: 'organization', name: 'Creetivelab', icons: 'symbols', address, card: { fields: ['address'] } }), 'en'));
  const lines = plain.split('\n');
  const first = lines.findIndex((l) => l.includes('Address'));
  const valueColumn = lines[first].indexOf('Mecidiyeköy');
  const next = lines[first + 1];
  assert.ok(valueColumn > 0 && next.slice(0, valueColumn).trim() === '│', 'the continuation starts under the value');
  assert.notEqual(next[valueColumn], ' ', plain);
  assert.equal(new Set(widths(plain)).size, 1, plain);
});
