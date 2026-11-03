/** Writes a new card package to disk. Pure file generation — no network, no npm calls. */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { binName } from './names.js';

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

const binScript = `#!/usr/bin/env node
import { start } from 'termcard';

await start(new URL('../card.config.json', import.meta.url));
`;

const workflow = `name: Publish

on:
  release:
    types: [published]
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm install --no-audit --no-fund
      - run: npx termcard validate
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
`;

// README.md is what visitors see on npm: a short introduction, not technical notes.
const publicReadme = (pkg, config) => `# ${config.name}

${[config.title, config.tagline].filter((v) => typeof v === 'string').join(' · ')}

Say hello from your terminal:

\`\`\`bash
npx ${pkg}
\`\`\`

An interactive business card. Use the arrow keys to get in touch, save my contact
details, or visit my website and profiles — in your own language.

Using an AI assistant? With [termcard's MCP server](https://github.com/aepasahan/termcard/blob/main/docs/mcp.md)
you can simply ask it about \`${pkg}\`.

<sub>Made with [termcard](https://www.npmjs.com/package/termcard).</sub>
`;

// .github/README.md is shown on GitHub instead of README.md: notes for the card's owner.
const ownerReadme = (pkg) => `# ${pkg} — maintainer notes

This repository publishes the npm package \`${pkg}\`. Visitors run \`npx ${pkg}\`;
the root \`README.md\` is the public page they see on npm.

## Editing the card

Everything — details, which fields appear, menu, template, theme, icons, languages —
lives in \`card.config.json\`. See the
[configuration guide](https://github.com/aepasahan/termcard/blob/main/docs/configuration.md).

\`\`\`bash
npm install
npm start               # preview the card
npm run validate        # check card.config.json
\`\`\`

## Publishing an update

\`\`\`bash
npm version patch
npm publish
\`\`\`

Only the npm account that owns \`${pkg}\` can publish it. Keep two-factor authentication
on, and use a granular access token if you publish from CI.

## Optional: your card on your own website

\`npx termcard build\` exports a web page, vCards and plain-text versions into \`dist/\`,
plus code that makes \`curl yourdomain.com\` print the card. The curl code reads the text
files from this npm package, so to use it add \`"dist"\` to \`files\` and
\`"prepublishOnly": "termcard build"\` to \`scripts\` in \`package.json\`.
`;

// The card's content is personal: visitors may run it, not reuse it. (termcard itself is MIT.)
const allRightsReserved = (name, year) => `Copyright (c) ${year} ${name}. All rights reserved.

This package contains a personal business card. You may install and run it (for example
with "npx") to view the card and use its contact features.

You may not copy, modify, republish or redistribute this package or its content, in whole
or in part, without the prior written permission of the copyright holder.

The card is rendered by termcard (https://www.npmjs.com/package/termcard), which is
licensed separately under the MIT License.
`;

export class TargetNotEmptyError extends Error {
  constructor(dir) {
    super(`${dir} already exists and is not empty`);
    this.name = 'TargetNotEmptyError';
  }
}

/**
 * @param {{ dir: string, packageName: string, config: object, termcardVersion: string, workflow?: boolean, year?: number }} options
 * @returns {string[]} relative paths of the files written
 */
export function createProject({ dir, packageName, config, termcardVersion, workflow: withWorkflow = false, year = new Date().getFullYear() }) {
  if (existsSync(dir) && readdirSync(dir).length) throw new TargetNotEmptyError(dir);

  const files = {
    'package.json': json({
      name: packageName,
      version: '1.0.0',
      description: `${config.name}'s business card — npx ${packageName}`,
      type: 'module',
      bin: { [binName(packageName)]: 'bin/card.js' },
      files: ['bin', 'card.config.json'],
      scripts: {
        start: 'node bin/card.js',
        validate: 'termcard validate',
      },
      dependencies: { termcard: `^${termcardVersion}` },
      engines: { node: '>=18.18' },
      keywords: ['business-card', 'termcard', 'npx'],
      author: config.email ? `${config.name} <${config.email}>` : config.name,
      license: 'SEE LICENSE IN LICENSE',
    }),
    'card.config.json': json(config),
    'bin/card.js': binScript,
    'README.md': publicReadme(packageName, config),
    '.github/README.md': ownerReadme(packageName),
    LICENSE: allRightsReserved(config.name, year),
    '.gitignore': 'node_modules/\ndist/\n*.tgz\n',
    ...(withWorkflow ? { '.github/workflows/publish.yml': workflow } : {}),
  };

  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, content, name === 'bin/card.js' ? { mode: 0o755 } : undefined);
  }
  return Object.keys(files);
}
