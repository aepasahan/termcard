/**
 * termcard's remote MCP server over Streamable HTTP, as one Fetch API handler:
 *   (Request) => Promise<Response>
 * It runs on any platform with Request/Response (Cloudflare Workers, Deno, Bun, Node 18+).
 *
 * Stateless: every POST carries one JSON-RPC message and gets a JSON reply; there are no
 * sessions and no server-sent streams. Tools are the local server's, minus anything that
 * writes files — a card is handed back as card.config.json instead (export_card_config).
 * Spec: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
 */

import { createServer, PROTOCOL_VERSIONS } from './protocol.js';
import { createLookupTools } from './lookup.js';
import { createDesignTools } from './design.js';
import { instructions } from './instructions.js';

const MAX_BODY = 256 * 1024;

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const rpcError = (status, code, message) => json({ jsonrpc: '2.0', id: null, error: { code, message } }, status);

/**
 * @param {{ version: string, fetch?: typeof fetch, allowedOrigins?: string[], path?: string }} options
 *   allowedOrigins: browser origins allowed to call the server (requests without an Origin
 *   header, such as Claude's, are always allowed). Protects against DNS rebinding.
 */
export function createMcpHttpHandler({ version, fetch, allowedOrigins = [], path = '/mcp' }) {
  const lookup = createLookupTools({ fetch });
  const design = createDesignTools({ fetch, finish: 'export_card_config' });
  const server = createServer({
    name: 'termcard',
    version,
    instructions: instructions('export_card_config'),
    tools: [...lookup.tools, ...design.tools],
    prompts: [...lookup.prompts, ...design.prompts],
  });

  return async function handle(request) {
    const url = new URL(request.url);
    // Accept the endpoint with or without a trailing slash, and MCP POSTs to the root, since
    // clients are often configured with the bare domain.
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    const isEndpoint = pathname === path || (pathname === '/' && request.method === 'POST');
    if (!isEndpoint) {
      return pathname === '/'
        ? new Response(`termcard MCP server ${version}\nEndpoint: ${path}\nhttps://github.com/aepasahan/termcard/blob/main/docs/mcp.md\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
        : new Response(`Not found. The MCP endpoint is ${path}\n`, { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }

    const origin = request.headers.get('origin');
    if (origin && !allowedOrigins.includes(origin)) return rpcError(403, -32600, 'Origin not allowed');

    // No server-initiated streams and no sessions to end.
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });

    const protocolVersion = request.headers.get('mcp-protocol-version');
    if (protocolVersion && !PROTOCOL_VERSIONS.includes(protocolVersion)) {
      return rpcError(400, -32600, `Unsupported MCP protocol version: ${protocolVersion}`);
    }
    if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
      return rpcError(415, -32600, 'Content-Type must be application/json');
    }
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return rpcError(413, -32600, 'Request too large');

    const text = await request.text();
    if (text.length > MAX_BODY) return rpcError(413, -32600, 'Request too large');
    let message;
    try {
      message = JSON.parse(text);
    } catch {
      return rpcError(400, -32700, 'Parse error');
    }
    if (Array.isArray(message)) return rpcError(400, -32600, 'Batch requests are not supported');

    const response = await server.handle(message);
    // Notifications and responses are acknowledged without a body.
    return response ? json(response) : new Response(null, { status: 202 });
  };
}
