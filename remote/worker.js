/**
 * termcard's remote MCP server on Cloudflare Workers.
 * All logic lives in packages/termcard/src/mcp/http.js; this file only wires it up.
 */

import { createMcpHttpHandler } from '../packages/termcard/src/mcp/http.js';
import pkg from '../packages/termcard/package.json';

let handler;

export default {
  async fetch(request, env) {
    handler ??= createMcpHttpHandler({
      version: pkg.version,
      allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
    });
    return handler(request);
  },
};
