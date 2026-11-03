/** `termcard build`: writes every output format of a card into a directory. */

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { layoutCard } from '../render/card.js';
import { toAnsi, toPlain } from '../render/format.js';
import { createVCard } from '../vcard.js';
import { renderWebPage } from './web.js';
import { integrations } from './integrations.js';

/**
 * @param {object} config normalized config
 * @param {{ outDir: string, packageName?: string }} options
 * @returns {string[]} written file names, relative to outDir
 */
export function buildCard(config, { outDir, packageName }) {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  const written = [];
  const write = (name, content) => {
    const path = join(outDir, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, content);
    written.push(name);
  };

  const langs = config.language.available;
  for (const lang of langs) {
    const lines = layoutCard(config, lang);
    write(`card.${lang}.ansi`, `\n${toAnsi(lines, config.theme, 256)}\n\n`);
    write(`card.${lang}.txt`, `\n${toPlain(lines)}\n\n`);
    write(`contact.${lang}.vcf`, createVCard(config, lang));
  }
  write('index.html', renderWebPage(config, { command: packageName ? `npx ${packageName}` : 'npx termcard' }));
  if (packageName) {
    for (const [name, code] of Object.entries(integrations(packageName, langs))) write(`integrations/${name}`, code);
  }
  return written;
}
