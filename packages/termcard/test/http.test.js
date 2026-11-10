import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMcpHttpHandler } from '../src/mcp/http.js';

const handle = createMcpHttpHandler({ version: '9.9.9', allowedOrigins: ['https://inspector.example'], fetch: async () => new Response('', { status: 404 }) });
const post = (message, headers = {}) =>
  handle(new Request('https://mcp.example/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
    body: typeof message === 'string' ? message : JSON.stringify(message),
  }));

test('initialize and tools/list over HTTP', async () => {
  const init = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25' } });
  assert.equal(init.status, 200);
  assert.equal(init.headers.get('content-type'), 'application/json');
  const body = await init.json();
  assert.equal(body.result.serverInfo.version, '9.9.9');
  assert.match(body.result.instructions, /export_card_config/);

  const { result } = await (await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, { 'mcp-protocol-version': '2025-11-25' })).json();
  const names = result.tools.map((t) => t.name);
  assert.ok(names.includes('export_card_config'));
  assert.ok(!names.includes('create_card_project'), 'the remote server never writes files');
});

test('export_card_config returns the file and the publish commands', async () => {
  const res = await post({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'export_card_config', arguments: { config: { name: 'Jane Doe' }, packageName: 'janedoe' } } });
  const out = (await res.json()).result.structuredContent;
  assert.equal(out.fileName, 'card.config.json');
  assert.deepEqual(JSON.parse(out.content), { $schema: 'https://termcard.dev/schema.json', name: 'Jane Doe' });
  assert.ok(out.nextSteps.some((s) => s.includes('--config card.config.json --name janedoe')));
});

test('notifications are accepted without a body', async () => {
  const res = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(res.status, 202);
  assert.equal(await res.text(), '');
});

test('rejects what the transport does not allow', async () => {
  const get = await handle(new Request('https://mcp.example/mcp'));
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { origin: 'https://inspector.example' })).status, 200);
  assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'mcp-protocol-version': '1999-01-01' })).status, 400);
  assert.equal((await post('{nope')).status, 400);
  assert.equal((await post([{ jsonrpc: '2.0', id: 1, method: 'ping' }])).status, 400);
  assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await post('x'.repeat(300 * 1024))).status, 413);
});

test('root explains the endpoint; other paths are not found', async () => {
  assert.match(await (await handle(new Request('https://mcp.example/'))).text(), /Endpoint: \/mcp/);
  assert.equal((await handle(new Request('https://mcp.example/other'))).status, 404);
});

test('the endpoint also answers with a trailing slash and on the root', async () => {
  for (const url of ['https://mcp.example/mcp/', 'https://mcp.example/', 'https://mcp.example']) {
    const res = await handle(new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    }));
    assert.equal(res.status, 200, url);
    assert.deepEqual((await res.json()).result, {}, url);
  }
});
