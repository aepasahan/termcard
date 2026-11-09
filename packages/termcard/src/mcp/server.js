/**
 * termcard's local MCP server (stdio): look up cards, and create one with the user.
 *
 *   termcard mcp           any card on npm, looked up by name
 *   npx <card> --mcp       that card (and any other, by name)
 *
 * Only create_card_project writes (into a new, empty folder); nothing is ever published or sent.
 */

import { readFileSync } from 'node:fs';
import { createServer } from './protocol.js';
import { createLookupTools } from './lookup.js';
import { createDesignTools } from './design.js';
import { createProjectTool } from './project.js';
import { instructions } from './instructions.js';

const VERSION = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;

/**
 * @param {{ pinned?: { config, packageName }, fetch?: typeof fetch }} options
 */
export function createTermcardServer({ pinned, fetch } = {}) {
  const lookup = createLookupTools({ pinned, fetch });
  const design = createDesignTools({ fetch, finish: 'create_card_project' });
  return createServer({
    name: 'termcard',
    title: 'Termcard',
    version: VERSION,
    instructions: instructions('create_card_project'),
    tools: [...lookup.tools, ...design.tools.filter((t) => t.name !== 'export_card_config'), createProjectTool()],
    prompts: [...lookup.prompts, ...design.prompts],
  });
}

/** Runs the server on stdio until the client disconnects. */
export function serveMcp(options) {
  return createTermcardServer(options).serve(process.stdin, process.stdout);
}
