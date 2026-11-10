/**
 * termcard's remote MCP server on Cloudflare Workers.
 * All MCP logic lives in packages/termcard/src/mcp/http.js; this file only wires it up.
 *
 *   https://mcp.termcard.dev/mcp   MCP endpoint (rate-limited per client IP)
 *   /favicon.ico, /icon.png        the Termcard icon, for directories and clients
 *
 * The website (https://termcard.dev) is a separate project on Vercel.
 */

import { createMcpHttpHandler } from '../packages/termcard/src/mcp/http.js';
import pkg from '../packages/termcard/package.json';
import icon from '../packages/termcard/mcpb/icon.png';

const ICON_PATHS = new Set(['/favicon.ico', '/favicon.png', '/icon.png', '/apple-touch-icon.png']);

let handler;

const tooManyRequests = () =>
  new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Too many requests. Please try again in a minute.' } }), {
    status: 429,
    headers: { 'content-type': 'application/json', 'retry-after': '60' },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (ICON_PATHS.has(url.pathname)) {
      return new Response(icon, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
    }

    // Protects the free request quota from a single noisy client. Claude's requests arrive
    // from Anthropic's servers, which many users share, so the limit is deliberately generous.
    if (request.method === 'POST' && env.LIMITER) {
      const key = request.headers.get('cf-connecting-ip') ?? 'unknown';
      const { success } = await env.LIMITER.limit({ key });
      if (!success) return tooManyRequests();
    }

    handler ??= createMcpHttpHandler({
      version: pkg.version,
      allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
    });
    return handler(request);
  },
};
