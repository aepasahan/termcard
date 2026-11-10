import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTermcardServer } from '../src/mcp/server.js';

const server = createTermcardServer({ fetch: async (url) => new Response('', { status: url.endsWith('/taken') ? 200 : 404 }) });
const call = async (name, args = {}) => (await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })).result;
const draft = { name: 'Jane Doe', email: 'jane@example.com', links: ['https://github.com/jane'], language: { available: ['en', 'tr'] } };

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'termcard-builder-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('every tool has a title and declares whether it only reads', async () => {
  const { tools } = (await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).result;
  for (const tool of tools) {
    assert.ok(tool.title && tool.annotations.title, tool.name);
    assert.equal(typeof tool.annotations.readOnlyHint, 'boolean', tool.name);
    if (!tool.annotations.readOnlyHint) assert.equal(tool.annotations.destructiveHint, false, tool.name);
  }
  assert.deepEqual(tools.filter((t) => !t.annotations.readOnlyHint).map((t) => t.name), ['create_card_project']);
});

test('list_card_options describes fields, themes and all languages', async () => {
  const options = (await call('list_card_options')).structuredContent;
  assert.equal(options.themes.length, 8);
  assert.equal(options.languages.length, 14);
  assert.equal(options.languages.find((l) => l.code === 'ar').direction, 'rtl');
  assert.equal(options.example.name, 'Jane Doe');
});

test('preview_card returns the card text, or the problems to fix', async () => {
  const ok = (await call('preview_card', { config: draft, language: 'tr' })).structuredContent;
  assert.equal(ok.valid, true);
  assert.match(ok.preview, /J A N E[\s\S]*E-posta[\s\S]*İletişime geç/);
  const bad = (await call('preview_card', { config: { email: 'x' } })).structuredContent;
  assert.deepEqual(bad, { valid: false, problems: ['name: is required', 'email: is not a valid email address'] });
});

test('check_name validates the name and asks npm', async () => {
  assert.equal((await call('check_name', { name: 'janedoe' })).structuredContent.available, true);
  assert.equal((await call('check_name', { name: 'taken' })).structuredContent.available, false);
  assert.match((await call('check_name', { name: 'Jane Doe' })).structuredContent.problem, /lowercase/i);
});

test('create_card_project writes a card package and never overwrites', async (t) => {
  const dir = join(tempDir(t), 'jane');
  const result = (await call('create_card_project', { config: draft, packageName: 'janedoe', directory: dir })).structuredContent;
  assert.equal(result.published, false);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'card.config.json'), 'utf8')), { $schema: 'https://termcard.dev/schema.json', ...draft });
  assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name, 'janedoe');

  const busy = tempDir(t);
  writeFileSync(join(busy, 'keep.txt'), 'mine');
  const refused = await call('create_card_project', { config: draft, packageName: 'janedoe', directory: busy });
  assert.equal(refused.isError, true);
  assert.match(refused.content[0].text, /not empty/);
});

test('create_card_project refuses invalid input before touching the disk', async (t) => {
  const dir = join(tempDir(t), 'x');
  const cases = [
    [{ config: { email: 'x' }, packageName: 'janedoe', directory: dir }, /config has problems/],
    [{ config: draft, packageName: 'Jane', directory: dir }, /Package name/],
    [{ config: draft, packageName: 'janedoe', directory: 'relative/folder' }, /absolute folder path/],
    [{ config: draft, packageName: 'janedoe', directory: '/' }, /dedicated, empty folder/],
  ];
  for (const [args, message] of cases) {
    const result = await call('create_card_project', args);
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, message);
  }
  assert.equal(existsSync(dir), false);
});

test('the create_card prompt walks through the steps and never publishes', async () => {
  const { prompts } = (await server.handle({ jsonrpc: '2.0', id: 1, method: 'prompts/list' })).result;
  assert.deepEqual(prompts.map((p) => p.name), ['introduce', 'create_card']);
  const text = (await server.handle({ jsonrpc: '2.0', id: 1, method: 'prompts/get', params: { name: 'create_card' } })).result.messages[0].content.text;
  assert.match(text, /list_card_options[\s\S]*preview_card[\s\S]*check_name[\s\S]*create_card_project/);
  assert.match(text, /Don't publish anything for me/);
});
