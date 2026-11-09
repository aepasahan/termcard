import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));
const { version } = json('packages/termcard/package.json');

test('the Claude plugin, MCP Registry entry and wizard point at this termcard release', () => {
  assert.equal(json('plugin/.claude-plugin/plugin.json').version, version);
  assert.deepEqual(json('plugin/.mcp.json').mcpServers.termcard, { type: 'http', url: 'https://mcp.termcard.dev/mcp' });
  assert.equal(json('server.json').remotes[0].url, 'https://mcp.termcard.dev/mcp');
  assert.equal(json('server.json').version, version);
  assert.equal(json('server.json').packages[0].version, version);
  assert.equal(json('packages/create-termcard/package.json').dependencies.termcard, `^${version}`);
});

test('the Desktop extension declares every MCP tool and a privacy policy', async () => {
  const { createTermcardServer } = await import('../src/mcp/server.js');
  const { tools } = (await createTermcardServer().handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).result;
  const manifest = json('packages/termcard/mcpb/manifest.json');
  assert.deepEqual(manifest.tools.map((t) => t.name), tools.map((t) => t.name));
  assert.ok(manifest.privacy_policies.every((url) => url.startsWith('https://')));
});
