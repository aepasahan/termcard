/**
 * termcard's remote MCP server on Cloudflare Workers.
 * All MCP logic lives in packages/termcard/src/mcp/http.js; this file only wires it up.
 *
 *   https://mcp.termcard.dev/mcp   MCP endpoint
 *   https://termcard.dev           redirects to the project page (until the website exists)
 */

import { createMcpHttpHandler } from '../packages/termcard/src/mcp/http.js';
import pkg from '../packages/termcard/package.json';

const PROJECT_PAGE = 'https://github.com/aepasahan/termcard';
const SITE_HOSTS = new Set(['termcard.dev', 'www.termcard.dev']);

let handler;

export default {
  async fetch(request, env) {
    if (SITE_HOSTS.has(new URL(request.url).hostname)) return Response.redirect(PROJECT_PAGE, 302);
    handler ??= createMcpHttpHandler({
      version: pkg.version,
      allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
    });
    return handler(request);
  },
};
