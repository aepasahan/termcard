/** `termcard` command-line tool for card authors: preview, validate, build. */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from './config/load.js';
import { ConfigError } from './config/schema.js';
import { run } from './run.js';
import { buildCard, UnsafeOutputError } from './build/index.js';
import { serveMcp } from './mcp/server.js';
import { removeCard } from './project/remove.js';
import { normalizeConfig } from './config/schema.js';
import { DEMO_CARD } from './demo.js';

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const DEFAULT_CONFIG = 'card.config.json';

const HELP = `Termcard ${VERSION} — terminal business cards

Usage:
  termcard demo                      Open a sample card to see what Termcard does
  termcard preview [config]          Show the card (accepts the same flags as the card itself)
  termcard validate [config]         Check a config and list any problems
  termcard build [config] [--out d]  Write terminal, web, vCard and curl files (default: dist)
  termcard mcp                       Run the MCP server that lets AI assistants read any Termcard card
  termcard remove [name] [--yes]     Take your published card off npm (default: the card in this folder)

Create a new card:
  npm create termcard@latest

The config defaults to ./${DEFAULT_CONFIG}.`;

/** Package name of the card, read from the package.json next to the config. */
function packageNameFor(configPath) {
  const pkg = join(dirname(resolve(configPath)), 'package.json');
  if (!existsSync(pkg)) return undefined;
  try {
    return JSON.parse(readFileSync(pkg, 'utf8')).name;
  } catch {
    return undefined;
  }
}

async function removeCommand(args, io) {
  let parsed;
  try {
    parsed = parseArgs({ args, allowPositionals: true, options: { yes: { type: 'boolean', short: 'y' } } });
  } catch (error) {
    io.stderr.write(`${error.message}\n`);
    return 2;
  }
  const name = parsed.positionals[0] ?? packageNameFor(DEFAULT_CONFIG);
  if (!name) {
    io.stderr.write(`Run this in your card's folder, or name the card: termcard remove <name>\n`);
    return 2;
  }
  const interactive = Boolean(io.stdin?.isTTY && io.stdout.isTTY);
  const ask = io.ask ?? (async (question) => {
    const { createInterface } = await import('node:readline/promises');
    const rl = createInterface({ input: io.stdin, output: io.stdout });
    try {
      return await rl.question(question);
    } finally {
      rl.close();
    }
  });
  return removeCard(name, { yes: parsed.values.yes, interactive: interactive || Boolean(io.ask), ask, stdout: io.stdout, stderr: io.stderr, run: io.npm });
}

export async function cli(argv, io = { stdout: process.stdout, stderr: process.stderr, stdin: process.stdin }) {
  const [command, ...rest] = argv;
  if (!command || command === 'help' || command === '--help' || command === '-h') return io.stdout.write(`${HELP}\n`), 0;
  if (command === '--version' || command === '-v') return io.stdout.write(`${VERSION}\n`), 0;
  if (command === 'mcp') return await serveMcp(), 0;
  if (command === 'remove') return removeCommand(rest, io);
  if (command === 'demo') return run(normalizeConfig(DEMO_CARD), { argv: rest, ...io });

  const positional = rest[0] && !rest[0].startsWith('-') ? rest[0] : undefined;
  const configPath = positional ?? DEFAULT_CONFIG;
  const flags = positional ? rest.slice(1) : rest;

  try {
    if (command === 'preview') return await run(loadConfig(configPath), { argv: flags, ...io });

    if (command === 'validate') {
      const config = loadConfig(configPath);
      io.stdout.write(
        `✓ ${configPath} is valid\n` +
          `  template   ${config.template}\n` +
          `  languages  ${config.language.available.join(', ')} (default: ${config.language.default})\n` +
          `  fields     ${config.card.fields.join(', ') || '—'}\n` +
          `  menu       ${config.menu.enabled ? config.menu.items.map((i) => (typeof i === 'string' ? i : 'custom')).join(', ') : 'off'}\n`,
      );
      return 0;
    }

    if (command === 'build') {
      const { values } = parseArgs({ args: flags, options: { out: { type: 'string', default: 'dist' }, name: { type: 'string' } } });
      const config = loadConfig(configPath);
      const outDir = resolve(values.out);
      const files = buildCard(config, { outDir, packageName: values.name ?? packageNameFor(configPath) });
      io.stdout.write(`✓ Built ${files.length} files in ${values.out}/\n${files.map((f) => `  ${f}`).join('\n')}\n`);
      return 0;
    }
  } catch (error) {
    if (error instanceof ConfigError || error instanceof UnsafeOutputError || error.code?.startsWith('ERR_PARSE_ARGS')) {
      io.stderr.write(`${error.message}\n`);
      return 1;
    }
    throw error;
  }

  io.stderr.write(`Unknown command "${command}".\n\n${HELP}\n`);
  return 2;
}
