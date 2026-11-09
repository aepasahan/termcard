/** Interactive questions → a raw card config plus package options. */

import {
  BUILT_IN_LANGUAGES, languageName, templates, themes, normalizeConfig, layoutCard, toAnsi, colorDepth,
  isEmail, urlProblem, TEXT_LIMIT, DESCRIPTION_LIMIT, THEME_DESCRIPTIONS, DEFAULT_THEME,
  slugify, validatePackageName, checkAvailability,
} from 'termcard';
import { text, confirm, select, multiselect, style } from './prompts.js';

// Answers are checked with the same rules as the config schema, so the final config always validates.
const optional = (check) => (v) => (v ? check(v) : undefined);
const short = (v) => (v.length > TEXT_LIMIT ? `At most ${TEXT_LIMIT} characters` : undefined);
const withProtocol = (v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v);
const link = (v) => {
  const problem = urlProblem(withProtocol(v));
  return problem ? `Link ${problem}` : undefined;
};

/** Accepts a username or a full URL for a known service. */
const profileUrl = (base) => (value) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value) || value.includes('.')) return withProtocol(value);
  return `${base}${value.replace(/^@/, '')}`;
};

const ICON_HINTS = {
  none: 'text only',
  symbols: 'simple symbols every terminal can show',
  emoji: 'colorful, best on modern terminals',
  nerd: 'brand icons, needs a Nerd Font',
};

const TEMPLATE_HINTS = {
  classic: 'letter-spaced name, generous spacing',
  compact: 'denser, for longer names',
  minimal: 'no frame, just the details',
};

export function preview(rawConfig, lang) {
  const config = normalizeConfig(rawConfig);
  const card = toAnsi(layoutCard(config, lang), config.theme, colorDepth(process.stdout, process.env));
  process.stdout.write(`\n${card}\n\n`);
}

async function askPackageName(config, { offline }) {
  let initial = slugify(config.name);
  for (;;) {
    const name = await text({ message: 'Package name (people will run npx <name>)', initial, validate: validatePackageName });
    if (offline) return name;
    process.stdout.write(style.faint('  Checking availability on npm…\n'));
    const status = await checkAvailability(name);
    if (status === 'available') return name;
    if (status === 'unknown') {
      process.stdout.write(style.muted('  Could not reach npm; availability will be checked when you publish.\n'));
      return name;
    }
    process.stdout.write(`  ${style.red(`"${name}" is already taken on npm.`)} ${style.muted('Try a variation or a scope like @you/card.')}\n`);
    initial = `${name}-card`;
  }
}

export async function runWizard({ offline = false } = {}) {
  process.stdout.write(
    `\n${style.bold('termcard')} ${style.muted('— create your terminal business card')}\n` +
      `${style.faint('Everything you enter here becomes public once the card is published.')}\n` +
      `${style.faint('Leave optional fields empty to skip them.')}\n\n`,
  );

  const name = await text({ message: 'Full name', validate: (v) => (!v ? 'Your name is required' : v.length > 80 ? 'At most 80 characters' : undefined) });
  const title = await text({ message: 'Role or title', hint: 'optional', validate: optional(short) });
  const tagline = await text({ message: 'Tagline, company or @handle', hint: 'optional', validate: optional(short) });
  const description = await text({
    message: 'Short description about you',
    hint: `optional, up to ${DESCRIPTION_LIMIT} characters`,
    validate: optional((v) => (v.length > DESCRIPTION_LIMIT ? `${v.length}/${DESCRIPTION_LIMIT} characters — please shorten it` : undefined)),
  });
  const email = await text({ message: 'Email', hint: 'optional', validate: optional((v) => (isEmail(v) ? undefined : 'Not a valid email address')) });
  const website = withProtocol(await text({ message: 'Website', hint: 'optional', validate: optional(link) }));
  const location = await text({ message: 'Location', hint: 'optional, e.g. Berlin · Germany', validate: optional(short) });

  process.stdout.write(style.faint('\n  Profiles — a username or a full URL\n'));
  const profile = async (message, base) => {
    const toUrl = profileUrl(base);
    return toUrl(await text({ message, hint: 'optional', validate: optional((v) => link(toUrl(v))) }));
  };
  const links = [
    await profile('GitHub', 'https://github.com/'),
    await profile('LinkedIn', 'https://www.linkedin.com/in/'),
    await profile('X', 'https://x.com/'),
  ];
  const others = await text({
    message: 'Other links, comma-separated',
    hint: 'optional',
    validate: optional((v) => v.split(',').map((u) => link(u.trim())).find(Boolean)),
  });
  links.push(...(others ? others.split(',').map((u) => withProtocol(u.trim())) : []));

  // Built in the same order as the configuration reference, so the file reads naturally.
  const config = {
    name,
    ...(title && { title }),
    ...(tagline && { tagline }),
    ...(description && { description }),
    ...(email && { email }),
    ...(website && { website }),
    ...(location && { location }),
    links: links.filter(Boolean),
  };

  process.stdout.write('\n');
  const languages = await multiselect({
    message: 'Languages the card supports',
    choices: BUILT_IN_LANGUAGES.map((l) => ({ label: `${languageName(l)} (${l})`, value: l })),
    selected: ['en'],
  });
  config.language = { default: 'auto', available: languages };

  config.template = 'classic';
  config.theme = DEFAULT_THEME;
  config.icons = 'none';
  const previewLang = languages.includes('en') ? 'en' : languages[0];
  for (;;) {
    preview(config, previewLang);
    const next = await select({
      message: 'How does it look?',
      choices: [
        { label: 'Looks good', value: 'done' },
        { label: 'Change template', value: 'template', hint: `current: ${config.template}` },
        { label: 'Change color', value: 'theme', hint: `current: ${config.theme}` },
        { label: 'Change icons', value: 'icons', hint: `current: ${config.icons}` },
      ],
    });
    if (next === 'done') break;
    if (next === 'template') {
      config.template = await select({
        message: 'Template',
        choices: Object.keys(templates).map((t) => ({ label: t, value: t, hint: TEMPLATE_HINTS[t] })),
        initial: Object.keys(templates).indexOf(config.template),
      });
    } else if (next === 'theme') {
      config.theme = await select({
        message: 'Color theme — the seasons and the turns between them',
        choices: Object.keys(themes).map((id) => ({ label: id, value: id, hint: THEME_DESCRIPTIONS[id] })),
        initial: Object.keys(themes).indexOf(config.theme),
      });
    } else {
      config.icons = await select({
        message: 'Icons',
        choices: Object.entries(ICON_HINTS).map(([id, hint]) => ({ label: id, value: id, hint })),
        initial: Object.keys(ICON_HINTS).indexOf(config.icons),
      });
    }
  }

  if (config.icons === 'none') delete config.icons; // the default; keep the file short

  const packageName = await askPackageName(config, { offline });
  const dir = await text({ message: 'Folder to create', initial: packageName.split('/').pop() });
  const workflow = await confirm({ message: 'Add a GitHub Actions workflow that publishes on each release?', initial: false });
  return { config, packageName, dir, workflow };
}
