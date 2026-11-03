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
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
`;

const readme = (pkg, name) => `# ${pkg}

${name}'s business card for the terminal.

\`\`\`bash
npx ${pkg}
\`\`\`

## Editing the card

Everything lives in [\`card.config.json\`](card.config.json): contact details, which
fields the card shows, menu items, template, colors and languages. See the
[configuration reference](https://github.com/aepasahan/termcard/blob/main/docs/configuration.md).

\`\`\`bash
npm install
npm start               # interactive preview
npm run validate        # check the config
npm run build           # web page, vCard and curl files in dist/
\`\`\`

## Publishing an update

\`\`\`bash
npm version patch
npm publish
\`\`\`

Made with [termcard](https://github.com/aepasahan/termcard).
`;

const mit = (name, year) => `MIT License

Copyright (c) ${year} ${name}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
      files: ['bin', 'card.config.json', 'dist'],
      scripts: {
        start: 'node bin/card.js',
        validate: 'termcard validate',
        build: 'termcard build',
        // dist/ holds the web page and the files curl integrations fetch from npm.
        prepublishOnly: 'termcard build',
      },
      dependencies: { termcard: `^${termcardVersion}` },
      engines: { node: '>=18.18' },
      keywords: ['business-card', 'termcard', 'npx'],
      author: config.email ? `${config.name} <${config.email}>` : config.name,
      license: 'MIT',
    }),
    'card.config.json': json(config),
    'bin/card.js': binScript,
    'README.md': readme(packageName, config.name),
    LICENSE: mit(config.name, year),
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
