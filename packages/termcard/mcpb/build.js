#!/usr/bin/env node
/**
 * Assembles the Claude Desktop extension (termcard.mcpb) from the termcard package:
 *   node packages/termcard/mcpb/build.js [output-dir]
 * The bundle contains manifest.json, icon.png and termcard itself under server/.
 * Packing uses the official CLI: npx @anthropic-ai/mcpb pack.
 */

import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const pkgDir = resolve(here, '..');
const outDir = resolve(process.argv[2] ?? join(pkgDir, '..', '..', 'dist'));
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));

const stage = mkdtempSync(join(tmpdir(), 'termcard-mcpb-'));
try {
  const manifest = JSON.parse(readFileSync(join(here, 'manifest.json'), 'utf8'));
  manifest.version = pkg.version;
  writeFileSync(join(stage, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  cpSync(join(here, 'icon.png'), join(stage, 'icon.png'));
  for (const entry of ['bin', 'src', 'package.json', 'LICENSE']) cpSync(join(pkgDir, entry), join(stage, 'server', entry), { recursive: true });

  mkdirSync(outDir, { recursive: true });
  const output = join(outDir, 'termcard.mcpb');
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(npx, ['-y', '@anthropic-ai/mcpb@2', 'validate', join(stage, 'manifest.json')], { stdio: 'inherit' });
  execFileSync(npx, ['-y', '@anthropic-ai/mcpb@2', 'pack', stage, output], { stdio: 'inherit' });
  console.log(`✓ ${output}`);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
