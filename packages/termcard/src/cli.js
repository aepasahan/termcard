/** `termcard` command-line tool for card authors: preview, validate, build. */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from './config/load.js';
import { ConfigError } from './config/schema.js';
import { run } from './run.js';
import { buildCard } from './build/index.js';

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const DEFAULT_CONFIG = 'card.config.json';

const HELP = `termcard ${VERSION} — terminal business cards

Usage:
  termcard preview [config]          Show the card (accepts the same flags as the card itself)
  termcard validate [config]         Check a config and list any problems
  termcard build [config] [--out d]  Write terminal, web, vCard and curl files (default: dist)

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

export async function cli(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  const [command, ...rest] = argv;
  if (!command || command === 'help' || command === '--help' || command === '-h') return io.stdout.write(`${HELP}\n`), 0;
  if (command === '--version' || command === '-v') return io.stdout.write(`${VERSION}\n`), 0;

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
    if (error instanceof ConfigError || error.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      io.stderr.write(`${error.message}\n`);
      return 1;
    }
    throw error;
  }

  io.stderr.write(`Unknown command "${command}".\n\n${HELP}\n`);
  return 2;
}
