/** Entry point used by every generated card package: `npx <name>`. */

import { parseArgs } from 'node:util';
import { loadConfig } from './config/load.js';
import { ConfigError } from './config/schema.js';
import { detectLanguage } from './i18n/index.js';
import { layoutCard } from './render/card.js';
import { toAnsi } from './render/format.js';
import { colorDepth } from './render/color.js';
import { createVCard } from './vcard.js';
import { runInteractive } from './tui/app.js';

const HELP = `Usage: npx <card> [options]

Options:
  --lang <code>   Show the card in a specific language
  --card          Print the card without the interactive menu
  --vcard         Print the contact card in vCard format
  --json          Print the card details as JSON
  --no-color      Disable colors
  -h, --help      Show this help`;

/** Public, display-only view of the config (what the card already shows). */
const publicProfile = (config) => {
  const { name, title, tagline, about, organization, email, phone, website, location, links } = config;
  return JSON.parse(JSON.stringify({ name, title, tagline, about, organization, email, phone, website, location, links }));
};

/**
 * Runs a card from a normalized config.
 * @returns {Promise<number>} process exit code
 */
export async function run(config, { argv = process.argv.slice(2), env = process.env, stdin = process.stdin, stdout = process.stdout, stderr = process.stderr } = {}) {
  let flags;
  try {
    ({ values: flags } = parseArgs({
      args: argv,
      options: {
        lang: { type: 'string' },
        card: { type: 'boolean' },
        vcard: { type: 'boolean' },
        json: { type: 'boolean' },
        'no-color': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
      strict: true,
    }));
  } catch (error) {
    stderr.write(`${error.message}\n\n${HELP}\n`);
    return 2;
  }

  if (flags.help) return stdout.write(`${HELP}\n`), 0;
  const lang = detectLanguage(config.language, { flag: flags.lang, env });
  if (flags.json) return stdout.write(`${JSON.stringify(publicProfile(config), null, 2)}\n`), 0;
  if (flags.vcard) return stdout.write(createVCard(config, lang)), 0;

  const depth = flags['no-color'] ? 0 : colorDepth(stdout, env);
  const interactive = config.menu.enabled && !flags.card && stdin.isTTY && stdout.isTTY && typeof stdin.setRawMode === 'function';
  if (!interactive) {
    stdout.write(`\n${toAnsi(layoutCard(config, lang), config.theme, depth)}\n\n`);
    return 0;
  }
  await runInteractive(config, { lang, depth, stdin, stdout });
  return 0;
}

/** Loads a JSON config file and runs it; prints readable errors instead of stack traces. */
export async function start(configFile, options = {}) {
  const stderr = options.stderr ?? process.stderr;
  try {
    process.exitCode = await run(loadConfig(configFile), options);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
