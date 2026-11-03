/** Interactive questions → a raw card config plus package options. */

import { BUILT_IN_LANGUAGES, languageName, templates, themes, normalizeConfig, layoutCard, toAnsi, colorDepth } from 'termcard';
import { text, confirm, select, multiselect, style } from './prompts.js';
import { slugify, validatePackageName } from './names.js';
import { checkAvailability } from './npm.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const optional = (check) => (v) => (v ? check(v) : undefined);
const isUrl = (v) => {
  try {
    return ['http:', 'https:'].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};
const withProtocol = (v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v);

/** Accepts a username or a full URL for a known service. */
const profileUrl = (base) => (value) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value) || value.includes('.')) return withProtocol(value);
  return `${base}${value.replace(/^@/, '')}`;
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
  const title = await text({ message: 'Role or title', hint: 'optional' });
  const tagline = await text({ message: 'Tagline, company or @handle', hint: 'optional' });
  const email = await text({ message: 'Email', hint: 'optional', validate: optional((v) => (EMAIL.test(v) ? undefined : 'Not a valid email address')) });
  const website = withProtocol(await text({ message: 'Website', hint: 'optional', validate: optional((v) => (isUrl(withProtocol(v)) ? undefined : 'Not a valid URL')) }));
  const location = await text({ message: 'Location', hint: 'optional, e.g. Berlin · Germany' });

  process.stdout.write(style.faint('\n  Profiles — a username or a full URL\n'));
  const links = [
    profileUrl('https://github.com/')(await text({ message: 'GitHub', hint: 'optional' })),
    profileUrl('https://www.linkedin.com/in/')(await text({ message: 'LinkedIn', hint: 'optional' })),
    profileUrl('https://x.com/')(await text({ message: 'X', hint: 'optional' })),
  ];
  const others = await text({
    message: 'Other links, comma-separated',
    hint: 'optional',
    validate: optional((v) => (v.split(',').every((u) => isUrl(withProtocol(u.trim()))) ? undefined : 'One of the links is not a valid URL')),
  });
  links.push(...(others ? others.split(',').map((u) => withProtocol(u.trim())) : []));

  // Built in the same order as the configuration reference, so the file reads naturally.
  const config = {
    name,
    ...(title && { title }),
    ...(tagline && { tagline }),
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
  config.theme = 'gold';
  const previewLang = languages.includes('en') ? 'en' : languages[0];
  for (;;) {
    preview(config, previewLang);
    const next = await select({
      message: 'How does it look?',
      choices: [
        { label: 'Looks good', value: 'done' },
        { label: 'Change template', value: 'template', hint: `current: ${config.template}` },
        { label: 'Change color', value: 'theme', hint: `current: ${config.theme}` },
      ],
    });
    if (next === 'done') break;
    if (next === 'template') {
      config.template = await select({
        message: 'Template',
        choices: Object.keys(templates).map((t) => ({ label: t, value: t, hint: TEMPLATE_HINTS[t] })),
        initial: Object.keys(templates).indexOf(config.template),
      });
    } else {
      config.theme = await select({
        message: 'Accent color',
        choices: Object.entries(themes).map(([id, theme]) => ({ label: id, value: id, hint: theme.accent })),
        initial: Object.keys(themes).indexOf(config.theme),
      });
    }
  }

  const packageName = await askPackageName(config, { offline });
  const dir = await text({ message: 'Folder to create', initial: packageName.split('/').pop() });
  const workflow = await confirm({ message: 'Add a GitHub Actions workflow that publishes on each release?', initial: false });
  return { config, packageName, dir, workflow };
}
