/**
 * A minimal Model Context Protocol server over stdio (newline-delimited JSON-RPC 2.0).
 * It implements only what termcard needs — tools and prompts — with no dependencies.
 * Spec: https://modelcontextprotocol.io/specification
 *
 * stdout carries protocol messages only; diagnostics go to stderr.
 */

import readline from 'node:readline';

export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

/** An error a tool reports to the assistant as a normal result (isError), not a protocol failure. */
export class ToolError extends Error {}

/**
 * @param {{ name: string, version: string, instructions?: string,
 *           tools: Array<{ name, title, description, inputSchema, annotations?, run(args) }>,
 *           prompts?: Array<{ name, title, description, arguments, get(args) }> }} definition
 */
export function createServer({ name, title, version, icons, websiteUrl, instructions, tools, prompts = [] }) {
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  const promptMap = new Map(prompts.map((p) => [p.name, p]));

  const handlers = {
    initialize: ({ protocolVersion } = {}) => ({
      protocolVersion: PROTOCOL_VERSIONS.includes(protocolVersion) ? protocolVersion : PROTOCOL_VERSIONS[0],
      capabilities: { tools: {}, ...(prompts.length && { prompts: {} }) },
      serverInfo: { name, ...(title && { title }), version, ...(icons && { icons }), ...(websiteUrl && { websiteUrl }) },
      ...(instructions && { instructions }),
    }),
    ping: () => ({}),
    'tools/list': () => ({
      tools: tools.map(({ name: n, title, description, inputSchema, annotations }) => ({
        name: n, title, description, inputSchema,
        // Read-only unless a tool says otherwise; every tool also carries its title as an annotation.
        annotations: { title, readOnlyHint: true, openWorldHint: false, ...annotations },
      })),
    }),
    'tools/call': async ({ name: toolName, arguments: args = {} } = {}) => {
      const tool = toolMap.get(toolName);
      if (!tool) throw Object.assign(new Error(`Unknown tool: ${toolName}`), { code: INVALID_PARAMS });
      try {
        const result = await tool.run(args);
        return {
          content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
          ...(typeof result === 'object' && { structuredContent: result }),
        };
      } catch (error) {
        if (!(error instanceof ToolError)) throw error;
        return { content: [{ type: 'text', text: error.message }], isError: true };
      }
    },
    'prompts/list': () => ({
      prompts: prompts.map(({ name: n, title, description, arguments: a }) => ({ name: n, title, description, arguments: a })),
    }),
    'prompts/get': async ({ name: promptName, arguments: args = {} } = {}) => {
      const prompt = promptMap.get(promptName);
      if (!prompt) throw Object.assign(new Error(`Unknown prompt: ${promptName}`), { code: INVALID_PARAMS });
      return prompt.get(args);
    },
  };

  /** Handles one parsed message; returns the response object, or null for notifications. */
  async function handle(message) {
    if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
      return { jsonrpc: '2.0', id: message?.id ?? null, error: { code: INVALID_REQUEST, message: 'Invalid request' } };
    }
    const isNotification = message.id === undefined;
    const handler = Object.hasOwn(handlers, message.method) ? handlers[message.method] : null;
    if (isNotification) return null; // e.g. notifications/initialized, notifications/cancelled
    if (!handler) return { jsonrpc: '2.0', id: message.id, error: { code: METHOD_NOT_FOUND, message: `Method not found: ${message.method}` } };
    try {
      return { jsonrpc: '2.0', id: message.id, result: await handler(message.params) };
    } catch (error) {
      return { jsonrpc: '2.0', id: message.id, error: { code: error.code ?? INTERNAL_ERROR, message: error.message } };
    }
  }

  /** Reads requests from `input` until it closes, writing responses to `output`. */
  function serve(input = process.stdin, output = process.stdout) {
    const lines = readline.createInterface({ input, crlfDelay: Infinity });
    const pending = new Set();
    const send = (response) => response && output.write(`${JSON.stringify(response)}\n`);

    lines.on('line', (line) => {
      if (!line.trim()) return;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return send({ jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Parse error' } });
      }
      const task = handle(message).then(send);
      pending.add(task);
      task.finally(() => pending.delete(task));
    });
    return new Promise((resolve) => lines.once('close', () => Promise.allSettled([...pending]).then(() => resolve())));
  }

  return { handle, serve };
}
