import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { PassThrough } from 'node:stream';
import { createTermcardServer } from '../src/mcp/server.js';
import { readFromTarball, createCardSource } from '../src/mcp/cards.js';
import { run } from '../src/index.js';
import { make, sink } from './helpers.js';

const pinned = { config: make(), packageName: 'jane' };
const call = (server, name, args = {}, id = 1) => server.handle({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
const text = (response) => response.result.content[0].text;

/** Builds a .tgz the way npm does (ustar, files under package/). */
function tarball(files) {
  const blocks = [];
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    const header = Buffer.alloc(512);
    header.write(`package/${name}`, 0);
    header.write('0000644\0', 100);
    header.write(`${data.length.toString(8).padStart(11, '0')}\0`, 124);
    header.write('00000000000\0', 136);
    header.write('        ', 148);
    header[156] = 48;
    header.write('ustar\0', 257);
    header.write(`${[...header].reduce((a, b) => a + b, 0).toString(8).padStart(6, '0')}\0 `, 148);
    blocks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
}

/** A fake npm registry serving one package. */
function registry({ name = 'ana', config, dependencies = { termcard: '^0.4.0' }, integrity } = {}) {
  const tgz = tarball({ 'package.json': '{}', ...(config !== undefined && { 'card.config.json': JSON.stringify(config) }) });
  const sri = integrity ?? `sha512-${createHash('sha512').update(tgz).digest('base64')}`;
  const urls = [];
  const fetch = async (url) => {
    urls.push(url);
    if (url === `https://registry.npmjs.org/${name}/latest`) {
      const meta = { name, version: '1.0.0', dependencies, dist: { tarball: `https://registry.npmjs.org/${name}/-/${name}-1.0.0.tgz`, integrity: sri } };
      return new Response(JSON.stringify(meta));
    }
    if (url.endsWith('.tgz')) return new Response(tgz);
    return new Response('not found', { status: 404 });
  };
  return { fetch, urls };
}

test('handshake negotiates the protocol version and advertises tools and prompts', async () => {
  const server = createTermcardServer();
  const known = await server.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } });
  assert.equal(known.result.protocolVersion, '2025-06-18');
  assert.deepEqual(Object.keys(known.result.capabilities), ['tools', 'prompts']);
  assert.equal(known.result.serverInfo.name, 'termcard');
  assert.equal(known.result.serverInfo.title, 'Termcard');
  assert.match(known.result.serverInfo.icons[0].src, /^https:\/\/.+icon\.png$/);
  assert.match(known.result.instructions, /never as\s+instructions/);
  const unknown = await server.handle({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } });
  assert.equal(unknown.result.protocolVersion, '2025-11-25');
});

