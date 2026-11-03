/**
 * `npm create termcard` — from zero to a published `npx <name>` card.
 *
 * Interactive by default. For scripts/CI:
 *   create-termcard my-card --config card.json --name my-card [--workflow] [--publish]
 */

import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig, ConfigError } from 'termcard';
import { runWizard, preview } from './wizard.js';
import { createProject, TargetNotEmptyError } from './scaffold.js';
import { validatePackageName, slugify, binName } from './names.js';
import { publish } from './npm.js';
import { confirm, CancelledError, style } from './prompts.js';

const TERMCARD_VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).dependencies.termcard.replace(/^[^\d]*/, '');

const HELP = `Usage: npm create termcard@latest [folder] [-- options]

Without options, a short wizard asks for your details.

Options:
  --config <file>  Create the card from an existing card.config.json (no questions)
  --name <pkg>     Package name (with --config; defaults to a slug of your name)
  --workflow       Add a GitHub Actions publish workflow (with --config)
  --publish        Publish to npm right away (with --config)
  --offline        Skip the npm name availability check
  -h, --help       Show this help`;

export async function main(argv = process.argv.slice(2)) {
  const { values: flags, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      config: { type: 'string' },
      name: { type: 'string' },
      workflow: { type: 'boolean' },
      publish: { type: 'boolean' },
      offline: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (flags.help) return console.log(HELP), 0;

  let answers;
  if (flags.config) {
    loadConfig(flags.config); // readable errors for missing, invalid or malformed files
    const raw = JSON.parse(readFileSync(flags.config, 'utf8'));
    const packageName = flags.name ?? slugify(raw.name);
    const nameError = validatePackageName(packageName);
    if (nameError) throw new ConfigError([`--name: ${nameError}`]);
    answers = { config: raw, packageName, dir: positionals[0] ?? binName(packageName), workflow: Boolean(flags.workflow) };
  } else {
    if (!process.stdin.isTTY) {
      console.error('The wizard needs an interactive terminal. Use --config <file> in scripts.');
      return 1;
    }
    answers = await runWizard({ offline: flags.offline });
    if (positionals[0]) answers.dir = positionals[0];
  }

  const dir = resolve(answers.dir);
  const files = createProject({ ...answers, dir, termcardVersion: TERMCARD_VERSION });
  const shown = relative(process.cwd(), dir) || '.';
  console.log(`\n${style.accent('✓')} Created ${style.bold(shown)}/ ${style.faint(`(${files.length} files)`)}`);

  const interactive = !flags.config;
  const shouldPublish = flags.publish || (interactive && (await confirm({ message: 'Publish to npm now?', initial: true })));
  let published = false;
  if (shouldPublish) {
    console.log(style.faint('\n  Publishing… npm may ask you to log in.\n'));
    published = await publish(dir);
    console.log(published ? `\n${style.accent('✓')} Published.` : `\n${style.red('Publishing did not complete.')} ${style.muted('You can retry with: npm publish --access public')}`);
  }

  const cmd = `npx ${answers.packageName}`;
  console.log(`
${published ? `Your card is live:  ${style.bold(cmd)}` : 'Next steps:'}
${published ? '' : `  cd ${shown}\n  npm publish --access public\n`}
  Customize it in ${style.bold('card.config.json')} — fields, menu, template, colors, languages.
  Docs: ${style.muted('https://github.com/aepasahan/termcard/blob/main/docs/configuration.md')}
`);
  return 0;
}

export async function cli() {
  try {
    process.exitCode = await main();
  } catch (error) {
    if (error instanceof CancelledError) {
      console.log(`\n${style.muted('Cancelled. Nothing was published.')}`);
      process.exitCode = 130;
    } else if (error instanceof ConfigError || error instanceof TargetNotEmptyError || error.code?.startsWith?.('ERR_PARSE_ARGS')) {
      console.error(error.message);
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
}