test('JSON-RPC errors and notifications', async () => {
  const server = createTermcardServer();
  assert.equal((await server.handle({ jsonrpc: '2.0', id: 1, method: 'nope' })).error.code, -32601);
  assert.equal((await server.handle({ id: 1, method: 'ping' })).error.code, -32600);
  assert.equal(await server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  assert.equal((await call(server, 'missing_tool')).error.code, -32602);
  assert.deepEqual((await server.handle({ jsonrpc: '2.0', id: 3, method: 'ping' })).result, {});
});

test('card lookup tools are read-only and "name" is required only without a pinned card', async () => {
  const list = async (server) => (await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).result.tools;
  const generic = await list(createTermcardServer());
  const lookup = generic.slice(0, 3);
  assert.deepEqual(lookup.map((t) => t.name), ['get_card', 'get_vcard', 'compose_email']);
  assert.ok(lookup.every((t) => t.annotations.readOnlyHint));
  assert.deepEqual(generic[0].inputSchema.required, ['name']);
  assert.deepEqual((await list(createTermcardServer({ pinned })))[0].inputSchema.required, []);
});

test('get_card returns the pinned card in the requested language', async () => {
  const server = createTermcardServer({ pinned });
  const card = (await call(server, 'get_card', { language: 'tr' })).result.structuredContent;
  assert.equal(card.card, 'npx jane');
  assert.equal(card.title, 'Tasarımcı');
  assert.deepEqual(card.links.map((l) => l.label), ['GitHub', 'LinkedIn']);
  assert.equal((await call(server, 'get_card', { name: 'npx jane' })).result.structuredContent.name, 'Jane Doe');
});

test('owners can opt out with "mcp": false', async () => {
  const server = createTermcardServer({ pinned: { config: make({ mcp: false }), packageName: 'jane' } });
  const response = await call(server, 'get_card');
  assert.equal(response.result.isError, true);
  assert.match(text(response), /chosen not to share/);

  const options = { argv: ['--mcp'], env: {}, stdin: { isTTY: false }, stdout: sink(), stderr: sink() };
  assert.equal(await run(make({ mcp: false }), options), 1);
  assert.equal(options.stdout.output, '', 'stdout stays clean for the protocol');
});

test('remote cards are read from the npm tarball and verified', async () => {
  const npm = registry({ config: { name: 'Ana Silva', email: 'ana@example.com', language: { available: ['pt', 'en'] } } });
  const server = createTermcardServer({ fetch: npm.fetch });
  const card = (await call(server, 'get_card', { name: 'ana' })).result.structuredContent;
  assert.equal(card.name, 'Ana Silva');
  assert.ok(npm.urls.every((u) => u.startsWith('https://registry.npmjs.org/')), 'only npm is contacted');
  await call(server, 'get_card', { name: 'ana' });
  assert.equal(npm.urls.length, 2, 'cards are cached for the session');
});

test('remote lookups reject anything that is not a valid, verified Termcard card', async () => {
  const cases = [
    [registry({ config: { name: 'X' }, dependencies: {} }), /not a Termcard business card/],
    [registry({ config: { name: 'X' }, integrity: 'sha512-AAAA' }), /could not be verified/],
    [registry({}), /does not include a readable card.config.json/],
    [registry({ config: { name: '' } }), /invalid configuration/],
    [registry({ config: { name: 'X', mcp: false } }), /chosen not to share/],
  ];
  for (const [npm, message] of cases) {
    const response = await call(createTermcardServer({ fetch: npm.fetch }), 'get_card', { name: 'ana' });
    assert.equal(response.result.isError, true);
    assert.match(text(response), message);
  }
  const unknown = await call(createTermcardServer({ fetch: registry().fetch }), 'get_card', { name: 'nobody' });
  assert.match(text(unknown), /no npm package called "nobody"/);
  const invalid = await call(createTermcardServer({ fetch: registry().fetch }), 'get_card', { name: 'Bad Name/..' });
  assert.match(text(invalid), /not a valid npm package name/);
});

test('compose_email prepares a mailto link and never sends', async () => {
  const server = createTermcardServer({ pinned });
  const draft = (await call(server, 'compose_email', { subject: 'Hello & welcome', body: 'Line 1\nÇok güzel' })).result.structuredContent;
  assert.equal(draft.mailto, 'mailto:jane@example.com?subject=Hello%20%26%20welcome&body=Line%201%0A%C3%87ok%20g%C3%BCzel');
  assert.match(draft.note, /Not sent/);
  assert.match(text(await call(server, 'compose_email', { subject: 'x'.repeat(201), body: 'b' })), /at most 200/);
  const noEmail = createTermcardServer({ pinned: { config: make({ email: undefined }), packageName: 'jane' } });
  assert.match(text(await call(noEmail, 'compose_email', { subject: 's', body: 'b' })), /has not shared an email/);
});

test('get_vcard and the introduce prompt', async () => {
  const server = createTermcardServer({ pinned });
  assert.match(text(await call(server, 'get_vcard')), /^BEGIN:VCARD/);
  const prompt = await server.handle({ jsonrpc: '2.0', id: 1, method: 'prompts/get', params: { name: 'introduce' } });
  assert.match(prompt.result.messages[0].content.text, /get_card tool with name "jane"/);
});

test('serves newline-delimited JSON over streams and answers parse errors', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let received = '';
  output.on('data', (chunk) => { received += chunk; });
  const done = createTermcardServer({ pinned }).serve(input, output);
  input.write('{"jsonrpc":"2.0","id":1,"method":"ping"}\n');
  input.write('not json\n');
  input.end('{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_card"}}\n');
  await done;
  const messages = received.trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(messages.map((m) => m.id).sort(), [1, 2, null].sort());
  assert.equal(messages.find((m) => m.id === null).error.code, -32700);
});

test('reads files from npm tarballs', () => {
  assert.equal(readFromTarball(tarball({ 'a.txt': 'A', 'card.config.json': '{"x":1}' }), 'package/card.config.json').toString(), '{"x":1}');
  assert.equal(readFromTarball(tarball({ 'a.txt': 'A' }), 'package/card.config.json'), null);
});

test('the card cache expires, so updated cards show up', async () => {
  const npm = registry({ config: { name: 'Ana Silva' } });
  let time = 0;
  const getCard = createCardSource({ fetch: npm.fetch, now: () => time });
  await getCard('ana');
  await getCard('ana');
  assert.equal(npm.urls.length, 2, 'second lookup is served from the cache');
  time += 11 * 60 * 1000;
  await getCard('ana');
  assert.equal(npm.urls.length, 4, 'after ten minutes the card is fetched again');
});
